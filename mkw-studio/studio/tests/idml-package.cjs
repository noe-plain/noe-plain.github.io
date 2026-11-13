const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const { launch, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("IDML ohne Projektänderung");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(() => {
      const before = JSON.stringify(snapshot()),
        revisionBefore = revision,
        undo = history.length,
        redo = future.length,
        bytes = MKWIDML.emptyPage({ w: 800, h: 1000, name: "MKW & <Test> 🎶" });
      let rejected = false;
      try {
        MKWIDML.emptyPage({ w: 0, h: 750 });
      } catch {
        rejected = true;
      }
      return {
        bytes: [...bytes],
        rejected,
        same:
          before === JSON.stringify(snapshot()) &&
          revisionBefore === revision &&
          undo === history.length &&
          redo === future.length,
        psdAvailable: !document.querySelector("#savePSD").hidden,
      };
    });
    assert(result.same);
    assert(result.rejected);
    assert(result.psdAvailable);
    const bytes = Buffer.from(result.bytes);
    assert.deepEqual(
      bytes,
      fs.readFileSync(path.join(__dirname, "../examples/idml-empty-page.idml")),
    );
    const parsed = JSON.parse(
      execFileSync(
        "python3",
        [path.join(__dirname, "verify-idml-package.py")],
        { input: bytes },
      ).toString(),
    );
    assert.deepEqual(
      [parsed.width, parsed.height, parsed.pages],
      [600, 750, 1],
    );
    console.log(
      "PASS browser-generated IDML matches native-tested example; independent ZIP/XML check; project/history unchanged and PSD retained",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
