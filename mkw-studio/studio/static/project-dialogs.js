"use strict";
const MKWProjectDialogs = (() => {
  function libraryShell() {
    const dialog = document.createElement("dialog");
    dialog.id = "projectLibrary";
    dialog.className = "project-task-dialog";
    dialog.setAttribute("aria-labelledby", "projectOpenTitle");
    dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="projectOpenTitle">Projekt öffnen</h2><p>Im Browser weiterarbeiten oder eine MKW-Datei auswählen.</p></div><button id="closeProjectLibrary" type="button" class="icon-button" aria-label="Projektübersicht schliessen">${studioIcon("close")}</button></div><div class="project-dialog-body"><div class="project-dialog-grid"><section class="project-browser-section" aria-labelledby="projectBrowserTitle"><div class="project-library-heading"><div><h3 id="projectBrowserTitle">Zuletzt in diesem Browser</h3><p>Deine automatisch gesicherten Projekte.</p></div><span id="projectLibraryCount" class="project-count">Maximal ${MKWProjectStore.projectLimit}</span></div><p id="projectOpenStatus" role="status"></p><button type="button" id="retryProjectLibrary" hidden>Erneut laden</button><div id="projectLibraryList" role="list" aria-label="Gespeicherte Projekte"></div></section><aside class="project-file-section" aria-labelledby="projectFileTitle"><div class="project-dialog-symbol" aria-hidden="true">${studioIcon("folder")}</div><h3 id="projectFileTitle">Auf deinem Computer</h3><p>Öffne eine MKW-Datei, die du selbst gespeichert oder von jemandem erhalten hast.</p><button type="button" id="openProjectFile" class="project-open-file primary">${studioIcon("folder")}<span><strong>MKW-Datei öffnen</strong><small>Datei auswählen</small></span></button><p class="project-file-note">Die Datei enthält dein bearbeitbares Projekt mit den verwendeten Bildern und Schriften.</p></aside></div></div><div class="project-dialog-footer"><p class="project-library-retention">Nur in diesem Browser: Die ${MKWProjectStore.projectLimit} zuletzt bearbeiteten Projekte bleiben gespeichert. Ältere Browsersicherungen werden automatisch entfernt. MKW-Dateien auf deinem Computer bleiben erhalten.</p><button type="button" id="dismissProjectLibrary">Schliessen</button></div>`;
    document.body.append(dialog);
    dialog.querySelector("#closeProjectLibrary").onclick = () => dialog.close();
    dialog.querySelector("#dismissProjectLibrary").onclick = () =>
      dialog.close();
    return dialog;
  }
  function libraryRows(records, currentId) {
    const list = $("#projectLibraryList");
    $("#projectLibraryCount").textContent =
      `${records.length} / ${MKWProjectStore.projectLimit} Projekte`;
    list.innerHTML = records.length
      ? records
          .map((record) => {
            const current = record.id === currentId,
              mode = record.mode === "carousel" ? "Designer" : "FD-Kampagnen",
              time = new Date(record.updatedAt).toLocaleString("de-CH", {
                dateStyle: "medium",
                timeStyle: "short",
              });
            return `<div class="project-library-entry" role="listitem"><button type="button" class="project-library-row" data-project-id="${esc(record.id)}"${current ? ' aria-describedby="currentProjectLabel"' : ""}>${studioIcon(record.mode === "carousel" ? "builder" : "image")}<span><strong>${esc(record.title || "Unbenanntes Projekt")}</strong><small>${mode} · ${esc(time)}</small>${record.fileName ? `<small class="project-linked-file">${esc(record.fileName)}</small>` : ""}${current ? '<span id="currentProjectLabel" class="project-current-label">Aktuell geöffnet</span>' : ""}</span></button><button type="button" class="icon-button" data-delete-project="${esc(record.id)}" aria-label="Browsersicherung löschen: ${esc(record.title)}" ${current ? 'disabled aria-describedby="currentProjectLabel"' : ""}>${studioIcon("trash")}</button></div>`;
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
      status = $("#psdStatus"),
      psdHint = dialog.lastElementChild,
      body = document.createElement("div"),
      grid = document.createElement("div"),
      main = document.createElement("div"),
      target = document.createElement("section"),
      actions = document.createElement("div"),
      alternative = document.createElement("aside"),
      footer = document.createElement("div");
    dialog.classList.add("project-task-dialog");
    const title = heading.querySelector("h2"),
      titleGroup = document.createElement("div");
    titleGroup.append(title);
    titleGroup.insertAdjacentHTML(
      "beforeend",
      "<p>Sichere dein Projekt zum Weiterarbeiten oder Weitergeben.</p>",
    );
    heading.prepend(titleGroup);
    $("#closeSave").setAttribute("aria-label", "Speicherdialog schliessen");
    body.className = "project-dialog-body";
    grid.className = "project-dialog-grid";
    main.className = "save-dialog-main";
    target.className = "save-file-naming";
    target.setAttribute("aria-labelledby", "saveFileTitle");
    target.innerHTML = '<h3 id="saveFileTitle">Projektdatei · MKW</h3>';
    target.append(nameField);
    const preview = document.createElement("output");
    preview.id = "saveFilePreview";
    preview.setAttribute("aria-label", "Dateiname der neuen MKW-Datei");
    preview.setAttribute("aria-live", "off");
    preview.setAttribute("for", "saveName projectCode projectName saveDate");
    preview.className = "save-file-preview";
    const previewLabel = document.createElement("p");
    previewLabel.className = "save-preview-label";
    previewLabel.textContent = "Datei beim Speichern unter …";
    previewLabel.append(preview);
    target.append(previewLabel, $("#saveLocationHint"), $("#saveAsHint"));
    save.setAttribute("aria-describedby", "saveLocationHint");
    naming.querySelector("h3").textContent = "Projektangaben";
    $("#saveDate").placeholder = "z. B. 151126";
    actions.className = "save-primary-actions";
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "MKW-Projekt sichern");
    save.classList.add("primary");
    actions.append(saveAs, save);
    main.append(naming, target);
    alternative.className = "save-alternatives";
    alternative.setAttribute("aria-labelledby", "saveAlternativesTitle");
    alternative.innerHTML =
      '<h3 id="saveAlternativesTitle">Weitere Möglichkeiten</h3>';
    psdHint.textContent =
      "Photoshop benötigt dieselben Schriften. Spezialfälle enthalten eine genaue Rasterdarstellung und zusätzliche Ebenen zum Bearbeiten. MKW zum Weiterarbeiten im Studio behalten.";
    alternative.append(psd, psdHint);
    const exportCard = document.createElement("section");
    exportCard.className = "save-export-entry";
    exportCard.innerHTML = `<h3>Fertige Bilder teilen</h3><p>JPG, PNG, WebP und beim Designer auch PDF findest du im Export.</p><button type="button" id="saveOpenExport">${studioIcon("export")}<span>Zum Export</span></button>`;
    alternative.append(exportCard);
    grid.append(main, alternative);
    body.append(grid);
    footer.className = "save-dialog-footer";
    const statusArea = document.createElement("div");
    statusArea.className = "project-dialog-status";
    statusArea.append(status);
    footer.append(statusArea, actions);
    heading.after(body, footer);
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
      saveAs.hidden = !MKWProjects.fileLink();
      previewLabel.firstChild.textContent = MKWProjects.fileLink()
        ? "Neue Datei beim Speichern unter …"
        : "So heisst deine Datei";
      update();
      body.scrollTop = 0;
    });
  }
  setupSave();
  return { libraryShell, libraryRows };
})();
