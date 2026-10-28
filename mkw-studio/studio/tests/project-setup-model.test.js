const assert = require("node:assert/strict");
const { test } = require("node:test");
const model = require("../static/project-setup-model.js");
const base = { w: 1080, h: 1920, top: 200, bottom: 500, left: 100, right: 100 };
test("Setup validates only offending fields and never treats empty drafts as zero", () => {
  assert.deepEqual(model.errors(base), {});
  assert.deepEqual(Object.keys(model.errors({ ...base, top: NaN })), ["top"]);
  assert.deepEqual(Object.keys(model.errors({ ...base, top: 1900 })).sort(), [
    "bottom",
    "top",
  ]);
  assert.deepEqual(Object.keys(model.errors({ ...base, left: 1000 })).sort(), [
    "left",
    "right",
  ]);
  assert.deepEqual(Object.keys(model.errors({ ...base, w: 5000 }, true)), [
    "w",
  ]);
  assert.deepEqual(model.errors({ ...base, w: 5000 }), {});
  assert.deepEqual(
    Object.keys(model.errors({ ...base, w: 10000, h: 10000 })).sort(),
    ["h", "w"],
  );
  for (const key of model.keys)
    assert(model.errors({ ...base, [key]: 1.5 })[key]);
});
test("Duplicate detection considers only selected finite dimensions; document projection excludes UI metadata", () => {
  const a = { ...base, id: 0, enabled: true },
    b = { ...base, id: 1, enabled: false },
    c = { ...base, id: 2, enabled: true };
  assert.deepEqual([...model.duplicateIds([a, b, c])], [0, 2]);
  assert.deepEqual([...model.duplicateIds([a, b, { ...c, w: NaN }])], []);
  assert.deepEqual(model.format({ ...a, custom: true }), base);
});
