"use strict";
const studioPaintClamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
const studioPaintRGBA = (hex, alpha = 1) =>
  hex +
  Math.round(studioPaintClamp(alpha) * 255)
    .toString(16)
    .padStart(2, "0");
function studioPaintStops(stops, start, end, alpha = 1, endAlpha = 1) {
  return stops?.length
    ? clone(stops)
    : [
        { at: 0, colour: start, alpha, mid: 0.5 },
        { at: 1, colour: end, alpha: endAlpha, mid: 0.5 },
      ];
}
function studioPaintRead(o, channel = "fill") {
  if (carouselIsVector(o) || o === carouselVectorColours) {
    const mode = o[channel + "Mode"] || "solid";
    return {
      kind: mode,
      colour: o[channel] || "#315bcc",
      alpha: o[channel + "Alpha"] ?? 1,
      enabled:
        channel === "fill"
          ? o.fillEnabled !== false
          : o.strokeEnabled !== false && o.strokeWidth !== 0,
      stops: studioPaintStops(
        o[channel + "Stops"],
        o[channel] || "#315bcc",
        o[channel + "End"] || "#ffffff",
        o[channel + "Alpha"] ?? 1,
        o[channel + "EndAlpha"] ?? 1,
      ),
      angle: o[channel + "Angle"] ?? 90,
      imageId: channel === "fill" ? o.imageId : o.strokeImageId,
      scale: channel === "fill" ? o.scale || 1 : o.strokeImageScale || 1,
      panX: channel === "fill" ? o.panX || 0 : o.strokeImageX || 0,
      panY: channel === "fill" ? o.panY || 0 : o.strokeImageY || 0,
      flipX: (channel === "fill" ? o.flipX : o.strokeFlipX) || 1,
      flipY: (channel === "fill" ? o.flipY : o.strokeFlipY) || 1,
    };
  }
  if (o.type === "gradient")
    return {
      kind: o.gradientFillMode || o.kind || "linear",
      colour: o.color,
      alpha: o.startAlpha ?? 1,
      enabled: true,
      stops: studioPaintStops(
        o.gradientStops,
        o.color,
        o.endColor,
        o.startAlpha ?? 1,
        o.endAlpha ?? 0,
      ),
      angle: o.rotation || 0,
      imageId: o.imageId,
      scale: o.scale || 1,
      panX: o.panX || 0,
      panY: o.panY || 0,
      flipX: o.flipX || 1,
      flipY: o.flipY || 1,
    };
  return {
    kind: "solid",
    colour: o.color || "#ffffff",
    alpha: o.textAlpha ?? 1,
    enabled: true,
    stops: [],
    angle: 90,
  };
}
function studioPaintWrite(o, channel, value) {
  if (carouselIsVector(o) || o === carouselVectorColours) {
    o[channel] = value.colour;
    o[channel + "Alpha"] = value.alpha;
    o[channel + "Mode"] = value.kind;
    o[channel + "Enabled"] = value.enabled;
    o[channel + "Stops"] = clone(value.stops);
    o[channel + "Angle"] = value.angle;
    if (value.stops?.length) {
      o[channel + "End"] = value.stops.at(-1).colour;
      o[channel + "EndAlpha"] = value.stops.at(-1).alpha;
    }
    if (value.imageId) {
      if (channel === "fill") {
        o.imageId = value.imageId;
        o.scale = value.scale || 1;
        o.panX = value.panX || 0;
        o.panY = value.panY || 0;
        o.flipX = value.flipX || 1;
        o.flipY = value.flipY || 1;
      } else {
        o.strokeImageId = value.imageId;
        o.strokeImageScale = value.scale || 1;
        o.strokeImageX = value.panX || 0;
        o.strokeImageY = value.panY || 0;
        o.strokeFlipX = value.flipX || 1;
        o.strokeFlipY = value.flipY || 1;
      }
    }
  } else if (o.type === "gradient") {
    o.gradientFillMode = ["linear", "radial"].includes(value.kind)
      ? undefined
      : value.kind;
    if (["linear", "radial"].includes(value.kind)) o.kind = value.kind;
    o.color = value.colour;
    o.startAlpha = value.alpha;
    o.gradientStops = clone(value.stops);
    o.rotation = value.angle;
    if (value.stops?.length) {
      o.endColor = value.stops.at(-1).colour;
      o.endAlpha = value.stops.at(-1).alpha;
    }
    if (value.imageId) o.imageId = value.imageId;
  } else {
    o.color = value.colour;
    o.textAlpha = value.alpha;
  }
}
function studioSampleStops(stops, at) {
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  if (at <= sorted[0].at) return { ...sorted[0] };
  if (at >= sorted.at(-1).at) return { ...sorted.at(-1) };
  const i = sorted.findIndex(
      (s, n) => n < sorted.length - 1 && at <= sorted[n + 1].at,
    ),
    a = sorted[i],
    b = sorted[i + 1],
    t = (at - a.at) / (b.at - a.at || 1),
    mid = a.mid ?? 0.5,
    u = Math.pow(t, Math.log(0.5) / Math.log(mid)),
    alpha = a.alpha + (b.alpha - a.alpha) * u;
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ca = rgb(a.colour),
    cb = rgb(b.colour),
    colour =
      "#" +
      ca
        .map((v, i) =>
          Math.round(
            alpha > 0
              ? (v * a.alpha * (1 - u) + cb[i] * b.alpha * u) / alpha
              : 0,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
  return { at, colour, alpha, mid: 0.5 };
}
function studioGradientSamples(stops) {
  const sorted = [...stops].sort((a, b) => a.at - b.at),
    samples = [];
  sorted.forEach((s, i) => {
    samples.push(s);
    if (i < sorted.length - 1 && Math.abs((s.mid ?? 0.5) - 0.5) > 0.0001)
      for (let n = 1; n < 48; n++)
        samples.push(
          studioSampleStops(
            [s, sorted[i + 1]],
            s.at + ((sorted[i + 1].at - s.at) * n) / 48,
          ),
        );
  });
  return samples;
}
function studioPaintCSS(value) {
  if (!value.enabled)
    return "linear-gradient(135deg,transparent 45%,#ec4652 46%,#ec4652 53%,transparent 54%)";
  if (value.kind === "image") {
    const im = p.images.find((im) => im.id === value.imageId);
    return im
      ? `url("${im.data}") center / cover`
      : "linear-gradient(135deg,#a9b6c9,#e4e9f1)";
  }
  if (["linear", "radial"].includes(value.kind))
    return `linear-gradient(90deg,${studioGradientSamples(value.stops)
      .map((s) => `${studioPaintRGBA(s.colour, s.alpha)} ${s.at * 100}%`)
      .join(",")})`;
  return studioPaintRGBA(value.colour, value.alpha);
}
function studioPaintSwatch(value) {
  const preview = {
    ...value,
    alpha: 1,
    stops: value.stops?.map((s) => ({ ...s, alpha: 1 })),
  };
  return studioPaintCSS(preview);
}

async function studioCanvasPaint(ctx, o, channel, loadImage = image) {
  const value = studioPaintRead(o, channel);
  if (value.kind === "solid") return studioPaintRGBA(value.colour, value.alpha);
  if (value.kind === "image") {
    const im = p.images.find((im) => im.id === value.imageId);
    if (!im) return "transparent";
    const bitmap = await loadImage(im.data),
      pattern = ctx.createPattern(bitmap, "no-repeat");
    const fit = Math.max(o.w / im.width, o.h / im.height) * value.scale,
      matrix = new DOMMatrix()
        .translate(o.w / 2 + value.panX, o.h / 2 + value.panY)
        .scale(
          (value.flipX * fit * im.width) / bitmap.width,
          (value.flipY * fit * im.height) / bitmap.height,
        )
        .translate(-bitmap.width / 2, -bitmap.height / 2);
    pattern.setTransform(matrix);
    return pattern;
  }
  let start, end;
  if (o.type === "gradient") ({ start, end } = carouselGradientPoints(o));
  else {
    const a = (value.angle * Math.PI) / 180,
      dx = (Math.cos(a) * o.w) / 2,
      dy = (Math.sin(a) * o.h) / 2;
    start =
      value.kind === "radial"
        ? { x: o.w / 2, y: o.h / 2 }
        : { x: o.w / 2 - dx, y: o.h / 2 - dy };
    end = { x: o.w / 2 + dx, y: o.h / 2 + dy };
  }
  const g =
    value.kind === "radial"
      ? ctx.createRadialGradient(
          start.x,
          start.y,
          0,
          start.x,
          start.y,
          Math.max(1, Math.hypot(end.x - start.x, end.y - start.y)),
        )
      : ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  for (const stop of studioGradientSamples(value.stops))
    g.addColorStop(stop.at, studioPaintRGBA(stop.colour, stop.alpha));
  return g;
}
function studioValidatePaint(o) {
  const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  for (const channel of ["fill", "stroke"]) {
    if (
      o[channel + "End"] !== undefined &&
      !/^#[0-9a-f]{6}$/i.test(o[channel + "End"])
    )
      throw Error("Ungültige Verlaufsfarbe.");
    for (const suffix of ["Alpha", "EndAlpha"])
      if (
        o[channel + suffix] !== undefined &&
        !finite(o[channel + suffix], 0, 1)
      )
        throw Error("Ungültige Farbtransparenz.");
    if (
      o[channel + "Enabled"] !== undefined &&
      typeof o[channel + "Enabled"] !== "boolean"
    )
      throw Error("Ungültige Farbsichtbarkeit.");
    if (
      o[channel + "Mode"] !== undefined &&
      !["solid", "linear", "radial", "image"].includes(o[channel + "Mode"])
    )
      throw Error("Ungültige Farbfüllung.");
    if (
      o[channel + "Angle"] !== undefined &&
      !finite(o[channel + "Angle"], -360, 360)
    )
      throw Error("Ungültiger Verlaufswinkel.");
  }
  for (const key of ["fillStops", "strokeStops", "gradientStops"])
    if (o[key] !== undefined) {
      const stops = o[key];
      if (
        !Array.isArray(stops) ||
        stops.length < 2 ||
        stops.length > 16 ||
        stops.some(
          (s, i) =>
            !s ||
            !/^#[0-9a-f]{6}$/i.test(s.colour) ||
            !finite(s.alpha, 0, 1) ||
            !finite(s.at, 0, 1) ||
            !finite(s.mid, 0.05, 0.95) ||
            (i > 0 && s.at <= stops[i - 1].at),
        )
      )
        throw Error("Ungültige Verlaufsfarbwerte.");
    }
  if (
    o.gradientFillMode !== undefined &&
    !["solid", "image"].includes(o.gradientFillMode)
  )
    throw Error("Ungültige Verlaufsfüllung.");
  for (const key of ["strokeImageScale", "strokeImageX", "strokeImageY"])
    if (
      o[key] !== undefined &&
      (!Number.isFinite(o[key]) ||
        Math.abs(o[key]) > 100000 ||
        (key === "strokeImageScale" && o[key] <= 0))
    )
      throw Error("Ungültiger Konturbildausschnitt.");
  if (o.textAlpha !== undefined && !finite(o.textAlpha, 0, 1))
    throw Error("Ungültige Texttransparenz.");
}
