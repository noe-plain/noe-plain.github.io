"use strict";
const MKWTemplateGallery = (() => {
  let dialog,
    observer,
    generation = 0,
    selectedTemplate = null,
    values = Object.create(null),
    pending = 0,
    creating = false;
  const drafts = new Map();
  let livePreview;
  const kindNames = {
    text: "Text",
    image: "Bild",
    angle: "Winkel",
    gradient: "Verlauf",
    path: "Pfad",
    shape: "Form",
    logo: "Logo",
  };
  function message(text, error = false) {
    const el = $("#templateStatus");
    el.textContent = text;
    el.classList.toggle("is-error", error);
    el.setAttribute("role", error ? "alert" : "status");
  }
  function updateReady() {
    $("#templateCreate").disabled = !!pending || !selectedTemplate;
  }
  async function upload(input, id, channel) {
    const file = input.files[0];
    if (!file) return;
    const current = generation,
      template = selectedTemplate;
    pending++;
    updateReady();
    input.disabled = true;
    const finishLoading = MKWUIControls.loading(
      input.closest(".template-file-field"),
    );
    message(
      "„" + file.name + "“ wird geladen und für den Designer vorbereitet …",
    );
    try {
      if (file.size > 100 * 1024 * 1024)
        throw Error("Maximal 100 MB pro Bild.");
      const normalized = await (await api("/api/import", file)).json();
      if (
        current !== generation ||
        template !== selectedTemplate ||
        !dialog.open
      )
        return;
      const asset = {
        ...normalized,
        id: uid(),
        name: file.name,
        original: normalized.data,
      };
      values[id] ??= {};
      values[id][channel] = asset;
      livePreview.changed();
      input
        .closest(".template-file-field")
        .querySelector("[data-file-name]").textContent = file.name;
      input.closest(".template-layer").classList.remove("needs-content");
      message(
        "Bild eingefügt. Die Winkel übernehmen ihren zugeordneten Hintergrund automatisch.",
      );
    } catch (error) {
      if (current === generation) message(error.message, true);
    } finally {
      finishLoading();
      if (current === generation) {
        pending--;
        updateReady();
        input.disabled = false;
      }
    }
  }
  function fileField(o, channel, label) {
    return `<label class="template-file-field"><span>${label}</span><span class="template-file-button">${studioIcon("image")}<span data-file-name>${esc(values[o.id]?.[channel]?.name || "Bild auswählen")}</span><input type="file" accept="image/*" data-template-upload="${esc(o.id)}" data-channel="${channel}" aria-label="${esc(label + ": " + o.name)}"></span></label>`;
  }
  function layerField(o, t) {
    const slot = t.slots.find((s) => s.objectId === o.id),
      folder = t.carousel.folders?.find((f) => f.id === o.folderId),
      visible = MKWTemplateModel.visible(o, t.carousel);
    let body = "";
    if (o.type === "text")
      body = `<label>Text<textarea data-template-text="${esc(o.id)}" aria-label="Text: ${esc(o.name)}" rows="3">${esc(values[o.id]?.text ?? o.text)}</textarea></label>`;
    else if (o.type === "angle")
      body = `<p class="template-linked">${studioIcon("image")}Bild aus <strong>${esc(t.carousel.objects.find((s) => s.id === slot.sourceId)?.name)}</strong></p>`;
    else if (o.type === "logo")
      body = `<label>Logo<select data-template-logo="${esc(o.id)}" aria-label="Logo: ${esc(o.name)}"><option value="white" ${o.source === "white" ? "selected" : ""}>MKW · Weiss</option><option value="black" ${o.source === "black" ? "selected" : ""}>MKW · Schwarz</option></select></label>${fileField(o, "logo", "Eigenes Logo (wahlweise)")}`;
    else {
      if (MKWTemplateModel.imageLayer(o)) body += fileField(o, "image", "Bild");
      if (o.strokeMode === "image")
        body += fileField(o, "stroke", "Bild für die Kontur");
      if (!body)
        body =
          '<p class="template-design-kept">Form, Farben und Effekte aus der Vorlage bleiben erhalten. Im Designer anpassbar.</p>';
    }
    return `<section class="template-layer" data-template-layer="${esc(o.id)}"><div class="template-layer-heading">${studioIcon(o.type === "logo" ? "logo" : o.type)}<div><h4>${esc(o.name)}</h4><small>${esc([folder?.name, kindNames[o.type], visible ? null : "Ausgeblendet"].filter(Boolean).join(" · "))}</small></div></div>${body}</section>`;
  }
  async function select(id) {
    const finishLoading = MKWUIControls.loading("#templateStatus");
    try {
      if (selectedTemplate) drafts.set(selectedTemplate.id, values);
      const current = ++generation;
      pending = 0;
      selectedTemplate = null;
      updateReady();
      message("Vorlage wird geladen …");
      try {
        const t = await MKWTemplates.get(id);
        if (current !== generation || !dialog.open) return;
        selectedTemplate = t;
        values = drafts.get(id) || Object.create(null);
        dialog
          .querySelectorAll("[data-template-id]")
          .forEach((b) =>
            b.setAttribute("aria-pressed", String(b.dataset.templateId === id)),
          );
        $("#templateFill").hidden = false;
        $("#templateFillTitle").textContent = t.name;
        $("#templateFillDescription").textContent = t.description;
        $("#templateLayers").innerHTML = t.carousel.objects
          .map((o) => layerField(o, t))
          .join("");
        for (const input of dialog.querySelectorAll("[data-template-upload]"))
          input.onchange = () =>
            upload(input, input.dataset.templateUpload, input.dataset.channel);
        for (const input of dialog.querySelectorAll("[data-template-text]"))
          input.oninput = () => {
            values[input.dataset.templateText] ??= {};
            values[input.dataset.templateText].text = input.value;
            livePreview.changed();
          };
        for (const input of dialog.querySelectorAll("[data-template-logo]")) {
          input.value =
            values[input.dataset.templateLogo]?.source || input.value;
          input.onchange = () => {
            const v = (values[input.dataset.templateLogo] ??= {});
            v.source = input.value;
            delete v.logo;
            livePreview.changed();
            input
              .closest(".template-layer")
              .querySelector("[data-file-name]").textContent = "Bild auswählen";
          };
        }
        livePreview.show(t, () => values);
        for (const field of dialog.querySelectorAll("[data-template-layer]"))
          field.addEventListener("focusin", () =>
            livePreview.reveal(
              t.carousel.objects.find(
                (o) => o.id === field.dataset.templateLayer,
              ),
            ),
          );
        message(
          `${t.carousel.n} Slides · ${t.carousel.objects.length} Ebenen · Bilder wählen und Texte prüfen.`,
        );
        updateReady();
        $("#templateFill").scrollIntoView({
          block: "nearest",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      } catch (error) {
        if (current === generation) message(error.message, true);
      }
    } finally {
      finishLoading();
    }
  }
  async function create() {
    if (pending || !selectedTemplate) return;
    const name = $("#templateProjectName");
    if (!name.value.trim()) {
      message("Gib deinem Projekt bitte einen Namen.", true);
      name.focus();
      return;
    }
    const missing = MKWTemplateModel.requirements(selectedTemplate).filter(
      (s) => {
        const o = selectedTemplate.carousel.objects.find(
            (o) => o.id === s.objectId,
          ),
          v = values[o.id] || {};
        return (
          (MKWTemplateModel.imageLayer(o) && !v.image) ||
          (o.strokeMode === "image" && !v.stroke)
        );
      },
    );
    dialog
      .querySelectorAll(".needs-content")
      .forEach((el) => el.classList.remove("needs-content"));
    if (missing.length) {
      for (const s of missing)
        dialog
          .querySelector(`[data-template-layer="${CSS.escape(s.objectId)}"]`)
          .classList.add("needs-content");
      message("Bitte noch Bilder für die markierten Ebenen auswählen.", true);
      dialog.querySelector(".needs-content input")?.focus();
      return;
    }
    creating = true;
    pending++;
    updateReady();
    const controls = [
      ...dialog.querySelectorAll("button,input,textarea,select"),
    ].map((el) => [el, el.disabled]);
    controls.forEach(([el]) => (el.disabled = true));
    dialog.setAttribute("aria-busy", "true");
    message("Dein Projekt wird erstellt …");
    const finishLoading = MKWUIControls.loading("#templateStatus");
    try {
      await MKWTemplates.create(selectedTemplate, {
        name: name.value.trim(),
        code: $("#templateProjectCode").value.trim(),
        values,
      });
    } catch (error) {
      message("Projekt nicht erstellt: " + error.message, true);
    } finally {
      finishLoading();
      pending = Math.max(0, pending - 1);
      creating = false;
      controls.forEach(([el, disabled]) => {
        if (el.isConnected) el.disabled = disabled;
      });
      dialog.removeAttribute("aria-busy");
      updateReady();
    }
  }
  function mount() {
    if (dialog) return;
    dialog = document.createElement("dialog");
    dialog.id = "templateGallery";
    dialog.setAttribute("aria-labelledby", "templateGalleryTitle");
    dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="templateGalleryTitle">Mit einer Vorlage starten</h2><p>Design wählen · Inhalte einsetzen · im Designer weiterarbeiten</p></div><button class="icon-button" id="closeTemplateGallery" aria-label="Vorlagen schliessen">${studioIcon("close")}</button></div><div class="template-gallery-heading"><h3>Deine Vorlagen</h3><div class="template-slider-controls"><button id="templatePrevious" aria-label="Vorherige Vorlagen">${studioIcon("back")}</button><button id="templateNext" aria-label="Weitere Vorlagen">${studioIcon("front")}</button></div></div><div id="templateCards" class="template-slider" aria-label="Vorlagen"></div><form id="templateFill" hidden><div class="template-fill-heading"><h3 id="templateFillTitle"></h3><p id="templateFillDescription"></p></div><div class="template-content-fields"><div class="setup-project-fields"><label>Projektname<input id="templateProjectName" maxlength="80" required placeholder="Zum Beispiel: Saisonauftakt"></label><label>Kürzel<input id="templateProjectCode" maxlength="24" placeholder="E2"></label></div><h3>Inhalte pro Ebene</h3><div id="templateLayers"></div></div><aside id="templateLivePreview"></aside></form><div class="template-footer"><p id="templateStatus" role="status" aria-live="polite"></p><button id="templateCreate" class="primary" disabled>Im Designer öffnen</button></div>`;
    document.body.append(dialog);
    livePreview = MKWTemplateFillPreview.attach($("#templateLivePreview"));
    $("#closeTemplateGallery").onclick = () => {
      if (!creating) dialog.close();
    };
    dialog.addEventListener("cancel", (event) => {
      if (creating) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
      generation++;
      livePreview.close();
      observer?.disconnect();
      drafts.clear();
      values = Object.create(null);
      selectedTemplate = null;
      pending = 0;
      $("#templateLayers").replaceChildren();
    });
    $("#templatePrevious").onclick = () =>
      $("#templateCards").scrollBy({
        left: -470,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    $("#templateNext").onclick = () =>
      $("#templateCards").scrollBy({
        left: 470,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    $("#templateFill").onsubmit = (e) => {
      e.preventDefault();
      create();
    };
    $("#templateCreate").onclick = create;
  }
  async function open() {
    mount();
    const finishLoading = MKWUIControls.loading("#templateStatus");
    try {
      observer?.disconnect();
      generation++;
      selectedTemplate = null;
      livePreview.close();
      values = Object.create(null);
      pending = 0;
      drafts.clear();
      updateReady();
      $("#templateFill").hidden = true;
      $("#templateProjectName").value = $("#setupName").value || "";
      $("#templateProjectCode").value = $("#setupCode").value || "";
      $("#templateCards").replaceChildren();
      message("Vorlagen werden geladen …");
      if (!dialog.open) dialog.showModal();
      const current = generation;
      try {
        const records = await MKWTemplates.list();
        if (current !== generation || !dialog.open) return;
        $("#templateCards").innerHTML = records
          .map(
            (t) =>
              `<button type="button" class="template-card" data-template-id="${esc(t.id)}" aria-pressed="false"><span class="template-card-preview"><img alt="Vorschau: ${esc(t.name)}" hidden><span data-preview-status>Vorschau wird geladen …</span><span class="template-slide-badge">${t.n} ${t.n === 1 ? "Slide" : "Slides"}</span></span><strong>${esc(t.name)}</strong><small>${t.w} × ${t.h} px${t.builtIn ? " · Mitgeliefert" : ""}</small></button>`,
          )
          .join("");
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                loadPreview(entry.target, current);
              }
          },
          { root: $("#templateCards"), rootMargin: "120px" },
        );
        for (const card of dialog.querySelectorAll("[data-template-id]")) {
          card.onclick = () => select(card.dataset.templateId);
          observer.observe(card);
        }
        const slider = $("#templateCards"),
          updateArrows = () => {
            $("#templatePrevious").disabled = slider.scrollLeft <= 1;
            $("#templateNext").disabled =
              slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 1;
          };
        slider.onscroll = updateArrows;
        updateArrows();
        message(
          "Wähle eine Vorlage. Darunter erscheinen die Felder für deine Inhalte.",
        );
      } catch (error) {
        message(error.message, true);
      }
    } finally {
      finishLoading();
    }
  }
  async function loadPreview(card, current) {
    const finishLoading = MKWUIControls.loading(
      card.querySelector("[data-preview-status]"),
    );
    try {
      const t = await MKWTemplates.get(card.dataset.templateId),
        src = await MKWTemplatePreview.render(t);
      if (current !== generation && !card.isConnected) return;
      const img = card.querySelector("img");
      img.src = src;
      img.hidden = false;
      card.querySelector("[data-preview-status]").hidden = true;
    } catch {
      card.querySelector("[data-preview-status]").textContent =
        "Vorschau nicht verfügbar · zum Öffnen anklicken";
    } finally {
      finishLoading();
    }
  }
  return { open };
})();
