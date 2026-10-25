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
let formatDraft = [],
  setupWasBusy = false,
  setupCommitted = false;
function openProjectSetup() {
  setupWasBusy = busy;
  setupCommitted = false;
  busy = true;
  formatDraft = MKWFormats.defaults().map((f, i) => ({ ...f, enabled: i < 2 }));
  $("#setupName").value = "";
  $("#setupCode").value = "";
  $("#setupError").textContent = "";
  MKWFields.reset($("#projectSetup"));
  renderFormatSetup();
  $("#projectSetup").showModal();
}
function renderFormatSetup() {
  const input = (f, key, label) =>
    `<label>${label} (px)<input type="number" data-format-key="${key}" min="${key === "w" || key === "h" ? 240 : 0}" max="10000" step="1" value="${f[key] ?? Math.round((100 * f.w) / 1080)}"></label>`;
  $("#formatChoices").innerHTML = formatDraft
    .map(
      (f, i) =>
        `<fieldset class="format-choice ${f.enabled ? "is-enabled" : ""}" data-format="${i}"><legend><label><input type="checkbox" data-format-enabled aria-expanded="${f.enabled}" aria-controls="format-safezone-${i}" ${f.enabled ? "checked" : ""}> <span data-format-label>${MKW.ratio(f.w, f.h).replace("x", ":")}</span></label></legend><div class="format-row"><div class="format-dimensions"><div class="format-reveal" data-format-reveal><div><h4>Arbeitsfläche</h4></div></div><div class="format-fields">${input(f, "w", "Breite")}${input(f, "h", "Höhe")}</div><div class="format-reveal" data-format-reveal><div><small>Schutzzone für Text und Logo</small></div></div></div><div class="format-reveal format-safezone" id="format-safezone-${i}" data-format-reveal><div>${MKWFormats.editor(f, input)}</div></div></div><p class="format-feedback" role="status"></p></fieldset>`,
    )
    .join("");
  $("#formatChoices")
    .querySelectorAll("[data-format]")
    .forEach((row) => {
      const f = formatDraft[+row.dataset.format],
        checkbox = row.querySelector("[data-format-enabled]");
      const expand = () => {
        row.classList.toggle("is-enabled", f.enabled);
        checkbox.setAttribute("aria-expanded", String(f.enabled));
        row.querySelectorAll("[data-format-reveal]").forEach((part) => {
          part.inert = !f.enabled;
          part.setAttribute("aria-hidden", String(!f.enabled));
        });
      };
      checkbox.onchange = (e) => {
        f.enabled = e.target.checked;
        expand();
      };
      expand();
      const preview = () => {
        const box = row.querySelector(".safe-preview");
        MKWFormats.preview(box, f);
        const text = MKWFormats.feedback(f);
        row.classList.toggle("invalid", !!text);
        MKWFields.group(
          row.querySelectorAll("[data-format-key]"),
          text,
          row.querySelector(".format-feedback"),
        );
      };
      preview();
      row.querySelectorAll("[data-format-key]").forEach(
        (input) =>
          (input.oninput = () => {
            f[input.dataset.formatKey] =
              input.value === "" ? NaN : Number(input.value);
            row.querySelector("[data-format-label]").textContent =
              f.w > 0 && f.h > 0
                ? MKW.ratio(f.w, f.h).replace("x", ":")
                : "Eigenes Format";
            preview();
          }),
      );
    });
}
$("#addFormat").onclick = () => {
  formatDraft.push({
    w: 1080,
    h: 1440,
    top: 100,
    bottom: 200,
    left: 100,
    right: 100,
    enabled: true,
  });
  renderFormatSetup();
  $("#formatChoices").lastElementChild.scrollIntoView({ block: "nearest" });
};
$("#cancelSetup").onclick = () => $("#projectSetup").close();
$("#projectSetup").addEventListener("close", () => {
  if (!setupCommitted) busy = setupWasBusy;
});
$("#createProject").onclick = async () => {
  if (!MKWFields.validate($("#setupName"), true)) {
    $("#setupError").textContent = "Gib deinem Projekt bitte einen Namen.";
    $("#setupName").focus();
    return;
  }
  const formats = formatDraft
    .filter((f) => f.enabled)
    .map(({ w, h, top, bottom, left, right }) => ({
      w,
      h,
      top,
      bottom,
      left,
      right,
    }));
  if (!formats.length || formats.some((f) => !MKWFormats.validate(f))) {
    $("#setupError").textContent = !formats.length
      ? "Wähle mindestens ein Format aus."
      : "Bitte die markierten Formate korrigieren.";
    $("#formatChoices [data-field-error='true']")?.focus();
    return;
  }
  if (new Set(formats.map((f) => `${f.w}x${f.h}`)).size !== formats.length) {
    $("#setupError").textContent =
      "Jede Bildgrösse bitte nur einmal auswählen.";
    return;
  }
  if (savedRevision < revision) await autosave();
  if (editingText) editingText.el.blur();
  const fonts = p.fonts;
  p = fresh();
  p.fonts = fonts;
  p.formats = formats;
  p.meta.title = $("#setupName").value.trim();
  p.meta.code = $("#setupCode").value.trim();
  selected = null;
  history = [];
  future = [];
  revision = savedRevision = 0;
  busy = false;
  setupCommitted = true;
  $("#projectSetup").close();
  $("#startDialog").close();
  render();
  await autosave({ writeFile: false });
  status("Projekt bereit · Bilder hinzufügen.");
};
