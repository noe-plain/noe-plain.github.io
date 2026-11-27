"use strict";
const MKWProjectDialogs = (() => {
  function libraryShell() {
    const dialog = document.createElement("dialog");
    dialog.id = "projectLibrary";
    dialog.className = "project-task-dialog";
    dialog.setAttribute("aria-labelledby", "projectOpenTitle");
    dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="projectOpenTitle">Projekt öffnen</h2><p>Im Browser weiterarbeiten oder eine MKW-Datei auswählen.</p></div><button id="closeProjectLibrary" type="button" class="icon-button" aria-label="Projektübersicht schliessen">${studioIcon("close")}</button></div><div class="project-dialog-body"><div class="project-dialog-grid"><section class="project-browser-section" aria-labelledby="projectBrowserTitle"><div class="project-library-heading"><div><h3 id="projectBrowserTitle">Zuletzt in diesem Browser</h3><p>Deine automatisch gesicherten Projekte.</p></div><span id="projectLibraryCount" class="project-count">Maximal ${MKWProjectStore.projectLimit}</span></div><p id="projectOpenStatus" role="status"></p><button type="button" id="retryProjectLibrary" hidden>Erneut laden</button><div id="projectLibraryList" role="list" aria-label="Gespeicherte Projekte"></div></section><aside class="project-file-section" aria-labelledby="projectFileTitle"><div class="project-dialog-symbol" aria-hidden="true">${studioIcon("folder")}</div><h3 id="projectFileTitle">Auf deinem Computer</h3><p>Öffne eine MKW-Datei, die du selbst gespeichert oder von jemandem erhalten hast.</p><button type="button" id="openProjectFile" class="project-open-file project-file-drop">${studioIcon("folder")}<span><strong>MKW-Datei öffnen</strong><small>Hier ablegen oder Datei auswählen</small></span></button><p class="project-file-note">Die Datei enthält dein bearbeitbares Projekt mit den verwendeten Bildern und Schriften.</p></aside></div></div><div class="project-dialog-footer"><p class="project-library-retention">Nur in diesem Browser: Die ${MKWProjectStore.projectLimit} zuletzt bearbeiteten Projekte bleiben gespeichert. Ältere Browsersicherungen werden automatisch entfernt. MKW-Dateien auf deinem Computer bleiben erhalten.</p><button type="button" id="dismissProjectLibrary">Schliessen</button></div>`;
    document.body.append(dialog);
    dialog.querySelector("#closeProjectLibrary").onclick = () => dialog.close();
    dialog.querySelector("#dismissProjectLibrary").onclick = () =>
      dialog.close();
    return dialog;
  }
  let dropInstalled = false;
  function installFileDrop({ canOpen, openFile, reportError }) {
    if (dropInstalled) return;
    dropInstalled = true;
    const selector = "#startOpen, #openProjectFile";
    let depth = new WeakMap();
    const reset = () => {
      document
        .querySelectorAll(selector)
        .forEach((zone) => zone.classList.remove("is-project-drop-target"));
      depth = new WeakMap();
    };
    const zoneFor = (event) => event.target.closest?.(selector);
    const filesDrag = (event) =>
      Array.from(event.dataTransfer?.types || []).includes("Files");
    document.addEventListener(
      "dragenter",
      (event) => {
        const zone = zoneFor(event);
        if (!zone || !filesDrag(event) || zone.disabled || !canOpen()) return;
        event.preventDefault();
        depth.set(zone, (depth.get(zone) || 0) + 1);
        zone.classList.add("is-project-drop-target");
      },
      true,
    );
    document.addEventListener(
      "dragleave",
      (event) => {
        const zone = zoneFor(event);
        if (!zone) return;
        const count = Math.max(0, (depth.get(zone) || 0) - 1);
        depth.set(zone, count);
        if (!count) zone.classList.remove("is-project-drop-target");
      },
      true,
    );
    document.addEventListener(
      "dragover",
      (event) => {
        const zone = zoneFor(event);
        if (!zone || !filesDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect =
          zone.disabled || !canOpen() ? "none" : "copy";
      },
      true,
    );
    document.addEventListener(
      "drop",
      async (event) => {
        const zone = zoneFor(event),
          isFiles = filesDrag(event);
        reset();
        if (!zone || !isFiles) return;
        event.preventDefault();
        event.stopPropagation();
        if (zone.disabled || !canOpen()) return;
        const files = Array.from(event.dataTransfer.files);
        zone.focus({ preventScroll: true });
        if (files.length !== 1 || !/\.mkw$/i.test(files[0].name)) {
          reportError(
            "Bitte genau eine .mkw-Datei hier ablegen. Bilder kannst du wie bisher auf die Arbeitsfläche ziehen.",
          );
          return;
        }
        zone.disabled = true;
        zone.setAttribute("aria-busy", "true");
        try {
          await openFile(files[0]);
        } catch (error) {
          reportError("Projekt konnte nicht geöffnet werden: " + error.message);
        } finally {
          zone.disabled = false;
          zone.removeAttribute("aria-busy");
          if (zone.isConnected && zone.getClientRects().length)
            zone.focus({ preventScroll: true });
        }
      },
      true,
    );
    document.addEventListener("dragend", reset, true);
    window.addEventListener("blur", reset);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") reset();
    });
  }
  function libraryRows(records, currentId) {
    const list = $("#projectLibraryList");
    $("#projectLibraryCount").textContent =
      `${records.length} / ${MKWProjectStore.projectLimit} Projekte`;
    list.innerHTML = records.length
      ? records
          .map((record) => {
            const current = record.id === currentId,
              mode =
                record.mode === "campaign"
                  ? "FD-Kampagnen"
                  : record.mode === "carousel"
                    ? "Designer"
                    : "FD-Kampagnen (Backup)",
              time = new Date(record.updatedAt).toLocaleString("de-CH", {
                dateStyle: "medium",
                timeStyle: "short",
              });
            return `<div class="project-library-entry" role="listitem"><button type="button" class="project-library-row" data-project-id="${esc(record.id)}"${current ? ' aria-describedby="currentProjectLabel"' : ""}>${studioIcon(record.mode === "carousel" ? "builder" : "image")}<span><strong>${esc(record.title || "Unbenanntes Projekt")}</strong><small>${mode} · ${esc(time)}</small>${record.fileName ? `<small class="project-linked-file">${esc(record.fileName)}</small>` : ""}${current ? '<span id="currentProjectLabel" class="project-current-label">Aktuell geöffnet</span>' : ""}</span></button><div class="project-library-actions"><button type="button" class="icon-button" data-delete-project="${esc(record.id)}" aria-label="Browsersicherung löschen: ${esc(record.title)}" ${current ? 'disabled aria-describedby="currentProjectLabel"' : ""}>${studioIcon("trash")}</button>${record.mode !== "carousel" && record.mode !== "campaign" ? `<button type="button" class="icon-button" data-convert-project="${esc(record.id)}" title="In FD-Kampagnen umwandeln" aria-label="In FD-Kampagnen umwandeln: ${esc(record.title || "Unbenanntes Projekt")}">${studioIcon("replace")}</button>` : ""}</div></div>`;
          })
          .join("")
      : '<div class="project-library-empty" role="listitem"><strong>Noch keine Projekte in diesem Browser</strong><p>Wähle „MKW-Datei öffnen“. Sobald du im Studio arbeitest, erscheint deine Browsersicherung hier.</p></div>';
  }
  function setupSave() {
    const dialog = $("#saveDialog"),
      heading = dialog.querySelector(".dialog-heading"),
      naming = dialog.querySelector(".save-project-naming"),
      nameField = dialog.querySelector(".save-name-field"),
      save = $("#saveProject"),
      saveAs = $("#saveProjectAs"),
      psd = $("#savePSD"),
      psdHint = dialog.lastElementChild,
      status = $("#psdStatus");
    dialog.classList.add("project-task-dialog", "save-focused-dialog");
    $("#closeSave").setAttribute("aria-label", "Speicherdialog schliessen");
    const body = document.createElement("div"),
      grid = document.createElement("div"),
      main = document.createElement("div"),
      file = document.createElement("section"),
      metadata = document.createElement("details"),
      summary = document.createElement("summary"),
      alternative = document.createElement("aside"),
      footer = document.createElement("div"),
      actions = document.createElement("div"),
      statusArea = document.createElement("div");
    body.className = "project-dialog-body";
    grid.className = "project-dialog-grid";
    main.className = "save-dialog-main";
    file.className = "save-file-naming";
    file.setAttribute("aria-labelledby", "saveFileTitle");
    file.innerHTML = `<div class="save-file-heading">${studioIcon("save")}<h3 id="saveFileTitle">MKW-Projekt</h3><span id="saveBrowserState" role="status"></span></div>`;
    const preview = document.createElement("output");
    preview.id = "saveFilePreview";
    preview.className = "save-file-preview";
    preview.setAttribute("aria-label", "Dateiname der neuen MKW-Datei");
    preview.setAttribute("for", "saveName projectCode projectName saveDate");
    const destination = document.createElement("div");
    destination.className = "save-destination";
    destination.append($("#saveLocationHint"));
    $("#saveAsHint").classList.add("sr-only");
    file.append(
      nameField,
      preview,
      destination,
      $("#saveDateHint"),
      $("#saveAsHint"),
    );
    metadata.className = "save-project-details";
    summary.textContent = "Projektangaben";
    naming.querySelector("h3").remove();
    metadata.append(summary, naming);
    if ($("#saveDateFormats")) $("#saveDateFormats").classList.add("sr-only");
    main.append(file, metadata);
    alternative.className = "save-alternatives";
    alternative.setAttribute("aria-labelledby", "saveAlternativesTitle");
    alternative.innerHTML =
      '<h3 id="saveAlternativesTitle">Weitere Formate</h3>';
    const psdScope = document.createElement("label");
    psdScope.id = "psdRowScopeLabel";
    psdScope.hidden = true;
    psdScope.innerHTML =
      'PSD-Auswahl<select id="psdRowScope"><option value="all">Gesamtes Projekt</option><option value="row">Aktive Reihe</option></select>';
    psdHint.textContent = "MKW zum Weiterarbeiten im Studio behalten.";
    const exportCard = document.createElement("section");
    exportCard.className = "save-export-entry";
    exportCard.innerHTML = `<button type="button" id="saveOpenExport">${studioIcon("export")}<span>Bilder & PDF exportieren</span></button>`;
    alternative.append(psdScope, psd, psdHint, exportCard);
    grid.append(main, alternative);
    body.append(grid);
    footer.className = "save-dialog-footer";
    statusArea.className = "project-dialog-status";
    statusArea.append(status);
    actions.className = "save-primary-actions";
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "MKW-Projekt sichern");
    save.classList.add("primary");
    actions.append(saveAs, save);
    footer.append(statusArea, actions);
    dialog.replaceChildren(heading, body, footer);
    $("#saveOpenExport").onclick = () => {
      dialog.close();
      $(p.carousel ? "#carouselExport" : "#export").click();
    };
    const update = () => {
      preview.textContent = saveFileName("mkw");
    };
    for (const id of ["saveName", "projectCode", "projectName", "saveDate"])
      $("#" + id).addEventListener("input", update);
    $("#save").addEventListener("click", () => {
      const link = MKWProjects.fileLink();
      $("#saveOpenExport span").textContent = p.carousel
        ? "Bilder & PDF exportieren"
        : "Bilder exportieren";
      saveAs.hidden = !link;
      nameField.firstChild.textContent = link
        ? "Name für neue Kopie / PSD"
        : "Dateiname";
      $("#saveBrowserState").textContent =
        savedRevision >= revision
          ? "Browser: gesichert"
          : "Browser: Sicherung ausstehend";
      $("#saveLocationHint").textContent = link?.stamp?.zip
        ? link.handle.name +
          (studioPreferences.autoSaveFile
            ? " · Auto-Speichern an"
            : " · Auto-Speichern aus")
        : link
          ? link.handle.name + " · neues MKW-Format als Kopie speichern"
          : window.showSaveFilePicker
            ? "Ordner beim Speichern wählen"
            : "Download · Speicherort gemäss Browser-Einstellung";
      psdScope.hidden = !p.carousel?.pageStructure;
      psdScope.querySelector("select").value = "all";
      const row = p.carousel?.pageStructure ? carouselRow() : null;
      psdScope.querySelector('[value="row"]').textContent = row
        ? `Diese Reihe: ${row.info.name}`
        : "Aktive Reihe";
      metadata.open = !!MKWDateFields.message($("#saveDate").value);
      update();
      body.scrollTop = 0;
      $("#saveName").focus({ preventScroll: true });
    });
  }
  setupSave();
  MKWProjects.setupFileDrop(installFileDrop);
  return { libraryShell, libraryRows, installFileDrop };
})();
