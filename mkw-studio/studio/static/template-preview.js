"use strict";
const MKWTemplatePreview = (() => {
  const cache = new Map();
  let queue = Promise.resolve(),
    placeholder;
  function placeholderAsset() {
    if (placeholder) return placeholder;
    const c = makeCanvas(600, 600),
      ctx = c.getContext("2d");
    ctx.fillStyle = "#c6d3d3";
    ctx.fillRect(0, 0, 600, 600);
    ctx.fillStyle = "#94adad";
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.lineTo(220, 230);
    ctx.lineTo(400, 440);
    ctx.lineTo(510, 310);
    ctx.lineTo(600, 430);
    ctx.lineTo(600, 600);
    ctx.fill();
    ctx.fillStyle = "#e9eeee";
    ctx.beginPath();
    ctx.arc(420, 145, 55, 0, Math.PI * 2);
    ctx.fill();
    const data = c.toDataURL();
    c.width = c.height = 1;
    return (placeholder = {
      id: "template-preview",
      name: "Bildplatzhalter",
      data,
      original: data,
      width: 600,
      height: 600,
    });
  }
  async function paint(
    template,
    fields = {},
    slide = 0,
    isCurrent = () => true,
  ) {
    const asset = placeholderAsset(),
      values = Object.create(null);
    for (const o of template.carousel.objects) {
      const value = Object.hasOwn(fields, o.id) ? fields[o.id] : {};
      values[o.id] = {
        ...value,
        image: value.image || asset,
        stroke: value.stroke || asset,
      };
    }
    const result = MKWTemplateModel.instantiate(template, { values }),
      q = MKWTemplates.documentFor(result),
      c = q.carousel;
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
  return { render, paint };
})();
