"use strict";
let studioColourThemeKey = "";
let studioColourThemeFrame = 0;
function studioApplyColourTheme() {
  const root = document.documentElement,
    theme = root.dataset.theme === "dark" ? "dark" : "light",
    colour = studioPreferences.primaryColour,
    mode = studioPreferences.colourMode,
    key = colour + theme + mode;
  if (key !== studioColourThemeKey) {
    root.classList.add("studio-theme-changing");
    cancelAnimationFrame(studioColourThemeFrame);
    studioColourThemeFrame = requestAnimationFrame(() => {
      studioColourThemeFrame = requestAnimationFrame(() =>
        root.classList.remove("studio-theme-changing"),
      );
    });
    for (const [role, value] of Object.entries(
      MKWUIColor.palette(colour, theme, mode),
    ))
      root.style.setProperty("--md-sys-color-" + role, value);
    root.style.colorScheme = theme;
    studioColourThemeKey = key;
    document.dispatchEvent(new Event("mkw-ui-theme-change"));
  }
  document
    .querySelectorAll("[data-colour-mode]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.colourMode === mode),
      ),
    );
  document.documentElement.dataset.palette = mode;
  document.querySelectorAll("[data-tertiary-preview]").forEach((el) => {
    el.hidden = mode !== "triadic";
  });
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
    `<div class="settings-primary-colour"><label for="primaryColour">Hauptfarbe</label><div class="settings-colour-control"><input id="primaryColour" type="color" aria-label="Hauptfarbe des Studios"><output id="primaryColourValue" for="primaryColour"></output><button id="resetPrimaryColour" type="button">Zurücksetzen</button></div><p>Nur für die Oberfläche. Deine Designs bleiben unverändert.</p><span id="settingsColourModeLabel">Farbkonzept</span><div class="settings-colour-mode" role="group" aria-labelledby="settingsColourModeLabel"><button type="button" data-colour-mode="normal" aria-pressed="true">Normal</button><button type="button" data-colour-mode="complementary" aria-pressed="false">Komplementär</button><button type="button" data-colour-mode="analogous" aria-pressed="false">Harmonisch</button><button type="button" data-colour-mode="triadic" aria-pressed="false">Lebendig</button></div><p>Komplementär nutzt eine Gegenfarbe. Harmonisch kombiniert benachbarte Töne. Lebendig ergänzt die Hauptfarbe zu einem farbigen Dreiklang.</p><div class="settings-colour-preview" aria-label="Vorschau der Oberflächenfarbe"><span class="settings-preview-selection">Ausgewählt</span><span class="settings-preview-action">Aktion</span><span class="settings-preview-secondary">Ergänzend</span><span class="settings-preview-tertiary" data-tertiary-preview hidden>Dritte Farbe</span></div></div>`,
  );
  section.querySelectorAll("[data-colour-mode]").forEach((button) => {
    button.onclick = () => {
      studioPreferences.colourMode = button.dataset.colourMode;
      studioApplyColourTheme();
      studioPersistPreferences();
    };
  });
  section.querySelector("#primaryColour").oninput = (event) =>
    studioSetPrimaryColour(event.target.value);
  section.querySelector("#resetPrimaryColour").onclick = () =>
    studioSetPrimaryColour(MKWUIColor.defaultColour);
  studioApplyColourTheme();
}
