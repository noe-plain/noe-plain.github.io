"use strict";
// Device templates remain separate from project files and autosave retention.
const MKWSponsorLibrary = (() => {
  let connection;
  const db = () =>
    (connection ??= new Promise((resolve, reject) => {
      const r = indexedDB.open("mkw-studio-sponsors", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("groups", { keyPath: "id" });
        r.result.createObjectStore("logos", { keyPath: "id" });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => {
        connection = null;
        reject(r.error);
      };
    }));
  async function read(store, id) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store),
        r = id ? tx.objectStore(store).get(id) : tx.objectStore(store).getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function save(groups, logos = []) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(["groups", "logos"], "readwrite"),
        g = tx.objectStore("groups"),
        assets = tx.objectStore("logos");
      g.clear();
      for (const [order, group] of groups.entries()) g.put({ ...group, order });
      for (const logo of logos) assets.put(logo);
      const refs = new Set(groups.flatMap((g) => g.logos.map((l) => l.id))),
        r = assets.openKeyCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (c) {
          if (!refs.has(c.key)) assets.delete(c.key);
          c.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  return {
    groups: async () =>
      (await read("groups")).sort((a, b) => (a.order || 0) - (b.order || 0)),
    logo: (id) => read("logos", id),
    save,
  };
})();
