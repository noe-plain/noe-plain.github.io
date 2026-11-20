const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const { launch, artifact, waitForProjectReady } = require("./browser.cjs");

async function fileHash(path) {
  const digest = createHash("sha256");
  for await (const part of fs.createReadStream(path)) digest.update(part);
  return digest.digest("hex");
}

async function openExample(page, file) {
  if (file) {
    await page.locator("#projectFile").setInputFiles(file);
    await waitForProjectReady(page);
    await page.waitForFunction(
      () => !document.querySelector("#projectOpeningDialog"),
    );
    return;
  }
  await page.evaluate(async () => {
    const project = fresh();
    project.meta.title = "ZIP · Verknüpfter Test";
    const data = makeCanvas(96, 96).toDataURL();
    const originalCanvas = makeCanvas(96, 96);
    const ctx = originalCanvas.getContext("2d");
    ctx.fillStyle = "tomato";
    ctx.fillRect(0, 0, 96, 96);
    const original = originalCanvas.toDataURL();
    const image = {
      id: uid(),
      name: "Probe",
      width: 96,
      height: 96,
      data,
      original,
    };
    project.images = [image];
    project.boards = [basicBoard(image, 480, 640)];
    await MKWProjects.startDocument(project);
    document.querySelector("#startDialog").close();
  });
  await waitForProjectReady(page);
}

async function editText(page, marker) {
  await page.evaluate((marker) => {
    const target = p.carousel
      ? p.carousel.objects.find((o) => o.type === "text")
      : p.boards[0].elements.title;
    checkpoint();
    if (p.carousel) {
      target.textStyles = carouselTextStylesForInput(target, marker);
      target.characterStyles = [];
    }
    target.text = marker;
    changed(false);
  }, marker);
}

async function inspectFile(page) {
  return page.evaluate(async () => {
    const { openMkwZip, sha256 } = await import(
      "./static/mkw-zip/zip-reader.mjs"
    );
    const file = await MKWProjects.fileLink().handle.getFile();
    const zip = await openMkwZip(file);
    const document = await MKWProjectFile.decode(file);
    const ranges = [];
    for (const entry of zip.entries.values()) {
      if (!entry.name.startsWith("assets/")) continue;
      const start = await zip.payloadOffset(entry);
      ranges.push([start, start + entry.size]);
    }
    return {
      identity: zip.identity,
      sha256: await sha256(await file.arrayBuffer()),
      size: file.size,
      assets: [...zip.assets.keys()].sort(),
      ranges,
      text: document.carousel
        ? document.carousel.objects.find((o) => o.type === "text").text
        : document.boards[0].elements.title.text,
      distinctOriginal: document.images[0].data !== document.images[0].original,
    };
  });
}

async function traceWrites(page) {
  await page.evaluate(() => {
    window.zipWrites = [];
    window.zipPreparedMedia = [];
    const postMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, ...options) {
      if (message.action === "prepare" && message.input?.file) {
        window.zipPreparedMedia.push(
          message.input.draft.media.filter((m) => typeof m === "string").length,
        );
      }
      return postMessage.call(this, message, ...options);
    };
    const create = FileSystemFileHandle.prototype.createWritable;
    FileSystemFileHandle.prototype.createWritable = async function (options) {
      const stream = await create.call(this, options);
      if (this.name !== "linked-test.mkw") return stream;
      const event = {
        kept: !!options?.keepExistingData,
        calls: [],
        abort: false,
      };
      window.zipWrites.push(event);
      return {
        async write(packet) {
          await stream.write(packet);
          event.calls.push([
            packet.position,
            packet.data.byteLength ?? packet.data.size,
          ]);
          if (window.failZipWrite)
            throw Error("ZIP-Testabbruch nach dem ersten Schreibaufruf.");
        },
        truncate: (size) => stream.truncate(size),
        close: async () => {
          await stream.close();
          event.closed = true;
        },
        abort: async () => {
          await stream.abort();
          event.abort = true;
        },
      };
    };
  });
}

async function recoverProject(page, id) {
  await page.reload();
  await page.locator("#startOpen").click();
  await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
  await page.locator(`#projectLibraryList [data-project-id="${id}"]`).click();
  await waitForProjectReady(page);
}

async function retrySave(page) {
  await page.locator("#save").click();
  await page.locator("#saveProject").click();
  await page.waitForFunction(
    () => !document.querySelector("#saveDialog").open && !busy,
  );
}

async function failAfterCommitAndRetry(page, id) {
  await page.evaluate(() => {
    const link = MKWProjectStore.link;
    MKWProjectStore.link = (id, handle, stamp, version) => {
      if (stamp.zip && !stamp.zipPending) {
        MKWProjectStore.link = link;
        throw Error("ZIP-Testunterbruch nach Dateicommit.");
      }
      return link(id, handle, stamp, version);
    };
  });
  const prior = "ZIP-Abnahme · Dateicommit vor Unterbruch";
  await editText(page, prior);
  await page.waitForFunction(() =>
    document
      .querySelector("[data-notice-message]")
      ?.textContent.includes("ZIP-Testunterbruch"),
  );
  const committed = await inspectFile(page);
  assert.equal(committed.text, prior);
  await recoverProject(page, id);
  await traceWrites(page);
  // A second edit must retain the actually committed first manifest when
  // arming its own checkpoint. Otherwise it cannot recover from this abort.
  const next = "ZIP-Abnahme · Zweiter Unterbruch";
  await page.evaluate(() => {
    window.failZipWrite = true;
  });
  await editText(page, next);
  await page.waitForFunction(
    () =>
      window.zipWrites.some((event) => event.abort) &&
      document
        .querySelector("[data-notice-message]")
        ?.textContent.includes("ZIP-Testabbruch"),
  );
  assert.equal((await inspectFile(page)).sha256, committed.sha256);
  await recoverProject(page, id);
  await retrySave(page);
  assert.equal((await inspectFile(page)).text, next);
}

async function checkCompactionAndExternalChange(page) {
  const before = await inspectFile(page);
  await traceWrites(page);
  await page.evaluate(() => {
    const image = p.images[0];
    p.images[0] = { ...image, original: image.data };
    changed(false);
  });
  await page.waitForFunction(
    (identity) => MKWProjects.fileLink().stamp.zipIdentity !== identity,
    before.identity,
  );
  const compact = await inspectFile(page);
  assert.equal(compact.assets.length, before.assets.length - 1);
  assert(compact.size < before.size);
  assert.equal(compact.text, before.text);

  // Replace the file through its handle, outside Studio's write queue.
  await page.evaluate(async () => {
    const copy = snapshot();
    copy.meta.title = "Andere Bearbeitung";
    const data = await MKWProjectFile.encodeZip(copy);
    const stream = await MKWProjects.fileLink().handle.createWritable();
    await stream.write({ type: "write", position: 0, data });
    await stream.close();
  });
  const changedFile = await inspectFile(page);
  await editText(page, "ZIP-Abnahme · Konflikt mit Fremddatei");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-notice-message]")
      ?.textContent.includes("ausserhalb"),
  );
  assert.equal((await inspectFile(page)).sha256, changedFile.sha256);
}

async function checkCase(browser, { case: number, file, boards }) {
  const before = file && (await fileHash(file));
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  try {
    const page = await context.newPage();
    const faults = [];
    page.on("pageerror", (error) => faults.push(error.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startOpen:enabled").waitFor();
    const chromium = browser.browserType().name() === "chromium";
    const supported = await page.evaluate(async (simulatePicker) => {
      if (!simulatePicker && !window.showSaveFilePicker) return false;
      if (!navigator.storage?.getDirectory) return false;
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle("linked-test.mkw", {
        create: true,
      });
      if (!handle.queryPermission || !handle.createWritable) return false;
      window.showSaveFilePicker = async () => handle;
      return true;
    }, chromium);
    if (!supported) {
      assert(
        !file && !chromium,
        "Private linked-ZIP acceptance needs a browser with file access.",
      );
      return null;
    }
    await openExample(page, file);
    await page.evaluate(() => {
      studioPreferences.autoSaveFile = true;
    });
    let legacyHash;
    if (!file) {
      await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle("legacy-test.mkw", {
          create: true,
        });
        window.showSaveFilePicker = async () => handle;
      });
      legacyHash = await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        const legacy = await root.getFileHandle("legacy-test.mkw");
        const packed = await MKWProjectStore.pack(p);
        const plan = await MKWProjectBlocks.prepare(
          packed,
          await legacy.getFile(),
        );
        await writeFilePlan(legacy, plan);
        const file = await legacy.getFile();
        const stamp = { size: file.size, modified: file.lastModified };
        await MKWProjectStore.link(p.projectId, legacy, stamp);
        await MKWProjects.attach({
          ...(await MKWProjectStore.open(p.projectId)),
        });
        const handle = await root.getFileHandle("linked-test.mkw");
        window.showSaveFilePicker = async () => handle;
        const { sha256 } = await import("./static/mkw-zip/zip-reader.mjs");
        return sha256(await file.arrayBuffer());
      });
    }
    await page.locator("#save").click();
    await page.locator("#saveProject").click();
    await page.waitForFunction(
      () => MKWProjects.fileLink()?.stamp?.zip && !busy,
    );
    const id = await page.evaluate(() => p.projectId);
    const initial = await inspectFile(page);
    if (!file)
      assert(
        initial.distinctOriginal,
        "The original image was lost when creating the working copy.",
      );
    await traceWrites(page);

    const first = "ZIP-Abnahme · gespeicherter Text";
    await editText(page, first);
    try {
      await page.waitForFunction(
        (identity) =>
          MKWProjects.fileLink()?.stamp?.zipIdentity !== identity &&
          window.zipWrites.some((event) => event.closed),
        initial.identity,
        { timeout: 30_000 },
      );
    } catch (error) {
      const diagnosis = await page.evaluate(() => ({
        stamp: !!MKWProjects.fileLink()?.stamp?.zipPending,
        revision,
        savedRevision,
        notice: document.querySelector("[data-notice-message]")?.textContent,
      }));
      throw Error("ZIP update did not commit: " + JSON.stringify(diagnosis), {
        cause: error,
      });
    }
    const saved = await inspectFile(page);
    assert.equal(saved.text, first);
    const [written] = await page.evaluate(() => window.zipWrites);
    assert.equal(
      written.kept,
      true,
      "Expected an incremental ZIP write for this text edit.",
    );
    assert.equal(saved.size, initial.size);
    assert.deepEqual(saved.assets, initial.assets);
    const mediaOverlap = written.calls.reduce(
      (sum, [from, length]) =>
        sum +
        initial.ranges.reduce(
          (part, [start, stop]) =>
            part +
            Math.max(0, Math.min(from + length, stop) - Math.max(from, start)),
          0,
        ),
      0,
    );
    assert.equal(mediaOverlap, 0);
    assert.deepEqual(await page.evaluate(() => window.zipPreparedMedia), [0]);

    await page.locator("#save").click();
    await page.locator("#saveProject").click();
    await page.waitForFunction(
      () => !document.querySelector("#saveDialog").open && !busy,
    );
    assert.equal(
      await page.evaluate(() => window.zipWrites.length),
      1,
      "An unchanged ZIP produced a write.",
    );

    const second = "ZIP-Abnahme · Wiederherstellung";
    await page.evaluate(() => {
      window.failZipWrite = true;
    });
    await editText(page, second);
    try {
      await page.waitForFunction(
        () =>
          window.zipWrites.some((event) => event.abort) &&
          document
            .querySelector("[data-notice-message]")
            ?.textContent.includes("ZIP-Testabbruch"),
      );
    } catch (error) {
      const state = await page.evaluate(() => ({
        writes: window.zipWrites.map(({ calls, abort }) => ({
          calls: calls.length,
          abort,
        })),
        notice: document.querySelector("[data-notice-message]")?.textContent,
        revision,
        savedRevision,
      }));
      throw Error("ZIP abort was not observed: " + JSON.stringify(state), {
        cause: error,
      });
    }
    assert.equal(
      (await inspectFile(page)).sha256,
      saved.sha256,
      "Aborted write changed the working file.",
    );

    await recoverProject(page, id);
    const recovered = await page.evaluate(() => ({
      id: p.projectId,
      boards: p.boards.length,
      text: p.carousel
        ? p.carousel.objects.find((o) => o.type === "text").text
        : p.boards[0].elements.title.text,
      linked: MKWProjects.fileLink()?.stamp?.zip,
      notice: document
        .querySelector("[data-notice-message]")
        ?.textContent.includes("Neueren Stand"),
      distinctOriginal: p.images[0].data !== p.images[0].original,
    }));
    assert.deepEqual(
      [
        recovered.id,
        recovered.boards,
        recovered.text,
        recovered.linked,
        recovered.notice,
      ],
      [id, boards, second, true, true],
    );
    if (!file)
      assert(
        recovered.distinctOriginal,
        "Recovery dropped the separate original image.",
      );

    await retrySave(page);
    const retried = await inspectFile(page);
    assert.equal(retried.text, second);
    assert.deepEqual(retried.assets, initial.assets);
    if (!file) {
      await failAfterCommitAndRetry(page, id);
      await checkCompactionAndExternalChange(page);
      const currentLegacyHash = await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        const legacy = await (
          await root.getFileHandle("legacy-test.mkw")
        ).getFile();
        const { sha256 } = await import("./static/mkw-zip/zip-reader.mjs");
        return sha256(await legacy.arrayBuffer());
      });
      assert.equal(currentLegacyHash, legacyHash);
    }
    if (file) assert.equal(await fileHash(file), before);
    assert.deepEqual(faults, []);
    return {
      case: number,
      boards,
      fileBytes: saved.size,
      writtenBytes: written.calls.reduce((sum, [, length]) => sum + length, 0),
      mediaWriteBytes: mediaOverlap,
      mediaTransferredToWorkerOnWarmSave: 0,
      noOpWriteBytes: 0,
      timedAutosave: true,
      abortPreservedFile: true,
      restoredAfterReload: true,
      retryCommitted: true,
      sourceUnchanged: true,
      ...(!file
        ? {
            interruptedCommitReconciled: true,
            assetRemovalCompacted: true,
            externalChangePreserved: true,
            migratedLinkedLegacyFileUnchanged: true,
          }
        : {}),
    };
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    let inputs = process.env.MKW_ZIP_PRIVATE_INPUT
      ? JSON.parse(fs.readFileSync(process.env.MKW_ZIP_PRIVATE_INPUT, "utf8"))
      : [{ case: 0, boards: 1 }];
    if (process.env.MKW_ZIP_PRIVATE_CASE)
      inputs = inputs.filter(
        ({ case: index }) => index === Number(process.env.MKW_ZIP_PRIVATE_CASE),
      );
    assert(inputs.length > 0, "No matching ZIP acceptance cases.");
    const checks = [];
    for (const input of inputs) {
      const result = await checkCase(browser, input);
      if (!result) {
        console.log(
          "SKIP native local-file linking in this engine. Use MKW ZIP download.",
        );
        return;
      }
      checks.push(result);
      console.log(
        `Case ${result.case}: archive update ${result.writtenBytes} B, 0 B media, recovery verified.`,
      );
    }
    fs.writeFileSync(
      artifact("mkw-zip-linked-results.json"),
      JSON.stringify({ browser: browser.version(), checks }, null, 2) + "\n",
    );
    console.log(
      "PASS linked ZIP through the editor, automatic save, no-op, atomic abort, reload, and retry.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
