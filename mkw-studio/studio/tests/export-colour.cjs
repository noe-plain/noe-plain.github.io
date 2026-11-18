const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { spawnSync } = require("node:child_process");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("sRGB-Farbprüfung");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("600");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      p.carousel.objects = [];
      const colours = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#315bcc",
        "#b7165a",
        "#010203",
        "#808080",
        "#f5e9cb",
        "#ffffff",
      ];
      for (const [i, fill] of colours.entries())
        p.carousel.objects.push(
          carouselDefault("shape", {
            x: (i % 3) * 200,
            y: Math.floor(i / 3) * 200,
            w: 200,
            h: 200,
            fill,
            strokeWidth: 0,
          }),
        );
      changed();
      const expected = colours.map((c) =>
          [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)),
        ),
        checks = [];
      const sample = (ctx) =>
        expected.map((rgb, i) =>
          Array.from(
            ctx.getImageData(
              (i % 3) * 200 + 100,
              Math.floor(i / 3) * 200 + 100,
              1,
              1,
            ).data,
          ),
        );
      for (const [format, png8] of [
        ["png", false],
        ["png", true],
        ["jpg", false],
        ["webp", false],
      ]) {
        const entry = await encodedBoard(clone(p.boards[0]), {
            format,
            png8,
            colours: 256,
            quality: 95,
            transparent: false,
          }),
          im = await createImageBitmap(entry.blob),
          c = makeCanvas(600, 600),
          ctx = exportContext(c);
        ctx.drawImage(im, 0, 0);
        im.close();
        checks.push({ format: png8 ? "png8" : format, pixels: sample(ctx) });
      }
      const pdfEntry = await encodedBoard(clone(p.boards[0]), {
          format: "pdf",
          pdf: carouselPDFPreset("original"),
        }),
        blob = await carouselBuildPDF([pdfEntry.pdfImage], "sRGB-Farbprüfung");
      await carouselLoadPDFLibrary();
      const doc = await MKWPDF.PDFDocument.load(await blob.arrayBuffer()),
        images = doc.context
          .enumerateIndirectObjects()
          .map(([, o]) => o)
          .filter(
            (o) =>
              o.dict?.get(MKWPDF.PDFName.of("Subtype"))?.toString() ===
              "/Image",
          ),
        cs = images[0].dict.get(MKWPDF.PDFName.of("ColorSpace"));
      const icc = cs?.get?.(1),
        stream = icc ? doc.context.lookup(icc) : null;
      const decoded = stream
          ? MKWPDF.decodePDFRawStream(stream).decode()
          : null,
        profile = await exportSRGBProfile();
      const pdfRGB = MKWPDF.decodePDFRawStream(images[0]).decode(),
        pdfPixels = expected.map((_, i) => {
          const x = (i % 3) * 200 + 100,
            y = Math.floor(i / 3) * 200 + 100,
            k = (y * 600 + x) * 3;
          return [...pdfRGB.subarray(k, k + 3), 255];
        });
      checks.push({ format: "pdf", pixels: pdfPixels });
      const psdBlob = await buildPSD(),
        psdBytes = new Uint8Array(await psdBlob.arrayBuffer()),
        psd = agPsd.readPsd(psdBytes.buffer);
      checks.push({
        format: "psd",
        pixels: sample(psd.canvas.getContext("2d")),
      });
      let p3 = { supported: false };
      const wide = makeCanvas(64, 64);
      let wideContext;
      try {
        wideContext = wide.getContext("2d", { colorSpace: "display-p3" });
      } catch {}
      if (wideContext?.getContextAttributes?.().colorSpace === "display-p3") {
        wideContext.fillStyle = "color(display-p3 0.7 0.3 0.2)";
        wideContext.fillRect(0, 0, 64, 64);
        const reference = makeCanvas(64, 64),
          ref = exportContext(reference);
        ref.drawImage(wide, 0, 0);
        const expected = Array.from(ref.getImageData(32, 32, 1, 1).data);
        const blob = await new Promise((resolve) =>
            wide.toBlob(resolve, "image/png"),
          ),
          file = new File([blob], "Eigenes-P3-Pruefbild.png", {
            type: "image/png",
          }),
          imported = await (await api("/api/import", file)).json(),
          im = {
            ...imported,
            id: uid(),
            name: file.name,
            original: imported.data,
          };
        p.images.push(im);
        p.carousel.objects = [
          carouselDefault("image", {
            imageId: im.id,
            x: 0,
            y: 0,
            w: 600,
            h: 600,
          }),
        ];
        changed();
        const samples = [];
        for (const format of ["png", "jpg", "webp"]) {
          const entry = await encodedBoard(clone(p.boards[0]), {
              format,
              png8: false,
              quality: 95,
              transparent: false,
            }),
            bitmap = await createImageBitmap(entry.blob),
            c = makeCanvas(600, 600),
            ctx = exportContext(c);
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          samples.push({
            format,
            pixel: Array.from(ctx.getImageData(300, 300, 1, 1).data),
          });
        }
        p3 = { supported: true, expected, samples };
      }
      return {
        expected,
        checks,
        p3,
        pdfICC:
          cs?.get?.(0)?.toString() === "/ICCBased" &&
          decoded?.length === profile.length &&
          decoded.every((v, i) => v === profile[i]),
        iccChannels: stream?.dict.get(MKWPDF.PDFName.of("N"))?.asNumber(),
        pdf: Array.from(new Uint8Array(await blob.arrayBuffer())),
        psdProfile: psdBytes.some(
          (v, i) =>
            v === 97 &&
            psdBytes[i + 1] === 99 &&
            psdBytes[i + 2] === 115 &&
            psdBytes[i + 3] === 112,
        ),
      };
    });
    for (const c of result.checks)
      for (let i = 0; i < c.pixels.length; i++) {
        assert.equal(c.pixels[i][3], 255);
        for (let k = 0; k < 3; k++)
          assert(
            Math.abs(c.pixels[i][k] - result.expected[i][k]) <=
              (["jpg", "webp"].includes(c.format) ? 5 : 0),
            JSON.stringify(c),
          );
      }
    assert(result.pdfICC && result.iccChannels === 3 && result.psdProfile);
    if (result.p3.supported)
      for (const sample of result.p3.samples)
        for (let k = 0; k < 4; k++)
          assert(
            Math.abs(sample.pixel[k] - result.p3.expected[k]) <=
              (sample.format === "png" ? 1 : 5),
            JSON.stringify(result.p3),
          );
    const pdfPath = artifact("srgb-colour-check.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(result.pdf));
    delete result.pdf;
    const raster = spawnSync(
      "pdftoppm",
      [
        "-f",
        "1",
        "-singlefile",
        "-r",
        "96",
        "-png",
        pdfPath,
        artifact("srgb-colour-render"),
      ],
      { encoding: "utf8" },
    );
    if (!raster.error && raster.status === 0) {
      const uri =
        "data:image/png;base64," +
        fs.readFileSync(artifact("srgb-colour-render.png")).toString("base64");
      result.poppler = await page.evaluate(async (uri) => {
        const im = await image(uri),
          c = makeCanvas(600, 600),
          g = exportContext(c);
        g.drawImage(im, 0, 0);
        return Array.from({ length: 9 }, (_, i) =>
          Array.from(
            g.getImageData(
              (i % 3) * 200 + 100,
              Math.floor(i / 3) * 200 + 100,
              1,
              1,
            ).data,
          ),
        );
      }, uri);
      for (let i = 0; i < 9; i++)
        for (let k = 0; k < 3; k++)
          assert(Math.abs(result.poppler[i][k] - result.expected[i][k]) <= 1);
    }
    fs.writeFileSync(
      artifact("export-colour-results.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(
      "PASS actual PNG/PNG8/JPG/WebP/PDF/PSD colour patches, explicit embedded PDF ICC sRGB (3 channels), PSD profile" +
        (result.poppler ? ", real Poppler raster colour check" : ""),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
