/* Exact geometric bounds of cubic Bézier paths; control handles are not bounds. */
(function (root) {
  "use strict";
  function at(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return (
      u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
    );
  }
  function extrema(p0, p1, p2, p3) {
    const a = -p0 + 3 * p1 - 3 * p2 + p3,
      b = 2 * (p0 - 2 * p1 + p2),
      c = p1 - p0,
      epsilon = 1e-12;
    if (Math.abs(a) < epsilon)
      return Math.abs(b) < epsilon
        ? []
        : [-c / b].filter((t) => t > 0 && t < 1);
    const d = b * b - 4 * a * c;
    if (d < 0) return [];
    const q = Math.sqrt(Math.max(0, d));
    return [(-b + q) / (2 * a), (-b - q) / (2 * a)].filter(
      (t) => t > 0 && t < 1,
    );
  }
  function bounds(contours, closed = false) {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    const include = (x, y) => {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    };
    for (const points of contours) {
      for (const point of points) include(point.x, point.y);
      for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          p = a.out || a,
          q = b.in || b;
        if (!a.out && !b.in) continue;
        for (const t of [
          ...extrema(a.x, p.x, q.x, b.x),
          ...extrema(a.y, p.y, q.y, b.y),
        ])
          include(at(a.x, p.x, q.x, b.x, t), at(a.y, p.y, q.y, b.y, t));
      }
    }
    return Number.isFinite(left)
      ? { x: left, y: top, w: right - left, h: bottom - top }
      : { x: 0, y: 0, w: 0, h: 0 };
  }
  const api = { bounds, at, extrema };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWBezier = api;
})(globalThis);
