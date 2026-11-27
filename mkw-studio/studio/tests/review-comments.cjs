const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { execFileSync } = require("node:child_process");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.showSaveFilePicker = undefined;
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Bildkommentare");
    await page.locator("#cw").fill("400");
    await page.locator("#ch").fill("500");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() => MKWSpreadUI.commit({ type: "enable" }));
    await page.evaluate(() =>
      carouselObject("shape", {
        x: 100,
        y: 100,
        w: 120,
        h: 120,
        fill: "#335588",
        strokeWidth: 0,
      }),
    );
    const before = await page.evaluate(async () => {
      const digest = async (bytes) =>
        [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(
          ",",
        );
      const png = await encodedBoard(clone(p.boards[0]), {
        format: "png",
        png8: false,
        transparent: false,
      });
      const pdf = await encodedBoard(clone(p.boards[0]), {
        format: "pdf",
        pdf: { ...carouselPDFPreset("original"), w: 400, h: 500 },
      });
      const psd = agPsd.readPsd(await (await buildCarouselPSD()).arrayBuffer());
      return {
        id: p.carousel.artboards[0].id,
        png: await digest(await png.blob.arrayBuffer()),
        pdf: await digest(pdf.pdfImage.data),
        psd: await digest(
          psd.canvas.getContext("2d").getImageData(0, 0, psd.width, psd.height)
            .data,
        ),
        objects: JSON.stringify(p.carousel.objects),
        history: history.length,
      };
    });
    await page.locator("#carouselExport").click();
    await page.locator("#reviewExport").click();
    await page.locator("#exportCommentPanel").evaluate(el => el.open = true);
    await page.locator("#reviewImage").waitFor({ state: "visible" });
    await page.locator("#reviewCommentEdit").click();
    await page.evaluate(() => {
      const input = document.querySelector("#reviewCommentInput");
      input.value = "x".repeat(1001);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert(await page.locator("#reviewCommentSave").isDisabled());
    await page.locator("#reviewCommentInput").fill("Nicht speichern");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => reviewIndex), 0);
    assert(await page.locator("#reviewNext").isDisabled());
    await page.locator("#reviewCommentCancel").click();
    assert.equal(await page.evaluate(() => history.length), before.history);
    const note = "Ausschnitt prüfen 🎻\n<b>Reiner Text</b>";
    await page.locator("#reviewCommentEdit").click();
    await page.locator("#reviewCommentInput").fill(note);
    await page.locator("#reviewCommentSave").click();
    assert.equal(await page.locator("#reviewCommentText").innerText(), note);
    assert.equal(await page.locator("#reviewCommentText b").count(), 0);
    assert.equal(await page.evaluate(() => history.length), before.history + 1);
    await page.locator("#reviewNext").click();
    assert.equal(
      await page.locator("#reviewCommentText").innerText(),
      "Noch kein Kommentar.",
    );
    await page.locator("#reviewPrevious").click();
    assert.equal(await page.locator("#reviewCommentText").innerText(), note);
    await page.locator("#reviewCommentEdit").click();
    await page.locator("#reviewCommentInput").fill("Verwerfen");
    await page.keyboard.press("Escape");
    assert(await page.locator("#reviewDialog").isVisible());
    assert.equal(await page.locator("#reviewCommentText").innerText(), note);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        studioSetTheme(theme);
      }, theme);
      await page.waitForTimeout(500); // Let the real theme transition finish before visual evidence.
      await page.screenshot({
        path: artifact("comments-review-" + theme + ".png"),
      });
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    assert(
      await page
        .locator("#reviewDialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.waitForTimeout(500);
    const bounds = await page.locator("#reviewDialog").boundingBox();
    assert(bounds.y >= 0 && bounds.y + bounds.height <= 1025);
    await page.screenshot({ path: artifact("comments-review-tablet.png") });
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.locator("#closeReview").click();
    await page.locator("#closeExport").click();
    await page.locator("[data-comment-board]").first().waitFor();
    await page.locator("[data-comment-board]").first().click();
    assert.equal(await page.locator("[data-note-content]").innerText(), note);
    await page.locator("[data-note-close]").click();
    const after = await page.evaluate(async () => {
      const digest = async (bytes) =>
        [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(
          ",",
        );
      const png = await encodedBoard(clone(p.boards[0]), {
        format: "png",
        png8: false,
        transparent: false,
      });
      const pdf = await encodedBoard(clone(p.boards[0]), {
        format: "pdf",
        pdf: { ...carouselPDFPreset("original"), w: 400, h: 500 },
      });
      const psd = agPsd.readPsd(await (await buildCarouselPSD()).arrayBuffer());
      await autosave();
      const restored = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(restored);
      validateCarousel(restored);
      return {
        png: await digest(await png.blob.arrayBuffer()),
        pdf: await digest(pdf.pdfImage.data),
        psd: await digest(
          psd.canvas.getContext("2d").getImageData(0, 0, psd.width, psd.height)
            .data,
        ),
        objects: JSON.stringify(p.carousel.objects),
        note: restored.carousel.artboards[0].reviewComment,
      };
    });
    for (const k of ["png", "pdf", "psd", "objects"])
      assert.equal(after[k], before[k], k + " unchanged by note");
    assert.equal(after.note, note);
    await page.evaluate(() => undo());
    assert.equal(await page.locator("[data-comment-board]").count(), 0);
    await page.evaluate(() => redo());
    await page.locator("[data-comment-board]").first().waitFor();
    await page.locator("#carouselExport").click();
    await page.locator("#reviewExport").click();
    await page.locator("#exportCommentPanel").evaluate(el => el.open = true);
    await page.locator("#reviewCommentRemove").click();
    assert.equal(
      await page.locator("#reviewCommentText").innerText(),
      "Noch kein Kommentar.",
    );
    await page.locator("#closeReview").click();
    await page.locator("#closeExport").click();
    await page.evaluate(() => undo());
    await page.evaluate(() =>
      MKWSpreadUI.commit({
        type: "row-slide",
        ids: [p.carousel.artboards[0].id],
        operation: "duplicate",
        index: 1,
      }),
    );
    assert.equal(
      await page.evaluate(() => p.carousel.artboards[1].reviewComment),
      note,
    );
    await page.locator("#carouselExport").click();
    await page.locator("[data-export-format=png]").click();
    const download = page.waitForEvent("download");
    await page.locator("#zip").click();
    const file = await download,
      dest = artifact("comments-project.zip");
    await file.saveAs(dest);
    const listing = execFileSync("unzip", ["-Z1", dest], { encoding: "utf8" });
    const name = listing.split("\n").find((n) => n.endsWith(".mkw"));
    assert(name);
    const bytes = execFileSync("unzip", ["-p", dest, name], {
      maxBuffer: 8 * 1024 ** 2,
    });
    const packed = await page.evaluate(async (data) => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(
          new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))]),
        ),
      );
      validate(q);
      validateCarousel(q);
      return q.carousel.artboards.filter((a) => a.reviewComment).length;
    }, bytes.toString("base64"));
    assert.equal(packed, 2);
    assert.deepEqual(errors, []);
    console.log(
      "PASS comment UI add/edit/remove/cancel/arrows/Escape, shared history, M3 light/dark/tablet, canvas note, duplicate, autosave and real ZIP/MKW; PNG/PDF/PSD pixels unchanged",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
