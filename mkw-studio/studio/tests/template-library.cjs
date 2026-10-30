const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.waitForFunction(
      () => !document.querySelector("#startTemplates").disabled,
    );
    const setup = await page.evaluate(async () => {
      const t = await MKWTemplates.get("mkw-winkel-slidepost"),
        canvas = makeCanvas(600, 800),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#38526d";
      ctx.fillRect(0, 0, 600, 800);
      const data = canvas.toDataURL(),
        photo = {
          id: uid(),
          name: "Bibliothek.png",
          data,
          original: data,
          width: 600,
          height: 800,
        },
        values = Object.fromEntries(
          t.carousel.objects
            .filter(MKWTemplateModel.imageLayer)
            .map((o) => [o.id, { image: photo }]),
        );
      await MKWTemplates.create(t, { name: "Aktuelles Projekt", values });
      window.templateTestProject = p;
      return { id: p.projectId, design: JSON.stringify(p.carousel) };
    });
    await page.evaluate(() => MKWTemplateGallery.open());
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    await page.locator("#closeTemplateGallery").click();
    assert.deepEqual(
      await page.evaluate(() => ({
        id: p.projectId,
        design: JSON.stringify(p.carousel),
      })),
      setup,
      "Opening/cancelling previews must never alter the active project or view",
    );
    const linkage = await page.evaluate(async () => {
      const source = p.carousel.objects[0],
        angle = p.carousel.objects.find((o) => o.type === "angle"),
        old = source.imageId,
        im = {
          ...p.images.find((i) => i.id === old),
          id: uid(),
          name: "Ersatz.png",
        };
      checkpoint();
      p.images.push(im);
      source.imageId = im.id;
      changed(false);
      carouselRefresh();
      const followed = p.carousel.objects
        .filter((o) => o.type === "angle")
        .every((o) => o.imageId === im.id);
      await undo();
      const undone = p.carousel.objects
        .filter((o) => o.type === "angle")
        .every((o) => o.imageId === old);
      await redo();
      const latest = p.carousel.objects.find((o) => o.id === source.id),
        linked = p.carousel.objects.find((o) => o.id === angle.id);
      carouselSelect([latest.id, linked.id]);
      carouselDuplicate();
      const copies = carouselSelected(),
        copySource = copies.find((o) => o.type === "image"),
        copyAngle = copies.find((o) => o.type === "angle");
      const remapped = copyAngle.imageSourceId === copySource.id;
      await undo();
      const selected = p.carousel.objects.find((o) => o.id === angle.id);
      await carouselImport(
        [
          new File([await (await fetch(im.data)).blob()], "Unabhängig.png", {
            type: "image/png",
          }),
        ],
        selected.id,
      );
      const detached = !p.carousel.objects.find((o) => o.id === angle.id)
        .imageSourceId;
      validate(snapshot());
      validateCarousel(snapshot());
      return { followed, undone, remapped, detached };
    });
    assert.deepEqual(linkage, {
      followed: true,
      undone: true,
      remapped: true,
      detached: true,
    });
    const saved = await page.evaluate(async () => {
      p.carousel.folders.push({
        id: "empty",
        name: "Leer",
        visible: true,
        locked: false,
      });
      const brand = p.fonts.find((f) => f.role === "Replica LL"),
        bytes = await (await fetch(brand.data)).arrayBuffer(),
        hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
      const custom = {
        ...brand,
        custom: true,
        role: "MKWCustom_" + hash.slice(0, 32),
        displayName: "Vorlagen-Schrift",
      };
      p.fonts.push(custom);
      p.carousel.objects.find((o) => o.type === "text").font = custom.role;
      const t = await MKWTemplates.save(
          p,
          { name: "Eigene Teamvorlage" },
          true,
        ),
        source = JSON.stringify(p.carousel);
      const setup = await MKWSetupSession.capture();
      window.templateTestSetup = setup;
      const decoded = await MKWProjectFile.decode(
        await MKWProjectFile.encodeDocument(setup, {
          assetCollections: ["fonts", "logos"],
        }),
      );
      return {
        name: t.name,
        templates: decoded.templates.length,
        fonts: decoded.fonts.length,
        templateFonts: decoded.templates[0].fonts.length,
        photos: JSON.stringify(decoded.templates).includes("data:image"),
        empty: p.carousel.folders.some((f) => f.id === "empty"),
        source,
        id: t.id,
      };
    });
    assert.equal(saved.templates, 1);
    assert.equal(saved.fonts, 1);
    assert.equal(saved.templateFonts, 1);
    assert.equal(saved.photos, false);
    assert.equal(saved.empty, false);
    const imports = await page.evaluate(async () => {
      const encode = async (s) =>
        new File(
          [
            await MKWProjectFile.encodeDocument(s, {
              assetCollections: ["fonts", "logos"],
            }),
          ],
          "Team.mkwsetup",
        );
      const legacy = clone(templateTestSetup);
      delete legacy.templates;
      await MKWSetupSession.importFile(await encode(legacy));
      const kept = (await MKWTemplateStore.all()).length === 1;
      const modern = clone(templateTestSetup);
      modern.templates = [];
      await MKWSetupSession.importFile(await encode(modern));
      const cleared = (await MKWTemplateStore.all()).length === 0;
      await MKWSetupSession.importFile(await encode(templateTestSetup));
      const restored = (await MKWTemplateStore.all()).length === 1;
      const before = await MKWSetupSession.capture(),
        save = MKWSponsorLibrary.save;
      let fail = true;
      MKWSponsorLibrary.save = async (...args) => {
        if (fail) {
          fail = false;
          throw Error("Test quota");
        }
        return save(...args);
      };
      let failed = false;
      try {
        await MKWSetupSession.importFile(await encode(modern));
      } catch {
        failed = true;
      } finally {
        MKWSponsorLibrary.save = save;
      }
      const after = await MKWSetupSession.capture();
      return {
        kept,
        cleared,
        restored,
        failed,
        rolledBack: JSON.stringify(before) === JSON.stringify(after),
      };
    });
    assert(
      imports.kept &&
        imports.cleared &&
        imports.restored &&
        imports.failed &&
        imports.rolledBack,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.carousel)),
      saved.source,
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector("#startTemplates").disabled,
    );
    await page.locator("#startTemplates").click();
    await page.locator(`[data-template-id="${saved.id}"]`).click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    const originalId = await page.evaluate(() => p.projectId);
    await page.locator("#closeTemplateGallery").click();
    assert.equal(await page.evaluate(() => p.projectId), originalId);
    await require("./browser.cjs").openLatestProject(page);
    await page.waitForFunction(
      () => !document.querySelector("#startDialog").open,
    );
    await page.locator("#settings").click();
    await page.locator("#settings-tab-templates").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-remove-template]").length === 1,
    );
    await page.locator("[data-remove-template]").click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".template-library-row").length === 1,
    );
    assert.equal(
      await page.evaluate(async () => (await MKWTemplateStore.all()).length),
      0,
    );
    assert.equal(await page.evaluate(() => p.meta.title), "Aktuelles Projekt");
    await page.screenshot({
      path: artifact("template-library-preserved-project.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Template library: isolated/cancelled previews, linked replacements and undo, duplicate remapping, detached angle photos, design-only setup, legacy migration, rollback, reload and deletion passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
