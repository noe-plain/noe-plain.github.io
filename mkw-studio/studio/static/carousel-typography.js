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
  return (
    o.characterStyles?.find((s) => index >= s.start && index < s.end)?.script ||
    o.script ||
    "normal"
  );
}
function carouselTypeRuns(o, raw, start, size, ctx) {
  const runs = [];
  let x = 0;
  if (!raw) return { runs, width: 0 };
  if (!o.characterStyles?.length)
    runs.push({ raw, start, script: o.script || "normal" });
  else {
    const boundaries = [
      ...new Set([
        start,
        start + raw.length,
        ...o.characterStyles
          .flatMap((style) => [style.start, style.end])
          .filter((index) => index > start && index < start + raw.length),
      ]),
    ].sort((a, b) => a - b);
    for (let i = 0; i < boundaries.length - 1; i++) {
      const offset = boundaries[i],
        script = carouselCharacterScript(o, offset),
        previous = runs.at(-1),
        part = raw.slice(offset - start, boundaries[i + 1] - start);
      if (previous?.script === script) previous.raw += part;
      else runs.push({ raw: part, start: offset, script });
    }
  }
  for (const run of runs) {
    run.text = o.uppercase ? run.raw.toLocaleUpperCase("de-CH") : run.raw;
    run.size = size * (run.script === "superscript" ? 0.65 : 1);
    run.rise = run.script === "superscript" ? size * 0.3 : 0;
    run.dy = run.rise
      ? carouselTypeBaseline(ctx, o.font, size) -
        carouselTypeBaseline(ctx, o.font, run.size) -
        run.rise
      : 0;
    run.x = x;
    ctx.font = `${run.size}px "${o.font}"`;
    run.width = ctx.measureText(run.text).width;
    x += run.width;
  }
  return { runs, width: x };
}
function carouselCharacterStylesForInput(o, value) {
  const before = o.text;
  if (before === value) return o.characterStyles;
  let a = 0,
    b = 0;
  while (a < before.length && a < value.length && before[a] === value[a]) a++;
  while (
    b < before.length - a &&
    b < value.length - a &&
    before[before.length - 1 - b] === value[value.length - 1 - b]
  )
    b++;
  const end = before.length - b,
    insert = value.length - a - b,
    delta = insert - (end - a),
    out = [];
  for (const s of o.characterStyles || []) {
    if (s.end <= a) out.push({ ...s });
    else if (s.start >= end)
      out.push({ ...s, start: s.start + delta, end: s.end + delta });
    else {
      if (s.start < a) out.push({ ...s, end: a });
      if (s.end > end)
        out.push({ ...s, start: a + insert, end: s.end + delta });
    }
  }
  const script = carouselCharacterScript(o, Math.max(0, a - 1));
  if (insert && script !== "normal")
    out.push({ start: a, end: a + insert, script });
  return out.sort((x, y) => x.start - y.start);
}
function carouselTypeRange(o, start, end) {
  carouselUI.typeRange = { id: o.id, start, end };
}
function carouselTypePanel(o) {
  return `<section class="carousel-property-section type-character"><h4>Zeichen</h4><div class="type-format-buttons" role="group" aria-label="Zeichenformatierung"><button id="carouselUppercase" aria-pressed="${!!o.uppercase}" title="Gesamten Text in Grossbuchstaben anzeigen"><span class="type-symbol">AA</span><span>Grossbuchstaben</span></button><button id="carouselSuperscript" aria-pressed="${o.script === "superscript"}" title="Markierte Zeichen hochstellen · ohne Markierung: gesamtes Textfeld"><span class="type-symbol">x²</span><span>Hochgestellt</span></button></div><p class="type-hint">Hochstellen gilt für die markierten Zeichen, sonst für das ganze Textfeld. Der eingegebene Text bleibt erhalten.</p></section>`;
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
            : "superscript",
        out = [];
      for (const s of o.characterStyles || []) {
        if (s.end <= range.start || s.start >= range.end) out.push(s);
        else {
          if (s.start < range.start) out.push({ ...s, end: range.start });
          if (s.end > range.end) out.push({ ...s, start: range.end });
        }
      }
      out.push({ start: range.start, end: range.end, script });
      o.characterStyles = out.sort((a, b) => a.start - b.start);
    } else {
      o.script = o.script === "superscript" ? "normal" : "superscript";
      delete o.characterStyles;
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
