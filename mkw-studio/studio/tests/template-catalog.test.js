const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const model = require("../static/template-model.js");
const text = require("../static/text-model.js");
const read = (id) =>
  JSON.parse(
    fs.readFileSync(require.resolve(`../static/templates/${id}.json`), "utf8"),
  );
const ids = [
  "mkw-winkel-slidepost",
  "mkw-nahe-am-orchester",
  "mkw-konzertauftakt",
  "mkw-bilder-slider",
];
test("four built-ins load lazily with independent cache entries, safe copies and retry after failure", async () => {
  const requests = [],
    fail = new Set(["mkw-bilder-slider"]);
  const context = vm.createContext({
    p: { fonts: [] },
    clone: structuredClone,
    MKWTemplateModel: model,
    MKWCarouselPolicy: require("../static/carousel-policy.js"),
    validateCarousel: () => {},
    MKWTemplateStore: { list: async () => [] },
    fetch: async (url) => {
      const id = url.split("/").at(-1).split(".json")[0];
      requests.push(id);
      if (fail.delete(id)) return { ok: false };
      return { ok: true, json: async () => read(id) };
    },
  });
  vm.runInContext(
    fs.readFileSync(require.resolve("../static/template-session.js"), "utf8"),
    context,
  );
  const catalog = vm.runInContext("MKWTemplates", context);
  assert.equal(requests.length, 0);
  assert.equal((await catalog.list()).length, 4);
  const loaded = await Promise.all(
    ids.slice(0, 3).map((id) => catalog.get(id)),
  );
  assert.deepEqual(
    loaded.map((t) => t.id),
    ids.slice(0, 3),
  );
  loaded[0].carousel.objects.length = 0;
  assert((await catalog.get(ids[0])).carousel.objects.length > 0);
  await assert.rejects(catalog.get(ids[3]), /geladen/);
  const [a, b] = await Promise.all([catalog.get(ids[3]), catalog.get(ids[3])]);
  assert.notEqual(a, b);
  assert.equal(a.id, ids[3]);
  assert.deepEqual(requests, [...ids, ids[3]]);
});
test("template filling retains heading sizes and Harriet subtitle styles after changes in several paragraphs", () => {
  const t = read("mkw-konzertauftakt"),
    original = structuredClone(t),
    o = t.carousel.objects.find((o) => o.type === "text");
  const value =
    "FR 4. DEZEMBER\nEIN NEUER TITEL.\nMIT ANDERER LÄNGE.\n19.30 Uhr – Winterthur";
  const result = model
    .instantiate(t, { values: { [o.id]: { text: value } } })
    .carousel.objects.find((o) => o.type === "text");
  assert.equal(result.text, value);
  assert.deepEqual(
    result.textStyles.map((s) => s.size),
    [64, 110, 110, 36],
  );
  for (const paragraph of require("../static/text-edit-model.js").paragraphs(
    value,
  )) {
    const style = text.at(result, paragraph.start);
    assert.equal(style.uppercase, paragraph.index !== 3);
    if (paragraph.index === 3) assert.equal(style.font, "Harriet Regular");
  }
  text.validate(result, new Set(["Replica LL", "Harriet Regular"]));
  assert.deepEqual(t, original);
});
test("filled body paragraphs retain Harriet and newly added paragraphs inherit the final body format", () => {
  const t = read("mkw-nahe-am-orchester"),
    o = t.carousel.objects.find((o) =>
      o.name.startsWith("Übertitel und Fliesstext"),
    );
  const value =
    "IM ORCHESTER\nEin neuer Gedanke.\nNoch eine Zeile.\n\nEin anderer Absatz.\nUnd mehr Inhalt.\nAbschluss.\nNoch ein Satz.";
  const result = model
    .instantiate(t, { values: { [o.id]: { text: value } } })
    .carousel.objects.find((x) => x.name === o.name);
  const paragraphs = require("../static/text-edit-model.js").paragraphs(value);
  assert.equal(text.at(result, 0).font, "Replica LL");
  assert.equal(result.font, "Harriet Regular");
  assert(
    paragraphs
      .slice(1)
      .every((p) => text.at(result, p.start).font !== "Replica LL"),
  );
  assert.equal(result.textStyles.at(-1).size, 44);
  text.validate(result, new Set(["Replica LL", "Harriet Regular"]));
});
