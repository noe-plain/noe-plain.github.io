const assert = require("node:assert/strict");
const { launch } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({
        viewport: { width: 1450, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("50 Bilder Dateisicherung");
    await page.locator("#createProject").click();
    await require("./browser.cjs").waitForProjectReady(page);
    const native = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory(),
        h = await root.getFileHandle("fifty.mkw", { create: true });
      if (!h.queryPermission || !h.createWritable) return false;
      window.nativeTestHandle = h;
      window.showSaveFilePicker = async () => h;
      return true;
    });
    if (!native) {
      // The binary format must still open in browsers without native local-file access.
      const data =
          "data:image/png;base64," +
          Buffer.from("lossless binary bytes").toString("base64"),
        key = require("node:crypto")
          .createHash("sha256")
          .update(data)
          .digest("hex");
      const blocks = require("../static/project-blocks.js"),
        plan = await blocks.prepare({
          document: {
            projectId: "portable",
            images: [{ id: "a", assetRef: key }],
            logos: [],
            fonts: [],
          },
          assets: new Map([[key, data]]),
        });
      const parts = [];
      for (const w of plan.writes)
        parts.push([w.position, Buffer.from(await w.data.arrayBuffer())]);
      const bytes = Buffer.alloc(plan.size);
      for (const [pos, b] of parts) b.copy(bytes, pos);
      const decoded = await page.evaluate(
        async (bytes) =>
          MKWProjectFile.decode(new Blob([new Uint8Array(bytes)])),
        Array.from(bytes),
      );
      assert.equal(decoded.images[0].data, data);
      console.log("PASS native MKW binary file opens losslessly in Firefox");
      return;
    }
    await page.evaluate(async () => {
      const canvas = makeCanvas(384, 480),
        ctx = canvas.getContext("2d"),
        pixels = ctx.createImageData(384, 480);
      let seed = 31;
      p.images = [];
      p.boards = [];
      for (let n = 0; n < 50; n++) {
        for (let i = 0; i < pixels.data.length; i += 4) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          pixels.data[i] = seed & 255;
          pixels.data[i + 1] = (seed >>> 8) & 255;
          pixels.data[i + 2] = (seed >>> 16) & 255;
          pixels.data[i + 3] = 255;
        }
        ctx.putImageData(pixels, 0, 0);
        const data = canvas.toDataURL(),
          im = {
            id: uid(),
            name: `Foto ${n + 1}.png`,
            width: 384,
            height: 480,
            data,
            original: data,
          };
        p.images.push(im);
        p.boards.push(createBoard(im, 1080, 1350));
      }
      selected = null;
      clearTimeout(saveTimer);
      revision++;
      window.nativePlans = [];
      const write = writeFilePlan;
      writeFilePlan = async (h, plan) => {
        const start = performance.now();
        await write(h, plan);
        nativePlans.push({
          bytes: plan.bytesWritten,
          unchanged: !!plan.unchanged,
          reuse: !!plan.keepExistingData,
          ms: performance.now() - start,
        });
      };
      await MKWProjects.saveFile();
    });
    assert.match(
      await page.locator("#projectStorageNotice").textContent(),
      /^$/,
    );
    const first = await page.evaluate(async () => ({
      size: (await nativeTestHandle.getFile()).size,
      plan: nativePlans.at(-1),
      project: JSON.stringify(
        MKWProjectAssets.compact(p).images.map((i) => [i.id, i.data.length]),
      ),
    }));
    assert(first.size > 20 * 1024 * 1024);
    const result = await page.evaluate(async () => {
      const start = performance.now();
      p.boards[0].elements.title.x += 5;
      revision++;
      await autosave();
      return {
        ms: performance.now() - start,
        plan: nativePlans.at(-1),
        file: await MKWProjectFile.decode(await nativeTestHandle.getFile()),
      };
    });
    assert(result.plan.reuse);
    assert(result.plan.bytes < first.size / 100);
    assert.equal(result.file.images.length, 50);
    assert.equal(
      JSON.stringify(result.file.images.map((i) => [i.id, i.data.length])),
      first.project,
    );
    const size = await page.evaluate(
      async () => (await nativeTestHandle.getFile()).size,
    );
    await page.evaluate(async () => {
      for (let i = 0; i < 8; i++) {
        p.meta.subtitle = "Änderung " + i;
        revision++;
        await autosave();
      }
      await autosave();
    });
    assert(
      await page.evaluate(async () => {
        const writes = nativePlans.length;
        await autosave();
        return nativePlans.length === writes;
      }),
    );
    assert(
      Math.abs(
        (await page.evaluate(
          async () => (await nativeTestHandle.getFile()).size,
        )) - size,
      ) < 1000,
    );
    await page.reload();
    await require("./browser.cjs").openLatestProject(page);
    await page.waitForFunction(() => !busy && p.images.length === 50);
    const afterReload = await page.evaluate(async () => {
      p.meta.subtitle = "Nach Neustart";
      revision++;
      await autosave();
      const handle = MKWProjects.fileLink().handle,
        file = await MKWProjectFile.decode(await handle.getFile());
      return { count: file.images.length, text: file.meta.subtitle };
    });
    assert.deepEqual(afterReload, { count: 50, text: "Nach Neustart" });
    const smaller = await page.evaluate(async () => {
      p.boards = p.boards.slice(0, 25);
      revision++;
      await autosave();
      const file = await MKWProjects.fileLink().handle.getFile();
      return {
        size: file.size,
        count: (await MKWProjectFile.decode(file)).images.length,
      };
    });
    assert.equal(smaller.count, 25);
    assert(smaller.size < first.size * 0.6);
    // A file-stream failure aborts the transaction; the last good MKW remains readable.
    await page.evaluate(async () => {
      const link = MKWProjects.fileLink(),
        real = link.handle;
      window.originalNativeHandle = real;
      const create = FileSystemFileHandle.prototype.createWritable;
      FileSystemFileHandle.prototype.createWritable = async function (options) {
        const stream = await create.call(this, options);
        return {
          write() {
            throw Error("Test: Dateischreibfehler");
          },
          abort: () => stream.abort(),
          close: () => stream.close(),
        };
      };
      p.meta.subtitle = "Nicht auf Platte";
      revision++;
      await autosave();
    });
    assert.match(
      await page.locator("#projectStorageNotice").textContent(),
      /Dateischreibfehler/,
    );
    assert.equal(
      await page.evaluate(
        async () =>
          (await MKWProjectFile.decode(await originalNativeHandle.getFile()))
            .meta.subtitle,
      ),
      "Nach Neustart",
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS Chrome 50-image atomic MKW, layout updates ${result.plan.bytes} bytes vs ${first.size} bytes (${result.ms.toFixed(0)} ms incl. browser backup), no-growth/no-op, reload, deletion compaction and write-failure recovery`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
