const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const results = {};
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode=${mode}]`).click();
      await page.locator("#setupName").fill("Smartphone-Vorschau");
      if (mode === "carousel") await page.locator("#cn").fill("1");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      await page.evaluate((mode) => {
        if (mode === "post") {
          const c = makeCanvas(800, 1000),
            data = c.toDataURL(),
            im = {
              id: uid(),
              name: "Probe.png",
              data,
              original: data,
              width: 800,
              height: 1000,
            };
          p.images = [im];
          p.boards = [createBoard(im, 1080, 1350)];
          selected = p.boards[0].id;
          render();
        }
      }, mode);
      await page.evaluate(async () => {
        await Promise.all(p.boards.map(prepareLogo));
        await draw();
        await autosave();
      });
      const ids =
        mode === "post"
          ? ["#zoomOut", "#viewValue", "#zoomIn"]
          : ["#carouselZoomOut", "#carouselZoom", "#carouselZoomIn"];
      const doc = () =>
        page.evaluate(() =>
          JSON.stringify({
            boards: p.boards,
            images: p.images,
            objects: p.carousel?.objects,
            revision,
            history: history.length,
          }),
        );
      const before = await doc();
      await page.keyboard.press("Control+1");
      const percent = () =>
        page.evaluate(() =>
          Math.round(
            MKWZoom.percent(
              p.carousel ? carouselZoom : view,
              studioZoomReference(),
            ),
          ),
        );
      assert.equal(await percent(), 100);
      if (mode === "carousel") {
        assert(
          await page
            .locator("#carouselZoom")
            .evaluate((el) => el.checkValidity()),
          "100% must be valid in the new units",
        );
        for (const percentage of [0, 10000]) {
          await page.evaluate(
            (value) => studioSetZoomPercent(value),
            percentage,
          );
          assert(
            await page
              .locator("#carouselZoom")
              .evaluate((el) => el.checkValidity()),
            "clamped limits must remain valid numeric input",
          );
        }
        await page.evaluate(() => studioSetZoomPercent(100));
      }
      const artWidth = await page.evaluate(() =>
        p.carousel
          ? document.querySelector("#carouselCanvas").getBoundingClientRect()
              .width
          : document.querySelector("canvas[data-board]").getBoundingClientRect()
              .width,
      );
      assert(Math.abs(artWidth - 390) < 1, "100% is a 390px phone preview");
      await page.locator(ids[2]).click();
      assert.equal(await percent(), 120);
      await page.locator(ids[0]).click();
      assert.equal(await percent(), 100);
      if (mode === "post") {
        await page.locator(ids[2]).click();
        await page.locator(ids[1]).click();
        assert.equal(await percent(), 100);
      } else {
        await page.locator(ids[1]).fill("125");
        await page.locator(ids[1]).press("Tab");
        assert.equal(await percent(), 125);
      }
      results[mode] = {};
      for (const theme of ["light", "dark"])
        for (const width of [1500, 780, 390]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.evaluate((t) => studioSetTheme(t), theme);
          const geometry = await page
            .locator(".studio-zoom-controls:visible")
            .evaluate((el) => {
              const r = el.getBoundingClientRect(),
                buttons = [...el.children],
                value = el.querySelector(".studio-zoom-value"),
                v = value.getBoundingClientRect(),
                s = getComputedStyle(value);
              return {
                width: r.width,
                height: r.height,
                right: r.right,
                order: buttons.map((b) => b.id || b.className),
                valueWidth: v.width,
                valueHeight: v.height,
                font: s.fontSize,
                color: s.color,
                background: getComputedStyle(el).backgroundColor,
                children: buttons.map((b) => {
                  const q = b.getBoundingClientRect();
                  return { x: q.x - r.x, w: q.width, h: q.height };
                }),
              };
            });
          assert(
            geometry.right <= width && geometry.right - geometry.width >= 0,
          );
          assert(
            geometry.children[1].x < geometry.children[2].x &&
              geometry.children[2].x < geometry.children[3].x,
          );
          delete geometry.order;
          results[mode][theme + width] = geometry;
          await page.locator(".studio-zoom-controls:visible").screenshot({
            path: artifact(`zoom-${mode}-${theme}-${width}.png`),
          });
        }
      await page.keyboard.press("Control+0");
      const after = await doc();
      if (after !== before) {
        const a = JSON.parse(after),
          b = JSON.parse(before);
        console.log(
          "Changed sections",
          Object.keys(a).filter(
            (k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]),
          ),
        );
        if (JSON.stringify(a.boards) !== JSON.stringify(b.boards))
          console.log(
            "Before/after boards",
            JSON.stringify(b.boards),
            JSON.stringify(a.boards),
          );
      }
      assert.equal(
        require("node:crypto").createHash("sha256").update(after).digest("hex"),
        require("node:crypto")
          .createHash("sha256")
          .update(before)
          .digest("hex"),
        "view changes never alter artwork or history",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    for (const key of Object.keys(results.post))
      assert.deepEqual(
        results.post[key],
        results.carousel[key],
        key + " has identical zoom anatomy and colours",
      );
    console.log(
      "PASS matching zoom groups, minus/value/plus, 390px phone preview, 20% steps, numeric Designer zoom, reset, fit and document isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
