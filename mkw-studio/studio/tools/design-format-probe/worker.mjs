import sqliteInit from "/probe-vendor/index.mjs";

const initStarted = performance.now();
const sqliteReady = sqliteInit().then((sqlite) => ({
  sqlite,
  wasmMs: performance.now() - initStarted,
}));
const path = "/probe.sqlite";
let pool;

self.onmessage = async ({ data: { action, directory } }) => {
  try {
    const { sqlite, wasmMs } = await sqliteReady;
    const started = performance.now();
    const dbVersion = sqlite.version.libVersion;
    if (action === "create") {
      pool = await sqlite.installOpfsSAHPoolVfs({ directory });
      const db = new pool.OpfsSAHPoolDb(path);
      try {
        db.exec("PRAGMA foreign_keys=ON");
        db.transaction(() => {
          db.exec(`
            CREATE TABLE pages (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
            CREATE TABLE objects (
              id INTEGER PRIMARY KEY,
              page_id INTEGER NOT NULL REFERENCES pages(id),
              text TEXT NOT NULL
            );
            CREATE INDEX objects_by_page ON objects(page_id);
          `);
          for (let page = 1; page <= 20; page++)
            db.exec("INSERT INTO pages VALUES (?,?)", {
              bind: [page, "Slide " + page],
            });
          for (let object = 1; object <= 500; object++)
            db.exec("INSERT INTO objects VALUES (?,?,?)", {
              bind: [
                object,
                1 + ((object - 1) % 20),
                "Konzert · Prüftitel " + object,
              ],
            });
        });
      } finally {
        db.close();
      }
      const bytes = pool.exportFile(path);
      self.postMessage(
        { dbVersion, wasmMs, ms: performance.now() - started, bytes },
        [bytes.buffer],
      );
    } else if (action === "edit") {
      pool = await sqlite.installOpfsSAHPoolVfs({ directory });
      const db = new pool.OpfsSAHPoolDb(path);
      let committed;
      try {
        db.exec("PRAGMA foreign_keys=ON");
        const prior = db.selectValue("SELECT text FROM objects WHERE id=1");
        if (prior !== "Konzert · Prüftitel 1") throw Error("Reopen failed");
        db.transaction(() => {
          db.exec("UPDATE objects SET text=? WHERE id=?", {
            bind: ["Konzert · Neuer Text 1", 1],
          });
        });
        try {
          db.transaction(() => {
            db.exec("UPDATE objects SET text='Rollback' WHERE id=1");
            db.exec("UPDATE objects SET page_id=9999 WHERE id=1");
          });
          throw Error("Foreign key was not enforced");
        } catch (error) {
          if (
            error.resultCode !== sqlite.capi.SQLITE_CONSTRAINT_FOREIGNKEY &&
            error.resultCode !== sqlite.capi.SQLITE_CONSTRAINT
          )
            throw error;
        }
        committed = db.selectValue("SELECT text FROM objects WHERE id=1");
        if (
          committed !== "Konzert · Neuer Text 1" ||
          db.selectValue("PRAGMA integrity_check") !== "ok" ||
          db.exec({
            sql: "PRAGMA foreign_key_check",
            returnValue: "resultRows",
          }).length
        )
          throw Error("Rollback or integrity check failed");
      } finally {
        db.close();
      }
      const bytes = pool.exportFile(path);
      self.postMessage(
        {
          dbVersion,
          wasmMs,
          ms: performance.now() - started,
          committed,
          bytes,
        },
        [bytes.buffer],
      );
      pool.unlink(path);
    }
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
