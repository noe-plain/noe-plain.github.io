const assert = require("node:assert/strict");
const { launch } = require("./browser.cjs");
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
    await page.locator("#setupName").fill("Formatbezogene Grössen");
    await page.locator("#createProject").click();
    await page.evaluate(() => {
      const c = makeCanvas(2000, 2400),
        ctx = exportContext(c);
      ctx.fillStyle = "#547685";
      ctx.fillRect(0, 0, c.width, c.height);
      const data = c.toDataURL();
      p.images = [];
      p.boards = [];
      for (let n = 0; n < 3; n++) {
        const im = {
          id: uid(),
          name: "Bild " + n,
          data,
          original: data,
          width: 2000,
          height: 2400,
        };
        p.images.push(im);
        for (const [w, h] of [
          [1080, 1920],
          [1080, 1080],
        ]) {
          const b = createBoard(im, w, h);
          Object.assign(b.elements.title, {
            text:
              n === 2
                ? "Eigener Text\nZweiter Absatz"
                : "Gleicher Text\nZweiter Absatz",
            visible: true,
            enabled: true,
            size: h === 1920 ? 80 : 60,
          });
          p.boards.push(b);
        }
      }
      selected = p.boards[0].id;
      layer = "title";
      step = "text";
      render();
    });
    const sizes = () =>
      page.evaluate(() => p.boards.map((b) => b.elements.title.size));
    await page.locator("#textSize").fill("95");
    assert.deepEqual(await sizes(), [95, 60, 95, 60, 80, 60]);
    await page.evaluate(() => {
      selected = p.boards[3].id;
      renderPanel();
      syncOverlays(true);
    });
    await page.locator("#textSize").fill("67");
    assert.deepEqual(await sizes(), [95, 60, 95, 67, 80, 60]);
    await page.evaluate(() => {
      selected = p.boards[0].id;
      studioPreferences.advanced = true;
      studioApplyPreferences();
      renderPanel();
      syncOverlays(true);
    });
    const choose = async (a, b) => {
      const f = page.locator("[data-post-text]");
      await f.focus();
      await f.evaluate(
        (el, [a, b]) => {
          el.setSelectionRange(a, b);
          el.dispatchEvent(new Event("select"));
        },
        [a, b],
      );
    };
    await choose(0, 5);
    await page.locator("[data-typo=size]").fill("115");
    assert.deepEqual(
      await page.evaluate(() =>
        p.boards.map(
          (b) =>
            b.elements.title.characterStyles?.find((s) => s.start === 0)
              ?.size ?? null,
        ),
      ),
      [115, null, 115, null, null, null],
    );
    await page.locator("[data-typo=tracking]").fill("25");
    assert(
      (
        await page.evaluate(() =>
          p.boards
            .slice(0, 4)
            .map(
              (b) =>
                b.elements.title.characterStyles?.find((s) => s.start === 0)
                  ?.tracking,
            ),
        )
      ).every((v) => v === 25),
    );
    assert.deepEqual(await sizes(), [95, 60, 95, 67, 80, 60]);
    await choose(0, 12);
    await page.locator("[data-typo-tab=paragraph]").click();
    await page.locator("[data-typo=paragraphSize]").fill("102");
    assert.deepEqual(
      await page.evaluate(() =>
        p.boards.map((b) => b.elements.title.textStyles?.[0]?.size ?? null),
      ),
      [102, null, 102, null, null, null],
    );
    await page.locator("[data-typo-align=right]").click();
    assert.deepEqual(
      await page.evaluate(() =>
        p.boards
          .slice(0, 4)
          .map((b) => b.elements.title.textStyles?.[0]?.align),
      ),
      ["right", "right", "right", "right"],
    );
    assert.deepEqual(
      await page.evaluate(() =>
        p.boards.map((b) => b.elements.title.textStyles?.[0]?.size ?? null),
      ),
      [102, null, 102, null, null, null],
    );
    // Typing with a pending character size does not leak it into the other output format.
    await choose(5, 5);
    await page.locator("[data-typo-tab=character]").click();
    await page.locator("[data-typo=size]").fill("123");
    await page.locator("[data-post-text-edit]").click();
    await page.evaluate(() => {
      carouselEditableCaret(editingText.el, 5);
      MKWTypography.track(board().elements.title, 5, 5);
    });
    await page.keyboard.type("!");
    await page.keyboard.press("Escape");
    const inserted = await page.evaluate(() =>
      p.boards
        .slice(0, 4)
        .map((b) => MKWText.at(b.elements.title, 5).size ?? null),
    );
    assert.deepEqual(inserted, [123, null, 123, null]);
    const inherited = await page.evaluate(() => {
      const im = { ...p.images[0], id: uid() },
        vertical = createBoard(im, 1080, 1920);
      p.images.push(im);
      p.boards.push(vertical);
      const square = createBoard(im, 1080, 1080),
        novel = createBoard(p.images[0], 1080, 1440);
      return {
        vertical: vertical.elements.title,
        square: square.elements.title,
        novel: novel.elements.title,
        defaults: studioPreferences.textSizes.title,
      };
    });
    assert.equal(inherited.vertical.size, 95);
    assert.equal(
      inherited.vertical.characterStyles.find((s) => s.start === 0).size,
      115,
    );
    assert.equal(inherited.square.size, 60);
    assert(!inherited.square.characterStyles.some((s) => s.size !== undefined));
    assert.equal(inherited.novel.size, inherited.defaults);
    assert(!inherited.novel.characterStyles.some((s) => s.size !== undefined));
    assert(!inherited.novel.textStyles.some((s) => s?.size !== undefined));
    const roundtrip = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(p)),
      );
      validate(q);
      return q.boards.map((b) => b.elements.title.size);
    });
    assert.deepEqual(roundtrip, await sizes());
    assert.deepEqual(errors, []);
    console.log(
      "Text, paragraph and selected character sizes follow only the first image’s matching output dimensions; other formats/custom text and new-format defaults remain independent.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
