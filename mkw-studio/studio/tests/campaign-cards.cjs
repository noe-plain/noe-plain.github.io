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
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startCampaignPreview").click();
    await page.locator("#setupName").fill("Bildkarten");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(async () => {
      const canvas = makeCanvas(64, 64),
        context = canvas.getContext("2d");
      context.fillStyle = "#32768b";
      context.fillRect(0, 0, 64, 64);
      context.fillStyle = "#f2ca72";
      context.fillRect(16, 0, 32, 64);
      const data = canvas.toDataURL(),
        images = [0, 1, 2].map((n) => ({
          id: uid(),
          name:
            "Sehr langer Bildname ohne Trennzeichen " +
            "Abc".repeat(50) +
            n +
            ".png",
          width: 64,
          height: 64,
          data,
          original: data,
        })),
        q = {
          ...snapshot(),
          images,
          campaign: MKWCampaignUI.newState(),
          carousel: undefined,
          boards: [],
        };
      for (const im of images)
        await MKWCampaignDocument.append(q, im, [basicBoard(im, 1080, 1350)]);
      MKWCampaignModel.reconcile(q, uid);
      await MKWProjects.startDocument(q);
    });
    const core = () =>
      page.evaluate(() =>
        JSON.stringify({
          boards: p.boards,
          carousel: {
            ...p.carousel,
            scrollX: undefined,
            scrollY: undefined,
            zoom: undefined,
          },
          campaign: p.campaign,
          images: p.images.map((im) => ({
            id: im.id,
            name: im.name,
            width: im.width,
            height: im.height,
            data: im.data,
          })),
        }),
      );
    const before = await core();
    for (const zoom of [0.6, 0.3, 0.28, 0.2, 0.05]) {
      await page.evaluate((z) => {
        carouselSetZoom(z);
        carouselSlideCenter(0);
      }, zoom);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      if (zoom === 0.6) {
        await page.waitForFunction(() => {
          const thumb = document.querySelector(".campaign-thumb");
          return (
            thumb.width === 460 &&
            thumb.getContext("2d").getImageData(230, 110, 1, 1).data[3] === 255
          );
        });
        await page.screenshot({ path: artifact("campaign-card-hero.png") });
      }
      const sizes = await page.locator(".campaign-card").evaluateAll((cards) =>
        cards.map((card) => ({
          width: card.clientWidth,
          scroll: card.scrollWidth,
          height: card.getBoundingClientRect().height,
          top: card.getBoundingClientRect().top,
          overflow: getComputedStyle(card).overflowY,
        })),
      );
      for (const card of sizes) {
        assert(card.scroll <= card.width + 1, JSON.stringify(card));
        assert.equal(card.overflow, "visible");
      }
      for (let i = 1; i < sizes.length; i++)
        assert(
          sizes[i].top >= sizes[i - 1].top + sizes[i - 1].height,
          JSON.stringify(sizes),
        );
      const options = page.locator(".campaign-card").first().locator("summary");
      await options.click();
      const popup = page.locator(".campaign-card-popover:popover-open");
      await popup.waitFor();
      assert(await popup.locator("[data-campaign-angle]").isVisible());
      assert(await popup.locator("[data-campaign-action=remove]").isVisible());
      const bounds = await popup.evaluate((el) => ({
        w: el.clientWidth,
        sw: el.scrollWidth,
        r: el.getBoundingClientRect().right,
        b: el.getBoundingClientRect().bottom,
      }));
      assert(bounds.sw <= bounds.w + 1, JSON.stringify(bounds));
      assert(bounds.r <= 1500 && bounds.b <= 1100);
      await page.screenshot({
        path: artifact("campaign-card-" + zoom + ".png"),
      });
      await page.keyboard.press("Escape");
      assert(
        !(await page.locator(".campaign-card-popover:popover-open").count()),
      );
      assert.equal(
        (await core()) === before,
        true,
        "Card layout and navigation never mutate artwork",
      );
    }
    await page.setViewportSize({ width: 390, height: 850 });
    await page.evaluate(() => {
      studioSetTheme("dark");
      carouselSetZoom(0.2);
      carouselSlideCenter(0);
    });
    await page.locator(".campaign-card").first().locator("summary").click();
    const small = await page
      .locator(".campaign-card-popover:popover-open")
      .boundingBox();
    assert(
      small.x >= 0 &&
        small.x + small.width <= 390 &&
        small.y + small.height <= 850,
    );
    await page.screenshot({ path: artifact("campaign-card-narrow-dark.png") });
    await page.addScriptTag({ content: require("axe-core").source });
    const violations = await page.evaluate(async () =>
      (
        await axe.run(
          document.querySelector(".campaign-card-popover:popover-open"),
          {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          },
        )
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS fixed-width card without internal overflow, compact/tiny zoom layouts, long filenames, all actions, stable artwork, popup containment and axe",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
