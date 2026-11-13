const assert = require("node:assert/strict");
const {
  launch,
  artifact,
  waitForProjectReady,
  selectTextScope,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Textpanel UX");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() =>
      carouselObject("text", {
        text: "Erster Absatz mit mehreren Wörtern\nZweiter Absatz\nDritter Absatz",
        x: 100,
        y: 300,
        w: 650,
        h: 700,
        size: 50,
        color: "#202020",
      }),
    );
    const stable = () =>
      page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        history: history.length,
        revision,
      }));
    const before = await stable();
    const paragraph = page.locator("[data-scope-picker=paragraph]"),
      line = page.locator("[data-scope-picker=line]");
    assert(!(await paragraph.evaluate((el) => el.open)));
    assert(!(await line.evaluate((el) => el.open)));
    await paragraph.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert(await paragraph.evaluate((el) => el.open));
    assert(await page.locator("[data-paragraph-selection]").isVisible());
    await selectTextScope(page, "[data-paragraph-selection]", ["0", "2"]);
    assert.match(
      await page.locator("[data-paragraph-count]").textContent(),
      /^2 von 3$/,
    );
    await paragraph.locator("summary").click();
    assert(!(await paragraph.evaluate((el) => el.open)));
    await line.locator("summary").focus();
    await page.keyboard.press("Space");
    assert(await line.evaluate((el) => el.open));
    await selectTextScope(page, "[data-line-selection]", ["0:0"]);
    await line.locator("summary").click();
    assert.deepEqual(
      await stable(),
      before,
      "Opening, selecting and closing a scope changes no document/history",
    );
    await require("./browser.cjs").canvasTextRange(page, 0, 5);
    assert.match(
      await page.locator("[data-typo-scope]").textContent(),
      /5 Zeichen/,
    );
    assert(await page.locator("[data-typo=font]").isEnabled());
    assert(await page.locator("[data-typo-align=right]").isDisabled());
    await page.locator("[data-typo-all]").click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    assert.equal(
      await page.evaluate(() => MKWTypography.range(carouselSelected()[0])),
      undefined,
    );
    for (const width of [300, 450]) {
      await page.evaluate((w) => {
        studioPreferences.inspectorWidth = w;
        studioApplyPreferences();
      }, width);
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => studioSetTheme(t), theme);
        await page
          .locator("#carouselSidebar [data-inspector-jump=style]")
          .click();
        const pane = await page.locator("#carouselProperties").boundingBox();
        for (const selector of [
          "[data-typo=font]",
          "[data-typo=size]",
          "[data-typo-colour]",
        ]) {
          const r = await page.locator(selector).boundingBox();
          assert(
            r.y >= pane.y && r.y + r.height <= pane.y + pane.height + 1,
            "Common control fits without extra scrolling at " +
              width +
              ": " +
              selector,
          );
        }
        assert(
          await page
            .locator(".typography-inspector")
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        );
        await page.screenshot({
          path: artifact("text-panel-ux-" + width + "-" + theme + ".png"),
        });
      }
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.evaluate(() => {
      studioPreferences.inspectorWidth = 300;
      studioApplyPreferences();
      studioSetTheme("light");
    });
    await page.locator("#carouselSidebar [data-inspector-jump=style]").click();
    const pane = await page.locator("#carouselProperties").boundingBox();
    const colour = await page.locator("[data-typo-colour]").boundingBox();
    await page.screenshot({ path: artifact("text-panel-ux-ipad.png") });
    assert(
      colour.y + colour.height <= pane.y + pane.height + 1,
      "Font/size/colour stay in reach on iPad-size view: " +
        JSON.stringify({ pane, colour }),
    );
    await paragraph.locator("summary").click();
    await line.locator("summary").click();
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
      [],
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS compact default scope, real disclosure keyboard/mouse, source selection priority, unchanged document/history, primary control reach at 300/450px and iPad, light/dark and expanded axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
