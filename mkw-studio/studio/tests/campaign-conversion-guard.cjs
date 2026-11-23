const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Eigene Konvertierungsprüfung");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      const pattern = makeCanvas(128, 128);
      const pixels = pattern.getContext("2d");
      pixels.fillStyle = "#617954";
      pixels.fillRect(0, 0, 128, 128);
      pixels.fillStyle = "#3e637a";
      pixels.fillRect(64, 0, 64, 128);
      const data = pattern.toDataURL();
      const im = {
        id: uid(),
        name: "Eigenes Bild.png",
        data,
        original: data,
        width: 128,
        height: 128,
      };
      p.images = [im];
      p.boards = [
        basicBoard(im, 600, 750),
        basicBoard(im, 6000, 4000),
        basicBoard(im, 240, 239),
      ];
      p.boards[1].safe = { left: 3999.6, right: 2000.2, top: 0, bottom: 0 };
      p.boards[2].safe = { left: 0, right: 0, top: 119.55, bottom: 119.05 };
      changed();
      validate(p);
      await MKWProjects.autosave({ writeFile: false });
      const state = () =>
        JSON.stringify({ p, revision, history, future, selected });
      const before = state(),
        records = (await MKWProjectStore.list()).length;
      const version = (await MKWProjectStore.open(p.projectId)).version;
      await MKWCampaignUI.convert({ confirmed: true });
      const message = $("#status").textContent;
      if (state() !== before)
        throw Error("Invalid-format attempt changed source/history");
      if ((await MKWProjectStore.list()).length !== records)
        throw Error("Invalid-format attempt created a project");
      if ((await MKWProjectStore.open(p.projectId)).version !== version)
        throw Error("Invalid-format attempt saved the source");
      if (document.querySelector("#studioFeedbackDialog"))
        throw Error(
          "Unsupported formats must not request conversion confirmation",
        );
      const portable = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())),
      );
      validate(portable);
      const dimensions = portable.boards.map((b) => [b.w, b.h]);
      const q = {
        ...snapshot(),
        boards: [],
        carousel: undefined,
        campaign: MKWCampaignUI.newState(),
      };
      const emptyBefore = JSON.stringify(q);
      await MKWCampaignDocument.append(q, im, []);
      if (JSON.stringify(q) !== emptyBefore)
        throw Error("Empty image group mutated candidate");
      const safe = basicBoard(im, 600, 750);
      const supported = MKWCampaignDocument.checkBoards([safe]);
      let maximum = "";
      try {
        MKWCampaignDocument.checkBoards(
          Array.from({ length: 201 }, () => safe),
        );
      } catch (e) {
        maximum = e.message;
      }
      p.boards = [safe];
      changed();
      return { message, dimensions, supported, maximum };
    });
    assert.match(result.message, /Ausgabe 2 \(6000 × 4000 px\)/);
    assert.match(result.message, /Ausgabe 3 \(240 × 239 px\)/);
    assert.match(result.message, /nichts umgewandelt oder verkleinert/);
    assert.deepEqual(result.dimensions, [
      [600, 750],
      [6000, 4000],
      [240, 239],
    ]);
    assert.equal(result.supported.length, 1);
    assert.match(result.maximum, /200/);
    // A document may change asynchronously while the native decision is open.
    // Resolve the real dialog after the change, without substituting the decision API.
    for (const kind of ["project", "revision"]) {
      await page.evaluate(() => {
        window.pendingConversion = MKWCampaignUI.convert();
      });
      await page.locator("#studioFeedbackDialog").waitFor();
      const before = await page.evaluate(async (kind) => {
        if (kind === "project") {
          const q = snapshot();
          q.projectId = uid();
          q.meta.title = "Anderes Projekt";
          await MKWProjects.startDocument(q);
        } else {
          p.meta.title = "Geändert während Rückfrage";
          changed();
        }
        window.guardExpected = JSON.stringify({ p, revision, history, future });
        return {
          id: p.projectId,
          count: (await MKWProjectStore.list()).length,
        };
      }, kind);
      await page.locator("[data-feedback-confirm]").click();
      const after = await page.evaluate(async () => {
        await pendingConversion;
        return {
          same:
            guardExpected === JSON.stringify({ p, revision, history, future }),
          id: p.projectId,
          count: (await MKWProjectStore.list()).length,
          converted: !!p.campaign,
          message: $("#status").textContent,
        };
      });
      assert(after.same, kind + " must not mutate the changed project");
      assert.equal(after.id, before.id);
      assert.equal(after.count, before.count);
      assert.equal(after.converted, false);
      assert.match(after.message, /verworfen/);
    }
    // An unused retained image must not create an empty campaign row or broken base format.
    await page.evaluate(() => {
      p.images.unshift({
        ...p.images[0],
        id: uid(),
        name: "Ungenutzte erhaltene Quelle.png",
      });
      changed();
    });
    await page.evaluate(() => MKWCampaignUI.convert({ confirmed: true }));
    const success = await page.evaluate(() => {
      validate(p);
      validateCarousel(p);
      return {
        campaign: !!p.campaign,
        rows: p.campaign?.rows.length,
        slides: p.carousel?.n,
        status: $("#status").textContent,
      };
    });
    assert(success.campaign, success.status);
    assert.equal(success.rows, 1);
    assert.equal(success.slides, 1);
    // The same previously rejected dimensions now survive a real migration.
    const legacy = await page.evaluate(async () => {
      const im = p.images[0],
        original = fresh();
      original.images = [im];
      original.meta.title = "Altformate · unveränderte Masse";
      original.boards = [
        [6000, 4000],
        [240, 239],
        [6000, 400],
      ].map(([w, h]) => {
        const board = basicBoard(im, w, h);
        for (const element of Object.values(board.elements))
          element.visible = false;
        return board;
      });
      await MKWProjects.startDocument(original);
      const sourceId = p.projectId;
      const png = {
        format: "png",
        transparent: false,
        png8: false,
        quality: 95,
      };
      const hash = async (blob) =>
        [
          ...new Uint8Array(
            await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
          ),
        ].join(",");
      const before = await hash((await encodedBoard(p.boards[2], png)).blob);
      await MKWCampaignUI.convert({ confirmed: true });
      if (!p.campaign) throw Error($("#status").textContent);
      const dimension = p.boards.map((b) => [b.w, b.h]);
      const after = await hash((await encodedBoard(p.boards[2], png)).blob);
      const pdf = await encodedBoard(p.boards[2], {
        format: "pdf",
        pdf: carouselPDFPreset("original"),
      });
      const pdfFile = await carouselBuildPDF([pdf.pdfImage], "Altformat");
      const pdfDoc = await MKWPDF.PDFDocument.load(await pdfFile.arrayBuffer());
      const small = await encodedBoard(p.boards[1], {
        format: "pdf",
        pdf: carouselPDFPreset("original"),
      });
      const large = p.carousel.artboards[0];
      const editable = carouselObject("text", {
        x: large.x + 200,
        y: large.y + 200,
        w: 400,
        h: 120,
        text: "Bearbeitbares Altformat",
      });
      if (editable?.pageId !== large.id)
        throw Error("Text belongs to the wrong legacy board");
      const source = await MKWProjectStore.open(sourceId);
      const packet = await MKWProjectFile.encodeZip(snapshot());
      const reopened = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(packet),
      );
      validate(reopened);
      validateCarousel(reopened);
      await MKWProjects.startDocument(reopened);
      return {
        dimension,
        originalDimension: source.project.boards.map((b) => [b.w, b.h]),
        originalUntouched: !source.project.campaign && p.projectId !== sourceId,
        pngEqual: before === after,
        pdfSize: pdfDoc.getPage(0).getSize(),
        smallPDF: [small.pdfImage.w, small.pdfImage.h],
        reopened: p.boards.map((b) => [b.w, b.h]),
        editable: p.carousel.objects.some(
          (o) =>
            o.id === editable.id &&
            o.text === editable.text &&
            o.pageId === large.id,
        ),
      };
    });
    assert.deepEqual(legacy.dimension, [
      [6000, 4000],
      [240, 239],
      [6000, 400],
    ]);
    assert.deepEqual(legacy.originalDimension, legacy.dimension);
    assert.deepEqual(legacy.reopened, legacy.dimension);
    assert(
      legacy.originalUntouched && legacy.pngEqual && legacy.editable,
      JSON.stringify(legacy),
    );
    assert.deepEqual(legacy.pdfSize, { width: 4500, height: 300 });
    assert.deepEqual(legacy.smallPDF, [240, 239]);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      artifact("campaign-conversion-guard.json"),
      JSON.stringify(
        {
          result,
          staleProjectGuard: true,
          staleRevisionGuard: true,
          unusedImageConversion: success,
          legacy,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "PASS invalid-safezone preflight, original-size migration and export, unchanged original/history/store, full MKW dimensions, stale project/revision confirmation guards, count limit and unused-image conversion",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
