const test = require("node:test"),
  assert = require("node:assert/strict"),
  m = require("../static/text-edit-model.js"),
  text = require("../static/text-model.js");
const source = () => ({
  text: "Musik\nHeute\u2028hier",
  font: "Replica LL",
  size: 60,
  color: "#123456",
  tracking: 20,
  lineHeight: 0.95,
  characterStyles: [
    { start: 0, end: 5, size: 90, color: "#ff0000", family: true },
    { start: 6, end: 11, font: "Harriet", script: "superscript" },
  ],
  textStyles: [
    { size: 80, align: "center", spaceAfter: 12 },
    { size: 40, lineHeight: 1.2, leading: [45, 60] },
  ],
});
test("formatted fragments retain source, character attributes, paragraph sizes and soft breaks without document data", () => {
  const o = source(),
    before = JSON.stringify(o),
    f = m.slice(o, 0, o.text.length);
  assert.equal(f.text, o.text);
  assert.equal(f.characterStyles[0].size, 90);
  assert.equal(f.characterStyles[0].family, true);
  assert.equal(f.textStyles[1].leading[1], 60);
  assert.equal(JSON.stringify(o), before);
  assert.equal(f.id, undefined);
  assert(m.normalize(f, new Set(["Replica LL", "Harriet"]), "Replica LL"));
});
test("rich replacement preserves surrounding text styles and only owns full destination paragraphs", () => {
  const o = source(),
    f = m.slice(o, 0, 5),
    r = m.replace(o, 8, 10, f, true);
  assert.equal(r.text, "Musik\nHeMusike\u2028hier");
  assert.equal(r.textStyles[1].size, 40);
  assert.equal(text.at(r, 8).size, 90);
  assert.equal(text.at(r, 7).font, "Harriet");
  text.validate({ ...o, ...r }, new Set(["Replica LL", "Harriet"]));
});
test("plain replacement inherits destination formatting and is exact even with repeated strings", () => {
  const o = {
      text: "AAAA",
      font: "Replica LL",
      size: 40,
      color: "#000000",
      characterStyles: [
        { start: 0, end: 2, color: "#ff0000" },
        { start: 2, end: 4, color: "#0000ff" },
      ],
    },
    r = m.replace(
      o,
      0,
      1,
      { text: "AA", characterStyles: [{ start: 0, end: 2, size: 999 }] },
      false,
    );
  assert.equal(r.text, "AAAAA");
  assert.equal(text.at(r, 0).color, "#ff0000");
  assert.equal(text.at(r, 3).color, "#0000ff");
  assert.equal(text.at(r, 0).size, undefined);
});
test("paragraph paste retains following untouched paragraphs and consistent indices", () => {
  const o = source(),
    f = m.slice(o, 0, o.text.length),
    r = m.replace(o, 0, o.text.length, f, true);
  assert.deepEqual(r.textStyles, f.textStyles);
  assert.equal(r.text, o.text);
  text.validate({ ...o, ...r }, new Set(["Replica LL", "Harriet"]));
});
test("untrusted packets reject invalid styles and indices; unknown fonts use destination font", () => {
  const f = m.slice(source(), 0, 5);
  f.characterStyles[0].font = "Missing Font";
  assert.equal(
    m.normalize(f, new Set(["Replica LL"]), "Replica LL").characterStyles[0]
      .font,
    "Replica LL",
  );
  f.characterStyles[0].end = 500;
  assert.equal(m.normalize(f, new Set(["Replica LL"]), "Replica LL"), null);
  assert.equal(
    m.normalize(
      {
        version: 1,
        text: "x",
        characterStyles: [],
        textStyles: [{ leading: [-1] }],
      },
      new Set(["Replica LL"]),
      "Replica LL",
    ),
    null,
  );
});
test("proportional text scaling includes character/paragraph sizes and fixed offsets but retains relative spacing", () => {
  const o = source();
  o.baselineShift = 2;
  o.characterStyles[0].baselineShift = 3;
  const p = m.scale({ ...o, w: 800, h: 400 }, 1.5, true);
  assert.equal(p.w, 1200);
  assert.equal(p.h, 600);
  assert.equal(p.size, 90);
  assert.equal(p.characterStyles[0].size, 135);
  assert.equal(p.characterStyles[0].baselineShift, 4.5);
  assert.equal(p.textStyles[0].spaceAfter, 18);
  assert.deepEqual(p.textStyles[1].leading, [67.5, 90]);
  assert.equal(p.textStyles[1].lineHeight, 1.2);
  assert.equal(p.tracking, undefined);
});
test("invalid scaling and oversized paste leave the input untouched", () => {
  const o = source(),
    before = JSON.stringify(o);
  assert.throws(() => m.scale(o, 100));
  assert.throws(() => m.scale(o, NaN));
  assert.throws(() => m.replace(o, 0, 0, { text: "x".repeat(100001) }));
  assert.equal(JSON.stringify(o), before);
});
