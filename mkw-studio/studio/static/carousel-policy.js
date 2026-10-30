(function (root) {
  "use strict";
  const minSlides = 1,
    maxSlides = 20;
  const validCount = (value) =>
    Number.isInteger(value) && value >= minSlides && value <= maxSlides;
  const formatKeys = Object.freeze([
    "w",
    "h",
    "top",
    "bottom",
    "left",
    "right",
  ]);
  function validFormat(c) {
    return (
      !!c &&
      formatKeys.every((key) => Number.isInteger(c[key])) &&
      c.w >= 240 &&
      c.h >= 240 &&
      c.w <= 4000 &&
      c.h <= 4000 &&
      Math.min(c.top, c.bottom, c.left, c.right) >= 0 &&
      c.top + c.bottom < c.h &&
      c.left + c.right < c.w
    );
  }
  function isFree(c) {
    return c.layout === "free";
  }
  function frame(c, slide = 0) {
    return isFree(c)
      ? c.artboards?.[slide]
      : {
          ...Object.fromEntries(formatKeys.map((key) => [key, c[key]])),
          x: slide * c.w,
          y: 0,
          name: `Slide ${slide + 1}`,
          bg: c.bg,
        };
  }
  function frames(c) {
    return Array.from({ length: c.n }, (_, i) => frame(c, i));
  }
  function extent(c) {
    if (!isFree(c)) return { w: c.w * c.n, h: c.h };
    return c.artboards.reduce(
      (b, a) => ({ w: Math.max(b.w, a.x + a.w), h: Math.max(b.h, a.y + a.h) }),
      { w: 0, h: 0 },
    );
  }
  const intersects = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function validBoards(c) {
    if (!isFree(c)) return c.layout === undefined && c.artboards === undefined;
    if (
      !Array.isArray(c.artboards) ||
      c.artboards.length !== c.n ||
      !validCount(c.n)
    )
      return false;
    const ids = new Set();
    for (const [i, a] of c.artboards.entries()) {
      if (
        !a ||
        !validFormat(a) ||
        !Number.isInteger(a.x) ||
        !Number.isInteger(a.y) ||
        a.x < 0 ||
        a.y < 0 ||
        a.x + a.w > 100000 ||
        a.y + a.h > 100000 ||
        typeof a.id !== "string" ||
        !/^[-\w]{1,160}$/.test(a.id) ||
        ids.has(a.id) ||
        typeof a.name !== "string" ||
        !a.name.trim() ||
        a.name.length > 80 ||
        !/^#[0-9a-f]{6}$/i.test(a.bg)
      )
        return false;
      if (c.artboards.slice(0, i).some((b) => intersects(a, b))) return false;
      ids.add(a.id);
    }
    return true;
  }
  function owner(c, bounds) {
    let best = -1,
      area = 0;
    frames(c).forEach((a, i) => {
      const shared =
        Math.max(
          0,
          Math.min(a.x + a.w, bounds.x + bounds.w) - Math.max(a.x, bounds.x),
        ) *
        Math.max(
          0,
          Math.min(a.y + a.h, bounds.y + bounds.h) - Math.max(a.y, bounds.y),
        );
      if (shared > area) {
        area = shared;
        best = i;
      }
    });
    return best;
  }
  function nearest(c, bounds) {
    const assigned = owner(c, bounds);
    if (assigned >= 0) return assigned;
    const x = bounds.x + bounds.w / 2,
      y = bounds.y + bounds.h / 2;
    let best = 0,
      distance = Infinity;
    frames(c).forEach((a, i) => {
      const d = Math.hypot(
        Math.max(a.x - x, 0, x - a.x - a.w),
        Math.max(a.y - y, 0, y - a.y - a.h),
      );
      if (d < distance) {
        best = i;
        distance = d;
      }
    });
    return best;
  }
  function containing(c, bounds) {
    return frames(c).findIndex(
      (a) =>
        bounds.x >= a.x &&
        bounds.y >= a.y &&
        bounds.x + bounds.w <= a.x + a.w &&
        bounds.y + bounds.h <= a.y + a.h,
    );
  }
  function safeRect(c, slide = 0) {
    const a = frame(c, slide);
    return {
      x: a.x + a.left,
      y: a.y + a.top,
      w: a.w - a.left - a.right,
      h: a.h - a.top - a.bottom,
    };
  }
  function formatPlan(c, value) {
    if (!validFormat(value))
      throw Error(
        "Breite und Höhe: 240–4000 px. Die gegenüberliegenden Schutzzonen müssen zusammen kleiner als die Zeichenfläche sein.",
      );
    const format = Object.fromEntries(
        formatKeys.map((key) => [key, value[key]]),
      ),
      delta = format.w - c.w,
      positions = c.objects.map((o) => ({
        id: o.id,
        x: o.x + Math.max(0, Math.min(c.n, Math.floor(o.x / c.w))) * delta,
      }));
    if (positions.some((o) => !Number.isFinite(o.x) || Math.abs(o.x) > 100000))
      throw Error(
        "Das Format würde Elemente zu weit ausserhalb der Arbeitsfläche verschieben. Verschiebe diese zuerst näher an die Slides.",
      );
    return {
      format,
      positions,
      changed: formatKeys.some((key) => c[key] !== format[key]),
    };
  }
  function grid(c, slide = 0, settings = {}) {
    const r = safeRect(c, slide),
      axis = (start, span, count) => {
        count = Number.isInteger(count) ? Math.max(1, Math.min(24, count)) : 6;
        const gap =
            count > 1
              ? Math.min(
                  Math.max(0, settings.gap || 0),
                  Math.max(0, (span - count) / (count - 1)),
                )
              : 0,
          cell = (span - (count - 1) * gap) / count,
          lines = [start, start + span];
        for (let i = 1; i < count; i++) {
          const edge = start + i * cell + (i - 1) * gap;
          lines.push(edge, edge + gap);
        }
        return { lines: [...new Set(lines)].sort((a, b) => a - b), cell, gap };
      },
      x = axis(r.x, r.w, settings.columns),
      y = axis(r.y, r.h, settings.rows);
    return {
      x: x.lines,
      y: y.lines,
      cellWidth: x.cell,
      cellHeight: y.cell,
      gapX: x.gap,
      gapY: y.gap,
    };
  }
  const api = Object.freeze({
    minSlides,
    maxSlides,
    isFree,
    frame,
    frames,
    extent,
    validBoards,
    owner,
    nearest,
    containing,
    intersects,
    validCount,
    formatKeys,
    validFormat,
    formatPlan,
    safeRect,
    grid,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWCarouselPolicy = api;
})(globalThis);
