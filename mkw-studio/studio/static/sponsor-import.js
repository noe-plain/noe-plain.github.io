"use strict";
// One-time, bounded logo normalization and optical analysis.
async function sponsorImport(file) {
  if (file.size > 15 * 1024 * 1024)
    throw Error("Logo maximal 15 MB. Bitte PNG, SVG, JPG oder WebP verwenden.");
  if (!/\.(svg|png|jpe?g|webp)$/i.test(file.name))
    throw Error("Bitte PNG, SVG, JPG oder WebP verwenden.");
  let data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  if (/\.svg$/i.test(file.name)) {
    const xml = new DOMParser().parseFromString(
      await file.text(),
      "image/svg+xml",
    );
    if (
      xml.querySelector("parsererror,script,foreignObject,image,use") ||
      [...xml.querySelectorAll("*")].some((el) =>
        [...el.attributes].some(
          (a) =>
            /^on/i.test(a.name) ||
            /url\(\s*['"]?(?:https?:|\/\/)/i.test(a.value),
        ),
      )
    )
      throw Error(
        "SVG bitte ohne externe Inhalte, Skripte oder verknüpfte Bilder speichern.",
      );
    const svg = xml.documentElement,
      box = (svg.getAttribute("viewBox") || "")
        .trim()
        .split(/[ ,]+/)
        .map(Number),
      sw = box[2] > 0 ? box[2] : parseFloat(svg.getAttribute("width")) || 300,
      sh = box[3] > 0 ? box[3] : parseFloat(svg.getAttribute("height")) || 150,
      size = Math.min(1, 2048 / Math.max(sw, sh));
    svg.setAttribute("width", String(Math.max(1, Math.round(sw * size))));
    svg.setAttribute("height", String(Math.max(1, Math.round(sh * size))));
    data =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(xml));
  }
  const bitmap = await image(data),
    factor = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height)),
    canvas = makeCanvas(
      Math.max(1, Math.round(bitmap.width * factor)),
      Math.max(1, Math.round(bitmap.height * factor)),
    ),
    ctx = exportContext(canvas);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
    d = pixels.data,
    w = canvas.width,
    h = canvas.height;
  // Locate the visible rectangle before testing its corners: a transparent
  // outer margin must not prevent removal of a uniform white/black matte.
  let ax0 = w,
    ay0 = h,
    ax1 = -1,
    ay1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 8) {
        ax0 = Math.min(ax0, x);
        ay0 = Math.min(ay0, y);
        ax1 = Math.max(ax1, x);
        ay1 = Math.max(ay1, y);
      }
  if (ax1 < ax0) throw Error("Im Logo ist kein sichtbarer Inhalt vorhanden.");
  const corner = [
      ay0 * w + ax0,
      ay0 * w + ax1,
      ay1 * w + ax0,
      ay1 * w + ax1,
    ].map((i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]]),
    light = corner.every((c) => c[3] > 250 && Math.min(...c.slice(0, 3)) > 240),
    dark = corner.every((c) => c[3] > 250 && Math.max(...c.slice(0, 3)) < 15),
    background = light ? "light" : dark ? "dark" : null;
  // Remove only background connected to an edge; enclosed artwork stays intact.
  if (background) {
    const seen = new Uint8Array(w * h),
      queue = new Int32Array(w * h);
    let head = 0,
      tail = 0;
    const add = (i) => {
      if (seen[i]) return;
      seen[i] = 1;
      const k = i * 4,
        match =
          d[k + 3] < 8 ||
          (light
            ? Math.min(d[k], d[k + 1], d[k + 2]) > 235
            : Math.max(d[k], d[k + 1], d[k + 2]) < 20);
      if (match) {
        d[k + 3] = 0;
        queue[tail++] = i;
      }
    };
    for (let x = 0; x < w; x++) {
      add(x);
      add((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      add(y * w);
      add(y * w + w - 1);
    }
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = Math.floor(i / w);
      if (x) add(i - 1);
      if (x < w - 1) add(i + 1);
      if (y) add(i - w);
      if (y < h - 1) add(i + w);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1,
    ix0 = w,
    iy0 = h,
    ix1 = -1,
    iy1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
        const k = (y * w + x) * 4,
          lum = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2],
          mass =
            (d[k + 3] / 255) *
            (background === "light"
              ? 1 - lum / 255
              : background === "dark"
                ? lum / 255
                : 1);
        if (mass > 0.04) {
          ix0 = Math.min(ix0, x);
          iy0 = Math.min(iy0, y);
          ix1 = Math.max(ix1, x);
          iy1 = Math.max(iy1, y);
        }
      }
  if (x1 < x0) throw Error("Im Logo ist kein sichtbarer Inhalt vorhanden.");
  const cropped = makeCanvas(x1 - x0 + 1, y1 - y0 + 1),
    out = exportContext(cropped);
  out.drawImage(
    canvas,
    x0,
    y0,
    cropped.width,
    cropped.height,
    0,
    0,
    cropped.width,
    cropped.height,
  );
  canvas.width = canvas.height = 1;
  const sample = makeCanvas(
      192,
      Math.max(1, Math.round((cropped.height / cropped.width) * 192)),
    ),
    sc = exportContext(sample);
  if (sample.height > 192) {
    sample.width = Math.max(
      1,
      Math.round((cropped.width / cropped.height) * 192),
    );
    sample.height = 192;
  }
  sc.drawImage(cropped, 0, 0, sample.width, sample.height);
  const sd = sc.getImageData(0, 0, sample.width, sample.height).data,
    bins = new Map();
  let ink = 0,
    darkInk = 0,
    lightInk = 0,
    cx = 0,
    cy = 0,
    colour = 0,
    visible = 0;
  for (let i = 0; i < sd.length; i += 4) {
    const a = sd[i + 3] / 255;
    if (a < 0.1) continue;
    const lum =
        (0.2126 * sd[i] + 0.7152 * sd[i + 1] + 0.0722 * sd[i + 2]) / 255,
      mass =
        a *
        (background === "light" ? 1 - lum : background === "dark" ? lum : 1);
    ink += mass;
    darkInk += a * (1 - lum);
    lightInk += a * lum;
    cx += ((i / 4) % sample.width) * mass;
    cy += Math.floor(i / 4 / sample.width) * mass;
    visible++;
    if (
      Math.max(sd[i], sd[i + 1], sd[i + 2]) -
        Math.min(sd[i], sd[i + 1], sd[i + 2]) >
      20
    )
      colour++;
    const key = [sd[i] >> 4, sd[i + 1] >> 4, sd[i + 2] >> 4].join();
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  const meta = {
    width: cropped.width,
    height: cropped.height,
    ink:
      ix1 >= ix0
        ? {
            x: (ix0 - x0) / cropped.width,
            y: (iy0 - y0) / cropped.height,
            w: (ix1 - ix0 + 1) / cropped.width,
            h: (iy1 - iy0 + 1) / cropped.height,
          }
        : { x: 0, y: 0, w: 1, h: 1 },
    darkDensity: Math.min(1, darkInk / (sample.width * sample.height)),
    lightDensity: Math.min(1, lightInk / (sample.width * sample.height)),
    density: Math.max(0.01, ink / (sample.width * sample.height)),
    cx: ink ? cx / ink / sample.width : 0.5,
    cy: ink ? cy / ink / sample.height : 0.5,
    gray: colour / Math.max(1, visible) < 0.015,
    complex:
      [...bins.values()].filter((n) => n > Math.max(5, visible * 0.01)).length >
        10 ||
      (bins.size > 24 &&
        [...bins.values()]
          .sort((a, b) => b - a)
          .slice(0, 8)
          .reduce((a, b) => a + b, 0) /
          Math.max(1, visible) <
          0.88),
    background,
  };
  const logo = {
    id: uid(),
    name: file.name.slice(0, 200),
    data: cropped.toDataURL("image/png"),
    thumb: sample.toDataURL("image/png"),
    purpose: "sponsor",
    ...meta,
  };
  cropped.width = cropped.height = sample.width = sample.height = 1;
  return logo;
}
