const assert = require("node:assert/strict"),
  { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Vorschauhöhe");
    await page.locator("#ch").fill("1920");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.locator("#carouselExport").click();
    await page.locator("#reviewExport").click();
    await page.locator("#reviewImage").waitFor({ state: "visible" });
    const geometry = await page.locator("#reviewImage").boundingBox();
    console.log("Portrait preview height:", geometry.height);
    if (!process.env.MKW_MEASURE_BASELINE)
      assert(geometry.height >= 500, JSON.stringify(geometry));
    const previous = await page.locator("#reviewNext").boundingBox();
    await page.locator("#reviewNext").click();
    await page.locator("#reviewImage").waitFor({ state: "visible" });
    assert.deepEqual(await page.locator("#reviewNext").boundingBox(), previous);
    await page.screenshot({ path: artifact("export-taller-preview.png") });
    for (const size of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 1500, height: 650 },
    ]) {
      await page.setViewportSize(size);
      assert(await page.locator("#reviewImage").isVisible());
      assert(await page.locator("#zip").isVisible());
      assert(
        await page
          .locator("#exportDialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
    }
    console.log(
      "PASS portrait preview space, fixed navigation and bounded export at narrow/short sizes",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
