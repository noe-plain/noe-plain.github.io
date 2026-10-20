const { test } = require("node:test");
const assert = require("node:assert/strict");
const L = require("../static/layout.js");
const board = (w = 1080) => ({
  w,
  h: 1920,
  elements: Object.fromEntries(
    [...L.keys, "logo"].map((key) => [
      key,
      {
        text: key,
        visible: true,
        size: key === "title" ? 88 : 32,
        align: "left",
        role: "Replica LL",
      },
    ]),
  ),
});
const measure = (text, size) => text.length * size * 0.5;
test("stack defaults reproduce original geometry, independent pair gaps keep the bottom and copyright fixed", () => {
  const b = board(),
    original = L.textLayout(b, measure);
  b.textBox = { offset: 0, gaps: { "date:title": 8, "title:subtitle": 8 } };
  assert.deepEqual(L.textLayout(b, measure), original);
  b.textBox.gaps["date:title"] = 38;
  const custom = L.textLayout(b, measure);
  assert.equal(custom.h, original.h + 30);
  assert.equal(custom.mainRecords[0].y, original.mainRecords[0].y - 30);
  assert.equal(custom.mainRecords[1].y, original.mainRecords[1].y);
  assert.equal(custom.mainRecords[2].y, original.mainRecords[2].y);
  assert.deepEqual(custom.copyright, original.copyright);
  b.textBox.offset = 90;
  const moved = L.textLayout(b, measure);
  assert.equal(moved.y, custom.y - 90);
  assert.equal(b.textBox.gaps["date:title"], 38);
});
test("hidden titles use the adjacent pair, zero spacing is valid, oversized gaps fit within safe zones", () => {
  const b = board(2160);
  b.elements.title.visible = false;
  b.textBox = { offset: 0, gaps: { "date:title": 555, "title:subtitle": 444 } };
  const original = L.textLayout(b, measure);
  assert.equal(
    original.mainRecords[1].y -
      original.mainRecords[0].y -
      original.mainRecords[0].h,
    16,
  );
  b.textBox.gaps["date:subtitle"] = 0;
  const zero = L.textLayout(b, measure);
  assert.equal(
    zero.mainRecords[1].y - zero.mainRecords[0].y - zero.mainRecords[0].h,
    0,
  );
  b.textBox.gaps["date:subtitle"] = L.maxStackGap;
  const fit = L.textLayout(b, measure);
  assert(fit.factor < 1);
  assert(fit.y >= fit.safe.y - 1e-6);
  assert(
    fit.mainRecords.every((r) => r.y + r.h <= fit.safe.y + fit.safe.h + 1e-6),
  );
});
test("stack metadata rejects malformed files and accepts legacy positions", () => {
  for (const box of [
    undefined,
    { offset: 0 },
    { offset: 20, gaps: {} },
    { offset: 0, gaps: { "date:title": 0, "date:subtitle": 10000 } },
  ])
    assert.doesNotThrow(() => L.validateTextBox(box));
  for (const gaps of [
    null,
    [],
    42,
    { "date:title": -1 },
    { "title:subtitle": NaN },
    { "date:subtitle": 10001 },
    { "copyright:title": 2 },
  ])
    assert.throws(() => L.validateTextBox({ offset: 0, gaps }));
  for (const offset of [-1, NaN, Infinity, undefined])
    assert.throws(() => L.validateTextBox({ offset }));
});
