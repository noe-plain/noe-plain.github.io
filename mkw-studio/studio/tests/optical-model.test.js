const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  text = require("../static/text-model.js"),
  edit = require("../static/text-edit-model.js");
test("optical paragraph choice survives clipboard slicing and rejects invalid portable types", () => {
  const o = {
    text: "Erster Absatz\nZweiter Absatz",
    font: "Arial",
    size: 70,
    color: "#ffffff",
    opticalAlign: true,
    textStyles: [{ opticalAlign: false }, { opticalAlign: true }],
  };
  const clip = edit.slice(o, 0, o.text.length);
  assert.deepEqual(
    clip.textStyles.map((s) => s.opticalAlign),
    [false, true],
  );
  text.validate(o, new Set(["Arial"]));
  for (const invalid of [
    { ...o, opticalAlign: "true" },
    { ...o, textStyles: [{ opticalAlign: 1 }] },
  ])
    assert.throws(() => text.validate(invalid, new Set(["Arial"])));
});
