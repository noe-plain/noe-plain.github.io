"use strict";
// Screen-only rasters. Exports always use image() and the untouched originals.
const imagePreviewCache = new Map(),
  imagePreviewMaxEdge = 2048,
  imagePreviewBudget = 128 * 1024 * 1024;
let imagePreviewBytes = 0;
function forgetImagePreview(src) {
  const entry = imagePreviewCache.get(src);
  if (!entry) return;
  imagePreviewBytes -= entry.bytes;
  imagePreviewCache.delete(src);
  // Do not reset a canvas still held by an in-flight paint. GC releases it once
  // the last paint reference is gone, rather than blanking a pending frame.
}
async function previewImage(src) {
  const asset = p.images.find((im) => im.data === src);
  if (!asset || Math.max(asset.width, asset.height) <= imagePreviewMaxEdge)
    return image(src);
  if (imagePreviewCache.has(src)) {
    const entry = imagePreviewCache.get(src);
    imagePreviewCache.delete(src);
    imagePreviewCache.set(src, entry);
    return entry.promise;
  }
  const entry = { bytes: 0, promise: null };
  entry.promise = (async () => {
    const original = await image(src),
      scale = Math.min(
        1,
        imagePreviewMaxEdge / Math.max(original.width, original.height),
      ),
      canvas = makeCanvas(original.width * scale, original.height * scale);
    canvas
      .getContext("2d", { colorSpace: "srgb" })
      .drawImage(original, 0, 0, canvas.width, canvas.height);
    if (imagePreviewCache.get(src) === entry) {
      entry.bytes = canvas.width * canvas.height * 4;
      imagePreviewBytes += entry.bytes;
      while (
        (imagePreviewBytes > imagePreviewBudget ||
          imagePreviewCache.size > 64) &&
        imagePreviewCache.size > 1
      )
        forgetImagePreview(imagePreviewCache.keys().next().value);
    }
    return canvas;
  })().catch((error) => {
    if (imagePreviewCache.get(src) === entry) forgetImagePreview(src);
    throw error;
  });
  imagePreviewCache.set(src, entry);
  return entry.promise;
}
function pruneImagePreviews(used) {
  for (const src of imagePreviewCache.keys())
    if (!used.has(src)) forgetImagePreview(src);
}
