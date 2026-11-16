const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.showSaveFilePicker = undefined;
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startTemplates:not(:disabled)").waitFor();
    const photo = await page.evaluate(() => {
      const canvas = makeCanvas(600, 900),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#284b63";
      ctx.fillRect(0, 0, 600, 900);
      ctx.fillStyle = "#b66c39";
      ctx.fillRect(260, 0, 340, 900);
      return canvas.toDataURL().split(",")[1];
    });
    const cases = [
      ["mkw-nahe-am-orchester", 3, 2],
      ["mkw-konzertauftakt", 1, 1],
      ["mkw-bilder-slider", 3, 6],
    ];
    for (const [id, slides, photos] of cases) {
      await page.evaluate(() => MKWTemplateGallery.open());
      assert.equal(await page.locator("[data-template-id]").count(), 4);
      await page.locator(`[data-template-id="${id}"]`).click();
      await page.locator("#templateProjectName").waitFor();
      await page.locator("#templateProjectName").fill("Geprüft – " + id);
      const inputs = page.locator("[data-template-upload][data-channel=image]");
      assert.equal(await inputs.count(), photos);
      if (id === "mkw-konzertauftakt")
        await page
          .locator("[data-template-text]")
          .first()
          .fill(
            "FR 4. DEZEMBER\nNEUER KLANG.\nFÜR ALLE.\n19.30 Uhr – Winterthur",
          );
      for (const input of await inputs.all()) {
        await input.setInputFiles({
          name: "Testfoto.png",
          mimeType: "image/png",
          buffer: Buffer.from(photo, "base64"),
        });
        await page.locator("#templateCreate:not(:disabled)").waitFor();
      }
      assert.match(
        await page.locator("#templateFillProgress").innerText(),
        /Bilder vollständig/,
      );
      await page.locator("#templateCreate").click();
      await waitForProjectReady(page);
      const result = await page.evaluate(async (id) => {
        validate(snapshot());
        validateCarousel(snapshot());
        const q = snapshot(),
          c = q.carousel,
          encoded = await MKWProjectFile.encode(q);
        const restored = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(encoded),
        );
        validate(restored);
        validateCarousel(restored);
        if (JSON.stringify(restored.carousel) !== JSON.stringify(c))
          throw Error("Layout beim Rundlauf geändert");
        const texts = c.objects.filter((o) => o.type === "text");
        for (const o of texts)
          if (carouselTextHeight(o) > o.h + 1) throw Error("Textüberlauf");
        let whiteRatio = null,
          angleBelowImages = null,
          visibleAngleCorners = null;
        if (id === "mkw-bilder-slider") {
          const frame = c.artboards[1],
            angle = c.objects.find((o) => o.type === "angle");
          const photos = c.objects.filter(
            (o) =>
              o.type === "image" &&
              !o.name.startsWith("Hintergrundfoto") &&
              MKWCarouselPolicy.intersects(o, frame),
          );
          angleBelowImages =
            photos.length === 3 &&
            photos.every(
              (o) => c.objects.indexOf(o) > c.objects.indexOf(angle),
            );
          const [top, bottom, side] = photos;
          const gutters = [
            side.x - (top.x + top.w) - 20,
            side.x - (bottom.x + bottom.w) - 20,
            bottom.y - (top.y + top.h) - 20,
          ];
          if (gutters.some((gap) => gap !== 40))
            throw Error("Bildrahmen brauchen gleiche 40-px-Abstände");
          if (
            frame.x - top.x !== 90 ||
            side.x + side.w - (frame.x + frame.w) !== 125
          )
            throw Error("Bildanschnitte müssen halbiert sein");
          const thickness = Math.min(
            angle.thickness * Math.SQRT2,
            angle.w * 0.9,
            angle.h * 0.44,
          );
          const points = [
            [angle.w, angle.h],
            [0, angle.h / 2],
            [angle.w, 0],
            [angle.w, thickness],
            [thickness, angle.h / 2],
            [angle.w, angle.h - thickness],
          ];
          visibleAngleCorners = points.filter(
            ([x, y]) =>
              angle.x + x >= frame.x &&
              angle.x + x <= frame.x + frame.w &&
              angle.y + y >= frame.y &&
              angle.y + y <= frame.y + frame.h,
          ).length;
          for (const f of c.artboards)
            if (
              !c.objects.some(
                (o) =>
                  o.type === "image" &&
                  o.name.startsWith("Hintergrundfoto") &&
                  o.x === f.x &&
                  o.y === f.y &&
                  o.w === f.w &&
                  o.h === f.h,
              )
            )
              throw Error("Vollflächiger Hintergrund fehlt");
          const canvas = makeCanvas(540, 675),
            ctx = exportContext(canvas);
          await carouselPaint(
            ctx,
            2,
            0.5,
            false,
            null,
            null,
            () => true,
            image,
            q,
          );
          const pixels = ctx.getImageData(0, 0, 540, 675).data;
          let white = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i] === 255 &&
              pixels[i + 1] === 255 &&
              pixels[i + 2] === 255
            )
              white++;
          whiteRatio = white / (540 * 675);
          canvas.width = canvas.height = 1;
        }
        const text = texts[0],
          subtitle = text?.text.lastIndexOf("19.30");
        return {
          slides: c.n,
          name: q.meta.title,
          roundtrip: true,
          angleBelowImages,
          visibleAngleCorners,
          whiteRatio,
          subtitleStyle: subtitle >= 0 ? MKWText.at(text, subtitle) : null,
          sizes:
            id === "mkw-konzertauftakt"
              ? text.textStyles.map((s) => s?.size)
              : null,
        };
      }, id);
      assert.equal(result.slides, slides);
      assert.equal(result.roundtrip, true);
      if (id === "mkw-bilder-slider") {
        assert.equal(result.angleBelowImages, true);
        assert.equal(result.visibleAngleCorners, 2);
        assert(
          result.whiteRatio < 0.15,
          "Third slide retains a full-bleed background photo",
        );
      }
      if (id === "mkw-konzertauftakt") {
        assert.equal(result.subtitleStyle.font, "Harriet Regular");
        assert.equal(result.subtitleStyle.uppercase, false);
        assert.deepEqual(result.sizes, [64, 110, 110, 36]);
      }
      if (id === "mkw-bilder-slider") {
        await page.locator("#save").click();
        await page.locator("#psdRowScope").selectOption("all");
        const download = page.waitForEvent("download");
        await page.locator("#savePSD").click();
        const file = await download,
          destination = artifact("mkw-bilder-slider.psd");
        await file.saveAs(destination);
        const psd = await page.evaluate(async (data) => {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
            doc = agPsd.readPsd(bytes.buffer);
          const canvas = makeCanvas(doc.width, doc.height),
            ctx = exportContext(canvas);
          await carouselPaint(
            ctx,
            null,
            1,
            false,
            null,
            null,
            () => true,
            image,
            snapshot(),
          );
          let max = 0;
          for (const [x, y] of [
            [1100, 675],
            [1400, 950],
            [2100, 100],
            [3000, 1200],
          ]) {
            const expected = ctx.getImageData(x, y, 1, 1).data,
              actual = doc.canvas
                .getContext("2d")
                .getImageData(x, y, 1, 1).data;
            for (let i = 0; i < 4; i++)
              max = Math.max(max, Math.abs(expected[i] - actual[i]));
          }
          canvas.width = canvas.height = 1;
          return { w: doc.width, h: doc.height, maxDifference: max };
        }, fs.readFileSync(destination).toString("base64"));
        assert.deepEqual([psd.w, psd.h], [3240, 1350]);
        assert(
          psd.maxDifference <= 2,
          "PSD composite retains large angle and all background photos",
        );
        await page.locator("#closeSave").click();
      }
      await page.screenshot({ path: artifact(id + "-published-template.png") });
      console.log("PASS gallery → fill → Designer → MKW roundtrip: " + id);
    }
    await page.evaluate(() => MKWTemplateGallery.open());
    await page.locator("#templateSearch").fill("Nahe am Orchester");
    assert.equal(await page.locator("[data-template-id]:visible").count(), 1);
    await page.setViewportSize({ width: 768, height: 1024 });
    assert(
      await page
        .locator("#templateGallery")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.locator("#closeTemplateGallery").click();
    assert.deepEqual(errors, []);
    console.log(
      "PASS search, compact tablet gallery, one shared text field, left angle behind three photos and background on third slide",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
