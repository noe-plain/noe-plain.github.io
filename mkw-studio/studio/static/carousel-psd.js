"use strict";
function carouselPSDBounds(o) {
  const c = p.carousel,
    pad = carouselVisualPadding(o);
  const geometry = carouselObjectBounds(o);
  const effectPad = carouselEffectValue(o, "blur") * 3;
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
  const left = Math.max(0, Math.floor(leftEdge - pad - effectPad)),
    top = Math.max(0, Math.floor(geometry.y - pad - effectPad));
  return {
    left,
    top,
    w: Math.max(
      0,
      Math.min(
        MKWCarouselPolicy.extent(c).w,
        Math.ceil(right + pad + effectPad),
      ) - left,
    ),
    h: Math.max(
      0,
      Math.min(
        MKWCarouselPolicy.extent(c).h,
        Math.ceil(bottom + pad + effectPad),
      ) - top,
    ),
  };
}
async function carouselPSDLayer(o, project = p) {
  const bounds = carouselPSDBounds(o);
  if (!bounds.w || !bounds.h) return null;
  const canvas = makeCanvas(bounds.w, bounds.h),
    ctx = exportContext(canvas);
  ctx.translate(-bounds.left, -bounds.top);
  await carouselPaint(
    ctx,
    null,
    1,
    true,
    null,
    [
      {
        ...o,
        folderId: undefined,
        visible: true,
        opacity: 1,
        blend: "source-over",
      },
    ],
    () => true,
    image,
    project,
  );
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
  const project = { ...p, carousel: clone(p.carousel) },
    c = project.carousel,
    sources = MKWPSD.sources(),
    width = MKWCarouselPolicy.extent(c).w,
    height = MKWCarouselPolicy.extent(c).h;
  if (width > 30000 || height > 30000 || width * height > 80000000)
    throw Error(
      "Dieses Design ist für PSD zu gross (max. 30 000 px je Seite / 80 Mio. Gesamtpixel). Bitte kleinere oder weniger Zeichenflächen verwenden; freie Flächen kannst du auch näher zusammenrücken.",
    );
  await document.fonts.ready;
  carouselKeepLogosOnTop(c);
  const composite = makeCanvas(width, height);
  await carouselPaint(
    exportContext(composite),
    null,
    1,
    false,
    null,
    null,
    () => true,
    image,
    project,
  );
  const background = makeCanvas(
      MKWCarouselPolicy.isFree(c) ? 1 : width,
      MKWCarouselPolicy.isFree(c) ? 1 : height,
    ),
    bg = background.getContext("2d");
  bg.fillStyle = c.bg;
  bg.fillRect(0, 0, width, height);
  const children = [
      MKWPSD.fill(
        { name: "Hintergrund", canvas: background, left: 0, top: 0 },
        c.bg,
      ),
    ],
    bounds = { left: 0, top: 0, right: width, bottom: height };
  if (MKWCarouselPolicy.isFree(c)) {
    children.length = 0;
    background.width = background.height = 1;
    for (const a of c.artboards) {
      const bitmap = makeCanvas(a.w, a.h),
        context = exportContext(bitmap);
      context.fillStyle = a.bg;
      context.fillRect(0, 0, a.w, a.h);
      children.push(
        MKWPSD.fill(
          {
            name: a.name + " · Hintergrund",
            canvas: bitmap,
            left: a.x,
            top: a.y,
          },
          a.bg,
          MKWPSD.rectangle(a.x, a.y, a.w, a.h),
        ),
      );
    }
  }
  const backgroundCount = children.length;
  const folders = new Map(),
    entries = new Map();
  const append = (o, entry) => {
    const folder = c.folders?.find((f) => f.id === o.folderId);
    if (!folder) {
      children.push(entry);
      entries.set("layer:" + o.id, entry);
      return;
    }
    let group = folders.get(folder.id);
    if (!group) {
      group = {
        name: folder.name,
        blendMode: "pass through",
        opened: !folder.collapsed,
        hidden: folder.visible === false,
        ...(folder.locked
          ? {
              protected: {
                composite: true,
                position: true,
                transparency: true,
              },
            }
          : {}),
        children: [],
      };
      folders.set(folder.id, group);
      children.push(group);
      entries.set("folder:" + folder.id, group);
    }
    if (entry) group.children.push(entry);
  };
  for (const [index, o] of c.objects.entries()) {
    progress(`Ebene ${index + 1} / ${c.objects.length} vorbereiten …`);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (o.type === "text") {
      const layout = carouselTextLayout(o),
        layer = await carouselPSDLayer(o, project);
      if (!layer) continue;
      const editable = {
        ...layer,
        ...MKWPSD.blend(o),
        opacity: (o.opacity ?? 1) * (o.textAlpha ?? 1),
        text: MKWPSD.text(o, layout),
      };
      if (MKWPSD.needsTextReference(o, layout))
        append(o, MKWPSD.reference(o.name, layer, editable));
      else append(o, editable);
    } else if (
      ["image", "angle"].includes(o.type) &&
      project.images.some((im) => im.id === o.imageId)
    ) {
      const source = project.images.find((im) => im.id === o.imageId),
        bounds = carouselPSDBounds(o);
      if (!bounds.w || !bounds.h) continue;
      const canvas = makeCanvas(bounds.w, bounds.h),
        ctx = exportContext(canvas);
      ctx.translate(-bounds.left, -bounds.top);
      ctx.translate(o.x, o.y);
      if (o.angle) ctx.rotate((o.angle * Math.PI) / 180);
      ctx.clip(
        o.type === "angle" ? carouselAngleMask(o) : carouselImageMask(o),
      );
      await carouselPaintPhoto(ctx, o, image, 0, project);
      const layer = MKWPSD.placed(
        {
          name: o.name,
          left: bounds.left,
          top: bounds.top,
          canvas,
          ...MKWPSD.blend(o),
        },
        sources,
        source,
        MKWPSD.designerTransform(o, source),
        MKWPSD.imageMask(o),
      );
      if (o.effects)
        layer.placedLayer.filter = MKWPSD.filters(
          o,
          Math.max(o.w / source.width, o.h / source.height) * o.scale,
        );
      if (carouselHasEffects(o)) {
        const appearance = await carouselPSDLayer(o, project);
        append(o, MKWPSD.reference(o.name, appearance, layer));
      } else if (o.type === "angle") {
        const glow = makeCanvas(bounds.w, bounds.h),
          g = exportContext(glow);
        g.translate(-bounds.left, -bounds.top);
        g.translate(o.x, o.y);
        if (o.angle) g.rotate((o.angle * Math.PI) / 180);
        g.fillStyle = "#ffffff";
        g.shadowColor = studioPaintRGBA(o.glowColor, o.glowAlpha);
        g.shadowBlur = o.glow;
        g.fill(carouselAngleMask(o));
        append(o, {
          name: o.name,
          opened: false,
          ...MKWPSD.blend(o),
          children: [
            {
              name: "Schein · Darstellung (gerastert)",
              left: bounds.left,
              top: bounds.top,
              canvas: glow,
            },
            {
              ...layer,
              name: "Bildinhalt",
              opacity: 1,
              hidden: false,
              blendMode: "normal",
              protected: undefined,
            },
          ],
        });
      } else append(o, layer);
    } else if (o.type === "logo") {
      const layer = await carouselPSDLayer(o, project);
      if (layer) {
        const source = await MKWPSD.bitmapSource(
          await carouselLogoImage(o, project),
          "logo:" + o.source,
          o.name || "Logo",
          Math.max(
            o.w,
            ...c.objects
              .filter(
                (item) => item.type === "logo" && item.source === o.source,
              )
              .map((item) => item.w),
          ),
        );
        const transform = [
          [0, 0],
          [o.w, 0],
          [o.w, o.h],
          [0, o.h],
        ].flatMap(([x, y]) => {
          const q = carouselToWorld(o, { x, y });
          return [q.x, q.y];
        });
        MKWPSD.placed(layer, sources, source, transform);
        Object.assign(layer, MKWPSD.blend(o));
        append(o, layer);
      }
    } else {
      const layer = await carouselPSDLayer(o, project);
      if (layer) {
        Object.assign(layer, MKWPSD.blend(o));
        const value = studioPaintRead(o, "fill");
        if (["linear", "radial"].includes(value.kind)) {
          const native = {
            ...layer,
            vectorFill: MKWPSD.gradient(value),
            vectorMask: carouselIsVector(o)
              ? carouselPSDVectorMask(o)
              : MKWPSD.imageMask(o),
          };
          append(o, MKWPSD.reference(o.name, layer, native));
        } else if (
          value.kind === "image" &&
          value.enabled &&
          (!carouselIsVector(o) || !studioPaintRead(o, "stroke").enabled)
        ) {
          const source = project.images.find((im) => im.id === value.imageId);
          if (source) {
            const native = { ...layer };
            delete native.vectorFill;
            delete native.vectorStroke;
            MKWPSD.placed(
              native,
              sources,
              source,
              MKWPSD.designerTransform({ ...o, ...value }, source),
              carouselIsVector(o)
                ? carouselPSDVectorMask(o)
                : MKWPSD.imageMask(o),
            );
            append(
              o,
              carouselHasEffects(o)
                ? MKWPSD.reference(o.name, layer, native)
                : native,
            );
          } else append(o, layer);
        } else append(o, layer);
      }
    }
  }

  for (const folder of c.folders || [])
    if (!folders.has(folder.id)) append({ folderId: folder.id }, null);
  const ordered = carouselLayerBlocks(c)
    .reverse()
    .map((block) => entries.get(block.key))
    .filter(Boolean);
  children.splice(
    backgroundCount,
    children.length - backgroundCount,
    ...ordered,
  );

  const slices = Array.from({ length: c.n }, (_, i) => ({
    id: i + 1,
    groupId: 1,
    origin: "userGenerated",
    associatedLayerId: 0,
    name: MKW.projectName(p.meta) + "_" + String(i + 1).padStart(2, "0"),
    type: "image",
    bounds: (() => {
      const a = MKWCarouselPolicy.frame(c, i);
      return { left: a.x, top: a.y, right: a.x + a.w, bottom: a.y + a.h };
    })(),
    url: "",
    target: "",
    message: "",
    altTag: MKWCarouselPolicy.frame(c, i).name || `Slide ${i + 1}`,
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
        children: MKWCarouselPolicy.isFree(c)
          ? [
              {
                name: "Zeichenflächen",
                blendMode: "pass through",
                opened: true,
                vectorMask: {
                  paths: c.artboards.flatMap(
                    (a) => MKWPSD.rectangle(a.x, a.y, a.w, a.h).paths,
                  ),
                },
                children,
              },
            ]
          : children,
        linkedFiles: sources.files,
        imageResources: {
          slices: [{ bounds, groupName: p.meta.title || "Designer", slices }],
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
