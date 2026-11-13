const assert = require("node:assert/strict");
const { launch, waitForProjectReady } = require("./browser.cjs");
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
    await page.locator("#setupName").fill("Reihen als Designer");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() => {
      carouselObject("shape", {
        id: "source",
        name: "Quelle",
        x: 80,
        y: 150,
        w: 200,
        h: 150,
      });
      carouselSlideSelect(0);
      MKWSpreadUI.commit({ type: "enable" });
      MKWSpreadUI.commit({ type: "add", count: 3, spread: true });
    });
    await page.locator(".pages-artboard-heading").last().click();
    const expected = await page.evaluate(
      () => p.carousel.pageStructure.groups[1],
    );
    const state = await page.evaluate(() => ({
      doc: JSON.stringify(snapshot()),
      history: history.length,
      revision,
    }));
    await page.evaluate(() => {
      carouselRow();
      carouselRowObjects();
    });
    assert.deepEqual(
      await page.evaluate(() => ({
        doc: JSON.stringify(snapshot()),
        history: history.length,
        revision,
      })),
      state,
      "Choosing a row is UI-only",
    );
    const made = await page.evaluate(() => {
      const a = carouselObject("shape", { id: "target", name: "Ziel" }),
        b = carouselObject("text", {
          id: "target-text",
          name: "Zieltext",
          text: "Nur diese Reihe",
        });
      return [a, b].map((o) => ({ pageId: o.pageId, y: o.y }));
    });
    assert(
      made.every((o) => expected.includes(o.pageId)),
      "New objects retain the active row after object selection clears the slide",
    );
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("ControlOrMeta+a");
    assert.deepEqual(
      (await page.evaluate(() => carouselSelected().map((o) => o.id))).sort(),
      ["target", "target-text"],
    );
    await page.evaluate(() => {
      p.carousel.folders = [
        {
          id: "source-folder",
          name: "Quellordner",
          visible: false,
          locked: true,
        },
      ];
      p.carousel.objects.find((o) => o.id === "source").folderId =
        "source-folder";
      carouselSelect(["source"]);
    });
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("ControlOrMeta+c");
    await page.evaluate(() => carouselSlideSelect(2));
    await page.evaluate(() => document.activeElement.blur());
    const before = await page.evaluate(() =>
      JSON.stringify(p.carousel.objects),
    );
    await page.keyboard.press("ControlOrMeta+v");
    const pasted = await page.evaluate(() => {
      const o = carouselSelected()[0],
        a = p.carousel.artboards.find((a) => a.id === o.pageId);
      return {
        id: o.id,
        pageId: o.pageId,
        offset: [o.x - a.x, o.y - a.y],
        all: p.carousel.objects.map((o) => o.id),
        folderId: o.folderId,
        visible: o.visible,
        locked: o.locked,
      };
    });
    assert(expected.includes(pasted.pageId));
    assert.deepEqual(pasted.offset, [80, 150]);
    assert.equal(pasted.folderId, undefined);
    assert.equal(pasted.visible, false);
    assert.equal(pasted.locked, true);
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.carousel.objects)),
      before,
    );
    await page.evaluate(() => redo());
    assert(
      await page.evaluate(
        (id) => p.carousel.objects.some((o) => o.id === id),
        pasted.id,
      ),
    );
    const roundtrip = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      return {
        objects:
          JSON.stringify(q.carousel.objects) ===
          JSON.stringify(p.carousel.objects),
        persistedUI:
          JSON.stringify(q).includes("rowPage") ||
          JSON.stringify(q).includes("clipboardOrigin"),
      };
    });
    assert(roundtrip.objects);
    assert(!roundtrip.persistedUI);
    await page.evaluate(() => {
      carouselSlideCenter(0);
      document.activeElement.blur();
    });
    const blank = await page.evaluate(() => {
      const r = carouselOrigin(),
        a = p.carousel.artboards[0];
      return {
        x: r.left + (a.x + 500) * carouselZoom,
        y: r.top + (a.y + 600) * carouselZoom,
      };
    });
    await page.mouse.click(blank.x, blank.y);
    await page.evaluate(() => {
      const o = p.carousel.objects.find((o) => o.id === "source");
      delete o.folderId;
      o.visible = true;
      o.locked = false;
    });
    await page.keyboard.press("ControlOrMeta+a");
    assert(
      (await page.evaluate(() => carouselSelected().map((o) => o.id))).includes(
        "source",
      ),
    );
    assert(
      !(
        await page.evaluate(() => carouselSelected().map((o) => o.id))
      ).includes("target"),
    );
    await page.evaluate(() => {
      carouselSelect(["source", "target"]);
      document.activeElement.blur();
    });
    await page.keyboard.press("ControlOrMeta+c");
    await page.evaluate(() => {
      carouselSlideSelect(0);
      document.activeElement.blur();
    });
    const stateBeforeMixed = await page.evaluate(() => ({
      objects: JSON.stringify(p.carousel.objects),
      history: history.length,
      future: future.length,
      revision,
    }));
    await page.keyboard.press("ControlOrMeta+v");
    assert.deepEqual(
      await page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        history: history.length,
        future: future.length,
        revision,
      })),
      stateBeforeMixed,
    );
    assert.match(
      await page.locator("#status").textContent(),
      /einzelnen Reihe/,
    );
    await page.evaluate(() => {
      carouselSelect(["source", "target"]);
      carouselDuplicate();
    });
    const owners = await page.evaluate(() =>
      carouselSelected().map((o) =>
        p.carousel.pageStructure.groups.findIndex((g) =>
          g.includes(
            o.pageId ||
              MKWCarouselPolicy.sourcePage(p.carousel, carouselObjectBounds(o))
                .id,
          ),
        ),
      ),
    );
    assert.deepEqual(
      owners,
      [0, 1],
      "Explicit mixed-row duplicate retains each source row",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS active row remains UI-only, creation/Select All stay in row, real cross-row paste targets row, undo/redo and MKW roundtrip",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
