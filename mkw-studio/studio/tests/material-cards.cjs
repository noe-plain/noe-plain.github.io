const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Material Bildkarten");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy);
    await page.evaluate(async () => {
      const c = makeCanvas(800, 1000),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#856858";
      ctx.fillRect(0, 0, 800, 1000);
      const data = c.toDataURL();
      p.images = [1, 2].map((n) => ({
        id: uid(),
        name:
          n === 1
            ? "260901_Konzertprobe.png"
            : "Eine-lange-Bildbeschreibung-zum-Konzert.png",
        data,
        original: data,
        width: 800,
        height: 1000,
      }));
      p.boards = p.images.flatMap((im) =>
        p.formats.map((f) => createBoard(im, f.w, f.h)),
      );
      selected = p.boards[0].id;
      render();
      await Promise.all(p.boards.map(prepareLogo));
      postFitRow();
    });
    const first = page.locator(".image-info-card").first(),
      picker = first.locator("details"),
      summary = picker.locator("summary");
    await summary.focus();
    await page.keyboard.press("Space");
    assert(await picker.evaluate((el) => el.open));
    await page.waitForFunction(() => sponsorGroupsLoaded && !sponsorLoading);
    await page.keyboard.press("Escape");
    assert(!(await picker.evaluate((el) => el.open)));
    assert(await summary.evaluate((el) => el === document.activeElement));
    const original = await page.evaluate(() => ({
      boards: JSON.stringify(p.boards),
      meta: JSON.stringify(p.meta),
      revision,
      undo: history.length,
    }));
    for (const theme of ["light", "dark"])
      for (const mode of ["normal", "complementary"]) {
        await page.locator("#settings").click();
        await page.locator(`[data-theme-choice="${theme}"]`).click();
        await page.locator(`[data-colour-mode="${mode}"]`).click();
        await page.locator("#closeSettings").click();
        await summary.click();
        const geometry = await first.evaluate((card) => {
          const details = card.querySelector("details"),
            rows = [...details.querySelectorAll(".post-option-row")],
            hex = (v) =>
              "#" +
              v
                .match(/\d+/g)
                .slice(0, 3)
                .map((n) => (+n).toString(16).padStart(2, "0"))
                .join(""),
            checked = rows.find((r) => r.querySelector("input").checked),
            s = getComputedStyle(checked);
          return {
            width: card.getBoundingClientRect().width,
            overflow: card.scrollWidth > card.clientWidth + 1,
            titleAlign: getComputedStyle(card.querySelector("strong"))
              .textAlign,
            actions: [...card.querySelectorAll("[data-action]")].map((b) => ({
              name: b.dataset.action,
              height: b.getBoundingClientRect().height,
            })),
            rows: rows.map((r) => ({
              height: r.getBoundingClientRect().height,
              padding: getComputedStyle(r).paddingLeft,
              checkbox: r.querySelector("input").getBoundingClientRect().width,
            })),
            angleLabel: details
              .querySelector(".post-option-label")
              .getBoundingClientRect().width,
            contrast: MKWUIColor.contrast(hex(s.color), hex(s.backgroundColor)),
            dividers: details.querySelectorAll(".post-options-divider").length,
          };
        });
        assert.equal(geometry.width, 230);
        assert.equal(geometry.overflow, false);
        assert.equal(geometry.titleAlign, "left");
        assert.equal(geometry.dividers, 2);
        assert.equal(geometry.rows.length, 6);
        assert(
          geometry.rows.every(
            (r) => r.height === 48 && r.padding === "12px" && r.checkbox === 18,
          ),
        );
        assert(geometry.angleLabel >= 40);
        assert(geometry.actions.every((b) => b.height >= 48));
        assert(geometry.contrast >= 4.5);
        const format = first.locator('[data-action="addBoard"]');
        assert.equal(await format.innerText(), "Format hinzufügen");
        assert((await format.boundingBox()).width > 170);
        assert(await first.locator(".template-badge").isVisible());
        assert.equal(
          await page
            .locator(".image-info-card")
            .last()
            .locator(".template-badge")
            .count(),
          0,
        );
        await page.screenshot({
          animations: "disabled",
          path: artifact(`material-cards-${theme}-${mode}.png`),
        });
        await summary.focus();
        await page.keyboard.press("Escape");
      }
    assert.deepEqual(
      await page.evaluate(() => ({
        boards: JSON.stringify(p.boards),
        meta: JSON.stringify(p.meta),
        revision,
        undo: history.length,
      })),
      original,
      "UI colours/disclosure must not change document or history",
    );
    await page.locator("#settings").click();
    await page.locator("#settings-tab-workflow").click();await page.locator('[data-ui-density="compact"]').click();
    await page.locator("#closeSettings").click();
    await summary.click();
    assert(await picker.locator('[data-text-type="title"]').isVisible());
    await page.setViewportSize({ width: 420, height: 850 });
    await summary.scrollIntoViewIfNeeded();
    assert(await first.evaluate((c) => c.scrollWidth <= c.clientWidth + 1));
    assert(await first.locator('[data-action="addBoard"]').isVisible());
    await page.screenshot({
      animations: "disabled",
      path: artifact("material-cards-compact-mobile.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS outlined FD cards, full-width actions, equal 48px option rows/checkbox alignment, angle target, first-image badge, both colour modes/themes, native keyboard disclosure, compact/mobile overflow and document/history isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
