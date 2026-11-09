const assert = require("node:assert/strict");
const {
  launch,
  waitForProjectReady,
  selectTextScope,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["carousel", "post"]) {
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page
        .locator(mode === "carousel" ? "#startDesigner" : "#startNew")
        .click();
      if (mode === "post")
        await page.locator("[data-project-mode=post]").click();
      await page.locator("#setupName").fill("Zeilenabstand ohne Datenverlust");
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate((mode) => {
        const text = "Alpha Beta Gamma\nUnberührter Absatz";
        if (mode === "carousel")
          carouselObject("text", {
            text,
            x: 100,
            y: 100,
            w: 1800,
            h: 6000,
            size: 1000,
            color: "#202020",
          });
        else {
          const canvas = makeCanvas(64, 80),
            data = canvas.toDataURL(),
            im = {
              id: uid(),
              name: "Test.png",
              data,
              original: data,
              width: 64,
              height: 80,
            };
          p.images.push(im);
          const b = createBoard(im, 1080, 1350);
          p.boards = [b];
          selected = b.id;
          Object.assign(b.elements.title, {
            text,
            size: 1000,
            uppercase: false,
            typographyVersion: 1,
          });
          step = "text";
          layer = "title";
          render();
        }
      }, mode);
      await page.locator("[data-typo=tracking]").fill("25");
      await page.evaluate(async () => {
        await undo();
      });
      await selectTextScope(page, "[data-line-selection]", ["0:0"]);
      const state = () =>
        page.evaluate(async () => {
          const digest = async (value) =>
            [
              ...new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(JSON.stringify(value)),
                ),
              ),
            ]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          return {
            objects: JSON.stringify(
              p.carousel ? p.carousel.objects : p.boards.map((b) => b.elements),
            ),
            history: await digest(history),
            historyLength: history.length,
            future: await digest(future),
            futureLength: future.length,
            revision,
          };
        });
      const before = await state();
      assert(before.futureLength > 0, "Fixture contains a redo entry");
      await page.locator("[data-typo=lineHeight]").fill("500");
      assert.equal(
        await page
          .locator("[data-typo=lineHeight]")
          .getAttribute("aria-invalid"),
        "true",
      );
      assert.deepEqual(
        await state(),
        before,
        "Rejected leading must preserve document, undo, redo and revision",
      );
      await page.evaluate(async () => {
        await redo();
      });
      assert.equal(
        await page.evaluate(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title)
              .tracking,
        ),
        25,
        "Redo remains usable after rejection",
      );
      await page.evaluate(async () => {
        await undo();
      });
      await selectTextScope(page, "[data-line-selection]", ["0:0"]);
      const validBefore = await state();
      await page.locator("[data-typo=lineHeight]").fill("120");
      const duringValid = await state();
      await page.locator("[data-typo=lineHeight]").fill("500");
      assert.deepEqual(
        await state(),
        duringValid,
        "A later rejected value preserves the valid edit and its undo group",
      );
      await page.locator("[data-typo=lineHeight]").fill("130");
      assert.equal(
        await page
          .locator("[data-typo=lineHeight]")
          .getAttribute("aria-invalid"),
        null,
      );
      assert.equal(
        await page.evaluate(() => history.length),
        validBefore.historyLength + 1,
        "Valid continuous input is one undo step",
      );
      assert.equal(
        await page.evaluate(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title)
              .textStyles[0].leading[0],
        ),
        1300,
      );
      await page.evaluate(async () => {
        await undo();
      });
      assert.equal(
        (await state()).objects,
        validBefore.objects,
        "One undo restores the original text geometry",
      );
      await selectTextScope(page, "[data-line-selection]", ["0:0"]);
      const boundaryBefore = await state();
      await page.locator("[data-typo=lineHeight]").fill("300");
      assert.equal(
        await page
          .locator("[data-typo=lineHeight]")
          .getAttribute("aria-invalid"),
        null,
        "The inclusive 3000px boundary is valid after FD size conversion",
      );
      assert.equal(
        await page.evaluate(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title)
              .textStyles[0].leading[0],
        ),
        3000,
      );
      await page.evaluate(async () => {
        await undo();
      });
      assert.equal((await state()).objects, boundaryBefore.objects);
      assert.deepEqual(errors, []);
      console.log(
        "PASS " +
          mode +
          ": invalid line spacing preserves document/undo/redo/revision; recovery, actual redo and grouped valid edits",
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
