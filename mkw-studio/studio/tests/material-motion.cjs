const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode=${mode}]`).click();
      await page.locator("#setupName").fill("Material Bewegung");
      if (mode === "carousel") await page.locator("#cn").fill("1");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      await page.evaluate(async (mode) => {
        const canvas = makeCanvas(800, 1000),
          ctx = canvas.getContext("2d");
        ctx.fillStyle = "#336c68";
        ctx.fillRect(0, 0, 800, 1000);
        const data = canvas.toDataURL();
        if (mode === "post") {
          const im = {
            id: uid(),
            name: "Konzert.png",
            data,
            original: data,
            width: 800,
            height: 1000,
          };
          p.images = [im];
          p.boards = [createBoard(im, 1080, 1350)];
          selected = p.boards[0].id;
        } else
          carouselObject("text", {
            text: "Hinweis",
            size: 100,
            x: 0,
            y: 0,
            w: 600,
            h: 700,
            fill: "#336c68",
          });
        render();
        await prepareLogo(p.boards[0]);
        await autosave();
      }, mode);
      const snapshot = () =>
        page.evaluate(() =>
          JSON.stringify({ p, revision, history: history.length }),
        );
      const before = await snapshot();
      const warning = mode === "post" ? "#postNotice" : "#carouselNotice";
      const exporter = mode === "post" ? "#export" : "#carouselExport";
      for (const advanced of mode === "carousel" ? [false, true] : [false]) {
        await page.evaluate((advanced) => {
          studioPreferences.advanced = advanced;
          studioApplyPreferences();
        }, advanced);
        for (const width of [1500, 780, 390]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.waitForFunction(
            ([a, b]) => {
              const x = document.querySelector(a).getBoundingClientRect(),
                y = document.querySelector(b).getBoundingClientRect();
              return (
                !document.querySelector(a).hidden &&
                Math.abs(x.width - y.width) < 0.5 &&
                Math.abs(x.height - y.height) < 0.5 &&
                x.width > 0
              );
            },
            [warning, exporter],
          );
          const rect = await page.locator(warning).boundingBox();
          assert(rect.x >= 0 && rect.x + rect.width <= width + 1);
        }
      }
      await page.setViewportSize({ width: 1500, height: 1100 });
      await page.evaluate(() => {
        studioPreferences.advanced = false;
        studioApplyPreferences();
      });
      await page.locator(warning).click();
      assert(await page.locator("#studioWarnings").isVisible());
      await page.evaluate(() => studioCloseWarnings());
      if (mode === "post") {
        const options = page.locator(".image-info-card details").first();
        await options.locator("summary").click();
        for (const theme of ["light", "dark"]) {
          await page.evaluate((t) => studioSetTheme(t), theme);
          const look = await options.evaluate((el) => {
            const row = el.querySelector(".post-angle-option"),
              select = row.querySelector("select"),
              other = el.querySelector(".post-text-options .post-option-row"),
              s = getComputedStyle(select),
              label = other.querySelector("span");
            return {
              appearance: s.appearance,
              border: parseFloat(s.borderWidth),
              background: s.backgroundColor,
              font: s.fontSize,
              weight: s.fontWeight,
              otherFont: getComputedStyle(label).fontSize,
              otherWeight: getComputedStyle(other).fontWeight,
              check: row.querySelector("input").getBoundingClientRect().left,
              otherCheck: other.querySelector("input").getBoundingClientRect()
                .left,
              start: select.getBoundingClientRect().left,
              otherStart: label.getBoundingClientRect().left,
              height: row.getBoundingClientRect().height,
              otherHeight: other.getBoundingClientRect().height,
              arrow: !!row.querySelector(".post-angle-select > svg"),
            };
          });
          assert.equal(look.appearance, "none");
          assert.equal(look.border, 0);
          assert.equal(look.background, "rgba(0, 0, 0, 0)");
          assert.equal(look.font, look.otherFont);
          assert.equal(look.weight, look.otherWeight);
          assert(
            Math.abs(look.check - look.otherCheck) < 1 &&
              Math.abs(look.start - look.otherStart) < 1,
          );
          assert.equal(look.height, look.otherHeight);
          assert(look.arrow);
          for (const checked of [false, true]) {
            const states = await options.evaluate((el, checked) => {
              const row = el.querySelector(".post-angle-option"),
                other = el.querySelector(".post-text-options .post-option-row"),
                input = row.querySelector("input"),
                reference = other.querySelector("input"),
                before = [input.checked, reference.checked];
              input.checked = reference.checked = checked;
              const own = getComputedStyle(input),
                normal = getComputedStyle(reference),
                label = getComputedStyle(row.querySelector("label")),
                out = {
                  background: own.backgroundColor,
                  referenceBackground: normal.backgroundColor,
                  border: own.border,
                  referenceBorder: normal.border,
                  labelBorder: parseFloat(label.borderWidth),
                  labelBackground: label.backgroundColor,
                  surface: getComputedStyle(row).backgroundColor,
                  referenceSurface: getComputedStyle(other).backgroundColor,
                };
              [input.checked, reference.checked] = before;
              return out;
            }, checked);
            assert.equal(states.background, states.referenceBackground);
            assert.equal(states.border, states.referenceBorder);
            assert.equal(states.surface, states.referenceSurface);
            assert.equal(states.labelBorder, 0);
            assert.equal(states.labelBackground, "rgba(0, 0, 0, 0)");
          }
          await options.locator(".post-angle-option").scrollIntoViewIfNeeded();
          await page.screenshot({
            path: artifact(`material-motion-options-${theme}.png`),
            animations: "disabled",
          });
        }
        await options.locator("[data-post-angle-direction]").focus();
        await page.keyboard.press("ArrowDown");
        assert(
          await options
            .locator("[data-post-angle-direction]")
            .evaluate((el) => el === document.activeElement),
        );
        // Restore the original direction through the native select before the isolation snapshot.
        await options
          .locator("[data-post-angle-direction]")
          .selectOption("left");
        await options.locator("summary").click();
      }
      // Progress and loading are UI-only; take the checkpoint after the explicit direction edit above.
      const progressBefore = await snapshot();
      await page.evaluate(() => {
        window.endMotion = MKWUIControls.loading("#status");
      });
      const sample = async (time) =>
        page.locator(".save-indicator").evaluate(async (el, time) => {
          for (const animation of el.getAnimations({ subtree: true })) {
            animation.pause();
            animation.currentTime = time;
          }
          await new Promise(requestAnimationFrame);
          const s = getComputedStyle(el, "::before"),
            circle = getComputedStyle(el);
          return {
            clip: s.clipPath,
            rotate: s.rotate,
            circle: circle.backgroundColor,
            circleRotate: circle.rotate,
            circleClip: circle.clipPath,
            circleSize: el.getBoundingClientRect().width,
          };
        }, time);
      const first = await sample(0),
        second = await sample(1900);
      assert.notEqual(
        first.clip,
        second.clip,
        "The indicator changes its actual geometry",
      );
      assert.notEqual(
        first.rotate,
        second.rotate,
        "The indicator also rotates",
      );
      assert.notEqual(first.circle, "rgba(0, 0, 0, 0)");
      assert.equal(first.circle, second.circle);
      assert.equal(first.circleRotate, "none");
      assert.equal(first.circleClip, "none");
      assert(
        first.circleSize > 16,
        "Stationary circle surrounds the smaller morphing shape",
      );
      await page.evaluate(() => endMotion());
      assert.equal(await page.locator("#status.studio-loading").count(), 0);
      await page.evaluate(() => {
        $("#importDialog").showModal();
        showImportStage(0, 2, "Konzert.png", 1);
      });
      const importState = await page
        .locator("#importProgress")
        .evaluate((el) => ({
          value: el.value,
          max: el.max,
          percent: el.parentElement.style.getPropertyValue("--studio-progress"),
          width:
            el.parentElement
              .querySelector(".studio-progress-active")
              .getBoundingClientRect().width /
            el.parentElement.getBoundingClientRect().width,
        }));
      assert.equal(importState.value, 1);
      assert.equal(importState.max, 6);
      assert(Math.abs(importState.width - 1 / 6) < 0.01);
      const wave = page.locator("#importDialog .studio-progress-active");
      assert.equal(
        await wave.evaluate(
          (el) => getComputedStyle(el, "::before").animationName,
        ),
        "studio-progress-wave",
      );
      assert.notEqual(
        await wave.evaluate((el) => getComputedStyle(el, "::before").maskImage),
        "none",
      );
      await page.locator("#importDialog").evaluate(async (el) => {
        await Promise.allSettled(
          el
            .getAnimations()
            .filter((a) => a.effect.getTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
      });
      await page.screenshot({
        path: artifact(`material-motion-import-${mode}.png`),
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await wave.evaluate(
          (el) => getComputedStyle(el, "::before").animationName,
        ),
        "none",
      );
      assert.equal(
        await page
          .locator(".import-animation")
          .evaluate((el) => getComputedStyle(el, "::before").animationName),
        "none",
      );
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(
        await wave.evaluate(
          (el) => getComputedStyle(el.parentElement).forcedColorAdjust,
        ),
        "none",
      );
      await page.screenshot({
        path: artifact(`material-motion-reduced-forced-${mode}.png`),
        animations: "disabled",
      });
      await page.emulateMedia({
        reducedMotion: "no-preference",
        forcedColors: "none",
      });
      await page.evaluate(() => $("#importDialog").close());
      assert.equal(
        await page
          .locator(".import-animation")
          .evaluate((el) => getComputedStyle(el, "::before").animationName),
        "none",
      );
      await page.locator(exporter).click();
      await page.waitForFunction(
        () => !document.querySelector("#exportTotal.studio-loading"),
      );
      await page.evaluate(() => setExportProgress(1, 4, "Bild 1 von 4"));
      assert.deepEqual(
        await page
          .locator("#downloadProgress")
          .evaluate((el) => [
            el.value,
            el.max,
            el.parentElement.style.getPropertyValue("--studio-progress"),
          ]),
        [1, 4, "25%"],
      );
      await page.screenshot({
        path: artifact(`material-motion-export-${mode}.png`),
        animations: "disabled",
      });
      await page.evaluate(() =>
        setExportProgress(4, 4, "Export abgeschlossen"),
      );
      assert.equal(
        await page
          .locator("#exportProgress .studio-progress-active")
          .evaluate((el) => getComputedStyle(el, "::before").animationName),
        "none",
      );
      await page.locator("#closeExport").click();
      assert.equal(
        await snapshot(),
        progressBefore,
        "Loading/progress never modify the document, revision or undo history",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS morphing/rotating loading geometry, real wavy import/export progress, completion/hidden/reduced-motion/system-colour cleanup, equal warning/export sizes at three widths and Advanced, matching native FD dropdown anatomy and unchanged documents",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
