const assert = require("node:assert/strict");
const { launch, waitForProjectReady } = require("./browser.cjs");

const preview = ".carousel-shape-preview:not([hidden])";
const state = (page) =>
  page.evaluate(() => [p.carousel.objects.length, history.length, revision]);

async function setup(page) {
  await page.goto(process.env.STUDIO_URL);
  await page.locator("#startDesigner").click();
  await page
    .locator("#setupName")
    .fill("Formvorschau · ein länger benanntes Designer-Projekt");
  await page.locator("#cw").fill("800");
  await page.locator("#ch").fill("800");
  await page.locator("#cn").fill("1");
  await page.locator("#createProject").click();
  await waitForProjectReady(page);
  await page.locator("#carouselFit").click();
  await page.locator("[data-tool=shape]").click();
  await page.evaluate(() => {
    carouselUI.snap = false;
    Object.assign(carouselVectorColours, {
      fill: "#239b60",
      stroke: "#5828a0",
      fillAlpha: 0.6,
    });
    window.addEventListener(
      "pointerdown",
      (event) => (window.shapeTestPointer = event.pointerId),
      true,
    );
  });
}

async function points(page) {
  return page.evaluate(() => {
    const rect = carouselOrigin();
    const screen = (x, y) => [
      Math.round(rect.x + x * carouselZoom),
      Math.round(rect.y + y * carouselZoom),
    ];
    return [screen(140, 165), screen(440, 375)];
  });
}

async function drag(page, reverse = false) {
  const pair = await points(page);
  if (reverse) pair.reverse();
  await page.mouse.move(...pair[0]);
  await page.mouse.down();
  await page.mouse.move(...pair[1], { steps: 6 });
}

async function pixels(page) {
  await page.locator(preview).waitFor();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return page.locator(preview).evaluate((canvas) => {
    const { width, height } = canvas;
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const sample = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    return {
      fill: sample(width >> 1, height >> 1),
      corner: sample(Math.round(width * 0.11), Math.round(height * 0.11))[3],
      stroke: pixels.some(
        (_, i) =>
          i % 4 === 0 &&
          pixels[i + 3] > 100 &&
          pixels[i + 2] > 90 &&
          pixels[i + 2] > pixels[i + 1] * 1.6,
      ),
      x: parseFloat(canvas.style.left),
      y: parseFloat(canvas.style.top),
      width,
      height,
      scale: width / parseFloat(canvas.style.width),
      raster: canvas.toDataURL(),
    };
  });
}

async function commitMatches(page, draft, kind) {
  const actual = await page.evaluate(async ({ x, y, width, height, scale }) => {
    const shape = p.carousel.objects.findLast(
      (layer) => layer.type === "shape",
    );
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(
      scale * carouselZoom,
      0,
      0,
      scale * carouselZoom,
      -x * scale,
      -y * scale,
    );
    ctx.translate(shape.x, shape.y);
    await carouselPaintVector(ctx, shape);
    return {
      kind: shape.shapeKind,
      square: shape.w === shape.h,
      raster: canvas.toDataURL(),
    };
  }, draft);
  assert.equal(actual.kind, kind);
  assert.equal(actual.raster, draft.raster);
  if (kind === "ellipse") assert(actual.square);
}

async function tablet(browser) {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await setup(page);
    await page.getByRole("button", { name: "Ellipse", exact: true }).tap();
    const before = await state(page);
    const [from, to] = await points(page);
    let emit;
    if (browser.browserType().name() === "chromium") {
      const session = await context.newCDPSession(page);
      emit = (type, [x, y]) =>
        session.send("Input.dispatchTouchEvent", {
          type: {
            pointerdown: "touchStart",
            pointermove: "touchMove",
            pointerup: "touchEnd",
          }[type],
          touchPoints: type === "pointerup" ? [] : [{ id: 1, x, y }],
        });
    } else {
      emit = (type, [clientX, clientY]) =>
        page.locator("#carouselViewport").dispatchEvent(type, {
          pointerType: "touch",
          pointerId: 42,
          clientX,
          clientY,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
        });
    }
    await emit("pointerdown", from);
    await emit("pointermove", to);
    await page.locator(preview).waitFor();
    assert.deepEqual(await state(page), before);
    await emit("pointerup", to);
    await page.locator(preview).waitFor({ state: "detached" });
    assert.deepEqual(
      await state(page),
      before.map((n) => n + 1),
    );
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await setup(page);
    for (const [kind, name, theme] of [
      ["rect", "Rechteck", "light"],
      ["ellipse", "Ellipse", "dark"],
      ["triangle", "Dreieck", "dark"],
      ["polygon", "Vieleck", "light"],
      ["star", "Stern", "dark"],
    ]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        theme,
      );
      await page.getByRole("button", { name, exact: true }).click();
      const before = await state(page);
      if (kind === "ellipse") await page.keyboard.down("Shift");
      await drag(page, kind === "star");
      const draft = await pixels(page);
      assert.deepEqual(await state(page), before);
      assert(
        draft.fill[1] > 130 && draft.fill[3] >= 145 && draft.fill[3] <= 160,
      );
      assert(draft.stroke);
      assert.equal(draft.corner === 0, kind !== "rect");
      await page.mouse.up();
      if (kind === "ellipse") await page.keyboard.up("Shift");
      await page.locator(preview).waitFor({ state: "detached" });
      assert.deepEqual(
        await state(page),
        before.map((n) => n + 1),
      );
      await commitMatches(page, draft, kind);
      await page.evaluate(() => {
        undo();
        carouselSelect([]);
      });
    }
    await page.locator("#carouselViewport").focus();
    await page.keyboard.press("l");
    await page
      .locator("[data-shape-kind=ellipse][aria-pressed=true]")
      .waitFor();
    const before = await state(page);
    const redo = await page.evaluate(() => future.length);
    for (const event of ["Escape", "pointercancel", "blur"]) {
      await drag(page);
      await page.locator(preview).waitFor();
      if (event === "Escape") await page.keyboard.press(event);
      else
        await page.evaluate(
          (name) =>
            window.dispatchEvent(
              name === "blur"
                ? new Event(name)
                : new PointerEvent(name, {
                    pointerId: window.shapeTestPointer,
                  }),
            ),
          event,
        );
      await page.mouse.up();
      await page.locator(preview).waitFor({ state: "detached" });
      assert.deepEqual(await state(page), before);
      assert.equal(await page.evaluate(() => future.length), redo);
    }
    const [start] = await points(page);
    await page.mouse.click(...start);
    assert.deepEqual(await state(page), before);
    assert.deepEqual(errors, []);
    await tablet(browser);
    console.log(
      "PASS five painted drafts match final shapes, light/dark, shortcuts, Shift, reverse drag, aborts and tablet",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
