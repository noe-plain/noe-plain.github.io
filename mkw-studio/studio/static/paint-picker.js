"use strict";
let studioPicker = null,
  studioPaintFront = "fill";
function studioPaintTarget() {
  return carouselSelected().at(-1) || carouselVectorColours;
}
function studioPaintKindName(v) {
  if (!v.enabled) return "Ausgeblendet";
  const name = {
    solid: "Farbe",
    linear: "Linearer Verlauf",
    radial: "Radialer Verlauf",
    image: "Bildfüllung",
  }[v.kind];
  return (
    name +
    (["linear", "radial"].includes(v.kind)
      ? v.stops.some((s) => s.alpha < 1)
        ? " · Transparenz"
        : ""
      : v.alpha < 1
        ? " · " + Math.round((1 - v.alpha) * 100) + " % transparent"
        : "")
  );
}
function studioPaintCards(o) {
  const channels = carouselIsVector(o) ? ["fill", "stroke"] : ["fill"];
  return `<div class="paint-inspector">${channels
    .map((channel) => {
      const value = studioPaintRead(o, channel),
        label = channel === "fill" ? "Fläche" : "Kontur";
      return `<div class="paint-row"><button class="paint-edit" data-paint-channel="${channel}" aria-label="${label} bearbeiten" aria-haspopup="dialog"><span class="paint-chip" data-paint-chip="${channel}" style='background:${studioPaintSwatch(value)}'></span><span>${label}<small class="paint-kind">${studioPaintKindName(value)}</small></span></button>${carouselIsVector(o) ? `<button class="paint-visibility icon-button" data-paint-toggle="${channel}" title="${label} ein- oder ausblenden" aria-label="${label} ein- oder ausblenden" aria-pressed="${value.enabled}">${studioIcon(value.enabled ? "visible" : "hidden")}</button>` : ""}</div>`;
    })
    .join("")}</div>`;
}
function studioBindPaintCards(panel, o) {
  panel
    .querySelectorAll("[data-paint-channel]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          studioOpenPicker(o, button.dataset.paintChannel, button)),
    );
  panel
    .querySelectorAll("[data-paint-toggle]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          studioTogglePaint(o, button.dataset.paintToggle)),
    );
}
function studioTogglePaint(o, channel) {
  if (carouselObjectLocked(o)) return;
  const value = studioPaintRead(o, channel);
  if (o !== carouselVectorColours) checkpoint();
  value.enabled = !value.enabled;
  if (channel === "stroke" && value.enabled && !o.strokeWidth)
    o.strokeWidth = 3;
  studioPaintWrite(o, channel, value);
  if (studioPicker?.object === o && studioPicker.channel === channel) {
    studioPicker.value = studioPaintRead(o, channel);
    studioRenderPicker();
  }
  if (o !== carouselVectorColours) changed(false);
  studioSyncPaintControls();
}
function studioSwapPaints(o) {
  if (
    carouselObjectLocked(o) ||
    (o !== carouselVectorColours && !carouselIsVector(o))
  )
    return;
  const fill = studioPaintRead(o, "fill"),
    stroke = studioPaintRead(o, "stroke");
  if (o !== carouselVectorColours) checkpoint();
  studioPaintWrite(o, "fill", stroke);
  studioPaintWrite(o, "stroke", fill);
  if (o !== carouselVectorColours) changed(false);
  studioSyncPaintControls();
}
function studioSyncPaintControls() {
  if (studioPicker?.adapter) return;
  const bar = $(".carousel-contextbar");
  if (!bar) return;
  if (studioPicker && studioPicker.object !== studioPaintTarget()) {
    studioClosePicker(false);
  }
  let group = $("#advancedColours");
  if (!studioPreferences.advanced) {
    group?.remove();
  } else {
    if (!group) {
      group = document.createElement("div");
      group.id = "advancedColours";
      group.className = "advanced-colours";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Fläche und Kontur");
      group.innerHTML = `<div class="paint-wells"><button id="toolFillColour" class="paint-fill" title="Fläche bearbeiten" aria-label="Fläche bearbeiten" aria-haspopup="dialog"></button><button id="toolStrokeColour" class="paint-stroke" title="Kontur bearbeiten" aria-label="Kontur bearbeiten" aria-haspopup="dialog"></button></div><div class="paint-actions"><button id="toolSwapColours" title="Fläche und Kontur tauschen" aria-label="Fläche und Kontur tauschen">${studioIcon("replace")}</button><button id="toolPaintNone" title="Aktive Farbe ein- oder ausblenden" aria-label="Aktive Farbe ein- oder ausblenden">${studioIcon("hidden")}</button></div>`;
      bar.querySelector(".studio-tool-surface").append(group);
      for (const channel of ["fill", "stroke"])
        $(
          "#tool" + (channel === "fill" ? "Fill" : "Stroke") + "Colour",
        ).onclick = (event) =>
          studioOpenPicker(studioPaintTarget(), channel, event.currentTarget);
      $("#toolSwapColours").onclick = () =>
        studioSwapPaints(studioPaintTarget());
      $("#toolPaintNone").onclick = () =>
        studioTogglePaint(studioPaintTarget(), studioPaintFront);
    }
    const o = studioPaintTarget(),
      vector = carouselIsVector(o) || o === carouselVectorColours;
    if (!vector) studioPaintFront = "fill";
    for (const [channel, id] of [
      ["fill", "toolFillColour"],
      ["stroke", "toolStrokeColour"],
    ]) {
      const button = $("#" + id),
        value = studioPaintRead(o, channel);
      button.style.background = studioPaintSwatch(value);
      button.classList.toggle("is-front", studioPaintFront === channel);
      button.classList.toggle("no-paint", !value.enabled);
      button.disabled =
        carouselObjectLocked(o) ||
        (!vector &&
          (channel === "stroke" || !["text", "gradient"].includes(o.type)));
      button.setAttribute(
        "aria-expanded",
        String(!!studioPicker && studioPicker.channel === channel),
      );
    }
    $("#toolSwapColours").disabled = carouselObjectLocked(o) || !vector;
    $("#toolPaintNone").disabled = carouselObjectLocked(o) || !vector;
    $("#toolPaintNone").setAttribute(
      "aria-pressed",
      String(!studioPaintRead(o, studioPaintFront).enabled),
    );
  }
  const o = studioPaintTarget();
  document
    .querySelectorAll("#carouselProperties [data-paint-channel]")
    .forEach((button) => {
      const value = studioPaintRead(o, button.dataset.paintChannel);
      button.querySelector(".paint-chip").style.background =
        studioPaintSwatch(value);
      button.querySelector(".paint-kind").textContent =
        studioPaintKindName(value);
      button.disabled = carouselObjectLocked(o);
      button.setAttribute(
        "aria-expanded",
        String(
          !!studioPicker &&
            studioPicker.channel === button.dataset.paintChannel,
        ),
      );
    });
  document
    .querySelectorAll("#carouselProperties [data-paint-toggle]")
    .forEach((button) => {
      const value = studioPaintRead(o, button.dataset.paintToggle);
      button.setAttribute("aria-pressed", String(value.enabled));
      button.innerHTML = studioIcon(value.enabled ? "visible" : "hidden");
      button.disabled = carouselObjectLocked(o);
    });
}
function studioRGBToHSV(hex) {
  const [r, g, b] = [1, 3, 5].map(
      (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    ),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = d
    ? (max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4) * 60
    : 0;
  return { h, s: max ? d / max : 0, v: max };
}
function studioHSVToHex({ h, s, v }) {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c,
    values =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
  return (
    "#" +
    values
      .map((n) =>
        Math.round((n + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function studioPickerColour() {
  const state = studioPicker;
  return ["linear", "radial"].includes(state.value.kind)
    ? state.value.stops[state.stop]
    : state.value;
}
function studioOpenPicker(o, channel, anchor) {
  if (carouselObjectLocked(o)) return;
  if (studioPicker) studioClosePicker(false);
  studioPaintFront = channel;
  const value = studioPaintRead(o, channel);
  studioPicker = {
    object: o,
    channel,
    value,
    stop: 0,
    anchor,
    rail: anchor.closest("#carouselSidebar,.tool-sidebar,.carousel-contextbar"),
    rect: anchor.getBoundingClientRect(),
    editing: false,
  };
  studioPicker.hsv = studioRGBToHSV(studioPickerColour().colour);
  studioCreatePicker();
  studioShowPicker(anchor);
  studioRenderPicker();
  studioPositionPicker();
  studioSyncPaintControls();
  $("#paintMode").focus();
}
// Shared view and interaction state; callers own values, mutation and placement.
function studioOpenColourPicker({
  anchor,
  colour,
  label = "Farbe",
  onChange,
  onBegin,
  isCurrent = () => true,
  position = null,
}) {
  if (studioPicker) studioClosePicker(false);
  studioPicker = {
    object: { type: "colour-control" },
    channel: "fill",
    value: {
      kind: "solid",
      colour,
      alpha: 1,
      enabled: true,
      stops: [],
      angle: 90,
    },
    stop: 0,
    anchor,
    rail: anchor.closest(
      "#carouselSidebar,.tool-sidebar,.carousel-contextbar,dialog",
    ),
    rect: anchor.getBoundingClientRect(),
    editing: false,
    adapter: { onChange, onBegin, isCurrent, label },
    position,
  };
  studioPicker.hsv = studioRGBToHSV(colour);
  studioCreatePicker();
  studioShowPicker(anchor);
  studioRenderPicker();
  $("#paintHex").focus();
}
function studioShowPicker(anchor) {
  const el = $("#studioPaintPicker"),
    owner = anchor.closest("dialog[open]");
  studioPicker.owner = owner;
  (owner || document.body).append(el);
  el.hidden = false;
  el.showPopover();
}
function studioClosePicker(focus = true) {
  if (!studioPicker) return;
  const anchor = studioPicker.anchor;
  studioPicker = null;
  const el = $("#studioPaintPicker");
  el.hidePopover();
  el.hidden = true;
  document.body.append(el);
  studioSyncPaintControls();
  if (focus && anchor?.isConnected) anchor.focus();
}
function studioPickerBegin() {
  if (!studioPicker.editing) {
    if (studioPicker.adapter) studioPicker.adapter.onBegin?.();
    else if (studioPicker.object !== carouselVectorColours) checkpoint();
    studioPicker.editing = true;
  }
}
function studioPickerApply() {
  const state = studioPicker;
  if (!state || state.object.locked) return;
  if (state.adapter) {
    if (!state.adapter.isCurrent()) return studioClosePicker(false);
    state.value.alpha = 1;
    state.adapter.onChange(state.value.colour);
    return;
  }
  const beforeImage = carouselHasImage(state.object);
  studioPaintWrite(state.object, state.channel, state.value);
  if (
    beforeImage !== carouselHasImage(state.object) &&
    state.object !== carouselVectorColours
  )
    carouselPanel();
  if (state.object !== carouselVectorColours) changed(false);
  else studioSyncPaintControls();
}
function studioPickerAction(action) {
  studioPicker.editing = false;
  studioPickerBegin();
  action();
  studioPickerApply();
  studioPicker.editing = false;
  studioRenderPicker();
}
function studioPickerSetColour(hex) {
  const colour = studioPickerColour();
  colour.colour = hex;
  if (["linear", "radial"].includes(studioPicker.value.kind)) {
    studioPicker.value.colour = studioPicker.value.stops[0].colour;
    studioPicker.value.alpha = studioPicker.value.stops[0].alpha;
  } else studioPicker.value.colour = hex;
  studioPickerApply();
  studioRenderPicker(false);
}
function studioPositionPicker() {
  if (!studioPicker) return;
  const el = $("#studioPaintPicker"),
    rail = studioPicker.rail,
    anchor = studioPicker.anchor,
    r =
      rail?.isConnected && rail.getBoundingClientRect().width > 0
        ? rail.getBoundingClientRect()
        : anchor?.isConnected
          ? anchor.getBoundingClientRect()
          : studioPicker.rect,
    w = el.offsetWidth,
    h = el.offsetHeight,
    gap = 20,
    margin = 12,
    onRight = r.left + r.width / 2 > innerWidth / 2;
  if (studioPicker.position) {
    const point = studioPicker.position({
      rect: r,
      width: w,
      height: h,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    });
    el.style.left =
      Math.max(margin, Math.min(point.x, innerWidth - w - margin)) + "px";
    el.style.top =
      Math.max(margin, Math.min(point.y, innerHeight - h - margin)) + "px";
    return;
  }
  let x = onRight ? r.left - w - gap : r.right + gap;
  if (x < margin || x + w > innerWidth - margin) {
    const opposite = onRight ? r.right + gap : r.left - w - gap;
    x =
      opposite >= margin && opposite + w <= innerWidth - margin
        ? opposite
        : (innerWidth - w) / 2;
  }
  el.style.left = Math.max(margin, Math.min(x, innerWidth - w - margin)) + "px";
  el.style.top = Math.max(margin, (innerHeight - h) / 2) + "px";
}
function studioCreatePicker() {
  if ($("#studioPaintPicker")) return;
  const el = document.createElement("section");
  el.id = "studioPaintPicker";
  el.className = "studio-paint-picker";
  el.setAttribute("popover", "manual");
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.setAttribute("aria-labelledby", "paintPickerTitle");
  el.innerHTML = `<div class="picker-heading"><strong id="paintPickerTitle">Fläche</strong><button id="paintClose" class="icon-button" aria-label="Farbfeld schliessen">${studioIcon("close")}</button></div>
 <div class="picker-mode"><label>Füllung<select id="paintMode"><option value="solid">Farbe</option><option value="gradient">Verlauf</option><option value="image">Bild</option></select></label><button id="paintEnabled" class="icon-button" title="Ein- oder ausblenden" aria-label="Farbe ein- oder ausblenden">${studioIcon("visible")}</button></div>
 <div id="paintColourArea"><div class="picker-colour-space"><div id="paintHue" role="slider" tabindex="0" aria-label="Farbton" aria-valuemin="0" aria-valuemax="359" aria-orientation="vertical"><span></span></div><div id="paintSV" role="group" tabindex="0" aria-describedby="paintSVHelp" aria-label="Sättigung und Helligkeit"><span></span></div><div class="picker-opacity"><span aria-hidden="true">100</span><input id="paintAlphaSlider" type="range" min="0" max="100" step="1" aria-label="Deckkraft · oben 100 Prozent, unten 0 Prozent" aria-orientation="vertical"><span aria-hidden="true">0</span></div></div>
 <span id="paintSVHelp" class="visually-hidden">Links und rechts ändern die Sättigung, oben und unten die Helligkeit.</span><div class="picker-colour-values"><span id="paintPreview" class="paint-chip"></span><label>HEX<input id="paintHex" type="text" maxlength="7" spellcheck="false" aria-label="HEX-Farbwert"></label><label>Transparenz<span class="picker-unit"><input id="paintAlpha" type="number" min="0" max="100" aria-label="Transparenz"><span>%</span></span></label></div></div>
 <div id="paintGradientPanel"><div class="picker-gradient-kind" role="group" aria-label="Verlaufsform"><button data-gradient-kind="linear">Linear</button><button data-gradient-kind="radial">Radial</button><label>Winkel<span class="picker-unit"><input id="paintAngle" type="number" min="-360" max="360" aria-label="Verlaufswinkel"><span>°</span></span></label></div><div id="paintGradientTrack" aria-label="Verlaufsfarbwerte"><div id="paintGradientBar"></div><div id="paintGradientHandles"></div></div><div class="picker-stop-options"><label>Position<span class="picker-unit"><input id="paintStopPosition" type="number" min="0" max="100" step=".1" aria-label="Position des Farbwertes"><span>%</span></span></label><label>Mitte<span class="picker-unit"><input id="paintMidPosition" type="number" min="5" max="95" step="1" aria-label="Verlaufsmitte"><span>%</span></span></label><button id="paintDeleteStop" class="icon-button" title="Farbwert entfernen" aria-label="Farbwert entfernen">${studioIcon("trash")}</button></div></div>
 <div id="paintImagePanel"><div id="paintImagePreview"></div><button id="paintPlaceImage" class="primary">Bild auswählen / ersetzen</button></div><p id="paintMessage" role="status"></p>`;
  document.body.append(el);
  $("#paintClose").onclick = () => studioClosePicker();
  $("#paintMode").onchange = () =>
    studioPickerAction(() => {
      const mode = $("#paintMode").value,
        value = studioPicker.value;
      const previous = value.kind;
      value.enabled = true;
      value.kind = mode === "gradient" ? "linear" : mode;
      if (
        mode === "gradient" &&
        !["linear", "radial"].includes(previous) &&
        value.stops?.length
      ) {
        value.stops[0].colour = value.colour;
        value.stops[0].alpha = value.alpha;
      }
      if (mode === "gradient" && !value.stops?.length)
        value.stops = studioPaintStops(
          null,
          value.colour,
          "#ffffff",
          value.alpha,
          1,
        );
      studioPicker.stop = 0;
      studioPicker.hsv = studioRGBToHSV(studioPickerColour().colour);
    });
  $("#paintEnabled").onclick = () =>
    studioPickerAction(() => {
      studioPicker.value.enabled = !studioPicker.value.enabled;
      const o = studioPicker.object;
      if (
        studioPicker.channel === "stroke" &&
        studioPicker.value.enabled &&
        !o.strokeWidth
      )
        o.strokeWidth = 3;
    });
  $("#paintHex").oninput = (event) => {
    const value = event.target.value.trim(),
      hex = value.startsWith("#") ? value : "#" + value;
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      studioPickerBegin();
      studioPicker.hsv = studioRGBToHSV(hex);
      studioPickerSetColour(hex.toLowerCase());
    }
  };
  for (const id of ["paintAlpha", "paintAlphaSlider"])
    $("#" + id).oninput = (event) => {
      const n = Number(event.target.value);
      if (!Number.isFinite(n) || n < 0 || n > 100) return;
      studioPickerBegin();
      studioPickerColour().alpha = 1 - n / 100;
      if (["linear", "radial"].includes(studioPicker.value.kind))
        studioPicker.value.alpha = studioPicker.value.stops[0].alpha;
      studioPickerApply();
      studioRenderPicker(false);
    };
  for (const id of [
    "paintHex",
    "paintAlpha",
    "paintAlphaSlider",
    "paintAngle",
    "paintStopPosition",
    "paintMidPosition",
  ]) {
    const input = $("#" + id);
    input.addEventListener("focus", () => {
      if (studioPicker) studioPicker.editing = false;
    });
    input.addEventListener("change", () => {
      if (studioPicker) studioPicker.editing = false;
    });
  }
  $("#paintAngle").oninput = (event) => {
    const n = Number(event.target.value);
    if (!Number.isFinite(n) || Math.abs(n) > 360) return;
    studioPickerBegin();
    studioPicker.value.angle = n;
    const o = studioPicker.object;
    if (o.type === "gradient") {
      delete o.gradientStart;
      delete o.gradientEnd;
    }
    studioPickerApply();
  };
  el.querySelectorAll("[data-gradient-kind]").forEach(
    (button) =>
      (button.onclick = () =>
        studioPickerAction(() => {
          studioPicker.value.kind = button.dataset.gradientKind;
        })),
  );
  $("#paintStopPosition").oninput = (event) => {
    const value = Number(event.target.value) / 100;
    if (!Number.isFinite(value)) return;
    studioPickerBegin();
    studioMoveStop(value);
    studioPickerApply();
    studioRenderPicker(false);
  };
  $("#paintMidPosition").oninput = (event) => {
    const n = Number(event.target.value);
    if (!Number.isFinite(n) || n < 5 || n > 95) return;
    studioPickerBegin();
    studioPickerColour().mid = n / 100;
    studioPickerApply();
    studioRenderPicker(false);
  };
  $("#paintDeleteStop").onclick = studioDeleteStop;
  $("#paintGradientBar").onpointerdown = (event) => {
    event.preventDefault();
    const r = event.currentTarget.getBoundingClientRect(),
      at = studioPaintClamp((event.clientX - r.left) / r.width),
      stops = studioPicker.value.stops;
    if (stops.length >= 16) return;
    if (stops.some((s) => Math.abs(s.at - at) < 0.005)) return;
    studioPickerAction(() => {
      const stop = studioSampleStops(stops, at);
      stops.push(stop);
      stops.sort((a, b) => a.at - b.at);
      studioPicker.stop = stops.indexOf(stop);
      studioPicker.hsv = studioRGBToHSV(stop.colour);
    });
  };
  $("#paintAlphaSlider").onkeydown = (event) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const input = event.currentTarget;
    input.value =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 100
          : Math.max(
              0,
              Math.min(
                100,
                +input.value +
                  (event.key === "ArrowUp" ? -1 : 1) *
                    (event.shiftKey ? 10 : 1),
              ),
            );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  $("#paintPlaceImage").onclick = studioPickerImport;
  studioBindPickerPad($("#paintHue"), (x, y) => {
    studioPicker.hsv.h = studioPaintClamp(y) * 359;
    studioPickerSetColour(studioHSVToHex(studioPicker.hsv));
  });
  studioBindPickerPad($("#paintSV"), (x, y) => {
    studioPicker.hsv.s = studioPaintClamp(x);
    studioPicker.hsv.v = 1 - studioPaintClamp(y);
    studioPickerSetColour(studioHSVToHex(studioPicker.hsv));
  });
  $("#paintHue").onkeydown = (event) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    studioPickerAction(() => {
      studioPicker.hsv.h =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 359
            : studioPaintClamp(
                studioPicker.hsv.h +
                  (event.key === "ArrowDown" ? 1 : -1) *
                    (event.shiftKey ? 10 : 1),
                0,
                359,
              );
      studioPickerColour().colour = studioHSVToHex(studioPicker.hsv);
      studioPicker.value.colour = ["linear", "radial"].includes(
        studioPicker.value.kind,
      )
        ? studioPicker.value.stops[0].colour
        : studioPickerColour().colour;
    });
  };
  $("#paintSV").onkeydown = (event) => {
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    studioPickerAction(() => {
      const h = studioPicker.hsv,
        d = event.shiftKey ? 0.1 : 0.01;
      if (event.key === "ArrowRight") h.s = studioPaintClamp(h.s + d);
      if (event.key === "ArrowLeft") h.s = studioPaintClamp(h.s - d);
      if (event.key === "ArrowUp") h.v = studioPaintClamp(h.v + d);
      if (event.key === "ArrowDown") h.v = studioPaintClamp(h.v - d);
      studioPickerColour().colour = studioHSVToHex(h);
      studioPicker.value.colour = ["linear", "radial"].includes(
        studioPicker.value.kind,
      )
        ? studioPicker.value.stops[0].colour
        : studioPickerColour().colour;
    });
  };
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      studioClosePicker();
    }
    if (event.key === "Tab") {
      const list = [
          ...el.querySelectorAll('button,input,select,[tabindex="0"]'),
        ].filter((n) => !n.disabled && n.getClientRects().length),
        first = list[0],
        last = list.at(-1);
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}
function studioBindPickerPad(el, update) {
  el.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    el.focus();
    studioPicker.editing = false;
    studioPickerBegin();
    const rect = el.getBoundingClientRect(),
      state = studioPicker;
    let pending = null,
      frame = 0;
    const flush = () => {
      frame = 0;
      if (!pending || studioPicker !== state) return;
      const point = pending;
      pending = null;
      update(
        (point.x - rect.left) / rect.width,
        (point.y - rect.top) / rect.height,
      );
    };
    const move = (e) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    el.setPointerCapture(event.pointerId);
    pending = { x: event.clientX, y: event.clientY };
    flush();
    const finish = () => {
      if (frame) cancelAnimationFrame(frame);
      flush();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
      if (studioPicker === state) state.editing = false;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
  };
}
function studioMoveStop(at) {
  const state = studioPicker,
    stops = state.value.stops,
    i = state.stop;
  stops[i].at = studioPaintClamp(
    at,
    i ? stops[i - 1].at + 0.001 : 0,
    i < stops.length - 1 ? stops[i + 1].at - 0.001 : 1,
  );
}
function studioDeleteStop() {
  if (studioPicker.value.stops.length <= 2) return;
  studioPickerAction(() => {
    studioPicker.value.stops.splice(studioPicker.stop, 1);
    studioPicker.stop = Math.max(0, studioPicker.stop - 1);
    studioPicker.value.colour = studioPicker.value.stops[0].colour;
    studioPicker.value.alpha = studioPicker.value.stops[0].alpha;
    studioPicker.hsv = studioRGBToHSV(studioPickerColour().colour);
  });
}
function studioRenderPicker(refreshHandles = true) {
  const state = studioPicker;
  if (!state) return;
  const value = state.value,
    gradient = ["linear", "radial"].includes(value.kind),
    colour = studioPickerColour(),
    vector =
      carouselIsVector(state.object) || state.object === carouselVectorColours;
  $("#paintPickerTitle").textContent =
    state.adapter?.label || (state.channel === "stroke" ? "Kontur" : "Fläche");
  $("#studioPaintPicker").classList.toggle("is-opaque-colour", !!state.adapter);
  $("#paintMode").disabled = !!state.adapter;
  $("#paintMode").value = gradient ? "gradient" : value.kind;
  $("#paintMode").querySelector("[value=gradient]").disabled = $(
    "#paintMode",
  ).querySelector("[value=image]").disabled =
    !vector && state.object.type !== "gradient";
  $("#paintEnabled").hidden = !vector;
  $("#paintEnabled").setAttribute("aria-pressed", String(value.enabled));
  $("#paintEnabled").innerHTML = studioIcon(
    value.enabled ? "visible" : "hidden",
  );
  $("#paintColourArea").hidden = false;
  $("#studioPaintPicker").classList.toggle("is-image", value.kind === "image");
  $("#paintGradientPanel").hidden = !gradient;
  $("#paintImagePanel").hidden = value.kind !== "image";
  $("#paintHue").style.setProperty("--hue-y", (state.hsv.h / 359) * 100 + "%");
  $("#paintHue").setAttribute("aria-valuenow", String(Math.round(state.hsv.h)));
  $("#paintSV").style.setProperty(
    "--picker-hue",
    `hsl(${state.hsv.h} 100% 50%)`,
  );
  $("#paintSV").style.setProperty("--sat", state.hsv.s * 100 + "%");
  $("#paintSV").style.setProperty("--val", (1 - state.hsv.v) * 100 + "%");
  $("#paintSV").setAttribute(
    "aria-label",
    `Sättigung ${Math.round(state.hsv.s * 100)} Prozent, Helligkeit ${Math.round(state.hsv.v * 100)} Prozent`,
  );
  if (document.activeElement !== $("#paintHex"))
    $("#paintHex").value = colour.colour.toUpperCase();
  $("#paintPreview").style.background = studioPaintSwatch({
    kind: "solid",
    enabled: true,
    colour: colour.colour,
    alpha: colour.alpha,
  });
  const transparency = Math.round((1 - colour.alpha) * 100);
  if (document.activeElement !== $("#paintAlpha"))
    $("#paintAlpha").value = transparency;
  $("#paintAlphaSlider").setAttribute(
    "aria-orientation",
    value.kind === "image" ? "horizontal" : "vertical",
  );
  $("#paintAlphaSlider").setAttribute(
    "aria-valuetext",
    `${100 - transparency} Prozent Deckkraft`,
  );
  $("#paintAlphaSlider").setAttribute(
    "aria-label",
    value.kind === "image"
      ? "Deckkraft · links 100 Prozent, rechts 0 Prozent"
      : "Deckkraft · oben 100 Prozent, unten 0 Prozent",
  );
  $("#paintAlphaSlider").value = transparency;
  $("#paintAlphaSlider").style.setProperty("--alpha-colour", colour.colour);
  if (document.activeElement !== $("#paintAngle"))
    $("#paintAngle").value = value.angle;
  $("#paintMessage").textContent =
    vector &&
    state.channel === "fill" &&
    state.object.type === "path" &&
    !state.object.closed
      ? "Für eine sichtbare Füllung den Pfad zuerst schliessen."
      : "";
  if (gradient) {
    elGradientKind();
    $("#paintGradientBar").style.background = studioPaintCSS({
      ...value,
      enabled: true,
    });
    const stop = value.stops[state.stop];
    if (document.activeElement !== $("#paintStopPosition"))
      $("#paintStopPosition").value = Math.round(stop.at * 1000) / 10;
    if (document.activeElement !== $("#paintMidPosition"))
      $("#paintMidPosition").value = Math.round((stop.mid ?? 0.5) * 100);
    $("#paintMidPosition").disabled = state.stop === value.stops.length - 1;
    $("#paintDeleteStop").disabled = value.stops.length <= 2;
    if (refreshHandles) studioRenderGradientHandles();
    else studioUpdateGradientHandles();
  }
  if (value.kind === "image") {
    const im = p.images.find((im) => im.id === value.imageId);
    $("#paintImagePreview").style.background = im
      ? `url("${im.data}") center / contain no-repeat`
      : "";
    $("#paintImagePreview").textContent = im ? "" : "Noch kein Bild gewählt";
    $("#paintPlaceImage").disabled = !!state.object.locked;
  }
  studioPositionPicker();
  function elGradientKind() {
    document
      .querySelectorAll("#studioPaintPicker [data-gradient-kind]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.gradientKind === value.kind),
        ),
      );
  }
}
function studioUpdateGradientHandles() {
  const state = studioPicker;
  if (!state) return;
  const stops = state.value.stops;
  document.querySelectorAll("[data-picker-stop]").forEach((button) => {
    const i = +button.dataset.pickerStop,
      s = stops[i];
    if (!s) return;
    button.style.left = s.at * 100 + "%";
    button.style.background = s.colour;
    button.setAttribute("aria-pressed", String(i === state.stop));
    button.setAttribute(
      "aria-label",
      `Farbwert ${i + 1}, Position ${Math.round(s.at * 100)} Prozent`,
    );
  });
  document.querySelectorAll("[data-picker-mid]").forEach((button) => {
    const i = +button.dataset.pickerMid,
      s = stops[i];
    if (stops[i + 1]) {
      button.style.left =
        (s.at + (stops[i + 1].at - s.at) * (s.mid ?? 0.5)) * 100 + "%";
      button.setAttribute(
        "aria-valuenow",
        String(Math.round((s.mid ?? 0.5) * 100)),
      );
    }
  });
}
function studioRenderGradientHandles() {
  const root = $("#paintGradientHandles"),
    state = studioPicker;
  root.innerHTML = "";
  state.value.stops.forEach((stop, i) => {
    const button = document.createElement("button");
    button.dataset.pickerStop = i;
    button.className = "picker-stop";
    button.setAttribute("aria-label", `Farbwert ${i + 1}`);
    button.onpointerdown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.stop = i;
      state.hsv = studioRGBToHSV(stop.colour);
      state.editing = false;
      button.focus();
      studioRenderPicker(false);
      const start = event.clientX,
        r = $("#paintGradientBar").getBoundingClientRect();
      let begun = false;
      button.setPointerCapture(event.pointerId);
      const move = (e) => {
          if (!begun && Math.abs(e.clientX - start) < 2) return;
          if (!begun) {
            studioPickerBegin();
            begun = true;
          }
          studioMoveStop((e.clientX - r.left) / r.width);
          studioPickerApply();
          studioRenderPicker(false);
        },
        finish = () => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerup", finish);
          button.removeEventListener("pointercancel", finish);
          state.editing = false;
        };
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerup", finish);
      button.addEventListener("pointercancel", finish);
    };
    button.onfocus = () => {
      state.stop = i;
      state.hsv = studioRGBToHSV(stop.colour);
      studioRenderPicker(false);
    };
    button.onkeydown = (event) => {
      if (["Delete", "Backspace"].includes(event.key)) {
        event.preventDefault();
        state.stop = i;
        studioDeleteStop();
      }
      if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        state.stop = i;
        studioPickerAction(() =>
          studioMoveStop(
            stop.at +
              (event.key === "ArrowRight" ? 1 : -1) *
                (event.shiftKey ? 0.1 : 0.01),
          ),
        );
      }
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        state.stop = i;
        state.hsv = studioRGBToHSV(stop.colour);
        studioRenderPicker(false);
        $("#paintHex").focus();
      }
    };
    root.append(button);
    if (i === state.value.stops.length - 1) return;
    const mid = document.createElement("button");
    mid.dataset.pickerMid = i;
    mid.className = "picker-mid";
    mid.setAttribute("role", "slider");
    mid.setAttribute(
      "aria-label",
      `Verlaufsmitte zwischen Farbwert ${i + 1} und ${i + 2}`,
    );
    mid.setAttribute("aria-valuemin", "5");
    mid.setAttribute("aria-valuemax", "95");
    mid.onpointerdown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.stop = i;
      state.hsv = studioRGBToHSV(stop.colour);
      state.editing = false;
      studioPickerBegin();
      mid.setPointerCapture(event.pointerId);
      const r = $("#paintGradientBar").getBoundingClientRect(),
        move = (e) => {
          const at = studioPaintClamp((e.clientX - r.left) / r.width);
          stop.mid = studioPaintClamp(
            (at - stop.at) / (state.value.stops[i + 1].at - stop.at),
            0.05,
            0.95,
          );
          studioPickerApply();
          studioRenderPicker(false);
        },
        finish = () => {
          mid.removeEventListener("pointermove", move);
          mid.removeEventListener("pointerup", finish);
          mid.removeEventListener("pointercancel", finish);
          state.editing = false;
        };
      mid.addEventListener("pointermove", move);
      mid.addEventListener("pointerup", finish);
      mid.addEventListener("pointercancel", finish);
      studioRenderPicker(false);
    };
    mid.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      state.stop = i;
      state.hsv = studioRGBToHSV(stop.colour);
      studioPickerAction(
        () =>
          (stop.mid = studioPaintClamp(
            (stop.mid ?? 0.5) + (event.key === "ArrowRight" ? 0.01 : -0.01),
            0.05,
            0.95,
          )),
      );
    };
    root.append(mid);
  });
  studioUpdateGradientHandles();
}
async function studioPickerImport() {
  const state = studioPicker,
    input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,.jpg,.jpeg,.webp,.tif,.tiff";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file || !studioPicker || studioPicker !== state || busy) return;
    $("#paintPlaceImage").disabled = true;
    $("#paintMessage").textContent = "Bild wird geladen …";
    const finishLoading = MKWUIControls.loading("#paintMessage");
    busy = true;
    try {
      if (file.size > 100 * 1024 * 1024)
        throw Error("Maximal 100 MB pro Bild.");
      const normalized = await (await api("/api/import", file)).json(),
        im = {
          ...normalized,
          id: uid(),
          name: file.name,
          original: normalized.data,
        };
      await image(im.data);
      if (studioPicker !== state || state.object.locked) return;
      state.editing = false;
      studioPickerBegin();
      p.images.push(im);
      state.value.imageId = im.id;
      state.value.enabled = true;
      state.value.kind = "image";
      if (state.channel === "fill") {
        state.object.scale = 1;
        state.object.panX = state.object.panY = 0;
      }
      studioPickerApply();
      state.editing = false;
      studioRenderPicker();
      carouselPanel();
      $("#paintMessage").textContent = "Bild eingesetzt.";
    } catch (error) {
      $("#paintMessage").textContent = error.message;
    } finally {
      finishLoading();
      busy = false;
      if ($("#paintPlaceImage")) $("#paintPlaceImage").disabled = false;
    }
  };
  input.id = "paintImageFile";
  $("#paintImageFile")?.remove();
  input.hidden = true;
  document.body.append(input);
  input.click();
}
window.addEventListener("resize", studioPositionPicker);
document.addEventListener(
  "pointerdown",
  (event) => {
    if (
      studioPicker &&
      !event.target.closest(
        '#studioPaintPicker,[data-paint-channel],.paint-wells,input[type="color"]',
      )
    )
      studioClosePicker(false);
  },
  true,
);

document.addEventListener(
  "close",
  (event) => {
    if (studioPicker?.owner === event.target) studioClosePicker(false);
  },
  true,
);
