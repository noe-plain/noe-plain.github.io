// The portable database is the seed for a private, revisioned OPFS work copy.
const APPLICATION_ID = 0x4d4b575a;
const DB_PATH = "/working.sqlite";
const STATE_SCHEMA = `CREATE TABLE working_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  source_manifest TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0)
) STRICT`;
const schemaObjects = `SELECT type,name,tbl_name,sql FROM sqlite_schema
  WHERE sql IS NOT NULL ORDER BY type,name`;
const fields =
  "SELECT name,kind,json_value FROM fields WHERE scope=? ORDER BY position";
const records =
  "SELECT json_value FROM records WHERE scope=? AND collection=? ORDER BY position";
const locateText = `SELECT position,json_value FROM records
  WHERE scope=? AND collection=? AND legacy_id=? LIMIT 2`;

function checkSchema(db, sqlite, schema, resumed) {
  usingSchema(sqlite, schema, resumed, (reference) => {
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

function usingSchema(sqlite, schema, working, inspect) {
  const reference = new sqlite.oo1.DB(":memory:");
  try {
    reference.exec(schema);
    if (working) reference.exec(STATE_SCHEMA);
    inspect(reference);
  } finally {
    reference.close();
  }
}

function readScope(db, scope) {
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

function verifiedReferences(db, project, zip) {
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
    refs.set(key, { hash, encoding, type: prefix.slice(5).split(";")[0] });
    referenced.add(hash);
  }
  if (referenced.size !== assets.size) throw Error("Verwaistes MKW-Medium.");
  return refs;
}

function stageText(db, pending, edit) {
  const { kind, id, element, text } = edit || {};
  const designer = kind === "designer" && element === undefined;
  const fd =
    kind === "fd" &&
    ["date", "title", "subtitle", "copyright"].includes(element);
  if (
    (!designer && !fd) ||
    typeof id !== "string" ||
    typeof text !== "string" ||
    text.length > 100_000
  )
    throw Error("Ungültige Textänderung.");
  const scope = designer ? "carousel" : "project";
  const collection = designer ? '"objects"' : '"boards"';
  const key = JSON.stringify([scope, collection, id]);
  if (!pending.has(key)) {
    const rows = db.selectArrays(locateText, [scope, collection, id]);
    if (rows.length !== 1) throw Error("Textobjekt fehlt oder ist mehrdeutig.");
    const [[position, json]] = rows;
    const record = JSON.parse(json);
    pending.set(key, {
      locator: [scope, collection, position],
      record,
      changes: new Map(),
    });
  }
  const { record, changes } = pending.get(key);
  const target =
    designer && record.type === "text"
      ? record
      : fd
        ? record.elements?.[element]
        : null;
  if (typeof target?.text !== "string") throw Error("Textobjekt fehlt.");
  const path = designer ? "$.text" : `$.elements.${element}.text`;
  if (target.text === text) changes.delete(path);
  else changes.set(path, JSON.stringify(text));
}

export async function openWorkingDb(sqlite, schema, zip, sessionId, resume) {
  if (!/^[a-f0-9-]{36}$/.test(sessionId))
    throw Error("Ungültige Arbeitskennung.");
  const pool = await sqlite.installOpfsSAHPoolVfs({
    directory: `mkw-zip-v2-${sessionId}`,
  });
  let db;
  let imported = false;
  try {
    if (pool.getFileNames().includes(DB_PATH) !== resume) {
      throw Error(
        resume
          ? "Kein Arbeitsstand vorhanden."
          : "Arbeitsstand existiert bereits.",
      );
    }
    if (!resume) {
      pool.importDb(DB_PATH, await zip.readDatabase());
      imported = true;
    }
    db = new pool.OpfsSAHPoolDb(DB_PATH);
    db.exec(
      "PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON; PRAGMA query_only=ON",
    );
    checkSchema(db, sqlite, schema, resume);
    const source = zip.source;
    const origin = db.selectArray(
      "SELECT source_family,source_sha256,model_sha256 FROM project",
    );
    if (
      JSON.stringify(origin) !==
      JSON.stringify([source.family, source.sha256, source.modelSha256])
    )
      throw Error("MKW-Quelle stimmt nicht mit dem Arbeitsstand überein.");
    const project = readScope(db, "project");
    if (
      project.version !== 1 ||
      !project.meta ||
      !Array.isArray(project.boards) ||
      !Array.isArray(project.images)
    )
      throw Error("Ungültiges MKW-Projekt.");
    const refs = verifiedReferences(db, project, zip);
    db.exec("PRAGMA query_only=OFF");
    if (!resume) {
      db.transaction(() => {
        db.exec(STATE_SCHEMA);
        db.exec("INSERT INTO working_state VALUES (1,?,0)", {
          bind: [zip.identity],
        });
      });
    }
    if (
      db.selectValue("SELECT source_manifest FROM working_state") !==
      zip.identity
    )
      throw Error("MKW-Quelle stimmt nicht mit dem Arbeitsstand überein.");

    const revision = () => db.selectValue("SELECT revision FROM working_state");
    return {
      refs,
      snapshot: { project, revision: revision() },
      getProject: () => ({
        project: readScope(db, "project"),
        revision: revision(),
      }),
      saveText(expectedRevision, edits) {
        if (!Array.isArray(edits) || edits.length > 500)
          throw Error("Ungültige Änderungen.");
        return db.transaction("IMMEDIATE", () => {
          const current = revision();
          if (expectedRevision !== current)
            throw Error("Arbeitsstand wurde inzwischen geändert.");
          let changedRecords = 0;
          const pending = new Map();
          for (const edit of edits) stageText(db, pending, edit);
          for (const { locator, changes } of pending.values()) {
            if (!changes.size) continue;
            // Apply only the bound text leaves, preserving neighboring JSON values.
            const slots = Array.from(changes, () => "?,json(?)").join(",");
            db.exec(
              `UPDATE records SET json_value=json_set(json_value,${slots})
                WHERE scope=? AND collection=? AND position=?`,
              {
                bind: [...[...changes].flat(), ...locator],
              },
            );
            changedRecords++;
          }
          if (changedRecords > 0)
            db.exec(
              "UPDATE working_state SET revision=revision+1 WHERE singleton=1",
            );
          return {
            revision: current + Number(changedRecords > 0),
            changedRecords,
          };
        });
      },
      async close(discard) {
        db.close();
        if (discard) await pool.removeVfs();
        else pool.pauseVfs();
      },
    };
  } catch (error) {
    db?.close();
    if (imported) pool.unlink(DB_PATH);
    pool.pauseVfs();
    throw error;
  }
}
