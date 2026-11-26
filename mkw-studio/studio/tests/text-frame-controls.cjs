const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Textausrichtung und Winkel");
    await page.locator("#cw").fill("800");
    await page.locator("#ch").fill("800");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const objects = await page.evaluate(() => {
      p.carousel.objects = [];
      const old = carouselObject("text", {
        x: 100,
        y: 100,
        w: 300,
        h: 250,
        text: "«Alter Absatz»",
        size: 50,
        color: "#172238",
      });
      delete old.opticalAlign;
      const before = JSON.stringify(old),
        next = carouselObject("text", {
          x: 400,
          y: 100,
          w: 300,
          h: 250,
          text: "Neuer Absatz",
          size: 50,
          color: "#172238",
        });
      return {
        old: old.id,
        next: next.id,
        oldUnchanged: JSON.stringify(old) === before,
        oldOptical: old.opticalAlign,
        newOptical: next.opticalAlign,
      };
    });
    assert(objects.oldUnchanged && objects.newOptical);
    assert.equal(objects.oldOptical, undefined);
    assert(await page.locator("[data-typo-optical]").isChecked());
    const row = page.locator("[data-typo-anchor-row]");
    assert.equal(await row.locator("button").count(), 3);
    assert(
      await row.evaluate(
        (el) =>
          el.previousElementSibling.classList.contains("type-alignment") &&
          !!el.closest("[data-typo-page=paragraph]"),
      ),
    );
    assert.deepEqual(await row.locator("button").allTextContents(), [
      "",
      "",
      "",
    ]);
    assert(await row.locator("button").evaluateAll((buttons) => buttons.every((button) => button.getBoundingClientRect().height >= 44)));
    await row.locator("[data-text-anchor=bottom]").click();
    assert(
      (await row
        .locator("[data-text-anchor=bottom]")
        .getAttribute("aria-pressed")) === "true",
    );
    assert(
      await page.evaluate(() => {
        const o = carouselSelected()[0];
        return (
          o.textAnchor === "bottom" && o.y === 100 && carouselTextOffset(o) > 0
        );
      }),
    );
    await page.locator("#undo").click();
    await page.waitForFunction(
      () => carouselSelected()[0]?.textAnchor === "top",
    );
    await page.locator("#redo").click();
    await page.waitForFunction(
      () => carouselSelected()[0]?.textAnchor === "bottom",
    );
    await page.evaluate((ids) => {
      carouselSelect([ids.old, ids.next]);
    }, objects);
    await page.locator("[data-text-anchor=center]").click();
    assert(
      await page.evaluate(
        (ids) =>
          ids.every(
            (id) =>
              p.carousel.objects.find((o) => o.id === id).textAnchor ===
              "center",
          ),
        [objects.old, objects.next],
      ),
    );
    await page.evaluate((id) => {
      carouselSelect([id]);
      carouselSelected()[0].locked = true;
      carouselPanel();
    }, objects.next);
    assert.equal(await page.locator("[data-text-anchor]:disabled").count(), 3);
    await page.evaluate((id) => {
      p.carousel.objects.find((o) => o.id === id).locked = false;
      carouselSelect([id]);
    }, objects.next);
    await page.locator("[data-typo-anchor-row]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: artifact("text-alignment-controls.png") });
    const round = await page.evaluate(async (ids) => {
      const packet = await MKWProjectFile.encodeZip(snapshot());
      const restored = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(packet),
      );
      validate(restored);
      validateCarousel(restored);
      await MKWProjects.startDocument(restored);
      return {
        old: p.carousel.objects.find((o) => o.id === ids.old).opticalAlign,
        next: p.carousel.objects.find((o) => o.id === ids.next).opticalAlign,
        anchor: p.carousel.objects.find((o) => o.id === ids.old).textAnchor,
      };
    }, objects);
    assert.equal(round.old, undefined);
    assert.equal(round.next, true);
    assert.equal(round.anchor, "center");
    await page.evaluate(() => {
      carouselUI.snap = false;
      carouselSetZoom(0.7);
      carouselCenter();
    });
    async function angle(w, h, reverse = false) {
      await page.evaluate(() => carouselSelect([]));
      await page.locator("[data-tool=angle]").click();
      const points = await page.evaluate(
        ({ w, h, reverse }) => {
          const r = carouselOrigin();
          let a = { x: 180, y: 420 },
            b = { x: 180 + w, y: 420 + h };
          if (reverse) [a, b] = [b, a];
          return [a, b].map((pt) => [
            r.left + pt.x * carouselZoom,
            r.top + pt.y * carouselZoom,
          ]);
        },
        { w, h, reverse },
      );
      await page.mouse.move(...points[0]);
      await page.mouse.down();
      await page.mouse.move(...points[1], { steps: 5 });
      const hint = await page.locator(".carousel-angle-draft").innerText();
      await page.mouse.up();
      return {
        hint,
        value: await page.evaluate(() => ({
          direction: carouselSelected()[0].direction,
          w: carouselSelected()[0].w,
          h: carouselSelected()[0].h,
        })),
      };
    }
    const wide = await angle(300, 100);
    assert.equal(wide.value.direction, "down");
    assert.match(wide.hint, /unten/);
    assert(Math.abs(wide.value.w / wide.value.h - 3) < 0.1);
    const tall = await angle(100, 260);
    assert.equal(tall.value.direction, "left");
    assert.match(tall.hint, /links/);
    const reversed = await angle(300, 100, true);
    assert.equal(reversed.value.direction, "down");
    await page.locator("[data-prop=direction]").selectOption("up");
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].direction),
      "up",
    );
    const beforeCount = await page.evaluate(() => p.carousel.objects.length);
    await page.locator("[data-tool=angle]").click();
    const start = await page.evaluate(() => {
      const r = carouselOrigin();
      return [r.left + 200 * carouselZoom, r.top + 400 * carouselZoom];
    });
    await page.mouse.move(...start);
    await page.mouse.down();
    await page.mouse.move(start[0] + 50, start[1] + 100);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(
      await page.evaluate(() => p.carousel.objects.length),
      beforeCount,
    );
    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=preview]").click();
    await page.locator("#setupName").fill("FD-Iconaktionen");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const photo = await page.evaluate(() => {
      const c = makeCanvas(64, 64);
      c.getContext("2d").fillRect(0, 0, 64, 64);
      return c.toDataURL().split(",")[1];
    });
    await page
      .locator("#files")
      .setInputFiles({
        name: "Bild.png",
        mimeType: "image/png",
        buffer: Buffer.from(photo, "base64"),
      });
    await page.waitForFunction(() => p.campaign?.rows.length && !busy);
    await page.evaluate(() => {
      const a = p.carousel.artboards[0];
      carouselObject("text", {
        x: a.x + 100,
        y: a.y + 100,
        w: 400,
        h: 300,
        text: "FD Text",
      });
      carouselSetZoom(0.4);
      MKWCampaignUI.fit();
    });
    assert(await page.locator("[data-typo-optical]").isChecked());
    assert.equal(
      await page.locator("[data-typo-anchor-row] button").count(),
      3,
    );
    await page.locator("[data-text-anchor=bottom]").click();
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].textAnchor),
      "bottom",
    );
    const card = page.locator(".campaign-card").first();
    const summary = card.locator(":scope > details > summary");
    await summary.click();
    await card.locator(".campaign-card-popover:popover-open").waitFor();
    const actions = card.locator(".campaign-icon-action");
    assert((await actions.count()) >= 4);
    for (const button of await actions.all()) {
      assert.equal((await button.innerText()).trim(), "");
      assert(await button.getAttribute("aria-label"));
      assert(
        await button.evaluate(
          (el) => parseFloat(getComputedStyle(el).borderRadius) <= 8,
        ),
      );
    }
    const replace = card
      .locator("[data-campaign-action=replace]")
      .filter({ visible: true });
    await replace.hover();
    await page.waitForTimeout(250);
    assert(!(await page.locator("#studioTooltip").isVisible()));
    await page.locator("#studioTooltip").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#studioTooltip").innerText(),
      "Bild ersetzen",
    );
    await page.screenshot({ path: artifact("campaign-card-icons.png") });
    await page.mouse.move(30, 30);
    await card.locator("[data-campaign-action=format]").focus();
    await page.keyboard.press("Shift+Tab");
    assert(await replace.evaluate((el) => el === document.activeElement));
    await page.locator("#studioTooltip").waitFor({ state: "visible", timeout: 500 });
    assert.equal(await page.locator("#studioTooltip").innerText(), "Bild ersetzen");
    await card.locator("[data-card-close]").click();
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () =>
      (await axe.run("#carouselSidebar")).violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => v.id),
    );
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS shared vertical icon row, single/multiple/locked/undo anchors, new optical defaults and unchanged legacy MKW, drag-based angle directions/manual up/escape, compact named card actions and delayed hint",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
