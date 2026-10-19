const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  S = require("../static/sponsor-model.js"),
  A = require("../static/project-assets.js"),
  L = require("../static/layout.js");
const logo = (id, w = 240, h = 56) => ({
  id,
  name: id,
  width: w,
  height: h,
  density: 0.3,
  cx: 0.5,
  cy: 0.5,
  gray: false,
  complex: false,
  scale: 1,
  mode: "auto",
});
const board = (w = 1080, h = 1350) => ({
  w,
  h,
  safe: { top: 100, bottom: 200 },
  sponsors: {
    enabled: true,
    colour: "#ffffff",
    height: 180,
    groups: [
      { id: "a", name: "Hauptpartnerin", enabled: true, logos: [logo("zkb")] },
      {
        id: "b",
        name: "Partner",
        enabled: true,
        logos: [logo("one", 100, 100), logo("two", 100, 50)],
      },
    ],
  },
});
test("sponsor geometry rotates only square/landscape strip, accounting for portrait strip in bottom safe zone", () => {
  const a = board(),
    r = S.layout(a);
  assert.equal(r.thickness, 180);
  assert.deepEqual(r.content, { w: 1080, h: 1170 });
  const safe = L.safeRect(a);
  assert.deepEqual([safe.x, safe.y, safe.w, safe.h], [100, 100, 880, 970]);
  const b = board(1080, 1080),
    q = S.layout(b);
  assert(q.vertical);
  assert.deepEqual(q.content, { w: 900, h: 1080 });
  assert.equal(L.safeRect(b).w, 700);
  for (const g of q.groups)
    for (const l of g.logos) {
      const hit = S.hit(b, {
        x: q.content.w + l.y + l.h / 2,
        y: b.h - l.x - l.w / 2,
      });
      assert.equal(hit.logoId, l.id);
    }
});
test("groups wrap as intact units before logos get crowded, with bounded optical correction", () => {
  const b = board();
  b.sponsors.groups = Array.from({ length: 4 }, (_, i) => ({
    id: String(i),
    name: "Gruppe " + i,
    enabled: true,
    logos: [logo(String(i), 1000, 100)],
  }));
  const r = S.layout(b);
  assert(r.thickness > 180);
  assert(r.groups[2].y > r.groups[0].y);
  for (const g of r.groups)
    assert(g.logos.every((l) => l.x >= 94 && l.x + l.w <= 986));
  b.sponsors.enabled = false;
  assert.equal(S.layout(b), null);
});
test("automatic modes retain grayscale/complex detail and select contrast for simple marks", () => {
  assert.equal(S.mode(logo("a"), "#ffffff"), "black");
  assert.equal(S.mode(logo("a"), "#15243a"), "white");
  assert.equal(S.mode({ ...logo("a"), gray: true }, "#15243a"), "gray");
  assert.equal(S.mode({ ...logo("a"), complex: true }, "#fff000"), "gray");
  assert.equal(
    S.mode({ ...logo("a"), gray: true, mode: "white" }, "#15243a"),
    "white",
  );
});
test("hidden sponsor groups retain assets, deletion releases them, snapshots isolate metadata", () => {
  const p = {
    boards: [board()],
    images: [],
    logos: ["zkb", "one", "two", "unused"].map((id) => ({ id, data: id })),
    fonts: [{ role: "Replica LL", data: "font" }],
  };
  p.boards[0].sponsors.enabled = false;
  const packed = A.compact(p);
  assert.equal(packed.logos.length, 3);
  assert.equal(packed.fonts.length, 1);
  const snapshot = A.capture(p);
  p.boards[0].sponsors.groups = [];
  assert.equal(A.compact(p).logos.length, 0);
  assert.equal(A.compact(snapshot).logos.length, 3);
  assert.equal(snapshot.logos[0], p.logos[0]);
});
test("sponsor validation rejects missing assets and malformed dimensions", () => {
  const p = {
    boards: [board()],
    logos: ["zkb", "one", "two"].map((id) => ({ id })),
  };
  assert.doesNotThrow(() => S.validate(p));
  p.boards[0].sponsors.groups[0].logos[0].scale = 10;
  assert.throws(() => S.validate(p));
  p.boards[0].sponsors.groups[0].logos[0].scale = 1;
  p.logos = [];
  assert.throws(() => S.validate(p));
});
test("heading case is display-only and measured consistently", () => {
  const b = {
    w: 1080,
    h: 1080,
    elements: Object.fromEntries(
      [...L.keys, "logo"].map((k) => [
        k,
        {
          text: k === "date" ? "Aus nächster Nähe" : "",
          enabled: k === "date",
          visible: k === "date",
          uppercase: true,
          size: 52,
          align: "left",
          role: "Replica LL",
        },
      ]),
    ),
  };
  let r = L.textLayout(b, (t, n) => t.length * n * 0.4);
  assert.equal(r.mainRecords[0].text, "AUS NÄCHSTER NÄHE");
  assert.equal(b.elements.date.text, "Aus nächster Nähe");
  b.elements.date.uppercase = false;
  r = L.textLayout(b, (t, n) => t.length * n * 0.4);
  assert.equal(r.mainRecords[0].text, "Aus nächster Nähe");
});

test("optical ink weight is balanced across groups, and visible edges align with labels", () => {
  const b = board();
  b.sponsors.groups = [
    {
      id: "a",
      name: "A",
      enabled: true,
      logos: [
        { ...logo("wide", 240, 80), ink: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } },
      ],
    },
    { id: "b", name: "B", enabled: true, logos: [logo("square", 80, 80)] },
  ];
  const r = S.layout(b),
    a = r.groups[0].logos[0],
    c = r.groups[1].logos[0];
  assert(Math.abs(a.w * a.h * a.density - c.w * c.h * c.density) < 0.001);
  assert(Math.abs(a.x + a.ink.x * a.w - r.groups[0].x) < 0.001);
  const separate = [a.h, c.h];
  b.sponsors.groups[0].logos.push(b.sponsors.groups[1].logos[0]);
  b.sponsors.groups.pop();
  assert.deepEqual(
    S.layout(b).groups[0].logos.map((l) => l.h),
    separate,
  );
  b.sponsors.groups[0].logos[0].scale = 1.4;
  assert(
    Math.abs(S.layout(b).groups[0].logos[0].h / separate[0] - 1.4) < 0.001,
  );
});

test("preserved grayscale density is balanced against monochrome marks across groups", () => {
  const b = board();
  b.sponsors.groups = [
    { id: "a", name: "A", enabled: true, logos: [logo("black", 240, 80)] },
    {
      id: "b",
      name: "B",
      enabled: true,
      logos: [
        {
          ...logo("gray", 240, 80),
          gray: true,
          darkDensity: 0.15,
          lightDensity: 0.15,
        },
      ],
    },
  ];
  const r = S.layout(b),
    a = r.groups[0].logos[0],
    g = r.groups[1].logos[0];
  assert(Math.abs(a.w * a.h * 0.3 - g.w * g.h * 0.15) < 0.001);
});

test("logo ordering supports within-group and cross-group moves without copying assets", () => {
  const groups = [
    { id: "a", logos: [logo("a"), logo("b"), logo("c")] },
    { id: "b", logos: [] },
  ];
  let next = S.moveLogo(groups, "a", "c", "a", "a");
  assert.deepEqual(
    next[0].logos.map((l) => l.id),
    ["c", "a", "b"],
  );
  assert.equal(next[0].logos[0], groups[0].logos[2]);
  next = S.moveLogo(next, "a", "c", "b");
  assert.deepEqual(
    next.map((g) => g.logos.map((l) => l.id)),
    [["a", "b"], ["c"]],
  );
  assert.deepEqual(
    groups.map((g) => g.logos.map((l) => l.id)),
    [["a", "b", "c"], []],
  );
  assert.equal(S.moveLogo(next, "b", "c", "b"), null);
  assert.equal(S.moveLogo(next, "a", "a", "a", "a"), null);
  const full = [
    groups[0],
    { id: "b", logos: Array.from({ length: 30 }, (_, i) => logo(String(i))) },
  ];
  assert.throws(() => S.moveLogo(full, "a", "a", "b"), /30 Logos/);
});

test("portrait sponsor height is included in the original bottom safe zone with a 100px minimum", () => {
  const b = board(1080, 1920);
  b.safe.bottom = 500;
  let s = L.safeRect(b);
  assert.equal(s.bottom, 320);
  assert.equal(s.y + s.h, 1420);
  b.safe.bottom = 50;
  assert.equal(L.safeRect(b).bottom, 100);
  b.sponsors.enabled = false;
  assert.equal(L.safeRect(b).bottom, 50);
  const square = board(1080, 1080);
  assert.equal(L.safeRect(square).bottom, 200);
});

test("binary black/white marks adapt to strip contrast while real gray tones remain", () => {
  assert.equal(
    S.mode({ ...logo("a"), gray: true, monochrome: true }, "#14283c"),
    "white",
  );
  assert.equal(
    S.mode({ ...logo("a"), gray: true, monochrome: true }, "#ffffff"),
    "black",
  );
  assert.equal(
    S.mode({ ...logo("a"), gray: true, monochrome: false }, "#14283c"),
    "gray",
  );
});

test("sponsor blend modes select real multiply/screen and survive portable validation", () => {
  assert.equal(S.composite("black", "#ffffff"), "multiply");
  assert.equal(S.composite("white", "#ffffff"), "screen");
  assert.equal(S.composite("gray", "#ffffff"), "multiply");
  assert.equal(S.composite("gray", "#14283c"), "screen");
  assert.equal(S.composite("multiply", "#14283c"), "multiply");
  assert.equal(S.composite("screen", "#ffffff"), "screen");
  assert.equal(S.composite("original", "#14283c"), "source-over");
  for (const mode of ["multiply", "screen"]) {
    const b = board();
    b.sponsors.groups[0].logos[0].mode = mode;
    const project = JSON.parse(
      JSON.stringify(
        A.compact({
          boards: [b],
          logos: [
            { id: "zkb", data: "logo" },
            { id: "one", data: "one" },
            { id: "two", data: "two" },
          ],
          images: [],
          fonts: [],
        }),
      ),
    );
    S.validate(project);
    assert.equal(project.boards[0].sponsors.groups[0].logos[0].mode, mode);
  }
});
