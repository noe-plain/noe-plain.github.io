/* Source recipes for the three templates approved on 16 November 2026. */
(function (root) {
  "use strict";
  const rows =
    typeof module !== "undefined"
      ? require("../../static/spread-layout-model.js")
      : root.MKWSpreadLayoutModel;
  const copy = (v) => JSON.parse(JSON.stringify(v)),
    ink = "#000000",
    paper = "#ffffff",
    cream = "#f4efdf";
  function create(prototypes) {
    const proposals = [];
    function design(id, name, count, purpose, replace, h = 1350) {
      let next = 0;
      const c = rows.plan(
        {
          w: 1080,
          h,
          n: count,
          top: 100,
          bottom: h === 1080 ? 100 : 200,
          left: 96,
          right: 96,
          bg: paper,
          objects: [],
        },
        { type: "enable" },
        (o) => o,
        () => `${id}-page-${++next}`,
      );
      c.pageStructure.artboardInfo[0].name = name;
      const template = {
        id: `mkw-${{ menschen: "nahe-am-orchester", auftakt: "konzertauftakt", bilderslider: "bilder-slider" }[id]}`,
        name: `MKW – ${name}`,
        description: purpose,
        version: 1,
        carousel: c,
        slots: [],
        fonts: [],
      };
      proposals.push({
        id,
        name,
        purpose,
        replace,
        approval: "approved",
        template,
      });
      function add(page, type, label, spec) {
        const frame = c.artboards[page],
          o = Object.assign(copy(prototypes[type]), spec, {
            id: `${id}-${c.objects.length + 1}`,
            type,
            name: `${label} – Slide ${page + 1}`,
            x: frame.x + (spec.x || 0),
            y: frame.y + (spec.y || 0),
            pageId: frame.id,
            artboardScoped: true,
          });
        c.objects.push(o);
        template.slots.push({ objectId: o.id, kind: type });
        return o;
      }
      const text = (
        page,
        label,
        value,
        x,
        y,
        w,
        height,
        size = 36,
        font = "Harriet Regular",
        color = ink,
        extra = {},
      ) =>
        add(page, "text", label, {
          text: value,
          x,
          y,
          w,
          h: height,
          size,
          font,
          color,
          uppercase: false,
          lineHeight: 1.15,
          textAlign: "left",
          textAnchor: "top",
          ...extra,
        });
      const shape = (page, label, x, y, w, height, fill, extra = {}) =>
        add(page, "shape", label, {
          x,
          y,
          w,
          h: height,
          shapeKind: "rect",
          fill,
          fillEnabled: true,
          fillMode: "solid",
          strokeWidth: 0,
          locked: true,
          ...extra,
        });
      const photo = (page, label, x = 0, y = 0, w = 1080, height = h) =>
        add(page, "image", label, {
          x,
          y,
          w,
          h: height,
          scale: 1,
          panX: 0,
          panY: 0,
        });
      const angle = (page, source, x, y, w, height) => {
        const item = add(page, "angle", "Winkel links", {
          x,
          y,
          w,
          h: height,
          direction: "left",
          thickness: 250,
          glow: 0,
          glowAlpha: 0,
          scale: 1,
          panX: 0,
          panY: 0,
        });
        template.slots.at(-1).sourceId = source.id;
        return item;
      };
      const logo = (page, white = true) =>
        add(page, "logo", "MKW-Logo", {
          x: 384,
          y: 100,
          w: 600,
          h: 114,
          source: white ? "white" : "black",
          locked: true,
        });
      const gradient = (page, label, y, height, startAlpha, endAlpha) =>
        add(page, "gradient", label, {
          x: 0,
          y,
          w: 1080,
          h: height,
          color: ink,
          endColor: ink,
          startAlpha,
          endAlpha,
          opacity: 0.39,
          blend: "multiply",
          kind: "linear",
          rotation: 90,
          locked: true,
        });
      const background = (page, label = "Hintergrundfoto") => {
        photo(page, label);
        gradient(page, "Verlauf hinter Logo", 0, 500, 1, 0);
        gradient(page, "Verlauf hinter Text", 260, h - 260, 0, 1);
      };
      // One editable block; paragraph sizes and character styles provide hierarchy.
      const heading = (
        page,
        over,
        title,
        tail = "",
        y = 700,
        size = 110,
        height = 450,
        color = paper,
      ) => {
        const main = `${over}\n${title}`;
        const value = main + (tail ? `\n${tail}` : "");
        const titleParagraphs = main.split("\n").length;
        const textStyles = value.split("\n").map((_, i) => ({
          size: i === 0 ? 64 : i < titleParagraphs ? size : 36,
          lineHeight: i < titleParagraphs ? 0.96 : 1.12,
          spaceAfter: i === 0 ? 4 : i === titleParagraphs - 1 ? 10 : 0,
        }));
        return text(
          page,
          "Übertitel und Titel",
          value,
          96,
          y,
          888,
          height,
          size,
          "Replica LL",
          color,
          {
            lineHeight: 0.96,
            uppercase: false,
            textStyles,
            characterStyles: [
              { start: 0, end: main.length, uppercase: true },
              ...(tail
                ? [
                    {
                      start: main.length + 1,
                      end: value.length,
                      font: "Harriet Regular",
                      uppercase: false,
                    },
                  ]
                : []),
            ],
          },
        );
      };
      return {
        c,
        text,
        shape,
        photo,
        angle,
        logo,
        background,
        gradient,
        heading,
      };
    }
    {
      const d = design(
        "auftakt",
        "Konzertauftakt",
        1,
        "Ein vollflächiges Konzertfoto mit einem kompakten linksbündigen Textblock.",
        ["gemeinsamer Textblock", "Foto"],
      );
      d.background(0);
      d.logo(0);
      d.heading(
        0,
        "SO 22. NOVEMBER",
        "GROSSE MUSIK.\nGANZ NAH.",
        "11.00 Uhr – Stadthaus Winterthur",
      );
    }
    {
      const d = design(
        "menschen",
        "Nahe am Orchester",
        3,
        "Drei Slides: Logo–Bild–Titel, rechtsbündiges Bild und eine ruhige Textfolie.",
        ["Titelblock", "zwei Bilder", "Übertitel und Fliesstext"],
      );
      for (let page = 0; page < 3; page++)
        d.shape(page, "Papierfläche", 0, 0, 1080, 1350, cream);
      d.logo(0, false);
      d.c.bottom = 100;
      for (const frame of d.c.artboards) frame.bottom = 100;
      d.photo(0, "Porträt oder Instrument", 96, 300, 888, 620);
      d.heading(
        0,
        "NAHE AM ORCHESTER",
        "AM PULS\nDES KLANGS.",
        "",
        960,
        100,
        290,
        ink,
      );
      d.photo(1, "Impression 2", 200, 100, 880, 1150);
      d.logo(2, false);
      const over = "EIN BLICK INS ORCHESTER";
      const body =
        "Musik entsteht im Zusammenspiel.\nJede Stimme bringt ihre eigene Farbe\nein – und hört zugleich auf die anderen.\n\nSo wird aus vielen einzelnen Tönen\nein gemeinsamer Klang.";
      const value = over + "\n" + body;
      d.text(
        2,
        "Übertitel und Fliesstext",
        value,
        96,
        355,
        888,
        795,
        44,
        "Harriet Regular",
        ink,
        {
          lineHeight: 1.18,
          textStyles: value.split("\n").map((_, i) => ({
            size: i === 0 ? 64 : 44,
            lineHeight: i === 0 ? 0.96 : 1.18,
            spaceAfter: i === 0 ? 12 : 0,
          })),
          characterStyles: [
            { start: 0, end: over.length, font: "Replica LL", uppercase: true },
          ],
        },
      );
    }
    {
      const d = design(
        "bilderslider",
        "Bilder-Slider",
        3,
        "Titelbild, linker Bildwinkel mit drei Fotos und eine offene Schlussfolie mit angeschnittenem Bild.",
        ["Übertitel und Titel auf Slide 1", "vier Bildplätze"],
      );
      const cover = d.photo(0, "Hintergrundfoto 1 – Impression 1");
      d.angle(1, cover, 0, -200, 780, 1750);
      const inset = (page, label, x, y, w, h) => {
        d.shape(page, `Rahmen ${label}`, x - 10, y - 10, w + 20, h + 20, paper);
        d.photo(page, label, x, y, w, h);
      };
      inset(0, "Bildbrücke 1 – Impression 2", 900, 300, 840, 420);
      inset(1, "Detail 1", 110, 900, 760, 340);
      inset(1, "Bildbrücke 2", 850, 260, 480, 600);
      d.gradient(0, "Verlauf hinter Logo", 0, 500, 1, 0);
      d.gradient(0, "Verlauf hinter Titel", 260, 1090, 0, 1);
      d.logo(0);
      d.heading(
        0,
        "KONZERT – RÜCKBLICK",
        "EIN ABEND.\nVIELE MOMENTE.",
        "",
        760,
        100,
        390,
      );
    }
    return proposals;
  }
  const api = Object.freeze({ create });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWContentDrafts = api;
})(globalThis);
