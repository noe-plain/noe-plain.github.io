/* Output-pixel geometry shared by editor, JPG and PSD. No screen-zoom inputs. */
(function (root) {
  const copyrightText = (text) => {
    const value = String(text || "")
      .replace(/[\r\n]+/g, " ")
      .trim();
    return value ? (value.includes("©") ? value : "© " + value) : "";
  };
  const lineHeight = (e) => (e.key === "copyright" ? 1.15 : 1);
  const keys = ["date", "title", "subtitle", "copyright"];
  const clamp = (n, a, b) =>
    Math.min(Math.max(a, b), Math.max(a, Number.isFinite(n) ? n : a));
  const sponsorModel =
    typeof module !== "undefined"
      ? require("./sponsor-model.js")
      : root.MKWSponsors;
  function safeRect(b) {
    const strip = sponsorModel.layout(b),
      design = strip?.content || b;
    const unit = b.w / 1080,
      story = b.w * 16 === b.h * 9,
      left = b.safe?.left ?? 100 * unit,
      right = b.safe?.right ?? 100 * unit,
      top = b.safe
        ? b.safe.top
        : Math.min((story ? 200 : 100) * unit, b.h * 0.4),
      originalBottom = b.safe
        ? b.safe.bottom
        : Math.min((story ? 500 : 200) * unit, b.h * 0.4),
      bottom =
        strip && !strip.vertical
          ? Math.max(100, originalBottom - strip.thickness)
          : originalBottom;
    return {
      x: left,
      y: top,
      w: Math.max(1, design.w - left - right),
      h: Math.max(1, design.h - top - bottom),
      left,
      right,
      top,
      bottom,
    };
  }
  function wrap(text, width, measure) {
    const lines = [];
    for (const paragraph of String(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? line + " " + word : word;
        if (measure(next) <= width) {
          line = next;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        if (measure(word) <= width) {
          line = word;
          continue;
        }
        for (const char of Array.from(word)) {
          if (line && measure(line + char) > width) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  const stackPairs = ["date:title", "title:subtitle", "date:subtitle"];
  const maxStackGap = 10000;
  const stackGap = (b, before, after) =>
    b.textBox?.gaps?.[before + ":" + after] ?? (8 * b.w) / 1080;
  function validateTextBox(box) {
    if (!box) return;
    if (!Number.isFinite(box.offset) || box.offset < 0)
      throw Error("Ungültige Textbox-Position.");
    if (
      box.gaps !== undefined &&
      (!box.gaps ||
        typeof box.gaps !== "object" ||
        Array.isArray(box.gaps) ||
        Object.entries(box.gaps).some(
          ([key, value]) =>
            !stackPairs.includes(key) ||
            !Number.isFinite(value) ||
            value < 0 ||
            value > maxStackGap,
        ))
    )
      throw Error("Ungültige Abstände im Textstapel.");
  }
  function textLayout(b, measure, activeKey, styleLayout) {
    const safe = safeRect(b),
      visible = keys.filter(
        (k) =>
          k !== "copyright" &&
          b.elements[k].enabled !== false &&
          ((b.elements[k].visible &&
            (b.elements[k].text || b.elements[k].enabled)) ||
            k === activeKey ||
            (activeKey && !b.elements[k].text.trim())),
      );
    const gaps = visible.slice(1).map((key, i) => stackGap(b, visible[i], key)),
      gapTotal = gaps.reduce((sum, value) => sum + value, 0);
    function rows(factor) {
      return visible.map((key) => {
        const e = b.elements[key],
          size = Math.max(0.1, e.size * factor),
          styled = styleLayout?.(e, safe.w, factor),
          text = e.uppercase ? e.text.toUpperCase() : e.text,
          lines = wrap(text, safe.w, (t) => measure(t, size, e.role));
        return {
          key,
          ...e,
          text,
          size,
          lines,
          maxWidth: Math.max(0, ...lines.map((t) => measure(t, size, e.role))),
          h: styled ? styled.height : lines.length * size * lineHeight({ key }),
          ...(styled
            ? {
                styled,
                lines: styled.lines.map((line) => line.text),
                maxWidth: Math.max(
                  0,
                  ...styled.lines.map((line) => line.width),
                ),
              }
            : {}),
        };
      });
    }
    let records = rows(1),
      height = records.reduce((n, r) => n + r.h, 0) + gapTotal,
      factor = 1;
    if (height > safe.h || records.some((r) => r.maxWidth > safe.w + 0.001)) {
      let lo = 0.00001,
        hi = 1;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2,
          r = rows(mid),
          h = r.reduce((n, r) => n + r.h, 0) + gapTotal * mid;
        if (h > safe.h || r.some((r) => r.maxWidth > safe.w + 0.001)) hi = mid;
        else lo = mid;
      }
      factor = lo;
      records = rows(factor);
      height = records.reduce((n, r) => n + r.h, 0) + gapTotal * factor;
    }
    const offset = clamp(b.textBox?.offset || 0, 0, safe.h - height),
      y = safe.y + safe.h - offset - height;
    let cursor = y;
    records = records.map((e, index) => {
      const row = {
        ...e,
        x:
          safe.x +
          (e.align === "right"
            ? safe.w
            : e.align === "center"
              ? safe.w / 2
              : 0),
        y: Math.min(
          cursor + (e.key === "title" ? 2.5 : 0),
          safe.y + safe.h - e.h,
        ),
        w: safe.w,
        angle: 0,
      };
      cursor += e.h + (gaps[index] || 0) * factor;
      return row;
    });
    const ce = b.elements.copyright,
      showCopyright = (ce.visible && ce.text) || activeKey === "copyright";
    let copyright = null;
    if (showCopyright) {
      const text = copyrightText(ce.text);
      let size = Math.min(
          Math.max(0.1, ce.size),
          Math.max(0.1, safe.right) / 1.15,
        ),
        styled = null,
        width;
      const copyrightSource = {
        ...ce,
        key: "copyright",
        align: "left",
        textAlign: "left",
        text,
        textStyles: ce.textStyles?.map((s) =>
          s ? { ...s, align: "left", spaceBefore: 0, spaceAfter: 0 } : s,
        ),
      };
      const calculate = () => {
        styled = styleLayout?.(copyrightSource, 1000000, size / ce.size);
        width = styled ? styled.lines[0].width : measure(text, size, ce.role);
      };
      calculate();
      for (let i = 0; i < 3; i++) {
        const fit = Math.min(
          1,
          safe.h / Math.max(0.001, width),
          Math.max(0.1, safe.right) /
            Math.max(0.001, styled?.height || size * 1.15),
        );
        if (fit >= 1) break;
        size *= fit;
        calculate();
      }
      if (styled) styled.lines.forEach((line) => (line.x = 0));
      const h = styled?.height || size * 1.15,
        displayWidth = ce.text ? width : Math.max(width, (160 * b.w) / 1080);
      copyright = {
        key: "copyright",
        ...ce,
        text,
        size,
        lines: [text],
        maxWidth: width,
        w: displayWidth,
        h,
        x: safe.x + safe.w + safe.right / 2 - h / 2,
        y: safe.y + safe.h,
        angle: -90,
        align: "left",
        fixed: true,
        ...(styled ? { styled } : {}),
      };
    }
    return {
      x: safe.x,
      y,
      w: safe.w,
      h: height,
      offset,
      factor,
      mainRecords: records,
      copyright,
      records: copyright ? [...records, copyright] : records,
      safe,
    };
  }
  function recordRect(e) {
    const w = e.w || e.maxWidth || 0,
      h = e.h || e.size * lineHeight(e),
      left = e.align === "right" ? -w : e.align === "center" ? -w / 2 : 0,
      a = ((e.angle || 0) * Math.PI) / 180,
      pts = [
        [left, 0],
        [left + w, 0],
        [left + w, h],
        [left, h],
      ].map(([x, y]) => ({
        x: e.x + x * Math.cos(a) - y * Math.sin(a),
        y: e.y + x * Math.sin(a) + y * Math.cos(a),
      })),
      x = Math.min(...pts.map((p) => p.x)),
      y = Math.min(...pts.map((p) => p.y));
    return {
      x,
      y,
      w: Math.max(...pts.map((p) => p.x)) - x,
      h: Math.max(...pts.map((p) => p.y)) - y,
    };
  }
  function recordsRect(records) {
    if (!records.length) return { x: 0, y: 0, w: 0, h: 0 };
    const rs = records.map(recordRect),
      x = Math.min(...rs.map((r) => r.x)),
      y = Math.min(...rs.map((r) => r.y)),
      right = Math.max(...rs.map((r) => r.x + r.w)),
      bottom = Math.max(...rs.map((r) => r.y + r.h));
    return { x, y, w: right - x, h: bottom - y };
  }
  function logoRect(e, aspect) {
    const w = e.size,
      h = w / aspect,
      offset = e.align === "right" ? -w : e.align === "center" ? -w / 2 : 0,
      a = ((e.angle || 0) * Math.PI) / 180;
    const pts = [
      [offset, 0],
      [offset + w, 0],
      [offset + w, h],
      [offset, h],
    ].map(([x, y]) => ({
      x: e.x + x * Math.cos(a) - y * Math.sin(a),
      y: e.y + x * Math.sin(a) + y * Math.cos(a),
    }));
    const x = Math.min(...pts.map((p) => p.x)),
      y = Math.min(...pts.map((p) => p.y));
    return {
      x,
      y,
      w: Math.max(...pts.map((p) => p.x)) - x,
      h: Math.max(...pts.map((p) => p.y)) - y,
    };
  }
  function constrainLogo(b, aspect) {
    const e = b.elements.logo,
      s = safeRect(b);
    e.size = Math.min(e.size || 600, s.w, s.h * aspect);
    e.angle = 0;
    e.align = "left";
    e.x = s.x + s.w - e.size;
    e.y = s.y;
    return logoRect(e, aspect);
  }
  const api = {
    copyrightText,
    stackPairs,
    maxStackGap,
    stackGap,
    validateTextBox,
    lineHeight,
    keys,
    clamp,
    safeRect,
    wrap,
    textLayout,
    recordRect,
    recordsRect,
    logoRect,
    constrainLogo,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWLayout = api;
})(globalThis);
