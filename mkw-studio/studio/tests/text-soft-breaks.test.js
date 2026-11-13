const test = require("node:test"),
  assert = require("node:assert/strict"),
  text = require("../static/text-model.js"),
  justify = require("../static/text-justify.js");
test("soft breaks force new lines without creating paragraph identities", () => {
  const source = "Eins\u2028Zwei";
  assert.deepEqual(text.paragraphs(source, 0, source.length), [0]);
  assert(text.rich({ text: source }));
  const lines = justify.wrap(source, 400, (value) => ({
    width: value.length * 10,
    spaces: 0,
    letters: value.length * 10,
  }));
  assert.deepEqual(
    lines.map((l) => [l.raw, l.start, l.end]),
    [
      ["Eins", 0, 4],
      ["Zwei", 5, 9],
    ],
  );
});
