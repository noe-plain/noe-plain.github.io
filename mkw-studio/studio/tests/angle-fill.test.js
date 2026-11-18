const { test } = require("node:test"),
  assert = require("node:assert/strict");
const policy = require("../static/angle-policy.js"),
  post = require("../static/post-angle-model.js"),
  templates = require("../static/template-model.js");
test("central angle defaults apply only when values were not explicitly supplied", () => {
  assert.deepEqual(policy.defaults, {
    thickness: 200,
    glow: 50,
    glowColor: "#ffffff",
    glowAlpha: 0.8,
  });
  const board = {
    w: 1080,
    h: 1350,
    image: { scale: 1, x: 540, y: 675, angle: 0, flipX: 1, flipY: 1 },
  };
  assert.equal(post.defaults(board).thickness, 200);
  assert.equal(post.defaults(board).glowAlpha, 0.8);
  const saved = {
    thickness: 150,
    glow: 0,
    glowAlpha: 0,
    angleFillMode: "solid",
    angleColour: "#135724",
    opacity: 0.4,
  };
  const current = post.defaults(board, saved);
  assert.equal(current.thickness, 150);
  assert.equal(current.glow, 0);
  assert.equal(current.glowAlpha, 0);
  assert.equal(current.opacity, 0.4);
  const q = { ...board, angle: current };
  post.validate(q);
  assert.equal(post.covers(q, { width: 1, height: 1 }), true);
  assert.equal(post.geometry(q).o.angleFillMode, "solid");
});
test("solid angle values validate and image-free templates do not invent a required photo", () => {
  for (const value of [
    { angleFillMode: "html" },
    { angleColour: "red" },
    { opacity: NaN },
    { opacity: 1.1 },
  ])
    assert.throws(() => policy.validateFill(value));
  assert.equal(policy.fill({}).kind, "image");
  const seed = require("../static/templates/mkw-winkel-slidepost.json");
  const t = structuredClone(seed);
  t.carousel.objects = t.carousel.objects
    .filter((o) => o.type === "angle")
    .slice(0, 1);
  const angle = t.carousel.objects[0];
  Object.assign(angle, {
    angleFillMode: "solid",
    angleColour: "#884422",
    opacity: 0.7,
  });
  t.slots = [{ objectId: angle.id, kind: "angle", sourceId: null }];
  t.carousel.folders = [];
  delete angle.folderId;
  const valid = templates.validate(t);
  assert.deepEqual(templates.requirements(valid), []);
  const filled = templates.instantiate(valid);
  assert.equal(filled.images.length, 0);
  assert.equal(filled.carousel.objects[0].angleColour, "#884422");
  assert.equal(
    seed.carousel.objects.some((o) => o.angleFillMode),
    false,
  );
});
