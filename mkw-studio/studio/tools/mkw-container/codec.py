"""Development codec for the first MKW ZIP profile. No editor integration."""

from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import struct
from tempfile import TemporaryDirectory
import zipfile


FORMAT = "mkw-studio-zip"
FORMAT_VERSION = 1
SCHEMA_VERSION = 1
APPLICATION_ID = int.from_bytes(b"MKWZ", "big")
SCHEMA = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
TABLES = {
    "project": ("singleton", "id", "title", "revision"),
    "artboards": ("id", "position", "name", "width", "height"),
    "layers": ("id", "artboard_id", "position", "name"),
    "assets": ("sha256", "mime", "width", "height"),
    "objects": (
        "id", "layer_id", "position", "x", "y", "width", "height",
        "text", "font_family", "font_size", "asset_sha256",
    ),
}
MAX_ROWS = {"project": 1, "artboards": 200, "layers": 500, "assets": 500, "objects": 500}
MAX_CONTAINER = 64 * 1024**2
MAX_METADATA = 256 * 1024
MAX_DATABASE = 4 * 1024**2
MAX_ENTRIES = 2 + MAX_ROWS["assets"] + MAX_ROWS["artboards"]
TOKEN = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}", re.ASCII)
HASH = re.compile(r"[0-9a-f]{64}", re.ASCII)
ENTRY = re.compile(
    r"project\.sqlite|assets/[0-9a-f]{64}\.png|previews/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.png",
    re.ASCII,
)


class FormatError(ValueError):
    """An unsupported or inconsistent MKW ZIP container."""


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def png_size(data):
    # The codec checks the PNG type and dimensions. Pixel decoding belongs to
    # the image loader. ZIP CRC and the file SHA-256 cover the full payload.
    if len(data) < 45 or data[:16] != b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR":
        raise FormatError("Expected a PNG with an IHDR header")
    width, height = struct.unpack_from(">II", data, 16)
    if not width or not height or width * height > 80_000_000:
        raise FormatError("PNG dimensions outside profile limits")
    return width, height


def family(prefix):
    """Classify by the signature, independently of the common .mkw suffix."""
    if prefix.startswith(b"PK\x03\x04"):
        return "zip"
    if prefix.startswith(b"MKWBLK1\n"):
        return "blocks"
    if prefix.startswith(b"\x1f\x8b"):
        return "gzip"
    if prefix.lstrip().startswith(b"{"):
        return "json"
    return None


def encode_database(path, records):
    with closing(sqlite3.connect(path)) as db, db:
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript(SCHEMA)
        for table, columns in TABLES.items():
            rows = records[table]
            if len(rows) > MAX_ROWS[table]:
                raise FormatError(f"Too many rows in {table}")
            placeholders = ",".join("?" for _ in columns)
            db.executemany(
                f"INSERT INTO {table} VALUES ({placeholders})",
                [[row[column] for column in columns] for row in rows],
            )


def schema_signature(db):
    return db.execute(
        "SELECT type, name, tbl_name, sql FROM sqlite_schema ORDER BY type, name"
    ).fetchall()


def decode_database(path):
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as db:
        db.execute("PRAGMA trusted_schema=OFF")
        db.execute("PRAGMA query_only=ON")
        if (
            db.execute("PRAGMA application_id").fetchone() != (APPLICATION_ID,)
            or db.execute("PRAGMA user_version").fetchone() != (SCHEMA_VERSION,)
        ):
            raise FormatError("Unknown SQLite application or schema version")

        with closing(sqlite3.connect(":memory:")) as expected:
            expected.executescript(SCHEMA)
            if schema_signature(db) != schema_signature(expected):
                raise FormatError("Unexpected SQLite schema")

        if db.execute("PRAGMA integrity_check").fetchone() != ("ok",):
            raise FormatError("SQLite integrity check failed")
        if db.execute("PRAGMA foreign_key_check").fetchone():
            raise FormatError("SQLite references are inconsistent")
        db.row_factory = sqlite3.Row
        records = {}
        for table, limit in MAX_ROWS.items():
            rows = db.execute(f"SELECT * FROM {table} ORDER BY 1 LIMIT ?", (limit + 1,))
            records[table] = [dict(row) for row in rows]
            if len(records[table]) > limit:
                raise FormatError(f"Too many rows in {table}")
    return records


def check_project(records, assets, previews):
    projects = records["project"]
    if len(projects) != 1 or not records["artboards"]:
        raise FormatError("Expected a project with at least one artboard")
    if not TOKEN.fullmatch(projects[0]["id"]):
        raise FormatError("Invalid project ID")
    for table in ("artboards", "layers", "objects"):
        if any(not TOKEN.fullmatch(row["id"]) for row in records[table]):
            raise FormatError(f"Invalid ID in {table}")

    registered_assets = {row["sha256"]: row for row in records["assets"]}
    referenced_assets = {row["asset_sha256"] for row in records["objects"]} - {None}
    if set(assets) != set(registered_assets) or set(assets) != referenced_assets:
        raise FormatError("Missing or unreferenced image assets")
    artboards = {row["id"]: row for row in records["artboards"]}
    if set(previews) != set(artboards):
        raise FormatError("Expected one preview per artboard")
    for digest, data in assets.items():
        asset = registered_assets[digest]
        if digest != sha256(data) or (asset["width"], asset["height"]) != png_size(data):
            raise FormatError("Asset hash or dimensions mismatch")
    for artboard_id, preview in previews.items():
        width, height = png_size(preview)
        board = artboards[artboard_id]
        if width > board["width"] or height > board["height"] or max(width, height) > 1024:
            raise FormatError("Preview dimensions outside profile limits")


def manifest_json(payload):
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise FormatError(f"Duplicate JSON key: {key}")
            result[key] = value
        return result

    return json.loads(payload, object_pairs_hook=unique_pairs)


def parse_archive(archive):
    entries = archive.infolist()
    if not 3 <= len(entries) <= MAX_ENTRIES:
        raise FormatError("Unexpected ZIP entry count")
    names = set()
    total = 0
    for entry in entries:
        name = entry.filename
        if (
            name != entry.orig_filename or name in names
            or (name != "manifest.json" and not ENTRY.fullmatch(name))
            or entry.compress_type != zipfile.ZIP_STORED
            or entry.flag_bits & ~0x800
            or entry.compress_size != entry.file_size
            or entry.is_dir()
        ):
            raise FormatError("Unexpected or duplicate ZIP entry")
        total += entry.file_size
        if total > MAX_CONTAINER:
            raise FormatError("Archive exceeds basis profile size limit")
        names.add(name)

    if not {"manifest.json", "project.sqlite"} <= names:
        raise FormatError("Missing manifest or database")
    if (
        archive.getinfo("manifest.json").file_size > MAX_METADATA
        or archive.getinfo("project.sqlite").file_size > MAX_DATABASE
    ):
        raise FormatError("Manifest or database exceeds basis profile size limit")
    manifest = manifest_json(archive.read("manifest.json"))
    if not isinstance(manifest, dict) or manifest.get("format") != FORMAT:
        raise FormatError("Unknown MKW container identifier")
    if (
        type(manifest.get("formatVersion")) is not int or manifest["formatVersion"] != FORMAT_VERSION
        or type(manifest.get("minimumReaderVersion")) is not int
        or not 1 <= manifest["minimumReaderVersion"] <= FORMAT_VERSION
        or type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != SCHEMA_VERSION
    ):
        raise FormatError("Unsupported MKW container version")
    entries = manifest.get("entries")
    if (
        not isinstance(manifest.get("appVersion"), str) or not manifest["appVersion"]
        or not isinstance(entries, dict)
        or set(entries) != names - {"manifest.json"}
    ):
        raise FormatError("Manifest metadata or entry list mismatch")

    data = {}
    for name, info in entries.items():
        if (
            not isinstance(info, dict) or type(info.get("bytes")) is not int
            or info["bytes"] != archive.getinfo(name).file_size
            or not isinstance(info.get("sha256"), str) or not HASH.fullmatch(info["sha256"])
        ):
            raise FormatError(f"Invalid entry metadata: {name}")
        payload = archive.read(name)  # zipfile checks the ZIP's CRC here.
        if sha256(payload) != info["sha256"]:
            raise FormatError(f"SHA-256 mismatch: {name}")
        data[name] = payload
    return manifest, data


def read(path):
    path = Path(path)
    if path.stat().st_size > MAX_CONTAINER:
        raise FormatError("Archive exceeds basis profile size limit")
    try:
        with path.open("rb") as stream:
            if family(stream.read(16)) != "zip":
                raise FormatError("Expected an MKW ZIP container")
            stream.seek(0)
            with zipfile.ZipFile(stream) as archive:
                manifest, data = parse_archive(archive)
        with TemporaryDirectory() as workspace:
            db_path = Path(workspace, "project.sqlite")
            db_path.write_bytes(data["project.sqlite"])
            records = decode_database(db_path)
        assets = {Path(name).stem: value for name, value in data.items() if name.startswith("assets/")}
        previews = {Path(name).stem: value for name, value in data.items() if name.startswith("previews/")}
        check_project(records, assets, previews)
        project = records["project"][0]
        expected = {key: project[key] for key in ("id", "title", "revision")}
        current = manifest.get("project")
        if not isinstance(current, dict) or type(current.get("revision")) is not int or current != expected:
            raise FormatError("Manifest project does not match SQLite")
        return records, assets, previews
    except (zipfile.BadZipFile, sqlite3.Error, UnicodeError, json.JSONDecodeError, RecursionError) as error:
        raise FormatError("Invalid MKW ZIP, manifest or SQLite database") from error


def write(path, records, assets, previews, app_version):
    """Write and reopen a staged package before making the new file visible."""
    path = Path(path)
    if path.suffix.lower() != ".mkw":
        raise FormatError("The MKW ZIP container uses the .mkw extension")
    check_project(records, assets, previews)
    with TemporaryDirectory(dir=path.parent) as workspace:
        db_path = Path(workspace, "project.sqlite")
        encode_database(db_path, records)
        data = {"project.sqlite": db_path.read_bytes()}
        data.update({f"assets/{digest}.png": payload for digest, payload in assets.items()})
        data.update({f"previews/{board}.png": payload for board, payload in previews.items()})
        project = records["project"][0]
        manifest = {
            "format": FORMAT,
            "formatVersion": FORMAT_VERSION,
            "minimumReaderVersion": FORMAT_VERSION,
            "schemaVersion": SCHEMA_VERSION,
            "appVersion": app_version,
            "project": {key: project[key] for key in ("id", "title", "revision")},
            "entries": {
                name: {"bytes": len(payload), "sha256": sha256(payload)}
                for name, payload in data.items()
            },
        }
        candidate = Path(workspace, "project.mkw")
        with zipfile.ZipFile(candidate, "w", compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
            archive.writestr(
                zipfile.ZipInfo("manifest.json"),
                json.dumps(manifest, ensure_ascii=False, sort_keys=True).encode("utf-8"),
            )
            for name, payload in sorted(data.items()):
                archive.writestr(zipfile.ZipInfo(name), payload)
        read(candidate)
        # Same-filesystem promotion, without a check/overwrite race.
        os.link(candidate, path)
