const { test } = require("node:test"),
  assert = require("node:assert/strict");
const model = require("../static/spread-layout-model.js");
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
  let c = model.plan(
    {
      ...f,
      n: 3,
      objects: [
        { id: "panorama", type: "shape", x: 500, y: 100, w: 900, h: 200 },
      ],
    },
    { type: "enable" },
  );
  return model.plan(c, { type: "add", count: 2, spread: true });
}
const size = (c) =>
  c.pageStructure.groups.map((g) =>
    g.map((id) => {
      const a = c.artboards.find((a) => a.id === id);
      return [a.w, a.h];
    }),
  );
test("single page format and legacy edit fields format the whole row; sibling rows stay unchanged", () => {
  const c = fixture(),
    before = structuredClone(c),
    page = c.artboards[1];
  for (const action of [
    { type: "format", ids: [page.id], format: { ...f, w: 800, h: 1000 } },
    { type: "edit", ids: [page.id], values: { ...page, w: 800, h: 1000 } },
  ]) {
    const q = model.plan(c, action);
    assert.deepEqual(size(q), [
      [
        [800, 1000],
        [800, 1000],
        [800, 1000],
      ],
      [
        [600, 750],
        [600, 750],
      ],
    ]);
    assert.equal(q.objects.filter((o) => o.id === "panorama").length, 1);
    assert(!q.objects[0].pageFragment);
    assert.equal(q.artboards[1].x, q.artboards[0].x + 800);
    assert.deepEqual(c, before);
  }
});
test("mixed-format join, transfer and automatic redistribution reject atomically", () => {
  let c = fixture();
  c = model.plan(c, {
    type: "format",
    ids: [c.artboards[3].id],
    format: { ...f, w: 900, h: 900 },
  });
  const before = structuredClone(c),
    left = c.artboards[0].id,
    right = c.artboards[3].id;
  for (const action of [
    { type: "join", ids: [left, right] },
    {
      type: "move-to-artboard",
      id: c.pageStructure.artboardInfo[0].id,
      ids: [right],
    },
    { type: "settings", shuffle: true },
  ]) {
    assert.throws(() => model.plan(c, action), /dieselbe Breite und Höhe/);
    assert.deepEqual(c, before);
  }
  const added = model.plan(c, { type: "append-page", ids: [right] });
  assert(
    added.pageStructure.groups[1].every(
      (id) => added.artboards.find((a) => a.id === id).w === 900,
    ),
  );
});
test("legacy mixed group stays readable and unchanged until explicit whole-row repair", () => {
  const c = fixture();
  c.artboards[1].w = 650;
  c.artboards[2].x += 50;
  const before = structuredClone(c);
  assert(model.valid(c));
  assert.equal(model.mixedGroups(c).length, 1);
  const renamed = model.plan(c, {
    type: "rename",
    ids: [c.artboards[0].id],
    name: "Altbestand",
  });
  assert.deepEqual(renamed.objects, c.objects);
  assert.equal(renamed.artboards[1].w, 650);
  assert.throws(
    () => model.plan(c, { type: "append-page", ids: [c.artboards[0].id] }),
    /dieselbe Breite und Höhe/,
  );
  assert.throws(
    () =>
      model.plan(c, {
        type: "duplicate-artboard",
        id: c.pageStructure.artboardInfo[0].id,
      }),
    /dieselbe Breite und Höhe/,
  );
  const fixed = model.plan(c, {
    type: "format",
    ids: [c.artboards[0].id],
    format: f,
  });
  assert.equal(model.mixedGroups(fixed).length, 0);
  assert.deepEqual(c, before);
  assert.equal(fixed.objects[0].w, 900);
  assert.equal(fixed.objects.length, c.objects.length);
});
