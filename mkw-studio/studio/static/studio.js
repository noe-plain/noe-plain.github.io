"use strict";
let step = "text",
  editingText = null,
  exportPlan = [];
function icon(name) {
  return studioIcon(name);
}
function icons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
    if (el.dataset.step) {
      el.innerHTML += `<span class="dock-label">${{ import: "Bilder", text: "Text", logo: "Logo", sponsors: "Sponsoren", crop: "Ausschnitt", export: "Export" }[el.dataset.step]}</span>`;
      el.setAttribute("aria-label", el.textContent.trim());
    }
  });
}
function smallButton(name, title, action, id) {
  return `<button class="icon-button" data-action="${action}" data-id="${esc(id)}" title="${title}" aria-label="${title}">${icon(name)}</button>`;
}
function on(id, event, fn) {
  const el = $("#" + id);
  if (el) el.addEventListener(event, fn);
}
function mutate(fn, full = true) {
  if (!studioPicker?.adapter || !studioPicker.editing) checkpoint();
  fn();
  changed(full);
}
function touchMeta() {
  revision++;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => autosave().catch(() => {}), 1200);
}
const textTypes = [
  ["date", "Übertitel"],
  ["title", "Konzerttitel"],
  ["subtitle", "Untertitel"],
];
function textTypeSummary(b) {
  return textTypes
    .filter(
      ([key]) => b && (b.elements[key].enabled ?? b.elements[key].visible),
    )
    .map(([, label]) => label);
}
function postOptionSummary(b) {
  return [
    ...textTypeSummary(b),
    ...(b?.angle?.enabled ? ["Winkel"] : []),
    ...(b?.family?.enabled ? ["Familienkonzert"] : []),
    ...(b?.sponsors?.enabled ? ["Sponsorenleiste"] : []),
  ];
}
function textTypePicker(im) {
  const b = p.boards.find((b) => b.imageId === im.id),
    active = postOptionSummary(b);
  return `<details class="text-type-picker" data-text-picker="${esc(im.id)}" aria-label="Optionen · ${esc(im.name)}"><summary title="Optionen auswählen · ${esc(im.name)}"><span class="text-selection" data-text-summary>${active.join(" · ") || "Keine Optionen gewählt"}</span><span class="text-count" data-text-count>${active.length} Optionen</span>${studioIcon("down", "picker-chevron")}</summary><div class="text-type-options" role="group" aria-label="Optionen · ${esc(im.name)}"><div class="post-text-options" role="group" aria-label="Textoptionen"><span class="post-options-heading">Textoptionen</span>${textTypes.map(([key, label]) => `<label class="post-option-row"><input type="checkbox" data-text-type="${key}" data-image="${esc(im.id)}" ${b && (b.elements[key].enabled ?? b.elements[key].visible) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div><hr class="post-options-divider">${MKWPostAngleEditor.options(im)}${familyPicker(im)}<hr class="post-options-divider">${sponsorOptions(im)}</div></details>`;
}
function familyPicker(im) {
  const config = familyConfig(
    p.boards.find((b) => b.imageId === im.id)?.family,
  );
  return `<div class="family-picker"><label class="post-option-row"><input type="checkbox" data-family-mode="${esc(im.id)}" ${config.enabled ? "checked" : ""}><span>Familienkonzert</span></label></div>`;
}
function familyTools(b) {
  const custom = !!Object.keys(p.familyOverrides?.[b.imageId] || {}).length;
  return `<section class="tool-section family-tools" data-family-settings="${esc(b.imageId)}"><h3>Familienkonzert</h3><div class="family-palette" data-family-palette="${esc(b.imageId)}" aria-label="Acht Buchstabenfarben"></div><button type="button" data-family-shift="${esc(b.imageId)}">Farbreihenfolge wechseln</button><button type="button" data-family-reset="${esc(b.imageId)}" ${b.imageId !== p.images[0]?.id && custom ? "" : "hidden"}>Design vom ersten Bild übernehmen</button></section>`;
}
function setFamilyDesign(imageId, changes) {
  const first = imageId === p.images[0]?.id;
  p.familyOverrides ??= {};
  if (first)
    p.meta.familyDesign = {
      ...familyConfig(p.boards.find((b) => b.imageId === imageId)?.family),
      ...changes,
    };
  else {
    p.familyOverrides[imageId] ??= {};
    for (const key of Object.keys(changes))
      p.familyOverrides[imageId][key] = true;
  }
  for (const b of p.boards) {
    const next = familyConfig(b.family);
    let affected = false;
    for (const [key, value] of Object.entries(changes))
      if (
        b.imageId === imageId ||
        (first && !p.familyOverrides[b.imageId]?.[key])
      ) {
        next[key] = value;
        affected = true;
      }
    if (affected) applyFamilyBoard(b, next);
  }
  refreshFamilyControls();
  renderPanel();
  syncOverlays(true);
}
function refreshFamilyControls() {
  for (const im of p.images) {
    const f = familyConfig(p.boards.find((b) => b.imageId === im.id)?.family),
      input = document.querySelector(`[data-family-mode="${im.id}"]`);
    if (input) input.checked = f.enabled;
    for (const palette of document.querySelectorAll(
      `[data-family-palette="${im.id}"]`,
    ))
      palette.innerHTML = MKWFamily.runs("12345678", f.offset)
        .map(
          (r) =>
            `<span style="background:${r.color}" title="${r.color}"></span>`,
        )
        .join("");
    for (const reset of document.querySelectorAll(
      `[data-family-reset="${im.id}"]`,
    ))
      reset.hidden =
        im.id === p.images[0]?.id ||
        !Object.keys(p.familyOverrides?.[im.id] || {}).length;
  }
  syncTextTypes();
}
function imageAction(name, label, title, action, id, disabled = false) {
  return `<button class="image-action ${action === "removeImage" ? "image-action-delete" : ""}" data-action="${action}" data-id="${esc(id)}" title="${title}" aria-label="${title}" ${disabled ? "disabled" : ""}>${icon(name)}${label ? `<span>${label}</span>` : ""}</button>`;
}
function imageHeading(im, i) {
  return `<aside class="group-heading image-info-card" data-image-card="${esc(im.id)}" aria-label="Bildinformationen · ${esc(im.name)}"><div class="image-card-summary"><span class="image-preview"><img data-image-preview="${esc(im.id)}" alt="" decoding="async"><span class="image-number"><span class="visually-hidden">Bild </span>${String(i + 1).padStart(2, "0")}</span></span><span class="image-caption"><strong title="${esc(im.name)}">${esc(im.name)}</strong></span></div><div class="image-card-body">${i === 0 ? '<div class="template-badge">Textvorlage für weitere Bilder</div>' : ""}<small class="image-metadata">${im.width} × ${im.height} px<br>${im.captureDate ? esc(im.captureDay) + " " + esc(im.captureDate) : "Kein Aufnahmedatum"}</small><div class="group-actions" role="group" aria-label="Bildaktionen">${imageAction("replace", "Bild ersetzen", "Bild ersetzen", "replace", im.id)}<div class="image-card-actions">${imageAction("up", "", "Bild nach oben", "imageUp", im.id, i === 0)}${imageAction("down", "", "Bild nach unten", "imageDown", im.id, i === p.images.length - 1)}${imageAction("trash", "", "Bild entfernen", "removeImage", im.id)}${imageAction("plus", "Format hinzufügen", "Format hinzufügen", "addBoard", im.id)}</div></div><div class="image-settings"><label class="image-copyright"><span class="image-field-label">Copyright</span><input data-copyright="${esc(im.id)}" aria-label="Copyright · ${esc(im.name)}" placeholder="Bildbeschreibung © Name" value="${esc(p.boards.find((b) => b.imageId === im.id)?.elements.copyright.text || "")}" /></label><div class="image-text-field"><span class="image-field-label">Optionen</span>${textTypePicker(im)}</div></div></div></aside>`;
}
document.addEventListener("click", (ev) => {
  document.querySelectorAll(".text-type-picker[open]").forEach((picker) => {
    if (!picker.contains(ev.target)) picker.open = false;
  });
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    const picker = document.activeElement.closest(".text-type-picker[open]");
    if (picker) {
      picker.open = false;
      picker.querySelector("summary").focus();
      ev.preventDefault();
    }
  }
});
function setImageTextType(imageId, key, enabled) {
  const first = imageId === p.images[0]?.id;
  p.textTypeOverrides ??= {};
  if (!first) {
    p.textTypeOverrides[imageId] ??= {};
    p.textTypeOverrides[imageId][key] = true;
  }
  for (const b of p.boards.filter(
    (b) =>
      b.imageId === imageId ||
      (first && !p.textTypeOverrides[b.imageId]?.[key]),
  )) {
    b.elements[key].enabled = enabled;
    b.elements[key].visible = enabled;
  }
  if (enabled) {
    selected = p.boards.find((b) => b.imageId === imageId)?.id;
    layer = key;
    step = "text";
  }
  syncTextTypes();
  renderPanel();
  updateDock();
  syncOverlays(true);
}
function syncTextTypes() {
  document.querySelectorAll("[data-text-type]").forEach((input) => {
    const e = p.boards.find((b) => b.imageId === input.dataset.image)?.elements[
      input.dataset.textType
    ];
    input.checked = !!e && (e.enabled ?? e.visible);
  });
  document.querySelectorAll("[data-text-picker]").forEach((picker) => {
    const active = postOptionSummary(
      p.boards.find((b) => b.imageId === picker.dataset.textPicker),
    );
    picker.querySelector("[data-text-summary]").textContent =
      active.join(" · ") || "Keine Optionen gewählt";
    picker.querySelector("[data-text-count]").textContent =
      active.length + " Optionen";
  });
}
function bindFamilyTools(root) {
  root.querySelectorAll("[data-family-mode]").forEach(
    (input) =>
      (input.onchange = () =>
        mutate(
          () =>
            setFamilyDesign(input.dataset.familyMode, {
              enabled: input.checked,
            }),
          false,
        )),
  );
  root.querySelectorAll("[data-family-shift]").forEach(
    (button) =>
      (button.onclick = () =>
        mutate(() => {
          const b = p.boards.find(
            (b) => b.imageId === button.dataset.familyShift,
          );
          setFamilyDesign(button.dataset.familyShift, {
            offset: ((b.family?.offset || 0) + 1) % 8,
          });
        }, false)),
  );
  root.querySelectorAll("[data-family-reset]").forEach(
    (button) =>
      (button.onclick = () =>
        mutate(() => {
          const id = button.dataset.familyReset;
          delete p.familyOverrides[id];
          const config = familyConfig(
            p.boards.find((b) => b.imageId === p.images[0]?.id)?.family,
          );
          for (const b of p.boards.filter((b) => b.imageId === id))
            applyFamilyBoard(b, config);
          refreshFamilyControls();
          renderPanel();
        }, false)),
  );
  refreshFamilyControls();
}
function render() {
  if (carouselRender()) return;
  const postAnchor = postCaptureAnchor();
  $("#savePSD").hidden = false;
  const s = surfaceScale();
  $("#empty").hidden = !!p.images.length;
  $("#addMoreImages").hidden = !p.images.length;
  $("#undo").disabled = !history.length;
  $("#redo").disabled = !future.length;
  for (const [id, value] of [
    ["projectCode", p.meta.code],
    ["projectName", p.meta.title],
  ])
    if (document.activeElement !== $("#" + id)) $("#" + id).value = value || "";
  $("#boardSpace").innerHTML = p.images
    .map(
      (im, i) =>
        `<section class="image-group" data-image-row="${esc(im.id)}">${imageHeading(im, i)}<div class="board-row">${p.boards
          .filter((b) => b.imageId === im.id)
          .map(
            (b) =>
              `<article class="board-card ${b.id === selected ? "selected" : ""}" data-id="${esc(b.id)}" style="width:${b.w * s}px"><div class="board-label"><span>${MKW.ratio(b.w, b.h)} <small>· ${b.w} × ${b.h}</small></span><button data-action="boardOptions" data-id="${esc(b.id)}" title="Zeichenfläche bearbeiten" aria-label="Zeichenfläche bearbeiten">•••</button></div><div class="board-surface" style="width:${b.w * s}px;height:${b.h * s}px"><canvas data-board="${esc(b.id)}" aria-label="${esc(im.name)} · ${MKW.ratio(b.w, b.h)}"></canvas><div class="interaction" data-board="${esc(b.id)}"></div></div></article>`,
          )
          .join("")}</div></section>`,
    )
    .join("");
  bindFamilyTools(document);
  document
    .querySelectorAll("[data-text-type]")
    .forEach(
      (input) =>
        (input.onchange = () =>
          mutate(
            () =>
              setImageTextType(
                input.dataset.image,
                input.dataset.textType,
                input.checked,
              ),
            false,
          )),
    );
  document.querySelectorAll("[data-copyright]").forEach((input) => {
    input.onfocus = () => checkpoint();
    input.onblur = () => {
      input.value = MKWLayout.copyrightText(input.value);
    };
    input.oninput = () => {
      const id = input.dataset.copyright,
        text = MKWLayout.copyrightText(input.value);
      p.textOverrides ??= {};
      p.textOverrides[id] ??= {};
      p.textOverrides[id].copyright = true;
      for (const b of p.boards.filter((b) => b.imageId === id)) {
        b.elements.copyright.text = text;
        b.elements.copyright.visible = !!text.trim();
      }
      if (board()?.imageId === id && $("#copyrightText"))
        $("#copyrightText").value = text;
      changed(false);
    };
  });
  document.querySelectorAll("canvas[data-board]").forEach(
    (c) =>
      (c.onpointerdown = (ev) => {
        const b = p.boards.find((b) => b.id === c.dataset.board);
        activateAtPoint(ev, b);
      }),
  );
  for (const canvas of document.querySelectorAll("canvas[data-board]"))
    canvas.ondblclick = (ev) => {
      const b = p.boards.find((b) => b.id === canvas.dataset.board);
      if (MKWPostAngleEditor.active(b)) {
        ev.preventDefault();
        MKWPostAngleEditor.select(b, true);
      }
    };
  postAfterRender(postAnchor);
  renderPanel();
  updateDock();
  draw();
}
function updateDock() {
  studioSyncZoomLimits(false, view, 0.2, 3);
  document.querySelectorAll(".dock [data-step]").forEach((b) => {
    b.classList.toggle("active", b.dataset.step === step);
    b.setAttribute("aria-current", b.dataset.step === step ? "true" : "false");
  });
  $("#viewValue").textContent =
    Math.round(MKWZoom.percent(view, studioZoomReference(false))) + "%";
}
function chooseStep(value) {
  if (editingText) editingText.el.blur();
  if (value === "import") {
    add();
    return;
  }
  step = value;
  if (value === "crop") {
    layer = "image";
    MKWPostAngleEditor.resetContent();
  }
  if (value === "text" && !MKWLayout.keys.includes(layer)) layer = "title";
  if (value === "logo") layer = "logo";
  updateDock();
  renderPanel();
  syncOverlays(true);
  draw();
  if (value === "export") openExport();
}
const postInspector = MKWPostInspector.create({
  read: () => ({
    project: p,
    board: board(),
    step,
    layer,
    advanced: studioPreferences.advanced,
    elementNames,
  }),
  actions: {
    selectLayer: (value) => {
      layer = value;
    },
    finishText: () => editingText?.el.blur(),
    mutate,
    fit,
    setFamilyDesign,
    checkpoint,
    setSharedText,
    setSharedTextSize,
    setImageTextType,
    syncOverlays,
    clone,
    hyphenation: () =>
      MKWTextHyphen.ensure(true).catch((error) =>
        MKWProjects.notice(error.message),
      ),
  },
  views: {
    inspector: (options) => MKWInspectorUI.present(options),
    query: $,
    esc,
    options,
    icon: studioIcon,
    fontOptions: (role) => studioFontOptions(role),
    familyTools,
    sponsorPanel: (b, panel) => sponsorPanel(b, panel),
    bindFamilyTools,
    justificationHint: (...args) => carouselJustificationHint(...args),
    textTypes,
    angle: (b, panel) => MKWPostAngleEditor.panel(b, panel),
    typography: (b, key, panel) => MKWTypography.post(b, key, panel),
    stack: (b, panel) => MKWPostTextStack.panel(b, panel),
    textKeys: () => MKWLayout.keys,
    copyrightColor: (colour) => MKWFamily.copyrightColor(colour),
  },
});
function renderPanel() {
  postInspector.render();
}
function beginText(b, key, el) {
  selected = b.id;
  layer = key;
  step = "text";
  updateDock();
  checkpoint();
  editingText = { boardId: b.id, key, el };
  el.classList.add("editing");
  MKWTypography.postInline(b, key, el);
  el.style.color =
    b.family?.enabled && key === "copyright"
      ? MKWFamily.copyrightColor(b.elements[key].color)
      : b.elements[key].color;
  document
    .querySelectorAll(".board-card")
    .forEach((c) => c.classList.toggle("selected", c.dataset.id === b.id));
  renderPanel();
  draw();
}
function setSharedText(b, key, text) {
  if (key === "copyright") text = MKWLayout.copyrightText(text);
  const first = p.images[0]?.id === b.imageId;
  p.textOverrides ??= {};
  if (!first) {
    p.textOverrides[b.imageId] ??= {};
    p.textOverrides[b.imageId][key] = true;
  }
  for (const target of p.boards) {
    if (
      first
        ? !p.textOverrides[target.imageId]?.[key] ||
          target.imageId === b.imageId
        : target.imageId === b.imageId
    ) {
      const targetText = target.elements[key];
      targetText.characterStyles = MKWText.forInput(
        targetText,
        text,
        target.w === b.w && target.h === b.h
          ? MKWTypography.pending(b.elements[key])
          : Object.fromEntries(
              Object.entries(
                MKWTypography.pending(b.elements[key]) || {},
              ).filter(([key]) => key !== "size"),
            ),
      );
      targetText.textStyles = carouselTextStylesForInput(targetText, text);
      targetText.text = text;
      target.elements[key].visible = target.elements[key].enabled ?? !!text;
    }
  }
  if (key === "copyright")
    document.querySelectorAll("[data-copyright]").forEach((input) => {
      if (document.activeElement !== input)
        input.value =
          p.boards.find((t) => t.imageId === input.dataset.copyright)?.elements
            .copyright.text || "";
    });
  if (first) {
    const metaKey = {
      date: "concert",
      title: "headline",
      subtitle: "subtitle",
    }[key];
    if (metaKey) p.meta[metaKey] = text;
  }
}
function setSharedTextSize(b, key, size) {
  const source = b.elements[key],
    first = b.imageId === p.images[0]?.id;
  for (const target of p.boards)
    if (
      target.w === b.w &&
      target.h === b.h &&
      (target.imageId === b.imageId ||
        (first && target.elements[key].text === source.text))
    )
      target.elements[key].size = size;
}
function inputText(b, key, el) {
  const text = carouselEditableValue(el).replace(/\r/g, "").replace(/\n$/, ""),
    range = carouselEditableSelection(el);
  setSharedText(b, key, text);
  el.style.textTransform =
    (key === "date" && b.elements.date.uppercase !== false) ||
    (key === "title" && b.elements.title.uppercase)
      ? "uppercase"
      : "";
  const input = $("#mainTextInput");
  if (input && document.activeElement !== input)
    input.value = b.elements[key].text;
  MKWTypography.track(b.elements[key], range.start, range.end);
  changed(false);
}
function endText(b, key, el, ev) {
  syncTextTypes();
  if (!editingText) return;
  editingText = null;
  el.classList.remove("editing");
  el.style.textTransform = "";
  syncOverlays(true);
  draw();
  if (!ev?.relatedTarget?.closest("#stepPanel, #studioPaintPicker"))
    renderPanel();
}
function add() {
  if (busy) return;
  replaceId = null;
  $("#files").multiple = true;
  $("#files").click();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function editBoardOptions(b) {
  selected = b.id;
  step = "crop";
  updateDock();
  $("#toolTitle").textContent = "Format anpassen";
  $("#toolEmpty").hidden = true;
  const panel = $("#stepPanel");
  panel.hidden = false;
  panel.innerHTML = `<section class="tool-section post-format-section"><h3>Abmessungen</h3><div class="post-format-dimensions"><label>Breite (px)<input id="width" type="number" min="16" max="10000" step="1" value="${b.w}"></label><label>Höhe (px)<input id="height" type="number" min="16" max="10000" step="1" value="${b.h}"></label></div><label>Verhalten beim Ändern<select id="resizeMode"><option value="canvas">Fläche ändern</option><option value="layout">Layout proportional skalieren</option></select></label><button id="resize" class="primary">Anwenden</button><div class="post-format-presets" role="group" aria-label="Standardformate"><button data-size="1080,1080">1:1</button><button data-size="1080,1920">9:16</button><button data-size="1080,1350">4:5</button></div></section><section class="tool-section post-format-section"><h3>Zeichenfläche verwalten</h3><div class="tool-button-grid"><button id="duplicate">Duplizieren</button><button id="deleteBoard">Löschen</button></div><div class="tool-button-grid post-format-order" role="group" aria-label="Reihenfolge der Formate"><button id="boardUp" aria-label="Format nach links">${studioIcon("back")}Nach links</button><button id="boardDown" aria-label="Format nach rechts">${studioIcon("front")}Nach rechts</button></div></section>`;
  MKWPostSafezone.bind(b, panel);
  on("resize", "click", () =>
    resize(+$("#width").value, +$("#height").value, $("#resizeMode").value),
  );
  panel.querySelectorAll("[data-size]").forEach(
    (el) =>
      (el.onclick = () => {
        const [w, h] = el.dataset.size.split(",").map(Number);
        resize(w, h, $("#resizeMode").value);
      }),
  );
  on("duplicate", "click", () =>
    mutate(() => {
      const n = clone(b);
      n.id = uid();
      p.boards.splice(p.boards.indexOf(b) + 1, 0, n);
      selected = n.id;
    }),
  );
  on("deleteBoard", "click", () =>
    mutate(() => {
      p.boards = p.boards.filter((x) => x.id !== b.id);
      selected = p.boards[0]?.id;
    }),
  );
  for (const [id, d] of [
    ["boardUp", -1],
    ["boardDown", 1],
  ])
    on(id, "click", () =>
      mutate(() => {
        const group = p.boards.filter((x) => x.imageId === b.imageId);
        reorder(group, b.id, d);
        let n = 0;
        p.boards = p.boards.map((x) =>
          x.imageId === b.imageId ? group[n++] : x,
        );
      }),
    );
  syncOverlays(true);
}
$("#boardSpace").onclick = async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === "replace") {
    replaceId = id;
    $("#files").multiple = false;
    $("#files").click();
    return;
  }
  if (action === "boardOptions") {
    editBoardOptions(p.boards.find((b) => b.id === id));
    return;
  }
  if (action === "removeImage") {
    const project = p,
      image = p.images.find((im) => im.id === id);
    if (
      !image ||
      !(await MKWFeedback.ask({
        title: "Bild entfernen?",
        message: `„${image.name}“ mit allen zugehörigen Zeichenflächen entfernen? Du kannst dies anschliessend rückgängig machen.`,
        confirm: "Bild entfernen",
        destructive: true,
        trigger: el,
      })) ||
      p !== project ||
      !p.images.includes(image)
    )
      return;
  }
  mutate(() => {
    if (action === "removeImage") {
      p.images = p.images.filter((i) => i.id !== id);
      p.boards = p.boards.filter((b) => b.imageId !== id);
      selected = p.boards[0]?.id;
    }
    if (action === "imageUp" || action === "imageDown")
      reorder(p.images, id, action === "imageUp" ? -1 : 1);
    if (action === "addBoard") {
      const im = p.images.find((i) => i.id === id),
        b = createBoard(im);
      const sibling = p.boards.find((b) => b.imageId === id);
      if (sibling)
        for (const key of ["date", "title", "subtitle", "copyright"]) {
          b.elements[key].text = sibling.elements[key].text;
          b.elements[key].visible = sibling.elements[key].visible;
          b.elements[key].enabled = sibling.elements[key].enabled;
        }
      p.boards.push(b);
      selected = b.id;
    }
  });
  if (action === "removeImage") {
    const target =
      document.querySelector(".image-info-card button:not(:disabled)") ||
      $("#emptyAdd");
    target?.focus();
  }
  if (action === "addBoard") {
    studioSetSidebar(true);
    editBoardOptions(board());
  }
};
document
  .querySelectorAll(".dock [data-step]")
  .forEach((el) => (el.onclick = () => chooseStep(el.dataset.step)));
$("#emptyAdd").onclick = add;
$("#addMoreImages").onclick = add;
$("#files").onchange = (ev) => importFiles([...ev.target.files]);
for (const [id, key] of [
  ["projectCode", "code"],
  ["projectName", "title"],
])
  on(id, "input", (ev) => {
    p.meta[key] = ev.target.value;
    touchMeta();
  });
window.addEventListener("dragover", (ev) => ev.preventDefault());
window.addEventListener("drop", (ev) => {
  ev.preventDefault();
  if (busy) return;
  replaceId = null;
  importFiles([...ev.dataTransfer.files]);
});
$("#undo").onclick = () => {
  if (editingText) editingText.el.blur();
  undo();
};
$("#redo").onclick = () => {
  if (editingText) editingText.el.blur();
  redo();
};
window.addEventListener("keydown", (ev) => {
  if (carouselActive() || busy || document.querySelector("dialog[open]"))
    return;
  if (
    (ev.metaKey || ev.ctrlKey) &&
    ev.key.toLowerCase() === "z" &&
    !document.activeElement.isContentEditable &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    ev.preventDefault();
    ev.shiftKey ? redo() : undo();
  }
});
function setView(v) {
  postSetZoom(v);
}
$("#zoomIn").onclick = () => studioStepZoom(20);
$("#zoomOut").onclick = () => studioStepZoom(-20);
$("#viewValue").onclick = () => studioSetZoomPercent(100);
$("#open").onclick = () => $("#projectFile").click();
$("#newproject").onclick = () => openProjectSetup();
$("#save").onclick = () => {
  if (editingText) editingText.el.blur();
  if (p.carousel) carouselEndText();
  $("#psdStatus").textContent = "";
  if (
    MKW.syncHeadingDate(
      p.meta,
      p.boards.find((b) => b.imageId === p.images[0]?.id)?.elements.date.text ||
        "",
    )
  )
    touchMeta();
  studioPrepareSave();
  $("#saveName").value = MKW.projectName(p.meta);
  $("#saveLocationHint").textContent = window.showSaveFilePicker
    ? "Im nächsten Schritt wählst du den Speicherort."
    : "Dieser Browser speichert per Download. Den Speicherort bestimmt deine Browser-Einstellung.";
  $("#saveDialog").showModal();
};
$("#closeSave").onclick = () => $("#saveDialog").close();
$("#logoFile").onchange = async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const finishLoading = MKWUIControls.loading("#status");
  status("Logo wird geladen …");
  try {
    const data = await dataURL(f);
    await image(data);
    mutate(() => {
      const l = { id: uid(), name: f.name, data };
      p.logos.push(l);
      if (board())
        for (const b of p.boards.filter((x) => x.imageId === board().imageId)) {
          b.elements.logo.source = l.id;
          b.elements.logo.visible = true;
        }
    });
    status("Logo eingefügt.");
  } catch (e) {
    status("Logo kann nicht geladen werden: " + e.message);
    await MKWFeedback.ask({
      title: "Logo konnte nicht geladen werden",
      message: e.message + "\nBitte wähle eine lesbare Bilddatei.",
      trigger: $("#customLogo"),
    });
  } finally {
    finishLoading();
  }
  ev.target.value = "";
};
const orderedBoards = () =>
  p.images.flatMap((im) => p.boards.filter((b) => b.imageId === im.id));
function bytesFromData(data) {
  const base64 = data.slice(data.indexOf(",") + 1);
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(base64);
  const binary = atob(base64),
    bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
$("#zip").onclick = () => runExport("zip");
$("#folder").onclick = () => runExport("folder");
$("#exportDialog").addEventListener("cancel", (ev) => {
  if (busy) ev.preventDefault();
});
window.addEventListener("beforeunload", (ev) => {
  if (savedRevision < revision) {
    ev.preventDefault();
    ev.returnValue = "";
  }
});

$("#workspace").addEventListener("pointerdown", (ev) => {
  if (
    ev.target.closest(
      ".board-card,.group-heading,button,input,select,textarea,details",
    )
  )
    return;
  if (editingText) editingText.el.blur();
  selectBoard(null);
  draw();
});
