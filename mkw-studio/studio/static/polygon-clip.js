/* Polygon clipping shared by output coverage checks; no rendering or UI state. */
(function (root) {
  "use strict";
  function rectangle(source, rect) {
    let points = source;
    for (const [axis, edge, greater] of [
      ["x", rect.x, true],
      ["x", rect.x + rect.w, false],
      ["y", rect.y, true],
      ["y", rect.y + rect.h, false],
    ]) {
      const next = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          inside = (p) => (greater ? p[axis] >= edge : p[axis] <= edge);
        if (inside(a)) next.push(a);
        if (inside(a) !== inside(b)) {
          const t = (edge - a[axis]) / (b[axis] - a[axis]);
          next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      points = next;
    }
    return points;
  }
  const area = (points) =>
    Math.abs(
      points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length];
        return sum + a.x * b.y - b.x * a.y;
      }, 0),
    ) / 2;
  const api = Object.freeze({ rectangle, area });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPolygonClip = api;
})(globalThis);
