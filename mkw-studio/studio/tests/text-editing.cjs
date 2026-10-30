const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  const errors = [];
  const settle = async (page) =>
    page.evaluate(async () => {
      await document.fonts.ready;
      await draw();
      await carouselWaitForPaint();
      while (drawing || drawAgain) await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  const audit = async (page, selector) => {
    await page.waitForFunction(
      () =>
        !document.documentElement.classList.contains("studio-theme-changing"),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addScriptTag({ content: require("axe-core").source });
    const violations = await page.evaluate(
      async (selector) =>
        (
          await axe.run(
            { include: [[selector]] },
            {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            },
          )
        ).violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      selector,
    );
    assert.deepEqual(violations, []);
  };
  try {
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      console.log("Text workflow loaded:", mode);
      await page
        .locator(mode === "post" ? "#startNew" : "#startDesigner")
        .click();
      await page.locator("#setupName").fill("Texte gemeinsam bearbeiten");
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate(async (mode) => {
        if (mode === "post") {
          MKWSubject.detect = async () => [];
          const c = makeCanvas(640, 800);
          c.getContext("2d").fillRect(0, 0, 640, 800);
          const blob = await new Promise((r) => c.toBlob(r));
          await importFiles([
            new File([blob], "Konzert.png", { type: "image/png" }),
            new File([blob], "Zweites.png", { type: "image/png" }),
          ]);
          selected = p.boards[0].id;
          chooseStep("text");
          setSharedText(
            p.boards[0],
            "title",
            "Musik erleben\nGemeinsam entdecken",
          );
          renderPanel();
        } else
          carouselObject("text", {
            text: "Musik erleben\nGemeinsam entdecken",
            x: 100,
            y: 200,
            w: 800,
            h: 500,
            size: 90,
            color: "#172238",
          });
      }, mode);
      const panel = mode === "post" ? "#stepPanel" : "#carouselProperties";
      for (const advanced of [false, true]) {
        console.log("Text workflow:", mode, advanced ? "advanced" : "simple");
        await page.evaluate((v) => {
          studioPreferences.advanced = v;
          studioApplyPreferences();
          if (p.carousel) carouselPanel();
          else renderPanel();
        }, advanced);
        const field = page.locator(panel + " .text-content-editor textarea");
        const action = () => page.locator(panel + " [data-text-edit-action]");
        assert.equal(await field.count(), 1);
        assert.equal(await action().getAttribute("aria-pressed"), "false");
        assert(await action().isEnabled());
        await settle(page);
        const before = await page.evaluate(() => ({
          document: JSON.stringify(p),
          view: [
            document.querySelector(
              p.carousel ? "#carouselViewport" : "#workspace",
            ).scrollLeft,
            document.querySelector(
              p.carousel ? "#carouselViewport" : "#workspace",
            ).scrollTop,
          ],
          pixels: p.carousel
            ? $("#carouselCanvas").toDataURL()
            : [...document.querySelectorAll(".board-card canvas")].map((c) =>
                c.toDataURL(),
              ),
        }));
        await action().focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() =>
          p.carousel ? !!carouselUI.editing : !!editingText,
        );
        assert.equal(await action().getAttribute("aria-pressed"), "true");
        assert.equal(await action().textContent(), "Fertig");
        await settle(page);
        assert.equal(
          await page.evaluate(() => JSON.stringify(p)),
          before.document,
          "Entering text editing is not a document mutation",
        );
        const activeView = await page.evaluate(() => {
          const v = document.querySelector(
            p.carousel ? "#carouselViewport" : "#workspace",
          );
          return [v.scrollLeft, v.scrollTop];
        });
        assert.deepEqual(
          activeView,
          before.view,
          "Entering editing retains viewport",
        );
        const pixels = await page.evaluate(() =>
          p.carousel
            ? $("#carouselCanvas").toDataURL()
            : [...document.querySelectorAll(".board-card canvas")].map((c) =>
                c.toDataURL(),
              ),
        );
        assert.deepEqual(
          pixels,
          before.pixels,
          "Direct edit retains exact canvas artwork",
        );
        await action().click();
        assert(
          await page.evaluate(() =>
            p.carousel ? !carouselUI.editing : !editingText,
          ),
          "Fertig ends instead of reopening direct edit",
        );
        assert.equal(await action().getAttribute("aria-pressed"), "false");
        assert(
          await action().evaluate((el) => document.activeElement === el),
          "Finish returns keyboard focus to the command",
        );
        await action().click();
        await page.keyboard.press("Escape");
        assert(
          await page.evaluate(() =>
            p.carousel ? !carouselUI.editing : !editingText,
          ),
        );
        await field.fill("Musik verbindet\nNeue Begegnungen");
        assert.equal(
          await page.evaluate(() =>
            p.carousel
              ? carouselSelected()[0].text
              : p.boards.find((b) => b.id === selected).elements.title.text,
          ),
          "Musik verbindet\nNeue Begegnungen",
        );
        if (advanced) {
          await field.focus();
          await field.evaluate((el) => {
            el.setSelectionRange(0, 5);
            el.dispatchEvent(new Event("select"));
          });
          assert.match(
            await page.locator(panel + " [data-typo-scope]").textContent(),
            /5 Zeichen/,
          );
          await action().click();
          assert.deepEqual(
            await page.evaluate(() =>
              carouselEditableSelection(
                p.carousel ? carouselUI.editing.el : editingText.el,
              ),
            ),
            { start: 0, end: 5 },
            "Switching to the canvas preserves the selected source characters",
          );
          await page.locator(panel + " [data-typo=size]").fill("76");
          const styled = await page.evaluate(() =>
            p.carousel
              ? carouselSelected()[0]
              : p.boards.find((b) => b.id === selected).elements.title,
          );
          assert.equal(styled.characterStyles[0].size, 76);
          assert.equal(styled.characterStyles[0].end, 5);
          await page.locator(panel + " [data-typo-tab=paragraph]").click();
          const original = await page.evaluate(() =>
            clone(
              (p.carousel
                ? carouselSelected()[0]
                : p.boards.find((b) => b.id === selected).elements.title
              ).textStyles || [],
            ),
          );
          const gap = page.locator(panel + " [data-typo=spaceAfter]");
          await gap.focus();
          await gap.fill("1");
          await gap.fill("12");
          await gap.fill("24");
          await gap.blur();
          await page.evaluate(() => undo());
          assert.deepEqual(
            await page.evaluate(
              () =>
                (p.carousel
                  ? carouselSelected()[0]
                  : p.boards.find((b) => b.id === selected).elements.title
                ).textStyles || [],
            ),
            original,
            "One undo restores the whole numeric paragraph input session",
          );
        }
        assert(
          await page.evaluate(() => {
            const ids = [...document.querySelectorAll('[id^="typo-"]')].map(
              (el) => el.id,
            );
            return new Set(ids).size === ids.length;
          }),
          "Typography tabs have unique IDs across editors",
        );
        await audit(page, panel);
        await page.evaluate(() => {
          const s = document.querySelector(
            p.carousel ? "#carouselProperties" : "#toolsSidebar",
          );
          s.scrollTop = 0;
        });
        await page.screenshot({
          path: artifact(
            `text-editing-${mode}-${advanced ? "advanced" : "simple"}.png`,
          ),
        });
      }
      if (mode === "post") {
        await page.evaluate(() => {
          studioPreferences.advanced = false;
          studioApplyPreferences();
          selected = p.boards.find((b) => b.imageId === p.images[1].id).id;
          chooseStep("text");
        });
        await page.locator("#mainTextInput").fill("Eigener Konzerttitel");
        assert(await page.locator("#resetText").isVisible());
        await page.locator("#resetText").click();
        assert.equal(
          await page.locator("#mainTextInput").inputValue(),
          await page.evaluate(() => p.boards[0].elements.title.text),
        );
        assert(!(await page.locator("#resetText").isVisible()));
        await page.locator("#textVisible").uncheck();
        assert(await actionFor(page, panel).isDisabled());
        await page.locator("#textVisible").check();
        assert(await actionFor(page, panel).isEnabled());
      } else {
        await page.evaluate(() => {
          carouselSelected()[0].locked = true;
          carouselPanel();
        });
        assert(await actionFor(page, panel).isDisabled());
        assert(await page.locator("[data-prop=text]").isDisabled());
        await page.evaluate(() => {
          carouselSelected()[0].locked = false;
          carouselPanel();
        });
      }
      const emptyField = page.locator(panel + " .text-content-editor textarea");
      await emptyField.fill("");
      await actionFor(page, panel).click();
      await page.waitForFunction(() =>
        p.carousel ? !!carouselUI.editing : !!editingText,
      );
      await page.keyboard.insertText("Konzert 🎵");
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() =>
          p.carousel
            ? carouselSelected()[0].text
            : p.boards.find((b) => b.id === selected).elements.title.text,
        ),
        "Konzert 🎵",
        "Empty text can be edited directly without losing Unicode",
      );
      await page.evaluate(() => {
        studioSetTheme("dark");
      });
      await page.waitForFunction(
        () =>
          !document.documentElement.classList.contains("studio-theme-changing"),
      );
      await audit(page, panel);
      await page.setViewportSize({ width: 390, height: 850 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const toggle = page.locator("#toolsToggle");
      if ((await toggle.getAttribute("aria-expanded")) !== "true")
        await toggle.click();
      await page.evaluate(() => {
        const s = document.querySelector(
          p.carousel ? "#carouselProperties" : "#toolsSidebar",
        );
        s.scrollTop = 0;
      });
      assert(await actionFor(page, panel).isVisible());
      assert(
        await actionFor(page, panel).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.width >= 44 && r.height >= 44;
        }),
      );
      await page.screenshot({
        path: artifact(`text-editing-${mode}-narrow-dark.png`),
      });
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS shared text content/direct edit in both editors and simple/advanced; start/finish/Escape/focus, exact document/canvas/view isolation, input/range formatting, grouped paragraph undo, inheritance reset, hidden/locked states, axe, narrow dark UI",
    );
  } finally {
    await browser.close();
  }
  function actionFor(page, panel) {
    return page.locator(panel + " [data-text-edit-action]");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
