const { test } = require("node:test"),
  assert = require("node:assert/strict");
const model = require("../static/setup-model.js"),
  codec = require("../static/project-file.js");
const logo = {
  id: "zkb",
  name: "ZKB.png",
  width: 200,
  height: 100,
  density: 0.4,
  ink: { x: 0, y: 0, w: 1, h: 1 },
  gray: false,
  complex: false,
  monochrome: true,
  mode: "auto",
  scale: 1,
  cx: 0.5,
  cy: 0.5,
  data: "data:image/png;base64,AQID",
  thumb: "data:image/png;base64,AQID",
};
function fixture() {
  return {
    format: "mkw-setup",
    version: 1,
    theme: "dark",
    preferences: {
      ...model.preferences(),
      textSizes: { date: 70, title: 140, subtitle: 60, copyright: 24 },
    },
    fonts: [
      {
        custom: true,
        role: "MKWCustom_" + "a".repeat(32),
        name: "Test.otf",
        displayName: "Test Regular",
        postscriptName: "Test-Regular",
        data: "data:font/otf;base64,AQID",
      },
    ],
    groups: [{ id: "main", name: "Hauptpartner", logos: [logo] }],
    logos: [logo],
  };
}
test("all settings and resources round-trip in compressed setup independently from project assets", async () => {
  const setup = model.validate({
    ...fixture(),
    projectId: "never",
    fileHandle: "never",
    boards: [{}],
  });
  assert.deepEqual(setup.preferences.textSizes, {
    date: 70,
    title: 140,
    subtitle: 60,
    copyright: 24,
  });
  assert.equal(setup.groups[0].enabled, true);
  assert.equal(setup.groups[0].logos[0].thumb, undefined);
  assert(setup.logos[0].thumb);
  assert.equal(setup.projectId, undefined);
  assert.equal(setup.fileHandle, undefined);
  assert.equal(setup.boards, undefined);
  const blob = await codec.encodeDocument(setup, {
    assetCollections: ["fonts", "logos"],
  });
  assert.deepEqual(model.validate(await codec.decode(blob)), setup);
});
test("preference migration isolates nested defaults and validates four text sizes", () => {
  const before = model.preferences(),
    migrated = model.preferences({
      lineHeight: 120,
      textSizes: { title: 145 },
      snapDistance: 0,
    });
  assert.equal(migrated.textSizes.title, 145);
  assert.equal(migrated.textSizes.date, 52);
  assert.equal(migrated.snapDistance, 6);
  migrated.textSizes.date = 100;
  assert.equal(model.defaults.textSizes.date, 52);
  assert.deepEqual(model.preferences(), before);
  for (const value of [0, NaN, Infinity, 5001, "72"])
    assert.throws(() =>
      model.preferences({ textSizes: { date: value } }, true),
    );
  assert.throws(() => model.preferences({ advanced: "yes" }, true));
});
test("setup validation rejects project files, wrong versions, malformed resources and missing references", () => {
  for (const change of [
    (s) => (s.format = "mkw"),
    (s) => (s.version = 2),
    (s) => (s.theme = "system"),
    (s) => (s.preferences.exportFormat = "pdf"),
    (s) => s.fonts.push({ ...s.fonts[0] }),
    (s) => (s.fonts[0].role = "Replica LL"),
    (s) => (s.fonts[0].data = "https://example.com/font.otf"),
    (s) => (s.logos[0].data = "data:image/svg+xml;base64,AQID"),
    (s) => (s.logos = []),
    (s) => (s.groups[0].logos[0].density = 2),
    (s) => s.groups.push({ ...s.groups[0] }),
  ]) {
    const setup = structuredClone(fixture());
    change(setup);
    assert.throws(() => model.validate(setup));
  }
  const setup = fixture();
  setup.logos.push({ ...logo, id: "unused" });
  assert.equal(model.validate(setup).logos.length, 1);
});
test("compressed setup size limit rejects over-expansion before applying data", async () => {
  const setup = fixture();
  setup.fonts[0].data += "A".repeat(10000);
  const blob = await codec.encodeDocument(setup, {
    assetCollections: ["fonts", "logos"],
  });
  assert(blob.size < 4096);
  await assert.rejects(codec.decode(blob, { maxBytes: 4096 }), /gross/);
});
test("Designer grid preferences migrate, validate and remain isolated from defaults", () => {
  const old = model.preferences({ advanced: true }),
    custom = model.preferences(
      { designerGrid: { columns: 4, rows: 3, gap: 20 } },
      true,
    );
  assert.deepEqual(old.designerGrid, { columns: 6, rows: 6, gap: 0 });
  assert.deepEqual(custom.designerGrid, { columns: 4, rows: 3, gap: 20 });
  custom.designerGrid.gap = 10;
  assert.equal(model.defaults.designerGrid.gap, 0);
  for (const field of ["columns", "rows"])
    for (const value of [0, 25, 1.5, "6"])
      assert.throws(() =>
        model.preferences({ designerGrid: { [field]: value } }, true),
      );
  for (const value of [-1, 501, NaN, "20"])
    assert.throws(() =>
      model.preferences({ designerGrid: { gap: value } }, true),
    );
  assert.deepEqual(
    model.validate({
      ...fixture(),
      preferences: {
        ...fixture().preferences,
        designerGrid: { columns: 4, rows: 3, gap: 20 },
      },
    }).preferences.designerGrid,
    { columns: 4, rows: 3, gap: 20 },
  );
});

test("start background is optional, bounded, isolated and portable", async () => {
  const old = model.validate(fixture());
  assert.equal(old.backgrounds, undefined);
  const image = {
    id: "start-background",
    name: "Startbild",
    data: "data:image/jpeg;base64,AQID",
  };
  const setup = model.validate({ ...fixture(), backgrounds: [image] });
  assert.deepEqual(setup.backgrounds, [image]);
  const blob = await codec.encodeDocument(setup, {
    assetCollections: ["fonts", "logos", "backgrounds"],
  });
  assert.deepEqual(model.validate(await codec.decode(blob)), setup);
  assert.deepEqual(
    model.validate({ ...fixture(), backgrounds: [] }).backgrounds,
    [],
  );
  for (const backgrounds of [
    null,
    [image, image],
    [{ ...image, id: "project-image" }],
    [{ ...image, data: "https://example.com/image.jpg" }],
    [{ ...image, data: "data:image/svg+xml;base64,AQID" }],
  ])
    assert.throws(() => model.validate({ ...fixture(), backgrounds }));
});

test("new UI colour combinations survive a portable setup roundtrip", async () => {
  for (const colourMode of ["analogous", "triadic"]) {
    const source = fixture();
    source.preferences.colourMode = colourMode;
    const portable = model.validate(source);
    const blob = await codec.encodeDocument(portable, {
      assetCollections: ["fonts", "logos"],
    });
    assert.equal(
      model.validate(await codec.decode(blob)).preferences.colourMode,
      colourMode,
    );
  }
});
