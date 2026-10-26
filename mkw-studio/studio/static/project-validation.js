(function (root) {
  "use strict";
  function create({ family, textBox, angle, text, customFont, sponsors }) {
    function validate(q) {
      if (
        q?.projectId !== undefined &&
        (typeof q.projectId !== "string" ||
          !/^[-a-zA-Z0-9_]{1,80}$/.test(q.projectId))
      )
        throw Error("Ungültige Projektkennung.");
      if (
        q?.version !== 1 ||
        !Array.isArray(q.images) ||
        !Array.isArray(q.boards) ||
        !q.meta ||
        !Array.isArray(q.fonts) ||
        !Array.isArray(q.logos)
      )
        throw Error("Keine unterstützte MKW-Projektdatei.");
      if (
        q.meta.dateSource !== undefined &&
        !["manual", "heading"].includes(q.meta.dateSource)
      )
        throw Error("Ungültige Herkunft des Konzertdatums.");
      const ids = new Set();
      for (const i of q.images) {
        if (
          ids.has(i.id) ||
          typeof i.id !== "string" ||
          !i.data?.startsWith("data:image/png;base64,") ||
          !i.original?.startsWith("data:") ||
          !Number.isFinite(i.width) ||
          !Number.isFinite(i.height) ||
          i.width < 1 ||
          i.height < 1
        )
          throw Error("Ungültige Bilddaten.");
        ids.add(i.id);
      }
      family(q);
      const bids = new Set();
      for (const b of q.boards) {
        textBox(b.textBox);
        if (
          bids.has(b.id) ||
          typeof b.id !== "string" ||
          !ids.has(b.imageId) ||
          ![b.w, b.h].every(
            (n) => Number.isInteger(n) && n >= 16 && n <= 10000,
          ) ||
          b.w * b.h > 40000000 ||
          !b.image ||
          !b.elements ||
          !/^#[0-9a-f]{6}$/i.test(b.bg)
        )
          throw Error("Ungültige Zeichenfläche.");
        bids.add(b.id);
        angle(b);
        for (const k of ["x", "y", "scale", "angle", "flipX", "flipY"])
          if (!Number.isFinite(b.image[k]))
            throw Error("Ungültiger Ausschnitt.");
        if (
          b.image.scale <= 0 ||
          b.image.scale > 100 ||
          ![1, -1].includes(b.image.flipX) ||
          ![1, -1].includes(b.image.flipY)
        )
          throw Error("Ungültige Bildskalierung.");
        for (const k of ["date", "title", "subtitle", "copyright", "logo"]) {
          const e = b.elements[k];
          if (
            !e ||
            !["x", "y", "size"].every((k) => Number.isFinite(e[k])) ||
            e.size <= 0 ||
            e.size > 5000 ||
            !["left", "center", "right", "justify"].includes(e.align) ||
            !Number.isFinite(e.angle || 0)
          )
            throw Error("Ungültiges Gestaltungselement.");
          if (k !== "logo")
            text(
              e,
              new Set([
                "Arial",
                "Georgia",
                "Replica LL",
                "Harriet",
                "Harriet Regular",
                "Harriet Italic",
                ...q.fonts.map((f) => f.role),
              ]),
            );
          if (
            k !== "logo" &&
            (typeof e.text !== "string" ||
              (k === "date" &&
                e.uppercase !== undefined &&
                typeof e.uppercase !== "boolean") ||
              !/^#[0-9a-f]{6}$/i.test(e.color) ||
              (![
                "Replica LL",
                "Harriet",
                "Harriet Regular",
                "Harriet Italic",
                "Arial",
                "Georgia",
              ].includes(e.role) &&
                !q.fonts.some((f) => customFont(f) && f.role === e.role)))
          )
            throw Error("Ungültiger Text.");
        }
      }
      for (const f of q.fonts)
        if (
          (![
            "Replica LL",
            "Harriet",
            "Harriet Regular",
            "Harriet Italic",
          ].includes(f.role) &&
            !customFont(f)) ||
          !f.data?.startsWith("data:")
        )
          throw Error("Ungültige Schrift.");
      for (const l of q.logos)
        if (!l.data?.startsWith("data:image/")) throw Error("Ungültiges Logo.");
      sponsors(q);
      return q;
    }
    return validate;
  }
  const api = { create };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWProjectValidation = api;
})(globalThis);
