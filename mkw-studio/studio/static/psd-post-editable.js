"use strict";
const MKWPSDPost = (() => {
  async function angle(b, left, top, registry) {
    const source = asset(b),
      area = MKWSponsors.layout(b)?.content || b,
      geometry = MKWPostAngle.geometry(b, area),
      mask = MKWPSD.polygon(
        MKWPostAngle.visiblePoints(b, area).map((pt) => ({
          x: pt.x + left,
          y: pt.y + top,
        })),
      ),
      photo = makeCanvas(b.w, b.h),
      ctx = exportContext(photo),
      bitmap = await image(source.data),
      t = b.angle.image;
    ctx.save();
    ctx.translate(geometry.o.x, geometry.o.y);
    ctx.clip(carouselAngleMask(geometry.o));
    ctx.translate(-geometry.o.x, -geometry.o.y);
    ctx.translate(t.x, t.y);
    ctx.rotate((t.angle * Math.PI) / 180);
    ctx.scale(t.scale * t.flipX, t.scale * t.flipY);
    ctx.drawImage(bitmap, -source.width / 2, -source.height / 2);
    ctx.restore();
    const glow = makeCanvas(b.w, b.h),
      g = exportContext(glow);
    g.save();
    g.beginPath();
    g.rect(0, 0, area.w, area.h);
    g.clip();
    g.translate(geometry.o.x, geometry.o.y);
    g.fillStyle = "#ffffff";
    g.shadowColor = studioPaintRGBA(b.angle.glowColor, b.angle.glowAlpha);
    g.shadowBlur = b.angle.glow;
    g.fill(carouselAngleMask(geometry.o));
    g.restore();
    return {
      name: "Winkel",
      opened: false,
      children: [
        { name: "Schein · Darstellung (gerastert)", left, top, canvas: glow },
        MKWPSD.placed(
          { name: "Bildinhalt", left, top, canvas: photo },
          registry,
          source,
          MKWPSD.photoTransform(source, t, left, top),
          mask,
        ),
      ],
    };
  }
  function typography(e, source, left, top) {
    const factor = e.size / source.size,
      scaleStyle = (s) => {
        if (!s) return s;
        const out = { ...s };
        for (const key of [
          "size",
          "baselineShift",
          "spaceBefore",
          "spaceAfter",
        ])
          if (out[key] !== undefined) out[key] *= factor;
        if (out.leading)
          out.leading = out.leading.map((v) =>
            v === null ? null : v * factor,
          );
        return out;
      },
      o = {
        ...MKWTypography.record(source),
        size: e.size,
        x:
          e.x -
          (e.align === "right" ? e.w : e.align === "center" ? e.w / 2 : 0),
        y: e.y,
        w: e.w,
        h: e.h,
        angle: e.angle || 0,
        lineHeight: source.lineHeight ?? MKWLayout.lineHeight(e),
        textAnchor: "top",
        textStyles: source.textStyles?.map(scaleStyle),
        characterStyles: source.characterStyles?.map(scaleStyle),
      };
    return MKWPSD.text(o, e.styled || carouselTextLayout(o), left, top);
  }
  async function sponsors(b, left, top, registry) {
    const r = MKWSponsors.layout(b);
    if (!r) return null;
    const world = (x, y) =>
        r.vertical
          ? { x: left + r.content.w + y, y: top + b.h - x }
          : { x: left + x, y: top + r.content.h + y },
      corners = (x, y, w, h) =>
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ].map(([x, y]) => world(x, y)),
      mask = MKWPSD.polygon(corners(0, 0, r.width, r.height)),
      children = [];
    const bar = makeCanvas(
        r.vertical ? r.height : r.width,
        r.vertical ? r.width : r.height,
      ),
      g = exportContext(bar);
    g.fillStyle = r.colour;
    g.fillRect(0, 0, bar.width, bar.height);
    children.push(
      MKWPSD.fill(
        {
          name: "Balkenfarbe",
          left: left + r.content.w * (r.vertical ? 1 : 0),
          top: top + r.content.h * (r.vertical ? 0 : 1),
          canvas: bar,
        },
        r.colour,
        mask,
      ),
    );
    for (const group of r.groups) {
      const entries = [],
        label = makeCanvas(Math.max(1, group.w), 40 * r.unit),
        ctx = exportContext(label),
        size = 24 * r.unit;
      ctx.font = `${size}px ${fontFamily("Replica LL")}`;
      ctx.textBaseline = "top";
      ctx.fillStyle =
        MKWSponsors.foreground(r.colour) === "white" ? "#ffffff" : "#000000";
      const measure = ctx.measureText(group.name),
        labelWidth = Math.min(measure.width, group.w),
        bearing =
          (measure.actualBoundingBoxLeft || 0) *
          (measure.width ? labelWidth / measure.width : 1);
      const origin = world(group.x + bearing, group.y);
      ctx.fillText(group.name, bearing, 0, group.w);
      const labelLayer = {
        name: group.name,
        left: origin.x,
        top: origin.y,
        canvas: label,
        text: textLayerData(
          {
            text: group.name,
            x: origin.x,
            y: origin.y,
            size,
            role: "Replica LL",
            color: ctx.fillStyle,
            align: "left",
            angle: r.vertical ? -90 : 0,
            glyphScale: measure.width ? labelWidth / measure.width : 1,
          },
          0,
          0,
        ),
      };
      if (r.vertical) {
        const rotated = makeCanvas(label.height, label.width),
          c = exportContext(rotated);
        c.translate(0, rotated.height);
        c.rotate(-Math.PI / 2);
        c.drawImage(label, 0, 0);
        labelLayer.canvas = rotated;
        labelLayer.left = left + r.content.w + group.y;
        labelLayer.top = top + b.h - group.x - group.w;
      }
      entries.push(labelLayer);
      for (const logo of group.logos) {
        const asset = p.logos.find((a) => a.id === logo.id);
        if (!asset) continue;
        const mode = MKWSponsors.mode(logo, r.colour),
          bitmap = await sponsorBitmap(asset, mode, r.colour),
          full = makeCanvas(asset.width, asset.height);
        exportContext(full).drawImage(bitmap, 0, 0, full.width, full.height);
        const prepared = {
            ...asset,
            data: full.toDataURL(),
            name: asset.name || "Sponsorlogo",
          },
          coords = corners(logo.x, logo.y, logo.w, logo.h),
          w = r.vertical ? logo.h : logo.w,
          h = r.vertical ? logo.w : logo.h,
          raster = makeCanvas(w, h),
          c = exportContext(raster);
        if (r.vertical) {
          c.translate(0, h);
          c.rotate(-Math.PI / 2);
          c.drawImage(bitmap, 0, 0, logo.w, logo.h);
        } else c.drawImage(bitmap, 0, 0, w, h);
        const layer = MKWPSD.placed(
          {
            name: asset.name || "Sponsorlogo",
            left: Math.min(...coords.map((p) => p.x)),
            top: Math.min(...coords.map((p) => p.y)),
            canvas: raster,
            blendMode:
              MKWSponsors.composite(mode, r.colour) === "source-over"
                ? "normal"
                : MKWSponsors.composite(mode, r.colour),
          },
          registry,
          prepared,
          coords.flatMap((p) => [p.x, p.y]),
          mask,
          `sponsor:${asset.id}:${mode}:${MKWSponsors.composite(mode, r.colour)}`,
        );
        if (mode === "original") entries.push(layer);
        else {
          const originalCanvas = makeCanvas(w, h),
            originalContext = exportContext(originalCanvas),
            originalBitmap = await image(asset.data);
          if (r.vertical) {
            originalContext.translate(0, h);
            originalContext.rotate(-Math.PI / 2);
            originalContext.drawImage(originalBitmap, 0, 0, logo.w, logo.h);
          } else originalContext.drawImage(originalBitmap, 0, 0, w, h);
          const original = {
            ...layer,
            name: "Original · Farbe",
            canvas: originalCanvas,
            hidden: true,
            blendMode: "normal",
          };
          delete original.placedLayer;
          MKWPSD.placed(
            original,
            registry,
            asset,
            coords.flatMap((p) => [p.x, p.y]),
            mask,
          );
          entries.push({
            name: asset.name || "Sponsorlogo",
            blendMode: "pass through",
            opened: false,
            children: [original, { ...layer, name: "Darstellung · Tonwerte" }],
          });
        }
        full.width = full.height = 0;
      }
      children.push({
        name: group.name,
        blendMode: "pass through",
        opened: false,
        children: entries,
      });
    }
    return {
      name: "Sponsorenleiste",
      blendMode: "pass through",
      opened: false,
      vectorMask: mask,
      children,
    };
  }
  return { angle, typography, sponsors };
})();
