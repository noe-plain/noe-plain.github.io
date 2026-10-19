const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  P = require("../static/sponsor-pixels.js");
function fixture(background = [32, 98, 148]) {
  const w = 80,
    h = 40,
    d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      d.set([...background, 255], k);
      if (x >= 15 && x < 65 && y >= 10 && y < 30)
        d.set([250, 250, 250, 255], k);
      if (x >= 30 && x < 50 && y >= 15 && y < 25)
        d.set([...background, 255], k);
    }
  return { w, h, d };
}
test("uniform coloured matte is separated, including enclosed background holes", () => {
  const { w, h, d } = fixture();
  assert.deepEqual(P.separate(d, w, h), [32, 98, 148]);
  assert.equal(d[3], 0);
  assert.equal(d[(20 * w + 40) * 4 + 3], 0);
  assert.equal(d[(12 * w + 20) * 4 + 3], 255);
});
test("JPEG-like background noise is ignored without erasing foreground", () => {
  const { w, h, d } = fixture();
  for (let k = 0; k < d.length; k += 4)
    for (let c = 0; c < 3; c++) d[k + c] += ((k / 4) % 9) - 4;
  assert(P.separate(d, w, h));
  assert.equal(d[3], 0);
  assert.equal(d[(12 * w + 20) * 4 + 3], 255);
});
test("white and black mattes both preserve actual logo content", () => {
  for (const bg of [
    [255, 255, 255],
    [0, 0, 0],
  ]) {
    const { w, h, d } = fixture(bg);
    if (bg[0] === 255)
      for (let y = 10; y < 30; y++)
        for (let x = 15; x < 65; x++) d.set([10, 10, 10, 255], (y * w + x) * 4);
    assert(P.separate(d, w, h));
    assert.equal(d[3], 0);
    assert.equal(d[(12 * w + 20) * 4 + 3], 255);
  }
});
test("transparent silhouettes and solid colour swatches are left intact", () => {
  const { w, h, d } = fixture();
  for (let k = 0; k < d.length; k += 4) if (d[k] < 100) d[k + 3] = 0;
  const original = d.slice();
  assert.equal(P.separate(d, w, h), null);
  assert.deepEqual(d, original);
  const solid = new Uint8ClampedArray(80 * 40 * 4);
  for (let k = 0; k < solid.length; k += 4) solid.set([128, 128, 128, 255], k);
  assert.equal(P.separate(solid, 80, 40), null);
  assert.equal(solid[3], 255);
});
test("nonuniform photographic edges are not mistaken for a flat background", () => {
  const { w, h, d } = fixture();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      d[k] = x * 3;
      d[k + 1] = y * 6;
      d[k + 2] = (x + y) * 2;
    }
  const original = d.slice();
  assert.equal(P.separate(d, w, h), null);
  assert.deepEqual(d, original);
});
