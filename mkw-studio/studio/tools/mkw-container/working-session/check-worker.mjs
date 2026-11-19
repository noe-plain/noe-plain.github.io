import sqliteInit from "/sqlite-wasm/index.mjs";
import { serveSession } from "./session-worker.mjs";

// Measure the actual OPFS writes (SQLite database and journal), without
// adding telemetry to the working session implementation.
let bytes = 0;
let failOnWrite = 0;
let injectedFailures = 0;
const proto = FileSystemSyncAccessHandle.prototype;
const realWrite = proto.write;
proto.write = function (buffer, options) {
  if (failOnWrite && --failOnWrite === 0) {
    injectedFailures++;
    throw new DOMException("Induzierter Schreibfehler", "QuotaExceededError");
  }
  const written = realWrite.call(this, buffer, options);
  bytes += written;
  return written;
};

serveSession(sqliteInit, {
  set onmessage(handler) {
    self.onmessage = (event) => {
      if (event.data.action === "failSave") {
        failOnWrite = 2;
        event.data.action = "saveText";
      }
      handler(event);
    };
  },
  postMessage(data) {
    self.postMessage({ ...data, opfsWriteBytes: bytes, injectedFailures });
    failOnWrite = 0;
  },
});
