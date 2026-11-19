const APPLICATION_ID = 0x4d4b575a;
const schemaObjects = `SELECT type,name,tbl_name,sql FROM sqlite_schema
  WHERE sql IS NOT NULL ORDER BY type,name`;
const fields =
  "SELECT name,kind,json_value FROM fields WHERE scope=? ORDER BY position";
const records =
  "SELECT json_value FROM records WHERE scope=? AND collection=? ORDER BY position";
export function checkSchema(db, sqlite, schema, extraSchema = "") {
  usingSchema(sqlite, schema, extraSchema, (reference) => {
    if (
      db.selectValue("PRAGMA application_id") !== APPLICATION_ID ||
      db.selectValue("PRAGMA user_version") !== 2 ||
      JSON.stringify(db.selectArrays(schemaObjects)) !==
        JSON.stringify(reference.selectArrays(schemaObjects)) ||
      db.selectValue("PRAGMA integrity_check") !== "ok" ||
      db.selectArrays("PRAGMA foreign_key_check").length !== 0
    )
      throw Error("Ungültige MKW-Arbeitsdatenbank.");
  });
}

function usingSchema(sqlite, schema, extraSchema, inspect) {
  const reference = new sqlite.oo1.DB(":memory:");
  try {
    reference.exec(schema);
    if (extraSchema) reference.exec(extraSchema);
    inspect(reference);
  } finally {
    reference.close();
  }
}

export function readScope(db, scope) {
  const result = Object.create(null);
  for (const [key, kind, value] of db.selectArrays(fields, [scope])) {
    const name = JSON.parse(key);
    if (kind === "scope") {
      if (scope !== "project" || !["carousel", "campaign"].includes(name))
        throw Error("Ungültiger MKW-Abschnitt.");
      result[name] = readScope(db, name);
    } else if (kind === "records") {
      result[name] = db.selectValues(records, [scope, key]).map(JSON.parse);
    } else {
      result[name] = JSON.parse(value);
    }
  }
  return result;
}

export function verifiedReferences(db, project, zip) {
  const assets = new Map(
    db.selectArrays("SELECT sha256,byte_count FROM assets"),
  );
  if (
    assets.size !== zip.assets.size ||
    [...assets].some(([hash, size]) => zip.assets.get(hash) !== size)
  )
    throw Error("Ungültiger MKW-Medienindex.");
  const refs = new Map();
  const referenced = new Set();
  for (const [storedPath, hash, prefix, encoding] of db.selectArrays(
    "SELECT path_json,sha256,url_prefix,encoding FROM asset_refs",
  )) {
    const path = JSON.parse(storedPath);
    if (!Array.isArray(path) || path.length === 0)
      throw Error("Ungültige MKW-Medienreferenz.");
    let value = project;
    for (const key of path) {
      if (
        value === null ||
        typeof value !== "object" ||
        (Array.isArray(value)
          ? !Number.isSafeInteger(key)
          : typeof key !== "string") ||
        !Object.hasOwn(value, key)
      )
        throw Error("Ungültige MKW-Medienreferenz.");
      value = value[key];
    }
    const key = JSON.stringify(path);
    const lower = prefix.toLowerCase();
    if (
      value !== null ||
      refs.has(key) ||
      (encoding === "base64"
        ? !lower.startsWith("data:") || !lower.endsWith(";base64,")
        : prefix !== "")
    )
      throw Error("Ungültige MKW-Medienreferenz.");
    refs.set(key, {
      hash,
      encoding,
      prefix,
      type: prefix.slice(5).split(";")[0],
    });
    referenced.add(hash);
  }
  if (referenced.size !== assets.size) throw Error("Verwaistes MKW-Medium.");
  return refs;
}
