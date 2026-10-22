const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Menüs und Rückmeldungen");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    const ids = await page.evaluate(() => {
      carouselObject("shape", {
        id: "menu-shape",
        name: "Bühne",
        x: 200,
        y: 300,
        w: 500,
        h: 500,
        fill: "#d4a253",
      });
      carouselPanel();
      return {
        shape: "menu-shape",
        logo: p.carousel.objects.find((o) => o.type === "logo").id,
      };
    });
    const original = await page.evaluate(() => JSON.stringify(p));
    const logoAction = page.locator(
      `[data-layer="${ids.logo}"] .carousel-layer-actions`,
    );
    await logoAction.focus();
    await page.keyboard.press("ArrowDown");
    await page.locator("#carouselLayerMenu").waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.layerMenu),
      "rename",
    );
    await page.keyboard.press("End");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.layerMenu),
      "delete",
    );
    assert.equal(
      await page
        .locator("[data-layer-menu=delete]")
        .getAttribute("aria-disabled"),
      "true",
    );
    const count = await page.evaluate(() => p.carousel.objects.length);
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => p.carousel.objects.length), count);
    await page.locator("[data-layer-menu=delete]").dispatchEvent("click");
    assert.equal(
      await page.evaluate(() => p.carousel.objects.length),
      count,
      "protected logos cannot be removed via disabled menu items",
    );
    await page.keyboard.press("Home");
    await page.keyboard.press("n");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.layerMenu),
      "up",
      "typing finds the next matching action",
    );
    await page.keyboard.press("Escape");
    assert(
      await logoAction.evaluate((el) => el === document.activeElement),
      "Escape returns to the trigger",
    );
    await page.locator("#carouselLayerMenu").waitFor({ state: "detached" });
    await page.keyboard.press("ArrowUp");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.layerMenu),
      "delete",
    );
    await page.keyboard.press("Tab");
    await page.locator("#carouselLayerMenu").waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      original,
      "menu navigation never edits the document",
    );
    await page.evaluate((id) => {
      carouselSelect([id]);
      carouselPanel();
    }, ids.shape);
    const action = page.locator(
      `[data-layer="${ids.shape}"] .carousel-layer-actions`,
    );
    await action.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("d");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.layerMenu),
      "duplicate",
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => p.carousel.objects.length),
      count + 1,
    );
    const beforeUndo = await page.locator("#carouselEditor").elementHandle();
    await page.locator("#undo").click();
    await page.waitForFunction((editor) => !editor.isConnected, beforeUndo);
    await beforeUndo.dispose();
    assert.equal(await page.evaluate(() => p.carousel.objects.length), count);
    await page.evaluate((id) => {
      carouselSelect([id]);
      carouselPanel();
    }, ids.shape);
    await page.locator("#carouselAddEffect").focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.addEffect),
      "blur",
    );
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.addEffect),
      "noise",
    );
    await page.keyboard.press("Enter");
    await page.locator("#carouselEffectEditor").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#carouselEffectStrength").inputValue(),
      "12",
    );
    await page.locator("#carouselEffectStrength").press("ArrowRight");
    assert.equal(
      await page.evaluate(
        (id) => p.carousel.objects.find((o) => o.id === id).effects.noise,
        ids.shape,
      ),
      13,
    );
    await page.locator("[data-effect-done]").click();

    // Native checkboxes still update the actual export options with Space.
    await page.evaluate(() => openExport());
    await page.locator("[data-export-format=png]").click();
    await page.locator("#png8").focus();
    const png8 = await page.locator("#png8").isChecked();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#png8").isChecked(), !png8);
    assert.equal(await page.evaluate(() => exportOptions.png8), !png8);
    await page.evaluate(() => setExportProgress(1, 4, "Ein Bild von vier"));
    assert.equal(await page.locator("#progressPercent").textContent(), "25 %");
    assert.equal(
      await page.locator("#progressText").textContent(),
      "Ein Bild von vier",
    );
    assert.deepEqual(
      await page
        .locator("#downloadProgress")
        .evaluate((el) => ({ value: el.value, max: el.max })),
      { value: 1, max: 4 },
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      const labels = await page.evaluate(() => {
        const hex = (v) =>
          "#" +
          v
            .match(/\d+/g)
            .slice(0, 3)
            .map((n) => (+n).toString(16).padStart(2, "0"))
            .join("");
        return [".export-name", ".export-size", "#exportTotal"].map(
          (selector) => {
            const el = document.querySelector(selector);
            let parent = el;
            while (
              getComputedStyle(parent).backgroundColor === "rgba(0, 0, 0, 0)" &&
              parent.parentElement
            )
              parent = parent.parentElement;
            return {
              selector,
              contrast: MKWUIColor.contrast(
                hex(getComputedStyle(el).color),
                hex(getComputedStyle(parent).backgroundColor),
              ),
            };
          },
        );
      });
      for (const label of labels)
        assert(
          label.contrast >= 4.5,
          `${theme} ${label.selector} is readable during export`,
        );
    }
    await page.evaluate(() => studioSetTheme("light"));
    await page.screenshot({
      animations: "disabled",
      path: artifact("material-workflow-export.png"),
    });
    await page.evaluate(() => setExportProgress(4, 4, "Alle Bilder erstellt"));
    assert.equal(
      await page
        .locator("#exportProgress")
        .evaluate((el) => el.classList.contains("is-running")),
      false,
    );
    await page.locator("#closeExport").click();
    await page.evaluate(() =>
      MKWProjects.notice(
        "Sicherung nicht möglich. Bitte Speicherplatz prüfen.",
        true,
      ),
    );
    assert.equal(
      await page.locator("#projectStorageNotice").getAttribute("role"),
      "alert",
    );
    assert(await page.locator("#projectStorageNotice").isVisible());
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      const contrast = await page
        .locator("#projectStorageNotice")
        .evaluate((el) => {
          const s = getComputedStyle(el),
            hex = (v) =>
              "#" +
              v
                .match(/\d+/g)
                .slice(0, 3)
                .map((n) => (+n).toString(16).padStart(2, "0"))
                .join("");
          return MKWUIColor.contrast(hex(s.color), hex(s.backgroundColor));
        });
      assert(
        contrast >= 4.5,
        "persistent save errors remain legible in both themes",
      );
      await action.click();
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-workflow-${theme}.png`),
      });
      await page.setViewportSize({ width: 640, height: 900 });
      await page.locator("#carouselLayerMenu").waitFor({ state: "detached" });
      await page.locator("#toolsToggle").click();
      await action.click();
      const small = await page.locator("#carouselLayerMenu").boundingBox();
      assert(
        small.x >= 0 &&
          small.y >= 0 &&
          small.x + small.width <= 641 &&
          small.y + small.height <= 901,
      );
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-workflow-${theme}-narrow.png`),
      });
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1500, height: 1000 });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() =>
      MKWProjects.notice("Speichern nicht abgeschlossen.", true),
    );
    assert.equal(
      await page
        .locator("#projectStorageNotice")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS keyboard menus/typeahead/focus, discoverable disabled choices with protected actions, duplicate/undo, independent FX, native export checkboxes, accurate progress and persistent accessible save errors in both themes",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
