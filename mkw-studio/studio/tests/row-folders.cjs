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
    await page.locator("#setupName").fill("Reihen und Ordner");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() => {
      carouselSlideSelect(0);
      MKWSpreadUI.commit({ type: "enable" });
      MKWSpreadUI.commit({ type: "add", count: 1, spread: true });
      const [a, b] = p.carousel.pageStructure.groups.map((g) => g[0]),
        frame = p.carousel.artboards.find((a) => a.id === b);
      carouselObject("shape", {
        id: "first",
        name: "Erste Reihe",
        x: 50,
        y: 300,
        w: 200,
        h: 200,
        pageId: a,
        folderId: "shared",
      });
      carouselObject("shape", {
        id: "second",
        name: "Zweite Reihe",
        x: 50,
        y: frame.y + 300,
        w: 200,
        h: 200,
        pageId: b,
        folderId: "shared",
      });
      p.carousel.folders = [
        {
          id: "shared",
          name: "Alter geteilter Ordner",
          visible: true,
          locked: false,
        },
      ];
      carouselSlideSelect(0);
    });
    assert.equal(
      await page.locator("#carouselLayers [data-layer=first]").count(),
      1,
    );
    assert.equal(
      await page.locator("#carouselLayers [data-layer=second]").count(),
      0,
    );
    const before = await page.evaluate(() =>
      JSON.stringify(p.carousel.objects.find((o) => o.id === "second")),
    );
    await page.locator("[data-folder-action=visible]").click();
    assert(await page.evaluate(() => p.carousel.folders[0].visible));
    await page.locator("[data-isolate-row]").click();
    const isolated = await page.evaluate(
      () => p.carousel.objects.find((o) => o.id === "first").folderId,
    );
    assert.notEqual(isolated, "shared");
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(p.carousel.objects.find((o) => o.id === "second")),
      ),
      before,
    );
    await page.locator("[data-folder-action=visible]").click();
    assert.equal(
      await page.evaluate(() =>
        carouselObjectVisible(p.carousel.objects.find((o) => o.id === "first")),
      ),
      false,
    );
    assert(
      await page.evaluate(() =>
        carouselObjectVisible(
          p.carousel.objects.find((o) => o.id === "second"),
        ),
      ),
    );
    await page.evaluate(() => undo());
    assert(
      await page.evaluate(() =>
        carouselObjectVisible(p.carousel.objects.find((o) => o.id === "first")),
      ),
    );
    await page.evaluate(() => redo());
    const target = await page.evaluate(
      () => p.carousel.pageStructure.artboardInfo[1].id,
    );
    await page.locator("#carouselRowContext select").selectOption(target);
    assert.equal(
      await page.locator("#carouselLayers [data-layer=first]").count(),
      0,
    );
    assert.equal(
      await page.locator("#carouselLayers [data-layer=second]").count(),
      1,
    );
    await page.evaluate(() => carouselSelect(["first", "second"]));
    const mixedBefore = await page.evaluate(() => ({
      objects: JSON.stringify(p.carousel.objects),
      folders: JSON.stringify(p.carousel.folders),
      history: history.length,
      revision,
    }));
    await page.locator("#carouselNewFolder").click();
    assert.deepEqual(
      await page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        folders: JSON.stringify(p.carousel.folders),
        history: history.length,
        revision,
      })),
      mixedBefore,
    );
    assert.match(await page.locator("#status").textContent(), /aktiven Reihe/);
    const q = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      return JSON.stringify(q.carousel) === JSON.stringify(snapshot().carousel);
    });
    assert(q);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations.map((v) => v.id),
      ),
      [],
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: artifact("row-folders-tablet.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS active row layers, explicit legacy folder isolation, independent visibility, undo/redo, row switch, MKW and axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
