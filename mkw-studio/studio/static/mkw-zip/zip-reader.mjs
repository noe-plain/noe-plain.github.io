// Read STORED MKW ZIP profiles with schema 2 without extracting the archive.
export const MAX_ARCHIVE = 576 * 1024 ** 2;
export const MAX_DATABASE = 32 * 1024 ** 2;
export const MAX_MANIFEST = 1024 ** 2;
const decoder = new TextDecoder("utf-8", { fatal: true });
const hashPattern = /^[a-f0-9]{64}$/;
const assetPath = (hash) => `assets/${hash}.bin`;
const validName =
  /^(manifest\.json|project\.sqlite|assets\/[a-f0-9]{64}\.bin)$/;
const invalid = () => Error("Ungültiger oder unbekannter MKW-ZIP-Container.");
const view = (bytes) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  return n;
});

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

export async function sha256(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (n) => n.toString(16).padStart(2, "0")).join("");
}

export async function openMkwZip(file) {
  if (!(file instanceof Blob) || file.size < 22 || file.size > MAX_ARCHIVE)
    throw invalid();
  async function read(offset, length) {
    if (offset < 0 || offset + length > file.size) throw invalid();
    const bytes = new Uint8Array(
      await file.slice(offset, offset + length).arrayBuffer(),
    );
    if (bytes.length !== length) throw invalid();
    return bytes;
  }

  // The v2 writer emits a single-disk ZIP with no end comment or ZIP64 records.
  const end = view(await read(file.size - 22, 22));
  const count = end.getUint16(10, true);
  const start = end.getUint32(16, true);
  const length = end.getUint32(12, true);
  if (
    end.getUint32(0, true) !== 0x06054b50 ||
    end.getUint32(4, true) !== 0 ||
    end.getUint16(8, true) !== count ||
    end.getUint16(20, true) !== 0 ||
    count < 2 ||
    count > 5000 ||
    length > MAX_MANIFEST ||
    start + length !== file.size - 22
  )
    throw invalid();

  const directory = await read(start, length);
  const central = view(directory);
  const entries = new Map();
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > length || central.getUint32(cursor, true) !== 0x02014b50)
      throw invalid();
    const flags = central.getUint16(cursor + 8, true);
    const crc = central.getUint32(cursor + 16, true);
    const size = central.getUint32(cursor + 24, true);
    const nameEnd = cursor + 46 + central.getUint16(cursor + 28, true);
    const next =
      nameEnd +
      central.getUint16(cursor + 30, true) +
      central.getUint16(cursor + 32, true);
    const offset = central.getUint32(cursor + 42, true);
    if (
      flags & ~0x800 ||
      central.getUint16(cursor + 10, true) !== 0 ||
      central.getUint32(cursor + 20, true) !== size ||
      central.getUint16(cursor + 34, true) !== 0 ||
      next > length ||
      offset + 30 + size > start
    )
      throw invalid();
    const name = decoder.decode(directory.subarray(cursor + 46, nameEnd));
    if (!validName.test(name) || entries.has(name)) throw invalid();
    entries.set(name, {
      flags,
      crc,
      size,
      offset,
      name,
      central: start + cursor,
    });
    cursor = next;
  }

  const manifestEntry = entries.get("manifest.json");
  const database = entries.get("project.sqlite");
  if (
    cursor !== length ||
    !manifestEntry ||
    !database ||
    manifestEntry.size > MAX_MANIFEST ||
    database.size > MAX_DATABASE
  )
    throw invalid();
  const ordered = [...entries.values()].sort((a, b) => a.offset - b.offset);
  for (const [i, entry] of ordered.entries()) {
    entry.end = ordered[i + 1]?.offset ?? start;
    if (entry.offset + 30 + entry.name.length + entry.size > entry.end)
      throw invalid();
  }

  async function payloadOffset(entry) {
    const { offset, size, name, flags, crc } = entry;
    const header = view(await read(offset, 30 + name.length));
    const extra = header.getUint16(28, true);
    const payload = offset + header.byteLength + extra;
    if (
      header.getUint32(0, true) !== 0x04034b50 ||
      header.getUint16(6, true) !== flags ||
      header.getUint16(8, true) !== 0 ||
      header.getUint32(14, true) !== crc ||
      header.getUint32(18, true) !== size ||
      header.getUint32(22, true) !== size ||
      header.getUint16(26, true) !== name.length ||
      decoder.decode(new Uint8Array(header.buffer, 30)) !== name ||
      payload + size > entry.end
    )
      throw invalid();
    return payload;
  }
  async function entryBytes(entry) {
    const bytes = await read(await payloadOffset(entry), entry.size);
    if (crc32(bytes) !== entry.crc) throw Error("Ungültige ZIP-Prüfsumme.");
    return bytes;
  }

  const manifestBytes = await entryBytes(manifestEntry);
  const manifest = JSON.parse(decoder.decode(manifestBytes));
  const assets = new Map();
  if (
    manifest?.format !== "mkw-studio-zip" ||
    ![2, 3].includes(manifest.formatVersion) ||
    manifest.schemaVersion !== 2 ||
    manifest.minimumReaderVersion !== manifest.formatVersion ||
    typeof manifest.appVersion !== "string" ||
    !["json", "gzip", "blocks"].includes(manifest.source?.family) ||
    typeof manifest.source.sha256 !== "string" ||
    typeof manifest.source.modelSha256 !== "string" ||
    !hashPattern.test(manifest.source.sha256) ||
    !hashPattern.test(manifest.source.modelSha256) ||
    Object.keys(manifest.entries || {}).length !== entries.size - 1 ||
    Object.hasOwn(manifest.entries || {}, "manifest.json")
  )
    throw invalid();

  for (const [name, entry] of entries) {
    if (name === "manifest.json") continue;
    const record = manifest.entries[name];
    if (
      record?.bytes !== entry.size ||
      typeof record.sha256 !== "string" ||
      !hashPattern.test(record.sha256)
    )
      throw invalid();
    if (name === "project.sqlite") continue;
    if (name !== assetPath(record.sha256)) throw invalid();
    assets.set(record.sha256, entry.size);
  }

  const counts = { assetReads: 0, assetReadBytes: 0 };
  async function verified(entry) {
    const bytes = await entryBytes(entry);
    if ((await sha256(bytes)) !== manifest.entries[entry.name].sha256)
      throw Error("Ungültige MKW-Prüfsumme.");
    return bytes;
  }
  return {
    source: manifest.source,
    manifest,
    file,
    entries,
    payloadOffset,
    identity: await sha256(manifestBytes),
    assets,
    counts,
    readDatabase: () => verified(database),
    async readAsset(hash) {
      const entry = entries.get(assetPath(hash));
      if (!entry) throw Error("MKW-Medium fehlt.");
      counts.assetReads++;
      counts.assetReadBytes += entry.size;
      return verified(entry);
    },
  };
}
