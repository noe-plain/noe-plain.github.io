"use strict";
// Link metadata and a short-lived rollback journal, separate from all project records.
const MKWSetupStore = (() => {
  let connection;
  function db() {
    return (connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open("mkw-studio-setup", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
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
      request.onblocked = () => {
        connection = null;
        reject(Error("Ein anderer Studio-Tab blockiert den Setup-Speicher."));
      };
    }));
  }
  async function get(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const request = database
        .transaction("state")
        .objectStore("state")
        .get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function transaction(write) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction("state", "readwrite");
      write(tx.objectStore("state"));
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () =>
        reject(
          tx.error || Error("Setup-Verknüpfung konnte nicht gesichert werden."),
        );
    });
  }
  return {
    link: () => get("link"),
    pending: () => get("pending"),
    begin: (before) => transaction((store) => store.put(before, "pending")),
    finish: (link) =>
      transaction((store) => {
        if (link) store.put(link, "link");
        else store.delete("link");
        store.delete("pending");
      }),
  };
})();
