/* Pure project-file boundary. Hidden elements remain; deleted/unreferenced assets do not. */
(function (root) {
  "use strict";
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function references(project) {
    const images = new Set(),
      logos = new Set(),
      fonts = new Set();
    for (const board of project.boards || []) {
      images.add(board.imageId);
      for (const [key, element] of Object.entries(board.elements || {})) {
        if (key === "logo") {
          if (element.source && !["white", "black"].includes(element.source))
            logos.add(element.source);
        } else if (element.role) fonts.add(element.role);
      }
    }
    for (const object of project.carousel?.objects || []) {
      if (
        ["image", "angle"].includes(object.type) ||
        (object.type === "gradient" && object.gradientFillMode === "image") ||
        (["path", "shape"].includes(object.type) && object.fillMode === "image")
      )
        if (object.imageId) images.add(object.imageId);
      if (object.strokeMode === "image" && object.strokeImageId)
        images.add(object.strokeImageId);
      if (object.type === "text" && object.font) fonts.add(object.font);
    }
    return { images, logos, fonts };
  }
  function prune(project) {
    const refs = references(project);
    project.images = (project.images || []).filter((im) =>
      refs.images.has(im.id),
    );
    project.logos = (project.logos || []).filter((logo) =>
      refs.logos.has(logo.id),
    );
    for (const key of ["textOverrides", "textTypeOverrides", "familyOverrides"])
      if (project[key])
        for (const id of Object.keys(project[key]))
          if (!refs.images.has(id)) delete project[key][id];
    for (const object of project.carousel?.objects || []) {
      if (!refs.images.has(object.imageId)) delete object.imageId;
      if (!refs.images.has(object.strokeImageId)) delete object.strokeImageId;
    }
    return project;
  }
  function compact(project) {
    const refs = references(project),
      collections = {
        images: (project.images || []).filter((im) => refs.images.has(im.id)),
        logos: (project.logos || []).filter((logo) => refs.logos.has(logo.id)),
        fonts: (project.fonts || []).filter((font) =>
          refs.fonts.has(font.role),
        ),
      };
    const metadata = { ...project };
    for (const [name, items] of Object.entries(collections))
      metadata[name] = items.map(({ data, original, ...item }) => item);
    const result = copy(metadata);
    for (const [name, items] of Object.entries(collections))
      result[name].forEach((item, index) => (item.data = items[index].data));
    prune(result);
    result.fonts = (result.fonts || []).filter((font) =>
      refs.fonts.has(font.role),
    );
    // The working PNG is lossless and full resolution. Packing the raw input again is redundant.
    for (const im of result.images) delete im.original;
    delete result.exportOptions;
    delete result.toolPreferences;
    result.assetFormat = 2;
    return result;
  }
  function hydrate(project) {
    for (const im of project.images || [])
      if (!im.original) im.original = im.data;
    return project;
  }
  const api = { references, prune, compact, hydrate };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWProjectAssets = api;
})(globalThis);
