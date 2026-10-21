"use strict";
// One bounded raster per effect-bearing object. Moving/rotating reuses the pixels.
const carouselEffectCache = new Map();
let carouselEffectBytes = 0;
const carouselEffectValue = (o, key) =>
  o.effects?.[key + "Enabled"] === false ? 0 : o.effects?.[key] || 0;
const carouselHasEffects = (o) =>
  carouselEffectValue(o, "blur") > 0 || carouselEffectValue(o, "noise") > 0;
function carouselVisualPadding(o) {
  if (carouselIsVector(o)) return carouselVectorPadding(o);
  if (o.type === "angle") return Math.ceil(o.glow * 3) + 3;
  if (o.type === "text")
    return (
      Math.ceil(
        Math.max(o.size, ...(o.textStyles || []).map((s) => s?.size || 0)) *
          0.4,
      ) + 4
    );
  return 4;
}
function carouselForgetEffect(key) {
  const value = carouselEffectCache.get(key);
  if (value) carouselEffectBytes -= value.bytes;
  carouselEffectCache.delete(key);
}
function pruneCarouselEffects() {
  for (const [key, value] of carouselEffectCache)
    if (value.project !== p || !p.carousel?.objects.includes(key))
      carouselForgetEffect(key);
}
async function carouselPaintEffect(ctx, o, scale, loadImage, project = p) {
  const local = carouselLocalBounds(o),
    framed = ["image", "angle"].includes(o.type),
    pad =
      Math.ceil(carouselEffectValue(o, "blur") * 3) +
      (framed ? 4 : carouselVisualPadding(o)),
    rasterScale =
      loadImage === previewImage ? Math.min(1, Math.max(0.1, scale)) : 1,
    shape = {
      ...o,
      x: 0,
      y: 0,
      angle: 0,
      opacity: 1,
      blend: "source-over",
      visible: true,
      folderId: undefined,
      effects: undefined,
    },
    key = JSON.stringify([shape, o.effects, rasterScale]),
    sources = [
      project.images.find((im) => im.id === o.imageId)?.data,
      project.images.find((im) => im.id === o.strokeImageId)?.data,
      o.type === "logo"
        ? project.logos.find((logo) => logo.id === o.source)?.data
        : null,
    ],
    old = carouselEffectCache.get(o);
  let entry = old;
  if (
    !old ||
    old.key !== key ||
    old.project !== project ||
    old.fonts !== fontStatus ||
    old.fontReady !== !!fontStatus[o.font] ||
    old.loader !== loadImage ||
    sources.some((src, i) => src !== old.sources[i])
  ) {
    const w = Math.ceil((local.w + pad * 2) * rasterScale),
      h = Math.ceil((local.h + pad * 2) * rasterScale);
    if (w * h > 40000000 || w > 16000 || h > 16000)
      throw Error("Effektfläche zu gross. Bitte Element verkleinern.");
    const raw = makeCanvas(w, h),
      buffer = makeCanvas(w, h),
      out = exportContext(buffer),
      draw = exportContext(raw);
    try {
      draw.translate(
        (pad - local.x) * rasterScale,
        (pad - local.y) * rasterScale,
      );
      if (framed) {
        draw.scale(rasterScale, rasterScale);
        await carouselPaintPhoto(
          draw,
          shape,
          loadImage,
          Math.ceil(carouselEffectValue(o, "blur") * 3) + 2,
          project,
        );
      } else
        await carouselPaint(
          draw,
          null,
          rasterScale,
          true,
          null,
          [shape],
          () => true,
          loadImage,
          project,
        );
      if (carouselEffectValue(o, "blur"))
        out.filter = `blur(${carouselEffectValue(o, "blur") * rasterScale}px)`;
      out.drawImage(raw, 0, 0);
      out.filter = "none";
      if (carouselEffectValue(o, "noise")) {
        const pixels = out.getImageData(0, 0, w, h),
          data = pixels.data;
        let seed = 2166136261;
        for (const char of o.id)
          seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
        const amount = (carouselEffectValue(o, "noise") / 100) * 127;
        for (let i = 0; i < data.length; i += 4) {
          if (!data[i + 3]) continue;
          seed ^= seed << 13;
          seed ^= seed >>> 17;
          seed ^= seed << 5;
          const delta = (((seed >>> 0) / 4294967295) * 2 - 1) * amount;
          data[i] += delta;
          data[i + 1] += delta;
          data[i + 2] += delta;
        }
        out.putImageData(pixels, 0, 0);
      }
      entry = {
        key,
        project,
        fonts: fontStatus,
        fontReady: !!fontStatus[o.font],
        loader: loadImage,
        sources,
        canvas: buffer,
        bytes: w * h * 4,
      };
      carouselForgetEffect(o);
      while (
        carouselEffectBytes + entry.bytes > 64 * 1024 * 1024 &&
        carouselEffectCache.size
      )
        carouselForgetEffect(carouselEffectCache.keys().next().value);
      if (entry.bytes <= 64 * 1024 * 1024 && project === p) {
        carouselEffectCache.set(o, entry);
        carouselEffectBytes += entry.bytes;
      }
    } catch (error) {
      buffer.width = buffer.height = 1;
      throw error;
    } finally {
      raw.width = raw.height = 1;
    }
  } else {
    carouselEffectCache.delete(o);
    carouselEffectCache.set(o, entry);
  }
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 1;
  ctx.globalCompositeOperation = o.blend || "source-over";
  ctx.translate(o.x, o.y);
  if (o.angle) ctx.rotate((o.angle * Math.PI) / 180);
  if (framed) {
    carouselClipPhoto(ctx, o, scale);
    const bounds = carouselImageBounds(o, project);
    ctx.beginPath();
    ctx.rect(bounds.x - o.x, bounds.y - o.y, bounds.w, bounds.h);
    ctx.clip();
  }
  ctx.drawImage(
    entry.canvas,
    local.x - pad,
    local.y - pad,
    entry.canvas.width / rasterScale,
    entry.canvas.height / rasterScale,
  );
  ctx.restore();
}
