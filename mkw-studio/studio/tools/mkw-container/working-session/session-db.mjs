import {
  checkSchema,
  readScope,
  verifiedReferences,
} from "../../../static/mkw-zip/model-db.mjs";
// The portable database is the seed for a private, revisioned OPFS work copy.
const DB_PATH = "/working.sqlite";
const SNAPSHOT_DB = "/portable.sqlite";
const STATE_SCHEMA = `CREATE TABLE working_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  source_manifest TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0)
) STRICT`;
const locateText = `SELECT position,json_value FROM records
  WHERE scope=? AND collection=? AND legacy_id=? LIMIT 2`;

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
    checkSchema(db, sqlite, schema, resume ? STATE_SCHEMA : "");
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
    async function exportDatabase(expectedRevision) {
      if (revision() !== expectedRevision)
        throw Error("Arbeitsstand wurde inzwischen geändert.");
      pool.importDb(SNAPSHOT_DB, await zip.readDatabase());
      try {
        const snapshot = new pool.OpfsSAHPoolDb(SNAPSHOT_DB);
        try {
          snapshot.exec("PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON");
          const sql =
            "SELECT scope,collection,position,json_value FROM records ORDER BY scope,collection,position";
          const current = db.selectArrays(sql);
          const prior = snapshot.selectArrays(sql);
          if (current.length !== prior.length)
            throw Error("MKW-Datensatzstruktur wurde geändert.");
          snapshot.transaction(() => {
            for (const [i, row] of current.entries()) {
              if (row.slice(0, 3).some((key, k) => key !== prior[i][k]))
                throw Error("MKW-Datensatzstruktur wurde geändert.");
              if (row[3] !== prior[i][3])
                snapshot.exec(
                  "UPDATE records SET json_value=? WHERE scope=? AND collection=? AND position=?",
                  { bind: [row[3], ...row.slice(0, 3)] },
                );
            }
          });
          checkSchema(snapshot, sqlite, schema);
        } finally {
          snapshot.close();
        }
        return pool.exportFile(SNAPSHOT_DB);
      } finally {
        pool.unlink(SNAPSHOT_DB);
      }
    }
    return {
      refs,
      exportDatabase,
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
