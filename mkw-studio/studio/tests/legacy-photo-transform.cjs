const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Eigene Altbild-Transformationen");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      const canvas = makeCanvas(160, 120),
        g = exportContext(canvas);
      for (let y = 0; y < 120; y += 10)
        for (let x = 0; x < 160; x += 10) {
          g.fillStyle = `rgb(${x * 1.5},${y * 2},${(x + y) % 255})`;
          g.fillRect(x, y, 10, 10);
        }
      const data = canvas.toDataURL(),
        im = {
          id: uid(),
          name: "Eigenes-Raster.png",
          width: 160,
          height: 120,
          data,
          original: data,
        };
      p.images = [im];
      const results = [];
      for (const [i, direction] of ["left", "right", "up", "down"].entries()) {
        const b = basicBoard(im, 600, 750);
        for (const e of Object.values(b.elements)) e.visible = false;
        b.bg = "#eee4cd";
        Object.assign(b.image, {
          angle: -11 + i * 7,
          x: 310,
          y: 360,
          scale: b.image.scale * 1.2,
          flipX: -1,
          flipY: 1,
        });
        b.angle = MKWPostAngle.defaults(b, { direction });
        Object.assign(b.angle.image, {
          angle: 17 - i * 13,
          x: 350,
          y: 340,
          scale: b.angle.image.scale * 1.25,
          flipX: i % 2 ? -1 : 1,
          flipY: -1,
        });
        p.boards = [b];
        const before = makeCanvas(b.w, b.h);
        await paint(exportContext(before), b, 1);
        const pixels = exportContext(before).getImageData(0, 0, b.w, b.h).data;
        const q = {
          ...snapshot(),
          projectId: uid(),
          images: [im],
          boards: [],
          carousel: undefined,
          campaign: MKWCampaignUI.newState(),
        };
        await MKWCampaignDocument.append(q, im, [clone(b)]);
        MKWCampaignMigration.add(q, b, q.carousel.artboards[0]);
        MKWCampaignModel.reconcile(q, uid);
        validate(q);
        validateCarousel(q);
        const after = makeCanvas(b.w, b.h);
        await carouselPaint(
          exportContext(after),
          0,
          1,
          false,
          null,
          null,
          () => true,
          image,
          q,
        );
        const actual = exportContext(after).getImageData(0, 0, b.w, b.h).data;
        let max = 0,
          sum = 0;
        for (let k = 0; k < pixels.length; k++) {
          const d = Math.abs(actual[k] - pixels[k]);
          max = Math.max(max, d);
          sum += d;
        }
        const angle = q.carousel.objects.find(
            (o) => o.campaignRole === "angle",
          ),
          bg = q.carousel.objects.find((o) => o.campaignRole === "background");
        results.push({
          direction,
          max,
          mean: sum / pixels.length,
          sourceImageAngle: b.angle.image.angle,
          imageAngle: angle.imageAngle,
          backgroundAngle: bg.imageAngle,
        });
        if (i === 3) {
          window.legacyTransformExpected = Array.from(actual);
          await MKWProjects.startDocument(q);
          carouselSelect([angle.id]);
          carouselPanel();
        }
        before.width = before.height = after.width = after.height = 1;
      }
      return results;
    });
    for (const r of result) {
      assert(r.max <= 2 && r.mean < 0.01, JSON.stringify(r));
      assert.equal(r.imageAngle, r.sourceImageAngle);
    }
    const angleInput = page.locator("[data-prop=imageAngle]");
    await angleInput.fill("31");
    await angleInput.press("Tab");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].imageAngle),
      31,
    );
    await page.locator("#undo").click();
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].imageAngle),
      result.at(-1).imageAngle,
    );
    await page.locator("#redo").click();
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].imageAngle),
      31,
    );
    await page.locator("#undo").click();
    const files = await page.evaluate(async () => {
      const snap = snapshot(),
        copy = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(snap)),
        );
      validate(copy);
      validateCarousel(copy);
      const angle = copy.carousel.objects.find(
        (o) => o.campaignRole === "angle",
      );
      const png = await encodedBoard(clone(p.boards[0]), {
          format: "png",
          png8: false,
          quality: 95,
          transparent: false,
        }),
        bitmap = await createImageBitmap(png.blob),
        out = makeCanvas(600, 750),
        ctx = exportContext(out);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const a = ctx.getImageData(0, 0, 600, 750).data;
      const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer()),
        b = psd.canvas
          .getContext("2d")
          .getImageData(
            p.carousel.artboards[0].x,
            p.carousel.artboards[0].y,
            600,
            750,
          ).data,
        flat = (x) => x.flatMap((o) => [o, ...flat(o.children || [])]);
      const placed = flat(psd.children).filter((o) => o.placedLayer),
        native = p.carousel.objects
          .filter(
            (o) =>
              ["image", "angle"].includes(o.type) &&
              !carouselPSDScopedCrop(o, p.carousel),
          )
          .map((o) =>
            MKWPSD.designerTransform(
              o,
              p.images.find((im) => im.id === o.imageId),
            ),
          );
      const pdf = await encodedBoard(clone(p.boards[0]), {
        format: "pdf",
        pdf: carouselPDFPreset("original"),
      });
      const rgb =
        pdf.pdfImage.filter === "FlateDecode"
          ? new Uint8Array(
              await new Response(
                new Blob([pdf.pdfImage.data])
                  .stream()
                  .pipeThrough(new DecompressionStream("deflate")),
              ).arrayBuffer(),
            )
          : pdf.pdfImage.data;
      let pdfMax = 0;
      for (let i = 0, j = 0; i < a.length; i += 4) {
        for (let k = 0; k < 3; k++)
          pdfMax = Math.max(pdfMax, Math.abs(a[i + k] - rgb[j++]));
      }
      const fitted = clone(
        p.carousel.objects.find((o) => o.campaignRole === "angle"),
      );
      fitted.scale = MKWPhotoTransform.coverScale(fitted, p.images[0]);
      fitted.panX = fitted.panY = 0;
      let psdMax = 0,
        psdSum = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        psdMax = Math.max(psdMax, d);
        psdSum += d;
      }
      return {
        psdMax,
        psdMean: psdSum / a.length,
        frame: { x: p.carousel.artboards[0].x, y: p.carousel.artboards[0].y },
        psdSize: [psd.width, psd.height],
        placedTransforms: placed.map((l) => l.placedLayer.transform),
        expectedTransforms: native,
        imageAngle: angle.imageAngle,
        pngSourceEqual: a.every((v, i) => v === legacyTransformExpected[i]),
        psdExact: a.every((v, i) => v === b[i]),
        pdfMax,
        nativeTransformsMatch:
          native.length > 0 &&
          native.every((t) =>
            placed.some((l) =>
              l.placedLayer.transform.every(
                (v, i) => Math.abs(v - t[i]) < 1e-6,
              ),
            ),
          ),
        fitRetainsAngle: fitted.imageAngle === angle.imageAngle,
        scopedAngleRaster: carouselPSDScopedCrop(
          p.carousel.objects.find((o) => o.campaignRole === "angle"),
          p.carousel,
        ),
      };
    });
    assert.equal(files.imageAngle, result.at(-1).imageAngle);
    assert(
      files.pngSourceEqual &&
        files.psdMax <= 1 &&
        files.psdMean < 0.001 &&
        files.pdfMax === 0 &&
        files.nativeTransformsMatch &&
        files.fitRetainsAngle,
      JSON.stringify(files),
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      artifact("legacy-photo-transform-results.json"),
      JSON.stringify({ result, files }, null, 2),
    );
    console.log(
      "PASS four legacy angle directions, independent source rotation/crop/flips, rotated background, actual pixels, UI Undo/Redo, MKW, PNG/PDF/PSD and available placed-source transforms",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
