(function (root) {
  "use strict";
  const textModel =
    typeof module !== "undefined" ? require("./text-model.js") : root.MKWText;
  function merge(ranges) {
    const result = [];
    for (const range of ranges
      .filter((r) => r.end > r.start)
      .sort((a, b) => a.start - b.start)) {
      const previous = result.at(-1);
      if (previous && range.start <= previous.end)
        previous.end = Math.max(previous.end, range.end);
      else result.push({ ...range });
    }
    return result;
  }
  function paragraphs(text) {
    let start = 0;
    return text.split("\n").map((value, index, all) => {
      const end = start + value.length + (index < all.length - 1 ? 1 : 0);
      const range = { start, end, index };
      start = end;
      return range;
    });
  }
  function resolve(o, selection = {}) {
    const all = paragraphs(o.text),
      clamp = (value) =>
        Number.isFinite(value)
          ? Math.max(0, Math.min(o.text.length, value))
          : 0,
      range = selection.range && {
        start: clamp(selection.range.start),
        end: clamp(selection.range.end),
      },
      direct = !!range && range.end > range.start,
      indices = direct
        ? textModel.paragraphs(o.text, range.start, range.end)
        : [...new Set(selection.paragraphs ?? all.map((p) => p.index))]
            .filter((i) => Number.isInteger(i) && i >= 0 && i < all.length)
            .sort((a, b) => a - b),
      lineScoped = !direct && Array.isArray(selection.lines),
      ranges = direct
        ? [
            {
              start: Math.max(0, range.start),
              end: Math.min(o.text.length, range.end),
            },
          ]
        : lineScoped
          ? selection.lines
              .filter((l) => indices.includes(l.paragraph))
              .map((l) => ({ start: l.start, end: l.end }))
          : all.filter((p) => indices.includes(p.index));
    return {
      direct,
      completeParagraphs:
        direct &&
        indices.every(
          (i) =>
            range.start <= all[i].start &&
            range.end >= all[i].end - (i < all.length - 1 ? 1 : 0),
        ),
      lineScoped,
      paragraphs: indices,
      whole: !direct && !lineScoped && indices.length === all.length,
      ranges: merge(ranges),
    };
  }
  function values(o, scope, key) {
    const base =
        key === "font"
          ? o.font || o.role
          : (o[key] ??
            (key === "script"
              ? "normal"
              : ["uppercase", "underline", "strike"].includes(key)
                ? false
                : 0)),
      result = [];
    let cursor = 0;
    for (const p of paragraphs(o.text)) {
      while (scope.ranges[cursor]?.end <= p.start) cursor++;
      for (
        let i = cursor;
        i < scope.ranges.length && scope.ranges[i].start < p.end;
        i++
      ) {
        const start = Math.max(p.start, scope.ranges[i].start),
          end = Math.min(p.end, scope.ranges[i].end);
        for (const run of textModel.segments(o, start, end))
          result.push(
            run[key] ??
              (key === "size" ? o.textStyles?.[p.index]?.size : undefined) ??
              base,
          );
      }
    }
    if (!result.length && scope.paragraphs.length && !scope.lineScoped)
      for (const index of scope.paragraphs)
        result.push(
          (key === "size" ? o.textStyles?.[index]?.size : undefined) ?? base,
        );
    return result;
  }
  function apply(o, scope, values, fontKey = "font") {
    const patch = { ...values };
    if (
      ((!scope.direct && !scope.lineScoped) || scope.completeParagraphs) &&
      Object.hasOwn(values, "size")
    ) {
      if (values.size === null || !scope.whole) {
        textModel.changeParagraphs(o, scope.paragraphs, {
          size: values.size === null ? undefined : values.size,
        });
        patch.size = null;
      }
    }
    if (scope.whole) textModel.changeCharacters(o, null, patch, fontKey);
    else
      for (const range of scope.ranges)
        textModel.changeCharacters(o, range, patch, fontKey);
  }
  const api = Object.freeze({ resolve, values, apply });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWTextScope = api;
})(globalThis);
