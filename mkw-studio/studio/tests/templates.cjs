const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1050 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startTemplates").waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.querySelector("#startTemplates").disabled,
    );
    assert(
      !requests.some((r) => r.includes("/static/templates/")),
      "No template downloads on startup",
    );
    await page.locator("#startNew").click();
    assert.equal(await page.locator("[data-project-mode]").count(), 2);
    assert.deepEqual(
      await page
        .locator("[data-project-mode] svg")
        .evaluateAll((nodes) => nodes.map((el) => el.dataset.googleIcon)),
      ["image", "shapes"],
    );
    await page.locator('[data-project-mode="carousel"]').click();
    await page.locator("#setupName").fill("Designer-Vorlage");
    await page.screenshot({
      path: artifact("designer-setup-icons.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 500, height: 950 });
    assert(
      await page
        .locator("#projectSetup")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.screenshot({
      path: artifact("designer-setup-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1450, height: 1050 });
    await page.locator("#designerTemplateStart").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    assert.equal(
      await page.locator("#templateProjectName").inputValue(),
      "Designer-Vorlage",
    );
    await page.locator("#closeTemplateGallery").click();
    assert(await page.locator("#projectSetup").isVisible());
    await page.locator('[data-project-mode="post"]').click();
    assert(!(await page.locator("#designerTemplateStart").isVisible()));
    await page.locator("#cancelSetup").click();
    await page.locator("#startTemplates").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    await page.waitForFunction(
      () =>
        !!document
          .querySelector(".template-card-preview img")
          ?.getAttribute("src"),
    );
    assert.equal(
      await page.locator("[data-template-upload][data-channel=image]").count(),
      5,
    );
    assert.equal(await page.locator(".template-linked").count(), 3);
    await page.waitForFunction(
      () =>
        !!document
          .querySelector(".template-artwork-slide img")
          ?.getAttribute("src"),
    );
    const previewBounds = await page
        .locator("#templateLivePreview")
        .boundingBox(),
      fieldsBounds = await page
        .locator(".template-content-fields")
        .boundingBox();
    assert(
      previewBounds.x >= fieldsBounds.x + fieldsBounds.width,
      "Preview sits to the right of filling fields",
    );
    await page.locator('[data-preview-slide="3"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("#templatePreviewCount").textContent ===
          "4 / 4" &&
        !!document
          .querySelectorAll(".template-artwork-slide img")[3]
          ?.getAttribute("src"),
    );
    await page.locator('[data-preview-step="-1"]').click();
    assert.equal(
      await page.locator("#templatePreviewCount").textContent(),
      "3 / 4",
    );
    await page.locator("#templateGallery").evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({
      path: artifact("templates-gallery.png"),
      fullPage: true,
    });
    await page.locator("#templateProjectName").fill("Vorlage Test");
    await page.locator("#templateProjectCode").fill("T1");
    await page.locator("#templateCreate").click();
    assert.match(
      await page.locator("#templateStatus").textContent(),
      /markierten/,
    );
    const buffer = await page.evaluate(() => {
      const c = makeCanvas(900, 900),
        x = c.getContext("2d");
      x.fillStyle = "#af4331";
      x.fillRect(0, 0, 900, 900);
      x.fillStyle = "#69b6a1";
      x.fillRect(400, 0, 500, 900);
      return c.toDataURL().split(",")[1];
    });
    for (const input of await page
      .locator("[data-template-upload][data-channel=image]")
      .all()) {
      await input.setInputFiles({
        name: "Foto.png",
        mimeType: "image/png",
        buffer: Buffer.from(buffer, "base64"),
      });
      await page.waitForFunction(
        () => !document.querySelector("#templateCreate").disabled,
      );
    }
    const oldPreview = await page
      .locator(".template-artwork-slide img")
      .first()
      .getAttribute("src");
    await page.locator("[data-template-text]").fill("Ein neuer Titel");
    await page.waitForFunction((old) => {
      const img = document.querySelector(".template-artwork-slide img");
      return (
        document.querySelector("#templatePreviewCount").textContent ===
          "1 / 4" &&
        img?.src &&
        img.getAttribute("src") !== old &&
        document.querySelector(".template-preview-status").textContent === ""
      );
    }, oldPreview);
    const livePreview = await page
      .locator(".template-artwork-slide img")
      .first()
      .getAttribute("src");
    await page.screenshot({
      path: artifact("templates-filled.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      const start = MKWProjects.startDocument;
      MKWProjects.startDocument = async (document) => {
        await new Promise(
          (resolve) =>
            (window.finishTemplateCreation = () => {
              MKWProjects.startDocument = start;
              resolve();
            }),
        );
        return start(document);
      };
    });
    await page.locator("#templateCreate").click();
    await page.waitForFunction(
      () => typeof window.finishTemplateCreation === "function",
    );
    assert(await page.locator("#closeTemplateGallery").isDisabled());
    assert(await page.locator("[data-template-text]").isDisabled());
    await page.keyboard.press("Escape");
    assert(await page.locator("#templateGallery").isVisible());
    await page.evaluate(() => finishTemplateCreation());
    await page.waitForFunction(
      () =>
        p.carousel?.n === 4 && !document.querySelector("#templateGallery").open,
    );
    const result = await page.evaluate(async () => {
      validate(snapshot());
      validateCarousel(snapshot());
      const angles = p.carousel.objects.filter((o) => o.type === "angle"),
        source = p.carousel.objects.find(
          (o) => o.id === angles[0].imageSourceId,
        );
      const packed = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      return {
        name: p.meta.title,
        count: p.carousel.objects.length,
        photos: p.images.length,
        linked: angles.every((o) => o.imageId === source.imageId),
        text: p.carousel.objects.find((o) => o.type === "text").text,
        roundtrip: packed.carousel.objects.length,
      };
    });
    assert.deepEqual(result, {
      name: "Vorlage Test",
      count: 11,
      photos: 6,
      linked: true,
      text: "Ein neuer Titel",
      roundtrip: 11,
    });
    const projectBeforeBrowse = await page.evaluate(() => p.projectId);
    await page.locator("#carouselTemplates").click();
    assert(await page.locator("#templateGallery").isVisible());
    await page.locator("#closeTemplateGallery").click();
    assert.equal(await page.evaluate(() => p.projectId), projectBeforeBrowse);
    const parity = await page.evaluate(async (src) => {
      const c = p.carousel,
        scale = Math.min(420 / c.w, 520 / c.h),
        canvas = makeCanvas(Math.ceil(c.w * scale), Math.ceil(c.h * scale));
      await carouselPaint(exportContext(canvas), 0, scale);
      return canvas.toDataURL("image/png") === src;
    }, livePreview);
    assert(
      parity,
      "The filled live preview uses the same geometry, typography and pixels as the Designer renderer",
    );
    await page.locator("#save").click();
    await page.locator("#saveTemplate").click();
    await page.locator("#templateSaveName").fill("Team Vorlage");
    const nameInputs = page.locator("[data-template-name]"),
      oldName = await nameInputs.nth(1).inputValue();
    await nameInputs.nth(1).fill(await nameInputs.first().inputValue());
    await page.locator("#templateSaveConfirm").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#templateSaveStatus")
        .textContent.includes("eindeutig"),
    );
    assert(await page.locator("#templateSaveDialog").isVisible());
    await nameInputs.nth(1).fill(oldName);
    await page.locator("#templateSaveConfirm").click();
    await page.waitForFunction(
      () => !document.querySelector("#templateSaveDialog").open,
    );
    const saved = await page.evaluate(async () => {
      const s = await MKWSetupSession.capture(),
        t = s.templates[0];
      return {
        count: s.templates.length,
        name: t.name,
        hasPhoto: JSON.stringify(t).includes("data:image"),
        ids: t.carousel.objects.map((o) => o.id),
        order: p.carousel.objects.map((o) => o.id),
      };
    });
    assert.equal(saved.count, 1);
    assert.equal(saved.name, "Team Vorlage");
    assert.equal(saved.hasPhoto, false);
    assert.deepEqual(saved.ids, saved.order);
    await page.locator("#closeSave").click();
    await page.locator("#settings").click();
    await page.locator("#settings-tab-templates").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".template-library-row").length === 2,
    );
    await page.screenshot({
      path: artifact("templates-settings.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Templates: lazy gallery, all layer fields, shared background photos, fresh Designer, MKW roundtrip and image-free setup passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
