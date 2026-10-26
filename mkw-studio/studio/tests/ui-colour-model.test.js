const { test } = require("node:test");
const assert = require("node:assert/strict");
const model = require("../static/ui-colour-model.js");
const setup = require("../static/setup-model.js");
test("UI palettes preserve legibility for extreme and arbitrary brand colours in both themes", () => {
  const seeds = [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#00ffff",
    "#ff00ff",
    "#315bcc",
  ];
  for (let n = 0; n < 512; n++)
    seeds.push(
      "#" + ((n * 32771 + 5791) % 0xffffff).toString(16).padStart(6, "0"),
    );
  for (const theme of ["light", "dark"])
    for (const seed of seeds) {
      const p = model.palette(seed, theme);
      for (const v of Object.values(p)) assert.match(v, /^#[0-9a-f]{6}$/);
      for (const [foreground, background] of [
        ["primary", "on-primary"],
        ["primary", "surface"],
        ["on-primary-container", "primary-container"],
        ["on-secondary-container", "secondary-container"],
        ["on-surface", "surface"],
        ["on-surface-variant", "surface-container-low"],
        ["error", "error-container"],
        ["warning", "warning-container"],
      ])
        assert(
          model.contrast(p[foreground], p[background]) >= 4.5,
          `${seed} ${theme} ${foreground}/${background}`,
        );
      assert(model.contrast(p.outline, p.surface) >= 3);
      assert(Object.isFrozen(p));
    }
});
test("main colour is a validated portable tool preference with compatible old-setup defaults", () => {
  assert.equal(setup.preferences({}).primaryColour, model.defaultColour);
  assert.equal(
    setup.preferences({ primaryColour: "#C2247A" }, true).primaryColour,
    "#C2247A",
  );
  for (const bad of ["blue", "#fff", "#ffffff00", "url(x)", null, 42]) {
    assert.equal(
      setup.preferences({ primaryColour: bad }).primaryColour,
      model.defaultColour,
    );
    assert.throws(() => setup.preferences({ primaryColour: bad }, true));
  }
  assert.deepEqual(
    model.palette("invalid"),
    model.palette(model.defaultColour),
  );
});

test("UI density is portable and invalid settings cannot inject presentation rules", () => {
  assert.equal(setup.preferences({}).density, "comfortable");
  assert.equal(
    setup.preferences({ density: "compact" }, true).density,
    "compact",
  );
  for (const density of [null, {}, "dense", "url(x)", 0]) {
    assert.equal(setup.preferences({ density }).density, "comfortable");
    assert.throws(() => setup.preferences({ density }, true));
  }
});

test("complementary UI keeps main and semantic colours while adding an accessible opposite secondary palette", () => {
  for (const theme of ["light", "dark"])
    for (let n = 0; n < 260; n++) {
      const seed = "#" + ((n * 65237) % 0xffffff).toString(16).padStart(6, "0");
      const normal = model.palette(seed, theme),
        complementary = model.palette(seed, theme, "complementary");
      for (const role of Object.keys(normal)) {
        if (["secondary-container", "on-secondary-container"].includes(role))
          continue;
        assert.equal(complementary[role], normal[role], role);
      }
      assert(
        model.contrast(
          complementary["on-secondary-container"],
          complementary["secondary-container"],
        ) >= 4.5,
      );
      assert.notEqual(
        complementary["secondary-container"],
        normal["secondary-container"],
      );
    }
  assert.equal(setup.preferences({}).colourMode, "normal");
  assert.equal(
    setup.preferences({ colourMode: "complementary" }, true).colourMode,
    "complementary",
  );
  for (const colourMode of [null, 42, "opposite", {}, "url(x)"]) {
    assert.equal(setup.preferences({ colourMode }).colourMode, "normal");
    assert.throws(() => setup.preferences({ colourMode }, true));
  }
});

test("harmonious and triadic UI palettes preserve document colours and usable paired roles", () => {
  for (const mode of ["analogous", "triadic"]) {
    assert.equal(
      setup.preferences({ colourMode: mode }, true).colourMode,
      mode,
    );
    for (const theme of ["light", "dark"])
      for (let i = 0; i < 264; i++) {
        const seed =
          i === 0
            ? "#000000"
            : i === 1
              ? "#ffffff"
              : "#" + ((i * 65497) % 0xffffff).toString(16).padStart(6, "0");
        const normal = model.palette(seed, theme),
          palette = model.palette(seed, theme, mode);
        for (const role of [
          "primary",
          "on-primary",
          "surface",
          "on-surface",
          "error",
          "warning",
        ])
          assert.equal(palette[role], normal[role]);
        for (const channel of ["secondary", "tertiary"])
          assert(
            model.contrast(
              palette["on-" + channel + "-container"],
              palette[channel + "-container"],
            ) >= 4.5,
          );
        assert.notEqual(
          palette["secondary-container"],
          normal["secondary-container"],
        );
        if (mode === "triadic")
          assert.notEqual(
            palette["tertiary-container"],
            palette["secondary-container"],
          );
      }
  }
});
