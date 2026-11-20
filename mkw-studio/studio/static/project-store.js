/* IndexedDB owns projects/assets/file links. No UI or editor globals are used here. */
const MKWProjectStore = (() => {
  "use strict";
  const projectLimit = 5;
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
        const cleanup = database.transaction(
          ["projects", "assets", "meta"],
          "readwrite",
        );
        maintainProjects(cleanup, { onlyOverflow: true });
        cleanup.oncomplete = () => resolve(database);
        cleanup.onerror = cleanup.onabort = () => {
          database.close();
          connection = null;
          reject(
            cleanup.error ||
              Error("Browsersicherungen konnten nicht aufgeräumt werden."),
          );
        };
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
  async function hash(data, item, field) {
    const references = item && itemHashes.get(item);
    if (references?.[field]?.data === data) return references[field].key;
    let key = hashCache.get(data);
    if (!key) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(data),
      );
      key = [...new Uint8Array(digest)]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      hashCache.set(data, key);
      while (
        hashCache.size > 12 ||
        [...hashCache.keys()].reduce((sum, key) => sum + key.length * 2, 0) >
          32 * 1024 * 1024
      )
        hashCache.delete(hashCache.keys().next().value);
    }
    if (item) itemHashes.set(item, { ...references, [field]: { data, key } });
    return key;
  }
  const mediaFields = [
    ["data", "assetRef"],
    ["original", "originalAssetRef"],
  ];
  const storedMedia = (document) =>
    ["images", "logos", "fonts"].flatMap((key) =>
      (document[key] || []).flatMap((item) =>
        mediaFields.map(([, ref]) => item[ref]).filter(Boolean),
      ),
    );
  async function pack(project, { lossless = false } = {}) {
    const document = lossless
      ? MKWProjectAssets.capture(project)
      : MKWProjectAssets.compact(project);
    const assets = new Map();
    for (const collection of ["images", "logos", "fonts"]) {
      if (lossless)
        document[collection] = document[collection].map((item) => ({
          ...item,
        }));
      for (const item of document[collection]) {
        const original = project[collection].find(
          (source) => source.id === item.id && source.role === item.role,
        );
        if (collection === "images" && item.original === item.data)
          delete item.original;
        for (const [field, ref] of mediaFields) {
          const data = item[field];
          if (!data) continue;
          if (field === "original" && !/^data:[^,]*;base64,/i.test(data))
            continue;
          const id = await hash(data, original, field);
          assets.set(id, data);
          delete item[field];
          item[ref] = id;
          if (lossless)
            item[ref + "Prefix"] = data.slice(0, data.indexOf(",") + 1);
        }
      }
    }
    return { document, assets };
  }
  async function unpack(document, storedAssets = null) {
    const project = structuredClone(document);
    for (const collection of ["images", "logos", "fonts"])
      for (const item of project[collection] || [])
        for (const [field, ref] of mediaFields) {
          if (!item[ref]) continue;
          const data = storedAssets
            ? storedAssets.get(item[ref])
            : await read("assets", item[ref]);
          if (!data)
            throw Error(
              "Ein Projektbestandteil fehlt in der Browsersicherung. Bitte die MKW-Datei öffnen.",
            );
          const url =
            typeof data === "string"
              ? data
              : await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(data);
                });
          const prefix = item[ref + "Prefix"];
          item[field] =
            prefix === undefined
              ? url
              : prefix + url.slice(url.indexOf(",") + 1);
          delete item[ref];
          delete item[ref + "Prefix"];
        }
    return MKWProjectAssets.hydrate(project);
  }
  // Retention and asset collection share the write transaction. A failed save
  // rolls back both the new project and any removal of older backups.
  function maintainProjects(
    transaction,
    { keepId = null, onlyOverflow = false } = {},
  ) {
    const projects = transaction.objectStore("projects"),
      request = projects.getAll();
    request.onsuccess = () => {
      const records = request.result
          .filter((record) => record.document)
          .sort(
            (a, b) =>
              (b.id === keepId) - (a.id === keepId) ||
              (b.updatedAt || 0) - (a.updatedAt || 0) ||
              a.id.localeCompare(b.id),
          ),
        retained = records.slice(0, projectLimit),
        removed = records.slice(projectLimit);
      for (const record of removed) projects.delete(record.id);
      if (onlyOverflow && !removed.length) return;
      transaction
        .objectStore("meta")
        .put(retained[0]?.id || null, "lastProject");
      const refs = new Set(
        retained.flatMap((record) => storedMedia(record.document)),
      );
      const assets = transaction.objectStore("assets"),
        cursor = assets.openKeyCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if (!refs.has(entry.key)) assets.delete(entry.key);
        entry.continue();
      };
    };
  }
  async function save(project, expectedVersion = 0, options = {}) {
    // Only the native block writer needs cached Blobs. Browsers using
    // downloads can reuse their data URLs without persisting Blob files.
    const nativeAssets = typeof globalThis.showSaveFilePicker === "function";
    const lossless = options.lossless || options.fileStamp?.zip === true;
    const packed = await pack(project, {
        lossless,
      }),
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
          missing = !previous?.document && expectedVersion > 0,
          conflict =
            missing ||
            (!!previous?.document && previous.version !== expectedVersion),
          id = conflict ? crypto.randomUUID() : project.projectId,
          version = conflict ? 1 : (previous?.version || 0) + 1,
          document = packed.document;
        document.projectId = id;
        if (conflict)
          document.meta.title =
            (document.meta.title || "Projekt") +
            (missing ? " · Wiederhergestellt" : " · Konfliktkopie");
        const record = {
          id,
          version,
          updatedAt: Date.now(),
          title: document.meta.title || "Unbenanntes Projekt",
          mode: document.campaign
            ? "campaign"
            : document.carousel
              ? "carousel"
              : "post",
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
              if (!nativeAssets) {
                assets.put(data, key);
                return;
              }
              const comma = data.indexOf(",");
              const encoded = data.slice(comma + 1);
              const mime = data.slice(5, comma).split(";")[0];
              let binary;
              try {
                binary = atob(encoded);
              } catch (error) {
                if (!lossless) throw error;
              }
              if (
                lossless &&
                (binary === undefined || btoa(binary) !== encoded)
              )
                assets.put(data, key);
              else
                assets.put(
                  new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
                    type: mime,
                  }),
                  key,
                );
            }
          };
        }
        maintainProjects(transaction, { keepId: id });
        outcome = { id, version, conflict, missing, record };
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
        mode: document.campaign
          ? "campaign"
          : document.carousel
            ? "carousel"
            : "post",
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
        for (const ref of new Set(storedMedia(record.document))) {
          const get = transaction.objectStore("assets").get(ref);
          get.onsuccess = () => storedAssets.set(ref, get.result);
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
      maintainProjects(transaction);
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
  async function link(id, handle, stamp, expectedVersion) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction("projects", "readwrite"),
        store = tx.objectStore("projects"),
        request = store.get(id);
      request.onsuccess = () => {
        if (
          !request.result ||
          (expectedVersion !== undefined &&
            request.result.version !== expectedVersion)
        ) {
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
    projectLimit,
    save,
    list,
    open,
    last,
    version,
    link,
    remove,
    pack,
    unpack,
    asset: (key) => read("assets", key),
    clearHashCache: () => hashCache.clear(),
  };
})();
