"use strict";
const MKWInlineText = (() => {
  const baselines = new WeakMap(),
    views = new WeakMap();
  function domBaseline(font) {
    let cache = baselines.get(fontStatus);
    if (!cache) baselines.set(fontStatus, (cache = new Map()));
    const family = fontFamily(font),
      key = JSON.stringify([family, !!fontStatus[font]]);
    if (cache.has(key)) return cache.get(key);
    const probe = document.createElement("span"),
      marker = document.createElement("i");
    Object.assign(probe.style, {
      position: "fixed",
      left: "0",
      top: "0",
      visibility: "hidden",
      pointerEvents: "none",
      display: "inline-block",
      whiteSpace: "pre",
      padding: "0",
      margin: "0",
      border: "0",
      font: `100px ${family}`,
      lineHeight: "100px",
      letterSpacing: "0",
      textTransform: "none",
    });
    marker.style.cssText =
      "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
    probe.append(document.createTextNode("Mg"), marker);
    document.body.append(probe);
    const result =
      (marker.getBoundingClientRect().top - probe.getBoundingClientRect().top) /
      100;
    probe.remove();
    if (cache.size >= 128) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  }
  function runs(o, runs, zoom) {
    return runs
      .map((run) => {
        const top =
          run.dy +
          carouselTypeBaseline(carouselMeasureContext, run.font, run.size) -
          domBaseline(run.font) * run.size;
        return `<span ${run.empty ? 'data-empty-run="true"' : ""} data-script="${run.script || "normal"}" ${run.virtualHyphen ? 'class="discretionary-hyphen" aria-hidden="true" contenteditable="false"' : ""} style="position:absolute;white-space:pre;left:${run.x * zoom}px;top:${top * zoom}px;font-family:${esc(fontFamily(run.font).replaceAll('"', "'"))};font-size:${run.size * zoom}px;line-height:1;letter-spacing:${run.letterSpacing * zoom}px;transform:scaleX(${run.glyphScale || 1});transform-origin:0 0;text-transform:${run.uppercase ? "uppercase" : "none"};color:${esc(run.color || o.color)};text-decoration:${[run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none"}">${run.empty ? '<br data-placeholder="true">' : esc(run.raw)}</span>`;
      })
      .join("");
  }
  function empty(o, line, zoom) {
    return runs(
      o,
      [
        {
          font: o.font,
          size: line.size,
          x: 0,
          dy: 0,
          letterSpacing: 0,
          empty: true,
        },
      ],
      zoom,
    );
  }
  function holdView(el) {
    const viewport = el?.closest("#workspace, #carouselViewport");
    if (!viewport || views.has(viewport)) return;
    const point = { x: viewport.scrollLeft, y: viewport.scrollTop };
    views.set(viewport, point);
    requestAnimationFrame(() => {
      views.delete(viewport);
      if (!viewport.isConnected || !el.isConnected) return;
      viewport.scrollLeft = point.x;
      viewport.scrollTop = point.y;
    });
  }
  function focus(el) {
    if (!el) return;
    holdView(el);
    el.focus({ preventScroll: true });
  }
  return { domBaseline, runs, empty, holdView, focus };
})();
