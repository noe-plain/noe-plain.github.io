import { openZipV2 } from "./zip-v2.mjs";
import { openWorkingDb } from "./session-db.mjs";

const MAX_CACHE_BYTES = 64 * 1024 ** 2;
const MAX_CACHE_ITEMS = 32;

// One worker owns one working database. Callers pass only references or dirty
// text values. The immutable ZIP is never a write target.
export function serveSession(initSqlite, channel = self) {
  let queue = Promise.resolve();
  let started = false;
  let working;
  let zip;
  const cache = new Map();
  let retained = 0;
  const methods = {
    async open({ file, sessionId, resume = false }) {
      if (started)
        throw Error("Der Worker gehört bereits zu einer MKW-Arbeitssitzung.");
      started = true;
      const container = await openZipV2(file);
      const [sqlite, schema] = await Promise.all([
        initSqlite(),
        fetch(new URL("../migration-schema.sql", import.meta.url)).then(
          (response) => {
            if (!response.ok) throw Error("MKW-Schema fehlt.");
            return response.text();
          },
        ),
      ]);
      const { snapshot, ...session } = await openWorkingDb(
        sqlite,
        schema,
        container,
        sessionId,
        resume === true,
      );
      working = session;
      zip = container;
      return { ...snapshot, dbVersion: sqlite.version.libVersion };
    },
    describe() {
      return working.getProject();
    },
    stats() {
      return { ...zip.counts, retainedAssetBytes: retained };
    },
    async asset({ path }) {
      const ref = working.refs.get(JSON.stringify(path));
      if (!ref) throw Error("MKW-Medium fehlt.");
      let blob = cache.get(ref.hash);
      if (blob) {
        cache.delete(ref.hash);
        cache.set(ref.hash, blob);
      } else {
        blob = new Blob([await zip.readAsset(ref.hash)]);
        if (blob.size <= MAX_CACHE_BYTES) {
          while (
            retained + blob.size > MAX_CACHE_BYTES ||
            cache.size >= MAX_CACHE_ITEMS
          ) {
            const [key, entry] = cache.entries().next().value;
            retained -= entry.size;
            cache.delete(key);
          }
          cache.set(ref.hash, blob);
          retained += blob.size;
        }
      }
      if (ref.encoding === "verbatim") return { encodedUrl: blob };
      return { blob: blob.slice(0, blob.size, ref.type) };
    },
    saveText({ expectedRevision, edits }) {
      return working.saveText(expectedRevision, edits);
    },
    async close({ discard = false }) {
      await working.close(discard === true);
      working = zip = undefined;
      retained = 0;
      cache.clear();
    },
  };
  channel.onmessage = ({ data: { id, action, args } }) => {
    queue = queue.then(async () => {
      try {
        if (!Object.hasOwn(methods, action) || (!working && action !== "open"))
          throw Error("Aktion für MKW-Arbeitssitzung nicht verfügbar.");
        const value = await methods[action](args || {});
        channel.postMessage({ id, value });
      } catch (error) {
        channel.postMessage({ id, error: error.message });
      }
    });
  };
}
