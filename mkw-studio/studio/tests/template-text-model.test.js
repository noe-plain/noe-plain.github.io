const { test } = require("node:test");
const assert = require("node:assert/strict");
const model = require("../static/template-text-model.js");
const text = require("../static/text-model.js");
const templates = require("../static/template-model.js");
const fixture = () => ({
  id: "copy",
  name: "Titel und Text",
  type: "text",
  text: "Titel\nEin Absatz\u2028zweite Zeile\nSchluss",
  font: "Harriet Regular",
  size: 42,
  color: "#121212",
  textAnchor: "bottom",
  lineHeight: 1.2,
  textStyles: [{ size: 72, spaceAfter: 12 }, { size: 42 }, { size: 30 }],
  characterStyles: [
    { start: 0, end: 5, font: "Replica LL", uppercase: true },
    { start: 8, end: 10, underline: true },
  ],
});
const preset = () => model.formats({ carousel: { objects: [fixture()] } })[0];
test("template paragraph formats derive complete reusable typography without changing the design", () => {
  const o = fixture(),
    before = structuredClone(o),
    formats = model.formats({
      carousel: { objects: [o, { ...o, id: "duplicate" }] },
    });
  assert.equal(formats.length, 3);
  assert.equal(formats[0].character.font, "Replica LL");
  assert.equal(formats[0].character.size, 72);
  assert.equal(formats[0].paragraph.spaceAfter, 12);
  assert.deepEqual(o, before);
});
test("collapsed caret formats its whole paragraph including soft lines, and preserves adjacent paragraphs", () => {
  const o = fixture(),
    before = structuredClone(o),
    draft = model.apply(o, {}, preset(), { start: 9, end: 9 });
  assert.deepEqual(draft.textStyles[0], o.textStyles[0]);
  assert.deepEqual(draft.textStyles[2], o.textStyles[2]);
  assert.equal(draft.textStyles[1].size, 72);
  for (const i of [6, 9, 15, 25]) {
    assert.equal(text.at(draft, i).font, "Replica LL");
    assert.equal(text.at(draft, i).underline, false);
  }
  assert.equal(text.at(draft, o.text.lastIndexOf("\n") + 1).font, undefined);
  assert.deepEqual(o, before);
});
test("multi-paragraph selection excludes an untouched paragraph at its exclusive end", () => {
  const o = fixture(),
    end = o.text.lastIndexOf("\n") + 1;
  const draft = model.apply(o, {}, preset(), { start: 0, end });
  assert.equal(draft.textStyles[0].size, 72);
  assert.equal(draft.textStyles[1].size, 72);
  assert.equal(draft.textStyles[2].size, 30);
  assert.deepEqual(
    model.indices({ text: "a\u2028b\nc" }, { start: 1, end: 3 }),
    [0],
  );
});
test("paragraph insertion and deletion retain styles with their text instead of shifting them by field index", () => {
  const o = fixture(),
    original = model.value(o),
    inserted = model.input(o, original, "Neu\n" + o.text);
  assert.equal(inserted.textStyles[2].size, 42);
  const removed = model.input(o, inserted, o.text);
  assert.equal(removed.textStyles[1].size, 42);
  assert.equal(removed.textStyles[2].size, 30);
  const changed = model.apply(o, removed, preset(), { start: 8, end: 8 });
  const typed = model.input(
    o,
    changed,
    changed.text.replace("Ein Absatz", "Ein langer Absatz"),
  );
  assert.equal(typed.textStyles[1].size, 72);
  assert.equal(text.at(typed, 10).font, "Replica LL");
});
test("an empty final paragraph remembers its chosen font while other text changes, then applies it to typing", () => {
  const o = {
    ...fixture(),
    text: "Wort\n",
    characterStyles: [],
    textStyles: [null, null],
  };
  const empty = model.apply(o, {}, preset(), { start: 5, end: 5 });
  const changed = model.input(o, empty, "Wörter\n");
  assert.equal(changed.pending.index, 1);
  const typed = model.input(o, changed, "Wörter\nNeu");
  assert.equal(text.at(typed, 8).font, "Replica LL");
  assert.equal(typed.textStyles[1].size, 72);
  assert(!("pending" in model.value(o, typed)));
});
test("oversized or invalid drafts fail before mutation and template creation projects only actual typography", () => {
  const o = fixture();
  assert.throws(() => model.value(o, { text: "a".repeat(100001) }));
  assert.throws(() => model.value(o, { text: "\n".repeat(10000) }));
  assert.throws(() => model.value(o, { textAnchor: "outside" }));
  assert.throws(() =>
    model.value(o, { characterStyles: [{ start: 0, end: 9999, size: 72 }] }),
  );
  const t = require("../static/templates/mkw-nahe-am-orchester.json"),
    target = t.carousel.objects.find((o) => o.type === "text");
  const value = model.apply(target, {}, preset(), { start: 3, end: 3 });
  value.textAnchor = "bottom";
  value.pending = { index: 0, character: { font: "Replica LL" } };
  const result = templates.instantiate(t, {
    values: { [target.id]: value },
    uid: () => Math.random().toString(),
  });
  const next = result.carousel.objects.find((o) => o.name === target.name);
  assert.equal(next.textStyles[0].size, 72);
  assert.equal(next.textAnchor, "bottom");
  assert(!("pending" in next));
});

test("replacing an entire field with a common prefix preserves its prepared paragraph fonts", () => {
  const t = require("../static/templates/mkw-konzertauftakt.json"),
    o = t.carousel.objects.find((o) => o.type === "text");
  const next =
    "FR 4. DEZEMBER\nNEUER KLANG.\nFÜR ALLE.\n19.30 Uhr – Winterthur";
  const result = model.input(o, {}, next, { start: 0, end: o.text.length });
  assert.equal(
    text.at(result, next.lastIndexOf("19.30")).font,
    "Harriet Regular",
  );
});
