const assert = require("node:assert/strict");
(async () => {
  const browser = await require("./browser.cjs").launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1900, height: 1200 },
      }),
      errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error(error.message);
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Pfade fortsetzen");
    await page.locator("#cn").fill("2");
    for (const [id, value] of [
      ["ct", "80"],
      ["cb", "160"],
      ["cl", "70"],
      ["cr", "190"],
    ]) {
      await page.locator("#" + id).fill(value);
      await page.locator("#" + id).dispatchEvent("input");
    }
    const preview = await page
      .locator("#carouselSafePreview .safe-preview-inner")
      .evaluate((el) => {
        const r = el.getBoundingClientRect(),
          p = el.parentElement.getBoundingClientRect();
        return {
          left: (r.left - p.left) / p.width,
          right: (p.right - r.right) / p.width,
        };
      });
    assert(Math.abs(preview.left - 70 / 1080) < 0.01);
    assert(Math.abs(preview.right - 190 / 1080) < 0.01);
    const strip = await page
      .locator("#carouselSetupStrip i")
      .evaluateAll((els) => els.map((el) => [el.style.left, el.style.right]));
    assert.deepEqual(strip[0], strip[1]);
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    await page.locator("#settings").click();
    await page.locator("#advancedMode").check();
    await page.locator("#closeSettings").click();
    await page.evaluate(() => {
      carouselUI.snap = false;
      carouselSetZoom(0.6);
    });
    const position = (x, y) =>
      page.evaluate(
        ([x, y]) => {
          const r = document
            .querySelector("#carouselCanvas")
            .getBoundingClientRect();
          return { x: r.left + x * carouselZoom, y: r.top + y * carouselZoom };
        },
        [x, y],
      );
    const click = async (x, y) => {
        const q = await position(x, y);
        await page.mouse.click(q.x, q.y);
      },
      chosen = () => page.evaluate(() => clone(carouselSelected()[0])),
      paths = () =>
        page.evaluate(() =>
          p.carousel.objects
            .filter((o) => o.type === "path")
            .map((o) => clone(o)),
        );
    const near = (actual, expected) =>
      assert(Math.abs(actual - expected) < 0.01, `${actual} != ${expected}`);
    const samePoints = (actual, expected) => {
      assert.equal(actual.length, expected.length);
      for (let i = 0; i < actual.length; i++) {
        near(actual[i].x, expected[i].x);
        near(actual[i].y, expected[i].y);
        for (const k of ["in", "out"]) {
          assert.equal(!!actual[i][k], !!expected[i][k]);
          if (actual[i][k]) {
            near(actual[i][k].x, expected[i][k].x);
            near(actual[i][k].y, expected[i][k].y);
          }
        }
      }
    };
    // Continue a real pointer-drawn path at its end. The same layer survives.
    await page.locator("[data-tool=path]").click();
    await click(150, 350);
    await click(450, 350);
    await click(450, 650);
    await page.keyboard.press("Enter");
    const id = (await chosen()).id;
    assert.equal((await paths()).length, 1);
    await page.locator("[data-tool=path]").click();
    await click(450, 650);
    assert.equal(await page.evaluate(() => carouselPathDraft.originId), id);
    await click(200, 800);
    await page.keyboard.press("Enter");
    assert.equal((await chosen()).id, id);
    assert.equal((await chosen()).points.length, 4);
    assert.equal((await paths()).length, 1);
    await page.evaluate(() => undo());
    assert.equal((await chosen()).points.length, 3);
    assert.equal(await page.locator("[data-vector-point]").count(), 3);
    await page.evaluate(() => redo());
    assert.equal((await chosen()).points.length, 4);
    assert.equal(await page.locator("[data-vector-point]").count(), 4);
    // Escape and local drawing undo must never delete the original path or its nodes.
    const before = await chosen();
    await click(200, 800);
    await click(350, 950);
    await page.keyboard.press("Backspace");
    assert.equal(await page.evaluate(() => carouselPathDraft.points.length), 4);
    await page.keyboard.press("Backspace");
    assert.equal(await page.evaluate(() => carouselPathDraft.points.length), 4);
    await page.keyboard.press("Escape");
    assert.deepEqual(await chosen(), before);
    // Continue the first endpoint: reverse controls and decorations, retaining world shape.
    await page.evaluate(() => {
      const o = carouselSelected()[0],
        points = carouselPathWorld(o);
      points[0].out = { x: 210, y: 300 };
      points[1].in = { x: 370, y: 300 };
      carouselSetPathGeometry(o, points);
      o.startEnd = "circle";
      o.startSize = 21;
      o.endEnd = "arrow";
      o.endSize = 36;
      o.stroke = "#b52859";
      o.strokeWidth = 11;
      changed(false);
      carouselRefresh();
    });
    const originalWorld = await page.evaluate(() =>
      carouselPathWorld(carouselSelected()[0]),
    );
    await click(originalWorld[0].x, originalWorld[0].y);
    await click(110, 240);
    await page.keyboard.press("Enter");
    const firstContinued = await chosen();
    assert.equal(firstContinued.id, id);
    assert.equal(firstContinued.startEnd, "arrow");
    assert.equal(firstContinued.endEnd, "circle");
    assert.equal(firstContinued.startSize, 36);
    assert.equal(firstContinued.endSize, 21);
    assert.equal(firstContinued.stroke, "#b52859");
    samePoints(
      (
        await page.evaluate(() => carouselPathWorld(carouselSelected()[0]))
      ).slice(0, 4),
      await page.evaluate((points) => MKWPath.reverse(points), originalWorld),
    );
    // Cancel a continuation without even reversing the saved direction.
    const reversedBefore = await chosen(),
      world = await page.evaluate(() =>
        carouselPathWorld(carouselSelected()[0]),
      );
    await click(world[0].x, world[0].y);
    await page.keyboard.press("Enter");
    assert.deepEqual(await chosen(), reversedBefore);
    // Join two rotated curved paths at their last endpoints; commit once and retain style.
    const fixture = await page.evaluate(() => {
      p.carousel.objects = p.carousel.objects.filter((o) => o.type === "logo");
      const a = carouselObject("path", {
          x: 200,
          y: 380,
          w: 230,
          h: 200,
          angle: 18,
          stroke: "#b52859",
          strokeWidth: 13,
          startEnd: "circle",
          startSize: 21,
          endEnd: "arrow",
          endSize: 36,
          points: [
            { x: 0, y: 0, out: { x: 0.25, y: -0.1 } },
            { x: 1, y: 1, in: { x: 0.8, y: 0.7 } },
          ],
        }),
        b = carouselObject("path", {
          x: 650,
          y: 550,
          w: 170,
          h: 220,
          angle: -15,
          stroke: "#203f70",
          startEnd: "diamond",
          startSize: 31,
          endEnd: "bar",
          points: [
            { x: 0, y: 0, out: { x: 0.5, y: 0.1 } },
            { x: 1, y: 1, in: { x: 0.5, y: 0.8 } },
          ],
        });
      carouselSelect([]);
      carouselTool("path");
      return {
        a: clone(a),
        b: clone(b),
        aw: carouselPathWorld(a, 0),
        bw: carouselPathWorld(b, 0),
        history: history.length,
      };
    });
    await click(fixture.aw.at(-1).x, fixture.aw.at(-1).y);
    assert.equal(
      await page.locator(`[data-path-end="${fixture.b.id}"]`).count(),
      2,
    );
    await click(fixture.bw.at(-1).x, fixture.bw.at(-1).y);
    assert.equal(await page.evaluate(() => carouselPathDraft), null);
    const joined = await chosen();
    assert.equal(joined.id, fixture.a.id);
    assert.equal(joined.points.length, 4);
    assert.equal(joined.stroke, fixture.a.stroke);
    assert.equal(joined.startEnd, "circle");
    assert.equal(joined.endEnd, "diamond");
    assert.equal(joined.endSize, 31);
    assert.equal((await paths()).length, 1);
    assert.equal(
      await page.evaluate(() => history.length),
      fixture.history + 1,
    );
    samePoints(
      await page.evaluate(() => carouselPathWorld(carouselSelected()[0])),
      fixture.aw.concat(
        await page.evaluate((points) => MKWPath.reverse(points), fixture.bw),
      ),
    );
    await page.evaluate(() => undo());
    assert.equal((await paths()).length, 2);
    assert.equal(await page.locator("[data-vector-point]").count(), 2);
    await page.evaluate(() => redo());
    assert.equal((await paths()).length, 1);
    // New drawing can join an existing first endpoint, preserving that target layer.
    const target = await page.evaluate(() => {
      p.carousel.objects = p.carousel.objects.filter((o) => o.type === "logo");
      const o = carouselObject("path", {
        x: 450,
        y: 450,
        w: 150,
        h: 200,
        stroke: "#17664d",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      });
      carouselSelect([]);
      carouselTool("path");
      return clone(o);
    });
    await click(150, 320);
    await click(300, 400);
    await click(450, 450);
    assert.equal((await chosen()).id, target.id);
    assert.equal((await chosen()).stroke, target.stroke);
    assert.equal((await chosen()).points.length, 4);
    assert.equal((await paths()).length, 1);
    // Coincident endpoints merge without a duplicate node. Locked/hidden paths have no targets.
    const coincident = await page.evaluate(() => {
      p.carousel.objects = p.carousel.objects.filter((o) => o.type === "logo");
      const a = carouselObject("path", {
          x: 150,
          y: 350,
          w: 250,
          h: 200,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        }),
        b = carouselObject("path", {
          x: 400,
          y: 550,
          w: 250,
          h: 200,
          points: [
            { x: 0, y: 0, out: { x: 0.3, y: 0.1 } },
            { x: 1, y: 1 },
          ],
        });
      const locked = carouselObject("path", {
          x: 150,
          y: 900,
          w: 200,
          h: 100,
          locked: true,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        }),
        hidden = carouselObject("path", {
          x: 450,
          y: 900,
          w: 200,
          h: 100,
          visible: false,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        });
      carouselSelect([a.id]);
      carouselTool("path");
      return { a: a.id, b: b.id, locked: locked.id, hidden: hidden.id };
    });
    assert.equal(
      await page
        .locator(
          `[data-path-end="${coincident.locked}"], [data-path-end="${coincident.hidden}"]`,
        )
        .count(),
      0,
    );
    await page.locator('[data-vector-point="1"]').click();
    await click(400, 550);
    assert.equal((await chosen()).id, coincident.a);
    assert.equal((await chosen()).points.length, 3);
    assert.equal((await paths()).length, 3);
    // Snapping near the start is NOT closure. The actual first anchor click is required.
    await page.evaluate(() => {
      p.carousel.objects = p.carousel.objects.filter((o) => o.type === "logo");
      carouselTool("select");
      carouselSelect([]);
      carouselTool("path");
      carouselUI.snap = true;
      studioPreferences.snapDistance = 20;
    });
    await click(180, 350);
    await click(700, 350);
    await click(700, 800);
    await click(180, 370);
    assert.equal(await page.evaluate(() => carouselPathDraft.points.length), 4);
    assert.equal((await paths()).length, 0);
    near(await page.evaluate(() => carouselPathDraft.points.at(-1).y), 350);
    await page.keyboard.press("Backspace");
    const closeStart = await page.evaluate(() =>
      clone(carouselPathDraft.points[0]),
    );
    await click(closeStart.x, closeStart.y);
    assert.equal((await chosen()).closed, true);
    assert.equal((await chosen()).points.length, 3);
    // Closure can still set the first curve's tension by dragging the start anchor.
    await page.evaluate(() => {
      carouselSelect([]);
      carouselTool("path");
      carouselUI.snap = false;
    });
    await click(240, 450);
    await click(650, 450);
    await click(650, 900);
    const start = await position(240, 450),
      end = await position(310, 500);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await page.mouse.up();
    assert.equal((await chosen()).closed, true);
    assert((await chosen()).points[0].out);
    assert((await chosen()).points[0].in);
    // All four safe margins govern the guide frame, snap lines and text notices.
    const grid = await page.evaluate(() => {
      carouselUI.guides = true;
      carouselUI.snap = true;
      carouselUI.vectorNodes = new Set();
      carouselSelect([]);
      carouselTool("select");
      carouselRefresh();
      const c = p.carousel,
        s = carouselZoom,
        guide = document.querySelector(".slide-guide .sixths"),
        style = getComputedStyle(guide),
        lines = carouselSnapLines(c.objects.map((o) => o.id)),
        second = MKWCarouselPolicy.safeRect(c, 1),
        previous = carouselZoom;
      carouselZoom = 1;
      const snap = carouselSnapPathPoint(
        { x: second.x + 3, y: c.h - c.bottom - 3 },
        [],
        0,
        {},
        c.objects.map((o) => o.id),
      );
      carouselZoom = previous;
      const text = carouselDefault("text", {
        text: "Test",
        x: second.x + 1,
        y: c.top + 10,
        w: 250,
        h: 200,
      });
      const inside = carouselWarning(text);
      text.x = second.x - 1;
      const outside = carouselWarning(text);
      return {
        left: parseFloat(style.left) / s,
        right: parseFloat(style.right) / s,
        top: parseFloat(style.top) / s,
        bottom: parseFloat(style.bottom) / s,
        lines,
        snap,
        inside,
        outside,
      };
    });
    near(grid.left, 70);
    near(grid.right, 190);
    near(grid.top, 80);
    near(grid.bottom, 160);
    for (const x of [70, 890, 1150, 1970])
      assert(grid.lines.x.some((v) => Math.abs(v - x) < 0.001));
    assert(grid.lines.y.includes(80));
    assert(grid.lines.y.includes(1190));
    near(grid.snap.x, 1150);
    near(grid.snap.y, 1190);
    assert.equal(grid.inside, "");
    assert.match(grid.outside, /Safezone/);
    // Image paint placement survives continuation and a portable round trip.
    const painted = await page.evaluate(async () => {
      const canvas = makeCanvas(600, 600),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#d33546";
      ctx.fillRect(0, 0, 300, 600);
      ctx.fillStyle = "#3679c1";
      ctx.fillRect(300, 0, 300, 600);
      const im = {
        id: uid(),
        name: "Füllung.png",
        width: 600,
        height: 600,
        data: canvas.toDataURL(),
        original: canvas.toDataURL(),
      };
      p.images.push(im);
      const o = carouselObject("path", {
        x: 200,
        y: 400,
        w: 400,
        h: 400,
        angle: 12,
        fillEnabled: true,
        fillMode: "image",
        imageId: im.id,
        scale: 1,
        panX: 30,
        panY: -20,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      });
      const before = { ...o };
      carouselResumePath(o, o.points.length - 1);
      carouselPathDraft.undo.push(clone(carouselPathDraft.points));
      carouselPathDraft.points.push({ x: 150, y: 800 });
      carouselFinishPath(true);
      const result = carouselSelected()[0],
        oldOrigin = carouselRotatePoint(before, -before.angle),
        newOrigin = carouselRotatePoint(result, -result.angle),
        doc = clone(snapshot());
      validate(doc);
      const restored = doc.carousel.objects.find((item) => item.id === o.id);
      return {
        before: oldOrigin.x + before.w / 2 + before.panX,
        after: newOrigin.x + result.w / 2 + result.panX,
        oldScale: before.scale * Math.max(before.w / 600, before.h / 600),
        newScale: result.scale * Math.max(result.w / 600, result.h / 600),
        equal: JSON.stringify(restored) === JSON.stringify(result),
      };
    });
    near(painted.before, painted.after);
    near(painted.oldScale, painted.newScale);
    assert(painted.equal);
    await page.screenshot({
      path: require("./browser.cjs").artifact("path-continuation-grid.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS endpoint continuation at both ends, reversed curves/markers, joining rotated and coincident paths, one-step undo/redo, cancellation, explicit closure and tension, asymmetric safezone previews/grid/snapping/notices and image-fill/MKW preservation",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
