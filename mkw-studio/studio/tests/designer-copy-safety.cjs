const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Kopieren ohne ungültige Projekte");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const fixture = await page.evaluate(() => {
      const o = carouselObject("gradient", { x: 300, y: 300, w: 200, h: 200 });
      window.copyOriginal = clone(p.carousel.objects);
      const filler = Array.from(
        { length: 500 - p.carousel.objects.length },
        (_, i) => ({ ...clone(o), id: "filler-" + i, visible: false }),
      );
      p.carousel.objects.push(...filler);
      carouselSelect([o.id]);
      changed();
      return { id: o.id };
    });
    const state = () =>
      page.evaluate(() => ({
        doc: JSON.stringify(snapshot()),
        history: history.length,
        revision,
        selected: [...carouselUI.ids],
      }));
    await page.evaluate(() => document.activeElement.blur());
    const full = await state();
    await page.keyboard.press("ControlOrMeta+d");
    assert.equal(
      await page.evaluate(() => p.carousel.objects.length),
      500,
      "Duplicate must not create a 501st layer",
    );
    assert.deepEqual(await state(), full);
    assert.match(await page.locator("#status").textContent(), /500/);
    await page.keyboard.press("ControlOrMeta+c");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ControlOrMeta+v");
    assert.deepEqual(
      await state(),
      full,
      "Repeated rejected paste leaves history, selection and assets unchanged",
    );
    await page.evaluate(() => carouselSlideInsert(1, 0));
    assert.deepEqual(
      await state(),
      full,
      "Slide duplication must respect the same layer limit",
    );
    assert.equal(await page.evaluate(() => carouselObject("image")), null);
    assert.deepEqual(await state(), full);
    await page.evaluate(async () =>
      carouselImport([new File(["bad"], "bad.png", { type: "image/png" })]),
    );
    assert.deepEqual(
      await state(),
      full,
      "At capacity a new image is refused before import/checkpoint",
    );
    await page.evaluate(() => {
      carouselSetZoom(0.5);
      carouselSlideCenter(0);
    });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const dragBefore = await state();
    const point = await page.evaluate(() => {
      const r = carouselOrigin();
      return { x: r.left + 400 * carouselZoom, y: r.top + 400 * carouselZoom };
    });
    await page.keyboard.down("Alt");
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 30, point.y + 20, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Alt");
    assert.deepEqual(
      await state(),
      dragBefore,
      "Alt-drag at capacity must leave the original and undo history untouched",
    );
    await page.evaluate(() => carouselTool("text"));
    const drawPoint = await page.evaluate(() => {
      const r = carouselOrigin();
      return { x: r.left + 700 * carouselZoom, y: r.top + 700 * carouselZoom };
    });
    await page.mouse.move(drawPoint.x, drawPoint.y);
    await page.mouse.down();
    await page.mouse.move(drawPoint.x + 50, drawPoint.y + 50, { steps: 5 });
    await page.mouse.up();
    assert.deepEqual(
      await state(),
      dragBefore,
      "A rejected drawn text frame must not open a null editor or mutate the document",
    );

    await page.evaluate((id) => {
      p.carousel.objects = clone(window.copyOriginal);
      carouselSelect([id]);
      carouselSelected()[0].x = 99990;
      changed();
      document.activeElement.blur();
    }, fixture.id);
    const edge = await state();
    await page.keyboard.press("ControlOrMeta+d");
    assert.deepEqual(
      await state(),
      edge,
      "Offset past the document coordinate limit is refused atomically",
    );
    await page.keyboard.press("ControlOrMeta+c");
    await page.keyboard.press("ControlOrMeta+v");
    assert.deepEqual(await state(), edge);
    await page.evaluate((id) => {
      carouselSelected()[0].x = 300;
      carouselSelect([id]);
      changed();
      document.activeElement.blur();
    }, fixture.id);
    const normal = await state();
    await page.keyboard.press("ControlOrMeta+d");
    assert.equal(await page.evaluate(() => p.carousel.objects.length), 3);
    const copied = await page.evaluate(() => clone(carouselSelected()[0]));
    assert.equal(copied.x, 330);
    assert.equal(copied.y, 330);
    assert.notEqual(copied.id, fixture.id);
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(() => JSON.stringify(snapshot())),
      normal.doc,
    );
    await page.evaluate(() => redo());
    await page.evaluate((id) => {
      carouselSelect([id]);
      document.activeElement.blur();
    }, copied.id);
    await page.keyboard.press("ControlOrMeta+c");
    await page.keyboard.press("ControlOrMeta+v");
    const valid = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      return q.carousel.objects.length;
    });
    assert.equal(valid, 4);
    await page.evaluate(() => {
      carouselUI.clipboard = [
        { ...clone(carouselSelected()[0]), folderId: "removed-folder" },
      ];
      carouselUI.clipboardAssets = [
        { ...p.images[0], id: "unused-clipboard-asset" },
      ];
    });
    const stale = await state();
    await page.keyboard.press("ControlOrMeta+v");
    assert.deepEqual(
      await state(),
      stale,
      "Invalid clipboard references cannot import assets or create undo entries",
    );
    await page.evaluate(() => {
      const o = carouselSelected()[0];
      while (p.carousel.objects.length < 499)
        p.carousel.objects.push({ ...clone(o), id: uid(), visible: false });
      changed();
      document.activeElement.blur();
    });
    const almostFull = await state();
    await page.keyboard.press("ControlOrMeta+d");
    assert.equal(
      await page.evaluate(() => p.carousel.objects.length),
      500,
      "The last available layer remains usable",
    );
    await page.evaluate(() => {
      validate(snapshot());
      validateCarousel(p);
    });
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(() => JSON.stringify(snapshot())),
      almostFull.doc,
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    assert(await page.locator("#carouselViewport").isVisible());
    await page.screenshot({ path: artifact("copy-safety-ipad-mini.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS 500-layer duplicate/paste/draw/import/Alt-drag rejection without mutation, coordinate limits, normal copy/paste, undo/redo, MKW roundtrip and iPad-size viewport",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
