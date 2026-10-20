const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../static/text-model.js");
const A = require("../static/project-assets.js");
test("range formatting preserves other attributes and merges equal adjacent runs", () => {
  const o = {
    text: "Abc def",
    characterStyles: [
      { start: 0, end: 3, color: "#ff0000", script: "superscript" },
    ],
  };
  o.characterStyles = T.patch(o, 1, 5, { font: "Harriet", size: 42 });
  assert.deepEqual(T.at(o, 0), { color: "#ff0000", script: "superscript" });
  assert.equal(T.at(o, 2).color, "#ff0000");
  assert.equal(T.at(o, 4).font, "Harriet");
  o.characterStyles = T.patch(o, 0, 7, {
    color: null,
    script: null,
    font: null,
    size: null,
    tracking: 20,
  });
  assert.deepEqual(o.characterStyles, [{ start: 0, end: 7, tracking: 20 }]);
});
test("typing shifts ranges without mutating source case and inherits pending character styles", () => {
  const o = {
    text: "a😀bc",
    characterStyles: [{ start: 1, end: 4, uppercase: true, size: 50 }],
  };
  const next = T.forInput(o, "a😀Xbc", { script: "subscript" });
  assert.deepEqual(next, [
    { start: 1, end: 3, size: 50, uppercase: true },
    { start: 3, end: 4, size: 50, uppercase: true, script: "subscript" },
    { start: 4, end: 5, size: 50, uppercase: true },
  ]);
  assert.equal(o.text, "a😀bc");
  assert.deepEqual(T.forInput(o, "ac"), []);
  assert.deepEqual(T.paragraphs("one\ntwo\nthree", 1, 4), [0]);
  assert.deepEqual(T.paragraphs("one\ntwo\nthree", 1, 5), [0, 1]);
});
test("rich formats validate ranges, fonts, values and paragraph metadata", () => {
  const o = {
    text: "Title",
    size: 50,
    font: "Replica LL",
    characterStyles: [
      { start: 0, end: 2, font: "own", tracking: 25, script: "subscript" },
    ],
    textStyles: [{ lineHeight: 1.2, spaceAfter: 15 }],
  };
  const fonts = new Set(["own", "Replica LL"]);
  assert.doesNotThrow(() => T.validate(o, fonts));
  for (const invalid of [
    { start: 1, end: 8 },
    { start: 0, end: 3, tracking: Infinity },
    { start: 0, end: 2, font: "missing" },
    { start: 0, end: 2, script: "bad" },
  ])
    assert.throws(() =>
      T.validate({ ...o, characterStyles: [invalid] }, fonts),
    );
  assert.throws(() =>
    T.validate({ ...o, textStyles: [{ spaceBefore: -1 }] }, fonts),
  );
});
test("fonts referenced only by text ranges remain portable and deleted text releases them", () => {
  const p = {
    images: [],
    logos: [],
    boards: [
      {
        elements: {
          title: {
            role: "Replica LL",
            characterStyles: [{ start: 0, end: 1, font: "own" }],
          },
        },
      },
    ],
    carousel: {
      objects: [
        {
          type: "text",
          font: "Arial",
          characterStyles: [{ start: 0, end: 1, font: "other" }],
        },
      ],
    },
    fonts: ["Replica LL", "own", "other", "unused"].map((role) => ({
      role,
      data: "data:font/ttf;base64,AA==",
    })),
  };
  assert.deepEqual(
    A.compact(p).fonts.map((f) => f.role),
    ["Replica LL", "own", "other"],
  );
  p.boards = [];
  p.carousel.objects = [];
  assert.deepEqual(A.compact(p).fonts, []);
});

test("format-specific size preservation keeps character boundaries and paragraph sizes while other attributes follow", () => {
  const source = {
    text: "Musik erleben",
    size: 80,
    characterStyles: [
      { start: 0, end: 5, size: 100, color: "#123456" },
      { start: 5, end: 13, underline: true },
    ],
    textStyles: [{ size: 90, align: "right" }],
  };
  const target = {
    text: source.text,
    size: 60,
    characterStyles: [{ start: 3, end: 8, size: 70 }],
    textStyles: [{ size: 65 }],
  };
  T.keepSizes(source, target);
  assert.equal(source.size, 60);
  assert.equal(T.at(source, 0).size, undefined);
  assert.equal(T.at(source, 4).size, 70);
  assert.equal(T.at(source, 4).color, "#123456");
  assert.equal(T.at(source, 6).underline, true);
  assert.equal(T.at(source, 10).size, undefined);
  assert.deepEqual(source.textStyles, [{ size: 65, align: "right" }]);
  T.changeCharacters(source, { start: 0, end: 3 }, { size: 110 }, "role");
  assert.equal(T.at(source, 1).size, 110);
  assert.equal(T.at(source, 4).size, 70);
  T.changeParagraphs(source, [0], { align: "justify", size: 77 });
  assert.deepEqual(source.textStyles, [{ size: 77, align: "justify" }]);
});
