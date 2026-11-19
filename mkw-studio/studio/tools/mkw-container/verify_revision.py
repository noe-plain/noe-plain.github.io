"""Independently verify an edited archive against its original project."""

import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
from tempfile import TemporaryDirectory
import zipfile

from migration import read_zip


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", type=Path)
    parser.add_argument("changed", type=Path)
    args = parser.parse_args()
    for fixture in json.loads(args.inputs.read_text()):
        case = fixture["case"]
        original = Path(fixture["target"])
        revised = args.changed / f"case-{case}.mkw"
        subprocess.run(["unzip", "-tq", revised], check=True)
        with zipfile.ZipFile(original) as before, zipfile.ZipFile(revised) as after:
            names = {name for name in before.namelist() if name.startswith("assets/")}
            assert names == {name for name in after.namelist() if name.startswith("assets/")}
            image_bytes = 0
            for name in names:
                # Compare both independently read payloads and their raw ZIP ranges.
                a, b = before.getinfo(name), after.getinfo(name)
                assert (a.header_offset, a.file_size, a.CRC) == (b.header_offset, b.file_size, b.CRC)
                assert hashlib.sha256(before.read(name)).digest() == hashlib.sha256(after.read(name)).digest()
                image_bytes += a.file_size
        with TemporaryDirectory() as directory:
            database = Path(directory) / "project.sqlite"
            with database.open("wb") as file:
                subprocess.run(["unzip", "-p", revised, "project.sqlite"], stdout=file, check=True)
            checked = subprocess.check_output(
                ["sqlite3", "-batch", "-bail", "-readonly", database,
                 "PRAGMA integrity_check; PRAGMA foreign_key_check;"],
                text=True,
            )
            assert checked.strip() == "ok"
        _, source_project = read_zip(original)
        manifest, edited_project = read_zip(revised)
        if "carousel" in source_project:
            text = next(item for item in source_project["carousel"]["objects"] if item["type"] == "text")
        else:
            text = source_project["boards"][0]["elements"]["title"]
        text["text"] += " ·"
        assert source_project == edited_project
        assert manifest["formatVersion"] == 3
        print(json.dumps({"case": case, "mediaEntriesByteEqual": len(names),
                          "mediaPayloadBytesRetained": image_bytes,
                          "zipAndSqlitePassed": True, "onlyExpectedTextChanged": True}))


if __name__ == "__main__":
    main()
