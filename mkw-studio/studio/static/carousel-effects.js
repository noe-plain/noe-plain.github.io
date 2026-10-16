"use strict";
// One bounded raster per effect-bearing object. Moving/rotating reuses the pixels.
const carouselEffectCache = new Map();
let carouselEffectBytes = 0;
const carouselHasEffects = (o) =>
  !!((o.effects?.blur || 0) > 0 || (o.effects?.noise || 0) > 0);
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
async function carouselPaintEffect(ctx, o, scale, loadImage) {
  const project = p,
    local = carouselLocalBounds(o),
    pad = Math.ceil((o.effects.blur || 0) * 3) + 4,
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
    old = carouselEffectCache.get(o);
  let entry = old;
  if (
    !old ||
    old.key !== key ||
    old.project !== p ||
    old.fonts !== fontStatus
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
      await carouselPaint(
        draw,
        null,
        rasterScale,
        true,
        null,
        [shape],
        () => true,
        loadImage,
      );
      if (o.effects.blur)
        out.filter = `blur(${o.effects.blur * rasterScale}px)`;
      out.drawImage(raw, 0, 0);
      out.filter = "none";
      if (o.effects.noise) {
        const pixels = out.getImageData(0, 0, w, h),
          data = pixels.data;
        let seed = 2166136261;
        for (const char of o.id)
          seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
        const amount = (o.effects.noise / 100) * 127;
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
  ctx.drawImage(
    entry.canvas,
    local.x - pad,
    local.y - pad,
    entry.canvas.width / rasterScale,
    entry.canvas.height / rasterScale,
  );
  ctx.restore();
}
