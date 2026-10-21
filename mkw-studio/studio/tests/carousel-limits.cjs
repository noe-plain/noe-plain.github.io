const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Eine bis zwanzig Slides");
    await page.locator("#cw").fill("320");
    await page.locator("#ch").fill("400");
    await page.locator("#ct").fill("30");
    await page.locator("#cb").fill("40");
    await page.locator("#cl").fill("30");
    await page.locator("#cr").fill("30");
    assert.equal(await page.locator("#cn").getAttribute("min"), "1");
    assert.equal(await page.locator("#cn").getAttribute("max"), "20");
    for (const count of ["0", "21", "1.5"]) {
      await page.locator("#cn").fill(count);
      await page.locator("#createProject").click();
      assert(await page.locator("#projectSetup").isVisible());
      assert.match(await page.locator("#setupError").textContent(), /1–20/);
    }
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => p.carousel?.n === 1 && !busy);
    await page.locator('[data-slide="0"]').click();
    assert(await page.locator("#carouselSlideDelete").isDisabled());
    const single = await page.evaluate(async () => {
      validate(snapshot());
      validateCarousel(snapshot());
      const before = p.carousel.n;
      carouselSlideDelete();
      const assertNoop = p.carousel.n === before;
      const blob = await MKWProjectFile.encode(snapshot()),
        decoded = MKWProjectAssets.hydrate(await MKWProjectFile.decode(blob));
      validate(decoded);
      validateCarousel(decoded);
      await restore(decoded);
      return { n: p.carousel.n, boards: p.boards.length, noop: assertNoop };
    });
    assert.deepEqual(single, { n: 1, boards: 1, noop: true });
    await page.locator("#carouselExport").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".export-card").length === 1,
    );
    await page.locator("#closeExport").click();
    await page.locator("#carouselAddSlide").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 2);
    await page.locator('[data-slide="1"]').click();
    await page.locator("#carouselSlideDelete").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 1);
    await page.evaluate(() => {
      while (p.carousel.n < 20) carouselSlideInsert(p.carousel.n);
    });
    assert(await page.locator("#carouselAddSlide").isDisabled());
    await page.locator('[data-slide="19"]').click();
    for (const id of [
      "carouselSlideBefore",
      "carouselSlideAfter",
      "carouselSlideDuplicate",
    ])
      assert(await page.locator("#" + id).isDisabled());
    const max = await page.evaluate(async () => {
      carouselSlideInsert(20);
      const q = snapshot();
      validate(q);
      validateCarousel(q);
      for (const n of [0, 21]) {
        const bad = clone(q);
        bad.carousel.n = n;
        try {
          validateCarousel(bad);
          return { badAccepted: n };
        } catch {}
      }
      const blob = await MKWProjectFile.encode(q),
        decoded = MKWProjectAssets.hydrate(await MKWProjectFile.decode(blob));
      await restore(decoded);
      return {
        n: p.carousel.n,
        boards: p.boards.length,
        indexes: p.boards.every((b, i) => b.carouselSlide === i),
      };
    });
    assert.deepEqual(max, { n: 20, boards: 20, indexes: true });
    await page.locator("#carouselExport").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".export-card").length === 20,
    );
    await page.locator("[data-export-format=pdf]").click();
    await page.locator("#exportPreset").selectOption("original");
    const download = page.waitForEvent("download");
    await page.locator("#zip").click();
    await (await download).saveAs(artifact("carousel-20-pages.pdf"));
    await page.waitForFunction(() => !busy);
    assert.match(
      await page.locator("#exportStatus").textContent(),
      /20 Einzelseiten/,
    );
    assert.equal(await page.locator("#progressPercent").textContent(), "100 %");
    await page.locator("#closeExport").click();
    await page.locator('[data-slide="19"]').click();
    await page.locator("#carouselSlideDelete").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 19);
    assert(!(await page.locator("#carouselAddSlide").isDisabled()));
    assert.deepEqual(errors, []);
    console.log(
      "PASS setup/import limits 1–20, minimum deletion guard, maximum add/duplicate guard, slide indexes, MKW save/reopen, one/20 previews and 20-page PDF.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
