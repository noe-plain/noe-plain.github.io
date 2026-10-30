"use strict";
const MKWProjectSetup = (() => {
  const dialog = $("#projectSetup"),
    model = MKWNewProjectModel;
  let draft,
    activeId,
    nextId = 0,
    creating = false,
    committed = false,
    wasBusy = false;
  const ratio = (f) =>
    Number.isInteger(f.w) && Number.isInteger(f.h) && f.w > 0 && f.h > 0
      ? MKW.ratio(f.w, f.h).replace("x", ":")
      : "Eigenes Format";
  const number = (input) => (input.value === "" ? NaN : input.valueAsNumber);
  const inputHTML = (key, label, id = "", max = 10000) =>
    `<label>${label} (px)<input ${id ? `id="${id}"` : ""} data-format-key="${key}" type="number" min="${key === "w" || key === "h" ? 240 : 0}" ${key === "w" || key === "h" ? `max="${max}"` : ""} step="1" required></label>`;
  dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="setupTitle">Neues Projekt</h2><p>Wähle deinen Arbeitsbereich und die passenden Formate.</p></div></div>
    <div class="new-project-content">
      <div class="new-project-basics"><div class="mode-buttons" role="group" aria-label="Projektmodus"><button type="button" data-project-mode="post" aria-pressed="true">${studioIcon("image")}<span>FD-Kampagnen</span></button><button type="button" data-project-mode="carousel" aria-pressed="false">${studioIcon("builder")}<span>Designer</span></button></div><p id="setupInstructions"></p>
      <div class="setup-project-fields"><label>Projektname<input id="setupName" type="text" maxlength="80" placeholder="Zum Beispiel: Herbstkonzerte" required autofocus></label><label>Kürzel<input id="setupCode" type="text" maxlength="24" placeholder="E2" aria-describedby="setupCodeHint"></label></div><p id="setupCodeHint">Das Kürzel wird für deine Dateinamen verwendet.</p></div>
      <div class="new-project-grid"><section class="new-project-formats" aria-label="Formate einrichten"><div id="postSetup"><div class="new-project-section-heading"><h3>Formate auswählen</h3><span id="setupFormatCount"></span></div><div id="formatChoices"></div><button type="button" id="addFormat">${studioIcon("add")}<span>Eigenes Format hinzufügen</span></button></div>
      <section id="carouselSetup" hidden><h3>Designer einrichten</h3><div class="designer-arrangement" role="group" aria-label="Anordnung der Zeichenflächen"><button type="button" data-designer-layout="slides" aria-pressed="true">Zusammenhängende Slides</button><button type="button" data-designer-layout="free" aria-pressed="false">Freie Zeichenflächen</button></div><p id="designerLayoutHint"></p><div class="setup-designer-size">${inputHTML("w", "Breite pro Slide", "cw", 4000)}${inputHTML("h", "Höhe pro Slide", "ch", 4000)}</div><p id="carouselFormatFeedback" class="format-feedback" role="status"></p><div class="setup-count"><label for="cn">Anzahl Slides</label><div><button type="button" id="setupSlideMinus" class="icon-button" aria-label="Eine Slide weniger">${studioIcon("minus")}</button><input id="cn" type="number" min="1" max="20" step="1" required aria-describedby="setupCountHint"><button type="button" id="setupSlidePlus" class="icon-button" aria-label="Eine Slide mehr">${studioIcon("add")}</button></div><small id="setupCountHint">1–20 Slides · ein gemeinsames Format</small></div><p id="carouselCountFeedback" class="format-feedback" role="status"></p><div class="setup-slide-overview"><strong id="carouselArtworkSize"></strong><div id="carouselSetupStrip" aria-label="Vorschau der Slide-Anordnung"></div></div></section></section>
      <section class="new-project-detail" aria-labelledby="setupDetailTitle"><div class="new-project-section-heading"><h3 id="setupDetailTitle">Schutzzonen</h3><span id="setupDetailDimensions"></span></div><p id="setupDetailScope"></p><div class="setup-safe-diagram"><div class="safe-preview" id="carouselSafePreview"><div class="safe-preview-inner"><span>Schutzzone</span></div></div></div><div id="setupSafeFields">${[
        ["top", "Oben"],
        ["bottom", "Unten"],
        ["left", "Links"],
        ["right", "Rechts"],
      ]
        .map(([key, label]) => inputHTML(key, label))
        .join(
          "",
        )}</div><p id="setupSafeFeedback" class="format-feedback" role="status"></p><p class="setup-safe-hint">Die Hilfslinien zeigen, wo wichtige Texte und Logos genügend Abstand zum Rand haben.</p></section></div>
    </div><div class="setup-actions"><div class="setup-footer-info"><p id="setupSummary"></p><p id="setupError" role="alert"></p></div><div class="setup-footer-buttons"><button type="button" id="cancelSetup">Abbrechen</button><button type="button" id="createProject" class="primary">Projekt erstellen</button></div></div>`;
  for (const button of dialog.querySelectorAll("[data-designer-layout]"))
    button.onclick = () => {
      draft.designer.layout = button.dataset.designerLayout;
      refresh();
    };
  const current = () =>
    draft.mode === "carousel"
      ? draft.designer
      : draft.formats.find((f) => f.id === activeId);
  const fields = () => [...$("#setupSafeFields").querySelectorAll("input")];
  function notice(message = "") {
    $("#setupError").textContent = message;
  }
  function formatErrors(f) {
    const result = model.errors(f, draft.mode === "carousel");
    if (draft.mode === "post" && model.duplicateIds(draft.formats).has(f.id))
      result.w = result.h =
        "Diese Bildgrösse ist mehrfach ausgewählt. Bitte nur einmal auswählen.";
    return result;
  }
  function feedback(inputs, errors, host) {
    const text = [
      ...new Set(
        inputs.map((input) => errors[input.dataset.formatKey]).filter(Boolean),
      ),
    ].join(" ");
    host.textContent = text;
    for (const input of inputs) {
      MKWFields.clear(input);
      if (errors[input.dataset.formatKey])
        MKWFields.error(input, errors[input.dataset.formatKey], host);
    }
  }
  function validateRows() {
    for (const row of $("#formatChoices").children) {
      const f = draft.formats.find((f) => f.id === Number(row.dataset.format));
      const errors = formatErrors(f),
        inputs = [...row.querySelectorAll("input[type=number]")];
      feedback(inputs, errors, row.querySelector(".format-feedback"));
      row.classList.toggle(
        "invalid",
        f.enabled && Object.keys(errors).length > 0,
      );
      row.querySelector("[data-format-label]").textContent = ratio(f);
      row
        .querySelector("[data-format-enabled]")
        .setAttribute("aria-label", `Format ${ratio(f)} verwenden`);
      const details = row.querySelector("[data-format-detail]");
      details.setAttribute(
        "aria-label",
        `${f.id === activeId ? "Wird bearbeitet · " : ""}Schutzzonen bearbeiten: ${ratio(f)}`,
      );
      details.setAttribute("aria-pressed", String(f.id === activeId));
      row.querySelector("[data-format-detail] span").textContent =
        f.id === activeId ? "Wird bearbeitet" : "Schutzzonen";
      row.classList.toggle("is-current", f.id === activeId);
    }
  }
  function refresh() {
    if (!draft) return;
    const f = current(),
      designer = draft.mode === "carousel",
      errors = formatErrors(f);
    const free = draft.designer.layout === "free";
    for (const button of dialog.querySelectorAll("[data-designer-layout]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.designerLayout === draft.designer.layout),
      );
    $("#designerLayoutHint").textContent = free
      ? "Einzelne Flächen frei nebeneinander oder untereinander platzieren. Formate und Schutzzonen kannst du später pro Fläche ändern."
      : "Slides grenzen direkt aneinander und teilen sich ein Format – für einen zusammenhängenden Beitrag.";
    $("#setupCountHint").textContent = free
      ? "1–20 Zeichenflächen · Startformat, später einzeln anpassbar"
      : "1–20 Slides · ein gemeinsames Format";
    dialog.querySelector('label[for="cn"]').textContent = free
      ? "Anzahl Zeichenflächen"
      : "Anzahl Slides";
    if (!designer) validateRows();
    else
      feedback(
        [...$(".setup-designer-size").querySelectorAll("input")],
        errors,
        $("#carouselFormatFeedback"),
      );
    feedback(fields(), errors, $("#setupSafeFeedback"));
    const preview = $("#carouselSafePreview"),
      inner = preview.firstElementChild;
    if (Object.keys(model.errors(f, designer)).length === 0) {
      preview.style.aspectRatio = `${f.w}/${f.h}`;
      preview.style.setProperty("--preview-ratio", f.w / f.h);
      for (const key of ["top", "bottom", "left", "right"])
        preview.style.setProperty(
          "--" + key,
          (100 * f[key]) / (key === "top" || key === "bottom" ? f.h : f.w) +
            "%",
        );
      if (designer) MKWDesignerGrid.preview(inner, model.format(f));
      else {
        inner.classList.remove("designer-grid");
        inner.style.cssText = "";
      }
      preview.setAttribute(
        "aria-label",
        `${f.w} × ${f.h} Pixel. Schutzzonen: oben ${f.top}, unten ${f.bottom}, links ${f.left}, rechts ${f.right} Pixel.`,
      );
    }
    preview.setAttribute("role", "img");
    $("#setupDetailTitle").textContent = designer
      ? free
        ? "Schutzzonen · Startwerte"
        : "Schutzzonen · pro Slide"
      : `Schutzzonen · ${ratio(f)}`;
    $("#setupDetailDimensions").textContent =
      Number.isFinite(f.w) && Number.isFinite(f.h) ? `${f.w} × ${f.h} px` : "";
    $("#setupDetailScope").textContent = designer
      ? free
        ? "Startwerte für die neuen Zeichenflächen. Später im Designer einzeln anpassbar."
        : "Gilt gemeinsam für alle Slides."
      : f.enabled
        ? "Dieses Format ist ausgewählt."
        : "Dieses Format ist noch nicht ausgewählt.";
    const enabled = draft.formats.filter((f) => f.enabled).length;
    $("#setupFormatCount").textContent = `${enabled} ausgewählt`;
    if (designer) {
      const validCount = MKWCarouselPolicy.validCount(f.n),
        host = $("#carouselCountFeedback");
      MKWFields.group(
        [$("#cn")],
        validCount
          ? ""
          : "Bitte eine ganze Anzahl von 1 bis 20 Slides eingeben.",
        host,
      );
      $("#setupSlideMinus").disabled = creating || !validCount || f.n <= 1;
      $("#setupSlidePlus").disabled = creating || !validCount || f.n >= 20;
      if (validCount && Object.keys(model.errors(f, true)).length === 0) {
        $("#carouselArtworkSize").textContent = free
          ? `${f.n} einzelne Zeichenflächen · Startformat ${f.w} × ${f.h} px`
          : `${f.w * f.n} × ${f.h} px gesamt`;
        $("#carouselSetupStrip").classList.toggle("is-free", free);
        $("#carouselSetupStrip").innerHTML = Array.from(
          { length: f.n },
          (_, i) =>
            `<div style="aspect-ratio:${f.w}/${f.h}"><span>${i + 1}</span><i style="top:${(100 * f.top) / f.h}%;bottom:${(100 * f.bottom) / f.h}%;left:${(100 * f.left) / f.w}%;right:${(100 * f.right) / f.w}%"></i></div>`,
        ).join("");
      }
    }
    $("#setupSummary").textContent = designer
      ? `Designer · ${MKWCarouselPolicy.validCount(f.n) ? f.n : "–"} ${free ? "freie Zeichenflächen" : f.n === 1 ? "Slide" : "Slides"}`
      : `FD-Kampagnen · ${enabled} ${enabled === 1 ? "Format" : "Formate"}`;
  }
  function detail(id) {
    activeId = id;
    const f = current();
    for (const input of fields()) {
      const key = input.dataset.formatKey;
      input.id =
        draft.mode === "carousel"
          ? { top: "ct", bottom: "cb", left: "cl", right: "cr" }[key]
          : `setupSafe-${key}`;
      MKWFields.clear(input);
      input.value = Number.isFinite(f[key]) ? f[key] : "";
    }
    refresh();
  }
  function mode(value) {
    draft.mode = value;
    $("#postSetup").hidden = value !== "post";
    $("#carouselSetup").hidden = value !== "carousel";
    $("#setupInstructions").textContent =
      value === "post"
        ? "Mehrere Fotos mit einheitlichem Layout in verschiedenen Formaten."
        : "Eine oder mehrere Slides frei gestalten.";
    for (const button of dialog.querySelectorAll("[data-project-mode]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.projectMode === value),
      );
    detail(activeId);
    notice();
  }
  function appendFormat(f) {
    const row = document.createElement("fieldset");
    row.className = "format-choice";
    row.dataset.format = f.id;
    row.innerHTML = `<legend><label><input type="checkbox" data-format-enabled ${f.enabled ? "checked" : ""}><span data-format-label>${ratio(f)}</span></label></legend><div class="setup-format-size">${inputHTML("w", "Breite")}${inputHTML("h", "Höhe")}</div><div class="setup-format-actions"><button type="button" data-format-detail aria-controls="setupSafeFields"><span>Schutzzonen</span>${studioIcon("front")}</button>${f.custom ? `<button type="button" class="icon-button" data-format-remove aria-label="Eigenes Format entfernen">${studioIcon("trash")}</button>` : ""}</div><p class="format-feedback" role="status"></p>`;
    $("#formatChoices").append(row);
    row.querySelector("[data-format-enabled]").onchange = (event) => {
      f.enabled = event.target.checked;
      row.classList.toggle("is-enabled", f.enabled);
      notice();
      if (f.enabled) detail(f.id);
      else refresh();
    };
    row.classList.toggle("is-enabled", f.enabled);
    for (const input of row.querySelectorAll("input[type=number]")) {
      input.value = f[input.dataset.formatKey];
      input.oninput = () => {
        f[input.dataset.formatKey] = number(input);
        notice();
        refresh();
      };
    }
    row.querySelector("[data-format-detail]").onclick = () => {
      detail(f.id);
      if (matchMedia("(max-width: 850px)").matches)
        $(".new-project-detail").scrollIntoView({ block: "nearest" });
    };
    const remove = row.querySelector("[data-format-remove]");
    if (remove)
      remove.onclick = () => {
        draft.formats = draft.formats.filter((item) => item.id !== f.id);
        row.remove();
        if (activeId === f.id) detail(draft.formats[0].id);
        else refresh();
        $("#addFormat").focus();
      };
  }
  function open(options = {}) {
    if (creating || dialog.open) return;
    wasBusy = busy;
    busy = true;
    committed = false;
    nextId = 0;
    draft = {
      mode: "post",
      formats: MKWFormats.defaults().map((f, i) => ({
        ...f,
        id: nextId++,
        enabled: i < 2,
      })),
      designer: {
        w: 1080,
        h: 1350,
        top: 100,
        bottom: 200,
        left: 100,
        right: 100,
        n: 4,
        layout: "slides",
      },
    };
    activeId = draft.formats[0].id;
    MKWFields.reset(dialog);
    $("#setupName").value = $("#setupCode").value = "";
    $("#formatChoices").replaceChildren();
    draft.formats.forEach(appendFormat);
    for (const id of ["cw", "ch", "cn"])
      $("#" + id).value = draft.designer[{ cw: "w", ch: "h", cn: "n" }[id]];
    mode(options.mode === "carousel" ? "carousel" : "post");
    $(".new-project-content").scrollTop = 0;
    dialog.showModal();
  }
  function complete() {
    committed = true;
  }
  function finish() {
    complete();
    dialog.close();
    $("#startDialog").close();
    busy = false;
    if (p.carousel) carouselFit();
  }
  async function create() {
    if (creating) return;
    if (!MKWFields.validate($("#setupName"), true)) {
      notice("Gib deinem Projekt bitte einen Namen.");
      $("#setupName").focus();
      return;
    }
    refresh();
    const designer = draft.mode === "carousel",
      formats = draft.formats.filter((f) => f.enabled);
    if (!designer && !formats.length) {
      notice("Wähle mindestens ein Format aus.");
      $("[data-format-enabled]").focus();
      return;
    }
    const invalid = designer
      ? Object.keys(formatErrors(draft.designer)).length > 0
      : formats.find((f) => Object.keys(formatErrors(f)).length > 0);
    if (
      invalid ||
      (designer && !MKWCarouselPolicy.validCount(draft.designer.n))
    ) {
      if (!designer) detail(invalid.id);
      notice(
        designer && !MKWCarouselPolicy.validCount(draft.designer.n)
          ? "Bitte eine ganze Anzahl von 1–20 Slides angeben."
          : "Bitte die markierten Angaben korrigieren.",
      );
      const source = !designer
        ? $(`[data-format="${invalid.id}"]`)
        : $(".setup-designer-size");
      const target =
        designer && !MKWCarouselPolicy.validCount(draft.designer.n)
          ? $("#cn")
          : source.querySelector("[data-field-error]") ||
            $("#setupSafeFields [data-field-error]");
      target?.focus();
      return;
    }
    creating = true;
    const controls = [...dialog.querySelectorAll("button,input")].map((el) => [
      el,
      el.disabled,
    ]);
    controls.forEach(([el]) => (el.disabled = true));
    dialog.setAttribute("aria-busy", "true");
    $("#setupError").setAttribute("role", "status");
    notice("Projekt wird erstellt …");
    const finishLoading = MKWUIControls.loading("#setupError");
    let document;
    const selectionBefore = {
      id: carouselSelection,
      ids: new Set(carouselUI.ids),
      slide: carouselUI.slide,
      tool: carouselUI.tool,
      content: carouselUI.content,
    };
    try {
      const meta = {
        title: $("#setupName").value.trim(),
        code: $("#setupCode").value.trim(),
      };
      document = designer
        ? await carouselNewDocument(
            model.format(draft.designer),
            draft.designer.n,
            meta,
            draft.designer.layout,
          )
        : fresh();
      if (!designer) {
        document.fonts = [...p.fonts];
        Object.assign(document.meta, meta);
        document.formats = formats.map(model.format);
      }
      carouselSelection = null;
      carouselUI.ids.clear();
      carouselUI.slide = null;
      carouselUI.tool = "select";
      carouselUI.content = false;
      await MKWProjects.startDocument(document);
      finish();
    } catch (error) {
      if (document && p === document) {
        finish();
        MKWProjects.notice(
          "Projekt erstellt. Bitte den Speicherhinweis prüfen: " +
            error.message,
          true,
        );
      } else {
        carouselSelection = selectionBefore.id;
        carouselUI.ids = selectionBefore.ids;
        carouselUI.slide = selectionBefore.slide;
        carouselUI.tool = selectionBefore.tool;
        carouselUI.content = selectionBefore.content;
        notice("Projekt konnte nicht erstellt werden: " + error.message);
      }
    } finally {
      finishLoading();
      creating = false;
      controls.forEach(([el, disabled]) => {
        if (el.isConnected) el.disabled = disabled;
      });
      dialog.removeAttribute("aria-busy");
      $("#setupError").setAttribute("role", "alert");
    }
  }
  for (const button of dialog.querySelectorAll("[data-project-mode]"))
    button.onclick = () => mode(button.dataset.projectMode);
  fields().forEach(
    (input) =>
      (input.oninput = () => {
        current()[input.dataset.formatKey] = number(input);
        notice();
        refresh();
      }),
  );
  for (const id of ["cw", "ch", "cn"])
    $("#" + id).oninput = (event) => {
      if (!draft) return;
      draft.designer[{ cw: "w", ch: "h", cn: "n" }[id]] = number(event.target);
      notice();
      refresh();
    };
  for (const [id, step] of [
    ["setupSlideMinus", -1],
    ["setupSlidePlus", 1],
  ])
    $("#" + id).onclick = () => {
      draft.designer.n += step;
      $("#cn").value = draft.designer.n;
      notice();
      refresh();
    };
  $("#addFormat").onclick = () => {
    const f = {
      w: 1080,
      h: 1440,
      top: 100,
      bottom: 200,
      left: 100,
      right: 100,
      id: nextId++,
      enabled: true,
      custom: true,
    };
    draft.formats.push(f);
    appendFormat(f);
    detail(f.id);
    $(`[data-format="${f.id}"] input[type=number]`).focus();
    notice();
  };
  $("#cancelSetup").onclick = () => {
    if (!creating) dialog.close();
  };
  $("#createProject").onclick = create;
  dialog.addEventListener("cancel", (event) => {
    if (creating) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open && !committed) busy = wasBusy;
  });
  function resumeTemplate(name, code) {
    if (!dialog.open || committed) return;
    $("#setupName").value = name;
    $("#setupCode").value = code;
  }
  return { open, complete, resumeTemplate };
})();
