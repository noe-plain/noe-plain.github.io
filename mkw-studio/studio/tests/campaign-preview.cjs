const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startCampaignPreview").click();
    await page.locator("#setupName").fill("Kampagnen Vorschau");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    assert(await page.evaluate(() => !!p.campaign && !p.carousel));
    const data = await page.evaluate(() => {
      const c = makeCanvas(400, 300),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#577c91";
      ctx.fillRect(0, 0, 400, 300);
      return c.toDataURL().split(",")[1];
    });
    await page.locator("#files").setInputFiles(
      [1, 2, 3].map((i) => ({
        name: `Foto-${i}.png`,
        mimeType: "image/png",
        buffer: Buffer.from(data, "base64"),
      })),
    );
    await page.waitForFunction(() => !busy && p.campaign.rows.length === 3);
    console.log(
      "imported",
      await page.evaluate(() => ({
        n: p.carousel.n,
        objects: p.carousel.objects.length,
      })),
    );
    assert.equal(await page.locator(".campaign-card").count(), 3);
    assert.equal(await page.locator("[data-text-type]").count(), 0);
    assert.equal(await page.locator("#carouselAddSlide").count(), 0);
    assert.equal(
      await page.evaluate(
        () =>
          p.carousel.objects.filter((o) => o.campaignRole === "background")
            .length,
      ),
      6,
    );
    await page.evaluate(() => {
      const a = p.carousel.artboards[0];
      carouselObject("text", {
        x: a.x + 100,
        y: a.y + 400,
        w: 800,
        h: 200,
        text: "Konzert",
        size: 70,
      });
    });
    const master = await page.evaluate(() =>
      p.campaign.links.find(
        (l) =>
          p.carousel.objects.find((o) => o.id === l.source)?.type === "text",
      ),
    );
    assert.equal(master.targets.length, 2);
    await page.evaluate((l) => {
      checkpoint();
      const t = p.carousel.objects.find((o) => o.id === l.targets[0].id);
      t.x += 40;
      changed(false);
      checkpoint();
      const s = p.carousel.objects.find((o) => o.id === l.source);
      s.text = "Neues Konzert";
      s.size = 90;
      changed(false);
    }, master);
    const linked = await page.evaluate(
      (l) =>
        l.targets.map((t) => {
          const o = p.carousel.objects.find((o) => o.id === t.id);
          return {
            text: o.text,
            size: o.size,
            x: o.x - p.carousel.artboards.find((a) => a.id === o.pageId).x,
          };
        }),
      master,
    );
    assert.deepEqual(
      linked.map((o) => o.text),
      ["Neues Konzert", "Neues Konzert"],
    );
    assert.deepEqual(
      linked.map((o) => o.x),
      [140, 100],
    );
    assert(linked.every((o) => o.size === 90));
    // New format: reuse text, preserve source formatting, then edit independently.
    await page.locator("[data-campaign-action=format]").first().click();
    await page.locator("[data-w]").fill("1080");
    await page.locator("[data-h]").fill("1440");
    await page.locator("[data-add]").click();
    await page
      .locator(".campaign-format-dialog")
      .waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => p.campaign.rows[0].pages.length), 3);
    await page.evaluate(() => {
      const a = p.carousel.artboards.find((a) => a.h === 1440);
      void MKWCampaignUI.textChoice({
        x: a.x + 100,
        y: a.y + 300,
        w: 800,
        h: 200,
      }).then((result) => (window.reusedText = result));
    });
    assert.equal(
      await page
        .locator(".campaign-text-choice")
        .evaluate((el) => el.parentElement.id),
      "carouselEditingOverlay",
    );
    assert.equal(await page.locator("dialog.campaign-text-choice").count(), 0);
    await page.locator("[data-adopt]").first().click();
    await page.waitForFunction(() => window.reusedText?.text);
    await page.evaluate(() => {
      const a = p.carousel.artboards.find((a) => a.h === 1440);
      carouselObject("text", {
        ...window.reusedText,
        x: a.x + 100,
        y: a.y + 300,
        w: 800,
        h: 200,
        size: 50,
      });
    });
    assert.equal(
      await page.evaluate(
        (id) => p.carousel.objects.find((o) => o.id === id).size,
        master.source,
      ),
      90,
    );
    // First gradient follows the format; later gradients/additional pictures remain local.
    await page.evaluate(() => {
      const a = p.carousel.artboards[0];
      carouselObject("gradient", { x: a.x, y: a.y + 500, w: 1080, h: 600 });
      carouselObject("gradient", { x: a.x, y: a.y, w: 100, h: 100 });
      carouselObject("image", {
        imageId: p.images[0].id,
        x: a.x + 100,
        y: a.y + 100,
        w: 200,
        h: 200,
      });
    });
    assert.equal(
      await page.evaluate(
        () => p.carousel.objects.filter((o) => o.type === "gradient").length,
      ),
      4,
    );
    // Card handlers resolve the current row after linked edits, not a stale object.
    await page
      .locator(".campaign-card details")
      .first()
      .locator("summary")
      .click();
    await page.locator("[data-campaign-angle]").first().check();
    if (
      !(await page
        .locator(".campaign-card details")
        .first()
        .evaluate((e) => e.open))
    )
      await page
        .locator(".campaign-card details")
        .first()
        .locator("summary")
        .click();
    await page.locator("[data-campaign-family]").first().check();
    assert(await page.evaluate(() => p.campaign.rows[0].family));
    assert.equal(
      await page.evaluate(
        () =>
          p.carousel.objects.filter((o) => o.campaignRole === "angle").length,
      ),
      3,
    );
    await page
      .locator("[data-campaign-copyright]")
      .first()
      .fill("Foto © Test");
    await page.locator("[data-campaign-copyright]").first().press("Tab");
    assert.equal(
      await page.evaluate(
        () =>
          p.carousel.objects.filter((o) => o.campaignRole === "copyright")
            .length,
      ),
      3,
    );
    await page.evaluate(() => {
      for (const a of p.carousel.objects) {
        if (a.type === "text") MKWCampaignUI.decorate(a);
      }
    });
    assert.equal(await page.locator("#toolPaintPicker").count(), 1);
    const caption = await page
      .locator(".campaign-artboard-label")
      .first()
      .boundingBox();
    const artwork = await page.evaluate(() => {
      const a = p.carousel.artboards[0],
        r = carouselOrigin();
      return { top: r.top + a.y * carouselZoom };
    });
    assert(
      caption.y + caption.height <= artwork.top + 1,
      "Format caption is above the artwork",
    );
    const roundtrip = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      return JSON.stringify(q.campaign) === JSON.stringify(p.campaign);
    });
    assert(roundtrip);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () =>
      (await axe.run("#carouselEditor")).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html),
      })),
    );
    assert.deepEqual(violations, []);
    await page.locator("#carouselExport").click();
    await page.locator("#reviewExport").click();
    assert.equal(await page.locator("#reviewSelection").count(), 0);
    await page.locator("#reviewImage").waitFor({ state: "visible" });
    await page.locator("#closeReview").click();
    await page.locator("#closeExport").click();
    await page.screenshot({ path: artifact("campaign-preview-workspace.png") });
    console.log(
      "PASS campaign setup/import, same-format links, individual property override, no slides/text toggles and MKW roundtrip",
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
