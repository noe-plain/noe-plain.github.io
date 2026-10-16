const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {
  carouselBezierPoint(a, b, t) {
    const u = 1 - t, p = a.out || a, q = b.in || b;
    return {
      x: u ** 3 * a.x + 3 * u * u * t * p.x + 3 * u * t * t * q.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u * u * t * p.y + 3 * u * t * t * q.y + t ** 3 * b.y,
    };
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../static/carousel-curvature.js'), 'utf8'), context);
const samples = context.carouselCurvatureSamples;
const k = 4 * (Math.sqrt(2) - 1) / 3;
test('curvature comb: straight lines have no energy; circular arcs have nearly constant curvature', () => {
  assert.equal(samples({ x: 0, y: 0 }, { x: 100, y: 0 }).length, 0);
  const arc = samples({ x: 1, y: 0, out: { x: 1, y: k } }, { x: 0, y: 1, in: { x: k, y: 1 } });
  assert(arc.every(s => Math.abs(s.k - 1) < .03));
  const large = samples({ x: 100, y: 0, out: { x: 100, y: k * 100 } }, { x: 0, y: 100, in: { x: k * 100, y: 100 } });
  assert(large.every((s, i) => Math.abs(s.k * 100 - arc[i].k) < 1e-8));
});
test('curvature comb exposes a curvature discontinuity even when tangents match', () => {
  const a = { x: 1, y: 0, out: { x: 1, y: k } },
    b = { x: 0, y: 1, in: { x: k, y: 1 }, out: { x: -k, y: 1 } },
    c = { x: -1, y: 0, in: { x: -1, y: k } };
  const before = samples(a, b).at(-1).k, after = samples(b, c)[0].k;
  assert(Math.abs(before - after) < 1e-5);
  const changed = samples({ ...b, out: { x: -k / 2, y: 1 } }, c)[0].k;
  assert(Math.abs(before - changed) > .5);
});
test('S curves change curvature sign without producing non-finite comb lengths', () => {
  const s = samples({ x: 0, y: 0, out: { x: 50, y: 100 } }, { x: 100, y: 0, in: { x: 50, y: -100 } });
  assert(s.every(p => [p.x, p.y, p.nx, p.ny, p.k].every(Number.isFinite)));
  assert(s.some(p => p.k > 0) && s.some(p => p.k < 0));
});
