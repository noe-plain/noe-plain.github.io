const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({
        viewport: { width: 1650, height: 1150 },
      }),
      page = await context.newPage(),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.waitForFunction(() => !$("#startNew").disabled);
    const wikiRequests = () =>
      requests.filter((u) => new URL(u).pathname.includes("/hilfe/"));
    assert.equal(
      wikiRequests().length,
      0,
      "No wiki resources before the first explicit request",
    );
    assert.equal(
      await page.locator("#studioHelpDialog,#studioHelpFrame").count(),
      0,
    );
    await page.locator("#startHelp").click();
    await page.locator("#studioHelpDialog[open]").waitFor();
    await page
      .frameLocator("#studioHelpFrame")
      .locator("#helpSearch")
      .waitFor();
    const help = page.frame({ name: "mkwHelp" });
    assert.equal(
      context.pages().length,
      1,
      "Wiki opens inside the current Studio window",
    );
    assert.equal(await help.locator("main section").count(), 8);
    assert(await help.locator("body>header").isHidden());
    await help.locator("#helpSearch").fill("Firefox");
    assert(await help.locator("#speichern").isVisible());
    assert(await help.locator("#schnellstart").isHidden());
    await help.locator("#helpSearch").fill("xyznonexistent");
    assert.match(
      await help.locator("#helpResults").textContent(),
      /Keine passenden/,
    );
    await help.locator("#helpSearch").fill("Rahmenpunkte");
    assert(await help.locator("#einzelposts").isHidden());
    await help.locator('a[href="#advanced-typografie"]').click();
    assert(await help.locator("#advanced-typografie").isVisible());
    assert.equal(await help.locator("#helpSearch").inputValue(), "");
    assert.equal(
      await help.locator('nav [aria-current="location"]').getAttribute("href"),
      "#einzelposts",
    );
    await help.locator("#helpSearch").fill("Rahmenpunkte");
    await help.locator('a[href="#advanced-typografie"]').click();
    assert(await help.locator("#advanced-typografie").isVisible());
    assert.equal(await help.locator("#helpSearch").inputValue(), "");
    await help.locator("#helpSearch").fill("");
    await page.setViewportSize({ width: 360, height: 850 });
    assert(
      await help.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify(
        await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          overflow: [...document.body.children]
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .map((el) => el.id || el.tagName),
        })),
      ),
    );
    await page
      .locator("#studioHelpDialog")
      .screenshot({ path: artifact("mkw-how-to-mobile.png") });
    await help.locator("#helpSearch").focus();
    await page.keyboard.press("Escape");
    assert(await page.locator("#studioHelpDialog").isHidden());
    assert(await page.locator("#startDialog").isVisible());
    await page.waitForFunction(() => document.activeElement.id === "startHelp");
    const loaded = wikiRequests().length;
    await page.locator("#startHelp").click();
    assert(await page.locator("#studioHelpFrame").isVisible());
    assert.equal(
      wikiRequests().length,
      loaded,
      "Reopening reuses the loaded handbook",
    );
    await page.locator("#closeStudioHelp").click();
    await page.setViewportSize({ width: 1650, height: 1150 });
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const staticHelp = await noJS.newPage();
    await staticHelp.goto(new URL("hilfe/", process.env.STUDIO_URL).href);
    assert(await staticHelp.locator("#speichern").isVisible());
    assert(await staticHelp.locator("#helpSearch").isHidden());
    await noJS.close();
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Sponsorleisten");
    await page.locator("[data-format-enabled]").nth(2).check();
    await page.locator("#createProject").click();
    await require("./browser.cjs").waitForProjectReady(page);
    const photo = fs
      .readFileSync(
        path.resolve("testbilder/260831_A1_Probe_c-noe-plain-4.jpg"),
      )
      .toString("base64");
    await page.evaluate(async (data) => {
      const bitmap = await image(data),
        normalizedCanvas = makeCanvas(bitmap.width, bitmap.height);
      exportContext(normalizedCanvas).drawImage(bitmap, 0, 0);
      const normalized = normalizedCanvas.toDataURL("image/png");
      normalizedCanvas.width = normalizedCanvas.height = 1;
      p.images = [0, 1].map((i) => ({
        id: uid(),
        name: "Probenfoto " + i,
        data: normalized,
        original: normalized,
        width: bitmap.width,
        height: bitmap.height,
      }));
      p.boards = p.images.flatMap((im) =>
        p.formats.map((f) => createBoard(im, f.w, f.h)),
      );
      selected = p.boards[0].id;
      changed();
    }, "data:image/jpeg;base64," + photo);
    await page.locator("#settings").click();
    await page.locator("#settings-tab-sponsors").click();
    await page.locator("#newSponsorGroup").click();
    await page.locator("[data-sponsor-name]").first().fill("Hauptpartnerin");
    await page.locator("[data-sponsor-name]").first().press("Tab");
    let chooser = page.waitForEvent("filechooser");
    await page.locator("[data-sponsor-upload]").first().click();
    await (
      await chooser
    ).setFiles(path.resolve("tests/fixtures/sponsor-zkb.svg"));
    await page.waitForFunction(
      () =>
        sponsorGroups[0].logos.length === 1 &&
        $("#sponsorLibraryStatus")?.textContent === "" &&
        document.querySelector("[data-sponsor-upload]")?.disabled === false,
    );
    await page.locator("#newSponsorGroup").click();
    await page.locator("[data-sponsor-name]").nth(1).fill("Projektpartner");
    await page.locator("[data-sponsor-name]").nth(1).press("Tab");
    const fixtures = await page.evaluate(() => {
      const c = makeCanvas(180, 80),
        x = c.getContext("2d");
      x.fillStyle = "#888888";
      x.fillRect(15, 15, 150, 50);
      const gray = c.toDataURL();
      x.clearRect(0, 0, 180, 80);
      const g = x.createLinearGradient(0, 0, 180, 80);
      g.addColorStop(0, "#f00000");
      g.addColorStop(0.5, "#00ff22");
      g.addColorStop(1, "#0000ff");
      x.fillStyle = g;
      x.fillRect(15, 15, 150, 50);
      return { gray, complex: c.toDataURL() };
    });
    chooser = page.waitForEvent("filechooser");
    await page.locator("[data-sponsor-upload]").nth(1).click();
    await (
      await chooser
    ).setFiles([
      {
        name: "Graustufen.png",
        mimeType: "image/png",
        buffer: Buffer.from(fixtures.gray.split(",")[1], "base64"),
      },
      {
        name: "Komplex.png",
        mimeType: "image/png",
        buffer: Buffer.from(fixtures.complex.split(",")[1], "base64"),
      },
    ]);
    await page.waitForFunction(
      () =>
        sponsorGroups[1].logos.length === 2 &&
        $("#sponsorLibraryStatus")?.textContent === "" &&
        document.querySelector("[data-sponsor-upload]")?.disabled === false,
    );
    const matte = await page.evaluate(async () => {
      const c = makeCanvas(180, 100),
        ctx = exportContext(c);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 10, 160, 80);
      ctx.fillStyle = "#222222";
      ctx.fillRect(35, 25, 110, 50);
      const blob = await new Promise((resolve) => c.toBlob(resolve)),
        l = await sponsorImport(
          new File([blob], "Mit Hintergrund und Rand.png", {
            type: "image/png",
          }),
        );
      return { width: l.width, height: l.height, ink: l.ink };
    });
    assert.deepEqual(
      matte,
      { width: 110, height: 50, ink: { x: 0, y: 0, w: 1, h: 1 } },
      "Visible logo bounds exclude transparent margins and connected matte",
    );
    const jpg = await page.evaluate(async () => {
      const c = makeCanvas(320, 160),
        x = exportContext(c);
      x.fillStyle = "#236a9b";
      x.fillRect(0, 0, 320, 160);
      x.fillStyle = "#ffffff";
      x.fillRect(50, 40, 220, 80);
      x.fillStyle = "#236a9b";
      x.fillRect(100, 60, 120, 40);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
      window.__legacySponsor = {
        data: await dataURL(blob),
        width: 320,
        height: 160,
      };
      const l = await sponsorImport(
          new File([blob], "Farbhintergrund.jpg", { type: "image/jpeg" }),
        ),
        png = await image(l.data),
        out = makeCanvas(l.width, l.height),
        ctx = exportContext(out);
      ctx.drawImage(png, 0, 0);
      const a = ctx.getImageData(
        Math.floor(l.width / 2),
        Math.floor(l.height / 2),
        1,
        1,
      ).data[3];
      return {
        matte: l.matte,
        alpha: a,
        monochrome: l.monochrome,
        mode: MKWSponsors.mode(l, "#ffffff"),
        width: l.width,
      };
    });
    assert(
      jpg.matte && jpg.alpha < 10 && jpg.monochrome && jpg.mode === "multiply",
      JSON.stringify(jpg),
    );
    assert(jpg.width < 260);
    const detected = await page.evaluate(() =>
      sponsorGroups
        .flatMap((g) => g.logos)
        .map((l) => ({ name: l.name, gray: l.gray, complex: l.complex })),
    );
    assert(
      !detected[0].gray && !detected[0].complex,
      "ZKB is a simple colour mark",
    );
    assert(detected[1].gray);
    assert(detected[2].complex && !detected[2].gray);
    assert.deepEqual(
      await page.evaluate(async () =>
        (await MKWSponsorLibrary.groups()).map((g) => g.name),
      ),
      ["Hauptpartnerin", "Projektpartner"],
    );
    const ids = await page.evaluate(() =>
      sponsorGroups.map((g) => ({ id: g.id, logos: g.logos.map((l) => l.id) })),
    );
    const grayId = ids[1].logos[0],
      complexId = ids[1].logos[1];
    async function dragSponsor(sourceId, target, after = false) {
      // Keep both ends visible before native drag-and-drop; implicit scrolling
      // during drag can move the source beneath the fixed dialog chrome.
      await target.evaluate((target, sourceId) => {
        const source = document.querySelector(
            `[data-sponsor-drag="${sourceId}"]`,
          ),
          content = target.closest(".settings-content"),
          a = source.getBoundingClientRect(),
          b = target.getBoundingClientRect(),
          viewport = content.getBoundingClientRect();
        content.scrollTop +=
          (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2 -
          (viewport.top + viewport.bottom) / 2;
      }, sourceId);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const bounds = await target.boundingBox();
      await page.locator(`[data-sponsor-drag="${sourceId}"]`).dragTo(target, {
        targetPosition: {
          x: bounds.width / 2,
          y: bounds.height * (after ? 0.75 : 0.5),
        },
      });
    }
    await dragSponsor(
      grayId,
      page.locator(`[data-sponsor-drag="${complexId}"]`),
      true,
    );
    await page.waitForFunction(
      (id) => sponsorGroups[1].logos[0].id === id,
      complexId,
    );
    await page.waitForFunction(() =>
      $("#sponsorLibraryStatus")?.textContent.startsWith("Logo verschoben"),
    );
    await dragSponsor(grayId, page.locator("[data-sponsor-upload]").first());
    await page.waitForFunction(() => sponsorGroups[0].logos.length === 2);
    await page.waitForFunction(() =>
      $("#sponsorLibraryStatus")?.textContent.startsWith("Logo verschoben"),
    );
    await dragSponsor(grayId, page.locator("[data-sponsor-upload]").nth(1));
    await page.waitForFunction(
      () =>
        sponsorGroups[0].logos.length === 1 &&
        sponsorGroups[1].logos.length === 2,
    );
    await page.waitForFunction(() =>
      $("#sponsorLibraryStatus")?.textContent.startsWith("Logo verschoben"),
    );
    await page.locator(`[data-sponsor-drag="${grayId}"]`).focus();
    await page.keyboard.press("Alt+ArrowUp");
    await page.waitForFunction(
      (id) => sponsorGroups[1].logos[0].id === id,
      grayId,
    );
    await page.waitForFunction(() =>
      $("#sponsorLibraryStatus")?.textContent.startsWith("Logo verschoben"),
    );
    assert.deepEqual(
      await page.evaluate(async () =>
        (await MKWSponsorLibrary.groups()).map((g) => ({
          id: g.id,
          logos: g.logos.map((l) => l.id),
        })),
      ),
      ids,
      "Dragging preserves assets and persists order across groups",
    );
    await page.screenshot({ path: artifact("mkw-sponsor-settings.png") });
    await page.locator("#closeSettings").click();
    const firstId = await page.evaluate(() => p.images[0].id),
      first = page.locator(`[data-text-picker="${firstId}"]`);
    await first.locator("summary").click();
    assert.deepEqual(
      await first.locator(".text-type-options label").allTextContents(),
      [
        "Übertitel",
        "Konzerttitel",
        "Untertitel",
        "Winkel anzeigen",
        "Familienkonzert",
        "Sponsorenleiste",
      ],
    );
    assert.equal(await first.locator("hr").count(), 2);
    assert.match(
      (await first.getAttribute("aria-label")) ||
        (await first.locator("summary").getAttribute("aria-label")),
      /Optionen/,
    );
    await first.locator("[data-sponsor-enable]").check();
    for (let i = 0; i < 2; i++) {
      await page.locator("#postSponsors [data-sponsor-group]").nth(i).check();
      await page.waitForFunction(
        (n) => p.boards[0].sponsors?.groups.length === n,
        i + 1,
      );
    }
    await page.waitForFunction(() =>
      p.boards.every((b) => b.sponsors?.groups.length === 2),
    );
    const defaults = await page.evaluate(() =>
      p.boards.map((b) => ({
        w: b.w,
        h: b.h,
        r: MKWSponsors.layout(b),
        safe: MKWLayout.safeRect(b),
      })),
    );
    for (const b of defaults) {
      assert.equal(b.r.vertical, b.w >= b.h);
      assert.equal(b.safe.left, 100);
      assert.equal(b.safe.right, 100);
      assert.equal(b.r.thickness, 180);
    }
    const edges = await page.evaluate(async () => {
      const b = p.boards[0],
        r = MKWSponsors.layout(b),
        c = makeCanvas(b.w, b.h),
        ctx = exportContext(c),
        labels = [],
        native = ctx.fillText.bind(ctx);
      ctx.fillText = (text, x, y, width) => {
        const m = ctx.measureText(text);
        labels.push(
          x - (m.actualBoundingBoxLeft || 0) * Math.min(1, width / m.width),
        );
        native(text, x, y, width);
      };
      await paintSponsors(ctx, b);
      return r.groups.map((g, i) => ({
        label: labels[i],
        edge: g.logos[0].x + g.logos[0].ink.x * g.logos[0].w,
        start: g.x,
      }));
    });
    for (const edge of edges) {
      assert(Math.abs(edge.edge - edge.start) < 0.001);
      assert(Math.abs(edge.label - edge.start) < 0.001);
    }
    // Device default colour affects only newly created strips, never an existing document.
    const beforeDefault = await page.evaluate(() => JSON.stringify(p));
    await page.locator("#settings").click();
    await page.locator("#settings-tab-sponsors").click();
    await page.locator("#defaultSponsorColour").click();
    await page.locator("#paintHex").fill("#fee8cc");
    assert.equal(
      await page.evaluate(() => sponsorDefaults().colour),
      "#fee8cc",
    );
    assert.equal(await page.evaluate(() => JSON.stringify(p)), beforeDefault);
    await page.locator("#paintClose").click();
    await page.locator("#closeSettings").click();
    // The compact menu keeps family mode; its palette remains usable in the text tool.
    if (!(await first.evaluate((el) => el.open)))
      await first.locator("summary").click();
    await first.locator("[data-family-mode]").check();
    await page.locator("[data-step=text]").click();
    assert.equal(
      await page.locator(".family-tools .family-palette span").count(),
      8,
    );
    await page.locator("[data-family-shift]").click();
    assert.equal(await page.evaluate(() => board().family.offset), 1);
    if (!(await first.evaluate((el) => el.open)))
      await first.locator("summary").click();
    await first.locator("[data-family-mode]").uncheck();
    assert.equal(await page.locator(".family-tools").count(), 0);
    await page.locator("[data-step=logo]").click();
    assert.equal(await page.locator("#postSponsors").count(), 0);
    assert.equal(await page.locator("[data-logo]").count(), 2);
    await page.locator("[data-step=sponsors]").click();
    assert(await page.locator("#postSponsors").isVisible());
    const overrideImage = await page.evaluate(() => p.images[1].id);
    await page.evaluate((id) => {
      checkpoint();
      sponsorApply(id, clone(p.boards.find((b) => b.imageId === id).sponsors));
    }, overrideImage);
    assert(await page.evaluate((id) => p.sponsorOverrides[id], overrideImage));
    const beforeUndo = await page
      .locator(".image-info-card")
      .first()
      .elementHandle();
    await page.locator("#undo").click();
    await page.waitForFunction((card) => !card.isConnected, beforeUndo);
    await beforeUndo.dispose();
    assert(
      !(await page.evaluate((id) => p.sponsorOverrides?.[id], overrideImage)),
    );
    // Reversible heading case in sidebar and direct editing; source text remains mixed-case.
    await page.evaluate(() => {
      selected = p.boards[0].id;
      step = "text";
      layer = "date";
      renderPanel();
      syncOverlays(true);
    });
    await page.locator("#mainTextInput").fill("Aus nächster Nähe");
    assert(await page.locator("#uppercase").isChecked());
    assert.equal(
      await page.evaluate(() => board().elements.date.text),
      "Aus nächster Nähe",
    );
    assert.equal(
      await page.evaluate(
        () => textBlock(board()).mainRecords.find((r) => r.key === "date").text,
      ),
      "AUS NÄCHSTER NÄHE",
    );
    await page.locator("#uppercase").uncheck();
    assert.equal(
      await page.evaluate(
        () => textBlock(board()).mainRecords.find((r) => r.key === "date").text,
      ),
      "Aus nächster Nähe",
    );
    await page.locator("#uppercase").check();
    await page.evaluate(() => {
      const b = board(),
        el = document.querySelector(
          `.interaction[data-board="${b.id}"] [data-key=date]`,
        );
      el.focus();
      el.textContent = "Aus nächster Nähe";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.blur();
    });
    await page.locator("#uppercase").uncheck();
    assert.equal(
      await page.evaluate(() => board().elements.date.text),
      "Aus nächster Nähe",
    );
    // Click the actual rotated sponsor logo to edit its size and mode.
    const square = await page.evaluate(() => {
      const b = p.boards.find(
        (b) => b.imageId === p.images[0].id && b.w === b.h,
      );
      selectBoard(b.id);
      return b.id;
    });
    await page
      .locator(`.board-card[data-id="${square}"] .board-surface`)
      .scrollIntoViewIfNeeded();
    const point = await page.evaluate((id) => {
      const b = p.boards.find((b) => b.id === id),
        r = MKWSponsors.layout(b),
        l = r.groups[0].logos[0],
        surface = document
          .querySelector(`.board-card[data-id="${id}"] .board-surface`)
          .getBoundingClientRect();
      return {
        x: surface.left + ((r.content.w + l.y + l.h / 2) * surface.width) / b.w,
        y: surface.top + ((b.h - l.x - l.w / 2) * surface.height) / b.h,
      };
    }, square);
    await page.mouse.click(point.x, point.y);
    await page.locator("#sponsorLogoMode").waitFor();
    assert.equal(await page.evaluate(() => step), "sponsors");
    assert(
      await page
        .locator("[data-step=sponsors]")
        .evaluate((el) => el.classList.contains("active")),
    );
    assert.equal(await page.evaluate(() => selected), square);
    assert.deepEqual(
      await page
        .locator("#sponsorLogoMode option")
        .evaluateAll((nodes) => nodes.map((n) => n.value)),
      ["auto", "gray", "multiply", "screen", "original"],
    );
    await page.locator("#sponsorLogoSize").fill("140");
    await page.locator("#sponsorLogoSize").press("Tab");
    assert.equal(
      await page.evaluate(() => board().sponsors.groups[0].logos[0].scale),
      1.4,
    );
    await page.locator("#sponsorColour").click();
    assert(await page.locator("#studioPaintPicker").isVisible());
    assert(await page.locator(".picker-opacity").isHidden());
    await page.locator("#paintHex").fill("#14283c");
    assert.equal(await page.evaluate(() => board().sponsors.colour), "#14283c");
    assert.equal(
      await page.evaluate(() =>
        MKWSponsors.mode(
          board().sponsors.groups[0].logos[0],
          board().sponsors.colour,
        ),
      ),
      "screen",
    );
    await page.locator("#paintClose").click();
    for (const mode of ["multiply", "screen", "auto"]) {
      await page.locator("#sponsorLogoMode").selectOption(mode);
      assert.equal(
        await page.evaluate(() => board().sponsors.groups[0].logos[0].mode),
        mode,
      );
      assert.equal(
        await page.evaluate(
          () =>
            MKWProjectAssets.compact(p).boards.find((b) => b.id === selected)
              .sponsors.groups[0].logos[0].mode,
        ),
        mode,
      );
    }
    // Explicit template refresh keeps manual edits when a logo moves between groups.
    const zkbId = ids[0].logos[0];
    for (const target of [1, 0]) {
      await page.locator("#settings").click();
      await page.locator("#settings-tab-sponsors").click();
      await dragSponsor(
        zkbId,
        page.locator("[data-sponsor-upload]").nth(target),
      );
      await page.waitForFunction(
        ({ id, target }) =>
          sponsorGroups[target].logos.some((logo) => logo.id === id),
        { id: zkbId, target },
      );
      await page.waitForFunction(() =>
        $("#sponsorLibraryStatus")?.textContent.startsWith("Logo verschoben"),
      );
      await page.locator("#closeSettings").click();
      await page.locator("#sponsorRefreshTemplates").click();
      await page.waitForFunction(
        ({ id, target }) =>
          board().sponsors.groups[target].logos.some((l) => l.id === id),
        { id: zkbId, target },
      );
      assert.equal(
        await page.evaluate(
          (id) =>
            board()
              .sponsors.groups.flatMap((g) => g.logos)
              .find((l) => l.id === id).scale,
          zkbId,
        ),
        1.4,
      );
    }
    // The same singleton also works in modal settings; closing does not close its owner.
    await page.locator("#settings").click();
    await page.locator("#settings-tab-guides").click();
    await page.locator("#guideColour").click();
    await page.locator("#paintHex").fill("#987654");
    assert.equal(
      await page.evaluate(() => studioPreferences.guideColour),
      "#987654",
    );
    await page.keyboard.press("Escape");
    assert(await page.locator("#settingsDialog").isVisible());
    assert(await page.locator("#studioPaintPicker").isHidden());
    await page.locator("#closeSettings").click();
    await page.evaluate(() => {
      step = "crop";
      renderPanel();
    });
    await page.locator("#bg").click();
    await page.locator("#paintHex").fill("#214455");
    assert.equal(await page.evaluate(() => board().bg), "#214455");
    await page.locator("#paintClose").click();
    assert.equal(await page.locator("#studioPaintPicker").count(), 1);
    const reads = await page.evaluate(async () => {
      const b = board(),
        c = makeCanvas(b.w, b.h),
        ctx = exportContext(c);
      await paint(ctx, b);
      const native = CanvasRenderingContext2D.prototype.getImageData;
      let count = 0;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        count++;
        return native.apply(this, args);
      };
      try {
        for (let i = 0; i < 3; i++) await paint(ctx, b);
      } finally {
        CanvasRenderingContext2D.prototype.getImageData = native;
        c.width = c.height = 1;
      }
      return count;
    });
    assert.equal(
      reads,
      0,
      "Repeated sponsor rendering reuses prepared rasters without pixel analysis",
    );
    // Older opaque JPG project logos can be repaired explicitly, with asset cleanup and undo.
    const legacy = await page.evaluate(() => {
      checkpoint();
      const source = board(),
        config = clone(source.sponsors),
        id = uid(),
        asset = {
          ...window.__legacySponsor,
          id,
          name: "Altes JPG-Logo",
          purpose: "sponsor",
        };
      p.logos.push(asset);
      config.groups[0].logos[0] = {
        id,
        name: asset.name,
        width: 320,
        height: 160,
        density: 0.3,
        cx: 0.5,
        cy: 0.5,
        gray: false,
        complex: false,
        mode: "auto",
        scale: 1,
      };
      sponsorApply(source.imageId, config);
      sponsorOpenProperties(source.imageId, { boardId: source.id, logoId: id });
      return { id, data: asset.data };
    });
    await page.locator("#sponsorLogoMatte").click();
    await page.waitForFunction(
      (id) => board().sponsors.groups[0].logos[0].id !== id,
      legacy.id,
    );
    const repaired = await page.evaluate(async (old) => {
      const l = board().sponsors.groups[0].logos[0],
        a = p.logos.find((a) => a.id === l.id),
        bitmap = await sponsorBitmap(a, "white"),
        sample = makeCanvas(a.width, a.height),
        ctx = exportContext(sample);
      ctx.drawImage(bitmap, 0, 0);
      return {
        matte: !!a.matte,
        oldRetained: p.logos.some((a) => a.id === old),
        alpha: ctx.getImageData(
          Math.floor(a.width / 2),
          Math.floor(a.height / 2),
          1,
          1,
        ).data[3],
        count: MKWProjectAssets.compact(p).logos.length,
      };
    }, legacy.id);
    assert.deepEqual(repaired, {
      matte: true,
      oldRetained: false,
      alpha: 0,
      count: 3,
    });
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(
        (id) => p.logos.find((a) => a.id === id)?.data,
        legacy.id,
      ),
      legacy.data,
    );
    await page.evaluate(() => undo());
    assert.equal(
      await page.evaluate(() => board().sponsors.groups[0].logos[0].scale),
      1.4,
    );
    // Real multiply/screen must blend gray pixels with the bar, not paint an opaque gray rectangle.
    const compositing = await page.evaluate(async () => {
      const source = makeCanvas(90, 30),
        sc = exportContext(source);
      for (const [i, v] of [40, 120, 200].entries()) {
        sc.fillStyle = `rgb(${v},${v},${v})`;
        sc.fillRect(i * 30, 0, 30, 30);
      }
      const id = uid(),
        asset = {
          id,
          width: 90,
          height: 30,
          data: source.toDataURL(),
          purpose: "sponsor",
        };
      p.logos.push(asset);
      try {
        const samples = {};
        for (const mode of ["multiply", "screen", "original"]) {
          const b = {
              w: 1080,
              h: 1350,
              sponsors: {
                enabled: true,
                colour: "#80c0a0",
                height: 180,
                groups: [
                  {
                    id: "test",
                    name: "",
                    enabled: true,
                    logos: [
                      {
                        id,
                        name: "Tonal test",
                        width: 90,
                        height: 30,
                        density: 1,
                        gray: true,
                        complex: false,
                        mode,
                        scale: 1,
                      },
                    ],
                  },
                ],
              },
            },
            canvas = makeCanvas(b.w, b.h),
            ctx = exportContext(canvas);
          await paintSponsors(ctx, b);
          const r = MKWSponsors.layout(b),
            l = r.groups[0].logos[0];
          samples[mode] = [1 / 6, 1 / 2, 5 / 6].map((t) => [
            ...ctx.getImageData(
              Math.floor(l.x + l.w * t),
              Math.floor(r.content.h + l.y + l.h / 2),
              1,
              1,
            ).data,
          ]);
          if (ctx.globalCompositeOperation !== "source-over")
            throw Error("Blend state leaked");
          canvas.width = canvas.height = 1;
        }
        const a = await sponsorBitmap(asset, "gray", "#ffffff"),
          again = await sponsorBitmap(asset, "gray", "#f0e0d0"),
          inverse = await sponsorBitmap(asset, "gray", "#14283c");
        samples.cache = { reused: a === again, separate: a !== inverse };
        const flat = makeCanvas(4, 4),
          fc = exportContext(flat);
        fc.fillStyle = "#888888";
        fc.fillRect(0, 0, 4, 4);
        const flatAsset = {
          id: uid(),
          width: 4,
          height: 4,
          gray: true,
          monochrome: false,
          data: flat.toDataURL(),
        };
        p.logos.push(flatAsset);
        try {
          const gray = await sponsorBitmap(flatAsset, "gray", "#ffffff"),
            grayInverse = await sponsorBitmap(flatAsset, "gray", "#14283c");
          samples.flat = [
            exportContext(gray).getImageData(1, 1, 1, 1).data[0],
            exportContext(grayInverse).getImageData(1, 1, 1, 1).data[0],
          ];
        } finally {
          p.logos = p.logos.filter((l) => l.id !== flatAsset.id);
          flat.width = flat.height = 1;
        }
        return samples;
      } finally {
        p.logos = p.logos.filter((l) => l.id !== id);
        pruneSponsorRasters();
        source.width = source.height = 1;
      }
    });
    for (const [mode, expected] of Object.entries({
      multiply: [
        [0, 0, 0],
        [64, 96, 80],
        [128, 192, 160],
      ],
      screen: [
        [255, 255, 255],
        [192, 224, 208],
        [128, 192, 160],
      ],
      original: [
        [40, 40, 40],
        [120, 120, 120],
        [200, 200, 200],
      ],
    })) {
      compositing[mode].forEach((pixel, i) => {
        assert.equal(pixel[3], 255);
        expected[i].forEach((value, c) =>
          assert(
            Math.abs(pixel[c] - value) <= 1,
            `${mode} pixel ${i}: ${pixel}`,
          ),
        );
      });
    }
    assert.deepEqual(compositing.cache, { reused: true, separate: true });
    assert.deepEqual(compositing.flat, [136, 119]);
    const beforeHelp = await page.evaluate(() => JSON.stringify(p));
    await page.evaluate(() => studioSetTheme("dark"));
    await page.locator("#help").click();
    assert.equal(
      await help.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    await page
      .locator("#studioHelpDialog")
      .screenshot({ path: artifact("mkw-how-to-dark.png") });
    await page.locator("#closeStudioHelp").click();
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      beforeHelp,
      "Help never changes the artwork",
    );
    await page.evaluate(() => studioSetTheme("light"));
    // Full export pixels are shared with preview. PSD also includes a named strip layer.
    const exports = await page.evaluate(async () => {
      p.boards = p.boards.filter(
        (b) => b.imageId === p.images[0].id && b.w === b.h,
      );
      selected = p.boards[0].id;
      const b = board(),
        expected = makeCanvas(b.w, b.h);
      await paint(exportContext(expected), b);
      const png = await encodedBoard(b, {
          format: "png",
          quality: 90,
          colours: 256,
          transparent: false,
        }),
        bitmap = await createImageBitmap(png.blob),
        actual = makeCanvas(b.w, b.h);
      exportContext(actual).drawImage(bitmap, 0, 0);
      const baselineBlob = await new Promise((resolve) =>
          expected.toBlob(resolve, "image/png"),
        ),
        baseline = await createImageBitmap(baselineBlob);
      exportContext(expected).clearRect(0, 0, b.w, b.h);
      exportContext(expected).drawImage(baseline, 0, 0);
      const a = exportContext(actual).getImageData(0, 0, b.w, b.h).data,
        e = exportContext(expected).getImageData(0, 0, b.w, b.h).data,
        psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer()),
        strip = psd.children
          .flatMap((l) => l.children || [])
          .find((l) => l.name === "Sponsorenleiste");
      let bounds = [b.w, b.h, 0, 0],
        samples = [];
      for (let i = 0; i < a.length; i += 4)
        if (a.slice(i, i + 4).some((v, j) => v !== e[i + j])) {
          const x = (i / 4) % b.w,
            y = Math.floor(i / 4 / b.w);
          bounds = [
            Math.min(bounds[0], x),
            Math.min(bounds[1], y),
            Math.max(bounds[2], x),
            Math.max(bounds[3], y),
          ];
          if (samples.length < 5)
            samples.push([
              x,
              y,
              Array.from(a.slice(i, i + 4)),
              Array.from(e.slice(i, i + 4)),
            ]);
        }
      return {
        bounds,
        samples,
        debug: { actual: actual.toDataURL(), expected: expected.toDataURL() },
        png: a.every((v, i) => v === e[i]),
        diff: a.reduce((n, v, i) => n + (v !== e[i]), 0),
        max: a.reduce((n, v, i) => Math.max(n, Math.abs(v - e[i])), 0),
        strip:
          !!strip?.children?.some((l) => l.vectorFill?.type === "color") &&
          !!(() => {
            const flat = (ls) =>
              ls.flatMap((l) => [l, ...flat(l.children || [])]);
            return flat(strip.children).some((l) => l.placedLayer);
          })(),
        logos: MKWProjectAssets.compact(p).logos.length,
      };
    });
    if (!exports.png)
      for (const [name, data] of Object.entries(exports.debug))
        fs.writeFileSync(
          artifact("mkw-diff-" + name + ".png"),
          Buffer.from(data.split(",")[1], "base64"),
        );
    delete exports.debug;
    assert(exports.png, "PNG output " + JSON.stringify(exports));
    assert(exports.strip, "PSD strip " + JSON.stringify(exports));
    assert.equal(exports.logos, 3);
    await page.evaluate(async () => {
      await autosave();
    });
    await page.reload();
    await require("./browser.cjs").openLatestProject(page);
    await page.waitForFunction(
      () =>
        !busy || $("#startStatus").textContent.includes("Projekt konnte nicht"),
    );
    assert.equal(
      await page.evaluate(() => p.boards.length),
      1,
      await page.locator("#startStatus").textContent(),
    );
    assert.equal(
      await page.evaluate(() => p.boards[0].sponsors.colour),
      "#14283c",
    );
    assert.equal(
      await page.evaluate(() => p.boards[0].elements.date.text),
      "Aus nächster Nähe",
    );
    assert.equal(
      await page.evaluate(() => p.boards[0].elements.date.uppercase),
      false,
    );
    assert.equal(
      await page.evaluate(() => studioPreferences.sponsorColour),
      "#fee8cc",
    );
    // Library deletion affects device templates; explicit project removal releases portable assets.
    await page.locator("#settings").click();
    await page.locator("#settings-tab-sponsors").click();
    await page.locator("[data-sponsor-delete]").first().click();
    await page.waitForFunction(() => sponsorGroups.length === 1);
    assert.equal(
      await page.evaluate(() => MKWProjectAssets.compact(p).logos.length),
      3,
    );
    await page.locator("#closeSettings").click();
    await page.evaluate(() => {
      step = "sponsors";
      selected = p.boards[0].id;
      renderPanel();
    });
    await page.locator("[data-sponsor-remove-group]").first().click();
    assert.equal(
      await page.evaluate(() => MKWProjectAssets.compact(p).logos.length),
      2,
    );
    await page.locator("#undo").click();
    assert.equal(
      await page.evaluate(() => MKWProjectAssets.compact(p).logos.length),
      3,
    );
    await page.screenshot({ path: artifact("mkw-sponsor-editor.png") });
    assert.deepEqual(errors, []);
    console.log(
      "PASS device sponsor groups, ZKB/gray/complex analysis, automatic contrast, rotated layout and safe zones, direct logo editing, reversible heading case, singleton picker in both editors/modal settings, wiki without JS, PNG/PSD, MKW restore and asset pruning",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
