const assert = require("node:assert/strict");
const path = require("node:path");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const errors = [],
      posts = [];
    const setup = async (init) => {
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      });
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (r.method() === "POST" && !r.url().includes("/api/import"))
          posts.push(r.url());
      });
      if (init) await page.addInitScript(init);
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator("#setupName").fill("Gesichtsausschnitt");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      return page;
    };
    const fixture = path.resolve(
      __dirname,
      "../testbilder/260831_A1_Probe_c-noe-plain-4.jpg",
    );
    const page = await setup(() =>
      Object.defineProperty(navigator, "connection", {
        value: undefined,
        configurable: true,
      }),
    );
    await page.evaluate(() => {
      window.subjectDiagnostics = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          this.addEventListener("error", (event) =>
            window.subjectDiagnostics.push(event.message || "Worker error"),
          );
          this.addEventListener("message", ({ data }) => {
            if (data.error) window.subjectDiagnostics.push(data.error);
          });
        }
      };
    });
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    assert.equal(
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((r) =>
            /subject-worker|vision\.js|\.tflite|\.wasm/.test(r.name),
          ),
      ),
      false,
      "recognition must stay lazy",
    );
    await page.locator("#files").setInputFiles(fixture);
    await page.waitForFunction(() => !busy && p.images.length === 1);
    const real = await page.evaluate(() => ({
      people: p.images[0].people,
      status: p.images[0].subjectStatus,
      covered: p.boards.every((b) => MKW.imageCovers(b, asset(b))),
      diagnostics: window.subjectDiagnostics,
    }));
    assert(real.people.length > 0, JSON.stringify(real));
    assert(real.covered);
    assert(!/übersprungen|nicht verfügbar/.test(real.status), real.status);
    assert(
      requests.some((u) => /face\.tflite\?v=/.test(u)),
      "real face model must run",
    );
    assert(
      requests.some((u) => /person\.tflite\?v=/.test(u)),
      "back-facing photo retains body fallback",
    );
    if (process.env.FACE_FIXTURE) {
      await page.locator("#files").setInputFiles(process.env.FACE_FIXTURE);
      await page.waitForFunction(() => !busy && p.images.length === 2);
      assert(
        await page.evaluate(() => p.images[1].people.some((r) => r.eyes)),
        "real face landmarks required",
      );
    }
    await page.screenshot({ path: artifact("subject-import-real.png") });
    await page.close();
    const slow = await setup(() =>
      Object.defineProperty(navigator, "connection", {
        value: { effectiveType: "2g", downlink: 0.1 },
        configurable: true,
      }),
    );
    const slowRequests = [];
    slow.on("request", (r) => slowRequests.push(r.url()));
    await slow.locator("#files").setInputFiles([fixture, fixture]);
    await slow.waitForFunction(() => !busy && p.images.length === 2);
    assert(
      await slow.evaluate(() =>
        p.images.every(
          (im) =>
            im.people.length === 0 && im.subjectStatus.includes("übersprungen"),
        ),
      ),
    );
    assert(
      !slowRequests.some((u) =>
        /subject-worker|vision\.js|\.tflite|\.wasm/.test(u),
      ),
      "slow connection must not fetch models",
    );
    assert(
      await slow.evaluate(() =>
        p.boards.every(
          (b) => b.elements.logo.visible && MKW.imageCovers(b, asset(b)),
        ),
      ),
    );
    await slow.close();
    const delayed = await setup(() =>
      Object.defineProperty(navigator, "connection", {
        value: undefined,
        configurable: true,
      }),
    );
    let workerRequests = 0;
    await delayed.route("**/static/subject-worker.js?*", async (route) => {
      workerRequests++;
      await route.fulfill({
        contentType: "application/javascript",
        body: "self.onmessage = () => {};",
      });
    });
    // Isolate the recognition deadline from large-photo decode/preview work.
    const smallImage = Buffer.from(
      await delayed.evaluate(
        () => makeCanvas(64, 64).toDataURL().split(",")[1],
      ),
      "base64",
    );
    const started = Date.now();
    await delayed.locator("#files").setInputFiles(
      [1, 2, 3].map((index) => ({
        name: `timeout-${index}.png`,
        mimeType: "image/png",
        buffer: smallImage,
      })),
    );
    await delayed.waitForFunction(() => !busy && p.images.length === 3);
    assert(
      Date.now() - started < 12000,
      "one bounded wait, not one wait per photo",
    );
    assert.equal(workerRequests, 1);
    assert(
      await delayed.evaluate(() =>
        p.images.every((im) => im.subjectStatus.includes("übersprungen")),
      ),
    );
    await delayed.screenshot({ path: artifact("subject-import-timeout.png") });
    await delayed.unroute("**/static/subject-worker.js?*");
    await delayed.locator("#files").setInputFiles(fixture);
    await delayed.waitForFunction(() => !busy && p.images.length === 4);
    assert(
      await delayed.evaluate(() => p.images[3].people.length > 0),
      "next explicit import retries detection",
    );
    // Geometry is verified through the same import adapter, including multiple formats.
    await delayed.evaluate(() => {
      MKWSubject.detect = async () => [
        {
          x: 0.35,
          y: 0.25,
          w: 0.2,
          h: 0.2,
          score: 0.9,
          eyes: { x: 0.45, y: 0.31 },
        },
      ];
    });
    await delayed.locator("#files").setInputFiles(fixture);
    await delayed.waitForFunction(() => !busy && p.images.length === 5);
    assert(
      await delayed.evaluate(() =>
        p.boards
          .filter((b) => b.imageId === p.images[4].id)
          .every((b) => {
            const im = p.images[4],
              target = MKWSubjectModel.position(b, im);
            return (
              b.image.x === target.x &&
              b.image.y === target.y &&
              MKW.imageCovers(b, im)
            );
          }),
      ),
    );
    await delayed.close();
    const warm = await setup(() =>
      Object.defineProperty(navigator, "connection", {
        value: undefined,
        configurable: true,
      }),
    );
    let warmRequests = 0;
    await warm.route("**/static/subject-worker.js?*", async (route) => {
      warmRequests++;
      await route.fulfill({
        contentType: "application/javascript",
        body: "let calls=0;self.onmessage=({data})=>{data.bitmap.close();if(++calls===1)self.postMessage({id:data.id,people:[]});};",
      });
    });
    const warmResult = await warm.evaluate(async () => {
      const c = makeCanvas(64, 64),
        im = { data: c.toDataURL(), width: 64, height: 64 };
      MKWSubject.beginBatch();
      await MKWSubject.detect(im);
      const start = performance.now();
      let code;
      try {
        await MKWSubject.detect(im);
      } catch (error) {
        code = error.code;
      }
      const duration = performance.now() - start;
      let skipped;
      try {
        await MKWSubject.detect(im);
      } catch (error) {
        skipped = error.code;
      }
      return { code, skipped, duration };
    });
    assert.equal(warmResult.code, "timeout");
    assert.equal(warmResult.skipped, "timeout");
    assert(
      warmResult.duration >= 1400 && warmResult.duration < 3500,
      "warm inference uses the shorter deadline",
    );
    assert.equal(warmRequests, 1);
    await warm.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(posts, []);
    console.log(
      "PASS lazy real local face/body detection, filled crop, slow-network skip, Firefox timeout once per import and retry",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
