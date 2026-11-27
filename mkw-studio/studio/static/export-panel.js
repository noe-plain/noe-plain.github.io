"use strict";
const MKWExportPanel = (() => {
  const dialog = $("#exportDialog"),
    scroll = dialog.querySelector(".export-settings-scroll"),
    footer = dialog.querySelector(".export-download"),
    formatHeading = scroll.querySelector("h3"),
    buttons = scroll.querySelector(".export-format-buttons"),
    format = $("#exportFormat"),
    preset = scroll.querySelector(".export-preset-field"),
    options = scroll.querySelector(".export-options"),
    pdf = $("#pdfExportSettings"),
    hint = $("#exportFormatHint"),
    namingHeading = scroll.querySelector(".export-naming-heading"),
    fields = $("#exportFields"),
    settings = document.createElement("section"),
    naming = document.createElement("details"),
    summary = document.createElement("div"),
    progress = $("#exportProgress"),
    actions = footer.querySelector(".export-download-buttons");
  settings.className = naming.className = "export-settings-card";
  settings.setAttribute("aria-labelledby", "exportSettingsTitle");
  formatHeading.id = "exportSettingsTitle";
  formatHeading.textContent = "Dateiformat & Qualität";
  settings.append(formatHeading, buttons, format, preset, options, pdf, hint);
  const projectFile = document.createElement("label");
  projectFile.className = "export-project-option";
  projectFile.innerHTML =
    '<input type="checkbox" id="exportIncludeProject" checked><span>MKW-Projekt im ZIP</span>';
  settings.append(projectFile);
  projectFile.querySelector("input").onchange = (e) => {
    exportOptions.includeProject = e.target.checked;
    exportSessions.set(p.projectId, clone(exportOptions));
    $("#zip").textContent = e.target.checked
      ? "ZIP mit Projektdatei"
      : "ZIP herunterladen";
  };
  naming.setAttribute("aria-labelledby", "exportNamingTitle");
  namingHeading.id = "exportNamingTitle";
  const namingSummary = document.createElement("summary"),
    filenamePreview = document.createElement("output");
  filenamePreview.id = "exportFilenamePreview";
  filenamePreview.setAttribute("aria-label", "Beispiel-Dateiname");
  namingSummary.append(namingHeading);
  naming.append(namingSummary, filenamePreview, fields);
  scroll.replaceChildren(settings, naming);
  preset.firstChild.textContent = "Voreinstellung";
  summary.className = "export-footer-summary";
  summary.append($("#exportTotal"), $("#exportStatus"));
  footer.replaceChildren(summary, progress, actions);
  footer.classList.add("export-task-footer");
  dialog.append(footer);
  $("#exportDialogTitle").textContent = "Exportieren";
  $("#closeExport").setAttribute("aria-label", "Exportfenster schliessen");
  dialog.querySelector(".dialog-heading p").textContent = "";
  dialog.querySelector(".dialog-heading p").hidden = true;
  const views = document.createElement("div"),
    choose = $("#closeReview"),
    reviewDialog = $("#reviewDialog"),
    reviewButton = $("#reviewExport");
  views.className = "export-view-switch";
  views.setAttribute("role", "group");
  views.setAttribute("aria-label", "Exportansicht");
  choose.textContent = "Auswahl";
  choose.setAttribute("aria-label", "Exportauswahl anzeigen");
  reviewButton.textContent = "Vorschau";
  views.append(choose, reviewButton);
  dialog.querySelector(".export-selection").after(views);
  reviewDialog.querySelector(".dialog-heading").hidden = true;
  dialog.querySelector(".export-images").append(reviewDialog);
  const cancel = document.createElement("button");
  cancel.id = "cancelImageExport";
  cancel.type = "button";
  cancel.textContent = "Abbrechen";
  cancel.hidden = true;
  cancel.onclick = () => {
    exportAbort = true;
    MKWJXL.cancel();
  };
  actions.prepend(cancel);
  dialog.addEventListener("cancel", (event) => {
    if (busy) {
      event.preventDefault();
      if (!cancel.hidden) cancel.click();
    } else if (reviewDialog.open) {
      event.preventDefault();
      if (window.MKWReviewCommentsUI?.editing())
        $("#reviewCommentCancel").click();
      else $("#closeReview").click();
    }
  });
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !reviewDialog.open || busy) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.MKWReviewCommentsUI?.editing())
        $("#reviewCommentCancel").click();
      else $("#closeReview").click();
    },
    true,
  );
  function review(open) {
    $("#exportNames").hidden = open;
    choose.setAttribute("aria-pressed", String(!open));
    reviewButton.setAttribute("aria-pressed", String(open));
    if (!open && reviewDialog.open) reviewDialog.close();
  }
  function filename(value) {
    filenamePreview.textContent = value;
    filenamePreview.title = value;
  }
  function sync() {
    const designer = !!p.carousel && !p.campaign;
    $("#exportIncludeProject").checked = exportOptions.includeProject !== false;
    projectFile.hidden = exportOptions.format === "pdf";
    $("#zip").textContent =
      exportOptions.format === "pdf"
        ? "PDF herunterladen"
        : exportOptions.includeProject === false
          ? "ZIP herunterladen"
          : "ZIP mit Projektdatei";
    document.querySelector("#exportRowScopeLabel")?.remove();
    if (p.carousel?.pageStructure && !p.campaign) {
      const label = document.createElement("label"),
        row = carouselRow();
      label.id = "exportRowScopeLabel";
      label.innerHTML = `Exportauswahl<select id="exportRowScope"><option value="custom">Ausgewählte Slides</option><option value="row">Diese Reihe: ${esc(row?.info.name || "")}</option><option value="all">Alle Reihen</option></select>`;
      label.querySelector("select").onchange = (e) => {
        const value = e.target.value;
        if (value === "custom") return;
        const group = carouselRow();
        exportSetSelection(
          p.boards
            .filter(
              (b) =>
                value === "all" ||
                group.ids.includes(
                  MKWCarouselPolicy.frame(p.carousel, b.carouselSlide).id,
                ),
            )
            .map((b) => b.id),
        );
        e.target.value = value;
      };
      dialog.querySelector(".export-selection h3").after(label);
    }

    dialog.querySelector(".export-selection h3").textContent = designer
      ? "Slides auswählen"
      : "Bilder auswählen";
    dialog
      .querySelector(".export-images")
      .setAttribute(
        "aria-label",
        designer ? "Slides für den Export" : "Bilder für den Export",
      );
    dialog.querySelector(".dialog-heading p").textContent = designer
      ? "Slides auswählen, Format prüfen und herunterladen."
      : "Bilder auswählen, Format prüfen und herunterladen.";
  }
  function selection(boards) {
    const card = (b) =>
      `<label class="export-card" data-id="${esc(b.id)}"><div class="export-preview"><span>Vorschau wird berechnet …</span></div><input type="checkbox" data-export-id="${esc(b.id)}" ${b.checked ? "checked" : ""}> <small>${MKW.ratio(b.w, b.h)} · ${b.w} × ${b.h} px</small>${p.carousel?.pageStructure && !p.campaign ? `<strong>${esc(MKWCarouselPolicy.slideInfo(p.carousel, b.carouselSlide).label)}</strong>` : ""}<span class="export-name"></span><small class="export-size">Dateigrösse wird berechnet …</small></label>`;
    if (p.campaign)
      return p.campaign.rows
        .map(
          (row, i) =>
            `<section class="export-row"><h4>Bild ${i + 1} · ${esc(p.images.find((im) => im.id === row.imageId)?.name)}</h4><div class="export-row-cards">${boards
              .filter((b) => row.pages.includes(b.campaignPage))
              .map(card)
              .join("")}</div></section>`,
        )
        .join("");
    if (!p.carousel?.pageStructure) return boards.map(card).join("");
    const rows = new Map();
    for (const b of boards) {
      const info = MKWCarouselPolicy.slideInfo(p.carousel, b.carouselSlide);
      if (!rows.has(info.row))
        rows.set(info.row, { name: info.name, boards: [] });
      rows.get(info.row).boards.push(b);
    }
    return [...rows]
      .sort(([a], [b]) => a - b)
      .map(
        ([index, row]) =>
          `<section class="export-row" aria-labelledby="exportRowTitle${index}"><h4 id="exportRowTitle${index}">Reihe ${index + 1} · ${esc(row.name)}</h4><div class="export-row-cards">${row.boards.map(card).join("")}</div></section>`,
      )
      .join("");
  }
  return { sync, selection, review, filename };
})();
