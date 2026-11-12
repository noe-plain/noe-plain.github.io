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
    const offset = MKWFamily.count((o.text || raw).slice(0, at));
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
  if (family || run.family) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = MKWFamily.outline;
    ctx.lineJoin = "round";
    ctx.strokeText(run.text, x, y);
  }
  ctx.fillText(run.text, x, y);
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
