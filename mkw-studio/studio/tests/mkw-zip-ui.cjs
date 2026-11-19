const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");

async function openMkw(page, file) {
  await page.locator("#projectFile").setInputFiles(file);
  await waitForProjectReady(page);
  await page.waitForFunction(
    () => !document.querySelector("#projectOpeningDialog"),
  );
}

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startOpen:enabled").waitFor();
    if (process.env.MKW_ZIP_CODEC_ONLY) {
      const version = await page.evaluate(async () => {
        const project = fresh();
        const image = makeCanvas(32, 32).toDataURL();
        project.images = [{ id: uid(), width: 32, height: 32, data: image }];
        project.boards = [basicBoard(project.images[0], 360, 480)];
        project.meta.title = "MKW ZIP · Codec";
        const archive = await MKWProjectFile.encodeZip(project);
        const decoded = await MKWProjectFile.decode(archive);
        if (
          decoded.meta.title !== project.meta.title ||
          decoded.images[0].data !== image
        )
          throw Error("MKW-ZIP-Rundlauf verlor Daten.");
        return (
          await (
            await import("./static/mkw-zip/zip-reader.mjs")
          ).openMkwZip(archive)
        ).manifest.formatVersion;
      });
      assert.equal(version, 3);
      console.log(
        "PASS binary image and editable model roundtrip through the versioned ZIP worker.",
      );
      return;
    }
    const title = "MKW ZIP · Prüftitel";
    await page.evaluate(async (title) => {
      const q = fresh();
      const c = makeCanvas(96, 96);
      const ctx = exportContext(c);
      ctx.fillStyle = "#406d8c";
      ctx.fillRect(0, 0, c.width, c.height);
      const data = c.toDataURL();
      q.meta.title = title;
      q.images = [
        {
          id: uid(),
          width: 96,
          height: 96,
          name: "Probe",
          data,
          original: data,
        },
      ];
      q.boards = [
        basicBoard(q.images[0], 360, 480),
        basicBoard(q.images[0], 360, 480),
      ];
      q.boards[0].elements.title.text = "Erste Seite";
      q.boards[1].elements.title.text = "Zweite Seite";
      await MKWProjects.startDocument(q);
      document.querySelector("#startDialog").close();
    }, title);
    await waitForProjectReady(page);
    await page.locator("#save").click();
    const downloadZip = page.waitForEvent("download");
    await page.locator("#saveZipCopy").click();
    const file = artifact("mkw-zip-ui-copy.mkw");
    const saved = await downloadZip;
    assert(saved.suggestedFilename().endsWith(" – ZIP.mkw"));
    await saved.saveAs(file);
    assert.equal(
      fs.readFileSync(file).subarray(0, 4).toString("hex"),
      "504b0304",
    );
    await openMkw(page, file);
    assert.equal(await page.evaluate(() => p.meta.title), title);
    assert.equal(
      await page.evaluate(() => p.boards[1].elements.title.text),
      "Zweite Seite",
    );
    assert.equal(await page.evaluate(() => MKWProjects.fileLink()), undefined);
    assert.equal(
      await page.evaluate(() => p.images[0].data === p.images[0].original),
      true,
    );

    // Presentation damage must not replace the active project.
    const damaged = fs.readFileSync(file);
    damaged[damaged.length - 22] ^= 0xff;
    const before = await page.evaluate(() =>
      JSON.stringify({ p, history, future }),
    );
    await page.locator("#projectFile").setInputFiles({
      name: "defekt.mkw",
      mimeType: "application/zip",
      buffer: damaged,
    });
    await page.waitForFunction(
      () => !busy && !document.querySelector("#projectOpeningDialog"),
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify({ p, history, future })),
      before,
    );

    await page.locator("#export").click();
    await page.locator("[data-export-format=png]").click();
    await page.locator("#exportNames input").last().uncheck();
    await page.locator("#exportZipProfile").check();
    const imageZip = page.waitForEvent("download").catch(async (error) => {
      throw Error(
        (await page.locator("#exportStatus").textContent()) || error.message,
      );
    });
    await page.locator("#zip").click();
    const exported = artifact("mkw-zip-ui-outputs.zip");
    await (await imageZip).saveAs(exported);
    const archive = fs.readFileSync(exported);
    const members = new Map();
    for (let at = 0; archive.readUInt32LE(at) === 0x04034b50; ) {
      const size = archive.readUInt32LE(at + 18);
      const nameLength = archive.readUInt16LE(at + 26);
      const content = at + 30 + nameLength + archive.readUInt16LE(at + 28);
      const name = archive.toString("utf8", at + 30, at + 30 + nameLength);
      members.set(name, archive.subarray(content, content + size));
      at = content + size;
    }
    const names = [...members.keys()];
    const inside = names.find((name) => name.endsWith(".mkw"));
    assert.equal(names.filter((name) => name.endsWith(".png")).length, 1);
    assert(
      inside,
      "Full editable project must accompany a partial image export",
    );
    const embedded = artifact("mkw-zip-ui-embedded.mkw");
    fs.writeFileSync(embedded, members.get(inside));
    assert.equal(
      fs.readFileSync(embedded).subarray(0, 4).toString("hex"),
      "504b0304",
    );
    if (await page.locator("#closeExport").isVisible())
      await page.locator("#closeExport").click();
    await openMkw(page, embedded);
    assert.equal(await page.evaluate(() => p.boards.length), 2);
    assert.equal(
      await page.evaluate(() => p.boards[1].elements.title.text),
      "Zweite Seite",
    );

    if (process.env.MKW_ZIP_PRIVATE_INPUT) {
      const fixtures = JSON.parse(
        fs.readFileSync(process.env.MKW_ZIP_PRIVATE_INPUT, "utf8"),
      );
      for (const { case: index, file: input, boards, designer } of fixtures) {
        const priorId = await page.evaluate(() => p.projectId);
        await openMkw(page, input);
        const state = await page.evaluate(() => ({
          id: p.projectId,
          boards: p.boards.length,
          designer: !!p.carousel,
          linked: !!MKWProjects.fileLink(),
          revisionPresent: p.carousel
            ? p.carousel.objects.some(
                (o) => o.type === "text" && o.text.endsWith(" ·"),
              )
            : p.boards[0].elements.title.text.endsWith(" ·"),
        }));
        assert(
          state.id !== priorId && state.revisionPresent,
          `Text revision missing in case ${index}`,
        );
        assert.equal(state.boards, boards);
        assert.equal(state.designer, designer);
        assert.equal(state.linked, false);
      }
    }
    const designer = await browser.newPage();
    await designer.goto(process.env.STUDIO_URL);
    await designer.locator("#startDesigner").click();
    await designer.locator("#setupName").fill("MKW ZIP Belastungstest");
    await designer.locator("#cw").fill("360");
    await designer.locator("#ch").fill("480");
    await designer.locator("#cn").fill("20");
    await designer.locator("#createProject").click();
    await waitForProjectReady(designer);
    const multirow = await designer.evaluate(async () => {
      MKWSpreadUI.addSpread();
      MKWSpreadUI.addSpread();
      const c = p.carousel;
      MKWSpreadUI.commit(
        {
          type: "row-slide",
          ids: c.pageStructure.groups.at(-1),
          operation: "resize",
          count: 3,
        },
        "Dritte Reihe",
      );
      const imageCanvas = makeCanvas(96, 96);
      const ctx = exportContext(imageCanvas);
      const photos = Array.from({ length: 50 }, (_, i) => {
        ctx.fillStyle = `rgb(${50 + i}, 100, 150)`;
        ctx.fillRect(0, 0, 96, 96);
        const data = imageCanvas.toDataURL();
        return {
          id: uid(),
          name: "Testmotiv",
          width: 96,
          height: 96,
          data,
          original: data,
        };
      });
      p.images.push(photos[0]);
      const seed = carouselObject("image", {
        imageId: photos[0].id,
        x: 20,
        y: 20,
        w: 60,
        h: 60,
      });
      const input = snapshot();
      input.extensionProbe = "data:text/plain," + String.fromCharCode(0xd800);
      input.images.push(...photos.slice(1));
      for (const [i, photo] of photos.slice(1).entries()) {
        const frame = input.carousel.artboards[i % input.carousel.n];
        input.carousel.objects.push({
          ...seed,
          imageId: photo.id,
          id: uid(),
          x: frame.x + 10,
          y: frame.y + 10,
          pageId: frame.id,
          artboardScoped: true,
        });
      }
      const zip = await MKWProjectFile.encodeZip(input);
      const output = MKWProjectAssets.hydrate(await MKWProjectFile.decode(zip));
      validate(output);
      validateCarousel(output);
      const photosPreserved = photos.filter(
        (photo) =>
          output.images.find((im) => im.id === photo.id)?.data === photo.data,
      ).length;
      const lastImage = photos.at(-1).id;
      output.carousel.objects = output.carousel.objects.filter(
        (o) => o.imageId !== lastImage,
      );
      MKWProjectAssets.prune(output);
      const { openMkwZip } = await import("./static/mkw-zip/zip-reader.mjs");
      const reencoded = await openMkwZip(
        await MKWProjectFile.encodeZip(output),
      );
      const beforeRemoval = await openMkwZip(zip);
      return {
        rows: output.carousel.pageStructure.groups.map((g) => g.length),
        photosPreserved,
        preservedUnknownUrl: output.extensionProbe === input.extensionProbe,
        removedAssetCompacted:
          reencoded.assets.size === beforeRemoval.assets.size - 1,
      };
    });
    assert.deepEqual(multirow, {
      rows: [20, 1, 3],
      photosPreserved: 50,
      preservedUnknownUrl: true,
      removedAssetCompacted: true,
    });
    console.log(
      "PASS MKW-ZIP download/reopen, corrupt file, project in partial PNG ZIP and 1/3/20 slides with 50 images.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
