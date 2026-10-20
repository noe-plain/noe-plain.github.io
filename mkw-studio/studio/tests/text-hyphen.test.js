const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  H = require("../static/text-hyphen.js"),
  J = require("../static/text-justify.js");
const source = fs.readFileSync(
    require("node:path").join(
      __dirname,
      "../static/hyphenation/hyph-de-1996.tex",
    ),
    "utf8",
  ),
  engine = H.create(source);
test("Swiss reformed-2006 dictionary preserves ss, ck, triple consonants and source offsets", () => {
  assert.equal(engine.patternCount, 36709);
  for (const [word, expected] of [
    ["Silbentrennung", [3, 6, 10]],
    ["Strasse", [5]],
    ["Grüsse", [4]],
    ["Bäcker", [2]],
    ["Schifffahrt", [6]],
    ["Strassenbahn", [5, 8]],
  ]) {
    assert.deepEqual(engine.points(word), expected);
    assert.deepEqual(engine.points(word.toLocaleUpperCase("de-CH")), expected);
  }
  assert.deepEqual(engine.points("Gru\u0308sse"), [5]);
  assert.deepEqual(engine.points("abc"), []);
  assert.deepEqual(engine.points("👩‍👩‍👦"), []);
  assert.deepEqual(engine.points("a".repeat(151)), []);
  const p = engine.points("Silbentrennung");
  p.push(999);
  assert.deepEqual(engine.points("Silbentrennung"), [3, 6, 10]);
  assert.throws(() => H.create("invalid"), /ungültig/);
});
test("deferred dictionary compilation matches synchronous points and yields the event loop", async () => {
  let yielded = false;
  setTimeout(() => (yielded = true), 0);
  const deferred = await H.create(source, true);
  assert(yielded);
  assert.deepEqual(
    deferred.points("Konzertprogramm"),
    engine.points("Konzertprogramm"),
  );
});
test("hyphenated composition retains exact source, uses only legal positions and keeps bounds", () => {
  const measure = (text, start, hyphen) => ({
    width: J.graphemes(text).length * 10 + (hyphen ? 10 : 0),
    spaces: (text.match(/ /g) || []).length * 10,
    letters: J.graphemes(text.replaceAll(" ", "")).length * 20,
  });
  for (const width of [30, 60, 100, 150, 230, 500])
    for (const text of [
      "Silbentrennung Strassenbahn Konzertprogramm Begegnungen mit Menschen.",
      "Gru\u0308sse aus der Schweiz",
      "👩‍👩‍👦".repeat(3),
      "https://www.musikkollegium.ch",
      "aa\u00a0bb cc dd",
      "   ",
      "",
    ]) {
      const lines = J.wrap(text, width, measure, engine.points);
      assert.equal(lines.map((l) => l.raw).join(""), text);
      for (const line of lines) {
        assert.equal(text.slice(line.start, line.end), line.raw);
        if (line.hyphen) {
          const word = [...text.matchAll(/\p{L}[\p{L}\p{M}]*/gu)].find(
            (m) => m.index < line.end && m.index + m[0].length > line.end,
          );
          assert(word);
          assert(engine.points(word[0]).includes(line.end - word.index));
        }
      }
    }
  const lines = J.wrap(
    "Silbentrennung Strassenbahn Konzertprogramm",
    105,
    measure,
    engine.points,
  );
  assert(lines.some((l) => l.hyphen));
  assert(
    !J.wrap("https://musikkollegium.ch", 110, measure, engine.points).some(
      (l) => l.hyphen,
    ),
  );
});
test("hyphenation is a justified paragraph property and validates separately from character marks", () => {
  const M = require("../static/text-model.js"),
    o = {
      text: "Musik\nKonzert",
      font: "Replica LL",
      size: 40,
      color: "#000000",
      textAlign: "justify",
      hyphenate: false,
      textStyles: [{ hyphenate: true }],
    };
  assert(H.requires(o));
  M.validate(o, new Set(["Replica LL"]));
  o.textStyles[0].hyphenate = false;
  assert(!H.requires(o));
  o.hyphenate = "yes";
  assert.throws(() => M.validate(o, new Set(["Replica LL"])), /Silbentrennung/);
  o.hyphenate = true;
  o.textStyles[0].hyphenate = 2;
  assert.throws(() => M.validate(o, new Set(["Replica LL"])), /Absatz/);
});

test("dictionary loading is lazy, shares concurrent requests, reports failure once and permits retry", async () => {
  const vm = require("node:vm");
  let requests = 0,
    changes = 0,
    fail = true;
  const sandbox = {
    module: { exports: {} },
    Intl,
    AbortController,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    fetch: async () => {
      requests++;
      return { ok: !fail, text: async () => source };
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      require("node:path").join(__dirname, "../static/text-hyphen.js"),
      "utf8",
    ),
    sandbox,
  );
  const h = sandbox.module.exports;
  h.onChange(() => changes++);
  assert.equal(requests, 0);
  const a = h.ensure(),
    b = h.ensure();
  assert.equal(a, b);
  await assert.rejects(a, /Silbentrennung/);
  await assert.rejects(h.ensure(), /Silbentrennung/);
  assert.equal(requests, 1);
  assert(h.error);
  assert.equal(h.version, 1);
  fail = false;
  await h.ensure(true);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(requests, 2);
  assert.equal(h.error, null);
  assert.equal(h.version, 2);
  assert.equal(changes, 2);
  assert.deepEqual(Array.from(h.points("Strasse")), [5]);
  await h.ensure();
  assert.equal(requests, 2);
});
