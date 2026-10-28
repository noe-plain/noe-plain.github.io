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
    page.on("dialog", (d) => d.accept());
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Export im Überblick");
    await page.locator("#createProject").click();
    await page.waitForFunction(
      () => !busy && !document.querySelector("#projectSetup").open,
    );
    await page.evaluate(async () => {
      const c = makeCanvas(600, 750),
        ctx = exportContext(c);
      ctx.fillStyle = "#477885";
      ctx.fillRect(0, 0, 600, 750);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          name: "Testbild.png",
          width: 600,
          height: 750,
          data,
          original: data,
        };
      p.images = [im];
      p.boards = [
        [600, 750],
        [600, 600],
        [800, 600],
      ].map(([w, h]) => {
        const b = basicBoard(im, w, h);
        b.safe = { top: 50, bottom: 100, left: 50, right: 50 };
        return b;
      });
      changed();
      await autosave();
    });
    await page.addScriptTag({ content: require("axe-core").source });
    const fits = async () => {
      const actual = await page.locator("#exportDialog").evaluate((el) => {
        const r = el.getBoundingClientRect(),
          b = el.querySelector("#zip").getBoundingClientRect(),
          footer = el
            .querySelector(".export-task-footer")
            .getBoundingClientRect(),
          body = el.querySelector(".export-layout");
        return {
          overflow:
            el.scrollWidth > el.clientWidth + 1 ||
            body.scrollWidth > body.clientWidth + 1,
          button: b.bottom <= r.bottom && b.top >= r.top,
          footer: footer.bottom <= r.bottom + 1,
          bodyHeight: body.getBoundingClientRect().height,
        };
      });
      assert(!actual.overflow, JSON.stringify(actual));
      assert(actual.button && actual.footer, JSON.stringify(actual));
      assert(actual.bodyHeight > 30, JSON.stringify(actual));
    };
    for (const mode of ["post", "carousel"]) {
      if (mode === "carousel") {
        await page.locator("#newproject").click();
        await page.locator("[data-project-mode=carousel]").click();
        await page.locator("#setupName").fill("Designer Export");
        await page.locator("#cn").fill("2");
        await page.locator("#createProject").click();
        await page.waitForFunction(
          () =>
            p.carousel &&
            !busy &&
            !document.querySelector("#projectSetup").open,
        );
      }
      await page
        .locator(mode === "post" ? "#export" : "#carouselExport")
        .click();
      assert.equal(
        await page.locator(".export-selection h3").innerText(),
        mode === "post" ? "Bilder auswählen" : "Slides auswählen",
      );
      assert.equal(
        await page
          .locator("#exportDialog > .export-task-footer #exportProgress")
          .count(),
        1,
      );
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => studioSetTheme(t), theme);
        await page.emulateMedia({ reducedMotion: "reduce" });
        for (const size of [
          { width: 1500, height: 1050 },
          { width: 1024, height: 768 },
          { width: 700, height: 500 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(size);
          await fits();
        }
        await page.setViewportSize({ width: 1500, height: 1050 });
        await page.waitForTimeout(150);
        const axe = await page.evaluate(async () =>
          (
            await axe.run("#exportDialog", {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            })
          ).violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        );
        assert.deepEqual(axe, []);
        await page.screenshot({
          path: artifact(`export-panel-${mode}-${theme}.png`),
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: artifact(`export-panel-${mode}-mobile.png`),
      });
      await page.setViewportSize({ width: 1500, height: 1050 });
      await page.locator("#deselectAllExports").click();
      assert(await page.locator("#zip").isDisabled());
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /mindestens/,
      );
      await page.locator("#selectAllExports").click();
      await page.locator("#date").fill("151126");
      assert(!(await page.locator("#zip").isDisabled()));
      await page.locator("#date").fill("");
      assert(!(await page.locator("#zip").isDisabled()));
      await page.locator("[data-export-format=png]").click();
      await page.locator("#png8").check();
      await page.locator("#pngColours").selectOption("16");
      assert(await page.locator("#pngColoursField").isVisible());
      await page.locator("#exportTransparent").check();
      await page.locator("[data-export-format=webp]").click();
      assert(await page.locator("#qualityField").isVisible());
      await page.locator("#exportQuality").fill("75");
      assert.equal(await page.locator("#qualityValue").innerText(), "75 %");
      if (mode === "carousel") {
        await page.locator("[data-export-format=pdf]").click();
        await page.locator("#exportPreset").selectOption("linkedin");
        assert(await page.locator("#pdfExportSettings").isVisible());
        assert(!(await page.locator("#qualityField").isVisible()));
        assert.equal(
          await page.locator("#zip").innerText(),
          "PDF herunterladen",
        );
      }
      await page.locator("#closeExport").click();
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS unified export sections, persistent full-width progress/download, desktop/mobile short-window geometry, both editors/themes, axe, selection/date/PNG8/transparency/WebP/PDF presets",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
