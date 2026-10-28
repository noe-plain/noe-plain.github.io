"use strict";
const MKWFormats = (() => {
  const defaults = () =>
    [
      { w: 1080, h: 1920, top: 200, bottom: 500 },
      { w: 1080, h: 1080, top: 100, bottom: 200 },
      { w: 1080, h: 1350, top: 100, bottom: 200 },
      { w: 1080, h: 1440, top: 100, bottom: 200 },
    ].map((f) => ({ ...f, left: 100, right: 100 }));
  function validate(f) {
    return (
      f &&
      ["w", "h", "top", "bottom"].every((k) => Number.isInteger(f[k])) &&
      f.w >= 240 &&
      f.h >= 240 &&
      f.w <= 10000 &&
      f.h <= 10000 &&
      f.w * f.h <= 40000000 &&
      f.top >= 0 &&
      f.bottom >= 0 &&
      f.top + f.bottom < f.h &&
      ["left", "right"].every(
        (key) =>
          f[key] === undefined || (Number.isInteger(f[key]) && f[key] >= 0),
      ) &&
      (f.left ?? (100 * f.w) / 1080) + (f.right ?? (100 * f.w) / 1080) < f.w
    );
  }
  function feedback(f) {
    if (
      !["w", "h", "top", "bottom", "left", "right"].every(
        (key) => f[key] === undefined || Number.isInteger(f[key]),
      )
    )
      return "Bitte ganze Zahlen eingeben.";
    if (f.w < 240 || f.h < 240 || f.w > 10000 || f.h > 10000)
      return "Breite und Höhe müssen zwischen 240 und 10000 px liegen.";
    if (f.w * f.h > 40000000)
      return "Die Arbeitsfläche darf höchstens 40 Millionen Pixel haben. Bitte Breite oder Höhe verkleinern.";
    if (["top", "bottom", "left", "right"].some((key) => f[key] < 0))
      return "Schutzzonen dürfen nicht negativ sein.";
    if (f.top + f.bottom >= f.h)
      return "Oben und unten müssen zusammen kleiner als die Höhe sein.";
    if ((f.left ?? (100 * f.w) / 1080) + (f.right ?? (100 * f.w) / 1080) >= f.w)
      return "Links und rechts müssen zusammen kleiner als die Breite sein.";
    return "";
  }
  const legacy = () => [
    { w: 1080, h: 1080, top: 100, bottom: 200 },
    { w: 1080, h: 1920, top: 200, bottom: 500 },
  ];
  const safe = (f) => ({
    top: f.top,
    bottom: f.bottom,
    ...(f.left !== undefined ? { left: f.left } : {}),
    ...(f.right !== undefined ? { right: f.right } : {}),
  });
  const editor = (f, input) =>
    `<div class="safezone-editor post-safezone-editor"><div class="safe-preview"><div class="safe-preview-inner"><span>Safezone</span></div></div>${[
      ["top", "Oben"],
      ["bottom", "Unten"],
      ["left", "Links"],
      ["right", "Rechts"],
    ]
      .map(
        ([key, label]) =>
          `<div class="safe-input safe-${key}">${input(f, key, label)}</div>`,
      )
      .join("")}</div>`;
  function preview(box, f) {
    box.style.aspectRatio = `${Math.max(1, f.w)}/${Math.max(1, f.h)}`;
    box.style.width = `min(100%, ${(Math.max(1, f.w) / Math.max(1, f.h)) * 160}px)`;
    for (const key of ["top", "bottom", "left", "right"]) {
      const span = key === "top" || key === "bottom" ? f.h : f.w;
      const value = f[key] ?? (100 * f.w) / 1080;
      box.style.setProperty(
        "--" + key,
        Math.min(100, Math.max(0, (value / Math.max(1, span)) * 100)) + "%",
      );
    }
  }
  return { defaults, validate, feedback, legacy, safe, editor, preview };
})();
function openProjectSetup() {
  MKWProjectSetup.open();
}
