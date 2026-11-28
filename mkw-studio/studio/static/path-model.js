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
  function pointAt(a, b, t) {
    const curved = a.out || b.in,
      p =
        a.out ||
        (curved ? a : { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 });
    const q =
        b.in ||
        (curved
          ? b
          : { x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y)) / 3 }),
      u = 1 - t;
    return {
      x:
        u * u * u * a.x +
        3 * u * u * t * p.x +
        3 * u * t * t * q.x +
        t * t * t * b.x,
      y:
        u * u * u * a.y +
        3 * u * u * t * p.y +
        3 * u * t * t * q.y +
        t * t * t * b.y,
    };
  }

  function linkedHandle(
    node,
    key,
    position,
    event,
    base = node,
    createOpposite = true,
  ) {
    let dx = position.x - node.x,
      dy = position.y - node.y,
      length = Math.hypot(dx, dy);
    if (event.shiftKey) {
      const angle =
        (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
      dx = Math.cos(angle) * length;
      dy = Math.sin(angle) * length;
    }
    node[key] = { x: node.x + dx, y: node.y + dy };
    const other = key === "in" ? "out" : "in";
    if (event.altKey || (!createOpposite && !base[other])) return;
    const otherLength =
      event.ctrlKey && base[other]
        ? Math.hypot(base[other].x - base.x, base[other].y - base.y)
        : length;
    if (length > 0.00001)
      node[other] = {
        x: node.x - (dx / length) * otherLength,
        y: node.y - (dy / length) * otherLength,
      };
    else if (!event.ctrlKey) node[other] = { x: node.x, y: node.y };
  }

  function curvatureSamples(a, b, count = 20) {
    const p = a.out || a,
      q = b.in || b,
      curved = !!(a.out || b.in),
      result = [];
    if (!curved) return result;
    for (let i = 0; i <= count; i++) {
      const t = Math.max(1e-5, Math.min(1 - 1e-5, i / count)),
        u = 1 - t,
        point = pointAt(a, b, t),
        dx =
          3 *
          (u * u * (p.x - a.x) + 2 * u * t * (q.x - p.x) + t * t * (b.x - q.x)),
        dy =
          3 *
          (u * u * (p.y - a.y) + 2 * u * t * (q.y - p.y) + t * t * (b.y - q.y)),
        ddx = 6 * (u * (q.x - 2 * p.x + a.x) + t * (b.x - 2 * q.x + p.x)),
        ddy = 6 * (u * (q.y - 2 * p.y + a.y) + t * (b.y - 2 * q.y + p.y)),
        speed = Math.hypot(dx, dy);
      if (speed < 1e-6) continue;
      result.push({
        ...point,
        nx: -dy / speed,
        ny: dx / speed,
        k: (dx * ddy - dy * ddx) / speed ** 3,
      });
    }
    return result;
  }
  const api = Object.freeze({
    reverse,
    join,
    pointAt,
    linkedHandle,
    curvatureSamples,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPath = api;
})(globalThis);
