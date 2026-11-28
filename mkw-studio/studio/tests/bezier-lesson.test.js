const { test } = require("node:test"),
  assert = require("node:assert/strict");
const Path = require("../static/path-model.js"),
  M = require("../hilfe/bezier-model.js");
test("shared Bézier evaluation retains straight and cubic endpoint/centre geometry", () => {
  for (const t of [0, 0.1, 0.5, 1]) {
    const p = Path.pointAt({ x: 0, y: 0 }, { x: 100, y: 50 }, t);
    assert(Math.abs(p.x - 100 * t) < 1e-12);
    assert(Math.abs(p.y - 50 * t) < 1e-12);
  }
  const a = { x: 0, y: 0, out: { x: 0, y: 100 } },
    b = { x: 100, y: 0, in: { x: 100, y: 100 } };
  assert.deepEqual(Path.pointAt(a, b, 0), { x: 0, y: 0 });
  assert.deepEqual(Path.pointAt(a, b, 0.5), { x: 50, y: 75 });
  assert.deepEqual(Path.pointAt(a, b, 1), { x: 100, y: 0 });
});
test("shared handle rules preserve Shift angles, Control length, Alt freedom and absent opposite handles", () => {
  const base = {
      x: 100,
      y: 100,
      in: { x: 70, y: 100 },
      out: { x: 130, y: 100 },
    },
    n = M.copy(base);
  Path.linkedHandle(n, "out", { x: 180, y: 103 }, { ctrlKey: true }, base);
  assert(Math.abs(Math.hypot(n.in.x - 100, n.in.y - 100) - 30) < 1e-9);
  Path.linkedHandle(
    n,
    "out",
    { x: 160, y: 150 },
    { shiftKey: true },
    M.copy(n),
  );
  assert(Math.abs(n.out.x - 100 - (n.out.y - 100)) < 1e-8);
  const before = M.copy(n.in);
  Path.linkedHandle(n, "out", { x: 140, y: 120 }, { altKey: true }, M.copy(n));
  assert.deepEqual(n.in, before);
  const end = { x: 0, y: 0 };
  Path.linkedHandle(end, "out", { x: 20, y: 10 }, {}, M.copy(end), false);
  assert(!end.in);
});
test("every guided lesson rejects its initial state and accepts its actual target", () => {
  for (let i = 0; i < 6; i++) {
    const s = M.create(i);
    assert.equal(M.check(s).ok, false, `initial lesson ${i}`);
    s.paths = M.copy(M.lessons[i].target);
    s.draft = null;
    assert.equal(M.check(s).ok, true, `target lesson ${i}`);
  }
  assert(M.check(M.create(6)).free);
});
test("changing one lesson never mutates another session or the target fixtures", () => {
  const a = M.create(2),
    b = M.create(2),
    target = M.copy(M.lessons[2]);
  a.paths[0].points[0].x = 999;
  assert.equal(b.paths[0].points[0].x, 90);
  assert.deepEqual(M.lessons[2], target);
});
test("drawing, undo and redo preserve open/closed topology and reject an unended draft", () => {
  const s = M.create(0);
  for (const p of M.lessons[0].target[0].points)
    M.change(s, () => M.add(s, p.x, p.y));
  assert(!M.check(s).ok);
  M.change(s, () => M.finish(s));
  assert(M.check(s).ok);
  M.undo(s);
  assert(s.draft !== null);
  M.undo(s, true);
  assert(M.check(s).ok);
  const closed = M.create(5);
  closed.paths = M.copy(M.lessons[5].target);
  closed.paths[0].closed = false;
  assert(!M.check(closed).ok);
  closed.selected = { path: 0, node: 3 };
  M.change(closed, () => M.finish(closed, true));
  assert(M.check(closed).ok);
});
test("continuing and joining work from either end and retain curve handles", () => {
  const s = M.create(4);
  M.change(s, () => M.resume(s, 0, 1));
  M.change(s, () => M.connect(s, 1, 0));
  assert(M.check(s).ok);
  M.undo(s);
  assert.equal(s.paths.length, 2);
  M.undo(s, true);
  assert.equal(s.paths.length, 1);
  const q = M.create(4),
    before = M.copy(q.paths);
  M.change(q, () => M.resume(q, 0, 0));
  assert.equal(q.paths[0].points[0].x, 240);
  assert(M.cancel(q));
  assert.deepEqual(q.paths, before);
});
test("cancel after many drawing steps restores the source, with bounded history and point count", () => {
  const s = M.create(4),
    before = M.copy(s.paths);
  M.change(s, () => M.resume(s, 0, 1));
  for (let i = 0; i < 100; i++) M.change(s, () => M.add(s, 250 + i, 200));
  assert.equal(
    s.paths.reduce((n, p) => n + p.points.length, 0),
    80,
  );
  assert(s.past.length <= 60);
  M.cancel(s);
  assert.deepEqual(s.paths, before);
  assert.equal(s.draft, null);
  const empty = M.create();
  const snap = M.snapshot(empty);
  assert.equal(M.add(empty, NaN, 1), false);
  assert.deepEqual(M.snapshot(empty), snap);
});
test("moving an anchor translates both handles without changing their vectors", () => {
  const n = { x: 100, y: 80, in: { x: 70, y: 60 }, out: { x: 140, y: 90 } };
  M.moveNode(n, 110, 100);
  assert.deepEqual(n, {
    x: 110,
    y: 100,
    in: { x: 80, y: 80 },
    out: { x: 150, y: 110 },
  });
});
test("curvature teaching uses the same finite signed samples as the studio", () => {
  assert.deepEqual(
    Path.curvatureSamples({ x: 0, y: 0 }, { x: 100, y: 100 }),
    [],
  );
  const samples = Path.curvatureSamples(
    { x: 0, y: 0, out: { x: 0, y: 100 } },
    { x: 100, y: 0, in: { x: 100, y: 100 } },
  );
  assert.equal(samples.length, 21);
  assert(
    samples.every((s) => [s.x, s.y, s.nx, s.ny, s.k].every(Number.isFinite)),
  );
  assert(samples.every((s) => s.k < 0));
});
