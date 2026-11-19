"""N01.0 experiment for a fixed-size STORED database entry in a generated ZIP.

This tool only patches a new copy of its own fixture. It is not a ZIP reader
for arbitrary inputs or the Studio's portable-file writer.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import random
import shutil
import sqlite3
import struct
from tempfile import TemporaryDirectory
import zipfile
import zlib


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sample_png():
    width = height = 1536
    random_bytes = random.Random(31).randbytes(width * height * 3)
    scanlines = b"".join(
        b"\0" + random_bytes[offset : offset + width * 3]
        for offset in range(0, len(random_bytes), width * 3)
    )

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data)) + kind + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(scanlines))
        + chunk(b"IEND", b"")
    )


def manifest(db, asset_name, asset):
    return json.dumps(
        {"probe": True, "entries": {"project.sqlite": sha(db), asset_name: sha(asset)}},
        sort_keys=True,
        separators=(",", ":"),
    ).encode()


def read_entries(path):
    with zipfile.ZipFile(path) as archive, path.open("rb") as stream:
        entries = {}
        central = archive.start_dir
        for info in archive.infolist():
            stream.seek(info.header_offset)
            local = stream.read(30)
            assert local[:4] == b"PK\x03\x04"
            name_size, extra_size = struct.unpack_from("<HH", local, 26)
            entries[info.filename] = (
                info.header_offset, info.header_offset + 30 + name_size + extra_size, central
            )
            stream.seek(central)
            header = stream.read(46)
            assert header[:4] == b"PK\x01\x02"
            central += 46 + sum(struct.unpack_from("<HHH", header, 28))
    return entries


def run(directory, engine):
    before = (directory / f"{engine}-before.sqlite").read_bytes()
    after = (directory / f"{engine}-after.sqlite").read_bytes()
    if len(before) != len(after):
        raise ValueError("Database grew. This case needs the compact rewrite path.")
    page_size = int.from_bytes(before[16:18], "big")
    page_size = 65536 if page_size == 1 else page_size
    asset = sample_png()
    asset_name = f"assets/{sha(asset)}.png"
    original = directory / "zip-probe-before.zip"
    edited = directory / "zip-probe-after.zip"
    initial_manifest = manifest(before, asset_name, asset)
    next_manifest = manifest(after, asset_name, asset)
    assert len(initial_manifest) == len(next_manifest)
    with zipfile.ZipFile(original, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.writestr("manifest.json", initial_manifest)
        archive.writestr("project.sqlite", before)
        archive.writestr(asset_name, asset)
    shutil.copyfile(original, edited)

    entries = read_entries(edited)
    _, db_payload, _ = entries["project.sqlite"]
    patches = []
    changed_pages = 0
    for offset in range(0, len(after), page_size):
        data = after[offset : offset + page_size]
        if before[offset : offset + page_size] != data:
            patches.append((db_payload + offset, data))
            changed_pages += 1

    patches.append((entries["manifest.json"][1], next_manifest))
    for name, data in (("project.sqlite", after), ("manifest.json", next_manifest)):
        local, _, central = entries[name]
        crc = struct.pack("<I", zlib.crc32(data))
        patches.extend(((local + 14, crc), (central + 16, crc)))

    asset_start = entries[asset_name][1]
    assert all(
        pos + len(data) <= asset_start or pos >= asset_start + len(asset)
        for pos, data in patches
    )
    with edited.open("r+b") as stream:
        for pos, data in patches:
            stream.seek(pos)
            stream.write(data)

    with zipfile.ZipFile(edited) as archive:
        assert archive.testzip() is None
        assert archive.read(asset_name) == asset
        assert archive.read("manifest.json") == next_manifest
        patched_db = archive.read("project.sqlite")
        assert patched_db == after
    with TemporaryDirectory(dir=directory) as workspace:
        db_path = Path(workspace) / "checked.sqlite"
        db_path.write_bytes(patched_db)
        db = sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True)
        try:
            assert db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
            assert not db.execute("PRAGMA foreign_key_check").fetchall()
            assert db.execute("SELECT text FROM objects WHERE id=1").fetchone() == (
                "Konzert · Neuer Text 1",
            )
        finally:
            db.close()
    (directory / "zip-write-plan.json").write_text(json.dumps({
        "beforeSha256": sha(original.read_bytes()),
        "afterSha256": sha(edited.read_bytes()),
        "size": edited.stat().st_size,
        "writes": [
            {"position": pos, "base64": base64.b64encode(data).decode("ascii")}
            for pos, data in patches
        ],
    }))
    return {
        "containerBytes": edited.stat().st_size,
        "assetBytes": len(asset),
        "patchWrites": len(patches),
        "patchBytes": sum(len(data) for _, data in patches),
        "assetPayloadWriteBytes": 0,
        "changedDatabasePages": changed_pages,
        "verifiedCRCAndHashes": True,
        "sqliteReaderVersion": sqlite3.sqlite_version,
        "verifiedDatabaseTextAndIntegrity": True,
        "atomicBrowserCommitTested": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("engine", nargs="?", default="chromium")
    args = parser.parse_args()
    result = run(args.output, args.engine)
    (args.output / "zip-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
