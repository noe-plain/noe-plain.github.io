const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  m = require("../static/photo-transform-model.js"),
  post = require("../static/post-angle-model.js");
test("legacy photo transforms preserve all four image corners for every angle direction, rotation and reflection", () => {
  const source = { width: 480, height: 320 };
  for (const direction of ["left", "right", "up", "down"])
    for (const angle of [0, 17, -38, 90])
      for (const flipX of [1, -1]) {
        const b = {
          w: 600,
          h: 750,
          image: { x: 300, y: 375, scale: 2, angle: 0, flipX: 1, flipY: 1 },
        };
        b.angle = post.defaults(b, { direction });
        const frame = post.geometry(b).o,
          t = { x: 350, y: 320, scale: 2.1, angle, flipX, flipY: -1 },
          o = { ...frame, ...m.fromLegacy(frame, source, t) };
        m.validate(o);
        const actual = m.corners(o, source),
          corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ];
        for (let i = 0; i < 4; i++) {
          const [sx, sy] = corners[i],
            x = (sx * source.width * t.scale * t.flipX) / 2,
            y = (sy * source.height * t.scale * t.flipY) / 2,
            a = (t.angle * Math.PI) / 180;
          assert(
            Math.abs(
              frame.x + actual[i].x - (t.x + x * Math.cos(a) - y * Math.sin(a)),
            ) < 1e-9,
          );
          assert(
            Math.abs(
              frame.y + actual[i].y - (t.y + x * Math.sin(a) + y * Math.cos(a)),
            ) < 1e-9,
          );
        }
      }
});
test("coverage is tested in the rotated photo plane and fit covers the frame without resetting rotation", () => {
  const source = { width: 640, height: 480 };
  for (const imageAngle of [0, 17, 90, -45]) {
    const o = {
      type: "image",
      w: 400,
      h: 500,
      scale: 1,
      panX: 0,
      panY: 0,
      imageAngle,
      flipX: 1,
      flipY: 1,
    };
    o.scale = m.coverScale(o, source);
    for (const point of [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 500 },
      { x: 0, y: 500 },
    ])
      assert(m.contains(o, source, point));
  }
  for (const imageAngle of [NaN, Infinity, 361, "17"])
    assert.throws(() => m.validate({ type: "angle", imageAngle }));
  assert.throws(() => m.validate({ type: "text", imageAngle: 17 }));
  m.validate({ type: "angle" });
});
