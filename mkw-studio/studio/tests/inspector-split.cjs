const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const {
  launch,
  artifact,
  waitForProjectReady,
  openLatestProject,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Geteilte Seitenleiste");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(async () => {
      for (let i = 0; i < 28; i++)
        carouselObject("shape", {
          name: "Form " + i,
          x: 100 + i * 5,
          y: 200 + i * 5,
          w: 200,
          h: 200,
          fill: "#246789",
        });
      carouselObject("text", {
        name: "Konzerttitel",
        text: "Ein guter Abend",
        color: "#102030",
        x: 100,
        y: 100,
        w: 800,
        h: 300,
      });
      await carouselWaitForPaint();
      await autosave();
    });
    const separator = page.locator(".inspector-splitter"),
      properties = page.locator("#carouselProperties"),
      layers = page.locator(".carousel-layers-panel");
    const geometry = () =>
      page.locator("#carouselSidebar").evaluate((el) => {
        const upper = el
            .querySelector(".inspector-context-pane")
            .getBoundingClientRect(),
          lower = el
            .querySelector(".carousel-layers-panel")
            .getBoundingClientRect(),
          handle = el
            .querySelector(".inspector-splitter")
            .getBoundingClientRect();
        return {
          ratio: upper.height / (upper.height + lower.height),
          upper: upper.height,
          lower: lower.height,
          ordered:
            upper.bottom <= handle.top + 1 && handle.bottom <= lower.top + 1,
          overflow: el.scrollHeight > el.clientHeight + 1,
        };
      });
    await separator.waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".inspector-splitter")
          .getAttribute("aria-valuenow") === "70",
    );
    const initial = await geometry();
    assert(Math.abs(initial.ratio - 0.7) < 0.01);
    assert(initial.ordered);
    assert(!initial.overflow);
    const before = await page.evaluate(async () => {
      await carouselWaitForPaint();
      return {
        document: JSON.stringify(snapshot()),
        revision,
        history: history.length,
        pixels: document.querySelector("#carouselCanvas").toDataURL(),
        paint: carouselDraw,
      };
    });
    const box = await separator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 140, { steps: 12 });
    await page.mouse.up();
    const resized = await geometry();
    assert(resized.ratio < 0.6);
    assert(resized.lower > initial.lower);
    const saved = +(await separator.getAttribute("aria-valuenow"));
    assert.equal(
      await page.evaluate(() => studioPreferences.inspectorSplit),
      saved,
    );
    await properties.evaluate((el) => (el.scrollTop = 180));
    await layers.evaluate((el) => (el.scrollTop = 250));
    assert((await properties.evaluate((el) => el.scrollTop)) > 0);
    assert((await layers.evaluate((el) => el.scrollTop)) > 0);
    const top = await properties.evaluate((el) => el.scrollTop);
    await layers.evaluate((el) => (el.scrollTop += 100));
    assert.equal(await properties.evaluate((el) => el.scrollTop), top);
    await separator.focus();
    await separator.press("ArrowDown");
    assert.equal(+(await separator.getAttribute("aria-valuenow")), saved + 2);
    await separator.press("ArrowUp");
    assert.equal(+(await separator.getAttribute("aria-valuenow")), saved);
    const dragBox = await separator.boundingBox();
    await page.mouse.move(dragBox.x + 20, dragBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(dragBox.x + 20, dragBox.y + 100, { steps: 6 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(+(await separator.getAttribute("aria-valuenow")), saved);
    assert.equal(
      await page.evaluate(() => studioPreferences.inspectorSplit),
      saved,
    );
    await separator.press("Home");
    assert.equal(
      await separator.getAttribute("aria-valuenow"),
      await separator.getAttribute("aria-valuemin"),
    );
    await separator.press("End");
    assert.equal(
      await separator.getAttribute("aria-valuenow"),
      await separator.getAttribute("aria-valuemax"),
    );
    await separator.press("0");
    assert.equal(await separator.getAttribute("aria-valuenow"), "70");
    await separator.press("ArrowUp");
    await separator.dblclick();
    assert.equal(await separator.getAttribute("aria-valuenow"), "70");
    assert.deepEqual(
      await page.evaluate(() => ({
        document: JSON.stringify(snapshot()),
        revision,
        history: history.length,
        pixels: document.querySelector("#carouselCanvas").toDataURL(),
        paint: carouselDraw,
      })),
      before,
      "Resize, keyboard and cancellation must not change artwork/history or repaint the canvas",
    );
    await page.addScriptTag({
      content: await fs.readFile(
        require.resolve("axe-core/axe.min.js"),
        "utf8",
      ),
    });
    const ax = await page.evaluate(async () =>
      (await axe.run(document.querySelector("#carouselSidebar"))).violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    );
    assert.deepEqual(ax, []);
    await page.screenshot({ path: artifact("inspector-split-light.png") });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.screenshot({ path: artifact("inspector-split-dark.png") });
    await separator.press("ArrowUp");
    const expected = await separator.getAttribute("aria-valuenow");
    await page.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      carouselPanel();
    });
    assert.equal(await separator.getAttribute("aria-valuenow"), expected);
    assert.equal(await separator.count(), 1);
    await page.evaluate(() => {
      studioPreferences.advanced = false;
      studioApplyPreferences();
      carouselPanel();
    });
    assert.equal(await separator.getAttribute("aria-valuenow"), expected);
    await page.evaluate(() => render());
    assert.equal(await separator.getAttribute("aria-valuenow"), expected);
    const setup = await page.evaluate(async () => {
      const s = await MKWSetupSession.capture();
      return {
        ratio: s.preferences.inspectorSplit,
        inProject: JSON.stringify(snapshot()).includes("inspectorSplit"),
      };
    });
    assert.deepEqual(setup, { ratio: +expected, inProject: false });
    await page.reload();
    await openLatestProject(page);
    assert.equal(await separator.getAttribute("aria-valuenow"), expected);
    for (const size of [
      { width: 1000, height: 650 },
      { width: 500, height: 750 },
      { width: 500, height: 420 },
    ]) {
      await page.setViewportSize(size);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.evaluate(() => studioSetSidebar(true));
      await separator.waitFor({ state: "visible" });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const g = await geometry();
      assert(g.ordered);
      assert(!g.overflow);
      assert(g.upper >= 80 && g.lower >= 64, JSON.stringify({ size, g }));
      const accessible = await page.locator("#carouselSidebar").evaluate((el) =>
        [
          el.querySelector(".inspector-splitter"),
          el.querySelector("#carouselNewFolder"),
        ].every((target) => {
          const r = target.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return target === hit || target.contains(hit);
        }),
      );
      assert(
        accessible,
        "Floating tool pill must not cover the splitter or layer actions",
      );
      await page.screenshot({
        path: artifact(`inspector-split-${size.width}x${size.height}.png`),
      });
    }
    await page.emulateMedia({
      reducedMotion: "reduce",
      forcedColors: "active",
    });
    await separator.focus();
    await separator.press("ArrowUp");
    assert(await separator.isVisible());
    await page.evaluate(() => studioSetSidebar(false));
    assert(await page.locator("#carouselSidebar").isHidden());
    await page.evaluate(() => studioSetSidebar(true));
    assert(await separator.isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS 70:30 split, independent scrolling, drag/keyboard/reset/cancel, no artwork mutation or repaint, preference/setup/reload, responsive short panes, axe, themes, reduced motion and hide/show",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
