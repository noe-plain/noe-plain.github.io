(function (root) {
  "use strict";
  const copy = (point) => ({
    x: point.x,
    y: point.y,
    ...(point.in ? { in: { ...point.in } } : {}),
    ...(point.out ? { out: { ...point.out } } : {}),
  });
  function reverse(points) {
    return [...points].reverse().map((point) => ({
      x: point.x,
      y: point.y,
      ...(point.out ? { in: { ...point.out } } : {}),
      ...(point.in ? { out: { ...point.in } } : {}),
    }));
  }
  function join(first, second) {
    const a = first.map(copy),
      b = second.map(copy);
    if (!a.length) return b;
    if (!b.length) return a;
    const end = a.at(-1),
      start = b[0];
    if (Math.hypot(end.x - start.x, end.y - start.y) < 0.001) {
      delete end.out;
      if (start.out) end.out = { ...start.out };
      b.shift();
    }
    return a.concat(b);
  }
  const api = Object.freeze({ reverse, join });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPath = api;
})(globalThis);
