const assert = require("node:assert/strict");
const { contrast } = require("../static/ui-colour-model.js");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Farben und Handbuch");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => p.carousel && !busy);
    await page.evaluate(async () => {
      carouselObject("shape", {
        id: "picker-shape",
        x: 180,
        y: 300,
        w: 600,
        h: 400,
        fill: "#3b7a71",
        stroke: "#121212",
        strokeWidth: 4,
      });
      await carouselWaitForPaint();
      await prepareLogo(p.boards[0]);
    });
    const snapshot = () =>
      page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        history: history.length,
        future: future.length,
      }));
    const before = await snapshot();
    const assertPicker = async () => {
      const g = await page.locator("#studioPaintPicker").evaluate((el) => {
        const r = el.getBoundingClientRect(),
          rail = studioPicker.rail.getBoundingClientRect(),
          s = getComputedStyle(el),
          hue = document.querySelector("#paintHue").getBoundingClientRect(),
          sv = document.querySelector("#paintSV").getBoundingClientRect(),
          a = document
            .querySelector("#paintAlphaSlider")
            .getBoundingClientRect();
        return {
          w: r.width,
          h: r.height,
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          centre: Math.abs(r.y + r.height / 2 - innerHeight / 2),
          gap: rail.left - r.right,
          radius: parseFloat(s.borderTopLeftRadius),
          overflow: el.scrollWidth > el.clientWidth + 1,
          colourOrder: hue.right < sv.left && sv.right < a.left,
          font: s.fontFamily,
        };
      });
      assert.equal(g.w, 320);
      assert(g.radius >= 28);
      assert(g.centre < 1);
      assert(Math.abs(g.gap - 20) < 1);
      assert(!g.overflow);
      assert(g.colourOrder);
      assert.match(g.font, /MKW UI/);
      assert((await page.locator("#paintHex").boundingBox()).height >= 48);
      assert((await page.locator("#paintClose").boundingBox()).height >= 40);
      assert(
        await page.locator("#paintMode").isVisible(),
        "Native paint type selector remains visible and clickable",
      );
    };
    await page.locator("[data-paint-channel=fill]").click();
    await assertPicker();
    await page.locator("#paintHue").focus();
    await page.keyboard.press("Escape");
    assert(await page.locator("#studioPaintPicker").isHidden());
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.paintChannel),
      "fill",
    );
    assert.deepEqual(
      await snapshot(),
      before,
      "Opening/closing picker does not change artwork/history",
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        studioPreferences.colourMode = "complementary";
        studioPreferences.primaryColour = "#a62f86";
        studioSetTheme(theme);
        studioApplyPreferences();
      }, theme);
      await page.locator("[data-paint-channel=fill]").click();
      await page.locator("#paintMode").selectOption("solid");
      await assertPicker();
      await page.locator("#paintMode").selectOption("gradient");
      assert.equal(await page.locator("#paintGradientPanel").isVisible(), true);
      assert(
        (await page.locator("[data-gradient-kind=linear]").boundingBox())
          .height >= 40,
      );
      await page.screenshot({
        path: artifact(`material-picker-${theme}.png`),
        animations: "disabled",
      });
      // Native range remains inverted intentionally: value=transparency, top=opaque.
      await page.locator("#paintAlphaSlider").focus();
      await page.keyboard.press("End");
      assert.equal(await page.locator("#paintAlpha").inputValue(), "100");
      assert.equal(
        await page.locator("#paintAlphaSlider").getAttribute("aria-valuetext"),
        "0 Prozent Deckkraft",
      );
      await page.keyboard.press("Home");
      assert.equal(await page.locator("#paintAlpha").inputValue(), "0");
      await page.locator("#paintMode").selectOption("image");
      assert.equal(
        await page
          .locator("#paintAlphaSlider")
          .getAttribute("aria-orientation"),
        "horizontal",
      );
      assert(await page.locator("#paintPlaceImage").isVisible());
      await page.locator("#paintClose").click();
    }
    const unchanged = await snapshot();
    assert.equal(
      requests.filter((u) => new URL(u).pathname.includes("/hilfe/")).length,
      0,
      "Wiki stays unloaded until requested",
    );
    await page.locator("#help").click();
    const help = page.frameLocator("#studioHelpFrame");
    await help.locator("#helpSearch").waitFor();
    assert.equal(await help.locator("main section").count(), 8);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      const colours = await help.locator("html").evaluate((el) => ({
        theme: el.dataset.theme,
        secondary: el.style.getPropertyValue(
          "--md-sys-color-secondary-container",
        ),
      }));
      assert.equal(colours.theme, theme);
      assert.equal(
        colours.secondary,
        await page.evaluate(
          () =>
            MKWUIColor.palette(
              studioPreferences.primaryColour,
              document.documentElement.dataset.theme,
              studioPreferences.colourMode,
            )["secondary-container"],
        ),
      );
      await help.locator('nav a[href="#carousels"]').click();
      for (const selector of [
        ".intro p",
        "nav [aria-current]",
        ".note",
        "section p",
      ]) {
        const pair = await help
          .locator(selector)
          .first()
          .evaluate((el) => {
            const hex = (value) =>
              "#" +
              value
                .match(/\d+/g)
                .slice(0, 3)
                .map((n) => (+n).toString(16).padStart(2, "0"))
                .join("");
            let surface = el;
            while (
              getComputedStyle(surface).backgroundColor ===
                "rgba(0, 0, 0, 0)" &&
              surface.parentElement
            )
              surface = surface.parentElement;
            return [
              hex(getComputedStyle(el).color),
              hex(getComputedStyle(surface).backgroundColor),
            ];
          });
        assert(
          contrast(...pair) >= 4.5,
          `${theme} ${selector}: readable contrast`,
        );
      }

      assert.equal(
        await help.locator("nav a[aria-current=location]").getAttribute("href"),
        "#carousels",
      );
      assert((await help.locator("nav a").first().boundingBox()).height >= 48);
      await help.locator("#helpSearch").fill("Rahmenpunkte");
      assert(await help.locator("#carousels").isVisible());
      await help.locator("#helpSearchClear").click();
      assert.equal(await help.locator("#helpSearch").inputValue(), "");
      assert(
        await help
          .locator("#helpSearch")
          .evaluate((el) => document.activeElement === el),
      );
      assert.equal(await help.locator("main section:not([hidden])").count(), 8);
      await help.locator("#helpSearch").fill("keinpassendeskapitel123");
      assert.match(
        await help.locator("#helpResults").textContent(),
        /Keine passenden/,
      );
      await help.locator("#helpSearchClear").click();
      await page.screenshot({
        path: artifact(`material-wiki-${theme}.png`),
        animations: "disabled",
      });
    }
    // Same native modal size as Settings and bounded scrolling on short/narrow windows.
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 700, height: 500 },
    ]) {
      await page.setViewportSize(viewport);
      const bounds = await help
        .locator("html")
        .evaluate((el) => ({ w: el.scrollWidth, viewport: innerWidth }));
      assert(bounds.w <= bounds.viewport, "Wiki has no horizontal overflow");
      await help.locator("#helpSearch").fill("speichern");
      assert(await help.locator("#speichern").isVisible());
      await help.locator("#helpSearchClear").click();
      await page.screenshot({
        path: artifact(`material-wiki-${viewport.width}.png`),
        animations: "disabled",
      });
    }
    await help.locator("#helpSearch").focus();
    await page.keyboard.press("Escape");
    assert(await page.locator("#studioHelpDialog").isHidden());
    assert.equal(await page.evaluate(() => document.activeElement.id), "help");
    // Resize may change view bookmarks; all design and undo data remain exact.
    const after = await snapshot();
    const clean = (v) => {
      const p = JSON.parse(v);
      for (const k of ["zoom", "scrollX", "scrollY"]) delete p.carousel[k];
      return JSON.stringify(p);
    };
    assert.equal(clean(after.p), clean(unchanged.p));
    assert.equal(after.revision, unchanged.revision);
    assert.equal(after.history, unchanged.history);
    const wikiRequests = requests.filter((u) =>
      new URL(u).pathname.includes("/hilfe/"),
    ).length;
    await page.locator("#help").click();
    assert.equal(
      requests.filter((u) => new URL(u).pathname.includes("/hilfe/")).length,
      wikiRequests,
      "Reopen reuses loaded Wiki",
    );
    await page.locator("#closeStudioHelp").click();
    const standalone = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await standalone.goto(new URL("hilfe/", process.env.STUDIO_URL).href);
    assert(await standalone.locator("body>header").isVisible());
    assert(await standalone.locator(".back").isVisible());
    assert(
      await standalone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await standalone.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await standalone
        .locator("html")
        .evaluate((el) => getComputedStyle(el).scrollBehavior),
      "auto",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS Material picker geometry/visible modes/native alpha/keyboard/focus; seeded light/dark/complementary Wiki, clear search, navigation, lazy/reused loading, responsive and standalone help; unchanged artwork/history",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
