const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startTemplates:not(:disabled)").waitFor();
    const before = await page.evaluate(() => JSON.stringify(snapshot()));
    await page.locator("#startTemplates").click();
    await page.locator("[data-template-id=mkw-nahe-am-orchester]").click();
    await page.locator("#templateProjectName").fill("Absatzformate");
    const input = page.locator("[data-template-text]").first(),
      host = input.locator("..");
    const initial = await input.inputValue();
    await page.evaluate(async () => {
      window.textTemplate = await MKWTemplates.get("mkw-nahe-am-orchester");
      window.originalTextTemplate = JSON.stringify(textTemplate);
      window.previewTextValues = null;
      const paint = MKWTemplatePreview.paint;
      MKWTemplatePreview.paint = async function (t, values, ...args) {
        window.previewTextValues = structuredClone(values);
        return paint(t, values, ...args);
      };
    });
    const profiles = await page.evaluate(() =>
      MKWTemplateTextModel.formats(textTemplate),
    );
    const body = profiles.find(
      (f) => f.character.font === "Harriet Regular" && f.character.size === 44,
    );
    assert(body);
    const select = host.locator("[data-template-format]"),
      anchor = host.locator("[data-template-anchor]");
    async function caret(start, end = start) {
      await input.focus();
      await input.evaluate(
        (el, { start, end }) => {
          el.setSelectionRange(start, end);
          el.dispatchEvent(new Event("select"));
        },
        { start, end },
      );
    }
    async function format(id) {
      await select.focus();
      await select.selectOption(id);
    }
    async function preview() {
      await page.waitForFunction(
        () =>
          previewTextValues &&
          previewTextValues["menschen-6"] &&
          !document.querySelector(".template-preview-status").textContent,
      );
    }
    const second = initial.indexOf("\n") + 1,
      third = initial.lastIndexOf("\n") + 1;
    await caret(second + 2);
    await format(body.id);
    await preview();
    let draft = await page.evaluate(() => previewTextValues["menschen-6"]);
    assert.equal(draft.textStyles[0].size, 64);
    assert.equal(draft.textStyles[1].size, 44);
    assert.equal(draft.textStyles[2].size, 100);
    assert.equal(
      await page.evaluate(
        () => MKWText.at(previewTextValues["menschen-6"], 23).font,
      ),
      "Harriet Regular",
    );
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await input.press(modifier + "+z");
    await page.waitForFunction(
      () =>
        !previewTextValues["menschen-6"]?.textStyles ||
        previewTextValues["menschen-6"].textStyles[1].size === 100,
    );
    await input.press(modifier + "+Shift+z");
    await page.waitForFunction(
      () => previewTextValues["menschen-6"]?.textStyles?.[1].size === 44,
    );
    await caret(second + 2);
    await input.press("Shift+Enter");
    assert.equal((await input.inputValue()).split("\n").length, 3);
    assert((await input.inputValue()).includes("\u2028"));
    await input.press("Enter");
    assert.equal((await input.inputValue()).split("\n").length, 4);
    await input.press(modifier + "+z");
    assert.equal((await input.inputValue()).split("\n").length, 3);
    await caret(0, third + 1);
    await format(body.id);
    await page.waitForFunction(
      () => previewTextValues["menschen-6"]?.textStyles?.[0].size === 44,
    );
    draft = await page.evaluate(() => previewTextValues["menschen-6"]);
    assert.equal(draft.textStyles[1].size, 44);
    assert.equal(draft.textStyles[2].size, 100);
    await anchor.selectOption("bottom");
    await anchor.press(modifier + "+z");
    assert.equal(await anchor.inputValue(), "top");
    await input.press(modifier + "+Shift+z");
    assert.equal(await anchor.inputValue(), "bottom");
    await page.waitForFunction(
      () => previewTextValues["menschen-6"]?.textAnchor === "bottom",
    );
    assert.equal(await page.evaluate(() => JSON.stringify(snapshot())), before);
    assert.equal(
      await page.evaluate(() => JSON.stringify(textTemplate)),
      await page.evaluate(() => originalTextTemplate),
    );
    await page.screenshot({ path: artifact("template-text-desktop.png") });
    await page.setViewportSize({ width: 500, height: 950 });
    await page.evaluate(() => studioSetTheme("dark"));
    await input.scrollIntoViewIfNeeded();
    assert(
      await page
        .locator("#templateGallery")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#templateGallery")).violations.map((v) => v.id),
      ),
      [],
    );
    await page.screenshot({ path: artifact("template-text-narrow.png") });
    const goodText = await input.inputValue();
    await input.evaluate((el) => {
      el.value = "x\n".repeat(10000);
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertFromPaste",
        }),
      );
    });
    assert.equal(await input.inputValue(), goodText);
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    assert.match(
      await host.locator("[data-template-text-error]").innerText(),
      /vorherige Text bleibt erhalten/,
    );
    await input.fill(goodText);
    assert.equal(await input.getAttribute("aria-invalid"), null);
    const expected = await page.evaluate(() =>
      structuredClone(previewTextValues["menschen-6"]),
    );
    await page.locator("#templateChangeChoice").click();
    await page.locator("[data-template-id=mkw-nahe-am-orchester]").click();
    assert.equal(await input.inputValue(), expected.text);
    assert.equal(await anchor.inputValue(), "bottom");
    const photo = await page.evaluate(() => {
      const c = makeCanvas(600, 600);
      c.getContext("2d").fillRect(0, 0, 600, 600);
      return c.toDataURL().split(",")[1];
    });
    for (const field of await page
      .locator("[data-template-upload][data-channel=image]")
      .all()) {
      await field.setInputFiles({
        name: "Foto.png",
        mimeType: "image/png",
        buffer: Buffer.from(photo, "base64"),
      });
      await page.locator("#templateCreate:not(:disabled)").waitFor();
    }
    await page.waitForFunction(
      () =>
        previewTextValues?.["menschen-5"]?.image &&
        previewTextValues?.["menschen-7"]?.image &&
        !document.querySelector(".template-preview-status").textContent,
    );
    await page.locator("#templateCreate").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      const q = snapshot();
      validate(q);
      validateCarousel(q);
      const round = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(q)),
      );
      validate(round);
      validateCarousel(round);
      const o = q.carousel.objects.find(
          (o) => o.name === "Übertitel und Titel – Slide 1",
        ),
        restored = round.carousel.objects.find(
          (o) => o.name === "Übertitel und Titel – Slide 1",
        );
      const pick = (o) => ({
        text: o.text,
        characterStyles: o.characterStyles,
        textStyles: o.textStyles,
        textAnchor: o.textAnchor,
      });
      const preview = await MKWTemplatePreview.paint(
          textTemplate,
          previewTextValues,
          0,
        ),
        canvas = makeCanvas(416, 520);
      await carouselPaint(
        exportContext(canvas),
        0,
        520 / 1350,
        false,
        null,
        null,
        () => true,
        previewImage,
        q,
      );
      const actual = canvas.toDataURL();
      window.textActual = actual;
      window.textReference = preview;
      canvas.width = canvas.height = 1;
      const expectedCanvas = makeCanvas(416, 520),
        ctx = expectedCanvas.getContext("2d");
      const img = new Image();
      img.src = preview;
      await img.decode();
      ctx.drawImage(img, 0, 0);
      const ref = ctx.getImageData(0, 0, 416, 520).data,
        real = new Image();
      real.src = actual;
      await real.decode();
      ctx.clearRect(0, 0, 416, 520);
      ctx.drawImage(real, 0, 0);
      const px = ctx.getImageData(0, 0, 416, 520).data;
      let difference = 0;
      for (let i = 0; i < ref.length; i++)
        difference += Math.abs(ref[i] - px[i]);
      expectedCanvas.width = expectedCanvas.height = 1;
      return {
        object: pick(o),
        round: pick(restored),
        width: o.w,
        difference,
        pending: "pending" in o,
      };
    });
    for (const [key, name] of [
      ["textActual", "actual"],
      ["textReference", "reference"],
    ]) {
      const data = await page.evaluate((key) => window[key], key);
      require("node:fs").writeFileSync(
        artifact("template-text-" + name + ".png"),
        Buffer.from(data.split(",")[1], "base64"),
      );
    }
    const projection = ({ text, characterStyles, textStyles, textAnchor }) => ({
      text,
      characterStyles,
      textStyles,
      textAnchor,
    });
    assert.deepEqual(result.object, projection(expected));
    assert.deepEqual(result.round, result.object);
    assert.equal(result.width, 888);
    assert.equal(result.pending, false);
    assert.equal(result.difference, 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS template paragraph caret/range formatting, soft breaks, native typing undo/redo, anchoring, draft recovery, keyboard, narrow dark axe, unchanged source, MKW and pixel-identical preview/Designer",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
