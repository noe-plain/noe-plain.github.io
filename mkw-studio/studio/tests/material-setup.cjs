const assert = require("node:assert/strict");
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
    await page.waitForFunction(
      () => !document.querySelector("#startTemplates").disabled,
    );
    assert(
      !requests.some((r) => r.includes("/static/templates/")),
      "Template content stays lazy",
    );
    await page.locator("#startNew").click();
    const initial = await page.evaluate(() => ({
      model: JSON.stringify(p),
      revision,
      undo: history.length,
    }));
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      for (const mode of ["normal", "complementary"]) {
        await page.evaluate((mode) => {
          studioPreferences.colourMode = mode;
          studioApplyColourTheme();
        }, mode);
        for (const width of [1500, 900, 500, 360]) {
          await page.setViewportSize({ width, height: 1100 });
          await page
            .locator("#projectSetup")
            .evaluate((el) => (el.scrollTop = 0));
          const geometry = await page
            .locator("#projectSetup")
            .evaluate((el) => ({
              overflow: el.scrollWidth > el.clientWidth + 1,
              fields: [
                ...el.querySelectorAll(".setup-project-fields input"),
              ].map((e) => e.getBoundingClientRect().height),
              footer:
                el.querySelector("#createProject").getBoundingClientRect()
                  .bottom <= el.getBoundingClientRect().bottom,
              checks: [...el.querySelectorAll("[data-format-enabled]")].map(
                (e) => e.getBoundingClientRect().width,
              ),
              legends: [
                ...el.querySelectorAll(".format-choice legend label"),
              ].map((e) => e.getBoundingClientRect().height),
            }));
          assert.equal(
            geometry.overflow,
            false,
            `${theme}/${mode}/${width}: setup overflow`,
          );
          assert(geometry.fields.every((h) => h >= 56));
          assert(geometry.checks.every((w) => w === 18));
          assert(geometry.legends.every((h) => h >= 48));
          assert(geometry.footer, "Next action remains visible");
        }
        await page.setViewportSize({ width: 1500, height: 1100 });
        await page.locator("[data-project-mode=carousel]").click();
        await page.waitForTimeout(400);
        const selected = await page
          .locator("[data-project-mode=carousel]")
          .evaluate((el) => {
            const s = getComputedStyle(el),
              hex = (v) =>
                "#" +
                v
                  .match(/\d+/g)
                  .slice(0, 3)
                  .map((n) => (+n).toString(16).padStart(2, "0"))
                  .join("");
            return {
              pressed: el.getAttribute("aria-pressed"),
              contrast: MKWUIColor.contrast(
                hex(s.color),
                hex(s.backgroundColor),
              ),
              bg: s.backgroundColor,
            };
          });
        assert.equal(selected.pressed, "true");
        assert(selected.contrast >= 4.5, "Selected mode remains readable");
        assert.notEqual(selected.bg, "rgba(0, 0, 0, 0)");
        await page
          .locator("#projectSetup")
          .evaluate((el) => (el.scrollTop = 0));
        await page.screenshot({
          path: artifact(`material-setup-${theme}-${mode}.png`),
        });
        await page.locator("[data-project-mode=post]").click();
      }
    }
    await page.locator("#createProject").click();
    assert(await page.locator("#setupError").isVisible());
    assert.match(await page.locator("#setupError").innerText(), /Name|Namen/);
    await page.locator("#cancelSetup").click();
    assert.deepEqual(
      await page.evaluate(() => ({
        model: JSON.stringify(p),
        revision,
        undo: history.length,
      })),
      initial,
      "Setup UI does not mutate the current document",
    );
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.locator("#startTemplates").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      for (const width of [1500, 900, 500, 360]) {
        await page.setViewportSize({ width, height: 1100 });
        await page
          .locator("#templateGallery")
          .evaluate((el) => (el.scrollTop = 0));
        const geometry = await page
          .locator("#templateGallery")
          .evaluate((el) => {
            const badge = el.querySelector(".template-slide-badge"),
              s = getComputedStyle(badge),
              hex = (v) =>
                "#" +
                v
                  .match(/\d+/g)
                  .slice(0, 3)
                  .map((n) => (+n).toString(16).padStart(2, "0"))
                  .join("");
            return {
              overflow: el.scrollWidth > el.clientWidth + 1,
              contrast: MKWUIColor.contrast(
                hex(s.color),
                hex(s.backgroundColor),
              ),
              targets: [
                ...el.querySelectorAll(
                  ".template-slider-controls button,.template-preview-dots button,.template-preview-navigation > button",
                ),
              ].map((e) => ({
                w: e.getBoundingClientRect().width,
                h: e.getBoundingClientRect().height,
              })),
              footer:
                el.querySelector("#templateCreate").getBoundingClientRect()
                  .bottom <= el.getBoundingClientRect().bottom,
            };
          });
        assert.equal(
          geometry.overflow,
          false,
          `${theme}/${width}: gallery overflow`,
        );
        assert(
          geometry.contrast >= 4.5,
          "Badge has a defined contrasting surface",
        );
        assert(geometry.targets.every((t) => t.w >= 40 && t.h >= 40));
        assert(geometry.footer, "Designer action stays visible");
      }
      await page.setViewportSize({ width: 1500, height: 1100 });
      await page
        .locator("#templateGallery")
        .evaluate((el) => (el.scrollTop = 0));
      await page.screenshot({
        path: artifact(`material-templates-${theme}.png`),
      });
    }
    // Simulate a narrow navigation lane: choosing a slide reveals its dot without moving the dialog vertically.
    await page.locator(".template-preview-dots").evaluate((el) => {
      el.style.flex = "none";
      el.style.width = "80px";
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('[data-preview-slide="2"]').focus();
    const galleryScroll = await page
      .locator("#templateGallery")
      .evaluate((el) => el.scrollTop);
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () =>
        document.querySelector("#templatePreviewCount").textContent === "3 / 4",
    );
    assert(
      await page.locator(".template-preview-dots").evaluate((el) => {
        const b = el.querySelector("[aria-pressed=true]");
        return (
          b.offsetLeft >= el.scrollLeft - 1 &&
          b.offsetLeft + b.offsetWidth <= el.scrollLeft + el.clientWidth + 1
        );
      }),
    );
    assert.equal(
      await page.locator("#templateGallery").evaluate((el) => el.scrollTop),
      galleryScroll,
    );
    await page.locator("#closeTemplateGallery").click();
    assert.deepEqual(
      await page.evaluate(() => ({
        model: JSON.stringify(p),
        revision,
        undo: history.length,
      })),
      initial,
      "Preview UI and cancellation preserve document/history",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS Material setup/template geometry, theme and complementary selection contrast, compact format access, visible actions, responsive 360px dialogs, 40px preview controls, keyboard preview, lazy templates and document isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
