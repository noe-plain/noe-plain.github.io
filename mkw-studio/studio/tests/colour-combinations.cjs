const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Vier Farbkonzepte");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy);
    await page.evaluate(async () => {
      carouselObject("text", {
        x: 150,
        y: 200,
        w: 600,
        h: 400,
        size: 80,
        text: "Musik für alle",
        color: "#234567",
      });
      await prepareLogo(p.boards[0]);
      await carouselWaitForPaint();
      await autosave();
    });
    const state = () =>
      page.evaluate(() =>
        JSON.stringify({
          objects: p.carousel.objects,
          boards: p.boards,
          revision,
          history: history.length,
        }),
      );
    const before = await state();
    const pixels = () =>
      page.evaluate(async () => {
        const c = makeCanvas(p.carousel.w, p.carousel.h);
        await carouselPaint(exportContext(c), 0, 1);
        const data = c.toDataURL();
        c.width = c.height = 1;
        return data;
      });
    const original = await pixels();
    await page.addScriptTag({ content: require("axe-core").source });
    await page.locator("#settings").click();
    assert.equal(await page.locator("[data-colour-mode]").count(), 4);
    for (const theme of ["light", "dark"]) {
      await page.locator(`[data-theme-choice=${theme}]`).click();
      for (const mode of ["normal", "complementary", "analogous", "triadic"]) {
        await page.locator(`[data-colour-mode=${mode}]`).click();
        assert.equal(
          await page.locator("html").getAttribute("data-palette"),
          mode,
        );
        assert.equal(
          await page
            .locator(`[data-colour-mode=${mode}][aria-pressed=true]`)
            .count(),
          1,
        );
        const result = await page.evaluate(async () => ({
          stored: JSON.parse(localStorage.getItem("mkw-studio-preferences"))
            .colourMode,
          portable: (await MKWSetupSession.capture()).preferences.colourMode,
          palette: MKWUIColor.palette(
            studioPreferences.primaryColour,
            document.documentElement.dataset.theme,
            studioPreferences.colourMode,
          ),
        }));
        assert.equal(result.stored, mode);
        assert.equal(result.portable, mode);
        await page.waitForTimeout(450);
        const violations = await page.evaluate(async () =>
          (
            await axe.run(
              { include: [["#settingsDialog"]] },
              {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
                },
              },
            )
          ).violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        );
        assert.deepEqual(
          violations,
          [],
          `${theme}/${mode}: settings accessibility`,
        );
        assert.equal(await state(), before);
        assert.equal(await pixels(), original);
        if (mode === "triadic") {
          assert.notEqual(
            result.palette["secondary-container"],
            result.palette["tertiary-container"],
          );
          assert(await page.locator("[data-tertiary-preview]").isVisible());
        } else
          assert(!(await page.locator("[data-tertiary-preview]").isVisible()));
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const fits = await page.locator(".settings-colour-mode").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.querySelectorAll("button")].every((b) => {
        const q = b.getBoundingClientRect();
        return (
          q.left >= r.left &&
          q.right <= r.right + 1 &&
          b.scrollWidth <= b.clientWidth + 1
        );
      });
    });
    assert(fits, "All four colour choices fit a narrow settings panel");
    await page.screenshot({
      path: artifact("four-colours-settings.png"),
      animations: "disabled",
    });
    await page.locator("#closeSettings").click();
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    assert.equal(
      await page.locator("html").getAttribute("data-palette"),
      "triadic",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS four seeded themes in light/dark, setting persistence/setup capture, narrow choices and unchanged document/export pixels.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
