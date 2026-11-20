// The compatibility entry point hydrates the normal Studio model. It does
// not install an OPFS session or change how the editor stores existing projects.
import { checkSchema, readScope, verifiedReferences } from "./model-db.mjs";
import { buildSnapshot, planSnapshot } from "./zip-writer.mjs";
import {
  openMkwZip,
  sha256,
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

function openDatabase(sqlite, input, readOnly) {
  const db = new sqlite.oo1.DB(":memory:");
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
        capi.SQLITE_DESERIALIZE_FREEONCLOSE |
          (readOnly
            ? capi.SQLITE_DESERIALIZE_READONLY
            : capi.SQLITE_DESERIALIZE_RESIZEABLE),
      ),
    );
    db.exec("PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON");
    db.exec(readOnly ? "PRAGMA query_only=ON" : "PRAGMA secure_delete=ON");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function decodeZip(file, sqlite, schema) {
  const zip = await openMkwZip(file);
  const db = openDatabase(sqlite, await zip.readDatabase(), true);
  let project;
  let refs;
  try {
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

async function indexMedia(draft, previous) {
  const { layout, paths, media } = draft;
  const assets = new Map();
  const descriptors = [];
  let total = 0;
  for (const value of media) {
    let descriptor, data;
    if (typeof value === "string") {
      const encoded = encodeDataUrl(value);
      data = encoded.data;
      descriptor = {
        hash: await sha256(data),
        length: data.length,
        prefix: encoded.prefix,
        encoding: encoded.encoding,
      };
    } else {
      descriptor = value;
      if (previous?.assets.get(value.hash) !== value.length)
        throw Error("MKW-ZIP-Medium passt nicht zur verknüpften Datei.");
    }
    const { hash, length } = descriptor;
    if (!assets.has(hash)) {
      total += length;
      if (total > MAX_ARCHIVE || assets.size >= 4998)
        throw Error("Die MKW-ZIP-Datei überschreitet das Grössenlimit.");
      assets.set(hash, { length, data });
    } else if (data && !assets.get(hash).data) {
      assets.get(hash).data = data;
    }
    descriptors.push(descriptor);
  }
  const refs = paths.map(([path, i]) => {
    const { hash, prefix, encoding } = descriptors[i];
    return [path, hash, prefix, encoding];
  });
  return { layout, assets, refs, descriptors };
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

// Match table identities before patching data in its existing SQLite pages.
const layoutTables = [
  {
    read: "SELECT scope,name,position,kind,json_value FROM fields ORDER BY scope,position",
    update: "UPDATE fields SET json_value=? WHERE scope=? AND name=?",
    keys: 2,
  },
  {
    read: "SELECT scope,collection,position,legacy_id,json_value FROM records ORDER BY scope,collection,position",
    update:
      "UPDATE records SET json_value=? WHERE scope=? AND collection=? AND position=?",
    keys: 3,
  },
];

function updateDatabase(sqlite, schema, input, draft) {
  const previous = openDatabase(sqlite, input, false);
  try {
    checkSchema(previous, sqlite, schema);
    for (const query of [
      "SELECT * FROM project",
      "SELECT * FROM assets ORDER BY sha256",
      "SELECT * FROM asset_refs ORDER BY path_json",
    ]) {
      if (
        stringify(previous.selectArrays(query)) !==
        stringify(draft.selectArrays(query))
      )
        return null;
    }
    const patches = [];
    for (const table of layoutTables) {
      const before = previous.selectArrays(table.read);
      const after = draft.selectArrays(table.read);
      if (before.length !== after.length) return null;
      for (const [i, row] of after.entries()) {
        if (row.slice(0, -1).some((value, c) => value !== before[i][c]))
          return null;
        if (row.at(-1) !== before[i].at(-1))
          patches.push([
            table.update,
            [row.at(-1), ...row.slice(0, table.keys)],
          ]);
      }
    }
    if (!patches.length) return input;
    previous.transaction(() => {
      for (const [statement, bind] of patches)
        previous.exec(statement, { bind });
    });
    return sqlite.capi.sqlite3_js_db_export(previous.pointer);
  } finally {
    previous.close();
  }
}

export async function prepareZip(
  draft,
  appVersion,
  sqlite,
  schema,
  file,
  identities,
) {
  const previous = file ? await openMkwZip(file) : null;
  if (previous && !identities.includes(previous.identity))
    throw Error(
      "Das Manifest der verknüpften MKW-ZIP-Datei wurde ausserhalb des Studios geändert.",
    );
  const { layout, assets, refs, descriptors } = await indexMedia(
    draft,
    previous,
  );
  let source = previous?.source;
  const baseline = previous ? await previous.readDatabase() : null;
  if (!source) {
    const identity = await sha256(encoder.encode(stringify([layout, refs])));
    source = { family: "json", sha256: identity, modelSha256: identity };
  }
  const db = new sqlite.oo1.DB(":memory:");
  let database;
  try {
    db.exec("PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF");
    db.exec(schema);
    db.transaction(() => {
      db.exec("INSERT INTO project VALUES(1,?,?,?)", {
        bind: [source.family, source.sha256, source.modelSha256],
      });
      insertScope(db, "project", layout);
      for (const [hash, { length }] of assets)
        db.exec("INSERT INTO assets VALUES(?,?)", { bind: [hash, length] });
      for (const ref of refs)
        db.exec("INSERT INTO asset_refs VALUES(?,?,?,?)", { bind: ref });
    });
    checkSchema(db, sqlite, schema);
    verifiedReferences(db, layout, {
      assets: new Map([...assets].map(([hash, asset]) => [hash, asset.length])),
    });
    database =
      (baseline && updateDatabase(sqlite, schema, baseline, db)) ??
      sqlite.capi.sqlite3_js_db_export(db.pointer);
  } finally {
    db.close();
  }
  if (database.length > MAX_DATABASE)
    throw Error("MKW-Projektdatenbank ist zu gross.");
  const plan = previous
    ? await planSnapshot(previous, database, assets, baseline)
    : await buildSnapshot(database, assets, { source, appVersion });
  return { plan, descriptors };
}
