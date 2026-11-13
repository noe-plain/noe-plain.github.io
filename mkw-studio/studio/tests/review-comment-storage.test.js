const { test } = require("node:test"),
  assert = require("node:assert/strict");
global.MKWProjectAssets = require("../static/project-assets.js");
const files = require("../static/project-file.js"),
  rows = require("../static/spread-layout-model.js");
const format = {
  w: 600,
  h: 750,
  top: 50,
  bottom: 50,
  left: 50,
  right: 50,
  bg: "#ffffff",
  n: 2,
  objects: [],
};
function project() {
  return {
    version: 1,
    meta: { title: "Kommentar-Prüfrezept" },
    fonts: [],
    logos: [],
    images: [
      {
        id: "photo",
        data: "data:image/png;base64,AA==",
        original: "data:image/png;base64,AA==",
      },
    ],
    boards: [
      { id: "portrait", imageId: "photo", elements: {} },
      { id: "square", imageId: "photo", elements: {} },
    ],
  };
}
test("comment storage contract: FD image note survives the real MKW writer for all linked formats", async () => {
  const p = project(),
    note = "Bildnotiz 🎶\n„Ausschnitt prüfen“ <b>reiner Text</b>";
  p.images[0].reviewComment = note;
  const before = structuredClone(p);
  const q = MKWProjectAssets.hydrate(await files.decode(await files.encode(p)));
  assert.equal(q.images[0].reviewComment, note);
  assert(q.boards.every((b) => b.imageId === q.images[0].id));
  assert.deepEqual(p, before);
});
test("comment storage contract: Designer note follows the stable slide ID across moves, duplication and removal", () => {
  const c = rows.plan(format, { type: "enable" }),
    page = c.artboards[0];
  page.reviewComment = "Zum Motiv auf dieser Slide";
  const before = structuredClone(c);
  const moved = rows.plan(c, {
    type: "row-slide",
    ids: [page.id],
    operation: "move",
    delta: 1,
  });
  assert.equal(
    moved.artboards.find((a) => a.id === page.id).reviewComment,
    page.reviewComment,
  );
  const duplicate = rows.plan(c, {
    type: "row-slide",
    ids: [page.id],
    operation: "duplicate",
    index: 1,
  });
  assert.equal(duplicate.artboards[1].reviewComment, page.reviewComment);
  assert.notEqual(duplicate.artboards[1].id, page.id);
  const removed = rows.plan(c, {
    type: "row-slide",
    ids: [page.id],
    operation: "remove",
  });
  assert(
    !removed.artboards.some(
      (a) => a.id === page.id || a.reviewComment === page.reviewComment,
    ),
  );
  assert.deepEqual(c, before);
});
test("comment storage contract: complete MKW retains unselected row notes without adding artwork layers", async () => {
  const p = project();
  p.carousel = rows.plan(rows.plan(format, { type: "enable" }), {
    type: "add",
    count: 1,
    spread: true,
  });
  const page = p.carousel.artboards.at(-1);
  page.reviewComment = "Notiz in nicht exportierter Reihe";
  p.boards.forEach((b) => (b.checked = false));
  const q = await files.decode(await files.encode(p));
  assert.equal(
    q.carousel.artboards.find((a) => a.id === page.id).reviewComment,
    page.reviewComment,
  );
  assert.deepEqual(q.carousel.objects, []);
  assert.equal(q.carousel.pageStructure.groups.length, 2);
});
