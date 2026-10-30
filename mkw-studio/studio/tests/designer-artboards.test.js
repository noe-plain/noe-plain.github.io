const assert = require("node:assert/strict");
const test = require("node:test");
const policy = require("../static/carousel-policy.js");
const format = {
  w: 1080,
  h: 1350,
  top: 100,
  bottom: 200,
  left: 100,
  right: 100,
  bg: "#ffffff",
};
const c = { ...format, n: 2, objects: [] };
const free = () => ({
  ...c,
  layout: "free",
  artboards: [
    { ...format, id: "one", name: "Hochformat", x: 0, y: 0 },
    {
      ...format,
      id: "two",
      name: "Quadrat",
      x: 1300,
      y: 1600,
      w: 1080,
      h: 1080,
      bg: "#123456",
    },
  ],
});
test("legacy slides retain exact frame, safe rectangle and extent", () => {
  assert.equal(policy.validBoards(c), true);
  assert.deepEqual(policy.safeRect(c, 1), { x: 1180, y: 100, w: 880, h: 1050 });
  assert.deepEqual(policy.extent(c), { w: 2160, h: 1350 });
  assert.equal(policy.containing(c, { x: 1100, y: 200, w: 100, h: 100 }), 1);
});
test("free artboards have independent size, position, safe grid and bounds", () => {
  const q = free();
  assert(policy.validBoards(q));
  assert.deepEqual(policy.extent(q), { w: 2380, h: 2680 });
  assert.deepEqual(policy.safeRect(q, 1), { x: 1400, y: 1700, w: 880, h: 780 });
  const grid = policy.grid(q, 1, { columns: 2, rows: 2, gap: 20 });
  assert.deepEqual(grid.x, [1400, 1830, 1850, 2280]);
  assert.equal(policy.containing(q, { x: 1400, y: 1700, w: 100, h: 100 }), 1);
  assert.equal(policy.owner(q, { x: 1100, y: 100, w: 100, h: 100 }), -1);
});
test("free artboard validation rejects ambiguous, excessive or malformed layouts", () => {
  for (const change of [
    (q) => (q.artboards[1].x = -1),
    (q) => (q.artboards[1].y = 0),
    (q) => (q.artboards[1].x = 100000),
    (q) => (q.artboards[1].id = "one"),
    (q) => (q.artboards[1].name = ""),
    (q) => (q.artboards[1].left = 1080),
    (q) => (q.artboards[1].bg = "red"),
    (q) => (q.n = 1),
  ]) {
    const q = free();
    change(q);
    if (q.artboards[1].y === 0 && q.artboards[1].x === 1300)
      q.artboards[1].x = 500;
    assert.equal(policy.validBoards(q), false);
  }
  const legacy = { ...c, artboards: [] };
  assert.equal(policy.validBoards(legacy), false);
});
test("content ownership chooses greatest intersection deterministically without mutating geometry", () => {
  const q = free(),
    before = JSON.stringify(q);
  assert.equal(policy.owner(q, { x: 1200, y: 1500, w: 600, h: 600 }), 1);
  assert.equal(policy.owner(q, { x: 0, y: 0, w: 100000, h: 100000 }), 0);
  assert.equal(policy.containing(q, { x: 1000, y: 1200, w: 500, h: 500 }), -1);
  assert.equal(JSON.stringify(q), before);
});

test("nearest artboard keeps placement near the visible area when the pointer is in a gap", () => {
  const q = free();
  assert.equal(policy.nearest(q, { x: 1250, y: 1500, w: 10, h: 10 }), 1);
  assert.equal(policy.nearest(q, { x: -100, y: 0, w: 1, h: 1 }), 0);
});
