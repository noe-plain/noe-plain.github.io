/* Native MKW files keep immutable binary assets before a replaceable layout index. */
(function (root) {
  "use strict";
  const magic = new TextEncoder().encode("MKWBLK1\n"),
    headerSize = 24,
    maxIndex = 64 * 1024 * 1024,
    collections = ["images", "logos", "fonts"];
  const invalid = () =>
    Error("Die MKW-Datei enthält ungültige oder unvollständige Datenblöcke.");
  async function isBlockFile(file) {
    const bytes = new Uint8Array(
      await file.slice(0, magic.length).arrayBuffer(),
    );
    return (
      bytes.length === magic.length &&
      bytes.every((byte, i) => byte === magic[i])
    );
  }
  async function readIndex(file) {
    if (!(await isBlockFile(file))) return null;
    if (file.size < headerSize) throw invalid();
    const view = new DataView(await file.slice(0, headerSize).arrayBuffer()),
      offset = Number(view.getBigUint64(8, true)),
      length = Number(view.getBigUint64(16, true));
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < headerSize ||
      length <= 0 ||
      length > maxIndex ||
      offset + length !== file.size
    )
      throw invalid();
    let bytes = 0;
    const stream = file
      .slice(offset)
      .stream()
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            bytes += chunk.byteLength;
            if (bytes > maxIndex) throw invalid();
            controller.enqueue(chunk);
          },
        }),
      );
    const index = await new Response(stream).json();
    if (
      index.format !== "mkw-blocks" ||
      index.version !== 1 ||
      !index.document ||
      !Array.isArray(index.blocks)
    )
      throw invalid();
    const blocks = new Map();
    let end = headerSize;
    for (const block of index.blocks) {
      if (
        !block ||
        !/^[a-f0-9]{64}$/.test(block.key) ||
        blocks.has(block.key) ||
        block.offset !== end ||
        !Number.isSafeInteger(block.size) ||
        block.size < 0 ||
        !/^data:[^,\r\n]{0,256};base64,$/.test(block.prefix)
      )
        throw invalid();
      end += block.size;
      if (!Number.isSafeInteger(end) || end > offset) throw invalid();
      blocks.set(block.key, block);
    }
    if (end !== offset) throw invalid();
    const refs = new Set();
    for (const collection of collections) {
      if (!Array.isArray(index.document[collection])) throw invalid();
      for (const item of index.document[collection]) {
        if (!item || item.data !== undefined) throw invalid();
        if (item.assetRef) {
          if (!blocks.has(item.assetRef)) throw invalid();
          refs.add(item.assetRef);
        }
      }
    }
    if (refs.size !== blocks.size) throw invalid();
    return { ...index, offset, blocks };
  }
  async function assetBlob(data) {
    const comma = data.indexOf(","),
      prefix = data.slice(0, comma + 1);
    if (!/^data:[^,\r\n]{0,256};base64,$/.test(prefix)) throw invalid();
    const parts = [];
    // Small aligned chunks avoid long main-thread base64 conversions.
    for (let i = comma + 1; i < data.length; i += 256 * 1024) {
      const binary = atob(data.slice(i, i + 256 * 1024));
      parts.push(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { prefix, blob: new Blob(parts) };
  }
  async function prepare(packed, file, { readAsset } = {}) {
    const previous = file && (await readIndex(file)),
      reuse =
        !!previous &&
        previous.document.projectId === packed.document.projectId &&
        [...previous.blocks.keys()].every((key) => packed.assets.has(key)),
      blocks = reuse ? new Map(previous.blocks) : new Map(),
      writes = [];
    let offset = reuse ? previous.offset : headerSize;
    for (const [key, data] of packed.assets) {
      if (blocks.has(key)) continue;
      const old = previous?.blocks.get(key);
      let blob, prefix;
      if (old) {
        blob = file.slice(old.offset, old.offset + old.size);
        prefix = old.prefix;
      } else {
        const stored = readAsset && (await readAsset(key));
        if (stored instanceof Blob) {
          prefix = data.slice(0, data.indexOf(",") + 1);
          if (!/^data:[^,\r\n]{0,256};base64,$/.test(prefix)) throw invalid();
          blob = stored;
        } else ({ blob, prefix } = await assetBlob(data));
      }
      blocks.set(key, { key, offset, size: blob.size, prefix });
      writes.push({ position: offset, data: blob });
      offset += blob.size;
    }
    const index = {
        format: "mkw-blocks",
        version: 1,
        document: packed.document,
        blocks: [...blocks.values()],
      },
      text = JSON.stringify(index);
    if (
      text.length > maxIndex ||
      new TextEncoder().encode(text).byteLength > maxIndex
    )
      throw Error("Die Projektdaten sind zu umfangreich.");
    if (
      reuse &&
      JSON.stringify(previous.document) === JSON.stringify(packed.document) &&
      writes.length === 0
    )
      return { unchanged: true, bytesWritten: 0 };
    const data = await new Response(
        new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")),
      ).blob(),
      header = new Uint8Array(headerSize),
      view = new DataView(header.buffer);
    header.set(magic);
    view.setBigUint64(8, BigInt(offset), true);
    view.setBigUint64(16, BigInt(data.size), true);
    writes.push(
      { position: offset, data },
      { position: 0, data: new Blob([header]) },
    );
    return {
      keepExistingData: reuse,
      writes,
      size: offset + data.size,
      bytesWritten: writes.reduce((sum, write) => sum + write.data.size, 0),
    };
  }
  async function decode(file, { maxBytes = Infinity } = {}) {
    const index = await readIndex(file);
    if (!index) throw invalid();
    if (Number.isFinite(maxBytes)) {
      const total =
        new TextEncoder().encode(JSON.stringify(index.document)).byteLength +
        [...index.blocks.values()].reduce(
          (sum, block) =>
            sum + block.prefix.length + Math.ceil(block.size / 3) * 4,
          0,
        );
      if (total > maxBytes) throw Error("Die entpackte Datei ist zu gross.");
    }
    const values = new Map();
    for (const [key, block] of index.blocks) {
      const bytes = new Uint8Array(
          await file
            .slice(block.offset, block.offset + block.size)
            .arrayBuffer(),
        ),
        parts = [];
      for (let i = 0; i < bytes.length; i += 48 * 1024) {
        parts.push(
          btoa(String.fromCharCode(...bytes.subarray(i, i + 48 * 1024))),
        );
        if (i % (48 * 1024 * 8) === 0)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const data = block.prefix + parts.join(""),
        digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(data),
        ),
        actual = [...new Uint8Array(digest)]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
      if (actual !== key) throw invalid();
      values.set(key, data);
    }
    for (const collection of collections)
      for (const item of index.document[collection]) {
        if (item.assetRef) item.data = values.get(item.assetRef);
        delete item.assetRef;
      }
    return index.document;
  }
  const api = { isBlockFile, readIndex, prepare, decode };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWProjectBlocks = api;
})(globalThis);
