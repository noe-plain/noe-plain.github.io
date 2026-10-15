"use strict";
// User-selected file handles and byte writes; project lifecycle lives in project-session.js.
function saveFileName(extension) {
  return (
    MKW.clean(
      ($("#saveDialog").open
        ? $("#saveName").value.trim() || MKW.projectName(p.meta)
        : MKW.projectName(p.meta)
      ).replace(/\.(mkw|psd)$/i, ""),
    ) +
    "." +
    extension
  );
}
function chooseSaveTarget(name, extension) {
  if (!window.showSaveFilePicker) return Promise.resolve(null);
  return window.showSaveFilePicker({
    id: "mkw-" + extension,
    suggestedName: name,
    types: [
      {
        description: extension === "mkw" ? "Studio-Projekt" : "Photoshop-Datei",
        accept: {
          [extension === "mkw"
            ? "application/json"
            : "image/vnd.adobe.photoshop"]: ["." + extension],
        },
      },
    ],
  });
}
async function writeSaveFile(handle, blob, name) {
  if (!handle) {
    download(blob, name);
    return;
  }
  const stream = await handle.createWritable();
  try {
    await stream.write(blob);
    await stream.close();
  } catch (e) {
    try {
      await stream.abort();
    } catch {}
    throw e;
  }
}
function setSaveBusy(value) {
  busy = value;
  $("#saveDialog")
    .querySelectorAll("input,button")
    .forEach((el) => (el.disabled = value));
}
