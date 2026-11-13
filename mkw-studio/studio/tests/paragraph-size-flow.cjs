const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["carousel", "preview", "post"]) {
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
      await page.locator("#setupName").fill("Absatzgrösse");
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate(async (mode) => {
        const format = {
          text: "Oberer Absatz\nMittlerer Absatz\nUnterer Absatz",
          size: 50,
          font: "Replica LL",
          role: "Replica LL",
          color: "#172238",
          uppercase: false,
          x: 100,
          y: 200,
          w: 850,
          h: 600,
        };
        if (mode === "carousel") {
          carouselObject("text", format);
          return;
        }
        const canvas = makeCanvas(64, 64),
          data = canvas.toDataURL(),
          images = [0, 1].map((i) => ({
            id: uid(),
            name: "Foto " + i + ".png",
            width: 64,
            height: 64,
            data,
            original: data,
          }));
        if (mode === "preview") {
          const q = {
            ...snapshot(),
            campaign: MKWCampaignUI.newState(),
            images,
            boards: [],
            carousel: undefined,
          };
          for (const im of images)
            await MKWCampaignDocument.append(q, im, [
              basicBoard(im, 1080, 1350),
            ]);
          MKWCampaignModel.reconcile(q, uid);
          await MKWProjects.startDocument(q);
          const a = p.carousel.artboards[0];
          carouselObject("text", { ...format, x: a.x + 100, y: a.y + 200 });
        } else {
          p.images = images;
          p.boards = images.map((im) => basicBoard(im, 1080, 1350));
          for (const b of p.boards)
            Object.assign(b.elements.title, clone(format), {
              visible: true,
              enabled: true,
              typographyVersion: 1,
            });
          selected = p.boards[0].id;
          step = "text";
          layer = "title";
          changed();
        }
      }, mode);
      const geometry = () =>
        page.evaluate(() => {
          const o = p.carousel ? carouselSelected()[0] : board().elements.title;
          return {
            text: o.text,
            x: o.x,
            y: o.y,
            size: o.size,
            styles: clone(o.textStyles || []),
            characters: clone(o.characterStyles || []),
            lines: carouselTextLayout({
              ...MKWTypography.record(o),
              w: 850,
            }).lines.map((l) => ({
              y: l.y,
              size: l.size,
              paragraph: l.paragraph,
              dy: l.runs.map((r) => r.dy),
            })),
          };
        });
      const before = await geometry();
      await page.locator("[data-text-edit-action]").click();
      const editor = ".mkw-inline-input[contenteditable=true]";
      await page
        .locator(editor)
        .locator(":scope > div")
        .nth(1)
        .locator("[data-script]")
        .first()
        .click({ clickCount: 3 });
      await page.waitForFunction(() => {
        const o = p.carousel ? carouselSelected()[0] : board().elements.title;
        return MKWTextScope.resolve(o, { range: MKWTypography.range(o) })
          .completeParagraphs;
      });
      await page.locator("[data-typo=size]").fill("100");
      const after = await geometry();
      assert.equal(after.styles[1].size, 100, mode);
      assert.equal(after.size, before.size);
      assert.deepEqual(
        after.lines[0],
        before.lines[0],
        "Earlier paragraph must not move or resize",
      );
      assert.equal(
        after.lines[1].y,
        before.lines[1].y,
        "Selected paragraph starts at the same top",
      );
      assert(
        after.lines[1].dy.every((v) => Math.abs(v) < 0.01),
        "No baseline offset from old character size",
      );
      assert(
        after.lines[2].y > before.lines[2].y,
        "Following paragraph follows larger line box",
      );
      assert.equal(after.lines[2].size, 50);
      assert.deepEqual(
        [after.text, after.x, after.y],
        [before.text, before.x, before.y],
      );
      await page.screenshot({
        path: artifact("paragraph-size-" + mode + ".png"),
      });
      if (
        (await page
          .locator("[data-text-edit-action]")
          .getAttribute("aria-pressed")) === "true"
      )
        await page.locator("[data-text-edit-action]").click();
      await page.evaluate(() => undo());
      assert.deepEqual(
        await geometry(),
        before,
        "One undo restores paragraph layout",
      );
      await page.evaluate(() => redo());
      assert.deepEqual(
        await geometry(),
        after,
        "Redo restores paragraph layout",
      );
      const restored = await page.evaluate(async () => {
        const q = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
        );
        validate(q);
        if (q.carousel) validateCarousel(q);
        return (
          q.carousel
            ? q.carousel.objects.find((o) => o.type === "text")
            : q.boards[0].elements.title
        ).textStyles[1].size;
      });
      assert.equal(restored, 100);
      assert.deepEqual(errors, []);
      console.log(
        "PASS real triple-click paragraph size, stable top/previous paragraph, following flow, undo/redo and MKW: " +
          mode,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
