const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [],
      downloads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Sichere Altdatei-Kopie");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      const hash = async (blob) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
          ),
        ).join(",");
      const canvas = makeCanvas(64, 64),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#256c84";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#e8ad50";
      ctx.fillRect(32, 0, 32, 64);
      const data = canvas.toDataURL(),
        im = {
          id: uid(),
          name: "Altes Foto.png",
          width: 64,
          height: 64,
          data,
          original: data,
        },
        source = fresh();
      source.images = [im];
      source.fonts = [...p.fonts];
      source.meta.title = "Altdatei mit Bruchteil-Schutzzonen";
      source.boards = [basicBoard(im, 600, 750), basicBoard(im, 240, 239)];
      source.boards[0].safe = {
        left: 55.125,
        right: 60.75,
        top: 64.25,
        bottom: 100.875,
      };
      source.boards[1].safe = {
        left: 0.125,
        right: 0.125,
        top: 119.55,
        bottom: 119.05,
      };
      for (const b of source.boards) {
        for (const e of Object.values(b.elements)) e.visible = false;
      }
      Object.assign(source.boards[0].elements.title, {
        text: "«Sommerklang»",
        visible: true,
        opticalAlign: true,
      });
      source.boards[0].elements.subtitle.text = "Verborgener Untertitel";
      source.boards[0].elements.subtitle.enabled = false;
      validate(source);
      const gzip = await new Response(
        new Blob([JSON.stringify(source)])
          .stream()
          .pipeThrough(new CompressionStream("gzip")),
      ).blob();
      const input = new File([gzip], "Altdatei.mkw"),
        fileHash = await hash(input);
      await MKWProjects.openFile(input);
      const originalId = p.projectId,
        original = snapshot(),
        safe = p.boards.map((b) => clone(b.safe)),
        png = { format: "png", quality: 95, transparent: false, png8: false };
      const before = [];
      for (const b of p.boards)
        before.push(await hash((await encodedBoard(b, png)).blob));
      await MKWCampaignUI.convert({ confirmed: true });
      if (!p.campaign)
        throw Error(document.querySelector("#status").textContent);
      const frameSafe = p.carousel.artboards.map((a) =>
        Object.fromEntries(
          ["left", "right", "top", "bottom"].map((k) => [k, a[k]]),
        ),
      );
      const after = [];
      for (const b of p.boards)
        after.push(await hash((await encodedBoard(b, png)).blob));
      const originalRecord = await MKWProjectStore.open(originalId);
      const packet = await MKWProjectFile.encodeZip(snapshot()),
        reopened = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(packet),
        );
      validate(reopened);
      validateCarousel(reopened);
      await MKWProjects.startDocument(reopened);
      const roundSafe = p.carousel.artboards.map((a) =>
        Object.fromEntries(
          ["left", "right", "top", "bottom"].map((k) => [k, a[k]]),
        ),
      );
      const round = [];
      for (const b of p.boards)
        round.push(await hash((await encodedBoard(b, png)).blob));
      const originalSafe = originalRecord.project.boards.map((b) => b.safe),
        title = p.carousel.objects.find((o) => o.campaignRole === "titles");
      const optical = title.textStyles.every((s) => s?.opticalAlign === true);
      return {
        safe,
        frameSafe,
        roundSafe,
        originalSafe,
        pngEqual: JSON.stringify(before) === JSON.stringify(after),
        roundEqual: JSON.stringify(after) === JSON.stringify(round),
        separate: p.projectId !== originalId,
        sourceLegacy: !originalRecord.project.carousel,
        sourceText: originalRecord.project.boards[0].elements.title.text,
        hiddenText: p.boards[0].elements.subtitle.text,
        fileUnchanged: fileHash === (await hash(input)),
        optical,
      };
    });
    assert.deepEqual(result.frameSafe, result.safe);
    assert.deepEqual(result.roundSafe, result.safe);
    assert.deepEqual(result.originalSafe, result.safe);
    assert(
      result.pngEqual &&
        result.roundEqual &&
        result.separate &&
        result.sourceLegacy &&
        result.fileUnchanged &&
        result.optical,
      JSON.stringify(result),
    );
    assert.equal(result.hiddenText, "Verborgener Untertitel");
    assert.equal(result.sourceText, "«Sommerklang»");
    const aborted = [];
    for (const phase of ["append", "restore"])
      for (const mutation of ["revision", "identity"]) {
        await page.evaluate(
          async ({ phase }) => {
            const source = fresh(),
              im = { ...p.images[0], id: uid() };
            delete im.captureDate;
            delete im.captureDay;
            source.images = [im];
            source.fonts = [...p.fonts];
            source.meta.title = "Ausgang für Abbruch";
            source.boards = [basicBoard(im, 600, 750)];
            source.boards[0].elements.logo.visible = true;
            await MKWProjects.startDocument(source);
            delete p.images[0].captureDate;
            delete p.images[0].captureDay;
            await MKWProjects.autosave({ writeFile: false });
            window.nativeImage = image;
            window.nativeRestore = restore;
            window.loadingCandidate = false;
            restore = async function (doc, options) {
              loadingCandidate = !!doc.campaign;
              try {
                return await nativeRestore(doc, options);
              } finally {
                loadingCandidate = false;
              }
            };
            window.imageGateUsed = false;
            window.imageGate = new Promise((r) => (window.releaseImage = r));
            window.gateEntered = new Promise((r) => (window.enteredImage = r));
            const photo = p.images[0].data;
            image = async function (src) {
              if (
                !imageGateUsed &&
                (phase === "append"
                  ? typeof src === "string" && src.includes("mkw-logo-bold")
                  : loadingCandidate && src === photo)
              ) {
                imageGateUsed = true;
                enteredImage({ loadingCandidate });
                await imageGate;
              }
              return nativeImage(src);
            };
            window.conversionPending = MKWCampaignUI.convert({
              confirmed: true,
            });
          },
          { phase },
        );
        const gate = await page.evaluate(() => gateEntered);
        if (phase === "restore") assert.equal(gate.loadingCandidate, true);
        const expected = await page.evaluate(async (mutation) => {
          if (mutation === "revision") {
            p.meta.title = "Während Vorbereitung bearbeitet";
            changed();
          } else p.projectId = uid();
          return {
            state: JSON.stringify({ p, revision, history, future, selected }),
            count: (await MKWProjectStore.list()).length,
          };
        }, mutation);
        const after = await page.evaluate(async () => {
          releaseImage();
          await conversionPending;
          image = nativeImage;
          restore = nativeRestore;
          return {
            state: JSON.stringify({ p, revision, history, future, selected }),
            count: (await MKWProjectStore.list()).length,
            campaign: !!p.campaign,
            busy,
            message: document.querySelector("#status").textContent,
          };
        });
        assert.equal(
          after.state,
          expected.state,
          phase +
            " " +
            mutation +
            " must retain current source, history and asset metadata",
        );
        assert.equal(after.count, expected.count);
        assert.equal(after.campaign, false);
        assert.equal(after.busy, false);
        assert.match(after.message, /Vorbereitung geändert/);
        aborted.push({ phase, mutation });
      }
    assert.deepEqual(downloads, []);
    assert.deepEqual(errors, []);
    require("node:fs").writeFileSync(
      artifact("backup-safe-copy.json"),
      JSON.stringify({ result, aborted }, null, 2),
    );
    console.log(
      "PASS exact fractional safezones, original gzip MKW and hidden data retained, pixel-identical PNG/MKW, preserved optical paragraphs, stale revision/identity abort during build and restore, no download",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
