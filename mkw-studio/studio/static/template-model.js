(function (root) {
  "use strict";
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const kinds = new Set([
    "text",
    "image",
    "angle",
    "gradient",
    "path",
    "shape",
    "logo",
  ]);
  const forbidden = new Set([
    "data",
    "original",
    "assetRef",
    "imageId",
    "strokeImageId",
    "imageSourceId",
    "zoom",
    "scrollX",
    "scrollY",
  ]);
  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !forbidden.has(key))
          .map(([key, v]) => [key, clean(v)]),
      );
    if (typeof value === "string" && /^(data:|blob:)/i.test(value))
      throw Error(
        "Eine Vorlage darf keine Bilddaten oder externen Bildverknüpfungen enthalten.",
      );
    return value;
  }
  const imageLayer = (o) =>
    o.type === "image" ||
    (["path", "shape"].includes(o.type) && o.fillMode === "image") ||
    (o.type === "gradient" && o.gradientFillMode === "image");
  function background(objects) {
    const images = objects.filter(imageLayer);
    return (
      [...images].sort((a, b) => {
        const score = (o) =>
          (/hintergrund|background/i.test(o.name) ? 1e12 : 0) + o.w * o.h;
        return score(b) - score(a);
      })[0]?.id || null
    );
  }
  function suggest(project) {
    if (!project.carousel) throw Error("Vorlagen werden im Designer erstellt.");
    const names = new Set();
    return project.carousel.objects.map((o) => {
      let name = String(o.name || "").trim();
      const slide = Math.max(
        1,
        Math.min(
          project.carousel.n,
          Math.floor((o.x + o.w / 2) / project.carousel.w) + 1,
        ),
      );
      if (
        !name ||
        [
          "Text",
          "Bildrahmen",
          "Bildwinkel",
          "Pfad zeichnen",
          "Form zeichnen",
        ].includes(name)
      )
        name =
          ({
            text: "Text",
            image: "Bild",
            angle: "Winkel",
            gradient: "Verlauf",
            logo: "MKW-Logo",
            path: "Pfad",
            shape: "Form",
          }[o.type] || "Ebene") +
          " · Slide " +
          slide;
      const base = name;
      let n = 1;
      while (names.has(name.toLocaleLowerCase("de"))) name = base + " " + ++n;
      names.add(name.toLocaleLowerCase("de"));
      return {
        id: o.id,
        name,
        sourceId:
          o.type === "angle"
            ? o.imageSourceId || background(project.carousel.objects)
            : null,
      };
    });
  }
  function capture(
    project,
    {
      id = crypto.randomUUID(),
      name,
      description = "",
      layers = suggest(project),
      folders = [],
    } = {},
  ) {
    const carousel = clean(project.carousel);
    if (!carousel)
      throw Error(
        "Öffne zuerst ein Design, das als Vorlage gespeichert werden soll.",
      );
    const labels = new Map(layers.map((l) => [l.id, l]));
    for (const o of carousel.objects) {
      o.name = String(labels.get(o.id)?.name || "").trim();
      if (o.type === "logo" && !["black", "white"].includes(o.source))
        o.source = "white";
    }
    const folderNames = new Map(folders.map((f) => [f.id, f.name]));
    carousel.folders = (carousel.folders || [])
      .filter((f) => carousel.objects.some((o) => o.folderId === f.id))
      .map((f) => ({
        ...f,
        name: String(folderNames.get(f.id) || f.name || "Gruppe").trim(),
      }));
    const slots = carousel.objects.map((o) => ({
      objectId: o.id,
      kind: o.type,
      sourceId:
        o.type === "angle"
          ? labels.get(o.id)?.sourceId || background(carousel.objects, o)
          : null,
    }));
    const fontRoles = new Set(
      carousel.objects
        .filter((o) => o.type === "text")
        .flatMap((o) => [
          o.font,
          ...(o.characterStyles || []).map((s) => s.font),
        ]),
    );
    return validate({
      id,
      name: name || project.meta?.title || "Neue Vorlage",
      description,
      version: 1,
      carousel,
      slots,
      fonts: (project.fonts || [])
        .filter((f) => f.custom && fontRoles.has(f.role))
        .map((f) => ({ role: f.role, displayName: f.displayName })),
    });
  }
  function validate(value) {
    if (
      !value ||
      value.version !== 1 ||
      typeof value.id !== "string" ||
      !/^[-\w]{1,160}$/.test(value.id) ||
      typeof value.name !== "string" ||
      !value.name.trim() ||
      value.name.length > 100 ||
      typeof (value.description ?? "") !== "string" ||
      (value.description || "").length > 300
    )
      throw Error("Ungültige Designvorlage.");
    const item = clean(value),
      c = item.carousel;
    if (
      !c ||
      ![c.w, c.h, c.n, c.top, c.bottom, c.left, c.right].every(
        Number.isInteger,
      ) ||
      c.w < 240 ||
      c.w > 4000 ||
      c.h < 240 ||
      c.h > 4000 ||
      c.n < 1 ||
      c.n > 20 ||
      Math.min(c.top, c.bottom, c.left, c.right) < 0 ||
      c.top + c.bottom >= c.h ||
      c.left + c.right >= c.w ||
      !/^#[\da-f]{6}$/i.test(c.bg) ||
      !Array.isArray(c.objects) ||
      c.objects.length > 500 ||
      !Array.isArray(item.slots) ||
      item.slots.length !== c.objects.length
    )
      throw Error("Die Vorlage enthält ungültige Zeichenflächen oder Ebenen.");
    const ids = new Set(),
      names = new Set();
    for (const o of c.objects) {
      if (
        typeof o.id !== "string" ||
        ids.has(o.id) ||
        !kinds.has(o.type) ||
        typeof o.name !== "string" ||
        !o.name.trim() ||
        o.name.length > 160 ||
        names.has(o.name.trim().toLocaleLowerCase("de")) ||
        ![o.x, o.y, o.w, o.h].every(Number.isFinite) ||
        o.w <= 0 ||
        o.h <= 0 ||
        o.w > 100000 ||
        o.h > 100000 ||
        Math.abs(o.x) > 100000 ||
        Math.abs(o.y) > 100000
      )
        throw Error(
          "Bitte jede Ebene eindeutig benennen und ihre Grösse prüfen.",
        );
      ids.add(o.id);
      names.add(o.name.trim().toLocaleLowerCase("de"));
    }
    const slots = new Set();
    for (const slot of item.slots) {
      const o = c.objects.find((o) => o.id === slot.objectId);
      if (!o || slots.has(slot.objectId) || slot.kind !== o.type)
        throw Error("Die Ebenenfelder passen nicht zur Vorlage.");
      slots.add(slot.objectId);
      if (
        o.type === "angle" &&
        (!slot.sourceId ||
          !c.objects.some((s) => s.id === slot.sourceId && imageLayer(s)))
      )
        throw Error(
          "Bitte für jeden Winkel ein Hintergrund-Bildfeld auswählen.",
        );
    }
    if (new TextEncoder().encode(JSON.stringify(item)).length > 2 * 1024 * 1024)
      throw Error("Die Designvorlage ist zu gross (maximal 2 MB ohne Bilder).");
    return {
      id: item.id,
      name: item.name.trim(),
      description: item.description || "",
      version: 1,
      carousel: c,
      slots: item.slots,
      fonts: (item.fonts || []).map((f) => {
        if (
          !/^MKWCustom_[a-f0-9]{32}$/.test(f.role) ||
          typeof f.displayName !== "string" ||
          f.displayName.length > 160
        )
          throw Error("Ungültige Vorlagenschrift.");
        return { role: f.role, displayName: f.displayName };
      }),
    };
  }
  function visible(o, c) {
    return (
      o.visible !== false &&
      c.folders?.find((f) => f.id === o.folderId)?.visible !== false
    );
  }
  function requirements(template) {
    return template.slots.filter((s) => {
      const o = template.carousel.objects.find((o) => o.id === s.objectId);
      return (
        (imageLayer(o) || o.strokeMode === "image") &&
        (visible(o, template.carousel) ||
          template.slots.some(
            (s) =>
              s.sourceId === o.id &&
              visible(
                template.carousel.objects.find((o) => o.id === s.objectId),
                template.carousel,
              ),
          ))
      );
    });
  }
  function instantiate(
    template,
    { name, code = "", values = {}, uid = () => crypto.randomUUID() } = {},
  ) {
    template = validate(template);
    const carousel = copy(template.carousel),
      objects = carousel.objects,
      ids = new Map(objects.map((o) => [o.id, uid()])),
      folderIds = new Map((carousel.folders || []).map((f) => [f.id, uid()])),
      images = [],
      logos = [];
    const add = (asset, collection) => {
      if (asset && !collection.some((a) => a.id === asset.id))
        collection.push(asset);
    };
    for (const o of objects) {
      const value = Object.hasOwn(values, o.id) ? values[o.id] : {};
      if (o.type === "text") {
        const old = o.text || "",
          next = value.text ?? old;
        o.text = next;
        if (next !== old) {
          o.characterStyles = (o.characterStyles || [])
            .filter((s) => s.start < next.length)
            .map((s) => ({ ...s, end: Math.min(s.end, next.length) }));
          o.textStyles = (o.textStyles || []).slice(0, next.split("\n").length);
        }
      }
      if (imageLayer(o) && value.image) {
        o.imageId = value.image.id;
        add(value.image, images);
      }
      if (o.strokeMode === "image" && value.stroke) {
        o.strokeImageId = value.stroke.id;
        add(value.stroke, images);
      }
      if (o.type === "logo") {
        if (value.logo) {
          o.source = value.logo.id;
          add(value.logo, logos);
        } else o.source = value.source || o.source || "white";
      }
      if (value.colour) {
        if (o.type === "gradient") o.color = value.colour;
        else if (o.type === "path" || o.type === "shape") o.fill = value.colour;
      }
    }
    for (const slot of template.slots.filter((s) => s.kind === "angle")) {
      const o = objects.find((o) => o.id === slot.objectId),
        source = objects.find((o) => o.id === slot.sourceId);
      if (source?.imageId) {
        o.imageId = source.imageId;
        o.imageSourceId = ids.get(source.id);
      }
    }
    for (const o of objects) {
      o.id = ids.get(o.id);
      if (o.folderId) o.folderId = folderIds.get(o.folderId);
    }
    carousel.folders = (carousel.folders || []).map((f) => ({
      ...f,
      id: folderIds.get(f.id),
      before:
        f.before?.startsWith("folder:") && folderIds.has(f.before.slice(7))
          ? "folder:" + folderIds.get(f.before.slice(7))
          : f.before?.startsWith("layer:") && ids.has(f.before.slice(6))
            ? "layer:" + ids.get(f.before.slice(6))
            : null,
    }));
    return {
      carousel,
      images,
      logos,
      name: String(name || template.name).trim(),
      code: String(code),
      templateId: template.id,
    };
  }
  function syncLinks(c) {
    for (const o of c?.objects || [])
      if (o.imageSourceId) {
        const source = c.objects.find(
          (s) => s.id === o.imageSourceId && s.type !== "angle",
        );
        if (source?.imageId) o.imageId = source.imageId;
        else if (!source) delete o.imageSourceId;
      }
  }
  function remapLinks(originals, copies) {
    const ids = new Map(originals.map((o, i) => [o.id, copies[i].id]));
    for (const o of copies)
      if (ids.has(o.imageSourceId)) o.imageSourceId = ids.get(o.imageSourceId);
    return copies;
  }
  const api = {
    remapLinks,
    capture,
    validate,
    suggest,
    requirements,
    instantiate,
    syncLinks,
    imageLayer,
    visible,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWTemplateModel = api;
})(globalThis);
