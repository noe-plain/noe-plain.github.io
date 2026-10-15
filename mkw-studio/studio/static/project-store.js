/* IndexedDB owns projects/assets/file links. No UI or editor globals are used here. */
const MKWProjectStore = (() => {
  "use strict";
  let connection;
  const hashCache = new Map(),
    itemHashes = new WeakMap();
  const databaseName =
    "mkw-studio:" + location.pathname.replace(/index\.html$/, "");
  function db() {
    return (connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onblocked = () =>
        reject(
          Error(
            "Ein älterer Studio-Tab blockiert die Speicheraktualisierung. Bitte andere Studio-Tabs schliessen und neu laden.",
          ),
        );
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of ["projects", "assets", "meta"])
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          connection = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
    }));
  }
  function result(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function read(store, key) {
    const database = await db();
    return result(database.transaction(store).objectStore(store).get(key));
  }
  async function hash(data, item) {
    if (item && itemHashes.get(item)?.data === data)
      return itemHashes.get(item).key;
    if (hashCache.has(data)) return hashCache.get(data);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(data),
    );
    const key = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    if (item) itemHashes.set(item, { data, key });
    hashCache.set(data, key);
    while (
      hashCache.size > 12 ||
      [...hashCache.keys()].reduce((sum, key) => sum + key.length * 2, 0) >
        32 * 1024 * 1024
    )
      hashCache.delete(hashCache.keys().next().value);
    return key;
  }
  async function pack(project) {
    const document = MKWProjectAssets.compact(project),
      assets = new Map();
    for (const collection of ["images", "logos", "fonts"])
      for (const item of document[collection])
        if (item.data) {
          const id = await hash(
            item.data,
            project[collection].find(
              (original) =>
                original.id === item.id && original.role === item.role,
            ),
          );
          assets.set(id, item.data);
          delete item.data;
          item.assetRef = id;
        }
    return { document, assets };
  }
  async function unpack(document, storedAssets = null) {
    const project = structuredClone(document);
    for (const collection of ["images", "logos", "fonts"])
      for (const item of project[collection] || [])
        if (item.assetRef) {
          const data = storedAssets
            ? storedAssets.get(item.assetRef)
            : await read("assets", item.assetRef);
          if (!data)
            throw Error(
              "Ein Projektbestandteil fehlt in der Browsersicherung. Bitte die MKW-Datei öffnen.",
            );
          item.data =
            typeof data === "string"
              ? data
              : await new Promise((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(r.result);
                  r.onerror = () => reject(r.error);
                  r.readAsDataURL(data);
                });
          delete item.assetRef;
        }
    return MKWProjectAssets.hydrate(project);
  }
  async function save(project, expectedVersion = 0, options = {}) {
    const packed = await pack(project),
      database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
          ["projects", "assets", "meta"],
          "readwrite",
        ),
        projects = transaction.objectStore("projects"),
        assets = transaction.objectStore("assets"),
        meta = transaction.objectStore("meta");
      let outcome;
      const current = projects.get(project.projectId);
      current.onsuccess = () => {
        const previous = current.result,
          conflict =
            !!previous?.document && previous.version !== expectedVersion,
          id = conflict ? crypto.randomUUID() : project.projectId,
          version = conflict ? 1 : (previous?.version || 0) + 1,
          document = packed.document;
        document.projectId = id;
        if (conflict)
          document.meta.title =
            (document.meta.title || "Projekt") + " · Konfliktkopie";
        const record = {
          id,
          version,
          updatedAt: Date.now(),
          title: document.meta.title || "Unbenanntes Projekt",
          mode: document.carousel ? "carousel" : "post",
          document,
          ...(!conflict && previous?.fileHandle
            ? { fileHandle: previous.fileHandle, fileStamp: previous.fileStamp }
            : {}),
          ...(!conflict && options.fileHandle
            ? { fileHandle: options.fileHandle, fileStamp: options.fileStamp }
            : {}),
        };
        projects.put(record, id);
        meta.put(id, "lastProject");
        for (const [key, data] of packed.assets) {
          const get = assets.getKey(key);
          get.onsuccess = () => {
            if (get.result === undefined) {
              const comma = data.indexOf(","),
                mime = data.slice(5, data.indexOf(";")),
                binary = atob(data.slice(comma + 1)),
                bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
              assets.put(new Blob([bytes], { type: mime }), key);
            }
          };
        }
        // Garbage collection is atomic with the project update, across all saved projects.
        const all = projects.getAll();
        all.onsuccess = () => {
          const refs = new Set(
            all.result.flatMap((record) =>
              record.document
                ? ["images", "logos", "fonts"].flatMap((key) =>
                    (record.document[key] || []).map((item) => item.assetRef),
                  )
                : [],
            ),
          );
          const cursor = assets.openKeyCursor();
          cursor.onsuccess = () => {
            const entry = cursor.result;
            if (!entry) return;
            if (!refs.has(entry.key) && !packed.assets.has(entry.key))
              assets.delete(entry.key);
            entry.continue();
          };
        };
        outcome = { id, version, conflict, record };
      };
      transaction.oncomplete = () => resolve(outcome);
      transaction.onerror = transaction.onabort = () =>
        reject(
          transaction.error ||
            Error("Projekt konnte nicht im Browser gesichert werden."),
        );
    });
  }
  async function list() {
    const database = await db(),
      records = await result(
        database.transaction("projects").objectStore("projects").getAll(),
      );
    return records
      .filter((r) => r?.document)
      .map(({ document, fileHandle, fileStamp, ...meta }) => ({
        ...meta,
        fileName: fileHandle?.name || "",
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async function open(id) {
    const database = await db();
    const { record, storedAssets } = await new Promise((resolve, reject) => {
      const transaction = database.transaction(["projects", "assets"]),
        request = transaction.objectStore("projects").get(id),
        storedAssets = new Map();
      let record;
      request.onsuccess = () => {
        record = request.result;
        if (!record?.document) {
          transaction.abort();
          return;
        }
        for (const item of ["images", "logos", "fonts"].flatMap(
          (key) => record.document[key] || [],
        ))
          if (item.assetRef) {
            const get = transaction.objectStore("assets").get(item.assetRef);
            get.onsuccess = () => storedAssets.set(item.assetRef, get.result);
          }
      };
      transaction.oncomplete = () => resolve({ record, storedAssets });
      transaction.onabort = transaction.onerror = () =>
        reject(
          transaction.error ||
            Error("Projekt ist in diesem Browser nicht mehr verfügbar."),
        );
    });
    return { ...record, project: await unpack(record.document, storedAssets) };
  }
  async function remove(id) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
          ["projects", "assets", "meta"],
          "readwrite",
        ),
        projects = transaction.objectStore("projects");
      projects.delete(id);
      const all = projects.getAll();
      all.onsuccess = () => {
        const records = all.result.filter((record) => record.document),
          refs = new Set(
            records.flatMap((record) =>
              ["images", "logos", "fonts"].flatMap((key) =>
                (record.document[key] || []).map((item) => item.assetRef),
              ),
            ),
          );
        const cursor = transaction.objectStore("assets").openKeyCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (entry) {
            if (!refs.has(entry.key))
              transaction.objectStore("assets").delete(entry.key);
            entry.continue();
          }
        };
        transaction
          .objectStore("meta")
          .put(
            records.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null,
            "lastProject",
          );
      };
      transaction.oncomplete = () => {
        hashCache.clear();
        resolve();
      };
      transaction.onerror = transaction.onabort = () =>
        reject(transaction.error);
    });
  }
  async function version(id) {
    return (await read("projects", id))?.version;
  }
  async function last({ metadataOnly = false } = {}) {
    const id = await read("meta", "lastProject");
    if (id) {
      const record = await read("projects", id);
      if (record?.document) return metadataOnly ? record : open(id);
    }
    const legacy = await read("projects", "autosave");
    if (legacy) {
      legacy.projectId ??= crypto.randomUUID();
      const saved = await save(legacy);
      const database = await db();
      await new Promise((resolve, reject) => {
        const tx = database.transaction("projects", "readwrite");
        tx.objectStore("projects").delete("autosave");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      return metadataOnly ? read("projects", saved.id) : open(saved.id);
    }
    return null;
  }
  async function link(id, handle, stamp) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction("projects", "readwrite"),
        store = tx.objectStore("projects"),
        request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) {
          tx.abort();
          return;
        }
        store.put(
          { ...request.result, fileHandle: handle, fileStamp: stamp },
          id,
        );
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(
          tx.error ||
            Error("Dateiverknüpfung konnte nicht gespeichert werden."),
        );
    });
  }
  return {
    save,
    list,
    open,
    last,
    version,
    link,
    remove,
    pack,
    unpack,
    clearHashCache: () => hashCache.clear(),
  };
})();
