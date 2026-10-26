"use strict";
const MKWDesignerGrid = (() => {
  let settings = MKWSetupModel.defaults.designerGrid;
  function configure(value) {
    settings = { ...value };
  }
  function lines(c, slide = 0) {
    return MKWCarouselPolicy.grid(c, slide, settings);
  }
  function style(c) {
    const r = MKWCarouselPolicy.safeRect(c),
      grid = lines(c);
    if (r.w <= 0 || r.h <= 0) return "";
    return `--grid-cell-x:${(grid.cellWidth / r.w) * 100}%;--grid-cell-y:${(grid.cellHeight / r.h) * 100}%;--grid-gap-x:${(grid.gapX / r.w) * 100}%;--grid-gap-y:${(grid.gapY / r.h) * 100}%`;
  }
  function preview(box, c) {
    box?.classList.add("designer-grid");
    if (box) box.style.cssText = style(c);
  }
  function settingsPanel(panel) {
    const section = document.createElement("section");
    section.className = "settings-designer-grid";
    section.innerHTML = `<h3>Designer-Raster</h3><div class="settings-grid-fields">${[
      ["columns", "Spalten", 1, 24],
      ["rows", "Reihen", 1, 24],
      ["gap", "Stege (px)", 0, 500],
    ]
      .map(
        ([key, label, min, max]) =>
          `<label>${label}<input data-designer-grid="${key}" aria-label="Designer-Raster ${label}" type="number" min="${min}" max="${max}" step="1" value="${settings[key]}"></label>`,
      )
      .join(
        "",
      )}</div><div class="settings-grid-preview"><div class="designer-grid" role="img" aria-label="Rastervorschau"></div></div>`;
    panel.append(section);
    const draw = () => {
      preview(section.querySelector(".designer-grid"), {
        w: 1080,
        h: 1350,
        top: 100,
        bottom: 200,
        left: 100,
        right: 100,
      });
    };
    draw();
    for (const input of section.querySelectorAll("input"))
      input.onchange = () => {
        const value = Number(input.value),
          key = input.dataset.designerGrid;
        if (!MKWFields.validate(input, true)) return;
        studioPreferences.designerGrid = { ...settings, [key]: value };
        studioApplyPreferences();
        draw();
      };
  }
  function sync(value) {
    const changed = ["columns", "rows", "gap"].some(
      (key) => settings[key] !== value[key],
    );
    configure(value);
    for (const input of document.querySelectorAll("[data-designer-grid]"))
      input.value = settings[input.dataset.designerGrid];
    preview(document.querySelector(".settings-grid-preview .designer-grid"), {
      w: 1080,
      h: 1350,
      top: 100,
      bottom: 200,
      left: 100,
      right: 100,
    });
    if (changed) $("#cw")?.dispatchEvent(new Event("input"));
  }
  return { lines, style, preview, sync, settingsPanel };
})();
