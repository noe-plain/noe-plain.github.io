const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  {
    launch,
    waitForProjectReady,
    fillCanvasText,
  } = require("../../tests/browser.cjs");
const directory =
  process.env.MKW_DRAFT_OUTPUT || "/tmp/mkw-vorlagen-2026-11-16";
(async () => {
  const { summary } = JSON.parse(
    await fs.readFile(path.join(directory, "verification.json"), "utf8"),
  );
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startTemplates:not(:disabled)").waitFor();
    for (const draft of summary) {
      const bytes = await fs.readFile(path.join(directory, `${draft.id}.mkw`));
      await page.evaluate(
        async ({ data, name }) => {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          await MKWProjects.openFile(
            new File([bytes], name, { type: "application/gzip" }),
          );
        },
        { data: bytes.toString("base64"), name: `${draft.id}.mkw` },
      );
      await waitForProjectReady(page);
      await page.locator("#carouselCanvas").waitFor();
      const before = await page.evaluate(() => {
        const o = p.carousel.objects.find(
          (o) => o.type === "text" && /^Übertitel und Titel /.test(o.name),
        );
        carouselSelect([o.id]);
        carouselPanel();
        return {
          id: o.id,
          text: o.text,
          others: JSON.stringify(p.carousel.objects.filter((v) => v !== o)),
          slides: p.carousel.n,
        };
      });
      assert.equal(before.slides, draft.slides);
      await fillCanvasText(page, "NEUER TERMIN\nNEUER KONZERTABEND");
      assert.equal(
        await page.evaluate(
          (id) => p.carousel.objects.find((o) => o.id === id).text,
          before.id,
        ),
        "NEUER TERMIN\nNEUER KONZERTABEND",
      );
      assert.equal(
        await page.evaluate(
          (id) => JSON.stringify(p.carousel.objects.filter((o) => o.id !== id)),
          before.id,
        ),
        before.others,
      );
      await page.evaluate(() => undo());
      assert.equal(
        await page.evaluate(
          (id) => p.carousel.objects.find((o) => o.id === id).text,
          before.id,
        ),
        before.text,
      );
      await page.evaluate(() => redo());
      assert.equal(
        await page.evaluate(
          (id) => p.carousel.objects.find((o) => o.id === id).text,
          before.id,
        ),
        "NEUER TERMIN\nNEUER KONZERTABEND",
      );
      await page.evaluate(() => undo());
      await page.evaluate(() => autosave());
      if (draft.id === "auftakt")
        await page.screenshot({
          path: path.join(directory, "auftakt-im-studio.png"),
        });
      console.log(
        "PASS actual MKW open, visible title editing, unrelated layers unchanged, undo/redo: " +
          draft.id,
      );
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(directory, "editor-verification.json"),
      JSON.stringify(
        {
          engine: process.env.MKW_TEST_BROWSER || "chromium",
          opened: summary.map((d) => d.id),
          visibleTextEditing: true,
          undoRedo: true,
          unrelatedLayersUnchanged: true,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
