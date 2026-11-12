const test = require("node:test"),
  assert = require("node:assert/strict"),
  m = require("../static/campaign-model.js");
function fixture() {
  return {
    campaign: {
      version: 1,
      rows: [
        { imageId: "im1", pages: ["a", "b"] },
        { imageId: "im2", pages: ["c", "d"] },
      ],
      links: [],
    },
    images: [{ id: "im1" }, { id: "im2" }],
    carousel: {
      artboards: [
        { id: "a", w: 1080, h: 1920, x: 1000, y: 0 },
        { id: "b", w: 1080, h: 1080, x: 2300, y: 0 },
        { id: "c", w: 1080, h: 1920, x: 1000, y: 2300 },
        { id: "d", w: 1080, h: 1080, x: 2300, y: 2300 },
      ],
      objects: [
        {
          id: "t",
          type: "text",
          pageId: "a",
          x: 1100,
          y: 300,
          w: 800,
          h: 200,
          text: "Hallo",
          size: 70,
        },
        {
          id: "bg",
          type: "image",
          pageId: "a",
          campaignRole: "background",
          imageId: "im1",
          x: 1000,
          y: 0,
          w: 1080,
          h: 1920,
        },
      ],
    },
  };
}
let n = 0;
const id = () => `copy-${++n}`;
test("campaign links share only equal dimensions and retain property-specific overrides", () => {
  const q = fixture();
  m.reconcile(q, id);
  assert(m.valid(q));
  const o = q.carousel.objects.find((o) => o.id !== "t" && o.type === "text");
  assert.equal(o.pageId, "c");
  assert.equal(o.y, 2600);
  assert.equal(q.carousel.objects.length, 3);
  o.x += 50;
  m.reconcile(q, id);
  q.carousel.objects[0].text = "Neu";
  q.carousel.objects[0].x += 10;
  q.carousel.objects[0].size = 85;
  m.reconcile(q, id);
  assert.equal(o.text, "Neu");
  assert.equal(o.x, 1150);
  assert.equal(o.size, 85);
  assert.deepEqual(q.campaign.links[0].targets[0].overrides, ["x"]);
  assert(m.reset(q, o.id));
  assert.equal(o.x, 1110);
  assert.equal(o.text, "Neu");
});
test("extra images and later gradients stay local; deleted followers stay deleted across updates", () => {
  const q = fixture();
  q.carousel.objects.push({
    id: "extra",
    type: "image",
    pageId: "a",
    x: 10,
    y: 10,
    w: 100,
    h: 100,
    imageId: "im2",
  });
  m.reconcile(q, id);
  assert.equal(q.carousel.objects.filter((o) => o.type === "image").length, 2);
  const target = q.campaign.links[0].targets[0];
  q.carousel.objects = q.carousel.objects.filter((o) => o.id !== target.id);
  m.reconcile(q, id);
  q.carousel.objects[0].text = "Andere";
  m.reconcile(q, id);
  assert.equal(target.id, null);
  assert.equal(q.carousel.objects.filter((o) => o.type === "text").length, 1);
  assert(m.valid(q));
});
test("campaign link state survives JSON roundtrip and rejects missing referenced pages/objects", () => {
  const q = fixture();
  m.reconcile(q, id);
  const r = JSON.parse(JSON.stringify(q));
  assert(m.valid(r));
  r.campaign.links[0].targets[0].page = "missing";
  assert(!m.valid(r));
  const z = JSON.parse(JSON.stringify(q));
  z.campaign.rows[0].pages.push("a");
  assert(!m.valid(z));
});
test("master deletion removes linked copies while local photos remain", () => {
  const q = fixture();
  m.reconcile(q, id);
  q.carousel.objects = q.carousel.objects.filter((o) => o.id !== "t");
  m.reconcile(q, id);
  assert.equal(q.carousel.objects.length, 1);
  assert.equal(q.carousel.objects[0].id, "bg");
  assert(m.valid(q));
});

test("local text remains independent while position keeps following the master", () => {
  const q = fixture();
  m.reconcile(q, id);
  const link = q.campaign.links[0],
    target = q.carousel.objects.find((o) => o.id === link.targets[0].id);
  target.text = "Eigenständig";
  m.reconcile(q, id);
  q.carousel.objects[0].x += 35;
  q.carousel.objects[0].text = "Neue Vorlage";
  m.reconcile(q, id);
  assert.equal(target.text, "Eigenständig");
  assert.equal(target.x, 1135);
  assert.deepEqual(link.targets[0].overrides, ["text"]);
});
