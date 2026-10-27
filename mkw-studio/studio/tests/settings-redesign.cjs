const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startSettings").click();
    await page.addScriptTag({ content: require("axe-core").source });
    const before = await page.evaluate(() => JSON.stringify(p));
    const categories = [
      "general",
      "workflow",
      "guides",
      "fonts",
      "sponsors",
      "templates",
      "export",
    ];
    async function contained() {
      const overflow = await page
        .locator("#settingsDialog")
        .evaluate((dialog) => {
          const content = dialog.querySelector(".settings-content"),
            r = dialog.getBoundingClientRect();
          return {
            dialog: dialog.scrollWidth > dialog.clientWidth + 1,
            content: content.scrollWidth > content.clientWidth + 1,
            outside:
              r.left < 0 ||
              r.right > innerWidth + 1 ||
              r.top < 0 ||
              r.bottom > innerHeight + 1,
          };
        });
      assert.deepEqual(overflow, {
        dialog: false,
        content: false,
        outside: false,
      });
    }
    async function audit() {
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
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      );
      assert.deepEqual(violations, []);
    }
    for (const theme of ["light", "dark"]) {
      await page.locator("#settings-tab-general").click();
      await page.locator(`[data-theme-choice=${theme}]`).click();
      for (const id of categories) {
        await page.locator(`#settings-tab-${id}`).click();
        if (id === "sponsors") await page.locator("#newSponsorGroup").waitFor();
        if (id === "templates")
          await page.locator("#templateLibraryList > *").first().waitFor();
        await page.waitForTimeout(230);
        assert.equal(
          await page.locator(".settings-tabs [aria-selected=true]").count(),
          1,
        );
        assert(await page.locator(`#settings-panel-${id}`).isVisible());
        await contained();
        await audit();
        await page.screenshot({
          path: artifact(`settings-new-${theme}-${id}.png`),
        });
      }
    }
    const search = page.locator("#settingsSearch");
    for (const [query, category, target] of [
      ["Farbe", "general", ".settings-colours"],
      ["Advanced", "workflow", ".settings-advanced"],
      ["Stege", "guides", ".settings-designer-grid"],
      ["Schriftgrössen", "fonts", ".settings-text-sizes"],
      ["Sponsorgruppen", "sponsors", "#settings-panel-sponsors"],
      ["Vorlagen", "templates", "#settings-panel-templates"],
      ["Verknüpfen", "export", ".settings-setup"],
      ["Hintergrund", "general", ".settings-start-background"],
    ]) {
      await search.fill(query);
      const result = page.locator(".settings-result").first();
      assert(await result.isVisible(), query);
      await result.click();
      assert.equal(await search.inputValue(), "");
      assert.equal(
        await page
          .locator(`#settings-tab-${category}`)
          .getAttribute("aria-selected"),
        "true",
      );
      assert(await page.locator(target).isVisible());
      assert.equal(
        await page.evaluate(() => document.activeElement.tabIndex),
        -1,
      );
    }
    await search.fill("NICHT-VORHANDEN-123");
    assert.match(
      await page.locator("#settingsSearchStatus").textContent(),
      /Keine Einstellung/,
    );
    await audit();
    await page.screenshot({ path: artifact("settings-new-empty-search.png") });
    await page.keyboard.press("Escape");
    assert(await page.locator("#settingsDialog").isVisible());
    assert.equal(await search.inputValue(), "");
    await search.fill("Zeilenabstand");
    await search.press("Enter");
    assert(await page.locator("#settings-panel-fonts").isVisible());
    await page.locator("#settings-tab-general").focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "settings-tab-workflow",
    );
    await page.keyboard.press("End");
    assert(await page.locator("#setupExport").isVisible());
    await page.keyboard.press("Home");
    assert(await page.locator("[data-theme-choice=light]").isVisible());
    await page.locator("[data-theme-choice=light]").click();
    // A failed preference write is visible, never silently described as saved.
    await page.evaluate(() => {
      window.settingsOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "mkw-studio-preferences")
          throw new DOMException("Quota", "QuotaExceededError");
        return window.settingsOriginalSetItem.call(this, key, value);
      };
    });
    await page.locator("[data-colour-mode=triadic]").click();
    assert.equal(
      await page.locator("#settingsPreferenceStatus").getAttribute("role"),
      "alert",
    );
    assert.match(
      await page.locator("#settingsPreferenceStatus").textContent(),
      /Nicht im Browser gespeichert/,
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.settingsOriginalSetItem;
    });
    await page.locator("[data-colour-mode=normal]").click();
    assert.equal(
      await page.locator("#settingsPreferenceStatus").getAttribute("role"),
      "status",
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = function (key, value) {
        if (key === "mkw-studio-theme")
          throw new DOMException("Quota", "QuotaExceededError");
        return window.settingsOriginalSetItem.call(this, key, value);
      };
    });
    await page.locator("[data-theme-choice=dark]").click();
    await page.locator("[data-colour-mode=triadic]").click();
    assert.equal(
      await page.locator("#settingsPreferenceStatus").getAttribute("role"),
      "alert",
      "saving another key must not hide a failed theme write",
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.settingsOriginalSetItem;
    });
    await page.locator("[data-theme-choice=light]").click();
    await page.locator("[data-colour-mode=normal]").click();
    assert.equal(
      await page.locator("#settingsPreferenceStatus").getAttribute("role"),
      "status",
    );
    // Responsive labels, usable content and unchanged project data across every category.
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 700, height: 500 },
    ]) {
      await page.setViewportSize(viewport);
      assert.equal(
        await page.locator(".settings-tabs").getAttribute("aria-orientation"),
        viewport.width <= 700 ? "horizontal" : "vertical",
      );
      for (const id of categories) {
        await page.locator(`#settings-tab-${id}`).click();
        if (id === "sponsors") await page.locator("#newSponsorGroup").waitFor();
        await contained();
        assert(await page.locator(`#settings-tab-${id} span`).isVisible());
        if (viewport.width === 390) await audit();
      }
      await page.locator("#settings-tab-general").click();
      await page.waitForTimeout(230);
      await page.screenshot({
        path: artifact(`settings-new-${viewport.width}.png`),
      });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#settings-tab-fonts").click();
    assert.equal(
      await page
        .locator("#settings-panel-fonts")
        .evaluate((el) => el.getAnimations().length),
      0,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      before,
      "settings UI never mutates project",
    );
    await page.locator("#settingsDone").click();
    assert(!(await page.locator("#settingsDialog").isVisible()));
    assert(await page.locator("#startDialog").isVisible());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "startSettings",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS all seven settings categories in light/dark, accessible search/deep links/empty/Escape, storage failure and recovery, keyboard navigation, responsive labels/overflow, reduced motion and untouched document",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
