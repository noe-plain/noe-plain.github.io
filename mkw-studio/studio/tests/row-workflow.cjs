const assert = require("node:assert/strict"),
  { launch, waitForProjectReady, artifact } = require("./browser.cjs");
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
    await page.locator("#setupName").fill("Designer-Reihen");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.locator("#spreadNewRow").click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [2, 1],
    );
    assert(!(await page.locator(".spread-compat").evaluate((el) => el.open)));
    await page.evaluate(() => {
      carouselSlideSelect(0);
      carouselObject("shape", {
        id: "row-shape",
        x: 100,
        y: 300,
        w: 100,
        h: 100,
        name: "Slide-Inhalt",
      });
      carouselSlideSelect(0);
    });
    await page.locator(".pages-thumb").first().click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Slide duplizieren", exact: true })
      .click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [3, 1],
    );
    assert.equal(
      await page.evaluate(
        () =>
          p.carousel.objects.filter((o) => o.name === "Slide-Inhalt").length,
      ),
      2,
    );
    await page.locator("[data-row-slide=right]").click();
    assert.equal(await page.evaluate(() => carouselUI.slide), 2);
    const state = () =>
      page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        boards: JSON.stringify(p.carousel.artboards),
        history: history.length,
        future: future.length,
        revision,
      }));
    const before = await state();
    await page.locator("[data-row-slide=remove]").click();
    await page
      .locator("#studioFeedbackDialog")
      .getByRole("button", { name: "Abbrechen", exact: true })
      .click();
    assert.deepEqual(await state(), before);
    await page.locator(".pages-artboard-heading").first().click();
    await page.locator("[data-row-slides]").click();
    await page.locator("[data-bogen=count]").fill("1");
    await page.locator("[data-bogen-apply]").click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      () => p.carousel.pageStructure.groups[0].length === 1,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [1, 1],
    );
    await page.evaluate(() => undo());
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [3, 1],
    );
    await page.evaluate(() => redo());
    await page.locator(".pages-artboard-heading").first().click();
    await page.locator("[data-row-background]").fill("#ffcc00");
    await page.locator("[data-row-apply]").click();
    assert.equal(
      await page.evaluate(() => p.carousel.artboards[0].bg),
      "#ffcc00",
    );
    assert.equal(
      await page.evaluate(() => p.carousel.artboards[1].bg),
      "#ffffff",
    );
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations.map((v) => v.id),
      ),
      [],
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: artifact("row-workflow-tablet.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS direct second row, default simple controls, real per-row duplicate/move/remove cancel, confirmed shrink without detached pages, undo/redo, background and axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
