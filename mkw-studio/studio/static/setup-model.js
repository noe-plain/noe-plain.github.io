/* Portable tool settings. Projects, file handles and document assets never enter this format. */
(function (root) {
  "use strict";
  const defaults = Object.freeze({
    primaryColour: "#315bcc",
    density: "comfortable",
    guideColour: "#93a8ef",
    sponsorColour: "#ffffff",
    snapColour: "#f5a8e8",
    snapDistance: 6,
    exportFormat: "jpg",
    autoSaveFile: true,
    advanced: false,
    curvature: false,
    pdfPreset: "linkedin",
    lineHeight: 95,
    designerGrid: Object.freeze({ columns: 6, rows: 6, gap: 0 }),
    textSizes: Object.freeze({
      date: 52,
      title: 104,
      subtitle: 52,
      copyright: 32,
    }),
  });
  const sizes = ["date", "title", "subtitle", "copyright"];
  function preferences(value = {}, strict = false) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Ungültige Werkzeugeinstellungen.");
    const result = {
      ...defaults,
      textSizes: { ...defaults.textSizes },
      designerGrid: { ...defaults.designerGrid },
    };
    for (const key of Object.keys(defaults)) {
      if (!Object.hasOwn(value, key)) continue;
      const item = value[key];
      if (key === "designerGrid") {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          if (strict) throw Error("Ungültiges Designer-Raster.");
          continue;
        }
        for (const field of ["columns", "rows", "gap"]) {
          if (!Object.hasOwn(item, field)) continue;
          const min = field === "gap" ? 0 : 1,
            max = field === "gap" ? 500 : 24;
          if (
            Number.isInteger(item[field]) &&
            item[field] >= min &&
            item[field] <= max
          )
            result.designerGrid[field] = item[field];
          else if (strict) throw Error("Ungültiger Rasterwert: " + field);
        }
        continue;
      }
      if (key === "textSizes") {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          if (strict) throw Error("Ungültige Standard-Schriftgrössen.");
          continue;
        }
        for (const role of sizes)
          if (Object.hasOwn(item, role)) {
            if (
              Number.isFinite(item[role]) &&
              item[role] >= 1 &&
              item[role] <= 5000
            )
              result.textSizes[role] = item[role];
            else if (strict)
              throw Error(
                "Schriftgrössen müssen zwischen 1 und 5000 px liegen.",
              );
          }
        continue;
      }
      const valid =
        key === "density"
          ? ["comfortable", "compact"].includes(item)
          : key.endsWith("Colour")
            ? /^#[a-f0-9]{6}$/i.test(item)
            : ["advanced", "curvature", "autoSaveFile"].includes(key)
              ? typeof item === "boolean"
              : key === "snapDistance"
                ? Number.isInteger(item) && item >= 1 && item <= 40
                : key === "lineHeight"
                  ? Number.isFinite(item) && item >= 20 && item <= 300
                  : key === "exportFormat"
                    ? ["jpg", "png", "webp"].includes(item)
                    : key === "pdfPreset"
                      ? [
                          "linkedin",
                          "linkedin-square",
                          "original",
                          "compact",
                        ].includes(item)
                      : false;
      if (valid) result[key] = item;
      else if (strict) throw Error("Ungültige Einstellung: " + key);
    }
    return result;
  }
  const record = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v, max) =>
    typeof v === "string" && v.length > 0 && v.length <= max;
  const data = (v, max, png = false) =>
    typeof v === "string" &&
    v.length <= max &&
    (png
      ? /^data:image\/png;base64,[a-z0-9+/]+={0,2}$/i
      : /^data:[\w.+/-]+;base64,[a-z0-9+/]+={0,2}$/i
    ).test(v);
  function validate(input) {
    if (!record(input) || input.format !== "mkw-setup" || input.version !== 1)
      throw Error(
        "Bitte eine unterstützte MKW-Setup-Datei wählen. Eine MKW-Projektdatei enthält keine Werkzeugeinstellungen.",
      );
    if (
      !["light", "dark"].includes(input.theme) ||
      !record(input.preferences) ||
      !Array.isArray(input.fonts) ||
      !Array.isArray(input.groups) ||
      !Array.isArray(input.logos) ||
      input.fonts.length > 1000 ||
      input.groups.length > 20 ||
      input.logos.length > 600
    )
      throw Error(
        "Die Setup-Datei enthält unvollständige oder ungültige Einstellungen.",
      );
    const result = {
        format: "mkw-setup",
        version: 1,
        theme: input.theme,
        preferences: preferences(input.preferences, true),
        fonts: [],
        groups: [],
        logos: [],
      },
      fontIds = new Set(),
      logoIds = new Set();
    for (const font of input.fonts) {
      if (
        !record(font) ||
        font.custom !== true ||
        !/^MKWCustom_[a-f0-9]{32}$/.test(font.role) ||
        fontIds.has(font.role) ||
        !text(font.name, 200) ||
        !text(font.displayName, 160) ||
        (font.postscriptName !== undefined &&
          !text(font.postscriptName, 160)) ||
        !data(font.data, 28 * 1024 * 1024)
      )
        throw Error("Ungültige eigene Schrift in der Setup-Datei.");
      fontIds.add(font.role);
      result.fonts.push({
        role: font.role,
        name: font.name,
        displayName: font.displayName,
        ...(font.postscriptName ? { postscriptName: font.postscriptName } : {}),
        custom: true,
        data: font.data,
      });
    }
    for (const logo of input.logos) {
      if (
        !record(logo) ||
        !text(logo.id, 160) ||
        logoIds.has(logo.id) ||
        !text(logo.name, 200) ||
        !data(logo.data, 24 * 1024 * 1024, true) ||
        (logo.thumb && !data(logo.thumb, 2 * 1024 * 1024, true))
      )
        throw Error("Ungültiges Sponsorlogo in der Setup-Datei.");
      logoIds.add(logo.id);
      const { original, assetRef, ...asset } = logo;
      result.logos.push({ ...asset, purpose: "sponsor" });
    }
    result.groups = input.groups.map((group) => {
      if (!record(group) || !text(group.id, 160) || !Array.isArray(group.logos))
        throw Error("Ungültige Sponsorgruppe in der Setup-Datei.");
      return {
        ...group,
        enabled: group.enabled ?? true,
        logos: group.logos.map((logo) => {
          if (!record(logo))
            throw Error("Ungültige Sponsorgruppe in der Setup-Datei.");
          const { thumb, ...item } = logo;
          return { ...item, mode: item.mode ?? "auto", scale: item.scale ?? 1 };
        }),
      };
    });
    const sponsors =
      typeof module !== "undefined"
        ? require("./sponsor-model.js")
        : root.MKWSponsors;
    sponsors.validate({
      boards: [
        {
          sponsors: {
            enabled: true,
            colour: result.preferences.sponsorColour,
            height: 180,
            groups: result.groups,
          },
        },
      ],
      logos: result.logos,
    });
    const refs = new Set(
      result.groups.flatMap((group) => group.logos.map((logo) => logo.id)),
    );
    result.logos = result.logos.filter((logo) => refs.has(logo.id));
    if (Object.hasOwn(input, "templates")) {
      if (!Array.isArray(input.templates) || input.templates.length > 100)
        throw Error("Maximal 100 Designvorlagen pro Setup.");
      const model =
        typeof module !== "undefined"
          ? require("./template-model.js")
          : root.MKWTemplateModel;
      result.templates = input.templates.map(model.validate);
      if (
        new Set(result.templates.map((t) => t.id)).size !==
        result.templates.length
      )
        throw Error("Doppelte Vorlagenkennung im Setup.");
    }
    if (Object.hasOwn(input, "backgrounds")) {
      if (!Array.isArray(input.backgrounds) || input.backgrounds.length > 1)
        throw Error("Ein Setup kann höchstens ein Startbild enthalten.");
      result.backgrounds = input.backgrounds.map((image) => {
        if (
          !record(image) ||
          image.id !== "start-background" ||
          !text(image.name, 200) ||
          !data(image.data, 3 * 1024 * 1024) ||
          !/^data:image\/(jpeg|webp|png);base64,/i.test(image.data)
        )
          throw Error("Ungültiges Startbild in der Setup-Datei.");
        return { id: "start-background", name: image.name, data: image.data };
      });
    }
    const metadata = {
      ...result,
      fonts: result.fonts.map((font) => ({ ...font, data: "" })),
      logos: result.logos.map((logo) => ({
        ...logo,
        data: "",
        ...(logo.thumb ? { thumb: "" } : {}),
      })),
    };
    const bytes =
      new TextEncoder().encode(JSON.stringify(metadata)).byteLength +
      result.fonts.reduce((n, font) => n + font.data.length, 0) +
      result.logos.reduce(
        (n, logo) => n + logo.data.length + (logo.thumb?.length || 0),
        0,
      );
    if (bytes > 256 * 1024 * 1024)
      throw Error(
        "Setup-Dateien dürfen entpackt maximal 256 MB enthalten. Bitte nicht benötigte Bibliothekseinträge entfernen.",
      );
    return result;
  }
  const api = { defaults, preferences, validate };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWSetupModel = api;
})(globalThis);
