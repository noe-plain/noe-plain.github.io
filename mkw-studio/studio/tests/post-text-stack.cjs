const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1150 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Textstapel");
    await page.locator("#createProject").click();
    await page.evaluate(async () => {
      const c = makeCanvas(1600, 2000),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#356278";
      ctx.fillRect(0, 0, c.width, c.height);
      const data = c.toDataURL();
      p.images = [];
      p.boards = [];
      p.formats = [
        { w: 1080, h: 1350, top: 100, bottom: 200 },
        { w: 1080, h: 1920, top: 200, bottom: 500 },
      ];
      for (let i = 0; i < 3; i++) {
        const im = {
          id: uid(),
          name: `Bild ${i + 1}.png`,
          width: c.width,
          height: c.height,
          data,
          original: data,
        };
        p.images.push(im);
        for (const f of p.formats) {
          const b = createBoard(im, f.w, f.h);
          for (const [key, text] of [
            ["date", "DO 19. NOV 2026"],
            ["title", "Musik erleben"],
            ["subtitle", i === 2 ? "Eigener Text" : "Mit dem Kollegium"],
          ])
            Object.assign(b.elements[key], {
              text,
              visible: true,
              enabled: true,
            });
          p.boards.push(b);
        }
      }
      selected = p.boards[0].id;
      step = "text";
      layer = "title";
      view = 0.8;
      render();
      await autosave();
    });
    await page.waitForFunction(() => !drawing && fontStatus["Replica LL"]);
    const ids = await page.evaluate(() => p.images.map((im) => im.id));
    await page.locator(`[data-text-picker="${ids[0]}"] summary`).click();
    const options = page.locator(
      `[data-text-picker="${ids[0]}"] .text-type-options`,
    );
    assert.deepEqual(
      await options
        .locator(".post-option-row")
        .evaluateAll((rows) =>
          rows.map(
            (r) =>
              r.querySelector("input")?.dataset.textType ||
              (r.querySelector("input")?.dataset.postAngle !== undefined &&
                "angle") ||
              (r.querySelector("input")?.dataset.familyMode !== undefined &&
                "family") ||
              "sponsors",
          ),
        ),
      ["date", "title", "subtitle", "angle", "family", "sponsors"],
    );
    assert.equal(await options.locator("hr").count(), 2);
    assert.equal(
      await options.locator(".post-options-heading").textContent(),
      "Textoptionen",
    );
    await page.keyboard.press("Escape");
    const input = (key) => page.locator(`[data-stack-gap="${key}"]`);
    const gaps = () =>
      page.evaluate(() => p.boards.map((b) => clone(b.textBox || {})));
    const base = await page.evaluate(() =>
      textBlock(p.boards[0], "title").mainRecords.map((r) => ({
        key: r.key,
        y: r.y,
        h: r.h,
      })),
    );
    await input("date:title").fill("38");
    assert.deepEqual(
      (await gaps()).map((b) => b.gaps?.["date:title"]),
      [38, 38, 38, 38, 38, 38],
    );
    await input("title:subtitle").fill("28");
    assert.deepEqual(
      (await gaps()).map((b) => b.gaps?.["title:subtitle"]),
      [28, 28, 28, 28, undefined, undefined],
    );
    let after = await page.evaluate(() =>
      textBlock(p.boards[0], "title").mainRecords.map((r) => ({
        key: r.key,
        y: r.y,
        h: r.h,
      })),
    );
    assert.equal(after[2].y + after[2].h, base[2].y + base[2].h);
    await page.locator('[data-stack-reset="date:title"]').click();
    assert((await gaps()).every((b) => !("date:title" in (b.gaps || {}))));
    await page.evaluate(() => {
      document.activeElement.blur();
      postSetZoom(0.7);
    });
    const handle = page.locator('[data-stack-handle="title:subtitle"]');
    await handle.scrollIntoViewIfNeeded();
    const pos = await handle.boundingBox(),
      beforeDrag = await gaps();
    await page.mouse.move(pos.x + pos.width / 2, pos.y + pos.height / 2);
    await page.mouse.down();
    await page.mouse.move(pos.x + pos.width / 2, pos.y + pos.height / 2 - 21, {
      steps: 5,
    });
    await page.mouse.up();
    await page.waitForFunction(() => !drawing);
    const dragged = (await gaps())[0].gaps["title:subtitle"];
    assert(dragged > 28);
    assert.equal((await gaps())[0].offset || 0, beforeDrag[0].offset || 0);
    await page.evaluate(() => undo());
    assert.equal((await gaps())[0].gaps["title:subtitle"], 28);
    await page.evaluate(() => redo());
    assert.equal((await gaps())[0].gaps["title:subtitle"], dragged);
    await handle.dblclick();
    assert.equal(
      await input("title:subtitle").evaluate(
        (el) => el === document.activeElement,
      ),
      true,
    );
    await input("title:subtitle").fill("30");
    await input("title:subtitle").blur();
    const move = page.locator(".text-group-move");
    await move.scrollIntoViewIfNeeded();
    const m = await move.boundingBox();
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
    await page.mouse.down();
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2 - 24, {
      steps: 4,
    });
    await page.mouse.up();
    await page.waitForFunction(() => !drawing);
    assert.equal((await gaps())[0].gaps["title:subtitle"], 30);
    assert((await gaps())[0].offset > 0);
    const cancelStart = await gaps(),
      h = await handle.boundingBox();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 - 18, {
      steps: 4,
    });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.deepEqual(await gaps(), cancelStart);
    // Advanced inspector retains the same stack controls and numeric edits remain per image.
    await page.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      selected = p.boards[2].id;
      renderPanel();
      syncOverlays(true);
    });
    assert.equal(
      (await page.locator("#typographyInspector").count()) ||
        (await page.locator(".typo-tabs").count()),
      1,
    );
    await input("title:subtitle").fill("52");
    assert.deepEqual(
      (await gaps()).map((b) => b.gaps?.["title:subtitle"]),
      [30, 30, 52, 52, undefined, undefined],
    );
    const persistence = await page.evaluate(async () => {
      const file = await MKWProjectFile.encode(p),
        q = MKWProjectAssets.hydrate(await MKWProjectFile.decode(file));
      validate(q);
      const b = p.boards[0],
        created = createBoard(p.images[0], 1080, 1440);
      return {
        roundtrip: q.boards.map((b) => b.textBox),
        current: p.boards.map((b) => b.textBox),
        created: created.textBox,
        original: b.textBox,
      };
    });
    assert.deepEqual(persistence.roundtrip, persistence.current);
    assert.deepEqual(persistence.created.gaps, persistence.original.gaps);
    assert.equal(persistence.created.offset, 0);
    await page.evaluate(() => {
      selected = p.boards[0].id;
      renderPanel();
      syncOverlays(true);
      postFitRow();
    });
    const exact = await page.evaluate(async () => {
      const b = p.boards[0],
        expected = makeCanvas(b.w, b.h),
        actual = makeCanvas(b.w, b.h);
      await paint(exportContext(expected), b, 1, { transparent: false });
      const encoded = await encodedBoard(b, {
        format: "png",
        quality: 90,
        png8: false,
        colours: 256,
        transparent: false,
      });
      const decoded = await image(await dataURL(encoded.blob));
      actual.getContext("2d").drawImage(decoded, 0, 0);
      const a = expected.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        png = actual.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        saved = p.boards;
      let psd;
      try {
        p.boards = [b];
        psd = agPsd
          .readPsd(await (await buildPSD()).arrayBuffer())
          .canvas.getContext("2d")
          .getImageData(0, 0, b.w, b.h).data;
      } finally {
        p.boards = saved;
      }
      return {
        png: a.every((v, i) => v === png[i]),
        psd: a.every((v, i) => v === psd[i]),
      };
    });
    assert(
      exact.png,
      "Stack gaps render exactly in PNG without editing handles",
    );
    assert(exact.psd, "Stack gaps render exactly in PSD");
    await page.screenshot({ path: artifact("post-text-stack-light.png") });
    await page.evaluate(() => {
      studioSetTheme("dark");
    });
    await page.screenshot({ path: artifact("post-text-stack-dark.png") });
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    await page.setViewportSize({ width: 700, height: 950 });
    await page.locator("#toolsToggle").click();
    assert(await page.locator(".post-text-stack").isVisible());
    assert(
      await page
        .locator(".post-text-stack")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.evaluate(() => {
      selected = p.boards[0].id;
      resize(2160, 2700, "layout");
    });
    assert.equal((await gaps())[0].gaps["title:subtitle"], 60);
    assert.deepEqual(errors, []);
    console.log(
      "Options hierarchy, stack fields/handles, template matching, undo/cancel, whole-block movement and portable round trips passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
