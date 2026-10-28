const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    const before = await page.evaluate(() => ({
      p: JSON.stringify(p),
      revision,
      savedRevision,
      history: history.length,
    }));
    assert.equal(
      await page.locator("[data-format-enabled]:checked").count(),
      2,
    );
    const first = page.locator('[data-format="0"]');
    await first.locator("[data-format-key=w]").fill("1200");
    await page.locator("#setupSafeFields [data-format-key=left]").fill("160");
    const stable = await first.evaluate((el) => {
      window.testFormatNode = el;
      return true;
    });
    assert(stable);
    await page.locator("#addFormat").click();
    assert(
      await first.evaluate((el) => el === window.testFormatNode),
      "Adding preserves existing row nodes",
    );
    assert.equal(
      await first.locator("[data-format-key=w]").inputValue(),
      "1200",
    );
    assert(
      await page
        .locator('[data-format="4"] [data-format-key=w]')
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator('[data-format="4"] [data-format-remove]').click();
    assert.equal(await page.locator("[data-format]").count(), 4);
    await first.locator("[data-format-detail]").click();
    assert.equal(
      await page
        .locator("#setupSafeFields [data-format-key=left]")
        .inputValue(),
      "160",
    );
    await page.locator("#setupName").fill("Musik im Herbst");
    await page.locator("#setupCode").fill("E2");
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#cw").fill("1000");
    await page.locator("#cn").fill("7");
    await page.locator("#ct").fill("120");
    await page.locator("#designerTemplateStart").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.locator("#templateProjectName").fill("Herbst aus Vorlage");
    await page.locator("#closeTemplateGallery").click();
    await page.waitForFunction(
      () => document.querySelector("#setupName").value === "Herbst aus Vorlage",
    );
    assert.equal(
      await page.locator("#setupName").inputValue(),
      "Herbst aus Vorlage",
    );
    assert.equal(await page.locator("#cw").inputValue(), "1000");
    assert.equal(await page.locator("#cn").inputValue(), "7");
    assert.equal(await page.locator("#ct").inputValue(), "120");
    await page.locator("[data-project-mode=post]").click();
    assert.equal(
      await first.locator("[data-format-key=w]").inputValue(),
      "1200",
    );
    assert.equal(
      await page
        .locator("#setupSafeFields [data-format-key=left]")
        .inputValue(),
      "160",
    );
    const third = page.locator('[data-format="2"]');
    await third.locator("[data-format-detail]").click();
    assert.equal(
      await third.locator("[data-format-enabled]").isChecked(),
      false,
      "Details do not select",
    );
    await third.locator("[data-format-enabled]").check();
    await page.locator("#setupSafeFields [data-format-key=top]").fill("123");
    await third.locator("[data-format-enabled]").uncheck();
    await third.locator("[data-format-enabled]").check();
    assert.equal(
      await page.locator("#setupSafeFields [data-format-key=top]").inputValue(),
      "123",
    );
    await third.locator("[data-format-enabled]").uncheck();
    for (const theme of ["light", "dark"])
      for (const colour of [
        "normal",
        "complementary",
        "analogous",
        "triadic",
      ]) {
        await page.evaluate(
          ([theme, colour]) => {
            studioSetTheme(theme);
            studioPreferences.colourMode = colour;
            studioApplyColourTheme();
          },
          [theme, colour],
        );
        for (const size of [
          { width: 1500, height: 1050 },
          { width: 1024, height: 768 },
          { width: 700, height: 500 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(size);
          const geometry = await page
            .locator("#projectSetup")
            .evaluate((el) => {
              const r = el.getBoundingClientRect(),
                b = el.querySelector("#createProject").getBoundingClientRect(),
                c = el.querySelector(".new-project-content");
              return {
                over:
                  el.scrollWidth > el.clientWidth + 1 ||
                  c.scrollWidth > c.clientWidth + 1,
                footer: b.bottom <= r.bottom && b.top >= r.top,
              };
            });
          assert(
            !geometry.over,
            JSON.stringify({ theme, colour, size, geometry }),
          );
          assert(geometry.footer);
        }
      }
    await page.setViewportSize({ width: 1500, height: 1050 });
    await page.evaluate(() => studioSetTheme("light"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(350);
    await page.screenshot({ path: artifact("new-project-fd-light.png") });
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const axe = await page.evaluate(async () =>
      (
        await axe.run("#projectSetup", {
          rules: { region: { enabled: false } },
        })
      ).violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    );
    assert.deepEqual(axe, []);
    await page.screenshot({ path: artifact("new-project-fd-light.png") });
    await page.locator("[data-project-mode=carousel]").click();
    await page.screenshot({ path: artifact("new-project-designer-light.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: artifact("new-project-designer-mobile.png"),
    });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.screenshot({
      path: artifact("new-project-designer-dark-mobile.png"),
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.keyboard.press("Escape");
    assert(
      await page
        .locator("#startNew")
        .evaluate((el) => el === document.activeElement),
    );
    assert.deepEqual(
      await page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        savedRevision,
        history: history.length,
      })),
      before,
    );
    await page.setViewportSize({ width: 1500, height: 1050 });
    await page.locator("#startNew").click();
    assert.equal(await page.locator("#cw").inputValue(), "1080");
    assert.equal(await page.locator("#cn").inputValue(), "4");
    assert.equal(
      await first.locator("[data-format-key=w]").inputValue(),
      "1080",
    );
    assert.equal(await page.locator("#setupName").inputValue(), "");
    await page.locator("#createProject").click();
    assert.equal(
      await page.locator("#setupName").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#setupName").fill("Prüfung");
    await page.locator("#setupSafeFields [data-format-key=top]").fill("");
    assert.equal(
      await page
        .locator("#setupSafeFields [data-format-key=top]")
        .getAttribute("aria-invalid"),
      "true",
    );
    assert.notEqual(
      await first.locator("[data-format-key=w]").getAttribute("aria-invalid"),
      "true",
    );
    const preview = await page
      .locator("#carouselSafePreview")
      .getAttribute("style");
    await page.locator("#setupSafeFields [data-format-key=top]").fill("-1");
    assert.equal(
      await page.locator("#carouselSafePreview").getAttribute("style"),
      preview,
    );
    await page.locator("#setupSafeFields [data-format-key=top]").fill("200");
    await page.locator("#addFormat").click();
    await page.locator('[data-format="3"] [data-format-enabled]').check();
    await page.locator("#createProject").click();
    assert.match(
      await page.locator('[data-format="3"] .format-feedback').textContent(),
      /mehrfach/,
    );
    await page.locator('[data-format="4"] [data-format-remove]').click();
    for (const input of await page.locator("[data-format-enabled]").all())
      await input.uncheck();
    await page.locator("#createProject").click();
    assert.match(
      await page.locator("#setupError").textContent(),
      /mindestens ein Format/,
    );
    await page.locator("[data-project-mode=carousel]").click();
    for (const value of ["0", "21", "1.5", ""]) {
      await page.locator("#cn").fill(value);
      await page.locator("#createProject").click();
      assert(await page.locator("#projectSetup").isVisible());
      assert.match(await page.locator("#setupError").textContent(), /1–20/);
    }
    await page.locator("#cn").fill("1");
    assert(await page.locator("#setupSlideMinus").isDisabled());
    await page.locator("#setupSlidePlus").click();
    assert.equal(await page.locator("#cn").inputValue(), "2");
    await page.locator("#cn").fill("20");
    assert(await page.locator("#setupSlidePlus").isDisabled());
    await page.locator("#cn").fill("1");
    await page.evaluate(() => {
      window.originalNewDocument = carouselNewDocument;
      window.newDocumentCalls = 0;
      carouselNewDocument = async (...args) => {
        newDocumentCalls++;
        await new Promise(
          (resolve, reject) =>
            (window.releaseNewDocument = { resolve, reject }),
        );
        return originalNewDocument(...args);
      };
    });
    await page.locator("#createProject").click();
    assert(await page.locator("#cancelSetup").isDisabled());
    assert(await page.locator("#setupError.studio-loading").isVisible());
    await page.evaluate(() =>
      document.querySelector("#createProject").onclick(),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.newDocumentCalls), 1);
    assert.deepEqual(
      await page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        savedRevision,
        history: history.length,
      })),
      before,
    );
    await page.evaluate(() =>
      releaseNewDocument.reject(Error("Logo nicht verfügbar")),
    );
    await page.waitForFunction(
      () => !document.querySelector("#createProject").disabled,
    );
    assert.match(
      await page.locator("#setupError").textContent(),
      /Logo nicht verfügbar/,
    );
    assert(await page.locator("#projectSetup").isVisible());
    assert.deepEqual(
      await page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        savedRevision,
        history: history.length,
      })),
      before,
    );
    await page.evaluate(() => {
      carouselNewDocument = originalNewDocument;
      window.originalStoreSave = MKWProjectStore.save;
      MKWProjectStore.save = async (...args) => {
        window.projectBackupPending = true;
        await new Promise((resolve) => (window.releaseProjectBackup = resolve));
        return originalStoreSave(...args);
      };
    });
    await page.locator("#createProject").click();
    await page.waitForFunction(() => window.projectBackupPending);
    assert.equal(
      await page.evaluate(() => busy),
      true,
      "Creation stays busy until its initial browser backup completes",
    );
    assert(await page.locator("#projectSetup").isVisible());
    assert(await page.locator("#createProject").isDisabled());
    await page.evaluate(() => {
      MKWProjectStore.save = originalStoreSave;
      releaseProjectBackup();
    });
    await page.waitForFunction(
      () =>
        p.carousel?.n === 1 &&
        !busy &&
        !document.querySelector("#projectSetup").open,
    );
    const created = await page.evaluate(async () => {
      const records = await MKWProjectStore.list();
      return {
        bg: p.carousel.bg,
        count: p.boards.length,
        logo: p.carousel.objects[0].w,
        stored: records.some((r) => r.id === p.projectId),
        formats: p.carousel.objects.length,
      };
    });
    assert.deepEqual(created, {
      bg: "#ffffff",
      count: 1,
      logo: 600,
      stored: true,
      formats: 1,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS new project draft isolation, independent format/details, defaults, template return, 32 theme/viewports, axe, validation, stable previews, single flight, preparation failure, creation and browser backup",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
