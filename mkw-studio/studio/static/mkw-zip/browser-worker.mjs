import sqliteInit from "./vendor/sqlite-3.54.1/index.mjs";
import { decodeZip, encodeZip } from "./browser-codec.mjs";

self.onmessage = async ({ data: { action, input } }) => {
  try {
    const [sqlite, schema] = await Promise.all([
      sqliteInit(),
      fetch(new URL("./schema.sql", import.meta.url)).then((response) => {
        if (!response.ok)
          throw Error("MKW-ZIP-Schema konnte nicht geladen werden.");
        return response.text();
      }),
    ]);
    let value;
    if (action === "decode") value = await decodeZip(input, sqlite, schema);
    else if (action === "encode") {
      const response = await fetch(
        new URL("../../package.json", import.meta.url),
      );
      if (!response.ok)
        throw Error("Studio-Version konnte nicht geladen werden.");
      const { version } = await response.json();
      value = await encodeZip(input, version, sqlite, schema);
    } else throw Error("Unbekannter MKW-ZIP-Vorgang.");
    self.postMessage({ value });
  } catch (error) {
    self.postMessage({
      error: error.message || "MKW-ZIP konnte nicht verarbeitet werden.",
    });
  }
};
