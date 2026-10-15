"use strict";
// Carousel render: see ARCHITECTURE.md for ownership and load order.
async function carouselPaint(
  ctx,
  slide = null,
  scale = 1,
  transparent = false,
  editingId = null,
  objects = null,
  isCurrent = () => true,
) {
  const project = p,
    c = project.carousel;
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
    if (o.visible === false || o.id === editingId) continue;
    ctx.save();
    ctx.globalAlpha = o.opacity ?? 1;
    ctx.globalCompositeOperation = o.blend || "source-over";
    ctx.translate(o.x, o.y);
    if (o.type === "text") {
      ctx.fillStyle = studioPaintRGBA(o.color, o.textAlpha ?? 1);
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const layout = carouselTextLayout(o, ctx),
        offset = carouselTextOffset(o, layout);
      for (const line of layout.lines) {
        ctx.font = `${line.size}px "${o.font}"`;
        ctx.fillText(line.text, line.x, line.y + offset);
      }
    } else if (carouselIsVector(o)) {
      await carouselPaintVector(ctx, o);
    } else if (o.type === "gradient") {
      if (o.gradientFillMode === "image") ctx.globalAlpha *= o.startAlpha ?? 1;
      ctx.fillStyle = await studioCanvasPaint(ctx, o, "fill");
      ctx.fillRect(0, 0, o.w, o.h);
    } else if (o.type === "logo") {
      const im = await image(
        o.source === "black"
          ? "mkw-logo-bold-pos.svg"
          : "mkw-logo-bold-neg.svg",
      );
      ctx.drawImage(im, 0, 0, o.w, o.h);
    } else {
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
      } else {
        ctx.clip(carouselImageMask(o));
      }
      const im = project.images.find((im) => im.id === o.imageId);
      if (im) {
        const bitmap = await image(im.data),
          fw = o.w,
          fh = o.h,
          s = Math.max(fw / im.width, fh / im.height) * o.scale;
        ctx.translate(fw / 2 + o.panX, fh / 2 + o.panY);
        ctx.scale(o.flipX, o.flipY);
        ctx.drawImage(
          bitmap,
          (-im.width * s) / 2,
          (-im.height * s) / 2,
          im.width * s,
          im.height * s,
        );
      } else {
        ctx.fillStyle = "#68768b";
        ctx.fillRect(0, 0, o.w, o.h);
      }
    }
    ctx.restore();
  }
  ctx.restore();
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
  carouselPathDraft = null;
  carouselUI.vectorPoints = false;
  carouselEndText();
  document.body.classList.toggle("carousel-mode", carouselActive());
  $("#carouselEditor")?.remove();
  $(".carousel-statusbar")?.remove();
  studioSyncFooter();
  if (!carouselActive()) return false;
  const c = p.carousel;
  carouselKeepLogosOnTop(c);
  c.objects
    .filter((o) => o.type === "angle")
    .forEach((o) => carouselAngleAlign(o, c));
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
 <nav class="carousel-contextbar studio-commandbar" aria-label="Gestaltungswerkzeuge"><span class="studio-mode-label">Carousel</span><span id="carouselToolName"></span><div class="carousel-toolrail studio-tool-group">${Object.entries(
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
   )}</div><div class="studio-bar-actions"><button id="carouselNotice" class="studio-action studio-notice-button" aria-controls="studioWarnings" aria-expanded="false" hidden></button><button id="carouselExport" class="studio-action">${studioIcon("export")}<span>Export</span></button></div></nav>
 <div id="carouselViewport" tabindex="0" aria-label="Carousel-Montagefläche"><div id="carouselPasteboard"><div id="carouselArtwork"><canvas id="carouselCanvas" aria-label="Carousel-Gestaltung"></canvas><div id="carouselGuides"></div><div id="carouselSnapOverlay"></div><div id="carouselSelectionOverlay"></div><div id="carouselEditingOverlay"></div><div id="carouselSlideControls"></div></div></div></div>
 <aside id="carouselSidebar"><section id="carouselProperties" aria-label="Eigenschaften"></section><section class="carousel-layers-panel"><div class="carousel-section-heading"><h3>Ebenen</h3><span>Oben liegt vorne</span></div><div id="carouselLayers"></div></section></aside><div class="carousel-statusbar"><span id="carouselHint" hidden></span><span id="carouselCoordinates" hidden></span><div class="carousel-zoom-controls"><button id="carouselFit" aria-label="Artwork einpassen" title="Artwork einpassen">${studioIcon("fit")}</button><label>Zoom <input id="carouselZoom" type="number" min="5" max="200" step="5" value="${Math.round(carouselZoom * 100)}"> %</label></div></div><input id="carouselFile" type="file" accept="image/*" multiple hidden>`;
  document.body.append(host);
  $("#footerZoom").append(host.querySelector(".carousel-statusbar"));
  host
    .querySelectorAll("button[data-tool]")
    .forEach((btn) => (btn.onclick = () => carouselTool(btn.dataset.tool)));
  $("#carouselNotice").onclick = studioToggleWarnings;
  $("#carouselExport").onclick = () => {
    carouselEndText();
    openExport();
  };
  $("#carouselZoom").onchange = (ev) => carouselSetZoom(+ev.target.value / 100);
  $("#carouselFit").onclick = carouselFit;
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
  const c = p.carousel;
  return Math.min(
    2,
    16000 / (c.w * c.n),
    Math.sqrt(24000000 / (c.w * c.n * c.h)),
  );
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

function carouselSchedulePaint(canvas, scale, generation) {
  carouselPaintPending = {
    canvas,
    scale,
    generation,
    project: p,
    editingId: carouselUI.editing?.id,
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
    );
    if (current()) {
      const out = job.canvas.getContext("2d");
      out.clearRect(0, 0, job.canvas.width, job.canvas.height);
      out.drawImage(carouselPaintBuffer, 0, 0);
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
  const s = carouselZoom,
    canvas = $("#carouselCanvas"),
    generation = ++carouselDraw;
  c.zoom = s;
  if (canvas.width !== Math.ceil(c.w * c.n * s))
    canvas.width = Math.ceil(c.w * c.n * s);
  if (canvas.height !== Math.ceil(c.h * s)) canvas.height = Math.ceil(c.h * s);
  $("#carouselArtwork").style.width = canvas.width + "px";
  $("#carouselArtwork").style.height = canvas.height + "px";
  const viewport = $("#carouselViewport"),
    padX = Math.max(400, Math.round(viewport.clientWidth * 0.8)),
    padY = Math.max(250, Math.round(viewport.clientHeight * 0.6));
  $("#carouselPasteboard").style.width = canvas.width + 2 * padX + "px";
  $("#carouselPasteboard").style.height = canvas.height + 2 * padY + "px";
  $("#carouselArtwork").style.left = padX + "px";
  $("#carouselArtwork").style.top = padY + "px";
  $("#carouselZoom").value = Math.round(s * 100);
  carouselSchedulePaint(canvas, s, generation);
  $("#carouselGuides").hidden = !carouselUI.guides;
  const guideKey = JSON.stringify([
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
          `<div class="slide-guide" style="left:${i * c.w * s}px;width:${c.w * s}px;height:${c.h * s}px"><div class="sixths" style="left:${100 * s}px;right:${100 * s}px;top:${c.top * s}px;bottom:${c.bottom * s}px"></div></div>`,
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
    c.objects
      .filter((o) => carouselWarning(o))
      .map((o) => ({ id: o.id, title: o.name, message: carouselWarning(o) })),
  );
  carouselDrawSelection();
  carouselVectorOverlay();
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
  const items = carouselSelected().filter((o) => o.visible !== false);
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
    items.map((o) => [o.id, o.locked, o.name]),
    carouselUI.content,
    carouselUI.tool,
    ordinary,
  ]);
  const previous = root.querySelector(".carousel-frame");
  if (ordinary && root.dataset.selectionKey === key && previous) {
    Object.assign(previous.style, {
      left: bounds.x * carouselZoom + "px",
      top: bounds.y * carouselZoom + "px",
      width: bounds.w * carouselZoom + "px",
      height: bounds.h * carouselZoom + "px",
    });
    return;
  }
  root.innerHTML = "";
  root.dataset.selectionKey = key;
  const s = carouselZoom;
  const frame = document.createElement("div");
  frame.className =
    "carousel-frame" +
    (carouselUI.content ? " content-selected" : "") +
    (items.every((o) => o.locked) ? " locked" : "");
  Object.assign(frame.style, {
    left: bounds.x * s + "px",
    top: bounds.y * s + "px",
    width: bounds.w * s + "px",
    height: bounds.h * s + "px",
  });
  frame.innerHTML = `<span class="carousel-frame-label">${items.length === 1 ? esc(items[0].name) : items.length + " Elemente"}${carouselUI.content ? " · Bildinhalt" : ""}</span>`;
  const points =
    items.length === 1 &&
    ((carouselUI.framePoints && items[0].type === "image") ||
      (carouselUI.vectorPoints && items[0].type === "path"));
  if (
    !items.every((o) => o.locked) &&
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
    if (!items[0].locked)
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
  root.append(frame);
  if (
    items.length === 1 &&
    items[0].type === "gradient" &&
    carouselUI.tool === "gradient"
  )
    carouselDrawGradient(items[0], root);
  if (
    items.length === 1 &&
    items[0].type === "image" &&
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
  Object.assign(svg.style, { left: o.x * s + "px", top: o.y * s + "px" });
  svg.innerHTML = `<line x1="${start.x * o.w * s}" y1="${start.y * o.h * s}" x2="${end.x * o.w * s}" y2="${end.y * o.h * s}"/>`;
  root.append(svg);
  for (const [key, point] of [
    ["gradientStart", start],
    ["gradientEnd", end],
  ]) {
    const handle = document.createElement("button");
    handle.className = "carousel-gradient-stop";
    handle.style.left = (o.x + point.x * o.w) * s + "px";
    handle.style.top = (o.y + point.y * o.h) * s + "px";
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
