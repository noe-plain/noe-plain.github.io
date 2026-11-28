const assert = require("node:assert/strict"),
  { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
        hasTouch: true,
      }),
      requests = [],
      errors = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Unverändertes Projekt");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.locator("#help").click();
    const help = page.frameLocator("#studioHelpFrame");
    await help.locator("#startBezier").waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const before = await page.evaluate(() =>
      JSON.stringify({ document: snapshot(), undo: history, redo: future }),
    );

    assert(!requests.some((u) => /bezier-(model|game)\.js/.test(u)));
    await page.route("**/hilfe/bezier-game.js*", (route) => route.abort());
    await help.locator("#startBezier").click();
    await page.waitForTimeout(100);
    await help
      .locator("#bezierLoadStatus")
      .filter({ hasText: "konnte nicht geladen" })
      .waitFor();
    assert(await help.locator("#startBezier").isEnabled());
    await page.unroute("**/hilfe/bezier-game.js*");
    await help.locator("#startBezier").click();
    const game = help.locator("#bezierHost");
    await game.locator("[data-lesson]").waitFor();
    const stage = game.locator("svg.bezier-stage"),
      feedback = game.locator("[data-feedback]");
    assert(
      (await stage.boundingBox()).height <= 365,
      "Keep task actions near the drawing surface",
    );
    async function clickPoint(x, y, touch = false) {
      await stage.scrollIntoViewIfNeeded();
      const b = await stage.boundingBox(),
        px = b.x + (x * b.width) / 600,
        py = b.y + (y * b.height) / 360;
      if (touch) await page.touchscreen.tap(px, py);
      else await page.mouse.click(px, py);
    }
    async function dragPoint(a, b, key) {
      await stage.scrollIntoViewIfNeeded();
      const r = await stage.boundingBox();
      if (key) await page.keyboard.down(key);
      await page.mouse.move(
        r.x + (a[0] * r.width) / 600,
        r.y + (a[1] * r.height) / 360,
      );
      await page.mouse.down();
      await page.mouse.move(
        r.x + (b[0] * r.width) / 600,
        r.y + (b[1] * r.height) / 360,
        { steps: 8 },
      );
      await page.mouse.up();
      if (key) await page.keyboard.up(key);
    }
    async function check(ok = true) {
      await game.locator("[data-action=check]").click();
      assert.equal(
        await feedback.getAttribute("data-result"),
        ok ? "success" : "retry",
        await feedback.textContent(),
      );
    }
    await clickPoint(100, 270, true);
    await clickPoint(100, 90);
    await clickPoint(480, 90);
    await check(false);
    await stage.focus();
    await page.keyboard.press("Enter");
    await check();
    await game.locator("[data-action=undo]").click();
    await check(false);
    await game.locator("[data-action=redo]").click();
    await check();
    await game.locator("[data-lesson]").selectOption("1");
    await dragPoint([110, 230], [110, 120]);
    await dragPoint([490, 230], [490, 340]);
    await game.locator("[data-action=finish]").click();
    await check();
    await game.locator("[data-lesson]").selectOption("2");
    await dragPoint([365, 180], [370, 110], "Shift");
    await check();
    await game.locator("[data-energy]").check();
    await page.waitForTimeout(50);
    assert(await game.locator("[data-comb] path").count());
    await game.locator("[data-energy]").uncheck();
    await game.locator("[data-lesson]").selectOption("3");
    await dragPoint([365, 180], [430, 180], "Control");
    await check();
    assert.equal(await game.locator('[data-value="in.x"]').inputValue(), "235");
    await game.locator(".bezier-numbers > summary").click();
    await game.locator("[data-link]").selectOption("direction");
    await game.locator('[data-value="out.x"]').fill("450");
    await game.locator('[data-value="out.x"]').press("Tab");
    assert.equal(await game.locator('[data-value="in.x"]').inputValue(), "235");
    await game.locator("[data-action=undo]").click();
    await check();
    // A true pointer cancellation leaves the path unchanged.
    const lineBefore = await game.locator("[data-lines]").innerHTML();
    await stage.scrollIntoViewIfNeeded();
    const b = await stage.boundingBox();
    await page.mouse.move(
      b.x + (430 * b.width) / 600,
      b.y + (180 * b.height) / 360,
    );
    await page.mouse.down();
    await page.mouse.move(
      b.x + (450 * b.width) / 600,
      b.y + (200 * b.height) / 360,
    );
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.equal(await game.locator("[data-lines]").innerHTML(), lineBefore);
    assert(await page.locator("#studioHelpDialog").isVisible());
    await game.locator("[data-lesson]").selectOption("4");
    await game.locator("[data-point]").selectOption("0:1");
    await game.locator("[data-action=resume]").press("Enter");
    await game.locator("[data-join]").selectOption("1:0");
    await game.locator("[data-action=join]").press("Enter");
    await check();
    await game.locator("[data-action=undo]").click();
    await game.locator("[data-action=undo]").click();
    await clickPoint(240, 260);
    await clickPoint(360, 100);
    await check();
    await game.locator("[data-lesson]").selectOption("5");
    for (const [x, y] of [
      [300, 55],
      [510, 180],
      [300, 305],
      [90, 180],
    ]) {
      await game.locator("[data-add] input[name=x]").fill(String(x));
      await game.locator("[data-add] input[name=y]").fill(String(y));
      await game.locator("[data-add] input[name=y]").press("Enter");
    }
    await check(false);
    await game.locator("[data-action=close]").press("Enter");
    await check();
    // Focusable SVG controls offer a real arrow-key alternative for fine correction.
    await stage.scrollIntoViewIfNeeded();
    await game.locator('[data-hit="0:0:node"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    assert.equal(await game.locator("[data-value=x]").inputValue(), "301");
    await game.locator("[data-action=undo]").click();
    await check();
    const frame = page.frames().find((f) => f.name() === "mkwHelp");
    await frame.addScriptTag({ content: require("axe-core").source });
    const violations = await frame.evaluate(async () =>
      (
        await axe.run("#bezierHost", {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
          },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(violations, []);
    await game.locator(".bezier-numbers > summary").click();
    const fixedWindowAfter = await page.evaluate(() =>
      JSON.stringify({ document: snapshot(), undo: history, redo: future }),
    );
    assert(
      fixedWindowAfter === before,
      "The lesson must leave the complete project and history unchanged at a fixed viewport",
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      await game.locator("[data-hints]").check();
      await stage.scrollIntoViewIfNeeded();
      await stage.screenshot({ path: artifact("bezier-" + theme + ".png") });
    }
    for (const width of [390, 700, 1500]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await help
          .locator("html")
          .evaluate((el) => el.scrollWidth <= innerWidth),
      );
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    await help.locator("#closeBezier").click();
    assert(await help.locator("#bezierHost").isHidden());
    const loaded = requests.filter((u) =>
      /bezier-(model|game)\.js/.test(u),
    ).length;
    await help.locator("#startBezier").click();
    assert.equal(
      requests.filter((u) => /bezier-(model|game)\.js/.test(u)).length,
      loaded,
    );
    await help.locator("#closeBezier").click();
    await page.keyboard.press("Escape");
    const after = await page.evaluate(() =>
      JSON.stringify({ document: snapshot(), undo: history, redo: future }),
    );
    const differences = [];
    function compare(a, b, path = "root") {
      if (a === b) return;
      if (a && b && typeof a === "object" && typeof b === "object") {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
          compare(a[key], b[key], path + "." + key);
      } else differences.push(path);
    }
    const expected = JSON.parse(before),
      actual = JSON.parse(after);
    // Resizing the browser can clamp only the workspace pan position.
    for (const item of [expected, actual]) {
      delete item.document.carousel.scrollX;
      delete item.document.carousel.scrollY;
    }
    compare(expected, actual);
    assert.deepEqual(differences, []);
    const standalone = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    });
    await standalone.goto(
      new URL("hilfe/#bezier-lernen", process.env.STUDIO_URL).href,
    );
    await standalone.locator("#startBezier").click();
    await standalone.locator("#bezierHost [data-lesson]").waitFor();
    await standalone
      .locator("#bezierHost")
      .screenshot({ path: artifact("bezier-whole-lesson.png") });
    await standalone.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS six actual lessons by mouse/touch/numeric/keyboard, Shift/Control rules, undo/redo/cancel, geometry feedback, axe, themes, narrow layout, lazy reusable game and unchanged Studio project",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
