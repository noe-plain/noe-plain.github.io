const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.goto(
      new URL("seitenmanagement-test.html", process.env.STUDIO_URL).href,
    );
    await page.locator("[data-designer-layout=free]").click();
    await page.locator("#setupName").fill("Freie Zeichenflächen");
    await page.locator("#cn").fill("2");
    await page.locator("#setupSplitPageGroup").click();
    assert.equal(
      await page.locator("#carouselSetupStrip [data-page-group]").count(),
      2,
    );
    await page
      .locator('#projectSetup [data-move-page="1"]')
      .selectOption(
        await page
          .locator("#carouselSetupStrip [data-page-group]")
          .first()
          .getAttribute("data-page-group"),
      );
    assert.equal(
      await page.locator("#carouselSetupStrip [data-page-group]").count(),
      1,
      "setup can merge a page into a group using its keyboard-accessible selector",
    );
    await page
      .locator("#projectSetup [data-group-orientation]")
      .selectOption("horizontal");
    await page.locator("#createProject").click();
    try {
      await waitForProjectReady(page);
    } catch (e) {
      console.log(await page.locator("#setupError").textContent(), errors);
      throw e;
    }
    assert.equal(await page.evaluate(() => p.carousel.layout), "free");
    assert.equal(await page.locator(".designer-artboard-surface").count(), 2);
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageGroups.map((group) => group.orientation),
      ),
      ["horizontal"],
    );
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map(({ x, y }) => [x, y])),
      [
        [0, 0],
        [1200, 0],
      ],
      "setup group orientation determines initial pasteboard arrangement",
    );
    await page.locator('[data-slide="0"]').click();
    assert(await page.locator("#designerArtboardChoice").isVisible());
    await page.locator("[data-artboard=w]").fill("800");
    await page.locator("[data-artboard=h]").fill("1000");
    await page.locator("[data-artboard-bg]").evaluate((el) => {
      el.value = "#ef2345";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.equal(
      await page.evaluate(() => p.carousel.artboards[0].w),
      1080,
      "Draft must not mutate document",
    );
    await page.locator("#designerApplyArtboard").click();
    assert.deepEqual(
      await page.evaluate(() => p.boards.map((b) => [b.w, b.h])),
      [
        [800, 1000],
        [1080, 1350],
      ],
    );
    await page.evaluate(() => {
      const a = p.carousel.artboards[1];
      carouselObject("shape", {
        x: a.x + 100,
        y: a.y + 100,
        w: 200,
        h: 200,
        fill: "#123456",
        strokeWidth: 0,
      });
    });
    const shape = await page.evaluate(() => ({
      id: carouselSelected()[0].id,
      x: carouselSelected()[0].x,
      y: carouselSelected()[0].y,
      boardY: p.carousel.artboards[1].y,
    }));
    await page.locator('[data-slide="1"]').click();
    await page.locator("[data-artboard=y]").fill("1600");
    await page.locator("#designerApplyArtboard").click();
    assert.equal(
      await page.evaluate(
        (id) => p.carousel.objects.find((o) => o.id === id).y,
        shape.id,
      ),
      shape.y + 1600 - shape.boardY,
    );
    assert.equal(await page.evaluate(() => validate(p) === p), true);
    const pixels = await page.evaluate(async () => {
      await carouselWaitForPaint();
      const c = p.carousel,
        a = MKWCarouselPolicy.extent(c),
        canvas = makeCanvas(a.w, a.h),
        ctx = exportContext(canvas);
      await carouselPaint(ctx);
      return {
        gap: ctx.getImageData(900, 1200, 1, 1).data[3],
        red: [...ctx.getImageData(10, 10, 1, 1).data],
        slice: await (async () => {
          const b = p.boards[1],
            cv = makeCanvas(b.w, b.h),
            ct = exportContext(cv);
          await paint(ct, b, 1);
          return [...ct.getImageData(150, 150, 1, 1).data];
        })(),
      };
    });
    assert.equal(pixels.gap, 0);
    assert.deepEqual(pixels.red, [239, 35, 69, 255]);
    assert.deepEqual(pixels.slice, [18, 52, 86, 255]);
    const positionsBeforeGroups = await page.evaluate(() =>
      p.carousel.artboards.map(({ x, y }) => [x, y]),
    );
    await page.locator('[data-slide="1"]').click();
    await page.locator("#designerSplitGroup").click();
    assert.equal(await page.evaluate(() => p.carousel.pageGroups.length), 2);
    await page
      .locator("#carouselProperties [data-group-orientation]")
      .nth(1)
      .selectOption("vertical");
    assert.equal(
      await page.evaluate(() => validate(p) === p),
      true,
      "group orientation must not invalidate artboard geometry or page order",
    );
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(() => p.carousel.pageGroups[1].orientation),
      "horizontal",
    );
    await page.evaluate(() => redo());
    assert.equal(
      await page.evaluate(() => p.carousel.pageGroups[1].orientation),
      "vertical",
    );
    await page
      .locator('#carouselProperties [data-move-page="1"]')
      .selectOption(
        await page
          .locator("[data-page-group]")
          .first()
          .getAttribute("data-page-group"),
      );
    assert.equal(await page.evaluate(() => p.carousel.pageGroups.length), 1);
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map(({ x, y }) => [x, y])),
      positionsBeforeGroups,
      "regrouping must not move artboards on the pasteboard",
    );
    await page
      .locator("#carouselProperties [data-group-orientation]")
      .selectOption("horizontal");
    const beforeArrange = await page.evaluate(
      (id) => ({
        order: p.carousel.artboards.map((artboard) => artboard.id),
        shape: {
          x: p.carousel.objects.find((object) => object.id === id).x,
          y: p.carousel.objects.find((object) => object.id === id).y,
        },
      }),
      shape.id,
    );
    await page.locator("#carouselProperties [data-group-arrange]").click();
    assert.deepEqual(
      await page.evaluate(
        (id) => ({
          positions: p.carousel.artboards.map(({ x, y }) => [x, y]),
          order: p.carousel.artboards.map((artboard) => artboard.id),
          shape: {
            x: p.carousel.objects.find((object) => object.id === id).x,
            y: p.carousel.objects.find((object) => object.id === id).y,
          },
        }),
        shape.id,
      ),
      {
        positions: [
          [0, 0],
          [824, 0],
        ],
        order: beforeArrange.order,
        shape: {
          x: beforeArrange.shape.x - 376,
          y: beforeArrange.shape.y - 1600,
        },
      },
      "explicit arrangement docks pages horizontally without changing export order and moves their content",
    );
    await page.evaluate(() => undo());
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map(({ x, y }) => [x, y])),
      positionsBeforeGroups,
      "undo restores prior artboard geometry",
    );
    await page.evaluate(() => redo());
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map(({ x, y }) => [x, y])),
      [
        [0, 0],
        [824, 0],
      ],
      "redo restores the explicit docked layout",
    );
    await page
      .locator("#carouselProperties [data-group-orientation]")
      .selectOption("vertical");
    await page.locator("#carouselProperties [data-group-arrange]").click();
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map(({ x, y }) => [x, y])),
      [
        [0, 0],
        [0, 1024],
      ],
      "the explicit arrangement can also dock pages vertically",
    );
    await page.locator('[data-slide="1"]').click();
    await page.locator("#designerSplitGroup").click();
    const targetPage = page.locator(
      '#carouselProperties [data-artboard-order="1"]',
    );
    await page
      .locator('#carouselProperties [data-artboard-order="0"]')
      .dragTo(targetPage);
    assert.equal(await page.evaluate(() => p.carousel.pageGroups.length), 1);
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageGroups.flatMap((group) => group.artboardIds),
      ),
      await page.evaluate(() =>
        p.carousel.artboards.map((artboard) => artboard.id),
      ),
      "dragging between groups must preserve a valid export sequence",
    );
    await page.addScriptTag({
      content: await fs.readFile(
        require.resolve("axe-core/axe.min.js"),
        "utf8",
      ),
    });
    const accessibility = await page.evaluate(async () =>
      (await axe.run(document.querySelector("#carouselSidebar"))).violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    );
    assert.deepEqual(accessibility, []);
    await page.screenshot({ path: artifact("designer-free-artboards.png") });
    await page.locator("#designerDuplicateArtboard").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 3);
    await page.locator('[data-artboard-order="2"]').focus();
    await page.keyboard.press("ArrowUp");
    assert.equal(
      await page.evaluate(() =>
        p.carousel.pageGroups
          .flatMap((group) => group.artboardIds)
          .every((id, i) => id === p.carousel.artboards[i].id),
      ),
      true,
      "keyboard reordering must synchronize group and export order",
    );
    await page.locator("#designerDeleteArtboard").click();
    await page.locator("[data-artboard-remove=cancel]").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 3);
    await page.locator("#designerDeleteArtboard").click();
    await page.locator("[data-artboard-remove=delete]").click();
    await page.waitForFunction(() => p.carousel.n === 2);
    assert.equal(await page.evaluate(() => p.carousel.n), 2);
    await page.evaluate(() => undo());
    assert.equal(await page.evaluate(() => p.carousel.n), 3);
    await page.evaluate(() => redo());
    assert.equal(await page.evaluate(() => p.carousel.n), 2);
    await page.evaluate(() => undo());
    assert.equal(await page.evaluate(() => p.carousel.n), 3);
    await page.evaluate(async () => {
      await autosave();
    });
    await page.evaluate(async () => {
      carouselSlideSelect(1);
      carouselUI.tool = "text";
      const a = p.carousel.artboards[1],
        o = carouselObject("text");
      if (o.x !== a.x + a.left || o.y !== a.y + a.top)
        throw Error("New text must appear on the selected artboard");
      await undo();
    });
    const angle = await page.evaluate(async () => {
      carouselSlideSelect(1);
      const a = p.carousel.artboards[1],
        o = carouselObject("angle", { direction: "down" }),
        tip = carouselAngleTip(o);
      const x = tip.x;
      await undo();
      return { x, expected: a.x + a.w / 2 };
    });
    assert.equal(angle.x, angle.expected);
    assert.deepEqual(errors, []);
    console.log(
      "PASS free artboard setup, independent formats, draft validation, move with content, exact frame clipping/gap transparency, duplicate/remove/cancel/undo and browser backup",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
