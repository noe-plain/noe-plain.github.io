const test = require("node:test"),
  assert = require("node:assert/strict");
const scope = require("../static/text-scope-model.js"),
  text = require("../static/text-model.js");
const doc = () => ({
  text: "Alpha eins\nBeta zwei\nGamma drei",
  font: "Arial",
  size: 50,
  color: "#101010",
});
test("non-adjacent paragraphs isolate font and size while leaving source text and middle paragraph intact", () => {
  const o = doc(),
    s = scope.resolve(o, { paragraphs: [0, 2] });
  scope.apply(o, s, { font: "Georgia", size: 80 });
  assert.equal(o.font, "Arial");
  assert.equal(o.size, 50);
  assert.equal(o.textStyles[0].size, 80);
  assert.equal(o.textStyles[2].size, 80);
  assert.equal(o.textStyles[1] ?? null, null);
  assert.equal(text.at(o, 0).font, "Georgia");
  assert.equal(text.at(o, 12).font, undefined);
  assert.equal(text.at(o, 23).font, "Georgia");
  assert.equal(o.text, doc().text);
  assert.deepEqual(scope.values(o, s, "size"), [80, 80]);
});
test("direct source range overrides paragraph and line selection and changes only selected UTF-16 characters", () => {
  const o = { ...doc(), text: "A😀BC\nDEF" },
    before = structuredClone(o);
  const s = scope.resolve(o, {
    range: { start: 1, end: 3 },
    paragraphs: [1],
    lines: [],
  });
  scope.apply(o, s, { size: 90, color: "#ff0000" });
  assert(s.direct);
  assert.deepEqual(o.characterStyles, [
    { start: 1, end: 3, size: 90, color: "#ff0000" },
  ]);
  assert.equal(o.text, before.text);
  assert.equal(o.size, before.size);
  assert.equal(o.textStyles, undefined);
});
test("visual line ranges isolate characters and mixed values across paragraph boundaries", () => {
  const o = doc(),
    s = scope.resolve(o, {
      paragraphs: [0, 1],
      lines: [
        { start: 6, end: 10, paragraph: 0, index: 1 },
        { start: 11, end: 15, paragraph: 1, index: 0 },
      ],
    });
  scope.apply(o, s, { size: 75, underline: true });
  assert.equal(text.at(o, 6).size, 75);
  assert.equal(text.at(o, 2).size, undefined);
  assert.equal(text.at(o, 11).underline, true);
  assert.equal(text.at(o, 17).underline, undefined);
  assert.equal(o.size, 50);
  assert.equal(o.textStyles, undefined);
  assert.deepEqual(
    scope.values(o, scope.resolve(o), "size"),
    [50, 75, 50, 75, 50, 50],
  );
});
test("whole-text edit updates the base uniformly, empty selections do nothing and empty text remains formattable", () => {
  const o = doc();
  o.textStyles = [{ size: 90 }];
  scope.apply(o, scope.resolve(o), { size: 60 });
  assert.equal(o.size, 60);
  assert.equal(o.textStyles[0].size, undefined);
  const before = structuredClone(o);
  scope.apply(o, scope.resolve(o, { paragraphs: [] }), { font: "Georgia" });
  assert.deepEqual(o, before);
  const empty = { ...doc(), text: "" };
  scope.apply(empty, scope.resolve(empty), { font: "Georgia", size: 44 });
  assert.equal(empty.font, "Georgia");
  assert.equal(empty.size, 44);
});

test("only complete marked paragraphs admit paragraph-wide controls; size reset remains scoped", () => {
  const o = doc();
  assert(scope.resolve(o, { range: { start: 0, end: 10 } }).completeParagraphs);
  assert(
    !scope.resolve(o, { range: { start: 1, end: 10 } }).completeParagraphs,
  );
  o.textStyles = [{ size: 80 }, { size: 70 }];
  const selected = scope.resolve(o, { paragraphs: [0] });
  scope.apply(o, selected, { size: null });
  assert.equal(o.textStyles[0].size, undefined);
  assert.equal(o.textStyles[1].size, 70);
  assert.equal(o.size, 50);
});

test("stale direct selections are clamped before classification after deletion or replacement", () => {
  for (const content of ["", "A", "Short"]) {
    const o = { ...doc(), text: content };
    const s = scope.resolve(o, { range: { start: 10, end: 40 } });
    assert.equal(s.direct, false);
    assert.deepEqual(
      s.ranges,
      content ? [{ start: 0, end: content.length, index: 0 }] : [],
    );
    assert.doesNotThrow(() => scope.values(o, s, "size"));
  }
  const o = { ...doc(), text: "Short" },
    s = scope.resolve(o, { range: { start: 2, end: 40 } });
  assert(s.direct);
  assert.deepEqual(s.ranges, [{ start: 2, end: 5 }]);
  scope.apply(o, s, { size: 80 });
  assert.equal(text.at(o, 1).size, undefined);
  assert.equal(text.at(o, 2).size, 80);
});
