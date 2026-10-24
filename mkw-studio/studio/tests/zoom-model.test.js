const { test } = require("node:test");
const assert = require("node:assert/strict");
const z = require("../static/zoom-model.js");
test("phone preview is 390 CSS pixels for both editor coordinate systems and arbitrary source widths", () => {
  for (const width of [720, 1080, 1440, 2160])
    for (const unit of [1, 0.24]) {
      const base = z.reference(width, unit);
      assert(Math.abs(z.value(100, base) * width * unit - 390) < 1e-8);
      for (const percent of [20, 100, 120, 200])
        assert(
          Math.abs(z.percent(z.value(percent, base), base) - percent) < 1e-8,
        );
    }
});
