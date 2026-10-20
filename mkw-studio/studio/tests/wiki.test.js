const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hilfe/index.html"), "utf8");
test("wiki IDs, in-page links and local resources resolve without duplicate IDs", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (url.startsWith("#"))
      assert(ids.includes(url.slice(1)), `Missing wiki anchor: ${url}`);
    else if (!/^https?:/.test(url)) {
      const target = path.resolve(root, "hilfe", url.split(/[?#]/)[0]);
      assert(fs.existsSync(target), `Missing wiki file: ${url}`);
    }
  }
});
