"use strict";
// Only wholly off-artwork objects appear on the pasteboard. Export painting is unchanged.
function carouselOutsideObjects(c = p.carousel) {
  return c.objects.filter((object) => {
    if (!carouselObjectVisible(object)) return false;
    const b = carouselObjectBounds(object);
    return b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= c.w * c.n || b.y >= c.h;
  });
}
function carouselPasteboardSpace(viewport, width, height) {
  const pasteboard = $("#carouselPasteboard"),
    artwork = $("#carouselArtwork"),
    old = pasteboard.space,
    x = Math.max(400, Math.round(viewport.clientWidth * 0.8)),
    y = Math.max(250, Math.round(viewport.clientHeight * 0.6));
  let space = { left: x, right: x, top: y, bottom: y };
  if (carouselUI.drag && old) space = old;
  else
    for (const object of carouselOutsideObjects()) {
      const b = carouselObjectBounds(object),
        z = carouselZoom,
        pad = 80;
      space.left = Math.max(space.left, -b.x * z + pad);
      space.top = Math.max(space.top, -b.y * z + pad);
      space.right = Math.max(space.right, (b.x + b.w) * z - width + pad);
      space.bottom = Math.max(space.bottom, (b.y + b.h) * z - height + pad);
    }
  pasteboard.style.width = width + space.left + space.right + "px";
  pasteboard.style.height = height + space.top + space.bottom + "px";
  artwork.style.left = space.left + "px";
  artwork.style.top = space.top + "px";
  if (old) {
    viewport.scrollLeft += space.left - old.left;
    viewport.scrollTop += space.top - old.top;
  }
  pasteboard.space = space;
}
let carouselOutsidePending = null,
  carouselOutsideFrame = 0,
  carouselOutsideRunning = false,
  carouselOutsideGeneration = 0,
  carouselOutsideBuffer = null;
function carouselScheduleOutside() {
  const viewport = $("#carouselViewport"),
    canvas = $("#carouselOutsideCanvas");
  if (!viewport || !canvas) return;
  canvas.style.left = viewport.scrollLeft + "px";
  canvas.style.top = viewport.scrollTop + "px";
  canvas.style.width = viewport.clientWidth + "px";
  canvas.style.height = viewport.clientHeight + "px";
  const ratio = Math.min(
      2,
      devicePixelRatio || 1,
      Math.sqrt(4000000 / (viewport.clientWidth * viewport.clientHeight)),
    ),
    width = Math.max(1, Math.round(viewport.clientWidth * ratio)),
    height = Math.max(1, Math.round(viewport.clientHeight * ratio)),
    origin = $("#carouselCanvas").getBoundingClientRect(),
    rect = canvas.getBoundingClientRect(),
    dx = origin.left - rect.left,
    dy = origin.top - rect.top,
    objects = carouselOutsideObjects().filter((object) => {
      const b = carouselObjectBounds(object),
        pad =
          carouselVisualPadding(object) +
          carouselEffectValue(object, "blur") * 3;
      return (
        dx + (b.x + b.w + pad) * carouselZoom >= 0 &&
        dy + (b.y + b.h + pad) * carouselZoom >= 0 &&
        dx + (b.x - pad) * carouselZoom <= viewport.clientWidth &&
        dy + (b.y - pad) * carouselZoom <= viewport.clientHeight
      );
    }),
    sources = [...p.images, ...p.logos].map((asset) => asset.data),
    key = JSON.stringify([
      objects,
      dx,
      dy,
      width,
      height,
      carouselZoom,
      carouselUI.editing?.composing ? carouselUI.editing.id : null,
      fontStatus,
    ]);
  if (
    canvas.paintKey === key &&
    canvas.paintProject === p &&
    sources.every((src, i) => src === canvas.paintSources?.[i]) &&
    sources.length === canvas.paintSources?.length
  ) {
    carouselOutsidePending = null;
    carouselOutsideGeneration++;
    return;
  }
  carouselOutsidePending = {
    canvas,
    width,
    height,
    ratio,
    dx,
    dy,
    objects,
    sources,
    key,
    zoom: carouselZoom,
    project: p,
    editingId: carouselUI.editing?.composing ? carouselUI.editing.id : null,
    generation: ++carouselOutsideGeneration,
  };
  if (!carouselOutsideRunning && !carouselOutsideFrame)
    carouselOutsideFrame = requestAnimationFrame(carouselPaintOutside);
}
async function carouselPaintOutside() {
  carouselOutsideFrame = 0;
  if (carouselOutsideRunning || !carouselOutsidePending) return;
  const job = carouselOutsidePending;
  carouselOutsidePending = null;
  carouselOutsideRunning = true;
  const current = () =>
    job.project === p &&
    job.canvas.isConnected &&
    job.generation === carouselOutsideGeneration;
  let buffer;
  try {
    if (!current()) return;
    if (!job.objects.length) {
      job.canvas.width = job.width;
      job.canvas.height = job.height;
      if (carouselOutsideBuffer)
        carouselOutsideBuffer.width = carouselOutsideBuffer.height = 1;
    } else {
      buffer = carouselOutsideBuffer ??= makeCanvas(1, 1);
      if (buffer.width !== job.width) buffer.width = job.width;
      if (buffer.height !== job.height) buffer.height = job.height;
      const ctx = buffer.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, buffer.width, buffer.height);
      ctx.scale(job.ratio, job.ratio);
      ctx.translate(job.dx, job.dy);
      await carouselPaint(
        ctx,
        null,
        job.zoom,
        true,
        job.editingId,
        job.objects,
        current,
        previewImage,
      );
      if (!current()) return;
      job.canvas.width = job.width;
      job.canvas.height = job.height;
      job.canvas.getContext("2d").drawImage(buffer, 0, 0);
    }
    job.canvas.paintKey = job.key;
    job.canvas.paintProject = job.project;
    job.canvas.paintSources = job.sources;
  } catch (error) {
    if (current()) status(error.message);
  } finally {
    carouselOutsideRunning = false;
    if (carouselOutsidePending && !carouselOutsideFrame)
      carouselOutsideFrame = requestAnimationFrame(carouselPaintOutside);
  }
}
