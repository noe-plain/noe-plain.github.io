"use strict";
const MKWTemplatePreview = (() => {
  const cache = new Map(),
    placeholders = new Map();
  let queue = Promise.resolve();
  function placeholderAsset(colour) {
    if (placeholders.has(colour)) return placeholders.get(colour);
    const c = makeCanvas(1, 1),
      ctx = c.getContext("2d");
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    const data = c.toDataURL();
    const asset = {
      id: "template-preview-" + colour.slice(1),
      name: "Bildplatzhalter",
      data,
      original: data,
      width: 1,
      height: 1,
    };
    if (placeholders.size >= 1000)
      placeholders.delete(placeholders.keys().next().value);
    placeholders.set(colour, asset);
    return asset;
  }
  async function paint(
    template,
    fields = {},
    slide = 0,
    isCurrent = () => true,
  ) {
    const values = Object.create(null);
    for (const o of template.carousel.objects) {
      const value = Object.hasOwn(fields, o.id) ? fields[o.id] : {};
      values[o.id] = { ...value };
    }
    for (const slot of MKWTemplateModel.imageSlots(template))
      values[slot.objectId][slot.channel] ||= placeholderAsset(slot.colour);
    const result = MKWTemplateModel.instantiate(template, { values }),
      q = MKWTemplates.documentFor(result),
      c = q.carousel;
    for (const o of c.objects)
      if (o.imageId?.startsWith("template-preview-"))
        Object.assign(o, { scale: 1, panX: 0, panY: 0, imageAngle: 0 });
    const frame = MKWCarouselPolicy.frame(c, slide),
      scale = Math.min(420 / frame.w, 520 / frame.h),
      canvas = makeCanvas(
        Math.ceil(frame.w * scale),
        Math.ceil(frame.h * scale),
      );
    try {
      const objects = c.objects.filter((o) => {
        const b = carouselObjectBounds(o),
          pad = carouselVisualPadding(o);
        return (
          b.x - pad < frame.x + frame.w &&
          b.x + b.w + pad > frame.x &&
          b.y - pad < frame.y + frame.h &&
          b.y + b.h + pad > frame.y
        );
      });
      await carouselPaint(
        exportContext(canvas),
        slide,
        scale,
        false,
        null,
        objects,
        isCurrent,
        previewImage,
        q,
      );
      return isCurrent() ? canvas.toDataURL("image/png") : null;
    } finally {
      canvas.width = canvas.height = 1;
    }
  }
  function render(template) {
    const key = JSON.stringify(template);
    if (cache.has(key)) return cache.get(key);
    const task = queue.catch(() => {}).then(() => paint(template));
    queue = task;
    cache.set(key, task);
    task.catch(() => cache.delete(key));
    while (cache.size > 24) cache.delete(cache.keys().next().value);
    return task;
  }
  const hitContext = makeCanvas(1, 1).getContext("2d");
  function imageAt(template, point) {
    const c = template.carousel;
    for (const o of [...c.objects].reverse()) {
      if (!MKWTemplateModel.visible(o, c) || o.opacity === 0) continue;
      const clip = MKWCarouselPolicy.contentFrame(c, o);
      if (
        clip &&
        (point.x < clip.x ||
          point.x > clip.x + clip.w ||
          point.y < clip.y ||
          point.y > clip.y + clip.h)
      )
        continue;
      const local = carouselToLocal(o, point);
      let path;
      if (o.type === "angle") path = carouselAngleMask(o);
      else if (carouselIsVector(o)) path = carouselVectorPath(o);
      else if (["image", "gradient"].includes(o.type))
        path = carouselImageMask(o);
      else continue;
      if (
        o.strokeMode === "image" &&
        o.strokeEnabled !== false &&
        o.strokeWidth > 0
      ) {
        carouselVectorStroke(hitContext, o);
        if (hitContext.isPointInStroke(path, local.x, local.y))
          return { objectId: o.id, channel: "stroke" };
      }
      if (!hitContext.isPointInPath(path, local.x, local.y)) continue;
      if (
        MKWTemplateModel.imageLayer(o) &&
        (!carouselIsVector(o) ||
          (o.fillEnabled !== false && (o.type === "shape" || o.closed)))
      )
        return { objectId: o.id, channel: "image" };
      if (o.type === "angle" && !MKWAnglePolicy.solid(o)) {
        const source = template.slots.find(
          (s) => s.objectId === o.id,
        )?.sourceId;
        if (source) return { objectId: source, channel: "image" };
      }
    }
    return null;
  }
  return { render, paint, imageAt };
})();
