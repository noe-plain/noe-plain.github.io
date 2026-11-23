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
  assert.deepEqual(target.last, {});
  assert.deepEqual(target.overrides, []);
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

test("linked text shortening rebases individual character formatting without detaching position/content", () => {
  const q = fixture();
  m.reconcile(q, id);
  const source = q.carousel.objects.find((o) => o.id === "t"),
    link = q.campaign.links[0],
    target = q.carousel.objects.find((o) => o.id === link.targets[0].id);
  target.characterStyles = [{ start: 0, end: 5, size: 35, color: "#123456" }];
  target.x += 20;
  m.reconcile(q, id);
  source.text = "Hi";
  m.reconcile(q, id);
  assert.equal(target.text, "Hi");
  assert.equal(target.x, 1120);
  assert(target.characterStyles.every((s) => s.end <= 2));
  assert.equal(target.characterStyles[0].size, 35);
  assert(link.targets[0].overrides.includes("characterStyles"));
  assert(!link.targets[0].overrides.includes("text"));
});
test("local short content safely receives source character formatting without invalid ranges", () => {
  const q = fixture();
  m.reconcile(q, id);
  const source = q.carousel.objects.find((o) => o.id === "t"),
    link = q.campaign.links[0],
    target = q.carousel.objects.find((o) => o.id === link.targets[0].id);
  target.text = "A";
  m.reconcile(q, id);
  source.characterStyles = [{ start: 0, end: 5, size: 95 }];
  m.reconcile(q, id);
  assert.equal(target.text, "A");
  assert.deepEqual(target.characterStyles, [{ start: 0, end: 1, size: 95 }]);
  assert.deepEqual(link.targets[0].overrides, ["text"]);
});

test("formats use the top matching subject regardless of column and adopt new default layers", () => {
  const q = fixture();
  const [, b, , d] = q.carousel.artboards;
  // The format is the second column in the first row and the first in the next.
  q.campaign.rows[1].pages.reverse();
  q.carousel.objects.push(
    {
      id: "first-logo",
      type: "logo",
      campaignRole: "logo",
      pageId: b.id,
      source: "black",
      x: b.x + 25,
      y: b.y + 40,
      w: 320,
      h: 90,
      visible: false,
    },
    {
      id: "new-logo",
      type: "logo",
      campaignRole: "logo",
      pageId: d.id,
      source: "white",
      x: d.x + 100,
      y: d.y + 200,
      w: 600,
      h: 120,
      visible: true,
    },
  );
  m.reconcile(q, id, new Set([d.id]));
  const logo = q.carousel.objects.find((o) => o.id === "new-logo");
  assert.equal(logo.source, "black");
  assert.equal(logo.visible, false);
  assert.equal(logo.x - d.x, 25);
  assert.equal(logo.w, 320);
  assert.deepEqual(
    q.campaign.links.find((l) => l.source === "first-logo").targets[0]
      .overrides,
    [],
  );
  assert.equal(m.formats(q).get("1080x1080")[0].id, b.id);
  assert(m.valid(q));
});

test("after reordering, the top subject leads its own format and other local overrides survive", () => {
  const q = fixture();
  const [, b, , d] = q.carousel.artboards;
  q.images.push({ id: "im3" });
  q.campaign.rows.push({ imageId: "im3", pages: ["e"] });
  q.carousel.artboards.push({ ...d, id: "e", x: 0, y: 4500 });
  q.carousel.objects.push({
    ...q.carousel.objects[0],
    id: "square",
    pageId: b.id,
    x: b.x + 100,
    y: b.y + 300,
    text: "Quadrat",
  });
  m.reconcile(q, id);
  const square = q.campaign.links.find((l) => l.format === "1080x1080");
  const dText = q.carousel.objects.find(
    (o) => o.pageId === d.id && o.type === "text",
  );
  const eText = q.carousel.objects.find(
    (o) => o.pageId === "e" && o.type === "text",
  );
  dText.text = "Neue Vorlage";
  eText.x += 50;
  m.reconcile(q, id);
  q.campaign.rows.unshift(q.campaign.rows.splice(1, 1)[0]);
  m.reconcile(q, id);
  assert.equal(square.source, dText.id);
  assert.equal(eText.x, 150);
  assert.equal(eText.text, "Neue Vorlage");
  dText.size = 91;
  m.reconcile(q, id);
  assert.equal(eText.size, 91);
  assert.equal(
    q.carousel.objects.find((o) => o.id === "square").text,
    "Neue Vorlage",
  );
  assert.equal(q.carousel.objects.find((o) => o.id === "t").text, "Hallo");
  assert(m.valid(JSON.parse(JSON.stringify(q))));
});
