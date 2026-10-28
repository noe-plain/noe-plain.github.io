"use strict";
const MKWTemplates = (() => {
  const builtInURL =
    "static/templates/mkw-winkel-slidepost.json?v=1e279be10487";
  const builtIns = [
    {
      id: "mkw-winkel-slidepost",
      name: "MKW · Winkel-Slidepost",
      description:
        "Vier Slides mit gemeinsamem Hintergrund, Bildrahmen und drei Winkeln.",
      w: 1080,
      h: 1350,
      n: 4,
      builtIn: true,
    },
  ];
  let defaultRequest;
  function validateDesign(item, fonts = p.fonts) {
    const t = MKWTemplateModel.validate(item),
      c = t.carousel;
    validateCarousel({
      carousel: c,
      fonts: [...fonts, ...(t.fonts || [])],
      images: [],
      logos: [],
      boards: Array.from({ length: c.n }, (_, i) => ({
        carouselSlide: i,
        w: c.w,
        h: c.h,
      })),
    });
    return t;
  }
  async function list() {
    return [...builtIns, ...(await MKWTemplateStore.list())];
  }
  async function get(id) {
    if (builtIns.some((t) => t.id === id)) {
      defaultRequest ??= fetch(builtInURL)
        .then(async (response) => {
          if (!response.ok)
            throw Error(
              "Die Vorlage konnte nicht geladen werden. Bitte erneut versuchen.",
            );
          return validateDesign(await response.json());
        })
        .catch((error) => {
          defaultRequest = null;
          throw error;
        });
      return clone(await defaultRequest);
    }
    const item = await MKWTemplateStore.get(id);
    if (!item) throw Error("Diese Vorlage wurde inzwischen entfernt.");
    return validateDesign(item);
  }
  function documentFor(result, fonts = p.fonts) {
    const q = fresh(),
      c = result.carousel,
      data = makeCanvas(1, 1).toDataURL();
    const placeholder = {
      id: uid(),
      name: "Designer",
      data,
      original: data,
      width: c.w,
      height: c.h,
    };
    q.meta.title = result.name;
    q.meta.code = result.code || "";
    q.carousel = c;
    q.images = [placeholder, ...result.images];
    q.logos = result.logos;
    q.fonts = [...fonts];
    q.formats = [
      {
        w: c.w,
        h: c.h,
        top: c.top,
        bottom: c.bottom,
        left: c.left,
        right: c.right,
      },
    ];
    q.boards = Array.from({ length: c.n }, (_, i) => ({
      ...basicBoard(placeholder, c.w, c.h, q.meta),
      carouselSlide: i,
    }));
    return q;
  }
  async function create(template, fields) {
    validateDesign(template);
    const result = MKWTemplateModel.instantiate(template, fields),
      q = documentFor(result);
    const used = MKWProjectAssets.references(q).fonts;
    for (const font of template.fonts || [])
      if (used.has(font.role) && !q.fonts.some((f) => f.role === font.role))
        throw Error(
          "Die Schrift „" +
            font.displayName +
            "“ fehlt. Bitte das zugehörige MKW-Setup oder die Schrift importieren.",
        );
    validate(q);
    validateCarousel(q);
    carouselEndText();
    carouselSelection = null;
    carouselUI.ids.clear();
    carouselUI.slide = null;
    carouselUI.tool = "select";
    carouselUI.content = false;
    await MKWProjects.startDocument(q);
    MKWProjectSetup.complete();
    for (const id of [
      "startDialog",
      "projectSetup",
      "settingsDialog",
      "templateGallery",
    ])
      $("#" + id)?.close();
    carouselFit();
    status("Vorlage befüllt · im Designer weiterbearbeiten.");
    return q;
  }
  async function save(project, options, updateNames = false) {
    const template = validateDesign(
      MKWTemplateModel.capture(project, options),
      project.fonts,
    );
    const used = MKWProjectAssets.references(project).fonts,
      existingFonts = new Map(
        (await studioStoredFonts()).map((f) => [f.role, f.data]),
      );
    for (const font of project.fonts.filter(
      (f) => f.custom && used.has(f.role),
    )) {
      await studioValidateCustomFont(font, existingFonts.get(font.role));
      await studioStoreFont(font);
    }
    await MKWTemplateStore.save(template);
    await loadFonts();
    if (updateNames && project === p) {
      checkpoint();
      const names = new Map(
          template.carousel.objects.map((o) => [o.id, o.name]),
        ),
        folders = new Map(template.carousel.folders.map((f) => [f.id, f.name]));
      for (const o of p.carousel.objects) o.name = names.get(o.id);
      p.carousel.folders = (p.carousel.folders || []).filter((f) =>
        folders.has(f.id),
      );
      for (const f of p.carousel.folders || [])
        if (folders.has(f.id)) f.name = folders.get(f.id);
      changed();
    }
    document.dispatchEvent(new Event("mkw-templates-changed"));
    return template;
  }
  async function importProject(file) {
    const q = MKWProjectAssets.hydrate(await MKWProjectFile.decode(file));
    validate(q);
    validateCarousel(q);
    if (!q.carousel)
      throw Error("Bitte eine Designer-MKW-Datei als Vorlage wählen.");
    return q;
  }
  async function remove(id) {
    if (builtIns.some((t) => t.id === id))
      throw Error("Die mitgelieferte Vorlage bleibt verfügbar.");
    await MKWTemplateStore.remove(id);
    document.dispatchEvent(new Event("mkw-templates-changed"));
  }
  return {
    list,
    get,
    create,
    save,
    remove,
    importProject,
    validateDesign,
    documentFor,
  };
})();
