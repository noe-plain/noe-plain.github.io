const assert = require("node:assert/strict"),
  { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1750, height: 1150 },
      }),
      errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Slideformat und Raster");
    await page.locator("#cn").fill("3");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    const base = await page.evaluate(() => {
      const a = carouselObject("image", { x: 1200, y: 350, w: 300, h: 250 }),
        b = carouselObject("path", {
          x: 2400,
          y: 450,
          w: 250,
          h: 200,
          angle: 15,
          points: [
            { x: 0, y: 0, out: { x: 0.2, y: -0.2 } },
            { x: 1, y: 1, in: { x: 0.8, y: 0.8 } },
          ],
          locked: true,
        });
      carouselSlideSelect(1);
      return {
        objects: clone(p.carousel.objects),
        a: a.id,
        b: b.id,
        revision,
        history: history.length,
      };
    });
    assert.equal(await page.locator("#carouselApplyFormat").isDisabled(), true);
    const values = {
      w: 1200,
      h: 1440,
      top: 80,
      bottom: 160,
      left: 70,
      right: 190,
    };
    for (const [key, value] of Object.entries(values))
      await page.locator(`[data-slide-format="${key}"]`).fill(String(value));
    assert.equal(
      await page.evaluate(() => p.carousel.w),
      1080,
      "Typing only previews changes",
    );
    assert.equal(await page.locator("#carouselApplyFormat").isEnabled(), true);
    await page.screenshot({
      path: artifact("designer-slide-format-draft.png"),
    });
    await page.locator("#carouselApplyFormat").click();
    const resized = await page.evaluate(() => ({
      format: Object.fromEntries(
        MKWCarouselPolicy.formatKeys.map((k) => [k, p.carousel[k]]),
      ),
      boards: p.boards.map((b) => [b.w, b.h, b.carouselSlide]),
      objects: clone(p.carousel.objects),
      history: history.length,
      slide: carouselUI.slide,
    }));
    assert.deepEqual(resized.format, values);
    assert.deepEqual(resized.boards, [
      [1200, 1440, 0],
      [1200, 1440, 1],
      [1200, 1440, 2],
    ]);
    assert.equal(resized.history, base.history + 1);
    assert.equal(resized.slide, 1);
    for (const before of base.objects) {
      const after = resized.objects.find((o) => o.id === before.id),
        shift = Math.max(0, Math.min(3, Math.floor(before.x / 1080))) * 120;
      assert.deepEqual(after, { ...before, x: before.x + shift });
    }
    await page.evaluate(() => undo());
    assert.equal(await page.evaluate(() => p.carousel.w), 1080);
    assert.deepEqual(
      await page.evaluate(() => p.carousel.objects),
      base.objects,
    );
    await page.evaluate(() => redo());
    assert.equal(await page.evaluate(() => p.carousel.w), 1200);
    // Safezone-only edits leave all object geometry unchanged and reject invalid fields.
    await page.locator('[data-slide="1"]').click();
    const beforeSafe = await page.evaluate(() => clone(p.carousel.objects));
    await page.locator('[data-slide-format="left"]').fill("1200");
    assert(await page.locator("#carouselApplyFormat").isDisabled());
    assert.match(
      await page
        .locator(".carousel-slide-format .post-safezone-error")
        .textContent(),
      /Schutzzonen/,
    );
    assert.equal(await page.evaluate(() => p.carousel.left), 70);
    await page.locator('[data-slide-format="left"]').fill("120");
    await page.locator("#carouselApplyFormat").click();
    assert.deepEqual(await page.evaluate(() => p.carousel.objects), beforeSafe);
    const documentBefore = await page.evaluate(() => ({
      carousel: clone(p.carousel),
      revision,
    }));
    await page.locator("#settings").click();
    await page.locator("#settings-tab-guides").click();
    assert.equal(
      await page.locator('[data-designer-grid="columns"]').inputValue(),
      "6",
    );
    assert.equal(
      await page.locator('[data-designer-grid="gap"]').inputValue(),
      "0",
    );
    for (const [key, value] of Object.entries({
      columns: 4,
      rows: 3,
      gap: 20,
    })) {
      await page.locator(`[data-designer-grid="${key}"]`).fill(String(value));
      await page
        .locator(`[data-designer-grid="${key}"]`)
        .dispatchEvent("change");
    }
    const settings = await page.evaluate(async () => {
      const setup = await MKWSetupSession.capture();
      return {
        grid: clone(studioPreferences.designerGrid),
        portable: setup.preferences.designerGrid,
        doc: clone(p.carousel),
        revision,
      };
    });
    assert.deepEqual(settings.grid, { columns: 4, rows: 3, gap: 20 });
    assert.deepEqual(settings.portable, settings.grid);
    assert.deepEqual(settings.doc.objects, documentBefore.carousel.objects);
    assert.equal(settings.revision, documentBefore.revision);
    assert.equal(settings.doc.w, documentBefore.carousel.w);
    assert.equal(settings.doc.designerGrid, undefined);
    await page.locator('[data-designer-grid="gap"]').fill("-1");
    await page.locator('[data-designer-grid="gap"]').dispatchEvent("change");
    assert.equal(
      await page.locator('[data-designer-grid="gap"]').inputValue(),
      "-1",
      "invalid draft stays visible for correction",
    );
    assert.equal(
      await page
        .locator('[data-designer-grid="gap"]')
        .getAttribute("aria-invalid"),
      "true",
    );
    assert.equal(
      await page.evaluate(() => studioPreferences.designerGrid.gap),
      20,
      "invalid gap must not replace the valid preference",
    );
    await page.locator('[data-designer-grid="gap"]').fill("20");
    await page.locator('[data-designer-grid="gap"]').dispatchEvent("change");
    assert.notEqual(
      await page
        .locator('[data-designer-grid="gap"]')
        .getAttribute("aria-invalid"),
      "true",
    );
    await page.screenshot({
      path: artifact("designer-grid-settings-light.png"),
    });
    await page.locator("#settings-tab-general").click();
    await page.locator('[data-theme-choice="dark"]').click();
    await page.locator("#settings-tab-guides").click();
    await page.screenshot({
      path: artifact("designer-grid-settings-dark.png"),
    });
    await page.locator("#closeSettings").click();
    const grid = await page.evaluate(async () => {
      carouselUI.guides = true;
      carouselRefresh();
      const c = p.carousel,
        r = MKWCarouselPolicy.safeRect(c, 1),
        g = MKWDesignerGrid.lines(c, 1),
        style = getComputedStyle(
          document.querySelector(".slide-guide .designer-grid"),
        ),
        old = carouselZoom;
      carouselZoom = 1;
      const excluded = c.objects.map((o) => o.id),
        snaps = [g.x[1], g.x[2]].map(
          (x) =>
            carouselSnapPathPoint(
              { x: x + 2, y: r.y + 133 },
              [],
              0,
              {},
              excluded,
            ).x,
        );
      carouselZoom = old;
      const canvas = makeCanvas(c.w, c.h);
      await carouselPaint(canvas.getContext("2d"), 0, 1, false);
      const withGrid = canvas.toDataURL();
      carouselUI.guides = false;
      carouselRefresh();
      await carouselPaint(canvas.getContext("2d"), 0, 1, false);
      return {
        g,
        snaps,
        background: style.backgroundImage,
        cell: style.getPropertyValue("--grid-cell-x"),
        gap: style.getPropertyValue("--grid-gap-x"),
        same: canvas.toDataURL() === withGrid,
      };
    });
    assert.equal(grid.g.x.length, 8);
    assert.equal(grid.g.y.length, 6);
    assert.equal(grid.g.gapX, 20);
    assert.equal(grid.g.gapY, 20);
    for (let i = 0; i < 2; i++)
      assert(Math.abs(grid.snaps[i] - grid.g.x[i + 1]) < 0.001);
    assert.match(grid.background, /repeating-linear-gradient/);
    assert(parseFloat(grid.gap) > 0);
    assert(grid.same, "View-only grids do not change export pixels");
    const saved = await page.evaluate(async () => {
      const blob = await MKWProjectFile.encode(snapshot()),
        doc = MKWProjectAssets.hydrate(await MKWProjectFile.decode(blob));
      validate(doc);
      validateCarousel(doc);
      await restore(doc);
      await autosave({ writeFile: false });
      return {
        w: doc.carousel.w,
        h: doc.carousel.h,
        left: doc.carousel.left,
        right: doc.carousel.right,
        boards: doc.boards.map((b) => [b.w, b.h]),
      };
    });
    assert.deepEqual(saved, {
      w: 1200,
      h: 1440,
      left: 120,
      right: 190,
      boards: [
        [1200, 1440],
        [1200, 1440],
        [1200, 1440],
      ],
    });
    await page.reload();
    await page.locator("#startContinue").click();
    await page.locator("#carouselCanvas").waitFor();
    assert.deepEqual(
      await page.evaluate(() => studioPreferences.designerGrid),
      { columns: 4, rows: 3, gap: 20 },
    );
    assert.equal(await page.evaluate(() => p.carousel.w), 1200);
    await page.locator('[data-slide="0"]').click();
    assert.equal(
      await page.locator('[data-slide-format="right"]').inputValue(),
      "190",
    );
    await page.screenshot({ path: artifact("designer-slide-format-dark.png") });
    await page.locator("#carouselExport").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".export-card").length === 3,
    );
    const dimensions = await page.locator(".export-card").allTextContents();
    assert(dimensions.every((t) => /1200.*1440/.test(t)));
    await page.locator("#closeExport").click();
    assert.deepEqual(errors, []);
    console.log(
      "PASS shared slide dimensions/safezones, explicit apply/validation, geometry preservation and undo, configurable grid/gutters and snapping, light/dark settings, setup portability, project isolation, unchanged export pixels and MKW/browser/export dimensions",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
