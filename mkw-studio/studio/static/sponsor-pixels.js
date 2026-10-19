/* One-time matte separation for opaque logo files. No editor or canvas globals. */
(function (root) {
  "use strict";
  const distance = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const pixelDistance = (data, k, c) =>
    Math.max(
      Math.abs(data[k] - c[0]),
      Math.abs(data[k + 1] - c[1]),
      Math.abs(data[k + 2] - c[2]),
    );
  function separate(data, width, height) {
    let x0 = width,
      y0 = height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] > 8) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 < x0) return null;
    const sides = [[], [], [], []];
    for (let n = 0; n < 64; n++) {
      const x = Math.round(x0 + ((x1 - x0) * n) / 63),
        y = Math.round(y0 + ((y1 - y0) * n) / 63);
      for (const [side, px, py] of [
        [0, x, y0],
        [1, x, y1],
        [2, x0, y],
        [3, x1, y],
      ]) {
        const k = (py * width + px) * 4;
        if (data[k + 3] >= 250)
          sides[side].push([data[k], data[k + 1], data[k + 2]]);
      }
    }
    // Transparent silhouettes are already isolated. Do not infer their ink as matte.
    if (sides.some((s) => s.length < 60)) return null;
    const edge = sides.flat(),
      colour = [0, 1, 2].map(
        (c) =>
          edge.map((p) => p[c]).sort((a, b) => a - b)[
            Math.floor(edge.length / 2)
          ],
      );
    if (
      sides.some(
        (s) =>
          s.filter((p) => distance(p, colour) <= 24).length / s.length < 0.8,
      ) ||
      edge.filter((p) => distance(p, colour) <= 24).length / edge.length < 0.9
    )
      return null;
    let foreground = 0,
      visible = 0;
    for (let k = 0; k < data.length; k += 4)
      if (data[k + 3] > 8) {
        visible++;
        if (pixelDistance(data, k, colour) > 30) foreground++;
      }
    // A solid swatch has no separate background; preserve it rather than erase it.
    if (foreground < 3 || foreground > visible * 0.97) return null;
    for (let k = 0; k < data.length; k += 4) {
      const delta = pixelDistance(data, k, colour),
        alpha = Math.max(0, Math.min(1, (delta - 8) / 20));
      if (alpha > 0 && alpha < 1)
        for (let c = 0; c < 3; c++)
          data[k + c] = Math.max(
            0,
            Math.min(255, (data[k + c] - colour[c] * (1 - alpha)) / alpha),
          );
      data[k + 3] *= alpha;
    }
    return colour;
  }
  // Stretch real ink tones to absolute black/white once per cached raster.
  // Alpha is retained: antialiasing and already-separated matte stay intact.
  function tones(data, lightInk, matte = null, preserveFlat = false) {
    const luminance = (k) =>
      0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
    let low = 255,
      high = 0,
      sum = 0,
      weight = 0;
    // Ignore translucent edge colour when finding the endpoints.
    for (let k = 0; k < data.length; k += 4)
      if (data[k + 3] >= 224) {
        const v = luminance(k);
        low = Math.min(low, v);
        high = Math.max(high, v);
        sum += v;
        weight++;
      }
    if (!weight)
      for (let k = 0; k < data.length; k += 4)
        if (data[k + 3] > 8) {
          const v = luminance(k),
            a = data[k + 3] / 255;
          low = Math.min(low, v);
          high = Math.max(high, v);
          sum += v * a;
          weight += a;
        }
    const range = high - low,
      sourceLight = matte
        ? 0.2126 * matte[0] + 0.7152 * matte[1] + 0.0722 * matte[2] <
          sum / Math.max(weight, 1)
        : false,
      invert = sourceLight !== lightInk;
    for (let k = 0; k < data.length; k += 4) {
      let v =
        range > 8
          ? Math.max(0, Math.min(255, ((luminance(k) - low) * 255) / range))
          : preserveFlat
            ? luminance(k)
            : lightInk
              ? 255
              : 0;
      if ((range > 8 || preserveFlat) && invert) v = 255 - v;
      data[k] = data[k + 1] = data[k + 2] = v;
    }
  }
  const api = { separate, tones };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWSponsorPixels = api;
})(globalThis);
