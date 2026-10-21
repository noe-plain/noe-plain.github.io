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
 <fieldset class="format-choice carousel-slides-choice"><legend>Slides aneinanderreihen</legend><div class="carousel-slide-count"><label>Anzahl<input id="cn" type="number" value="4" min="${MKWCarouselPolicy.minSlides}" max="${MKWCarouselPolicy.maxSlides}" step="1"></label><div><strong id="carouselArtworkSize"></strong><small>1–20 Slides · gemeinsame Montagefläche</small></div></div><div id="carouselSetupStrip" aria-label="Vorschau der Slide-Anordnung"></div></fieldset>`;
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
      { length: Math.max(0, Math.min(MKWCarouselPolicy.maxSlides, n || 0)) },
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
  const intro = $("#setupInstructions");
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
      !MKWCarouselPolicy.validCount(n) ||
      Math.min(top, bottom, left, right) < 0 ||
      top + bottom >= h ||
      left + right >= w
    ) {
      $("#setupError").textContent =
        "Bitte Projektname, 1–20 Slides (240–4000 px) und passende Safezones angeben.";
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
      lw = Math.min(600, w - left - right);
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
  if (!carouselObjectVisible(o)) return "";
  if (["image", "angle"].includes(o.type)) {
    if (!o.imageId || !p.images.some((im) => im.id === o.imageId))
      return "Bild im Rahmen fehlt. Bitte ein Bild auswählen.";
    if (!carouselPhotoCoversFrame(o))
      return "Bild füllt den Rahmen nicht vollständig. Bildausschnitt prüfen oder „Rahmen füllen“ wählen.";
    return "";
  }
  if (o.type !== "text" || !o.text.trim()) return "";
  const bounds = carouselObjectBounds(o),
    index = Math.floor(bounds.x / c.w);
  if (
    index < 0 ||
    index >= c.n ||
    bounds.x + bounds.w > (index + 1) * c.w ||
    bounds.y < 0 ||
    bounds.y + bounds.h > c.h
  )
    return "Text überschreitet eine Slide-Grenze.";
  if (
    bounds.x < index * c.w + 100 ||
    bounds.x + bounds.w > (index + 1) * c.w - 100 ||
    bounds.y < c.top ||
    bounds.y + bounds.h > c.h - c.bottom ||
    bounds.x < c.left ||
    bounds.x + bounds.w > c.n * c.w - c.right
  )
    return "Text liegt ausserhalb der empfohlenen Safezone.";
  if (carouselTextHeight(o) > o.h + 1)
    return "Text passt nicht vollständig in den Textrahmen.";
  return carouselTextLayout(o).lines.some((line) => line.justification?.limited)
    ? MKWJustificationWarning
    : "";
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
    !MKWCarouselPolicy.validCount(c.n) ||
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
  carouselValidateFolders(c);
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
    carouselValidateRefinements(o, c, q);
    if (o.type === "angle" && !MKWAnglePolicy.accepts(o.direction))
      throw Error("Ungültige Winkelrichtung.");
    studioValidatePaint(o);
    if (o.strokeImageId && !q.images.some((im) => im.id === o.strokeImageId))
      throw Error("Konturbild fehlt.");
    if (carouselIsVector(o)) carouselValidateVector(o);
    if (
      o.framePoints &&
      (!["image", "gradient"].includes(o.type) ||
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
      throw Error("Ungültige Rahmenpunkte.");
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
      (!Number.isFinite(o.lineHeight) || o.lineHeight < 0.2 || o.lineHeight > 5)
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
          !["top", "center", "bottom"].includes(o.textAnchor)))
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
  folderDrag: null,
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
  carouselUI.folder = null;
  carouselUI.vectorExtension = null;
  carouselUI.vectorPoints = false;
  carouselUI.vectorNodes = new Set();
  carouselUI.vectorContour = 0;
  const same = carouselSelection === ids.at(-1);
  carouselUI.slide = null;
  for (const o of p.carousel.objects)
    if (ids.includes(o.id)) MKWTypography.clear(o);
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
  return carouselGeometryBounds(o);
}
function carouselSetBoundsValue(o, key, value) {
  const bounds = carouselObjectBounds(o);
  if (key === "x" || key === "y") {
    o[key] += value - bounds[key];
    return;
  }
  const local = carouselLocalBounds(o),
    factor = Math.max(0.001, value) / local[key],
    before = carouselToWorld(o, { x: local.x, y: local.y });
  o[key] *= factor;
  const next = carouselToWorld(o, {
    x: local.x * (key === "w" ? factor : 1),
    y: local.y * (key === "h" ? factor : 1),
  });
  o.x += before.x - next.x;
  o.y += before.y - next.y;
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
    direction: "left",
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
  if (type === "angle" && rect.x === undefined && rect.y === undefined)
    carouselInitialAngle(o);
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
  const objects = carouselSelected().filter((o) => !carouselObjectLocked(o));
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
    .filter((o) => !carouselObjectLocked(o) && o.type !== "logo")
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
