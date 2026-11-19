PRAGMA application_id = 1296783194; -- ASCII "MKWZ"
PRAGMA user_version = 1;

CREATE TABLE project (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 80),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    revision INTEGER NOT NULL CHECK (revision >= 0)
) STRICT;

CREATE TABLE artboards (
    id TEXT PRIMARY KEY NOT NULL,
    position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
    name TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 10000),
    height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 10000)
) STRICT;

CREATE TABLE layers (
    id TEXT PRIMARY KEY NOT NULL,
    artboard_id TEXT NOT NULL REFERENCES artboards(id),
    position INTEGER NOT NULL CHECK (position >= 0),
    name TEXT NOT NULL,
    UNIQUE (artboard_id, position)
) STRICT;

CREATE TABLE assets (
    sha256 TEXT PRIMARY KEY NOT NULL,
    mime TEXT NOT NULL CHECK (mime = 'image/png'),
    width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 10000),
    height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 10000)
) STRICT;

CREATE TABLE objects (
    id TEXT PRIMARY KEY NOT NULL,
    layer_id TEXT NOT NULL REFERENCES layers(id),
    position INTEGER NOT NULL CHECK (position >= 0),
    x REAL NOT NULL CHECK (x BETWEEN -1000000 AND 1000000),
    y REAL NOT NULL CHECK (y BETWEEN -1000000 AND 1000000),
    width REAL NOT NULL CHECK (width > 0 AND width <= 1000000),
    height REAL NOT NULL CHECK (height > 0 AND height <= 1000000),
    text TEXT,
    font_family TEXT,
    font_size REAL,
    asset_sha256 TEXT REFERENCES assets(sha256),
    CHECK (
        (text IS NOT NULL AND font_family IS NOT NULL AND
         font_size IS NOT NULL AND font_size > 0 AND font_size <= 5000 AND asset_sha256 IS NULL)
        OR (asset_sha256 IS NOT NULL AND text IS NULL AND font_family IS NULL AND font_size IS NULL)
    ),
    UNIQUE (layer_id, position)
) STRICT;
