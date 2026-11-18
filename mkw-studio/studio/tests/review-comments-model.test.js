const { test } = require("node:test"),
  assert = require("node:assert/strict");
const comments = require("../static/review-comments-model.js");
const rows = require("../static/spread-layout-model.js");
const base = () => ({
  images: [{ id: "photo", reviewComment: "Alt", data: "unveränderte Bytes" }],
  boards: [
    { id: "a", imageId: "photo", carouselSlide: 0 },
    { id: "b", imageId: "photo", carouselSlide: 1 },
  ],
});
test("comments are bounded plain text; invalid/no-op updates preserve source and redo-compatible identity", () => {
  const p = base(),
    ref = comments.target(p, "a");
  assert.strictEqual(comments.update(p, ref, "Alt"), p);
  assert.throws(() => comments.update(p, ref, "x".repeat(1001)), /1000/);
  assert.throws(() => comments.update(p, ref, { html: "text" }));
  const changed = comments.update(
    p,
    ref,
    "  <b>Notiz 🎻</b>\r\nZweite Zeile  ",
  );
  assert.equal(comments.read(changed, ref), "<b>Notiz 🎻</b>\nZweite Zeile");
  assert.equal(p.images[0].reviewComment, "Alt");
  assert.notEqual(
    changed.images[0],
    p.images[0],
    "Immutable image metadata keeps shallow asset snapshots undoable",
  );
  assert.equal(changed.images[0].data, p.images[0].data);
  assert.equal(comments.target(changed, "b").id, ref.id);
  assert(!("reviewComment" in comments.update(changed, ref, "  ").images[0]));
  assert.throws(
    () => comments.update(p, { kind: "image", id: "deleted" }, "note"),
    /vorhanden/,
  );
});
test("Designer comments use stable page IDs and move/duplicate/remove with the canonical page", () => {
  const p = base();
  p.carousel = rows.plan(
    {
      w: 600,
      h: 750,
      n: 2,
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
      bg: "#ffffff",
      objects: [],
    },
    { type: "enable" },
  );
  const ref = comments.target(p, "a"),
    changed = comments.update(p, ref, "Seite A");
  assert.equal(ref.kind, "page");
  assert(!p.carousel.artboards[0].reviewComment);
  const moved = {
    ...changed,
    carousel: rows.plan(changed.carousel, {
      type: "row-slide",
      ids: [ref.id],
      operation: "move",
      delta: 1,
    }),
  };
  assert.equal(comments.read(moved, ref), "Seite A");
  const duplicate = rows.plan(changed.carousel, {
    type: "row-slide",
    ids: [ref.id],
    operation: "duplicate",
    index: 1,
  });
  assert.equal(duplicate.artboards[1].reviewComment, "Seite A");
  const removed = {
    ...changed,
    carousel: rows.plan(changed.carousel, {
      type: "row-slide",
      ids: [ref.id],
      operation: "remove",
    }),
  };
  assert.equal(comments.owner(removed, ref), undefined);
});
test("legacy Designer metadata adopts canonical pages without changing layout; FD campaign resolves the real image", () => {
  const p = base();
  p.carousel = { w: 600, h: 750, n: 2, objects: [] };
  p.boards[0].reviewComment = "Alte Notiz";
  assert.equal(comments.target(p, "a").kind, "board");
  p.carousel = rows.plan(p.carousel, { type: "enable" });
  const before = structuredClone(p);
  const migrated = comments.adopt(p);
  assert.deepEqual(p, before);
  assert.equal(migrated.carousel.artboards[0].reviewComment, "Alte Notiz");
  assert(!("reviewComment" in migrated.boards[0]));
  assert.deepEqual(migrated.carousel.objects, p.carousel.objects);
  assert.strictEqual(comments.adopt(migrated), migrated);
  migrated.campaign = { rows: [{ imageId: "photo", pages: ["page-A"] }] };
  migrated.boards[0].campaignPage = "page-A";
  migrated.boards[0].imageId = "placeholder";
  assert.deepEqual(comments.target(migrated, "a"), {
    kind: "image",
    id: "photo",
  });
  migrated.images[0].reviewComment = 4;
  assert.throws(() => comments.validate(migrated));
});

test("blank Slides and new rows never inherit notes; explicit duplicates do", () => {
  const p = base();
  p.carousel = rows.plan(
    {
      w: 600,
      h: 750,
      n: 1,
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
      bg: "#ffffff",
      objects: [],
    },
    { type: "enable" },
  );
  p.carousel.artboards[0].reviewComment = "Nur für das Original";
  const id = p.carousel.artboards[0].id;
  for (const action of [
    { type: "row-slide", ids: [id], operation: "insert", index: 1 },
    { type: "row-slide", ids: [id], operation: "resize", count: 3 },
    { type: "add", count: 1, spread: true },
  ]) {
    const next = rows.plan(p.carousel, action);
    assert(
      next.artboards
        .filter((a) => a.id !== id)
        .every((a) => a.reviewComment === undefined),
    );
  }
  assert.equal(
    rows.plan(p.carousel, {
      type: "row-slide",
      ids: [id],
      operation: "duplicate",
      index: 1,
    }).artboards[1].reviewComment,
    "Nur für das Original",
  );
});

test("whole-Artboard duplication retains the comment on its copied page", () => {
  const p = base();
  p.carousel = rows.plan(
    {
      w: 600,
      h: 750,
      n: 1,
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
      bg: "#ffffff",
      objects: [],
    },
    { type: "enable" },
  );
  const page = p.carousel.artboards[0];
  page.reviewComment = "Mitkopieren";
  const next = rows.plan(p.carousel, { type: "duplicate", ids: [page.id] });
  assert.equal(next.artboards[1].reviewComment, "Mitkopieren");
});

test("fifty image notes retain the same immutable pixel sources and independent identities", () => {
  let p = {
    images: Array.from({ length: 50 }, (_, i) => ({
      id: "i" + i,
      data: "shared-immutable-bytes",
      original: "shared-immutable-bytes",
    })),
    boards: Array.from({ length: 50 }, (_, i) => ({
      id: "b" + i,
      imageId: "i" + i,
    })),
  };
  const before = structuredClone(p);
  for (const b of p.boards)
    p = comments.update(p, comments.target(p, b.id), "Notiz " + b.id);
  comments.validate(p);
  assert(
    p.images.every(
      (im, i) =>
        im.data === before.images[i].data &&
        im.original === before.images[i].original,
    ),
  );
  assert.equal(new Set(p.images.map((im) => im.reviewComment)).size, 50);
  assert(before.images.every((im) => !im.reviewComment));
});
