"use strict";
// Explicit setup operations; never read a linked file or export anything in the background.
const MKWSetupSession = (() => {
  const maxBytes = 256 * 1024 * 1024;
  async function capture() {
    const [fonts, groups, templates, backgrounds] = await Promise.all([
      studioStoredFonts(),
      MKWSponsorLibrary.groups(),
      MKWTemplateStore.all(),
      MKWStartScreen.capture(),
    ]);
    const ids = [
        ...new Set(
          groups.flatMap((group) => group.logos.map((logo) => logo.id)),
        ),
      ],
      logos = [];
    for (const id of ids) {
      const logo = await MKWSponsorLibrary.logo(id);
      if (!logo)
        throw Error(
          "Ein Sponsorlogo fehlt in der Bibliothek. Bitte die Sponsorgruppen prüfen.",
        );
      logos.push(logo);
    }
    return MKWSetupModel.validate({
      format: "mkw-setup",
      version: 1,
      theme: document.documentElement.dataset.theme,
      preferences: studioPreferences,
      fonts,
      groups,
      logos,
      templates,
      backgrounds,
    });
  }
  function persistPreferences(setup) {
    // Unlike ordinary UI editing, a setup import must report a storage failure.
    localStorage.setItem(
      "mkw-studio-preferences",
      JSON.stringify(setup.preferences),
    );
    localStorage.setItem("mkw-studio-theme", setup.theme);
  }
  async function replaceLibraries(setup) {
    await MKWStartScreen.replace(setup.backgrounds);
    await studioReplaceStoredFonts(setup.fonts);
    if (setup.templates) await MKWTemplateStore.replace(setup.templates);
    const assets = new Map(setup.logos.map((logo) => [logo.id, logo]));
    await MKWSponsorLibrary.save(
      setup.groups.map((group) => ({
        ...group,
        logos: group.logos.map((logo) => ({
          ...logo,
          thumb: assets.get(logo.id)?.thumb || assets.get(logo.id)?.data,
        })),
      })),
      setup.logos,
    );
  }
  async function syncUI(setup) {
    await MKWStartScreen.refresh(true);
    studioPreferences = MKWSetupModel.preferences(setup.preferences, true);
    studioSetTheme(setup.theme);
    studioApplyPreferences();
    const used = MKWProjectAssets.references(p).fonts,
      incoming = new Set(setup.fonts.map((font) => font.role));
    p.fonts = p.fonts.filter(
      (font) => !font.custom || used.has(font.role) || incoming.has(font.role),
    );
    for (const role of incoming) studioRemovedFonts.delete(role);
    await loadFonts();
    await sponsorLoadGroups(true);
    studioRenderFontSettings();
    $("#fontImportStatus").textContent = "";
    if (!$("#settings-panel-sponsors").hidden) await sponsorRenderSettings();
    document.dispatchEvent(new Event("mkw-templates-changed"));
    if (p.carousel) carouselPanel();
    else renderPanel();
  }
  async function rollback(before) {
    await replaceLibraries(before.snapshot);
    persistPreferences(before.snapshot);
    await MKWSetupStore.finish(before.link);
    await syncUI(before.snapshot);
  }
  async function recover() {
    const before = await MKWSetupStore.pending();
    if (!before) return false;
    await rollback(before);
    return true;
  }
  async function validateResources(setup) {
    await MKWStartScreen.validate(setup.backgrounds);
    for (const template of setup.templates || []) {
      MKWTemplates.validateDesign(template, setup.fonts);
      for (const font of template.fonts || [])
        if (!setup.fonts.some((f) => f.role === font.role))
          throw Error(
            "Die Vorlage „" +
              template.name +
              "“ benötigt „" +
              font.displayName +
              "“. Bitte die Schrift unter Einstellungen → Schriften hinzufügen oder die Vorlage entfernen.",
          );
    }
    const existingFonts = new Map(
      (await studioStoredFonts()).map((font) => [font.role, font.data]),
    );
    for (const font of setup.fonts)
      await studioValidateCustomFont(font, existingFonts.get(font.role));
    for (const logo of setup.logos) {
      let bitmap;
      try {
        bitmap = await createImageBitmap(await (await fetch(logo.data)).blob());
        if (
          bitmap.width !== logo.width ||
          bitmap.height !== logo.height ||
          bitmap.width > 4096 ||
          bitmap.height > 4096
        )
          throw Error();
      } catch {
        throw Error(
          "Dieses Setup-Logo kann nicht gelesen werden: " + logo.name,
        );
      } finally {
        bitmap?.close();
      }
    }
  }
  async function apply(setup, link) {
    const resume = MKWStartScreen.pause();
    try {
      await MKWStartScreen.settled();
      await applySettings(setup, link);
    } finally {
      resume();
    }
  }
  async function applySettings(setup, link) {
    setup = MKWSetupModel.validate(setup);
    await validateResources(setup);
    const before = {
      snapshot: await capture(),
      link: await MKWSetupStore.link(),
    };
    await MKWSetupStore.begin(before);
    try {
      await replaceLibraries(setup);
      persistPreferences(setup);
      await MKWSetupStore.finish(link);
    } catch (error) {
      try {
        await rollback(before);
      } catch {
        throw Error(
          "Die Setup-Übernahme wurde unterbrochen. Bitte die Seite neu laden, damit die bisherigen Einstellungen wiederhergestellt werden.",
        );
      }
      throw error;
    }
    await syncUI(setup);
  }
  async function importFile(file, handle = null) {
    const setup = MKWSetupModel.validate(
      await MKWProjectFile.decode(file, { maxBytes }),
    );
    const link = {
      name: file.name,
      size: file.size,
      modified: file.lastModified,
      updatedAt: Date.now(),
      ...(handle ? { handle } : {}),
    };
    await apply(setup, link);
    return link;
  }
  async function exportFile(handle) {
    const setup = await capture();
    await validateResources(setup);
    await writeSaveFile(
      handle,
      await MKWProjectFile.encodeDocument(setup, {
        assetCollections: ["fonts", "logos", "backgrounds"],
      }),
      "MKW-Studio.mkwsetup",
    );
    return setup;
  }
  return { capture, importFile, exportFile, recover };
})();
