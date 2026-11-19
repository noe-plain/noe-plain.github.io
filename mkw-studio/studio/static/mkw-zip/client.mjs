export function runZipOperation(action, input) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./browser-worker.mjs", import.meta.url),
      { type: "module" },
    );
    const rejectOpen = (error) => {
      worker.terminate();
      reject(error);
    };
    worker.onmessage = ({ data }) => {
      worker.terminate();
      if (data.error) reject(Error(data.error));
      else resolve(data.value);
    };
    worker.onerror = () =>
      rejectOpen(Error("MKW-ZIP-Worker konnte nicht geladen werden."));
    worker.onmessageerror = () =>
      rejectOpen(Error("MKW-ZIP-Daten konnten nicht übertragen werden."));
    try {
      worker.postMessage({ action, input });
    } catch (error) {
      rejectOpen(error);
    }
  });
}
