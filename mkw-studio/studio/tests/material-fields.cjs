const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    const snapshot = await page.evaluate(() => JSON.stringify(p));
    await page.locator("#createProject").click();
    const name = page.locator("#setupName");
    assert.equal(await name.getAttribute("aria-invalid"), "true");
    assert.equal(
      await name.evaluate((el) => el === document.activeElement),
      true,
    );
    assert.match(
      await name.getAttribute("aria-describedby"),
      /studioFieldFeedback/,
    );
    await name.fill("Musik im Herbst");
    assert.notEqual(await name.getAttribute("aria-invalid"), "true");
    const row = page.locator('[data-format="0"]'),
      top = page.locator('#setupSafeFields [data-format-key="top"]');
    await top.fill("1900");
    assert.match(
      await page.locator("#setupSafeFeedback").textContent(),
      /kleiner als die Höhe/,
    );
    assert.equal(await top.getAttribute("aria-invalid"), "true");
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      snapshot,
      "invalid setup never changes the document",
    );
    await top.fill("200");
    assert.equal(await page.locator("#setupSafeFeedback").textContent(), "");
    assert.notEqual(await top.getAttribute("aria-invalid"), "true");
    await page.locator('[data-project-mode="carousel"]').click();
    await page.locator("#cn").fill("21");
    await page.locator("#createProject").click();
    assert.match(
      await page.locator("#carouselCountFeedback").textContent(),
      /1 bis 20/,
    );
    assert.equal(
      await page.locator("#cn").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#cn").fill("1");
    await page.locator("#cl").fill("1000");
    assert.match(
      await page.locator("#setupSafeFeedback").textContent(),
      /kleiner als die Breite/,
    );
    await page.locator("#cl").fill("100");
    assert.equal(
      await page.locator("#setupSafeFeedback").textContent(),
      "",
    );
    await page.locator("#createProject").click();
    await page.waitForFunction(() => p.carousel && !busy);
    await page.evaluate(async () => {
      carouselObject("text", {
        id: "fields-text",
        x: 100,
        y: 220,
        w: 700,
        h: 500,
        text: "Musik im Herbst",
        size: 70,
      });
      await prepareLogo(p.boards[0]);
      await carouselWaitForPaint();
      await autosave();
    });
    const artwork = () =>
      page.evaluate(async () => {
        const b = p.boards[0],
          c = makeCanvas(b.w, b.h);
        await paint(exportContext(c), b, 1, { transparent: false });
        const state = {
          document: JSON.stringify(p),
          revision,
          undo: history.length,
          pixels: c.toDataURL(),
        };
        c.width = c.height = 1;
        return state;
      });
    const before = await artwork();
    await page.locator("#settings").click();
    await page.locator("#settings-tab-fonts").click();
    const size = page.locator('[data-default-text-size="title"]'),
      previous = await page.evaluate(() => studioPreferences.textSizes.title);
    await size.fill("6000");
    await size.press("Tab");
    assert.equal(
      await size.inputValue(),
      "6000",
      "invalid draft stays visible so it can be corrected",
    );
    assert.equal(await size.getAttribute("aria-invalid"), "true");
    assert.equal(
      await page.evaluate(() => studioPreferences.textSizes.title),
      previous,
      "invalid default is never persisted",
    );
    assert.match(
      await page.locator(".studio-field-feedback").textContent(),
      /zwischen 1 und 5000/,
    );
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      await size.focus();
      await size.evaluate((el) =>
        Promise.allSettled(
          el.getAnimations().map((animation) => animation.finished),
        ),
      );
      await page.screenshot({ path: artifact(`material-fields-${theme}.png`) });
      const state = await size.evaluate((el) => {
        const s = getComputedStyle(el),
          hex = document.createElement("span");
        hex.style.color = "var(--md-sys-color-error)";
        el.parentElement.append(hex);
        const error = getComputedStyle(hex).color;
        hex.remove();
        return { border: s.borderTopColor, error, focus: s.boxShadow };
      });
      assert.equal(state.border, state.error);
      assert.notEqual(state.focus, "none");
    }
    await size.fill(String(previous));
    await size.press("Tab");
    assert.notEqual(await size.getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator(".studio-field-feedback").count(), 0);
    await size.fill(String(previous + 0.5));
    await size.press("Tab");
    assert.equal(
      await page.evaluate(() => studioPreferences.textSizes.title),
      previous + 0.5,
      "valid fractional font defaults remain supported",
    );
    await size.fill(String(previous));
    await size.press("Tab");
    await page.locator("#settings-tab-guides").click();
    const columns = page.locator('[data-designer-grid="columns"]');
    await columns.fill("2.5");
    await columns.press("Tab");
    assert.equal(await columns.getAttribute("aria-invalid"), "true");
    await columns.fill("6");
    await columns.press("Tab");
    assert.notEqual(await columns.getAttribute("aria-invalid"), "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await columns.evaluate((el) =>
        getComputedStyle(el)
          .transitionDuration.split(",")
          .every((s) => parseFloat(s) === 0),
      ),
      true,
    );
    await page.locator("#closeSettings").click();
    assert.deepEqual(
      await artwork(),
      before,
      "UI states and invalid preference drafts preserve document/history/export pixels",
    );
    await page.locator("#save").click();
    await page.locator("#saveDate").fill("");
    await page.locator("#saveDate").press("Tab");
    assert.notEqual(
      await page.locator("#saveDate").getAttribute("aria-invalid"),
      "true",
      "concert date stays optional",
    );
    await page.locator("#closeSave").click();
    const beforeLibraryError = await artwork();
    await page.locator("#settings").click();
    await page.locator("#settings-tab-templates").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#templateLibraryList").children.length > 0 &&
        !document.querySelector("#templateLibraryStatus").textContent,
    );
    await page
      .locator("#templateImportFile")
      .setInputFiles({
        name: "Kaputte-Vorlage.mkw",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("not a project"),
      });
    await page.waitForFunction(
      () =>
        document
          .querySelector("#templateLibraryStatus")
          .classList.contains("is-error") &&
        !document.querySelector("#settingsTemplateImport").disabled,
    );
    assert.equal(
      await page.locator("#templateLibraryStatus").getAttribute("role"),
      "alert",
    );
    await page.locator("#settings-tab-general").click();
    await page.locator("#settings-tab-templates").click();
    await page.waitForFunction(
      () =>
        !document.querySelector("#templateLibraryStatus").textContent &&
        document.querySelector("#templateLibraryList").children.length > 0,
    );
    assert.equal(
      await page.locator("#templateLibraryStatus").getAttribute("role"),
      "status",
    );
    assert.equal(
      await page
        .locator("#templateLibraryStatus")
        .evaluate((el) => el.classList.contains("is-error")),
      false,
      "a successful reload clears the previous import error",
    );
    await page.locator("#closeSettings").click();
    assert.deepEqual(
      await artwork(),
      beforeLibraryError,
      "invalid template import and recovery preserve the current project",
    );
    // Native form submission must identify the first invalid field and preserve existing help IDs.
    await page.evaluate(() => {
      const dialog = document.createElement("dialog");
      dialog.id = "fieldTestDialog";
      dialog.innerHTML =
        '<form><label>Projekt<input id="fieldTestName" required aria-describedby="fieldTestHint"></label><small id="fieldTestHint">Bleibt erhalten</small><label>Kürzel<input required></label><button>Test</button></form>';
      document.body.append(dialog);
      dialog.showModal();
    });
    await page.locator("#fieldTestDialog button").click();
    await page
      .waitForFunction(
        () => document.activeElement.id === "fieldTestName",
        null,
        { timeout: 5000 },
      )
      .catch(async (error) => {
        console.error(
          await page.evaluate(() => ({
            active: document.activeElement.outerHTML,
            fields: [
              ...document.querySelectorAll("#fieldTestDialog input"),
            ].map((el) => ({
              value: el.value,
              invalid: el.getAttribute("aria-invalid"),
              error: el.dataset.fieldError,
              type: el.type,
            })),
            dialogs: [...document.querySelectorAll("dialog[open]")].map(
              (el) => el.id,
            ),
          })),
        );
        throw error;
      });
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "fieldTestName",
    );
    assert.match(
      await page.locator("#fieldTestName").getAttribute("aria-describedby"),
      /^fieldTestHint studioFieldFeedback/,
    );
    await page.locator("#fieldTestName").fill("Neues Projekt");
    assert.equal(
      await page.locator("#fieldTestName").getAttribute("aria-describedby"),
      "fieldTestHint",
    );
    await page.evaluate(() =>
      document.querySelector("#fieldTestDialog").close(),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Material fields: setup, bounds/recovery, settings isolation, native forms, accessible feedback, themes and unchanged artwork verified.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
