const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  J = require("../static/text-justify.js");
test("justification uses the requested fixed limits, prioritizes words and keeps paragraph endings at optimum", () => {
  assert.deepEqual(J.limits, {
    word: [0.8, 1, 1.2],
    letter: [-0.02, 0, 0.02],
    glyph: [0.98, 1, 1.02],
  });
  const m = { width: 500, spaces: 100, letters: 1200 };
  assert.equal(J.fit(m, 510).word, 1.1);
  assert.equal(J.fit(m, 510).letter, 0);
  assert.equal(J.fit(m, 510).glyph, 1);
  for (let target = 350; target <= 650; target += 0.5) {
    const r = J.fit(m, target),
      b = J.bounds(m);
    assert(r.word >= 0.8 && r.word <= 1.2);
    assert(r.letter >= -0.02 && r.letter <= 0.02);
    assert(r.glyph >= 0.98 && r.glyph <= 1.02);
    if (target >= b.min && target <= b.max)
      assert(Math.abs(r.width - target) < 1e-8);
    else assert(r.limited);
  }
  assert.deepEqual(J.fit(m, 1200, true), {
    word: 1,
    letter: 0,
    glyph: 1,
    width: 500,
    limited: false,
    last: true,
  });
  assert.equal(J.fit({ width: 0, spaces: 0, letters: 0 }, 10).width, 0);
});
test("word wrapping considers bounded compression, preserves UTF16 source positions and never forces the last line wider", () => {
  const measure = (text) => ({
    width: J.graphemes(text).length * 10,
    spaces: (text.match(/ /g) || []).length * 10,
    letters: J.graphemes(text.replaceAll(" ", "")).length * 20,
  });
  const text = "Ein Konzert mit Worten für Musik. Noch mehr Wörter folgen.\n";
  const source = text.trimEnd(),
    parts = J.wrap(source, 200, measure);
  assert.equal(parts.map((p) => p.raw).join(""), source);
  assert(parts.length > 1);
  for (const part of parts) {
    assert.equal(source.slice(part.start, part.end), part.raw);
    assert(J.bounds(measure(part.raw.trimEnd())).min <= 200 + 0.001);
  }
  assert(measure(parts.at(-1).raw.trimEnd()).width <= 200);
  const emoji = "👨‍👩‍👧‍👦".repeat(8);
  const small = J.wrap(emoji, 20, measure);
  assert.equal(small.map((p) => p.raw).join(""), emoji);
  assert(small.every((p) => J.graphemes(p.raw).length === 2));
  const nbsp = J.wrap("aa\u00a0bb cc dd", 60, measure);
  assert.equal(nbsp[0].raw, "aa\u00a0bb ");
});
