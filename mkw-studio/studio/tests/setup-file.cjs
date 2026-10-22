const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Setup prüfen");
    await page.locator("#createProject").click();
    await page.evaluate(async () => {
      const canvas = makeCanvas(1000, 1200),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#607580";
      ctx.fillRect(0, 0, 1000, 1200);
      const data = canvas.toDataURL(),
        im = {
          id: uid(),
          name: "Bild.png",
          width: 1000,
          height: 1200,
          data,
          original: data,
        };
      p.images.push(im);
      p.boards = p.formats.map((f) => createBoard(im, f.w, f.h));
      selected = p.boards[0].id;
      render();
      await autosave();
    });
    const existingBoards = await page.evaluate(() => JSON.stringify(p.boards));
    await page.locator("#settings").click();
    assert.deepEqual(
      await page.locator(".settings-setup-actions button").allTextContents(),
      ["Verknüpfen", "Aktualisieren", "Exportieren"],
    );
    assert(await page.locator("#setupRefresh").isDisabled());
    await page.locator("[data-theme-choice=dark]").click();
    await page.locator("[data-ui-density=compact]").click();
    await page.locator("#primaryColour").evaluate((el) => {
      el.value = "#c2247a";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#advancedMode").check();
    await page.locator("#autoSaveFile").uncheck();
    await page.locator("#settings-tab-guides").click();
    await page.evaluate(() => {
      for (const [id, value] of [
        ["guideColour", "#348acc"],
        ["snapColour", "#d947a0"],
      ]) {
        const input = $("#" + id);
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await page.locator("#snapDistance").fill("13");
    await page.locator("#snapDistance").press("Tab");
    await page.locator("#settings-tab-fonts").click();
    for (const [key, value] of Object.entries({
      date: 70,
      title: 140,
      subtitle: 60,
      copyright: 24,
    })) {
      const input = page.locator(`[data-default-text-size="${key}"]`);
      await input.fill(String(value));
      await input.press("Tab");
    }
    await page.locator("#defaultLineHeight").fill("110");
    await page.locator("#defaultLineHeight").press("Tab");
    await page.locator("#customFontFiles").setInputFiles({
      name: "Team.otf",
      mimeType: "font/otf",
      buffer: fs.readFileSync(
        path.join(__dirname, "../static/fonts/ReplicaLL-Bold.otf"),
      ),
    });
    await page.waitForFunction(
      () =>
        !$("#addCustomFonts").disabled && p.fonts.some((font) => font.custom),
    );
    await page.locator("#settings-tab-sponsors").click();
    await page.locator("#newSponsorGroup").click();
    await page.locator("[data-sponsor-name]").fill("Hauptpartner");
    await page.locator("[data-sponsor-name]").press("Tab");
    const png = await page.evaluate(() => {
      const c = makeCanvas(240, 120),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#156db0";
      ctx.fillRect(10, 10, 220, 100);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 50px Arial";
      ctx.fillText("ZKB", 45, 78);
      return c.toDataURL().split(",")[1];
    });
    const logoChooser = page.waitForEvent("filechooser");
    await page.locator("[data-sponsor-upload]").click();
    await (
      await logoChooser
    ).setFiles({
      name: "ZKB.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await page.waitForFunction(
      () => document.querySelectorAll(".sponsor-library-logo").length === 1,
    );
    await page.evaluate(() => {
      const input = $("#defaultSponsorColour");
      input.value = "#203c58";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#settings-tab-export").click();
    await page.locator("#defaultExportFormat").selectOption("webp");
    await page.locator("#defaultPDFPreset").selectOption("compact");
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.boards)),
      existingBoards,
      "Setting defaults cannot change existing boards",
    );
    await page.screenshot({
      path: artifact("mkw-setup-export-preferences.png"),
    });
    await page.locator("#settings-tab-general").click();
    const native = await page.evaluate(async () => {
      if (!window.showOpenFilePicker || !window.showSaveFilePicker)
        return false;
      const root = await navigator.storage.getDirectory(),
        h = await root.getFileHandle("Team.mkwsetup", { create: true });
      if (!h.queryPermission || !h.createWritable) return false;
      window.setupTestHandle = h;
      window.setupChooserCalls = [];
      window.showSaveFilePicker = async (options) => {
        setupChooserCalls.push(["save", options]);
        return setupTestHandle;
      };
      window.showOpenFilePicker = async (options) => {
        setupChooserCalls.push(["open", options]);
        return [setupTestHandle];
      };
      return true;
    });
    let downloadedPath, sourceBuffer;
    if (native) {
      await page.locator("#setupExport").click();
      await page.waitForFunction(() =>
        $("#setupStatus").textContent.includes("exportiert"),
      );
      sourceBuffer = await page.evaluate(async () =>
        Array.from(
          new Uint8Array(await (await setupTestHandle.getFile()).arrayBuffer()),
        ),
      );
      sourceBuffer = Buffer.from(sourceBuffer);
    } else {
      assert.match(
        await page.locator("#setupBrowserHint").textContent(),
        /erneut/,
      );
      const downloading = page.waitForEvent("download");
      await page.locator("#setupExport").click();
      const file = await downloading;
      assert.equal(file.suggestedFilename(), "MKW-Studio.mkwsetup");
      downloadedPath = artifact("team-test.mkwsetup");
      await file.saveAs(downloadedPath);
      sourceBuffer = fs.readFileSync(downloadedPath);
    }
    const exported = await require("../static/project-file.js").decode(
      new Blob([sourceBuffer]),
    );
    assert.equal(exported.format, "mkw-setup");
    assert.equal(exported.theme, "dark");
    assert.equal(exported.preferences.primaryColour, "#c2247a");
    assert.equal(exported.preferences.density, "compact");
    assert.equal(exported.fonts.length, 1);
    assert.equal(exported.groups[0].name, "Hauptpartner");
    assert.equal(exported.logos.length, 1);
    assert.equal(exported.projectId, undefined);
    assert.equal(exported.boards, undefined);
    assert.deepEqual(exported.preferences.textSizes, {
      date: 70,
      title: 140,
      subtitle: 60,
      copyright: 24,
    });
    assert.equal(exported.preferences.exportFormat, "webp");
    assert.equal(exported.preferences.snapDistance, 13);
    assert.equal(exported.preferences.pdfPreset, "compact");
    assert.equal(exported.preferences.lineHeight, 110);
    assert.equal(exported.preferences.autoSaveFile, false);
    await page.evaluate(async () => {
      studioPreferences = MKWSetupModel.preferences();
      studioApplyPreferences();
      studioSetTheme("light");
      await studioReplaceStoredFonts([]);
      await MKWSponsorLibrary.save([]);
    });
    const choose = async (buffer, button = "#setupLink") => {
      if (native) {
        const bytes = Array.from(buffer);
        await page.evaluate(async (bytes) => {
          const stream = await setupTestHandle.createWritable();
          await stream.write(new Uint8Array(bytes));
          await stream.close();
        }, bytes);
        await page.locator(button).click();
      } else {
        const choosing = page.waitForEvent("filechooser");
        await page.locator(button).click();
        await (
          await choosing
        ).setFiles({
          name: "Team.mkwsetup",
          mimeType: "application/gzip",
          buffer,
        });
      }
      await page.waitForFunction(
        () =>
          !$("#settingsDialog").hasAttribute("aria-busy") &&
          !$("#setupStatus").hidden,
      );
    };
    await choose(sourceBuffer);
    assert.match(
      await page.locator("#setupStatus").textContent(),
      /übernommen/,
    );
    assert.equal(
      await page.locator("#setupFileName").textContent(),
      "Team.mkwsetup",
    );
    assert(!(await page.locator("#setupRefresh").isDisabled()));
    assert.deepEqual(
      await page.evaluate(() => studioPreferences),
      exported.preferences,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    assert.equal(
      await page.evaluate(async () => (await studioStoredFonts()).length),
      1,
    );
    assert.equal(
      await page.evaluate(
        async () => (await MKWSponsorLibrary.groups())[0].logos[0].id,
      ),
      exported.groups[0].logos[0].id,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.boards)),
      existingBoards,
    );
    await page.screenshot({ path: artifact("mkw-setup-general-dark.png") });
    // Used project fonts and sponsors survive replacing the device libraries.
    await page.evaluate(async () => {
      const font = p.fonts.find((font) => font.custom);
      p.boards[0].elements.title.role = font.role;
      await sponsorToggleGroup(p.images[0].id, sponsorGroups[0].id, true);
      await autosave();
    });
    const preserved = await page.evaluate(() => ({
      boards: JSON.stringify(p.boards),
      meta: JSON.stringify(p.meta),
      assets: JSON.stringify(MKWProjectAssets.compact(p).logos),
      font: p.fonts.find((font) => font.custom).data,
    }));
    const updated = structuredClone(exported);
    updated.theme = "light";
    updated.preferences.textSizes = {
      date: 81,
      title: 162,
      subtitle: 61,
      copyright: 25,
    };
    updated.preferences.guideColour = "#269b76";
    updated.fonts = [];
    updated.groups = [];
    updated.logos = [];
    const updateBuffer = Buffer.from(
      await (
        await require("../static/project-file.js").encodeDocument(updated, {
          assetCollections: ["fonts", "logos"],
        })
      ).arrayBuffer(),
    );
    await choose(updateBuffer, "#setupRefresh");
    assert.deepEqual(
      await page.evaluate(() => studioPreferences.textSizes),
      updated.preferences.textSizes,
    );
    assert.equal(
      await page.evaluate(async () => (await studioStoredFonts()).length),
      0,
    );
    assert.equal(
      await page.evaluate(
        async () => (await MKWSponsorLibrary.groups()).length,
      ),
      0,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.boards)),
      preserved.boards,
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(p.meta)),
      preserved.meta,
    );
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(MKWProjectAssets.compact(p).logos),
      ),
      preserved.assets,
    );
    assert.equal(
      await page.evaluate(() => p.fonts.find((font) => font.custom).data),
      preserved.font,
    );
    await page.locator("#settings-tab-fonts").click();
    assert.equal(
      await page.locator("[data-default-text-size=title]").inputValue(),
      "162",
    );
    await page.screenshot({ path: artifact("mkw-setup-font-sizes.png") });
    await page.locator("#settings-tab-general").click();
    const current = await page.evaluate(() => MKWSetupSession.capture());
    // Invalid files are rejected before mutations.
    await choose(Buffer.from('{"version":1,"boards":[]}'));
    assert.equal(
      await page.locator("#setupStatus").getAttribute("role"),
      "alert",
    );
    assert.deepEqual(
      await page.evaluate(() => MKWSetupSession.capture()),
      current,
    );
    for (const kind of ["font", "logo"]) {
      const invalid = structuredClone(exported);
      if (kind === "font") invalid.fonts[0].data = "data:font/otf;base64,AQID";
      else invalid.logos[0].data = "data:image/png;base64,AQID";
      await choose(
        Buffer.from(
          await (
            await require("../static/project-file.js").encodeDocument(invalid, {
              assetCollections: ["fonts", "logos"],
            })
          ).arrayBuffer(),
        ),
      );
      assert.equal(
        await page.locator("#setupStatus").getAttribute("role"),
        "alert",
      );
      assert.deepEqual(
        await page.evaluate(() => MKWSetupSession.capture()),
        current,
      );
    }
    // An interrupted second-library write restores fonts/preferences/link and removes the rollback journal.
    await page.evaluate(() => {
      const save = MKWSponsorLibrary.save;
      let fail = true;
      MKWSponsorLibrary.save = async (...args) => {
        if (fail) {
          fail = false;
          throw Error("Test: Bibliothek voll");
        }
        return save(...args);
      };
      window.restoreSponsorSave = () => {
        MKWSponsorLibrary.save = save;
      };
    });
    await choose(sourceBuffer);
    assert.equal(
      await page.locator("#setupStatus").getAttribute("role"),
      "alert",
    );
    assert.deepEqual(
      await page.evaluate(() => MKWSetupSession.capture()),
      current,
    );
    assert.equal(await page.evaluate(() => MKWSetupStore.pending()), undefined);
    await page.evaluate(() => restoreSponsorSave());
    // Native cancellation retains state; Firefox uses the real file chooser on every refresh.
    if (native) {
      await page.evaluate(() => {
        window.showOpenFilePicker = async () => {
          throw new DOMException("Abgebrochen", "AbortError");
        };
      });
      await page.locator("#setupLink").click();
      await page.waitForFunction(
        () => !$("#settingsDialog").hasAttribute("aria-busy"),
      );
      assert.deepEqual(
        await page.evaluate(() => MKWSetupSession.capture()),
        current,
      );
    }
    await page.locator("#closeSettings").click();
    await page.reload();
    await page.waitForFunction(() => !$("#startNew").disabled);
    await page.locator("#startContinue").click();
    await page.waitForFunction(() => !busy);
    await page.locator("#settings").click();
    await page.waitForFunction(
      () => $("#setupFileName").textContent === "Team.mkwsetup",
    );
    assert.equal(
      await page.locator("#setupFileName").textContent(),
      "Team.mkwsetup",
    );
    assert.deepEqual(
      await page.evaluate(() => studioPreferences),
      current.preferences,
    );
    // Simulate a crash with real font/logo libraries, then verify both are restored on startup.
    await page.evaluate(async (snapshot) => {
      const file = new File(
        [
          await MKWProjectFile.encodeDocument(snapshot, {
            assetCollections: ["fonts", "logos"],
          }),
        ],
        "Recovery.mkwsetup",
      );
      await MKWSetupSession.importFile(file);
      await MKWSetupStore.begin({
        snapshot: await MKWSetupSession.capture(),
        link: await MKWSetupStore.link(),
      });
      await studioReplaceStoredFonts([]);
      await MKWSponsorLibrary.save([]);
      localStorage.setItem("mkw-studio-theme", "light");
      localStorage.setItem(
        "mkw-studio-preferences",
        JSON.stringify(MKWSetupModel.preferences()),
      );
    }, exported);
    await page.reload();
    await page.waitForFunction(() => !$("#startNew").disabled);
    assert.deepEqual(
      await page.evaluate(() => MKWSetupSession.capture()),
      exported,
    );
    assert.equal(await page.evaluate(() => MKWSetupStore.pending()), undefined);
    // New projects use the four defaults; adding formats to an existing project still follows its template.
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Neue Standardgrössen");
    await page.locator("#createProject").click();
    const newSizes = await page.evaluate(() => {
      const im = { id: uid(), width: 100, height: 100 };
      return Object.fromEntries(
        Object.entries(createBoard(im).elements)
          .filter(([k]) => k !== "logo")
          .map(([k, v]) => [k, v.size]),
      );
    });
    assert.deepEqual(newSizes, exported.preferences.textSizes);
    if (downloadedPath) fs.unlinkSync(downloadedPath);
    assert.deepEqual(errors, []);
    console.log(
      "PASS complete setup export/link/refresh, native handle and Firefox reselection, all preferences/fonts/sponsor libraries, read validation, rollback and crash recovery, four new-post text sizes and preserved project assets",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
