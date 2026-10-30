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
    await page.waitForFunction(() => !$("#startNew").disabled);
    assert.equal(await page.locator("#startStatus.studio-loading").count(), 0);
    // Slow and failed database reads show feedback and always release it.
    await page.evaluate(() => {
      window.originalList = MKWProjectStore.list;
      MKWProjectStore.list = () =>
        new Promise((resolve) => (window.finishList = () => resolve([])));
    });
    await page.locator("#startOpen").click();
    await page.locator("#projectLibraryList .studio-loading").waitFor();
    assert.equal(
      await page.locator("#projectLibraryList").getAttribute("aria-busy"),
      "true",
    );
    await page.waitForFunction(() => typeof window.finishList === "function");
    await page.evaluate(() => {
      finishList();
      MKWProjectStore.list = originalList;
    });
    await page.waitForFunction(
      () => !$("#projectLibraryList").querySelector(".studio-loading"),
    );
    await page.locator("#closeProjectLibrary").click();
    await page.evaluate(() => {
      MKWProjectStore.list = () => Promise.reject(Error("Leseprüfung"));
    });
    await page.locator("#startOpen").click();
    await page.waitForFunction(() =>
      $("#projectOpenStatus").textContent.includes("Leseprüfung"),
    );
    assert.equal(
      await page.locator("#projectLibraryList").getAttribute("aria-busy"),
      "false",
    );
    await page.locator("#closeProjectLibrary").click();
    await page.evaluate(() => (MKWProjectStore.list = originalList));
    await page.evaluate(() => {
      window.originalTemplates = MKWTemplates.list;
      MKWTemplates.list = () =>
        new Promise((resolve) => (window.finishTemplates = () => resolve([])));
    });
    await page.locator("#startTemplates").click();
    await page.locator("#templateStatus.studio-loading").waitFor();
    await page.evaluate(() => {
      finishTemplates();
      MKWTemplates.list = originalTemplates;
    });
    await page.waitForFunction(
      () => !$("#templateStatus").classList.contains("studio-loading"),
    );
    await page.locator("#closeTemplateGallery").click();
    // Wiki remains lazy; delayed frame loading and failure have actual lifecycle feedback.
    let releaseWiki;
    const wikiGate = new Promise((resolve) => (releaseWiki = resolve));
    await page.route("**/hilfe/?*", async (route) => {
      await wikiGate;
      await route.continue();
    });
    await page.locator("#startHelp").click();
    await page.locator("#studioHelpStatus.studio-loading").waitFor();
    assert.equal(
      await page.locator("#studioHelpStatus").getAttribute("aria-busy"),
      "true",
    );
    assert(
      await page.locator("#studioHelpStatus").evaluate((el) => {
        const style = getComputedStyle(el);
        return style.fontFamily.includes("MKW UI") && style.fontSize === "14px";
      }),
      "Wiki loading text uses the shared UI typography",
    );
    await page.locator("#studioHelpDialog").evaluate(async (dialog) => {
      await Promise.allSettled(
        dialog
          .getAnimations()
          .filter(
            (animation) => animation.effect.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished),
      );
    });
    await page.screenshot({ path: artifact("material-wiki-loading.png") });
    releaseWiki();
    await page
      .frameLocator("#studioHelpFrame")
      .locator("#helpSearch")
      .waitFor();
    assert.equal(
      await page.locator("#studioHelpStatus.studio-loading").count(),
      0,
    );
    await page.locator("#closeStudioHelp").click();
    const broken = await browser.newPage();
    await broken.route("**/hilfe/?*", (route) =>
      route.fulfill({
        status: 503,
        body: "Nicht verfügbar",
        contentType: "text/html",
      }),
    );
    await broken.goto(process.env.STUDIO_URL);
    await broken.waitForFunction(() => !$("#startNew").disabled);
    await broken.locator("#startHelp").click();
    await broken.waitForFunction(() =>
      $("#studioHelpStatus").textContent.includes("konnte nicht geladen"),
    );
    assert.equal(
      await broken.locator("#studioHelpStatus.studio-loading").count(),
      0,
    );
    await broken.close();
    for (const mode of ["carousel", "post"]) {
      if (mode === "post") await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode=${mode}]`).click();
      await page.locator("#setupName").fill("Konsistenz");
      if (mode === "carousel") await page.locator("#cn").fill("1");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      await page.evaluate(async (mode) => {
        await document.fonts.ready;
        studioPreferences.advanced = true;
        studioApplyPreferences();
        if (mode === "carousel") {
          carouselObject("text", {
            text: "Musik erleben\nEin besonderer Abend",
            x: 150,
            y: 300,
            w: 760,
            h: 700,
            size: 75,
            font: "Replica LL",
          });
          carouselPanel();
          await carouselWaitForPaint();
        } else {
          const c = makeCanvas(400, 500),
            ctx = c.getContext("2d");
          ctx.fillStyle = "#416f63";
          ctx.fillRect(0, 0, 400, 500);
          const data = c.toDataURL(),
            im = {
              id: uid(),
              name: "Prüfbild.png",
              data,
              original: data,
              width: 400,
              height: 500,
            };
          await image(data);
          p.images = [im];
          p.boards = [createBoard(im, 1080, 1350)];
          p.boards[0].elements.title.text = "Musik erleben";
          selected = p.boards[0].id;
          step = "text";
          layer = "title";
          render();
          await prepareLogo(p.boards[0]);
        }
        await autosave();
      }, mode);
      const snapshot = () =>
          page.evaluate(() => ({
            p: JSON.stringify(p),
            revision,
            history: history.length,
            future: future.length,
          })),
        before = await snapshot();
      const pixels = () =>
          page.evaluate(async () => {
            const b = p.boards[0],
              c = makeCanvas(b.w, b.h);
            await paint(exportContext(c), b, 1, { transparent: false });
            const data = c.toDataURL();
            c.width = c.height = 1;
            return data;
          }),
        beforePixels = await pixels();
      for (const theme of ["light", "dark"]) {
        await page.evaluate((theme) => studioSetTheme(theme), theme);
        const typo = page.locator(".typography-inspector").first();
        await typo.waitFor();
        assert.equal(
          await typo.evaluate((el) => getComputedStyle(el).gap),
          "16px",
        );
        assert(
          (await typo.locator(".typo-format button").first().boundingBox())
            .height >= 40,
        );
        await typo.locator('[data-typo-tab="character"]').focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(
          await typo
            .locator('[data-typo-tab="paragraph"]')
            .getAttribute("aria-selected"),
          "true",
        );
        await page.keyboard.press("ArrowLeft");
        assert.equal(
          await typo
            .locator('[data-typo-tab="character"]')
            .getAttribute("aria-selected"),
          "true",
        );
        const summary = typo.locator(".typo-details summary").first();
        assert((await summary.boundingBox()).height >= 48);
        await summary.focus();
        await page.keyboard.press("Space");
        assert(
          await typo
            .locator(".typo-details")
            .first()
            .evaluate((el) => el.open),
        );
        await page.keyboard.press("Space");
        assert(
          !(await typo
            .locator(".typo-details")
            .first()
            .evaluate((el) => el.open)),
        );
        for (const density of ["compact", "comfortable"]) {
          await page.evaluate((density) => {
            studioPreferences.density = density;
            studioApplyDensity();
          }, density);
          const expectedHeight = density === "compact" ? 36 : 48;
          const field = typo.locator("[data-typo=size]");
          assert.equal(
            await field.evaluate((el) => getComputedStyle(el).height),
            `${expectedHeight}px`,
          );
          assert(
            Math.abs((await field.boundingBox()).height - expectedHeight) <
              0.01,
            "Typography field must keep its density height; allow only subpixel browser rounding",
          );
        }
        await page.locator("#settings").click();
        assert(
          (await page.locator("#settings-tab-general").boundingBox()).height >=
            48,
        );
        assert.equal(
          await page
            .locator("#settings-tab-general")
            .evaluate((el) => getComputedStyle(el).fontSize),
          "14px",
        );
        await page.locator("#settings-tab-fonts").click();
        assert.equal(
          await page
            .locator("[data-default-text-size=title]")
            .evaluate((el) => getComputedStyle(el).fontSize),
          "14px",
        );
        assert(
          await page.locator("#customFontList > p").evaluate((el) => {
            const hex = (value) =>
              "#" +
              value
                .match(/\d+/g)
                .slice(0, 3)
                .map((n) => (+n).toString(16).padStart(2, "0"))
                .join("");
            return (
              MKWUIColor.contrast(
                hex(getComputedStyle(el).color),
                hex(getComputedStyle(el.closest("section")).backgroundColor),
              ) >= 4.5
            );
          }),
          "Empty font library remains readable in both themes",
        );
        await page.screenshot({
          path: artifact(`material-consistency-${mode}-${theme}-settings.png`),
          animations: "disabled",
        });
        await page.locator("#closeSettings").click();
        await page.screenshot({
          path: artifact(`material-consistency-${mode}-${theme}-text.png`),
          animations: "disabled",
        });
      }
      // Two independent operations can share one status without premature dismissal.
      await page.evaluate(() => {
        const el = $("#status");
        el.setAttribute("aria-busy", "false");
        window.endA = MKWUIControls.loading(el);
        window.endB = MKWUIControls.loading(el);
        endA();
        endA();
      });
      assert.equal(
        await page.locator("#status").getAttribute("aria-busy"),
        "true",
      );
      assert.equal(
        await page
          .locator(".save-indicator")
          .evaluate((el) => getComputedStyle(el, "::before").animationName),
        "studio-loading-morph, studio-loading-rotate",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".save-indicator")
          .evaluate((el) => getComputedStyle(el, "::before").animationName),
        "none",
      );
      await page.evaluate(() => endB());
      assert.equal(await page.locator("#status.studio-loading").count(), 0);
      assert.equal(
        await page.locator("#status").getAttribute("aria-busy"),
        "false",
      );
      await page.emulateMedia({
        reducedMotion: "no-preference",
        forcedColors: "active",
      });
      await page.locator("#settings").click();
      await page.screenshot({
        path: artifact(`material-consistency-${mode}-forced-colours.png`),
        animations: "disabled",
      });
      assert((await page.locator("#closeSettings").boundingBox()).width >= 40);
      await page.locator("#closeSettings").focus();
      await page.keyboard.press("Escape");
      assert(await page.locator("#settingsDialog").isHidden());
      await page.emulateMedia({ forcedColors: "none" });
      // Failed file decode releases the spinner and leaves the current artwork intact.
      await page.evaluate(async () => {
        try {
          await MKWProjects.openFile(new Blob(["bad mkw"]));
        } catch {}
      });
      assert.equal(
        await page
          .locator(
            "#startStatus.studio-loading,#projectOpenStatus.studio-loading",
          )
          .count(),
        0,
      );
      assert.deepEqual(await snapshot(), before);
      assert.equal(await pixels(), beforePixels);
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS consistent spacing/type/targets/density in both editors, keyboard disclosure/Escape, overlapping/failed operation cleanup, reduced motion/forced colours, delayed library/templates/lazy Wiki and unchanged documents/history/export pixels",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
