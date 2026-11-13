const test = require("node:test"),
  assert = require("node:assert/strict"),
  clip = require("../static/polygon-clip.js");
test("visible polygon clipping ignores off-output regions and edge-only contact", () => {
  const rect = { x: 0, y: 0, w: 100, h: 100 },
    source = [
      { x: -100, y: -20 },
      { x: 50, y: -20 },
      { x: 50, y: 150 },
      { x: -100, y: 150 },
    ];
  const result = clip.rectangle(source, rect);
  assert.equal(clip.area(result), 5000);
  assert(result.every((p) => p.x >= 0 && p.x <= 50 && p.y >= 0 && p.y <= 100));
  assert.equal(
    clip.area(clip.rectangle(source, { x: 150, y: 0, w: 100, h: 100 })),
    0,
  );
  assert.equal(
    clip.area(clip.rectangle(source, { x: 50, y: 0, w: 100, h: 100 })),
    0,
  );
  assert.equal(source[0].x, -100);
});
