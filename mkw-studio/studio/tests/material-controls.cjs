const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Bedienelemente");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    await page.evaluate(async () => {
      carouselObject("text", {
        id: "control-text",
        x: 100,
        y: 200,
        w: 750,
        h: 500,
        size: 90,
        text: "Musik für alle",
        color: "#142a42",
      });
      carouselTool("text");
      carouselRefresh();
      await carouselWaitForPaint();
    });
    const before = await page.evaluate(async () => {
      const b = p.boards[0],
        c = makeCanvas(b.w, b.h);
      await paint(exportContext(c), b, 1, { transparent: false });
      const result = { document: JSON.stringify(p), pixels: c.toDataURL() };
      c.width = c.height = 1;
      return result;
    });
    await page.locator("#settings").click();
    const snapshot = await page.evaluate(() => ({
      revision,
      history: history.length,
      future: future.length,
    }));
    const comfortableField = await page
      .locator("#settingsDialog")
      .evaluate((el) => ({ width: el.clientWidth, height: el.clientHeight }));
    const options = page.locator("[data-ui-density]");
    assert.equal(await options.nth(0).getAttribute("aria-pressed"), "true");
    const shape = async (selector) =>
      page
        .locator(selector)
        .evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    assert.notEqual(
      await shape("[data-ui-density=comfortable]"),
      await shape("[data-ui-density=compact]"),
      "selection has a non-colour cue",
    );
    await page.locator("[data-ui-density=compact]").click();
    assert.equal(
      await page.locator("html").getAttribute("data-density"),
      "compact",
    );
    await page.locator("#settings-tab-fonts").click();
    const compactHeight = (
      await page.locator("[data-default-text-size=title]").boundingBox()
    ).height;
    await page.locator("#settings-tab-general").click();
    await page.locator("[data-ui-density=comfortable]").click();
    await page.locator("#settings-tab-fonts").click();
    const comfortableHeight = (
      await page.locator("[data-default-text-size=title]").boundingBox()
    ).height;
    assert(
      comfortableHeight >= 48 &&
        compactHeight >= 32 &&
        compactHeight < comfortableHeight,
      "density changes the usable form controls",
    );
    assert.deepEqual(
      await page
        .locator("#settingsDialog")
        .evaluate((el) => ({ width: el.clientWidth, height: el.clientHeight })),
      comfortableField,
      "density does not resize the task window",
    );
    await page.locator("#settings-tab-general").click();
    const toggle = page.locator("#autoSaveFile");
    assert.equal(await toggle.getAttribute("role"), "switch");
    assert((await toggle.boundingBox()).width >= 48);
    await toggle.focus();
    const checked = await toggle.isChecked();
    await page.keyboard.press("Space");
    assert.equal(
      await toggle.isChecked(),
      !checked,
      "switch is operable without a mouse",
    );
    await page.keyboard.press("Space");
    assert.equal(await toggle.isChecked(), checked);
    // A single transient tooltip preserves existing help relationships and disappears on Escape.
    await page
      .locator("#closeSettings")
      .evaluate((el) => el.setAttribute("aria-describedby", "settingsTitle"));
    await page.locator("#closeSettings").focus();
    await page.locator("#studioTooltip").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#studioTooltip").textContent(),
      "Einstellungen schliessen",
    );
    assert.equal(
      await page.locator("#studioTooltip").getAttribute("popover"),
      null,
      "plain tooltips must not block editor shortcuts as an open popup",
    );
    assert.match(
      await page.locator("#closeSettings").getAttribute("aria-describedby"),
      /settingsTitle.*studioTooltip/,
    );
    const tip = await page.locator("#studioTooltip").boundingBox();
    assert(
      tip.x >= 0 &&
        tip.y >= 0 &&
        tip.x + tip.width <= 1500 &&
        tip.y + tip.height <= 1000,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#closeSettings").getAttribute("aria-describedby"),
      "settingsTitle",
    );
    await page.locator("#settings").click();
    const button = page.locator("[data-ui-density=compact]");
    await button.hover();
    await page.mouse.down();
    assert.equal(await button.locator("mkw-state-ripple").count(), 1);
    await page.mouse.up();
    await page.waitForFunction(
      () => !document.querySelector("mkw-state-ripple"),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-ui-density=comfortable]").hover();
    await page.mouse.down();
    assert.equal(await page.locator("mkw-state-ripple").count(), 0);
    await page.mouse.up();
    assert.equal(
      await page.locator("[data-ui-density=comfortable]").evaluate((el) =>
        getComputedStyle(el)
          .transitionDuration.split(",")
          .every((v) => parseFloat(v) === 0),
      ),
      true,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("[data-ui-density=compact]").click();
    await page.locator("#closeSettings").click();
    assert.deepEqual(
      await page.evaluate(() => ({
        revision,
        history: history.length,
        future: future.length,
      })),
      snapshot,
      "UI preferences do not enter artwork history",
    );
    const after = await page.evaluate(async () => {
      const b = p.boards[0],
        c = makeCanvas(b.w, b.h);
      await paint(exportContext(c), b, 1, { transparent: false });
      const result = { document: JSON.stringify(p), pixels: c.toDataURL() };
      c.width = c.height = 1;
      return result;
    });
    assert.deepEqual(
      after,
      before,
      "UI controls do not change document data or export pixels",
    );
    await page.locator("#settings").hover();
    await page.locator("#studioTooltip").waitFor({ state: "visible" });
    await page.keyboard.press("Control+1");
    assert.equal(
      await page.evaluate(() => carouselZoom),
      await page.evaluate(() => studioZoomReference(true)),
      "an icon hint must not block the workspace zoom shortcut",
    );
    await page.keyboard.press("Control+0");
    await page.locator("#help").hover();
    await page.locator("#studioTooltip").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#studioTooltip").textContent(),
      "Hilfe und How-to öffnen",
    );
    // A generated inspector slider is current on insertion and after keyboard adjustment.
    await page.evaluate(() => {
      carouselObject("gradient", {
        id: "slider-gradient",
        x: 150,
        y: 200,
        w: 500,
        h: 500,
        opacity: 0.39,
      });
      carouselPanel();
    });
    const slider = page.locator("#carouselProperties input[data-prop=opacity]");
    await slider.waitFor();
    assert.equal(await slider.inputValue(), "39");
    await page.waitForFunction(
      () =>
        document
          .querySelector("#carouselProperties input[data-prop=opacity]")
          .style.getPropertyValue("--range-percent") === "39%",
    );
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await slider.inputValue(), "40");
    assert.equal(
      await slider.evaluate((el) =>
        el.style.getPropertyValue("--range-percent"),
      ),
      "40%",
    );
    assert.equal(
      await page.evaluate(() => carouselSelected().at(-1).opacity),
      0.4,
    );
    await page.waitForFunction(
      () => !document.querySelector("mkw-state-ripple"),
    );
    assert.equal(
      requests.some((url) => new URL(url).pathname.includes("/hilfe/")),
      false,
      "no eager handbook request",
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      await page.locator("#settings").click();
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-controls-${theme}.png`),
      });
      await page.setViewportSize({ width: 640, height: 900 });
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-controls-${theme}-narrow.png`),
      });
      const overflow = await page
        .locator("#settingsDialog")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      assert.equal(overflow, false, "settings stay inside the narrow window");
      await page.locator("#closeSettings").click();
      await page.setViewportSize({ width: 1500, height: 1000 });
    }
    await page.reload();
    await page.locator("#startNew").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("html").getAttribute("data-density"),
      "compact",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS usable density, keyboard switches, selected shape, single accessible tooltip, reduced motion, transient ripple cleanup, native slider synchronization, narrow themes and unchanged document/history/export",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
