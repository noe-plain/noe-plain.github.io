const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    const startBackground = () =>
      page
        .locator("#startDialog")
        .evaluate((el) => getComputedStyle(el, "::backdrop").backgroundColor);
    const originalBackground = await startBackground();
    await page.evaluate(() => studioSetPrimaryColour("#6f3e91"));
    assert.notEqual(
      await startBackground(),
      originalBackground,
      "default start background follows the chosen main colour",
    );
    await page.evaluate(() => studioSetPrimaryColour("#315bcc"));
    const before = await page.evaluate(() => ({
      document: JSON.stringify({ ...p, projectId: undefined }),
      revision,
      undo: history.length,
    }));
    await page.locator("#startSettings").click();
    assert(await page.locator("#settingsDialog").isVisible());
    assert(await page.locator("#startDialog").evaluate((el) => el.open));
    await page.keyboard.press("Escape");
    assert(
      await page
        .locator("#startSettings")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("#startSettings").click();
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 3000;
      c.height = 1500;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#e7b054";
      ctx.fillRect(0, 0, c.width, c.height);
      for(let y=0;y<c.height;y+=100)for(let x=0;x<c.width;x+=100){ctx.fillStyle=(x+y)%200?'#ffffff':'#111111';ctx.fillRect(x,y,100,100);}
      return c.toDataURL().split(",")[1];
    });
    await page.locator("#startBackgroundFile").setInputFiles({
      name: "Start.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await page.waitForFunction(
      () =>
        document.querySelector("#startBackgroundStatus").textContent ===
        "Startbild gespeichert.",
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#startBackgroundPreview").naturalWidth === 2560,
    );
    assert.equal(
      await page
        .locator("#startBackgroundPreview")
        .evaluate((el) => el.naturalHeight),
      1280,
    );
    const portable = await page.evaluate(async () => {
      const s = await MKWSetupSession.capture();
      const blob = await MKWProjectFile.encodeDocument(s, {
        assetCollections: ["fonts", "logos", "backgrounds"],
      });
      return MKWSetupModel.validate(await MKWProjectFile.decode(blob));
    });
    assert.equal(portable.backgrounds.length, 1);
    assert.equal(portable.backgrounds[0].id, "start-background");
    assert(
      await page.evaluate(
        () =>
          !localStorage
            .getItem("mkw-studio-preferences")
            .includes("data:image"),
      ),
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      document
        .querySelector("#startDialog")
        .style.getPropertyValue("--studio-start-image")
        .includes("blob:"),
    );
    const imageURL = await page
      .locator("#startDialog")
      .evaluate((el) => el.style.getPropertyValue("--studio-start-image"));
    await page.locator("#startSettings").click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("#startDialog")
        .evaluate((el) => el.style.getPropertyValue("--studio-start-image")),
      imageURL,
      "opening/closing settings reuses the decoded start image",
    );
    const backdrop = await page
      .locator("#startDialog")
      .evaluate((el) => getComputedStyle(el, "::backdrop").backgroundImage);
    assert(
      backdrop.includes("blob:"),
      "the actual backdrop must paint the stored image",
    );
    await page.addScriptTag({content:require('axe-core').source});
    assert.deepEqual(await page.evaluate(async()=>(await axe.run('#startDialog')).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))),[]);
    assert.equal(await page.locator('#startDialog').evaluate(el=>getComputedStyle(el).backgroundColor),await page.locator('header').evaluate(el=>getComputedStyle(el).backgroundColor),'The content stays on an opaque themed surface over a busy image');
    await page.screenshot({ path: artifact("material-start-image-light.png") });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.screenshot({ path: artifact("material-start-image-dark.png") });
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    await page.waitForFunction(() =>
      document
        .querySelector("#startDialog")
        .style.getPropertyValue("--studio-start-image")
        .includes("blob:"),
    );
    await page.locator("#startSettings").click();
    await page.locator("#removeStartBackground").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#startBackgroundStatus")
        .textContent.includes("Standardhintergrund"),
    );
    assert.equal(
      await page.evaluate(() => MKWSetupStore.background()),
      undefined,
    );
    assert.deepEqual(
      (await page.evaluate(() => MKWSetupSession.capture())).backgrounds,
      [],
    );
    // Explicit setup imports restore the image; legacy setups preserve local personalisation.
    await page.evaluate(async (s) => {
      const b = await MKWProjectFile.encodeDocument(s, {
        assetCollections: ["fonts", "logos", "backgrounds"],
      });
      await MKWSetupSession.importFile(new File([b], "Team.mkwsetup"));
    }, portable);
    assert(
      await page.evaluate(async () => !!(await MKWSetupStore.background())),
    );
    await page.evaluate(async (s) => {
      delete s.backgrounds;
      const b = await MKWProjectFile.encodeDocument(s, {
        assetCollections: ["fonts", "logos"],
      });
      await MKWSetupSession.importFile(new File([b], "Alt.mkwsetup"));
    }, portable);
    assert(
      await page.evaluate(async () => !!(await MKWSetupStore.background())),
    );
    const rollback = await page.evaluate(async () => {
      const old = await MKWStartScreen.capture(),
        next = await MKWSetupSession.capture();
      next.backgrounds = [];
      const finish = MKWSetupStore.finish;
      let once = true;
      MKWSetupStore.finish = (...args) => {
        if (once) {
          once = false;
          return Promise.reject(Error("simulierter Schreibfehler"));
        }
        return finish(...args);
      };
      let rejected = false;
      try {
        const b = await MKWProjectFile.encodeDocument(next, {
          assetCollections: ["fonts", "logos", "backgrounds"],
        });
        await MKWSetupSession.importFile(new File([b], "Fehler.mkwsetup"));
      } catch {
        rejected = true;
      } finally {
        MKWSetupStore.finish = finish;
      }
      return {
        rejected,
        same:
          JSON.stringify(old) ===
          JSON.stringify(await MKWStartScreen.capture()),
        pending: !!(await MKWSetupStore.pending()),
      };
    });
    assert.deepEqual(rollback, { rejected: true, same: true, pending: false });
    await page.locator("#startBackgroundFile").setInputFiles({
      name: "Defekt.png",
      mimeType: "image/png",
      buffer: Buffer.from("broken"),
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#startBackgroundStatus")
        .classList.contains("is-error"),
    );
    assert(
      await page.evaluate(async () => !!(await MKWSetupStore.background())),
    );
    // Quota failures must leave the previous single stored image intact.
    await page.evaluate(() => {
      window.realBackgroundWrite = MKWSetupStore.setBackground;
      MKWSetupStore.setBackground = () =>
        Promise.reject(Error("Speicher voll"));
    });
    await page.locator("#removeStartBackground").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#startBackgroundStatus")
        .textContent.includes("Speicher voll"),
    );
    await page.evaluate(() => {
      MKWSetupStore.setBackground = window.realBackgroundWrite;
      delete window.realBackgroundWrite;
    });
    assert(
      await page.evaluate(async () => !!(await MKWSetupStore.background())),
    );
    await page.locator("#removeStartBackground").click();
    await page.waitForFunction(
      () => document.querySelector("#removeStartBackground").disabled,
    );
    await page.keyboard.press("Escape");
    for (const width of [1450, 360, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const b = await page.evaluate(() =>
        ["startNew", "startDesigner", "startTemplates", "startOpen"].map(
          (id) => {
            const r = document.getElementById(id).getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          },
        ),
      );
      assert(b.every((r) => r.w >= 44 && r.h >= 44 && r.x >= 0));
      if (width > 600) {
        assert.equal(b[0].y, b[1].y);
        assert.equal(b[2].y, b[3].y);
        assert(Math.abs(b[0].w - b[1].w) < 1);
        assert(Math.abs(b[2].w - b[3].w) < 1);
      } else {
        for (let i = 1; i < b.length; i++) assert(b[i].y >= b[i-1].y + b[i-1].h);
      }
      assert(
        await page
          .locator("#startDialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await page.screenshot({ path: artifact(`material-start-${width}.png`) });
    }
    // Reload keeps the empty document/undo state unchanged across tool personalisation.
    assert.deepEqual(
      await page.evaluate(() => ({
        document: JSON.stringify({ ...p, projectId: undefined }),
        revision,
        undo: history.length,
      })),
      before,
    );
    await page.locator("#startNew").click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector("#startDialog")
          .style.getPropertyValue("--studio-start-image"),
    );
    await page.locator("#setupName").fill("Montagefläche im Farbmodus");
    await page.locator("#createProject").click();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      assert.equal(
        await page
          .locator("#workspace")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        await page.locator("header").evaluate((el) => getComputedStyle(el).backgroundColor),
      );
    }
    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Designer Montagefläche");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      assert.equal(
        await page
          .locator("#carouselViewport")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        await page.locator("header").evaluate((el) => getComputedStyle(el).backgroundColor),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS start settings/focus, mirrored action rows, bounded single image, actual backdrop, persistence, setup portability/legacy/rollback, invalid/quota protection, clean removal and document isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
