"use strict";
// Designer sidebar: see ARCHITECTURE.md for ownership and load order.
function carouselUpdateWarning(o) {
  const warning = $("#carouselProperties .carousel-warning");
  if (warning) warning.textContent = carouselWarning(o);
}

function carouselPresentInspector() {
  const items = carouselSelected(),
    o = items.at(-1),
    slide = carouselUI.slide,
    title = carouselPathDraft
      ? "Pfad zeichnen"
      : carouselUI.tool === "builder"
        ? "Formkonstrukteur"
        : items.length > 1
          ? `${items.length} Elemente`
          : o?.name || (slide !== null ? `Slide ${slide + 1}` : "Dein Design"),
    subtitle = o
      ? `${carouselToolNames[o.type] || "Element"} · ${carouselObjectLocked(o) ? "Gesperrt" : carouselUI.content ? "Bildinhalt bearbeiten" : "Element bearbeiten"}`
      : `${p.carousel.n} Slides · ${p.carousel.w} × ${p.carousel.h} px`;
  MKWInspectorUI.present({
    root: $("#carouselSidebar"),
    panel: $("#carouselProperties"),
    title,
    subtitle,
    scope: o?.imageSourceId
      ? "Bild mit dem Hintergrund verknüpft. Ersetzen löst die Verbindung."
      : "",
    icon: studioIcon(o?.type || (carouselPathDraft ? "path" : "builder")),
    key: [
      p.projectId,
      items.map((o) => o.id).join(),
      carouselUI.content,
      slide,
      !!carouselPathDraft,
      carouselUI.tool === "builder",
    ].join(":"),
    layers: $("#carouselSidebar .carousel-layers-panel"),
  });
}

function carouselPanel() {
  carouselCloseEffectMenu();
  carouselCloseEffectEditor();
  carouselCloseLayerMenu();
  if (!carouselActive() || !$("#carouselProperties")) return;
  const c = p.carousel,
    items = carouselSelected(),
    o = items.at(-1),
    panel = $("#carouselProperties");
  panel.classList.toggle(
    "is-text-inspector",
    items.length === 1 && o?.type === "text",
  );
  if (carouselPathDraft) {
    carouselDraftPanel(panel);
    carouselLayerPanel();
    carouselPresentInspector();
    return;
  }
  if (carouselUI.tool === "builder") {
    carouselConstructorPanel(panel);
    carouselLayerPanel();
    carouselPresentInspector();
    return;
  }
  const number = (key, label, min = 0, max = 100000) =>
    `<label>${label}<input data-prop="${key}" type="number" value="${Math.round((carouselIsVector(o) && ["x", "y", "w", "h"].includes(key) ? (["w", "h"].includes(key) ? carouselLocalBounds(o)[key] : carouselObjectBounds(o)[key]) : o[key]) * 100) / 100}" min="${min}" max="${max}" step="any"></label>`;
  const color = (key, label) =>
    `<label>${label}<input data-prop="${key}" type="color" value="${esc(o[key])}"></label>`;
  const select = (key, label, values) =>
    `<label>${label}<select data-prop="${key}">${options(values, o[key])}</select></label>`;
  const section = (title, body) =>
    `<section class="carousel-property-section"><h4>${title}</h4>${body}</section>`;
  if (!items.length && carouselUI.slide !== null) {
    carouselSlidePanel(panel);
    carouselLayerPanel();
    carouselPresentInspector();
    return;
  }
  if (items.length > 1) {
    panel.innerHTML = `<h3>${items.length} Elemente ausgewählt</h3><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button><button id="carouselDelete">Entfernen</button></div>`;
    $("#carouselDuplicate").onclick = carouselDuplicate;
    $("#carouselDelete").onclick = carouselDelete;
  } else if (o) {
    panel.innerHTML = `<div class="carousel-section-heading"><h3>${esc(o.name)}</h3><span>${carouselObjectLocked(o) ? "Gesperrt" : carouselUI.content ? "Bildinhalt" : "Eigenschaften"}</span></div>${carouselHasImage(o) ? '<button id="carouselReplace" class="primary carousel-place-image">Bild platzieren / ersetzen</button>' : ""}${section("Position & Grösse", `<div class="carousel-fields">${number("x", "X", -100000)}${number("y", "Y", -100000)}${number("w", "Breite", 1)}${number("h", "Höhe", 1)}</div>`)}
 ${section(
   "Gestaltung",
   `<div class="carousel-fields carousel-appearance">${select(
     "blend",
     "Mischmodus",
     [
       ["source-over", "Normal"],
       ["multiply", "Multiplizieren"],
       ["screen", "Negativ multiplizieren (Screen)"],
     ],
   )}<label class="carousel-slider"><span>Deckkraft <output>${Math.round(o.opacity * 100)} %</output></span><input data-prop="opacity" type="range" min="0" max="100" step="1" value="${Math.round(o.opacity * 100)}"></label></div>`,
 )}
 ${o.imageSourceId ? `<p class="carousel-linked-source">Bild aus ${esc(c.objects.find((s) => s.id === o.imageSourceId)?.name || "Hintergrund")} · Ersetzen macht das Winkelbild unabhängig.</p>` : ""}
 ${o.type === "text" ? carouselTextContentPanel(o) + (studioPreferences.advanced ? MKWTypography.panel() : carouselTextFontPanel(o) + carouselTypePanel(o) + carouselTextStylePanel(o)) + carouselTextFramePanel(o) : ""}
 ${carouselIsVector(o) ? carouselVectorPanel(o) : ""}
 ${o.type === "gradient" ? section("Verlauf", studioPaintCards(o) + '<button id="carouselGradientEdit">Verlauf auf der Fläche bearbeiten</button>') : ""}
 ${
   o.type === "angle"
     ? section(
         "Winkel",
         select(
           "direction",
           "Richtung",
           MKWAnglePolicy.choices(o.direction).map((key) => [
             key,
             {
               up: "Oben",
               left: "Links",
               down: "Unten",
               right: "Rechts (bisher)",
             }[key],
           ]),
         ) +
           `<div class="carousel-fields">${number("thickness", "Schenkelbreite", 1)}${number("glow", "Schein · px", 0, 200)}${color("glowColor", "Scheinfarbe")}${number("glowAlpha", "Intensität", 0, 1)}</div>`,
       )
     : ""
 }
 ${["image", "gradient"].includes(o.type) ? section("Rahmenform", carouselFramePicker(o) + `<button id="carouselFrameEdit" aria-pressed="${carouselUI.framePoints}">${carouselUI.framePoints ? "Punktbearbeitung beenden" : "Rahmenpunkte bearbeiten"}</button><button id="carouselFrameReset">Rechteck zurücksetzen</button>`) : ""}
 ${carouselHasImage(o) ? section("Inhalt", '<div class="carousel-fields">' + number("panX", "Ausschnitt X", -100000) + number("panY", "Ausschnitt Y", -100000) + `</div><div class="carousel-flip-controls" role="group" aria-label="Bild spiegeln">${["flipX", "flipY"].map((key, i) => `<button data-flip="${key}" aria-pressed="${o[key] === -1}" title="${i ? "Vertikal" : "Horizontal"} spiegeln">${studioIcon("flip", i ? "flip-vertical" : "")}<span>${i ? "Vertikal" : "Horizontal"}</span></button>`).join("")}</div><button id="carouselContentEdit">${carouselUI.content ? "Zurück zum Rahmen" : "Bildausschnitt bearbeiten"}</button>` + '<button id="carouselImageFit">Rahmen füllen</button>') : ""}
 ${
   o.type === "logo"
     ? section(
         "MKW Logo",
         select("source", "Farbe", [
           ["white", "Weiss"],
           ["black", "Schwarz"],
           ...p.logos.map((l) => [l.id, l.name]),
         ]) +
           '<button id="carouselLogoReplace" class="carousel-place-image">Logo ersetzen …</button>',
       )
     : ""
 }
 <p class="carousel-warning" role="status">${carouselWarning(o)}</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button>${o.type !== "logo" ? '<button id="carouselDelete">Entfernen</button>' : ""}</div>`;
    const order = {
        Inhalt: 0,
        Text: 0,
        Schrift: 5,
        "Absätze & Abstände": 10,
        Zeichen: 6,
        "Text im Rahmen": 8,
        Form: 0,
        Pfad: 0,
        "Fläche & Kontur": 10,
        Linienenden: 15,
        Verlauf: 20,
        Winkel: 20,
        Rahmenform: 30,
        "MKW Logo": 0,
        Gestaltung: 50,
        "Position & Grösse": 60,
      },
      warning = panel.querySelector(".carousel-warning");
    [...panel.children]
      .filter((el) => el.classList.contains("carousel-property-section"))
      .sort(
        (a, b) =>
          (a.classList.contains("typography-inspector")
            ? 5
            : (order[a.querySelector("h4")?.textContent] ?? 10)) -
          (b.classList.contains("typography-inspector")
            ? 5
            : (order[b.querySelector("h4")?.textContent] ?? 10)),
      )
      .forEach((section) => panel.insertBefore(section, warning));
    if (["image", "angle"].includes(o.type))
      panel.querySelector("#carouselImageFit")?.after(warning);
    const primary = panel.querySelector("#carouselGradientEdit");
    if (primary) {
      primary.classList.add("carousel-place-image");
      panel.querySelector(".carousel-section-heading").after(primary);
    }
    panel.querySelectorAll("[data-prop]").forEach((input) => {
      input.disabled = carouselObjectLocked(o) || input.disabled;
      input.onfocus = () => {
        carouselUI.propertyUndo = false;
      };
      input.oninput = () => {
        let value =
          ["number", "range"].includes(input.type) ||
          ["flipX", "flipY"].includes(input.dataset.prop)
            ? Number(input.value)
            : input.value;
        if (input.type === "number") {
          if (!MKWFields.validate(input, true) || !Number.isFinite(value))
            return;
          value = Math.max(+input.min, Math.min(+input.max, value));
        }
        if (input.type === "range") {
          input.closest("label").querySelector("output").value = value + " %";
          value = input.dataset.transparency ? 1 - value / 100 : value / 100;
        }
        if (!carouselUI.propertyUndo) {
          checkpoint();
          carouselUI.propertyUndo = true;
        }
        const oldRatio = o.h / o.w;
        if (o.type === "text" && input.dataset.prop === "text") {
          o.textStyles = carouselTextStylesForInput(o, value);
          o.characterStyles = carouselCharacterStylesForInput(o, value);
        }
        if (
          carouselIsVector(o) &&
          ["x", "y", "w", "h"].includes(input.dataset.prop)
        )
          carouselSetBoundsValue(o, input.dataset.prop, value);
        else o[input.dataset.prop] = value;
        if (o.type === "angle") {
          if (input.dataset.prop === "direction") {
            const tall = o.h > o.w;
            if (MKWAnglePolicy.horizontal(value) !== tall)
              [o.w, o.h] = [o.h, o.w];
          } else if (input.dataset.prop === "w")
            o.h = MKWAnglePolicy.horizontal(o.direction) ? o.w * 2 : o.w / 2;
          else if (input.dataset.prop === "h")
            o.w = MKWAnglePolicy.horizontal(o.direction) ? o.h / 2 : o.h * 2;
        }
        if (o.type === "logo" && input.dataset.prop === "source")
          carouselLogoImage(o).then((im) => {
            o.h = (o.w * im.height) / im.width;
            changed(false);
            carouselPanel();
          });
        if (o.type === "logo") {
          if (input.dataset.prop === "w") o.h = o.w * oldRatio;
          if (input.dataset.prop === "h") o.w = o.h / oldRatio;
        }
        if (o.type === "gradient" && input.dataset.prop === "rotation") {
          delete o.gradientStart;
          delete o.gradientEnd;
        }
        changed(false);
        carouselUpdateWarning(o);
        if (carouselUI.editing?.id === o.id && input.dataset.prop === "text")
          carouselFormatEditable(carouselUI.editing.el, o);
        if (
          o.type === "text" &&
          ["text", "size", "font", "w"].includes(input.dataset.prop)
        ) {
          if (input.dataset.prop === "text")
            carouselSetTextContext(o, input.selectionStart);
          carouselRefreshTextStyles(o);
        }
        for (const key of ["x", "y", "w", "h"]) {
          const field = panel.querySelector(`[data-prop="${key}"]`);
          if (field && field !== input)
            field.value =
              Math.round(
                (carouselIsVector(o) && ["x", "y", "w", "h"].includes(key)
                  ? ["w", "h"].includes(key)
                    ? carouselLocalBounds(o)[key]
                    : carouselObjectBounds(o)[key]
                  : o[key]) * 100,
              ) / 100;
        }
      };
    });
    panel.querySelectorAll("[data-transparent]").forEach((input) => {
      input.disabled = carouselObjectLocked(o);
      input.onchange = () => {
        checkpoint();
        const key = input.dataset.transparent;
        o[key] = input.checked ? 0.5 : 1;
        changed(false);
        carouselPanel();
      };
    });
    $("#carouselDuplicate").onclick = carouselDuplicate;
    if ($("#carouselDelete")) $("#carouselDelete").onclick = carouselDelete;
    if (carouselIsVector(o)) carouselBindVectorPanel(o, panel);
    studioBindPaintCards(panel, o);
    if ($("#carouselReplace"))
      $("#carouselReplace").onclick = () => carouselFile(o.id);
    if ($("#carouselTextEdit"))
      MKWInlineText.bindPanel({
        host: panel.querySelector(".type-content"),
        field: panel.querySelector("[data-prop=text]"),
        button: $("#carouselTextEdit"),
        active: () => carouselUI.editing?.id === o.id,
        locked: carouselObjectLocked(o),
        start: (selection) => {
          const range = selection || MKWTypography.range(o);
          carouselEditText(o);
          if (range && carouselUI.editing?.id === o.id) {
            MKWTypography.restoreSelection(carouselUI.editing.el, range);
            carouselTrackTextCaret(o, carouselUI.editing.el);
          }
        },
        stop: () => carouselEndText(),
      });
    if (o.type === "text") {
      carouselBindTextStyles(o, panel);
      carouselBindTypography(o, panel);
      if (studioPreferences.advanced) MKWTypography.carousel(o, panel);
      else carouselTypographyNavigation(panel);
      carouselBindTextAlignment(o, panel);
      const content = panel.querySelector("[data-prop=text]");
      content.onselect =
        content.onkeyup =
        content.onclick =
          () => {
            carouselTypeRange(o, content.selectionStart, content.selectionEnd);
            if (carouselSetTextContext(o, content.selectionStart))
              carouselRefreshTextStyles(o);
          };
    }
    panel.querySelectorAll("[data-text-anchor]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (
            carouselObjectLocked(o) ||
            o.textAnchor === btn.dataset.textAnchor
          )
            return;
          checkpoint();
          o.textAnchor = btn.dataset.textAnchor;
          changed(false);
          carouselPanel();
        }),
    );
    if ($("#carouselGradientEdit"))
      $("#carouselGradientEdit").onclick = () => carouselTool("gradient");
    if ($("#carouselContentEdit")) {
      const content = $("#carouselContentEdit");
      content.setAttribute("aria-pressed", String(!!carouselUI.content));
      content.textContent = carouselUI.content
        ? "Zurück zum Rahmen"
        : "Bildinhalt bearbeiten";
      const replace = panel.querySelector("#carouselReplace");
      if (replace) replace.after(content);
      content.onclick = () =>
        carouselTool(carouselUI.content ? "select" : "content");
    }
    panel.querySelectorAll("[data-flip]").forEach(
      (button) =>
        (button.onclick = () => {
          checkpoint();
          const key = button.dataset.flip;
          o[key] = o[key] === -1 ? 1 : -1;
          changed(false);
          carouselPanel();
        }),
    );
    if ($("#carouselImageFit"))
      $("#carouselImageFit").onclick = () => {
        checkpoint();
        o.scale = 1;
        o.panX = o.panY = 0;
        changed(false);
        carouselPanel();
      };
    panel
      .querySelectorAll("[data-frame-slot]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            carouselToggleFrameSlot(o, +button.dataset.frameSlot)),
      );
    if ($("#carouselFrameEdit"))
      $("#carouselFrameEdit").onclick = () => {
        carouselUI.framePoints = !carouselUI.framePoints;
        carouselUI.content = false;
        carouselUI.tool = "select";
        carouselToolUI();
        carouselRefresh();
        carouselPanel();
      };
    if ($("#carouselFrameReset"))
      $("#carouselFrameReset").onclick = () => {
        checkpoint();
        delete o.framePoints;
        delete o.framePointSide;
        delete o.framePointSlots;
        carouselUI.framePoints = false;
        changed(false);
        carouselPanel();
      };
    if ($("#carouselLogoReplace"))
      $("#carouselLogoReplace").onclick = () => carouselReplaceLogo(o);
    if (carouselObjectLocked(o))
      panel
        .querySelectorAll("button:not(#carouselDuplicate)")
        .forEach((btn) => (btn.disabled = true));
  } else {
    panel.innerHTML = `<h3>Dein Design gestalten</h3><p>Wähle ein Element auf der Fläche oder füge etwas Neues hinzu.</p><div class="carousel-quick-start">${["image", "text", "gradient", "angle", ...(studioPreferences.advanced ? ["path", "shape"] : [])].map((type) => `<button data-quick-tool="${type}">${studioIcon(type)}<span>${carouselToolNames[type]}</span></button>`).join("")}</div><section class="designer-template-shortcut"><button type="button" id="carouselTemplates">${studioIcon("layers")}<span>Aus Vorlage starten</span></button><small>Erstellt ein neues Designer-Projekt.</small></section><div class="carousel-document-summary">${c.n} Slides · ${c.w} × ${c.h} px pro Slide</div>${section("Hintergrund", `<label>Zeichenflächenfarbe<input id="carouselBackground" type="color" value="${c.bg}"></label>`)}`;
    panel
      .querySelectorAll("[data-quick-tool]")
      .forEach(
        (button) =>
          (button.onclick = () => carouselTool(button.dataset.quickTool)),
      );
    $("#carouselTemplates").onclick = () => MKWTemplateGallery.open();
    $("#carouselBackground").onchange = (e) => {
      checkpoint();
      c.bg = e.target.value;
      changed(false);
    };
  }
  carouselRefinementsPanel(panel, items);
  carouselLayerPanel();
  carouselPresentInspector();
}

function carouselLegacyLayerPanel() {
  const c = p.carousel;
  carouselKeepLogosOnTop(c);
  const ids = new Set(carouselSelected().map((o) => o.id));
  $("#carouselLayers").innerHTML = [...c.objects]
    .reverse()
    .map(
      (o) =>
        `<div class="carousel-layer ${ids.has(o.id) ? "active" : ""}" data-layer="${o.id}" draggable="${o.type !== "logo"}"><button class="carousel-layer-name" data-action="select" aria-pressed="${ids.has(o.id)}" title="${esc(o.name)}">${carouselIcon(o.type)}<span>${esc(o.name)}</span>${carouselWarning(o) ? studioIcon("warning", "layer-warning-icon") : ""}</button><button data-action="visible" aria-pressed="${o.visible !== false}" aria-label="${o.visible === false ? "Einblenden" : "Ausblenden"}: ${esc(o.name)}">${studioIcon(o.visible === false ? "hidden" : "visible")}</button><button data-action="locked" aria-pressed="${!!o.locked}" aria-label="${o.locked ? "Entsperren" : "Sperren"}: ${esc(o.name)}">${studioIcon(o.locked ? "locked" : "unlocked")}</button><button data-action="up" ${o.type === "logo" || c.objects[c.objects.indexOf(o) + 1]?.type === "logo" ? "disabled" : ""} aria-label="Nach vorne: ${esc(o.name)}">${studioIcon("front")}</button><button data-action="down" ${o.type === "logo" || c.objects.indexOf(o) === 0 ? "disabled" : ""} aria-label="Nach hinten: ${esc(o.name)}">${studioIcon("back")}</button></div>`,
    )
    .join("");
  $("#carouselLayers")
    .querySelectorAll("[data-layer]")
    .forEach((row) => {
      row.ondragstart = (ev) => {
        carouselUI.folderDrag = null;
        carouselUI.layerDrag = row.dataset.layer;
        ev.dataTransfer.setData("text/plain", row.dataset.layer);
        ev.dataTransfer.effectAllowed = "move";
      };
      row.ondragover = (ev) => {
        ev.preventDefault();
        row.classList.add("drop-target");
      };
      row.ondragleave = () => row.classList.remove("drop-target");
      row.ondrop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        row.classList.remove("drop-target");
        const source = carouselUI.layerDrag,
          target = row.dataset.layer;
        if (!source || source === target) return;
        const index = c.objects.findIndex((o) => o.id === source);
        if (
          index < 0 ||
          c.objects[index].type === "logo" ||
          carouselObjectLocked(c.objects[index])
        )
          return;
        checkpoint();
        const [o] = c.objects.splice(index, 1),
          targetIndex = c.objects.findIndex((o) => o.id === target);
        const targetObject = c.objects[targetIndex];
        if (targetObject?.folderId) o.folderId = targetObject.folderId;
        else delete o.folderId;
        c.objects.splice(targetIndex + 1, 0, o);
        carouselArrangeFolders();
        carouselUI.layerDrag = null;
        changed();
      };
      row.ondragend = () => (carouselUI.layerDrag = null);
      row.querySelectorAll("button").forEach(
        (btn) =>
          (btn.onclick = (ev) => {
            const o = c.objects.find((o) => o.id === row.dataset.layer),
              action = btn.dataset.action;
            if (action === "select") {
              if (
                !ev.shiftKey &&
                !carouselUI.folder &&
                !carouselUI.content &&
                !carouselUI.editing &&
                carouselSelected().length === 1 &&
                carouselSelection === o.id
              )
                return;
              if (ev.shiftKey) {
                const set = new Set(carouselSelected().map((o) => o.id));
                set.has(o.id) ? set.delete(o.id) : set.add(o.id);
                carouselSelect([...set]);
              } else carouselSelect([o.id]);
              return;
            }
            if (action === "up" || action === "down") {
              carouselSelect([o.id]);
              carouselLayerOrder(action);
              return;
            }
            checkpoint();
            o[action] = action === "visible" ? o.visible === false : !o.locked;
            changed(false);
            carouselPanel();
          }),
      );
      const name = row.querySelector(".carousel-layer-name");
      name.ondblclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const o = c.objects.find((o) => o.id === row.dataset.layer);
        if (o) carouselRenameItem(o, "layer");
      };
      name.addEventListener("keydown", (event) => {
        if (event.key === "F2") {
          event.preventDefault();
          name.ondblclick(event);
        }
      });
    });
}
