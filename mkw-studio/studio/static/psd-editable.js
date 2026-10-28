"use strict";
const MKWPSD = (() => {
  const polygon = (points) => ({
    paths: [
      {
        open: false,
        operation: "combine",
        fillRule: "non-zero",
        knots: points.map(({ x, y }) => ({
          linked: false,
          points: [x, y, x, y, x, y],
        })),
      },
    ],
  });
  const rectangle = (x, y, w, h) =>
    polygon([
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]);
  const blend = (o) => ({
    opacity: o.opacity ?? 1,
    hidden: o.visible === false,
    blendMode: { multiply: "multiply", screen: "screen" }[o.blend] || "normal",
    ...(o.locked
      ? { protected: { composite: true, position: true, transparency: true } }
      : {}),
  });
  function sources() {
    const files = [],
      ids = new Map();
    return {
      files,
      add(key, name, data) {
        if (!ids.has(key)) {
          const id = uid();
          ids.set(key, id);
          files.push({
            id,
            name: (name || "Bild").replace(/\.[^.]+$/, "") + ".png",
            type: "PNG ",
            data: bytesFromData(data),
          });
        }
        return ids.get(key);
      },
    };
  }
  function placed(layer, registry, source, transform, mask, key = source.id) {
    layer.placedLayer = {
      id: registry.add(key, source.name, source.data),
      placed: uid(),
      type: "raster",
      width: source.width,
      height: source.height,
      transform,
      resolution: { value: 72, units: "Density" },
    };
    if (mask) layer.vectorMask = { ...mask, notLink: true };
    return layer;
  }
  function photoTransform(source, t, left = 0, top = 0) {
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].flatMap(([sx, sy]) => {
      const q = rotatePoint(
        (sx * source.width * t.scale * t.flipX) / 2,
        (sy * source.height * t.scale * t.flipY) / 2,
        t.angle || 0,
      );
      return [left + t.x + q.x, top + t.y + q.y];
    });
  }
  function anglePoints(o) {
    const horizontal = MKWAnglePolicy.horizontal(o.direction),
      w = horizontal ? o.w : o.h,
      h = horizontal ? o.h : o.w,
      t = Math.min(o.thickness * Math.SQRT2, w * 0.9, h * 0.44),
      a =
        o.direction === "left"
          ? 180
          : o.direction === "up"
            ? -90
            : o.direction === "down"
              ? 90
              : 0;
    return [
      [0, 0],
      [w, h / 2],
      [0, h],
      [0, h - t],
      [w - t, h / 2],
      [0, t],
    ].map(([x, y]) => {
      const q = rotatePoint(x - w / 2, y - h / 2, a);
      return carouselToWorld(o, { x: q.x + o.w / 2, y: q.y + o.h / 2 });
    });
  }
  function imageMask(o) {
    return polygon(
      o.type === "angle"
        ? anglePoints(o)
        : carouselFramePoints(o).map((pt) =>
            carouselToWorld(o, { x: pt.x * o.w, y: pt.y * o.h }),
          ),
    );
  }
  function designerTransform(o, source) {
    const fit = Math.max(o.w / source.width, o.h / source.height) * o.scale;
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].flatMap(([x, y]) => {
      const q = carouselToWorld(o, {
        x: o.w / 2 + o.panX + (x * source.width * fit * o.flipX) / 2,
        y: o.h / 2 + o.panY + (y * source.height * fit * o.flipY) / 2,
      });
      return [q.x, q.y];
    });
  }
  function font(role) {
    const f = p.fonts.find((f) => f.role === role);
    return {
      name: fontStatus[role]
        ? f?.postscriptName ||
          f?.name.replace(/\.(otf|ttf|woff2?)$/i, "") ||
          role
        : role?.startsWith("Harriet")
          ? "Georgia"
          : "ArialMT",
    };
  }
  function text(o, layout, left = 0, top = 0) {
    const ctx = makeCanvas(1, 1).getContext("2d"),
      baseline = carouselTypeBaseline(ctx, o.font, o.size),
      offset = carouselTextOffset(o, layout),
      a = ((o.angle || 0) * Math.PI) / 180,
      point = carouselToWorld(o, { x: 0, y: offset + baseline });
    const result = {
      text: o.text,
      shapeType: "box",
      boxBounds: [
        0,
        -baseline,
        o.w,
        Math.max(o.h - offset, layout.height) + o.size * 0.3 - baseline,
      ],
      transform: [
        Math.cos(a),
        Math.sin(a),
        -Math.sin(a),
        Math.cos(a),
        left + point.x,
        top + point.y,
      ],
      antiAlias: "smooth",
      orientation: "horizontal",
      superscriptSize: 0.65,
      superscriptPosition: 0.3,
      subscriptSize: 0.65,
      subscriptPosition: 0.2,
      style: {
        font: font(o.font),
        fontSize: o.size,
        fillColor: rgb(o.color),
        autoLeading: false,
        leading: o.size * (o.lineHeight ?? 0.95),
      },
      styleRuns: [],
      paragraphStyleRuns: [],
    };
    let start = 0;
    const paragraphs = o.text.split("\n");
    for (const [index, part] of paragraphs.entries()) {
      const ps = o.textStyles?.[index] || {},
        size = ps.size ?? o.size,
        length = part.length + (index < paragraphs.length - 1 ? 1 : 0),
        alignment = ps.align ?? o.textAlign ?? "left";
      result.paragraphStyleRuns.push({
        length,
        style: {
          justification: alignment === "justify" ? "justify-left" : alignment,
          spaceBefore: ps.spaceBefore || 0,
          spaceAfter: ps.spaceAfter || 0,
          autoHyphenate:
            alignment === "justify" && (ps.hyphenate ?? o.hyphenate) !== false,
          preHyphen: 2,
          postHyphen: 2,
          hyphenatedWordSize: 5,
          consecutiveHyphens: 2,
          wordSpacing: [0.8, 1, 1.2],
          letterSpacing: [-0.02, 0, 0.02],
          glyphSpacing: [0.98, 1, 1.02],
        },
      });
      for (const range of MKWText.segments(o, start, start + length)) {
        const script = range.script ?? o.script ?? "normal";
        result.styleRuns.push({
          length: range.end - range.start,
          style: {
            font: font(range.font || o.font),
            fontSize: range.size ?? size,
            fillColor: rgb(range.color || o.color),
            tracking: range.tracking ?? o.tracking ?? 0,
            autoLeading: false,
            leading:
              ps.leading?.[0] ??
              (range.size ?? size) * (ps.lineHeight ?? o.lineHeight ?? 0.95),
            fontCaps: (range.uppercase ?? o.uppercase) ? 2 : 0,
            fontBaseline:
              script === "superscript" ? 1 : script === "subscript" ? 2 : 0,
            baselineShift: range.baselineShift ?? o.baselineShift ?? 0,
            underline: !!(range.underline ?? o.underline),
            strikethrough: !!(range.strike ?? o.strike),
          },
        });
      }
      start += length;
    }
    return result;
  }
  function fill(layer, colour, mask) {
    layer.vectorFill = { type: "color", color: rgb(colour) };
    if (mask) layer.vectorMask = mask;
    return layer;
  }
  function needsTextReference(o, layout) {
    return (
      carouselHasEffects(o) ||
      layout.lines.some((line) => line.justification) ||
      o.textStyles?.some(
        (s) => s?.leading && Object.keys(s.leading).some((k) => Number(k) > 0),
      )
    );
  }
  function reference(name, appearance, editable) {
    const group = {
      name,
      opened: false,
      hidden: appearance.hidden,
      opacity: appearance.opacity ?? 1,
      blendMode: appearance.blendMode || "normal",
      protected: appearance.protected,
    };
    const relative = group.opacity
      ? (editable.opacity ?? 1) / group.opacity
      : 1;
    Object.assign(appearance, {
      name: "Darstellung · gerastert",
      hidden: false,
      opacity: 1,
      blendMode: "normal",
      protected: undefined,
    });
    Object.assign(editable, {
      name: "Bearbeiten · " + name,
      hidden: true,
      opacity: Math.min(1, relative),
      blendMode: "normal",
      protected: undefined,
    });
    return { ...group, children: [editable, appearance] };
  }

  function filters(o, fit = 1) {
    const list = [];
    for (const key of ["blur", "noise"]) {
      const value = o.effects?.[key];
      if (!value) continue;
      const base = {
        name:
          key === "blur" ? "Gausscher Weichzeichner" : "Rauschen · monochrom",
        opacity: 1,
        blendMode: "normal",
        enabled: o.effects[key + "Enabled"] !== false,
        hasOptions: true,
        foregroundColor: rgb("#000000"),
        backgroundColor: rgb("#ffffff"),
      };
      list.push(
        key === "blur"
          ? {
              ...base,
              type: "gaussian blur",
              filter: { radius: { units: "Pixels", value: value / fit } },
            }
          : {
              ...base,
              type: "add noise",
              filter: {
                amount: value,
                distribution: "uniform",
                monochromatic: true,
                randomSeed: 1,
              },
            },
      );
    }
    return list.length
      ? {
          enabled: true,
          validAtPosition: true,
          maskEnabled: false,
          maskLinked: false,
          maskExtendWithWhite: true,
          list,
        }
      : undefined;
  }
  function gradient(value) {
    return {
      type: "solid",
      name: "Studio-Verlauf",
      smoothness: 1,
      style: value.kind === "radial" ? "radial" : "linear",
      angle: -value.angle,
      scale: 100,
      align: true,
      colorStops: value.stops.map((s) => ({
        color: rgb(s.colour),
        location: s.at,
        midpoint: s.mid ?? 0.5,
      })),
      opacityStops: value.stops.map((s) => ({
        opacity: s.alpha,
        location: s.at,
        midpoint: s.mid ?? 0.5,
      })),
    };
  }
  async function bitmapSource(bitmap, id, name, displayWidth = 0) {
    const width = bitmap.naturalWidth || bitmap.width,
      height = bitmap.naturalHeight || bitmap.height,
      scale = /\.svg(?:[?#]|$)|^data:image\/svg\+xml/i.test(bitmap.src || "")
        ? Math.max(1, displayWidth / width)
        : 1,
      canvas = makeCanvas(width * scale, height * scale);
    exportContext(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = {
      id,
      name,
      width: canvas.width,
      height: canvas.height,
      data: canvas.toDataURL(),
    };
    canvas.width = canvas.height = 0;
    return result;
  }
  return {
    filters,
    gradient,
    bitmapSource,
    polygon,
    rectangle,
    blend,
    sources,
    placed,
    photoTransform,
    imageMask,
    designerTransform,
    font,
    text,
    fill,
    needsTextReference,
    reference,
  };
})();
