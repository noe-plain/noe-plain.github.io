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
    await page.locator("#setupName").fill("Winkel in Einzelposts");
    await page.locator("#createProject").click();
    await page.evaluate(async () => {
      p.meta.headline = "Konzert";
      const c = makeCanvas(2400, 2400),
        ctx = c.getContext("2d"),
        g = ctx.createLinearGradient(0, 0, 2400, 2400);
      g.addColorStop(0, "#075c85");
      g.addColorStop(0.45, "#edb54c");
      g.addColorStop(1, "#864695");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2400, 2400);
      ctx.fillStyle = "#154c54";
      for (let y = 0; y < 2400; y += 180)
        for (let x = 0; x < 2400; x += 240) ctx.fillRect(x, y, 40, 90);
      const data = c.toDataURL();
      p.images = [];
      p.boards = [];
      p.formats = [
        { w: 1080, h: 1080, top: 100, bottom: 200 },
        { w: 1080, h: 1920, top: 200, bottom: 500 },
      ];
      for (let n = 0; n < 2; n++) {
        const im = {
          id: uid(),
          name: `Bild ${n + 1}.png`,
          width: 2400,
          height: 2400,
          data,
          original: data,
        };
        p.images.push(im);
        for (const f of p.formats) p.boards.push(createBoard(im, f.w, f.h));
      }
      selected = p.boards[0].id;
      view = 1;
      render();
      await autosave();
    });
    const ids = await page.evaluate(() => p.images.map((im) => im.id)),
      first = () => page.locator(`[data-text-picker="${ids[0]}"]`);
    await first().locator("summary").click();
    await page.waitForFunction(() => sponsorGroupsLoaded && !sponsorLoading);
    const rows = await first()
      .locator(".post-option-row")
      .evaluateAll((rows) =>
        rows.map((r) => ({
          height: r.getBoundingClientRect().height,
          padding: getComputedStyle(r).paddingLeft,
          checkbox: r.querySelector("input").getBoundingClientRect().width,
        })),
      );
    assert.equal(rows.length, 6);
    assert(
      rows.every(
        (row) =>
          row.height === 40 && row.padding === "10px" && row.checkbox === 16,
      ),
      JSON.stringify(rows),
    );
    await page.locator(`[data-post-angle="${ids[0]}"]`).check();
    assert(await page.evaluate(() => p.boards.filter((b) => b.imageId === p.images[0].id).every((b) => b.angle.enabled)));
    assert(await page.evaluate(() => p.boards.filter((b) => b.imageId === p.images[1].id).every((b) => !b.angle?.enabled)));
    assert(
      await page.evaluate(() =>
        p.boards.filter((b) => b.angle?.enabled).every((b) =>
          MKWPostAngle.covers(b, asset(b), MKWPostAngleEditor.area(b)),
        ),
      ),
    );
    assert.equal(
      await page.locator("#toolTitle").textContent(),
      "Winkel gestalten",
    );
    assert.match(
      await first().locator("[data-text-summary]").textContent(),
      /Winkel/,
    );
    await page
      .locator(`[data-post-angle-direction="${ids[0]}"]`)
      .selectOption("up");
    assert(
      await page.evaluate(() =>
        p.boards.filter((b) => b.imageId === p.images[0].id).every((b) => b.angle.direction === "up"),
      ),
    );
    await page.locator(`[data-text-picker="${ids[1]}"] summary`).click();
    await page
      .locator(`[data-post-angle-direction="${ids[1]}"]`)
      .selectOption("down");
    await first().locator("summary").click();
    await page
      .locator(`[data-post-angle-direction="${ids[0]}"]`)
      .selectOption("left");
    assert.deepEqual(
      await page.evaluate(() => p.boards.map((b) => b.angle.direction)),
      ["left", "left", "down", "down"],
    );
    assert(await page.evaluate(() => !createBoard({ ...p.images[0], id: "new-photo" }, 1080, 1350).angle), "New images never inherit an angle from the first image");
    // Geometry is backed by the same Path2D mask as the carousel, for every direction.
    const masks = await page.evaluate(() => {
      const b = p.boards[0],
        a = b.angle,
        direction = a.direction;
      let match = true;
      for (const d of MKWPostAngle.directions) {
        a.direction = d;
        const area = MKWPostAngleEditor.area(b),
          { o } = MKWPostAngle.geometry(b, area),
          path = carouselAngleMask(o),
          ctx = makeCanvas(1, 1).getContext("2d");
        for (let y = 11; y < b.h; y += 41)
          for (let x = 13; x < b.w; x += 43)
            if (
              MKWPostAngle.contains(b, { x, y }, area) !==
              ctx.isPointInPath(path, x - o.x, y - o.y)
            )
              match = false;
      }
      a.direction = direction;
      return match;
    });
    assert(masks);
    await page.evaluate(() => MKWPostAngleEditor.select(p.boards[0], false));
    await page.locator(`canvas[data-board]`).first().scrollIntoViewIfNeeded();
    const point = async () =>
      page.evaluate(() => {
        const b = p.boards[0],
          { tip, inner } = MKWPostAngle.geometry(b, MKWPostAngleEditor.area(b)),
          c = document
            .querySelector(`canvas[data-board="${b.id}"]`)
            .getBoundingClientRect();
        return {
          x: c.left + (((tip.x + inner.x) / 2) * c.width) / b.w,
          y: c.top + (((tip.y + inner.y) / 2) * c.height) / b.h,
        };
      });
    const initial = await page.evaluate(() => ({
      angle: clone(p.boards[0].angle),
      background: clone(p.boards[0].image),
    }));
    const drag = async (from, dx, dy) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 });
      await page.mouse.up();
      await page.waitForFunction(() => !drawing);
    };
    await drag(await point(), 18, -12);
    const moved = await page.evaluate(() => clone(p.boards[0].angle));
    assert.notDeepEqual(moved.tip, initial.angle.tip);
    assert.equal(moved.tip.y, .5);
    assert.deepEqual(
      await page.evaluate(() => p.boards[0].image),
      initial.background,
    );
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForFunction(
      (tip) => JSON.stringify(p.boards[0].angle.tip) === JSON.stringify(tip),
      initial.angle.tip,
    );
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.waitForFunction(
      (tip) => JSON.stringify(p.boards[0].angle.tip) === JSON.stringify(tip),
      moved.tip,
    );
    const hit = await point();
    await page.mouse.dblclick(hit.x, hit.y);
    await page.waitForFunction(() => MKWPostAngleEditor.editing(p.boards[0]));
    assert.equal(
      await page.locator(".post-angle-transform .handle").count(),
      4,
    );
    const frame = await page.evaluate(() => clone(p.boards[0].angle.tip));
    await drag(await point(), 8, 7);
    assert.deepEqual(await page.evaluate(() => p.boards[0].angle.tip), frame);
    assert.notEqual(
      await page.evaluate(() => p.boards[0].angle.image.x),
      moved.image.x,
    );
    assert.deepEqual(
      await page.evaluate(() => p.boards[0].image),
      initial.background,
    );
    const beforeScale = await page.evaluate(
        () => p.boards[0].angle.image.scale,
      ),
      handle = page.locator('.post-angle-transform [data-corner="2"]');
    await handle.scrollIntoViewIfNeeded();
    const rect = await handle.boundingBox();
    await drag(
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      12,
      12,
    );
    assert(
      await page.evaluate(
        (v) => p.boards[0].angle.image.scale > v,
        beforeScale,
      ),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".post-angle-transform").count(), 0);
    await page.locator("[data-angle-flip=flipX]").click();
    assert.equal(await page.evaluate(() => p.boards[0].angle.image.flipX), -1);
    assert.equal(await page.evaluate(() => p.boards[0].image.flipX), 1);
    await page.locator("#postAngleGlow").fill("35");
    await page.locator("#postAngleGlow").press("Tab");
    assert.equal(await page.evaluate(() => p.boards[0].angle.glow), 35);
    await page.evaluate(() => {
      p.boards[0].angle.image.scale = 0.02;
      changed(false);
    });
    await page.waitForFunction(() =>
      studioWarningItems.some((w) => w.key === "postAngle"),
    );
    await page.evaluate(() =>
      studioFocusWarning(studioWarningItems.find((w) => w.key === "postAngle")),
    );
    assert(await page.evaluate(() => MKWPostAngleEditor.editing(p.boards[0])));
    await page.locator("#postAngleFill").click();
    await page.keyboard.press("Escape");
    assert(
      await page.evaluate(() =>
        MKWPostAngle.covers(
          p.boards[0],
          asset(p.boards[0]),
          MKWPostAngleEditor.area(p.boards[0]),
        ),
      ),
    );
    await page.screenshot({ path: artifact("mkw-post-angle-editor.png") });
    // MKW portability retains one photo, all transforms and option inheritance, without new data payloads.
    const portable = await page.evaluate(async () => {
      validate(p);
      const saved = await MKWProjectFile.decode(await MKWProjectFile.encode(p));
      return {
        angles: saved.boards.map((b) => b.angle),
        photos: saved.images.length,
        serialized: JSON.stringify(saved.boards).includes("data:image"),
        overrides: saved.angleOverrides,
      };
    });
    assert.equal(portable.photos, 2);
    assert.equal(portable.serialized, false);
    assert.deepEqual(
      portable.angles,
      await page.evaluate(() => p.boards.map((b) => b.angle)),
    );
    // Main paint, PNG and a separately rendered PSD angle share the same pixels.
    const fidelity = await page.evaluate(async () => {
      const saved = p.boards;
      p.boards = [p.boards[0]];
      try {
        const b = p.boards[0],
          expected = makeCanvas(b.w, b.h);
        await paint(exportContext(expected), b);
        const png = await encodedBoard(b, {
            format: "png",
            quality: 90,
            colours: 256,
            transparent: false,
          }),
          bitmap = await createImageBitmap(png.blob),
          actual = makeCanvas(b.w, b.h);
        exportContext(actual).drawImage(bitmap, 0, 0);
        const a = exportContext(actual).getImageData(0, 0, b.w, b.h).data,
          e = exportContext(expected).getImageData(0, 0, b.w, b.h).data;
        const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer()),
          layer = psd.children[0].children.find(
            (l) => l.name === "Winkel · Bildausschnitt (gerastert)",
          ),
          direct = await layerBitmap(b, "postAngle"),
          layerCanvas = makeCanvas(b.w, b.h),
          layerContext = exportContext(layerCanvas);
        layerContext.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
        const la = layerContext.getImageData(0, 0, b.w, b.h).data,
          ld = exportContext(direct.canvas).getImageData(0, 0, b.w, b.h).data;
        return {
          png: a.every((v, i) => v === e[i]),
          psd: la.every((v, i) => v === ld[i]),
          psdSize: [
            layer.canvas.width,
            layer.canvas.height,
            direct.canvas.width,
            direct.canvas.height,
          ],
          psdDiff: la.reduce((n, v, i) => n + (v !== ld[i]), 0),
          psdMax: la.reduce((n, v, i) => Math.max(n, Math.abs(v - ld[i])), 0),
          psdSamples: (() => {
            const out = [];
            for (let i = 0; i < la.length && out.length < 5; i++)
              if (la[i] !== ld[i]) out.push([i, la[i], ld[i]]);
            return out;
          })(),
          layer: !!layer,
          opaque: a.every((v, i) => i % 4 !== 3 || v === 255),
        };
      } finally {
        p.boards = saved;
      }
    });
    assert(fidelity.png, JSON.stringify(fidelity));
    assert(fidelity.psd, JSON.stringify(fidelity));
    assert(fidelity.layer);
    assert(fidelity.opaque);
    await page.evaluate(async () => {
      await autosave();
    });
    const snapshot = await page.evaluate(() =>
      JSON.stringify(p.boards.map((b) => b.angle)),
    );
    await page.reload();
    await page.locator("#startContinue").click();
    await page.waitForFunction(() => !busy && p.images.length === 2);
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.boards.map((b) => b.angle))),
      snapshot,
    );
    // New formats receive settings and a new fitted crop; disabling preserves the editable content.
    const inherited = await page.evaluate(() => {
      const b = createBoard(p.images[0], 1080, 1440);
      return {
        enabled: b.angle.enabled,
        direction: b.angle.direction,
        covered: MKWPostAngle.covers(b, asset(b), MKWPostAngleEditor.area(b)),
      };
    });
    assert.deepEqual(inherited, {
      enabled: true,
      direction: "left",
      covered: true,
    });
    await page.locator(`[data-text-picker="${ids[0]}"] summary`).click();
    await page.locator(`[data-post-angle="${ids[0]}"]`).uncheck();
    assert(
      await page.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[0].id)
          .every((b) => !b.angle.enabled),
      ),
    );
    assert(
      (await page.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[1].id)
          .every((b) => b.angle.enabled),
      )) === true,
      "Other images stay enabled independently of the first image",
    );
    await page.locator(`[data-text-picker="${ids[1]}"] summary`).click();
    await page.locator(`[data-post-angle="${ids[1]}"]`).check();
    await page.locator(`[data-text-picker="${ids[0]}"] summary`).click();
    await page.locator(`[data-post-angle="${ids[0]}"]`).check();
    await page.locator(`[data-post-angle="${ids[0]}"]`).uncheck();
    assert(
      await page.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[1].id)
          .every((b) => b.angle.enabled),
      ),
      "Explicit per-image visibility survives later first-image changes",
    );
    await page.setViewportSize({ width: 640, height: 950 });
    await page.screenshot({
      path: artifact("mkw-post-angle-options-mobile.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS single-post angle options/consistency/independent images, three masks and hidden rear ends, frame drag vs double-click crop/handles, undo/redo, fill/flip/glow, lossless MKW without image duplication, new formats, PNG/PSD parity and browser restore",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
