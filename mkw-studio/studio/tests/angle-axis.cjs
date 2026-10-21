const assert = require("node:assert/strict"),
  { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Winkel frei positionieren");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !!p.carousel && !busy);
    const state = () =>
      page.evaluate(() => {
        const o = carouselSelected()[0];
        return { ...o, tip: carouselAngleTip(o), zoom: carouselZoom };
      });
    const handlePoint = () =>
      page.evaluate(() => {
        const o = carouselSelected()[0],
          t = Math.min(
            o.thickness * Math.SQRT2,
            (MKWAnglePolicy.horizontal(o.direction) ? o.w : o.h) * 0.9,
            (MKWAnglePolicy.horizontal(o.direction) ? o.h : o.w) * 0.44,
          ),
          point = carouselToWorld(
            o,
            o.direction === "left"
              ? { x: t / 2, y: o.h / 2 }
              : o.direction === "right"
                ? { x: o.w - t / 2, y: o.h / 2 }
                : o.direction === "up"
                  ? { x: o.w / 2, y: t / 2 }
                  : { x: o.w / 2, y: o.h - t / 2 },
          ),
          r = document.querySelector("#carouselCanvas").getBoundingClientRect();
        return {
          x: r.left + point.x * carouselZoom,
          y: r.top + point.y * carouselZoom,
        };
      });
    const drag = async (dx, dy, modifier) => {
      const a = await handlePoint();
      if (modifier && modifier !== "Shift") await page.keyboard.down(modifier);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      if (modifier === "Shift") await page.keyboard.down(modifier);
      await page.mouse.move(a.x + dx, a.y + dy, { steps: 5 });
      await page.mouse.up();
      if (modifier) await page.keyboard.up(modifier);
    };
    for (const advanced of [false, true])
      for (const direction of ["up", "down", "left", "right"]) {
        await page.evaluate(
          ({ advanced, direction }) => {
            studioPreferences.advanced = advanced;
            studioApplyPreferences();
            p.carousel.objects = [];
            carouselUI.snap = false;
            carouselUI.tool = "select";
            carouselObject("angle", {
              x: 220,
              y: 210,
              w: MKWAnglePolicy.horizontal(direction) ? 200 : 400,
              h: MKWAnglePolicy.horizontal(direction) ? 400 : 200,
              direction,
              panX: 35,
              panY: -20,
            });
            carouselPanel();
          },
          { advanced, direction },
        );
        let before = await state();
        assert.equal(before.x, 220);
        assert.equal(before.y, 210);
        await drag(32, 23);
        let after = await state();
        assert(Math.abs(after.x - before.x - 32 / before.zoom) < 0.05);
        assert(Math.abs(after.y - before.y - 23 / before.zoom) < 0.05);
        assert.equal(after.panX, 35);
        assert.equal(after.panY, -20);
        await page.locator("[data-prop=x]").fill("317");
        await page.locator("[data-prop=y]").fill("229");
        after = await state();
        assert.equal(after.x, 317);
        assert.equal(after.y, 229);
        await page.locator("#carouselViewport").focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowDown");
        after = await state();
        assert.equal(after.x, 318);
        assert.equal(after.y, 230);
        await page.evaluate(() => {
          carouselUI.snap = true;
        });
        before = await state();
        await drag(24, 19, "Meta");
        after = await state();
        assert(Math.abs(after.x - before.x - 24 / before.zoom) < 0.05);
        assert(Math.abs(after.y - before.y - 19 / before.zoom) < 0.05);
        await page.evaluate(() => {
          carouselUI.snap = false;
        });
        before = await state();
        await drag(28, 20, "Shift");
        after = await state();
        assert(
          Math.abs(after.x - before.x - (after.y - before.y)) < 0.05,
          "Shift preserves the 45° ray without imposing an artwork axis",
        );
      }
    await page.evaluate(() => {
      p.carousel.objects = [];
      carouselUI.snap = true;
      const o = carouselObject("angle", {
        x: 220,
        y: 330,
        w: 310,
        h: 250,
        direction: "right",
        angle: 27.2,
      });
      const tip = carouselAngleTip(o);
      o.x += 490 - tip.x;
      o.y += 430 - tip.y;
      carouselRefresh();
    });
    const before = await state(),
      pt = await handlePoint();
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.move(pt.x + 52 * before.zoom, pt.y, { steps: 5 });
    const live = await state();
    assert(
      Math.abs(live.tip.x - 540) < 0.01,
      "Rotated angle tip snaps to the slide centre",
    );
    assert((await page.locator(".carousel-snap-line.vertical").count()) > 0);
    await page.mouse.up();
    assert.equal(await page.locator(".carousel-snap-line").count(), 0);
    const leftPhoto = await page.evaluate(async () => {
      const photo = makeCanvas(1080, 1350),
        source = exportContext(photo);
      source.fillStyle = "#ff0000";
      source.fillRect(0, 0, 540, 1350);
      source.fillStyle = "#0000ff";
      source.fillRect(540, 0, 540, 1350);
      const data = photo.toDataURL(),
        im = {
          id: uid(),
          name: "Photo direction",
          data,
          original: data,
          width: 1080,
          height: 1350,
        };
      p.images.push(im);
      const o = carouselSelected()[0];
      Object.assign(o, {
        direction: "left",
        x: 0,
        y: 0,
        w: 600,
        h: 1200,
        imageId: im.id,
        scale: 1,
        panX: 0,
        panY: 0,
        glow: 0,
        angle: 0,
      });
      const canvas = makeCanvas(1080, 1350),
        ctx = exportContext(canvas);
      await carouselPaint(ctx, 0);
      const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      const carousel = [at(106, 600), at(540, 120)];
      const b = basicBoard(im, 1080, 1350);
      b.angle = MKWPostAngle.defaults(b, { direction: "left" });
      Object.assign(b.angle, { glow: 0 });
      Object.assign(b.angle.image, {
        x: 540,
        y: 675,
        scale: 1,
        angle: 0,
        flipX: 1,
        flipY: 1,
      });
      ctx.clearRect(0, 0, 1080, 1350);
      await MKWPostAngleEditor.paint(ctx, b, 1, {});
      const { tip, inner } = MKWPostAngle.geometry(b);
      return {
        carousel,
        post: [at((tip.x + inner.x) / 2, 675), at(1000, 100)],
      };
    });
    for (const [red, blue] of [leftPhoto.carousel, leftPhoto.post]) {
      assert(
        red[0] > 245 && red[2] < 10,
        "Left angle keeps the left photo region red",
      );
      assert(
        blue[2] > 245 && blue[0] < 10,
        "Left angle keeps the right photo region blue",
      );
    }
    const stable = await page.evaluate(async () => {
      const o = carouselSelected()[0];
      Object.assign(o, { x: 319, y: 271, angle: 25 });
      const saved = [o.x, o.y, o.angle];
      carouselRender();
      const a = carouselSelected()[0],
        afterRender = [a.x, a.y, a.angle],
        canvas = makeCanvas(1080, 1350);
      await carouselPaint(exportContext(canvas), 0);
      const afterExport = [a.x, a.y, a.angle];
      await restore(snapshot());
      const b = carouselSelected()[0] || p.carousel.objects[0];
      return {
        saved,
        afterRender,
        afterExport,
        afterRestore: [b.x, b.y, b.angle],
      };
    });
    assert.deepEqual(stable.saved, stable.afterRender);
    assert.deepEqual(stable.saved, stable.afterExport);
    assert.deepEqual(stable.saved, stable.afterRestore);
    await page.screenshot({ path: artifact("carousel-free-angle.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS free carousel angle drag/numeric/keyboard/rotation, Shift constraint, optional rotated-tip snapping, unchanged image crop and position through render/export/restore.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
