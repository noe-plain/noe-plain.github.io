const MKWTemplateStore = (() => {
  let connection;
  function db() {
    return (connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open("mkw-studio-templates", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("metadata");
        request.result.createObjectStore("designs");
      };
      request.onsuccess = () => {
        const value = request.result;
        value.onversionchange = () => {
          value.close();
          connection = null;
        };
        resolve(value);
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = null;
        reject(
          Error("Ein anderer Studio-Tab blockiert die Vorlagenbibliothek."),
        );
      };
    }));
  }
  async function read(store, key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const req = database.transaction(store).objectStore(store);
      const result = key === undefined ? req.getAll() : req.get(key);
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    });
  }
  const metadata = (t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    w: t.carousel.w,
    h: t.carousel.h,
    n: t.carousel.n,
    layout: t.carousel.layout,
    mixed:
      MKWCarouselPolicy.isFree(t.carousel) &&
      t.carousel.artboards.some(
        (a) =>
          a.w !== t.carousel.artboards[0].w ||
          a.h !== t.carousel.artboards[0].h,
      ),
    ...(MKWCarouselPolicy.isFree(t.carousel)
      ? { w: t.carousel.artboards[0].w, h: t.carousel.artboards[0].h }
      : {}),
  });
  async function write(items, replace = false) {
    items = items.map(MKWTemplateModel.validate);
    if (items.length > 100) throw Error("Maximal 100 Vorlagen speichern.");
    const database = await db();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(["metadata", "designs"], "readwrite");
      if (replace)
        for (const key of ["metadata", "designs"]) tx.objectStore(key).clear();
      for (const t of items) {
        tx.objectStore("metadata").put(metadata(t), t.id);
        tx.objectStore("designs").put(t, t.id);
      }
      const count = tx.objectStore("designs").count();
      count.onsuccess = () => {
        if (count.result > 100) tx.abort();
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(
          tx.error ||
            Error(
              "Vorlage nicht gespeichert. Maximal 100 Vorlagen sind möglich.",
            ),
        );
    });
  }
  async function remove(id) {
    const database = await db();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(["metadata", "designs"], "readwrite");
      for (const key of ["metadata", "designs"]) tx.objectStore(key).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(tx.error || Error("Vorlage konnte nicht entfernt werden."));
    });
  }
  return {
    list: () => read("metadata"),
    get: (id) => read("designs", id),
    all: () => read("designs"),
    save: (item) => write([item]),
    replace: (items) => write(items, true),
    remove,
  };
})();
