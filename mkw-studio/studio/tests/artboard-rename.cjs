const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Artboard-Namen");
    await page.locator("[data-designer-layout=free]").click();
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const open = async () => {
      await page.locator(".pages-board-menu").first().click();
      await page
        .getByRole("menuitem", { name: "Umbenennen", exact: true })
        .click();
    };
    await open();
    const initialHistory = await page.evaluate(() => history.length);
    await page.locator("#artboardNameInput").fill("  Sommerreihe  ");
    await page.locator("#artboardNameInput").press("Enter");
    assert(
      !(await page.locator("#artboardRenameDialog").count()) ||
        !(await page.locator("#artboardRenameDialog").isVisible()),
      "Enter must accept a valid artboard name",
    );
    await page.locator("#artboardRenameDialog").waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(() => p.carousel.pageStructure.artboardInfo[0].name),
      "Sommerreihe",
    );
    assert.equal(await page.evaluate(() => history.length), initialHistory + 1);
    const state = () =>
      page.evaluate(() => ({
        doc: JSON.stringify(snapshot()),
        history: history.length,
        revision,
      }));
    const renamed = await state();
    await open();
    await page.locator("#artboardNameInput").fill("   ");
    await page.locator("#artboardNameInput").press("Enter");
    assert(await page.locator("#artboardRenameDialog").isVisible());
    assert.equal(
      await page.locator("#artboardNameInput").getAttribute("aria-invalid"),
      "true",
    );
    assert.deepEqual(await state(), renamed);
    await page.locator("#artboardNameInput").evaluate((input) => {
      input.value = "X".repeat(81);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("[data-board-apply]").click();
    assert.equal(
      await page.locator("#artboardNameInput").getAttribute("aria-invalid"),
      "true",
    );
    assert.deepEqual(await state(), renamed);
    await page.locator("#artboardNameInput").fill("Korrigiert");
    assert.notEqual(
      await page.locator("#artboardNameInput").getAttribute("aria-invalid"),
      "true",
    );
    await page.keyboard.press("Escape");
    await page.locator("#artboardRenameDialog").waitFor({ state: "detached" });
    assert.deepEqual(await state(), renamed);
    await open();
    await page.locator("#artboardNameInput").press("Enter");
    await page.locator("#artboardRenameDialog").waitFor({ state: "detached" });
    assert.deepEqual(
      await state(),
      renamed,
      "Unchanged name closes without a document/history change",
    );
    await page.evaluate(() => undo());
    assert.notEqual(
      await page.evaluate(() => p.carousel.pageStructure.artboardInfo[0].name),
      "Sommerreihe",
    );
    await page.evaluate(() => redo());
    assert.equal(
      await page.evaluate(() => p.carousel.pageStructure.artboardInfo[0].name),
      "Sommerreihe",
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    await open();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      assert(
        await page.locator("#artboardRenameDialog").evaluate((dialog) => {
          const r = dialog.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            dialog.scrollWidth <= dialog.clientWidth
          );
        }),
      );
      await page.screenshot({
        path: artifact("artboard-rename-ipad-" + theme + ".png"),
      });
    }
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "PASS rename with Enter, trimmed names, whitespace/overlength rejection, correction, cancel/no-op, undo/redo and iPad light/dark dialog",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
