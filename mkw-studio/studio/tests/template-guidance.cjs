const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startTemplates").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").waitFor();
    await page.locator("#templateSearch").fill("Nichtvorhanden");
    assert(await page.locator("#templateEmpty").isVisible());
    await page.locator("#templateSearch").fill("winkel");
    assert(
      await page.locator("[data-template-id=mkw-winkel-slidepost]").isVisible(),
    );
    await page.locator("#templateOrigin").selectOption("own");
    assert(await page.locator("#templateEmpty").isVisible());
    await page.locator("#templateOrigin").selectOption("all");
    await page.screenshot({ path: artifact("template-choice-redesign.png") });
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.locator("#templateProjectName").waitFor();
    assert(await page.locator("#templateChoose").isHidden());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "templateProjectName",
    );
    await page.locator("#templateProjectName").fill("Mein Konzert");
    const text = page.locator("[data-template-text]").first();
    await text.fill("Eine neue Geschichte");
    const key = await text.getAttribute("data-template-text");
    assert.equal(await page.locator(".template-location").count(), 1);
    await page.locator("#templateAreaFilter").selectOption("1");
    assert.equal(
      await page.locator("#templatePreviewCount").innerText(),
      "2 / 4",
    );
    assert.equal(await text.inputValue(), "Eine neue Geschichte");
    await page.locator("#templateAreaFilter").selectOption("all");
    await page.locator("#templateChangeChoice").click();
    assert(await page.locator("#templateCreate").isHidden());
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    assert.equal(
      await page.locator("#templateProjectName").inputValue(),
      "Mein Konzert",
    );
    assert.equal(
      await page.locator(`[data-template-text="${key}"]`).inputValue(),
      "Eine neue Geschichte",
    );
    await page.locator("#templateCreate").click();
    assert((await page.locator(".needs-content").count()) > 0);
    assert(
      await page
        .locator("[data-template-required]")
        .first()
        .getAttribute("aria-invalid"),
    );
    await page.addScriptTag({
      content: await fs.readFile(
        require.resolve("axe-core/axe.min.js"),
        "utf8",
      ),
    });
    const violations = await page.evaluate(async () =>
      (await axe.run(document.querySelector("#templateGallery"))).violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    );
    assert.deepEqual(violations, []);
    await page.evaluate(() => {
      studioSetTheme("dark");
    });
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    const darkViolations = await page.evaluate(async () =>
      (await axe.run(document.querySelector("#templateGallery"))).violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => v.id),
    );
    assert.deepEqual(darkViolations, []);
    await page.screenshot({
      path: artifact("template-fill-redesign-dark.png"),
    });
    await page.setViewportSize({ width: 500, height: 900 });
    await page.screenshot({
      path: artifact("template-fill-redesign-mobile.png"),
    });
    assert(
      await page
        .locator("#templateGallery")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    );
    await page.keyboard.press("Escape");
    assert(await page.locator("#templateGallery").isHidden());
    assert.deepEqual(errors, []);
    console.log(
      "PASS clear choose/fill stages, search/origin/empty state, draft preservation, project name retention, artboard filtering, location hint, accessible missing-image validation, axe and responsive dark dialog",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
