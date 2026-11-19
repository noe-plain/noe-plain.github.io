"""Generate the original, synthetic example or inspect an MKW ZIP v1 file."""

import argparse
import json
from pathlib import Path
import struct
import zlib

from codec import FormatError, read, sha256, write


def png(width, height, pixels):
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    stride = width * 3
    rows = b"".join(
        b"\0" + pixels[offset : offset + stride]
        for offset in range(0, len(pixels), stride)
    )
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )


def fixture():
    width, height = 128, 80
    tile_width, tile_height = 48, 32
    tile = bytearray()
    for y in range(tile_height):
        for x in range(tile_width):
            tile.extend((36 + 2 * x, 79 + 3 * y, 136 + x))
    original = png(tile_width, tile_height, tile)
    digest = sha256(original)

    preview = bytearray(bytes([245, 242, 233]) * width * height)
    for left in (12, 68):
        for y in range(tile_height):
            start = (width * (36 + y) + left) * 3
            preview[start : start + tile_width * 3] = tile[y * tile_width * 3 : (y + 1) * tile_width * 3]
    glyphs = (
        ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
        ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
        ("10001", "10001", "10001", "10101", "10101", "11011", "10001"),
    )
    for index, glyph in enumerate(glyphs):
        for y, row in enumerate(glyph):
            for x, pixel in enumerate(row):
                if pixel == "1":
                    for dy in range(2):
                        start = (width * (12 + 2 * y + dy) + 12 + 12 * index + 2 * x) * 3
                        preview[start : start + 6] = bytes([31, 51, 71]) * 2

    def item(id, position, x, y, w, h, text=None, asset=None):
        return {
            "id": id,
            "layer_id": "layer-1",
            "position": position,
            "x": float(x),
            "y": float(y),
            "width": float(w),
            "height": float(h),
            "text": text,
            "font_family": "sans-serif" if text else None,
            "font_size": 14.0 if text else None,
            "asset_sha256": asset,
        }

    return {
        "project": [{"singleton": 1, "id": "mkw-zip-example", "title": "MKW · Beispiel", "revision": 0}],
        "artboards": [{"id": "board-1", "position": 0, "name": "Slide 1", "width": width, "height": height}],
        "layers": [{"id": "layer-1", "artboard_id": "board-1", "position": 0, "name": "Motiv"}],
        "assets": [{"sha256": digest, "mime": "image/png", "width": tile_width, "height": tile_height}],
        "objects": [
            item("01-title", 0, 12, 12, 104, 14, text="MKW"),
            item("02-image", 1, 12, 36, tile_width, tile_height, asset=digest),
            item("03-image", 2, 68, 36, tile_width, tile_height, asset=digest),
        ],
    }, {digest: original}, {"board-1": png(width, height, preview)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("generate", "inspect"))
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    try:
        if args.action == "generate":
            app_version = json.loads(
                (Path(__file__).resolve().parents[2] / "package.json").read_text(encoding="utf-8")
            )["version"]
            write(args.file, *fixture(), app_version)
        records, assets, previews = read(args.file)
        print(json.dumps({
            "project": records["project"][0],
            "artboards": len(records["artboards"]),
            "layers": len(records["layers"]),
            "objects": len(records["objects"]),
            "assets": len(assets),
            "previews": len(previews),
            "sha256": sha256(args.file.read_bytes()),
        }, ensure_ascii=False, indent=2))
    except (FormatError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
