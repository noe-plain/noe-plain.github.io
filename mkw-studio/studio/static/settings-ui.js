"use strict";
function studioSettingsUI() {
  const dialog = $("#settingsDialog"),
    tabs = document.createElement("div"),
    panels = {},
    entries = new Map(),
    definitions = [
      [
        "general",
        "Darstellung",
        "light",
        "Farben, Hell- und Dunkelmodus und dein Startbild.",
      ],
      [
        "workflow",
        "Bedienung",
        "settings",
        "Wähle die passenden Werkzeuge und die Grösse der Bedienelemente.",
      ],
      [
        "guides",
        "Raster & Hilfslinien",
        "guides",
        "Präzise ausrichten. Diese Hilfen erscheinen nicht im Export.",
      ],
      [
        "fonts",
        "Schriften",
        "text",
        "Startwerte für neue Texte und deine eigene Schriftbibliothek.",
      ],
      [
        "sponsors",
        "Sponsoren",
        "sponsors",
        "Logos in Gruppen organisieren und für FD-Kampagnen bereitstellen.",
      ],
      [
        "templates",
        "Vorlagen",
        "builder",
        "Gestaltungen ohne Fotos speichern und wiederverwenden.",
      ],
      [
        "export",
        "Speichern & Export",
        "save",
        "Dateien sichern, Exportvorgaben wählen und Einstellungen weitergeben.",
      ],
    ];
  tabs.className = "settings-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Einstellungsbereich");
  tabs.setAttribute("aria-orientation", "vertical");
  for (const [id, label, icon] of definitions) {
    const button = document.createElement("button");
    button.id = "settings-tab-" + id;
    button.dataset.settingsTab = id;
    button.type = "button";
    button.innerHTML = studioIcon(icon) + `<span>${label}</span>`;
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
    appearance = document.createElement("section"),
    colours = document.createElement("section"),
    density = document.createElement("section");
  appearance.className = "settings-appearance";
  appearance.innerHTML =
    "<h3>Hell oder dunkel</h3><p>Wähle, wie dein Studio aussehen soll.</p>";
  theme.previousElementSibling.remove();
  theme.nextElementSibling.remove();
  appearance.append(theme);
  colours.className = "settings-colours";
  colours.innerHTML = "<h3>Farben der Oberfläche</h3>";
  studioPrimaryColourSettings(colours);
  density.className = "settings-controls";
  density.innerHTML = "<h3>Grösse der Bedienelemente</h3>";
  studioDensitySettings(density);
  density.querySelector("legend").classList.add("sr-only");
  panels.general.append(appearance, colours);
  const advanced = dialog.querySelector(".settings-advanced");
  advanced.querySelector("h3").textContent = "Werkzeuge im Designer";
  advanced.querySelector("strong").textContent = "Advanced-Modus";
  advanced.querySelector("small").textContent =
    "Pfade, Kurven, Formen und Formkonstrukteur im Designer sowie genaue Textformatierung in beiden Editoren. Die Designer-Werkzeugleiste steht dann links.";
  panels.workflow.append(advanced, density);
  const preferences = dialog.querySelector(".settings-preferences"),
    exportLabel = preferences.querySelector(".settings-export-format"),
    exportHeading = exportLabel.previousElementSibling,
    exportHint = exportLabel.nextElementSibling,
    imageExport = document.createElement("section");
  imageExport.className = "settings-image-export";
  exportHeading.textContent = "Bildexport";
  imageExport.append(exportHeading, exportLabel, exportHint);
  panels.export.append(imageExport);
  const snapHint = preferences.querySelector("small");
  snapHint.textContent =
    "Abstand auf deinem Bildschirm, unabhängig vom Zoom. Gilt für Rahmen, Objekte und Winkelspitzen im Designer.";
  const snap = preferences.querySelector("#snapDistance");
  snapHint.id = "settingsSnapHint";
  snap.setAttribute("aria-describedby", snapHint.id);
  panels.guides.append(preferences);
  MKWDesignerGrid.settingsPanel(panels.guides);
  panels.fonts.append(dialog.querySelector(".settings-fonts"));
  const leading = document.createElement("section");
  leading.className = "settings-leading";
  leading.innerHTML =
    '<h3>Zeilenabstand im Designer</h3><p id="settingsLeadingHint">95 % entspricht dem üblichen Zeilenabstand. Gilt für neue Textfelder.</p><label>Standard-Zeilenhöhe<span class="settings-leading-value"><input id="defaultLineHeight" type="number" min="20" max="300" step="any" aria-label="Standard-Zeilenhöhe in Prozent" aria-describedby="settingsLeadingHint"><span>%</span></span></label>';
  const textSizes = document.createElement("section");
  textSizes.className = "settings-text-sizes";
  textSizes.innerHTML = `<h3>Schriftgrössen für FD-Kampagnen</h3><p>Startwerte für neue Texte. Bereits gestaltete Texte bleiben erhalten.</p><div class="settings-size-grid">${[
    ["date", "Übertitel"],
    ["title", "Konzerttitel"],
    ["subtitle", "Untertitel"],
    ["copyright", "Copyright"],
  ]
    .map(
      ([key, label]) =>
        `<label>${label}<span class="settings-size-value"><input type="number" data-default-text-size="${key}" aria-label="Standard-Schriftgrösse ${label}" min="1" max="5000" step="any" value="${studioPreferences.textSizes[key]}"><span>px</span></span></label>`,
    )
    .join("")}</div>`;
  panels.fonts.prepend(textSizes, leading);
  for (const input of textSizes.querySelectorAll("input"))
    input.onchange = () => {
      if (!MKWFields.validate(input, true)) return;
      studioPreferences.textSizes = {
        ...studioPreferences.textSizes,
        [input.dataset.defaultTextSize]: Number(input.value),
      };
      studioApplyPreferences();
    };
  const pdf = document.createElement("section");
  pdf.className = "settings-pdf";
  pdf.innerHTML = `<h3>PDF aus dem Designer</h3><label class="settings-export-format">Standard-Preset<select id="defaultPDFPreset">${Object.entries(
    carouselPDFPresets,
  )
    .map(([key, v]) => `<option value="${key}">${v.name}</option>`)
    .join(
      "",
    )}</select></label><p>Diese Vorgabe kannst du vor jedem Export ändern.</p>`;
  panels.export.append(pdf);
  const saving = document.createElement("section");
  saving.className = "settings-saving";
  saving.innerHTML =
    '<h3>Automatisch sichern</h3><label class="check"><span>Verknüpfte MKW-Datei aktualisieren</span><input id="autoSaveFile" type="checkbox" role="switch" aria-describedby="settingsSavingHint"></label><p id="settingsSavingHint">Der Browser sichert deine Arbeit automatisch. Mit direktem Dateizugriff wird auch die verknüpfte MKW-Datei aktualisiert. Firefox benötigt einen manuellen Download.</p>';
  panels.export.prepend(saving);
  saving.querySelector("input").checked = studioPreferences.autoSaveFile;
  saving.querySelector("input").onchange = (event) => {
    studioPreferences.autoSaveFile = event.target.checked;
    studioApplyPreferences();
  };
  const layout = document.createElement("div"),
    content = document.createElement("div"),
    pageHeading = document.createElement("div"),
    results = document.createElement("section"),
    search = document.createElement("div"),
    footer = document.createElement("div");
  layout.className = "settings-layout";
  content.className = "settings-content";
  pageHeading.className = "settings-page-heading";
  pageHeading.innerHTML =
    '<h3 id="settingsContentTitle"></h3><p id="settingsContentDescription"></p>';
  search.className = "settings-search";
  search.innerHTML = `<label for="settingsSearch" class="sr-only">Einstellungen durchsuchen</label><input id="settingsSearch" type="search" placeholder="Einstellung suchen …" autocomplete="off" spellcheck="false" aria-controls="settingsSearchResults"><button id="settingsSearchClear" type="button" class="icon-button" aria-label="Suche leeren" hidden>${studioIcon("close")}</button>`;
  const heading = dialog.querySelector(".dialog-heading");
  heading
    .querySelector("h2")
    .insertAdjacentHTML("afterend", "<p>Dein Studio, so wie du arbeitest.</p>");
  heading.querySelector("#closeSettings").before(search);
  results.id = "settingsSearchResults";
  results.className = "settings-search-results";
  results.hidden = true;
  results.innerHTML =
    '<h3>Suchergebnisse</h3><p id="settingsSearchStatus" role="status" aria-live="polite"></p><div class="settings-result-list"></div>';
  footer.className = "settings-footer";
  footer.innerHTML = `<p id="settingsPreferenceStatus" role="status">Änderungen werden direkt übernommen.</p><button id="settingsDone" type="button" class="primary">Fertig</button>`;
  footer.querySelector("button").onclick = () => dialog.close();
  content.append(pageHeading, ...Object.values(panels), results);
  layout.append(tabs, content);
  heading.after(layout, footer);
  const input = search.querySelector("input"),
    clear = search.querySelector("button"),
    buttons = [...tabs.querySelectorAll("button")],
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = "general",
    motion;
  const mobile = matchMedia("(max-width:700px)");
  function orientation() {
    tabs.setAttribute(
      "aria-orientation",
      mobile.matches ? "horizontal" : "vertical",
    );
  }
  orientation();
  mobile.addEventListener("change", orientation);
  function select(id, { focus = false, animate = true } = {}) {
    if (!panels[id]) return;
    active = id;
    input.value = "";
    clear.hidden = true;
    results.hidden = true;
    pageHeading.hidden = false;
    const definition = definitions.find(([key]) => key === id);
    pageHeading.querySelector("h3").textContent = definition[1];
    pageHeading.querySelector("p").textContent = definition[3];
    for (const button of buttons) {
      const selected = button.dataset.settingsTab === id;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [key, panel] of Object.entries(panels))
      panel.hidden = key !== id;
    content.scrollTop = 0;
    motion?.cancel();
    if (animate && !reduced.matches)
      motion = panels[id].animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration:
            parseFloat(
              getComputedStyle(dialog).getPropertyValue(
                "--studio-motion-effects",
              ),
            ) || 200,
          easing:
            getComputedStyle(dialog)
              .getPropertyValue("--studio-ease-effects")
              .trim() || "ease-out",
        },
      );
    if (id === "sponsors") sponsorRenderSettings();
    if (focus) {
      const button = buttons.find((b) => b.dataset.settingsTab === id);
      button.focus({ preventScroll: true });
      if (mobile.matches)
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
  const normalize = (text) =>
    text
      .toLocaleLowerCase("de-CH")
      .replaceAll("ä", "a")
      .replaceAll("ö", "o")
      .replaceAll("ü", "u")
      .replaceAll("ß", "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  function register(key, panel, selector, title, description, keywords = "") {
    entries.set(key, { panel, selector, title, description, keywords });
  }
  function findResults() {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return select(active, { animate: false });
    clear.hidden = false;
    pageHeading.hidden = true;
    for (const panel of Object.values(panels)) panel.hidden = true;
    for (const button of buttons) button.setAttribute("aria-selected", "false");
    results.hidden = false;
    const matches = [...entries.values()].filter((entry) =>
      words.every((word) =>
        normalize(
          [
            entry.title,
            entry.description,
            entry.keywords,
            definitions.find(([id]) => id === entry.panel)[1],
          ].join(" "),
        ).includes(word),
      ),
    );
    results.querySelector("#settingsSearchStatus").textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? "Einstellung gefunden" : "Einstellungen gefunden"}. Wähle einen Treffer, um ihn zu öffnen.`
      : "Keine Einstellung gefunden. Versuche zum Beispiel „Farbe“, „Schrift“ oder „Speichern“.";
    const list = results.querySelector(".settings-result-list");
    list.replaceChildren();
    for (const entry of matches) {
      const button = document.createElement("button"),
        category = definitions.find(([id]) => id === entry.panel);
      button.type = "button";
      button.className = "settings-result";
      button.innerHTML = `${studioIcon(category[2])}<span><small>${esc(category[1])}</small><strong>${esc(entry.title)}</strong><span>${esc(entry.description)}</span></span>${studioIcon("angle")}`;
      button.onclick = () => {
        select(entry.panel);
        const target = dialog.querySelector(entry.selector),
          title = target?.querySelector("h3") || target;
        if (title) {
          title.tabIndex = -1;
          title.focus({ preventScroll: true });
          content.scrollTop +=
            target.getBoundingClientRect().top -
            content.getBoundingClientRect().top -
            24;
        }
      };
      list.append(button);
    }
    content.scrollTop = 0;
  }
  input.oninput = findResults;
  input.onkeydown = (event) => {
    if (event.key === "Enter" && !results.hidden) {
      event.preventDefault();
      results.querySelector("button")?.click();
    }
  };
  clear.onclick = () => {
    select(active, { animate: false });
    input.focus();
  };
  dialog.addEventListener("cancel", (event) => {
    if (input.value && !dialog.hasAttribute("aria-busy")) {
      event.preventDefault();
      clear.click();
    }
  });
  for (const button of buttons) {
    button.onclick = () => select(button.dataset.settingsTab);
    button.onkeydown = (event) => {
      const index = buttons.indexOf(button),
        next = ["ArrowDown", "ArrowRight"].includes(event.key)
          ? (index + 1) % buttons.length
          : ["ArrowUp", "ArrowLeft"].includes(event.key)
            ? (index + buttons.length - 1) % buttons.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : null;
      if (next !== null) {
        event.preventDefault();
        select(buttons[next].dataset.settingsTab, { focus: true });
      }
    };
  }
  document.addEventListener("mkw-preferences-storage", (event) => {
    const status = footer.querySelector("p");
    status.textContent = event.detail
      ? "Änderungen werden direkt übernommen."
      : "Nicht im Browser gespeichert. Exportiere ein MKW-Setup, um deine Einstellungen zu sichern.";
    status.classList.toggle("is-error", !event.detail);
    status.setAttribute("role", event.detail ? "status" : "alert");
  });
  register(
    "theme",
    "general",
    ".settings-appearance",
    "Hell oder dunkel",
    "Darstellung des Studios wählen.",
    "light dark theme modus",
  );
  register(
    "colours",
    "general",
    ".settings-colours",
    "Hauptfarbe & Farbkonzept",
    "Normal, Komplementär, Harmonisch oder Lebendig.",
    "farben palette bunt farbwahl",
  );
  register(
    "advanced",
    "workflow",
    ".settings-advanced",
    "Advanced-Modus",
    "Pfade, Kurven und Formen im Designer freischalten.",
    "werkzeuge toolbar links formkonstrukteur",
  );
  register(
    "density",
    "workflow",
    ".settings-controls",
    "Grösse der Bedienelemente",
    "Komfortabel oder kompakt arbeiten.",
    "dichte platz grosse groesse",
  );
  register(
    "guides",
    "guides",
    ".settings-preferences",
    "Hilfslinien & Einrasten",
    "Farben und Einrastabstand einstellen.",
    "magnet snap schutzzone safezone",
  );
  register(
    "grid",
    "guides",
    ".settings-designer-grid",
    "Designer-Raster",
    "Spalten, Reihen und Stege einstellen.",
    "grid gap abstand",
  );
  register(
    "sizes",
    "fonts",
    ".settings-text-sizes",
    "Schriftgrössen",
    "Startwerte für Übertitel, Konzerttitel, Untertitel und Copyright.",
    "text typografie grosse groesse pixel",
  );
  register(
    "leading",
    "fonts",
    ".settings-leading",
    "Zeilenabstand",
    "Standard-Zeilenhöhe für neue Designer-Texte.",
    "line height prozent",
  );
  register(
    "fonts",
    "fonts",
    ".settings-fonts",
    "Eigene Schriften",
    "Schriften hinzufügen und entfernen.",
    "font import otf ttf woff markenschrift",
  );
  register(
    "sponsors",
    "sponsors",
    "#settings-panel-sponsors",
    "Sponsorgruppen & Logos",
    "Gruppen, Logoreihenfolge und Standard-Balkenfarbe verwalten.",
    "sponsoren import loschen entfernen",
  );
  register(
    "templates",
    "templates",
    "#settings-panel-templates",
    "Designvorlagen",
    "Vorlagen ansehen, speichern, importieren und entfernen.",
    "bibliothek mkw fotos",
  );
  register(
    "saving",
    "export",
    ".settings-saving",
    "Automatisch sichern",
    "Die verknüpfte MKW-Datei aktualisieren.",
    "speichern autosave backup browser firefox chrome",
  );
  register(
    "image-export",
    "export",
    ".settings-image-export",
    "Standard-Exportformat",
    "JPG, PNG oder WebP als Vorgabe wählen.",
    "bilder format qualität",
  );
  register(
    "pdf",
    "export",
    ".settings-pdf",
    "PDF-Preset",
    "Die PDF-Vorgabe für den Designer festlegen.",
    "linkedin export",
  );
  select("general", { animate: false });
  $("#defaultLineHeight").value = studioPreferences.lineHeight;
  $("#defaultLineHeight").onchange = (event) => {
    if (!MKWFields.validate(event.target, true)) return;
    studioPreferences.lineHeight = Number(event.target.value);
    studioApplyPreferences();
  };
  $("#defaultPDFPreset").value = studioPreferences.pdfPreset;
  $("#defaultPDFPreset").onchange = (event) => {
    studioPreferences.pdfPreset = event.target.value;
    studioApplyPreferences();
  };
  studioApplyColourTheme();
  return { register, select };
}
const MKWSettings = studioSettingsUI();
