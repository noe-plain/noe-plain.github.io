const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1150 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Blocksatz und Absätze");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy && !!fontStatus["Replica LL"]);
    const source =
      "Musik verbindet Menschen und schafft immer wieder neue Räume für besondere Begegnungen. Gemeinsam erleben wir einen Abend voller Klang und überraschender Momente. Musik bleibt lebendig und führt uns weiter.\nDieser zweite Absatz bleibt für eigene Angaben verfügbar.";
    await page.evaluate((text) => {
      p.carousel.objects = [];
      carouselObject("text", {
        x: 140,
        y: 220,
        w: 790,
        h: 800,
        size: 45,
        color: "#172238",
        text,
      });
    }, source);
    await page.locator("[data-text-align=justify]").click();
    const layout = () =>
      page.evaluate(() => carouselTextLayout(carouselSelected()[0]));
    await page.evaluate(() => MKWTextHyphen.ensure());
    let lines = (await layout()).lines;
    assert(
      lines.some((l) => !l.justification.last && !l.justification.limited),
    );
    assert(lines.some((l) => l.justification.word !== 1));
    for (const l of lines) {
      const j = l.justification;
      assert(
        j.word >= 0.8 &&
          j.word <= 1.2 &&
          j.letter >= -0.02 &&
          j.letter <= 0.02 &&
          j.glyph >= 0.98 &&
          j.glyph <= 1.02,
      );
      assert(
        Math.abs(l.width - l.runs.reduce((n, r) => n + r.width, 0)) < 1e-8,
      );
      assert.equal(l.x, 0);
      if (j.last) assert.deepEqual([j.word, j.letter, j.glyph], [1, 0, 1]);
      else if (!j.limited) assert(Math.abs(l.width - 790) < 0.0001);
    }
    assert.equal(
      await page
        .locator("[data-text-align=justify]")
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator('[data-paragraph="1"]').click();
    await page.locator("#carouselParagraphSize").fill("36");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].textStyles[1].size),
      36,
    );
    await page.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      carouselPanel();
    });
    const choose = async (a, b) => {
      const f = page.locator("[data-prop=text]");
      await f.focus();
      await f.evaluate(
        (el, [a, b]) => {
          el.setSelectionRange(a, b);
          el.dispatchEvent(new Event("select"));
        },
        [a, b],
      );
    };
    await choose(0, source.indexOf("\n"));
    await page.locator("[data-typo-tab=paragraph]").click();
    await page.locator("[data-typo=paragraphSize]").fill("47");
    assert.deepEqual(
      await page.evaluate(() =>
        carouselSelected()[0].textStyles.map((s) => s?.size),
      ),
      [47, 36],
    );
    await page.locator("[data-typo-align=justify]").click();
    await page
      .locator(".typography-inspector .justification-settings summary")
      .click();
    assert(
      await page
        .locator(".typography-inspector .justification-settings table")
        .isVisible(),
    );
    await choose(source.indexOf("\n") + 1, source.length);
    await page.locator("[data-typo=paragraphSize]").fill("40");
    await page.locator("[data-typo-size-auto]").click();
    assert.equal(
      await page.evaluate(
        () => carouselSelected()[0].textStyles[1].size ?? null,
      ),
      null,
    );
    await page.locator("[data-typo-tab=character]").click();
    await choose(0, 5);
    await page.locator("[data-typo=font]").selectOption("Harriet Italic");
    await page.locator("[data-typo=tracking]").fill("15");
    await page.locator("[data-typo-toggle=underline]").click();
    await page.locator("#carouselTextEdit").click();
    assert.equal(
      await page.evaluate(() => carouselEditableValue(carouselUI.editing.el)),
      source,
    );
    const dom = await page.evaluate(() => {
      const o = carouselSelected()[0],
        l = carouselTextLayout(o).lines[0],
        el = carouselUI.editing.el.querySelector('[data-text-start="0"]');
      return {
        count: el.children.length,
        runs: l.runs.length,
        left: parseFloat(el.children[0].style.left),
        x: l.runs[0].x * carouselZoom,
        raw: carouselEditableValue(carouselUI.editing.el),
      };
    });
    assert(dom.count >= dom.runs);
    assert.equal(dom.left, dom.x);
    assert.equal(dom.raw, source);
    await page.evaluate(() => {
      const o = carouselSelected()[0];
      carouselEditableCaret(carouselUI.editing.el, o.text.length);
      carouselTrackTextCaret(o, carouselUI.editing.el);
    });
    await page.keyboard.type("!");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].text),
      source + "!",
    );
    await page.keyboard.press("Meta+z");
    assert.equal(await page.evaluate(() => carouselSelected()[0].text), source);
    await page.keyboard.press("Escape");
    const exact = await page.evaluate(async () => {
      const b = p.boards[0],
        o = carouselSelected()[0],
        expected = makeCanvas(b.w, b.h);
      await carouselPaint(exportContext(expected), 0);
      const encoded = await encodedBoard(b, {
          format: "png",
          quality: 90,
          png8: false,
          colours: 256,
          transparent: false,
        }),
        im = await image(await dataURL(encoded.blob)),
        actual = makeCanvas(b.w, b.h);
      actual.getContext("2d").drawImage(im, 0, 0);
      const a = expected.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        c = actual.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer()),
        ps = psd.canvas.getContext("2d").getImageData(0, 0, b.w, b.h).data;
      const opts = carouselPDFPreset("original"),
        pdf = await encodedBoard(b, { format: "pdf", pdf: opts }),
        file = await carouselBuildPDF([pdf.pdfImage], "Blocksatz");
      const text = carouselPDFText(b, opts),
        layout = carouselTextLayout(o),
        saved = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(p)),
        );
      validate(saved);
      validateCarousel(saved);
      return {
        png: a.every((v, i) => v === c[i]),
        psd: a.every((v, i) => v === ps[i]),
        raster: psd.children.some((l) =>
          l.name.includes("Blocksatz (gerastert)"),
        ),
        pdfSize: file.size,
        pdfRuns: text.length,
        expectedRuns: layout.lines.reduce((n, l) => n + l.runs.length, 0),
        ranges: layout.lines.map((l) => l.justification),
        align: saved.carousel.objects.find((x) => x.id === o.id).textAlign,
      };
    });
    assert(exact.png);
    assert(exact.psd);
    assert(exact.raster);
    assert(exact.pdfSize > 1000);
    assert.equal(exact.pdfRuns, exact.expectedRuns);
    assert.equal(exact.align, "justify");
    await page.locator("[data-typo-tab=paragraph]").click();
    await page.screenshot({ path: artifact("justification-carousel.png") });
    // A deliberately impossible short line reports the constraint, rather than breaking it.
    const limited = await page.evaluate(() => {
      const o = carouselSelected()[0];
      const before = clone(o);
      o.text = "Wort SuperlangesnaechstesWort nochmehrText";
      o.w = 350;
      o.hyphenate = false;
      o.size = 50;
      o.characterStyles = [];
      o.textStyles = [];
      const l = carouselTextLayout(o);
      Object.assign(o, before);
      return l.lines.some((l) => l.justification?.limited);
    });
    assert(limited);
    const post = await browser.newPage({
      viewport: { width: 1650, height: 1150 },
    });
    post.on("pageerror", (e) => errors.push(e.message));
    await post.goto(process.env.STUDIO_URL);
    await post.locator("#startNew").click();
    await post.locator("#setupName").fill("Einzelpost Blocksatz");
    await post.locator("#createProject").click();
    await post.waitForFunction(() => !!fontStatus["Replica LL"]);
    await post.evaluate((text) => {
      const c = makeCanvas(2000, 2400),
        ctx = exportContext(c);
      ctx.fillStyle = "#547685";
      ctx.fillRect(0, 0, c.width, c.height);
      const data = c.toDataURL();
      p.images = [];
      p.boards = [];
      for (let n = 0; n < 2; n++) {
        const im = {
          id: uid(),
          name: "Bild " + n,
          data,
          original: data,
          width: 2000,
          height: 2400,
        };
        p.images.push(im);
        const b = createBoard(im, 1080, 1350);
        b.elements.title.text = text;
        b.elements.title.size = 45;
        b.elements.title.uppercase = false;
        for (const k of ["date", "subtitle"]) {
          b.elements[k].enabled = false;
          b.elements[k].visible = false;
        }
        p.boards.push(b);
      }
      selected = p.boards[0].id;
      layer = "title";
      step = "text";
      render();
    }, source);
    await post.locator("#textAlign").selectOption("justify");
    assert(
      await post.locator("#stepPanel>.justification-settings").isVisible(),
    );
    await post.evaluate(() => MKWTextHyphen.ensure());
    const simple = await post.evaluate(
      () => textBlock(p.boards[0]).mainRecords[0],
    );
    assert(simple.styled.lines.some((l) => l.justification));
    assert.equal(
      await post.evaluate(() => textBlock(p.boards[0]).factor),
      1,
      "Justified text that fits must not be shrunk by floating point width noise",
    );
    await post.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      renderPanel();
    });
    await post.locator("[data-post-text]").focus();
    await post.locator("[data-post-text]").evaluate((el, end) => {
      el.setSelectionRange(0, end);
      el.dispatchEvent(new Event("select"));
    }, source.indexOf("\n"));
    await post.locator("[data-typo-tab=paragraph]").click();
    await post.locator("[data-typo=paragraphSize]").fill("51");
    await post.locator("[data-typo-align=justify]").click();
    assert.deepEqual(
      await post.evaluate(() =>
        p.boards.map((b) => b.elements.title.textStyles[0].size),
      ),
      [51, 51],
    );
    const postExact = await post.evaluate(async () => {
      const b = p.boards[0],
        expected = makeCanvas(b.w, b.h);
      await paint(exportContext(expected), b, 1, { transparent: false });
      const encoded = await encodedBoard(b, {
          format: "png",
          quality: 90,
          png8: false,
          colours: 256,
          transparent: false,
        }),
        im = await image(await dataURL(encoded.blob)),
        actual = makeCanvas(b.w, b.h);
      actual.getContext("2d").drawImage(im, 0, 0);
      const a = expected.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        c = actual.getContext("2d").getImageData(0, 0, b.w, b.h).data,
        saved = p.boards;
      let ps;
      try {
        p.boards = [b];
        ps = agPsd
          .readPsd(await (await buildPSD()).arrayBuffer())
          .canvas.getContext("2d")
          .getImageData(0, 0, b.w, b.h).data;
      } finally {
        p.boards = saved;
      }
      const doc = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(p)),
      );
      validate(doc);
      return {
        png: a.every((v, i) => v === c[i]),
        psd: a.every((v, i) => v === ps[i]),
        align: doc.boards[0].elements.title.align,
        size: doc.boards[0].elements.title.textStyles[0].size,
      };
    });
    assert(postExact.png);
    assert(postExact.psd);
    assert.equal(postExact.align, "justify");
    assert.equal(postExact.size, 51);
    await post.locator("[data-post-text-edit]").click();
    assert.equal(
      await post.evaluate(() => carouselEditableValue(editingText.el)),
      source,
    );
    await post.keyboard.press("Escape");
    await post.screenshot({ path: artifact("justification-single-post.png") });
    assert.deepEqual(errors, []);
    console.log(
      "Bounded justification in simple/advanced editors, paragraph size/range/reset/template, exact PNG/PSD, searchable PDF, raw inline text and MKW validation passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
