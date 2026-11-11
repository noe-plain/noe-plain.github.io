const assert = require("node:assert/strict");
const { launch, waitForProjectReady } = require("./browser.cjs");
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
    await page.locator("#setupName").fill("Ein Format je Reihe");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("3");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() => {
      carouselObject("shape", { id: "span", x: 500, y: 300, w: 700, h: 200 });
      carouselSlideSelect(0);
      MKWSpreadUI.commit({ type: "enable" });
      MKWSpreadUI.commit({ type: "add", count: 2, spread: true });
    });
    await page.locator(".pages-thumb").nth(1).click();
    assert.match(
      await page.locator(".spread-current-format h4").textContent(),
      /Artboard/,
    );
    await page.locator("[data-artboard=w]").fill("800");
    await page.locator("[data-artboard=h]").fill("1000");
    await page.locator("#designerApplyArtboard").click();
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map((a) => [a.w, a.h])),
      [
        [800, 1000],
        [800, 1000],
        [800, 1000],
        [600, 750],
        [600, 750],
      ],
    );
    assert(
      await page.evaluate(
        () => !p.carousel.objects.find((o) => o.id === "span").pageFragment,
      ),
    );
    await page.evaluate(() => undo());
    assert.equal(await page.evaluate(() => p.carousel.artboards[0].w), 600);
    await page.evaluate(() => redo());
    const before = await page.evaluate(() => ({
      doc: JSON.stringify(p.carousel),
      history: history.length,
      future: future.length,
      revision,
    }));
    const rejected = await page.evaluate(() =>
      MKWSpreadUI.commit({
        type: "join",
        ids: [p.carousel.artboards[0].id, p.carousel.artboards[3].id],
      }),
    );
    assert(!rejected);
    assert.deepEqual(
      await page.evaluate(() => ({
        doc: JSON.stringify(p.carousel),
        history: history.length,
        future: future.length,
        revision,
      })),
      before,
    );
    assert.match(
      await page.locator("#status").textContent(),
      /dieselbe Breite und Höhe/,
    );
    await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      if (MKWSpreadLayoutModel.mixedGroups(q.carousel).length)
        throw Error("Mixed row saved");
    });
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations.map((v) => v.id),
      ),
      [],
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS legacy single-Slide format fields apply to complete row; other row unchanged; continuous layer, undo/redo, atomic mixed join rejection, MKW and axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
