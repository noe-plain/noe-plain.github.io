/* Editor orchestration for project identity, conflict-safe saves and user-selected files. */
const MKWProjects = (() => {
  "use strict";
  const versions = new Map(),
    links = new Map(),
    aliases = new Map();
  let queue = Promise.resolve(),
    dismissedNotice = null,
    openingProject = false,
    libraryGeneration = 0,
    zipCache;
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
    window.MKWFooterFeedback?.report(
      el?.hidden ? "" : message,
      error ? "error" : "info",
      "storage",
    );
  }
  function fileLink(id = p.projectId) {
    return links.get(id);
  }
  async function attach(record) {
    zipCache = undefined;
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
    if (!link?.stamp?.zip) return false;
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
      const id = project.projectId;
      const expectedVersion = versions.get(id);
      const initialStamp = link.stamp;
      const sameStamp = (file) =>
        file.size === initialStamp?.size &&
        file.lastModified === initialStamp?.modified;
      const check = async () => {
        if (!isCurrent() || fileLink(id) !== link) return false;
        const latest = await MKWProjectStore.version(id);
        if ((latest || 0) !== (expectedVersion || 0)) {
          notice(
            "Ein anderer Tab hat eine neuere Sicherung erstellt. Die Datei wird erst nach der Konfliktprüfung aktualisiert.",
          );
          return false;
        }
        const current = await link.handle.getFile();
        if (initialStamp && !sameStamp(current) && !initialStamp.zipPending) {
          notice(
            "Die verknüpfte MKW-Datei wurde ausserhalb dieses Tabs geändert. Dein Stand bleibt im Browser erhalten. Bitte die andere Datei prüfen oder „Speichern unter …“ verwenden.",
          );
          return false;
        }
        return current;
      };
      MKWProjectAssets.prune(project);
      const current = await check();
      if (!current) return false;
      const identities = [
        ...(sameStamp(current) ? [initialStamp.zipIdentity] : []),
        ...(initialStamp.zipPending ? [initialStamp.zipPending] : []),
      ];
      const { plan, known } = await MKWProjectFile.prepareZip(
        project,
        current,
        identities,
        zipCache?.link === link ? zipCache.known : undefined,
      );
      const latest = await check();
      if (
        !latest ||
        latest.size !== current.size ||
        latest.lastModified !== current.lastModified
      )
        return false;
      if (!plan.unchanged) {
        const baseIdentity = plan.expected.probe.sha256;
        const pending = {
          ...stamp(current),
          zip: true,
          zipIdentity: baseIdentity,
          zipVersion:
            baseIdentity === initialStamp.zipPending
              ? initialStamp.zipPendingVersion
              : initialStamp.zipVersion,
          zipPending: plan.identity,
          zipPendingVersion: expectedVersion,
        };
        await MKWProjectStore.link(id, link.handle, pending, expectedVersion);
        link.stamp = pending;
        if (!isCurrent() || fileLink(id) !== link) return false;
      }
      if (!plan.unchanged) await writeFilePlan(link.handle, plan);
      const written = await link.handle.getFile();
      const committed = {
        ...stamp(written),
        zip: true,
        zipIdentity: plan.identity,
        zipVersion: expectedVersion,
      };
      await MKWProjectStore.link(id, link.handle, committed, expectedVersion);
      link.stamp = committed;
      if (p.projectId === id) zipCache = { link, known };
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
    // The store preserves the complete model of imported and linked ZIP projects.
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
          lossless: options.lossless,
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
          zipCache = undefined;
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
      '<h2 id="projectOpeningTitle" tabindex="-1" autofocus>Projekt wird geöffnet</h2><p role="status">Projekt und Schriften werden vorbereitet …</p>';
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
      notice(
        record.fileStamp?.zip && record.version > record.fileStamp.zipVersion
          ? "Neueren Stand aus der Browsersicherung geöffnet. Du kannst die verknüpfte MKW-ZIP-Datei über «Projekt speichern» aktualisieren."
          : "",
      );
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
    MKWFields.notice(loadingTarget, "Projektdatei wird geöffnet …");
    const finishLoading = MKWUIControls.loading(loadingTarget);
    try {
      const isZip = await MKWProjectFile.isZip(file);
      if (isZip) handle = null;
      const document = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(file, { lazyImages: true }),
      );
      validate(document);
      validateCarousel(document);
      if (savedRevision < revision) await autosave();
      document.projectId ??= uid();
      // A separate copy must never silently replace another project's browser backup or file link.
      let existing;
      try {
        existing = await MKWProjectStore.metadata(document.projectId);
      } catch {}
      const same = !!(
        handle &&
        existing?.fileHandle &&
        (await handle.isSameEntry(existing.fileHandle))
      );
      if (existing && !same) document.projectId = uid();
      zipCache = undefined;
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
        isZip
          ? "MKW-Projekt geöffnet. Über «Projekt speichern» kannst du eine Arbeitskopie anlegen."
          : "Ältere MKW-Datei geöffnet. Über «Projekt speichern» kannst du sie als neues MKW-Projekt sichern.",
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
    const previous = fileLink(),
      linked = !asNew && previous?.stamp?.zip ? previous : null,
      name = saveFileName("mkw"),
      field = $("#psdStatus");
    setSaveBusy(true);
    field.classList.remove("save-error");
    MKWFields.notice(field, "Speicherort wird vorbereitet …");
    try {
      // Request the location or permission during the user gesture.
      const handle = linked?.handle || (await chooseSaveTarget(name, "mkw"));
      if (
        handle &&
        (await handle.queryPermission({ mode: "readwrite" })) !== "granted" &&
        (await handle.requestPermission({ mode: "readwrite" })) !== "granted"
      )
        throw Error("Dateizugriff wurde nicht freigegeben.");
      const initial = handle && !linked ? await handle.getFile() : null;
      if (initial?.size)
        throw Error(
          "Die vorhandene Datei bleibt erhalten. Bitte einen neuen Dateinamen wählen.",
        );
      MKWFields.notice(field, "Projektdatei wird vorbereitet …");
      if (asNew && previous && handle) {
        p.projectId = uid();
        versions.set(p.projectId, 0);
        revision++;
      }
      let backupError;
      const backup = await autosave({ writeFile: false, lossless: true }).catch(
        (error) => {
          backupError = error;
          return null;
        },
      );
      if (backup?.conflict)
        throw Error("Konfliktkopie gesichert. Bitte diese separat speichern.");
      const project = MKWProjectAssets.prune(MKWProjectAssets.capture(p));
      if (linked) {
        if (!(await writeLinked(project, true)))
          throw Error(
            "Die Datei konnte nicht aktualisiert werden. Bitte den Speicherhinweis beachten.",
          );
        status("Browser und MKW-Datei aktualisiert.");
      } else if (handle) {
        const { plan, known } = await MKWProjectFile.prepareZip(project);
        await writeFilePlan(handle, {
          size: plan.blob.size,
          bytesWritten: plan.blob.size,
          keepExistingData: false,
          expected: { size: 0, lastModified: initial.lastModified },
          writes: [{ position: 0, data: plan.blob }],
        });
        if (backup) {
          const saved = {
            ...stamp(await handle.getFile()),
            zip: true,
            zipIdentity: plan.identity,
            zipVersion: backup.version,
          };
          const link = { handle, stamp: saved };
          await MKWProjectStore.link(
            project.projectId,
            handle,
            saved,
            backup.version,
          );
          links.set(project.projectId, link);
          zipCache = { link, known };
        }
        status("MKW-Datei gespeichert.");
      } else {
        download(await MKWProjectFile.encodeZip(project), name);
        status("MKW-Datei heruntergeladen · Browsersicherung bleibt aktiv.");
      }
      notice(
        backupError
          ? "MKW-Datei gespeichert. Die Browsersicherung ist fehlgeschlagen: " +
              backupError.message
          : "",
        !!backupError,
      );
      $("#saveDialog").close();
    } catch (error) {
      if (error.name === "AbortError")
        MKWFields.notice(field, "Speichern abgebrochen.");
      else {
        const message = "Speichern nicht abgeschlossen: " + error.message;
        MKWFields.notice(field, message, true);
        field.classList.add("save-error");
        notice(message, true);
      }
    } finally {
      setSaveBusy(false);
    }
  }
  function openError(message) {
    const field = $("#projectLibrary")?.open
      ? $("#projectOpenStatus")
      : $("#startDialog").open
        ? $("#startStatus")
        : null;
    if (field) MKWFields.notice(field, message, true);
    else notice(message, true);
  }
  function setupFileDrop(install) {
    install({
      canOpen: () =>
        !openingProject &&
        (!busy ||
          ($("#startDialog").open &&
            !$("#startOpen").disabled &&
            !$("#projectSetup").open)),
      openFile,
      reportError: openError,
    });
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
      await MKWProjectStore.last({ metadataOnly: true });
      if (generation !== libraryGeneration || !dialog.open) return;
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
    list.querySelectorAll("[data-convert-project]").forEach((button) => {
      button.onclick = async () => {
        if (opening) return;
        const id = button.dataset.convertProject;
        const accepted = await MKWFeedback.ask({
          title: "FD-Kampagne umwandeln?",
          message:
            "Das ursprüngliche Projekt bleibt erhalten. Eine neue Kopie übernimmt die Titel in ein gemeinsames bearbeitbares Textfeld und erhält den bisherigen Verlauf.",
          confirm: "Kopie umwandeln",
          trigger: button,
        });
        if (
          !accepted ||
          opening ||
          !dialog.open ||
          generation !== libraryGeneration ||
          !button.isConnected
        )
          return;
        opening = true;
        const finish = MKWUIControls.loading("#projectOpenStatus");
        MKWFields.notice($("#projectOpenStatus"), "Projekt wird umgewandelt …");
        try {
          await open(MKWProjectStore.open(id));
          await MKWCampaignUI.convert({ confirmed: true });
        } catch (error) {
          openError(
            "Umwandlung nicht abgeschlossen. Die ursprüngliche Kampagne bleibt erhalten: " +
              error.message,
          );
        } finally {
          finish();
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
      window.MKWFooterFeedback?.report("", "info", "storage");
      if (returnFocus?.isConnected && !banner.contains(returnFocus))
        returnFocus.focus?.({ preventScroll: true });
    };
    banner.append(message, close);
    document.body.append(banner);
    window.MKWFooterFeedback?.attachStorageNotice(banner);
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
      $("#saveProject strong").textContent = fileLink()?.stamp?.zip
        ? "MKW-Datei aktualisieren"
        : window.showSaveFilePicker
          ? "Speichern unter …"
          : "MKW-Datei herunterladen";
      $("#saveLocationHint").textContent =
        fileLink() && !fileLink().stamp?.zip
          ? "Bisherige Datei: " +
            fileLink().handle.name +
            " · «Projekt speichern» legt eine neue MKW-Datei an."
          : fileLink()?.stamp?.zip
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
    const wasBusy = busy;
    busy = true;
    try {
      if (savedRevision < revision) await autosave();
      zipCache = undefined;
      await restore(document);
      notice("");
      revision = 1;
      savedRevision = 0;
      await autosave({ writeFile: false });
      return document;
    } finally {
      busy = p === document ? false : wasBusy;
    }
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
    setupFileDrop,
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
