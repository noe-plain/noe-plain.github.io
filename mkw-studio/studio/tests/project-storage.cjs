const assert = require("node:assert/strict");
(async () => {
  const browser = await require("./browser.cjs").launch();
  try {
    const context = await browser.newContext({
        viewport: { width: 1500, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = process.env.STUDIO_URL || "http://127.0.0.1:8912/";
    await page.goto(url);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Projekt A");
    await page.locator("#createProject").click();
    await require("./browser.cjs").waitForProjectReady(page);
    await page.evaluate(async () => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(800, 1000),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#38685a";
      ctx.fillRect(0, 0, 800, 1000);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          name: "Vorlage.png",
          width: 800,
          height: 1000,
          data,
          original: "data:image/png;base64,REDUNDANT",
        };
      p.images.push(im);
      p.boards = p.formats.map((f) => createBoard(im, f.w, f.h));
      selected = p.boards[0].id;
      changed();
      await autosave();
    });
    const id = await page.evaluate(() => p.projectId);
    assert(await page.locator(".template-badge").isVisible());
    // Same browser, same project, stale tab: preserve both versions instead of last writer winning.
    const second = await context.newPage();
    second.on("pageerror", (error) => errors.push(error.message));
    await second.goto(url);
    await second.locator("#startContinue").click();
    await second.waitForFunction(() => !busy && p.images.length === 1);
    await page.evaluate(async () => {
      p.meta.title = "Projekt A · neuer Stand";
      touchMeta();
      await autosave();
    });
    await second.evaluate(async () => {
      p.meta.title = "Anderer Tab";
      touchMeta();
      await autosave();
    });
    const fork = await second.evaluate(() => p.projectId);
    assert.notEqual(fork, id);
    assert(
      (await second.locator("#projectStorageNotice").textContent()).includes(
        "Konfliktkopie",
      ),
    );
    assert.equal(
      await page.evaluate(
        async (id) => (await MKWProjectStore.open(id)).project.meta.title,
        id,
      ),
      "Projekt A · neuer Stand",
    );
    assert.equal(
      await page.evaluate(async () => (await MKWProjectStore.list()).length),
      2,
    );
    // Visible-browser checks must activate the original tab before clicking its controls.
    await page.bringToFront();
    const writableHandles = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory(),
        h = await root.getFileHandle("capability-probe.mkw", { create: true });
      return (
        typeof h.queryPermission === "function" &&
        typeof h.createWritable === "function"
      );
    });
    if (writableHandles) {
      // File handle is a real browser file in isolated origin storage, never a user file.
      const initial = await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory(),
          handle = await root.getFileHandle("linked.mkw", { create: true });
        window.showSaveFilePicker = async () => handle;
        await MKWProjects.saveFile();
        const file = await handle.getFile(),
          project = await MKWProjectFile.decode(file);
        return {
          project,
          stamp: file.lastModified,
          link: (await MKWProjectStore.open(p.projectId)).fileHandle.name,
        };
      });
      assert.equal(initial.link, "linked.mkw");
      assert.equal(initial.project.images[0].original, undefined);
      assert(initial.project.images[0].data.startsWith("data:image/png"));
      assert.equal(initial.project.fonts.length, 2);
      let downloads = 0;
      page.on("download", () => downloads++);
      await page.evaluate(async () => {
        p.meta.subtitle = "Automatisch in derselben Datei";
        touchMeta();
        await autosave();
      });
      const saved = await page.evaluate(
        async () =>
          await MKWProjectFile.decode(
            await MKWProjects.fileLink().handle.getFile(),
          ),
      );
      assert.equal(saved.meta.subtitle, "Automatisch in derselben Datei");
      assert.equal(downloads, 0);
      await page.reload();
      await page.locator("#startContinue").click();
      await page.waitForFunction(() => !busy);
      assert.equal(
        await page.evaluate(() => MKWProjects.fileLink().handle.name),
        "linked.mkw",
      );
      // Detect external file changes; keep browser copy and do not overwrite the disk file.
      await page.evaluate(async () => {
        const handle = MKWProjects.fileLink().handle,
          stream = await handle.createWritable();
        await stream.write("Extern verändert");
        await stream.close();
        p.meta.subtitle = "Nicht über fremden Stand schreiben";
        touchMeta();
        await autosave();
      });
      assert.equal(
        await page.evaluate(
          async () =>
            await (await MKWProjects.fileLink().handle.getFile()).text(),
        ),
        "Extern verändert",
      );
      assert(
        (await page.locator("#projectStorageNotice").textContent()).includes(
          "ausserhalb",
        ),
      );
      // Explicit Save As links a separate file and project; automatic writes thereafter use that link.
      const copy = await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory(),
          handle = await root.getFileHandle("copy.mkw", { create: true });
        window.showSaveFilePicker = async () => handle;
        await MKWProjects.saveFile(true);
        return {
          id: p.projectId,
          file: await MKWProjectFile.decode(await handle.getFile()),
        };
      });
      assert.notEqual(copy.id, id);
      assert.equal(copy.file.projectId, copy.id);
    } else {
      // Firefox has no local-file picker: verify the real download/browser-save path.
      assert.equal(
        await page.evaluate(() => typeof window.showSaveFilePicker),
        "undefined",
      );
      let downloads = 0;
      page.on("download", () => downloads++);
      await page.evaluate(async () => {
        p.meta.subtitle = "Firefox-Browsersicherung";
        touchMeta();
        await autosave();
      });
      assert.equal(downloads, 0);
      await page.locator("#save").click();
      const downloading = page.waitForEvent("download");
      downloading.catch(() => {});
      await page.bringToFront();
      await page
        .locator("#saveProject")
        .click()
        .catch(async (error) => {
          console.error(
            await page.evaluate(() => ({
              visibility: document.visibilityState,
              focused: document.hasFocus(),
              busy,
              active: document.activeElement.id,
              status: document.querySelector("#psdStatus").textContent,
              dialogs: [...document.querySelectorAll("dialog[open]")].map(
                (el) => el.id,
              ),
              saveDisabled: document.querySelector("#saveProject").disabled,
            })),
          );
          throw error;
        });
      const file = await downloading,
        project = await require("../static/project-file.js").decode(
          new Blob([require("node:fs").readFileSync(await file.path())]),
        );
      assert(file.suggestedFilename().endsWith(".mkw"));
      assert.equal(project.projectId, id);
      assert.equal(project.meta.subtitle, "Firefox-Browsersicherung");
      assert.equal(project.images[0].original, undefined);
      assert(project.images[0].data.startsWith("data:image/png"));
      assert.equal(await page.evaluate(() => !!MKWProjects.fileLink()), false);
      await page.reload();
      await page.locator("#startContinue").click();
      await page.waitForFunction(() => !busy && p.images.length === 1);
      assert.equal(await page.evaluate(() => p.projectId), id);
      assert.equal(
        await page.evaluate(() => p.meta.subtitle),
        "Firefox-Browsersicherung",
      );
    }
    // Preferences never mutate current text or become document settings.
    await page.locator("#settings").click();
    await page.locator("#settings-tab-fonts").click();
    const before = await page.evaluate(() => JSON.stringify(p.boards));
    await page.locator("#defaultLineHeight").fill("130");
    await page.locator("#defaultLineHeight").press("Tab");
    assert.equal(await page.evaluate(() => JSON.stringify(p.boards)), before);
    await page.locator("#settings-tab-export").click();
    await page.locator("#defaultExportFormat").selectOption("webp");
    await page.locator("#closeSettings").click();
    assert.equal(await page.evaluate(() => p.exportOptions), undefined);
    await page.evaluate(async () => {
      const hidden = { ...p.images[0], id: uid(), name: "hidden.png" },
        orphan = {
          ...p.images[0],
          id: uid(),
          name: "deleted.png",
          data: p.images[0].data.replace("AAAA", "AAAB"),
        };
      p.images.push(hidden, orphan);
      const b = createBoard(hidden);
      b.checked = false;
      p.boards.push(b);
      changed();
      await autosave();
    });
    assert.equal(
      await page.evaluate(() => p.images.length),
      2,
      "Orphan removed, hidden board retained",
    );
    assert.equal(
      await page.evaluate(() => MKWProjectAssets.compact(p).images.length),
      2,
    );
    await page.locator("#save").click();
    assert(
      (await page.locator("#saveDateHint").textContent()).includes(
        "Ohne Datum",
      ),
    );
    await page.locator("#closeSave").click();
    await page.evaluate(() => openExport());
    assert.equal(await page.locator("#zip").isDisabled(), false);
    assert(
      (await page.locator("#exportStatus").textContent()).includes(
        "Kein Datum",
      ),
    );
    assert.equal(
      await page.locator("#reviewExport").textContent(),
      "Exportvorschau öffnen",
    );
    await page.locator("#closeExport").click();
    // Removal GC retains shared assets referenced by another project.
    const collection = await page.evaluate(async () => {
      const projects = await MKWProjectStore.list();
      for (const project of projects)
        if (project.id !== p.projectId)
          await MKWProjectStore.remove(project.id);
      const restored = await MKWProjectStore.open(p.projectId);
      return {
        count: (await MKWProjectStore.list()).length,
        images: restored.project.images.length,
      };
    });
    assert.equal(collection.count, 1);
    assert.equal(collection.images, 2);
    assert.deepEqual(errors, []);
    console.log(
      writableHandles
        ? "PASS conflict copies, native linked files, Save As, external-change protection, assets, settings and optional dates"
        : "PASS Firefox conflict copies, explicit MKW download, browser autosave/reload, no silent downloads, asset cleanup, settings and optional dates",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
