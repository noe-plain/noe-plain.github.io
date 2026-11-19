import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const [vendorDir, inputs, output, portableDirectory] = process.argv.slice(2);
if (!vendorDir || !inputs || !output)
  throw Error(
    "Usage: node check.mjs <SQLite WASM dist> <private pairs.json> <result.json> [new portable output directory]",
  );
const studio = fileURLToPath(new URL("../../../", import.meta.url));
const vendor = resolve(vendorDir);
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const wasm = path.startsWith("/sqlite-wasm/");
    const root = wasm ? vendor : resolve(studio);
    const file = resolve(
      root,
      wasm ? path.slice(13) : path.slice(1) || "index.html",
    );
    assert(file.startsWith(root + sep));
    const bytes = await readFile(file);
    response
      .writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
      })
      .end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", done);
});
const base = `http://127.0.0.1:${server.address().port}/`;
async function hash(file) {
  const digest = createHash("sha256");
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest("hex");
}
let browser;
try {
  if (portableDirectory) await mkdir(portableDirectory);
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  const proof = {
    browser: browser.version(),
    platform: process.platform,
    cases: [],
  };
  const pairs = JSON.parse(await readFile(inputs, "utf8"));
  assert(pairs.length > 0);
  for (const {
    case: caseId,
    target,
    targetHash,
    source,
    sourceHash,
  } of pairs) {
    const before = await hash(target);
    if (targetHash) assert.equal(before, targetHash);
    if (sourceHash) assert.equal(await hash(source), sourceHash);
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(base);
      await page.locator("#startOpen:enabled").waitFor();
      await page.evaluate(() => {
        const input = document.createElement("input");
        input.id = "working-session-fixture";
        input.type = "file";
        input.hidden = true;
        document.body.append(input);
      });
      await page.locator("#working-session-fixture").setInputFiles(target);
      const portableName = portableDirectory ? `case-${caseId}.mkw` : "";
      const transfer = portableName ? page.waitForEvent("download") : null;
      const result = await page
        .evaluate(async (portableName) => {
          const { checkSession } = await import(
            "./tools/mkw-container/working-session/check-page.mjs"
          );
          return checkSession(
            document.getElementById("working-session-fixture").files[0],
            portableName,
          );
        }, portableName)
        .catch(async (error) => {
          transfer?.catch(() => {});
          throw error;
        });
      if (transfer)
        await (await transfer).saveAs(resolve(portableDirectory, portableName));
      assert.equal(await hash(target), before);
      if (sourceHash) assert.equal(await hash(source), sourceHash);
      proof.cases.push({
        case: caseId,
        ...result,
        zipUnchanged: true,
        legacyCopyHashChecked: !!sourceHash,
      });
      await writeFile(output, JSON.stringify(proof, null, 2) + "\n");
      console.log(
        `Case ${caseId}: lazy paint, SQL commit, rollback and recovery passed.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  server.close();
}
