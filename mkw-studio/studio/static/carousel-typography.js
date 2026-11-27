"use strict";
const carouselTypeBaselines = new WeakMap();
function carouselTypeBaseline(ctx, font, size) {
  let cache = carouselTypeBaselines.get(fontStatus);
  if (!cache) carouselTypeBaselines.set(fontStatus, (cache = new Map()));
  const key = JSON.stringify([font, size, !!fontStatus[font]]);
  if (cache.has(key)) return cache.get(key);
  const previous = ctx.textBaseline;
  ctx.font = `${size}px "${font}"`;
  ctx.textBaseline = "alphabetic";
  const ascent = ctx.measureText("Mg").actualBoundingBoxAscent;
  ctx.textBaseline = "top";
  const baseline = ascent - ctx.measureText("Mg").actualBoundingBoxAscent;
  ctx.textBaseline = previous;
  if (cache.size >= 512) cache.delete(cache.keys().next().value);
  cache.set(key, baseline);
  return baseline;
}
function carouselTypeRuns(o, raw, start, size, ctx) {
  const runs = [],
    previousSpacing = ctx.letterSpacing;
  let x = 0;
  const styles = MKWText.segments(
    { ...o, text: o.text || raw },
    start,
    start + raw.length,
  ).flatMap((style) => {
    if (
      !(style.family ?? o.family) ||
      o.key === "copyright" ||
      o.campaignRole === "copyright"
    )
      return [{ ...style, family: false }];
    let at = style.start;
    const offset =
      (o.familyOffset || 0) + MKWFamily.count((o.text || raw).slice(0, at));
    return MKWFamily.runs(
      (o.text || raw).slice(style.start, style.end),
      offset,
    ).map((g) => {
      const run = {
        ...style,
        start: at,
        end: at + g.text.length,
        color: g.color,
        family: true,
      };
      at = run.end;
      return run;
    });
  });
  for (const style of styles) {
    const run = {
        ...style,
        raw: raw.slice(style.start - start, style.end - start),
      },
      base = style.size ?? size;
    run.font = style.font || o.font;
    run.color = style.color || o.color;
    run.familyStrokeOnTop = !!o.familyStrokeOnTop;
    run.script = style.script || o.script || "normal";
    run.uppercase = style.uppercase ?? o.uppercase;
    run.text = run.uppercase ? run.raw.toLocaleUpperCase("de-CH") : run.raw;
    run.size = base * (run.script === "normal" ? 1 : 0.65);
    run.rise =
      (run.script === "superscript"
        ? base * 0.3
        : run.script === "subscript"
          ? -base * 0.2
          : 0) + (style.baselineShift ?? o.baselineShift ?? 0);
    run.dy =
      run.rise || run.size !== size || run.font !== o.font
        ? carouselTypeBaseline(ctx, o.font, size) -
          carouselTypeBaseline(ctx, run.font, run.size) -
          run.rise
        : 0;
    run.tracking = style.tracking ?? o.tracking ?? 0;
    run.letterSpacing = (run.tracking * run.size) / 1000;
    run.underline = style.underline ?? o.underline;
    run.strike = style.strike ?? o.strike;
    run.x = x;
    ctx.font = `${run.size}px ${fontFamily(run.font)}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = run.letterSpacing + "px";
    run.width = ctx.measureText(run.text).width;
    x += run.width;
    runs.push(run);
  }
  if (previousSpacing !== undefined) ctx.letterSpacing = previousSpacing;
  return { runs, width: x };
}
const carouselOpticalGlyphs = new WeakMap();
function carouselOpticalOverhang(run, side) {
  const characters = Array.from(run.text.trim()),
    character = side === "left" ? characters[0] : characters.at(-1);
  if (!character) return 0;
  let cache = carouselOpticalGlyphs.get(fontStatus);
  if (!cache) carouselOpticalGlyphs.set(fontStatus, (cache = new Map()));
  const key = JSON.stringify([run.font, character, side]);
  let fraction = cache.get(key);
  if (fraction === undefined) {
    const unit = 192,
      canvas = makeCanvas(unit * 3, unit * 3),
      context = canvas.getContext("2d", { willReadFrequently: true });
    try {
      context.font = `${unit}px ${fontFamily(run.font)}`;
      context.textBaseline = "alphabetic";
      const metrics = context.measureText(character),
        glyphWidth =
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      if (
        /^[.,:;!?\u2018\u2019\u201c\u201d\u00ab\u00bb"'\-–—]$/u.test(character)
      )
        fraction = Math.min(0.25, (glyphWidth / unit) * 0.45);
      else if (
        (side === "left"
          ? /^[CGOQSaceoqs0235689]$/u
          : /^[BCDGOPQSabcdeopqs0235689]$/u
        ).test(character)
      )
        fraction = 0.025;
      else if (/^[AVWXYavwxy]$/u.test(character)) fraction = 0.035;
      else {
        context.fillText(character, unit, unit * 2);
        const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data,
          top = Math.max(
            0,
            Math.floor(unit * 2 - metrics.actualBoundingBoxAscent),
          ),
          bottom = Math.min(
            canvas.height,
            Math.ceil(unit * 2 + metrics.actualBoundingBoxDescent),
          ),
          inset = Math.floor((bottom - top) * 0.12),
          edges = [];
        for (let y = top + inset; y < bottom - inset; y++) {
          const first = Math.max(
              0,
              Math.floor(unit - metrics.actualBoundingBoxLeft - 2),
            ),
            last = Math.min(
              canvas.width - 1,
              Math.ceil(unit + metrics.actualBoundingBoxRight + 2),
            );
          for (
            let x = side === "left" ? first : last;
            side === "left" ? x <= last : x >= first;
            x += side === "left" ? 1 : -1
          ) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 64) {
              edges.push(x - unit);
              break;
            }
          }
        }
        edges.sort((a, b) => a - b);
        const stem = edges[Math.floor(edges.length / 2)],
          delta =
            side === "left"
              ? stem + metrics.actualBoundingBoxLeft
              : metrics.actualBoundingBoxRight - stem - 1;
        fraction =
          Number.isFinite(delta) && delta > 1.25 && delta < unit * 0.16
            ? delta / unit
            : 0;
      }
    } finally {
      canvas.width = canvas.height = 1;
    }
    if (cache.size >= 256) cache.delete(cache.keys().next().value);
    cache.set(key, fraction);
  }
  return fraction * run.size * (run.glyphScale ?? 1);
}
// Visible glyph bounds, measured once with the cached text layout. Advances
// remain unchanged, preserving wrapping, selection and intentional indentation.
function carouselTextInk(runs, ctx, family = false) {
  let left = Infinity,
    right = -Infinity,
    indent = 0,
    found = false;
  ctx.save();
  ctx.textAlign = "left";
  for (const run of runs) {
    if (!run.text.trim()) continue;
    ctx.font = `${run.size}px ${fontFamily(run.font)}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = run.letterSpacing + "px";
    const m = ctx.measureText(run.text),
      scale = run.glyphScale ?? 1;
    if (!found) {
      indent =
        run.x + ctx.measureText(run.text.match(/^\s*/u)[0]).width * scale;
      found = true;
    }
    const outline = run.family || family ? 1 : 0;
    left = Math.min(
      left,
      run.x - (m.actualBoundingBoxLeft ?? 0) * scale - outline,
    );
    right = Math.max(
      right,
      run.x + (m.actualBoundingBoxRight ?? run.width) * scale + outline,
    );
  }
  ctx.restore();
  const visible = runs.filter((run) => run.text.trim());
  return found
    ? {
        left,
        right,
        indent,
        overhangLeft: carouselOpticalOverhang(visible[0], "left"),
        overhangRight: carouselOpticalOverhang(visible.at(-1), "right"),
      }
    : null;
}
function carouselPaintTextRun(ctx, run, x, y, color, family = false) {
  const horizontal = run.glyphScale ?? 1;
  if (horizontal !== 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(horizontal, 1);
    x = y = 0;
  }
  ctx.font = `${run.size}px ${fontFamily(run.font)}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = run.letterSpacing + "px";
  if (color || run.color) ctx.fillStyle = color || run.color;
  const outlined = family || run.family;
  if (outlined) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = MKWFamily.outline;
    ctx.lineJoin = "round";
    if (!run.familyStrokeOnTop) ctx.strokeText(run.text, x, y);
  }
  ctx.fillText(run.text, x, y);
  if (outlined && run.familyStrokeOnTop) ctx.strokeText(run.text, x, y);
  if (run.underline)
    ctx.fillRect(
      x,
      y + carouselTypeBaseline(ctx, run.font, run.size) + run.size * 0.08,
      run.width / horizontal,
      Math.max(1, run.size / 18),
    );
  if (run.strike)
    ctx.fillRect(
      x,
      y + carouselTypeBaseline(ctx, run.font, run.size) - run.size * 0.3,
      run.width / horizontal,
      Math.max(1, run.size / 18),
    );
  if (horizontal !== 1) ctx.restore();
}
function carouselCharacterStylesForInput(o, value) {
  return MKWText.forInput(o, value, MKWTypography.pending(o));
}
function carouselTypeRange(o, start, end) {
  carouselUI.typeRange = { id: o.id, start, end };
  MKWTypography.track(o, start, end);
}
function carouselJustifyRuns(o, raw, start, size, ctx, trailingHyphen = false) {
  const runs = [];
  let width = 0,
    spaces = 0,
    letters = 0;
  function append(run) {
    if (!run) return;
    const blank = /^[ \t]+$/.test(run.raw),
      spacing = ctx.letterSpacing;
    ctx.font = `${run.size}px ${fontFamily(run.font)}`;
    if (spacing !== undefined) ctx.letterSpacing = "0px";
    const spaceWidth = blank ? ctx.measureText(run.text).width : 0;
    if (spacing !== undefined) ctx.letterSpacing = spacing;
    run.naturalWidth = run.width;
    run.spaceWidth = spaceWidth;
    run.letterUnits = blank
      ? 0
      : MKWJustify.graphemes(run.text).length * run.size;
    width += run.width;
    spaces += spaceWidth;
    letters += run.letterUnits;
    runs.push(run);
  }
  for (const style of MKWText.segments(o, start, start + raw.length)) {
    const text = raw.slice(style.start - start, style.end - start);
    for (const match of text.matchAll(/[ \t]+|[^ \t]+/gu))
      append(
        carouselTypeRuns(o, match[0], style.start + match.index, size, ctx)
          .runs[0],
      );
  }
  if (trailingHyphen && raw.length) {
    const end = start + raw.length,
      run = carouselTypeRuns(o, "-", end - 1, size, ctx).runs[0];
    Object.assign(run, { raw: "", start: end, end, virtualHyphen: true });
    append(run);
  }
  return { runs, width, spaces, letters };
}
function carouselApplyJustification(measured, settings) {
  let x = 0;
  const runs = measured.runs.map((source) => {
    const extra = source.letterUnits * settings.letter,
      width =
        (source.naturalWidth +
          source.spaceWidth * (settings.word - 1) +
          extra) *
        settings.glyph,
      run = {
        ...source,
        x,
        width,
        glyphScale: settings.glyph,
        letterSpacing:
          source.letterSpacing +
          (source.letterUnits ? settings.letter * source.size : 0),
      };
    run.tracking = (run.letterSpacing / run.size) * 1000;
    x += width;
    return run;
  });
  return {
    runs,
    width: Math.abs(x - settings.width) < 1e-7 ? settings.width : x,
  };
}
