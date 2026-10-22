const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await require("./browser.cjs").launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Slices und Ebenen");
    await page.locator("#setupCode").fill("SL");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    assert.equal(await page.evaluate(() => p.carousel.bg), "#ffffff");
    assert.equal(await page.locator("header .project-fields").count(), 0);
    assert.equal(
      await page
        .locator(
          ".carousel-contextbar #toolsToggle,.carousel-contextbar #footerGuides,.carousel-contextbar #footerSnap",
        )
        .count(),
      0,
    );
    assert.equal(
      await page
        .locator("footer #toolsToggle,footer #footerGuides,footer #footerSnap")
        .count(),
      3,
    );
    const tools = await page
      .locator(".carousel-toolrail button")
      .evaluateAll((buttons) => buttons.map((button) => button.dataset.tool));
    assert.equal(tools.indexOf("angle"), tools.indexOf("image") + 1);
    assert(!tools.includes("content"));
    await page.evaluate(async () => {
      const canvas = makeCanvas(200, 100),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#d84935";
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = "#346bcc";
      ctx.fillRect(100, 0, 100, 100);
      const data = canvas.toDataURL();
      await image(data);
      const im = {
        id: uid(),
        name: "Farben.png",
        width: 200,
        height: 100,
        data,
        original: data,
      };
      p.images.push(im);
      carouselObject("image", {
        x: 100,
        y: 300,
        w: 1600,
        h: 800,
        imageId: im.id,
        name: "Bild über zwei Slides",
      });
    });
    const imageId = await page.evaluate(() => carouselSelection);
    assert.equal(
      await page
        .locator("[data-prop=scale],[data-prop=flipX],[data-prop=flipY]")
        .count(),
      0,
    );
    await page.locator("[data-flip=flipX]").click();
    assert.equal(await page.evaluate(() => carouselSelected()[0].flipX), -1);
    assert.equal(
      await page.locator("[data-flip=flipX]").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("[data-flip=flipX]").click();
    await page.locator("[data-flip=flipY]").click();
    assert.equal(await page.evaluate(() => carouselSelected()[0].flipY), -1);
    await page.locator("[data-flip=flipY]").click();
    for (const slot of [1, 3, 5, 7])
      await page.locator(`[data-frame-slot="${slot}"]`).click();
    assert.equal(
      await page.locator(".frame-point-choice[aria-pressed=true]").count(),
      8,
    );
    await page.evaluate(() => {
      const o = carouselSelected()[0],
        base = clone(o),
        points = carouselFramePoints(o).map((point) => ({
          x: o.x + point.x * o.w,
          y: o.y + point.y * o.h,
        }));
      points[3].x -= 150;
      carouselSetImageFrame(o, base, points);
      changed(false);
    });
    const point = async (x, y) =>
      page.evaluate(
        ([x, y]) => {
          const r = document
            .querySelector("#carouselCanvas")
            .getBoundingClientRect();
          return { x: r.left + x * carouselZoom, y: r.top + y * carouselZoom };
        },
        [x, y],
      );
    const pt = await point(700, 800);
    await page.mouse.dblclick(pt.x, pt.y);
    assert.equal(await page.evaluate(() => carouselUI.content), true);
    assert.equal(
      await page
        .locator("button[data-tool=select]")
        .getAttribute("aria-pressed"),
      "true",
    );
    const oldX = await page.evaluate(() => carouselSelected()[0].panX);
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.move(pt.x + 25, pt.y + 10, { steps: 5 });
    await page.mouse.up();
    assert.notEqual(
      await page.evaluate(() => carouselSelected()[0].panX),
      oldX,
    );
    assert.equal(await page.evaluate(() => carouselSelected()[0].x), 100);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => carouselUI.content), false);
    assert.equal(await page.evaluate(() => carouselSelection), imageId);
    await page.evaluate(() => {
      const im = p.images.find((im) => im.name === "Farben.png");
      carouselObject("angle", {
        x: 200,
        y: 0,
        w: 400,
        h: 800,
        imageId: im.id,
        name: "Winkelbild",
      });
    });
    assert.equal(await page.locator("[data-flip]").count(), 2);
    assert.equal(await page.locator("[data-prop=scale]").count(), 0);
    await page.locator("[data-flip=flipX]").click();
    assert.equal(await page.evaluate(() => carouselSelected()[0].flipX), -1);
    await page.evaluate(() => {
      carouselObject("gradient", {
        x: 0,
        y: 600,
        w: 2160,
        h: 750,
        name: "Kontrast",
      });
      carouselObject("text", {
        x: 180,
        y: 850,
        w: 700,
        h: 300,
        text: "TITEL\nUntertitel",
        size: 80,
        textStyles: [
          { size: 80, leading: [76] },
          { size: 40, leading: [38] },
        ],
        name: "Bearbeitbarer Text",
      });
      carouselObject("gradient", {
        x: 1200,
        y: 100,
        w: 200,
        h: 200,
        color: "#00ff00",
        name: "Versteckt",
        visible: false,
      });
    });
    const hash = () =>
      page.evaluate(async () => {
        const canvas = makeCanvas(p.carousel.w * p.carousel.n, p.carousel.h);
        await carouselPaint(canvas.getContext("2d"));
        return [
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              canvas
                .getContext("2d")
                .getImageData(0, 0, canvas.width, canvas.height).data,
            ),
          ),
        ].join(",");
      });
    const before = await hash();
    await page.locator("#settings").click();
    await page.locator("[data-theme-choice=light]").click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    await page.locator("#settings-tab-guides").click();
    await page.locator("#guideColour").fill("#1c8e5b");
    await page.locator("#snapColour").fill("#ea4156");
    await page.locator("#snapDistance").fill("2");
    assert.equal(
      await page.evaluate(() => studioPreferences.snapDistance),
      2,
      "Snap preference applies immediately while typing",
    );
    await page.locator("#snapDistance").press("Tab");
    const snapAt = () =>
      page.evaluate(() => {
        const zoom = carouselZoom;
        carouselZoom = 1;
        try {
          return carouselNearestSnap([110], [100])?.delta ?? null;
        } finally {
          carouselZoom = zoom;
        }
      });
    assert.equal(await snapAt(), null);
    await page.locator("#snapDistance").fill("12");
    await page.locator("#snapDistance").press("Tab");
    assert.equal(await snapAt(), -10);
    await page.locator("#settings-tab-export").click();
    await page.locator("#defaultExportFormat").selectOption("png");
    await page.locator("#closeSettings").click();
    assert.equal(await hash(), before);
    assert.equal(
      await page
        .locator(".artwork-safe")
        .evaluate((el) => getComputedStyle(el).borderColor),
      "rgb(28, 142, 91)",
    );
    await page.locator("#carouselExport").click();
    assert.equal(await page.locator("#exportFormat").inputValue(), "png");
    await page.locator("#closeExport").click();
    const panel = await page
      .locator("#carouselSidebar")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    assert(
      panel
        .match(/\d+/g)
        .slice(0, 3)
        .every((channel) => Number(channel) > 240),
      "Light inspector must use a bright surface",
    );
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-light-editor.png"),
    });
    await page.locator("#footerGuides").click();
    assert(await page.locator("#carouselGuides").isHidden());
    await page.locator("#footerGuides").click();
    await page.locator("#footerSnap").click();
    assert.equal(await page.evaluate(() => carouselUI.snap), false);
    await page.locator("#footerSnap").click();
    await page.locator("#toolsToggle").click();
    assert(await page.locator("#carouselSidebar").isHidden());
    await page.locator("#toolsToggle").click();
    await page.locator("#save").click();
    assert(await page.locator("#savePSD").isVisible());
    await page.locator("#projectName").fill("Benannt beim Speichern");
    await page.locator("#projectCode").fill("NEU");
    assert((await page.locator("#saveName").inputValue()).includes("NEU"));
    assert((await page.locator("#saveName").inputValue()).includes("Benannt"));
    await page.locator("#closeSave").click();
    const psd = await page.evaluate(async () => {
      const blob = await buildPSD(),
        data = agPsd.readPsd(await blob.arrayBuffer());
      const flat = (children) =>
          children.flatMap((layer) => [layer, ...flat(layer.children || [])]),
        layers = flat(data.children),
        ctx = data.canvas.getContext("2d");
      const expected = makeCanvas(data.width, data.height);
      await carouselPaint(exportContext(expected));
      const a = ctx.getImageData(0, 0, data.width, data.height).data,
        b = expected
          .getContext("2d")
          .getImageData(0, 0, data.width, data.height).data;
      let difference = 0;
      for (let i = 0; i < a.length; i++)
        difference = Math.max(difference, Math.abs(a[i] - b[i]));
      return {
        width: data.width,
        height: data.height,
        slices: data.imageResources.slices[0].slices.map((s) => ({
          name: s.name,
          bounds: s.bounds,
        })),
        artboards: data.artboards || null,
        texts: layers
          .filter((l) => l.text)
          .map((l) => ({ text: l.text.text, size: l.text.style.fontSize })),
        hidden: layers.find((l) => l.name === "Versteckt").hidden,
        top: data.children.at(-1).name,
        multiply: layers.find((l) => l.name === "Kontrast").blendMode,
        opacity: layers.find((l) => l.name === "Kontrast").opacity,
        difference,
      };
    });
    assert.equal(psd.width, 2160);
    assert.equal(psd.height, 1350);
    assert.equal(psd.artboards, null);
    assert.deepEqual(
      psd.slices.map((s) => s.bounds),
      [
        { left: 0, top: 0, right: 1080, bottom: 1350 },
        { left: 1080, top: 0, right: 2160, bottom: 1350 },
      ],
    );
    assert(psd.slices.every((s) => s.name.includes("NEU")));
    assert.equal(psd.top, "MKW Logo");
    assert.equal(psd.hidden, true);
    assert.equal(psd.multiply, "multiply");
    assert(Math.abs(psd.opacity - 0.39) < 0.004);
    assert(psd.texts.some((t) => t.text.trim() === "TITEL" && t.size === 80));
    assert(
      psd.texts.some((t) => t.text.trim() === "Untertitel" && t.size === 40),
    );
    assert.equal(psd.difference, 0);
    await page.locator("#save").click();
    await page.evaluate(() => (window.showSaveFilePicker = undefined));
    const download = page.waitForEvent("download");
    await page.locator("#savePSD").click();
    await (
      await download
    ).saveAs(require("./browser.cjs").artifact("mkw-carousel-slices.psd"));
    await page.waitForFunction(() => !busy);
    assert(
      (await page.locator("#psdStatus").textContent()).includes("Slide-Slices"),
    );
    await page.locator("#closeSave").click();
    const tooLarge = await page.evaluate(async () => {
      const width = p.carousel.w;
      p.carousel.w = 20000;
      try {
        await buildPSD();
        return false;
      } catch (error) {
        return error.message.includes("zu gross");
      } finally {
        p.carousel.w = width;
      }
    });
    assert.equal(tooLarge, true);
    await page.evaluate(() => autosave());
    await page.reload();
    await page.locator("#startContinue").click();
    await page.locator("#carouselCanvas").waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "light",
    );
    assert.equal(await page.evaluate(() => p.meta.code), "NEU");
    assert.deepEqual(await page.evaluate(() => ({ ...studioPreferences })), {
      primaryColour: "#315bcc",
      density: "comfortable",
        guideColour: "#1c8e5b",
      sponsorColour: "#ffffff",
      snapColour: "#ea4156",
      snapDistance: 12,
      exportFormat: "png",
      autoSaveFile: true,
      advanced: false,
      curvature: false,
      pdfPreset: "linkedin",
      lineHeight: 95,
      designerGrid: { columns: 6, rows: 6, gap: 0 },
      textSizes: {date: 52, title: 104, subtitle: 52, copyright: 32},
    });
    await page.setViewportSize({ width: 640, height: 900 });
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-light-mobile.png"),
    });
    assert(await page.locator("footer #carouselZoom").isVisible());
    assert(await page.locator("#settings").isVisible());
    await page.locator("#settings").click();
    await page.locator("#settings-tab-general").click();
    await page.locator("[data-theme-choice=dark]").click();
    await page.locator("#closeSettings").click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS white slides, combined selection/content, flip buttons for images/angles, light/dark persistence, footer, naming, PSD slices, text sizes, layers, merged pixels and PSD download and persistent guide/snap/export preferences",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
