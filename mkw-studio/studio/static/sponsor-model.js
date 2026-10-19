/* Pure sponsor geometry/validation. No editor state, image decoding or persistence. */
(function (root) {
  "use strict";
  const modes = ["auto", "black", "white", "gray", "original"],
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function foreground(hex) {
    const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)),
      l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? "black" : "white";
  }
  function mode(logo, colour) {
    return logo.mode && logo.mode !== "auto"
      ? logo.mode
      : (logo.gray && !logo.monochrome) || logo.complex
        ? "gray"
        : foreground(colour);
  }
  function inkBounds(logo) {
    return logo.ink || { x: 0, y: 0, w: 1, h: 1 };
  }
  function logoSize(logo, unit, available, colour) {
    const ink = inkBounds(logo),
      aspect = logo.width / logo.height,
      renderedMode = mode(logo, colour),
      density =
        renderedMode === "gray" || renderedMode === "original"
          ? ((foreground(colour) === "black"
              ? logo.darkDensity
              : logo.lightDensity) ?? logo.density)
          : logo.density,
      // One optical ink-area target for the entire strip, regardless of group.
      // Height/width limits keep very thin wordmarks and dense emblems usable.
      targetArea = 1728 * unit * unit,
      height =
        clamp(
          Math.sqrt(targetArea / (aspect * Math.max(0.01, density))),
          (32 * unit) / ink.h,
          (76 * unit) / ink.h,
        ) * (logo.scale || 1),
      factor = Math.min(1, available / Math.max(height * aspect * ink.w, 1)),
      h = height * factor,
      w = h * aspect;
    return { ...logo, w, h, ink, spanW: w * ink.w, spanH: h * ink.h };
  }
  function layout(board) {
    const s = board.sponsors;
    if (!s?.enabled) return null;
    const groups = (s.groups || []).filter(
      (g) => g.enabled !== false && g.logos.some((l) => l.enabled !== false),
    );
    if (!groups.length) return null;
    const vertical = board.w >= board.h,
      u = Math.min(board.w, board.h) / 1080,
      L = vertical ? board.h : board.w,
      padding = Math.min((100 * board.w) / 1080, L * 0.15),
      gap = 36 * u,
      available = L - 2 * padding,
      placements = [];
    let x = padding,
      y = 30 * u,
      rowHeight = 0;
    for (const group of groups) {
      const logos = group.logos
        .filter((l) => l.enabled !== false)
        .map((l) => logoSize(l, u, available, s.colour || "#ffffff"));
      const natural =
          logos.reduce((n, l) => n + l.spanW, 0) + (logos.length - 1) * gap,
        width = Math.min(
          available,
          Math.max(Math.min(available, group.name.length * 14 * u), natural),
        );
      if (x > padding && x + width > L - padding + 0.01) {
        x = padding;
        y += rowHeight + 24 * u;
        rowHeight = 0;
      }
      const item = {
        id: group.id,
        name: group.name,
        x,
        y,
        w: width,
        logos: [],
      };
      let lx = 0,
        ly = 42 * u,
        lineH = 76 * u,
        rowStart = 0;
      const finishRow = () => {
        for (const logo of item.logos.slice(rowStart))
          logo.y +=
            (lineH - logo.spanH) / 2 -
            logo.ink.y * logo.h +
            clamp(
              (logo.ink.y + logo.ink.h / 2 - (logo.cy ?? 0.5)) * logo.h * 0.3,
              -6 * u,
              6 * u,
            );
        rowStart = item.logos.length;
      };
      for (const l of logos) {
        if (lx && lx + l.spanW > width + 0.01) {
          finishRow();
          lx = 0;
          ly += lineH + 20 * u;
          lineH = 76 * u;
        }
        const optical = lx
          ? clamp(
              (l.ink.x + l.ink.w / 2 - (l.cx ?? 0.5)) * l.w * 0.35,
              -6 * u,
              6 * u,
            )
          : 0;
        item.logos.push({
          ...l,
          x: x + lx - l.ink.x * l.w + optical,
          y: y + ly,
        });
        lx += l.spanW + gap;
        lineH = Math.max(lineH, l.spanH);
      }
      finishRow();
      item.h = ly + lineH;
      placements.push(item);
      x += width + 56 * u;
      rowHeight = Math.max(rowHeight, item.h);
    }
    const requested = Math.max((s.height || 180) * u, y + rowHeight + 30 * u),
      maxThickness = (vertical ? board.w : board.h) * 0.6,
      thickness = Math.min(requested, maxThickness),
      content = {
        w: board.w - (vertical ? thickness : 0),
        h: board.h - (vertical ? 0 : thickness),
      };
    return {
      vertical,
      thickness,
      content,
      width: L,
      height: thickness,
      unit: u,
      groups: placements,
      colour: s.colour || "#ffffff",
      warning:
        requested > maxThickness
          ? "Zu viele Sponsorlogos für diese Fläche. Weniger Gruppen wählen oder Logos verkleinern."
          : "",
    };
  }
  function hit(board, point) {
    const r = layout(board);
    if (!r) return null;
    const p = r.vertical
      ? { x: board.h - point.y, y: point.x - r.content.w }
      : { x: point.x, y: point.y - r.content.h };
    if (p.x < 0 || p.x > r.width || p.y < 0 || p.y > r.height) return null;
    for (const g of r.groups)
      for (const l of g.logos)
        if (p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h)
          return { groupId: g.id, logoId: l.id };
    return { groupId: null, logoId: null };
  }
  function moveLogo(groups, fromId, logoId, toId, beforeId = null) {
    const from = groups.find((g) => g.id === fromId),
      to = groups.find((g) => g.id === toId);
    if (
      !from ||
      !to ||
      !from.logos.some((l) => l.id === logoId) ||
      beforeId === logoId
    )
      return null;
    if (from !== to && to.logos.length >= 30)
      throw Error("Maximal 30 Logos pro Gruppe.");
    const next = groups.map((g) => ({ ...g, logos: [...g.logos] })),
      source = next.find((g) => g.id === fromId),
      target = next.find((g) => g.id === toId),
      [logo] = source.logos.splice(
        source.logos.findIndex((l) => l.id === logoId),
        1,
      ),
      before = target.logos.findIndex((l) => l.id === beforeId);
    target.logos.splice(before < 0 ? target.logos.length : before, 0, logo);
    return next.some(
      (g, i) =>
        g.logos.some((l, j) => l !== groups[i].logos[j]) ||
        g.logos.length !== groups[i].logos.length,
    )
      ? next
      : null;
  }
  function validate(project) {
    for (const b of project.boards || []) {
      const s = b.sponsors;
      if (s === undefined) continue;
      if (
        !s ||
        typeof s.enabled !== "boolean" ||
        !/^#[a-f0-9]{6}$/i.test(s.colour) ||
        !Number.isFinite(s.height) ||
        s.height < 120 ||
        s.height > 600 ||
        !Array.isArray(s.groups) ||
        s.groups.length > 20
      )
        throw Error("Ungültige Sponsorleiste.");
      const ids = new Set();
      for (const g of s.groups) {
        if (
          !g ||
          typeof g.id !== "string" ||
          ids.has(g.id) ||
          typeof g.name !== "string" ||
          g.name.length > 80 ||
          typeof g.enabled !== "boolean" ||
          !Array.isArray(g.logos) ||
          g.logos.length > 30
        )
          throw Error("Ungültige Sponsorgruppe.");
        ids.add(g.id);
        for (const l of g.logos)
          if (
            !l ||
            !project.logos?.some((a) => a.id === l.id) ||
            typeof l.name !== "string" ||
            l.name.length > 200 ||
            ![l.width, l.height].every(
              (n) => Number.isFinite(n) && n > 0 && n <= 4096,
            ) ||
            !Number.isFinite(l.density) ||
            l.density < 0 ||
            l.density > 1 ||
            (l.ink !== undefined &&
              (!l.ink ||
                ![l.ink.x, l.ink.y, l.ink.w, l.ink.h].every(Number.isFinite) ||
                l.ink.x < 0 ||
                l.ink.y < 0 ||
                l.ink.w <= 0 ||
                l.ink.h <= 0 ||
                l.ink.x + l.ink.w > 1.000001 ||
                l.ink.y + l.ink.h > 1.000001)) ||
            ["darkDensity", "lightDensity"].some(
              (k) =>
                l[k] !== undefined &&
                (!Number.isFinite(l[k]) || l[k] < 0 || l[k] > 1),
            ) ||
            !modes.includes(l.mode) ||
            (l.monochrome !== undefined && typeof l.monochrome !== "boolean") ||
            ["gray", "complex"].some((k) => typeof l[k] !== "boolean") ||
            !Number.isFinite(l.scale) ||
            l.scale < 0.25 ||
            l.scale > 2 ||
            ![l.cx ?? 0.5, l.cy ?? 0.5].every(
              (n) => Number.isFinite(n) && n >= 0 && n <= 1,
            )
          )
            throw Error("Ungültiges Sponsorlogo.");
      }
    }
    return project;
  }
  const api = { layout, hit, mode, foreground, validate, moveLogo };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWSponsors = api;
})(globalThis);
