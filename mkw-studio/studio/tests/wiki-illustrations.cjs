const assert = require("node:assert/strict"),
  { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      requests = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Visuelles Wiki");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    assert(!requests.some((u) => new URL(u).pathname.includes("/hilfe/")));
    await page.locator("#help").click();
    const help = page.frameLocator("#studioHelpFrame");
    await help.locator("#helpSearch").waitFor();
    assert.equal(await help.locator("figure.wiki-figure").count(), 13);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      for (const id of [
        "grafik-ablauf",
        "grafik-verknuepfung",
        "grafik-randausgleich",
        "grafik-exportvorschau",
        "grafik-hierarchie",
        "grafik-kontrast",
        "grafik-abstaende",
        "grafik-absatz",
        "grafik-bildausschnitt",
        "grafik-ebenen",
        "grafik-kurvengriffe",
        "grafik-grifftypen",
        "grafik-pfad-schliessen",
      ]) {
        const fig = help.locator("#" + id);
        await fig.scrollIntoViewIfNeeded();
        assert(await fig.locator("figcaption").isVisible());
        const semantics = await fig.evaluate((el) =>
          [...el.querySelectorAll("svg[role=img]")].every((svg) =>
            (svg.getAttribute("aria-labelledby") || "")
              .split(" ")
              .every((id) => !!document.getElementById(id)?.textContent),
          ),
        );
        assert(semantics);
        await fig.screenshot({ path: artifact(id + "-" + theme + ".png") });
      }
    }
    for (const width of [390, 700, 1500]) {
      await page.setViewportSize({ width, height: 900 });
      const size = await help
        .locator("html")
        .evaluate((el) => ({ w: el.scrollWidth, v: innerWidth }));
      assert(size.w <= size.v);
      assert.equal(await help.locator("figure image").count(), 0);
    }
    const frame = page.frames().find((f) => f.url().includes("/hilfe/"));
    await frame.addScriptTag({ content: require("axe-core").source });
    const violations = await frame.evaluate(async () =>
      (
        await axe.run(".wiki-figure", {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(violations, []);
    await page.keyboard.press("Escape");
    console.log(
      "PASS thirteen inline HTML/SVG handbook figures, meaningful names/captions, light/dark screenshots, narrow layout, axe and lazy help loading without external image assets",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
