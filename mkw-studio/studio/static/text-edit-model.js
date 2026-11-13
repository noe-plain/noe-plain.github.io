(function (root) {
  "use strict";
  const model =
    typeof module !== "undefined" ? require("./text-model.js") : root.MKWText;
  const clone = (value) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const maxLength = 100000;
  const paragraphKeys = [
    "align",
    "size",
    "lineHeight",
    "spaceBefore",
    "spaceAfter",
    "hyphenate",
    "leading",
  ];
  const pick = (value, keys) =>
    Object.fromEntries(
      keys
        .filter((k) => value?.[k] !== undefined)
        .map((k) => [k, clone(value[k])]),
    );
  function paragraphs(text) {
    let start = 0;
    return text.split("\n").map((value, index) => {
      const p = { start, end: start + value.length, index };
      start = p.end + 1;
      return p;
    });
  }
  function slice(o, start, end) {
    start = Math.max(0, Math.min(o.text.length, start));
    end = Math.max(start, Math.min(o.text.length, end));
    const text = o.text.slice(start, end),
      characterStyles = [],
      textStyles = [];
    for (const p of paragraphs(o.text)) {
      if (p.end < start || p.start >= end) continue;
      const ps = o.textStyles?.[p.index] || {},
        a = Math.max(start, p.start),
        b = Math.min(end, p.end + 1);
      const base = {
        font: o.font || o.role,
        size: ps.size ?? o.size,
        color: o.color,
        tracking: o.tracking ?? 0,
        baselineShift: o.baselineShift ?? 0,
        script: o.script || "normal",
        uppercase: !!o.uppercase,
        underline: !!o.underline,
        strike: !!o.strike,
        family: !!o.family,
      };
      for (const run of model.segments(o, a, b))
        characterStyles.push({
          ...base,
          ...run,
          start: run.start - start,
          end: run.end - start,
        });
      const style = {
        align: o.textAlign || o.align || "left",
        lineHeight: o.lineHeight ?? 0.95,
        ...pick(ps, paragraphKeys),
      };
      if (a !== p.start || end < p.end) delete style.leading;
      textStyles.push(style);
    }
    while (textStyles.length < text.split("\n").length) textStyles.push(null);
    return {
      version: 1,
      text,
      characterStyles: model.merge(characterStyles),
      textStyles,
    };
  }
  function normalize(value, fonts, fallback) {
    if (
      !value ||
      value.version !== 1 ||
      typeof value.text !== "string" ||
      value.text.length > maxLength ||
      !Array.isArray(value.characterStyles) ||
      !Array.isArray(value.textStyles)
    )
      return null;
    if (value.characterStyles.length > 10000 || value.textStyles.length > 10000)
      return null;
    const result = {
      version: 1,
      text: value.text,
      characterStyles: value.characterStyles.map((s) => ({
        start: s.start,
        end: s.end,
        ...pick(s, model.keys),
      })),
      textStyles: value.textStyles.map((s) =>
        s ? pick(s, paragraphKeys) : null,
      ),
    };
    for (const run of result.characterStyles)
      if (run.font && !fonts.has(run.font)) run.font = fallback;
    try {
      model.validate(result, fonts);
    } catch {
      return null;
    }
    return result;
  }
  function replace(o, start, end, fragment, rich = true) {
    const text = fragment.text;
    if (
      typeof text !== "string" ||
      o.text.length - (end - start) + text.length > maxLength
    )
      throw Error(
        "Der Text ist zu lang. Bitte höchstens 100 000 Zeichen pro Textfeld verwenden.",
      );
    if (start < 0 || end < start || end > o.text.length)
      throw Error("Die Textauswahl ist nicht mehr gültig.");
    const next = {
        text: o.text.slice(0, start) + text + o.text.slice(end),
        characterStyles: [],
        textStyles: clone(o.textStyles || []),
      },
      delta = text.length - (end - start),
      inherited = model.at(o, Math.max(0, start - (start === end ? 1 : 0)));
    for (const run of model.segments(o)) {
      if (run.start < start)
        next.characterStyles.push({ ...run, end: Math.min(run.end, start) });
      if (run.end > end)
        next.characterStyles.push({
          ...run,
          start: Math.max(run.start, end) + delta,
          end: run.end + delta,
        });
    }
    if (text.length) {
      if (rich && fragment.characterStyles?.length)
        for (const run of fragment.characterStyles)
          next.characterStyles.push({
            ...run,
            start: start + run.start,
            end: start + run.end,
          });
      else
        next.characterStyles.push({
          ...inherited,
          start,
          end: start + text.length,
        });
    }
    if (next.text.split("\n").length > 10000)
      throw Error("Höchstens 10 000 Absätze pro Textfeld verwenden.");
    next.characterStyles = model.merge(
      next.characterStyles.sort((a, b) => a.start - b.start),
    );
    while (next.textStyles.length < o.text.split("\n").length)
      next.textStyles.push(null);
    const first = o.text.slice(0, start).split("\n").length - 1,
      removed = o.text.slice(start, end).split("\n").length - 1,
      added = text.split("\n").length - 1,
      { leading, ...base } = next.textStyles[first] || {};
    next.textStyles.splice(
      first + 1,
      removed,
      ...Array.from({ length: added }, () =>
        Object.keys(base).length ? { ...base } : null,
      ),
    );
    if (rich)
      for (let i = 0; i <= added; i++) {
        const prefix = i === 0 && start > 0 && o.text[start - 1] !== "\n",
          suffix = i === added && end < o.text.length && o.text[end] !== "\n";
        if (!prefix && !suffix && fragment.textStyles?.[i])
          next.textStyles[first + i] = clone(fragment.textStyles[i]);
      }
    model.validate(
      { ...o, ...next },
      new Set([
        o.font || o.role,
        ...next.characterStyles.map((run) => run.font).filter(Boolean),
      ]),
    );
    return next;
  }
  function scale(o, factor, frame = false) {
    if (!Number.isFinite(factor) || factor <= 0)
      throw Error("Bitte eine gültige Skalierung eingeben.");
    const next = {
      size: o.size * factor,
      baselineShift: (o.baselineShift || 0) * factor,
      characterStyles: (o.characterStyles || []).map((run) => ({
        ...run,
        ...(run.size !== undefined ? { size: run.size * factor } : {}),
        ...(run.baselineShift !== undefined
          ? { baselineShift: run.baselineShift * factor }
          : {}),
      })),
      textStyles: (o.textStyles || []).map((style) =>
        style
          ? {
              ...style,
              ...Object.fromEntries(
                ["size", "spaceBefore", "spaceAfter"]
                  .filter((k) => style[k] !== undefined)
                  .map((k) => [k, style[k] * factor]),
              ),
              ...(style.leading
                ? {
                    leading: style.leading.map((v) =>
                      v === null ? null : v * factor,
                    ),
                  }
                : {}),
            }
          : null,
      ),
    };
    if (frame) {
      next.w = o.w * factor;
      next.h = o.h * factor;
    }
    const sizes = [
      next.size,
      ...next.textStyles
        .filter(Boolean)
        .map((s) => s.size)
        .filter((v) => v !== undefined),
    ];
    if (
      sizes.some((v) => v < 1 || v > 1000) ||
      (frame &&
        (next.w < 1 || next.h < 1 || next.w > 100000 || next.h > 100000))
    )
      throw Error(
        "Diese Skalierung überschreitet die unterstützte Textgrösse (1–1000 px).",
      );
    const fonts = new Set([
      o.font || o.role,
      ...(next.characterStyles || []).map((s) => s.font).filter(Boolean),
    ]);
    model.validate({ ...o, ...next }, fonts);
    return next;
  }
  const api = Object.freeze({
    maxLength,
    paragraphs,
    slice,
    normalize,
    replace,
    scale,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWTextEdit = api;
})(globalThis);
