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
function carouselCharacterScript(o, index) {
  return MKWText.at(o, index).script || o.script || "normal";
}
function carouselTypeRuns(o, raw, start, size, ctx) {
  const runs = [],
    previousSpacing = ctx.letterSpacing;
  let x = 0;
  for (const style of MKWText.segments(
    { ...o, text: o.text || raw },
    start,
    start + raw.length,
  )) {
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
function carouselPaintTextRun(ctx, run, x, y, color) {
  ctx.font = `${run.size}px ${fontFamily(run.font)}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = run.letterSpacing + "px";
  if (color || run.color) ctx.fillStyle = color || run.color;
  ctx.fillText(run.text, x, y);
  if (run.underline)
    ctx.fillRect(
      x,
      y + carouselTypeBaseline(ctx, run.font, run.size) + run.size * 0.08,
      run.width,
      Math.max(1, run.size / 18),
    );
  if (run.strike)
    ctx.fillRect(
      x,
      y + carouselTypeBaseline(ctx, run.font, run.size) - run.size * 0.3,
      run.width,
      Math.max(1, run.size / 18),
    );
}
function carouselCharacterStylesForInput(o, value) {
  return MKWText.forInput(o, value, MKWTypography.pending(o));
}
function carouselTypeRange(o, start, end) {
  carouselUI.typeRange = { id: o.id, start, end };
  MKWTypography.track(o, start, end);
}
function carouselTypePanel(o) {
  return `<section class="carousel-property-section type-character"><h4>Zeichen</h4><div class="type-format-buttons" role="group" aria-label="Zeichenformatierung"><button id="carouselUppercase" aria-pressed="${!!o.uppercase}" title="Gesamten Text in Grossbuchstaben anzeigen"><span class="type-symbol">AA</span><span>Grossbuchstaben</span></button><button id="carouselSuperscript" aria-pressed="${o.script === "superscript"}" title="Markierte Zeichen hochstellen · ohne Markierung: gesamtes Textfeld"><span class="type-symbol">x²</span><span>Hochgestellt</span></button></div></section>`;
}
function carouselBindTypography(o, panel) {
  carouselSyncTypeControls(o);
  const upper = $("#carouselUppercase"),
    superButton = $("#carouselSuperscript");
  if (!upper) return;
  for (const button of [upper, superButton])
    button.disabled = carouselObjectLocked(o);
  upper.onclick = () => {
    if (carouselObjectLocked(o)) return;
    checkpoint();
    o.uppercase = !o.uppercase;
    changed(false);
    carouselPanel();
  };
  superButton.onclick = () => {
    if (carouselObjectLocked(o)) return;
    checkpoint();
    const stored = carouselUI.typeRange,
      range = stored
        ? {
            ...stored,
            start: Math.min(o.text.length, stored.start),
            end: Math.min(o.text.length, stored.end),
          }
        : null;
    if (range?.id === o.id && range.end > range.start) {
      const script =
        carouselCharacterScript(o, range.start) === "superscript"
          ? "normal"
          : "superscript";
      o.characterStyles = MKWText.patch(o, range.start, range.end, { script });
    } else {
      o.script = o.script === "superscript" ? "normal" : "superscript";
      o.characterStyles = MKWText.patch(o, 0, o.text.length, { script: null });
    }
    changed(false);
    carouselPanel();
  };
  const field = panel.querySelector("[data-prop=text]");
  if (field)
    field.addEventListener("select", () => {
      carouselTypeRange(o, field.selectionStart, field.selectionEnd);
      carouselSyncTypeControls(o);
    });
}

function carouselSyncTypeControls(o) {
  const range = carouselUI.typeRange,
    selected = range?.id === o.id && range.end > range.start,
    button = $("#carouselSuperscript");
  if (button)
    button.setAttribute(
      "aria-pressed",
      String(
        selected
          ? carouselCharacterScript(o, range.start) === "superscript"
          : o.script === "superscript",
      ),
    );
}
function carouselTypographyNavigation(panel) {
  const nav = document.createElement("nav");
  nav.className = "type-inspector-nav";
  nav.setAttribute("aria-label", "Typografie schnell erreichen");
  nav.innerHTML =
    '<button data-type-section=".type-font">Zeichen</button><button data-type-section="#carouselTextStyles">Absatz</button>';
  panel.querySelector(".type-content")?.after(nav);
  nav.querySelectorAll("button").forEach(
    (button) =>
      (button.onclick = () => {
        const target = panel.querySelector(button.dataset.typeSection);
        target?.scrollIntoView({
          block: "start",
          behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
        });
        nav
          .querySelectorAll("button")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      }),
  );
}
