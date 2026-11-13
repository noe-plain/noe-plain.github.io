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
    const layout = textBlock(b),
      gradient = textGradientGeometry(b, layout),
      main = titles(b, frame, layout);
    if (!b.family?.enabled && gradient.hasText) {
      const object = base("gradient", frame, {
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
      q.carousel.objects.push(object);
    }
    if (main) q.carousel.objects.push(main);
    const e = layout.copyright;
    if (e?.visible && e.text)
      q.carousel.objects.push(
        base("text", frame, {
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
        }),
      );
  }
  return Object.freeze({ add, titles });
})();
