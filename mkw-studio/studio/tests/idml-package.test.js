const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const idml = require("../static/idml-package.js");
const verify = (bytes) =>
  JSON.parse(
    execFileSync("python3", [path.join(__dirname, "verify-idml-package.py")], {
      input: bytes,
      stdio: ["pipe", "pipe", "pipe"],
    }).toString(),
  );
test("empty IDML has valid independent ZIP/CRC/XML references and correct physical page", () => {
  for (const [w, h] of [
    [240, 240],
    [800, 1000],
    [1080, 1350],
    [4000, 4000],
  ]) {
    const input = { w, h, name: "MKW & <Test> 🎶" },
      before = structuredClone(input),
      bytes = idml.emptyPage(input);
    assert.deepEqual(verify(bytes), {
      width: w * 0.75,
      height: h * 0.75,
      name: input.name,
      pages: 1,
    });
    assert.deepEqual(input, before);
    assert.deepEqual(idml.emptyPage(input), bytes);
  }
});
test("invalid formats and XML control/unpaired surrogate names reject before a package is returned", () => {
  for (const input of [
    { w: 0, h: 1000 },
    { w: 800, h: NaN },
    { w: 800.5, h: 1000 },
    { w: 4001, h: 1000 },
    { w: 800, h: 1000, name: "\u0000" },
    { w: 800, h: 1000, name: "\ufffe" },
    { w: 800, h: 1000, name: "\uffff" },
    { w: 800, h: 1000, name: "\ud800" },
    { w: 800, h: 1000, name: "x".repeat(81) },
  ])
    assert.throws(() => idml.emptyPage(input));
  const broken = Buffer.from(idml.emptyPage({ w: 800, h: 1000 }));
  broken[40] ^= 1;
  assert.throws(
    () => verify(broken),
    "Independent archive reader rejects corruption",
  );
});
test("committed example is the deterministic package exercised in native InDesign", () => {
  assert.deepEqual(
    Buffer.from(idml.emptyPage({ w: 800, h: 1000, name: "MKW & <Test> 🎶" })),
    fs.readFileSync(path.join(__dirname, "../examples/idml-empty-page.idml")),
  );
});
