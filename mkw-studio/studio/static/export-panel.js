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
    naming = document.createElement("section"),
    summary = document.createElement("div"),
    progress = $("#exportProgress"),
    actions = footer.querySelector(".export-download-buttons");
  settings.className = naming.className = "export-settings-card";
  settings.setAttribute("aria-labelledby", "exportSettingsTitle");
  formatHeading.id = "exportSettingsTitle";
  formatHeading.textContent = "Dateiformat & Qualität";
  settings.append(formatHeading, buttons, format, preset, options, pdf, hint);
  naming.setAttribute("aria-labelledby", "exportNamingTitle");
  namingHeading.id = "exportNamingTitle";
  naming.append(namingHeading, fields);
  scroll.replaceChildren(settings, naming);
  preset.firstChild.textContent = "Voreinstellung";
  summary.className = "export-footer-summary";
  summary.append($("#exportTotal"), $("#exportStatus"));
  footer.replaceChildren(summary, progress, actions);
  footer.classList.add("export-task-footer");
  dialog.append(footer);
  $("#exportDialogTitle").textContent = "Exportieren";
  $("#closeExport").setAttribute("aria-label", "Exportfenster schliessen");
  dialog.querySelector(".dialog-heading p").textContent =
    "Bilder auswählen, Einstellungen prüfen und herunterladen.";
  function sync() {
    const designer = !!p.carousel;
    document.querySelector("#exportRowScopeLabel")?.remove();
    if (p.carousel?.pageStructure) {
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
  return { sync };
})();
