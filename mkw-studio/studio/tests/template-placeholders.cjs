const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const viewport of [
      { width: 1500, height: 1100 },
      { width: 500, height: 950 },
    ]) {
      const page = await browser.newPage({ viewport }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startTemplates:not(:disabled)").waitFor();
      const before = await page.evaluate(() => JSON.stringify(snapshot()));
      await page.locator("#startTemplates").click();
      await page.locator("[data-template-id=mkw-nahe-am-orchester]").click();
      await page.locator("#templateProjectName").fill("Pastellplätze");
      await page.waitForFunction(
        () =>
          document.querySelector(".template-artwork-slide img")?.naturalWidth &&
          !document.querySelector(".template-preview-status").textContent,
      );
      const source = await page.evaluate(async () => {
        window.placeholderTemplate = await MKWTemplates.get(
          "mkw-nahe-am-orchester",
        );
        return {
          template: placeholderTemplate,
          slots: MKWTemplateModel.imageSlots(placeholderTemplate),
        };
      });
      assert.equal(source.slots.length, 2);
      const colours = await page
        .locator(".template-slot-swatch")
        .evaluateAll((nodes) =>
          nodes.map((el) => getComputedStyle(el).backgroundColor),
        );
      assert.equal(new Set(colours).size, 2);
      await page.screenshot({
        path: artifact("template-placeholders-empty.png"),
      });
      async function framePoint(slot) {
        const index = await page.evaluate((slot) => {
          const o = placeholderTemplate.carousel.objects.find(
            (o) => o.id === slot.objectId,
          );
          return MKWCarouselPolicy.owner(
            placeholderTemplate.carousel,
            carouselObjectBounds(o),
          );
        }, slot);
        await page
          .locator(".template-artwork-slide img")
          .nth(index)
          .scrollIntoViewIfNeeded();
        return page.evaluate((slot) => {
          const t = placeholderTemplate,
            o = t.carousel.objects.find((o) => o.id === slot.objectId),
            index = MKWCarouselPolicy.owner(
              t.carousel,
              carouselObjectBounds(o),
            ),
            frame = MKWCarouselPolicy.frame(t.carousel, index),
            img = document.querySelectorAll(".template-artwork-slide img")[
              index
            ],
            r = img.getBoundingClientRect(),
            s = Math.min(
              r.width / img.naturalWidth,
              r.height / img.naturalHeight,
            ),
            w = img.naturalWidth * s,
            h = img.naturalHeight * s,
            p = carouselToWorld(o, { x: o.w / 2, y: o.h / 2 });
          return {
            index,
            offsetX: (r.width - w) / 2 + ((p.x - frame.x) / frame.w) * w,
            offsetY: (r.height - h) / 2 + ((p.y - frame.y) / frame.h) * h,
            x: r.left + (r.width - w) / 2 + ((p.x - frame.x) / frame.w) * w,
            y: r.top + (r.height - h) / 2 + ((p.y - frame.y) / frame.h) * h,
          };
        }, slot);
      }
      async function clickImage(slot) {
        const point = await framePoint(slot),
          img = page.locator(".template-artwork-slide img").nth(point.index);
        const [chooser] = await Promise.all([
          page.waitForEvent("filechooser"),
          img.click({ position: { x: point.offsetX, y: point.offsetY } }),
        ]);
        return chooser;
      }
      function png(colour) {
        return page.evaluate((colour) => {
          const c = makeCanvas(64, 64),
            ctx = c.getContext("2d");
          ctx.fillStyle = colour;
          ctx.fillRect(0, 0, 64, 64);
          return c.toDataURL().split(",")[1];
        }, colour);
      }
      if (viewport.width < 820) {
        await page.locator("[data-template-text]").last().focus();
        assert(
          await page
            .locator(".template-artwork-slide img")
            .first()
            .evaluate((img) => {
              const image = img.getBoundingClientRect(),
                dialog = document
                  .querySelector("#templateGallery")
                  .getBoundingClientRect();
              return image.bottom < dialog.top || image.top < dialog.top;
            }),
          "The narrow-window test starts after scrolling to a text field, away from the preview",
        );
      }
      let chooser = await clickImage(source.slots[0]);
      assert.equal(
        await chooser.element().getAttribute("data-template-upload"),
        source.slots[0].objectId,
      );
      await chooser.setFiles({
        name: "Blau.png",
        mimeType: "image/png",
        buffer: Buffer.from(await png("#2244aa"), "base64"),
      });
      await page.waitForFunction(
        () =>
          document.querySelector("[data-file-name]").textContent ===
            "Blau.png" &&
          !document.querySelector(".template-preview-status").textContent,
      );
      chooser = await clickImage(source.slots[0]);
      await chooser.setFiles([]);
      assert.equal(
        await page.locator("[data-file-name]").first().textContent(),
        "Blau.png",
        "Cancelling keeps the selected image",
      );
      chooser = await clickImage(source.slots[0]);
      await chooser.setFiles({
        name: "Rot.png",
        mimeType: "image/png",
        buffer: Buffer.from(await png("#aa2233"), "base64"),
      });
      await page.waitForFunction(
        () =>
          document.querySelector("[data-file-name]").textContent ===
            "Rot.png" &&
          !document.querySelector(".template-preview-status").textContent,
      );
      await page.locator('[data-preview-slide="1"]').click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".template-artwork-slide img")[1]
            .naturalWidth &&
          !document.querySelector(".template-preview-status").textContent,
      );
      let unexpected = 0;
      const onChooser = () => unexpected++;
      page.on("filechooser", onChooser);
      const point = await framePoint(source.slots[1]);
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.move(point.x - 90, point.y, { steps: 5 });
      await page.mouse.up();
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        unexpected,
        0,
        "Dragging the preview does not open a file chooser",
      );
      page.off("filechooser", onChooser);
      await page.locator('[data-preview-slide="1"]').click();
      const keyboard = page.waitForEvent("filechooser");
      await page.locator("[data-template-upload]").nth(1).focus();
      await page.keyboard.press("Enter");
      chooser = await keyboard;
      assert.equal(
        await chooser.element().getAttribute("data-template-upload"),
        source.slots[1].objectId,
      );
      await chooser.setFiles({
        name: "Zweites.png",
        mimeType: "image/png",
        buffer: Buffer.from(await png("#228855"), "base64"),
      });
      await page.waitForFunction(() =>
        document
          .querySelector("#templateFillProgress")
          .textContent.includes("Bilder vollständig"),
      );
      assert.equal(
        await page.evaluate(() => JSON.stringify(snapshot())),
        before,
        "Filling and previewing do not mutate the active project",
      );
      const hit = await page.evaluate(() => {
        const c = placeholderTemplate.carousel,
          o = clone(c.objects.find((o) => o.type === "image"));
        Object.assign(o, {
          id: "front",
          x: 100,
          y: 100,
          w: 200,
          h: 200,
          angle: 0,
          opacity: 1,
          framePoints: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        });
        const back = {
            ...o,
            id: "back",
            x: 0,
            y: 0,
            w: 1000,
            h: 1000,
            framePoints: undefined,
          },
          t = {
            carousel: { ...c, objects: [back, o], folders: [] },
            slots: [],
          };
        const cut = MKWTemplatePreview.imageAt(t, { x: 280, y: 120 }),
          inside = MKWTemplatePreview.imageAt(t, { x: 120, y: 280 });
        o.visible = false;
        const hidden = MKWTemplatePreview.imageAt(t, { x: 120, y: 280 });
        o.visible = true;
        o.x = 500;
        o.y = 300;
        o.angle = 90;
        const rotated = MKWTemplatePreview.imageAt(
          t,
          carouselToWorld(o, { x: 20, y: 180 }),
        );
        return { cut, inside, hidden, rotated };
      });
      assert.equal(hit.cut.objectId, "back");
      assert.equal(hit.inside.objectId, "front");
      assert.equal(hit.hidden.objectId, "back");
      assert.equal(hit.rotated.objectId, "front");
      await page.screenshot({
        path: artifact("template-placeholders-filled.png"),
      });
      await page.setViewportSize({ width: 500, height: 950 });
      await page.evaluate(() => studioSetTheme("dark"));
      assert(
        await page
          .locator("#templateGallery")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      assert.deepEqual(
        await page.evaluate(async () =>
          (await axe.run("#templateGallery")).violations.map((v) => v.id),
        ),
        [],
      );
      await page.screenshot({
        path: artifact("template-placeholders-narrow.png"),
      });
      await page.locator("#templateCreate").click();
      await waitForProjectReady(page);
      const result = await page.evaluate(async () => {
        const q = snapshot();
        validate(q);
        validateCarousel(q);
        const t = placeholderTemplate,
          images = q.carousel.objects.filter(MKWTemplateModel.imageLayer);
        const shape = (o) =>
          Object.fromEntries(
            [
              "x",
              "y",
              "w",
              "h",
              "angle",
              "scale",
              "panX",
              "panY",
              "imageAngle",
              "framePoints",
              "crop",
              "frameSlots",
            ]
              .filter((k) => o[k] !== undefined)
              .map((k) => [k, o[k]]),
          );
        const names = q.images.map((im) => im.name),
          round = MKWProjectAssets.hydrate(
            await MKWProjectFile.decode(await MKWProjectFile.encode(q)),
          );
        validate(round);
        validateCarousel(round);
        return {
          names,
          source: t.carousel.objects
            .filter(MKWTemplateModel.imageLayer)
            .map(shape),
          created: images.map(shape),
          round: round.carousel.objects
            .filter(MKWTemplateModel.imageLayer)
            .map(shape),
          placeholder: q.images.some((im) =>
            im.id.startsWith("template-preview-"),
          ),
        };
      });
      assert(
        !result.placeholder,
        "Preview colours must not become project assets",
      );
      assert(
        result.names.includes("Rot.png") &&
          !result.names.includes("Blau.png") &&
          result.names.includes("Zweites.png"),
      );
      assert.deepEqual(result.created, result.source);
      assert.deepEqual(result.round, result.created);
      assert.deepEqual(errors, []);
      console.log(
        "PASS distinct stable pastel slots, direct replace/cancel, keyboard alternative, swipe isolation, masks/rotation, narrow dark axe, unchanged template/project geometry and real MKW",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
