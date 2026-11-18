/* One local image transform for canvas, crop bounds, migration and PSD. */
(function (root) {
  "use strict";
  const rotate = (p, degrees) => {
    const a = (degrees * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
  };
  function geometry(o, source) {
    const fit = Math.max(o.w / source.width, o.h / source.height);
    return {
      x: o.w / 2 + (o.panX || 0),
      y: o.h / 2 + (o.panY || 0),
      scale: fit * (o.scale ?? 1),
      angle: o.imageAngle || 0,
      flipX: o.flipX || 1,
      flipY: o.flipY || 1,
      width: source.width * fit * (o.scale ?? 1),
      height: source.height * fit * (o.scale ?? 1),
    };
  }
  function corners(o, source) {
    const t = geometry(o, source);
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, y]) => {
      const p = rotate(
        { x: (x * t.width * t.flipX) / 2, y: (y * t.height * t.flipY) / 2 },
        t.angle,
      );
      return { x: t.x + p.x, y: t.y + p.y };
    });
  }
  function contains(o, source, point, tolerance = 0.01) {
    const t = geometry(o, source),
      p = rotate({ x: point.x - t.x, y: point.y - t.y }, -t.angle);
    return (
      Math.abs(p.x) <= t.width / 2 + tolerance &&
      Math.abs(p.y) <= t.height / 2 + tolerance
    );
  }
  function coverScale(o, source) {
    const points = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, y]) =>
      rotate({ x: (x * o.w) / 2, y: (y * o.h) / 2 }, -(o.imageAngle || 0)),
    );
    const required = Math.max(
      ...points.map((p) =>
        Math.max(
          (Math.abs(p.x) * 2) / source.width,
          (Math.abs(p.y) * 2) / source.height,
        ),
      ),
    );
    return required / Math.max(o.w / source.width, o.h / source.height);
  }
  function fromLegacy(frame, source, t) {
    return {
      scale:
        t.scale / Math.max(frame.w / source.width, frame.h / source.height),
      panX: t.x - frame.x - frame.w / 2,
      panY: t.y - frame.y - frame.h / 2,
      flipX: t.flipX,
      flipY: t.flipY,
      imageAngle: t.angle || 0,
    };
  }
  function validate(o) {
    if (
      o.imageAngle !== undefined &&
      (!["image", "angle"].includes(o.type) ||
        !Number.isFinite(o.imageAngle) ||
        Math.abs(o.imageAngle) > 360)
    )
      throw Error("Ungültige Bilddrehung.");
  }
  const api = Object.freeze({
    geometry,
    corners,
    contains,
    coverScale,
    fromLegacy,
    validate,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPhotoTransform = api;
})(globalThis);
