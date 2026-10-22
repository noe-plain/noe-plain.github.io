"use strict";
let studioColourThemeKey = "";
let studioColourThemeFrame = 0;
function studioApplyColourTheme() {
  const root = document.documentElement,
    theme = root.dataset.theme === "dark" ? "dark" : "light",
    colour = studioPreferences.primaryColour,
    key = colour + theme;
  if (key !== studioColourThemeKey) {
    root.classList.add("studio-theme-changing");
    cancelAnimationFrame(studioColourThemeFrame);
    studioColourThemeFrame = requestAnimationFrame(() => {
      studioColourThemeFrame = requestAnimationFrame(() =>
        root.classList.remove("studio-theme-changing"),
      );
    });
    for (const [role, value] of Object.entries(
      MKWUIColor.palette(colour, theme),
    ))
      root.style.setProperty("--md-sys-color-" + role, value);
    root.style.colorScheme = theme;
    studioColourThemeKey = key;
    document.dispatchEvent(new Event("mkw-ui-theme-change"));
  }
  const input = document.querySelector("#primaryColour"),
    output = document.querySelector("#primaryColourValue");
  if (input) input.value = colour;
  if (output) output.textContent = colour.toUpperCase();
  const reset = document.querySelector("#resetPrimaryColour");
  if (reset) reset.disabled = colour.toLowerCase() === MKWUIColor.defaultColour;
}
function studioSetPrimaryColour(colour) {
  if (!MKWUIColor.valid(colour)) return;
  studioPreferences.primaryColour = colour.toLowerCase();
  studioApplyColourTheme();
  studioPersistPreferences();
}
function studioPrimaryColourSettings(section) {
  section.insertAdjacentHTML(
    "beforeend",
    `<div class="settings-primary-colour"><label for="primaryColour">Hauptfarbe</label><div class="settings-colour-control"><input id="primaryColour" type="color" aria-label="Hauptfarbe des Studios"><output id="primaryColourValue" for="primaryColour"></output><button id="resetPrimaryColour" type="button">Zurücksetzen</button></div><p>Nur für die Oberfläche. Deine Designs bleiben unverändert.</p><div class="settings-colour-preview" aria-label="Vorschau der Oberflächenfarbe"><span class="settings-preview-selection">Ausgewählt</span><span class="settings-preview-action">Aktion</span></div></div>`,
  );
  section.querySelector("#primaryColour").oninput = (event) =>
    studioSetPrimaryColour(event.target.value);
  section.querySelector("#resetPrimaryColour").onclick = () =>
    studioSetPrimaryColour(MKWUIColor.defaultColour);
  studioApplyColourTheme();
}
