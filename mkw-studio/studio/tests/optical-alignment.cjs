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
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Optische Textkanten");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const before = await page.evaluate(() => {
      p.carousel.objects = [];
      const o = carouselObject("text", {
        x: 100,
        y: 40,
        w: 400,
        h: 670,
        text: "HARMONIE\nSALON\nMusik beginnt\nWinterthur",
        opticalAlign: false,
        size: 65,
        color: "#111111",
        textStyles: [{ size: 65 }, { size: 120 }, { size: 74 }, { size: 100 }],
        characterStyles: [{ start: 15, end: 28, font: "Harriet Regular" }],
      });
      carouselSelect([o.id]);
      carouselPanel();
      return {
        id: o.id,
        xs: carouselTextLayout(o).lines.map((l) => l.x),
        object: clone(o),
      };
    });
    assert(
      before.xs.every((x) => x === 0),
      "Existing advance-based layout remains unchanged until explicitly enabled",
    );
    await page.locator("[data-typo-optical]").check();
    const results = [];
    for (const align of ["left", "right", "center"]) {
      await page.locator(`[data-typo-align=${align}]`).click();
      const r = await page.evaluate(async () => {
        const o = carouselSelected()[0],
          layout = carouselTextLayout(o),
          rows = [];
        for (const line of layout.lines) {
          const c = makeCanvas(700, 180),
            g = exportContext(c);
          g.textBaseline = "top";
          for (const run of line.runs)
            carouselPaintTextRun(
              g,
              run,
              100 + line.x + run.x,
              run.dy + 4,
              "#000000",
            );
          const a = g.getImageData(0, 0, c.width, c.height).data;
          let min = Infinity,
            max = -Infinity;
          for (let y = 0; y < c.height; y++)
            for (let x = 0; x < c.width; x++)
              if (a[(y * c.width + x) * 4 + 3] > 24) {
                min = Math.min(min, x);
                max = Math.max(max, x);
              }
          rows.push({ min, max, align: line.align, x: line.x, ink: line.ink });
        }
        const saved = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
        );
        validate(saved);
        validateCarousel(saved);
        return {
          rows,
          optical: saved.carousel.objects[0].textStyles.every(
            (s) => s.opticalAlign === true,
          ),
        };
      });
      assert(r.optical);
      for (const row of r.rows) {
        if (align === "left")
          assert(Math.abs(row.min - 100) <= 2, JSON.stringify(row));
        if (align === "right")
          assert(Math.abs(row.max - 499) <= 2, JSON.stringify(row));
        if (align === "center")
          assert(
            Math.abs((row.min + row.max) / 2 - 299.5) <= 2,
            JSON.stringify(row),
          );
      }
      results.push({ align, ...r });
    }
    const fidelity = await page.evaluate(async () => {
      const o = carouselSelected()[0],
        opts = { format: "png", png8: false, quality: 95, transparent: false },
        entry = await encodedBoard(clone(p.boards[0]), opts),
        bitmap = await createImageBitmap(entry.blob),
        canvas = makeCanvas(600, 750),
        ctx = exportContext(canvas);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const png = ctx.getImageData(0, 0, 600, 750).data;
      const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer());
      const pixels = psd.canvas
        .getContext("2d")
        .getImageData(0, 0, 600, 750).data;
      const flat = (a) => a.flatMap((l) => [l, ...flat(l.children || [])]);
      return {
        psdExact: png.every((v, i) => v === pixels[i]),
        editable: flat(psd.children).filter((l) => l.text).length,
        reference: psd.children.some((l) => l.children?.some((c) => c.text)),
        pdfText: carouselPDFText(p.boards[0], carouselPDFPreset("original"))
          .length,
      };
    });
    assert(
      fidelity.psdExact &&
        fidelity.editable === 1 &&
        fidelity.reference &&
        fidelity.pdfText > 0,
    );
    await page.locator("#carouselTextEdit").click();
    assert(
      await page
        .locator(".carousel-text-line")
        .evaluateAll((lines) =>
          lines.every((l) => Number.isFinite(parseFloat(l.style.left))),
        ),
    );
    await page.keyboard.press("Escape");
    await page.locator("[data-typo-optical]").uncheck();
    assert(
      await page.evaluate(() =>
        carouselTextLayout(carouselSelected()[0]).lines.every(
          (l) => !l.opticalAlign,
        ),
      ),
    );
    await page.locator("#undo").click();
    assert(
      await page.evaluate(() =>
        carouselTextLayout(carouselSelected()[0]).lines.every(
          (l) => l.opticalAlign,
        ),
      ),
    );
    await page.locator("#redo").click();
    await page.waitForFunction(
      () =>
        !busy &&
        !drawing &&
        !drawAgain &&
        !carouselPaintRunning &&
        !carouselPaintPending &&
        !carouselPaintFrame &&
        document.querySelector("[data-typo-optical]")?.checked === false,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.locator("[data-typo-optical]").scrollIntoViewIfNeeded();
    await page.locator("[data-typo-optical]").focus();
    await page.keyboard.press("Space");
    assert(await page.locator("[data-typo-optical]").isChecked());
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => studioSetTheme(theme), theme);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: artifact("optical-control-" + theme + ".png"),
      });
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator("[data-typo-optical]").scrollIntoViewIfNeeded();
    assert(
      await page
        .locator("#carouselProperties")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.screenshot({ path: artifact("optical-control-tablet.png") });
    await page.setViewportSize({ width: 1500, height: 1100 });
    fs.writeFileSync(
      artifact("optical-alignment-results.json"),
      JSON.stringify({ results, fidelity }, null, 2),
    );
    await page.screenshot({ path: artifact("optical-alignment.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS real glyph edges for mixed sizes/fonts left/right/center, explicit opt-in, UI, Undo/Redo, inline, MKW and exact PSD reference with editable text",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
