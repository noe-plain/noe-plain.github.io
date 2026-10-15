"use strict";
// Carousel model: see ARCHITECTURE.md for ownership and load order.
let carouselSelection = null,
  carouselZoom = 0.35,
  carouselDraw = 0,
  carouselMode = "post";

const carouselActive = () => !!p.carousel;

function carouselSetup() {
  const host = document.createElement("div");
  host.className = "mode-buttons";
  host.innerHTML =
    '<button data-project-mode="post" aria-pressed="true">Einzelposts</button><button data-project-mode="carousel" aria-pressed="false">Carousel</button>';
  $("#projectSetup .dialog-heading").after(host);
  const input = (id, label, value, min = 0, max = 4000) =>
    `<label>${label} (px)<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="1"></label>`;
  const options = document.createElement("section");
  options.id = "carouselSetup";
  options.hidden = true;
  options.innerHTML = `
 <fieldset class="format-choice carousel-format-choice"><legend><span id="carouselFormatRatio">4:5</span> · Carousel</legend><div class="format-row"><div class="format-dimensions"><h4>Arbeitsfläche pro Slide</h4><div class="format-fields">${input("cw", "Breite", 1080, 240)}${input("ch", "Höhe", 1350, 240)}</div><small>Texthilfslinien: 100 px vom Slide-Rand</small></div><div class="safezone-editor"><div class="safe-preview" id="carouselSafePreview"><div class="safe-preview-inner sixths"><span>Safezone</span></div></div><div class="safe-input safe-top">${input("ct", "Oben", 100)}</div><div class="safe-input safe-bottom">${input("cb", "Unten", 200)}</div></div></div><div class="carousel-outer-margins"><span>Safezone für das gesamte Artwork</span><div class="format-fields">${input("cl", "Links", 100)}${input("cr", "Rechts", 100)}</div></div></fieldset>
 <fieldset class="format-choice carousel-slides-choice"><legend>Slides aneinanderreihen</legend><div class="carousel-slide-count"><label>Anzahl<input id="cn" type="number" value="4" min="2" max="20" step="1"></label><div><strong id="carouselArtworkSize"></strong><small>2–20 Slides · gemeinsame Montagefläche</small></div></div><div id="carouselSetupStrip" aria-label="Vorschau der Slide-Anordnung"></div><p>Bilder dürfen über die Slide-Grenzen laufen. Für Texte erscheinen Hinweise beim Überschreiten. Safezone und Sechstelraster helfen beim Ausrichten.</p></fieldset>`;
  $("#formatChoices").before(options);
  const refresh = () => {
    const w = +$("#cw").value,
      h = +$("#ch").value,
      n = +$("#cn").value,
      top = +$("#ct").value,
      bottom = +$("#cb").value,
      left = +$("#cl").value,
      right = +$("#cr").value;
    const preview = $("#carouselSafePreview");
    preview.style.aspectRatio = `${Math.max(1, w)}/${Math.max(1, h)}`;
    preview.style.setProperty(
      "--top",
      Math.min(95, (top / Math.max(1, h)) * 100) + "%",
    );
    preview.style.setProperty(
      "--bottom",
      Math.min(95, (bottom / Math.max(1, h)) * 100) + "%",
    );
    $("#carouselFormatRatio").textContent =
      w > 0 && h > 0 ? MKW.ratio(w, h).replace("x", ":") : "Eigenes Format";
    $("#carouselArtworkSize").textContent = `${w * n} × ${h} px gesamt`;
    $("#carouselSetupStrip").innerHTML = Array.from(
      { length: Math.max(0, Math.min(20, n || 0)) },
      (_, i) =>
        `<div style="aspect-ratio:${Math.max(1, w)}/${Math.max(1, h)}"><span>${i + 1}</span><i style="top:${Math.min(95, (top / Math.max(1, h)) * 100)}%;bottom:${Math.min(95, (bottom / Math.max(1, h)) * 100)}%;left:${((i === 0 ? left : 100) / Math.max(1, w)) * 100}%;right:${((i === n - 1 ? right : 100) / Math.max(1, w)) * 100}%"></i></div>`,
    ).join("");
    options
      .querySelector(".format-choice")
      .classList.toggle(
        "invalid",
        top + bottom >= h || left + right >= w || w < 240 || h < 240,
      );
  };
  options.querySelectorAll("input").forEach((el) => (el.oninput = refresh));
  refresh();
  const intro =
    $("#formatChoices").previousElementSibling === options
      ? options.previousElementSibling
      : null;
  const postIntro = intro?.textContent;
  host.querySelectorAll("button").forEach(
    (btn) =>
      (btn.onclick = () => {
        carouselMode = btn.dataset.projectMode;
        host
          .querySelectorAll("button")
          .forEach((b) => b.setAttribute("aria-pressed", b === btn));
        $("#carouselSetup").hidden = carouselMode !== "carousel";
        $("#formatChoices").hidden = carouselMode === "carousel";
        $("#addFormat").hidden = carouselMode === "carousel";
        $("#projectSetup .setup-actions").classList.toggle(
          "carousel-setup-actions",
          carouselMode === "carousel",
        );
        if (intro && postIntro)
          intro.textContent =
            carouselMode === "carousel"
              ? "Bestimme Format, Safezone und Anzahl der Slides. Alle Slides bilden eine gemeinsame Montagefläche."
              : postIntro;
        refresh();
      }),
  );
  const create = $("#createProject").onclick;
  $("#createProject").onclick = async () => {
    if (carouselMode !== "carousel") return create();
    const w = +$("#cw").value,
      h = +$("#ch").value,
      n = +$("#cn").value,
      top = +$("#ct").value,
      bottom = +$("#cb").value,
      left = +$("#cl").value,
      right = +$("#cr").value;
    if (
      !$("#setupName").value.trim() ||
      ![w, h, n, top, bottom, left, right].every(Number.isInteger) ||
      w < 240 ||
      h < 240 ||
      w > 4000 ||
      h > 4000 ||
      n < 2 ||
      n > 20 ||
      Math.min(top, bottom, left, right) < 0 ||
      top + bottom >= h ||
      left + right >= w
    ) {
      $("#setupError").textContent =
        "Bitte Projektname, 2–20 Slides (240–4000 px) und passende Safezones angeben.";
      return;
    }
    if (savedRevision < revision) await autosave();
    const fonts = p.fonts;
    p = fresh();
    p.fonts = fonts;
    p.meta.title = $("#setupName").value.trim();
    p.meta.code = $("#setupCode").value.trim();
    p.carousel = {
      w,
      h,
      n,
      top,
      bottom,
      left,
      right,
      bg: "#ffffff",
      objects: [],
    };
    const c = makeCanvas(1, 1),
      data = c.toDataURL();
    const im = {
      id: uid(),
      name: "Carousel",
      data,
      original: data,
      width: w,
      height: h,
    };
    p.images.push(im);
    for (let i = 0; i < n; i++) {
      const b = basicBoard(im, w, h);
      b.carouselSlide = i;
      p.boards.push(b);
    }
    const logo = await image("mkw-logo-bold-neg.svg"),
      lw = Math.min(650, w - left - right);
    p.carousel.objects.push({
      id: uid(),
      type: "logo",
      name: "MKW Logo",
      x: w - right - lw,
      y: top,
      w: lw,
      h: (lw * logo.height) / logo.width,
      source: "white",
      visible: true,
      locked: false,
      opacity: 1,
    });
    selected = null;
    carouselSelection = null;
    carouselUI.ids.clear();
    carouselUI.slide = null;
    carouselUI.tool = "select";
    history = [];
    future = [];
    busy = false;
    setupCommitted = true;
    $("#projectSetup").close();
    $("#startDialog").close();
    changed();
  };
}

function carouselWarning(o) {
  const c = p.carousel;
  if (o.type !== "text" || !o.text.trim() || o.visible === false) return "";
  const index = Math.floor(o.x / c.w);
  if (
    index < 0 ||
    index >= c.n ||
    o.x + o.w > (index + 1) * c.w ||
    o.y < 0 ||
    o.y + o.h > c.h
  )
    return "Text überschreitet eine Slide-Grenze.";
  if (
    o.x < index * c.w + 100 ||
    o.x + o.w > (index + 1) * c.w - 100 ||
    o.y < c.top ||
    o.y + o.h > c.h - c.bottom ||
    o.x < c.left ||
    o.x + o.w > c.n * c.w - c.right
  )
    return "Text liegt ausserhalb der empfohlenen Safezone.";
  if (carouselTextHeight(o) > o.h + 1)
    return "Text passt nicht vollständig in den Textrahmen.";
  return "";
}

function carouselGradientPoints(o) {
  const a = (o.rotation * Math.PI) / 180,
    dx = (Math.cos(a) * o.w) / 2,
    dy = (Math.sin(a) * o.h) / 2;
  return {
    start: o.gradientStart
      ? { x: o.gradientStart.x * o.w, y: o.gradientStart.y * o.h }
      : o.kind === "radial"
        ? { x: o.w / 2, y: o.h / 2 }
        : { x: o.w / 2 - dx, y: o.h / 2 - dy },
    end: o.gradientEnd
      ? { x: o.gradientEnd.x * o.w, y: o.gradientEnd.y * o.h }
      : { x: o.w / 2 + dx, y: o.h / 2 + dy },
  };
}

function validateCarousel(q) {
  const c = q.carousel;
  if (!c) return;
  if (
    !["w", "h", "n", "top", "bottom", "left", "right"].every((k) =>
      Number.isInteger(c[k]),
    ) ||
    c.w < 240 ||
    c.h < 240 ||
    c.w > 4000 ||
    c.h > 4000 ||
    c.n < 2 ||
    c.n > 20 ||
    Math.min(c.top, c.bottom, c.left, c.right) < 0 ||
    c.top + c.bottom >= c.h ||
    c.left + c.right >= c.w ||
    !/^#[0-9a-f]{6}$/i.test(c.bg) ||
    !Array.isArray(c.objects) ||
    c.objects.length > 500 ||
    q.boards.length !== c.n
  )
    throw Error("Ungültiges Carousel-Projekt.");
  for (const [i, b] of q.boards.entries())
    if (b.carouselSlide !== i || b.w !== c.w || b.h !== c.h)
      throw Error("Ungültige Carousel-Slides.");
  const ids = new Set();
  for (const o of c.objects) {
    if (
      typeof o.id !== "string" ||
      ids.has(o.id) ||
      !["text", "image", "logo", "gradient", "angle", "path", "shape"].includes(
        o.type,
      ) ||
      !["x", "y", "w", "h", "opacity"].every((k) => Number.isFinite(o[k])) ||
      o.w <= 0 ||
      o.h <= 0 ||
      o.w > 100000 ||
      o.h > 100000 ||
      Math.abs(o.x) > 100000 ||
      Math.abs(o.y) > 100000 ||
      o.opacity < 0 ||
      o.opacity > 1
    )
      throw Error("Ungültige Carousel-Ebene.");
    ids.add(o.id);
    studioValidatePaint(o);
    if (o.strokeImageId && !q.images.some((im) => im.id === o.strokeImageId))
      throw Error("Konturbild fehlt.");
    if (carouselIsVector(o)) carouselValidateVector(o);
    if (
      o.framePoints &&
      (o.type !== "image" ||
        !Array.isArray(o.framePoints) ||
        o.framePoints.length < 3 ||
        o.framePoints.length > 8 ||
        o.framePoints.some(
          (point) =>
            !point ||
            !["x", "y"].every(
              (key) =>
                Number.isFinite(point[key]) &&
                point[key] >= 0 &&
                point[key] <= 1,
            ),
        ) ||
        (o.framePointSide &&
          !["left", "right", "top", "bottom"].includes(o.framePointSide)))
    )
      throw Error("Ungültige Bildrahmenpunkte.");
    if (
      o.framePointSlots &&
      (!o.framePoints ||
        !Array.isArray(o.framePointSlots) ||
        o.framePointSlots.length !== o.framePoints.length ||
        o.framePointSlots.some(
          (slot, index) =>
            !Number.isInteger(slot) ||
            slot < 0 ||
            slot > 7 ||
            (index > 0 && slot <= o.framePointSlots[index - 1]),
        ))
    )
      throw Error("Ungültige Rahmenpunkt-Auswahl.");
    if (
      o.type === "gradient" &&
      ["startAlpha", "endAlpha"].some(
        (key) =>
          o[key] !== undefined &&
          (!Number.isFinite(o[key]) || o[key] < 0 || o[key] > 1),
      )
    )
      throw Error("Ungültige Verlaufstransparenz.");
    if (
      o.textStyles &&
      (o.type !== "text" ||
        !Array.isArray(o.textStyles) ||
        o.textStyles.length > 10000 ||
        o.textStyles.some(
          (style) =>
            style &&
            ((style.align !== undefined &&
              !carouselValidTextAlign(style.align)) ||
              (style.size !== undefined &&
                (!Number.isFinite(style.size) ||
                  style.size < 1 ||
                  style.size > 1000)) ||
              (style.leading &&
                (!Array.isArray(style.leading) ||
                  style.leading.length > 10000 ||
                  style.leading.some(
                    (value) =>
                      value !== null &&
                      (!Number.isFinite(value) || value < 1 || value > 3000),
                  )))),
        ))
    )
      throw Error("Ungültige Absatzformatierung.");
    if (
      o.lineHeight !== undefined &&
      (!Number.isFinite(o.lineHeight) || o.lineHeight < 0.2 || o.lineHeight > 3)
    )
      throw Error("Ungültige Zeilenhöhe.");
    if (
      o.type === "text" &&
      (typeof o.text !== "string" ||
        !Number.isFinite(o.size) ||
        o.size < 1 ||
        o.size > 1000 ||
        (o.textAlign !== undefined && !carouselValidTextAlign(o.textAlign)) ||
        (o.textAnchor !== undefined &&
          !["top", "bottom"].includes(o.textAnchor)))
    )
      throw Error("Ungültiger Carousel-Text.");
    if (o.imageId && !q.images.some((im) => im.id === o.imageId))
      throw Error("Carousel-Bild fehlt.");
  }
}

const carouselUI = {
  tool: "select",
  ids: new Set(),
  editing: null,
  space: false,
  content: false,
  framePoints: false,
  textParagraph: 0,
  textLine: 0,
  guides: true,
  snap: true,
  drag: null,
  clipboard: [],
  layerDrag: null,
  propertyUndo: false,
  snapLines: [],
  slide: null,
  touches: new Map(),
  pinch: null,
};

const carouselToolNames = {
  select: "Auswählen & verschieben",
  content: "Bildausschnitt",
  text: "Text",
  image: "Bildrahmen",
  angle: "Bildwinkel",
  gradient: "Verlauf",
  path: "Pfad zeichnen",
  curve: "Kurven bearbeiten",
  shape: "Form zeichnen",
  builder: "Formkonstrukteur",
  hand: "Arbeitsfläche verschieben",
  zoom: "Zoom",
};

const carouselToolKeys = {
  v: "select",
  a: "content",
  t: "text",
  f: "image",
  g: "gradient",
  w: "angle",
  p: "path",
  r: "shape",
  m: "shape",
  l: "shape",
  b: "builder",
  c: "curve",
  h: "hand",
  z: "zoom",
};

function carouselIcon(name) {
  return studioIcon(name);
}

function carouselSelected() {
  const c = p.carousel;
  if (!c) return [];
  if (carouselSelection && !carouselUI.ids.has(carouselSelection))
    carouselUI.ids = new Set([carouselSelection]);
  return c.objects.filter((o) => carouselUI.ids.has(o.id));
}

function carouselSelect(ids) {
  carouselUI.vectorExtension = null;
  carouselUI.vectorPoints = false;
  carouselUI.vectorNodes = new Set();
  carouselUI.vectorContour = 0;
  const same = carouselSelection === ids.at(-1);
  carouselUI.slide = null;
  carouselUI.ids = new Set(ids);
  carouselSelection = ids.at(-1) || null;
  carouselUI.content = false;
  carouselUI.framePoints = false;
  if (!same) carouselUI.textParagraph = carouselUI.textLine = 0;
  carouselPanel();
  carouselRefresh();
}

function carouselTool(tool) {
  if (!carouselToolAvailable(tool)) return;
  if (carouselPathDraft) carouselFinishPath();
  carouselUI.vectorPoints =
    ["curve", "path"].includes(tool) && carouselSelected()[0]?.type === "path";
  carouselEndText();
  carouselUI.tool = tool === "content" ? "select" : tool;
  carouselUI.content = tool === "content";
  carouselUI.framePoints = false;
  if (
    ["curve", "path"].includes(tool) &&
    carouselSelected()[0]?.type === "shape"
  )
    carouselStartPointEditing(carouselSelected()[0]);
  carouselToolUI();
  carouselPanel();
  carouselRefresh();
}

function carouselObjectBounds(o) {
  if (o.type !== "path") return { x: o.x, y: o.y, w: o.w, h: o.h };
  const bounds = MKWBezier.bounds(o.contours || [o.points], o.closed);
  return {
    x: o.x + bounds.x * o.w,
    y: o.y + bounds.y * o.h,
    w: Math.max(0.001, bounds.w * o.w),
    h: Math.max(0.001, bounds.h * o.h),
  };
}
function carouselSetBoundsValue(o, key, value) {
  const bounds = carouselObjectBounds(o);
  if (key === "x" || key === "y") {
    o[key] += value - bounds[key];
    return;
  }
  const axis = key === "w" ? "x" : "y",
    factor = Math.max(0.001, value) / bounds[key];
  o[axis] = bounds[axis] + (o[axis] - bounds[axis]) * factor;
  o[key] *= factor;
}
function carouselBounds(objects) {
  if (!objects.length) return null;
  const bounds = objects.map(carouselObjectBounds),
    x = Math.min(...bounds.map((o) => o.x)),
    y = Math.min(...bounds.map((o) => o.y));
  return {
    x,
    y,
    w: Math.max(...bounds.map((o) => o.x + o.w)) - x,
    h: Math.max(...bounds.map((o) => o.y + o.h)) - y,
  };
}

function carouselDefault(type, rect = {}) {
  const c = p.carousel;
  const viewport = $("#carouselViewport"),
    canvasRect = $("#carouselCanvas")?.getBoundingClientRect(),
    viewRect = viewport?.getBoundingClientRect();
  const x = Math.max(
    c.left,
    Math.min(
      (c.n - 1) * c.w,
      canvasRect && viewRect
        ? (viewRect.left - canvasRect.left) / carouselZoom
        : 0,
    ),
  );
  return {
    ...carouselVectorDefaults(type),
    id: uid(),
    type,
    name: {
      path: "Pfad zeichnen",
      shape: "Form zeichnen",
      text: "Text",
      gradient: "Verlauf",
      angle: "Bildwinkel",
      image: "Bildrahmen",
    }[type],
    x,
    y: c.top,
    w: Math.min(800, c.w - 200),
    h: type === "text" ? 200 : 400,
    visible: true,
    locked: false,
    opacity: 1,
    text: "",
    textAnchor: "top",
    textAlign: "left",
    lineHeight: (studioPreferences.lineHeight || 95) / 100,
    size: 70,
    font: "Replica LL",
    color: "#ffffff",
    startAlpha: 1,
    endColor: "#000000",
    endAlpha: 0,
    blend: "source-over",
    kind: "linear",
    rotation: 0,
    direction: "right",
    thickness: 150,
    glow: 50,
    glowColor: "#ffffff",
    glowAlpha: 0.6,
    scale: 1,
    panX: 0,
    panY: 0,
    flipX: 1,
    flipY: 1,
    ...(type === "gradient"
      ? { opacity: 0.39, endAlpha: 1, blend: "multiply", rotation: 90 }
      : {}),
    ...rect,
  };
}

function carouselObject(type, rect = {}) {
  checkpoint();
  carouselUI.slide = null;
  carouselUI.framePoints = false;
  const o = carouselDefault(type, rect);
  if (type === "angle" && !rect.w) {
    o.w = 550;
    o.h = 1100;
  }
  if (type === "angle") carouselAngleAlign(o);
  p.carousel.objects.push(o);
  carouselUI.ids = new Set([o.id]);
  carouselSelection = o.id;
  changed();
  return o;
}

function carouselFile(target = null) {
  const input = $("#carouselFile");
  input.value = "";
  input.multiple = !target;
  input.onchange = (ev) => carouselImport([...ev.target.files], target);
  input.click();
}

async function carouselImport(files, target) {
  if (!files.length || busy) return;
  carouselEndText();
  busy = true;
  $("#importDialog").showModal();
  let imported = 0;
  try {
    checkpoint();
    for (const [index, file] of [...files].entries()) {
      showImportStage(index, files.length, file.name, 0);
      $("#importExplanation").textContent =
        "Dein Bild wird geladen und in den Carousel-Rahmen eingesetzt.";
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
      p.images.push(im);
      let o = p.carousel.objects.find((o) => o.id === target);
      if (!o) {
        o = carouselDefault("image", {
          h: p.carousel.h,
          w: Math.min((im.width / im.height) * p.carousel.h, 100000),
          y: 0,
        });
        p.carousel.objects.unshift(o);
      }
      o.imageId = im.id;
      if (carouselIsVector(o)) {
        o.fillMode = "image";
        o.fillEnabled = true;
      } else o.name = file.name;
      o.scale = 1;
      o.panX = o.panY = 0;
      carouselSelection = o.id;
      carouselUI.ids = new Set([o.id]);
      imported++;
    }
    changed();
    status(`${imported} Bilder im Carousel platziert.`);
  } catch (e) {
    if (imported) changed();
    status(e.message);
  } finally {
    busy = false;
    $("#importDialog").close();
    carouselPanel();
  }
}

function carouselDuplicate() {
  const objects = carouselSelected().filter((o) => !o.locked);
  if (!objects.length) return;
  checkpoint();
  const copies = objects.map((o) => ({
    ...clone(o),
    id: uid(),
    x: o.x + 30,
    y: o.y + 30,
  }));
  p.carousel.objects.push(...copies);
  carouselUI.ids = new Set(copies.map((o) => o.id));
  carouselSelection = copies.at(-1).id;
  changed();
}

function carouselDelete() {
  const ids = carouselSelected()
    .filter((o) => !o.locked && o.type !== "logo")
    .map((o) => o.id);
  if (!ids.length) return;
  checkpoint();
  p.carousel.objects = p.carousel.objects.filter((o) => !ids.includes(o.id));
  carouselSelection = null;
  carouselUI.ids.clear();
  changed();
}

function carouselLayerOrder(direction) {
  const selectedIds = new Set(
    carouselSelected()
      .filter((o) => o.type !== "logo")
      .map((o) => o.id),
  );
  if (!selectedIds.size) return;
  let a = p.carousel.objects.filter((o) => o.type !== "logo");
  const logos = p.carousel.objects.filter((o) => o.type === "logo");
  if (direction === "front" || direction === "back") {
    const chosen = a.filter((o) => selectedIds.has(o.id)),
      rest = a.filter((o) => !selectedIds.has(o.id));
    a = direction === "front" ? [...rest, ...chosen] : [...chosen, ...rest];
  } else if (direction === "up") {
    for (let i = a.length - 2; i >= 0; i--)
      if (selectedIds.has(a[i].id) && !selectedIds.has(a[i + 1].id))
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
  } else {
    for (let i = 1; i < a.length; i++)
      if (selectedIds.has(a[i].id) && !selectedIds.has(a[i - 1].id))
        [a[i], a[i - 1]] = [a[i - 1], a[i]];
  }
  const next = [...a, ...logos];
  if (next.every((o, i) => o === p.carousel.objects[i])) return;
  checkpoint();
  p.carousel.objects = next;
  changed();
}

function carouselKeepLogosOnTop(c = p.carousel) {
  const first = c.objects.findIndex((o) => o.type === "logo");
  if (first < 0 || !c.objects.slice(first).some((o) => o.type !== "logo"))
    return;
  c.objects = [
    ...c.objects.filter((o) => o.type !== "logo"),
    ...c.objects.filter((o) => o.type === "logo"),
  ];
}
