PRAGMA application_id = 1296783194; -- ASCII "MKWZ"
PRAGMA user_version = 2;

CREATE TABLE project (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    source_family TEXT NOT NULL CHECK (source_family IN ('json', 'gzip', 'blocks')),
    source_sha256 TEXT NOT NULL,
    model_sha256 TEXT NOT NULL
) STRICT;

CREATE TABLE fields (
    scope TEXT NOT NULL CHECK (scope IN ('project', 'carousel', 'campaign')),
    position INTEGER NOT NULL CHECK (position >= 0),
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('value', 'records', 'scope')),
    json_value TEXT,
    CHECK ((kind = 'value') = (json_value IS NOT NULL)),
    UNIQUE (scope, position),
    PRIMARY KEY (scope, name)
) STRICT;

CREATE TABLE records (
    scope TEXT NOT NULL,
    collection TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    legacy_id TEXT,
    json_value TEXT NOT NULL,
    FOREIGN KEY (scope, collection) REFERENCES fields(scope, name),
    PRIMARY KEY (scope, collection, position)
) STRICT;
CREATE INDEX records_by_identity ON records(scope, collection, legacy_id);

CREATE TABLE assets (
    sha256 TEXT PRIMARY KEY NOT NULL,
    byte_count INTEGER NOT NULL CHECK (byte_count >= 0)
) STRICT;

CREATE TABLE asset_refs (
    path_json TEXT PRIMARY KEY NOT NULL,
    sha256 TEXT NOT NULL REFERENCES assets(sha256),
    url_prefix TEXT NOT NULL,
    encoding TEXT NOT NULL CHECK (encoding IN ('base64', 'verbatim'))
) STRICT;
