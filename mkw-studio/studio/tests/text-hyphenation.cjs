const assert = require("node:assert/strict"),
  { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1150 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.url().includes("hyph-de-1996.tex")) requests.push(r.url());
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Schweizer Silbentrennung");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy && !!fontStatus["Replica LL"]);
    const source =
      "Silbentrennung Strassenbahn Konzertprogramm Begegnungen mit Menschen. Schweizer Schifffahrt und Bäcker.\nGrüsse aus der Schweiz.";
    await page.evaluate((text) => {
      p.carousel.objects = [];
      carouselObject("text", {
        x: 120,
        y: 190,
        w: 370,
        h: 1000,
        size: 45,
        color: "#172238",
        text,
      });
    }, source);
    assert.equal(
      requests.length,
      0,
      "Dictionary must not load for ordinary text",
    );
    await page.locator("[data-text-align=justify]").click();
    await page.evaluate(() => MKWTextHyphen.ensure());
    let result = await page.evaluate(() => {
      const o = carouselSelected()[0],
        l = carouselTextLayout(o);
      return {
        lines: l.lines,
        text: o.text,
        points: MKWTextHyphen.points("Strasse"),
      };
    });
    assert.deepEqual(result.points, [5]);
    assert.equal(result.text, source);
    assert(
      result.lines.some((l) => l.hyphen),
      "Expected a dictionary break",
    );
    assert(result.lines.some((l) => l.runs.some((r) => r.virtualHyphen)));
    for (const l of result.lines) {
      assert.equal(
        l.runs.filter((r) => r.virtualHyphen).length,
        l.hyphen ? 1 : 0,
      );
      for (const r of l.runs.filter((r) => r.virtualHyphen)) {
        assert.equal(r.raw, "");
        assert.equal(r.start, r.end);
        assert.equal(r.text, "-");
      }
    }
    assert.equal(requests.length, 1);
    assert(requests[0].includes("?v="));
    await page
      .locator(
        "#carouselProperties>.carousel-property-section .justification-settings",
      )
      .evaluate((el) => (el.open = true))
      .catch(async () => {
        await page
          .locator("#carouselProperties .justification-settings")
          .first()
          .evaluate((el) => (el.open = true));
      });
    const toggle = page.locator("[data-text-hyphenate]");
    await toggle.uncheck();
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].hyphenate),
      false,
    );
    assert(
      !(
        await page.evaluate(
          () => carouselTextLayout(carouselSelected()[0]).lines,
        )
      ).some((l) => l.hyphen),
    );
    await page
      .locator(".justification-settings")
      .first()
      .evaluate((el) => (el.open = true));
    await page.locator("[data-text-hyphenate]").check();
    await page.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      carouselPanel();
    });
    await page.locator("[data-typo-tab=paragraph]").click();
    await page
      .locator('[data-typo-page="paragraph"] .justification-settings')
      .evaluate((el) => (el.open = true));
    const choose = async (a, b) => {
      await page.locator("[data-prop=text]").focus();
      await page.locator("[data-prop=text]").evaluate(
        (el, [a, b]) => {
          el.setSelectionRange(a, b);
          el.dispatchEvent(new Event("select"));
        },
        [a, b],
      );
    };
    await choose(0, source.indexOf("\n"));
    await page.locator("[data-typo-hyphenate]").uncheck();
    assert.deepEqual(
      await page.evaluate(() =>
        carouselSelected()[0].textStyles.map((s) => s?.hyphenate),
      ),
      [false],
    );
    await page.locator("[data-typo-hyphenate]").check();
    await page.locator("#carouselTextEdit").click();
    assert.equal(
      await page.evaluate(() => carouselEditableValue(carouselUI.editing.el)),
      source,
    );
    assert((await page.locator(".discretionary-hyphen").count()) > 0);
    await page.evaluate(() => {
      const el = carouselUI.editing.el;
      MKWTypography.restoreSelection(el, { start: 5, end: 5 });
    });
    await page.keyboard.insertText("X");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].text),
      source.slice(0, 5) + "X" + source.slice(5),
    );
    await page.keyboard.press("ControlOrMeta+z");
    assert.equal(await page.evaluate(() => carouselSelected()[0].text), source);
    await page.keyboard.press("Escape");
    const exact = await page.evaluate(async () => {
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
        doc = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(p)),
        );
      validateCarousel(doc);
      return {
        pixels: a.every((v, i) => v === c[i]),
        text: doc.carousel.objects.find((o) => o.type === "text").text,
        hyphenate: doc.carousel.objects.find((o) => o.type === "text")
          .textStyles[0].hyphenate,
      };
    });
    assert(exact.pixels);
    assert.equal(exact.text, source);
    assert.equal(exact.hyphenate, true);
    await page.screenshot({ path: artifact("swiss-hyphenation-carousel.png") });
    const post = await browser.newPage({
      viewport: { width: 1650, height: 1150 },
    });
    post.on("pageerror", (e) => errors.push(e.message));
    await post.goto(process.env.STUDIO_URL);
    await post.locator("#startNew").click();
    await post.locator("#setupName").fill("Silbentrennung");
    await post.locator("#createProject").click();
    await post.waitForFunction(() => !!fontStatus["Replica LL"]);
    await post.evaluate(async (text) => {
      p.images = [
        {
          id: "im",
          width: 1080,
          height: 1350,
          name: "Test",
          data: makeCanvas(1080, 1350).toDataURL(),
        },
      ];
      p.formats = [{ w: 1080, h: 1350, safe: { top: 100, bottom: 100 } }];
      const b = basicBoard(p.images[0], 1080, 1350);
      b.elements.title.text = text;
      b.elements.title.align = "justify";
      b.elements.title.size = 75;
      b.elements.date.visible = false;
      b.elements.subtitle.visible = false;
      p.boards = [b];
      selected = b.id;
      layer = "title";
      step = "text";
      render();
      await MKWTextHyphen.ensure();
    }, source);
    assert(await post.locator("[data-post-hyphenate]").count());
    assert(
      await post.evaluate(() =>
        textBlock(p.boards[0]).mainRecords[0].styled.lines.some(
          (l) => l.hyphen,
        ),
      ),
    );
    await post
      .locator("#stepPanel>.justification-settings")
      .evaluate((el) => (el.open = true));
    await post.locator("[data-post-hyphenate]").uncheck();
    assert.equal(
      await post.evaluate(() => p.boards[0].elements.title.hyphenate),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Lazy Swiss 2006 dictionary, paragraph controls, visible-only hyphens, editable source/undo, PNG and MKW checks passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
