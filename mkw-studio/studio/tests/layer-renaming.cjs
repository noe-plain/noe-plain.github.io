const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Namen");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy && p.carousel);
    const ids = await page.evaluate(async () => {
      const a = carouselObject("shape", {
        x: 200,
        y: 300,
        w: 400,
        h: 500,
        fill: "#38786b",
      });
      const b = carouselObject("text", {
        x: 150,
        y: 250,
        w: 700,
        h: 400,
        text: "Musik erleben",
        size: 70,
      });
      carouselSelect([a.id, b.id]);
      carouselCreateFolder();
      await prepareLogo(p.boards[0]);
      await autosave();
      return { layer: a.id, folder: p.carousel.folders.at(-1).id };
    });
    const geometry = () =>
      page.evaluate(() =>
        JSON.stringify({
          objects: p.carousel.objects.map(({ name, ...o }) => o),
          folders: p.carousel.folders.map(({ name, ...f }) => f),
        }),
      );
    const before = await geometry();
    const pixels = () =>
      page.evaluate(async () => {
        const b = p.boards[0],
          c = makeCanvas(b.w, b.h);
        await paint(exportContext(c), b, 1, { transparent: false });
        const result = c.toDataURL();
        c.width = c.height = 1;
        return result;
      });
    const beforePixels = await pixels();
    const counters = () =>
      page.evaluate(() => ({ revision, history: history.length }));
    for (const kind of ["folder", "layer"]) {
      const row = page.locator(`[data-${kind}="${ids[kind]}"]`),
        name = row.locator(`.carousel-${kind}-name`);
      const read = () =>
        page.evaluate(
          ([kind, id]) =>
            (kind === "folder" ? p.carousel.folders : p.carousel.objects).find(
              (o) => o.id === id,
            ).name,
          [kind, ids[kind]],
        );
      const old = await read(),
        start = await counters();
      await row.locator(`.carousel-${kind}-actions`).click();
      await page.locator(`[data-${kind}-menu=rename]`).click();
      const input = page.locator("#carouselRenameInput");
      assert.equal(await input.inputValue(), old);
      assert.equal(
        await input.getAttribute("aria-label"),
        kind === "folder" ? "Ordner umbenennen" : "Ebene umbenennen",
      );
      assert(
        await input.evaluate(
          (el) =>
            document.activeElement === el &&
            el.selectionStart === 0 &&
            el.selectionEnd === el.value.length,
        ),
      );
      assert.equal(await row.getAttribute("draggable"), "false");
      assert((await input.boundingBox()).height >= 40);
      await input.fill(
        `  ${kind === "folder" ? "Konzertbilder" : "Illustration"}  `,
      );
      await input.press("Enter");
      const renamed = await read();
      assert.equal(
        renamed,
        kind === "folder" ? "Konzertbilder" : "Illustration",
      );
      assert.equal((await counters()).history, start.history + 1);
      assert.equal((await counters()).revision, start.revision + 1);
      assert(await name.evaluate((el) => document.activeElement === el));
      await name.focus();
      await page.keyboard.press("F2");
      assert(await input.isVisible());
      await input.fill("Abbrechen");
      await input.press("Escape");
      assert.equal(await read(), renamed);
      assert.deepEqual(await counters(), {
        revision: start.revision + 1,
        history: start.history + 1,
      });
      await name.focus();
      await page.keyboard.press("F2");
      await input.fill("   ");
      await input.press("Enter");
      assert.equal(await read(), renamed);
      assert.equal((await counters()).history, start.history + 1);
      await name.focus();
      await page.keyboard.press("F2");
      await input.fill(renamed + " neu");
      await input.press("Tab");
      assert.equal(await read(), renamed + " neu");
      assert(await input.isHidden());
      assert.notEqual(
        await page.evaluate(() => document.activeElement.tagName),
        "BODY",
      );
      await page.locator("#undo").click();
      assert.equal(await read(), renamed);
      await page.locator("#redo").click();
      assert.equal(await read(), renamed + " neu");
      await page.evaluate(
        ([kind, id]) => {
          if (kind === "folder") {
            carouselSelect(
              p.carousel.objects
                .filter((o) => o.folderId === id)
                .map((o) => o.id),
            );
            carouselUI.folder = id;
            carouselPanel();
          } else carouselSelect([id]);
        },
        [kind, ids[kind]],
      );
      // Native double click uses the same field, without an interactive input inside a button.
      await name.dblclick();
      await input.waitFor();
      assert.equal(await input.locator("xpath=ancestor::button").count(), 0);
      await input.press("Escape");
      await page.screenshot({
        path: artifact(`mkw-rename-${kind}.png`),
        animations: "disabled",
      });
    }
    assert.equal(await geometry(), before);
    assert.equal(await pixels(), beforePixels);
    assert.deepEqual(errors, []);
    console.log(
      "PASS identical folder/layer menu, direct inline field/F2/double-click, Enter/blur commit, Escape/empty cancel, one undo step, focus/drag restoration, unchanged geometry/membership/pixels",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
