"use strict";
// Designer render: see ARCHITECTURE.md for ownership and load order.
async function carouselPaint(
  ctx,
  slide = null,
  scale = 1,
  transparent = false,
  editingId = null,
  objects = null,
  isCurrent = () => true,
  loadImage = image,
  project = p,
) {
  const c = project.carousel;
  if (
    (objects || c.objects).some(
      (o) => o.type === "text" && MKWTextHyphen.requires(o),
    )
  ) {
    await MKWTextHyphen.ensure();
    if (!isCurrent()) return;
  }
  carouselKeepLogosOnTop(c);
  ctx.save();
  ctx.scale(scale, scale);
  if (slide !== null) {
    ctx.beginPath();
    ctx.rect(0, 0, c.w, c.h);
    ctx.clip();
    ctx.translate(-slide * c.w, 0);
  }
  if (!transparent) {
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, c.w * c.n, c.h);
  }
  for (const o of objects || c.objects) {
    if (!isCurrent()) break;
    if (!carouselObjectVisible(o, c) || o.id === editingId) continue;
    // Photos clipped to other slides must not repeatedly decode during each export.
    if (
      slide !== null &&
      o.type === "image" &&
      !carouselImageOnSlide(o, slide, c)
    )
      continue;
    if (carouselHasEffects(o)) {
      await carouselPaintEffect(ctx, o, scale, loadImage, project);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = o.opacity ?? 1;
    ctx.globalCompositeOperation = o.blend || "source-over";
    ctx.translate(o.x, o.y);
    if (o.angle) ctx.rotate((o.angle * Math.PI) / 180);
    if (o.type === "text") {
      ctx.fillStyle = studioPaintRGBA(o.color, o.textAlpha ?? 1);
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const layout = carouselTextLayout(o, ctx),
        offset = carouselTextOffset(o, layout);
      for (const line of layout.lines) {
        for (const run of line.runs) {
          carouselPaintTextRun(
            ctx,
            run,
            line.x + run.x,
            line.y + run.dy + offset,
            studioPaintRGBA(run.color || o.color, o.textAlpha ?? 1),
          );
        }
      }
    } else if (carouselIsVector(o)) {
      await carouselPaintVector(ctx, o, loadImage, project);
    } else if (o.type === "gradient") {
      if (o.gradientFillMode === "image") ctx.globalAlpha *= o.startAlpha ?? 1;
      ctx.fillStyle = await studioCanvasPaint(
        ctx,
        o,
        "fill",
        loadImage,
        project,
      );
      ctx.fill(carouselImageMask(o));
    } else if (o.type === "logo") {
      const im = await carouselLogoImage(o, project);
      ctx.drawImage(im, 0, 0, o.w, o.h);
    } else {
      carouselClipPhoto(ctx, o, scale);
      await carouselPaintPhoto(ctx, o, loadImage, 0, project);
    }
    ctx.restore();
  }
  ctx.restore();
}

// Effects process photo pixels before applying the unchanged crop boundary.
function carouselClipPhoto(ctx, o, scale) {
  if (o.type === "angle") {
    const path = carouselAngleMask(o);
    ctx.save();
    ctx.shadowColor =
      o.glowColor +
      Math.round(o.glowAlpha * 255)
        .toString(16)
        .padStart(2, "0");
    ctx.shadowBlur = o.glow * scale;
    ctx.fillStyle = "#ffffff";
    ctx.fill(path);
    ctx.restore();
    ctx.clip(path);
  } else ctx.clip(carouselImageMask(o));
}

async function carouselPaintPhoto(ctx, o, loadImage, edgePad = 0, project = p) {
  const im = project.images.find((im) => im.id === o.imageId);
  if (!im) {
    ctx.fillStyle = "#68768b";
    ctx.fillRect(0, 0, o.w, o.h);
    return;
  }
  const bitmap = await loadImage(im.data, project),
    fit = Math.max(o.w / im.width, o.h / im.height) * o.scale,
    w = im.width * fit,
    h = im.height * fit,
    x = -w / 2,
    y = -h / 2,
    bw = bitmap.width,
    bh = bitmap.height;
  ctx.save();
  ctx.translate(o.w / 2 + o.panX, o.h / 2 + o.panY);
  ctx.scale(o.flipX, o.flipY);
  ctx.drawImage(bitmap, x, y, w, h);
  if (edgePad) {
    // Clamp the source edge for the blur kernel. Final compositing still clips
    // to the actual photo footprint, so uncovered areas never become filled.
    const columns = [
        [0, 1, x - edgePad, edgePad],
        [0, bw, x, w],
        [bw - 1, 1, x + w, edgePad],
      ],
      rows = [
        [0, 1, y - edgePad, edgePad],
        [0, bh, y, h],
        [bh - 1, 1, y + h, edgePad],
      ];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        if (row === 1 && col === 1) continue;
        const [sx, sw, dx, dw] = columns[col],
          [sy, sh, dy, dh] = rows[row];
        ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
      }
  }
  ctx.restore();
}

function carouselImageOnSlide(o, slide, c = p.carousel) {
  const b = carouselObjectBounds(o);
  return (
    b.x + b.w > slide * c.w &&
    b.x < (slide + 1) * c.w &&
    b.y + b.h > 0 &&
    b.y < c.h
  );
}

function carouselToolUI() {
  if (!$("#carouselEditor")) return;
  document
    .querySelectorAll("button[data-tool]")
    .forEach((btn) =>
      btn.setAttribute("aria-pressed", btn.dataset.tool === carouselUI.tool),
    );
  $("#carouselViewport").dataset.tool = carouselUI.space
    ? "hand"
    : carouselUI.content
      ? "content"
      : carouselUI.tool;
  $("#carouselToolName").textContent = carouselToolNames[carouselUI.tool];
  $("#carouselHint").textContent = {
    select: carouselUI.content
      ? "Bildinhalt verschieben · Escape: zurück zum Rahmen"
      : "Rahmen auswählen und verschieben · Doppelklick: Bildinhalt · Shift: Mehrfachauswahl",
    content:
      "Bildinhalt im Rahmen verschieben · Doppelklick auf ein Bild zum Umschalten",
    text: "Textrahmen aufziehen · Doppelklick auf Text zum Schreiben",
    image: "Bildrahmen aufziehen, danach Bild auswählen",
    gradient:
      "Verlaufsrahmen aufziehen · auf bestehendem Verlauf Richtung ziehen",
    angle: "Winkelrahmen aufziehen · Bildfüllung rechts auswählen",
    hand: "Montagefläche ziehen · Leertaste: vorübergehend Handwerkzeug",
    builder: "Über Formbereiche ziehen: vereinen · Alt/Option: entfernen",
    curve: "Shift+C · Punkt anklicken: Ecke / Kurve · Ziehen: Kurvengriffe",
    path: "Klicken: Punkte setzen · Ziehen: Kurve · Enter / Doppelklick: fertig · Escape: abbrechen",
    shape:
      "Form aufziehen · Shift: gleiche Seiten · Form und Farben rechts einstellen",
    zoom: "Klicken: vergrössern · Alt: verkleinern · Pinch oder Alt/Option + Scrollen: Zoom",
  }[carouselUI.tool];
}

function carouselRender() {
  MKWUIControls.designer(null);
  carouselPathDraft = null;
  carouselUI.vectorPoints = false;
  carouselEndText();
  document.body.classList.toggle("carousel-mode", carouselActive());
  $("#carouselEditor")?.remove();
  window.MKWWorkspaceScroll?.sync();
  $(".carousel-statusbar")?.remove();
  studioSyncFooter();
  if (!carouselActive()) return false;
  const c = p.carousel;
  carouselKeepLogosOnTop(c);
  if (carouselUI.slide !== null)
    carouselUI.slide = Math.max(0, Math.min(c.n - 1, carouselUI.slide));
  const firstView = !Number.isFinite(c.zoom);
  carouselZoom = c.zoom || carouselZoom;
  carouselUI.ids = new Set(
    [...carouselUI.ids].filter((id) => c.objects.some((o) => o.id === id)),
  );
  if (!c.objects.some((o) => o.id === carouselSelection))
    carouselSelection = null;
  $("#projectName").value = p.meta.title;
  $("#projectCode").value = p.meta.code;
  $("#savePSD").hidden = false;
  const host = document.createElement("section");
  host.id = "carouselEditor";
  host.innerHTML = `
 <nav class="carousel-contextbar studio-commandbar" aria-label="Gestaltungswerkzeuge"><span class="studio-mode-label">Designer</span><span id="carouselToolName"></span><div class="studio-tool-surface"><div class="carousel-toolrail studio-tool-group">${Object.entries(
   carouselToolNames,
 )
   .filter(
     ([key]) =>
       !["zoom", "content"].includes(key) && carouselToolAvailable(key),
   )
   .map(
     ([key, name]) =>
       `<button data-tool="${key}" aria-label="${name}" aria-pressed="${carouselUI.tool === key}" title="${name} (${
         key === "curve"
           ? "Shift+C"
           : key === "shape"
             ? "M: Rechteck / L: Ellipse"
             : Object.keys(carouselToolKeys)
                 .find((k) => carouselToolKeys[k] === key)
                 .toUpperCase()
       })">${carouselIcon(key)}<span>${name}</span></button>`,
   )
   .join(
     "",
   )}</div></div><div class="studio-bar-actions"><button id="carouselNotice" class="studio-action studio-notice-button" aria-controls="studioWarnings" aria-expanded="false" hidden></button><button id="carouselExport" class="studio-action" aria-label="Export">${studioIcon("export")}<span>Export</span></button></div></nav>
 <div id="carouselViewport" tabindex="0" aria-label="Designer-Montagefläche"><div id="carouselPasteboard"><div id="carouselArtwork"><canvas id="carouselCanvas" aria-label="Designer-Gestaltung"></canvas><div id="carouselGuides"></div><div id="carouselSnapOverlay"></div><div id="carouselSelectionOverlay"></div><div id="carouselEditingOverlay"></div><div id="carouselSlideControls"></div></div></div><canvas id="carouselOutsideCanvas" aria-hidden="true"></canvas></div>
 <aside id="carouselSidebar" aria-label="Designer-Eigenschaften und Ebenen"><h2 class="visually-hidden">Designer</h2><h3 class="visually-hidden">Eigenschaften</h3><section id="carouselProperties" aria-label="Eigenschaften"></section><section class="carousel-layers-panel"><div class="carousel-section-heading"><h3>Ebenen</h3></div><div id="carouselLayers"></div></section></aside><div class="carousel-statusbar"><span id="carouselHint" hidden></span><span id="carouselCoordinates" hidden></span><div class="carousel-zoom-controls studio-zoom-controls" role="group" aria-label="Zoom"><button id="carouselFit" aria-label="Artwork einpassen" title="Artwork einpassen">${studioIcon("fit")}</button><button id="carouselZoomOut" aria-label="Ansicht verkleinern" title="Ansicht verkleinern">${studioIcon("minus")}</button><label class="studio-zoom-value"><input id="carouselZoom" aria-label="Zoom in Prozent" type="number" min="5" max="200" step="1" value="${Math.round(MKWZoom.percent(carouselZoom, studioZoomReference(true)))}"><span aria-hidden="true">%</span></label><button id="carouselZoomIn" aria-label="Ansicht vergrössern" title="Ansicht vergrössern">${studioIcon("plus")}</button></div></div><input id="carouselFile" type="file" accept="image/*" multiple hidden>`;
  document.body.append(host);
  window.MKWWorkspaceScroll?.sync();
  MKWUIControls.designer($("#carouselSidebar"));
  $("#footerZoom").append(host.querySelector(".carousel-statusbar"));
  host
    .querySelectorAll("button[data-tool]")
    .forEach((btn) => (btn.onclick = () => carouselTool(btn.dataset.tool)));
  $("#carouselNotice").onclick = studioToggleWarnings;
  $("#carouselExport").onclick = () => {
    carouselEndText();
    openExport();
  };
  $("#carouselZoom").onchange = (ev) => {
    if (!ev.target.value.trim()) return carouselRefresh();
    studioSetZoomPercent(+ev.target.value);
  };
  $("#carouselFit").onclick = carouselFit;
  $("#carouselZoomOut").onclick = () => studioStepZoom(-20);
  $("#carouselZoomIn").onclick = () => studioStepZoom(20);
  const viewport = $("#carouselViewport");
  viewport.oncontextmenu = (event) => {
    if (
      event.ctrlKey &&
      (carouselUI.vectorPoints || ["path", "curve"].includes(carouselUI.tool))
    )
      event.preventDefault();
  };
  if (firstView)
    carouselZoom = Math.min(
      0.6,
      (viewport.clientWidth - 160) / (c.w * c.n),
      (viewport.clientHeight - 128) / c.h,
    );
  viewport.onscroll = () => {
    c.scrollX = viewport.scrollLeft;
    c.scrollY = viewport.scrollTop;
    carouselScheduleOutside();
  };
  viewport.onpointerdown = carouselPointer;
  viewport.ondblclick = (ev) => {
    if (carouselPathDraft || carouselUI.tool === "path") return;
    if (
      carouselUI.space ||
      carouselUI.tool === "hand" ||
      ev.target.closest(".carousel-inline-text")
    )
      return;
    const o = carouselHit(carouselPoint(ev));
    if (!o) return;
    carouselSelect([o.id]);
    if (carouselIsVector(o) && carouselHasImage(o)) {
      carouselUI.content = true;
      carouselUI.tool = "select";
      carouselToolUI();
      carouselRefresh();
      carouselPanel();
    } else if (carouselIsVector(o) && studioPreferences.advanced) {
      carouselStartPointEditing(o);
    } else if (o.type === "text") carouselEditText(o);
    else if (carouselHasImage(o)) {
      carouselUI.content = true;
      carouselUI.tool = "select";
      carouselToolUI();
      carouselRefresh();
      carouselPanel();
    }
  };
  viewport.onwheel = (ev) => {
    if (MKWWorkspaceWheel.horizontal(ev, viewport)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) {
      ev.preventDefault();
      carouselSetZoom(carouselZoom * Math.exp(-ev.deltaY * 0.003), ev);
    } else if (ev.shiftKey) {
      ev.preventDefault();
      viewport.scrollLeft += ev.deltaY || ev.deltaX;
    }
  };
  carouselToolUI();
  carouselPanel();
  carouselRefresh();
  if (firstView) carouselCenter();
  else {
    viewport.scrollLeft =
      c.scrollX ?? (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop =
      c.scrollY ?? (viewport.scrollHeight - viewport.clientHeight) / 2;
  }
  studioSetSidebar(studioSidebarOpen);
  return true;
}

function carouselMaxZoom() {
  return 2;
}

function carouselSetZoom(value, event = null) {
  const viewport = $("#carouselViewport"),
    rect = viewport.getBoundingClientRect(),
    canvasRect = $("#carouselCanvas").getBoundingClientRect(),
    screenX = event ? event.clientX : rect.left + viewport.clientWidth / 2,
    screenY = event ? event.clientY : rect.top + viewport.clientHeight / 2;
  const px = (screenX - canvasRect.left) / carouselZoom,
    py = (screenY - canvasRect.top) / carouselZoom;
  carouselZoom = Math.max(0.05, Math.min(carouselMaxZoom(), value));
  carouselRefresh();
  const next = $("#carouselCanvas").getBoundingClientRect();
  viewport.scrollLeft += next.left + px * carouselZoom - screenX;
  viewport.scrollTop += next.top + py * carouselZoom - screenY;
}

function carouselCenter() {
  const v = $("#carouselViewport");
  v.scrollLeft = (v.scrollWidth - v.clientWidth) / 2;
  v.scrollTop = (v.scrollHeight - v.clientHeight) / 2;
  p.carousel.scrollX = v.scrollLeft;
  p.carousel.scrollY = v.scrollTop;
}

function carouselFit() {
  const c = p.carousel,
    v = $("#carouselViewport");
  carouselSetZoom(
    Math.min((v.clientWidth - 160) / (c.w * c.n), (v.clientHeight - 128) / c.h),
  );
  carouselCenter();
}

let carouselPaintBuffer = null,
  carouselPaintPending = null,
  carouselPaintRunning = false,
  carouselPaintFrame = 0;

const carouselPaintStates = new WeakMap();
function carouselSchedulePaint(canvas, scale, generation) {
  const key = JSON.stringify([
      p.carousel.w,
      p.carousel.h,
      p.carousel.n,
      p.carousel.bg,
      p.carousel.objects,
      scale,
      carouselUI.editing?.composing ? carouselUI.editing.id : null,
      MKWTextHyphen.version,
      fontStatus,
    ]),
    sources = [...p.images, ...p.logos].map((a) => a.data),
    old = carouselPaintStates.get(canvas);
  if (
    old?.key === key &&
    old.project === p &&
    old.fonts === fontStatus &&
    sources.length === old.sources.length &&
    sources.every((src, i) => src === old.sources[i])
  )
    return;
  carouselPaintPending = {
    canvas,
    scale,
    generation,
    key,
    sources,
    fonts: fontStatus,
    project: p,
    editingId: carouselUI.editing?.composing ? carouselUI.editing.id : null,
  };
  if (!carouselPaintRunning && !carouselPaintFrame)
    carouselPaintFrame = requestAnimationFrame(carouselRunPaint);
}

async function carouselRunPaint() {
  carouselPaintFrame = 0;
  if (carouselPaintRunning || !carouselPaintPending) return;
  const job = carouselPaintPending;
  carouselPaintPending = null;
  carouselPaintRunning = true;
  try {
    const current = () =>
      job.generation === carouselDraw &&
      job.project === p &&
      job.canvas.isConnected;
    if (!current()) return;
    carouselPaintBuffer ??= makeCanvas(1, 1);
    if (carouselPaintBuffer.width !== job.canvas.width)
      carouselPaintBuffer.width = job.canvas.width;
    if (carouselPaintBuffer.height !== job.canvas.height)
      carouselPaintBuffer.height = job.canvas.height;
    const ctx = carouselPaintBuffer.getContext("2d");
    ctx.clearRect(0, 0, carouselPaintBuffer.width, carouselPaintBuffer.height);
    await carouselPaint(
      ctx,
      null,
      job.scale,
      false,
      job.editingId,
      null,
      current,
      previewImage,
    );
    if (current()) {
      const out = job.canvas.getContext("2d");
      out.clearRect(0, 0, job.canvas.width, job.canvas.height);
      out.drawImage(carouselPaintBuffer, 0, 0);
      carouselPaintStates.set(job.canvas, {
        key: job.key,
        project: job.project,
        fonts: job.fonts,
        sources: job.sources,
      });
    }
  } catch (error) {
    status(error.message);
  } finally {
    carouselPaintRunning = false;
    if (carouselPaintPending && !carouselPaintFrame)
      carouselPaintFrame = requestAnimationFrame(carouselRunPaint);
  }
}

async function carouselWaitForPaint() {
  while (carouselPaintRunning || carouselPaintPending || carouselPaintFrame)
    await new Promise((resolve) => requestAnimationFrame(resolve));
}

function carouselRefresh() {
  if (!carouselActive() || !$("#carouselCanvas")) return;
  const c = p.carousel;
  carouselKeepLogosOnTop(c);
  carouselZoom = Math.max(0.05, Math.min(carouselZoom, carouselMaxZoom()));
  studioSyncZoomLimits(true, carouselZoom, 0.05, carouselMaxZoom());
  const s = carouselZoom,
    rasterScale = Math.min(
      s,
      16000 / (c.w * c.n),
      Math.sqrt(24000000 / (c.w * c.n * c.h)),
    ),
    canvas = $("#carouselCanvas"),
    generation = ++carouselDraw;
  c.zoom = s;
  if (canvas.width !== Math.ceil(c.w * c.n * rasterScale))
    canvas.width = Math.ceil(c.w * c.n * rasterScale);
  if (canvas.height !== Math.ceil(c.h * rasterScale))
    canvas.height = Math.ceil(c.h * rasterScale);
  const width = c.w * c.n * s,
    height = c.h * s;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  $("#carouselArtwork").style.width = width + "px";
  $("#carouselArtwork").style.height = height + "px";
  const viewport = $("#carouselViewport");
  carouselPasteboardSpace(viewport, width, height);
  carouselScheduleOutside();
  const zoomField = $("#carouselZoom"),
    zoomValue = Math.round(MKWZoom.percent(s, studioZoomReference(true)));
  zoomField.value = zoomValue;
  zoomField.style.width = String(zoomValue).length + "ch";
  zoomField.min = Math.floor(MKWZoom.percent(0.05, studioZoomReference(true)));
  zoomField.max = Math.ceil(
    MKWZoom.percent(carouselMaxZoom(), studioZoomReference(true)),
  );
  carouselSchedulePaint(canvas, rasterScale, generation);
  $("#carouselGuides").hidden = !carouselUI.guides;
  const gridStyle = MKWDesignerGrid.style(c);
  const guideKey = JSON.stringify([
    gridStyle,
    c.w,
    c.h,
    c.n,
    c.top,
    c.bottom,
    c.left,
    c.right,
    s,
    carouselSelected().some((o) => o.type === "angle") ||
      carouselUI.tool === "angle",
  ]);
  if ($("#carouselGuides").dataset.layout !== guideKey) {
    $("#carouselGuides").dataset.layout = guideKey;
    $("#carouselGuides").innerHTML =
      Array.from(
        { length: c.n },
        (_, i) =>
          `<div class="slide-guide" style="left:${i * c.w * s}px;width:${c.w * s}px;height:${c.h * s}px"><div class="sixths designer-grid" style="left:${c.left * s}px;right:${c.right * s}px;top:${c.top * s}px;bottom:${c.bottom * s}px;${gridStyle}"></div></div>`,
      ).join("") +
      `<div class="artwork-safe" style="left:${c.left * s}px;top:${c.top * s}px;width:${(c.w * c.n - c.left - c.right) * s}px;height:${(c.h - c.top - c.bottom) * s}px"></div>`;
    if (
      carouselSelected().some((o) => o.type === "angle") ||
      carouselUI.tool === "angle"
    )
      $("#carouselGuides").insertAdjacentHTML(
        "beforeend",
        Array.from(
          { length: c.n },
          (_, i) =>
            `<div class="carousel-angle-axis vertical" style="left:${(i + 0.5) * c.w * s}px;height:${c.h * s}px"></div>`,
        ).join("") +
          `<div class="carousel-angle-axis horizontal" style="top:${(c.h * s) / 2}px;width:${c.w * c.n * s}px"></div>`,
      );
  }
  studioSetWarnings(
    c.objects.flatMap((o) => {
      const message = carouselWarning(o);
      return message ? [{ id: o.id, title: o.name, message }] : [];
    }),
  );
  const selectedPhoto = carouselSelected();
  if (selectedPhoto.length === 1) carouselUpdateWarning(selectedPhoto[0]);
  carouselDrawSelection();
  carouselVectorOverlay();
  carouselCurvatureOverlay();
  carouselConstructorOverlay();
  carouselSyncColourWells();
  carouselDrawSnap();
  carouselSlideControls();
  if (carouselUI.editing) {
    const o = c.objects.find((o) => o.id === carouselUI.editing.id);
    if (o) carouselPositionText(carouselUI.editing.el, o);
  }
}

function carouselDrawSelection() {
  const root = $("#carouselSelectionOverlay");
  if (!root) return;
  const items = carouselSelected().filter((o) => carouselObjectVisible(o));
  let bounds = carouselBounds(items);
  const content =
    carouselUI.content &&
    items.length === 1 &&
    carouselHasImage(items[0]) &&
    items[0].imageId;
  if (content) bounds = carouselImageBounds(items[0]);
  if (!bounds || carouselUI.editing) {
    root.innerHTML = "";
    delete root.dataset.selectionKey;
    if (carouselUI.slide !== null) {
      const c = p.carousel,
        frame = document.createElement("div");
      frame.className = "carousel-slide-selection";
      Object.assign(frame.style, {
        left: carouselUI.slide * c.w * carouselZoom + "px",
        top: "0px",
        width: c.w * carouselZoom + "px",
        height: c.h * carouselZoom + "px",
      });
      root.append(frame);
    }
    return;
  }
  const ordinary =
    !carouselUI.framePoints &&
    !carouselUI.vectorPoints &&
    !(items.length === 1 && items[0].framePoints) &&
    !(
      items.length === 1 &&
      items[0].type === "gradient" &&
      carouselUI.tool === "gradient"
    );
  const key = JSON.stringify([
    items.map((o) => [o.id, carouselObjectLocked(o), o.name]),
    carouselUI.content,
    carouselUI.tool,
    ordinary,
    studioPreferences.advanced,
  ]);
  const previous = root.querySelector(".carousel-frame");
  if (ordinary && root.dataset.selectionKey === key && previous) {
    carouselSelectionFrame(previous, items, bounds, content);
    return;
  }
  root.innerHTML = "";
  root.dataset.selectionKey = key;
  const s = carouselZoom;
  const frame = document.createElement("div");
  frame.className =
    "carousel-frame" +
    (carouselUI.content ? " content-selected" : "") +
    (items.every(carouselObjectLocked) ? " locked" : "");
  carouselSelectionFrame(frame, items, bounds, content);
  frame.innerHTML = `<span class="carousel-frame-label">${items.length === 1 ? esc(items[0].name) : items.length + " Elemente"}${carouselUI.content ? " · Bildinhalt" : ""}</span>`;
  const points =
    items.length === 1 &&
    ((carouselUI.framePoints &&
      ["image", "gradient"].includes(items[0].type)) ||
      (carouselUI.vectorPoints && items[0].type === "path"));
  if (
    !items.every(carouselObjectLocked) &&
    carouselUI.tool !== "hand" &&
    !carouselUI.content &&
    !points
  ) {
    for (const corner of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
      const btn = document.createElement("button");
      btn.className = "carousel-handle";
      btn.dataset.corner = corner;
      btn.setAttribute("aria-label", "Auswahl skalieren: " + corner);
      btn.onpointerdown = (ev) => {
        ev.stopPropagation();
        carouselResize(ev, corner);
      };
      frame.append(btn);
    }
  }
  if (content) {
    frame.style.pointerEvents = "auto";
    frame.onpointerdown = (ev) => {
      ev.stopPropagation();
      carouselMove(ev);
    };
    if (!carouselObjectLocked(items[0]))
      for (const corner of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
        const btn = document.createElement("button");
        btn.className = "carousel-handle";
        btn.dataset.corner = corner;
        btn.setAttribute("aria-label", "Bildinhalt skalieren: " + corner);
        btn.onpointerdown = (ev) => {
          ev.stopPropagation();
          carouselImageResize(ev, items[0], corner);
        };
        frame.append(btn);
      }
  }
  if (
    (studioPreferences.advanced ||
      (items.length === 1 && items[0].type === "angle")) &&
    !content &&
    !points &&
    !items.every((o) => carouselObjectLocked(o))
  ) {
    const rotate = document.createElement("button");
    rotate.className = "carousel-rotate-handle";
    rotate.title = "Drehen · Shift: 15°";
    rotate.setAttribute("aria-label", "Auswahl drehen");
    rotate.innerHTML = studioIcon("undo");
    rotate.onpointerdown = carouselRotateSelection;
    frame.append(rotate);
  }
  root.append(frame);
  if (
    items.length === 1 &&
    items[0].type === "gradient" &&
    carouselUI.tool === "gradient"
  )
    carouselDrawGradient(items[0], root);
  if (
    items.length === 1 &&
    ["image", "gradient"].includes(items[0].type) &&
    !carouselUI.content &&
    (items[0].framePoints || points)
  )
    carouselDrawFramePoints(items[0], root, points);
}

function carouselDrawGradient(o, root) {
  const points = carouselGradientPoints(o),
    start = { x: points.start.x / o.w, y: points.start.y / o.h },
    end = { x: points.end.x / o.w, y: points.end.y / o.h },
    s = carouselZoom;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("carousel-gradient-line");
  svg.setAttribute("width", o.w * s);
  svg.setAttribute("height", o.h * s);
  Object.assign(svg.style, {
    left: o.x * s + "px",
    top: o.y * s + "px",
    transformOrigin: "0 0",
    transform: `rotate(${o.angle || 0}deg)`,
  });
  svg.innerHTML = `<line x1="${start.x * o.w * s}" y1="${start.y * o.h * s}" x2="${end.x * o.w * s}" y2="${end.y * o.h * s}"/>`;
  root.append(svg);
  for (const [key, point] of [
    ["gradientStart", start],
    ["gradientEnd", end],
  ]) {
    const handle = document.createElement("button");
    const world = carouselToWorld(o, { x: point.x * o.w, y: point.y * o.h });
    handle.className = "carousel-gradient-stop";
    handle.style.left = world.x * s + "px";
    handle.style.top = world.y * s + "px";
    handle.style.background = key === "gradientStart" ? o.color : o.endColor;
    handle.setAttribute(
      "aria-label",
      key === "gradientStart" ? "Verlauf Anfang" : "Verlauf Ende",
    );
    handle.onpointerdown = (ev) => {
      ev.stopPropagation();
      carouselGradientDrag(ev, o, key);
    };
    root.append(handle);
  }
}
