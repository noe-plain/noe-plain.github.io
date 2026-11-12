const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  model = require("../static/spread-layout-model.js");
const f = {
  w: 600,
  h: 750,
  top: 50,
  bottom: 50,
  left: 50,
  right: 50,
  bg: "#ffffff",
};
function fixture() {
  let c = model.plan({ ...f, n: 3, objects: [] }, { type: "enable" });
  c = model.plan(c, { type: "add", count: 1, spread: true });
  const b = c.artboards[3];
  c.objects = [
    { id: "one", type: "shape", x: 100, y: 100, w: 100, h: 100 },
    { id: "two", type: "shape", x: 700, y: 100, w: 100, h: 100 },
    { id: "span", type: "shape", x: 500, y: 300, w: 700, h: 100 },
    {
      id: "sibling",
      type: "shape",
      x: 50,
      y: b.y + 100,
      w: 100,
      h: 100,
      pageId: b.id,
    },
  ];
  return c;
}
function action(c, operation, index = 1, extra = {}) {
  return model.plan(c, {
    type: "row-slide",
    ids: [c.pageStructure.groups[0][index]],
    operation,
    ...extra,
  });
}
const other = (c) => ({
  page: c.artboards.at(-1),
  object: c.objects.find((o) => o.id === "sibling"),
});
test("insert/duplicate affect only addressed row; spanning geometry remains one layer", () => {
  const c = fixture(),
    before = structuredClone(c),
    q = action(c, "insert", 1, { index: 1 });
  assert.deepEqual(
    q.pageStructure.groups.map((g) => g.length),
    [4, 1],
  );
  assert.equal(q.objects.find((o) => o.id === "two").x, 1300);
  assert.equal(q.objects.find((o) => o.id === "span").x, 500);
  assert.equal(q.objects.filter((o) => o.id === "span").length, 1);
  assert.deepEqual(other(q), other(c));
  assert.deepEqual(c, before);
  const d = action(c, "duplicate", 1, { index: 2 });
  assert.equal(d.objects.length, c.objects.length + 1);
  assert.equal(d.objects.at(-1).x, 1300);
  assert.equal(d.objects.at(-1).type, "shape");
  assert.deepEqual(other(d), other(c));
});
test("move swaps contained content while preserving panorama and sibling row", () => {
  const c = fixture(),
    q = action(c, "move", 0, { delta: 1 });
  assert.equal(q.objects.find((o) => o.id === "one").x, 700);
  assert.equal(q.objects.find((o) => o.id === "two").x, 100);
  assert.equal(q.objects.find((o) => o.id === "span").x, 500);
  assert.deepEqual(other(q), other(c));
});
test("shrink removes surplus slides instead of detaching; crossing content and other row survive", () => {
  const c = fixture(),
    q = action(c, "resize", 0, { count: 1 });
  assert.deepEqual(
    q.pageStructure.groups.map((g) => g.length),
    [1, 1],
  );
  assert(!q.objects.some((o) => o.id === "two"));
  assert(q.objects.some((o) => o.id === "span"));
  assert.deepEqual(other(q), other(c));
  assert.deepEqual(action(c, "resize", 0, { count: 3 }), c);
});
test("twenty is a per-row limit and rejected changes are atomic", () => {
  const c = fixture(),
    q = action(c, "resize", 0, { count: 20 }),
    before = structuredClone(q);
  assert.equal(q.n, 21);
  assert.throws(() => action(q, "insert", 0, { index: 0 }), /20/);
  assert.throws(() => action(q, "resize", 0, { count: 21 }), /20/);
  assert.deepEqual(q, before);
});
test("row background edit is shared only on an explicit colour change", () => {
  const c = fixture(),
    a = c.artboards[0];
  c.artboards[1].bg = "#112233";
  const name = model.plan(c, {
    type: "edit",
    ids: [a.id],
    values: { ...a, name: "Name" },
  });
  assert.equal(name.artboards[1].bg, "#112233");
  const bg = model.plan(c, {
    type: "edit",
    ids: [a.id],
    values: { ...a, bg: "#ff9900" },
  });
  assert(bg.artboards.slice(0, 3).every((a) => a.bg === "#ff9900"));
  assert.equal(bg.artboards[3].bg, "#ffffff");
});
test("removing duplicate logo slides retains one brand mark rather than stacking hidden duplicates", () => {
  const c = fixture();
  c.objects.push({ id: "logo", type: "logo", x: 100, y: 50, w: 100, h: 50 });
  const d = action(c, "duplicate", 0, { index: 1 });
  assert.equal(d.objects.filter((o) => o.type === "logo").length, 2);
  const q = action(d, "resize", 0, { count: 1 });
  assert.equal(q.objects.filter((o) => o.type === "logo").length, 1);
});
