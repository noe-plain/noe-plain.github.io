"use strict";
(() => {
  const start = document.createElement("button");
  start.id = "startTemplates";
  start.textContent = "Mit Vorlage starten";
  start.disabled = true;
  $("#startNew").after(start);
  start.onclick = () => MKWTemplateGallery.open();
  const setup = document.createElement("section");
  setup.className = "designer-template-entry";
  setup.setAttribute("aria-label", "Designer-Vorlagen");
  setup.innerHTML = `<div class="designer-template-description">${studioIcon("layers")}<div><h3>Mit einer Vorlage beginnen</h3><p>Design auswählen, Inhalte einsetzen und weitergestalten.</p></div></div><button type="button" id="designerTemplateStart">${studioIcon("folder")}<span>Vorlagen ansehen</span></button>`;
  $("#carouselSetup").prepend(setup);
  $("#designerTemplateStart").onclick = () => MKWTemplateGallery.open();
  const save = document.createElement("button");
  save.id = "saveTemplate";
  save.className = "save-choice";
  save.hidden = true;
  save.innerHTML = `${studioIcon("layers")}<div><strong>Design als Vorlage</strong><small>Bildfreie Vorlage für weitere Projekte</small></div>`;
  $("#saveProject").after(save);
  save.onclick = () => MKWTemplateSave.open();
  const original = $("#save").onclick;
  $("#save").onclick = () => {
    original();
    save.hidden = !p.carousel;
  };
  const panel = $("#settings-panel-templates");
  panel.innerHTML = `<section class="template-settings"><div class="settings-section-heading"><div><h3>Designvorlagen</h3><p>Ohne Fotos gespeichert. Eigene Vorlagen werden mit dem MKW-Setup weitergegeben.</p></div></div><div class="template-settings-actions"><button id="settingsTemplateBrowse">${studioIcon("layers")}Vorlagen ansehen</button><button id="settingsTemplateSave">${studioIcon("save")}Aktuelles Design speichern</button><button id="settingsTemplateImport">${studioIcon("folder")}Aus MKW-Datei erstellen</button></div><input id="templateImportFile" type="file" accept=".mkw,.json" hidden><p id="templateLibraryStatus" role="status"></p><div id="templateLibraryList"></div></section>`;
  $("#settingsTemplateBrowse").onclick = () => MKWTemplateGallery.open();
  $("#settingsTemplateSave").onclick = () => MKWTemplateSave.open();
  $("#settingsTemplateImport").onclick = () => $("#templateImportFile").click();
  $("#templateImportFile").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const button = $("#settingsTemplateImport"),
      status = $("#templateLibraryStatus");
    button.disabled = true;
    status.textContent = "MKW-Datei wird geprüft …";
    try {
      const q = await MKWTemplates.importProject(file);
      MKWTemplateSave.open(q);
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
      status.setAttribute("role", "alert");
    } finally {
      button.disabled = false;
    }
  };
  let generation = 0;
  async function refresh() {
    const current = ++generation;
    $("#settingsTemplateSave").disabled = !p.carousel;
    try {
      const items = await MKWTemplates.list();
      if (current !== generation) return;
      $("#templateLibraryList").innerHTML = items
        .map(
          (t) =>
            `<div class="template-library-row"><div><strong>${esc(t.name)}</strong><small>${t.n} ${t.n === 1 ? "Slide" : "Slides"} · ${t.w} × ${t.h} px${t.builtIn ? " · Mitgeliefert" : ""}</small></div>${t.builtIn ? "" : `<button data-remove-template="${esc(t.id)}" class="icon-button" aria-label="Vorlage entfernen: ${esc(t.name)}">${studioIcon("trash")}</button>`}</div>`,
        )
        .join("");
      panel.querySelectorAll("[data-remove-template]").forEach((button) => {
        button.onclick = async () => {
          if (
            !confirm(
              "Diese Vorlage aus der Bibliothek entfernen? Bestehende Projekte bleiben erhalten.",
            )
          )
            return;
          button.disabled = true;
          try {
            await MKWTemplates.remove(button.dataset.removeTemplate);
            await refresh();
          } catch (error) {
            $("#templateLibraryStatus").textContent = error.message;
            button.disabled = false;
          }
        };
      });
    } catch (error) {
      $("#templateLibraryStatus").textContent = error.message;
    }
  }
  document.addEventListener("mkw-templates-changed", () => {
    if (!panel.hidden) refresh();
  });
  const observer = new MutationObserver(() => {
    if (!panel.hidden) refresh();
  });
  observer.observe($("#settingsDialog"), {
    attributes: true,
    attributeFilter: ["open"],
  });
  observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
})();
