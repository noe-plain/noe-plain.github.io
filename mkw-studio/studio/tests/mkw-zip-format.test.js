const test = require("node:test");
const assert = require("node:assert/strict");
const codec = Promise.all([
  import("../static/mkw-zip/zip-reader.mjs"),
  import("../static/mkw-zip/zip-writer.mjs"),
]);

async function fixture({ version = 2, paths, changeMedia = false } = {}) {
  const [{ crc32, sha256 }, { archiveBlob }] = await codec;
  const image = new TextEncoder().encode("test asset");
  const hash = await sha256(image);
  const path = `assets/${hash}.bin`;
  const database = new Uint8Array(512);
  new DataView(database.buffer).setUint16(16, 512);
  const schema = {
    appVersion: "2.0.0",
    format: "mkw-studio-zip",
    formatVersion: version,
    minimumReaderVersion: version,
    schemaVersion: 2,
    source: { family: "gzip", sha256: hash, modelSha256: hash },
    entries: {
      "project.sqlite": {
        bytes: database.length,
        sha256: await sha256(database),
      },
      [path]: { bytes: image.length, sha256: hash },
    },
  };
  // The entry CRC is recomputed even for the altered payload.
  if (changeMedia) image[0] ^= 1;
  const entries = [
    ["manifest.json", new TextEncoder().encode(JSON.stringify(schema))],
    ["project.sqlite", database],
    ...(paths ?? [path]).map((name) => [name, image]),
  ];
  return {
    file: archiveBlob(
      entries.map(([name, data]) => ({ name, data, crc: crc32(data) })),
    ),
    hash,
    database,
    path,
  };
}

test("MKW ZIP accepts v2 and v3 and refuses unsupported versions", async () => {
  const [{ openMkwZip }] = await codec;
  for (const version of [2, 3]) {
    const { file, database } = await fixture({ version });
    const zip = await openMkwZip(file);
    assert.equal(zip.manifest.formatVersion, version);
    assert.deepEqual(await zip.readDatabase(), database);
    assert.equal(zip.counts.assetReadBytes, 0);
  }
  await assert.rejects(openMkwZip((await fixture({ version: 4 })).file), /ZIP/);
});

test("MKW ZIP refuses traversal, duplicate members and truncation", async () => {
  const [{ openMkwZip }] = await codec;
  const { file, path } = await fixture();
  const duplicate = await fixture({ paths: [path, path] });
  const traversal = await fixture({ paths: ["../asset"] });
  for (const bad of [duplicate.file, traversal.file, file.slice(0, -1)])
    await assert.rejects(openMkwZip(bad), /ZIP/);
});

test("MKW ZIP verifies an unopened asset only on demand, even with a valid ZIP CRC", async () => {
  const [{ openMkwZip }] = await codec;
  const { file, hash } = await fixture({ changeMedia: true });
  const zip = await openMkwZip(file);
  await zip.readDatabase();
  assert.equal(zip.counts.assetReadBytes, 0);
  await assert.rejects(zip.readAsset(hash), /Prüfsumme/);
});

test("MKW ZIP no-op writes nothing, and fixed-size updates skip asset payloads", async () => {
  const [{ openMkwZip }, { planSnapshot }] = await codec;
  const { file, database, path } = await fixture();
  const zip = await openMkwZip(file);
  const previous = await planSnapshot(zip, database);
  assert(previous.unchanged && previous.bytesWritten === 0);
  database[30] += 1;
  const next = await planSnapshot(zip, database);
  const asset = zip.entries.get(path);
  const start = await zip.payloadOffset(asset);
  assert(next.keepExistingData);
  for (const { position, data } of next.writes)
    assert(
      position >= start + asset.size || position + data.byteLength <= start,
    );
  assert.equal(zip.counts.assetReadBytes, 0);
});
