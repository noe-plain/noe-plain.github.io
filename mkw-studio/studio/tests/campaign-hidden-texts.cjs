const assert = require("node:assert/strict");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Gespeicherte Alttexte");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const original = await page.evaluate(async () => {
      const canvas = makeCanvas(64, 64),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#446f80";
      ctx.fillRect(0, 0, 64, 64);
      const data = canvas.toDataURL(),
        q = fresh();
      q.fonts = [...p.fonts];
      q.images = [0, 1].map((n) => ({
        id: uid(),
        name: `Foto ${n + 1}.png`,
        width: 64,
        height: 64,
        data,
        original: data,
      }));
      q.boards = q.images.map((im, index) => {
        const b = basicBoard(im, 600, 750);
        b.safe = { top: 50, bottom: 80, left: 40, right: 40 };
        b.elements.logo.visible = false;
        Object.assign(b.elements.title, {
          visible: true,
          text: `Sichtbarer Titel ${index + 1}`,
          size: 56,
        });
        Object.assign(b.elements.date, {
          visible: false,
          text: "«Ouvertüre»\nZweiter Absatz",
          size: 28,
          role: "Harriet",
          uppercase: false,
          opticalAlign: true,
          textStyles: [
            { size: 28, align: "center", lineHeight: 1.1 },
            { size: 24, lineHeight: 1.2 },
          ],
          characterStyles: [
            {
              start: 0,
              end: 5,
              font: "Harriet Italic",
              color: "#193c54",
              size: 31,
              underline: true,
            },
          ],
        });
        Object.assign(b.elements.subtitle, {
          enabled: false,
          visible: true,
          text: `Untertitel ${index + 1} <img src=x>\nZweite Zeile`,
          size: 26,
        });
        Object.assign(b.elements.copyright, {
          visible: false,
          text: "Foto © Test",
        });
        b.family = { enabled: true, background: "#f4efdf", offset: 6 };
        return b;
      });
      const tiny = basicBoard(q.images[1], 240, 239);
      tiny.safe = { top: 119.55, bottom: 119.05, left: 0, right: 0 };
      for (const e of Object.values(tiny.elements)) e.visible = false;
      tiny.elements.subtitle.text = "Nicht darstellbarer Alttext";
      q.boards.push(tiny);
      await MKWProjects.startDocument(q);
      const hash = async (b) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await b.arrayBuffer()),
          ),
        ).join(",");
      const options = {
          format: "png",
          quality: 95,
          png8: false,
          transparent: false,
        },
        before = [];
      for (const b of p.boards)
        before.push(await hash((await encodedBoard(b, options)).blob));
      const id = p.projectId,
        source = snapshot();
      await MKWCampaignUI.convert({ confirmed: true });
      if (!p.campaign)
        throw Error(document.querySelector("#status").textContent);
      const after = [];
      for (const b of p.boards)
        after.push(await hash((await encodedBoard(b, options)).blob));
      window.legacySource = source;
      carouselSlideSelect(0);
      return {
        id,
        samePixels: before.every((v, i) => v === after[i]),
        matches: before.map((v, i) => v === after[i]),
        count: p.carousel.objects.length,
        markers: p.boards.every((b) => b.campaignLegacyTexts === true),
        titles: p.carousel.objects
          .filter((o) => o.campaignRole === "titles")
          .map((o) => JSON.stringify(o)),
      };
    });
    assert(original.samePixels && original.markers, JSON.stringify(original));
    assert.equal(await page.locator("[data-legacy-text]").count(), 3);
    const summary = page.locator(".campaign-legacy-texts summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    assert(
      await page.locator(".campaign-legacy-texts").evaluate((el) => el.open),
    );
    assert.equal(
      await page.locator(".campaign-legacy-texts img").count(),
      0,
      "Untrusted saved text stays plain text",
    );
    const viewport = await page
      .locator("#carouselViewport")
      .evaluate((el) => [el.scrollLeft, el.scrollTop]);
    await page.locator("[data-legacy-text=date]").focus();
    await page.keyboard.press("Enter");
    const added = await page.evaluate(() => {
      const o = carouselSelected()[0],
        source = legacySource.boards[0].elements.date;
      return {
        id: o.id,
        text: o.text,
        raw: source.text,
        local: o.campaignLocal,
        role: o.campaignRole,
        count: p.carousel.objects.length,
        offset: MKWCampaignUI.decorate(o).familyOffset,
        rich: o.characterStyles.some(
          (s) => s.font === "Harriet Italic" && s.underline,
        ),
        styles: o.textStyles.map((s) => s.align),
        optical: o.textStyles.every((s) => s.opticalAlign),
        titles: p.carousel.objects
          .filter((o) => o.campaignRole === "titles")
          .map((o) => JSON.stringify(o)),
        linked: p.campaign.links.some(
          (l) => l.source === o.id || l.targets.some((t) => t.id === o.id),
        ),
        duplicate: MKWCampaignMigration.recoverText(
          p,
          p.carousel.artboards[0],
          "date",
        ),
      };
    });
    assert.equal(added.text, added.raw);
    assert(added.local && added.rich && added.optical);
    assert.equal(added.role, "legacy-date");
    assert.equal(added.offset, 6);
    assert.equal(added.count, original.count + 1);
    assert(!added.linked && added.duplicate === null);
    assert.deepEqual(added.titles, original.titles);
    assert.equal(added.styles[0], "center");
    assert.deepEqual(
      await page
        .locator("#carouselViewport")
        .evaluate((el) => [el.scrollLeft, el.scrollTop]),
      viewport,
    );
    assert(
      await page
        .locator(`[data-layer="${added.id}"] .carousel-layer-name`)
        .evaluate((el) => el === document.activeElement),
    );
    assert.equal(await page.locator("[data-legacy-text=date]").count(), 0);
    await page.locator("#undo").click();
    await page
      .locator("[data-legacy-text=date]")
      .waitFor({ state: "attached" });
    assert(
      !(await page.evaluate(
        (id) => p.carousel.objects.some((o) => o.id === id),
        added.id,
      )),
    );
    assert.equal(await page.locator("[data-legacy-text=date]").count(), 1);
    await page.locator("#redo").click();
    await page
      .locator("[data-legacy-text=date]")
      .waitFor({ state: "detached" });
    assert(
      await page.evaluate(
        (id) => p.carousel.objects.some((o) => o.id === id),
        added.id,
      ),
    );
    await page.locator(".campaign-legacy-texts summary").click();
    await page.evaluate(() => {
      window.staleLegacyButton = document.querySelector(
        "[data-legacy-text=subtitle]",
      );
      carouselSlideSelect(1);
      const before = JSON.stringify([p, revision, history, future]);
      staleLegacyButton.click();
      if (JSON.stringify([p, revision, history, future]) !== before)
        throw Error("Stale page action changed a different output");
      carouselSlideSelect(0);
    });
    if (
      !(await page.locator(".campaign-legacy-texts").evaluate((el) => el.open))
    )
      await summary.click();
    await page.locator("[data-legacy-text=subtitle]").click();
    const subtitleId = await page.evaluate(() => carouselSelected()[0].id);
    await page.locator("#carouselTextEdit").click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type("!");
    await page.keyboard.press("Escape");
    assert(
      await page.evaluate(
        (id) => p.carousel.objects.find((o) => o.id === id).text.endsWith("!"),
        subtitleId,
      ),
    );
    assert(
      await page.evaluate(
        () =>
          p.boards[0].elements.subtitle.text ===
          legacySource.boards[0].elements.subtitle.text,
      ),
    );
    if (
      !(await page.locator(".campaign-legacy-texts").evaluate((el) => el.open))
    )
      await summary.click();
    await page.locator("[data-legacy-text=copyright]").click();
    assert(
      await page.evaluate(
        () =>
          carouselSelected()[0].campaignRole === "copyright" &&
          carouselSelected()[0].angle === -90,
      ),
    );
    assert.equal(await page.locator(".campaign-legacy-texts").count(), 0);
    const round = await page.evaluate(async (sourceId) => {
      const pixels = async (blob) => {
        const im = await createImageBitmap(blob),
          canvas = makeCanvas(im.width, im.height),
          ctx = exportContext(canvas);
        ctx.drawImage(im, 0, 0);
        im.close();
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const digest = async (blob) =>
          Array.from(
            new Uint8Array(
              await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
            ),
          ).join(","),
        options = {
          format: "png",
          quality: 95,
          png8: false,
          transparent: false,
        },
        beforeBlob = (await encodedBoard(p.boards[0], options)).blob,
        beforePixels = await pixels(beforeBlob),
        before = await digest(beforeBlob),
        objectsBefore = clone(p.carousel.objects),
        boardsBefore = clone(p.boards),
        framesBefore = clone(p.carousel.artboards),
        fontsBefore = clone(fontStatus);
      const packet = await MKWProjectFile.encodeZip(snapshot()),
        q = MKWProjectAssets.hydrate(await MKWProjectFile.decode(packet));
      validate(q);
      validateCarousel(q);
      const bad = clone(q);
      bad.boards[0].campaignLegacyTexts = "yes";
      let rejected = false;
      try {
        validate(bad);
      } catch {
        rejected = true;
      }
      await MKWProjects.startDocument(q);
      carouselSlideSelect(0);
      const afterBlob = (await encodedBoard(p.boards[0], options)).blob,
        afterPixels = await pixels(afterBlob),
        after = await digest(afterBlob),
        pdf = await encodedBoard(p.boards[0], {
          format: "pdf",
          pdf: carouselPDFPreset("original"),
        }),
        psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer()),
        layers = (nodes) =>
          nodes.flatMap((n) => [n, ...layers(n.children || [])]);
      const source = await MKWProjectStore.open(sourceId);
      const frame = p.carousel.artboards[0],
        merged = psd.canvas
          .getContext("2d")
          .getImageData(frame.x, frame.y, frame.w, frame.h).data;
      let psdMax = 0;
      for (let i = 0; i < merged.length; i++)
        psdMax = Math.max(psdMax, Math.abs(merged[i] - afterPixels.data[i]));
      let max = 0,
        count = 0,
        box = [600, 750, 0, 0];
      for (let i = 0; i < beforePixels.data.length; i += 4) {
        const delta = Math.max(
          ...[0, 1, 2, 3].map((k) =>
            Math.abs(beforePixels.data[i + k] - afterPixels.data[i + k]),
          ),
        );
        if (delta) {
          count++;
          max = Math.max(max, delta);
          const x = (i / 4) % 600,
            y = Math.floor(i / 4 / 600);
          box = [
            Math.min(box[0], x),
            Math.min(box[1], y),
            Math.max(box[2], x),
            Math.max(box[3], y),
          ];
        }
      }
      return {
        delta: { max, count, ...(count ? { box } : {}) },
        psdMax,
        boardsSame: JSON.stringify(boardsBefore) === JSON.stringify(p.boards),
        framesSame:
          JSON.stringify(framesBefore) === JSON.stringify(p.carousel.artboards),
        orderSame:
          JSON.stringify(objectsBefore.map((o) => o.id)) ===
          JSON.stringify(p.carousel.objects.map((o) => o.id)),
        rejected,
        markers: p.boards.every((b) => b.campaignLegacyTexts === true),
        exact: before === after,
        pdf: pdf.pdfImage.w === 600 && pdf.pdfImage.h === 750,
        psd:
          ["Übertitel · Altdatei", "Untertitel · Altdatei"].every((name) =>
            layers(psd.children).some((n) => n.text && n.name.includes(name)),
          ) &&
          layers(psd.children).some((n) =>
            n.name.includes("Copyright · Altdatei"),
          ),
        local: p.carousel.objects.filter(
          (o) =>
            o.campaignLocal &&
            ["legacy-date", "legacy-subtitle", "copyright"].includes(
              o.campaignRole,
            ),
        ).length,
        originalUntouched:
          !source.project.campaign &&
          !source.project.boards[0].campaignLegacyTexts &&
          source.project.boards[0].elements.subtitle.enabled === false,
        images: p.images.length,
        changes: objectsBefore.flatMap((o) => {
          const after = p.carousel.objects.find((n) => n.id === o.id);
          const keys = Object.keys({ ...o, ...after }).filter(
            (key) => JSON.stringify(o[key]) !== JSON.stringify(after?.[key]),
          );
          return keys.length ? [{ name: o.name, keys }] : [];
        }),
        fontsBefore,
        fontsAfter: fontStatus,
        psdNames: layers(psd.children)
          .filter((n) => n.text)
          .map((n) => n.name),
      };
    }, original.id);
    assert(
      round.rejected &&
        round.markers &&
        round.originalUntouched &&
        round.exact &&
        round.pdf &&
        round.psd &&
        round.psdMax <= 1 &&
        round.boardsSame &&
        round.framesSame &&
        round.orderSame &&
        !round.changes.length,
      JSON.stringify(round),
    );
    assert.equal(round.local, 3);
    assert.equal(round.images, 2);
    assert.equal(await page.locator(".campaign-legacy-texts").count(), 0);
    await page.evaluate(() => {
      delete p.boards[1].campaignLegacyTexts;
      carouselSlideSelect(1);
    });
    assert.equal(
      await page.locator("[data-legacy-text]").count(),
      3,
      "Older converted files with explicit legacy title layers remain recoverable",
    );
    await page.locator(".campaign-legacy-texts summary").click();
    await page.locator("[data-legacy-text=date]").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: artifact("campaign-hidden-texts-light.png"),
    });
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.evaluate(() => studioSetTheme("dark"));
    await page.locator("[data-legacy-text=date]").scrollIntoViewIfNeeded();
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(
      await page.evaluate(async () =>
        (await axe.run("#carouselSidebar")).violations
          .filter((v) => ["serious", "critical"].includes(v.impact))
          .map((v) => v.id),
      ),
      [],
    );
    assert(
      await page
        .locator(".campaign-legacy-texts")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.screenshot({ path: artifact("campaign-hidden-texts-dark.png") });
    await page.evaluate(() => {
      window.savedLegacyObjects = p.carousel.objects;
      const a = p.carousel.artboards[1];
      p.carousel.objects = [...p.carousel.objects];
      while (p.carousel.objects.length < 500)
        p.carousel.objects.push(
          MKWCampaignDocument.base("text", a, {
            text: "Reserve",
            visible: false,
            campaignLocal: true,
          }),
        );
      carouselPanel();
    });
    assert.equal(await page.locator("[data-legacy-text]:disabled").count(), 3);
    assert.match(
      await page.locator(".campaign-legacy-texts [role=status]").innerText(),
      /500/,
    );
    await page.evaluate(() => {
      const before = JSON.stringify([p, revision, history, future]);
      document.querySelector("[data-legacy-text]").onclick();
      if (JSON.stringify([p, revision, history, future]) !== before)
        throw Error("Limit changed project/history");
      p.carousel.objects = savedLegacyObjects;
      carouselSlideSelect(2);
    });
    await page.locator(".campaign-legacy-texts summary").click();
    const failed = await page.evaluate(() => {
      const before = JSON.stringify([p, revision, history, future]);
      document.querySelector("[data-legacy-text=subtitle]").click();
      return {
        unchanged: before === JSON.stringify([p, revision, history, future]),
        message: document.querySelector("#status").textContent,
      };
    });
    assert(failed.unchanged);
    assert.match(failed.message, /Alttext nicht übernommen/);
    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=preview]").click();
    await page.locator("#setupName").fill("Neue Kampagne ohne Alttexte");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const png = await page.evaluate(
      () => makeCanvas(64, 64).toDataURL().split(",")[1],
    );
    await page.locator("#files").setInputFiles({
      name: "Neu.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await page.waitForFunction(() => p.campaign?.rows.length && !busy);
    assert.equal(await page.locator(".campaign-legacy-texts").count(), 0);
    await page.evaluate(() => {
      const before = JSON.stringify([p, revision, history, future]);
      staleLegacyButton.click();
      if (JSON.stringify([p, revision, history, future]) !== before)
        throw Error("Stale project action changed the new document");
    });
    assert.deepEqual(errors, []);
    require("node:fs").writeFileSync(
      artifact("campaign-hidden-texts.json"),
      JSON.stringify(
        {
          originalPixelsUnchanged: original.samePixels,
          originalMarkers: original.markers,
          recovery: {
            local: added.local,
            rich: added.rich,
            offset: added.offset,
            duplicated: added.duplicate !== null,
            linked: added.linked,
          },
          roundTrip: round,
          pageErrors: errors,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "PASS lazy hidden legacy texts, unchanged PNG/original, rich local layers/family/copyright, native editing, undo/redo, stale actions, MKW, old-copy detection, 500-layer/error safety, keyboard, light/dark axe and no new-campaign noise",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
