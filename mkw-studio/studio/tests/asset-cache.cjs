const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
(async () => {
  const root = path.resolve(__dirname, ".."),
    html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const assets = [
    ...html.matchAll(
      /(?:href|src)="(static\/[^"?]+\.(?:css|js))(?:\?v=([^"#]+))?"/g,
    ),
  ];
  assert(assets.length >= 5);
  for (const [, name, version] of assets)
    assert.equal(
      version,
      createHash("sha256")
        .update(fs.readFileSync(path.join(root, name)))
        .digest("hex")
        .slice(0, 12),
      `${name} needs its current content version`,
    );
  const browser = await require("./browser.cjs").launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1255, height: 1100 },
      }),
      errors = [],
      stale = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Simulate an older cache entry for the unversioned URLs used by prior releases.
    await page.route(/\/static\/[^?]+\.(?:js|css)$/, (route) => {
      stale.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: 'throw new Error("Stale unversioned asset");',
      });
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Cache und Fortsetzen");
    await page.locator("#createProject").click();
    await page.waitForFunction(
      () => !busy && !document.querySelector("#projectSetup").open,
    );
    const fixture = await page.evaluate(() => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(1600, 2000),
        x = c.getContext("2d");
      x.fillStyle = "#2c4851";
      x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "#ab7453";
      x.fillRect(0, 0, 800, 2000);
      return c.toDataURL();
    });
    await page
      .locator("#files")
      .setInputFiles({
        name: "Probe.png",
        mimeType: "image/png",
        buffer: Buffer.from(fixture.split(",")[1], "base64"),
      });
    await page.waitForFunction(() => !busy && p.boards.length === 2);
    await page.locator("#mainTextInput").fill("Das ist ein Titel");
    await page.evaluate(() => autosave());
    const before = await page.evaluate(() =>
      JSON.stringify(MKWProjectAssets.compact(p)),
    );
    await page.reload();
    await page.locator("#startContinue").click();
    await page.waitForFunction(
      () =>
        !busy &&
        p.boards.length === 2 &&
        document.querySelector("canvas[data-board]").width > 0,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(MKWProjectAssets.compact(p))),
      before,
      "Continuing must retain the complete project",
    );
    assert(await page.locator("#postPasteboard").isVisible());
    assert.equal(await page.locator(".image-info-card").count(), 1);
    const rects = await page.evaluate(() =>
      [...document.querySelectorAll("canvas[data-board]")].map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    for (const r of rects)
      assert(
        r.w > 0 &&
          r.h > 0 &&
          r.x >= 0 &&
          r.x + r.w <= 967 &&
          r.y >= 68 &&
          r.y + r.h < 1048,
      );
    const card = await page.locator(".image-info-card").boundingBox(),
      canvas = await page.locator("canvas[data-board]").first().boundingBox();
    assert.equal(
      card.y,
      canvas.y,
      "Card top aligns with artwork, below its label",
    );
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-post-restored.png"),
    });
    assert.deepEqual(
      stale,
      [],
      "No stale unversioned script or stylesheet may be reused",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS content versions for all editor assets, stale-cache protection, saved single-post project restored with visible artwork and aligned image card",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
