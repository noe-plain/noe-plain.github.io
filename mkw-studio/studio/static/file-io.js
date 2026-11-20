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
            ? "application/zip"
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
  $("#psdStatus").classList.toggle("studio-loading", value);
  $("#psdStatus").setAttribute("aria-busy", String(value));
  $("#saveDialog")
    .querySelectorAll("input,button")
    .forEach((el) => (el.disabled = value));
}

async function writeFilePlan(handle, plan) {
  async function checkTarget() {
    const { size, lastModified, probe } = plan.expected;
    const current = await handle.getFile();
    const changed = () =>
      Error("Die Zieldatei wurde ausserhalb des Studios geändert.");
    if (current.size !== size || current.lastModified !== lastModified)
      throw changed();
    if (!probe) return;
    const data = await current
      .slice(probe.offset, probe.offset + probe.length)
      .arrayBuffer();
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    const hash = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join(
      "",
    );
    if (hash !== probe.sha256) throw changed();
  }
  if (plan.expected) await checkTarget();
  if (plan.unchanged) return;
  const stream = await handle.createWritable({
    keepExistingData: plan.keepExistingData,
    mode: "exclusive",
  });
  try {
    if (plan.expected) await checkTarget();
    for (const write of plan.writes)
      await stream.write({
        type: "write",
        position: write.position,
        data: write.data,
      });
    await stream.truncate(plan.size);
    await stream.close();
  } catch (error) {
    try {
      await stream.abort();
    } catch {}
    throw error;
  }
}
