// Portable revisions use the same SQLite schema and binary media catalogue.
// V3 binds the current layout by its database hash. Source identity in the
// manifest and database is provenance from the original conversion.
import {
  crc32,
  sha256,
  MAX_ARCHIVE,
  MAX_DATABASE,
  MAX_MANIFEST,
} from "./zip-reader.mjs?v=80a0a0d9436c";

const encoder = new TextEncoder();
const manifestName = "manifest.json";
const databaseName = "project.sqlite";

function number32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function sizeOf(data) {
  return data instanceof Blob ? data.size : data.byteLength;
}

// Rebuild compactly with one entry per referenced asset. A Blob slice reuses
// the original encoded media, including when copying to a separate download.
export function archiveBlob(items) {
  if (items.length > 5000) throw Error("Zu viele MKW-ZIP-Einträge.");
  const body = [];
  const central = [];
  let size = 0;
  let directorySize = 0;
  for (const { name, data, crc } of items) {
    const encoded = encoder.encode(name);
    const count = sizeOf(data);
    const header = new Uint8Array(30 + encoded.length);
    const local = new DataView(header.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, 33, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, count, true);
    local.setUint32(22, count, true);
    local.setUint16(26, encoded.length, true);
    header.set(encoded, 30);
    body.push(header, data);

    const record = new Uint8Array(46 + encoded.length);
    const entry = new DataView(record.buffer);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    record.set(header.subarray(4, 26), 6);
    entry.setUint16(28, encoded.length, true);
    entry.setUint32(42, size, true);
    record.set(encoded, 46);
    central.push(record);
    size += header.length + count;
    directorySize += record.length;
  }
  const tail = new Uint8Array(22);
  const end = new DataView(tail.buffer);
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, items.length, true);
  end.setUint16(10, items.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, size, true);
  if (size + directorySize + tail.length > MAX_ARCHIVE)
    throw Error("MKW-ZIP ist zu gross.");
  return new Blob([...body, ...central, tail], { type: "application/zip" });
}

function changedDatabasePages(before, after, position) {
  const storedPageSize = new DataView(
    before.buffer,
    before.byteOffset,
  ).getUint16(16);
  const pageSize = storedPageSize === 1 ? 65536 : storedPageSize;
  if (
    pageSize < 512 ||
    pageSize > 65536 ||
    pageSize & (pageSize - 1) ||
    before.length % pageSize
  )
    throw Error("Ungültige SQLite-Seitengrösse.");
  const changed = [];
  for (let offset = 0; offset < before.length; offset += pageSize) {
    const page = after.subarray(offset, offset + pageSize);
    if (page.some((byte, i) => byte !== before[offset + i]))
      changed.push({ position: position + offset, data: page });
  }
  return changed;
}

function entryChecksums(entry, bytes) {
  const crc = number32(crc32(bytes));
  return [
    { position: entry.offset + 14, data: crc },
    { position: entry.central + 16, data: crc },
  ];
}

function encodeManifest(metadata, database, hash, assets) {
  const result = encoder.encode(
    JSON.stringify({
      ...metadata,
      format: "mkw-studio-zip",
      formatVersion: 3,
      schemaVersion: 2,
      minimumReaderVersion: 3,
      entries: {
        "project.sqlite": { bytes: database.byteLength, sha256: hash },
        ...Object.fromEntries(
          [...assets].map(([sha256, item]) => [
            `assets/${sha256}.bin`,
            { bytes: item.length, sha256 },
          ]),
        ),
      },
    }),
  );
  if (result.length > MAX_MANIFEST) throw Error("MKW-Manifest ist zu gross.");
  return result;
}

function fallback(manifest, database, items) {
  return archiveBlob([
    { name: manifestName, data: manifest, crc: crc32(manifest) },
    { name: databaseName, data: database, crc: crc32(database) },
    ...items,
  ]);
}

export async function buildSnapshot(database, assets, metadata) {
  const manifest = encodeManifest(
    metadata,
    database,
    await sha256(database),
    assets,
  );
  return {
    identity: await sha256(manifest),
    blob: fallback(
      manifest,
      database,
      [...assets].map(([hash, { data }]) => ({
        name: `assets/${hash}.bin`,
        data,
        crc: crc32(data),
      })),
    ),
  };
}

export async function planSnapshot(
  zip,
  database,
  assets = new Map([...zip.assets].map(([hash, length]) => [hash, { length }])),
  baseline,
) {
  if (database.byteLength > MAX_DATABASE)
    throw Error("MKW-Projektdatenbank ist zu gross.");
  const hash = await sha256(database);
  const mediaUnchanged =
    zip.assets.size === assets.size &&
    [...assets].every(
      ([digest, asset]) => zip.assets.get(digest) === asset.length,
    );
  const oldManifest = zip.entries.get(manifestName);
  const oldDatabase = zip.entries.get(databaseName);
  const manifestOffset = await zip.payloadOffset(oldManifest);
  const expected =
    zip.file instanceof File
      ? {
          size: zip.file.size,
          lastModified: zip.file.lastModified,
          probe: {
            offset: manifestOffset,
            length: oldManifest.size,
            sha256: zip.identity,
          },
        }
      : undefined;
  if (mediaUnchanged && hash === zip.manifest.entries[databaseName].sha256) {
    return {
      identity: zip.identity,
      unchanged: true,
      expected,
      size: zip.file.size,
      bytesWritten: 0,
      writes: [],
    };
  }
  const manifest = encodeManifest(zip.manifest, database, hash, assets);
  const identity = await sha256(manifest);
  if (
    mediaUnchanged &&
    oldManifest.size === manifest.length &&
    oldDatabase.size === database.byteLength
  ) {
    const oldDatabaseBytes = baseline ?? (await zip.readDatabase());
    const writes = [
      ...changedDatabasePages(
        oldDatabaseBytes,
        database,
        await zip.payloadOffset(oldDatabase),
      ),
      { position: manifestOffset, data: manifest },
      ...entryChecksums(oldManifest, manifest),
      ...entryChecksums(oldDatabase, database),
    ].sort((a, b) => a.position - b.position);
    return {
      identity,
      keepExistingData: true,
      expected,
      size: zip.file.size,
      writes,
      bytesWritten: writes.reduce(
        (total, write) => total + write.data.byteLength,
        0,
      ),
    };
  }

  const items = [];
  for (const [digest, asset] of assets) {
    const name = `assets/${digest}.bin`;
    const entry = zip.entries.get(name);
    if (entry?.size === asset.length) {
      const start = await zip.payloadOffset(entry);
      items.push({
        name,
        crc: entry.crc,
        data: zip.file.slice(start, start + entry.size),
      });
    } else {
      if (!asset.data) throw Error("MKW-ZIP-Medium fehlt für die neue Datei.");
      items.push({ name, crc: crc32(asset.data), data: asset.data });
    }
  }
  const data = fallback(manifest, database, items);
  return {
    identity,
    keepExistingData: false,
    expected,
    size: data.size,
    writes: [{ position: 0, data }],
    bytesWritten: data.size,
  };
}
