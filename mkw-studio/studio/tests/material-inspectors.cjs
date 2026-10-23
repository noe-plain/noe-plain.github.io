const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1050 },
        }),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode="${mode}"]`).click();
      await page.locator("#setupName").fill("Seitenleisten prüfen");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      const ids = await page.evaluate(async (mode) => {
        if (mode === "post") {
          const canvas = makeCanvas(600, 800),
            ctx = canvas.getContext("2d");
          ctx.fillStyle = "#87645a";
          ctx.fillRect(0, 0, 600, 800);
          const data = canvas.toDataURL(),
            im = {
              id: uid(),
              name: "Test.png",
              width: 600,
              height: 800,
              data,
              original: data,
            };
          p.images = [im];
          p.boards = p.formats.map((f) => createBoard(im, f.w, f.h));
          selected = p.boards[0].id;
          step = "crop";
          render();
          await Promise.all(p.boards.map(prepareLogo));
          postSetZoom(1);
          return {};
        }
        const a = carouselObject("shape", {
            name: "Illustration",
            x: 100,
            y: 300,
            w: 300,
            h: 300,
          }),
          b = carouselObject("text", {
            name: "Konzerttitel",
            text: "Ein neuer Abend",
            x: 500,
            y: 300,
            w: 500,
            h: 400,
          });
        carouselSelect([a.id, b.id]);
        carouselCreateFolder();
        const folder = p.carousel.folders.at(-1);
        carouselSelect([a.id]);
        a.effects = {
          blur: 8,
          blurEnabled: true,
          noise: 12,
          noiseEnabled: false,
        };
        carouselPanel();
        carouselSetZoom(1);
        return { shape: a.id, folder: folder.id };
      }, mode);
      await page.evaluate(async () => {
        await loadFonts();
        if (p.carousel) await carouselWaitForPaint();
      });
      const viewport = page.locator(
        mode === "post" ? "#workspace" : "#carouselViewport",
      );
      const scroll = await viewport.evaluate((el) => {
        const style = getComputedStyle(el),
          before = { x: el.scrollLeft, y: el.scrollTop };
        el.scrollLeft = before.x + 100;
        el.scrollTop = before.y + 100;
        return {
          hidden: style.scrollbarWidth === "none",
          auto: style.overflowX === "auto" && style.overflowY === "auto",
          x: el.scrollLeft !== before.x,
          y: el.scrollTop !== before.y,
        };
      });
      assert.deepEqual(scroll, { hidden: true, auto: true, x: true, y: true });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const documentBefore = await page.evaluate(() => JSON.stringify(p));
      await page.locator("#settings").click();
      const secondary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--md-sys-color-secondary-container",
        ),
      );
      await page.locator('[data-colour-mode="complementary"]').click();
      assert.equal(
        await page
          .locator('[data-colour-mode="complementary"]')
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.notEqual(
        await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue(
            "--md-sys-color-secondary-container",
          ),
        ),
        secondary,
      );
      assert.deepEqual(
        await page.evaluate((before) => {
          const a = JSON.parse(before),
            changes = [];
          function visit(x, y, path = "") {
            if (JSON.stringify(x) === JSON.stringify(y)) return;
            if (x && y && typeof x === "object" && typeof y === "object") {
              for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
                visit(x[k], y[k], path + "." + k);
            } else
              changes.push({
                path,
                before: typeof x === "string" ? x.slice(0, 60) : x,
                after: typeof y === "string" ? y.slice(0, 60) : y,
              });
          }
          visit(a, p);
          return changes;
        }, documentBefore),
        [],
        "Appearance cannot mutate artwork",
      );
      assert.equal(
        await page.evaluate(
          async () => (await MKWSetupSession.capture()).preferences.colourMode,
        ),
        "complementary",
      );
      for (const theme of ["light", "dark"]) {
        await page.locator(`[data-theme-choice="${theme}"]`).click();
        await page.screenshot({
          animations: "disabled",
          path: artifact(`material-inspectors-${mode}-${theme}-settings.png`),
        });
        await page.locator("#closeSettings").click();
        await page.screenshot({
          animations: "disabled",
          path: artifact(`material-inspectors-${mode}-${theme}.png`),
        });
        if (mode === "carousel") {
          const row = page.locator(`[data-layer="${ids.shape}"]`);
          const layout = await row.evaluate((el) => ({
            height: el.getBoundingClientRect().height,
            buttons: [...el.querySelectorAll("button")]
              .filter((b) => !b.hidden)
              .map((b) => ({
                action: b.dataset.action || "menu",
                w: b.getBoundingClientRect().width,
                h: b.getBoundingClientRect().height,
              })),
          }));
          assert(layout.height >= 56);
          assert.deepEqual(
            layout.buttons.map((b) => b.action),
            ["select", "visible", "locked", "menu"],
          );
          assert(layout.buttons.every((b) => b.w >= 40 && b.h >= 40));
          assert.equal(
            await row
              .locator('[data-action="select"]')
              .getAttribute("aria-pressed"),
            "true",
          );
          await row.locator('[data-action="visible"]').click();
          assert.equal(
            await row
              .locator('[data-action="visible"]')
              .getAttribute("aria-pressed"),
            "false",
          );
          await row.locator('[data-action="visible"]').click();
          await row.locator('[data-action="locked"]').click();
          assert.equal(
            await row
              .locator('[data-action="locked"]')
              .getAttribute("aria-pressed"),
            "true",
          );
          await row.locator('[data-action="locked"]').click();
          const fx = page.locator(`[data-layer-effects="${ids.shape}"]`);
          await fx.locator('[data-effect-edit="blur"]').click();
          assert(await page.locator("#carouselEffectEditor").isVisible());
          await page.locator("[data-effect-done]").click();
          const collapse = page.locator(
            `[data-folder="${ids.folder}"] [data-folder-action="collapse"]`,
          );
          await collapse.click();
          assert(!(await row.isVisible()));
          await collapse.click();
          assert(await row.isVisible());
          assert.equal(
            await page.evaluate(() => JSON.stringify(p)),
            documentBefore,
          );
        }
        await page.locator("#settings").click();
      }
      await page.locator('[data-ui-density="compact"]').click();
      await page.locator("#closeSettings").click();
      await page.evaluate(
        (mode) => (mode === "post" ? postFitRow() : carouselFit()),
        mode,
      );
      await page.setViewportSize({ width: 800, height: 720 });
      const sidebar = page.locator(
        mode === "post" ? "#toolsSidebar" : "#carouselSidebar",
      );
      assert(
        await sidebar.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        "Sidebar must not scroll horizontally",
      );
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-inspectors-${mode}-compact.png`),
      });
      await page.reload();
      await page.locator("#startSettings").click();
      assert.equal(
        await page
          .locator('[data-colour-mode="complementary"]')
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.locator('[data-colour-mode="normal"]').click();
      assert.equal(
        await page
          .locator('[data-colour-mode="normal"]')
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS shared inspector hierarchy, 56px layer rows/40px actions, reading order, visibility/lock, independent FX, collapse, compact overflow, complementary preference/setup/reload and two-axis scrolling without bars",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
