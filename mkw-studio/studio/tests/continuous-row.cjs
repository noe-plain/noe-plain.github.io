const assert = require("node:assert/strict"),
  { launch, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Durchgehendes Artboard");
    await page.locator("#cw").fill("400");
    await page.locator("#ch").fill("500");
    await page.locator("#cn").fill("3");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      MKWSpreadUI.commit({ type: "enable" });
      MKWSpreadUI.addSpread();
      const c = p.carousel;
      const canvas = makeCanvas(120, 50),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#a51d37";
      ctx.fillRect(0, 0, 60, 50);
      ctx.fillStyle = "#244eab";
      ctx.fillRect(60, 0, 60, 50);
      const data = canvas.toDataURL();
      p.images.push({
        id: "wide-photo",
        name: "Panorama",
        data,
        original: data,
        width: 120,
        height: 50,
      });
      carouselObject("image", {
        id: "continuous-photo",
        x: 0,
        y: 100,
        w: 1200,
        h: 300,
        imageId: "wide-photo",
        scale: 1,
        panX: 0,
        panY: 0,
        effects: { blur: 2, noise: 8 },
      });
      carouselObject("text", {
        id: "continuous-text",
        x: 280,
        y: 170,
        w: 700,
        h: 100,
        text: "Eine Fläche – ein Panorama",
        size: 46,
        font: "Replica LL",
        color: "#ffffff",
      });
      carouselObject("gradient", {
        id: "continuous-gradient",
        x: 250,
        y: 260,
        w: 700,
        h: 150,
        color: "#000000",
        endColor: "#000000",
        startAlpha: 0,
        endAlpha: 0.7,
        opacity: 1,
        rotation: 90,
      });
      carouselObject("shape", {
        id: "continuous-shape",
        x: 350,
        y: 300,
        w: 500,
        h: 100,
        fill: "#eeeecc",
        strokeWidth: 0,
        opacity: 0.6,
      });
      carouselObject("angle", {
        id: "continuous-angle",
        x: 350,
        y: -350,
        w: 500,
        h: 1200,
        angleFillMode: "solid",
        angleColour: "#119966",
        glow: 0,
        opacity: 0.6,
      });
      const paint = async (q, slide = null) => {
        const extent = MKWCarouselPolicy.extent(q.carousel),
          a =
            slide === null
              ? extent
              : MKWCarouselPolicy.frame(q.carousel, slide),
          out = makeCanvas(a.w, a.h);
        await carouselPaint(
          exportContext(out),
          slide,
          1,
          false,
          null,
          null,
          () => true,
          image,
          q,
        );
        return out;
      };
      const before = snapshot(),
        originals = c.objects
          .filter((o) => o.id.startsWith("continuous-"))
          .map((o) => ({
            id: o.id,
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            scale: o.scale,
            panX: o.panX,
            panY: o.panY,
          }));
      const full = await paint(before),
        pixels = full.getContext("2d");
      let max = 0,
        error = 0,
        count = 0;
      for (let slide = 0; slide < 3; slide++) {
        const part = await paint(before, slide),
          actual = part.getContext("2d").getImageData(0, 0, 400, 500).data,
          expected = pixels.getImageData(slide * 400, 0, 400, 500).data;
        for (let i = 0; i < actual.length; i++) {
          const d = Math.abs(actual[i] - expected[i]);
          max = Math.max(max, d);
          error += d;
          count++;
        }
        part.width = part.height = 1;
      }
      const source = p.carousel.artboards[0].id;
      MKWSpreadUI.commit({
        type: "row-slide",
        ids: [source],
        operation: "insert",
        index: 3,
      });
      const after = p.carousel.objects
        .filter((o) => o.id.startsWith("continuous-"))
        .map((o) => ({
          id: o.id,
          x: o.x,
          y: o.y,
          w: o.w,
          h: o.h,
          scale: o.scale,
          panX: o.panX,
          panY: o.panY,
        }));
      const geometryBeforeMove = p.carousel.objects.filter((o) =>
        o.id.startsWith("continuous-"),
      );
      const byId = new Map(
        geometryBeforeMove.map((o) => [
          o.id,
          {
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            scale: o.scale,
            panX: o.panX,
            panY: o.panY,
          },
        ]),
      );
      const sourceBytes = [];
      for (let slide = 0; slide < 3; slide++)
        sourceBytes.push((await paint(snapshot(), slide)).toDataURL());
      MKWSpreadUI.commit({ type: "position", ids: [source], x: 100, y: 1800 });
      for (const o of p.carousel.objects.filter((o) =>
        o.id.startsWith("continuous-"),
      )) {
        const old = byId.get(o.id);
        if (
          o.x !== old.x + 100 ||
          o.y !== old.y + 1800 ||
          o.w !== old.w ||
          o.h !== old.h ||
          o.scale !== old.scale ||
          o.panX !== old.panX ||
          o.panY !== old.panY
        )
          throw Error("Reihe verändert Ausschnitt beim Verschieben");
      }
      for (let slide = 0; slide < 3; slide++)
        if ((await paint(snapshot(), slide)).toDataURL() !== sourceBytes[slide])
          throw Error("Reihenverschiebung verändert Pixel");
      const contentModel = ({ scrollX, scrollY, zoom, ...content }) =>
        JSON.stringify(content);
      const documentBeforeZoom = contentModel(p.carousel);
      carouselSetZoom(0.25);
      carouselSetZoom(1);
      if (contentModel(p.carousel) !== documentBeforeZoom)
        throw Error("Zoom verändert Dokument");
      const roundtrip = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(roundtrip);
      validateCarousel(roundtrip);
      const allContinuous = roundtrip.carousel.objects
        .filter((o) => o.id.startsWith("continuous-"))
        .every((o) => o.artboardScoped && !o.pageFragment);
      const other = p.carousel.artboards.at(-1),
        otherCanvas = await paint(roundtrip, p.carousel.artboards.length - 1),
        otherPixels = otherCanvas
          .getContext("2d")
          .getImageData(0, 0, 400, 500).data;
      const otherClear = otherPixels.every((v, i) => i % 4 === 3 || v === 255);
      return {
        max,
        mean: error / count,
        originals,
        after,
        allContinuous,
        otherClear,
        n: roundtrip.carousel.n,
      };
    });
    assert.deepEqual(result.after, result.originals);
    assert(result.allContinuous);
    assert(result.otherClear);
    assert.equal(result.n, 5);
    assert(
      result.max <= 24 && result.mean < 0.08,
      "Slide cuts match continuous row reference without raster gaps or duplicate content",
    );
    console.log(
      "PASS continuous row photo/text/gradient/shape/angle/FX remain single objects across seams; append retains crop; MKW and independent second row; raster delta " +
        JSON.stringify({ max: result.max, mean: result.mean }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
