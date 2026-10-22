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
  function safeRect(c, slide = 0) {
    return {
      x: slide * c.w + c.left,
      y: c.top,
      w: c.w - c.left - c.right,
      h: c.h - c.top - c.bottom,
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
