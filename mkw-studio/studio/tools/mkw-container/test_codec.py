"""Tests for the basis container, including independent archive modifications."""

import json
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
import unittest
import warnings
import zipfile

from codec import FormatError, family, read, sha256, write
from example import fixture


class ContainerTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.path = self.root / "project.mkw"
        self.expected = fixture()
        write(self.path, *self.expected, "2.0.0")

    def entries(self):
        with zipfile.ZipFile(self.path) as archive:
            return {name: archive.read(name) for name in archive.namelist()}

    def replace(self, entries):
        with zipfile.ZipFile(self.path, "w") as archive:
            for name, data in entries.items():
                archive.writestr(name, data)

    def change_manifest(self, func):
        entries = self.entries()
        manifest = json.loads(entries["manifest.json"])
        func(manifest)
        entries["manifest.json"] = json.dumps(manifest).encode()
        self.replace(entries)

    def change_database(self, sql):
        entries = self.entries()
        path = self.root / "edit.sqlite"
        path.write_bytes(entries["project.sqlite"])
        db = sqlite3.connect(path)
        try:
            with db:
                db.execute("PRAGMA foreign_keys=OFF")
                db.execute(sql)
        finally:
            db.close()
        entries["project.sqlite"] = path.read_bytes()
        manifest = json.loads(entries["manifest.json"])
        manifest["entries"]["project.sqlite"] = {
            "bytes": len(entries["project.sqlite"]),
            "sha256": sha256(entries["project.sqlite"]),
        }
        entries["manifest.json"] = json.dumps(manifest).encode()
        self.replace(entries)

    def test_roundtrip_committed_and_generated_examples(self):
        sample = Path(__file__).resolve().parents[2] / "examples" / "mkw-zip-v1.mkw"
        self.assertEqual(read(sample), self.expected)
        self.assertEqual(read(self.path), self.expected)

    def test_shared_extension_has_four_signatures(self):
        for signature, expected in [
            (b"PK\x03\x04", "zip"),
            (b"MKWBLK1\n", "blocks"),
            (b"\x1f\x8b", "gzip"),
            (b"\n{", "json"),
            (b"MKW?", None),
        ]:
            with self.subTest(signature=signature):
                self.assertEqual(family(signature), expected)

    def test_writer_refuses_overwrite(self):
        original = self.path.read_bytes()
        with self.assertRaises(FileExistsError):
            write(self.path, *self.expected, "2.0.0")
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(list(self.root.iterdir()), [self.path])

    def test_writer_uses_only_mkw_extension(self):
        wrong_suffix = self.root / "example.design"
        with self.assertRaisesRegex(FormatError, r"\.mkw extension"):
            write(wrong_suffix, *self.expected, "2.0.0")
        self.assertFalse(wrong_suffix.exists())

    def test_bad_crc_is_rejected(self):
        source = self.path.read_bytes()
        offset = source.index(b"SQLite format 3\0")
        self.path.write_bytes(source[:offset] + b"X" + source[offset + 1 :])
        with self.assertRaises(FormatError) as result:
            read(self.path)
        self.assertIn("CRC", str(result.exception.__cause__))

    def test_bad_sha_with_valid_zip_crc_is_rejected(self):
        entries = self.entries()
        name = next(name for name in entries if name.startswith("assets/"))
        entries[name] = entries[name][:-1] + bytes([entries[name][-1] ^ 1])
        self.replace(entries)
        with zipfile.ZipFile(self.path) as archive:
            self.assertIsNone(archive.testzip())
        with self.assertRaisesRegex(FormatError, "SHA-256"):
            read(self.path)

    def test_future_container_and_database_versions(self):
        original = self.path.read_bytes()
        for key in ("formatVersion", "schemaVersion", "minimumReaderVersion"):
            self.change_manifest(lambda m: m.update({key: 2}))
            with self.assertRaisesRegex(FormatError, "container version"):
                read(self.path)
            self.path.write_bytes(original)
        self.change_database("PRAGMA user_version=2")
        with self.assertRaisesRegex(FormatError, "schema version"):
            read(self.path)

    def test_foreign_key_failure_with_valid_hashes(self):
        self.change_database("UPDATE objects SET layer_id = 'wrong' WHERE id = '01-title'")
        with self.assertRaisesRegex(FormatError, "references are inconsistent"):
            read(self.path)

    def test_unexpected_sqlite_schema_is_rejected(self):
        self.change_database("CREATE VIEW unexpected AS SELECT id FROM objects")
        with self.assertRaisesRegex(FormatError, "Unexpected SQLite schema"):
            read(self.path)

    def test_manifest_project_mismatch(self):
        self.change_manifest(lambda m: m["project"].update(revision=7))
        with self.assertRaisesRegex(FormatError, "does not match SQLite"):
            read(self.path)

    def test_unknown_and_duplicate_entries(self):
        for name in ("../project.sqlite", "manifest.json"):
            with self.subTest(name=name), warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                with zipfile.ZipFile(self.path, "a") as archive:
                    archive.writestr(name, b"unexpected")
                with self.assertRaisesRegex(FormatError, "duplicate ZIP entry"):
                    read(self.path)
                self.path.unlink()
                write(self.path, *self.expected, "2.0.0")

    def test_duplicate_manifest_field_and_truncated_zip(self):
        original = self.path.read_bytes()
        entries = self.entries()
        entries["manifest.json"] = b'{"formatVersion":1,' + entries["manifest.json"][1:]
        self.replace(entries)
        with self.assertRaisesRegex(FormatError, "Duplicate JSON key"):
            read(self.path)
        self.path.write_bytes(original[:-30])
        with self.assertRaises(FormatError):
            read(self.path)


if __name__ == "__main__":
    unittest.main()
