const test = require("node:test"),
  assert = require("node:assert/strict"),
  angle = require("../static/angle-policy.js");
test("angle drawing derives only the new draft orientation from absolute drag aspect ratio", () => {
  for (const [w, h, expected] of [
    [400, 100, "down"],
    [100, 400, "left"],
    [200, 200, "left"],
    [-400, 100, "down"],
    [400, -100, "down"],
    [-100, -400, "left"],
  ])
    assert.equal(angle.drawingDirection(w, h), expected);
  assert(angle.choices("up").includes("up"));
  assert(angle.choices("right").includes("right"));
});
