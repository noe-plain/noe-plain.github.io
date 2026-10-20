/* MKW remains JSON, but no operation assembles the complete asset payload as a string. */
(function (root) {
  "use strict";
  const collections = ["images", "logos", "fonts"],
    blocks =
      typeof module !== "undefined"
        ? require("./project-blocks.js")
        : root.MKWProjectBlocks;
  async function encode(project, options) {
    return encodeDocument(MKWProjectAssets.compact(project), options);
  }
  async function encodeDocument(
    document,
    { compress = true, assetCollections = collections } = {},
  ) {
    const metadata = { ...document };
    for (const key of assetCollections) delete metadata[key];
    async function* values() {
      yield JSON.stringify(metadata).slice(0, -1);
      for (const key of assetCollections) {
        yield `,${JSON.stringify(key)}:[`;
        for (let i = 0; i < document[key].length; i++) {
          if (i) yield ",";
          yield JSON.stringify(document[key][i]);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        yield "]";
      }
      yield "}";
    }
    const iterator = values(),
      encoder = new TextEncoder();
    let stream = new ReadableStream({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        return iterator.return();
      },
    });
    const compressed = compress && typeof CompressionStream !== "undefined";
    if (compressed) stream = stream.pipeThrough(new CompressionStream("gzip"));
    const reader = stream.getReader(),
      parts = [];
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parts.push(new Blob([next.value]));
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    return new Blob(parts, {
      type: compressed ? "application/gzip" : "application/json",
    });
  }
  async function decode(file, { maxBytes = Infinity } = {}) {
    if (file.size > maxBytes) throw Error("Die Datei ist zu gross.");
    if (file.slice && (await blocks.isBlockFile(file)))
      return blocks.decode(file, { maxBytes });
    const header = file.slice
      ? new Uint8Array(await file.slice(0, 2).arrayBuffer())
      : [];
    const compressed = header[0] === 0x1f && header[1] === 0x8b;
    if (!compressed && file.size <= 32 * 1024 * 1024)
      return JSON.parse(await file.text());
    let stream = file.stream();
    if (compressed)
      stream = stream.pipeThrough(new DecompressionStream("gzip"));
    if (Number.isFinite(maxBytes)) {
      let bytes = 0;
      stream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            bytes += chunk.byteLength;
            if (bytes > maxBytes)
              throw Error(
                "Die entpackte Setup-Datei ist zu gross (maximal 256 MB).",
              );
            controller.enqueue(chunk);
          },
        }),
      );
    }
    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
    let chunk = "",
      pos = 0,
      ended = false;
    const invalid = () =>
      new Error(
        "Die MKW-Datei enthält ungültige oder unvollständige Projektdaten.",
      );
    async function available() {
      while (pos === chunk.length && !ended) {
        const next = await reader.read();
        chunk = next.value || "";
        pos = 0;
        ended = next.done;
      }
      return pos < chunk.length;
    }
    async function whitespace() {
      while (await available()) {
        while (pos < chunk.length && /\s/.test(chunk[pos])) pos++;
        if (pos < chunk.length) return chunk[pos];
      }
      return "";
    }
    async function expect(char) {
      if ((await whitespace()) !== char) throw invalid();
      pos++;
    }
    async function value() {
      await whitespace();
      const parts = [];
      let depth = 0,
        quoted = false,
        escaped = false,
        started = false;
      while (await available()) {
        const start = pos;
        for (; pos < chunk.length; pos++) {
          const char = chunk[pos];
          if (!quoted && depth === 0 && started && /[,}\]:\s]/.test(char)) {
            parts.push(chunk.slice(start, pos));
            return JSON.parse(parts.join(""));
          }
          started = true;
          if (quoted) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === '"') quoted = false;
            else {
              const quote = chunk.indexOf('"', pos + 1),
                slash = chunk.indexOf("\\", pos + 1);
              pos =
                Math.min(
                  quote < 0 ? chunk.length : quote,
                  slash < 0 ? chunk.length : slash,
                ) - 1;
            }
          } else if (char === '"') quoted = true;
          else if (char === "{" || char === "[") depth++;
          else if (char === "}" || char === "]") depth--;
          if (depth < 0) throw invalid();
        }
        parts.push(chunk.slice(start, pos));
      }
      if (!started || quoted || depth) throw invalid();
      return JSON.parse(parts.join(""));
    }
    try {
      await expect("{");
      const document = {};
      if ((await whitespace()) !== "}") {
        while (true) {
          const key = await value();
          if (typeof key !== "string" || Object.hasOwn(document, key))
            throw invalid();
          await expect(":");
          let item;
          if ((await whitespace()) === "[") {
            pos++;
            item = [];
            if ((await whitespace()) !== "]")
              while (true) {
                item.push(await value());
                if ((await whitespace()) !== ",") break;
                pos++;
              }
            await expect("]");
          } else item = await value();
          Object.defineProperty(document, key, {
            value: item,
            enumerable: true,
            writable: true,
            configurable: true,
          });
          if ((await whitespace()) !== ",") break;
          pos++;
        }
      }
      await expect("}");
      if (await whitespace()) throw invalid();
      return document;
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  }
  const api = { encode, encodeDocument, decode };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWProjectFile = api;
})(globalThis);
