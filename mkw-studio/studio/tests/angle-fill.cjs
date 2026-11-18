const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Farbwinkel");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const original = await page.evaluate(() => {
      const canvas = makeCanvas(64, 64);
      canvas.getContext("2d").fillRect(0, 0, 64, 64);
      const data = canvas.toDataURL();
      carouselObject("shape", {
        x: 0,
        y: 0,
        w: 1200,
        h: 750,
        fill: "#ff0000",
        strokeWidth: 0,
      });
      p.images.push({
        id: "angle-photo",
        name: "Original",
        data,
        original: data,
        width: 64,
        height: 64,
      });
      const a = carouselObject("angle", {
        id: "colour-angle",
        x: 200,
        y: -375,
        w: 600,
        h: 1500,
        glow: 0,
        glowAlpha: 0,
        imageId: "angle-photo",
        scale: 1.2,
        panX: 5,
        panY: 9,
      });
      carouselSelect(["colour-angle"]);
      carouselPanel();
      return { imageId: a.imageId, scale: a.scale, panX: a.panX, panY: a.panY };
    });
    await page.locator("[data-paint-channel=fill]").first().click();
    await page.locator("#paintMode").selectOption("solid");
    await page.locator("#paintHex").fill("#0000FF");
    await page.locator("#paintHex").press("Tab");
    await page.locator("#paintAlpha").fill("50");
    await page.locator("#paintAlpha").press("Tab");
    await page.locator("#paintClose").click();
    const check = await page.evaluate(async () => {
      const a = p.carousel.objects.find((o) => o.id === "colour-angle");
      validate(snapshot());
      validateCarousel(snapshot());
      const canvas = makeCanvas(600, 750),
        ctx = exportContext(canvas);
      await carouselPaint(ctx, 0);
      const pixel = [...ctx.getImageData(230, 375, 1, 1).data];
      const psd = agPsd.readPsd(await (await buildCarouselPSD()).arrayBuffer());
      const psdPixel = [
        ...psd.canvas.getContext("2d").getImageData(230, 375, 1, 1).data,
      ];
      const pdf = await encodedBoard(p.boards[0], {
        format: "pdf",
        pdf: { ...carouselPDFPreset("original"), w: 600, h: 750 },
      });
      const bitmap = await createImageBitmap(pdf.previewBlob);
      const pdfCanvas = makeCanvas(600, 750);
      pdfCanvas.getContext("2d").drawImage(bitmap, 0, 0);
      const pdfPixel = [
        ...pdfCanvas.getContext("2d").getImageData(230, 375, 1, 1).data,
      ];
      bitmap.close();
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      const flat = (layers) =>
        layers.flatMap((l) => [l, ...flat(l.children || [])]);
      return {
        mode: a.angleFillMode,
        opacity: a.opacity,
        pixel,
        psdPixel,
        pdfPixel,
        warning: carouselWarning(a),
        nativeFill: flat(psd.children).some(
          (l) => l.vectorFill?.type === "color",
        ),
        restored: q.carousel.objects.find((o) => o.id === a.id).angleColour,
        defaults: [
          carouselDefault("angle").thickness,
          carouselDefault("angle").glow,
          carouselDefault("angle").glowAlpha,
          MKWCampaignDocument.base("angle", {
            id: "a",
            x: 0,
            y: 0,
            w: 1080,
            h: 1350,
          }).thickness,
        ],
      };
    });
    assert.equal(check.mode, "solid");
    assert.equal(check.opacity, 0.5);
    assert.equal(check.warning, "");
    assert.deepEqual(check.defaults, [200, 50, 0.8, 200]);
    for (const pixel of [check.pixel, check.psdPixel, check.pdfPixel]) {
      assert(
        Math.abs(pixel[0] - 128) <= 2 &&
          pixel[1] <= 2 &&
          Math.abs(pixel[2] - 128) <= 2 &&
          pixel[3] === 255,
        "transparent blue blends with red, without an opaque white base",
      );
    }
    assert(check.nativeFill);
    assert.equal(check.restored.toLowerCase(), "#0000ff");
    await page.screenshot({ path: artifact("angle-colour-designer.png") });
    await page.locator("[data-paint-channel=fill]").first().click();
    await page.locator("#paintMode").selectOption("image");
    await page.locator("#paintClose").click();
    assert.deepEqual(
      await page.evaluate(() => {
        const a = p.carousel.objects.find((o) => o.id === "colour-angle");
        return {
          imageId: a.imageId,
          scale: a.scale,
          panX: a.panX,
          panY: a.panY,
        };
      }),
      original,
    );
    await page.evaluate(() => {
      const a = p.carousel.objects.find((o) => o.id === "colour-angle");
      a.angleFillMode = "solid";
      a.effects = { blur: 2, noise: 12 };
      changed();
    });
    await page.evaluate(async () => {
      await carouselWaitForPaint();
      await buildCarouselPSD();
    });
    // Existing FD adapter uses the same fill semantics and defaults.
    const legacy = await page.evaluate(async () => {
      const q = snapshot();
      delete q.carousel;
      p = q;
      history = [];
      future = [];
      changed();
      const b = p.boards[0];
      MKWPostAngleEditor.create(b);
      MKWPostAngleEditor.select(b, false);
      return { defaults: [b.angle.thickness, b.angle.glow, b.angle.glowAlpha] };
    });
    assert.deepEqual(legacy.defaults, [200, 50, 0.8]);
    await page.locator("#postAngleFillMode").selectOption("solid");
    await page.locator("#postAngleColour").fill("#00ff00");
    await page.locator("#postAngleColour").dispatchEvent("change");
    await page.locator("#postAngleOpacity").fill("40");
    await page.locator("#postAngleOpacity").press("Tab");
    assert(await page.locator("#postAngleImageControls").isHidden());
    const fd = await page.evaluate(async () => {
      const b = p.boards[0];
      validate(snapshot());
      const bitmap = makeCanvas(b.w, b.h);
      await MKWPostAngleEditor.paint(exportContext(bitmap), b, 1, {
        only: "postAngle",
      });
      const psd = await MKWPSDPost.angle(b, 0, 0, MKWPSD.sources());
      const tip = MKWPostAngle.geometry(b, MKWPostAngleEditor.area(b)).tip;
      const point = [Math.round(tip.x + 30), Math.round(tip.y)];
      const pixel = [
        ...bitmap.getContext("2d").getImageData(...point, 1, 1).data,
      ];
      const composite = makeCanvas(b.w, b.h);
      await paint(exportContext(composite), b, 1);
      const actual = agPsd.readPsd(await (await buildPSD()).arrayBuffer());
      const expected = composite
        .getContext("2d")
        .getImageData(...point, 1, 1).data;
      const actualPixel = actual.canvas
        .getContext("2d")
        .getImageData(...point, 1, 1).data;
      if (
        expected.some(
          (value, index) => Math.abs(value - actualPixel[index]) > 2,
        )
      )
        throw Error("FD PSD differs from canvas");
      if (
        pixel[0] !== 0 ||
        pixel[1] !== 255 ||
        pixel[2] !== 0 ||
        Math.abs(pixel[3] - 102) > 1
      )
        throw Error("FD fill opacity differs from 40 percent green");
      return {
        mode: b.angle.angleFillMode,
        colour: b.angle.angleColour,
        opacity: b.angle.opacity,
        psd: !!psd.children,
      };
    });
    assert.deepEqual(fd, {
      mode: "solid",
      colour: "#00ff00",
      opacity: 0.4,
      psd: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS central angle defaults, shared picker image/colour/opacity, retained crop, true transparency, FX, MKW, PNG/PDF/PSD and FD adapter",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
