(function (root) {
  "use strict";
  const keys = [
    "font",
    "size",
    "color",
    "tracking",
    "baselineShift",
    "uppercase",
    "script",
    "underline",
    "strike",
  ];
  const finite = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  function attributes(value) {
    return Object.fromEntries(
      keys
        .filter((key) => value?.[key] !== undefined)
        .map((key) => [key, value[key]]),
    );
  }
  function at(o, index) {
    const runs = o.characterStyles || [];
    let lo = 0,
      hi = runs.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (runs[mid].end <= index) lo = mid + 1;
      else hi = mid;
    }
    return runs[lo]?.start <= index ? attributes(runs[lo]) : {};
  }
  function segments(o, start = 0, end = o.text.length) {
    const result = [],
      runs = o.characterStyles || [];
    let lo = 0,
      hi = runs.length,
      cursor = start;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (runs[mid].end <= start) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < runs.length && runs[i].start < end; i++) {
      const run = runs[i],
        a = Math.max(cursor, run.start),
        b = Math.min(end, run.end);
      if (a > cursor) result.push({ start: cursor, end: a });
      if (b > a) result.push({ start: a, end: b, ...attributes(run) });
      cursor = Math.max(cursor, b);
    }
    if (cursor < end) result.push({ start: cursor, end });
    return result;
  }
  function merge(runs) {
    const result = [];
    for (const run of runs) {
      const style = attributes(run),
        previous = result.at(-1);
      if (run.end <= run.start || !Object.keys(style).length) continue;
      if (
        previous?.end === run.start &&
        JSON.stringify(attributes(previous)) === JSON.stringify(style)
      )
        previous.end = run.end;
      else result.push({ start: run.start, end: run.end, ...style });
    }
    return result;
  }
  function patch(o, start, end, values) {
    const out = [];
    for (const run of segments(o)) {
      const cuts = [...new Set([run.start, run.end, start, end])]
        .filter((n) => n >= run.start && n <= run.end)
        .sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i],
          style = attributes(run);
        if (a >= start && a < end)
          for (const [key, value] of Object.entries(values)) {
            if (value === null) delete style[key];
            else if (keys.includes(key)) style[key] = value;
          }
        out.push({ start: a, end: cuts[i + 1], ...style });
      }
    }
    return merge(out);
  }
  function diff(before, after) {
    let start = 0,
      end = before.length,
      next = after.length;
    while (start < end && start < next && before[start] === after[start])
      start++;
    while (end > start && next > start && before[end - 1] === after[next - 1]) {
      end--;
      next--;
    }
    return { start, end, insert: after.slice(start, next) };
  }
  function forInput(o, value, pending) {
    const { start, end, insert } = diff(o.text, value),
      delta = insert.length - (end - start),
      out = [];
    for (const s of segments(o)) {
      if (s.end <= start) out.push(s);
      else if (s.start >= end)
        out.push({ ...s, start: s.start + delta, end: s.end + delta });
      else {
        if (s.start < start) out.push({ ...s, end: start });
        if (s.end > end)
          out.push({ ...s, start: start + insert.length, end: s.end + delta });
      }
    }
    if (insert.length)
      out.push({
        start,
        end: start + insert.length,
        ...at(o, Math.max(0, start - (start === end ? 1 : 0))),
        ...pending,
      });
    return merge(out.sort((a, b) => a.start - b.start));
  }
  function paragraphs(text, start, end) {
    const a = text.slice(0, start).split("\n").length - 1;
    const b = text.slice(0, end > start ? end - 1 : end).split("\n").length - 1;
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  function rich(o) {
    return !!(
      o.typographyVersion ||
      o.characterStyles?.length ||
      o.textStyles?.some(Boolean) ||
      keys.some(
        (key) =>
          !["font", "size", "color", "uppercase"].includes(key) &&
          o[key] !== undefined,
      ) ||
      o.lineHeight !== undefined
    );
  }
  function validate(o, fonts) {
    const check = (s) => {
      if (!s || typeof s !== "object")
        throw Error("Ungültige Zeichenformatierung.");
      if (
        (s.font !== undefined &&
          (typeof s.font !== "string" || !fonts.has(s.font))) ||
        (s.size !== undefined && !finite(s.size, 0.1, 5000)) ||
        (s.color !== undefined && !/^#[0-9a-f]{6}$/i.test(s.color)) ||
        (s.tracking !== undefined && !finite(s.tracking, -500, 2000)) ||
        (s.baselineShift !== undefined &&
          !finite(s.baselineShift, -5000, 5000)) ||
        (s.script !== undefined &&
          !["normal", "superscript", "subscript"].includes(s.script)) ||
        ["uppercase", "underline", "strike"].some(
          (key) => s[key] !== undefined && typeof s[key] !== "boolean",
        )
      )
        throw Error("Ungültige Zeichenformatierung.");
    };
    check(o);
    if (o.characterStyles !== undefined) {
      if (!Array.isArray(o.characterStyles) || o.characterStyles.length > 10000)
        throw Error("Zu viele Zeichenformate.");
      let end = 0;
      for (const s of o.characterStyles) {
        check(s);
        if (
          !Number.isInteger(s.start) ||
          !Number.isInteger(s.end) ||
          s.start < end ||
          s.end <= s.start ||
          s.end > o.text.length
        )
          throw Error("Ungültiger Zeichenbereich.");
        end = s.end;
      }
    }
    if (o.lineHeight !== undefined && !finite(o.lineHeight, 0.2, 5))
      throw Error("Ungültige Zeilenhöhe.");
    if (o.textStyles !== undefined) {
      if (!Array.isArray(o.textStyles) || o.textStyles.length > 10000)
        throw Error("Ungültige Absätze.");
      for (const s of o.textStyles)
        if (s) {
          if (
            (s.align !== undefined &&
              !["left", "center", "right"].includes(s.align)) ||
            (s.size !== undefined && !finite(s.size, 0.1, 5000)) ||
            (s.lineHeight !== undefined && !finite(s.lineHeight, 0.2, 5)) ||
            ["spaceBefore", "spaceAfter"].some(
              (key) => s[key] !== undefined && !finite(s[key], 0, 5000),
            ) ||
            (s.leading !== undefined &&
              (!Array.isArray(s.leading) ||
                s.leading.length > 10000 ||
                s.leading.some((v) => v !== null && !finite(v, 1, 3000))))
          )
            throw Error("Ungültige Absatzformatierung.");
        }
    }
  }
  const api = {
    keys,
    attributes,
    at,
    segments,
    merge,
    patch,
    diff,
    forInput,
    paragraphs,
    rich,
    validate,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWText = api;
})(globalThis);
