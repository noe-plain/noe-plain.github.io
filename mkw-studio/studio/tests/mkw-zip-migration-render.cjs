/* Manual parity check for local files. Use the normal test runner and a private
 * MKW_MIGRATION_INPUT JSON list of { case, source, restored } paths.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { isDeepStrictEqual } = require("node:util");
const { launch, artifact } = require("./browser.cjs");

async function inspect(browser, file, lazy = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startOpen:enabled").waitFor();
    if (lazy)
      await page.evaluate(() => {
        window.imageReads = new Set();
        const hydrate = MKWProjectFile.mediaUrl;
        MKWProjectFile.mediaUrl = (source) => {
          if (MKWProjectAssets.deferred(source))
            window.imageReads.add(source.hash);
          return hydrate(source);
        };
      });
    await page.locator("#projectFile").setInputFiles(file);
    await page.waitForFunction(
      () =>
        !document.querySelector("#startDialog").open &&
        !document.querySelector("#projectOpeningDialog"),
      null,
      { timeout: 100_000 },
    );
    let demand;
    if (lazy) {
      await page.waitForFunction(
        () =>
          !carouselPaintRunning &&
          !carouselPaintPending &&
          !drawing &&
          !postThumbnailRunning,
      );
      demand = await page.evaluate(() => ({
        cached: new Set(p.images.map((im) => im.data.hash).filter(Boolean))
          .size,
        read: window.imageReads.size,
      }));
      assert(demand.cached > 0, "Project open has no deferred pictures.");
      if (!(await page.evaluate(() => !!p.carousel)) && demand.cached > 8)
        assert(
          demand.read < demand.cached,
          "Opening loaded offscreen pictures.",
        );
    }
    const data = await page.evaluate(async () => {
      const digest = async (bytes) => {
        const hash = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(hash), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
      };
      const decodeRaster = async (blob) => {
        const bitmap = await createImageBitmap(blob);
        const c = makeCanvas(bitmap.width, bitmap.height);
        try {
          const ctx = exportContext(c);
          ctx.drawImage(bitmap, 0, 0);
          return await digest(ctx.getImageData(0, 0, c.width, c.height).data);
        } finally {
          bitmap.close();
          c.width = c.height = 1;
        }
      };
      const boards = p.boards;
      const png = [];
      for (const b of boards) {
        const entry = await encodedBoard(b, {
          format: "png",
          transparent: false,
        });
        png.push({ w: b.w, h: b.h, rgba: await decodeRaster(entry.blob) });
      }
      let pdfResult = null;
      if (p.carousel) {
        const first = boards[0];
        const pdfEntry = await carouselEncodePDFPage(first, {
          format: "pdf",
          pdf: { ...carouselPDFPreset("original"), w: first.w, h: first.h },
        });
        const pdfBlob = await carouselBuildPDF(
          [pdfEntry.pdfImage],
          "MKW Vergleich",
        );
        const pdf = await MKWPDF.PDFDocument.load(await pdfBlob.arrayBuffer());
        const images = [];
        for (const [, value] of pdf.context.enumerateIndirectObjects()) {
          const subtype = value.dict?.get(MKWPDF.PDFName.of("Subtype"));
          if (subtype?.toString() === "/Image")
            images.push(await digest(value.getContents()));
        }
        if (!images.length) throw Error("Missing PDF artwork");
        pdfResult = {
          pages: pdf.getPageCount(),
          size: pdf.getPage(0).getSize(),
          images,
        };
      }
      let psd;
      try {
        const blob = await buildPSD();
        const decoded = agPsd.readPsd(await blob.arrayBuffer(), {
          skipLayerImageData: true,
        });
        const layers = (nodes) =>
          (nodes || []).map((layer) => ({
            hidden: !!layer.hidden,
            text: layer.text?.text ?? null,
            children: layers(layer.children),
          }));
        psd = {
          w: decoded.width,
          h: decoded.height,
          rgba: await digest(
            decoded.canvas
              .getContext("2d")
              .getImageData(0, 0, decoded.width, decoded.height).data,
          ),
          layers: layers(decoded.children),
        };
      } catch (error) {
        // Both files can exceed an existing PSD export bound. All PNGs still compare.
        if (!/80 Mio\. Gesamtpixel/.test(error.message)) throw error;
        psd = { limit: true };
      }
      return { boardCount: boards.length, png, pdf: pdfResult, psd };
    });
    assert.deepEqual(errors, []);
    return { data, demand };
  } finally {
    await context.close();
  }
}

(async () => {
  const pairs = JSON.parse(
    fs.readFileSync(process.env.MKW_MIGRATION_INPUT, "utf8"),
  );
  const browser = await launch();
  try {
    const results = [];
    for (const entry of pairs) {
      const { data: before } = await inspect(browser, entry.source);
      console.log(
        `Case ${entry.case} baseline: ${before.boardCount} PNGs, ${before.pdf ? "PDF" : "no PDF mode"}, ${before.psd.limit ? "PSD limit" : "PSD"}`,
      );
      const { data: after, demand } = await inspect(
        browser,
        entry.target,
        true,
      );
      console.log(
        `Case ${entry.case} viewport: ${demand.read} of ${demand.cached} deferred images read.`,
      );
      for (const field of Object.keys(before))
        assert(
          isDeepStrictEqual(after[field], before[field]),
          `Case ${entry.case} differs in ${field}`,
        );
      results.push({
        case: entry.case,
        demand,
        outputs: before.boardCount,
        pngPixelMatches: before.png.length,
        representativePdfMatches: before.pdf ? true : null,
        pdfPages: before.pdf?.pages ?? 0,
        psdCompositeAndLayerStructureMatch: !before.psd.limit,
        psdLimit: !!before.psd.limit,
      });
      fs.writeFileSync(
        artifact("mkw-zip-render-results.json"),
        JSON.stringify(results, null, 2) + "\n",
      );
      console.log(`Case ${entry.case}: matching rendering and export checks`);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
