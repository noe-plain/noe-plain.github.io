"use strict";
function studioSettingsUI() {
  const dialog = $("#settingsDialog"),
    tabs = document.createElement("div");
  tabs.className = "settings-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Einstellungsbereich");
  const definitions = [
      ["general", "Allgemein"],
      ["guides", "Hilfslinien"],
      ["fonts", "Schriften"],
      ["sponsors", "Sponsoren"],
      ["templates", "Vorlagen"],
      ["export", "Export"],
    ],
    panels = {};
  for (const [id, label] of definitions) {
    const button = document.createElement("button");
    button.id = "settings-tab-" + id;
    button.dataset.settingsTab = id;
    button.type = "button";
    button.textContent = label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "settings-panel-" + id);
    tabs.append(button);
    const panel = document.createElement("div");
    panel.id = "settings-panel-" + id;
    panel.className = "settings-tab-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
    panel.hidden = id !== "general";
    panels[id] = panel;
  }
  const theme = dialog.querySelector(".theme-options"),
    heading = theme.previousElementSibling,
    hint = theme.nextElementSibling;
  panels.general.append(
    heading,
    theme,
    dialog.querySelector(".settings-advanced"),
  );
  hint.remove();
  const preferences = dialog.querySelector(".settings-preferences"),
    exportLabel = preferences.querySelector(".settings-export-format"),
    exportHeading = exportLabel.previousElementSibling,
    exportHint = exportLabel.nextElementSibling;
  panels.export.append(exportHeading, exportLabel);
  exportHint.remove();
  preferences.querySelector("small")?.remove();
  dialog.querySelector(".settings-fonts > small")?.remove();
  panels.guides.append(preferences);
  panels.fonts.append(dialog.querySelector(".settings-fonts"));
  const leading = document.createElement("section");
  leading.className = "settings-leading";
  leading.innerHTML =
    '<h3>Zeilenabstand im Designer</h3><label>Standard-Zeilenhöhe<span class="settings-leading-value"><input id="defaultLineHeight" type="number" min="20" max="300" step="1" aria-label="Standard-Zeilenhöhe in Prozent"><span>%</span></span></label>';
  panels.fonts.prepend(leading);
  const textSizes = document.createElement("section");
  textSizes.className = "settings-text-sizes";
  textSizes.innerHTML = `<h3>Standard-Schriftgrössen</h3><p>Startwerte für neue FD-Kampagnen · in Pixeln</p><div class="settings-size-grid">${[
    ["date", "Übertitel"],
    ["title", "Konzerttitel"],
    ["subtitle", "Untertitel"],
    ["copyright", "Copyright"],
  ]
    .map(
      ([key, label]) =>
        `<label>${label}<span class="settings-size-value"><input type="number" data-default-text-size="${key}" aria-label="Standard-Schriftgrösse ${label}" min="1" max="5000" step="1" value="${studioPreferences.textSizes[key]}"><span>px</span></span></label>`,
    )
    .join("")}</div>`;
  panels.fonts.prepend(textSizes);
  for (const input of textSizes.querySelectorAll("input"))
    input.onchange = () => {
      const value = Number(input.value),
        key = input.dataset.defaultTextSize;
      if (
        !input.value ||
        !Number.isFinite(value) ||
        value < 1 ||
        value > 5000
      ) {
        input.value = studioPreferences.textSizes[key];
        return;
      }
      studioPreferences.textSizes = {
        ...studioPreferences.textSizes,
        [key]: value,
      };
      studioApplyPreferences();
    };
  const pdf = document.createElement("section");
  pdf.className = "settings-pdf";
  pdf.innerHTML = `<h3>Designer-PDF</h3><label class="settings-export-format">Standard-Preset<select id="defaultPDFPreset">${Object.entries(
    carouselPDFPresets,
  )
    .map(([key, v]) => `<option value="${key}">${v.name}</option>`)
    .join("")}</select></label>`;
  panels.export.append(pdf);
  const saving = document.createElement("section");
  saving.innerHTML =
    '<h3>Projektsicherung</h3><label class="check"><input id="autoSaveFile" type="checkbox">Verknüpfte MKW-Datei automatisch aktualisieren</label>';
  panels.general.append(saving);
  saving.querySelector("#autoSaveFile").checked =
    studioPreferences.autoSaveFile;
  saving.querySelector("#autoSaveFile").onchange = (event) => {
    studioPreferences.autoSaveFile = event.target.checked;
    studioApplyPreferences();
  };
  dialog.querySelector(".dialog-heading").after(tabs);
  for (const panel of Object.values(panels)) dialog.append(panel);
  const select = (id) => {
    for (const button of tabs.children) {
      const selected = button.dataset.settingsTab === id;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [key, panel] of Object.entries(panels))
      panel.hidden = key !== id;
    dialog.scrollTop = 0;
    if (id === "sponsors") sponsorRenderSettings();
  };
  select("general");
  tabs.querySelectorAll("button").forEach((button) => {
    button.onclick = () => select(button.dataset.settingsTab);
    button.onkeydown = (event) => {
      const index = definitions.findIndex(
          ([id]) => id === button.dataset.settingsTab,
        ),
        next =
          event.key === "ArrowRight"
            ? (index + 1) % definitions.length
            : event.key === "ArrowLeft"
              ? (index + definitions.length - 1) % definitions.length
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? definitions.length - 1
                  : null;
      if (next !== null) {
        event.preventDefault();
        select(definitions[next][0]);
        tabs.children[next].focus();
      }
    };
  });
  $("#defaultLineHeight").value = studioPreferences.lineHeight;
  $("#defaultLineHeight").onchange = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value < 20 || value > 300) {
      event.target.value = studioPreferences.lineHeight;
      return;
    }
    studioPreferences.lineHeight = value;
    studioApplyPreferences();
  };
  $("#defaultPDFPreset").value = studioPreferences.pdfPreset;
  $("#defaultPDFPreset").onchange = (event) => {
    studioPreferences.pdfPreset = event.target.value;
    studioApplyPreferences();
  };
}
studioSettingsUI();
