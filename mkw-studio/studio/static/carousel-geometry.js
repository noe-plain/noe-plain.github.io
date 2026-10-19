"use strict";
// Carousel geometry: see ARCHITECTURE.md for ownership and load order.
function carouselAnglePath(o) {
  const path = new Path2D(),
    w = o.w,
    h = o.h,
    t = Math.min(o.thickness * Math.SQRT2, w * 0.9, h * 0.44);
  path.moveTo(0, 0);
  path.lineTo(w, h / 2);
  path.lineTo(0, h);
  path.lineTo(0, h - t);
  path.lineTo(w - t, h / 2);
  path.lineTo(0, t);
  path.closePath();
  return path;
}

function carouselAngleBleed(o, c = p.carousel, lockedAxis = null) {
  const width = c.w * c.n,
    height = c.h;
  if (lockedAxis !== "x") {
    if (o.x >= width) o.x = width - 1;
    if (o.x + o.w <= 0) o.x = 1 - o.w;
  }
  if (lockedAxis !== "y") {
    if (o.y >= height) o.y = height - 1;
    if (o.y + o.h <= 0) o.y = 1 - o.h;
  }
  const crosses =
    (o.x <= -1 && o.x + o.w > 0) ||
    (o.x + o.w >= width + 1 && o.x < width) ||
    (o.y <= -1 && o.y + o.h > 0) ||
    (o.y + o.h >= height + 1 && o.y < height);
  if (crosses) return;
  const edges = [
    { axis: "x", value: -1 },
    { axis: "x", value: width - o.w + 1 },
    { axis: "y", value: -1 },
    { axis: "y", value: height - o.h + 1 },
  ]
    .filter((edge) => edge.axis !== lockedAxis)
    .sort(
      (a, b) => Math.abs(o[a.axis] - a.value) - Math.abs(o[b.axis] - b.value),
    );
  o[edges[0].axis] = edges[0].value;
}

function carouselAngleMask(o) {
  const canonical = o.direction === "right" ? o : { ...o, w: o.h, h: o.w },
    path = carouselAnglePath(canonical);
  if (o.direction === "right") return path;
  const result = new Path2D(),
    matrix = new DOMMatrix()
      .translate(o.w / 2, o.h / 2)
      .rotate(o.direction === "up" ? -90 : 90)
      .translate(-canonical.w / 2, -canonical.h / 2);
  result.addPath(path, matrix);
  return result;
}

function carouselImageBounds(o) {
  const im = p.images.find((im) => im.id === o.imageId);
  if (!im) return { x: o.x, y: o.y, w: o.w, h: o.h };
  const scale = Math.max(o.w / im.width, o.h / im.height) * o.scale,
    w = im.width * scale,
    h = im.height * scale;
  return {
    x: o.x + o.w / 2 + o.panX - w / 2,
    y: o.y + o.h / 2 + o.panY - h / 2,
    w,
    h,
  };
}

function carouselPhotoCoversFrame(o) {
  const b = carouselImageBounds(o),
    left = b.x - o.x,
    top = b.y - o.y,
    right = left + b.w,
    bottom = top + b.h;
  // Every polygon edge is straight, so its vertices completely determine
  // containment within the rectangular photo footprint. Rotation/flips of the
  // whole object do not affect this local-space test.
  return carouselFramePoints(o).every(
    ({ x, y }) =>
      x * o.w >= left - 0.01 &&
      x * o.w <= right + 0.01 &&
      y * o.h >= top - 0.01 &&
      y * o.h <= bottom + 0.01,
  );
}

function carouselImageResize(ev, o, corner) {
  if (carouselObjectLocked(o)) return;
  const rotation = o.angle || 0,
    projectPoint = (event) =>
      carouselRotatePoint(carouselPoint(event), -rotation),
    start = projectPoint(ev),
    base = clone(o),
    origin = carouselRotatePoint(o, -rotation),
    virtual = { ...base, x: origin.x, y: origin.y, angle: 0 },
    b = carouselImageBounds(virtual);
  let begun = false;
  carouselListen(
    ev,
    (e) => {
      if (!begun) {
        checkpoint();
        begun = true;
      }
      const pt = projectPoint(e),
        dx = pt.x - start.x,
        dy = pt.y - start.y;
      let w =
          b.w + (corner.includes("e") ? dx : corner.includes("w") ? -dx : 0),
        h = b.h + (corner.includes("s") ? dy : corner.includes("n") ? -dy : 0),
        ratio =
          corner === "n" || corner === "s"
            ? h / b.h
            : corner === "e" || corner === "w"
              ? w / b.w
              : Math.max(w / b.w, h / b.h);
      ratio = Math.max(0.05 / base.scale, Math.min(20 / base.scale, ratio));
      w = b.w * ratio;
      h = b.h * ratio;
      let x = corner.includes("w") ? b.x + b.w - w : b.x,
        y = corner.includes("n") ? b.y + b.h - h : b.y;
      if (e.altKey) {
        x = b.x + (b.w - w) / 2;
        y = b.y + (b.h - h) / 2;
      }
      o.scale = base.scale * ratio;
      o.panX = x + w / 2 - virtual.x - o.w / 2;
      o.panY = y + h / 2 - virtual.y - o.h / 2;
      carouselRefresh();
      carouselCoordinates([o]);
    },
    () => {
      if (begun) changed(false);
      carouselPanel();
    },
  );
}

function carouselAngleTip(o) {
  return carouselToWorld(o, {
    x: o.direction === "right" ? o.w : o.w / 2,
    y: o.direction === "up" ? 0 : o.direction === "down" ? o.h : o.h / 2,
  });
}

function carouselAngleTipSnap(
  o,
  c = p.carousel,
  tolerance = studioPreferences.snapDistance / carouselZoom,
) {
  const tip = carouselAngleTip(o),
    centers = Array.from({ length: c.n }, (_, i) => (i + 0.5) * c.w),
    nearest = centers.reduce((a, b) =>
      Math.abs(a - tip.x) <= Math.abs(b - tip.x) ? a : b,
    ),
    dy = c.h / 2 - tip.y;
  return {
    x: Math.abs(nearest - tip.x) <= tolerance ? o.x + nearest - tip.x : null,
    y: Math.abs(dy) <= tolerance ? o.y + dy : null,
  };
}

function carouselAngleAlign(o, c = p.carousel) {
  if (o.angle) return carouselRotatedAngleAlign(o, c);
  const tip = carouselAngleTip(o),
    candidates = Array.from({ length: c.n }, (_, i) => ({
      axis: "x",
      value: (i + 0.5) * c.w - tip.x + o.x,
    }));
  candidates.push({ axis: "y", value: c.h / 2 - tip.y + o.y });
  let best = null,
    distance = Infinity;
  for (const { axis, value } of candidates) {
    const candidate = { ...o, [axis]: value };
    carouselAngleBleed(candidate, c, axis);
    const score = Math.hypot(candidate.x - o.x, candidate.y - o.y);
    if (score < distance) {
      best = candidate;
      distance = score;
    }
  }
  o.x = best.x;
  o.y = best.y;
}

function carouselFramePoints(o) {
  return (
    o.framePoints || [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]
  );
}

function carouselImageMask(o) {
  const path = new Path2D(),
    points = carouselFramePoints(o);
  points.forEach((point, i) =>
    path[i ? "lineTo" : "moveTo"](point.x * o.w, point.y * o.h),
  );
  path.closePath();
  return path;
}

const carouselFrameCandidates = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0.5, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 0.5 },
];

const carouselFrameLabels = [
  "Oben links",
  "Oben Mitte",
  "Oben rechts",
  "Rechts Mitte",
  "Unten rechts",
  "Unten Mitte",
  "Unten links",
  "Links Mitte",
];

function carouselFrameSlots(o) {
  if (o.framePointSlots) return [...o.framePointSlots];
  const count = carouselFramePoints(o).length;
  if (count === 4) return [0, 2, 4, 6];
  if (count === 5)
    return [
      0,
      2,
      4,
      6,
      { top: 1, right: 3, bottom: 5, left: 7 }[o.framePointSide || "right"],
    ].sort((a, b) => a - b);
  return Array.from({ length: count }, (_, index) =>
    Math.round((index * 8) / count),
  );
}

function carouselFrameArea(points) {
  return (
    Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0),
    ) / 2
  );
}

function carouselFramePicker(o) {
  const slots = carouselFrameSlots(o),
    points = carouselFramePoints(o);
  return `<div class="frame-point-selector"><div class="frame-point-heading"><span>Rahmenpunkte</span><strong>${slots.length} / 8</strong></div><div class="frame-point-diagram" role="group" aria-label="Rahmenpunkte auswählen · mindestens drei"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="10" y="10" width="80" height="80"/><polygon points="${points.map((point) => `${10 + point.x * 80},${10 + point.y * 80}`).join(" ")}"/></svg>${carouselFrameCandidates
    .map((point, slot) => {
      const active = slots.includes(slot),
        remaining = points.filter((_, index) => slots[index] !== slot),
        disabled =
          carouselObjectLocked(o) ||
          (active &&
            (slots.length <= 3 || carouselFrameArea(remaining) < 0.00001));
      return `<button class="frame-point-choice" data-frame-slot="${slot}" style="left:${10 + point.x * 80}%;top:${10 + point.y * 80}%" aria-label="${carouselFrameLabels[slot]}" title="${carouselFrameLabels[slot]}${disabled && !carouselObjectLocked(o) ? " · mindestens drei Punkte müssen eine Fläche bilden" : ""}" aria-pressed="${active}" ${disabled ? "disabled" : ""}><span></span></button>`;
    })
    .join("")}</div></div>`;
}

function carouselToggleFrameSlot(o, slot) {
  if (carouselObjectLocked(o)) return;
  const slots = carouselFrameSlots(o),
    active = slots.includes(slot);
  if (active && slots.length <= 3) return;
  const base = clone(o),
    current = carouselFramePoints(o),
    next = active
      ? slots.filter((value) => value !== slot)
      : [...slots, slot].sort((a, b) => a - b);
  const points = next.map((value) => {
    const index = slots.indexOf(value),
      point = index >= 0 ? current[index] : carouselFrameCandidates[value];
    return carouselToWorld(base, { x: point.x * base.w, y: point.y * base.h });
  });
  if (carouselFrameArea(points) < 1) return;
  const result = clone(o);
  if (!carouselSetImageFrame(result, base, points)) return;
  checkpoint();
  Object.assign(o, result);
  o.framePointSlots = next;
  delete o.framePointSide;
  carouselUI.framePoints = true;
  carouselUI.content = false;
  carouselUI.tool = "select";
  carouselToolUI();
  changed(false);
  carouselPanel();
}

function carouselDrawFramePoints(o, root, editing) {
  const points = carouselFramePoints(o),
    s = carouselZoom,
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("carousel-frame-path");
  svg.setAttribute("width", o.w * s);
  svg.setAttribute("height", o.h * s);
  Object.assign(svg.style, {
    left: o.x * s + "px",
    top: o.y * s + "px",
    transformOrigin: "0 0",
    transform: o.angle ? `rotate(${o.angle}deg)` : "none",
  });
  svg.innerHTML = `<polygon points="${points.map((point) => `${point.x * o.w * s},${point.y * o.h * s}`).join(" ")}"/>`;
  root.append(svg);
  if (editing && !carouselObjectLocked(o))
    points.forEach((point, index) => {
      const handle = document.createElement("button");
      handle.className = "carousel-point-handle";
      handle.dataset.framePoint = index;
      handle.setAttribute("aria-label", `Rahmenpunkt ${index + 1} verschieben`);
      handle.style.left =
        carouselToWorld(o, { x: point.x * o.w, y: point.y * o.h }).x * s + "px";
      handle.style.top =
        carouselToWorld(o, { x: point.x * o.w, y: point.y * o.h }).y * s + "px";
      handle.onpointerdown = (ev) => {
        ev.stopPropagation();
        carouselFramePointDrag(ev, o, index);
      };
      root.append(handle);
    });
}

function carouselFramePointDrag(ev, o, index) {
  if (carouselObjectLocked(o)) return;
  const start = carouselPoint(ev),
    base = clone(o),
    original = carouselFramePoints(base).map((point) =>
      carouselToWorld(base, { x: point.x * base.w, y: point.y * base.h }),
    );
  let begun = false;
  carouselListen(
    ev,
    (e) => {
      const pt = carouselPoint(e);
      let dx = pt.x - start.x,
        dy = pt.y - start.y;
      if (!begun && Math.hypot(dx, dy) * carouselZoom < 2) return;
      if (!begun) {
        checkpoint();
        begun = true;
      }
      if (e.shiftKey) {
        const angle =
            (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4,
          length = Math.hypot(dx, dy);
        dx = Math.cos(angle) * length;
        dy = Math.sin(angle) * length;
      }
      const snap = carouselSnap(
          original[index].x + dx,
          original[index].y + dy,
          { w: 0, h: 0 },
          e.ctrlKey || e.metaKey || e.shiftKey,
        ),
        points = original.map((point) => ({ ...point }));
      points[index] = { x: snap.x, y: snap.y };
      carouselUI.snapLines = snap.guides;
      if (!carouselSetImageFrame(o, base, points)) return;
      carouselRefresh();
      carouselCoordinates([o]);
    },
    () => {
      if (begun) changed(false);
      carouselPanel();
    },
  );
}

function carouselSetImageFrame(o, base, points) {
  if (base.angle)
    points = points.map((point) => carouselRotatePoint(point, -base.angle));
  const localBase = carouselRotatePoint(base, -(base.angle || 0));
  const x = Math.min(...points.map((point) => point.x)),
    y = Math.min(...points.map((point) => point.y)),
    w = Math.max(10, Math.max(...points.map((point) => point.x)) - x),
    h = Math.max(10, Math.max(...points.map((point) => point.y)) - y);
  if (w > 100000 || h > 100000 || Math.abs(x) > 100000 || Math.abs(y) > 100000)
    return false;
  const im = p.images.find((im) => im.id === o.imageId),
    oldFit = im ? Math.max(base.w / im.width, base.h / im.height) : 1,
    newFit = im ? Math.max(w / im.width, h / im.height) : 1;
  Object.assign(o, {
    x: carouselRotatePoint({ x, y }, base.angle || 0).x,
    y: carouselRotatePoint({ x, y }, base.angle || 0).y,
    w,
    h,
    framePoints: points.map((point) => ({
      x: (point.x - x) / w,
      y: (point.y - y) / h,
    })),
    ...(o.type === "image"
      ? {
          scale: (base.scale * oldFit) / newFit,
          panX: localBase.x + base.w / 2 + base.panX - x - w / 2,
          panY: localBase.y + base.h / 2 + base.panY - y - h / 2,
        }
      : {}),
  });
  if (o.type === "gradient") {
    const stops = carouselGradientPoints(base);
    for (const [key, point] of [
      ["gradientStart", stops.start],
      ["gradientEnd", stops.end],
    ])
      o[key] = {
        x: (localBase.x + point.x - x) / w,
        y: (localBase.y + point.y - y) / h,
      };
  }
  return true;
}
