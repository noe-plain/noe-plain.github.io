const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Designer-Reihen");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.waitForFunction(() => !!fontStatus["Replica LL"]);
    await page.evaluate(() => {
      carouselObject("gradient", {
        id: "panorama",
        name: "Panorama",
        x: 0,
        y: 0,
        w: 1200,
        h: 750,
        color: "#cc3333",
        endColor: "#3333cc",
        opacity: 1,
        effects: { noise: 12 },
      });
      carouselSlideSelect(0);
    });
    const bitmap = (index) =>
      page.evaluate(async (index) => {
        const b = p.boards[index],
          c = makeCanvas(b.w, b.h);
        await paint(exportContext(c), b, 1);
        return c.toDataURL();
      }, index);
    const legacy = [await bitmap(0), await bitmap(1)],
      original = await page.evaluate(() => JSON.stringify(p.carousel.objects));
    await page.locator("#spreadEnable").click();
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.carousel.objects)),
      original,
    );
    assert.deepEqual(
      [await bitmap(0), await bitmap(1)],
      legacy,
      "Activating Artboards preserves both legacy slide pixels and objects",
    );
    await page.locator(".pages-artboard-heading").first().click();
    assert(await page.locator(".carousel-row-format").isVisible());
    await page.locator("[data-row-slides]").click();
    await page.locator("[data-bogen=count]").fill("3");
    await page.locator("[data-bogen-apply]").click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [3],
    );
    await page.locator("#spreadAdd").click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [3, 1],
    );
    await page.locator(".pages-artboard-heading").first().click();
    await page.locator("[data-row-format=w]").fill("800");
    await page.locator("[data-row-format=h]").fill("900");
    await page.locator("[data-row-apply]").click();
    assert.deepEqual(
      await page.evaluate(() => p.carousel.artboards.map((a) => [a.w, a.h])),
      [
        [800, 900],
        [800, 900],
        [800, 900],
        [600, 750],
      ],
    );
    assert(
      await page.evaluate(() => {
        const o = p.carousel.objects.find((o) => o.id === "panorama");
        return o.w === 1200 && !o.pageFragment && o.artboardScoped;
      }),
    );
    await page.evaluate(() => {
      const frame = p.carousel.artboards[0];
      carouselObject("shape", {
        id: "overflow",
        name: "Begrenzter Inhalt",
        x: frame.x + 10,
        y: frame.y + 800,
        w: 300,
        h: 700,
        fill: "#00dd00",
        strokeWidth: 0,
      });
      carouselObject("text", {
        id: "scoped-text",
        text: "Nur erste Reihe\nZweite Zeile\nDritte Zeile\nVierte Zeile",
        x: frame.x + 350,
        y: frame.y + 800,
        w: 400,
        h: 700,
        size: 100,
        font: "Arial",
        color: "#111111",
      });
    });
    const pixels = await page.evaluate(async () => {
      const b = p.boards[3],
        c = makeCanvas(b.w, b.h);
      await paint(exportContext(c), b, 1);
      const pixel = [...c.getContext("2d").getImageData(50, 100, 1, 1).data];
      return {
        pixel,
        hit: carouselHit({ x: 50, y: p.carousel.artboards[3].y + 100 })?.id,
        pdf: carouselPDFText(b, { w: b.w, h: b.h, fit: "contain" }).map(
          (t) => t.text,
        ),
      };
    });
    assert.deepEqual(
      pixels.pixel,
      [255, 255, 255, 255],
      "Overflow never paints into the next Artboard",
    );
    assert.notEqual(pixels.hit, "overflow");
    assert.equal(
      pixels.pdf.length,
      0,
      "Invisible PDF text cannot leak into another Artboard",
    );
    const psd = await page.evaluate(async () => {
      const doc = agPsd.readPsd(await (await buildCarouselPSD()).arrayBuffer()),
        y = p.carousel.artboards[3].y;
      return {
        pixel: [
          ...doc.canvas.getContext("2d").getImageData(50, y + 100, 1, 1).data,
        ],
        cropped: JSON.stringify(
          (function names(ls) {
            return ls.flatMap((l) => [l.name, ...names(l.children || [])]);
          })(doc.children),
        ).includes("Artboard-Ausschnitt"),
      };
    });
    assert.deepEqual(psd.pixel, [255, 255, 255, 255]);
    assert(
      psd.cropped,
      "Native unsupported clipping is explicitly labelled instead of claiming editability",
    );
    const beforeCopy = await page.evaluate(() =>
      JSON.stringify(p.carousel.objects),
    );
    const beforeCopyPixels = await bitmap(0);
    await page.evaluate(() => carouselSlideSelect(0));
    await page.locator(".pages-board-menu").first().click();
    await page
      .getByRole("menuitem", { name: "Artboard duplizieren", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => p.carousel.objects.filter((o) => o.name === "Panorama").length,
      ),
      2,
      "A spanning layer duplicates once for the whole Artboard",
    );
    assert(
      await page.evaluate(() =>
        p.carousel.objects
          .filter((o) => o.name === "Panorama")
          .every((o) => !o.pageFragment),
      ),
    );
    assert(
      (await bitmap(4)) === beforeCopyPixels,
      "Duplicating an Artboard preserves exact effect pixels",
    );
    await page.evaluate(async () => {
      await undo();
    });
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.carousel.objects)),
      beforeCopy,
    );
    await page.locator("#spreadAdd").click();
    await page.locator(".pages-artboard-heading").last().click();
    await page.locator("[data-row-slides]").click();
    await page.locator("[data-bogen=count]").fill("20");
    await page.locator("[data-bogen-apply]").click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.pageStructure.groups.map((g) => g.length),
      ),
      [3, 1, 20],
    );
    assert.equal(await page.evaluate(() => p.carousel.n), 24);
    await page.locator(".pages-artboard-heading").last().click();
    await page.locator("[data-row-format=w]").fill("601");
    await page.locator("[data-row-apply]").click();
    await page.evaluate(async () => {
      await undo();
    });
    const state = () =>
      page.evaluate(() => ({
        data: JSON.stringify(p.carousel),
        history: history.length,
        future: future.length,
        revision,
      }));
    await page.locator(".pages-artboard-heading").last().click();
    const beforeReject = await state();
    assert(beforeReject.future > 0);
    await page.locator("[data-row-slides]").click();
    await page.locator("[data-bogen=count]").fill("21");
    assert(await page.locator("[data-bogen-apply]").isDisabled());
    await page.locator("[data-bogen-cancel]").click();
    assert.deepEqual(
      await state(),
      beforeReject,
      "Rejected 21st slide preserves source, history, redo and revision",
    );
    await page.evaluate(async () => {
      await redo();
    });
    assert.equal(await page.evaluate(() => p.carousel.artboards.at(-1).w), 601);
    const roundtrip = await page.evaluate(async () => {
      const q = await MKWProjectFile.decode(
        await MKWProjectFile.encode(snapshot()),
      );
      MKWProjectAssets.hydrate(q);
      validate(q);
      validateCarousel(q);
      const before = JSON.stringify(p.carousel.objects);
      await restore(q);
      return {
        same: before === JSON.stringify(p.carousel.objects),
        rows: p.carousel.pageStructure.groups.map((g) => g.length),
      };
    });
    assert(roundtrip.same);
    assert.deepEqual(roundtrip.rows, [3, 1, 20]);
    await page.locator(".pages-artboard-heading").first().click();
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
      [],
    );
    await page.screenshot({ path: artifact("artboard-parity-desktop.png") });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: artifact("artboard-parity-tablet.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS legacy pixel parity, row format/1–20 counts, independent overflow PNG/PDF/PSD/hit-testing, native whole-row duplicate, 24 slides, rejected 21 preserves redo, MKW roundtrip and axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
