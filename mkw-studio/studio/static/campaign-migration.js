"use strict";
/* Converts fixed campaign typography into one editable frame per output. */
const MKWCampaignMigration = (() => {
  const { base } = MKWCampaignDocument;
  function scaleStyle(style, factor) {
    const next = { ...(style || {}) };
    for (const key of ["size", "baselineShift", "spaceBefore", "spaceAfter"])
      if (next[key] !== undefined) next[key] *= factor;
    if (next.leading)
      next.leading = next.leading.map((value) =>
        value === null ? null : value * factor,
      );
    return next;
  }
  function titles(b, frame, layout) {
    const records = layout.mainRecords.filter(
      (record) => record.visible && record.text,
    );
    if (!records.length) return null;
    const first = records[0],
      object = base("text", frame, {
        campaignRole: "titles",
        name: "Konzerttexte",
        x: frame.x + layout.safe.x,
        y: frame.y + first.y,
        w: layout.safe.w,
        h: Math.max(
          1,
          ...records.map((record) => record.y + record.h - first.y),
        ),
        size: first.size,
        font: first.role,
        text: "",
        textAnchor: "top",
        lineHeight: 1,
        textStyles: [],
        characterStyles: [],
      });
    let paragraph = 0;
    for (const record of records) {
      const source = b.elements[record.key],
        factor = record.size / source.size,
        offset = object.text.length + (object.text ? 1 : 0);
      let gap = 0;
      if (object.text) {
        const previous = carouselTextLayout(object).lines.at(-1),
          after = object.textStyles[previous.paragraph]?.spaceAfter || 0;
        gap = record.y - first.y - (previous.y + previous.leading + after);
        object.text += "\n";
      }
      let local = 0;
      for (const [index, text] of source.text.split("\n").entries()) {
        const style = scaleStyle(source.textStyles?.[index], factor);
        style.size ??= record.size;
        style.lineHeight ??= source.lineHeight ?? 1;
        style.align ??= source.textAlign || source.align || "left";
        if (source.opticalAlign !== undefined)
          style.opticalAlign ??= source.opticalAlign;
        if (local === 0)
          style.spaceBefore = Math.max(0, (style.spaceBefore || 0) + gap);
        object.textStyles[paragraph++] = style;
        const fontOffset =
          carouselTypeBaseline(
            carouselMeasureContext,
            object.font,
            style.size,
          ) -
          carouselTypeBaseline(carouselMeasureContext, source.role, style.size);
        for (const segment of MKWText.segments(
          source,
          local,
          local + text.length,
        )) {
          const { start, end, ...values } = scaleStyle(segment, factor);
          object.characterStyles.push({
            start: offset + start,
            end: offset + end,
            font: source.role,
            color: source.color,
            tracking: source.tracking || 0,
            uppercase: !!source.uppercase,
            underline: !!source.underline,
            strike: !!source.strike,
            script: source.script || "normal",
            ...values,
            baselineShift:
              (values.baselineShift ?? (source.baselineShift || 0) * factor) +
              fontOffset,
            family: values.family ?? source.family ?? !!b.family?.enabled,
          });
        }
        local += text.length + 1;
      }
      object.text += source.text;
      object.hyphenate = source.hyphenate ?? object.hyphenate;
    }
    object.characterStyles = MKWText.merge(object.characterStyles);
    object.h = Math.max(object.h, carouselTextLayout(object).height);
    return object;
  }
  function add(q, b, frame) {
    const target = q.boards.find((board) => board.campaignPage === frame.id);
    if (target) target.campaignLegacyTexts = true;
    // append() supplies a visible logo for new campaigns. Imported legacy
    // documents keep their deliberate visibility instead of revealing it.
    const logo = q.carousel.objects.find(
      (o) => o.pageId === frame.id && o.campaignRole === "logo",
    );
    if (logo) logo.visible = b.elements.logo.visible;
    const layout = textBlock(b);
    const gradient = contrast(b, frame, layout);
    const main = titles(b, frame, layout);
    if (gradient) q.carousel.objects.push(gradient);
    if (main) q.carousel.objects.push(main);
    const credit = copyright(b, frame, layout);
    if (credit) q.carousel.objects.push(credit);
  }
  const recoveredRole = (key) =>
    key === "copyright" ? "copyright" : "legacy-" + key;
  function hiddenTexts(q, pageId) {
    if (!q.campaign) return [];
    const board = q.boards.find((b) => b.campaignPage === pageId),
      objects = q.carousel?.objects.filter((o) => o.pageId === pageId) || [];
    if (
      !board ||
      !(
        board.campaignLegacyTexts ||
        objects.some((o) =>
          ["titles", "legacy-gradient"].includes(o.campaignRole),
        )
      )
    )
      return [];
    return MKWLayout.keys.filter((key) => {
      const e = board.elements[key];
      return (
        e.text?.trim() &&
        (!e.visible || (key !== "copyright" && e.enabled === false)) &&
        !objects.some((o) => o.campaignRole === recoveredRole(key))
      );
    });
  }
  function recoverText(q, frame, key) {
    if (!hiddenTexts(q, frame.id).includes(key)) return null;
    const source = q.boards.find((b) => b.campaignPage === frame.id),
      board = {
        ...clone(source),
        w: frame.w,
        h: frame.h,
        safe: Object.fromEntries(
          ["top", "bottom", "left", "right"].map((side) => [side, frame[side]]),
        ),
      };
    board.elements[key].visible = true;
    board.elements[key].enabled = true;
    const layout = textBlock(board),
      object =
        key === "copyright"
          ? copyright(board, frame, layout)
          : titles(board, frame, {
              ...layout,
              mainRecords: layout.mainRecords.filter(
                (record) => record.key === key,
              ),
            });
    if (!object) return null;
    object.campaignRole = recoveredRole(key);
    object.campaignLocal = true;
    object.name = elementNames[key] + " · Altdatei";
    return object;
  }
  function contrast(b, frame, layout) {
    if (b.family?.enabled) return null;
    const gradient = textGradientGeometry(b, layout);
    if (!gradient.hasText) return null;
    return base("gradient", frame, {
      campaignRole: "legacy-gradient",
      name: "Textkontrast",
      color: "#000000",
      endColor: "#000000",
      startAlpha: 0,
      endAlpha: 1,
      opacity: 0.42,
      blend: "multiply",
      rotation: 90,
      gradientStart: { x: 0.5, y: gradient.start / b.h },
      gradientEnd: {
        x: 0.5,
        y: Math.max(gradient.start + 1, gradient.baseline) / b.h,
      },
    });
  }
  function copyright(b, frame, layout) {
    const e = layout.copyright;
    if (!e?.visible || !e.text) return null;
    return base("text", frame, {
      ...clone(b.elements.copyright),
      campaignRole: "copyright",
      name: "Copyright",
      text: e.text,
      x: frame.x + e.x,
      y: frame.y + e.y,
      w: Math.max(1, e.maxWidth || e.w || e.size),
      h: Math.max(1, e.h),
      size: e.size,
      font: e.role,
      textAlign: "left",
      angle: e.angle || 0,
    });
  }
  function paintText(ctx, object, board, frame) {
    const title = object.campaignRole === "titles";
    if (!board || (!title && object.campaignRole !== "copyright")) return false;
    return paintOriginalLayer(
      ctx,
      object,
      board,
      frame,
      title ? titles : copyright,
    );
  }
  function paintContrast(ctx, object, board, frame) {
    return (
      !!board &&
      object.campaignRole === "legacy-gradient" &&
      paintOriginalLayer(ctx, object, board, frame, contrast)
    );
  }
  const originalLayers = new WeakMap();
  function paintOriginalLayer(ctx, object, board, frame, createLayer) {
    const layout = textBlock(board);
    let expected = originalLayers.get(board);
    if (expected?.layout !== layout) {
      expected = { layout, layers: new Map() };
      originalLayers.set(board, expected);
    }
    if (!expected.layers.has(createLayer)) {
      const local = { ...frame, x: 0, y: 0 };
      const layer = createLayer(board, local, layout);
      expected.layers.set(
        createLayer,
        layer && MKWCampaignModel.values(layer, local),
      );
    }
    const before = expected.layers.get(createLayer);
    if (!before) return false;
    const current = MKWCampaignModel.values(object, frame);
    const equal = (key) => {
      if (key === "x" || key === "y")
        return Math.abs(current[key] - before[key]) < 1e-7;
      return (
        key === "name" ||
        key === "locked" ||
        current[key] === before[key] ||
        JSON.stringify(current[key]) === JSON.stringify(before[key])
      );
    };
    if (!Object.keys({ ...before, ...current }).every(equal)) return false;
    // Unedited layers use the original rasterisation while the native layers
    // remain the source for editing and take over once their appearance changes.
    ctx.save();
    ctx.translate(frame.x, frame.y);
    const strip = MKWSponsors.layout(board);
    if (strip) carouselClipFrames(ctx, [{ x: 0, y: 0, ...strip.content }]);
    if (createLayer === contrast)
      textGradient(ctx, board, layout, object.opacity);
    else {
      const title = createLayer === titles;
      if (title) carouselClipFrames(ctx, [layout.safe]);
      drawText(ctx, layout, {
        family: board.family,
        ...(title ? { excludeKey: "copyright" } : { includeKey: "copyright" }),
      });
    }
    ctx.restore();
    return true;
  }
  async function paintPhoto(
    ctx,
    object,
    board,
    frame,
    scale,
    loadImage,
    project,
  ) {
    const angle = object.campaignRole === "angle";
    if (
      !board?.campaignLegacyTexts ||
      (angle
        ? object.type !== "angle"
        : object.campaignRole !== "background" || object.type !== "image") ||
      object.imageId !== board.imageId ||
      object.framePoints ||
      (object.angle || 0) !== 0 ||
      (object.blend || "source-over") !== "source-over"
    )
      return false;
    const photo = project.images.find((asset) => asset.id === object.imageId);
    const area = MKWSponsors.layout(board)?.content;
    if (
      !photo ||
      (angle && (!board.angle?.enabled || MKWAnglePolicy.solid(object)))
    )
      return false;
    const geometry = angle
      ? MKWPostAngle.geometry(board, area || board).o
      : { x: 0, y: 0, w: board.w, h: board.h };
    if (
      object.w !== geometry.w ||
      object.h !== geometry.h ||
      Math.abs(object.x - frame.x - geometry.x) >= 1e-7 ||
      Math.abs(object.y - frame.y - geometry.y) >= 1e-7 ||
      (object.opacity ?? 1) !== (angle ? (board.angle.opacity ?? 1) : 1) ||
      (angle &&
        ["direction", "thickness", "glow", "glowColor", "glowAlpha"].some(
          (key) => object[key] !== geometry[key],
        ))
    )
      return false;
    const transform = MKWPhotoTransform.fromLegacy(
      geometry,
      photo,
      angle ? board.angle.image : board.image,
    );
    if (
      !Object.keys(transform).every(
        (key) => (object[key] ?? 0) === transform[key],
      )
    )
      return false;
    const bitmap = await loadImage(photo.data, project);
    ctx.save();
    ctx.translate(frame.x, frame.y);
    if (area) carouselClipFrames(ctx, [{ x: 0, y: 0, ...area }]);
    if (angle)
      drawLegacyAnglePhoto(ctx, bitmap, photo, board.angle, geometry, scale);
    else drawLegacyPhoto(ctx, bitmap, photo, board.image);
    ctx.restore();
    return true;
  }
  async function paintLogo(ctx, logo, board, frame, project) {
    const original = board?.elements.logo;
    if (
      !original?.visible ||
      logo.campaignRole !== "logo" ||
      logo.source !== original.source ||
      (logo.opacity ?? 1) !== 1 ||
      (logo.blend || "source-over") !== "source-over" ||
      (logo.angle || 0) !== (original.angle || 0) ||
      logo.w !== original.size ||
      Math.abs(logo.x - frame.x - original.x) >= 1e-7 ||
      Math.abs(logo.y - frame.y - original.y) >= 1e-7
    )
      return false;
    const bitmap = await carouselLogoImage(logo, project);
    if (Math.abs(logo.h - (logo.w * bitmap.height) / bitmap.width) >= 1e-7)
      return false;

    // The old editor clips the logo at the safe zone edge, including subpixel edges.
    ctx.save();
    ctx.translate(frame.x, frame.y);
    const strip = MKWSponsors.layout(board);
    if (strip) carouselClipFrames(ctx, [{ x: 0, y: 0, ...strip.content }]);
    carouselClipFrames(ctx, [MKWLayout.safeRect(board)]);
    drawLogo(ctx, board, bitmap);
    ctx.restore();
    return true;
  }
  async function paintLogoShadow(ctx, logo, board, frame, project) {
    const area = MKWSponsors.layout(board)?.content || frame;
    const bitmap = await carouselLogoImage(logo, project);
    ctx.save();
    carouselClipFrames(ctx, [{ x: frame.x, y: frame.y, w: area.w, h: area.h }]);
    ctx.globalAlpha *= logo.opacity ?? 1;
    softLogoShadow(
      ctx,
      {
        elements: {
          logo: { x: logo.x, y: logo.y, size: logo.w, angle: logo.angle },
        },
      },
      bitmap,
    );
    ctx.restore();
  }
  return Object.freeze({
    add,
    titles,
    hiddenTexts,
    recoverText,
    paintText,
    paintContrast,
    paintPhoto,
    paintLogo,
    paintLogoShadow,
  });
})();
