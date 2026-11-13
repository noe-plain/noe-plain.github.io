const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["carousel", "post", "preview"]) {
      const page = await browser.newPage({
          viewport: { width: 1600, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page
        .locator(
          mode === "carousel"
            ? "#startDesigner"
            : mode === "preview"
              ? "#startCampaignPreview"
              : "#startNew",
        )
        .click();
      await page.locator("#setupName").fill("Weiche Umbrüche " + mode);
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate(async (mode) => {
        const text = "Erster Absatz\nZweiter Absatz";
        if (mode === "carousel") {
          carouselObject("text", {
            text,
            size: 60,
            font: "Replica LL",
            x: 100,
            y: 200,
            w: 780,
            h: 400,
          });
          return;
        }
        const canvas = makeCanvas(64, 64),
          data = canvas.toDataURL(),
          im = {
            id: uid(),
            name: "Foto.png",
            width: 64,
            height: 64,
            data,
            original: data,
          };
        if (mode === "preview") {
          const q = {
            ...snapshot(),
            campaign: MKWCampaignUI.newState(),
            images: [im],
            boards: [],
            carousel: undefined,
          };
          await MKWCampaignDocument.append(q, im, [basicBoard(im, 1080, 1350)]);
          MKWCampaignModel.reconcile(q, uid);
          await MKWProjects.startDocument(q);
          const a = p.carousel.artboards[0];
          carouselObject("text", {
            text,
            size: 60,
            font: "Replica LL",
            x: a.x + 100,
            y: a.y + 200,
            w: 780,
            h: 400,
          });
        } else {
          p.images = [im];
          const b = basicBoard(im, 1080, 1350);
          b.elements.title.text = text;
          b.elements.title.visible = true;
          b.elements.title.size = 60;
          b.elements.title.role = "Replica LL";
          p.boards = [b];
          selected = b.id;
          step = "text";
          layer = "title";
          changed();
        }
      }, mode);
      await page.locator("[data-text-edit-action]").click();
      await page.evaluate(() => {
        const el = p.carousel ? carouselUI.editing.el : editingText.el;
        carouselEditableCaret(el, 6);
      });
      await page.keyboard.press("Shift+Enter");
      await page.keyboard.type("NEU");
      const state = await page.evaluate(() => {
        const o = p.carousel ? carouselSelected()[0] : board().elements.title,
          el = p.carousel ? carouselUI.editing.el : editingText.el,
          layout = carouselTextLayout({ ...o, font: o.font || o.role, w: 780 });
        return {
          text: o.text,
          value: carouselEditableValue(el),
          paragraphs: o.text.split("\n").length,
          lines: layout.lines.length,
        };
      });
      assert.equal(state.text, "Erster\u2028NEU Absatz\nZweiter Absatz");
      assert.equal(state.value, state.text);
      assert.equal(state.paragraphs, 2);
      assert.equal(state.lines, 3);
      await page.evaluate(() => {
        const el = p.carousel ? carouselUI.editing.el : editingText.el;
        MKWTypography.restoreSelection(el, { start: 0, end: 10 });
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll("[data-line-selection] input:checked")
            .length === 2,
      );
      const checked = await page
        .locator("[data-paragraph-selection] input:checked")
        .count();
      assert.equal(checked, 1);
      assert.equal(
        await page.locator("[data-line-selection] input:checked").count(),
        2,
      );
      await page.evaluate(() => {
        const el = p.carousel ? carouselUI.editing.el : editingText.el;
        el.dataset.softTestActive = "true";
      });
      const el = page.locator("[data-soft-test-active]");
      const rows = await el.locator("[data-text-start]").evaluateAll((nodes) =>
        nodes.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, height: r.height };
        }),
      );
      await page.mouse.move(
        rows.at(-1).right - 5,
        rows.at(-1).y + Math.max(2, rows.at(-1).height / 2),
      );
      await page.mouse.down();
      await page.mouse.move(
        rows[0].x + 1,
        rows[0].y + Math.max(2, rows[0].height / 2),
        { steps: 8 },
      );
      await page.mouse.up();
      const range = await page.evaluate(() =>
        carouselEditableSelection(
          p.carousel ? carouselUI.editing.el : editingText.el,
        ),
      );
      assert(
        range.start <= 1 && range.end >= state.text.length - 1,
        JSON.stringify(range),
      );
      await page.keyboard.press("Escape");
      const field = page.locator(".text-content-editor textarea").first();
      assert(
        await field.isHidden(),
        "Text is edited on the artwork, not in a second sidebar input",
      );
      await require("./browser.cjs").canvasTextRange(page, 0, 0);
      await page.keyboard.press("Shift+Enter");
      assert(
        await page.evaluate(() =>
          (p.carousel
            ? carouselSelected()[0]
            : board().elements.title
          ).text.startsWith("\u2028"),
        ),
      );
      await page.keyboard.press("Escape");
      assert(
        await page.evaluate(async () => {
          const q = MKWProjectAssets.hydrate(
            await MKWProjectFile.decode(
              await MKWProjectFile.encode(snapshot()),
            ),
          );
          validate(q);
          validateCarousel(q);
          return true;
        }),
      );
      await page.screenshot({ path: artifact("soft-break-" + mode + ".png") });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        "PASS soft/hard paragraphs, typing, selected paragraph/lines, generous reverse selection and MKW:",
        mode,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
