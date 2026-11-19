// The compatibility entry point hydrates the normal Studio model. It does
// not install an OPFS session or change how the editor stores existing projects.
import { checkSchema, readScope, verifiedReferences } from "./model-db.mjs";
import { archiveBlob } from "./zip-writer.mjs";
import {
  openMkwZip,
  sha256,
  crc32,
  MAX_ARCHIVE,
  MAX_DATABASE,
} from "./zip-reader.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const maxExpanded = 768 * 1024 ** 2;
const collections = {
  project: new Set(["formats", "boards", "images", "fonts", "logos"]),
  carousel: new Set(["artboards", "objects", "folders", "layers"]),
  campaign: new Set(["rows", "links"]),
};
const stringify = JSON.stringify;

function toBase64(bytes) {
  const parts = [];
  for (let i = 0; i < bytes.length; i += 24576)
    parts.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 24576))));
  return parts.join("");
}

function encodeVerbatim(value) {
  // Match the migration reader's UTF-8 with surrogate preservation.
  const chunks = [];
  let begin = 0;
  for (const match of value.matchAll(/[\ud800-\udfff]/gu)) {
    const unit = match[0].charCodeAt(0);
    chunks.push(encoder.encode(value.slice(begin, match.index)));
    chunks.push(
      Uint8Array.of(0xed, 0x80 | ((unit >> 6) & 63), 0x80 | (unit & 63)),
    );
    begin = match.index + 1;
  }
  if (!chunks.length) return encoder.encode(value);
  chunks.push(encoder.encode(value.slice(begin)));
  const bytes = new Uint8Array(
    chunks.reduce((size, chunk) => size + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function decodeVerbatim(bytes) {
  const parts = [];
  let begin = 0;
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (
      bytes[i] !== 0xed ||
      bytes[i + 1] < 0xa0 ||
      bytes[i + 1] > 0xbf ||
      (bytes[i + 2] & 0xc0) !== 0x80
    )
      continue;
    parts.push(decoder.decode(bytes.subarray(begin, i)));
    parts.push(
      String.fromCharCode(
        0xd000 | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63),
      ),
    );
    i += 2;
    begin = i + 1;
  }
  parts.push(decoder.decode(bytes.subarray(begin)));
  return parts.join("");
}

export async function decodeZip(file, sqlite, schema) {
  const zip = await openMkwZip(file);
  const input = await zip.readDatabase();
  const db = new sqlite.oo1.DB(":memory:");
  let project;
  let refs;
  try {
    const { capi, wasm } = sqlite;
    const capacity = input.length + 32;
    const ptr = wasm.alloc(capacity);
    const heap = wasm.heap8u();
    heap.set(input, ptr);
    heap.fill(0, ptr + input.length, ptr + capacity);
    db.checkRc(
      capi.sqlite3_deserialize(
        db.pointer,
        "main",
        ptr,
        input.length,
        capacity,
        capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY,
      ),
    );
    db.exec(
      "PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON; PRAGMA query_only=ON",
    );
    checkSchema(db, sqlite, schema);
    const origin = db.selectArray(
      "SELECT source_family,source_sha256,model_sha256 FROM project",
    );
    if (
      stringify(origin) !==
      stringify([zip.source.family, zip.source.sha256, zip.source.modelSha256])
    )
      throw Error("MKW-Quelle passt nicht zur Projektbeschreibung.");
    project = readScope(db, "project");
    refs = verifiedReferences(db, project, zip);
  } finally {
    db.close();
  }

  const urls = new Map();
  const byHash = new Map();
  let expanded = 0;
  for (const [path, ref] of refs) {
    const length = zip.assets.get(ref.hash);
    expanded +=
      ref.encoding === "base64"
        ? 4 * Math.ceil(length / 3) + ref.prefix.length
        : length;
    if (expanded > maxExpanded)
      throw Error("Die entpackte MKW-ZIP-Datei ist zu gross.");
    const key = stringify([ref.hash, ref.encoding, ref.prefix]);
    let url = urls.get(key);
    if (url === undefined) {
      const encodingKey = stringify([ref.hash, ref.encoding]);
      if (!byHash.has(encodingKey)) {
        const asset = await zip.readAsset(ref.hash);
        byHash.set(
          encodingKey,
          ref.encoding === "base64" ? toBase64(asset) : decodeVerbatim(asset),
        );
      }
      url = ref.prefix + byHash.get(encodingKey);
      urls.set(key, url);
    }
    const fields = JSON.parse(path);
    const leaf = fields.pop();
    fields.reduce((record, field) => record[field], project)[leaf] = url;
  }
  return project;
}

function encodeDataUrl(value) {
  const comma = value.indexOf(",");
  const prefix = value.slice(0, comma + 1);
  if (prefix.toLowerCase().endsWith(";base64,")) {
    const encoded = value.slice(comma + 1);
    const padding = encoded.endsWith("==") ? 2 : Number(encoded.endsWith("="));
    try {
      if (
        encoded.length % 4 === 0 &&
        encoded.indexOf("=") === (padding ? encoded.length - padding : -1)
      ) {
        const data = new Uint8Array((encoded.length / 4) * 3 - padding);
        let offset = 0;
        for (let pos = 0; pos < encoded.length; pos += 32768) {
          const part = encoded.slice(pos, pos + 32768);
          const raw = atob(part);
          if (btoa(raw) !== part) throw Error("Noncanonical base64");
          for (let i = 0; i < raw.length; i++)
            data[offset++] = raw.charCodeAt(i);
        }
        return { data, prefix, encoding: "base64" };
      }
    } catch {}
  }
  return { data: encodeVerbatim(value), prefix: "", encoding: "verbatim" };
}

async function separateMedia(document) {
  const originals = new Map();
  const assets = new Map();
  const refs = [];
  let total = 0;
  async function visit(value, path) {
    if (typeof value === "string" && /^data:[^,]*,/i.test(value)) {
      if (!originals.has(value)) {
        const { data, prefix, encoding } = encodeDataUrl(value);
        const hash = await sha256(data);
        if (!assets.has(hash)) {
          total += data.byteLength;
          if (total > MAX_ARCHIVE || assets.size >= 4998)
            throw Error("Die MKW-ZIP-Datei überschreitet das Grössenlimit.");
          assets.set(hash, data);
        }
        originals.set(value, [hash, prefix, encoding]);
      }
      refs.push([stringify(path), ...originals.get(value)]);
      return null;
    }
    if (Array.isArray(value)) {
      const items = [];
      for (const [i, child] of value.entries())
        items.push(await visit(child ?? null, [...path, i]));
      return items;
    }
    if (value && typeof value === "object") {
      const record = Object.create(null);
      for (const [name, child] of Object.entries(value))
        if (child !== undefined)
          record[name] = await visit(child, [...path, name]);
      return record;
    }
    return value;
  }
  const layout = await visit(document, []);
  return { layout, assets, refs };
}

function insertScope(db, scope, values) {
  let position = 0;
  for (const [name, value] of Object.entries(values)) {
    const field = stringify(name);
    if (
      scope === "project" &&
      ["carousel", "campaign"].includes(name) &&
      value &&
      !Array.isArray(value) &&
      typeof value === "object"
    ) {
      db.exec("INSERT INTO fields VALUES(?,?,?,'scope',NULL)", {
        bind: [scope, position, field],
      });
      insertScope(db, name, value);
    } else if (collections[scope].has(name) && Array.isArray(value)) {
      db.exec("INSERT INTO fields VALUES(?,?,?,'records',NULL)", {
        bind: [scope, position, field],
      });
      for (const [index, item] of value.entries()) {
        const id =
          typeof item?.id === "string"
            ? item.id
            : typeof item?.role === "string"
              ? item.role
              : null;
        db.exec("INSERT INTO records VALUES(?,?,?,?,?)", {
          bind: [scope, field, index, id, stringify(item)],
        });
      }
    } else {
      db.exec("INSERT INTO fields VALUES(?,?,?,'value',?)", {
        bind: [scope, position, field, stringify(value)],
      });
    }
    position++;
  }
}

export async function encodeZip(document, appVersion, sqlite, schema) {
  const { layout, assets, refs } = await separateMedia(document);
  // Source family 'json' identifies the in-memory Studio model. Its media
  // fingerprints are captured in refs, without a second expanded JSON copy.
  const identity = await sha256(encoder.encode(stringify([layout, refs])));
  const source = { family: "json", sha256: identity, modelSha256: identity };
  const db = new sqlite.oo1.DB(":memory:");
  let database;
  try {
    db.exec("PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF");
    db.exec(schema);
    db.transaction(() => {
      db.exec("INSERT INTO project VALUES(1,?,?,?)", {
        bind: [source.family, identity, identity],
      });
      insertScope(db, "project", layout);
      for (const [hash, bytes] of assets)
        db.exec("INSERT INTO assets VALUES(?,?)", {
          bind: [hash, bytes.length],
        });
      for (const ref of refs)
        db.exec("INSERT INTO asset_refs VALUES(?,?,?,?)", { bind: ref });
    });
    checkSchema(db, sqlite, schema);
    verifiedReferences(db, layout, {
      assets: new Map([...assets].map(([hash, bytes]) => [hash, bytes.length])),
    });
    database = sqlite.capi.sqlite3_js_db_export(db.pointer);
  } finally {
    db.close();
  }
  if (database.length > MAX_DATABASE)
    throw Error("MKW-Projektdatenbank ist zu gross.");
  const entries = {
    "project.sqlite": {
      bytes: database.length,
      sha256: await sha256(database),
    },
  };
  const items = [
    { name: "project.sqlite", data: database, crc: crc32(database) },
  ];
  for (const [hash, data] of assets) {
    const name = `assets/${hash}.bin`;
    entries[name] = { bytes: data.length, sha256: hash };
    items.push({ name, data, crc: crc32(data) });
  }
  const manifest = encoder.encode(
    stringify({
      format: "mkw-studio-zip",
      formatVersion: 3,
      schemaVersion: 2,
      minimumReaderVersion: 3,
      appVersion,
      source,
      entries,
    }),
  );
  return archiveBlob([
    { name: "manifest.json", data: manifest, crc: crc32(manifest) },
    ...items,
  ]);
}
