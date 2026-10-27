/* Editor orchestration for project identity, conflict-safe saves and user-selected files. */
const MKWProjects = (() => {
  "use strict";
  const versions = new Map(),
    links = new Map(),
    aliases = new Map();
  let queue = Promise.resolve(),
    dismissedNotice = null,
    openingProject = false,
    libraryGeneration = 0;
  const stamp = (file) => ({ size: file.size, modified: file.lastModified });
  function notice(message, error = false) {
    const el = $("#projectStorageNotice");
    if (el) {
      el.querySelector("[data-notice-message]").textContent = message;
      const dismissed =
        !error &&
        dismissedNotice?.id === p.projectId &&
        dismissedNotice?.message === message;
      if (!dismissed) dismissedNotice = null;
      el.hidden = !message || dismissed;
      el.classList.toggle("is-error", error);
      el.setAttribute("role", error ? "alert" : "status");
      if (error) {
        el.classList.remove("notice-attention");
        void el.offsetWidth;
        el.classList.add("notice-attention");
      }
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
  async function writeLinked(
    project,
    interactive = false,
    isCurrent = () => true,
  ) {
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
      const check = async () => {
        if (!isCurrent()) return false;
        const latest = await MKWProjectStore.version(project.projectId);
        if ((latest || 0) !== (versions.get(project.projectId) || 0)) {
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
        return current;
      };
      const current = await check();
      if (!current) return false;
      const packed = await MKWProjectStore.pack(project),
        plan = await MKWProjectBlocks.prepare(packed, current, {
          readAsset: MKWProjectStore.asset,
        });
      // Serialization can take time for new photos. Recheck before touching the file.
      if (!(await check())) return false;
      if (plan.unchanged) return true;
      await writeFilePlan(link.handle, plan);
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
    // Keep immutable asset identities so unchanged photos reuse their SHA-256.
    // The store compacts this snapshot before persisting; raw originals stay out.
    const document = MKWProjectAssets.capture(p),
      id = document.projectId,
      saveRevision = revision;
    const finishLoading = MKWUIControls.loading("#status");
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
          outcome.missing
            ? "Diese Browsersicherung wurde inzwischen entfernt. Dein aktueller Stand wurde als neues Projekt gesichert. Die ursprüngliche MKW-Datei bleibt unverändert."
            : "Ein anderer Tab hat dieses Projekt geändert. Dein Stand wurde als separate Konfliktkopie erhalten. Die ursprüngliche MKW-Datei bleibt unverändert.",
        );
      }
      let fileSaved = false;
      if (
        options.writeFile !== false &&
        !outcome.conflict &&
        studioPreferences.autoSaveFile !== false &&
        (p.projectId !== document.projectId || saveRevision === revision)
      )
        try {
          fileSaved = await writeLinked(
            document,
            false,
            () =>
              p.projectId !== document.projectId || saveRevision === revision,
          );
        } catch (error) {
          notice(
            "Im Browser gesichert. Die MKW-Datei konnte nicht aktualisiert werden: " +
              error.message,
            true,
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
    task.then(finishLoading, finishLoading);
    task.catch((error) => {
      notice("Sicherung fehlgeschlagen: " + error.message, true);
      status("Projekt nicht gesichert. Bitte „Projekt speichern“ verwenden.");
    });
    return task;
  }
  function beginOpen() {
    if (openingProject) return null;
    openingProject = true;
    const wasBusy = busy;
    busy = true;
    const dialog = document.createElement("dialog");
    dialog.id = "projectOpeningDialog";
    dialog.setAttribute("aria-labelledby", "projectOpeningTitle");
    dialog.innerHTML =
      '<h2 id="projectOpeningTitle" tabindex="-1" autofocus>Projekt wird geöffnet</h2><p role="status">Bilder und Schriften werden geladen …</p>';
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(dialog);
    const finishLoading = MKWUIControls.loading(dialog.querySelector("p"));
    dialog.showModal();
    return (success) => {
      finishLoading();
      dialog.close();
      dialog.remove();
      ((openingProject = false), (libraryGeneration = 0));
      busy = success ? false : wasBusy;
    };
  }
  async function open(record) {
    const finishOpen = beginOpen();
    if (!finishOpen) return;
    let success = false;
    const finishLoading = MKWUIControls.loading(
      $("#startDialog").open ? "#startStatus" : "#projectOpenStatus",
    );
    try {
      record = await record;
      if (!record?.project)
        throw Error("Diese Browsersicherung ist nicht mehr vorhanden.");
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
      success = true;
    } finally {
      finishLoading();
      finishOpen(success);
    }
  }
  async function openFile(file, handle = null) {
    const finishOpen = beginOpen();
    if (!finishOpen) return;
    let success = false;
    const loadingTarget = $(
      $("#projectLibrary")?.open ? "#projectOpenStatus" : "#startStatus",
    );
    loadingTarget.textContent = "Projektdatei wird geöffnet …";
    const finishLoading = MKWUIControls.loading(loadingTarget);
    try {
      const document = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(file),
      );
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
      $("#projectLibrary")?.close();
      success = true;
      await autosave({ writeFile: false });
      notice(
        handle
          ? ""
          : "Die Datei ist geöffnet. Für direkte Dateiaktualisierungen bitte einmal „Projekt speichern“ verwenden und die vorhandene MKW-Datei auswählen.",
      );
    } finally {
      finishLoading();
      finishOpen(success);
    }
  }
  async function chooseFile() {
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
          openError("Projekt konnte nicht geöffnet werden: " + error.message);
      }
    } else $("#projectFile").click();
  }
  async function saveFile(asNew = false) {
    if (busy) return;
    let handle = asNew ? null : fileLink()?.handle;
    setSaveBusy(true);
    $("#psdStatus").classList.remove("save-error");
    MKWFields.notice($("#psdStatus"), "Speicherort wird vorbereitet …");
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
      MKWFields.notice($("#psdStatus"), "Projektdatei wird vorbereitet …");
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
      let backupError = null;
      const result = await autosave({ writeFile: false }).catch((error) => {
        backupError = error;
        return null;
      });
      if (result?.conflict)
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
        const ok = await writeLinked(MKWProjectAssets.capture(p), true);
        if (!ok)
          throw Error(
            "Datei nicht überschrieben. Bitte den Hinweis oberhalb der Arbeitsfläche beachten.",
          );
        status("Browser und MKW-Datei aktualisiert.");
        notice("");
      } else {
        download(await MKWProjectFile.encode(p), saveFileName("mkw"));
        status("MKW-Datei heruntergeladen · Browsersicherung bleibt aktiv.");
        notice(
          "Dieser Browser erlaubt keine direkte Aktualisierung lokaler Dateien. Automatisch wird im Browser gesichert. Für direktes Überschreiben bitte einen Browser mit Dateizugriff verwenden.",
        );
      }
      if (backupError) {
        notice(
          "MKW-Datei gespeichert. Die Browsersicherung ist fehlgeschlagen; bitte Speicherplatz freigeben oder ältere Browserprojekte entfernen. " +
            backupError.message,
          true,
        );
        status("MKW-Datei gespeichert · Browsersicherung fehlgeschlagen.");
      }
      $("#saveDialog").close();
    } catch (error) {
      if (error.name === "AbortError")
        MKWFields.notice($("#psdStatus"), "Speichern abgebrochen.");
      else {
        const message = "Speichern nicht abgeschlossen: " + error.message;
        $("#psdStatus").textContent = message;
        notice(message, true);
        $("#psdStatus").classList.add("save-error");
        $("#psdStatus").setAttribute("role", "alert");
      }
    } finally {
      setSaveBusy(false);
    }
  }
  function openError(message) {
    const field = $("#projectOpenStatus");
    if (field && $("#projectLibrary").open)
      MKWFields.notice(field, message, true);
    else notice(message, true);
  }
  async function library() {
    let dialog = $("#projectLibrary");
    if (!dialog) {
      dialog = MKWProjectDialogs.libraryShell();
      dialog.addEventListener("close", () => {
        if (!dialog.open) libraryGeneration++;
      });
      $("#openProjectFile").onclick = chooseFile;
      $("#retryProjectLibrary").onclick = () =>
        library().catch((error) => openError(error.message));
    }
    const generation = ++libraryGeneration;
    $("#retryProjectLibrary").hidden = true;
    MKWFields.notice($("#projectOpenStatus"), "");
    const list = $("#projectLibraryList");
    list.innerHTML =
      '<p class="project-library-empty" role="listitem">Projekte werden geladen …</p>';
    const finishLoading = MKWUIControls.loading(list.querySelector("p"));
    list.setAttribute("aria-busy", "true");
    if (!dialog.open) dialog.showModal();
    let records;
    try {
      records = await MKWProjectStore.list();
    } catch (error) {
      if (generation !== libraryGeneration || !dialog.open) return;
      list.innerHTML = "";
      $("#retryProjectLibrary").hidden = false;
      openError(
        "Browsersicherungen konnten nicht geladen werden. Du kannst weiterhin eine MKW-Datei öffnen. " +
          error.message,
      );
      return;
    } finally {
      finishLoading();
      if (generation === libraryGeneration)
        list.setAttribute("aria-busy", "false");
    }
    if (generation !== libraryGeneration || !dialog.open) return;
    MKWProjectDialogs.libraryRows(records, p.projectId);
    let opening = false;
    list.querySelectorAll("[data-project-id]").forEach((button) => {
      button.onclick = async () => {
        if (opening) return;
        opening = true;
        const finishLoading = MKWUIControls.loading("#projectOpenStatus");
        MKWFields.notice($("#projectOpenStatus"), "Projekt wird geöffnet …");
        try {
          await open(MKWProjectStore.open(button.dataset.projectId));
        } catch (error) {
          openError("Projekt konnte nicht geöffnet werden: " + error.message);
        } finally {
          finishLoading();
          opening = false;
        }
      };
    });
    list.querySelectorAll("[data-delete-project]").forEach((button) => {
      button.onclick = async () => {
        if (opening) return;
        const id = button.dataset.deleteProject;
        if (
          !(await MKWFeedback.ask({
            title: "Browsersicherung löschen?",
            message:
              "Eine gespeicherte MKW-Datei auf deinem Gerät bleibt erhalten.",
            confirm: "Sicherung löschen",
            destructive: true,
            trigger: button,
          })) ||
          opening ||
          id === p.projectId ||
          !button.isConnected ||
          !dialog.open
        )
          return;
        try {
          await MKWProjectStore.remove(id);
          await library();
          $("#projectLibrary")
            ?.querySelector("button:not(:disabled)")
            ?.focus({ preventScroll: true });
        } catch (error) {
          openError(error.message);
        }
      };
    });
  }
  function setup() {
    const banner = document.createElement("div");
    banner.id = "projectStorageNotice";
    banner.className = "project-storage-notice";
    banner.setAttribute("role", "status");
    banner.hidden = true;
    const message = document.createElement("span"),
      close = document.createElement("button");
    message.dataset.noticeMessage = "";
    close.id = "projectNoticeClose";
    close.type = "button";
    close.className = "icon-button";
    close.setAttribute("aria-label", "Meldung schliessen");
    close.innerHTML = studioIcon("close");
    let returnFocus = null;
    close.onfocus = (event) => {
      returnFocus = event.relatedTarget;
    };
    close.onclick = () => {
      dismissedNotice = banner.classList.contains("is-error")
        ? null
        : { id: p.projectId, message: message.textContent };
      banner.hidden = true;
      if (returnFocus?.isConnected && !banner.contains(returnFocus))
        returnFocus.focus?.({ preventScroll: true });
    };
    banner.append(message, close);
    document.body.append(banner);
    const saveAs = document.createElement("button");
    saveAs.id = "saveProjectAs";
    saveAs.textContent = "Speichern unter …";
    saveAs.className = "save-as-button";
    $("#saveProject").after(saveAs);
    saveAs.onclick = () => saveFile(true);
    const saveAsHint = document.createElement("p");
    saveAsHint.id = "saveAsHint";
    saveAs.setAttribute("aria-describedby", "saveAsHint");
    saveAs.after(saveAsHint);
    $("#open").onclick = () =>
      library().catch((error) => notice(error.message));
    $("#projectFile").onchange = async (event) => {
      const file = event.target.files[0];
      if (file)
        try {
          await openFile(file);
        } catch (error) {
          openError("Projekt konnte nicht geöffnet werden: " + error.message);
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
      $("#saveAsHint").textContent = window.showSaveFilePicker
        ? "„Speichern unter …“ öffnet die Auswahl für Ordner und Dateiname."
        : "Dieser Browser bestimmt den Downloadordner. Aktiviere in seinen Download-Einstellungen „Vor jedem Download nach dem Speicherort fragen“, um den Ordner bei jedem Speichern auszuwählen.";
      $("#saveName").closest("label").firstChild.textContent = fileLink()
        ? "Dateiname für Speichern unter / PSD"
        : "Dateiname";
      $("#saveProject strong").textContent = fileLink()
        ? "MKW-Datei aktualisieren"
        : window.showSaveFilePicker
          ? "Speichern unter …"
          : "MKW-Datei herunterladen";
      $("#saveLocationHint").textContent = fileLink()
        ? "Verknüpft: " +
          fileLink().handle.name +
          (studioPreferences.autoSaveFile
            ? " · wird automatisch aktualisiert."
            : " · automatische Dateiaktualisierung ausgeschaltet.")
        : window.showSaveFilePicker
          ? studioPreferences.autoSaveFile
            ? "Wähle einen Ordner und Dateinamen. Danach wird diese MKW-Datei automatisch aktualisiert."
            : "Wähle einen Ordner und Dateinamen. Die automatische Dateiaktualisierung ist ausgeschaltet."
          : "Automatische Sicherung im Browser. Lokale Dateien können hier nur heruntergeladen werden.";
    };
  }
  async function startDocument(document) {
    validate(document);
    validateCarousel(document);
    if (savedRevision < revision) await autosave();
    await restore(document);
    revision = 1;
    savedRevision = 0;
    busy = false;
    await autosave({ writeFile: false });
    return document;
  }
  return {
    autosave,
    startDocument,
    attach,
    open,
    openFile,
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
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (busy) return;
    if (event.shiftKey) MKWProjects.saveFile(true);
    else if (MKWProjects.fileLink()) MKWProjects.saveFile();
    else $("#save").click();
  }
});
