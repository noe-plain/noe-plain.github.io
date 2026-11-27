const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      }),
    );
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startCampaignPreview").click();
    await page.locator("#setupName").fill("FD-Kommentare");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const fixture = await page.evaluate(() => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(120, 180);
      c.getContext("2d").fillRect(0, 0, 120, 180);
      return c.toDataURL().split(",")[1];
    });
    const imageFile = (name) => ({
      name,
      mimeType: "image/png",
      buffer: Buffer.from(fixture, "base64"),
    });
    await page
      .locator("#files")
      .setInputFiles([imageFile("Eins.png"), imageFile("Zwei.png")]);
    await page.waitForFunction(() => !busy && p.campaign.rows.length === 2);
    const imageId = await page.evaluate(() => p.campaign.rows[0].imageId);
    await page.locator("#carouselExport").click();
    await page.locator("#reviewExport").click();
    await page.locator("#exportCommentPanel").evaluate(el => el.open = true);
    await page.locator("#reviewCommentEdit").click();
    await page.locator("#reviewCommentInput").fill("Für alle Formate");
    await page.locator("#reviewCommentSave").click();
    await page.locator("#reviewNext").click();
    assert.equal(
      await page.locator("#reviewCommentText").innerText(),
      "Für alle Formate",
    );
    await page.locator("#reviewNext").click();
    assert.equal(
      await page.locator("#reviewCommentText").innerText(),
      "Noch kein Kommentar.",
    );
    await page.locator("#closeReview").click();
    await page.locator("#closeExport").click();
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(
        (id) => p.images.find((i) => i.id === id).reviewComment,
        imageId,
      ),
      undefined,
    );
    await page.evaluate(() => redo());
    assert.equal(
      await page.evaluate(
        (id) => p.images.find((i) => i.id === id).reviewComment,
        imageId,
      ),
      "Für alle Formate",
    );
    await page.locator("[data-comment-board]").first().waitFor();
    await page.screenshot({
      path: artifact("comments-campaign-workspace.png"),
    });
    const chooser = page.waitForEvent("filechooser");
    await page.locator("[data-campaign-action=replace]").first().click();
    await (await chooser).setFiles(imageFile("Ersatz.png"));
    await page.waitForFunction(
      () => !busy && p.images.some((i) => i.name === "Ersatz.png"),
    );
    assert.equal(
      await page.evaluate(
        (id) => p.images.find((i) => i.id === id).reviewComment,
        imageId,
      ),
      "Für alle Formate",
    );
    const row = page.locator(`[data-campaign-row="${imageId}"]`);
    await row.locator("summary").click();
    await row.locator("[data-campaign-action=down]").click();
    assert.equal(
      await page.evaluate(
        () =>
          p.images.find((i) => i.id === p.campaign.rows[1].imageId)
            .reviewComment,
      ),
      "Für alle Formate",
    );
    const options = page.locator(`[data-campaign-row="${imageId}"]`);
    if (!(await options.locator("details").getAttribute("open"))) {
      const expanded = await options
        .locator("details")
        .evaluate((el) => el.open);
      if (!expanded) await options.locator("summary").click();
    }
    await options.locator("[data-campaign-action=remove]").click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(() => p.campaign.rows.length === 1);
    assert.equal(
      await page.evaluate((id) => p.images.some((im) => im.id === id), imageId),
      false,
    );
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(
        (id) => p.images.find((im) => im.id === id).reviewComment,
        imageId,
      ),
      "Für alle Formate",
    );
    await page.evaluate(() => {
      const q = snapshot();
      delete q.campaign;
      delete q.carousel;
      for (const b of q.boards) delete b.campaignPage;
      p = q;
      history = [];
      future = [];
      changed();
    });
    await page
      .locator("#export")
      .count()
      .catch(() => 0);
    await page.evaluate(() => openExport());
    await page.locator("#reviewExport").click();
    await page.locator("#exportCommentPanel").evaluate(el => el.open = true);
    assert.equal(
      await page.locator("#reviewCommentText").innerText(),
      "Für alle Formate",
    );
    await page.locator("#reviewCommentEdit").click();
    await page.locator("#reviewCommentInput").fill("Notiz im bisherigen FD");
    await page.locator("#reviewCommentSave").click();
    await page.locator("#closeReview").click();
    await page.locator("#closeExport").click();
    await page.locator("[data-comment-board]").first().waitFor();
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(
        (id) => p.images.find((i) => i.id === id).reviewComment,
        imageId,
      ),
      "Für alle Formate",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS shared FD image comment across formats, independent images, immutable-image Undo/Redo, real replacement, row movement and legacy FD workspace",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
