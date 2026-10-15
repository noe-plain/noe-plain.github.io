"use strict";
function carouselPSDBounds(o) {
  const c = p.carousel,
    pad = carouselIsVector(o)
      ? carouselVectorPadding(o)
      : o.type === "angle"
        ? Math.ceil(o.glow * 3) + 3
        : o.type === "text"
          ? Math.ceil(o.size * 0.4) + 4
          : 2;
  const geometry = carouselObjectBounds(o);
  let leftEdge = geometry.x,
    right = geometry.x + geometry.w,
    bottom = geometry.y + geometry.h;
  if (o.type === "text") {
    const ctx = makeCanvas(1, 1).getContext("2d"),
      layout = carouselTextLayout(o, ctx);
    for (const line of layout.lines) {
      ctx.font = `${line.size}px "${o.font}"`;
      leftEdge = Math.min(leftEdge, o.x + line.x);
      right = Math.max(
        right,
        o.x + line.x + ctx.measureText(line.text).width + line.size * 0.2,
      );
    }
    bottom = Math.max(
      bottom,
      o.y + carouselTextOffset(o, layout) + layout.height,
    );
  }
  const left = Math.max(0, Math.floor(leftEdge - pad)),
    top = Math.max(0, Math.floor(geometry.y - pad));
  return {
    left,
    top,
    w: Math.max(0, Math.min(c.w * c.n, Math.ceil(right + pad)) - left),
    h: Math.max(0, Math.min(c.h, Math.ceil(bottom + pad)) - top),
  };
}
async function carouselPSDLayer(o) {
  const bounds = carouselPSDBounds(o);
  if (!bounds.w || !bounds.h) return null;
  const canvas = makeCanvas(bounds.w, bounds.h),
    ctx = exportContext(canvas);
  ctx.translate(-bounds.left, -bounds.top);
  await carouselPaint(ctx, null, 1, true, null, [
    { ...o, visible: true, opacity: 1, blend: "source-over" },
  ]);
  return carouselPSDVectorData(o, {
    name: o.name,
    left: bounds.left,
    top: bounds.top,
    canvas,
    hidden: o.visible === false,
    opacity: o.opacity ?? 1,
    blendMode:
      { "source-over": "normal", multiply: "multiply", screen: "screen" }[
        o.blend
      ] || "normal",
  });
}
async function buildCarouselPSD(progress = () => {}) {
  const c = p.carousel,
    width = c.w * c.n,
    height = c.h;
  if (width > 30000 || height > 30000 || width * height > 80000000)
    throw Error(
      "Dieses Carousel ist für PSD zu gross (max. 30 000 px je Seite / 80 Mio. Gesamtpixel). Bitte kleinere Slides oder weniger Slides verwenden.",
    );
  await document.fonts.ready;
  carouselKeepLogosOnTop(c);
  const composite = makeCanvas(width, height);
  await carouselPaint(exportContext(composite));
  const background = makeCanvas(width, height),
    bg = background.getContext("2d");
  bg.fillStyle = c.bg;
  bg.fillRect(0, 0, width, height);
  const children = [
      { name: "Hintergrund", canvas: background, left: 0, top: 0 },
    ],
    bounds = { left: 0, top: 0, right: width, bottom: height };
  for (const [index, o] of c.objects.entries()) {
    progress(`Ebene ${index + 1} / ${c.objects.length} vorbereiten …`);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (o.type === "text") {
      const layout = carouselTextLayout(o),
        offset = carouselTextOffset(o, layout),
        lines = [];
      for (const line of layout.lines) {
        if (!line.text) continue;
        const record = {
          ...o,
          textAlpha: 1,
          text: line.text,
          textStyles: undefined,
          textAlign: "left",
          x: o.x + line.x,
          size: line.size,
          textAnchor: "top",
          y: o.y + line.y + offset,
          h: line.size * 1.12,
          opacity: 1,
          blend: "source-over",
          visible: true,
        };
        const layer = await carouselPSDLayer(record);
        if (!layer) continue;
        layer.name = line.text;
        layer.text = textLayerData(
          {
            text: line.text,
            x: o.x + carouselTextAlign(o, line.paragraph).factor * o.w,
            y: record.y,
            size: line.size,
            role: o.font,
            color: o.color,
            align: line.align,
            angle: 0,
          },
          0,
          0,
        );
        layer.text.style.leading = line.leading;
        lines.push(layer);
      }
      children.push({
        name: o.name,
        opened: true,
        hidden: o.visible === false,
        opacity: (o.opacity ?? 1) * (o.textAlpha ?? 1),
        blendMode:
          { "source-over": "normal", multiply: "multiply", screen: "screen" }[
            o.blend
          ] || "normal",
        children: lines,
      });
    } else {
      const layer = await carouselPSDLayer(o);
      if (layer) children.push(layer);
    }
  }
  const slices = Array.from({ length: c.n }, (_, i) => ({
    id: i + 1,
    groupId: 1,
    origin: "userGenerated",
    associatedLayerId: 0,
    name: MKW.projectName(p.meta) + "_" + String(i + 1).padStart(2, "0"),
    type: "image",
    bounds: { left: i * c.w, top: 0, right: (i + 1) * c.w, bottom: height },
    url: "",
    target: "",
    message: "",
    altTag: `Slide ${i + 1}`,
    cellTextIsHTML: false,
    cellText: "",
    horizontalAlignment: "default",
    verticalAlignment: "default",
    backgroundColorType: "none",
    backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
  }));
  progress("PSD mit Ebenen und Slide-Slices schreiben …");
  await new Promise((resolve) => setTimeout(resolve, 0));
  return withPSDProfile(
    agPsd.writePsd(
      {
        width,
        height,
        canvas: composite,
        children,
        imageResources: {
          slices: [{ bounds, groupName: p.meta.title || "Carousel", slices }],
          versionInfo: {
            hasRealMergedData: true,
            writerName: "MKW Studio",
            readerName: "Adobe Photoshop",
            fileVersion: 1,
          },
          resolutionInfo: {
            horizontalResolution: 72,
            verticalResolution: 72,
            horizontalResolutionUnit: "PPI",
            verticalResolutionUnit: "PPI",
            widthUnit: "Inches",
            heightUnit: "Inches",
          },
        },
      },
      { generateThumbnail: true, trimImageData: true },
    ),
  );
}
