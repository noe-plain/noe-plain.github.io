"use strict";
const MKWTemplateGallery = (() => {
  let dialog,
    observer,
    generation = 0,
    selectedTemplate = null,
    requiredImages = [],
    values = Object.create(null),
    pending = 0,
    creating = false,
    stage = "choose";
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
  function showStage(next, focus = false) {
    stage = next;
    $("#templateChoose").hidden = next !== "choose";
    $("#templateFill").hidden = next !== "fill";
    $("#templateCreate").hidden = next !== "fill";
    $("#templateGalleryTitle").textContent =
      next === "fill"
        ? "Vorlage mit Inhalten füllen"
        : "Mit einer Vorlage starten";
    updateReady();
    if (focus)
      (next === "fill"
        ? $("#templateProjectName")
        : $("#templateSearch")
      ).focus({ preventScroll: true });
  }
  function filterCards() {
    const search = $("#templateSearch").value.trim().toLocaleLowerCase("de"),
      origin = $("#templateOrigin").value;
    let count = 0;
    for (const card of dialog.querySelectorAll("[data-template-id]")) {
      card.hidden = !(
        card.dataset.search.includes(search) &&
        (origin === "all" || card.dataset.origin === origin)
      );
      if (!card.hidden) count++;
    }
    $("#templateEmpty").hidden = !!count;
    $("#templateResultCount").textContent =
      `${count} ${count === 1 ? "Vorlage" : "Vorlagen"}`;
    $("#templateCards").scrollLeft = 0;
    $("#templateCards").dispatchEvent(new Event("scroll"));
  }
  function filterLayers() {
    const value = $("#templateAreaFilter").value;
    for (const field of dialog.querySelectorAll("[data-template-layer]"))
      field.hidden =
        value !== "all" &&
        !field.dataset.templateAreas.split(" ").includes(value);
    for (const group of dialog.querySelectorAll(".template-content-group"))
      group.hidden = ![...group.querySelectorAll("[data-template-layer]")].some(
        (el) => !el.hidden,
      );
    if (value !== "all") livePreview.jump(+value);
  }
  function missingImages() {
    return requiredImages.filter((slot) => !values[slot.id]?.[slot.channel]);
  }
  function updateReady() {
    $("#templateCreate").disabled =
      !!pending || !selectedTemplate || stage !== "fill";
    const progress = $("#templateFillProgress");
    if (!progress || !selectedTemplate) return;
    const missing = missingImages(),
      total = requiredImages.length;
    progress.textContent = missing.length
      ? `${total - missing.length} von ${total} Bildern eingesetzt`
      : "Bilder vollständig · Texte prüfen und im Designer öffnen";
    for (const card of dialog.querySelectorAll(
      ".template-layer.needs-content",
    )) {
      if (missing.some((slot) => slot.id === card.dataset.templateLayer))
        continue;
      card.classList.remove("needs-content");
      const note = card.querySelector("[data-template-error]");
      note.hidden = true;
      note.textContent = "";
      for (const input of card.querySelectorAll("input[type=file]"))
        MKWFields.clear(input);
    }
  }
  function renderFields(t) {
    const groups = [
      {
        key: "images",
        title: "Bilder einsetzen",
        hint: "Wähle für jedes Bildfeld ein Foto. Winkel verwenden das zugeordnete Foto automatisch.",
        items: [],
      },
      {
        key: "texts",
        title: "Texte prüfen",
        hint: "Passe die vorgeschlagenen Texte an. Die Gestaltung bleibt erhalten.",
        items: [],
      },
      {
        key: "design",
        title: "Logos & weitere Designelemente",
        hint: "Diese Elemente sind bereits eingerichtet. Du kannst sie hier prüfen und später im Designer bearbeiten.",
        items: [],
      },
    ];
    for (const o of t.carousel.objects) {
      const group =
        MKWTemplateModel.imageLayer(o) || o.strokeMode === "image"
          ? groups[0]
          : o.type === "text"
            ? groups[1]
            : groups[2];
      group.items.push(layerField(o, t));
    }
    $("#templateLayers").innerHTML = groups
      .filter((g) => g.items.length)
      .map((g) => {
        const body = `<p class="template-group-hint">${g.hint}</p><div class="template-group-fields">${g.items.join("")}</div>`;
        return g.key === "design"
          ? `<details class="template-content-group"><summary>${g.title}<span>${g.items.length}</span></summary>${body}</details>`
          : `<section class="template-content-group" aria-labelledby="template-group-${g.key}"><h3 id="template-group-${g.key}">${g.title}</h3>${body}</section>`;
      })
      .join("");
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
      MKWFields.clear(input);
      const card = input.closest(".template-layer");
      if (!card.querySelector("[data-field-error]")) {
        card.querySelector("[data-template-error]").hidden = true;
        card.querySelector("[data-template-error]").textContent = "";
      }
      updateReady();
      message(
        "Bild eingefügt. Die Winkel übernehmen ihren zugeordneten Hintergrund automatisch.",
      );
    } catch (error) {
      if (current === generation) {
        message(error.message, true);
        const note = input
          .closest(".template-layer")
          .querySelector("[data-template-error]");
        note.hidden = false;
        MKWFields.error(input, error.message, note);
      }
    } finally {
      finishLoading();
      if (current === generation) {
        pending--;
        updateReady();
        input.disabled = false;
        input.value = "";
      }
    }
  }
  function fileField(o, channel, label) {
    const required = requiredImages.some(
      (slot) => slot.id === o.id && slot.channel === channel,
    );
    return `<label class="template-file-field"><span>${label}${required ? ' <small class="template-required">Benötigt</small>' : ""}</span><span class="template-file-button">${studioIcon("image")}<span data-file-name>${esc(values[o.id]?.[channel]?.name || "Bild auswählen")}</span><input type="file" accept="image/*" data-template-upload="${esc(o.id)}" data-channel="${channel}" ${required ? "data-template-required" : ""} aria-label="${esc(label + ": " + o.name)}"></span></label>`;
  }
  function layerField(o, t) {
    const slot = t.slots.find((s) => s.objectId === o.id),
      folder = t.carousel.folders?.find((f) => f.id === o.folderId),
      visible = MKWTemplateModel.visible(o, t.carousel);
    let body = "";
    if (o.type === "text")
      body = `<label>Text<textarea data-template-text="${esc(o.id)}" aria-label="Text: ${esc(o.name)}" rows="3">${esc(values[o.id]?.text ?? o.text)}</textarea></label>`;
    else if (o.type === "angle")
      body = `<p class="template-linked">${studioIcon("image")}Verwendet das Foto aus <strong>${esc(t.carousel.objects.find((s) => s.id === slot.sourceId)?.name)}</strong></p>`;
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
    const bounds = carouselObjectBounds(o),
      areas = MKWCarouselPolicy.frames(t.carousel).flatMap((a, i) =>
        MKWCarouselPolicy.intersects(a, bounds) ? [i] : [],
      ),
      owner = MKWCarouselPolicy.owner(t.carousel, bounds),
      area =
        areas.length > 1
          ? `${areas.length} Zeichenflächen`
          : owner >= 0
            ? MKWCarouselPolicy.frame(t.carousel, owner).name
            : "Ausserhalb der Zeichenflächen";
    return `<section class="template-layer" data-template-areas="${areas.length ? areas.join(" ") : "-1"}" data-template-area="${owner}" data-template-layer="${esc(o.id)}"><div class="template-layer-heading">${studioIcon(o.type === "logo" ? "logo" : o.type)}<div><h4>${esc(o.name)}</h4><small>${esc([area, folder?.name, kindNames[o.type], visible ? null : "Ausgeblendet"].filter(Boolean).join(" · "))}</small></div></div>${body}<p data-template-error role="status" hidden></p></section>`;
  }
  async function select(id) {
    const finishLoading = MKWUIControls.loading("#templateStatus");
    try {
      if (selectedTemplate) drafts.set(selectedTemplate.id, values);
      const current = ++generation;
      pending = 0;
      selectedTemplate = null;
      requiredImages = [];
      $("#templateFill").hidden = true;
      livePreview.close();
      updateReady();
      message("Vorlage wird geladen …");
      try {
        const t = await MKWTemplates.get(id);
        if (current !== generation || !dialog.open) return;
        selectedTemplate = t;
        const card = dialog.querySelector(
          `[data-template-id="${CSS.escape(id)}"]`,
        );
        if (card) loadPreview(card, current);
        const objects = new Map(t.carousel.objects.map((o) => [o.id, o]));
        requiredImages = MKWTemplateModel.requirements(t).flatMap((slot) => {
          const o = objects.get(slot.objectId);
          return [
            MKWTemplateModel.imageLayer(o)
              ? { id: o.id, channel: "image" }
              : null,
            o.strokeMode === "image" ? { id: o.id, channel: "stroke" } : null,
          ].filter(Boolean);
        });
        values = drafts.get(id) || Object.create(null);
        dialog
          .querySelectorAll("[data-template-id]")
          .forEach((b) =>
            b.setAttribute("aria-pressed", String(b.dataset.templateId === id)),
          );
        showStage("fill");
        $("#templateAreaFilter").innerHTML =
          '<option value="all">Alle Zeichenflächen</option>' +
          MKWCarouselPolicy.frames(t.carousel)
            .map((a, i) => `<option value="${i}">${esc(a.name)}</option>`)
            .join("") +
          '<option value="-1">Ausserhalb der Zeichenflächen</option>';
        $("#templateFillTitle").textContent = t.name;
        $("#templateFillDescription").textContent = t.description;
        $("#templateFillDescription").hidden = !t.description;
        renderFields(t);
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
          `${t.carousel.n} ${t.carousel.n === 1 ? "Slide" : "Slides"} · Bilder einsetzen und Texte prüfen. Deine Vorlage bleibt unverändert.`,
        );
        updateReady();
        $("#templateProjectName").focus({ preventScroll: true });
      } catch (error) {
        if (current === generation) {
          showStage("choose", true);
          message(error.message, true);
        }
      }
    } finally {
      finishLoading();
    }
  }
  async function create() {
    if (pending || !selectedTemplate || stage !== "fill") return;
    const name = $("#templateProjectName");
    if (!MKWFields.validate(name, true)) {
      message("Gib deinem Projekt bitte einen Namen.", true);
      name.focus();
      return;
    }
    const missing = missingImages();
    dialog
      .querySelectorAll(".needs-content")
      .forEach((el) => el.classList.remove("needs-content"));
    if (missing.length) {
      $("#templateAreaFilter").value = "all";
      filterLayers();
      for (const slot of missing) {
        const card = dialog.querySelector(
            `[data-template-layer="${CSS.escape(slot.id)}"]`,
          ),
          note = card.querySelector("[data-template-error]"),
          input = card.querySelector(`[data-channel="${slot.channel}"]`);
        card.classList.add("needs-content");
        card.closest("details")?.setAttribute("open", "");
        note.hidden = false;
        MKWFields.error(input, "Bitte ein Bild auswählen.", note);
      }
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
    dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="templateGalleryTitle">Mit einer Vorlage starten</h2><p>Wähle ein fertiges Design und ersetze seine Inhalte. Danach kannst du alles im Designer anpassen.</p></div><button class="icon-button" id="closeTemplateGallery" aria-label="Vorlagen schliessen">${studioIcon("close")}</button></div><section id="templateChoose"><div class="template-gallery-heading"><h3>1 · Design auswählen</h3><span id="templateResultCount" role="status"></span><div class="template-slider-controls"><button id="templatePrevious" aria-label="Vorherige Vorlagen">${studioIcon("back")}</button><button id="templateNext" aria-label="Weitere Vorlagen">${studioIcon("front")}</button></div></div><div class="template-search-fields"><label>Vorlagen suchen<input type="search" id="templateSearch" placeholder="Name oder Beschreibung"></label><label>Sammlung<select id="templateOrigin"><option value="all">Alle Vorlagen</option><option value="builtin">Mitgeliefert</option><option value="own">Eigene Vorlagen</option></select></label></div><div id="templateCards" class="template-slider" role="group" aria-label="Vorlagen"></div><p id="templateEmpty" role="status" hidden>Keine passende Vorlage. Ändere die Suche oder die Sammlung.</p></section><form id="templateFill" hidden novalidate><div class="template-fill-heading"><button type="button" id="templateChangeChoice">${studioIcon("back")}Andere Vorlage wählen</button><span class="template-step-label">2 · Inhalte einsetzen</span><h3 id="templateFillTitle"></h3><p id="templateFillDescription"></p></div><div class="template-content-fields"><h3>Projekt benennen</h3><div class="setup-project-fields"><label>Projektname<input id="templateProjectName" maxlength="80" required placeholder="Zum Beispiel: Saisonauftakt"></label><label>Kürzel<input id="templateProjectCode" maxlength="24" placeholder="E2"></label></div><p id="templateFillProgress" role="status"></p><label class="template-area-filter">Inhalte anzeigen<select id="templateAreaFilter"><option value="all">Alle Zeichenflächen</option></select></label><div id="templateLayers"></div></div><aside id="templateLivePreview"></aside></form><div class="template-footer"><p id="templateStatus" role="status" aria-live="polite"></p><button id="templateCreate" class="primary" disabled>Im Designer öffnen</button></div>`;
    document.body.append(dialog);
    livePreview = MKWTemplateFillPreview.attach($("#templateLivePreview"));
    $("#closeTemplateGallery").onclick = () => {
      if (!creating) dialog.close();
    };
    dialog.addEventListener("cancel", (event) => {
      if (creating) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
      MKWProjectSetup.resumeTemplate(
        $("#templateProjectName").value,
        $("#templateProjectCode").value,
      );
      generation++;
      livePreview.close();
      observer?.disconnect();
      drafts.clear();
      values = Object.create(null);
      selectedTemplate = null;
      requiredImages = [];
      pending = 0;
      $("#templateLayers").replaceChildren();
      $("#templateFillProgress").textContent = "";
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
    $("#templateSearch").oninput = filterCards;
    $("#templateOrigin").onchange = filterCards;
    $("#templateAreaFilter").onchange = filterLayers;
    $("#templateChangeChoice").onclick = () => {
      if (pending || creating)
        return message("Bitte warte, bis das Bild fertig geladen ist.");
      if (selectedTemplate) drafts.set(selectedTemplate.id, values);
      livePreview.close();
      showStage("choose", true);
      message(
        "Wähle ein Design. Deine bisherigen Eingaben bleiben beim Zurückwechseln erhalten.",
      );
    };
  }
  async function open() {
    mount();
    const finishLoading = MKWUIControls.loading("#templateStatus");
    try {
      observer?.disconnect();
      generation++;
      selectedTemplate = null;
      requiredImages = [];
      livePreview.close();
      values = Object.create(null);
      pending = 0;
      drafts.clear();
      updateReady();
      showStage("choose");
      $("#templateSearch").value = "";
      $("#templateOrigin").value = "all";
      MKWFields.reset(dialog);
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
              `<button type="button" class="template-card" data-template-id="${esc(t.id)}" data-origin="${t.builtIn ? "builtin" : "own"}" data-search="${esc((t.name + " " + (t.description || "")).toLocaleLowerCase("de"))}" aria-pressed="false"><span class="template-card-preview"><img alt="Vorschau: ${esc(t.name)}" hidden><span data-preview-status>Vorschau wird geladen …</span><span class="template-slide-badge">${t.n} ${t.layout === "free" ? "Flächen" : t.n === 1 ? "Slide" : "Slides"}</span></span><strong>${esc(t.name)}</strong><small>${t.mixed ? "Verschiedene Formate" : `${t.w} × ${t.h} px`}${t.builtIn ? " · Mitgeliefert" : ""}</small></button>`,
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
        filterCards();
        message(
          "Wähle ein Design. Im nächsten Schritt setzt du Bilder und Texte ein.",
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
      if (
        !dialog.open ||
        !card.isConnected ||
        !$("#templateCards").contains(card)
      )
        return;
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
