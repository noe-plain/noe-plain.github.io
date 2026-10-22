const { test } = require("node:test"),
  assert = require("node:assert/strict");
const Path = require("../static/path-model.js"),
  Policy = require("../static/carousel-policy.js");
test("reversing a curved path swaps controls without mutating input", () => {
  const points = [
      { x: 1, y: 2, out: { x: 4, y: 9 } },
      { x: 10, y: 20, in: { x: 7, y: 18 }, out: { x: 15, y: 25 } },
    ],
    before = structuredClone(points),
    reversed = Path.reverse(points);
  assert.deepEqual(reversed, [
    { x: 10, y: 20, in: { x: 15, y: 25 }, out: { x: 7, y: 18 } },
    { x: 1, y: 2, in: { x: 4, y: 9 } },
  ]);
  assert.deepEqual(Path.reverse(reversed), points);
  reversed[0].in.x = 99;
  assert.deepEqual(points, before);
});
test("joining coincident anchors retains the incoming and outgoing curve and removes the redundant anchor", () => {
  const a = [
      { x: 0, y: 0 },
      { x: 10, y: 20, in: { x: 8, y: 16 }, out: { x: 50, y: 80 } },
    ],
    b = [
      { x: 10, y: 20, in: { x: 9, y: 15 }, out: { x: 15, y: 27 } },
      { x: 30, y: 40 },
    ];
  const joined = Path.join(a, b);
  assert.equal(joined.length, 3);
  assert.deepEqual(joined[1], {
    x: 10,
    y: 20,
    in: { x: 8, y: 16 },
    out: { x: 15, y: 27 },
  });
  joined[1].in.x = 99;
  assert.equal(a[1].in.x, 8);
  assert.equal(b[0].out.x, 15);
});
test("separate endpoints join with a bridge and preserve both path geometries", () => {
  const a = [
      { x: 0, y: 0, out: { x: 2, y: 4 } },
      { x: 10, y: 10 },
    ],
    b = [
      { x: 20, y: 20 },
      { x: 30, y: 30, in: { x: 22, y: 27 } },
    ];
  assert.deepEqual(Path.join(a, b), a.concat(b));
  assert.deepEqual(Path.join([], b), b);
  assert.deepEqual(Path.join(a, []), a);
});
test("safezone sixths respect four asymmetric margins on every slide", () => {
  const c = { w: 1080, h: 1350, left: 70, right: 190, top: 80, bottom: 160 };
  assert.deepEqual(Policy.safeRect(c, 1), { x: 1150, y: 80, w: 820, h: 1110 });
  for (let slide = 0; slide < 20; slide++) {
    const g = Policy.grid(c, slide);
    assert.equal(g.x.length, 7);
    assert.equal(g.y.length, 7);
    assert.equal(g.x[0], slide * 1080 + 70);
    assert.equal(g.x[6], (slide + 1) * 1080 - 190);
    assert.equal(g.y[0], 80);
    assert.equal(g.y[6], 1190);
    for (let i = 1; i < 7; i++)
      assert(Math.abs(g.x[i] - g.x[i - 1] - 820 / 6) < 1e-8);
  }
});
test("grid gutters use both edges and stay inside tiny asymmetric safezones", () => {
  const c = { w: 1080, h: 1350, left: 70, right: 190, top: 80, bottom: 160 };
  const g = Policy.grid(c, 0, { columns: 4, rows: 3, gap: 20 });
  assert.deepEqual(g.x, [70, 260, 280, 470, 490, 680, 700, 890]);
  assert.deepEqual(g.y, [
    80,
    80 + 1070 / 3,
    100 + 1070 / 3,
    100 + 2140 / 3,
    120 + 2140 / 3,
    1190,
  ]);
  assert.equal(g.gapX, 20);
  assert.equal(g.gapY, 20);
  const tiny = Policy.grid(
    { ...c, left: 1078, right: 1, top: 1348, bottom: 1 },
    0,
    { columns: 24, rows: 24, gap: 500 },
  );
  assert.equal(tiny.gapX, 0);
  assert.equal(tiny.gapY, 0);
  assert(tiny.x.every((x) => x >= 1078 && x <= 1079));
  assert(tiny.y.every((y) => y >= 1348 && y <= 1349));
  const single = Policy.grid(c, 0, { columns: 1, rows: 1, gap: 500 });
  assert.deepEqual(single.x, [70, 890]);
  assert.deepEqual(single.y, [80, 1190]);
  assert.equal(single.gapX, 0);
});
test("slide format plans preserve local positions and element geometry without mutating source", () => {
  const c = {
      w: 1080,
      h: 1350,
      n: 3,
      left: 100,
      right: 100,
      top: 100,
      bottom: 200,
      objects: [
        { id: "a", x: 100, w: 400, locked: true },
        { id: "b", x: 1200, w: 500 },
        { id: "c", x: 2400, w: 1000 },
        { id: "off", x: 3300, w: 300 },
        { id: "left", x: -100, w: 300 },
      ],
    },
    before = structuredClone(c);
  const next = { w: 1200, h: 1600, left: 70, right: 190, top: 80, bottom: 160 },
    plan = Policy.formatPlan(c, next);
  assert.deepEqual(plan.positions, [
    { id: "a", x: 100 },
    { id: "b", x: 1320 },
    { id: "c", x: 2640 },
    { id: "off", x: 3660 },
    { id: "left", x: -100 },
  ]);
  assert.deepEqual(plan.format, next);
  assert(plan.changed);
  assert.deepEqual(c, before);
  assert(!Policy.formatPlan(c, c).changed);
  assert.throws(() => Policy.formatPlan(c, { ...next, left: 1200 }));
  assert.throws(() => Policy.formatPlan(c, { ...next, w: 4001 }));
  assert.throws(() => Policy.formatPlan(c, { ...next, bottom: NaN }));
  const safeOnly = Policy.formatPlan(c, { ...c, left: 20 });
  assert.deepEqual(
    safeOnly.positions,
    c.objects.map((o) => ({ id: o.id, x: o.x })),
  );
});
