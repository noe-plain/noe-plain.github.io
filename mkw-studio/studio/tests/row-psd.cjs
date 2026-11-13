const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.showSaveFilePicker = undefined;
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("PSD-Reihe");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.locator("#spreadNewRow").click();
    await page.evaluate(() => {
      const b = p.carousel.artboards[2];
      carouselObject("shape", {
        name: "Ziel-Rechteck",
        x: 100,
        y: b.y + 300,
        w: 150,
        h: 150,
        fill: "#ff0000",
        strokeWidth: 0,
      });
      carouselObject("text", {
        id: "psd-row-text",
        name: "Ziel-Text",
        text: "Bearbeitbare Reihe",
        x: 50,
        y: b.y + 100,
        w: 400,
        h: 100,
        size: 30,
        font: "Arial",
        color: "#222222",
      });
      carouselSlideSelect(2);
    });
    const before = await page.evaluate(() => ({
      objects: JSON.stringify(p.carousel.objects),
      frames: JSON.stringify(p.carousel.artboards),
      history: history.length,
      revision,
    }));
    await page.locator("#save").click();
    await page.locator("#psdRowScope").selectOption("row");
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(async (e) => {
        throw Error(
          "PSD download: " +
            (await page.locator("#psdStatus").textContent()) +
            "; " +
            e.message,
        );
      }),
      page.locator("#savePSD").click(),
    ]);
    assert(dl.suggestedFilename().includes("_R02.psd"));
    const path = artifact("single-row.psd");
    await dl.saveAs(path);
    const parsed = await page.evaluate(
      (bytes) => {
        const doc = agPsd.readPsd(Uint8Array.from(bytes).buffer),
          flat = (ls) => ls.flatMap((l) => [l, ...flat(l.children || [])]);
        return {
          w: doc.width,
          h: doc.height,
          slices: doc.imageResources.slices[0].slices.length,
          texts: flat(doc.children)
            .filter((l) => l.text)
            .map((l) => l.text.text),
          pixel: [
            ...doc.canvas.getContext("2d").getImageData(120, 320, 1, 1).data,
          ],
        };
      },
      [...fs.readFileSync(path)],
    );
    assert.deepEqual([parsed.w, parsed.h, parsed.slices], [600, 750, 1]);
    assert(parsed.texts.some((t) => t.includes("Bearbeitbare Reihe")));
    assert.deepEqual(parsed.pixel, [255, 0, 0, 255]);
    await page.waitForFunction(() => !busy);
    assert.deepEqual(
      await page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        frames: JSON.stringify(p.carousel.artboards),
        history: history.length,
        revision,
      })),
      before,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS actual save-dialog row PSD, exact row size/slices/composite, native editable text and unchanged project/history",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
