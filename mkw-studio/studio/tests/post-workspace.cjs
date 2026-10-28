const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await require("./browser.cjs").launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      }),
      errors = [],
      failed = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("/api/session"))
        failed.push(r.url());
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Bildkarten");
    await page.locator("#createProject").click();
    await require("./browser.cjs").waitForProjectReady(page);
    const fixture = await page.evaluate(() => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(1600, 2000),
        x = c.getContext("2d");
      x.fillStyle = "#ab7453";
      x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "#2c4851";
      x.fillRect(800, 0, 800, 2000);
      return c.toDataURL();
    });
    const file = (name) => ({
      name,
      mimeType: "image/png",
      buffer: Buffer.from(fixture.split(",")[1], "base64"),
    });
    await page
      .locator("#files")
      .setInputFiles([file("260901_Probe.png"), file("260902_Konzert.png")]);
    await page.waitForFunction(
      () => !busy && p.images.length === 2 && p.boards.length === 4,
    );
    assert.equal(await page.locator(".image-info-card").count(), 2);
    assert.equal(await page.locator(".image-group .board-row").count(), 2);
    const rowGeometry = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".image-group")].map((row) => {
          const c = row
              .querySelector(".image-info-card")
              .getBoundingClientRect(),
            bs = [...row.querySelectorAll(".board-card")].map((b) => {
              const r = b.getBoundingClientRect();
              return {
                x: r.x,
                y: r.y,
                canvasY: b.querySelector("canvas").getBoundingClientRect().y,
                right: r.right,
                bottom: r.bottom,
              };
            });
          return {
            card: {
              x: c.x,
              y: c.y,
              right: c.right,
              width: c.width,
              bottom: c.bottom,
            },
            boards: bs,
          };
        }),
      );
    const geometry = await rowGeometry();
    for (const r of geometry) {
      assert.equal(r.card.width, 230);
      assert(r.card.right < r.boards[0].x);
      assert.equal(r.card.y, r.boards[0].canvasY);
      assert(r.boards[0].right < r.boards[1].x);
    }
    assert(
      geometry[1].card.y >
        Math.max(
          geometry[0].card.bottom,
          ...geometry[0].boards.map((b) => b.bottom),
        ),
    );
    assert(
      geometry[0].card.x > 0 && geometry[0].boards.at(-1).right < 1312,
      "First row fits initially",
    );
    await page.waitForFunction(() => {
      const im = document.querySelector("[data-image-preview]");
      return im.complete && im.naturalWidth > 0;
    });
    const thumbnail = await page.evaluate(() => {
      const im = document.querySelector("[data-image-preview]");
      return {
        width: im.naturalWidth,
        height: im.naturalHeight,
        small: im.src !== p.images[0].data,
        original:
          MKWProjectAssets.compact(p).images[0].data === p.images[0].data,
      };
    });
    assert.deepEqual(thumbnail, {
      width: 460,
      height: 220,
      small: true,
      original: true,
    });
    const firstCard = page.locator(".image-info-card").first();
    for (const action of [
      "replace",
      "imageUp",
      "imageDown",
      "addBoard",
      "removeImage",
    ])
      assert.equal(
        await firstCard.locator(`[data-action=${action}]`).count(),
        1,
      );
    assert(await firstCard.locator("[data-action=imageUp]").isDisabled());
    assert(
      await page
        .locator(".image-info-card")
        .last()
        .locator("[data-action=imageDown]")
        .isDisabled(),
    );
    await firstCard.locator("[data-copyright]").fill("Probe © Noé Plain");
    assert(
      await page.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[0].id)
          .every((b) => b.elements.copyright.text === "Probe © Noé Plain"),
      ),
    );
    await firstCard.locator("summary").click();
    await firstCard.locator("[data-text-type=subtitle]").check();
    assert(
      await page.evaluate(() =>
        p.boards.every((b) => b.elements.subtitle.enabled),
      ),
    );
    await page.locator(".image-info-card").last().locator("summary").click();
    await page
      .locator(".image-info-card")
      .last()
      .locator("[data-text-type=subtitle]")
      .uncheck();
    assert(
      await page.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[1].id)
          .every((b) => !b.elements.subtitle.enabled),
      ),
    );
    await firstCard.locator("summary").click();
    await firstCard.locator("[data-family-mode]").check();
    assert(await page.evaluate(() => p.boards.every((b) => b.family.enabled)));
    await firstCard.locator("[data-family-mode]").uncheck();
    await firstCard.locator("summary").click();
    const ids = await page.evaluate(() => p.images.map((i) => i.id));
    await firstCard.locator("[data-action=imageDown]").click();
    assert.deepEqual(
      await page.evaluate(() => p.images.map((i) => i.id)),
      ids.slice().reverse(),
    );
    await page
      .locator(".image-info-card")
      .first()
      .locator("[data-action=imageDown]")
      .click();
    assert.deepEqual(await page.evaluate(() => p.images.map((i) => i.id)), ids);
    await page.locator("#toolsToggle").click();
    await firstCard.locator("[data-action=addBoard]").click();
    assert.equal(
      await page.locator("#toolTitle").innerText(),
      "Format anpassen",
    );
    assert(await page.locator("#toolsSidebar").isVisible());
    assert.equal(
      await page.locator("#width").inputValue(),
      String(await page.evaluate(() => board().w)),
    );
    assert.equal(
      await page.locator("#height").inputValue(),
      String(await page.evaluate(() => board().h)),
    );
    assert(await page.evaluate(() => selected === p.boards.at(-1).id));
    assert.equal(await page.evaluate(() => p.boards.length), 5);
    assert(
      await page.evaluate(
        () => p.boards.at(-1).elements.copyright.text === "Probe © Noé Plain",
      ),
    );
    await firstCard.locator("[data-action=replace]").click();
    await page.locator("#files").setInputFiles(file("Neu.png"));
    await page.waitForFunction(() => !busy && p.images[0].name === "Neu.png");
    assert.equal(await page.evaluate(() => p.boards.length), 5);
    assert(
      await page.evaluate(
        () => p.boards[0].elements.copyright.text === "Probe © Noé Plain",
      ),
    );
    // Fit back to the image row; panning and zoom are view operations only.
    await page.evaluate(() => {
      selectBoard(p.boards[0].id);
      postFitRow();
    });
    const artwork = await page.evaluate(() => JSON.stringify(p.boards)),
      viewBefore = await page.evaluate(() => view);
    const canvas = page.locator("canvas[data-board]").first(),
      box = await canvas.boundingBox(),
      point = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.4 };
    const unitPoint = () =>
      page.evaluate((pt) => {
        const r = document
          .querySelector("canvas[data-board]")
          .getBoundingClientRect();
        return { x: (pt.x - r.x) / r.width, y: (pt.y - r.y) / r.height };
      }, point);
    const beforePoint = await unitPoint();
    await page.mouse.move(point.x, point.y);
    await page.keyboard.down("Alt");
    await page.mouse.wheel(0, -80);
    await page.keyboard.up("Alt");
    await page.waitForTimeout(80);
    const afterPoint = await unitPoint();
    assert(
      Math.abs(beforePoint.x - afterPoint.x) < 0.01 &&
        Math.abs(beforePoint.y - afterPoint.y) < 0.01,
    );
    assert((await page.evaluate(() => view)) > viewBefore);
    assert.equal((await firstCard.boundingBox()).width, 230);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.down("Space");
    const beforePan = await canvas.boundingBox();
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 100, point.y + 70, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Space");
    const afterPan = await canvas.boundingBox();
    assert(
      Math.abs(afterPan.x - beforePan.x - 100) < 2 &&
        Math.abs(afterPan.y - beforePan.y - 70) < 2,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.boards)),
      artwork,
      "Navigation must not mutate artwork",
    );
    // Removing the sidebar preserves the artwork point at the viewport centre.
    const centre = () =>
      page.evaluate(() => {
        const a = postCaptureAnchor();
        return { id: a.id, u: a.u, v: a.v };
      });
    const beforeCentre = await centre();
    await page.locator("#toolsToggle").click();
    const afterCentre = await centre();
    assert.equal(beforeCentre.id, afterCentre.id);
    assert(
      Math.abs(beforeCentre.u - afterCentre.u) < 0.02 &&
        Math.abs(beforeCentre.v - afterCentre.v) < 0.02,
    );
    await page.locator("#toolsToggle").click();
    await page.evaluate(() => {
      selectBoard(null);
      postViewport.scrollLeft += 120;
      postViewport.scrollTop += 90;
    });
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => JSON.stringify(p.boards)), artwork);
    // A two-finger gesture changes the zoom, including when the first finger touched an image.
    await page.evaluate(() => {
      postFitRow();
      const c = document.querySelector("canvas[data-board]"),
        r = c.getBoundingClientRect(),
        x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      for (const [id, dx] of [
        [51, -30],
        [52, 30],
      ])
        c.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            pointerId: id,
            pointerType: "touch",
            clientX: x + dx,
            clientY: y,
            button: 0,
            cancelable: true,
          }),
        );
      c.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 52,
          pointerType: "touch",
          clientX: x + 100,
          clientY: y,
          cancelable: true,
        }),
      );
      for (const id of [51, 52])
        c.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            pointerId: id,
            pointerType: "touch",
            clientX: x,
            clientY: y,
            button: 0,
          }),
        );
    });
    assert.equal(await page.evaluate(() => JSON.stringify(p.boards)), artwork);
    await page.evaluate(() => studioSetTheme("light"));
    await page.evaluate(() => {
      p.boards[0].image.scale = 1.1;
      draw();
    });
    await page.waitForTimeout(100);
    assert.equal(
      await canvas
        .locator("..")
        .evaluate((el) => getComputedStyle(el).outlineColor),
      "rgb(234, 164, 0)",
    );
    await page.evaluate(() => {
      p.boards[0].image.scale = 0.01;
      draw();
    });
    await page.waitForTimeout(100);
    const warning = await page.locator("#postNotice").evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        color: s.color,
        background: s.backgroundColor,
        border: s.borderColor,
      };
    });
    assert.equal(warning.background, "rgb(255, 243, 204)");
    assert.equal(warning.color, "rgb(143, 75, 0)");
    assert.equal(
      await canvas
        .locator("..")
        .evaluate((el) => getComputedStyle(el).outlineColor),
      "rgb(224, 58, 62)",
    );
    await page.locator("#postNotice").click();
    assert.equal(
      await page
        .locator(".studio-warning-item")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(240, 242, 245)",
    );
    await page.locator("#closeStudioWarnings").click();
    await page.evaluate(() => postFitRow());
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-cards-light.png"),
    });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-cards-dark.png"),
    });
    await page.setViewportSize({ width: 640, height: 900 });
    await page.waitForTimeout(100);
    assert(await firstCard.locator(".image-card-body").isVisible());
    assert.equal(await page.locator("[data-card-toggle]").count(), 0);
    assert.equal(await page.locator(".template-hint").count(), 0);
    assert(await firstCard.locator("[data-copyright]").isVisible());
    assert.equal((await firstCard.boundingBox()).width, 230);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth === innerWidth,
      ),
    );
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-cards-mobile.png"),
    });
    await page
      .locator(".image-info-card")
      .last()
      .locator("[data-action=removeImage]")
      .click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(() => p.images.length === 1);
    assert.equal(await page.evaluate(() => p.images.length), 1);
    assert(await page.locator("#addMoreImages").isVisible());
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    console.log(
      "PASS left image cards and all actions, row fit, anchored zoom, pan, pinch, sidebar preservation, saturated warnings, mobile cards, no artwork changes during navigation",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
