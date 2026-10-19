"use strict";
const sponsorRasters = new Map();
let sponsorRasterBytes = 0;
function pruneSponsorRasters() {
  const ids = new Set(p.logos.map((l) => l.id));
  for (const [key, v] of sponsorRasters)
    if (!ids.has(v.id)) {
      sponsorRasters.delete(key);
      sponsorRasterBytes -= v.bytes;
    }
}
async function sponsorBitmap(asset, mode, colour = "#ffffff", solid = false) {
  const source = await image(asset.data);
  if (mode === "original") return source;
  const blend = MKWSponsors.composite(mode, colour),
    key = asset.id + ":" + mode + ":" + blend + ":" + solid,
    old = sponsorRasters.get(key);
  if (old && old.data === asset.data) {
    sponsorRasters.delete(key);
    sponsorRasters.set(key, old);
    return old.canvas;
  }
  if (old) {
    sponsorRasters.delete(key);
    sponsorRasterBytes -= old.bytes;
  }
  const c = makeCanvas(asset.width, asset.height),
    ctx = exportContext(c);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const pixels = ctx.getImageData(0, 0, c.width, c.height),
    d = pixels.data;
  if (!solid && ["gray", "multiply", "screen"].includes(mode)) {
    MKWSponsorPixels.tones(
      d,
      blend === "screen",
      asset.matte ||
        (asset.background === "light"
          ? [255, 255, 255]
          : asset.background === "dark"
            ? [0, 0, 0]
            : null),
      !asset.monochrome && (mode === "gray" || asset.gray === true),
    );
  } else
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (asset.background === "light") d[i + 3] *= 1 - lum / 255;
      else if (asset.background === "dark") d[i + 3] *= lum / 255;
      d[i] = d[i + 1] = d[i + 2] = blend === "screen" ? 255 : 0;
    }
  ctx.putImageData(pixels, 0, 0);
  const bytes = c.width * c.height * 4;
  while (sponsorRasterBytes + bytes > 32 * 1024 * 1024 && sponsorRasters.size) {
    const k = sponsorRasters.keys().next().value;
    sponsorRasterBytes -= sponsorRasters.get(k).bytes;
    sponsorRasters.delete(k);
  }
  if (bytes <= 32 * 1024 * 1024) {
    sponsorRasters.set(key, {
      id: asset.id,
      data: asset.data,
      canvas: c,
      bytes,
    });
    sponsorRasterBytes += bytes;
  }
  return c;
}
async function paintSponsors(ctx, b, opts = {}) {
  const r = MKWSponsors.layout(b);
  if (!r || (opts.only && opts.only !== "sponsors")) return;
  ctx.save();
  if (r.vertical) {
    ctx.translate(r.content.w, b.h);
    ctx.rotate(-Math.PI / 2);
  } else ctx.translate(0, r.content.h);
  ctx.beginPath();
  ctx.rect(0, 0, r.width, r.height);
  ctx.clip();
  ctx.fillStyle = r.colour;
  ctx.fillRect(0, 0, r.width, r.height);
  ctx.fillStyle =
    MKWSponsors.foreground(r.colour) === "white" ? "#ffffff" : "#000000";
  ctx.font = `${24 * r.unit}px ${fontFamily("Replica LL")}`;
  ctx.textBaseline = "top";
  for (const group of r.groups) {
    const label = ctx.measureText(group.name),
      labelWidth = Math.min(label.width, group.w),
      bearing =
        (label.actualBoundingBoxLeft || 0) *
        (label.width ? labelWidth / label.width : 1);
    // Align the first visible glyph, rather than its typographic side bearing.
    ctx.fillText(group.name, group.x + bearing, group.y, group.w);
    for (const logo of group.logos) {
      const asset = p.logos.find((a) => a.id === logo.id);
      if (!asset) continue;
      const mode = MKWSponsors.mode(logo, r.colour),
        bitmap = await sponsorBitmap(
          asset,
          mode,
          r.colour,
          logo.mode === "auto" &&
            !((logo.gray && !logo.monochrome) || logo.complex),
        );
      ctx.globalCompositeOperation = MKWSponsors.composite(mode, r.colour);
      ctx.drawImage(bitmap, logo.x, logo.y, logo.w, logo.h);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  ctx.restore();
}
