/* Editor orchestration for project identity, conflict-safe saves and user-selected files. */
const MKWProjects = (() => {
  "use strict";
  const versions = new Map(),
    links = new Map(),
    aliases = new Map();
  let queue = Promise.resolve();
  const stamp = (file) => ({ size: file.size, modified: file.lastModified });
  function notice(message) {
    const el = $("#projectStorageNotice");
    if (el) {
      el.textContent = message;
      el.hidden = !message;
    }
  }
  function fileLink(id = p.projectId) {
    return links.get(id);
  }
  async function attach(record) {
    aliases.delete(record.id);
    versions.set(record.id, record.version);
    if (record.fileHandle)
      links.set(record.id, {
        handle: record.fileHandle,
        stamp: record.fileStamp,
      });
    else links.delete(record.id);
  }
  async function writeLinked(project, interactive = false) {
    const link = fileLink(project.projectId);
    if (!link) return false;
    let permission = await link.handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted" && interactive)
      permission = await link.handle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      notice(
        "Im Browser gesichert. Zum Aktualisieren der MKW-Datei bitte „Projekt speichern“ anklicken und den Dateizugriff bestätigen.",
      );
      return false;
    }
    const perform = async () => {
      const latest = await MKWProjectStore.open(project.projectId);
      if (latest.version !== versions.get(project.projectId)) {
        notice(
          "Ein anderer Tab hat eine neuere Sicherung erstellt. Die Datei wird erst nach der Konfliktprüfung aktualisiert.",
        );
        return false;
      }
      const current = await link.handle.getFile();
      if (
        link.stamp &&
        (current.size !== link.stamp.size ||
          current.lastModified !== link.stamp.modified)
      ) {
        notice(
          "Die verknüpfte MKW-Datei wurde ausserhalb dieses Tabs geändert. Dein Stand bleibt im Browser erhalten. Bitte die andere Datei prüfen oder „Speichern unter …“ verwenden.",
        );
        return false;
      }
      await writeSaveFile(
        link.handle,
        new Blob([JSON.stringify(MKWProjectAssets.compact(project))], {
          type: "application/json",
        }),
        link.handle.name,
      );
      link.stamp = stamp(await link.handle.getFile());
      await MKWProjectStore.link(project.projectId, link.handle, link.stamp);
      return true;
    };
    return navigator.locks
      ? navigator.locks.request("mkw-file:" + project.projectId, perform)
      : perform();
  }
  function autosave(options = {}) {
    clearTimeout(saveTimer);
    saveTimer = null;
    const document = MKWProjectAssets.compact(p),
      id = document.projectId,
      saveRevision = revision;
    status("Projekt wird gesichert …");
    const operation = async () => {
      let target = id;
      while (aliases.has(target)) target = aliases.get(target);
      document.projectId = target;
      const outcome = await MKWProjectStore.save(
        document,
        versions.get(target) || 0,
        {
          fileHandle: links.get(target)?.handle,
          fileStamp: links.get(target)?.stamp,
        },
      );
      versions.set(outcome.id, outcome.version);
      if (outcome.conflict) {
        aliases.set(target, outcome.id);
        links.delete(outcome.id);
        document.projectId = outcome.id;
        document.meta.title = outcome.record.title;
        if (p.projectId === target || p.projectId === id) {
          p.projectId = outcome.id;
          p.meta.title = outcome.record.title;
        }
        notice(
          "Ein anderer Tab hat dieses Projekt geändert. Dein Stand wurde als separate Konfliktkopie erhalten. Die ursprüngliche MKW-Datei bleibt unverändert.",
        );
      }
      let fileSaved = false;
      if (
        options.writeFile !== false &&
        !outcome.conflict &&
        studioPreferences.autoSaveFile !== false
      )
        try {
          fileSaved = await writeLinked(document);
        } catch (error) {
          notice(
            "Im Browser gesichert. Die MKW-Datei konnte nicht aktualisiert werden: " +
              error.message,
          );
        }
      if (p.projectId === document.projectId) {
        savedRevision = Math.max(savedRevision, saveRevision);
        status(
          fileSaved
            ? "Browser und MKW-Datei gesichert."
            : savedRevision === revision
              ? "Im Browser gesichert" +
                (fileLink()
                  ? " · MKW-Datei noch nicht aktualisiert."
                  : " · noch keine MKW-Datei verknüpft.")
              : "Weitere Änderungen werden gesichert …",
        );
      }
      return outcome;
    };
    const task = queue.catch(() => {}).then(operation);
    queue = task;
    task.catch((error) => {
      notice("Sicherung fehlgeschlagen: " + error.message);
      status("Projekt nicht gesichert. Bitte „Projekt speichern“ verwenden.");
    });
    return task;
  }
  async function open(record) {
    if (savedRevision < revision) await autosave();
    await restore(record.project);
    await attach(record);
    revision = savedRevision = 0;
    $("#startDialog").close();
    $("#projectLibrary")?.close();
    busy = false;
    notice("");
    status(
      record.fileHandle
        ? "Projekt geöffnet · MKW-Datei verknüpft."
        : "Projekt aus diesem Browser geöffnet.",
    );
  }
  async function openFile(file, handle = null) {
    const document = MKWProjectAssets.hydrate(JSON.parse(await file.text()));
    validate(document);
    validateCarousel(document);
    if (savedRevision < revision) await autosave();
    document.projectId ??= uid();
    // A separate copy must never silently replace another project's browser backup or file link.
    let existing;
    try {
      existing = await MKWProjectStore.open(document.projectId);
    } catch {}
    const same = !!(
      handle &&
      existing?.fileHandle &&
      (await handle.isSameEntry(existing.fileHandle))
    );
    if (existing && !same) document.projectId = uid();
    await restore(document);
    versions.set(document.projectId, same ? existing.version : 0);
    if (handle) links.set(document.projectId, { handle, stamp: stamp(file) });
    else links.delete(document.projectId);
    revision = savedRevision = 0;
    busy = false;
    $("#startDialog").close();
    await autosave({ writeFile: false });
    notice(
      handle
        ? ""
        : "Die Datei ist geöffnet. Für direkte Dateiaktualisierungen bitte einmal „Projekt speichern“ verwenden und die vorhandene MKW-Datei auswählen.",
    );
  }
  async function chooseOpen() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: "MKW-Projekt",
              accept: { "application/json": [".mkw", ".json"] },
            },
          ],
        });
        await openFile(await handle.getFile(), handle);
      } catch (error) {
        if (error.name !== "AbortError")
          notice("Projekt konnte nicht geöffnet werden: " + error.message);
      }
    } else $("#projectFile").click();
  }
  async function saveFile(asNew = false) {
    if (busy) return;
    let handle = asNew ? null : fileLink()?.handle;
    // Ask for a handle/permission during the user gesture, before asynchronous project processing.
    try {
      if (!handle && window.showSaveFilePicker)
        handle = await chooseSaveTarget(saveFileName("mkw"), "mkw");
      if (
        handle &&
        (await handle.queryPermission({ mode: "readwrite" })) !== "granted" &&
        (await handle.requestPermission({ mode: "readwrite" })) !== "granted"
      )
        throw Error("Dateizugriff wurde nicht freigegeben.");
      setSaveBusy(true);
      if (
        asNew &&
        fileLink() &&
        handle &&
        !(await handle.isSameEntry(fileLink().handle))
      ) {
        p.projectId = uid();
        versions.set(p.projectId, 0);
        links.delete(p.projectId);
        revision++;
      }
      if (handle && !fileLink()) {
        links.set(p.projectId, {
          handle,
          stamp: stamp(await handle.getFile()),
        });
      }
      // Persist browser state first; concurrent edits fork before a file is touched.
      const result = await autosave({ writeFile: false });
      if (result.conflict)
        throw Error(
          "Konfliktkopie gesichert. Bitte für diese Kopie „Speichern unter …“ verwenden.",
        );
      if (handle) {
        if (asNew) {
          links.set(p.projectId, {
            handle,
            stamp: stamp(await handle.getFile()),
          });
        }
        const ok = await writeLinked(MKWProjectAssets.compact(p), true);
        if (!ok)
          throw Error(
            "Datei nicht überschrieben. Bitte den Hinweis oberhalb der Arbeitsfläche beachten.",
          );
        status("Browser und MKW-Datei aktualisiert.");
        notice("");
      } else {
        download(
          new Blob([JSON.stringify(MKWProjectAssets.compact(p))], {
            type: "application/json",
          }),
          saveFileName("mkw"),
        );
        status("MKW-Datei heruntergeladen · Browsersicherung bleibt aktiv.");
        notice(
          "Dieser Browser erlaubt keine direkte Aktualisierung lokaler Dateien. Automatisch wird im Browser gesichert. Für direktes Überschreiben bitte einen Browser mit Dateizugriff verwenden.",
        );
      }
      $("#saveDialog").close();
    } catch (error) {
      if (error.name !== "AbortError") {
        const message = "Speichern nicht abgeschlossen: " + error.message;
        $("#psdStatus").textContent = message;
        notice(message);
      }
    } finally {
      setSaveBusy(false);
    }
  }
  async function library() {
    let dialog = $("#projectLibrary");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "projectLibrary";
      dialog.innerHTML =
        '<div class="dialog-heading"><div><h2>Deine Projekte</h2><p>Getrennt in diesem Browser gesichert. MKW-Dateien bleiben zusätzlich auf deinem Gerät.</p></div><button id="closeProjectLibrary" class="icon-button" aria-label="Projektübersicht schliessen">' +
        studioIcon("close") +
        '</button></div><div id="projectLibraryList"></div>';
      document.body.append(dialog);
      $("#closeProjectLibrary").onclick = () => dialog.close();
    }
    const records = await MKWProjectStore.list();
    $("#projectLibraryList").innerHTML = records.length
      ? records
          .map(
            (record) =>
              `<div class="project-library-entry"><button class="project-library-row" data-project-id="${record.id}"><strong>${esc(record.title)}</strong><small>${record.mode === "carousel" ? "Carousel" : "Einzelposts"} · ${new Date(record.updatedAt).toLocaleString("de-CH")}${record.fileName ? " · " + esc(record.fileName) : ""}</small></button><button data-delete-project="${record.id}" aria-label="Browsersicherung löschen: ${esc(record.title)}" ${record.id === p.projectId ? "disabled" : ""}>${studioIcon("trash")}</button></div>`,
          )
          .join("")
      : "<p>Noch keine Projekte in diesem Browser gesichert.</p>";
    dialog.querySelectorAll("[data-project-id]").forEach(
      (button) =>
        (button.onclick = async () => {
          try {
            await open(await MKWProjectStore.open(button.dataset.projectId));
          } catch (error) {
            notice(error.message);
          }
        }),
    );
    dialog.querySelectorAll("[data-delete-project]").forEach(
      (button) =>
        (button.onclick = async () => {
          if (
            !confirm(
              "Diese Browsersicherung löschen? Eine gespeicherte MKW-Datei auf deinem Gerät bleibt erhalten.",
            )
          )
            return;
          try {
            await MKWProjectStore.remove(button.dataset.deleteProject);
            dialog.close();
            await library();
          } catch (error) {
            notice(error.message);
          }
        }),
    );
    dialog.showModal();
  }
  function setup() {
    const banner = document.createElement("div");
    banner.id = "projectStorageNotice";
    banner.className = "project-storage-notice";
    banner.setAttribute("role", "status");
    banner.hidden = true;
    document.body.append(banner);
    const libraryButton = document.createElement("button");
    libraryButton.id = "projects";
    libraryButton.className = "icon-button";
    libraryButton.title = "Gesicherte Projekte";
    libraryButton.setAttribute("aria-label", "Gesicherte Projekte");
    libraryButton.innerHTML = studioIcon("folder");
    $("#open").before(libraryButton);
    libraryButton.onclick = () =>
      library().catch((error) => notice(error.message));
    const startLibrary = document.createElement("button");
    startLibrary.id = "startProjects";
    startLibrary.textContent = "Alle gesicherten Projekte";
    $("#startDialog .start-choices").append(startLibrary);
    startLibrary.onclick = () =>
      library().catch((error) => notice(error.message));
    const saveAs = document.createElement("button");
    saveAs.id = "saveProjectAs";
    saveAs.textContent = "Speichern unter …";
    saveAs.className = "save-as-button";
    $("#saveProject").after(saveAs);
    saveAs.onclick = () => saveFile(true);
    $("#open").onclick = chooseOpen;
    $("#startOpen").onclick = chooseOpen;
    $("#projectFile").onchange = async (event) => {
      const file = event.target.files[0];
      if (file)
        try {
          await openFile(file);
        } catch (error) {
          notice(error.message);
        }
      event.target.value = "";
    };
    $("#saveProject").onclick = () => saveFile();
    const dateHint = document.createElement("small");
    dateHint.id = "saveDateHint";
    $("#saveDate").after(dateHint);
    const updateDateHint = () => {
      dateHint.textContent = $("#saveDate").value.trim()
        ? ""
        : "Hinweis: Ohne Datum wird der Dateiname ohne Datumspräfix gespeichert.";
    };
    $("#saveDate").addEventListener("input", updateDateHint);
    const original = $("#save").onclick;
    $("#save").title = "Projekt speichern";
    $("#save").setAttribute("aria-label", "Projekt speichern");
    $("#save").onclick = () => {
      original();
      updateDateHint();
      $("#saveName").closest("label").firstChild.textContent = fileLink()
        ? "Dateiname für Speichern unter / PSD"
        : "Dateiname";
      $("#saveProject strong").textContent = fileLink()
        ? "MKW-Datei aktualisieren"
        : window.showSaveFilePicker
          ? "MKW-Datei speichern"
          : "MKW-Datei herunterladen";
      $("#saveLocationHint").textContent = fileLink()
        ? "Verknüpft: " +
          fileLink().handle.name +
          (studioPreferences.autoSaveFile
            ? " · wird automatisch aktualisiert."
            : " · automatische Dateiaktualisierung ausgeschaltet.")
        : window.showSaveFilePicker
          ? "Einmal eine MKW-Datei wählen. Weitere Änderungen aktualisieren diese Datei automatisch."
          : "Automatische Sicherung im Browser. Lokale Dateien können hier nur heruntergeladen werden.";
    };
  }
  return {
    autosave,
    attach,
    open,
    openFile,
    chooseOpen,
    saveFile,
    library,
    setup,
    fileLink,
    notice,
    versions,
  };
})();
MKWProjects.setup();
window.addEventListener("keydown", (event) => {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === "s" &&
    !busy
  ) {
    event.preventDefault();
    if (event.shiftKey) MKWProjects.saveFile(true);
    else if (MKWProjects.fileLink()) MKWProjects.saveFile();
    else $("#save").click();
  }
});
