const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    // Resize observers and media-query listeners run on a rendering frame.
    const resize = async (viewport) => {
      await page.setViewportSize(viewport);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    };
    const errors = [],
      nativeDialogs = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Bedienprüfung");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy);
    await page.evaluate(async () => {
      const canvas = makeCanvas(800, 1000),
        ctx = exportContext(canvas);
      ctx.fillStyle = "#527586";
      ctx.fillRect(0, 0, 800, 1000);
      const im = {
        id: uid(),
        name: "Ein lang benanntes Konzertfoto mit Umlauten äöü.png",
        width: 800,
        height: 1000,
        data: canvas.toDataURL(),
      };
      p.images.push(im);
      p.boards = [createBoard(im, 1080, 1350)];
      selected = p.boards[0].id;
      changed();
      await prepareLogo(board());
      await draw();
      await autosave();
    });
    for (const [value, out, into] of [
      [0.2, true, false],
      [3, false, true],
    ]) {
      await page.evaluate((v) => postSetZoom(v), value);
      assert.equal(await page.locator("#zoomOut").isDisabled(), out);
      assert.equal(await page.locator("#zoomIn").isDisabled(), into);
    }
    await page.evaluate(() => postSetZoom(1));
    await page.locator('[data-action="removeImage"]').click();
    assert.equal(
      await page.locator("#studioFeedbackDialog button:focus").textContent(),
      "Abbrechen",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => !document.querySelector("#studioFeedbackDialog"),
    );
    assert.equal(await page.evaluate(() => p.images.length), 1);
    assert(
      await page
        .locator('[data-action="removeImage"]')
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator('[data-action="removeImage"]').click();
    await page.keyboard.press("Tab");
    assert(
      await page
        .locator("[data-feedback-confirm]")
        .evaluate((el) => el === document.activeElement),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => p.images.length), 1);
    // A pending destructive action must never operate on a replacement project.
    await page.locator('[data-action="removeImage"]').click();
    await page.evaluate(() => {
      window.auditOldProject = p;
      p = { ...p, projectId: uid() };
    });
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      () => !document.querySelector("#studioFeedbackDialog"),
    );
    assert.equal(await page.evaluate(() => p.images.length), 1);
    await page.evaluate(() => {
      p = window.auditOldProject;
      delete window.auditOldProject;
    });
    await page.locator('[data-action="removeImage"]').click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(() => p.images.length === 0);
    assert(
      await page
        .locator("#emptyAdd")
        .evaluate((el) => el === document.activeElement),
    );
    await page.evaluate(async () => {
      await undo();
    });
    await page.waitForFunction(() => p.images.length === 1);
    const original = await page.evaluate(() => ({
      w: board().w,
      h: board().h,
    }));
    await page.evaluate(() => editBoardOptions(board()));
    for (const viewport of [
      { width: 1500, height: 1050 },
      { width: 320, height: 700 },
    ]) {
      await resize(viewport);
      await page.evaluate(() => studioSetSidebar(true));
      const fitting = await page.locator("#stepPanel").evaluate((panel) => {
        const bounds = document
          .querySelector("#toolsSidebar")
          .getBoundingClientRect();
        return [
          ...panel.querySelectorAll(
            ".post-format-section input,.post-format-section select",
          ),
        ].every((input) => {
          const r = input.getBoundingClientRect();
          return (
            r.width > 50 && r.left >= bounds.left && r.right <= bounds.right
          );
        });
      });
      assert(fitting, "Format fields fit the inspector at " + viewport.width);
      await page.screenshot({
        path: artifact("audit-fd-format-" + viewport.width + ".png"),
        animations: "disabled",
      });
    }
    await resize({ width: 1500, height: 1050 });
    await page.locator("#width").fill("0");
    await page.locator("#resize").click();
    assert.equal(
      await page.locator("#width").getAttribute("aria-invalid"),
      "true",
    );
    assert.deepEqual(
      await page.evaluate(() => ({ w: board().w, h: board().h })),
      original,
    );
    await page.locator("#width").fill(String(original.w));
    await page.locator("#resize").click();
    await page.evaluate(() => editBoardOptions(board()));
    assert.equal(
      await page.locator("#width").getAttribute("aria-invalid"),
      null,
    );
    assert.deepEqual(
      await page.evaluate(() => ({ w: board().w, h: board().h })),
      original,
    );
    await page.evaluate(() =>
      studioSetWarnings([
        {
          id: board().id,
          step: "crop",
          title: "Foto prüfen",
          message: "Das Foto deckt den Rahmen nicht vollständig ab.",
        },
      ]),
    );
    await page.locator("#postNotice").click();
    await page.keyboard.press("Escape");
    assert(
      await page
        .locator("#postNotice")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("#postNotice").click();
    await page.locator("#closeStudioWarnings").click();
    assert(
      await page
        .locator("#postNotice")
        .evaluate((el) => el === document.activeElement),
    );
    // Error feedback appears after the progress modal has been closed and work unlocked.
    await page.evaluate(() => {
      window.auditImport = importFiles([
        new File(["invalid png"], "kaputt.png", { type: "image/png" }),
      ]);
    });
    await page.waitForSelector("#studioFeedbackDialog");
    assert.equal(await page.evaluate(() => busy), false);
    assert.equal(
      await page.locator("#importDialog").evaluate((el) => el.open),
      false,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.auditImport);
    await page.evaluate(() => openProjectSetup());
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Designer Bedienprüfung");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(
      () =>
        p.carousel && !busy && !document.querySelector("#projectSetup").open,
    );
    await page.evaluate(async () => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      carouselObject("shape", {
        id: "audit-object",
        x: 200,
        y: 300,
        w: 400,
        h: 300,
      });
      carouselSelect(["audit-object"]);
      carouselPanel();
      await carouselWaitForPaint();
    });
    for (const [value, out, into] of [
      [0.05, true, false],
      [2, false, true],
    ]) {
      await page.evaluate(async (v) => {
        carouselSetZoom(v);
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      }, value);
      assert.equal(await page.locator("#carouselZoomOut").isDisabled(), out);
      assert.equal(await page.locator("#carouselZoomIn").isDisabled(), into);
    }
    await page.evaluate(() => carouselSetZoom(0.4));
    await page.locator("#carouselAddEffect").click();
    await page.locator("[data-add-effect=blur]").click();
    await page.locator("#carouselEffectStrength").fill("16");
    assert.equal(
      await page
        .locator("#carouselEffectStrength")
        .getAttribute("aria-valuetext"),
      "16 px",
    );
    await page.keyboard.press("Escape");
    assert(
      await page
        .locator("[data-effect-edit=blur]")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("[data-effect-edit=blur]").click();
    await page.locator("[data-effect-done]").click();
    assert(
      await page
        .locator("[data-effect-edit=blur]")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("[data-effect-edit=blur]").click();
    await page.locator("[data-effect-close]").click();
    assert(
      await page
        .locator("[data-effect-edit=blur]")
        .evaluate((el) => el === document.activeElement),
    );
    for (const id of ["toolPaintPicker", "toolSwapColours", "toolPaintNone"]) {
      const target = page.locator("#" + id);
      const hit = await target.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          w: r.width,
          h: r.height,
          hit: el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          ),
        };
      });
      assert(
        hit.w >= 24 && hit.h >= 24 && hit.hit,
        id + ": " + JSON.stringify(hit),
      );
    }
    await page.locator("#toolPaintPicker").focus();
    await page.keyboard.press("Enter");
    assert(await page.locator("#paintChannels").isVisible());
    await page.locator("[data-picker-channel=stroke]").click();
    assert.equal(await page.evaluate(() => studioPicker.channel), "stroke");
    await page.locator("[data-picker-channel=fill]").click();
    assert.equal(await page.evaluate(() => studioPicker.channel), "fill");
    await page.locator("#paintClose").click();
    assert(
      await page
        .locator("#toolPaintPicker")
        .evaluate((el) => el === document.activeElement),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#toolFillColour").click();
    assert.equal(
      await page
        .locator("#studioPaintPicker")
        .evaluate(
          (el) => parseFloat(getComputedStyle(el).animationDuration) || 0,
        ),
      0,
    );
    await page.locator("#paintClose").click();
    await resize({ width: 320, height: 480 });
    await page.evaluate(() => {
      studioSetSidebar(true);
      carouselSelect(["audit-object"]);
      carouselPanel();
    });
    await page.locator("[data-effect-edit=blur]").click();
    const box = await page.locator("#carouselEffectEditor").boundingBox();
    assert(
      box.x >= 7 &&
        box.y >= 7 &&
        box.x + box.width <= 313 &&
        box.y + box.height <= 473,
      JSON.stringify(box),
    );
    await page.screenshot({
      path: artifact("audit-effect-320.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await resize({ width: 390, height: 844 });
    await page.evaluate(() => studioSetSidebar(false));
    await page.locator("#toolPaintNone").focus();
    assert(
      await page.locator("#toolPaintNone").evaluate((el) => {
        const r = el.getBoundingClientRect(),
          p = el.closest(".studio-tool-surface").getBoundingClientRect();
        return (
          r.top >= p.top &&
          r.bottom <= p.bottom &&
          el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          )
        );
      }),
      "Scrolled paint action stays reachable in the short pill",
    );
    await resize({ width: 1500, height: 1050 });
    await page.evaluate(async () => {
      await autosave();
    });
    await page.locator("#open").click();
    await page.waitForSelector("[data-delete-project]:not(:disabled)");
    const remove = page.locator("[data-delete-project]:not(:disabled)").first();
    const removedId = await remove.getAttribute("data-delete-project");
    await remove.click();
    await page.keyboard.press("Escape");
    assert(await page.locator(`[data-delete-project="${removedId}"]`).count());
    await page.locator(`[data-delete-project="${removedId}"]`).click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      (id) => !document.querySelector(`[data-delete-project="${id}"]`),
      removedId,
    );
    assert.equal(await page.evaluate(() => p.carousel.n), 2);
    assert.equal(await page.locator("#projectLibrary button:focus").count(), 1);
    await page.locator("#closeProjectLibrary").click();
    await resize({ width: 320, height: 480 });
    await page.evaluate(() => {
      window.auditLongError = MKWFeedback.ask({
        title: "Bilder konnten nicht geladen werden",
        message: Array.from(
          { length: 50 },
          (_, i) =>
            `Foto ${i + 1}: Diese Bilddatei konnte nicht gelesen werden.`,
        ).join("\n"),
      });
    });
    const longBox = await page.locator("#studioFeedbackDialog").boundingBox();
    assert(longBox.y >= 15 && longBox.y + longBox.height <= 465);
    const headingBox = await page.locator("#studioFeedbackTitle").boundingBox();
    assert(
      headingBox.y >= longBox.y &&
        headingBox.y + headingBox.height <= longBox.y + longBox.height,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.auditLongError);
    // A coarse pointer uses larger targets rather than enlarging only the visual icon.
    const touch = await browser.newContext({
      viewport: { width: 1000, height: 1000 },
      hasTouch: true,
    });
    const touchPage = await touch.newPage();
    await touchPage.goto(process.env.STUDIO_URL);
    await touchPage.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    await touchPage.evaluate(() => {
      const group = document.createElement("div");
      group.id = "advancedColours";
      group.innerHTML =
        '<button class="paint-wells" id="auditCoarse">Farbe</button>';
      document.body.append(group);
    });
    const coarse = await touchPage.locator("#auditCoarse").boundingBox();
    assert(coarse.width >= 48 && coarse.height >= 48);
    await touch.close();
    assert.deepEqual(nativeDialogs, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS safe confirm/cancel/stale project, remove/undo, resize validation, import recovery, warning/FX focus, zoom caps, paint hit areas, reduced motion, 320px popup and coarse targets.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
