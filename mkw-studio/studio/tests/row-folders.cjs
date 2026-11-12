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
    const picker = page.locator("#carouselRowPicker");
    assert.equal(
      await picker.locator("span").first().textContent(),
      "Ebenen – 1",
    );
    assert.equal(await page.locator("#carouselRowContext").count(), 0);
    const switchBefore = await page.evaluate(() => ({
      history: history.length,
      revision,
    }));
    await picker.click();
    assert.equal(
      await page.locator("#carouselRowMenu [aria-current=true]").count(),
      1,
    );
    await page.keyboard.press("Escape");
    assert(await picker.evaluate((el) => el === document.activeElement));
    await picker.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.rowTarget),
      target,
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await picker.locator("span").first().textContent(),
      "Ebenen – 2",
    );
    assert.deepEqual(
      await page.evaluate(() => ({ history: history.length, revision })),
      switchBefore,
    );
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
    // Long names retain one compact menu row; selected state and focus use
    // the existing semantic Material roles in both themes.
    await page.evaluate(() => {
      p.carousel.pageStructure.artboardInfo[1].name = "L".repeat(160);
      carouselPanel();
    });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => studioSetTheme(value), theme);
      await picker.click();
      const menu = page.locator("#carouselRowMenu");
      await menu.evaluate(async (el) => {
        await Promise.allSettled(
          el
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.effect.getTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished),
        );
      });
      assert(await menu.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
      assert(
        await menu.locator("[aria-current=true]").evaluate((el) => {
          const selected = getComputedStyle(el),
            root = getComputedStyle(document.documentElement);
          const probe = document.createElement("span");
          probe.style.color = root.getPropertyValue(
            "--md-sys-color-on-secondary-container",
          );
          document.body.append(probe);
          const same = selected.color === getComputedStyle(probe).color;
          probe.remove();
          return same;
        }),
      );
      assert.deepEqual(
        await page.evaluate(async () =>
          (await axe.run("#carouselRowMenu")).violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              html: n.html,
              failure: n.failureSummary,
            })),
          })),
        ),
        [],
      );
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => {
      studioSetTheme("light");
      p.carousel.pageStructure.artboardInfo[1].name = "Zweite Reihe";
      carouselPanel();
    });
    await page.screenshot({ path: artifact("row-folders-desktop.png") });
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
