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
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("[data-designer-layout=free]").click();
    await page.locator("#setupName").fill("Freie Zeichenflächen");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    try {
      await waitForProjectReady(page);
    } catch (e) {
      console.log(await page.locator("#setupError").textContent(), errors);
      throw e;
    }
    assert.equal(await page.evaluate(() => p.carousel.layout), "free");
    assert.equal(await page.locator(".designer-artboard-surface").count(), 2);
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
    }));
    await page.locator('[data-slide="1"]').click();
    await page.locator("[data-artboard=y]").fill("1600");
    await page.locator("#designerApplyArtboard").click();
    assert.equal(
      await page.evaluate(
        (id) => p.carousel.objects.find((o) => o.id === id).y,
        shape.id,
      ),
      shape.y + 1600,
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
    await page.locator("#designerDeleteArtboard").click();
    await page.locator("[data-artboard-remove=cancel]").click();
    assert.equal(await page.evaluate(() => p.carousel.n), 3);
    await page.locator("#designerDeleteArtboard").click();
    await page.locator("[data-artboard-remove=delete]").click();
    await page.waitForFunction(() => p.carousel.n === 2);
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
