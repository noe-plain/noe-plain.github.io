const { test } = require("node:test");
const assert = require("node:assert/strict");
const c = require("../static/core.js");
test("JJMMTT only", () => {
  assert.equal(c.dateName("15.11.26"), "261115");
  assert.equal(c.dateName("01.12.26"), "261201");
  assert.equal(c.dateName("29.02.24"), "240229");
});
test("valid calendar dates", () => {
  for (const s of ["29.02.25", "31.04.26", "00.01.26", "01.13.26", "31.02.26"])
    assert.throws(() => c.dateName(s));
});
test("actual aspect ratio", () => {
  assert.equal(c.ratio(1080, 1920), "9x16");
  assert.equal(c.ratio(1080, 1350), "4x5");
  assert.equal(c.ratio(531, 719), "531x719");
});
test("visible numbering and cleaned names", () => {
  assert.deepEqual(
    c.names({ date: "15.11.26", code: "E2", title: "Dichterlos", start: 3 }, [
      { w: 1080, h: 1920 },
      { w: 1080, h: 1080 },
    ]),
    ["261115_E2_Dichterlos_9x16_3.jpg", "261115_E2_Dichterlos_1x1_4.jpg"],
  );
  assert.equal(c.clean("A/B: C?"), "A-B-_C-");
  assert.throws(() => c.names({ start: 1.5 }, []));
});
test("concert date always overrides image date", () => {
  assert.equal(c.filenameDate("260831_A1_Probe.jpg"), "31.08.26");
  assert.equal(c.weekday("31.08.26"), "Montag");
  assert.equal(c.filenameDate("259931_broken.jpg"), "");
  assert.deepEqual(
    c.names({ date: "15.11.26", code: "E2", title: "Dichterlos", start: 3 }, [
      { w: 1080, h: 1920, exportDate: "31.08.26" },
      { w: 1080, h: 1080 },
    ]),
    ["261115_E2_Dichterlos_9x16_3.jpg", "261115_E2_Dichterlos_1x1_4.jpg"],
  );
});

test("date is optional; invalid entered dates still fail and never use the image date", () => {
  assert.deepEqual(
    c.names({ date: "", code: "E2", title: "Test", start: 1 }, [
      { w: 1080, h: 1080, exportDate: "15.11.26" },
    ]),
    ["E2_Test_1x1_1.jpg"],
  );
  assert.throws(() =>
    c.names({ date: "31.02.26", code: "E2", title: "Test", start: 1 }, [
      { w: 1080, h: 1080 },
    ]),
  );
});
test("heading dates are explicit and calendar-valid", () => {
  for (const value of ["DO 19. NOV 2026", "D0 19. NOV 2026", "19.11.2026"])
    assert.equal(c.headingDate(value), "19.11.26");
  assert.equal(c.headingDate("29. FEB 2024"), "29.02.24");
  for (const value of [
    "Familienkonzert",
    "31. NOV 2026",
    "29. FEB 2025",
    "19. NOV 2026 und 20. NOV 2026",
    "Musik am 19. NOV 2026",
  ])
    assert.equal(c.headingDate(value), "");
});
test("coverage checks all corners in rotated image coordinates", () => {
  const im = { width: 100, height: 100 },
    b = { w: 100, h: 100, image: { x: 50, y: 50, scale: 1, angle: 0 } };
  assert(c.imageCovers(b, im));
  b.image.x = 51;
  assert(!c.imageCovers(b, im));
  b.image.x = 50;
  b.image.angle = 45;
  assert(!c.imageCovers(b, im));
  b.image.scale = Math.SQRT2;
  assert(c.imageCovers(b, im));
  b.image.scale = 0.9;
  assert(!c.imageCovers(b, im));
});

test("project filename uses the export date code and title without a format suffix", () => {
  assert.equal(
    c.projectName({ date: "19.11.26", code: "E2", title: "Dichterlos" }),
    "261119_E2_Dichterlos",
  );
  assert.equal(
    c.projectName({ date: "", code: "E2", title: "Dichterlos" }),
    "E2_Dichterlos",
  );
});

test("export dates accept compact, local, ISO and written Swiss dates without changing filename order", () => {
  for (const value of [
    "151126",
    "15112026",
    "20261115",
    "15.11.26",
    "15.11.2026",
    "15/11/2026",
    "15-11-26",
    "2026-11-15",
    "15. NOV 2026",
    "Sonntag, 15. November 2026",
    " 15. 11. 2026 ",
  ]) {
    assert.equal(c.dateName(value), "261115", value);
    assert.equal(c.weekday(value), "Sonntag", value);
    assert.equal(
      c.projectName({ date: value, code: "E2", title: "Musik" }),
      "261115_E2_Musik",
    );
    assert.deepEqual(
      c.names({ date: value, code: "E2", title: "Musik", start: 1 }, [
        { w: 1080, h: 1350 },
      ]),
      ["261115_E2_Musik_4x5_1.jpg"],
    );
  }
  assert.equal(c.dateName("1.1.26"), "260101");
  assert.equal(c.dateName("29. Februar 2024"), "240229");
  assert.equal(c.dateName("1. Mrz 2026"), "260301");
  assert.equal(c.dateName("1. Sept. 2026"), "260901");
  assert.equal(
    c.filenameDate("260831_A1_Probe.jpg"),
    "31.08.26",
    "image filenames retain YYMMDD interpretation",
  );
});
test("date parsing never rolls invalid dates or guesses US order, two-digit years mean 2000–2099", () => {
  for (const value of [
    "310426",
    "290225",
    "31.04.2026",
    "2026-02-29",
    "2026-00-15",
    "2026-11-00",
    "15/11.26",
    "11/15/2026",
    "15.11.1999",
    "15.11.2100",
    "202611150",
    "Musik am 15. November 2026",
    "15. NOV 2026 und 16. NOV 2026",
    "",
  ]) {
    assert.throws(() => c.dateName(value), undefined, value);
    assert.equal(c.weekday(value), "", value);
  }
  assert.equal(c.dateName("010100"), "000101");
  assert.equal(c.dateName("311299"), "991231");
  assert.throws(() => c.names({ date: "310426", start: 1 }, []));
  assert.equal(
    c.headingDate("151126"),
    "",
    "compact numbers in headings are not silently interpreted as dates",
  );
});
test("heading suggestions follow automatic dates but preserve manual and legacy dates, including an intentionally blank date", () => {
  const meta = { date: "" };
  assert(c.syncHeadingDate(meta, "DO 19. NOV 2026"));
  assert.deepEqual(meta, { date: "19.11.26", dateSource: "heading" });
  assert(!c.syncHeadingDate(meta, "DO 19. NOV 2026"));
  assert(c.syncHeadingDate(meta, "20. NOV 2026"));
  meta.date = "151126";
  meta.dateSource = "manual";
  assert(!c.syncHeadingDate(meta, "21. NOV 2026"));
  assert.equal(meta.date, "151126");
  meta.date = "";
  assert(!c.syncHeadingDate(meta, "21. NOV 2026"));
  assert.equal(meta.date, "");
  const legacy = { date: "19.11.26" };
  assert(!c.syncHeadingDate(legacy, "21. NOV 2026"));
  assert.deepEqual(legacy, { date: "19.11.26" });
  assert(!c.syncHeadingDate({ date: "" }, "Familienkonzert"));
});
