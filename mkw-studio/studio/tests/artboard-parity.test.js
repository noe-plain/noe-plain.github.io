const { test } = require("node:test"),
  assert = require("node:assert/strict");
const model = require("../static/spread-layout-model.js"),
  policy = require("../static/carousel-policy.js");
const format = {
  w: 600,
  h: 750,
  top: 50,
  bottom: 50,
  left: 50,
  right: 50,
  bg: "#ffffff",
};
const legacy = () => ({
  ...format,
  n: 2,
  objects: [
    {
      id: "cross",
      type: "shape",
      x: 500,
      y: 100,
      w: 500,
      h: 200,
      fill: "#ee3300",
    },
    {
      id: "right",
      type: "text",
      x: 700,
      y: 100,
      w: 300,
      h: 200,
      text: "Quelle",
      size: 50,
    },
  ],
});
const enable = (c) => model.plan(c, { type: "enable" });
const first = (c) => c.pageStructure.groups[0][0];
test("1/3/20 slides per row, more than twenty in total; rejected 21 is atomic", () => {
  let c = enable({ ...legacy(), n: 1, objects: [] });
  c = model.plan(c, { type: "add", count: 3, spread: true });
  c = model.plan(c, { type: "add", count: 20, spread: true });
  assert.deepEqual(
    c.pageStructure.groups.map((g) => g.length),
    [1, 3, 20],
  );
  assert.equal(c.n, 24);
  assert(model.valid(c));
  for (const group of c.pageStructure.groups) {
    const frames = group.map((id) => c.artboards.find((a) => a.id === id));
    for (let i = 1; i < frames.length; i++) {
      assert.equal(frames[i].x, frames[i - 1].x + frames[i - 1].w);
      assert.equal(frames[i].y, frames[0].y);
    }
  }
  const snapshot = structuredClone(c);
  assert.throws(() =>
    model.plan(c, { type: "append-page", ids: [c.pageStructure.groups[2][0]] }),
  );
  assert.deepEqual(c, snapshot);
});
test("row format keeps continuous objects editable and other row formats intact", () => {
  const source = legacy(),
    c = model.plan(enable(source), { type: "add", count: 1, spread: true }),
    snapshot = structuredClone(c);
  const row = c.pageStructure.groups[1],
    other = c.artboards.find((a) => a.id === row[0]);
  c.objects.push({
    id: "below",
    type: "shape",
    x: other.x + 100,
    y: other.y + 100,
    w: 100,
    h: 100,
  });
  const q = model.plan(c, {
    type: "format-artboard",
    ids: [first(c)],
    format: { ...format, w: 800, h: 1000 },
  });
  assert.deepEqual(
    q.artboards.slice(0, 2).map((a) => [a.w, a.h]),
    [
      [800, 1000],
      [800, 1000],
    ],
  );
  assert.deepEqual([q.artboards[2].w, q.artboards[2].h], [600, 750]);
  assert.equal(q.objects.find((o) => o.id === "cross").x, 500);
  assert.equal(q.objects.find((o) => o.id === "cross").w, 500);
  assert(!q.objects.find((o) => o.id === "cross").pageFragment);
  assert.equal(q.objects.find((o) => o.id === "right").x, 900);
  assert.equal(
    q.objects.find((o) => o.id === "below").y - q.artboards[2].y,
    100,
  );
  assert.equal(q.objects.length, c.objects.length);
  assert(policy.validBoards(q));
  assert.equal(source.objects[0].pageId, undefined);
  const before = structuredClone(c);
  assert.throws(() =>
    model.plan(c, {
      type: "format-artboard",
      ids: [first(c)],
      format: { ...format, left: 600 },
    }),
  );
  assert.deepEqual(c, before);
  assert.equal(snapshot.artboards[2].h, 750);
});
test("whole row duplicate preserves one spanning layer, folders, links and original geometry", () => {
  const c = enable(legacy());
  c.folders = [{ id: "folder", name: "Inhalt", colour: "#ee3300" }];
  c.objects[0].folderId = "folder";
  c.objects.push({
    id: "linked",
    type: "angle",
    x: 500,
    y: 200,
    w: 500,
    h: 100,
    imageId: "image",
    imageSourceId: "cross",
  });
  const before = structuredClone(c),
    q = model.plan(c, {
      type: "duplicate-artboard",
      id: c.pageStructure.artboardInfo[0].id,
    });
  assert.deepEqual(c, before);
  assert.deepEqual(
    q.pageStructure.groups.map((g) => g.length),
    [2, 2],
  );
  assert.equal(q.objects.length, c.objects.length * 2);
  const copies = q.objects.slice(c.objects.length);
  assert(copies.every((o) => !o.pageFragment && o.artboardScoped));
  assert.equal(copies[0].w, 500);
  assert.notEqual(copies[0].folderId, "folder");
  assert.equal(q.folders.length, 2);
  assert.equal(copies[2].imageSourceId, copies[0].id);
  assert(q.pageStructure.groups[1].includes(copies[0].pageId));
  assert.deepEqual(q.artboards.slice(0, 2), c.artboards);
  assert(policy.validBoards(q));
});
test("row clipping allows neighbour slides and excludes other rows; old objects remain unscoped", () => {
  const c = model.plan(enable(legacy()), {
      type: "add",
      count: 1,
      spread: true,
    }),
    o = { ...c.objects[0], pageId: first(c), artboardScoped: true };
  assert.deepEqual(policy.contentFrame(c, o), { x: 0, y: 0, w: 1200, h: 750 });
  assert.equal(policy.contentFrame(c, c.objects[0]), null);
  assert(policy.intersects(policy.contentFrame(c, o), c.artboards[1]));
  assert(!policy.intersects(policy.contentFrame(c, o), c.artboards[2]));
  const q = model.plan(c, { type: "format-artboard", ids: [first(c)], format });
  const moved = model.plan(q, {
    type: "position",
    ids: [first(q)],
    x: 0,
    y: 2500,
  });
  assert.equal(moved.objects[0].y - moved.artboards[0].y, 100);
});
