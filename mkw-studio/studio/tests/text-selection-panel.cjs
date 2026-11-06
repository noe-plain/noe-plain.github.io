const assert = require("node:assert/strict");
const {
  launch,
  artifact,
  waitForProjectReady,
  selectTextScope,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Gemeinsames Textbedienfeld");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() =>
      carouselObject("text", {
        text: "Alpha eins zwei drei vier fünf sechs\nBeta bleibt unverändert\nGamma bleibt auswählbar",
        font: "Arial",
        size: 50,
        color: "#111111",
        x: 100,
        y: 300,
        w: 420,
        h: 700,
      }),
    );
    assert.equal(
      await page.locator(".typography-inspector [role=tablist]").count(),
      0,
    );
    assert(await page.locator("[data-typo=font]").isVisible());
    assert(await page.locator("[data-typo=spaceAfter]").isVisible());
    assert(await page.locator("[data-line-selection]").isVisible());
    await selectTextScope(page, "[data-paragraph-selection]", ["0", "2"]);
    await page.locator("[data-typo=font]").selectOption("Georgia");
    await page.locator("[data-typo=size]").fill("80");
    assert.deepEqual(
      await page.evaluate(() => {
        const o = carouselSelected()[0];
        return [
          o.textStyles?.[0]?.size,
          o.textStyles?.[1]?.size ?? null,
          o.textStyles?.[2]?.size,
        ];
      }),
      [80, null, 80],
    );
    assert(
      await page.evaluate(() => {
        const o = carouselSelected()[0];
        return MKWTextScope.values(
          o,
          MKWTextScope.resolve(o, { paragraphs: [1] }),
          "font",
        ).every((v) => v === "Arial");
      }),
    );
    await selectTextScope(page, "[data-line-selection]", ["0:0"]);
    const line = await page.evaluate(() => {
      const l = carouselTextLayout(carouselSelected()[0]).lines.find(
        (l) => l.paragraph === 0 && l.index === 0,
      );
      return { start: l.start, end: l.end };
    });
    await page.locator("[data-typo-toggle=underline]").click();
    assert(
      await page.evaluate((l) => {
        const o = carouselSelected()[0];
        return (
          MKWText.at(o, l.start).underline === true &&
          MKWText.at(o, l.end + 1).underline !== true
        );
      }, line),
    );
    await page.locator("[data-typo=size]").fill("88");
    await page.locator("[data-typo=size]").fill("92");
    assert(
      await page.evaluate((l) => {
        const o = carouselSelected()[0];
        return (
          MKWText.at(o, l.start).size === 92 &&
          MKWText.at(o, l.end - 1).size === 92 &&
          MKWText.at(o, l.end + 1).size !== 92
        );
      }, line),
    );
    const natural = await page.evaluate(() => {
      const l = carouselTextLayout(carouselSelected()[0]).lines[0];
      return Math.max(l.size, ...l.runs.map((r) => r.size));
    });
    await page.locator("[data-typo=lineHeight]").fill("150");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].textStyles[0].leading[0]),
      natural * 1.5,
    );
    assert.equal(
      await page.evaluate(
        () => carouselSelected()[0].textStyles[0].lineHeight ?? null,
      ),
      null,
    );
    await page.locator("[data-prop=text]").evaluate((el) => {
      el.focus();
      el.setSelectionRange(2, 5);
      el.dispatchEvent(new Event("select"));
    });
    const before = await page.evaluate(() => {
      const o = carouselSelected()[0];
      return Array.from({ length: o.text.length }, (_, i) => MKWText.at(o, i));
    });
    await page.locator("[data-typo=size]").fill("93");
    assert(await page.locator("[data-typo-align=right]").isDisabled());
    assert(await page.locator("[data-typo=spaceAfter]").isDisabled());
    await page.locator("[data-typo-colour]").click();
    await page.locator("#paintHex").fill("#cc2200");
    await page.keyboard.press("Escape");
    const after = await page.evaluate(() => {
      const o = carouselSelected()[0];
      return Array.from({ length: o.text.length }, (_, i) => MKWText.at(o, i));
    });
    for (let i = 0; i < after.length; i++) {
      if (i >= 2 && i < 5) {
        assert.equal(after[i].size, 93);
        assert.equal(after[i].color, "#cc2200");
      } else
        assert.deepEqual(
          after[i],
          before[i],
          "Only directly selected characters change at " + i,
        );
    }
    await selectTextScope(page, "[data-paragraph-selection]", ["1"]);
    assert(await page.locator("[data-typo-align=right]").isEnabled());
    await page.locator("[data-typo-align=right]").click();
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].textStyles[1].align),
      "right",
    );
    await selectTextScope(page, "[data-paragraph-selection]", []);
    assert(await page.locator("[data-typo=size]").isDisabled());
    assert(await page.locator("[data-typo=font]").isDisabled());
    await page.locator("[data-paragraph-all]").click();
    await page.evaluate(() => {
      studioPreferences.inspectorWidth = 450;
      studioApplyPreferences();
    });
    await page.locator(".paragraph-scope").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: artifact("text-panel-unified-designer.png"),
    });
    const doc = await page.evaluate(async () => {
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(q);
      validateCarousel(q);
      return q.carousel.objects.find((o) => o.type === "text").text;
    });
    assert.match(doc, /Beta bleibt/);
    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=post]").click();
    await page.locator("#setupName").fill("FD Textauswahl");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(async () => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(320, 400),
        blob = await new Promise((r) => c.toBlob(r));
      await importFiles([new File([blob], "Text.png", { type: "image/png" })]);
      selected = p.boards[0].id;
      chooseStep("text");
    });
    await page
      .locator("#mainTextInput")
      .fill("Erster Absatz\nZweiter Absatz\nDritter Absatz");
    await selectTextScope(page, "[data-paragraph-selection]", ["0", "2"]);
    await page.locator("[data-typo=size]").fill("90");
    assert.deepEqual(
      await page.evaluate(() =>
        board().elements.title.textStyles.map((s) => s?.size ?? null),
      ),
      [90, null, 90],
    );
    await page.locator("[data-post-text]").evaluate((el) => {
      el.focus();
      el.setSelectionRange(1, 4);
      el.dispatchEvent(new Event("select"));
    });
    await page.locator("[data-typo=size]").fill("110");
    assert(await page.locator("[data-typo-align=right]").isDisabled());
    assert(
      await page.evaluate(() => {
        const o = board().elements.title;
        return (
          MKWText.at(o, 1).size === 110 &&
          MKWText.at(o, 0).size !== 110 &&
          o.textStyles[0].size === 90 &&
          o.textStyles[2].size === 90
        );
      }),
    );
    await selectTextScope(page, "[data-paragraph-selection]", ["1"]);
    await page.locator("[data-typo=size]").fill("77");
    assert.equal(
      await page.evaluate(() => board().elements.title.textStyles[1].size),
      77,
    );
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator(".paragraph-scope").scrollIntoViewIfNeeded();
    await page.screenshot({ path: artifact("text-panel-unified-fd-ipad.png") });
    assert.equal(
      await page.locator(".typography-inspector [role=tablist]").count(),
      0,
    );
    assert(await page.locator("[data-typo=spaceAfter]").isVisible());
    const titleLayout = () => page.evaluate(() => MKWTypography.postLayout({text:"Mixed Case",role:"Arial",size:40,color:"#111111",align:"left",key:"title"},300,1).lines[0].text);
    const beforeDate = await titleLayout();
    await page.locator("#textLayer").selectOption("date");
    assert.equal(await titleLayout(),beforeDate,"Inspecting the date must never change title rendering");
    assert.equal(beforeDate,"Mixed Case");
    assert.deepEqual(errors, []);
    console.log(
      "PASS merged panel, scoped paragraphs/lines, direct selection priority/font size/colour, paragraph protection, empty scope and file roundtrip",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
