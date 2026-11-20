import { mediaDraft } from "./media-draft.mjs?v=c75b81a42ad8";

export function runZipOperation(action, input) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./browser-worker.mjs?v=c75b81a42ad8", import.meta.url),
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

export async function prepareLinkedZip(project, file, identities, known) {
  const { urls, draft } = mediaDraft(project, known);
  const { plan, descriptors } = await runZipOperation("prepare", {
    draft,
    file,
    identities,
  });
  return { plan, known: new Map(urls.map((url, i) => [url, descriptors[i]])) };
}
