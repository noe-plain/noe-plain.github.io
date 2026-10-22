const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { launch, artifact } = require("./browser.cjs");
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
(async () => {
  const browser = await launch(),
    baseline = {};
  try {
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
          viewport: { width: 1600, height: 1000 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode="${mode}"]`).click();
      await page.locator("#setupName").fill("Material Gestaltungstest");
      if (mode === "carousel") await page.locator("#cn").fill("2");
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-${mode}-setup.png`),
      });
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      await page.evaluate(async (mode) => {
        await document.fonts.ready;
        const c = makeCanvas(800, 1000),
          ctx = exportContext(c),
          g = ctx.createLinearGradient(0, 0, 800, 1000);
        g.addColorStop(0, "#8a3f58");
        g.addColorStop(1, "#51afa4");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 800, 1000);
        ctx.fillStyle = "#eacc81";
        ctx.fillRect(120, 160, 320, 430);
        const data = c.toDataURL(),
          im = {
            id: "material-photo",
            name: "Prüfbild.png",
            width: 800,
            height: 1000,
            data,
            original: data,
          };
        await image(data);
        p.images = [im];
        if (mode === "post") {
          p.boards = [createBoard(im, 1080, 1350)];
          const b = p.boards[0];
          for (const [key, text] of Object.entries({
            date: "Do 19. November",
            title: "Musik für alle",
            subtitle: "Ein besonderer Abend",
            copyright: "Foto © MKW",
          }))
            Object.assign(b.elements[key], {
              text,
              enabled: true,
              visible: true,
            });
          selected = b.id;
          step = "text";
          layer = "title";
          render();
        } else {
          carouselObject("image", {
            id: "material-image",
            x: 0,
            y: 0,
            w: 1080,
            h: 1350,
            imageId: im.id,
          });
          carouselObject("shape", {
            id: "material-shape",
            x: 1120,
            y: 150,
            w: 700,
            h: 800,
            fill: "#f3cb72",
            stroke: "#382330",
            strokeWidth: 6,
          });
          carouselObject("text", {
            id: "material-text",
            x: 130,
            y: 500,
            w: 750,
            h: 500,
            size: 90,
            text: "Musik für alle\nEin besonderer Abend",
            color: "#ffffff",
          });
          carouselTool("text");
          carouselPanel();
          carouselRefresh();
          await carouselWaitForPaint();
        }
      }, mode);
      const pixels = () =>
        page.evaluate(async () => {
          await document.fonts.ready;
          const results = [];
          for (const b of p.boards) {
            const c = makeCanvas(b.w, b.h);
            await paint(exportContext(c), b, 1, { transparent: false });
            results.push(c.toDataURL());
            c.width = c.height = 1;
          }
          return results;
        });
      baseline[mode] = (await pixels()).map(digest);
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-${mode}-editor-light.png`),
      });
      await page.locator("#settings").click();
      await page.screenshot({
        animations: "disabled",
        path: artifact(`material-${mode}-settings-light.png`),
      });
      if (!process.env.MKW_MATERIAL_BASELINE) {
        assert.equal(
          await page.locator("#primaryColour").inputValue(),
          "#315bcc",
        );
        assert.equal(
          await page.locator("#primaryColourValue").textContent(),
          "#315BCC",
        );
        const cardPadding = await page
          .locator(".settings-appearance")
          .evaluate((el) =>
            Number.parseFloat(getComputedStyle(el).paddingLeft),
          );
        assert(
          cardPadding >= 16,
          "Settings card content has a consistent inset",
        );
        const historyBefore = await page.evaluate(() => ({
          revision,
          history: history.length,
          future: future.length,
        }));
        const before = await page.evaluate(() => JSON.stringify(p)),
          guide = await page.locator("#guideColour").inputValue();
        const initialPaints = await page.evaluate(() => {
          let paints = 0;
          const original = paint;
          window.materialPaintCount = () => paints;
          paint = async (...args) => {
            paints++;
            return original(...args);
          };
          return paints;
        });
        const originalPrimary = await page
          .locator(".settings-preview-action")
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        for (const colour of ["#c2247a", "#ffffff", "#000000", "#00ff00"]) {
          await page.locator("#primaryColour").evaluate((el, value) => {
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }, colour);
          assert.equal(
            await page.locator("#primaryColourValue").textContent(),
            colour.toUpperCase(),
          );
          assert.equal(
            await page.evaluate(() => JSON.stringify(p)),
            before,
            "UI colour must never change the project",
          );
          assert.equal(await page.locator("#guideColour").inputValue(), guide);
          for (const theme of ["dark", "light"]) {
            await page.locator(`[data-theme-choice="${theme}"]`).click();
            const contrast = await page.evaluate(() => {
              const p = MKWUIColor.palette(
                studioPreferences.primaryColour,
                document.documentElement.dataset.theme,
              );
              return [
                MKWUIColor.contrast(p.primary, p["on-primary"]),
                MKWUIColor.contrast(
                  p["on-primary-container"],
                  p["primary-container"],
                ),
              ];
            });
            assert(contrast.every((v) => v >= 4.5));
            const rendered = await page.evaluate(() => {
              const colour = (value) =>
                "#" +
                value
                  .match(/\d+/g)
                  .slice(0, 3)
                  .map((v) => Number(v).toString(16).padStart(2, "0"))
                  .join("");
              const elements = [
                ".settings-preview-action",
                ".settings-tabs button[aria-selected=true]",
                ".theme-options button[aria-pressed=true]",
              ];
              return elements.map((selector) => {
                const css = getComputedStyle(document.querySelector(selector));
                return MKWUIColor.contrast(
                  colour(css.color),
                  colour(css.backgroundColor),
                );
              });
            });
            assert(
              rendered.every((v) => v >= 4.5),
              "Rendered controls, including their actual CSS cascade, remain legible",
            );
          }
        }
        assert.notEqual(
          await page
            .locator(".settings-preview-action")
            .evaluate((el) => getComputedStyle(el).backgroundColor),
          originalPrimary,
        );
        assert.equal(
          await page.evaluate(() => window.materialPaintCount()),
          initialPaints,
          "Changing the main colour must not repaint artwork",
        );
        await page.locator("#primaryColour").click();
        assert(await page.locator("#studioPaintPicker").isVisible());
        assert.equal(
          await page
            .locator("#studioPaintPicker")
            .evaluate((el) => el.closest("dialog")?.id),
          "settingsDialog",
        );
        await page.locator("#paintHex").fill("#8942ab");
        assert.equal(
          await page.locator("#primaryColour").inputValue(),
          "#8942ab",
        );
        await page.keyboard.press("Escape");
        assert(await page.locator("#settingsDialog").isVisible());
        assert.equal(await page.evaluate(() => JSON.stringify(p)), before);
        assert.deepEqual(
          await page.evaluate(() => ({
            revision,
            history: history.length,
            future: future.length,
          })),
          historyBefore,
        );
        await page.locator("#resetPrimaryColour").click();
        assert.equal(
          await page.locator("#primaryColour").inputValue(),
          "#315bcc",
        );
        assert(await page.locator("#resetPrimaryColour").isDisabled());
        const pref = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("mkw-studio-preferences")),
        );
        assert.equal(pref.primaryColour, "#315bcc");
        await page.locator("[data-theme-choice=dark]").click();
        await page.screenshot({
          animations: "disabled",
          path: artifact(`material-${mode}-settings-dark.png`),
        });
        await page.locator("#closeSettings").click();
        assert.deepEqual(
          (await pixels()).map(digest),
          baseline[mode],
          "Theme and main colour preserve exported pixels",
        );
        if (process.env.MKW_MATERIAL_REFERENCE) {
          const reference = JSON.parse(
            fs.readFileSync(process.env.MKW_MATERIAL_REFERENCE, "utf8"),
          );
          assert.deepEqual(
            baseline[mode],
            reference[mode],
            "Exports must also match the build before the Material migration",
          );
        }
        await page.locator("#help").click();
        await page
          .frameLocator("#studioHelpFrame")
          .locator("#helpSearch")
          .waitFor();
        const helpColour = () =>
          page
            .frameLocator("#studioHelpFrame")
            .locator("html")
            .evaluate((el) =>
              getComputedStyle(el)
                .getPropertyValue("--md-sys-color-primary")
                .trim(),
            );
        assert.equal(
          await helpColour(),
          await page
            .locator("html")
            .evaluate((el) =>
              getComputedStyle(el)
                .getPropertyValue("--md-sys-color-primary")
                .trim(),
            ),
        );
        await page.locator("#closeStudioHelp").click();
        await page.evaluate(() => studioSetPrimaryColour("#c2247a"));
        await page.reload();
        await page.waitForFunction(
          () => !document.querySelector("#startNew").disabled,
        );
        assert.equal(
          await page.evaluate(() => studioPreferences.primaryColour),
          "#c2247a",
        );
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(
      artifact("material-export-baseline.json"),
      JSON.stringify(baseline, null, 2),
    );
    console.log(
      "PASS both editor artwork baselines, UI-only colour, accessible tones, shared picker, reset and browser persistence",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
