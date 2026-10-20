const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  A = require("../static/post-angle-model.js"),
  assets = require("../static/project-assets.js");
const board = () => ({
  w: 1080,
  h: 1350,
  imageId: "photo",
  image: { x: 540, y: 675, scale: 0.6, angle: 0, flipX: 1, flipY: 1 },
  elements: {},
});
test("all chevron directions retain only the two front vertices inside the content area, including extreme tip positions and sponsor strips", () => {
  for (const [w, h] of [
    [1080, 1920],
    [1080, 1080],
    [1920, 1080],
    [16, 16],
  ])
    for (const direction of A.directions)
      for (const x of [0, 0.5, 1])
        for (const y of [0, 0.5, 1]) {
          const b = board();
          b.w = w;
          b.h = h;
          b.angle = A.defaults(b, { direction, tip: { x, y } });
          for (const area of [b, { w: w * 0.8, h: h * 0.8 }]) {
            const { points, tip, inner } = A.geometry(b, area),
              inside = (p) =>
                p.x >= 0 && p.x <= area.w && p.y >= 0 && p.y <= area.h;
            assert.equal(
              points.filter(inside).length,
              2,
              JSON.stringify({ w, h, direction, x, y, points }),
            );
            assert(inside(tip) && inside(inner));
            assert(A.visiblePoints(b, area).every(inside));
            assert(
              A.contains(
                b,
                { x: (tip.x + inner.x) / 2, y: (tip.y + inner.y) / 2 },
                area,
              ),
            );
            assert(!A.contains(b, { x: -1, y: 100 }, area));
          }
        }
});
test("independent lossless image transform, rotated photo coverage and repair, and invalid metadata", () => {
  const b = board(),
    original = structuredClone(b.image),
    im = { width: 2400, height: 2400 };
  b.angle = A.defaults(b);
  assert.deepEqual(b.image, original);
  assert.notEqual(b.angle.image, b.image);
  assert(b.angle.image.scale > b.image.scale);
  for (const direction of A.directions) {
    b.angle.direction = direction;
    b.angle.image.angle = 27;
    b.angle.image.scale = 0.05;
    assert(!A.covers(b, im));
    A.cover(b, im);
    assert(A.covers(b, im));
    A.validate(b);
  }
  for (const change of [
    { direction: "left" },
    { thickness: -1 },
    { glow: NaN },
    { enabled: 1 },
    { tip: { x: 2, y: 0.5 } },
    { image: { ...b.angle.image, scale: 0 } },
  ])
    assert.throws(() => A.validate({ ...b, angle: { ...b.angle, ...change } }));
  A.validate(board());
});
test("MKW keeps one photo for an enabled or hidden angle, isolates undo metadata and prunes deleted option overrides", () => {
  const b = board();
  b.angle = A.defaults(b);
  const p = {
    boards: [b],
    images: [{ id: "photo", data: "one image", original: "duplicate" }],
    logos: [],
    fonts: [],
    angleOverrides: { photo: { enabled: true }, deleted: { enabled: true } },
  };
  const snapshot = assets.capture(p);
  b.angle.image.x += 30;
  assert.notEqual(snapshot.boards[0].angle.image.x, b.angle.image.x);
  for (const enabled of [true, false]) {
    b.angle.enabled = enabled;
    const file = assets.compact(p);
    assert.equal(file.images.length, 1);
    assert.equal(file.images[0].original, undefined);
    assert.equal(file.angleOverrides.deleted, undefined);
    assert.deepEqual(file.boards[0].angle, b.angle);
  }
  p.boards = [];
  assert.equal(assets.compact(p).images.length, 0);
  assert.deepEqual(assets.compact(p).angleOverrides, {});
});

test("direction fixes the perpendicular tip axis at the content centre", () => {
  const b = board();
  for (const direction of A.directions) {
    b.angle = A.defaults(b, { direction, tip: { x: .3, y: .7 } });
    const area = { w: 900, h: 1200 }, tip = A.geometry(b, area).tip;
    assert.equal(direction === 'right' ? tip.y : tip.x, direction === 'right' ? area.h / 2 : area.w / 2);
  }
});
