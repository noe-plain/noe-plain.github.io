const assert = require("node:assert/strict"),
  { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1700, height: 1100 },
      }),
      requests = [],
      errors = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    assert.equal(
      requests.filter((u) => new URL(u).pathname.includes("/hilfe/")).length,
      0,
    );
    await page.locator("#startNew").click();
    const setup = await page.locator("#projectSetup").boundingBox();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Dialoge");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    const sameSize = (a, b) => {
        assert(Math.abs(a.width - b.width) < 1);
        assert(Math.abs(a.height - b.height) < 1);
      },
      contained = async (selector) => {
        const r = await page.locator(selector).boundingBox(),
          v = page.viewportSize();
        assert(
          r.x >= 0 &&
            r.y >= 0 &&
            r.x + r.width <= v.width + 1 &&
            r.y + r.height <= v.height + 1,
        );
        return r;
      };
    await page.locator("#settings").click();
    const settings = await contained("#settingsDialog");
    sameSize(settings, setup);
    assert(settings.width > 1000);
    assert(settings.height > 700);
    const positions = await page
      .locator(".settings-tabs button")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    assert.equal(positions.length, 6);
    for (let i = 1; i < positions.length; i++) {
      assert.equal(positions[i].x, positions[0].x);
      assert(positions[i].y > positions[i - 1].y);
    }
    assert.equal(
      await page.locator(".settings-tabs").getAttribute("aria-orientation"),
      "vertical",
    );
    await page.locator("#settings-tab-general").focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.locator("#settings-tab-guides").getAttribute("aria-selected"),
      "true",
    );
    assert(await page.locator("#settings-panel-guides").isVisible());
    await page.keyboard.press("End");
    assert(await page.locator("#settings-panel-export").isVisible());
    await page.keyboard.press("Home");
    assert(await page.locator("#settings-panel-general").isVisible());
    const scroll = await page.evaluate(() => {
      const content = document.querySelector(".settings-content"),
        nav = document.querySelector(".settings-tabs"),
        heading = document.querySelector("#settingsDialog .dialog-heading"),
        long = document.createElement("div");
      long.id = "testLongSettings";
      long.style.height = "2000px";
      document.querySelector("#settings-panel-general").append(long);
      const before = {
        nav: nav.getBoundingClientRect().y,
        heading: heading.getBoundingClientRect().y,
      };
      content.scrollTop = 700;
      return {
        before,
        after: {
          nav: nav.getBoundingClientRect().y,
          heading: heading.getBoundingClientRect().y,
        },
        scroll: content.scrollTop,
        dialog: document.querySelector("#settingsDialog").scrollTop,
      };
    });
    assert.deepEqual(scroll.before, scroll.after);
    assert(scroll.scroll > 0);
    assert.equal(scroll.dialog, 0);
    await page.evaluate(() =>
      document.querySelector("#testLongSettings").remove(),
    );
    await page.locator("#settings-tab-guides").click();
    assert.equal(
      await page.locator("#settingsContentTitle").textContent(),
      "Hilfslinien",
    );
    const groups = await page
      .locator("#settings-panel-guides > section")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    assert.equal(groups.length, 2);
    assert(Math.abs(groups[0].y - groups[1].y) < 1);
    assert(groups[1].x > groups[0].x + groups[0].w);
    const fields = await page
        .locator(".settings-designer-grid .settings-grid-fields")
        .boundingBox(),
      preview = await page.locator(".settings-grid-preview").boundingBox();
    assert(
      preview.x > fields.x + fields.width,
      "Raster values and live preview sit together",
    );
    await page.screenshot({ path: artifact("settings-sidebar-desktop.png") });
    sameSize(await page.locator("#settingsDialog").boundingBox(), settings);
    await page.locator("#closeSettings").click();
    assert.equal(
      requests.filter((u) => new URL(u).pathname.includes("/hilfe/")).length,
      0,
    );
    await page.locator("#help").click();
    await page
      .frameLocator("#studioHelpFrame")
      .locator("#helpSearch")
      .waitFor();
    sameSize(await contained("#studioHelpDialog"), settings);
    await page.screenshot({ path: artifact("wiki-shared-size.png") });
    await page.locator("#closeStudioHelp").click();
    await page.locator("#carouselExport").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".export-card").length === 1,
    );
    sameSize(await contained("#exportDialog"), settings);
    await page.locator("#closeExport").click();
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 700, height: 500 },
    ]) {
      await page.setViewportSize(viewport);
      await page.locator("#settings").click();
      const size = await contained("#settingsDialog");
      await page.locator("#settings-tab-fonts").click();
      assert.equal(
        await page.evaluate(() => {
          const d = document.querySelector("#settingsDialog"),
            c = d.querySelector(".settings-content");
          return (
            d.scrollWidth <= d.clientWidth + 1 &&
            c.scrollWidth <= c.clientWidth + 1
          );
        }),
        true,
      );
      await page.locator("#settings-tab-guides").click();
      await page.locator('[data-designer-grid="gap"]').fill("24");
      await page.locator('[data-designer-grid="gap"]').dispatchEvent("change");
      assert.equal(
        await page.evaluate(() => studioPreferences.designerGrid.gap),
        24,
      );
      assert.equal(
        await page.locator("#settings-tab-guides span").isVisible(),
        viewport.width > 700,
      );
      await page.screenshot({
        path: artifact(`settings-sidebar-${viewport.width}.png`),
      });
      await page.locator("#closeSettings").click();
      await page.locator("#help").click();
      sameSize(await contained("#studioHelpDialog"), size);
      assert(
        await page
          .frameLocator("#studioHelpFrame")
          .locator("#helpSearch")
          .isVisible(),
      );
      await page.locator("#closeStudioHelp").click();
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS responsive shared settings/Wiki/setup/export dimensions, persistent sidebar navigation, vertical keyboard access, isolated content scrolling, compact icons, functional fields and lazy Wiki loading",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
