#!/bin/sh
# Independent inspection of the committed fixture. Uses any compatible unzip
# and the SQLite command-line program instead of the container codec.
set -eu
archive=${1:-examples/mkw-zip-v1.mkw}
workspace=$(mktemp -d)
trap 'rm -rf "$workspace"' EXIT

unzip -t "$archive"
unzip -p "$archive" project.sqlite > "$workspace/project.sqlite"
sqlite() {
    sqlite3 -batch -bail -readonly "$workspace/project.sqlite" "$1"
}

test "$(sqlite 'PRAGMA integrity_check')" = ok
test -z "$(sqlite 'PRAGMA foreign_key_check')"
test "$(sqlite 'PRAGMA application_id')" = 1296783194
test "$(sqlite 'PRAGMA user_version')" = 1
test "$(sqlite 'SELECT id, title, revision FROM project')" = 'mkw-zip-example|MKW · Beispiel|0'
test "$(sqlite 'SELECT width, height FROM artboards')" = '128|80'
test "$(sqlite 'SELECT name FROM layers')" = 'Motiv'
test "$(sqlite 'SELECT text FROM objects WHERE text IS NOT NULL')" = 'MKW'
test "$(sqlite 'SELECT count(*), count(DISTINCT asset_sha256) FROM objects WHERE asset_sha256 IS NOT NULL')" = '2|1'
test "$(sqlite 'SELECT mime, width, height FROM assets')" = 'image/png|48|32'

printf '%s\n' 'SQLite integrity, relations, version and fixture content verified.'
sqlite 'SELECT id, layer_id, text, asset_sha256 FROM objects ORDER BY position'
