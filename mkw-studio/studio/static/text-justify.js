/* Bounded line composition. Percentages are fixed document-format semantics. */
(function (root) {
  "use strict";
  const limits = Object.freeze({
    word: Object.freeze([0.8, 1, 1.2]),
    letter: Object.freeze([-0.02, 0, 0.02]),
    glyph: Object.freeze([0.98, 1, 1.02]),
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function bounds(m) {
    return {
      min: (m.width - m.spaces * 0.2 - m.letters * 0.02) * 0.98,
      max: (m.width + m.spaces * 0.2 + m.letters * 0.02) * 1.02,
    };
  }
  function fit(m, target, last = false) {
    let word = 1,
      letter = 0,
      glyph = 1;
    if (!last && m.width > 0) {
      if (m.spaces)
        word = clamp(
          1 + (target - m.width) / m.spaces,
          limits.word[0],
          limits.word[2],
        );
      const withWords = m.width + m.spaces * (word - 1);
      if (m.letters)
        letter = clamp((target - withWords) / m.letters, -0.02, 0.02);
      const adjusted = withWords + m.letters * letter;
      if (adjusted > 0) glyph = clamp(target / adjusted, 0.98, 1.02);
    }
    const computed =
        (m.width + m.spaces * (word - 1) + m.letters * letter) * glyph,
      width = !last && Math.abs(computed - target) < 1e-7 ? target : computed;
    return {
      word,
      letter,
      glyph,
      width,
      limited: !last && Math.abs(width - target) > 0.1,
      last,
    };
  }
  function wrapHyphenated(text, width, measure, hyphenate) {
    if (!text.length) return [{ raw: "", start: 0, end: 0 }];
    const candidates = [];
    for (const word of text.matchAll(/[^ \t]+[ \t]*|[ \t]+/gu)) {
      const bare = word[0].trimEnd();
      if (!/[@:/]/.test(bare))
        for (const letters of bare.matchAll(/\p{L}[\p{L}\p{M}]*/gu)) {
          if (graphemes(letters[0]).length < 6) continue;
          for (const point of hyphenate(letters[0]))
            candidates.push({
              end: word.index + letters.index + point,
              hyphen: true,
              wordStart: word.index + letters.index,
            });
        }
      candidates.push({ end: word.index + word[0].length, hyphen: false });
    }
    candidates.sort(
      (a, b) => a.end - b.end || Number(a.hyphen) - Number(b.hyphen),
    );
    const parts = [];
    let start = 0,
      index = 0,
      consecutive = 0;
    while (start < text.length) {
      let best = null,
        fallback = null,
        score = Infinity,
        reach = -Infinity;
      for (let i = index; i < candidates.length; i++) {
        const point = candidates[i];
        if (point.end <= start) continue;
        if (
          point.hyphen &&
          graphemes(text.slice(Math.max(start, point.wordStart), point.end))
            .length < 2
        )
          continue;
        const m = measure(
          text.slice(start, point.end).trimEnd(),
          start,
          point.hyphen,
        );
        if (
          point.end === text.length &&
          !point.hyphen &&
          m.width <= width + 0.0001
        ) {
          best = point;
          break;
        }
        if (bounds(m).min > width + 0.0001) {
          if (!point.hyphen) break;
          continue;
        }
        const fitted = fit(m, width),
          cost =
            ((fitted.word - 1) / 0.2) ** 2 +
            4 * (fitted.letter / 0.02) ** 2 +
            8 * ((fitted.glyph - 1) / 0.02) ** 2 +
            (point.hyphen ? 0.12 + consecutive * 0.2 : 0);
        if (!fitted.limited && cost < score) {
          best = point;
          score = cost;
        }
        if (fitted.width > reach) {
          fallback = point;
          reach = fitted.width;
        }
      }
      let chosen = best || fallback;
      if (!chosen) {
        let end = start;
        const stop =
          candidates.find((p) => p.end > start && !p.hyphen)?.end ||
          text.length;
        for (const piece of graphemes(text.slice(start, stop))) {
          const next = end + piece.length;
          if (
            end > start &&
            measure(text.slice(start, next).trimEnd(), start, false).width >
              width
          )
            break;
          end = next;
        }
        chosen = { end, hyphen: false };
      }
      parts.push({
        raw: text.slice(start, chosen.end),
        start,
        end: chosen.end,
        hyphen: chosen.hyphen,
      });
      consecutive = chosen.hyphen ? consecutive + 1 : 0;
      start = chosen.end;
      while (candidates[index]?.end <= start) index++;
    }
    return parts;
  }
  function wrap(text, width, measure, hyphenate) {
    if (hyphenate) return wrapHyphenated(text, width, measure, hyphenate);
    if (!text.length) return [{ raw: "", start: 0, end: 0 }];
    const ends = [...text.matchAll(/[^ \t]+[ \t]*|[ \t]+/gu)].map(
        (m) => m.index + m[0].length,
      ),
      parts = [];
    let start = 0,
      index = 0;
    while (start < text.length) {
      let fit = start;
      for (let i = index; i < ends.length; i++) {
        const end = ends[i],
          m = measure(text.slice(start, end).trimEnd(), start),
          min = end === text.length ? m.width : bounds(m).min;
        if (min > width + 0.0001) break;
        fit = end;
      }
      if (fit === start) {
        // Long unbreakable words split at grapheme boundaries without data loss.
        for (const piece of graphemes(text.slice(start, ends[index]))) {
          const end = fit + piece.length,
            m = measure(text.slice(start, end).trimEnd(), start);
          if (fit > start && m.width > width) break;
          fit = end;
        }
      }
      parts.push({ raw: text.slice(start, fit), start, end: fit });
      start = fit;
      while (ends[index] <= start) index++;
    }
    return parts;
  }
  const segmenter =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter("de", { granularity: "grapheme" })
      : null;
  function graphemes(text) {
    return segmenter
      ? Array.from(segmenter.segment(text), (s) => s.segment)
      : Array.from(text);
  }
  const api = { limits, bounds, fit, wrap, graphemes };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWJustify = api;
})(globalThis);
