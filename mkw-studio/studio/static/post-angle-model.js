/* Single-post angle metadata and clipped geometry; pixels belong to the board photo. */
(function (root) {
  "use strict";
  const policy =
    typeof module !== "undefined"
      ? require("./angle-policy.js")
      : root.MKWAnglePolicy;
  const directions = policy.directions;
  const defaults = (b, source = {}) => ({
    enabled: source.enabled ?? true,
    direction: source.direction || "left",
    tip: source.tip
      ? { ...source.tip }
      : { x: source.direction === "right" ? 0.72 : 0.28, y: 0.5 },
    thickness: source.thickness ?? 150,
    glow: source.glow ?? 50,
    glowColor: source.glowColor || "#ffffff",
    glowAlpha: source.glowAlpha ?? 0.6,
    image: {
      ...b.image,
      scale: Math.min(100, b.image.scale * 1.12),
      x: b.image.x + 24,
      y: b.image.y - 24,
    },
  });
  function geometry(b, content = b) {
    const a = b.angle,
      w = content.w,
      h = content.h,
      t = Math.min(a.thickness * Math.SQRT2, w * 0.45, h * 0.45),
      clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
      x = clamp(
        (policy.horizontal(a.direction) ? a.tip.x : 0.5) * w,
        a.direction === "right" ? t + 1 : 1,
        a.direction === "left" ? w - t - 1 : w - 1,
      ),
      y = clamp(
        (policy.horizontal(a.direction) ? 0.5 : a.tip.y) * h,
        a.direction === "down" ? t + 1 : 1,
        a.direction === "up" ? h - t - 1 : h - 1,
      ),
      length = Math.max(w, h) * 2 + t + 4,
      o = {
        type: "angle",
        direction: a.direction,
        thickness: t / Math.SQRT2,
        glow: a.glow,
        glowColor: a.glowColor,
        glowAlpha: a.glowAlpha,
        ...(a.direction === "right"
          ? { x: x - length, y: y - length, w: length, h: 2 * length }
          : a.direction === "left"
            ? { x, y: y - length, w: length, h: 2 * length }
            : a.direction === "up"
              ? { x: x - length, y, w: 2 * length, h: length }
              : { x: x - length, y: y - length, w: 2 * length, h: length }),
      };
    const canonical = [
      { x: 0, y: 0 },
      { x: length, y: length },
      { x: 0, y: 2 * length },
      { x: 0, y: 2 * length - t },
      { x: length - t, y: length },
      { x: 0, y: t },
    ];
    const points = canonical.map((p) =>
      a.direction === "right"
        ? { x: o.x + p.x, y: o.y + p.y }
        : a.direction === "left"
          ? { x: o.x + length - p.x, y: o.y + 2 * length - p.y }
          : a.direction === "up"
            ? { x: o.x + p.y, y: o.y + length - p.x }
            : { x: o.x + 2 * length - p.y, y: o.y + p.x },
    );
    return { o, points, tip: { x, y }, inner: points[4] };
  }
  function visiblePoints(b, content = b) {
    let points = geometry(b, content).points;
    for (const [axis, edge, greater] of [
      ["x", 0, true],
      ["x", content.w, false],
      ["y", 0, true],
      ["y", content.h, false],
    ]) {
      const next = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          z = points[(i + 1) % points.length],
          inside = (p) => (greater ? p[axis] >= edge : p[axis] <= edge);
        if (inside(a)) next.push(a);
        if (inside(a) !== inside(z)) {
          const ratio = (edge - a[axis]) / (z[axis] - a[axis]);
          next.push({
            x: a.x + (z.x - a.x) * ratio,
            y: a.y + (z.y - a.y) * ratio,
          });
        }
      }
      points = next;
    }
    return points.map((p) => ({
      x: Math.max(0, Math.min(content.w, p.x)),
      y: Math.max(0, Math.min(content.h, p.y)),
    }));
  }
  function contains(b, p, content = b) {
    if (
      !b.angle?.enabled ||
      p.x < 0 ||
      p.y < 0 ||
      p.x > content.w ||
      p.y > content.h
    )
      return false;
    const points = geometry(b, content).points;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i],
        z = points[j];
      if (
        a.y > p.y !== z.y > p.y &&
        p.x < ((z.x - a.x) * (p.y - a.y)) / (z.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  }
  function localPoints(b, content = b) {
    const image = b.angle.image,
      a = (-image.angle * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a);
    return visiblePoints(b, content).map((p) => ({
      x: (p.x - image.x) * c - (p.y - image.y) * s,
      y: (p.x - image.x) * s + (p.y - image.y) * c,
    }));
  }
  function covers(b, im, content = b) {
    return localPoints(b, content).every(
      (p) =>
        Math.abs(p.x) <= (im.width * b.angle.image.scale) / 2 + 0.01 &&
        Math.abs(p.y) <= (im.height * b.angle.image.scale) / 2 + 0.01,
    );
  }
  function cover(b, im, content = b) {
    b.angle.image.scale = Math.min(
      100,
      Math.max(
        b.angle.image.scale,
        ...localPoints(b, content).flatMap((p) => [
          (2 * Math.abs(p.x)) / im.width,
          (2 * Math.abs(p.y)) / im.height,
        ]),
      ),
    );
  }
  function validate(b) {
    const a = b.angle;
    if (a === undefined) return;
    if (
      !a ||
      typeof a.enabled !== "boolean" ||
      !policy.accepts(a.direction) ||
      !a.tip ||
      ![a.tip.x, a.tip.y].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 1,
      ) ||
      !Number.isFinite(a.thickness) ||
      a.thickness < 1 ||
      a.thickness > 1000 ||
      !Number.isFinite(a.glow) ||
      a.glow < 0 ||
      a.glow > 300 ||
      !/^#[a-f0-9]{6}$/i.test(a.glowColor) ||
      !Number.isFinite(a.glowAlpha) ||
      a.glowAlpha < 0 ||
      a.glowAlpha > 1 ||
      !a.image ||
      !["x", "y", "scale", "angle", "flipX", "flipY"].every((k) =>
        Number.isFinite(a.image[k]),
      ) ||
      a.image.scale <= 0 ||
      a.image.scale > 100 ||
      ![a.image.flipX, a.image.flipY].every((n) => n === 1 || n === -1)
    )
      throw Error("Ungültiger FD-Kampagnen-Winkel.");
  }
  const api = {
    directions,
    defaults,
    geometry,
    visiblePoints,
    contains,
    covers,
    cover,
    validate,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPostAngle = api;
})(globalThis);
