const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1000 },
    });
    const errors = [];
    let downloads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("download", () => downloads++);
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    assert.equal(
      await page
        .locator("#batch, #batchImport, #projects, #startProjects")
        .count(),
      0,
    );
    assert.equal(await page.evaluate(() => typeof MKWBatchData), "undefined");
    await page.locator("#startOpen").click();
    await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
    assert(await page.locator("#openProjectFile").isVisible());
    assert(
      (await page.locator("#projectLibraryList").textContent()).includes(
        "Noch keine Projekte",
      ),
    );
    await page.locator("#closeProjectLibrary").click();
    assert(await page.locator("#startDialog").isVisible());
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Projekt Eins");
    await page.locator("#createProject").click();
    await require("./browser.cjs").waitForProjectReady(page);
    const writableHandles = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory(),
        h = await root.getFileHandle("capability-probe.mkw", { create: true });
      return (
        typeof h.queryPermission === "function" &&
        typeof h.createWritable === "function"
      );
    });
    let first;
    if (writableHandles) {
      await page.evaluate(async () => {
        await autosave();
        window.testSaveCalls = [];
        const root = await navigator.storage.getDirectory();
        window.firstHandle = await root.getFileHandle("eins.mkw", {
          create: true,
        });
        window.secondHandle = await root.getFileHandle("zwei.mkw", {
          create: true,
        });
        window.showSaveFilePicker = async (options) => {
          testSaveCalls.push(options);
          return firstHandle;
        };
      });
      await page.locator("#save").click();
      await page.locator("#saveName").fill("Gewählter Name");
      await page.locator("#saveProject").click();
      await page.waitForFunction(
        () => !busy && !document.querySelector("#saveDialog").open,
      );
      first = await page.evaluate(async () => ({
        id: p.projectId,
        text: await (await firstHandle.getFile()).text(),
        calls: testSaveCalls,
      }));
      assert.equal(first.calls.length, 1);
      assert.equal(first.calls[0].suggestedName, "Gewählter_Name.mkw");
      assert.equal(first.calls[0].id, "mkw-mkw");
      assert.equal(
        downloads,
        0,
        "Save As uses the selected file instead of downloading",
      );
      // Cancel must keep both the document and the previous link untouched.
      await page.evaluate(
        () =>
          (window.showSaveFilePicker = async () => {
            throw new DOMException("Cancelled", "AbortError");
          }),
      );
      await page.locator("#save").click();
      await page.locator("#saveProjectAs").click();
      assert.equal(await page.evaluate(() => p.projectId), first.id);
      assert.equal(
        await page.evaluate(
          async () => await (await firstHandle.getFile()).text(),
        ),
        first.text,
      );
      assert(await page.locator("#saveDialog").isVisible());
      // Save As prompts again even when a file is already linked.
      await page.evaluate(
        () =>
          (window.showSaveFilePicker = async (options) => {
            testSaveCalls.push(options);
            return secondHandle;
          }),
      );
      await page.locator("#saveProjectAs").click();
      await page.waitForFunction(
        () => !busy && !document.querySelector("#saveDialog").open,
      );
      const second = await page.evaluate(() => p.projectId);
      assert.notEqual(second, first.id);
      assert.equal(await page.evaluate(() => testSaveCalls.length), 2);
      assert.equal(
        await page.evaluate(
          async () => await (await firstHandle.getFile()).text(),
        ),
        first.text,
      );
    } else {
      assert.equal(
        await page.evaluate(() => typeof window.showSaveFilePicker),
        "undefined",
      );
      await page.evaluate(() => autosave());
      await page.locator("#save").click();
      await page.locator("#saveName").fill("Gewählter Name");
      const downloading = page.waitForEvent("download");
      await page.locator("#saveProject").click();
      const downloaded = await downloading,
        text = require("node:fs").readFileSync(await downloaded.path());
      const decoded = await require("../static/project-file.js").decode(
        new Blob([text]),
      );
      assert.equal(downloaded.suggestedFilename(), "Gewählter_Name.mkw");
      first = { id: await page.evaluate(() => p.projectId), text };
      assert.equal(decoded.projectId, first.id);
      assert.equal(await page.evaluate(() => !!MKWProjects.fileLink()), false);
      const copy = decoded;
      copy.projectId = await page.evaluate(() => uid());
      copy.meta.title = "Projekt Zwei";
      await page.locator("#open").click();
      const choosing = page.waitForEvent("filechooser");
      await page.locator("#openProjectFile").click();
      await (
        await choosing
      ).setFiles({
        name: "zwei.mkw",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(copy)),
      });
      await page.waitForFunction(
        (id) =>
          p.projectId === id &&
          !busy &&
          !document.querySelector("#projectLibrary").open,
        copy.projectId,
      );
      assert.notEqual(await page.evaluate(() => p.projectId), first.id);
      assert.equal(
        await page.evaluate(
          async (id) => (await MKWProjectStore.open(id)).project.meta.title,
          first.id,
        ),
        "Projekt Eins",
      );
    }
    await page.locator("#open").click();
    await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
    assert.equal(await page.locator("[data-project-id]").count(), 2);
    await page.screenshot({ path: artifact("mkw-open-projects-light.png") });
    await page.locator(`[data-project-id="${first.id}"]`).click();
    await page.waitForFunction(
      (id) =>
        p.projectId === id && !document.querySelector("#projectLibrary").open,
      first.id,
    );
    // Failed local file reads remain inside the common chooser.
    await page.evaluate(() => (window.showOpenFilePicker = undefined));
    await page.locator("#open").click();
    const chooser = page.waitForEvent("filechooser");
    await page.locator("#openProjectFile").click();
    await (
      await chooser
    ).setFiles({
      name: "kaputt.mkw",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#projectOpenStatus")
        .textContent.includes("nicht geöffnet"),
    );
    assert.equal(await page.evaluate(() => p.projectId), first.id);
    // The same view can open a portable file via the fallback file input.
    const portable = await page.evaluate(() => {
      const q = snapshot();
      q.projectId = uid();
      q.meta.title = "Von Datei";
      return JSON.stringify(MKWProjectAssets.compact(q));
    });
    const chooseFile = page.waitForEvent("filechooser");
    await page.locator("#openProjectFile").click();
    await (
      await chooseFile
    ).setFiles({
      name: "von-datei.mkw",
      mimeType: "application/json",
      buffer: Buffer.from(portable),
    });
    await page.waitForFunction(
      () =>
        p.meta.title === "Von Datei" &&
        !document.querySelector("#projectLibrary").open,
    );
    await page.evaluate(() => (window.showSaveFilePicker = undefined));
    await page.locator("#save").click();
    assert(
      (await page.locator("#saveAsHint").textContent()).includes(
        "Download-Einstellungen",
      ),
    );
    await page.locator("#closeSave").click();
    // Browser-storage failure must not remove the file-opening option.
    await page.evaluate(() => {
      window.realProjectList = MKWProjectStore.list;
      MKWProjectStore.list = async () => {
        throw Error("Testfehler");
      };
    });
    await page.locator("#open").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#projectOpenStatus")
        .textContent.includes("Testfehler"),
    );
    assert(await page.locator("#openProjectFile").isEnabled());
    await page.locator("#closeProjectLibrary").click();
    await page.evaluate(() => (MKWProjectStore.list = realProjectList));
    await page.reload();
    await page.locator("#startOpen").click();
    await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
    assert.equal(
      await page.locator("[data-project-id]").count(),
      3,
      "All previous projects survive removal of the batch feature",
    );
    await page.evaluate(() => studioSetTheme("dark"));
    await page.screenshot({ path: artifact("mkw-open-projects-dark.png") });
    await page.setViewportSize({ width: 600, height: 800 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth === innerWidth,
      ),
    );
    assert(await page.locator("#openProjectFile").isVisible());
    await page.screenshot({ path: artifact("mkw-open-projects-mobile.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS unified start/header project chooser, empty/library/file/error states, existing project preservation, Save As location/name chooser, repeat/cancel, no automatic downloads and browser fallback explanation",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
