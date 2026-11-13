const assert = require("node:assert/strict");
const { launch, waitForProjectReady } = require("./browser.cjs");

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1000 },
    });
    const errors = [];
    let axeLoaded = false;
    const audit = async (selector) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (!axeLoaded) {
        await page.addScriptTag({ content: require("axe-core").source });
        axeLoaded = true;
      }
      const violations = await page.evaluate(
        async (target) =>
          (
            await axe.run(
              { include: [[target]] },
              {
                runOnly: {
                  type: "tag",
                  values: [
                    "wcag2a",
                    "wcag2aa",
                    "wcag21a",
                    "wcag21aa",
                    "wcag22a",
                    "wcag22aa",
                  ],
                },
              },
            )
          ).violations
            .filter((violation) =>
              ["serious", "critical"].includes(violation.impact),
            )
            .map((violation) => ({
              id: violation.id,
              nodes: violation.nodes.map((node) => node.target),
            })),
        selector,
      );
      assert.deepEqual(violations, [], `Accessibility audit: ${selector}`);
    };
    page.on("pageerror", (error) => errors.push(error.stack));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("[data-designer-layout=free]").click();
    assert.equal(
      await page.locator("#setupSplitPageGroup").isVisible(),
      false,
      "normal setup exposes a single carousel sequence, not group splitting",
    );
    assert.equal(
      await page.locator("#projectSetup [data-group-orientation]").count(),
      0,
    );
    await page.locator("#setupName").fill("UI-Prüfung");
    await page.locator("#cn").fill("3");
    assert.equal(
      await page
        .locator("#carouselSetupStrip")
        .evaluate((el) => getComputedStyle(el).flexDirection),
      "column",
    );
    await page
      .locator('[data-setup-artboard="0"]')
      .dragTo(page.locator('[data-setup-artboard="2"]'));
    assert.deepEqual(
      await page
        .locator("[data-setup-artboard]")
        .evaluateAll((els) => els.map((el) => +el.dataset.setupArtboard)),
      [1, 2, 0],
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => studioSetTheme(value), theme);
      await audit("#projectSetup");
    }
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    assert.equal(
      await page.locator("#carouselProperties [data-group-arrange]").count(),
      0,
      "docking is available only in the dedicated test page",
    );
    assert.equal(
      await page.evaluate(() => p.carousel.pageStructure.groups.length),
      3,
      "independent artboards retain independent groups",
    );
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.artboards.map((board) => [board.x, board.y]),
      ),
      [
        [0, 0],
        [0, 1590],
        [0, 3180],
      ],
    );
    await page.locator('[data-slide="0"]').click();
    assert.equal(
      await page
        .locator("#carouselProperties h4")
        .filter({ hasText: "Reihen & Slides" })
        .count(),
      1,
    );
    const beforeOrder = await page.evaluate(() =>
      p.carousel.artboards.map((board) => board.id),
    );
    await page.locator('.pages-thumb').first().click();
    await page.locator('#spreadPages').focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map((board) => board.id)),
      [beforeOrder[1], beforeOrder[0], beforeOrder[2]],
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => studioSetTheme(value), theme);
      await audit("#carouselSidebar");
    }
    await page.locator(".spread-page-details").evaluate(el=>el.open=true);
    const snap = page.locator("#designerSnapArtboards");
    await snap.uncheck();
    assert.equal(await page.evaluate(() => carouselUI.snap), false);
    await snap.check();
    assert.equal(await page.evaluate(() => carouselUI.snap), true);

    await page.evaluate(() => {
      const first = carouselObject("text", {
          text: "Erster Text\nZweiter Absatz",
          x: 120,
          y: 120,
          w: 600,
          h: 400,
        }),
        second = carouselObject("text", {
          text: "Weitere Zeile",
          x: 800,
          y: 120,
          w: 600,
          h: 400,
        });
      carouselSelect([first.id, second.id]);
      carouselPanel();
    });
    assert.match(
      await page.locator("#carouselProperties").innerText(),
      /2 Textebenen ausgewählt/,
    );
    assert.equal(
      await page.locator("#carouselProperties .typography-inspector").count(),
      1,
    );
    await page.locator("#carouselProperties [data-typo=size]").fill("120");
    assert.deepEqual(
      await page.evaluate(() =>
        carouselSelected().map((object) => object.size === 120),
      ),
      [true, true],
    );

    await page
      .locator("#carouselProperties [data-typo=lineHeight]")
      .fill("140");
    assert.deepEqual(
      await page.evaluate(() =>
        carouselSelected().map((object) =>
          object.textStyles.every((style) => style.lineHeight === 1.4),
        ),
      ),
      [true, true],
    );
    for (const advanced of [false, true]) {
      await page.evaluate((value) => {
        studioPreferences.advanced = value;
        carouselPanel();
      }, advanced);
      assert.equal(
        await page.locator("#carouselProperties .typography-inspector").count(),
        1,
      );
      assert.equal(
        await page.locator("#carouselProperties [data-typo=size]").count(),
        1,
      );
    }
    for (const advanced of [false, true]) {
      await page.evaluate((value) => {
        studioPreferences.advanced = value;
        carouselSelect([carouselSelected()[0].id]);
        carouselPanel();
      }, advanced);
      assert.equal(
        await page
          .locator("#carouselProperties [data-text-anchor=center]")
          .count(),
        1,
      );
    }

    const grip = page.locator(".inspector-width-splitter");
    assert.equal(await grip.getAttribute("role"), "separator");
    assert.equal(await grip.getAttribute("aria-orientation"), "vertical");
    const widthBeforeResize = await grip.getAttribute("aria-valuenow");
    await grip.focus();
    await page.keyboard.press("ArrowLeft");
    const gripBox = await grip.boundingBox();
    await page.mouse.move(gripBox.x + 6, gripBox.y + 30);
    await page.mouse.down();
    await page.mouse.move(gripBox.x - 14, gripBox.y + 30, { steps: 4 });
    await page.mouse.up();
    const widths = await page.evaluate(() => ({
      variable: parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--studio-sidebar-size",
        ),
      ),
      sidebar: document
        .querySelector("#carouselSidebar")
        .getBoundingClientRect().width,
      layers: document
        .querySelector("#carouselSidebar .carousel-layers-panel")
        .getBoundingClientRect().width,
    }));
    assert.equal(
      widths.variable,
      Math.min(450, Number(widthBeforeResize) + 25),
    );
    assert.equal(widths.sidebar, widths.layers);
    assert.equal(
      await page.evaluate(() => studioPreferences.inspectorWidth),
      Math.min(450, Number(widthBeforeResize) + 25),
    );
    assert.equal(await grip.getAttribute("aria-valuemin"), "300");
    await grip.focus();
    await page.keyboard.press("Home");
    assert.equal(await grip.getAttribute("aria-valuenow"), "300");
    await page.keyboard.press("End");
    assert.equal(await grip.getAttribute("aria-valuenow"), "450");
    assert.equal(await grip.getAttribute("aria-valuemax"), "450");
    assert.deepEqual(errors, []);
    console.log(
      "PASS free artboards start vertically, setup drag sorting and project ordering, sidebar keyboard sorting, snap toggle, unified typography in both modes, multi-text formatting, and synchronized inspector/layer width",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
