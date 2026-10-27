const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.addScriptTag({ content: require("axe-core").source });
    const audit = async (selector) => {
      await page.waitForTimeout(230);
      const result = await page.evaluate(
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
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        selector,
      );
      assert.deepEqual(result, []);
    };
    const fits = async (selector) =>
      assert.equal(
        await page.locator(selector).evaluate((el) => {
          const r = el.getBoundingClientRect(),
            body = el.querySelector(".project-dialog-body");
          return (
            r.left >= 0 &&
            r.right <= innerWidth + 1 &&
            r.top >= 0 &&
            r.bottom <= innerHeight + 1 &&
            el.scrollWidth <= el.clientWidth + 1 &&
            body.scrollWidth <= body.clientWidth + 1
          );
        }),
        true,
      );
    await page.locator("#startOpen").click();
    await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
    assert.match(
      await page.locator("#projectLibraryList").textContent(),
      /Noch keine Projekte/,
    );
    await audit("#projectLibrary");
    await page.screenshot({ path: artifact("project-open-new-empty.png") });
    await page.locator("#dismissProjectLibrary").click();
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "startOpen",
    );
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Herbstkonzerte");
    await page.locator("#createProject").click();
    await page.evaluate(async () => {
      p.meta.date = "";
      p.meta.dateSource = "manual";
      p.meta.code = "E2";
      const c = makeCanvas(80, 100),
        ctx = exportContext(c);
      ctx.fillStyle = "#6590aa";
      ctx.fillRect(0, 0, 80, 100);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          name: "Konzert.png",
          width: 80,
          height: 100,
          data,
          original: data,
        };
      p.images.push(im);
      p.boards = [createBoard(im, 1080, 1350)];
      selected = p.boards[0].id;
      changed();
      await prepareLogo(p.boards[0]);
      await autosave();
      const q = snapshot();
      q.projectId = uid();
      q.meta.title =
        "Sommermusik mit einem bewusst langen Projektnamen für die Prüfung";
      await MKWProjectStore.save(q);
    });
    const before = await page.evaluate(() => JSON.stringify(p));
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      await page.locator("#save").click();
      assert(await page.locator("#saveProject").isVisible());
      assert(!(await page.locator("#saveProjectAs").isVisible()));
      assert(!(await page.locator("#saveTemplate").isVisible()));
      assert.equal(
        await page.locator("#saveFilePreview").textContent(),
        await page.evaluate(() => saveFileName("mkw")),
      );
      await fits("#saveDialog");
      const actionPosition = await page.locator("#saveProject").boundingBox();
      await page.locator("#saveDialog .project-dialog-body").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      assert.deepEqual(
        await page.locator("#saveProject").boundingBox(),
        actionPosition,
        "main save action stays available while content scrolls",
      );
      await page.locator("#saveDialog .project-dialog-body").evaluate((el) => {
        el.scrollTop = 0;
      });
      await audit("#saveDialog");
      await page.screenshot({
        path: artifact(`project-save-new-${theme}.png`),
      });
      await page.locator("#closeSave").click();
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "save",
      );
      await page.locator("#open").click();
      await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
      assert.equal(await page.locator("[data-project-id]").count(), 2);
      assert.equal(await page.locator(".project-current-label").count(), 1);
      assert(await page.locator("[data-delete-project]:disabled").isVisible());
      await fits("#projectLibrary");
      await audit("#projectLibrary");
      await page.screenshot({
        path: artifact(`project-open-new-${theme}.png`),
      });
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "open",
      );
    }
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      before,
      "opening and closing dialogs does not alter document",
    );
    await page.locator("#save").click();
    await page.locator("#saveName").fill("Mein neuer Name.mkw");
    assert.equal(
      await page.locator("#saveFilePreview").textContent(),
      "Mein_neuer_Name.mkw",
    );
    await page.locator("#saveOpenExport").click();
    assert(await page.locator("#exportDialog").isVisible());
    assert(!(await page.locator("#saveDialog").isVisible()));
    await page.locator("#closeExport").click();
    // One failed metadata read can be retried without losing access to local files.
    await page.evaluate(() => {
      window.dialogRealList = MKWProjectStore.list;
      MKWProjectStore.list = async () => {
        throw Error("Test: offline storage");
      };
    });
    await page.locator("#open").click();
    await page.locator("#retryProjectLibrary").waitFor();
    assert.equal(
      await page.locator("#projectOpenStatus").getAttribute("role"),
      "alert",
    );
    assert(await page.locator("#openProjectFile").isEnabled());
    await audit("#projectLibrary");
    await page.screenshot({ path: artifact("project-open-new-error.png") });
    await page.evaluate(() => {
      MKWProjectStore.list = dialogRealList;
    });
    await page.locator("#retryProjectLibrary").click();
    await page.locator("[data-project-id]").first().waitFor();
    assert.equal(await page.locator("#projectOpenStatus").textContent(), "");
    assert(!(await page.locator("#retryProjectLibrary").isVisible()));
    await page.locator("#closeProjectLibrary").click();
    // A late response from a closed overview must not replace a newer list.
    await page.evaluate(() => {
      MKWProjectStore.list = () =>
        new Promise((resolve) => (window.resolveOldDialogList = resolve));
    });
    await page.locator("#open").click();
    await page.locator("#projectLibraryList[aria-busy=true]").waitFor();
    await page.locator("#closeProjectLibrary").click();
    await page.evaluate(() => {
      MKWProjectStore.list = dialogRealList;
    });
    await page.locator("#open").click();
    await page.locator("[data-project-id]").first().waitFor();
    await page.evaluate(() => resolveOldDialogList([]));
    assert.equal(await page.locator("[data-project-id]").count(), 2);
    await page.locator("#closeProjectLibrary").click();
    // Re-entrant saves and cancellation while the native target chooser is pending.
    await page.evaluate(() => {
      window.dialogNativePicker = window.showSaveFilePicker;
      window.dialogPickerCalls = 0;
      window.showSaveFilePicker = () => {
        dialogPickerCalls++;
        return new Promise((resolve, reject) => {
          window.rejectDialogPicker = reject;
        });
      };
    });
    await page.locator("#save").click();
    await page.locator("#saveProject").click();
    assert(await page.locator("#saveProject").isDisabled());
    assert(await page.locator("#closeSave").isDisabled());
    await page.evaluate(() => {
      window.dialogSaveShortcutPrevented = false;
      window.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s")
          window.dialogSaveShortcutPrevented = event.defaultPrevented;
      });
    });
    await page.keyboard.press("ControlOrMeta+s");
    assert.equal(
      await page.evaluate(() => dialogSaveShortcutPrevented),
      true,
      "busy save shortcut must not open the browser's Save Page dialog",
    );
    await page.evaluate(() => MKWProjects.saveFile());
    assert.equal(await page.evaluate(() => dialogPickerCalls), 1);
    await page.keyboard.press("Escape");
    assert(await page.locator("#saveDialog").isVisible());
    await page.evaluate(() =>
      rejectDialogPicker(new DOMException("Cancelled", "AbortError")),
    );
    await page.waitForFunction(() => !busy);
    assert.match(await page.locator("#psdStatus").textContent(), /abgebrochen/);
    assert(await page.locator("#saveProject").isEnabled());
    await page.evaluate(() => {
      window.showSaveFilePicker = dialogNativePicker;
    });
    await page.locator("#closeSave").click();
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 700, height: 500 },
    ]) {
      await page.setViewportSize(viewport);
      await page.locator("#save").click();
      await fits("#saveDialog");
      await audit("#saveDialog");
      await page.screenshot({
        path: artifact(`project-save-new-${viewport.width}.png`),
      });
      await page.locator("#closeSave").click();
      await page.locator("#open").click();
      await page.locator("[data-project-id]").first().waitFor();
      await fits("#projectLibrary");
      await audit("#projectLibrary");
      await page.screenshot({
        path: artifact(`project-open-new-${viewport.width}.png`),
      });
      await page.locator("#closeProjectLibrary").click();
    }
    // Designer-only template save remains in the additional formats area.
    await page.setViewportSize({ width: 1500, height: 1050 });
    await page.locator("#newproject").click();
    await page.locator('[data-project-mode="carousel"]').click();
    await page.locator("#setupName").fill("Designer Projekt");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    await page.locator("#save").click();
    assert(await page.locator("#saveTemplate").isVisible());
    await audit("#saveDialog");
    await page.screenshot({ path: artifact("project-save-new-designer.png") });
    await page.locator("#saveTemplate").click();
    assert(await page.locator("#templateSaveDialog").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS save/open hierarchy, current project protection, live filename, export/template routes, library empty/error/retry/stale-load, modal keyboard/focus, pending-chooser save serialization/cancel, narrow themes and unchanged project",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
