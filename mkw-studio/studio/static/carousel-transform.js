"use strict";
// Local frames stay stable; world bounds include exact rotated curve extrema.
function carouselRotatePoint(point, degrees) {
  const a = (degrees * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
}
function carouselToWorld(o, point) {
  const q = carouselRotatePoint(point, o.angle || 0);
  return { x: o.x + q.x, y: o.y + q.y };
}
function carouselToLocal(o, point) {
  return carouselRotatePoint(
    { x: point.x - o.x, y: point.y - o.y },
    -(o.angle || 0),
  );
}
function carouselLocalBounds(o) {
  if (o.type === "path") {
    const b = MKWBezier.bounds(o.contours || [o.points], o.closed);
    return {
      x: b.x * o.w,
      y: b.y * o.h,
      w: Math.max(0.001, b.w * o.w),
      h: Math.max(0.001, b.h * o.h),
    };
  }
  if (["image", "gradient"].includes(o.type) && o.framePoints) {
    const xs = o.framePoints.map((p) => p.x * o.w),
      ys = o.framePoints.map((p) => p.y * o.h);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (o.type === "shape" && !["rect", "ellipse"].includes(o.shapeKind)) {
    const n = o.shapeKind === "triangle" ? 3 : o.sides,
      count = o.shapeKind === "star" ? n * 2 : n,
      points = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2,
        r = o.shapeKind === "star" && i % 2 ? o.innerRatio : 1;
      points.push({
        x: o.w / 2 + ((Math.cos(a) * o.w) / 2) * r,
        y: o.h / 2 + ((Math.sin(a) * o.h) / 2) * r,
      });
    }
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  return { x: 0, y: 0, w: o.w, h: o.h };
}
function carouselCalculateGeometryBounds(o) {
  const b = carouselLocalBounds(o);
  if (!o.angle) return { x: o.x + b.x, y: o.y + b.y, w: b.w, h: b.h };
  if (o.type === "path") {
    const contours = (o.contours || [o.points]).map((points) =>
      points.map((p) => {
        const q = carouselToWorld(o, { x: p.x * o.w, y: p.y * o.h });
        for (const k of ["in", "out"])
          if (p[k])
            q[k] = carouselToWorld(o, { x: p[k].x * o.w, y: p[k].y * o.h });
        return q;
      }),
    );
    return MKWBezier.bounds(contours, o.closed);
  }
  if (o.type === "shape" && o.shapeKind === "ellipse") {
    const center = carouselToWorld(o, { x: o.w / 2, y: o.h / 2 }),
      a = (o.angle * Math.PI) / 180,
      rx = Math.hypot((o.w / 2) * Math.cos(a), (o.h / 2) * Math.sin(a)),
      ry = Math.hypot((o.w / 2) * Math.sin(a), (o.h / 2) * Math.cos(a));
    return { x: center.x - rx, y: center.y - ry, w: rx * 2, h: ry * 2 };
  }
  const pts = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ].map(([x, y]) => carouselToWorld(o, { x, y }));
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
function carouselSelectionFrame(frame, items, bounds, content = false) {
  const o = items.length === 1 ? items[0] : null,
    b = o
      ? content
        ? { ...bounds, x: bounds.x - o.x, y: bounds.y - o.y }
        : carouselLocalBounds(o)
      : bounds,
    origin = o ? carouselToWorld(o, b) : b;
  Object.assign(frame.style, {
    left: origin.x * carouselZoom + "px",
    top: origin.y * carouselZoom + "px",
    width: b.w * carouselZoom + "px",
    height: b.h * carouselZoom + "px",
    transformOrigin: "0 0",
    transform: o?.angle ? `rotate(${o.angle}deg)` : "none",
  });
}
function carouselSetRotation(o, angle) {
  const b = carouselLocalBounds(o),
    local = { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    center = carouselToWorld(o, local),
    q = carouselRotatePoint(local, angle);
  o.x = center.x - q.x;
  o.y = center.y - q.y;
  o.angle = angle;
}
function carouselRotateSelection(ev) {
  ev.stopPropagation();
  const objects = carouselSelected().filter((o) => !carouselObjectLocked(o));
  if (!objects.length) return;
  const originals = objects.map(clone),
    bounds = carouselBounds(objects),
    center = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 },
    start = carouselPoint(ev),
    a0 = Math.atan2(start.y - center.y, start.x - center.x);
  let begun = false;
  carouselListen(
    ev,
    (event) => {
      if (!begun) {
        checkpoint();
        begun = true;
      }
      const pt = carouselPoint(event);
      let delta =
        ((Math.atan2(pt.y - center.y, pt.x - center.x) - a0) * 180) / Math.PI;
      if (event.shiftKey) delta = Math.round(delta / 15) * 15;
      objects.forEach((o, i) => {
        const old = originals[i],
          q = carouselRotatePoint(
            { x: old.x - center.x, y: old.y - center.y },
            delta,
          );
        o.x = center.x + q.x;
        o.y = center.y + q.y;
        o.angle = (((old.angle || 0) + delta + 540) % 360) - 180;
      });
      carouselRefresh();
    },
    () => {
      if (begun) {
        changed(false);
      }
      carouselPanel();
    },
    () => {
      objects.forEach((o, i) => Object.assign(o, originals[i]));
      carouselRefresh();
    },
  );
}
// Constrain the snap correction to the Shift ray; never break the 45° movement.
function carouselSnapConstrained(
  origin,
  dx,
  dy,
  bounds,
  disabled = false,
  anchors = [],
) {
  if (disabled || !carouselUI.snap)
    return { x: origin.x + dx, y: origin.y + dy, guides: [] };
  const length = Math.hypot(dx, dy),
    ux = length ? dx / length : 1,
    uy = length ? dy / length : 0,
    lines = carouselSnapLines(),
    tolerance = studioPreferences.snapDistance / carouselZoom;
  let correction = 0,
    best = Infinity;
  for (const [axis, u, size] of [
    ["x", ux, bounds.w],
    ["y", uy, bounds.h],
  ]) {
    if (Math.abs(u) < 1e-6) continue;
    for (const offset of [
      0,
      size / 2,
      size,
      ...anchors.map((point) => point[axis]),
    ])
      for (const line of lines[axis]) {
        const delta =
          (line - origin[axis] - (axis === "x" ? dx : dy) - offset) / u;
        if (
          length + delta >= 0 &&
          Math.abs(delta) <= tolerance &&
          Math.abs(delta) < best
        ) {
          best = Math.abs(delta);
          correction = delta;
        }
      }
  }
  const x = origin.x + dx + ux * correction,
    y = origin.y + dy + uy * correction,
    guides = [];
  for (const [axis, value, size] of [
    ["x", x, bounds.w],
    ["y", y, bounds.h],
  ])
    for (const line of lines[axis])
      if (
        [0, size / 2, size, ...anchors.map((point) => point[axis])].some(
          (offset) => Math.abs(value + offset - line) < 0.001,
        )
      )
        guides.push({ axis, value: line });
  return { x, y, guides };
}

const carouselBoundsCache = new WeakMap();
function carouselGeometryBounds(o) {
  if (!carouselIsVector(o) && !o.framePoints)
    return carouselCalculateGeometryBounds(o);
  const key = JSON.stringify([
      o.type,
      o.w,
      o.h,
      o.angle,
      o.points,
      o.contours,
      o.closed,
      o.shapeKind,
      o.radius,
      o.sides,
      o.innerRatio,
      o.framePoints,
    ]),
    cached = carouselBoundsCache.get(o);
  let bounds = cached?.key === key ? cached.bounds : null;
  if (!bounds) {
    bounds = carouselCalculateGeometryBounds({ ...o, x: 0, y: 0 });
    carouselBoundsCache.set(o, { key, bounds });
  }
  return { ...bounds, x: bounds.x + o.x, y: bounds.y + o.y };
}
function carouselRotatedAngleAlign(o, c = p.carousel) {
  if (MKWCarouselPolicy.isFree(c)) {
    const index = MKWCarouselPolicy.nearest(c, carouselObjectBounds(o)),
      a = MKWCarouselPolicy.frame(c, index < 0 ? 0 : index),
      local = { ...o, x: o.x - a.x, y: o.y - a.y };
    carouselRotatedAngleAlign(local, {
      ...c,
      layout: undefined,
      artboards: undefined,
      w: a.w,
      h: a.h,
      n: 1,
    });
    o.x = local.x + a.x;
    o.y = local.y + a.y;
    return;
  }
  const tip = carouselAngleTip(o),
    xs = Array.from({ length: c.n }, (_, i) => (i + 0.5) * c.w),
    candidates = [];
  for (const [axis, target] of MKWAnglePolicy.horizontal(o.direction)
    ? [["y", c.h / 2]]
    : xs.map((x) => ["x", x])) {
    const candidate = { ...o, [axis]: o[axis] + target - tip[axis] },
      b = carouselObjectBounds(candidate),
      free = axis === "x" ? "y" : "x",
      span = free === "x" ? c.w * c.n : c.h,
      size = free === "x" ? b.w : b.h;
    if (
      !(
        (b.x <= -1 && b.x + b.w > 0) ||
        (b.x + b.w >= c.w * c.n + 1 && b.x < c.w * c.n) ||
        (b.y <= -1 && b.y + b.h > 0) ||
        (b.y + b.h >= c.h + 1 && b.y < c.h)
      )
    ) {
      const ds = [-1 - b[free], span + 1 - b[free] - size].sort(
        (a, b) => Math.abs(a) - Math.abs(b),
      );
      candidate[free] += ds[0];
    }
    candidates.push(candidate);
  }
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y),
  );
  o.x = candidates[0].x;
  o.y = candidates[0].y;
}
