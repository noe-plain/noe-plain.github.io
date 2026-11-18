const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const results = [];
    for (const mode of ["designer", "campaign", "post"]) {
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page
        .locator(
          {
            designer: "#startDesigner",
            campaign: "#startCampaignPreview",
            post: "#startNew",
          }[mode],
        )
        .click();
      await page.locator("#setupName").fill("Eigene Footer-Prüfung " + mode);
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      if (mode === "campaign")
        await page.evaluate(async () => {
          const c = makeCanvas(64, 64);
          exportContext(c).fillRect(0, 0, 64, 64);
          const data = c.toDataURL(),
            im = {
              id: uid(),
              name: "Eigener Test.png",
              width: 64,
              height: 64,
              data,
              original: data,
            },
            q = {
              ...snapshot(),
              images: [...p.images, im],
              boards: [],
              carousel: undefined,
              campaign: MKWCampaignUI.newState(),
            };
          await MKWCampaignDocument.append(q, im, [basicBoard(im, 600, 750)]);
          await MKWProjects.startDocument(q);
        });
      await page.evaluate(() => {
        MKWProjects.notice("");
        MKWFooterFeedback.report("", "info", "operation");
        studioSetWarnings([]);
        studioCloseWarnings();
      });
      const id = mode === "post" ? "#postNotice" : "#carouselNotice",
        button = page.locator(id);
      const background = () =>
        button.evaluate(async (el) => {
          getComputedStyle(el).backgroundColor;
          await Promise.all(
            el.getAnimations().map((a) => a.finished.catch(() => {})),
          );
          return getComputedStyle(el).backgroundColor;
        });
      const openDetails = async () => {
        if (!(await page.locator("#studioWarnings").isVisible()))
          await button.click();
      };
      await button.waitFor();
      assert(await button.isVisible());
      assert.equal(await button.getAttribute("data-level"), "ok");
      assert(
        await button.evaluate(
          (el) => el.closest(".footer-view-controls").firstElementChild === el,
        ),
      );
      assert.equal(
        await page.locator(".studio-commandbar .studio-notice-button").count(),
        0,
      );
      await openDetails();
      assert(await page.locator("#studioNoMessages").isVisible());
      await page.keyboard.press("Escape");
      assert(await button.evaluate((el) => document.activeElement === el));
      const colours = [];
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => studioSetTheme(t), theme);
        await page.waitForTimeout(500);
        const normal = await background();
        await page.evaluate(() =>
          studioSetWarnings([
            {
              id: "own-fixture",
              title: "Eigener Prüfhinweis",
              message: "Hinweis <b>als Text</b>",
              step: "crop",
            },
          ]),
        );
        assert.equal(await button.getAttribute("data-level"), "warning");
        const warning = await background();
        await openDetails();
        assert.equal(await page.locator("#studioWarningList b").count(), 0);
        assert(
          (await page.locator("#studioWarningList").innerText()).includes(
            "<b>als Text</b>",
          ),
        );
        await page.keyboard.press("Escape");
        await page.evaluate(() =>
          MKWProjects.notice(
            "Eigener Speicherfehler <script> als reiner Text",
            true,
          ),
        );
        assert.equal(await button.getAttribute("data-level"), "error");
        const error = await background();
        assert.notEqual(error, warning);
        assert.notEqual(warning, normal);
        await page.evaluate(() => status("Anderer Vorgang fertig."));
        assert.equal(
          await button.getAttribute("data-level"),
          "error",
          "Unrelated status must not clear a storage failure",
        );
        await openDetails();
        assert(
          (await page.locator("#studioWarnings").innerText()).includes(
            "Eigener Speicherfehler",
          ),
        );
        assert.equal(await page.locator("#studioWarnings script").count(), 0);
        await page.screenshot({
          path: artifact(`footer-message-${mode}-${theme}.png`),
        });
        await page.keyboard.press("Escape");
        await page.evaluate(() => {
          MKWProjects.notice("");
          MKWFooterFeedback.report("", "info", "operation");
          studioSetWarnings([]);
        });
        assert.equal(await button.getAttribute("data-level"), "ok");
        colours.push({ theme, normal, warning, error });
      }
      await page.evaluate(() =>
        status(new Error("Eigener Renderfehler"), "error"),
      );
      assert.equal(await button.getAttribute("data-level"), "error");
      await page.evaluate(() => status("Bereit"));
      assert.equal(await button.getAttribute("data-level"), "ok");
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(100);
      const box = await button.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= 768);
      assert(
        await button.evaluate(
          (el) => el.closest(".footer-view-controls").firstElementChild === el,
        ),
      );
      if (mode === "designer") {
        await page.evaluate(async () => {
          MKWProjects.notice("Fehler aus altem Testprojekt", true);
          const q = fresh();
          q.fonts = [...p.fonts];
          await MKWProjects.startDocument(q);
          studioSetWarnings([]);
        });
        assert(await page.locator("#postNotice").isVisible());
        assert(
          await page
            .locator("#postNotice")
            .evaluate(
              (el) =>
                el.closest(".footer-view-controls").firstElementChild === el,
            ),
        );
        assert.notEqual(
          await page.locator("#postNotice").getAttribute("data-level"),
          "error",
        );
        assert(
          !(await page.locator("#studioWarnings").innerText()).includes(
            "Fehler aus altem Testprojekt",
          ),
        );
      }
      assert.equal(await page.locator("#postNotice").count(), 1);
      assert((await page.locator("#carouselNotice").count()) <= 1);
      assert.deepEqual(errors, []);
      results.push({ mode, colours });
      await page.close();
    }
    fs.writeFileSync(
      artifact("footer-message-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS permanent leftmost right-footer indicator in all modes, neutral/warning/error states, retained storage failures, plain text, details/Escape/focus, project reset and tablet placement",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
