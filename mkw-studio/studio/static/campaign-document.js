"use strict";
/* Imports and transactions for campaign projects; Designer rendering remains authoritative. */
const MKWCampaignDocument = (() => {
  const rowGap = 320;
  const active = () => !!p.campaign;
  const base = (type, a, values = {}) => ({
    id: uid(),
    type,
    name: {
      image: "Hintergrundbild",
      logo: "MKW Logo",
      text: "Text",
      gradient: "Verlauf",
      angle: "Bildwinkel",
    }[type],
    x: a.x,
    y: a.y,
    w: a.w,
    h: a.h,
    opacity: 1,
    visible: true,
    locked: false,
    artboardScoped: true,
    pageId: a.id,
    angle: 0,
    rotation: 90,
    scale: 1,
    panX: 0,
    panY: 0,
    flipX: 1,
    flipY: 1,
    text: "",
    size: 70,
    font: "Replica LL",
    color: "#ffffff",
    textAlign: "left",
    textAnchor: "top",
    lineHeight: 0.95,
    blend: "source-over",
    startAlpha: 1,
    endColor: "#000000",
    endAlpha: 1,
    kind: "linear",
    direction: "left",
    thickness: 150,
    glow: 50,
    glowColor: "#ffffff",
    glowAlpha: 0.6,
    ...values,
  });
  function newState() {
    return { version: 1, rows: [], links: [] };
  }
  function rowFor(page, q = p) {
    return q.campaign?.rows.find((r) => r.pages.includes(page));
  }
  function candidate() {
    return {
      ...p,
      images: [...p.images],
      boards: clone(p.boards),
      carousel: p.carousel ? clone(p.carousel) : undefined,
      campaign: clone(p.campaign),
    };
  }
  function sync() {
    if (!active() || !p.carousel) return;
    const q = {
      ...p,
      carousel: clone(p.carousel),
      campaign: clone(p.campaign),
    };
    try {
      MKWCampaignModel.reconcile(q, uid);
      validate(q);
      validateCarousel(q);
    } catch (error) {
      status("Verknüpfung nicht aktualisiert: " + error.message);
      return;
    }
    const objects = new Map(p.carousel.objects.map((o) => [o.id, o]));
    p.carousel.objects = q.carousel.objects.map((next) => {
      const o = objects.get(next.id);
      if (!o) return next;
      for (const k of Object.keys(o)) if (!(k in next)) delete o[k];
      Object.assign(o, next);
      return o;
    });
    p.campaign = q.campaign;
  }
  function room(type, a) {
    if (!active() || !a || type === "image") return carouselCanAddObjects(1);
    const peers = p.carousel.artboards.filter(
        (f) => f.w === a.w && f.h === a.h,
      ),
      first = peers[0];
    const count =
      first?.id === a.id && type !== "gradient"
        ? peers.length
        : first?.id === a.id &&
            type === "gradient" &&
            !p.carousel.objects.some(
              (o) => o.pageId === a.id && o.type === "gradient",
            )
          ? peers.length
          : 1;
    if (p.carousel.objects.length + count > 500) {
      status(
        `Diese Änderung benötigt ${count} freie Ebenen. Eine Kampagne unterstützt maximal 500 Ebenen.`,
      );
      return false;
    }
    return true;
  }
  function place(q) {
    const c = q.carousel;
    let y = 160,
      column = 0,
      columnWidth = 0;
    for (const row of q.campaign.rows) {
      const frames = row.pages.map((id) =>
        c.artboards.find((a) => a.id === id),
      );
      const height = Math.max(...frames.map((a) => a.h)),
        width = 1000 + frames.reduce((sum, a) => sum + a.w + 200, 0);
      if (y && y + height > 100000) {
        column += columnWidth + 500;
        columnWidth = 0;
        y = 160;
      }
      if (column + width > 100000)
        throw Error(
          "Die Montagefläche ist voll. Verwende weniger Bilder oder Formate.",
        );
      let x = column + 1000;
      for (const a of frames) {
        const dx = x - a.x,
          dy = y - a.y;
        for (const o of c.objects)
          if (o.pageId === a.id) {
            o.x += dx;
            o.y += dy;
          }
        a.x = x;
        a.y = y;
        x += a.w + 200;
      }
      y += height + rowGap;
      columnWidth = Math.max(columnWidth, width);
    }
    c.artboards = q.campaign.rows.flatMap((r) =>
      r.pages.map((id) => c.artboards.find((a) => a.id === id)),
    );
    const boards = new Map(q.boards.map((b) => [b.campaignPage, b]));
    q.boards = c.artboards.map((a, i) => ({
      ...boards.get(a.id),
      carouselSlide: i,
    }));
    c.n = c.artboards.length;
    c.pageStructure.groups = c.artboards.map((a) => [a.id]);
    c.pageStructure.artboardInfo = c.artboards.map((a) => ({
      id: "campaign-" + a.id,
      name: a.name,
    }));
  }
  async function append(q, im, boards) {
    if ((q.carousel?.n || 0) + boards.length > 200)
      throw Error("Maximal 200 Ausgaben pro Kampagne.");
    const formats = boards.map((b) => {
      const safe = MKWLayout.safeRect({ ...b, sponsors: undefined });
      return {
        w: b.w,
        h: b.h,
        top: Math.round(safe.top),
        bottom: Math.round(safe.bottom),
        left: Math.round(safe.left),
        right: Math.round(safe.right),
      };
    });
    if (formats.some((f) => !MKWCarouselPolicy.validFormat(f)))
      throw Error(
        "FD-Kampagnen unterstützt Formate von 240–4000 px. Passe grössere Formate im bisherigen Modus an.",
      );
    q.carousel ??= {
      ...formats[0],
      bg: "#ffffff",
      layout: "free",
      n: 0,
      objects: [],
      artboards: [],
      pageStructure: {
        version: 1,
        mode: "single",
        shuffle: false,
        binding: "left",
        gap: 320,
        bleed: 0,
        startNumber: 1,
        groups: [],
        artboardInfo: [],
      },
    };
    const row = { imageId: im.id, pages: [], family: false, direction: "left" };
    q.campaign.rows.push(row);
    const logo = await image("mkw-logo-bold-neg.svg");
    for (const [i, b] of boards.entries()) {
      const a = {
        ...formats[i],
        id: uid(),
        name: `${im.name} · ${MKW.ratio(b.w, b.h)}`
          .slice(0, 80)
          .replace(/[\uD800-\uDBFF]$/, ""),
        x: 0,
        y: 0,
        bg: b.family?.enabled ? b.family.background : b.bg,
      };
      q.carousel.artboards.push(a);
      row.pages.push(a.id);
      b.campaignPage = a.id;
      q.boards.push(b);
      const fit = Math.max(a.w / im.width, a.h / im.height),
        t = b.image;
      q.carousel.objects.push(
        base("image", a, {
          campaignRole: "background",
          imageId: im.id,
          scale: t.scale / fit,
          panX: t.x - a.w / 2,
          panY: t.y - a.h / 2,
          flipX: t.flipX,
          flipY: t.flipY,
          angle: t.angle,
        }),
      );
      const e = b.elements.logo,
        lw = e.visible ? e.size : Math.min(600, a.w - a.left - a.right),
        source = e.visible ? e.source : "white";
      q.carousel.objects.push(
        base("logo", a, {
          campaignRole: "logo",
          name: "MKW Logo",
          x: e.visible ? e.x : a.w - a.right - lw,
          y: e.visible ? e.y : a.top,
          w: lw,
          h: (lw * logo.height) / logo.width,
          source,
          angle: e.angle || 0,
        }),
      );
      if (row.family || b.family?.enabled) row.family = true;
      if (b.angle?.enabled) {
        const geometry = MKWPostAngle.geometry(b),
          g = geometry.o,
          bg = q.carousel.objects.find(
            (o) => o.pageId === a.id && o.campaignRole === "background",
          );
        q.carousel.objects.push(
          base("angle", a, {
            ...g,
            x: a.x + g.x,
            y: a.y + g.y,
            campaignRole: "angle",
            campaignLocal: true,
            imageId: im.id,
            imageSourceId: bg.id,
            scale: 1.12,
            panX: 24,
            panY: -24,
          }),
        );
        row.angle = true;
        row.direction = b.angle.direction;
      }
    }
    place(q);
  }
  async function importPhotos(files) {
    if (busy || !files.length) return;
    busy = true;
    const q = candidate();
    let added = 0;
    const failures = [];
    $("#importDialog").showModal();
    const finish = MKWUIControls.loading("#importExplanation");
    MKWSubject.beginBatch();
    try {
      for (const [index, file] of [...files].entries()) {
        showImportStage(index, files.length, file.name, 0);
        try {
          if (file.size > 100 * 1024 * 1024)
            throw Error("Maximal 100 MB pro Bild.");
          const normalized = await (await api("/api/import", file)).json(),
            im = {
              ...normalized,
              id: uid(),
              name: file.name,
              original: normalized.data,
            };
          await image(im.data);
          showImportStage(index, files.length, file.name, 1);
          try {
            im.people = await MKWSubject.detect(im);
          } catch {
            im.people = [];
          }
          const next = {
            ...q,
            boards: clone(q.boards),
            images: [...q.images, im],
            carousel: q.carousel ? clone(q.carousel) : undefined,
            campaign: clone(q.campaign),
          };
          const boards = (q.formats || MKWFormats.defaults().slice(0, 2)).map(
            (f) => {
              const b = basicBoard(im, f.w, f.h, q.meta);
              b.safe = MKWFormats.safe(f);
              MKWSubject.crop(b, im);
              return b;
            },
          );
          await append(next, im, boards);
          MKWCampaignModel.reconcile(next, uid);
          validate(next);
          validateCarousel(next);
          Object.assign(q, next);
          added++;
          showImportStage(index, files.length, file.name, 2);
        } catch (error) {
          failures.push(file.name + ": " + error.message);
        }
      }
      if (added) {
        checkpoint();
        p.images = q.images;
        p.boards = q.boards;
        p.carousel = q.carousel;
        p.campaign = q.campaign;
        carouselUI.ids.clear();
        carouselSelection = null;
        carouselUI.slide = 0;
        changed();
        MKWCampaignUI.fit();
      }
      status(
        `${added} Bilder importiert${failures.length ? " · " + failures.join(" · ") : ""}`,
      );
    } finally {
      finish();
      $("#importDialog").close();
      busy = false;
      $("#files").value = "";
    }
    if (failures.length)
      await MKWFeedback.ask({
        title: "Nicht alle Bilder importiert",
        message: failures.join("\n"),
      });
  }

  return {
    rowGap,
    base,
    newState,
    rowFor,
    candidate,
    sync,
    room,
    place,
    append,
    importPhotos,
  };
})();
