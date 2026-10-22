"use strict";
const studioPreferenceDefaults = MKWSetupModel.defaults;
let studioPreferences = MKWSetupModel.preferences();
try {
  studioPreferences = MKWSetupModel.preferences(
    JSON.parse(localStorage.getItem("mkw-studio-preferences") || "{}"),
  );
} catch {}
function studioApplyPreferences() {
  studioApplyColourTheme();
  studioApplyDensity();
  MKWDesignerGrid.sync(studioPreferences.designerGrid);
  const style = document.documentElement.style;
  style.setProperty("--studio-guide-colour", studioPreferences.guideColour);
  style.setProperty(
    "--studio-guide-wash",
    studioPreferences.guideColour + "12",
  );
  style.setProperty(
    "--studio-guide-soft",
    studioPreferences.guideColour + "88",
  );
  style.setProperty(
    "--studio-guide-faint",
    studioPreferences.guideColour + "33",
  );
  style.setProperty("--studio-snap-colour", studioPreferences.snapColour);
  for (const id of ["guideColour", "snapColour", "snapDistance"])
    $("#" + id).value = studioPreferences[id];
  $("#defaultExportFormat").value = studioPreferences.exportFormat;
  $("#advancedMode").checked = studioPreferences.advanced;
  for (const key of Object.keys(studioPreferences.textSizes)) {
    const input = document.querySelector(`[data-default-text-size="${key}"]`);
    if (input) input.value = studioPreferences.textSizes[key];
  }
  for (const [id, key] of [
    ["defaultLineHeight", "lineHeight"],
    ["defaultPDFPreset", "pdfPreset"],
  ])
    if ($("#" + id)) $("#" + id).value = studioPreferences[key];
  if ($("#autoSaveFile"))
    $("#autoSaveFile").checked = studioPreferences.autoSaveFile;
  carouselSyncAdvancedTools();
  studioPersistPreferences();
}
function studioPersistPreferences() {
  try {
    localStorage.setItem(
      "mkw-studio-preferences",
      JSON.stringify(studioPreferences),
    );
  } catch {}
}
for (const id of ["guideColour", "snapColour"])
  $("#" + id).oninput = (event) => {
    studioPreferences[id] = event.target.value;
    studioApplyPreferences();
  };
$("#snapDistance").oninput = (event) => {
  const value = Number(event.target.value);
  if (
    !event.target.value ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 40
  )
    return;
  studioPreferences.snapDistance = value;
  studioApplyPreferences();
};
$("#snapDistance").onchange = (event) => {
  studioPreferences.snapDistance = Math.max(
    1,
    Math.min(40, Math.round(Number(event.target.value) || 6)),
  );
  studioApplyPreferences();
};
$("#defaultExportFormat").onchange = (event) => {
  studioPreferences.exportFormat = event.target.value;
  studioApplyPreferences();
};
$("#advancedMode").onchange = (event) => {
  studioPreferences.advanced = event.target.checked;
  studioApplyPreferences();
  if (carouselActive()) carouselPanel();
  else renderPanel();
};
studioApplyPreferences();
function studioSetTheme(theme) {
  theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  studioApplyColourTheme();
  try {
    localStorage.setItem("mkw-studio-theme", theme);
  } catch {}
  document
    .querySelectorAll("[data-theme-choice]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeChoice === theme),
      ),
    );
  document
    .querySelectorAll("header .brand img,.start-brand img")
    .forEach(
      (logo) =>
        (logo.src =
          theme === "light"
            ? "mkw-logo-bold-pos.svg"
            : "mkw-logo-bold-neg.svg"),
    );
}
$("#settings").onclick = () => {
  studioRenderFontSettings();
  $("#settingsDialog").showModal();
};
$("#closeSettings").onclick = () => $("#settingsDialog").close();
document
  .querySelectorAll("[data-theme-choice]")
  .forEach(
    (button) =>
      (button.onclick = () => studioSetTheme(button.dataset.themeChoice)),
  );
studioSetTheme(document.documentElement.dataset.theme);

function studioPrepareSave() {
  $("#projectCode").value = p.meta.code || "";
  $("#projectName").value = p.meta.title || "";
  $("#saveDate").value = p.meta.date || "";
  $("#saveName").dataset.custom = "false";
  $("#psdDescription").textContent = p.carousel
    ? "Zusammenhängendes Artwork, Ebenen, Texte und ein Slice pro Slide"
    : "Zeichenflächen, Textebenen und eingebettete Bilder";
}
function studioRefreshSaveName() {
  if ($("#saveDialog").open && $("#saveName").dataset.custom !== "true")
    $("#saveName").value = MKW.projectName(p.meta);
}
$("#saveName").addEventListener(
  "input",
  () => ($("#saveName").dataset.custom = "true"),
);
for (const id of ["projectCode", "projectName"])
  $("#" + id).addEventListener("input", studioRefreshSaveName);
$("#saveDate").oninput = (event) => {
  p.meta.date = event.target.value;
  touchMeta();
  studioRefreshSaveName();
};
