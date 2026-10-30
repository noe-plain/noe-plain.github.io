const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Artboard Dateien");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy && p.carousel);
    const result = await page.evaluate(async () => {
      const cv = makeCanvas(20, 20),
        ctx = exportContext(cv);
      ctx.fillStyle = "#2c7698";
      ctx.fillRect(0, 0, 20, 20);
      const data = cv.toDataURL();
      const im = {
        id: uid(),
        name: "Foto.png",
        data,
        original: data,
        width: 20,
        height: 20,
      };
      p.images.push(im);
      carouselObject("image", {
        name: "Foto 1",
        x: 0,
        y: 0,
        w: 600,
        h: 750,
        imageId: im.id,
      });
      carouselObject("angle", {
        name: "Winkel 1",
        x: -150,
        y: -200,
        w: 900,
        h: 700,
        imageId: im.id,
        direction: "down",
      });
      const second = carouselObject("image", {
        name: "Foto 2",
        x: 600,
        y: 0,
        w: 600,
        h: 750,
        imageId: im.id,
      });
      carouselObject("angle", {
        name: "Winkel 2",
        x: 650,
        y: 0,
        w: 500,
        h: 750,
        imageId: im.id,
        direction: "left",
      });
      const bitmap = async (i) => {
        const b = p.boards[i],
          c = makeCanvas(b.w, b.h);
        await paint(exportContext(c), b, 1);
        const data = c.toDataURL();
        c.width = c.height = 1;
        return data;
      };
      const before = await Promise.all([bitmap(0), bitmap(1)]);
      MKWArtboardUI.enable();
      const after = await Promise.all([bitmap(0), bitmap(1)]);
      const unchanged = before.every((v, i) => v === after[i]);
      MKWArtboardUI.apply(
        1,
        {
          x: 840,
          y: 900,
          w: 700,
          h: 800,
          name: "Zweite Fläche",
          bg: "#fedcba",
        },
        true,
      );
      const template = MKWTemplateModel.capture(p, { name: "Freie Vorlage" }),
        sources = template.slots
          .filter((s) => s.kind === "angle")
          .map((s) => s.sourceId);
      const expectedSources = p.carousel.objects
        .filter((o) => o.type === "image")
        .map((o) => o.id);
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      await autosave();
      const stored = await MKWProjectStore.open(p.projectId);
      const settings = { format: "pdf", pdf: carouselPDFPreset("original") };
      const pages = [];
      for (const b of p.boards)
        pages.push((await encodedBoard(clone(b), settings)).pdfImage);
      const pdf = await carouselBuildPDF(pages, "Freie Formate");
      const parsed = await MKWPDF.PDFDocument.load(await pdf.arrayBuffer());
      const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer());
      const bounds = psd.imageResources.slices[0].slices.map((s) => s.bounds);
      const gap = [
        ...psd.canvas.getContext("2d").getImageData(700, 800, 1, 1).data,
      ];
      return {
        unchanged,
        sources,
        expectedSources,
        q: q.carousel.artboards,
        stored: stored.project.carousel.artboards,
        pages: parsed.getPages().map((p) => p.getSize()),
        bounds,
        gap,
        union: psd.children[0].vectorMask.paths.length,
        shared: p.images.filter((x) => x.name === "Foto.png").length,
      };
    });
    assert(
      result.unchanged,
      "Converting legacy slides must preserve every rendered pixel",
    );
    assert.deepEqual(
      result.sources,
      result.expectedSources,
      "Angles default to a photo on their own artboard",
    );
    assert.deepEqual(result.q, result.stored);
    assert.deepEqual(result.pages, [
      { width: 450, height: 562.5 },
      { width: 525, height: 600 },
    ]);
    assert.deepEqual(result.bounds, [
      { left: 0, top: 0, right: 600, bottom: 750 },
      { left: 840, top: 900, right: 1540, bottom: 1700 },
    ]);
    assert.equal(result.gap[3], 0);
    assert.equal(result.union, 2);
    assert.equal(result.shared, 1);
    await page.screenshot({ path: artifact("designer-artboard-files.png") });
    // Header dragging has a numeric alternative; the next frame remains independently positioned.
    await page.evaluate(() => {
      carouselSetZoom(0.35);
      carouselSlideCenter(1);
    });
    const tab = page.locator('[data-slide="1"]');
    await tab.scrollIntoViewIfNeeded();
    const box = await tab.boundingBox(),
      old = await page.evaluate(() => p.carousel.artboards[1].x);
    await page.mouse.move(box.x + 15, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + 85, box.y + 15, { steps: 8 });
    await page.mouse.up();
    assert((await page.evaluate(() => p.carousel.artboards[1].x)) > old);
    await page.evaluate(() => undo());
    assert.equal(await page.evaluate(() => p.carousel.artboards[1].x), old);
    assert.deepEqual(errors, []);
    console.log(
      "PASS legacy pixel parity, independent MKW/browser roundtrip, per-board template image links, shared assets, mixed PDF sizes, actual PSD slices/union mask/gap transparency, header drag and undo",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
