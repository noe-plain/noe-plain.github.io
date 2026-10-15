"use strict";
// Carousel sidebar: see ARCHITECTURE.md for ownership and load order.
function carouselUpdateWarning(o) {
  const warning = $("#carouselProperties .carousel-warning");
  if (warning) warning.textContent = carouselWarning(o);
}

function carouselPanel() {
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
    return;
  }
  if (carouselUI.tool === "builder") {
    carouselConstructorPanel(panel);
    carouselLayerPanel();
    return;
  }
  const number = (key, label, min = 0, max = 100000) =>
    `<label>${label}<input data-prop="${key}" type="number" value="${Math.round((o.type === "path" && ["x", "y", "w", "h"].includes(key) ? carouselObjectBounds(o)[key] : o[key]) * 100) / 100}" min="${min}" max="${max}" step="any"></label>`;
  const color = (key, label) =>
    `<label>${label}<input data-prop="${key}" type="color" value="${esc(o[key])}"></label>`;
  const select = (key, label, values) =>
    `<label>${label}<select data-prop="${key}">${options(values, o[key])}</select></label>`;
  const section = (title, body) =>
    `<section class="carousel-property-section"><h4>${title}</h4>${body}</section>`;
  const transparency = (key, label, fallback) => {
    const value = Math.round((1 - (o[key] ?? fallback)) * 100);
    return `<div class="carousel-color-stop">${color(key === "startAlpha" ? "color" : "endColor", label)}<label class="carousel-transparency-toggle"><input type="checkbox" data-transparent="${key}" ${value > 0 ? "checked" : ""}> Transparenz</label><label class="carousel-slider"><span>Transparenz <output>${value} %</output></span><input data-prop="${key}" data-transparency="true" type="range" min="0" max="100" step="1" value="${value}" ${value === 0 ? "disabled" : ""}></label></div>`;
  };
  if (!items.length && carouselUI.slide !== null) {
    carouselSlidePanel(panel);
    carouselLayerPanel();
    return;
  }
  if (items.length > 1) {
    panel.innerHTML = `<h3>${items.length} Elemente ausgewählt</h3><p>Gemeinsam verschieben und an den Griffen skalieren.</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button><button id="carouselDelete">Entfernen</button></div>`;
    $("#carouselDuplicate").onclick = carouselDuplicate;
    $("#carouselDelete").onclick = carouselDelete;
  } else if (o) {
    panel.innerHTML = `<div class="carousel-section-heading"><h3>${esc(o.name)}</h3><span>${o.locked ? "Gesperrt" : carouselUI.content ? "Bildinhalt" : "Eigenschaften"}</span></div>${carouselHasImage(o) ? '<button id="carouselReplace" class="primary carousel-place-image">Bild platzieren / ersetzen</button>' : ""}${section("Position & Grösse", `<div class="carousel-fields">${number("x", "X", -100000)}${number("y", "Y", -100000)}${number("w", "Breite", 1)}${number("h", "Höhe", 1)}</div>`)}
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
 ${o.type === "text" ? carouselTextContentPanel(o) + carouselTextFontPanel(o) + carouselTextStylePanel(o) + section("Text im Rahmen", `<div class="carousel-fields carousel-text-anchor" role="group" aria-label="Vertikale Textausrichtung"><button data-text-anchor="top" aria-pressed="${o.textAnchor !== "bottom"}">${studioIcon("up")}Oben</button><button data-text-anchor="bottom" aria-pressed="${o.textAnchor === "bottom"}">${studioIcon("down")}Unten</button></div>`) : ""}
 ${carouselIsVector(o) ? carouselVectorPanel(o) : ""}
 ${o.type === "gradient" ? section("Verlauf", studioPaintCards(o) + '<button id="carouselGradientEdit">Verlauf auf der Fläche bearbeiten</button>') : ""}
 ${
   o.type === "angle"
     ? section(
         "Winkel",
         select("direction", "Richtung", [
           ["up", "Oben"],
           ["right", "Rechts"],
           ["down", "Unten"],
         ]) +
           `<div class="carousel-fields">${number("thickness", "Schenkelbreite", 1)}${number("glow", "Schein · px", 0, 200)}${color("glowColor", "Scheinfarbe")}${number("glowAlpha", "Intensität", 0, 1)}</div><p>Die Spitze sitzt auf einer Slide-Mittellinie. Der Winkel überragt eine Artwork-Kante um mindestens 1 px.</p>`,
       )
     : ""
 }
 ${o.type === "image" ? section("Rahmenform", carouselFramePicker(o) + `<button id="carouselFrameEdit" aria-pressed="${carouselUI.framePoints}">${carouselUI.framePoints ? "Punktbearbeitung beenden" : "Rahmenpunkte bearbeiten"}</button><button id="carouselFrameReset">Rechteck zurücksetzen</button><p>Eckpunkte direkt auf der Fläche ziehen. Der Bildinhalt bleibt an seiner Position.</p>`) : ""}
 ${carouselHasImage(o) ? section("Inhalt", '<div class="carousel-fields">' + number("panX", "Ausschnitt X", -100000) + number("panY", "Ausschnitt Y", -100000) + `</div><div class="carousel-flip-controls" role="group" aria-label="Bild spiegeln">${["flipX", "flipY"].map((key, i) => `<button data-flip="${key}" aria-pressed="${o[key] === -1}" title="${i ? "Vertikal" : "Horizontal"} spiegeln">${studioIcon("flip", i ? "flip-vertical" : "")}<span>${i ? "Vertikal" : "Horizontal"}</span></button>`).join("")}</div><button id="carouselContentEdit">${carouselUI.content ? "Zurück zum Rahmen" : "Bildausschnitt bearbeiten"}</button>` + '<button id="carouselImageFit">Rahmen füllen</button>') : ""}
 ${
   o.type === "logo"
     ? section(
         "MKW Logo",
         select("source", "Farbe", [
           ["white", "Weiss"],
           ["black", "Schwarz"],
         ]),
       )
     : ""
 }
 <p class="carousel-warning" role="status">${carouselWarning(o)}</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button>${o.type !== "logo" ? '<button id="carouselDelete">Entfernen</button>' : ""}</div>`;
    const order = {
        Inhalt: 0,
        Text: 0,
        Schrift: 5,
        "Absätze & Abstände": 10,
        "Text im Rahmen": 15,
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
          (order[a.querySelector("h4")?.textContent] ?? 10) -
          (order[b.querySelector("h4")?.textContent] ?? 10),
      )
      .forEach((section) => panel.insertBefore(section, warning));
    const primary = panel.querySelector("#carouselGradientEdit");
    if (primary) {
      primary.classList.add("carousel-place-image");
      panel.querySelector(".carousel-section-heading").after(primary);
    }
    panel.querySelectorAll("[data-prop]").forEach((input) => {
      input.disabled = !!o.locked || input.disabled;
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
          if (!Number.isFinite(value)) return;
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
        if (o.type === "text" && input.dataset.prop === "text")
          o.textStyles = carouselTextStylesForInput(o, value);
        if (
          o.type === "path" &&
          ["x", "y", "w", "h"].includes(input.dataset.prop)
        )
          carouselSetBoundsValue(o, input.dataset.prop, value);
        else o[input.dataset.prop] = value;
        if (o.type === "angle") {
          if (input.dataset.prop === "direction") {
            const tall = o.h > o.w;
            if ((value === "right") !== tall) [o.w, o.h] = [o.h, o.w];
          } else if (input.dataset.prop === "w")
            o.h = o.direction === "right" ? o.w * 2 : o.w / 2;
          else if (input.dataset.prop === "h")
            o.w = o.direction === "right" ? o.h / 2 : o.h * 2;
        }
        if (o.type === "angle") carouselAngleAlign(o);
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
                (o.type === "path" && ["x", "y", "w", "h"].includes(key)
                  ? carouselObjectBounds(o)[key]
                  : o[key]) * 100,
              ) / 100;
        }
      };
    });
    panel.querySelectorAll("[data-transparent]").forEach((input) => {
      input.disabled = !!o.locked;
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
      $("#carouselTextEdit").onclick = () => carouselEditText(o);
    if (o.type === "text") {
      carouselBindTextStyles(o, panel);
      const content = panel.querySelector("[data-prop=text]");
      content.onselect =
        content.onkeyup =
        content.onclick =
          () => {
            if (carouselSetTextContext(o, content.selectionStart))
              carouselRefreshTextStyles(o);
          };
    }
    panel.querySelectorAll("[data-text-anchor]").forEach(
      (btn) =>
        (btn.onclick = () => {
          if (o.locked || o.textAnchor === btn.dataset.textAnchor) return;
          checkpoint();
          o.textAnchor = btn.dataset.textAnchor;
          changed(false);
          carouselPanel();
        }),
    );
    if ($("#carouselGradientEdit"))
      $("#carouselGradientEdit").onclick = () => carouselTool("gradient");
    if ($("#carouselContentEdit"))
      $("#carouselContentEdit").onclick = () =>
        carouselTool(carouselUI.content ? "select" : "content");
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
    if (o.locked)
      panel
        .querySelectorAll("button:not(#carouselDuplicate)")
        .forEach((btn) => (btn.disabled = true));
  } else {
    panel.innerHTML = `<h3>Dein Carousel gestalten</h3><p>Wähle ein Element auf der Fläche oder füge etwas Neues hinzu.</p><div class="carousel-quick-start">${["image", "text", "gradient", "angle", ...(studioPreferences.advanced ? ["path", "shape"] : [])].map((type) => `<button data-quick-tool="${type}">${studioIcon(type)}<span>${carouselToolNames[type]}</span></button>`).join("")}</div><div class="carousel-document-summary">${c.n} Slides · ${c.w} × ${c.h} px pro Slide</div>${section("Hintergrund", `<label>Zeichenflächenfarbe<input id="carouselBackground" type="color" value="${c.bg}"></label>`)}<p>Rahmen mit gedrückter Maustaste aufziehen. Doppelklick auf Text zum Schreiben oder auf ein Bild für den Ausschnitt.</p><p>Leertaste: Fläche verschieben<br>Alt / Option + Scrollen: Zoom<br>Shift: Mehrfachauswahl / 45°</p>`;
    panel
      .querySelectorAll("[data-quick-tool]")
      .forEach(
        (button) =>
          (button.onclick = () => carouselTool(button.dataset.quickTool)),
      );
    $("#carouselBackground").onchange = (e) => {
      checkpoint();
      c.bg = e.target.value;
      changed(false);
    };
  }
  carouselLayerPanel();
}

function carouselLayerPanel() {
  const c = p.carousel;
  carouselKeepLogosOnTop(c);
  const ids = new Set(carouselSelected().map((o) => o.id));
  $("#carouselLayers").innerHTML = [...c.objects]
    .reverse()
    .map(
      (o) =>
        `<div class="carousel-layer ${ids.has(o.id) ? "active" : ""}" data-layer="${o.id}" draggable="${o.type !== "logo"}"><button data-action="visible" aria-label="${o.visible === false ? "Einblenden" : "Ausblenden"}: ${esc(o.name)}">${studioIcon(o.visible === false ? "hidden" : "visible")}</button><button data-action="locked" aria-label="${o.locked ? "Entsperren" : "Sperren"}: ${esc(o.name)}">${studioIcon(o.locked ? "locked" : "unlocked")}</button><button class="carousel-layer-name" data-action="select" title="${esc(o.name)}">${carouselIcon(o.type)}<span>${esc(o.name)}</span>${carouselWarning(o) ? studioIcon("warning", "layer-warning-icon") : ""}</button><button data-action="up" ${o.type === "logo" || c.objects[c.objects.indexOf(o) + 1]?.type === "logo" ? "disabled" : ""} aria-label="Nach vorne: ${esc(o.name)}">${studioIcon("front")}</button><button data-action="down" ${o.type === "logo" || c.objects.indexOf(o) === 0 ? "disabled" : ""} aria-label="Nach hinten: ${esc(o.name)}">${studioIcon("back")}</button></div>`,
    )
    .join("");
  $("#carouselLayers")
    .querySelectorAll("[data-layer]")
    .forEach((row) => {
      row.ondragstart = (ev) => {
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
        if (index < 0 || c.objects[index].type === "logo") return;
        checkpoint();
        const [o] = c.objects.splice(index, 1),
          targetIndex = c.objects.findIndex((o) => o.id === target);
        c.objects.splice(targetIndex + 1, 0, o);
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
      row.querySelector(".carousel-layer-name").ondblclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const o = c.objects.find((o) => o.id === row.dataset.layer),
          input = document.createElement("input");
        input.value = o.name;
        input.setAttribute("aria-label", "Ebene umbenennen");
        const name = row.querySelector(".carousel-layer-name");
        name.replaceChildren(input);
        input.focus();
        input.select();
        const save = () => {
          if (input.value.trim() && input.value.trim() !== o.name) {
            checkpoint();
            o.name = input.value.trim();
            changed(false);
          }
          carouselLayerPanel();
        };
        input.onblur = save;
        input.onkeydown = (e) => {
          if (e.key === "Enter") input.blur();
          if (e.key === "Escape") {
            input.onblur = null;
            carouselLayerPanel();
          }
        };
      };
    });
}
