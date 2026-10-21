const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../static/carousel-policy.js");
const anglePolicy = require("../static/angle-policy.js");
const validation = require("../static/project-validation.js");
const layout = require("../static/layout.js");
const angles = require("../static/post-angle-model.js");
const text = require("../static/text-model.js");
const sponsors = require("../static/sponsor-model.js");
const inspector = require("../static/post-inspector.js");

test("carousel count has one inclusive integer policy and rejects invalid imported/setup values", () => {
  for (let n = 1; n <= 20; n++) assert(policy.validCount(n));
  for (const n of [0, -1, 21, 1.5, NaN, Infinity, "1", null, undefined])
    assert(!policy.validCount(n));
  assert(Object.isFrozen(policy));
});
test("new angle choices point left while legacy right-facing files remain interpretable", () => {
  assert.deepEqual(anglePolicy.choices(), ["up", "left", "down"]);
  assert.deepEqual(anglePolicy.choices("right"), [
    "up",
    "left",
    "down",
    "right",
  ]);
  assert(anglePolicy.horizontal("left") && anglePolicy.horizontal("right"));
  assert(!anglePolicy.accepts("diagonal"));
  const b = {
    w: 1080,
    h: 1350,
    image: { x: 540, y: 675, scale: 1, angle: 0, flipX: 1, flipY: 1 },
  };
  b.angle = angles.defaults(b);
  assert.equal(b.angle.direction, "left");
  const { tip, inner } = angles.geometry(b);
  assert(tip.x < inner.x);
  assert.equal(tip.y, 675);
  angles.validate(b);
  b.angle = angles.defaults(b, { direction: "right" });
  angles.validate(b);
  assert(angles.geometry(b).tip.x > angles.geometry(b).inner.x);
});
test("project validation has explicit collaborators and rejects malformed files without editor or DOM state", () => {
  const calls = [];
  const validate = validation.create({
    family: (q) => calls.push(q.projectId),
    textBox: layout.validateTextBox,
    angle: angles.validate,
    text: text.validate,
    customFont: () => false,
    sponsors: sponsors.validate,
  });
  const element = {
    text: "Hello",
    x: 100,
    y: 100,
    size: 40,
    align: "left",
    angle: 0,
    color: "#000000",
    role: "Arial",
  };
  const doc = {
    projectId: "isolated",
    version: 1,
    meta: {},
    images: [
      {
        id: "photo",
        data: "data:image/png;base64,AA==",
        original: "data:image/png;base64,AA==",
        width: 100,
        height: 100,
      },
    ],
    fonts: [],
    logos: [],
    boards: [
      {
        id: "board",
        imageId: "photo",
        w: 1080,
        h: 1350,
        bg: "#ffffff",
        image: { x: 540, y: 675, scale: 1, angle: 0, flipX: 1, flipY: 1 },
        elements: Object.fromEntries(
          ["date", "title", "subtitle", "copyright", "logo"].map((k) => [
            k,
            { ...element },
          ]),
        ),
      },
    ],
  };
  assert.equal(validate(doc), doc);
  assert.deepEqual(calls, ["isolated"]);
  for (const mutate of [
    (q) => (q.projectId = "bad/id"),
    (q) => q.images.push({ ...q.images[0] }),
    (q) => (q.boards[0].imageId = "missing"),
    (q) => (q.boards[0].image.scale = 0),
    (q) => (q.boards[0].elements.title.align = "unknown"),
  ]) {
    const bad = structuredClone(doc);
    mutate(bad);
    assert.throws(() => validate(bad));
  }
});
test("post inspector can render empty/tool state with injected services and no global editor", () => {
  const nodes = Object.fromEntries(
    ["stepPanel", "toolTitle", "toolEmpty"].map((id) => ["#" + id, {}]),
  );
  let state = {
    project: {},
    board: null,
    step: "text",
    advanced: false,
    elementNames: {},
    layer: "title",
  };
  const ui = inspector.create({
    read: () => state,
    actions: {},
    views: { query: (key) => nodes[key] },
  });
  ui.render();
  assert.equal(nodes["#stepPanel"].hidden, true);
  assert.equal(nodes["#toolTitle"].textContent, "Dein Bild gestalten");
  state = { ...state, step: "export" };
  ui.render();
  assert.match(nodes["#toolEmpty"].textContent, /Exportfenster/);
});

test("injected crop inspector keeps icon arguments and scopes event lookups to its own panel", () => {
  const controls = new Map(),
    icons = [];
  const panel = {
    querySelectorAll: () => [],
    querySelector: (id) => {
      controls.set(id, (controls.get(id) || 0) + 1);
      return null;
    },
  };
  const nodes = { "#stepPanel": panel, "#toolTitle": {}, "#toolEmpty": {} };
  const b = { image: { scale: 1, angle: 0 }, bg: "#ffffff" };
  const ui = inspector.create({
    read: () => ({
      project: {},
      board: b,
      step: "crop",
      layer: "image",
      advanced: false,
    }),
    actions: {},
    views: {
      query: (id) => nodes[id],
      icon: (name) => {
        icons.push(name);
        return "";
      },
      bindFamilyTools: () => {},
    },
  });
  ui.render();
  assert.deepEqual(icons, ["flip", "flip"]);
  for (const id of ["#scale", "#angle", "#flipX", "#flipY", "#bg"])
    assert(controls.has(id));
  assert.equal(nodes["#toolTitle"].textContent, "Bildausschnitt");
});
