"use strict";
const MKWTemplateSave = (() => {
  let dialog,
    source = null,
    own = false,
    running = false;
  function mount() {
    if (dialog) return;
    dialog = document.createElement("dialog");
    dialog.id = "templateSaveDialog";
    dialog.setAttribute("aria-labelledby", "templateSaveTitle");
    dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="templateSaveTitle">Als Vorlage speichern</h2><p>Design und Ebenennamen bleiben erhalten. Fotos werden zu leeren Bildfeldern.</p></div><button class="icon-button" id="closeTemplateSave" aria-label="Vorlage speichern schliessen">${studioIcon("close")}</button></div><form id="templateSaveForm"><label>Name der Vorlage<input id="templateSaveName" maxlength="100" required></label><label>Kurzbeschreibung<input id="templateSaveDescription" maxlength="300" placeholder="Wofür eignet sich dieses Design?"></label><div id="templateFolderNames"></div><h3>Ebenen benennen</h3><p class="template-save-hint">Eindeutige Namen helfen später beim Befüllen. Die Reihenfolge und das Design bleiben erhalten.</p><div id="templateLayerNames"></div><div class="template-footer"><p id="templateSaveStatus" role="status" aria-live="polite"></p><button id="templateSaveConfirm" class="primary" type="submit">Vorlage speichern</button></div></form>`;
    document.body.append(dialog);
    $("#closeTemplateSave").onclick = () => {
      if (!running) dialog.close();
    };
    dialog.addEventListener("cancel", (e) => {
      if (running) e.preventDefault();
    });
    dialog.addEventListener("close", () => {
      source = null;
      $("#templateLayerNames").replaceChildren();
    });
    $("#templateSaveForm").onsubmit = async (e) => {
      e.preventDefault();
      if (running || !source) return;
      running = true;
      const controls = [...dialog.querySelectorAll("input,button,select")];
      controls.forEach((el) => (el.disabled = true));
      const status = $("#templateSaveStatus");
      MKWFields.notice(status, "Vorlage wird geprüft und gespeichert …");
      const finishLoading = MKWUIControls.loading(status);
      try {
        const layers = [...dialog.querySelectorAll("[data-template-name]")].map(
          (input) => ({
            id: input.dataset.templateName,
            name: input.value.trim(),
            sourceId:
              dialog.querySelector(
                `[data-template-source="${CSS.escape(input.dataset.templateName)}"]`,
              )?.value || null,
          }),
        );
        const folders = [
          ...dialog.querySelectorAll("[data-template-folder-name]"),
        ].map((input) => ({
          id: input.dataset.templateFolderName,
          name: input.value.trim(),
        }));
        await MKWTemplates.save(
          source,
          {
            name: $("#templateSaveName").value.trim(),
            description: $("#templateSaveDescription").value.trim(),
            layers,
            folders,
          },
          own,
        );
        dialog.close();
        MKWProjects.notice(
          "Vorlage gespeichert. Unter Vorlagen verfügbar; für die Weitergabe MKW-Setup exportieren.",
        );
      } catch (error) {
        status.textContent = "Vorlage nicht gespeichert: " + error.message;
        status.classList.add("is-error");
        status.setAttribute("role", "alert");
      } finally {
        finishLoading();
        running = false;
        controls.forEach((el) => (el.disabled = false));
      }
    };
  }
  function open(project = p) {
    if (!project.carousel) {
      MKWProjects.notice("Vorlagen werden im Designer erstellt.");
      return;
    }
    carouselEndText();
    mount();
    source = project;
    own = project === p;
    $("#templateSaveName").value = project.meta.title || "Neue Vorlage";
    $("#templateSaveDescription").value = "";
    MKWFields.notice($("#templateSaveStatus"), "");
    const layers = MKWTemplateModel.suggest(project),
      images = project.carousel.objects.filter(MKWTemplateModel.imageLayer);
    $("#templateFolderNames").innerHTML = (project.carousel.folders || [])
      .length
      ? `<h3>Ordner</h3><div class="template-folder-names">${project.carousel.folders.map((f) => `<label>Ordnername<input data-template-folder-name="${esc(f.id)}" value="${esc(f.name)}" maxlength="160" required></label>`).join("")}</div>`
      : "";
    $("#templateLayerNames").innerHTML = layers
      .map((l) => {
        const o = project.carousel.objects.find((o) => o.id === l.id),
          folder = project.carousel.folders?.find((f) => f.id === o.folderId);
        return `<div class="template-name-row">${studioIcon(o.type)}<label><span>${esc(folder?.name || "Ohne Ordner")}</span><input data-template-name="${esc(l.id)}" aria-label="Ebenenname: ${esc(o.name)}" value="${esc(l.name)}" maxlength="160" required></label>${o.type === "angle" ? `<label>Bild aus<select data-template-source="${esc(l.id)}" aria-label="Hintergrund für ${esc(l.name)}" required>${images.map((im) => `<option value="${esc(im.id)}" ${im.id === l.sourceId ? "selected" : ""}>${esc(layers.find((l) => l.id === im.id)?.name)}</option>`).join("")}</select></label>` : ""}</div>`;
      })
      .join("");
    dialog.showModal();
  }
  return { open };
})();
