"""Conversion contracts for the three existing MKW file families."""

import base64
import gzip
import json
from pathlib import Path
import sqlite3
import subprocess
from tempfile import TemporaryDirectory
import unittest
import zipfile

from codec import FormatError, sha256
from migration import convert, extract_legacy, read_legacy, read_zip


MEDIUM = "data:image/png;base64," + base64.b64encode(b"private-fixture").decode()
MODEL = {
    "version": 1,
    "projectId": "test-123",
    "meta": {"title": "Probe"},
    "boards": [{"id": "board", "fields": {"unusual": True}}],
    "images": [{"id": "ref", "data": MEDIUM}],
    "logos": [],
    "fonts": [],
    "carousel": {
        "objects": [{"id": "layer", "unknown": [False, 1, None]}],
        "layout": "free",
    },
    "campaign": {"rows": [], "links": []},
    "review": {"preview": MEDIUM, "inline": "data:text/plain,%ab", "\ud800": "\udfff"},
}


class MigrationTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.source = self.root / "original.mkw"
        self.target = self.root / "converted.mkw"

    def plain(self):
        self.source.write_text(json.dumps(MODEL), encoding="ascii")

    def real_block_file(self):
        # Generate a native fixture with the same encoder the Studio uses.
        studio = Path(__file__).resolve().parents[2]
        self.plain()
        subprocess.run(
            ["node", "-e", """
const fs = require("node:fs");
const blocks = require("./static/project-blocks.js");
const { createHash } = require("node:crypto");
(async () => {
  const file = process.argv[1];
  const document = JSON.parse(fs.readFileSync(file, "utf8"));
  const data = document.images[0].data;
  const key = createHash("sha256").update(data).digest("hex");
  delete document.images[0].data;
  document.images[0].assetRef = key;
  const plan = await blocks.prepare({ document, assets: new Map([[key, data]]) }, new Blob([]));
  const bytes = Buffer.alloc(plan.size);
  for (const part of plan.writes)
    bytes.set(new Uint8Array(await part.data.arrayBuffer()), part.position);
  fs.writeFileSync(file, bytes);
})().catch(error => { console.error(error); process.exitCode = 1; });
""", str(self.source)],
            cwd=studio, check=True,
        )

    def roundtrip(self, source_family):
        original_bytes = self.source.read_bytes()
        result = convert(self.source, self.target)
        self.assertEqual(result["sourceFamily"], source_family)
        self.assertEqual(result["mediaReferences"], 3)
        self.assertEqual(result["uniqueAssets"], 2)
        self.assertEqual(self.source.read_bytes(), original_bytes)
        manifest, model = read_zip(self.target)
        self.assertEqual(manifest["source"]["sha256"], sha256(original_bytes))
        self.assertEqual(model, MODEL)
        self.assertEqual(list(model), list(MODEL))
        result_path = self.root / "restored.mkw"
        extract_legacy(self.target, result_path)
        self.assertEqual(read_legacy(result_path)[2], MODEL)
        with zipfile.ZipFile(self.target) as archive:
            self.assertIsNone(archive.testzip())
            sqlite_file = self.root / "checked.sqlite"
            sqlite_file.write_bytes(archive.read("project.sqlite"))
            self.assertIn(b"private-fixture", [archive.read(name) for name in archive.namelist()
                                             if name.startswith("assets/")])
        db = sqlite3.connect(sqlite_file)
        try:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
            self.assertEqual(db.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual(db.execute(
                "SELECT legacy_id FROM records WHERE scope='carousel'"
            ).fetchall(), [("layer",)])
            self.assertEqual(db.execute("SELECT count(*) FROM assets").fetchone(), (2,))
            self.assertEqual(db.execute("SELECT count(*) FROM asset_refs").fetchone(), (3,))
        finally:
            db.close()

    def test_json(self):
        self.plain()
        self.roundtrip("json")

    def test_gzip(self):
        self.source.write_bytes(gzip.compress(json.dumps(MODEL).encode("ascii"), mtime=0))
        self.roundtrip("gzip")

    def test_json_with_utf8_bom(self):
        self.source.write_text(json.dumps(MODEL), encoding="utf-8-sig")
        self.roundtrip("json")

    def test_native_block_file(self):
        self.real_block_file()
        self.roundtrip("blocks")

    def test_native_block_corruption(self):
        self.real_block_file()
        data = bytearray(self.source.read_bytes())
        data[24] ^= 1
        self.source.write_bytes(data)
        with self.assertRaisesRegex(FormatError, "checksum"):
            convert(self.source, self.target)
        self.assertFalse(self.target.exists())

    def test_existing_destination_and_source_never_overwritten(self):
        self.plain()
        original = self.source.read_bytes()
        with self.assertRaises(FileExistsError):
            convert(self.source, self.source)
        self.target.write_bytes(b"already there")
        with self.assertRaises(FileExistsError):
            convert(self.source, self.target)
        with self.assertRaises(FileExistsError):
            extract_legacy(self._other_zip(), self.source)
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual(self.target.read_bytes(), b"already there")

    def _other_zip(self):
        file = self.root / "other.mkw"
        convert(self.source, file)
        return file

    def test_corruption_detected_even_with_valid_zip_crc(self):
        self.plain()
        convert(self.source, self.target)
        with zipfile.ZipFile(self.target) as archive:
            entries = {name: archive.read(name) for name in archive.namelist()}
        key = next(name for name in entries if name.startswith("assets/"))
        entries[key] = bytes([entries[key][0] ^ 1]) + entries[key][1:]
        with zipfile.ZipFile(self.target, "w") as archive:
            for name, data in entries.items():
                archive.writestr(name, data)
        with zipfile.ZipFile(self.target) as archive:
            self.assertIsNone(archive.testzip())
        with self.assertRaisesRegex(FormatError, "entry checksum"):
            read_zip(self.target)

    def test_duplicate_json_keys_are_rejected(self):
        self.source.write_bytes(b'{"version":1,"version":1,"meta":{},"boards":[],"images":[]}')
        with self.assertRaises(FormatError):
            convert(self.source, self.target)
        self.assertFalse(self.target.exists())
