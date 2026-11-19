"""Lossless standalone converter from JSON, gzip-JSON and MKWBLK1 to MKW ZIP v2."""

import argparse
import base64
import binascii
from codecs import BOM_UTF8
from contextlib import closing
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import struct
from tempfile import TemporaryDirectory
import zipfile
import zlib

from codec import APPLICATION_ID, FORMAT, FormatError, family, manifest_json, schema_signature, sha256

SCHEMA_VERSION = 2
FORMAT_VERSION = 2
SCHEMA = Path(__file__).with_name("migration-schema.sql").read_text(encoding="utf-8")
ASSET = re.compile(r"assets/([a-f0-9]{64})\.bin")
HASH = re.compile(r"[a-f0-9]{64}")
BLOCK_PREFIX = re.compile(r"data:[^,\r\n]{0,256};base64,")
MAX_SOURCE = 768 * 1024**2
MAX_ZIP = 576 * 1024**2
MAX_DATABASE = 32 * 1024**2
MAX_METADATA = 1024**2
MAX_BLOCK_INDEX = 64 * 1024**2
MAX_ENTRIES = 5000
COLLECTIONS = {
    "project": {"formats", "boards", "images", "fonts", "logos"},
    "carousel": {"artboards", "objects", "folders", "layers"},
    "campaign": {"rows", "links"},
}


def json_text(value, ordered=False):
    # ASCII escapes also preserve lone UTF-16 surrogates accepted by JSON.parse.
    return json.dumps(value, sort_keys=ordered, ensure_ascii=True,
                      allow_nan=False, separators=(",", ":"))


def model_sha256(document):
    digest = hashlib.sha256()
    for part in json.JSONEncoder(sort_keys=True, ensure_ascii=True, allow_nan=False,
                                 separators=(",", ":")).iterencode(document):
        digest.update(part.encode("ascii"))
    return digest.hexdigest()


def load_json(data):
    def unique_fields(pairs):
        fields = {}
        for key, value in pairs:
            if key in fields:
                raise FormatError("Duplicate JSON object key")
            fields[key] = value
        return fields

    def reject_constant(value):
        raise FormatError(f"Unsupported JSON number: {value}")

    try:
        return json.loads(data.decode("utf-8-sig"), object_pairs_hook=unique_fields,
                          parse_constant=reject_constant,
                          parse_int=lambda token: -0.0 if token == "-0" else int(token))
    except (ValueError, UnicodeError, RecursionError) as error:
        raise FormatError("Invalid or unsupported JSON") from error


def read_limited(stream, limit):
    result = stream.read(limit + 1)
    if len(result) > limit:
        raise FormatError("Input exceeds the migration profile limit")
    return result


def read_blocks(stream, size):
    header = stream.read(24)
    if len(header) != 24:
        raise FormatError("Truncated MKWBLK1 header")
    offset, length = struct.unpack_from("<QQ", header, 8)
    if offset < 24 or not 0 < length <= MAX_BLOCK_INDEX or offset + length != size:
        raise FormatError("Invalid MKWBLK1 index position")
    stream.seek(offset)
    with gzip.GzipFile(fileobj=stream) as compressed:
        index = load_json(read_limited(compressed, MAX_BLOCK_INDEX))
    if (not isinstance(index, dict) or index.get("format") != "mkw-blocks"
            or type(index.get("version")) is not int or index["version"] != 1
            or not isinstance(index.get("blocks"), list)):
        raise FormatError("Unsupported MKWBLK1 index")
    document = index.get("document")
    validate_legacy(document)
    data_urls = {}
    length_sum = 0
    stream.seek(24)
    for block in index["blocks"]:
        if not isinstance(block, dict):
            raise FormatError("Invalid MKWBLK1 block")
        key, prefix, count = (block.get(field) for field in ("key", "prefix", "size"))
        if (not isinstance(key, str) or not HASH.fullmatch(key) or key in data_urls
                or not isinstance(prefix, str) or not BLOCK_PREFIX.fullmatch(prefix)
                or type(block.get("offset")) is not int or block["offset"] != stream.tell()
                or type(count) is not int or count < 0 or stream.tell() + count > offset):
            raise FormatError("Invalid MKWBLK1 block reference")
        length_sum += len(prefix) + 4 * ((count + 2) // 3)
        if length_sum + length > MAX_SOURCE:
            raise FormatError("Expanded block data exceeds the migration profile limit")
        binary = stream.read(count)
        if len(binary) != count:
            raise FormatError("Truncated MKWBLK1 block")
        encoded = base64.b64encode(binary)
        digest = hashlib.sha256()
        digest.update(prefix.encode("utf-8"))
        digest.update(encoded)
        if digest.hexdigest() != key:
            raise FormatError("MKWBLK1 block checksum mismatch")
        data_urls[key] = prefix + encoded.decode("ascii")
    if stream.tell() != offset:
        raise FormatError("Invalid MKWBLK1 block extent")
    seen = set()
    for collection in ("images", "logos", "fonts"):
        if not isinstance(document.get(collection), list):
            raise FormatError("Missing MKWBLK1 media collection")
        for item in document[collection]:
            if not isinstance(item, dict) or "data" in item:
                raise FormatError("Invalid MKWBLK1 media record")
            key = item.pop("assetRef", None)
            if key:
                if not isinstance(key, str) or key not in data_urls:
                    raise FormatError("Missing MKWBLK1 asset")
                item["data"] = data_urls[key]
                seen.add(key)
    if seen != data_urls.keys():
        raise FormatError("Unreferenced MKWBLK1 block")
    return document


def validate_legacy(document):
    if (not isinstance(document, dict) or type(document.get("version")) is not int
            or document["version"] != 1
            or not isinstance(document.get("meta"), dict)
            or not isinstance(document.get("boards"), list)
            or not isinstance(document.get("images"), list)):
        raise FormatError("Expected a supported legacy MKW project")


def legacy_sha256(stream):
    stream.seek(0)
    digest = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b""):
        digest.update(block)
    stream.seek(0)
    return digest.hexdigest()


def read_legacy(path):
    try:
        with Path(path).open("rb") as stream:
            size = os.fstat(stream.fileno()).st_size
            if size > MAX_SOURCE:
                raise FormatError("Source file exceeds the migration profile limit")
            source_sha = legacy_sha256(stream)
            source_kind = family(stream.read(4096).removeprefix(BOM_UTF8))
            stream.seek(0)
            if source_kind == "blocks":
                document = read_blocks(stream, size)
            elif source_kind == "gzip":
                with gzip.GzipFile(fileobj=stream) as gzip_stream:
                    document = load_json(read_limited(gzip_stream, MAX_SOURCE))
            elif source_kind == "json":
                document = load_json(read_limited(stream, MAX_SOURCE))
            else:
                raise FormatError("Expected JSON, gzip JSON or MKWBLK1")
            if legacy_sha256(stream) != source_sha:
                raise FormatError("The source changed during conversion")
    except (gzip.BadGzipFile, EOFError, zlib.error) as error:
        raise FormatError("Corrupted compressed MKW") from error
    validate_legacy(document)
    return source_kind, source_sha, document


def media_value(value):
    if not isinstance(value, str) or not value[:5].lower() == "data:" or "," not in value:
        return None
    prefix, encoded = value.split(",", 1)
    if prefix.lower().endswith(";base64"):
        try:
            data = base64.b64decode(encoded, validate=True)
            if base64.b64encode(data).decode("ascii") == encoded:
                return prefix + ",", "base64", data
        except (ValueError, binascii.Error):
            pass
    # Keep the exact spelling of percent-encoded or noncanonical URLs. This
    # also preserves original reader behavior for unusual but valid projects.
    return "", "verbatim", value.encode("utf-8", "surrogatepass")


def separate_media(value, path, assets, refs):
    if isinstance(value, dict):
        return {name: separate_media(child, (*path, name), assets, refs)
                for name, child in value.items()}
    if isinstance(value, list):
        return [separate_media(child, (*path, pos), assets, refs)
                for pos, child in enumerate(value)]
    media = media_value(value)
    if media is None:
        return value
    prefix, encoding, data = media
    digest = sha256(data)
    assets.setdefault(digest, data)
    refs.append((json_text(path), digest, prefix, encoding))
    return None


def record_identity(record):
    if isinstance(record, dict):
        for key in ("id", "role"):
            value = record.get(key)
            if isinstance(value, str):
                return value.encode("utf-8", "surrogatepass").decode("utf-8", "replace")
    return None


def insert_scope(db, scope, fields):
    for position, (name, value) in enumerate(fields.items()):
        # Encode field names as JSON strings too, preserving every UTF-16 key.
        key = json_text(name)
        if scope == "project" and name in ("carousel", "campaign") and isinstance(value, dict):
            db.execute("INSERT INTO fields VALUES (?,?,?,'scope',NULL)", (scope, position, key))
            insert_scope(db, name, value)
        elif name in COLLECTIONS[scope] and isinstance(value, list):
            db.execute("INSERT INTO fields VALUES (?,?,?,'records',NULL)", (scope, position, key))
            db.executemany(
                "INSERT INTO records VALUES (?,?,?,?,?)",
                ((scope, key, i, record_identity(row), json_text(row))
                 for i, row in enumerate(value)),
            )
        else:
            db.execute("INSERT INTO fields VALUES (?,?,?,'value',?)",
                       (scope, position, key, json_text(value)))


def build_db(path, source_kind, source_sha, model_sha, document, assets, refs):
    with closing(sqlite3.connect(path)) as db, db:
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript(SCHEMA)
        db.execute("INSERT INTO project VALUES (1,?,?,?)", (source_kind, source_sha, model_sha))
        insert_scope(db, "project", document)
        db.executemany("INSERT INTO assets VALUES (?,?)",
                       ((digest, len(data)) for digest, data in sorted(assets.items())))
        db.executemany("INSERT INTO asset_refs VALUES (?,?,?,?)", refs)


def expand_scope(db, scope, scopes_seen):
    scopes_seen.add(scope)
    result = {}
    for expected, (pos, key, kind, value) in enumerate(db.execute(
        "SELECT position,name,kind,json_value FROM fields WHERE scope=? ORDER BY position", (scope,)
    )):
        name = load_json(key.encode("ascii"))
        if not isinstance(name, str) or name in result or expected != pos:
            raise FormatError("Invalid project field ordering")
        if kind == "scope":
            if scope != "project" or name not in ("carousel", "campaign"):
                raise FormatError("Unexpected project scope")
            result[name] = expand_scope(db, name, scopes_seen)
        elif kind == "records":
            if name not in COLLECTIONS[scope]:
                raise FormatError("Unexpected project collection")
            items = []
            for index, (item_pos, legacy_id, item) in enumerate(db.execute(
                "SELECT position,legacy_id,json_value FROM records "
                "WHERE scope=? AND collection=? ORDER BY position", (scope, key)
            )):
                if item_pos != index:
                    raise FormatError("Invalid ordered project collection")
                row = load_json(item.encode("ascii"))
                if legacy_id != record_identity(row):
                    raise FormatError("Project record identity mismatch")
                items.append(row)
            result[name] = items
        else:
            result[name] = load_json(value.encode("ascii"))
    return result


def resolve_media_path(document, path, data):
    if not isinstance(path, list) or not path:
        raise FormatError("Invalid media path")
    parent = document
    for i, key in enumerate(path):
        valid = (
            isinstance(parent, dict) and isinstance(key, str) and key in parent
            or isinstance(parent, list) and type(key) is int and 0 <= key < len(parent)
        )
        if not valid:
            raise FormatError("Invalid media path")
        if i == len(path) - 1:
            if parent[key] is not None:
                raise FormatError("Media path overrides an existing value")
            parent[key] = data
        else:
            parent = parent[key]


def read_db(path, assets):
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro&immutable=1", uri=True)) as db:
        db.execute("PRAGMA trusted_schema=OFF")
        db.execute("PRAGMA query_only=ON")
        if (db.execute("PRAGMA application_id").fetchone() != (APPLICATION_ID,)
                or db.execute("PRAGMA user_version").fetchone() != (SCHEMA_VERSION,)):
            raise FormatError("Unsupported SQLite MKW schema version")
        with closing(sqlite3.connect(":memory:")) as expected:
            expected.executescript(SCHEMA)
            if schema_signature(db) != schema_signature(expected):
                raise FormatError("Unexpected SQLite schema")
        if (db.execute("PRAGMA integrity_check").fetchone() != ("ok",)
                or db.execute("PRAGMA foreign_key_check").fetchone() is not None):
            raise FormatError("SQLite integrity or reference check failed")
        project = db.execute(
            "SELECT source_family,source_sha256,model_sha256 FROM project"
        ).fetchone()
        if not project or any(not HASH.fullmatch(value) for value in project[1:]):
            raise FormatError("Invalid migrated project identity")
        if dict(db.execute("SELECT sha256,byte_count FROM assets")) != {
                digest: len(data) for digest, data in assets.items()}:
            raise FormatError("SQLite asset index does not match ZIP")
        scopes = set()
        document = expand_scope(db, "project", scopes)
        if {row[0] for row in db.execute("SELECT DISTINCT scope FROM fields")} - scopes:
            raise FormatError("Unreachable project scope")
        if db.execute(
            "SELECT 1 FROM records r JOIN fields f ON r.scope=f.scope AND r.collection=f.name "
            "WHERE f.kind!='records' LIMIT 1"
        ).fetchone():
            raise FormatError("Unreachable project record")
        referenced = set()
        cache = {}
        expanded_media = 0
        for path_json, digest, prefix, encoding in db.execute(
            "SELECT path_json,sha256,url_prefix,encoding FROM asset_refs"
        ):
            asset = assets[digest]
            expanded_media += (len(prefix) + 4 * ((len(asset) + 2) // 3)
                               if encoding == "base64" else len(asset))
            if expanded_media > MAX_SOURCE:
                raise FormatError("Expanded media exceeds the migration profile limit")
            referenced.add(digest)
            key = (digest, prefix, encoding)
            if key not in cache:
                if encoding == "base64" and prefix.lower().startswith("data:") and prefix.lower().endswith(";base64,"):
                    cache[key] = prefix + base64.b64encode(asset).decode("ascii")
                elif encoding == "verbatim" and not prefix:
                    cache[key] = asset.decode("utf-8", "surrogatepass")
                else:
                    raise FormatError("Invalid media URL encoding")
            resolve_media_path(document, load_json(path_json.encode("ascii")), cache[key])
        if referenced != assets.keys():
            raise FormatError("Unreferenced ZIP asset")
        return project, document


def read_zip(path):
    path = Path(path)
    if path.stat().st_size > MAX_ZIP:
        raise FormatError("MKW ZIP exceeds the migration profile limit")
    try:
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if not 2 <= len(entries) <= MAX_ENTRIES:
                raise FormatError("Invalid MKW ZIP entry count")
            names = set()
            total = 0
            for entry in entries:
                name = entry.filename
                if (entry.orig_filename != name or name in names
                        or (name not in ("manifest.json", "project.sqlite") and not ASSET.fullmatch(name))
                        or entry.compress_type != zipfile.ZIP_STORED
                        or entry.flag_bits & ~0x800 or entry.compress_size != entry.file_size):
                    raise FormatError("Unexpected or duplicate MKW ZIP entry")
                names.add(name)
                total += entry.file_size
            if (total > MAX_ZIP or not {"manifest.json", "project.sqlite"} <= names
                    or archive.getinfo("manifest.json").file_size > MAX_METADATA
                    or archive.getinfo("project.sqlite").file_size > MAX_DATABASE):
                raise FormatError("Invalid MKW ZIP size or missing entries")
            manifest = manifest_json(archive.read("manifest.json"))
            if (not isinstance(manifest, dict) or manifest.get("format") != FORMAT
                    or any(type(manifest.get(key)) is not int or manifest[key] != version
                           for key, version in (("formatVersion", FORMAT_VERSION),
                                                ("schemaVersion", SCHEMA_VERSION),
                                                ("minimumReaderVersion", FORMAT_VERSION)))
                    or not isinstance(manifest.get("appVersion"), str)
                    or not isinstance(manifest.get("entries"), dict)
                    or manifest["entries"].keys() != names - {"manifest.json"}):
                raise FormatError("Unsupported MKW ZIP manifest")
            assets = {}
            with TemporaryDirectory() as directory:
                db_path = Path(directory, "project.sqlite")
                for name, metadata in manifest["entries"].items():
                    data = archive.read(name)
                    digest = sha256(data)
                    if (not isinstance(metadata, dict) or type(metadata.get("bytes")) is not int
                            or metadata["bytes"] != len(data) or metadata.get("sha256") != digest):
                        raise FormatError("MKW ZIP entry checksum or size mismatch")
                    if name == "project.sqlite":
                        db_path.write_bytes(data)
                    elif name == f"assets/{digest}.bin":
                        assets[digest] = data
                    else:
                        raise FormatError("MKW ZIP asset is incorrectly addressed")
                project, document = read_db(db_path, assets)
        validate_legacy(document)
        origin = dict(zip(("family", "sha256", "modelSha256"), project))
        if manifest.get("source") != origin or project[2] != model_sha256(document):
            raise FormatError("MKW ZIP reconstructed model checksum mismatch")
        return manifest, document
    except (zipfile.BadZipFile, sqlite3.Error, UnicodeError, json.JSONDecodeError, RecursionError) as error:
        raise FormatError("Invalid MKW ZIP or SQLite data") from error


def new_mkw_path(output):
    target = Path(output)
    if target.suffix.lower() != ".mkw":
        raise FormatError("The output must use the .mkw extension")
    if target.exists() or target.is_symlink():
        raise FileExistsError(f"Output already exists: {target.name}")
    return target


def convert(source, output):
    target = new_mkw_path(output)
    kind, original_sha, original = read_legacy(source)
    model_sha = model_sha256(original)
    assets, refs = {}, []
    stripped = separate_media(original, (), assets, refs)
    app_version = json.loads((Path(__file__).resolve().parents[2] / "package.json").read_text())["version"]
    with TemporaryDirectory(dir=target.parent) as workspace:
        db_path = Path(workspace, "project.sqlite")
        build_db(db_path, kind, original_sha, model_sha, stripped, assets, refs)
        payloads = {"project.sqlite": db_path.read_bytes(),
                    **{f"assets/{digest}.bin": data for digest, data in assets.items()}}
        manifest = {
            "format": FORMAT, "formatVersion": FORMAT_VERSION, "schemaVersion": SCHEMA_VERSION,
            "minimumReaderVersion": FORMAT_VERSION, "appVersion": app_version,
            "source": {"family": kind, "sha256": original_sha, "modelSha256": model_sha},
            "entries": {name: {"bytes": len(data), "sha256": sha256(data)}
                        for name, data in payloads.items()},
        }
        candidate = Path(workspace, "candidate.mkw")
        with zipfile.ZipFile(candidate, "w", compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
            archive.writestr(zipfile.ZipInfo("manifest.json"), json_text(manifest, ordered=True))
            for name, data in sorted(payloads.items()):
                archive.writestr(zipfile.ZipInfo(name), data)
        # Reopen and verify the complete model before the output can appear.
        checked, restored = read_zip(candidate)
        if checked["source"]["modelSha256"] != model_sha or restored != original:
            raise FormatError("Conversion failed the exact model roundtrip")
        os.link(candidate, target)
    return {"sourceFamily": kind, "uniqueAssets": len(assets), "mediaReferences": len(refs),
            "outputBytes": target.stat().st_size, "modelEqual": True}


def extract_legacy(source, output):
    path = new_mkw_path(output)
    _, document = read_zip(source)
    with TemporaryDirectory(dir=path.parent) as workspace:
        candidate = Path(workspace, "restored.mkw")
        with candidate.open("wb") as stream:
            # Compression keeps test copies small, and the existing Studio
            # reader accepts this exact reconstructed JSON model.
            with gzip.GzipFile(fileobj=stream, mode="wb", mtime=0) as compressed:
                for part in json.JSONEncoder(ensure_ascii=True, allow_nan=False,
                                             separators=(",", ":")).iterencode(document):
                    compressed.write(part.encode("ascii"))
        os.link(candidate, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("convert", "restore"))
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    try:
        if args.action == "convert":
            print(json.dumps(convert(args.source, args.target)))
        else:
            extract_legacy(args.source, args.target)
    except (FormatError, OSError, sqlite3.Error, ValueError, RecursionError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
