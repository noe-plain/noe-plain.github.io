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
    if (el.dataset.step)
      el.innerHTML += `<span class="dock-label">${{ import: "Bilder", text: "Text", logo: "Logo", sponsors: "Sponsoren", crop: "Ausschnitt", export: "Export" }[el.dataset.step]}</span>`;
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
  return `<details class="text-type-picker" data-text-picker="${esc(im.id)}"><summary aria-label="Optionen auswählen · ${esc(im.name)}"><span class="text-selection" data-text-summary>${active.join(" · ") || "Keine Optionen gewählt"}</span><span class="text-count" data-text-count>${active.length} Optionen</span>${studioIcon("down", "picker-chevron")}</summary><div class="text-type-options" role="group" aria-label="Optionen · ${esc(im.name)}"><div class="post-text-options" role="group" aria-label="Textoptionen"><span class="post-options-heading">Textoptionen</span>${textTypes.map(([key, label]) => `<label class="post-option-row"><input type="checkbox" data-text-type="${key}" data-image="${esc(im.id)}" ${b && (b.elements[key].enabled ?? b.elements[key].visible) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div><hr class="post-options-divider">${MKWPostAngleEditor.options(im)}${familyPicker(im)}<hr class="post-options-divider">${sponsorOptions(im)}</div></details>`;
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
  return `<aside class="group-heading image-info-card" data-image-card="${esc(im.id)}" aria-label="Bildinformationen · ${esc(im.name)}"><div class="image-card-summary"><span class="image-preview"><img data-image-preview="${esc(im.id)}" alt="" decoding="async"><span class="image-number" aria-label="Bild ${i + 1}">${String(i + 1).padStart(2, "0")}</span></span><span class="image-caption"><strong title="${esc(im.name)}">${esc(im.name)}</strong></span></div><div class="image-card-body">${i === 0 ? '<div class="template-badge">Textvorlage für weitere Bilder</div>' : ""}<small class="image-metadata">${im.width} × ${im.height} px<br>${im.captureDate ? esc(im.captureDay) + " " + esc(im.captureDate) : "Kein Aufnahmedatum"}</small><div class="group-actions" role="group" aria-label="Bildaktionen">${imageAction("replace", "Bild ersetzen", "Bild ersetzen", "replace", im.id)}<div class="image-card-actions">${imageAction("up", "", "Bild nach oben", "imageUp", im.id, i === 0)}${imageAction("down", "", "Bild nach unten", "imageDown", im.id, i === p.images.length - 1)}${imageAction("plus", "Format", "Zeichenfläche hinzufügen", "addBoard", im.id)}${imageAction("trash", "", "Bild entfernen", "removeImage", im.id)}</div></div><div class="image-settings"><label class="image-copyright"><span class="image-field-label">Copyright</span><input data-copyright="${esc(im.id)}" aria-label="Copyright · ${esc(im.name)}" placeholder="Bildbeschreibung © Name" value="${esc(p.boards.find((b) => b.imageId === im.id)?.elements.copyright.text || "")}" /></label><div class="image-text-field"><span class="image-field-label">Optionen</span>${textTypePicker(im)}</div></div></div></aside>`;
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
  document.querySelectorAll(".dock [data-step]").forEach((b) => {
    b.classList.toggle("active", b.dataset.step === step);
    b.setAttribute("aria-current", b.dataset.step === step ? "true" : "false");
  });
  $("#viewValue").textContent = Math.round(view * 100) + "%";
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
function renderPanel() {
  const b = board(),
    panel = $("#stepPanel");
  panel.hidden = !b || step === "export";
  $("#toolTitle").textContent = !b
    ? "Dein Bild gestalten"
    : {
        text: "Text gestalten",
        logo: "Logo auswählen",
        sponsors: "Sponsorenleiste",
        crop: "Bildausschnitt",
        export: "Vorschau & Export",
      }[step] || "Dein Bild gestalten";
  $("#toolEmpty").hidden = !!b && step !== "export";
  $("#toolEmpty").textContent =
    step === "export"
      ? "Wähle im Exportfenster deine Formate und Dateinamen."
      : "Wähle ein Bild und ein Werkzeug in der Leiste.";
  if (!b) return;
  if (layer === "postAngle" && !b.angle?.enabled) layer = "image";
  if (step === "crop" && layer === "postAngle") {
    MKWPostAngleEditor.panel(b, panel);
    return;
  }
  if (step === "crop") {
    panel.innerHTML = `<div class="panel-row"><section class="tool-section"><h3>Bildausschnitt</h3><div class="tool-button-grid"><button data-fit="fill" title="Bild so vergrössern, dass es die ganze Fläche bedeckt">Fläche füllen</button><button data-fit="fit" title="Das gesamte Bild innerhalb der Zeichenfläche zeigen">Ganzes Bild</button></div><label>Bildgrösse (%) <input id="scale" aria-label="Bildskalierung in Prozent" type="number" min="0.1" step="0.1" value="${(b.image.scale * 100).toFixed(1)}"></label><div class="tool-button-grid"><button data-fit="center">Zentrieren</button><button data-fit="original">Originalgrösse</button></div></section><section class="tool-section"><h3>Gestaltung</h3><label>Drehung (°) <input id="angle" type="number" value="${b.image.angle}"></label><div class="tool-button-grid"><button id="flipX" title="Links und rechts tauschen">${studioIcon("flip")}Horizontal</button><button id="flipY" title="Oben und unten tauschen">${studioIcon("flip", "flip-vertical")}Vertikal</button></div><button data-fit="reset" class="tool-secondary">Bildausschnitt zurücksetzen</button></section><section class="tool-section"><h3>Hintergrund</h3><label>Zeichenflächenfarbe <input id="bg" aria-label="Zeichenflächenfarbe" type="color" value="${b.family?.enabled ? b.family.background : b.bg}"></label></section></div>`;
    panel.querySelectorAll("[data-fit]").forEach(
      (el) =>
        (el.onclick = () => {
          mutate(() => fit(b, el.dataset.fit), false);
          renderPanel();
        }),
    );
    on("scale", "change", (ev) =>
      mutate(
        () =>
          (b.image.scale = Math.max(
            0.001,
            Math.min(100, +ev.target.value / 100 || 0.001),
          )),
        false,
      ),
    );
    on("angle", "change", (ev) =>
      mutate(() => (b.image.angle = Number(ev.target.value) || 0), false),
    );
    for (const key of ["flipX", "flipY"])
      on(key, "click", () => mutate(() => (b.image[key] *= -1), false));
    on("bg", "change", (ev) =>
      mutate(() => {
        if (b.family?.enabled)
          setFamilyDesign(b.imageId, { background: ev.target.value });
        else b.bg = ev.target.value;
      }, false),
    );
  } else if (step === "text" && studioPreferences.advanced) {
    if (!MKWLayout.keys.includes(layer)) layer = "title";
    MKWTypography.post(b, layer, panel);
  } else if (step === "text") {
    const e = b.elements[layer] || b.elements.title,
      first = p.images[0]?.id === b.imageId,
      custom = p.textOverrides?.[b.imageId]?.[layer];
    panel.innerHTML = `<div class="panel-row text-tools"><section class="tool-section"><h3>Inhalt</h3><select id="textLayer" aria-label="Text auswählen">${options(
      Object.entries(elementNames).filter(([k]) => k !== "logo"),
      layer,
    )}</select><div id="textContentField"></div><label><input id="textVisible" type="checkbox" ${e.visible ? "checked" : ""}> Auf dem Bild anzeigen</label>${!first && custom ? '<button id="resetText">Text vom ersten Bild übernehmen</button>' : ""}</section><section class="tool-section"><h3>Gestaltung</h3><label class="tool-stacked">Schrift<select id="fontRole" aria-label="Schrift">${studioFontOptions(e.role)}</select></label><label>Schriftgrösse (px) <input id="textSize" type="number" min="1" max="5000" value="${Math.round(e.size)}"></label><label class="tool-stacked">Ausrichtung<select id="textAlign" aria-label="Textausrichtung" ${layer === "copyright" ? "disabled" : ""}>${options(
      [
        ["left", "Links"],
        ["center", "Zentriert"],
        ["right", "Rechts"],
        ["justify", "Blocksatz"],
      ],
      e.align,
    )}</select></label>${
      b.family?.enabled && layer === "copyright"
        ? `<label>Copyright-Farbe<select id="textColor" aria-label="Copyright-Farbe">${options(
            [
              ["#000000", "Schwarz"],
              ["#ffffff", "Weiss"],
            ],
            MKWFamily.copyrightColor(e.color),
          )}</select></label>`
        : `<label ${b.family?.enabled ? "hidden" : ""}>Textfarbe<input id="textColor" aria-label="Textfarbe" type="color" value="${e.color}"></label>`
    }${b.family?.enabled && layer !== "copyright" ? "" : ""}<label ${!["date", "title"].includes(layer) ? "hidden" : ""}><input id="uppercase" type="checkbox" ${layer === "date" ? (e.uppercase !== false ? "checked" : "") : e.uppercase ? "checked" : ""}> ${layer === "date" ? "Übertitel in Grossbuchstaben" : "Konzerttitel in Grossbuchstaben"}</label></section></div>`;
    if (layer === "copyright") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = "copyrightText";
      input.setAttribute("aria-label", "Copyright eingeben");
      input.placeholder = "Bildbeschreibung © Name";
      input.value = e.text;
      input.onfocus = () => checkpoint();
      input.oninput = () => {
        setSharedText(b, "copyright", input.value.replace(/[\r\n]+/g, " "));
        changed(false);
      };
      panel.querySelector("#textContentField").append(input);
    } else {
      const input = document.createElement("textarea");
      input.id = "mainTextInput";
      input.rows = 3;
      input.setAttribute("aria-label", elementNames[layer] + " eingeben");
      input.placeholder = elementNames[layer] + " eingeben …";
      input.value = e.text;
      input.onfocus = () => checkpoint();
      input.oninput = () => {
        setSharedText(b, layer, input.value);
        changed(false);
      };
      panel.querySelector("#textContentField").append(input);
    }
    on("textLayer", "change", (ev) => {
      if (editingText) editingText.el.blur();
      layer = ev.target.value;
      renderPanel();
      syncOverlays(true);
    });
    on("textSize", "input", (ev) =>
      mutate(
        () =>
          setSharedTextSize(
            b,
            layer,
            Math.max(1, Math.min(5000, +ev.target.value || 1)),
          ),
        false,
      ),
    );
    for (const [id, key] of [
      ["textColor", "color"],
      ["textAlign", "align"],
      ["fontRole", "role"],
      ["textVisible", "visible"],
    ])
      on(id, "change", (ev) =>
        mutate(() => {
          if (key === "visible" && textTypes.some(([k]) => k === layer))
            setImageTextType(b.imageId, layer, ev.target.checked);
          else {
            e[key] = key === "visible" ? ev.target.checked : ev.target.value;
            if (key === "align" && e.textStyles)
              for (const style of e.textStyles) if (style) delete style.align;
          }
          if (key === "align") renderPanel();
        }, false),
      );
    on("uppercase", "change", (ev) =>
      mutate(() => {
        if (layer === "date") {
          const first = b.imageId === p.images[0]?.id;
          for (const target of p.boards)
            if (
              target.imageId === b.imageId ||
              (first && target.elements.date.text === e.text)
            )
              target.elements.date.uppercase = ev.target.checked;
          if (first) p.meta.headingUppercase = ev.target.checked;
          return;
        }
        p.meta.uppercase = ev.target.checked;
        for (const x of p.boards)
          if (
            x.imageId === b.imageId ||
            (b.imageId === p.images[0]?.id && x.elements.title.text === e.text)
          )
            x.elements.title.uppercase = ev.target.checked;
      }, false),
    );
    on("resetText", "click", () =>
      mutate(() => {
        delete p.textOverrides[b.imageId][layer];
        const template = p.boards.find((x) => x.imageId === p.images[0].id)
          ?.elements[layer];
        for (const x of p.boards.filter((x) => x.imageId === b.imageId)) {
          x.elements[layer].text = template?.text || "";
          x.elements[layer].visible =
            x.elements[layer].enabled !== false && (template?.visible || false);
        }
      }, false),
    );
    if (b.family?.enabled)
      panel
        .querySelector(".panel-row")
        .insertAdjacentHTML("beforeend", familyTools(b));
  } else if (step === "sponsors") {
    panel.innerHTML = "";
    sponsorPanel(b, panel);
  } else if (step === "logo") {
    const e = b.elements.logo;
    panel.innerHTML = `<div class="panel-row logo-panel"><button class="logo-choice ${e.source === "black" && e.visible ? "active" : ""}" data-logo="black" title="Musikkollegium Schwarz"><img src="mkw-logo-bold-pos.svg" alt="Musikkollegium Schwarz"></button><button class="logo-choice dark ${e.source === "white" && e.visible ? "active" : ""}" data-logo="white" title="Musikkollegium Weiss"><img src="mkw-logo-bold-neg.svg" alt="Musikkollegium Weiss"></button>${p.logos
      .filter((l) => l.purpose !== "sponsor")
      .map(
        (l) =>
          `<div class="custom-logo-item"><button class="logo-choice ${e.source === l.id && e.visible ? "active" : ""}" data-logo="${esc(l.id)}" title="${esc(l.name)}"><img src="${esc(l.data)}" alt="${esc(l.name)}"></button><button class="remove-custom-logo" data-remove-logo="${esc(l.id)}" aria-label="Eigenes Logo entfernen: ${esc(l.name)}" title="Eigenes Logo entfernen">×</button></div>`,
      )
      .join(
        "",
      )}<div class="tool-button-grid"><button id="customLogo">Logo hinzufügen</button><button id="noLogo">Logo ausblenden</button></div><section class="tool-section"><h3>Auf weitere Bilder anwenden</h3><button id="allLogos">Logo auf alle Bilder übertragen</button></section></div>`;
    panel.querySelectorAll("[data-remove-logo]").forEach(
      (el) =>
        (el.onclick = () =>
          mutate(() => {
            const id = el.dataset.removeLogo;
            if (
              id === "black" ||
              id === "white" ||
              !p.logos.some((l) => l.id === id)
            )
              return;
            p.logos = p.logos.filter((l) => l.id !== id);
            for (const target of p.boards)
              if (target.elements.logo.source === id) {
                target.elements.logo.source = "black";
                target.elements.logo.visible = false;
              }
          })),
    );
    panel.querySelectorAll("[data-logo]").forEach(
      (el) =>
        (el.onclick = () =>
          mutate(() => {
            for (const x of p.boards.filter((x) => x.imageId === b.imageId)) {
              x.elements.logo.source = el.dataset.logo;
              x.elements.logo.visible = true;
            }
          })),
    );
    on("customLogo", "click", () => $("#logoFile").click());
    on("noLogo", "click", () =>
      mutate(() => {
        for (const x of p.boards.filter((x) => x.imageId === b.imageId))
          x.elements.logo.visible = false;
      }),
    );
    on("allLogos", "click", () =>
      mutate(() => {
        for (const x of p.boards) {
          const scale = x.w / b.w;
          x.elements.logo = {
            ...clone(e),
            x: e.x * scale,
            y: e.y * scale,
            size: e.size * scale,
          };
        }
      }),
    );
  }
  if (step === "text") {
    if (!studioPreferences.advanced && b.elements[layer]?.align === "justify") {
      panel.insertAdjacentHTML(
        "beforeend",
        carouselJustificationHint(
          false,
          "data-post-hyphenate",
          b.elements[layer].hyphenate !== false,
        ),
      );
      panel.querySelector("[data-post-hyphenate]").onchange = (ev) => {
        const enabled = ev.target.checked;
        mutate(() => {
          b.elements[layer].hyphenate = enabled;
        });
        if (enabled)
          MKWTextHyphen.ensure(true).catch((error) =>
            MKWProjects.notice(error.message),
          );
      };
    }
    MKWPostTextStack.panel(b, panel);
  }
  bindFamilyTools(panel);
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
  panel.innerHTML = `<div class="panel-row"><label>Breite <input id="width" type="number" value="${b.w}"></label><label>Höhe <input id="height" type="number" value="${b.h}"></label><select id="resizeMode"><option value="canvas">Fläche ändern</option><option value="layout">Layout proportional skalieren</option></select><button id="resize">Anwenden</button><button data-size="1080,1080">1:1</button><button data-size="1080,1920">9:16</button><button data-size="1080,1350">4:5</button><button id="duplicate">Duplizieren</button><button id="boardUp">←</button><button id="boardDown">→</button><button id="deleteBoard">Löschen</button></div>`;
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
$("#boardSpace").onclick = (ev) => {
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
  if (
    action === "removeImage" &&
    !confirm("Dieses Bild mit seinen Zeichenflächen entfernen?")
  )
    return;
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
$("#zoomIn").onclick = () => setView(view + 0.2);
$("#zoomOut").onclick = () => setView(view - 0.2);
$("#viewValue").onclick = () => setView(1);
$("#open").onclick = () => $("#projectFile").click();
$("#newproject").onclick = () => openProjectSetup();
$("#save").onclick = () => {
  if (editingText) editingText.el.blur();
  if (p.carousel) carouselEndText();
  $("#psdStatus").textContent = "";
  const inferred = MKW.headingDate(
    p.boards.find((b) => b.imageId === p.images[0]?.id)?.elements.date.text ||
      "",
  );
  if (inferred) p.meta.date = inferred;
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
  } catch (e) {
    alert("Logo kann nicht geladen werden: " + e.message);
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
