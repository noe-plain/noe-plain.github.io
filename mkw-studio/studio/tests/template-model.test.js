const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const model = require("../static/template-model.js");
const setup = require("../static/setup-model.js");
const codec = require("../static/project-file.js");
const fixture = () =>
  JSON.parse(
    fs.readFileSync(
      require.resolve("../static/templates/mkw-winkel-slidepost.json"),
      "utf8",
    ),
  );
test("template capture removes photos, originals, external references and view state without changing the project", () => {
  const t = fixture(),
    project = {
      meta: { title: "Team" },
      carousel: structuredClone(t.carousel),
      fonts: [],
    };
  Object.assign(project.carousel, { zoom: 0.5, scrollX: 500, scrollY: 20 });
  for (const o of project.carousel.objects) {
    if (model.imageLayer(o) || o.type === "angle") {
      o.imageId = "photo";
      o.original = "data:image/png;base64,AQID";
    }
    if (o.type === "logo") o.source = "custom-logo";
  }
  project.images = [{ id: "photo", data: "data:image/png;base64,AQID" }];
  const before = structuredClone(project);
  const saved = model.capture(project, { id: "test", name: "Design" });
  assert.deepEqual(project, before);
  assert(!JSON.stringify(saved).includes("data:image"));
  assert(!JSON.stringify(saved).includes("photo"));
  assert(!("zoom" in saved.carousel));
  assert.deepEqual(
    saved.carousel.objects.map((o) => o.id),
    t.carousel.objects.map((o) => o.id),
  );
  assert.equal(
    saved.carousel.objects.find((o) => o.type === "logo").source,
    "white",
  );
  assert(
    saved.slots.every(
      (s) => s.kind !== "angle" || s.sourceId === t.carousel.objects[0].id,
    ),
  );
});
test("filling creates independent identities, reuses background assets and retains paint, geometry and layer order", () => {
  const t = fixture(),
    photo = { id: "shared", data: "data:image/png;base64,AQID" },
    values = Object.fromEntries(
      t.carousel.objects
        .filter(model.imageLayer)
        .map((o) => [o.id, { image: photo }]),
    );
  let i = 0;
  const result = model.instantiate(t, {
    name: "New",
    values,
    uid: () => `new-${++i}`,
  });
  assert.equal(result.images.length, 1);
  assert(result.images[0] === photo);
  assert.equal(result.carousel.objects.length, 11);
  for (const [i, o] of result.carousel.objects.entries()) {
    assert.notEqual(o.id, t.carousel.objects[i].id);
    assert.equal(o.x, t.carousel.objects[i].x);
    assert.equal(o.w, t.carousel.objects[i].w);
    assert.equal(o.name, t.carousel.objects[i].name);
  }
  const angles = result.carousel.objects.filter((o) => o.type === "angle");
  assert(
    angles.every(
      (o) =>
        o.imageId === photo.id &&
        o.imageSourceId === result.carousel.objects[0].id,
    ),
  );
  assert.deepEqual(
    result.carousel.objects.map((o) => o.folderId),
    t.carousel.objects.map((o) =>
      o.folderId
        ? result.carousel.folders[
            t.carousel.folders.findIndex((f) => f.id === o.folderId)
          ].id
        : undefined,
    ),
  );
  const copy = structuredClone(result.carousel);
  copy.objects[0].imageId = "replacement";
  model.syncLinks(copy);
  assert(
    copy.objects
      .filter((o) => o.type === "angle")
      .every((o) => o.imageId === "replacement"),
  );
  const source = copy.objects.shift();
  model.syncLinks(copy);
  assert(
    copy.objects
      .filter((o) => o.type === "angle")
      .every((o) => !o.imageSourceId && o.imageId === "replacement"),
  );
  assert.equal(source.imageId, "replacement");
  assert(!t.carousel.objects.some((o) => o.imageId));
});
test("every layer needs a unique name, all angle sources must be image fields, hidden fields are only required when used", () => {
  const t = fixture();
  for (const change of [
    (x) => (x.carousel.objects[0].name = ""),
    (x) =>
      (x.carousel.objects[1].name = x.carousel.objects[0].name.toUpperCase()),
    (x) =>
      (x.slots.find((s) => s.kind === "angle").sourceId =
        x.carousel.objects.find((o) => o.type === "text").id),
    (x) => (x.carousel.n = 21),
  ]) {
    const bad = structuredClone(t);
    change(bad);
    assert.throws(() => model.validate(bad));
  }
  const photos = t.carousel.objects.filter(model.imageLayer);
  photos[1].visible = false;
  assert.equal(model.requirements(t).length, 4);
  photos[0].visible = false;
  assert(
    model.requirements(t).some((s) => s.objectId === photos[0].id),
    "hidden background still feeds visible angles",
  );
  for (const o of t.carousel.objects.filter((o) => o.type === "angle"))
    o.visible = false;
  assert(!model.requirements(t).some((s) => s.objectId === photos[0].id));
});
test("duplicating linked layers remaps background links only inside the copied collection", () => {
  const source = { id: "bg" },
    angle = { id: "a", imageSourceId: "bg" },
    copies = [{ id: "new-bg" }, { id: "new-a", imageSourceId: "bg" }];
  model.remapLinks([source, angle], copies);
  assert.equal(copies[1].imageSourceId, "new-bg");
  const alone = [{ id: "alone", imageSourceId: "bg" }];
  model.remapLinks([angle], alone);
  assert.equal(alone[0].imageSourceId, "bg");
});
test("design-only templates round-trip in MKW-Setup and old setups preserve an absent template field", async () => {
  const original = {
    format: "mkw-setup",
    version: 1,
    theme: "light",
    preferences: setup.preferences(),
    fonts: [],
    logos: [],
    groups: [],
  };
  assert(!Object.hasOwn(setup.validate(original), "templates"));
  const portable = setup.validate({ ...original, templates: [fixture()] });
  assert.equal(portable.templates.length, 1);
  assert(!JSON.stringify(portable).includes("data:image"));
  const decoded = setup.validate(
    await codec.decode(
      await codec.encodeDocument(portable, {
        assetCollections: ["fonts", "logos"],
      }),
    ),
  );
  assert.deepEqual(decoded, portable);
  assert.throws(() =>
    setup.validate({ ...portable, templates: [fixture(), fixture()] }),
  );
});

test("suggested layer names also avoid collisions with an existing numbered name", () => {
  const t = fixture();
  t.carousel.objects
    .slice(0, 3)
    .forEach((o, i) => (o.name = ["Bild", "Bild", "Bild 2"][i]));
  const names = model
    .suggest({ carousel: t.carousel })
    .map((o) => o.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

test("discarded empty folders do not leave undefined anchors in instantiated designs", () => {
  const t = fixture(),
    project = { carousel: t.carousel, fonts: [] };
  project.carousel.folders.push({ id: "unused", name: "Leer" });
  project.carousel.folders[0].before = "folder:unused";
  const saved = model.capture(project, { id: "anchor", name: "Ordner" });
  assert(!saved.carousel.folders.some((f) => f.id === "unused"));
  const filled = model.instantiate(saved);
  assert.equal(filled.carousel.folders[0].before, null);
});
