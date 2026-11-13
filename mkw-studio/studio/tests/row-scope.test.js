const { test } = require("node:test"),
  assert = require("node:assert/strict");
const scope = require("../static/row-scope-model.js"),
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
  let c = model.plan({ ...f, n: 2, objects: [] }, { type: "enable" });
  c = model.plan(c, { type: "add", count: 1, spread: true });
  const [a, b] = c.pageStructure.groups.map((g) => g[0]);
  c.folders = [
    { id: "shared", name: "Ordner", visible: false, locked: true },
    { id: "empty", name: "Leer", pageId: b },
  ];
  c.objects = [
    { id: "a", x: 100, y: 100, w: 200, h: 200, pageId: a, folderId: "shared" },
    {
      id: "b",
      x: 100,
      y: c.artboards[2].y + 100,
      w: 200,
      h: 200,
      pageId: b,
      folderId: "shared",
    },
  ];
  return c;
}
test("row view filters members and empty folders without changing legacy source", () => {
  const c = fixture(),
    before = structuredClone(c),
    a = c.artboards[0].id,
    b = c.artboards[2].id;
  assert.deepEqual(
    scope.scope(c, a).view.objects.map((o) => o.id),
    ["a"],
  );
  assert.deepEqual(
    scope.scope(c, a).view.folders.map((o) => o.id),
    ["shared"],
  );
  assert.deepEqual(
    scope.scope(c, b).view.folders.map((o) => o.id),
    ["shared", "empty"],
  );
  assert.deepEqual(c, before);
});
test("explicit isolation preserves other row, geometry and inherited folder flags", () => {
  const c = fixture(),
    before = structuredClone(c),
    a = c.artboards[0].id;
  const q = scope.isolate(
    c,
    a,
    (o) => o,
    () => "isolated",
  );
  assert.deepEqual(c, before);
  assert.deepEqual(q.objects[1], c.objects[1]);
  assert.deepEqual(q.folders[0], c.folders[0]);
  assert.equal(q.objects[0].folderId, "isolated");
  assert.deepEqual(q.folders.at(-1), {
    ...c.folders[0],
    id: "isolated",
    pageId: a,
    before: null,
  });
  assert.equal(scope.scope(q, a).shared.length, 0);
  assert.equal(
    scope.isolate(
      q,
      a,
      (o) => o,
      () => "other",
    ),
    q,
  );
  assert.throws(() =>
    scope.isolate(
      c,
      a,
      (o) => o,
      () => "shared",
    ),
  );
});
test("row order replacement preserves every unselected layer and folder", () => {
  const c = fixture();
  c.objects.push({
    id: "a2",
    x: 300,
    y: 100,
    w: 100,
    h: 100,
    pageId: c.artboards[0].id,
  });
  const v = scope.scope(c, c.artboards[0].id).view,
    q = scope.mergeOrder(c, { ...v, objects: [...v.objects].reverse() });
  assert.deepEqual(
    q.objects.map((o) => o.id),
    ["a2", "b", "a"],
  );
  assert.deepEqual(q.objects[1], c.objects[1]);
  assert.deepEqual(q.folders, c.folders);
});
test("PSD row extraction translates frames, keeps crossing legacy artwork and hidden image dependencies", () => {
  const c = fixture(),
    b = c.artboards[2];
  c.objects.push(
    { id: "cross", type: "image", x: 0, y: 0, w: 400, h: 1200 },
    { id: "outside", type: "image", x: 2000, y: 0, w: 100, h: 100 },
    {
      id: "linked",
      type: "angle",
      x: 100,
      y: b.y + 200,
      w: 100,
      h: 200,
      imageSourceId: "outside",
    },
  );
  const before = structuredClone(c),
    q = scope.extract(c, b.id);
  assert.equal(q.n, 1);
  assert.equal(q.artboards[0].y, 0);
  assert.equal(q.objects.find((o) => o.id === "cross").y, -b.y);
  assert.equal(q.objects.find((o) => o.id === "outside").visible, false);
  assert.equal(
    q.objects.find((o) => o.id === "linked").imageSourceId,
    "outside",
  );
  assert.deepEqual(c, before);
});
