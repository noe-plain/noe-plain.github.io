const assert = require("node:assert/strict");
const { launch } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const platform of ["MacIntel", "Win32"])
      for (const mode of ["post", "carousel"]) {
        const page = await browser.newPage({
          viewport: { width: 1500, height: 1000 },
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(
          (p) => Object.defineProperty(navigator, "platform", { get: () => p }),
          platform,
        );
        await page.goto(process.env.STUDIO_URL);
        await page.locator("#startNew").click();
        await page.locator(`[data-project-mode=${mode}]`).click();
        await page.locator("#setupName").fill("Seitlich scrollen");
        if (mode === "carousel") await page.locator("#cn").fill("4");
        await page.locator("#createProject").click();
        await page.waitForFunction(() => !busy);
        await page.evaluate(async (mode) => {
          if (mode === "post") {
            const canvas = makeCanvas(800, 1000),
              im = {
                id: uid(),
                name: "Probe.png",
                width: 800,
                height: 1000,
                data: canvas.toDataURL(),
              };
            p.images = [im];
            p.boards = [
              createBoard(im, 1080, 1920),
              createBoard(im, 1080, 1080),
            ];
            selected = p.boards[0].id;
            changed();
            postSetZoom(2);
          } else carouselSetZoom(0.6);
          await Promise.all(p.boards.map(prepareLogo));
          await draw();
          if (p.carousel) await carouselWaitForPaint();
          while (drawing || drawAgain) await new Promise(requestAnimationFrame);
        }, mode);
        const selector = mode === "post" ? "#workspace" : "#carouselViewport";
        const snapshot = () =>
          page.evaluate((mode) => {
            const v = document.querySelector(
              mode === "post" ? "#workspace" : "#carouselViewport",
            );
            return {
              left: v.scrollLeft,
              top: v.scrollTop,
              zoom: mode === "post" ? view : carouselZoom,
              geometry: JSON.stringify({
                boards: p.boards.map((b) => ({
                  w: b.w,
                  h: b.h,
                  elements: b.elements,
                  image: b.image,
                })),
                objects: p.carousel?.objects,
              }),
            };
          }, mode);
        await page.locator(selector).evaluate((v) => {
          v.scrollLeft = 300;
          v.scrollTop = 100;
        });
        const before = await snapshot();
        const rect = await page.locator(selector).boundingBox();
        await page.mouse.move(
          rect.x + rect.width * 0.5,
          rect.y + rect.height * 0.45,
        );
        await page.keyboard.down(platform === "MacIntel" ? "Meta" : "Control");
        await page.mouse.wheel(0, 120);
        await page.waitForFunction(
          ([selector, left]) =>
            Math.abs(document.querySelector(selector).scrollLeft - left - 120) <
            1,
          [selector, before.left],
        );
        await page.keyboard.up(platform === "MacIntel" ? "Meta" : "Control");
        const after = await snapshot();
        assert(
          Math.abs(after.left - before.left - 120) < 1,
          JSON.stringify({ platform, mode, before, after }),
        );
        assert.equal(after.top, before.top);
        assert.equal(after.zoom, before.zoom);
        assert.equal(after.geometry, before.geometry);
        // Synthetic Ctrl+wheel has no physical keydown: browser/trackpad pinch keeps zooming.
        await page.locator(selector).evaluate((v) =>
          v.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: -20,
              ctrlKey: true,
              clientX: 600,
              clientY: 400,
            }),
          ),
        );
        assert((await snapshot()).zoom > after.zoom);
        const pinch = await snapshot();
        await page.locator(selector).evaluate((v) =>
          v.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: -20,
              altKey: true,
              clientX: 600,
              clientY: 400,
            }),
          ),
        );
        assert((await snapshot()).zoom > pinch.zoom);
        // A missed keyup on window switch must never leave Ctrl-scroll latched.
        await page.keyboard.down("Control");
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        const blurred = await snapshot();
        await page.locator(selector).evaluate((v) =>
          v.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: -20,
              ctrlKey: true,
              clientX: 600,
              clientY: 400,
            }),
          ),
        );
        await page.keyboard.up("Control");
        assert((await snapshot()).zoom > blurred.zoom);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          "PASS",
          platform,
          mode,
          "modifier pan, pinch/Alt zoom, blur reset and unchanged artwork",
        );
      }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
