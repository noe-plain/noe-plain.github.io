// Manual N01.0 experiment. No application bundles or runtime dependencies are changed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { platform, arch } from "node:os";
import { chromium, firefox, webkit } from "playwright";

const [vendorDirectory, outputDirectory, ...requestedBrowsers] =
  process.argv.slice(2);
if (!vendorDirectory || !outputDirectory)
  throw Error(
    "Usage: node run.mjs <sqlite-wasm dist> <output directory> [chromium firefox webkit]",
  );
const vendor = resolve(vendorDirectory);
const output = resolve(outputDirectory);
const probe = dirname(fileURLToPath(import.meta.url));
const studio = resolve(probe, "../..");
await mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const generated = [
      "/zip-probe-before.zip",
      "/zip-write-plan.json",
    ].includes(url.pathname);
    const prefix = url.pathname.startsWith("/probe-vendor/")
      ? "/probe-vendor/"
      : url.pathname.startsWith("/probe/")
        ? "/probe/"
        : "/";
    const root = generated
      ? output
      : prefix === "/probe-vendor/"
        ? vendor
        : prefix === "/probe/"
          ? probe
          : studio;
    const file = resolve(
      root,
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
    );
    if (!file.startsWith(root + sep)) throw Error("Outside root");
    const data = await readFile(file);
    // Mirrors the deployment constraint: no cross-origin isolation headers.
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveListen) =>
  server.listen(0, "127.0.0.1", resolveListen),
);
const base = "http://127.0.0.1:" + server.address().port;
const engines = { chromium, firefox, webkit };
const result = {
  platform: platform(),
  architecture: arch(),
  fixture: {
    count: 50,
    image: [384, 480],
    board: [600, 750],
    description: "distinct synthetic lossless PNGs",
  },
  browsers: {},
};

async function measureMKW(page) {
  await page.locator("#startNew:enabled").waitFor();
  return page.evaluate(async () => {
    const q = fresh();
    const c = makeCanvas(384, 480);
    const g = exportContext(c);
    const pixels = g.createImageData(c.width, c.height);
    let seed = 31;
    for (let n = 0; n < 50; n++) {
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i] = seed & 255;
        pixels.data[i + 1] = (seed >>> 8) & 255;
        pixels.data[i + 2] = (seed >>> 16) & 255;
        pixels.data[i + 3] = 255;
      }
      g.putImageData(pixels, 0, 0);
      const data = c.toDataURL();
      const im = {
        id: uid(),
        name: "Foto " + (n + 1),
        width: c.width,
        height: c.height,
        data,
        original: data,
      };
      q.images.push(im);
      q.boards.push(basicBoard(im, 600, 750));
    }
    validate(q);
    const measure = async (work) => {
      const start = performance.now();
      const value = await work();
      return { value, ms: performance.now() - start };
    };
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("baseline.mkw", { create: true });
    const download = await measure(() => MKWProjectFile.encode(q));
    const packed = await measure(() => MKWProjectStore.pack(q));
    if (packed.value.assets.size !== 50)
      throw Error("Expected 50 distinct assets");
    const plan = await measure(() =>
      MKWProjectBlocks.prepare(packed.value, new Blob([])),
    );
    const write = await measure(() => writeFilePlan(handle, plan.value));
    const file = await handle.getFile();
    const reads = {};
    for (const [format, source] of [
      ["download", download.value],
      ["native", file],
    ]) {
      const start = performance.now();
      const parsed = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(source),
      );
      validate(parsed);
      validateCarousel(parsed);
      reads[format] = { decodeAndValidateMs: performance.now() - start };
      if (
        parsed.boards.length !== 50 ||
        parsed.images.some((im, i) => im.data !== q.images[i].data)
      )
        throw Error("MKW roundtrip lost pixels or boards");
      p = parsed;
      // First artwork paint on a separate canvas. Excludes the open dialog and autosave.
      const surface = makeCanvas(240, 300);
      await paint(exportContext(surface), parsed.boards[0], 0.4);
      reads[format].throughFirstArtworkPaintMs = performance.now() - start;
      surface.width = surface.height = 1;
      cache.clear();
      pruneImagePreviews(new Set());
    }
    q.boards[0].elements.title.text = "Geänderter Titel";
    const changed = await measure(async () => {
      const next = await MKWProjectStore.pack(q);
      const delta = await MKWProjectBlocks.prepare(next, file);
      await writeFilePlan(handle, delta);
      return { next, delta };
    });
    const saved = await handle.getFile();
    const updated = await MKWProjectFile.decode(saved);
    if (updated.boards[0].elements.title.text !== "Geänderter Titel")
      throw Error("Update was not persisted");
    const unchanged = await MKWProjectBlocks.prepare(changed.value.next, saved);
    if (
      !unchanged.unchanged ||
      unchanged.bytesWritten !== 0 ||
      !changed.value.delta.keepExistingData
    )
      throw Error("Expected asset reuse and zero writes for no-op");
    await root.removeEntry("baseline.mkw");
    return {
      download: { bytes: download.value.size, encodeMs: download.ms },
      native: {
        bytes: file.size,
        packMs: packed.ms,
        planMs: plan.ms,
        writeMs: write.ms,
        firstWriteBytes: plan.value.bytesWritten,
        layoutEditMs: changed.ms,
        layoutEditWriteBytes: changed.value.delta.bytesWritten,
        noOpWriteBytes: unchanged.bytesWritten,
      },
      reads,
    };
  });
}

async function sqliteProbe(page, engine) {
  const run = (action) =>
    page.evaluate(
      (action) =>
        new Promise((resolveRun, reject) => {
          const worker = new Worker("/probe/worker.mjs", { type: "module" });
          const timer = setTimeout(() => {
            worker.terminate();
            reject(Error("SQLite worker did not finish within 25 seconds"));
          }, 25000);
          worker.onmessage = ({ data }) => {
            clearTimeout(timer);
            worker.terminate();
            if (data.error) reject(Error(data.error));
            else
              resolveRun({
                ...data,
                bytes: Array.from(data.bytes),
                isolated: crossOriginIsolated,
              });
          };
          worker.onerror = (event) => {
            clearTimeout(timer);
            worker.terminate();
            reject(Error(event.message || "Worker initialization failed"));
          };
          worker.postMessage({ action, directory: "mkw-design-format-probe" });
        }),
      action,
    );
  const before = await run("create");
  const after = await run("edit");
  assert.equal(after.committed, "Konzert · Neuer Text 1");
  assert.equal(before.isolated, false);
  await writeFile(
    resolve(output, engine + "-before.sqlite"),
    Buffer.from(before.bytes),
  );
  await writeFile(
    resolve(output, engine + "-after.sqlite"),
    Buffer.from(after.bytes),
  );
  let differing = Math.abs(before.bytes.length - after.bytes.length);
  let changedPages = new Set();
  const pageSize = before.bytes[16] * 256 + before.bytes[17] || 65536;
  for (let i = 0; i < Math.min(before.bytes.length, after.bytes.length); i++)
    if (before.bytes[i] !== after.bytes[i]) {
      differing++;
      changedPages.add(Math.floor(i / pageSize));
    }
  const { bytes: initial, ...create } = before;
  const { bytes: edited, ...edit } = after;
  return {
    create,
    edit,
    pageSize,
    initialBytes: initial.length,
    editedBytes: edited.length,
    differingBytes: differing,
    changedSQLitePages: changedPages.size,
    foreignKeyRollback: true,
    reopenedInNewWorker: true,
  };
}

async function verifyZipCommit(page) {
  return page.evaluate(async () => {
    const response = await fetch("/zip-probe-before.zip");
    const source = await response.blob();
    const data = await (await fetch("/zip-write-plan.json")).json();
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("zip-probe.zip", { create: true });
    const digest = async () => {
      const bytes = await (await handle.getFile()).arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
    };
    const writes = data.writes.map(({ position, base64 }) => ({
      position,
      data: new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))]),
    }));
    const plan = { keepExistingData: true, size: data.size, writes };
    try {
      const initial = await handle.createWritable();
      await initial.write(source);
      await initial.close();
      if ((await digest()) !== data.beforeSha256)
        throw Error("Incorrect fixture");
      // Stop between actual writes and close. The production helper must abort its stream.
      const stopped = "Probe interrupted before close";
      try {
        await writeFilePlan(
          {
            async createWritable(options) {
              const stream = await handle.createWritable(options);
              return {
                write: (value) => stream.write(value),
                truncate: (size) => stream.truncate(size),
                async close() {
                  throw Error(stopped);
                },
                abort: () => stream.abort(),
              };
            },
          },
          plan,
        );
        throw Error("Expected interrupted write");
      } catch (error) {
        if (error.message !== stopped) throw error;
      }
      if ((await digest()) !== data.beforeSha256)
        throw Error("Abort modified the original ZIP");
      const started = performance.now();
      await writeFilePlan(handle, plan);
      const writeMs = performance.now() - started;
      if ((await digest()) !== data.afterSha256)
        throw Error("ZIP commit diverged");
      return {
        storage: "browser OPFS FileSystemFileHandle",
        abortPreservedOriginal: true,
        commitMatchedVerifiedZip: true,
        writeMs,
        writeBytes: writes.reduce((sum, write) => sum + write.data.size, 0),
      };
    } finally {
      await root.removeEntry("zip-probe.zip");
    }
  });
}

try {
  for (const name of requestedBrowsers.length
    ? requestedBrowsers
    : Object.keys(engines)) {
    const record = (result.browsers[name] = {});
    let browser;
    try {
      browser = await engines[name].launch(
        name === "chromium"
          ? { channel: "chrome", headless: true }
          : { headless: true },
      );
      record.version = browser.version();
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      });
      await page.goto(base);
      try {
        record.sqlite = await sqliteProbe(page, name);
        if (name === "chromium") {
          execFileSync("python3", [
            resolve(probe, "zip_delta.py"),
            output,
            name,
          ]);
          record.zip = JSON.parse(
            await readFile(resolve(output, "zip-results.json"), "utf8"),
          );
          record.zipBrowserCommit = await verifyZipCommit(page);
        }
      } catch (error) {
        record.sqliteError = error.message;
      }
      const cdp =
        name === "chromium" ? await page.context().newCDPSession(page) : null;
      const heap = async () =>
        cdp ? (await cdp.send("Runtime.getHeapUsage")).usedSize : null;
      record.sampledJSHeapBefore = await heap();
      const samples = [];
      let samplePending = false;
      const sampler =
        cdp &&
        setInterval(async () => {
          if (samplePending) return;
          samplePending = true;
          try {
            samples.push(await heap());
          } catch {
          } finally {
            samplePending = false;
          }
        }, 50);
      try {
        record.mkw = await measureMKW(page);
      } catch (error) {
        record.mkwError = error.message;
      } finally {
        if (sampler) clearInterval(sampler);
      }
      record.sampledJSHeapAfter = await heap();
      if (samples.length) {
        record.sampledJSHeapPeak = Math.max(
          ...samples,
          record.sampledJSHeapAfter,
        );
        record.heapSamples = samples.length;
      }
      await page.close();
    } catch (error) {
      record.launchError = error.message
        .split("\n")
        .filter((line) => !line.startsWith("<launching>"))
        .slice(0, 7)
        .join("\n");
    } finally {
      await browser?.close();
    }
    console.log(name, JSON.stringify(record));
  }
} finally {
  server.close();
  await writeFile(
    resolve(output, "browser-results.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
}

if (
  result.browsers.chromium &&
  (!result.browsers.chromium.mkw || !result.browsers.chromium.zipBrowserCommit)
)
  process.exitCode = 1;
