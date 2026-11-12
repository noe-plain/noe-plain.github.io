const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const errors = [];
    for (const mode of ["carousel", "post", "preview"]) {
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
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
      await page.locator("#setupName").fill("Familienfarben " + mode);
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate(async (mode) => {
        if (mode === "carousel") {
          const o = carouselObject("text", {
            text: "Bunte Musik",
            font: "Arial",
            x: 100,
            y: 300,
            w: 800,
            h: 200,
            size: 60,
          });
          MKWTypography.track(o, 0, 5);
          return;
        }
        const canvas = makeCanvas(64, 64),
          data = canvas.toDataURL(),
          im = {
            id: uid(),
            name: "Test.png",
            data,
            original: data,
            width: 64,
            height: 64,
          };
        if (mode === "preview") {
          const q = {
            ...snapshot(),
            campaign: MKWCampaignUI.newState(),
            images: [im],
            boards: [],
            carousel: undefined,
          };
          const b = basicBoard(im, 1080, 1350);
          b.safe = { top: 100, bottom: 200, left: 100, right: 100 };
          await MKWCampaignDocument.append(q, im, [b]);
          MKWCampaignModel.reconcile(q, uid);
          await MKWProjects.startDocument(q);
          const a = p.carousel.artboards[0],
            o = carouselObject("text", {
              text: "Bunte Musik",
              font: "Arial",
              x: a.x + 100,
              y: a.y + 300,
              w: 800,
              h: 200,
              size: 60,
            });
          MKWTypography.track(o, 0, 5);
        } else {
          p.images = [im];
          const b = basicBoard(im, 1080, 1350);
          b.safe = { top: 100, bottom: 200, left: 100, right: 100 };
          b.elements.title.text = "Bunte Musik";
          b.elements.title.role = "Arial";
          b.elements.title.visible = true;
          p.boards = [b];
          selected = b.id;
          step = "text";
          layer = "title";
          changed();
          MKWTypography.track(b.elements.title, 0, 5);
        }
      }, mode);
      const source = await page.evaluate(() => {
        const o = p.carousel ? carouselSelected()[0] : board().elements.title;
        return { text: o.text, history: history.length };
      });
      await page.locator("[data-typo-colour]").click();
      await page.locator("#paintFamilyText").click();
      const applied = await page.evaluate(() => {
        const o = p.carousel ? carouselSelected()[0] : board().elements.title;
        return {
          text: o.text,
          first: MKWText.at(o, 0).family,
          last: MKWText.at(o, 7).family,
          colors: carouselTypeRuns(
            { ...o, font: o.font || o.role },
            o.text,
            0,
            o.size,
            carouselMeasureContext,
          ).runs.map((r) => r.color),
          history: history.length,
        };
      });
      assert.equal(applied.text, source.text);
      assert.equal(applied.first, true);
      assert.equal(applied.last, undefined);
      assert(new Set(applied.colors.slice(0, 5)).size >= 4);
      assert.equal(applied.history, source.history + 1);
      if (mode !== "post") {
        const paintLayout = await page.evaluate(() => {
          const wells = document
              .querySelector("#toolPaintPicker")
              .getBoundingClientRect(),
            swap = document
              .querySelector("#toolSwapColours")
              .getBoundingClientRect(),
            none = document
              .querySelector("#toolPaintNone")
              .getBoundingClientRect(),
            pill = document
              .querySelector(".carousel-contextbar .studio-tool-surface")
              .getBoundingClientRect();
          return (
            [swap, none].every(
              (r) =>
                r.left >= wells.right &&
                r.top >= pill.top &&
                r.bottom <= pill.bottom &&
                r.right <= pill.right,
            ) && swap.right <= none.left
          );
        });
        assert(
          paintLayout,
          "Paint actions sit to the right of the overlapping swatches and inside the pill",
        );
      }
      const valid = await page.evaluate(async () => {
        const q = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
        );
        validate(q);
        validateCarousel(q);
        return true;
      });
      assert(valid);
      await page.screenshot({ path: artifact("family-text-" + mode + ".png") });
      await page.evaluate(() => undo());
      assert(
        await page.evaluate(() => {
          const o = p.carousel ? carouselSelected()[0] : board().elements.title;
          return !o || MKWText.at(o, 0).family !== true;
        }),
      );
      console.log(
        "PASS selected family text colour, untouched neighbors, source, history and file:",
        mode,
      );
      await page.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
