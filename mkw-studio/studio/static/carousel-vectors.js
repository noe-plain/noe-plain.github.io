"use strict";
let carouselPathDraft = null;
const carouselVectorColours = {
  fill: "#8fa8ef",
  stroke: "#315bcc",
  fillEnabled: true,
};
const carouselEndKinds = [
  ["none", "Ohne"],
  ["arrow", "Pfeil offen"],
  ["triangle", "Pfeil gefüllt"],
  ["circle", "Kreis"],
  ["square", "Quadrat"],
  ["diamond", "Raute"],
  ["bar", "Strich"],
];
const carouselIsVector = (o) => !!o && ["path", "shape"].includes(o.type);
function carouselToolAvailable(tool) {
  return (
    !["path", "curve", "shape", "builder"].includes(tool) ||
    studioPreferences.advanced
  );
}
function carouselVectorDefaults(type) {
  return ["path", "shape"].includes(type)
    ? {
        ...clone(carouselVectorColours),
        stroke: carouselVectorColours.stroke,
        strokeWidth: type === "path" ? 8 : 3,
        fill: carouselVectorColours.fill,
        fillEnabled: type === "shape" && carouselVectorColours.fillEnabled,
        fillMode: carouselVectorColours.fillMode || "solid",
        fillEnd: carouselVectorColours.fillEnd || "#ffffff",
        fillAngle: carouselVectorColours.fillAngle ?? 90,
        dash: "solid",
        lineCap: "round",
        lineJoin: "round",
        startEnd: "none",
        endEnd: "none",
        startSize: 28,
        endSize: 28,
        closed: false,
        shapeKind: carouselUI.shapeKind || "rect",
        radius: 0,
        sides: 6,
        innerRatio: 0.45,
        points: [],
      }
    : {};
}
function carouselSyncAdvancedTools() {
  document.body.classList.toggle("advanced-mode", studioPreferences.advanced);
  const rail = $(".carousel-toolrail");
  if (!rail) return;
  for (const tool of ["path", "curve", "shape", "builder"]) {
    let button = rail.querySelector(`[data-tool=${tool}]`);
    if (!studioPreferences.advanced) {
      button?.remove();
      continue;
    }
    if (!button) {
      button = document.createElement("button");
      button.dataset.tool = tool;
      button.setAttribute("aria-label", carouselToolNames[tool]);
      button.title =
        carouselToolNames[tool] +
        {
          path: " (P)",
          shape: " (M: Rechteck / L: Ellipse)",
          builder: " (B)",
          curve: " (Shift+C)",
        }[tool];
      button.innerHTML =
        studioIcon(tool) + `<span>${carouselToolNames[tool]}</span>`;
      button.onclick = () => carouselTool(tool);
      rail.insertBefore(button, rail.querySelector("[data-tool=hand]"));
    }
  }
  if (!studioPreferences.advanced) {
    carouselPathDraft = null;
    carouselUI.vectorPoints = false;
    if (["path", "curve", "shape", "builder"].includes(carouselUI.tool))
      carouselUI.tool = "select";
  }
  for (const tool of ["path", "curve", "shape", "builder"]) {
    const button = rail.querySelector(`[data-tool=${tool}]`);
    if (button)
      rail.insertBefore(button, rail.querySelector("[data-tool=hand]"));
  }
  carouselToolUI();
  carouselPanel();
  carouselRefresh();
  carouselSyncColourWells();
  studioQueueCommandbarFit();
}
function carouselValidateVector(o) {
  const finite = (v, a, b) => Number.isFinite(v) && v >= a && v <= b,
    colour = (v) => /^#[0-9a-f]{6}$/i.test(v);
  if (
    !colour(o.stroke) ||
    !colour(o.fill) ||
    typeof o.fillEnabled !== "boolean" ||
    !finite(o.strokeWidth, 0, 300) ||
    !["solid", "dash", "dot"].includes(o.dash) ||
    !["butt", "round", "square"].includes(o.lineCap) ||
    !["miter", "round", "bevel"].includes(o.lineJoin)
  )
    throw Error("Ungültige Formkontur.");
  if (
    o.fillMode !== undefined &&
    (!["solid", "linear", "radial", "image"].includes(o.fillMode) ||
      !colour(o.fillEnd) ||
      !finite(o.fillAngle, -360, 360))
  )
    throw Error("Ungültige Verlaufsfüllung.");
  if (o.type === "shape") {
    if (
      !["rect", "ellipse", "triangle", "polygon", "star"].includes(
        o.shapeKind,
      ) ||
      !finite(o.radius, 0, 5000) ||
      !Number.isInteger(o.sides) ||
      o.sides < 3 ||
      o.sides > 24 ||
      !finite(o.innerRatio, 0.05, 0.95)
    )
      throw Error("Ungültige Form.");
    return;
  }
  if (
    !Array.isArray(o.points) ||
    o.points.length < 2 ||
    o.points.length > 2000 ||
    typeof o.closed !== "boolean" ||
    (o.closed && o.points.length < 3) ||
    !carouselEndKinds.some(([k]) => k === o.startEnd) ||
    !carouselEndKinds.some(([k]) => k === o.endEnd) ||
    !finite(o.startSize, 1, 500) ||
    !finite(o.endSize, 1, 500)
  )
    throw Error("Ungültiger Pfad.");
  if (
    o.contours &&
    (!o.closed ||
      !Array.isArray(o.contours) ||
      o.contours.length > 128 ||
      o.contours.some(
        (points) => !Array.isArray(points) || points.length < 3,
      ) ||
      o.contours.reduce((n, points) => n + points.length, 0) > 4000)
  )
    throw Error("Ungültiger zusammengesetzter Pfad.");
  for (const point of carouselPathContours(o).flat()) {
    if (
      !point ||
      !finite(point.x, -1000, 1000) ||
      !finite(point.y, -1000, 1000)
    )
      throw Error("Ungültiger Pfadpunkt.");
    for (const v of [point.in, point.out].filter((v) => v !== undefined))
      if (!v || !finite(v.x, -1000, 1000) || !finite(v.y, -1000, 1000))
        throw Error("Ungültiger Kurvengriff.");
  }
}
function carouselPathContours(o) {
  return o.contours || [o.points];
}
function carouselPathData(o, scale = 1) {
  return carouselPathContours(o)
    .map((points) => {
      if (!points?.length) return "";
      const xy = (p) => `${p.x * o.w * scale} ${p.y * o.h * scale}`;
      let d = `M ${xy(points[0])}`;
      for (let i = 1; i < points.length + (o.closed ? 1 : 0); i++) {
        const a = points[i - 1],
          b = points[i % points.length];
        d +=
          a.out || b.in
            ? ` C ${xy(a.out || a)} ${xy(b.in || b)} ${xy(b)}`
            : ` L ${xy(b)}`;
      }
      return d + (o.closed ? " Z" : "");
    })
    .join(" ");
}
function carouselVectorPath(o) {
  if (o.type === "path") return new Path2D(carouselPathData(o));
  const p = new Path2D(),
    w = o.w,
    h = o.h;
  if (o.shapeKind === "ellipse") {
    p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return p;
  }
  if (o.shapeKind === "rect") {
    const r = Math.min(o.radius, w / 2, h / 2);
    p.moveTo(r, 0);
    p.lineTo(w - r, 0);
    p.quadraticCurveTo(w, 0, w, r);
    p.lineTo(w, h - r);
    p.quadraticCurveTo(w, h, w - r, h);
    p.lineTo(r, h);
    p.quadraticCurveTo(0, h, 0, h - r);
    p.lineTo(0, r);
    p.quadraticCurveTo(0, 0, r, 0);
    p.closePath();
    return p;
  }
  const n = o.shapeKind === "triangle" ? 3 : o.sides,
    star = o.shapeKind === "star",
    count = star ? n * 2 : n;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2,
      r = star && i % 2 ? o.innerRatio : 1,
      x = w / 2 + ((Math.cos(a) * w) / 2) * r,
      y = h / 2 + ((Math.sin(a) * h) / 2) * r;
    p[i ? "lineTo" : "moveTo"](x, y);
  }
  p.closePath();
  return p;
}
function carouselVectorStroke(ctx, o, tolerance = 0) {
  ctx.strokeStyle = o.stroke;
  ctx.lineWidth = Math.max(o.strokeWidth, tolerance);
  ctx.lineCap = o.lineCap;
  ctx.lineJoin = o.lineJoin;
  ctx.miterLimit = 4;
  const w = Math.max(1, o.strokeWidth);
  ctx.setLineDash(
    o.dash === "dash"
      ? [w * 4, w * 3]
      : o.dash === "dot"
        ? [w * 0.1, w * 2.5]
        : [],
  );
}
function carouselEndGeometry(o, start) {
  const points = o.points,
    a = start ? points[0] : points.at(-1),
    b = start
      ? a.out || points[1].in || points[1]
      : a.in || points.at(-2).out || points.at(-2);
  return {
    x: a.x * o.w,
    y: a.y * o.h,
    angle: Math.atan2((a.y - b.y) * o.h, (a.x - b.x) * o.w),
    size: start ? o.startSize : o.endSize,
    kind: start ? o.startEnd : o.endEnd,
  };
}
function carouselPaintEnd(ctx, o, start, hit = null, style = null) {
  const e = carouselEndGeometry(o, start);
  if (e.kind === "none") return false;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, o.strokeWidth);
  ctx.strokeStyle = ctx.fillStyle =
    style || studioPaintRGBA(o.stroke, o.strokeAlpha ?? 1);
  ctx.lineJoin = "round";
  const p = new Path2D(),
    s = e.size;
  if (e.kind === "circle") p.arc(0, 0, s / 2, 0, Math.PI * 2);
  else if (e.kind === "square") p.rect(-s / 2, -s / 2, s, s);
  else if (e.kind === "bar") {
    p.moveTo(0, -s / 2);
    p.lineTo(0, s / 2);
  } else if (e.kind === "diamond") {
    p.moveTo(s / 2, 0);
    p.lineTo(0, s / 2);
    p.lineTo(-s / 2, 0);
    p.lineTo(0, -s / 2);
    p.closePath();
  } else {
    p.moveTo(-s, s * 0.48);
    p.lineTo(0, 0);
    p.lineTo(-s, -s * 0.48);
    if (e.kind === "triangle") p.closePath();
  }
  if (hit) {
    const dx = hit.x - e.x,
      dy = hit.y - e.y,
      x = dx * Math.cos(e.angle) + dy * Math.sin(e.angle),
      y = -dx * Math.sin(e.angle) + dy * Math.cos(e.angle);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = Math.max(o.strokeWidth, 8 / carouselZoom);
    const found =
      ctx.isPointInStroke(p, x, y) ||
      (!["bar", "arrow"].includes(e.kind) && ctx.isPointInPath(p, x, y));
    ctx.restore();
    return found;
  }
  if (["arrow", "bar"].includes(e.kind)) ctx.stroke(p);
  else ctx.fill(p);
  ctx.restore();
  return false;
}
async function carouselPaintVector(ctx, o, loadImage = image, project = p) {
  const path = carouselVectorPath(o);
  if (o.fillEnabled && (o.type === "shape" || o.closed)) {
    ctx.save();
    if (o.fillMode === "image") ctx.globalAlpha *= o.fillAlpha ?? 1;
    ctx.fillStyle = await studioCanvasPaint(ctx, o, "fill", loadImage, project);
    ctx.fill(path);
    ctx.restore();
  }
  if (o.strokeEnabled !== false && o.strokeWidth > 0) {
    ctx.save();
    carouselVectorStroke(ctx, o);
    if (o.strokeMode === "image") ctx.globalAlpha *= o.strokeAlpha ?? 1;
    const style = await studioCanvasPaint(ctx, o, "stroke", loadImage, project);
    ctx.strokeStyle = style;
    ctx.stroke(path);
    if (o.type === "path" && !o.closed) {
      carouselPaintEnd(ctx, o, true, null, style);
      carouselPaintEnd(ctx, o, false, null, style);
    }
    ctx.restore();
  }
}
function carouselVectorPadding(o) {
  return Math.ceil(
    Math.max(
      o.strokeWidth * 4,
      o.type === "path" && !o.closed
        ? Math.max(
            o.startEnd === "none" ? 0 : o.startSize,
            o.endEnd === "none" ? 0 : o.endSize,
          )
        : 0,
    ) + 4,
  );
}
function carouselVectorHit(o, pt) {
  const pad = carouselVectorPadding(o) + 8 / carouselZoom,
    x = pt.x - o.x,
    y = pt.y - o.y;
  if (x < -pad || y < -pad || x > o.w + pad || y > o.h + pad) return false;
  const ctx = makeCanvas(1, 1).getContext("2d"),
    p = carouselVectorPath(o);
  carouselVectorStroke(ctx, o, 8 / carouselZoom);
  return (
    (o.fillEnabled &&
      (o.type === "shape" || o.closed) &&
      ctx.isPointInPath(p, x, y)) ||
    (o.strokeEnabled !== false &&
      o.strokeWidth > 0 &&
      ctx.isPointInStroke(p, x, y)) ||
    (o.strokeEnabled !== false &&
      o.strokeWidth > 0 &&
      o.type === "path" &&
      !o.closed &&
      (carouselPaintEnd(ctx, o, true, { x, y }) ||
        carouselPaintEnd(ctx, o, false, { x, y })))
  );
}
function carouselPathWorld(o, contour = carouselUI.vectorContour || 0) {
  return (carouselPathContours(o)[contour] || o.points).map((p) => {
    const point = carouselToWorld(o, { x: p.x * o.w, y: p.y * o.h });
    for (const k of ["in", "out"])
      if (p[k])
        point[k] = carouselToWorld(o, { x: p[k].x * o.w, y: p[k].y * o.h });
    return point;
  });
}
function carouselSetPathContours(o, contours) {
  if (o.angle)
    contours = contours.map((points) =>
      points.map((p) => {
        const q = carouselRotatePoint(p, -o.angle);
        for (const k of ["in", "out"])
          if (p[k]) q[k] = carouselRotatePoint(p[k], -o.angle);
        return q;
      }),
    );
  const all = contours.flatMap((points) =>
      points.flatMap((p) => [p, p.in, p.out].filter(Boolean)),
    ),
    x = Math.min(...all.map((p) => p.x)),
    y = Math.min(...all.map((p) => p.y)),
    w = Math.max(10, Math.max(...all.map((p) => p.x)) - x),
    h = Math.max(10, Math.max(...all.map((p) => p.y)) - y),
    normal = contours.map((points) =>
      points.map((p) => {
        const point = { x: (p.x - x) / w, y: (p.y - y) / h };
        for (const k of ["in", "out"])
          if (p[k]) point[k] = { x: (p[k].x - x) / w, y: (p[k].y - y) / h };
        return point;
      }),
    );
  const origin = carouselRotatePoint({ x, y }, o.angle || 0);
  Object.assign(o, { x: origin.x, y: origin.y, w, h, points: normal[0] });
  if (normal.length > 1) o.contours = normal;
  else delete o.contours;
}
function carouselKeepVectorImage(o, base) {
  if (
    o.fillMode !== "image" ||
    !o.imageId ||
    ![base.x, base.y, base.w, base.h, base.scale, base.panX, base.panY].every(
      Number.isFinite,
    )
  )
    return;
  const im = p.images.find((im) => im.id === o.imageId);
  if (!im) return;
  const oldFit = Math.max(base.w / im.width, base.h / im.height),
    newFit = Math.max(o.w / im.width, o.h / im.height);
  o.scale = (base.scale * oldFit) / newFit;
  const before = carouselRotatePoint(base, -(base.angle || 0)),
    after = carouselRotatePoint(o, -(o.angle || 0));
  o.panX = before.x + base.w / 2 + base.panX - after.x - o.w / 2;
  o.panY = before.y + base.h / 2 + base.panY - after.y - o.h / 2;
}
function carouselHasImage(o) {
  return (
    ["image", "angle"].includes(o.type) ||
    (carouselIsVector(o) && o.fillMode === "image") ||
    (o.type === "gradient" && o.gradientFillMode === "image")
  );
}
function carouselSetPathGeometry(o, points) {
  const base = { ...o };
  const contours = o.contours
    ? o.contours.map((_, i) => carouselPathWorld(o, i))
    : [points];
  if (o.contours) contours[carouselUI.vectorContour || 0] = points;
  carouselSetPathContours(o, contours);
  carouselKeepVectorImage(o, base);
}
function carouselFinishPath(closed = false) {
  const draft = carouselPathDraft;
  if (!draft) return;
  carouselPathDraft = null;
  carouselUI.vectorExtension = null;
  if (draft.points.length < 2) {
    carouselRefresh();
    carouselPanel();
    return;
  }
  const rect = {
    ...carouselVectorDefaults("path"),
    closed: closed && draft.points.length > 2,
    fillEnabled:
      !!closed && draft.points.length > 2 && carouselVectorColours.fillEnabled,
  };
  carouselSetPathGeometry(rect, draft.points);
  carouselObject("path", rect);
  carouselUI.tool = "select";
  carouselToolUI();
  carouselRefresh();
  carouselPanel();
}
function carouselPathPointer(ev, pt) {
  ev.preventDefault();
  if (!studioPreferences.advanced) return;
  if (ev.detail > 1 && carouselPathDraft?.points.length >= 2) {
    carouselFinishPath();
    return;
  }
  const draft = (carouselPathDraft ??= { points: [] }),
    last = draft.points.at(-1);
  if (last && ev.shiftKey) {
    const a =
        (Math.round(Math.atan2(pt.y - last.y, pt.x - last.x) / (Math.PI / 4)) *
          Math.PI) /
        4,
      d = Math.hypot(pt.x - last.x, pt.y - last.y);
    pt = { x: last.x + Math.cos(a) * d, y: last.y + Math.sin(a) * d };
  }
  const snap = carouselSnapPathPoint(
    pt,
    draft.points,
    draft.points.length,
    ev,
    [],
  );
  pt = { x: snap.x, y: snap.y };
  if (
    draft.points.length > 2 &&
    Math.hypot(pt.x - draft.points[0].x, pt.y - draft.points[0].y) *
      carouselZoom <
      9
  ) {
    carouselClosePathPointer(ev);
    return;
  }
  if (last && Math.hypot(pt.x - last.x, pt.y - last.y) * carouselZoom < 2)
    return;
  if (draft.points.length >= 200) {
    status("Maximal 200 Punkte pro Pfad.");
    return;
  }
  const point = { ...pt };
  draft.points.push(point);
  delete draft.cursor;
  carouselSelect([]);
  carouselPanel();
  carouselRefresh();
  carouselListen(
    ev,
    (e) => {
      const p = carouselPoint(e);
      if (Math.hypot(p.x - pt.x, p.y - pt.y) * carouselZoom < 3) return;
      carouselLinkedHandle(point, "out", p, e, pt);
      carouselVectorOverlay();
    },
    () => {
      carouselVectorOverlay();
      carouselPanel();
    },
    () => {
      draft.points.pop();
      carouselVectorOverlay();
      carouselPanel();
    },
  );
}
function carouselDraftPanel(panel) {
  panel.innerHTML = `<h3>Pfad zeichnen</h3><output class="vector-point-count">${carouselPathDraft.points.length} Punkte</output><div class="carousel-fields"><button id="finishVectorPath" ${carouselPathDraft.points.length < 2 ? "disabled" : ""}>Pfad abschliessen</button><button id="cancelVectorPath">Abbrechen</button></div>`;
  $("#finishVectorPath").onclick = () => carouselFinishPath();
  $("#cancelVectorPath").onclick = () => {
    carouselPathDraft = null;
    carouselPanel();
    carouselRefresh();
  };
}
function carouselVectorKey(ev) {
  const key = ev.key.toLowerCase();
  if (carouselPathDraft) {
    if (
      ["enter", "escape", "backspace", "delete"].includes(key) ||
      ((ev.ctrlKey || ev.metaKey) && key === "z")
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (key === "enter") carouselFinishPath();
      else if (key === "escape") {
        carouselPathDraft = null;
        carouselRefresh();
        carouselPanel();
      } else {
        carouselPathDraft.points.pop();
        carouselRefresh();
        carouselPanel();
      }
      return true;
    }
  }
  const o = carouselSelected()[0];
  if (o?.type === "path" && carouselUI.vectorPoints) {
    if (key === "escape" || key === "enter") {
      ev.preventDefault();
      carouselUI.vectorPoints = false;
      carouselRefresh();
      carouselPanel();
      return true;
    }
    if (["delete", "backspace"].includes(key)) {
      ev.preventDefault();
      carouselDeletePathPoint(o);
      return true;
    }
  }
  return false;
}
function carouselVectorOverlay() {
  const root = $("#carouselSelectionOverlay");
  if (!root) return;
  root.querySelectorAll("[data-vector-overlay]").forEach((el) => el.remove());
  const draft = carouselPathDraft,
    s = carouselZoom,
    o = carouselSelected()[0];
  const points = draft
    ? draft.points
    : o?.type === "path" && carouselUI.vectorPoints
      ? carouselPathWorld(o)
      : null;
  if (!points?.length) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.dataset.vectorOverlay = "";
  svg.classList.add("vector-guide");
  svg.setAttribute("width", p.carousel.w * p.carousel.n * s);
  svg.setAttribute("height", p.carousel.h * s);
  const local = {
    type: "path",
    w: 1,
    h: 1,
    points,
    closed: !!o?.closed && !draft,
  };
  svg.innerHTML = `<path d="${carouselPathData(local, s)}"/>`;
  root.append(svg);
  const selected = carouselUI.vectorNode ?? 0;
  points.forEach((point, index) => {
    const anchor = document.createElement("button");
    anchor.dataset.vectorOverlay = "";
    anchor.dataset.vectorPoint = index;
    anchor.className =
      "vector-node" +
      ((carouselUI.vectorNodes?.has(index) || index === selected) && !draft
        ? " is-selected"
        : "") +
      (point.in || point.out ? " is-curve" : "");
    anchor.setAttribute("aria-label", `Pfadpunkt ${index + 1} verschieben`);
    Object.assign(anchor.style, {
      left: point.x * s + "px",
      top: point.y * s + "px",
    });
    anchor.onpointerdown = (ev) => {
      ev.stopPropagation();
      if (draft) {
        if (index === 0 && points.length > 2) carouselClosePathPointer(ev);
        return;
      }
      if (carouselUI.tool === "path" && ev.altKey) {
        carouselUI.vectorNode = index;
        carouselUI.vectorNodes = new Set([index]);
        carouselDeletePathPoint(o);
        return;
      }
      carouselVectorPointDrag(ev, o, index);
    };
    root.append(anchor);
    if (draft || index === selected || carouselUI.vectorNodes?.has(index))
      for (const k of ["in", "out"])
        if (point[k]) {
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
          );
          for (const [key, value] of Object.entries({
            x1: point.x * s,
            y1: point.y * s,
            x2: point[k].x * s,
            y2: point[k].y * s,
          }))
            line.setAttribute(key, value);
          svg.append(line);
          const handle = document.createElement("button");
          handle.dataset.vectorOverlay = "";
          handle.className = "vector-control";
          handle.setAttribute(
            "aria-label",
            `Kurvengriff ${k === "in" ? "eingehend" : "ausgehend"} · Punkt ${index + 1}`,
          );
          Object.assign(handle.style, {
            left: point[k].x * s + "px",
            top: point[k].y * s + "px",
          });
          handle.onpointerdown = (ev) => {
            ev.stopPropagation();
            if (!draft) carouselVectorPointDrag(ev, o, index, k);
          };
          root.append(handle);
        }
  });
  if (carouselUI.vectorExtension) {
    const { from, to } = carouselUI.vectorExtension,
      line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    for (const [k, v] of Object.entries({
      x1: from.x * s,
      y1: from.y * s,
      x2: to.x * s,
      y2: to.y * s,
    }))
      line.setAttribute(k, v);
    line.classList.add("vector-extension");
    svg.append(line);
  }
  if (draft?.cursor) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path"),
      a = points.at(-1),
      b = draft.cursor,
      closing =
        points.length > 2 &&
        Math.hypot(b.x - points[0].x, b.y - points[0].y) * s < 12,
      end = closing ? points[0] : b;
    const data = carouselPathData(
      { type: "path", w: 1, h: 1, points: [a, end], closed: false },
      s,
    );
    line.setAttribute("d", data);
    line.classList.add("vector-next-segment");
    line.setAttribute("stroke-dasharray", "4 4");
    svg.append(line);
  }
}
let carouselDraftPreviewFrame = 0;
window.addEventListener("pointermove", (ev) => {
  if (
    carouselPathDraft &&
    !carouselUI.drag &&
    ev.target.closest?.("#carouselViewport")
  ) {
    let point = carouselPoint(ev);
    const last = carouselPathDraft.points.at(-1);
    if (last && ev.shiftKey) {
      const a =
          (Math.round(
            Math.atan2(point.y - last.y, point.x - last.x) / (Math.PI / 4),
          ) *
            Math.PI) /
          4,
        d = Math.hypot(point.x - last.x, point.y - last.y);
      point = { x: last.x + Math.cos(a) * d, y: last.y + Math.sin(a) * d };
    }
    const snap = carouselSnapPathPoint(
      point,
      carouselPathDraft.points,
      carouselPathDraft.points.length,
      ev,
      [],
    );
    carouselPathDraft.cursor = { x: snap.x, y: snap.y };
    if (!carouselDraftPreviewFrame)
      carouselDraftPreviewFrame = requestAnimationFrame(() => {
        carouselDraftPreviewFrame = 0;
        if (carouselPathDraft) carouselVectorOverlay();
      });
  }
});
function carouselVectorPointDrag(ev, o, index, key = null) {
  if (carouselObjectLocked(o)) return;
  const start = carouselPoint(ev),
    base = carouselPathWorld(o),
    wasSelected = carouselUI.vectorNodes?.has(index);
  carouselUI.vectorNode = index;
  carouselUI.vectorNodes ??= new Set();
  if (!key) {
    if (!ev.shiftKey && !wasSelected) carouselUI.vectorNodes = new Set([index]);
    else carouselUI.vectorNodes.add(index);
  }
  let begun = false;
  carouselListen(
    ev,
    (e) => {
      const p = carouselPoint(e);
      let dx = p.x - start.x,
        dy = p.y - start.y;
      if (!begun && Math.hypot(dx, dy) * carouselZoom < 2) return;
      if (!begun) {
        checkpoint();
        begun = true;
      }
      const points = clone(base),
        node = points[index];
      if (key) {
        carouselLinkedHandle(
          node,
          key,
          { x: base[index][key].x + dx, y: base[index][key].y + dy },
          e,
          base[index],
        );
      } else if (carouselUI.tool === "curve") {
        carouselLinkedHandle(
          node,
          "out",
          { x: node.x + dx, y: node.y + dy },
          e,
          base[index],
        );
      } else {
        if (e.shiftKey) {
          const a =
              (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4,
            d = Math.hypot(dx, dy);
          dx = Math.cos(a) * d;
          dy = Math.sin(a) * d;
        }
        const snap = carouselSnapPathPoint(
          { x: node.x + dx, y: node.y + dy },
          base,
          index,
          e,
          [o.id],
        );
        dx = snap.x - node.x;
        dy = snap.y - node.y;
        carouselUI.snapLines = snap.guides;
        for (const i of carouselUI.vectorNodes) {
          const chosen = points[i];
          chosen.x += dx;
          chosen.y += dy;
          for (const k of ["in", "out"])
            if (chosen[k]) {
              chosen[k].x += dx;
              chosen[k].y += dy;
            }
        }
      }
      carouselSetPathGeometry(o, points);
      carouselRefresh();
    },
    () => {
      carouselUI.vectorExtension = null;
      if (!begun && ev.shiftKey && wasSelected)
        carouselUI.vectorNodes.delete(index);
      if (!begun && !key && carouselUI.tool === "curve") {
        checkpoint();
        const points = carouselPathWorld(o),
          node = points[index];
        if (node.in || node.out) {
          delete node.in;
          delete node.out;
        } else {
          const a = points[index - 1] || node,
            b = points[index + 1] || node,
            dx = (b.x - a.x) / 6,
            dy = (b.y - a.y) / 6;
          node.in = { x: node.x - dx, y: node.y - dy };
          node.out = { x: node.x + dx, y: node.y + dy };
        }
        carouselSetPathGeometry(o, points);
        begun = true;
      }
      if (begun) changed(false);
      carouselPanel();
      carouselRefresh();
    },
  );
}
function carouselDeletePathPoint(o) {
  if (carouselObjectLocked(o)) return;
  const min = o.closed ? 3 : 2,
    points = carouselPathWorld(o),
    ids = carouselUI.vectorNodes?.size
      ? carouselUI.vectorNodes
      : new Set([carouselUI.vectorNode ?? 0]);
  if (points.length - ids.size < min) {
    status(`Mindestens ${min} Punkte müssen erhalten bleiben.`);
    return;
  }
  checkpoint();
  const next = points.filter((_, i) => !ids.has(i));
  carouselUI.vectorNodes = new Set();
  carouselUI.vectorNode = 0;
  carouselSetPathGeometry(o, next);
  changed(false);
  carouselPanel();
}
function carouselSplitPath(o) {
  if (carouselObjectLocked(o) || o.points.length >= 200) return;
  const points = carouselPathWorld(o),
    i = Math.min(
      carouselUI.vectorNode ?? 0,
      points.length - (o.closed ? 1 : 2),
    ),
    j = (i + 1) % points.length,
    a = points[i],
    b = points[j],
    mix = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
    q0 = mix(a, a.out || a),
    q1 = mix(a.out || a, b.in || b),
    q2 = mix(b.in || b, b),
    r0 = mix(q0, q1),
    r1 = mix(q1, q2),
    middle = { ...mix(r0, r1), in: r0, out: r1 };
  checkpoint();
  a.out = q0;
  b.in = q2;
  points.splice(i + 1, 0, middle);
  carouselUI.vectorNode = i + 1;
  carouselSetPathGeometry(o, points);
  changed(false);
  carouselPanel();
}
function carouselVectorPanel(o) {
  const pick = (key, label, values) =>
      `<label>${label}<select data-vector-key="${key}">${options(values, o[key])}</select></label>`,
    num = (key, label, min, max) =>
      `<label>${label}<input data-vector-key="${key}" type="number" min="${min}" max="${max}" step="${key === "sides" ? "1" : "any"}" value="${o[key]}"></label>`,
    colour = (key, label) =>
      `<label>${label}<input data-vector-key="${key}" type="color" value="${o[key]}"></label>`;
  const section = (title, body) =>
    `<section class="carousel-property-section vector-section"><h4>${title}</h4>${body}</section>`;
  let body =
    o.type === "shape"
      ? section(
          "Form",
          `<button id="vectorShapePoints" ${!studioPreferences.advanced ? "disabled" : ""}>Punkte & Kurven bearbeiten</button><div class="vector-shapes" role="group" aria-label="Form auswählen">${[
            ["rect", "Rechteck"],
            ["ellipse", "Ellipse"],
            ["triangle", "Dreieck"],
            ["polygon", "Vieleck"],
            ["star", "Stern"],
          ]
            .map(
              ([kind, name]) =>
                `<button data-shape-kind="${kind}" aria-pressed="${o.shapeKind === kind}" title="${name}" aria-label="${name}">${studioIcon(kind)}</button>`,
            )
            .join(
              "",
            )}</div>${o.shapeKind === "rect" ? num("radius", "Eckenradius · px", 0, 5000) : ""}${["polygon", "star"].includes(o.shapeKind) ? num("sides", o.shapeKind === "star" ? "Zacken" : "Seiten", 3, 24) : ""}${o.shapeKind === "star" ? `<label>Innere Grösse <input data-vector-key="innerRatio" type="range" min=".05" max=".95" step=".01" value="${o.innerRatio}"></label>` : ""}`,
        )
      : section(
          "Pfad",
          `<button id="vectorEditPoints" aria-pressed="${!!carouselUI.vectorPoints}" ${!studioPreferences.advanced ? "disabled" : ""}>${carouselUI.vectorPoints ? "Punktbearbeitung beenden" : "Punkte & Kurven bearbeiten"}</button><label class="vector-check"><input data-vector-key="closed" type="checkbox" ${o.closed ? "checked" : ""} ${o.points.length < 3 ? "disabled" : ""}> Geschlossener Pfad</label>${o.contours ? `<label>Teilpfad<select id="vectorContour">${o.contours.map((_, i) => `<option value="${i}" ${i === (carouselUI.vectorContour || 0) ? "selected" : ""}>Teilpfad ${i + 1}</option>`).join("")}</select></label>` : ""}${carouselUI.vectorPoints ? `<output class="vector-point-count">${carouselUI.vectorNodes?.size || 1} Punkte ausgewählt</output><output class="vector-point-count">Punkt ${(carouselUI.vectorNode ?? 0) + 1} von ${o.points.length}</output><div class="carousel-fields"><button id="vectorCorner">Eckpunkt</button><button id="vectorSmooth">Kurvenpunkt</button><button id="vectorAddPoint">Punkt hinzufügen</button><button id="vectorRemovePoint">Punkt entfernen</button></div>` : ""}`,
        );
  body += section(
    "Fläche & Kontur",
    studioPaintCards(o) +
      `<div class="paint-stroke-details"><div class="carousel-fields">${num("strokeWidth", "Konturbreite · px", 0, 300)}${pick(
        "dash",
        "Linienart",
        [
          ["solid", "Durchgezogen"],
          ["dash", "Gestrichelt"],
          ["dot", "Gepunktet"],
        ],
      )}</div><div class="carousel-fields">${pick(
        "lineCap",
        "Linienabschluss",
        [
          ["butt", "Gerade"],
          ["round", "Rund"],
          ["square", "Überstehend"],
        ],
      )}${pick("lineJoin", "Ecken", [
        ["round", "Rund"],
        ["miter", "Spitz"],
        ["bevel", "Abgeschrägt"],
      ])}</div></div>`,
  );
  if (o.type === "path" && !o.closed)
    body += section(
      "Linienenden",
      `<div class="vector-end">${pick("startEnd", "Anfang", carouselEndKinds)}${num("startSize", "Grösse · px", 1, 500)}</div><div class="vector-end">${pick("endEnd", "Ende", carouselEndKinds)}${num("endSize", "Grösse · px", 1, 500)}</div>`,
    );
  return body;
}
function carouselBindVectorPanel(o, panel) {
  panel.querySelectorAll("[data-vector-key]").forEach((input) => {
    if (carouselObjectLocked(o)) input.disabled = true;
    let begun = false;
    input.onfocus = () => (begun = false);
    const update = () => {
      if (carouselObjectLocked(o)) return;
      let value =
        input.type === "checkbox"
          ? input.checked
          : ["number", "range"].includes(input.type)
            ? Number(input.value)
            : input.value;
      if (
        ["number", "range"].includes(input.type) &&
        (!Number.isFinite(value) || value < +input.min || value > +input.max)
      )
        return;
      if (input.dataset.vectorKey === "sides") value = Math.round(value);
      if (!begun) {
        checkpoint();
        begun = true;
      }
      o[input.dataset.vectorKey] = value;
      changed(false);
      carouselSyncColourWells();
      if (
        ["fillEnabled", "closed", "fillMode"].includes(input.dataset.vectorKey)
      )
        carouselPanel();
    };
    if (["number", "color", "range"].includes(input.type))
      input.oninput = update;
    else input.onchange = update;
  });
  if ($("#vectorShapePoints"))
    $("#vectorShapePoints").onclick = () => carouselStartPointEditing(o);
  if ($("#vectorContour"))
    $("#vectorContour").onchange = (event) => {
      carouselUI.vectorContour = +event.target.value;
      carouselUI.vectorNode = 0;
      carouselUI.vectorNodes = new Set();
      carouselPanel();
      carouselRefresh();
    };
  panel.querySelectorAll("[data-shape-kind]").forEach(
    (button) =>
      (button.onclick = () => {
        if (carouselObjectLocked(o)) return;
        checkpoint();
        o.shapeKind = carouselUI.shapeKind = button.dataset.shapeKind;
        changed(false);
        carouselPanel();
      }),
  );
  if ($("#vectorEditPoints"))
    $("#vectorEditPoints").onclick = () => {
      if (carouselObjectLocked(o) || !studioPreferences.advanced) return;
      carouselUI.vectorPoints = !carouselUI.vectorPoints;
      carouselUI.vectorNode = 0;
      carouselRefresh();
      carouselPanel();
    };
  if ($("#vectorAddPoint"))
    $("#vectorAddPoint").onclick = () => carouselSplitPath(o);
  if ($("#vectorRemovePoint"))
    $("#vectorRemovePoint").onclick = () => carouselDeletePathPoint(o);
  for (const [id, smooth] of [
    ["vectorCorner", false],
    ["vectorSmooth", true],
  ])
    if ($("#" + id))
      $("#" + id).onclick = () => {
        if (carouselObjectLocked(o)) return;
        checkpoint();
        const points = carouselPathWorld(o),
          i = carouselUI.vectorNode ?? 0,
          node = points[i],
          before = points[i - 1] || (o.closed ? points.at(-1) : node),
          after = points[i + 1] || (o.closed ? points[0] : node);
        delete node.in;
        delete node.out;
        if (smooth) {
          const dx = after.x - before.x,
            dy = after.y - before.y,
            d = Math.hypot(dx, dy) || 1,
            len =
              Math.min(
                Math.hypot(node.x - before.x, node.y - before.y) || 100,
                Math.hypot(node.x - after.x, node.y - after.y) || 100,
              ) / 3;
          node.in = { x: node.x - (dx / d) * len, y: node.y - (dy / d) * len };
          node.out = { x: node.x + (dx / d) * len, y: node.y + (dy / d) * len };
        }
        carouselSetPathGeometry(o, points);
        changed(false);
        carouselPanel();
      };
}

function carouselSyncColourWells() {
  studioSyncPaintControls();
}
