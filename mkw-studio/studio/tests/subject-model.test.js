const { test } = require("node:test");
const assert = require("node:assert/strict");
const model = require("../static/subject-model.js");
const face = {
  x: 0.52,
  y: 0.32,
  w: 0.16,
  h: 0.18,
  score: 0.95,
  eyes: { x: 0.6, y: 0.4 },
};
const board = () => ({
  w: 1080,
  h: 1350,
  image: { scale: 1 },
  safe: { top: 300, bottom: 400 },
});
const photo = (people = [face]) => ({ width: 3000, height: 3000, people });
test("connection policy skips slow/data-saving networks without requiring this browser API", () => {
  for (const c of [
    undefined,
    {},
    { effectiveType: "4g", downlink: 10, rtt: 50 },
    { downlink: 0, rtt: 0 },
  ])
    assert.equal(model.skipConnection(c), false);
  for (const c of [
    { saveData: true },
    { effectiveType: "slow-2g" },
    { effectiveType: "2g" },
    { effectiveType: "3g" },
    { effectiveType: "3g", downlink: 1.5 },
    { downlink: 0.5 },
    { rtt: 600 },
  ])
    assert.equal(model.skipConnection(c), true);
});
test("face box centres on X and real eye landmarks align to the full artwork upper third", () => {
  const b = board(),
    im = photo(),
    out = model.position(b, im);
  assert.equal(out.x + (face.x + face.w / 2 - 0.5) * im.width, b.w / 2);
  assert(Math.abs(out.y + (face.eyes.y - 0.5) * im.height - b.h / 3) < 1e-8);
  assert.deepEqual(b, board(), "pure crop must not mutate source");
  b.safe = { top: 0, bottom: 0 };
  assert.deepEqual(model.position(b, im), out);
});
test("edges stay filled even if centring/eye-third cannot both be achieved", () => {
  for (const x of [0, 0.01, 0.5, 0.9])
    for (const y of [0, 0.05, 0.8, 0.99]) {
      const im = photo([{ ...face, x, eyes: { x, y } }]),
        b = board(),
        out = model.position(b, im);
      assert(out.x - 1500 <= 0 && out.x + 1500 >= b.w);
      assert(out.y - 1500 <= 0 && out.y + 1500 >= b.h);
    }
});
test("most prominent face wins; body-only projects keep the established group crop", () => {
  const im = photo([
    { ...face, w: 0.01, h: 0.01 },
    { ...face, x: 0.2, w: 0.3, h: 0.3, eyes: { x: 0.35, y: 0.35 } },
  ]);
  const out = model.position(board(), im);
  assert.equal(out.x + (0.35 - 0.5) * 3000, 540);
  const body = { x: 0.3, y: 0.1, w: 0.4, h: 0.6, score: 0.8 };
  assert.deepEqual(model.position(board(), photo([body])), { x: 540, y: 1308 });
});
test("family artwork, absent or malformed detections do not move", () => {
  assert.equal(
    model.position({ ...board(), family: { enabled: true } }, photo()),
    null,
  );
  for (const people of [[], [{ x: NaN, y: 0, w: 1, h: 1, score: 0.8 }]])
    assert.equal(model.position(board(), photo(people)), null);
});
