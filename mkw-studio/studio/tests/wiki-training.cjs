const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(new URL("hilfe/", process.env.STUDIO_URL).href);
    const legacy = page.locator("#fd-backup-anleitung");
    assert.equal(await legacy.evaluate((el) => el.open), false);
    assert.equal(await page.locator("main section").count(), 10);
    assert.equal(await page.locator("nav a").count(), 10);
    assert(await page.locator("#texte #text-direkt-bearbeiten").count());
    // A search must reveal a result even when its instructions are folded away.
    await page.locator("#helpSearch").fill("Textstapel");
    assert.equal(await legacy.evaluate((el) => el.open), true);
    await page.locator("#helpSearchClear").click();
    assert.equal(await legacy.evaluate((el) => el.open), false);
    // Preserve a reader's manually opened reference after search is cleared.
    await legacy.locator("summary").focus();
    await page.keyboard.press("Space");
    await page.locator("#helpSearch").fill("keinpassendeskapitel");
    await page.locator("#helpSearchClear").click();
    assert.equal(await legacy.evaluate((el) => el.open), true);
    await legacy.locator("summary").click();
    await page.goto(new URL("hilfe/#textstapel", process.env.STUDIO_URL).href);
    await page.waitForFunction(
      () => document.querySelector("#fd-backup-anleitung").open,
    );
    assert(await page.locator("#textstapel").isVisible());
    await page.goto(new URL("hilfe/#grundlagen", process.env.STUDIO_URL).href);
    await page.addScriptTag({ content: require("axe-core").source });
    const violations = await page.evaluate(async () =>
      (
        await axe.run("main", {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(violations, []);
    for (const width of [390, 700, 1500]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page
          .locator("html")
          .evaluate((el) => el.scrollWidth <= innerWidth),
      );
      assert(
        await page
          .locator(".wiki-demo-title")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      );
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.locator("html").evaluate((el) => (el.style.zoom = "2"));
    assert(
      await page.locator("html").evaluate((el) => el.scrollWidth <= innerWidth),
    );
    await page.screenshot({ path: artifact("wiki-training-enlarged.png") });
    await page.locator("html").evaluate((el) => (el.style.zoom = ""));
    // Follow the actual introductory lesson through the normal UI. Only the photo
    // pixels are synthetic; project creation, title fields, save and export are real.
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startCampaignPreview").click();
    await page.locator("#setupName").fill("Mein erster Konzertpost");
    const formats = page.locator("[data-format-enabled]");
    for (let i = 0; i < (await formats.count()); i++) {
      const square = await formats.nth(i).evaluate((el) => {
        const row = el.closest("fieldset"),
          w = row.querySelector('[data-format-key="w"]').value,
          h = row.querySelector('[data-format-key="h"]').value;
        return w === h;
      });
      await formats.nth(i).setChecked(square);
    }
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const fixture = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#34596b";
      ctx.fillRect(0, 0, 600, 600);
      return canvas.toDataURL().split(",")[1];
    });
    await page.locator("#files").setInputFiles({
      name: "Konzertfoto.png",
      mimeType: "image/png",
      buffer: Buffer.from(fixture, "base64"),
    });
    await page.waitForFunction(() => !busy && p.campaign.rows.length === 1);
    const title = page.locator("[data-campaign-title=title]");
    if (!(await title.isVisible()))
      await page.locator(".campaign-card summary").first().click();
    await title.fill("Konzert");
    await title.press("Tab");
    await page.waitForFunction(() =>
      p.carousel.objects.some(
        (o) => o.campaignRole === "titles" && o.text === "Konzert",
      ),
    );
    if (await page.locator(".campaign-card-popover:visible").count())
      await page.locator("[data-card-close]").click();
    assert.equal(await page.evaluate(() => p.boards.length), 1);
    await page.locator("#save").click();
    // Exercise the download branch available in Firefox and Chromium; an automated
    // browser cannot pick a real user folder through the OS save dialog.
    await page.evaluate(() => (window.showSaveFilePicker = undefined));
    const saving = page.waitForEvent("download");
    await page.locator("#saveProject").click();
    const saved = await saving,
      projectFile = artifact("wiki-training.mkw");
    await saved.saveAs(projectFile);
    assert.equal(
      fs.readFileSync(projectFile).subarray(0, 4).toString("hex"),
      "504b0304",
    );
    if (await page.locator("#saveDialog").isVisible())
      await page.keyboard.press("Escape");
    await page.locator("#carouselExport").click();
    await page.locator("[data-export-format=jpg]").click();
    await page.locator("#reviewExport").click();
    await page.locator("#reviewImage").waitFor({ state: "visible" });
    assert(
      await page.locator("#reviewImage").evaluate((el) => el.naturalWidth > 0),
    );
    await page.screenshot({ path: artifact("wiki-training-jpg-preview.png") });
    const exporting = page.waitForEvent("download");
    await page.locator("#zip").click();
    const output = await exporting;
    assert(/\.(zip|jpg)$/i.test(output.suggestedFilename()));
    await output.saveAs(artifact(output.suggestedFilename()));
    assert.deepEqual(errors, []);
    console.log(
      "PASS training chapter navigation, collapsed reference search/deep links, axe, narrow layout and real FD lesson through title, MKW download and JPG preview/export",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
