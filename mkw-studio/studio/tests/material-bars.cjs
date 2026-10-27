const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Material Projektverwaltung");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy);
    await page.evaluate(async () => {
      const c = makeCanvas(800, 1000),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#38645f";
      ctx.fillRect(0, 0, 800, 1000);
      ctx.fillStyle = "#e7c592";
      ctx.fillRect(100, 180, 450, 420);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          name: "Probe.png",
          data,
          original: data,
          width: 800,
          height: 1000,
        };
      p.images = [im];
      p.boards = [createBoard(im, 1080, 1350)];
      p.boards[0].elements.title.text = "Musik für alle";
      selected = p.boards[0].id;
      render();
      await prepareLogo(p.boards[0]);
      await autosave();
    });
    const geometry = async (bar, button) =>
      page.locator(bar).evaluate((el, button) => {
        const surface = el.querySelector(".studio-tool-surface"),
          s = surface.getBoundingClientRect(),
          b = el.querySelector(button).getBoundingClientRect(),
          r = el.getBoundingClientRect();
        return {
          gap: b.left - s.right,
          below: b.top - s.bottom,
          centered:
            Math.abs((b.left + b.right) / 2 - (s.left + s.right) / 2) < 2,
          bar: r.height,
          button: b.height,
          background: getComputedStyle(el).backgroundColor,
          overflow: el.scrollWidth > el.clientWidth + 1,
          inside: b.right <= innerWidth && b.left >= 0,
          surfaceRadius: parseFloat(
            getComputedStyle(surface).borderTopLeftRadius,
          ),
        };
      }, button);
    const checkContrast = async (selector) => {
      const value = await page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const hex = (v) =>
            "#" +
            v
              .match(/\d+/g)
              .slice(0, 3)
              .map((n) => (+n).toString(16).padStart(2, "0"))
              .join("");
          let parent = el;
          while (
            getComputedStyle(parent).backgroundColor === "rgba(0, 0, 0, 0)" &&
            parent.parentElement
          )
            parent = parent.parentElement;
          return MKWUIColor.contrast(
            hex(getComputedStyle(el).color),
            hex(getComputedStyle(parent).backgroundColor),
          );
        });
      assert(value >= 4.5, `${selector}: readable contrast`);
    };
    assert.equal(await page.locator("header [role=group]").count(), 3);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      const box = await geometry(".dock", "#export");
      assert(box.gap >= 8 && box.inside);
      assert.equal(box.bar, 58);
      assert.equal(box.button, 58);
      assert.equal(box.background, "rgba(0, 0, 0, 0)");
      assert(box.surfaceRadius >= 28);
      await checkContrast("#export");
      await page.locator("#save").click();
      assert(await page.locator("#saveDialog").isVisible());
      assert((await page.locator("#saveName").boundingBox()).height >= 56);
      assert((await page.locator("#saveProjectAs").boundingBox()).height >= 48);
      assert(
        await page
          .locator("#saveProject")
          .evaluate(
            (e) =>
              !!(
                e.compareDocumentPosition(document.querySelector("#savePSD")) &
                Node.DOCUMENT_POSITION_FOLLOWING
              ),
          ),
      );
      await checkContrast("#saveProject strong");
      await checkContrast("#savePSD small");
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-save-${theme}.png`),
      });
      await page.locator("#closeSave").click();
      await page.locator("#open").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#projectLibraryList")
            .getAttribute("aria-busy") === "false",
      );
      assert.equal(
        await page
          .locator(".project-library-row svg[data-google-icon]")
          .count(),
        1,
      );
      assert(
        (await page.locator(".project-library-row").boundingBox()).height >= 72,
      );
      assert(
        (await page.locator("[data-delete-project]").boundingBox()).height >=
          48,
      );
      assert(await page.locator("[data-delete-project]").isDisabled());
      await checkContrast(".project-library-row small");
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-library-${theme}.png`),
      });
      await page.keyboard.press("Escape");
      assert(
        await page
          .locator("#open")
          .evaluate((e) => e === document.activeElement),
      );
      await page.locator("#export").click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".export-size")].every(
          (e) => e.dataset.bytes,
        ),
      );
      assert.equal(
        await page.locator(".export-format-buttons button:visible").count(),
        3,
      );
      assert((await page.locator("#exportPreset").boundingBox()).height >= 56);
      await checkContrast(".export-name");
      await checkContrast("#zip");
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-export-${theme}.png`),
      });
      for (const width of [900, 560, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        const layout = await page.locator("#exportDialog").evaluate((el) => {
          const r = el.getBoundingClientRect(),
            b = el.querySelector("#zip").getBoundingClientRect(),
            s = el.querySelector(".export-settings-scroll");
          return {
            overflow: el.scrollWidth > el.clientWidth + 1,
            visible:
              b.bottom <= r.bottom && b.right <= r.right && b.left >= r.left,
            scroll: s.scrollHeight > s.clientHeight,
          };
        });
        assert.equal(
          layout.overflow,
          false,
          `${width}: export has no horizontal overflow`,
        );
        assert(layout.visible, `${width}: download stays visible`);
        assert(layout.scroll, "Settings keep independent scroll access");
      }
      await page.locator("#deselectAllExports").click();
      assert(await page.locator("#zip").isDisabled());
      await page.locator("#selectAllExports").click();
      assert(await page.locator(".export-card input").isChecked());
      await page.locator("#closeExport").click();
      await page.setViewportSize({ width: 1500, height: 1100 });
    }
    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Designer Toolbar");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    assert(
      (await geometry(".carousel-contextbar", "#carouselExport")).gap >= 8,
    );
    await page.locator("#settings").click();
    await page.locator("#settings-tab-workflow").click();await page.locator("#advancedMode").check();
    await page.locator("#closeSettings").click();
    const advanced = await geometry(".carousel-contextbar", "#carouselExport");
    assert(advanced.below >= 8 && advanced.centered && advanced.inside);
    assert(
      await page.locator(".studio-tool-surface #advancedColours").isVisible(),
    );
    await page.locator("#carouselExport").click();
    await page.locator("[data-export-format=png]").click();
    await page.locator("#exportTransparent").check();
    await page.waitForFunction(() =>
      document
        .querySelector(".export-preview")
        ?.classList.contains("checkerboard"),
    );
    assert.notEqual(
      await page
        .locator(".export-preview")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
      "none",
      "Real alpha previews retain their checkerboard",
    );
    await page.locator("#reviewExport").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#reviewImage")?.getAttribute("src") &&
        document
          .querySelector(".review-stage")
          ?.classList.contains("checkerboard"),
    );
    assert.notEqual(
      await page
        .locator(".review-stage")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
      "none",
      "Full export preview shows real alpha too",
    );
    await page.locator("#closeReview").click();
    await page.locator("#exportTransparent").uncheck();
    await page.waitForFunction(
      () =>
        !document
          .querySelector(".export-preview")
          ?.classList.contains("checkerboard"),
    );
    assert.equal(
      await page
        .locator(".export-preview")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
      "none",
      "Opaque previews have no transparency pattern",
    );
    await page.locator("#closeExport").click();
    const artworkSnapshot = () => {
      const document = clone(p);
      // Resizing the viewport updates these existing view bookmarks, not artwork.
      for (const key of ["zoom", "scrollX", "scrollY"])
        delete document.carousel[key];
      return {
        model: JSON.stringify(document),
        revision,
        undo: history.length,
      };
    };
    const doc = await page.evaluate(artworkSnapshot);
    for (const width of [1500, 640, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        (await geometry(".carousel-contextbar", "#carouselExport")).inside,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.screenshot({
      animations: "disabled",
      path: artifact("material-floating-advanced.png"),
    });
    assert.deepEqual(
      await page.evaluate(artworkSnapshot),
      doc,
      "Toolbar layout and viewport changes preserve artwork/history",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS grouped header, external floating export in both editors/Advanced, palette retained inside pill, save choices/fields, metadata-only library/current protection, theme contrast, native focus, responsive export/visible progress/download and document isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
