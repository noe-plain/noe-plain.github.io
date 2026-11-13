"use strict";
const MKWTextResize = (() => {
  const active = (objects) =>
    carouselUI.textResizeMode === "scale" &&
    objects.length &&
    objects.every((o) => o.type === "text");
  function markup() {
    return `<div class="text-resize-controls"><h5>Grösse ändern</h5><div class="text-resize-modes" role="group" aria-label="Text oder Rahmen skalieren"><button type="button" data-text-resize="frame" aria-pressed="${carouselUI.textResizeMode !== "scale"}">Rahmen ändern</button><button type="button" data-text-resize="scale" aria-pressed="${carouselUI.textResizeMode === "scale"}">Text skalieren</button></div><p class="type-hint" data-text-resize-hint></p><label>Text und Rahmen skalieren<span class="text-scale-input"><input data-text-scale-percent type="number" min="1" max="10000" step="any" value="100" aria-label="Text und Rahmen skalieren in Prozent"><span>%</span><button type="button" data-text-scale-apply>Anwenden</button></span></label></div>`;
  }
  function bind(panel, o) {
    const host = panel.querySelector(".text-resize-controls");
    if (!host) return;
    const sync = () => {
      for (const button of host.querySelectorAll("[data-text-resize]")) {
        button.setAttribute(
          "aria-pressed",
          String(
            button.dataset.textResize ===
              (carouselUI.textResizeMode || "frame"),
          ),
        );
        button.disabled = carouselObjectLocked(o);
      }
      host.querySelector("[data-text-resize-hint]").textContent =
        carouselUI.textResizeMode === "scale"
          ? "Eckgriffe skalieren Schrift und Abstände proportional. Seitengriffe ändern den Rahmen."
          : "Griffe ändern nur den Rahmen. Umschalt + Ziehen skaliert auch den Text.";
    };
    for (const button of host.querySelectorAll("[data-text-resize]"))
      button.onclick = () => {
        carouselUI.textResizeMode = button.dataset.textResize;
        sync();
      };
    host.querySelector("[data-text-scale-percent]").disabled =
      carouselObjectLocked(o);
    host.querySelector("[data-text-scale-apply]").disabled =
      carouselObjectLocked(o);
    host.querySelector("[data-text-scale-apply]").onclick = () => {
      if (carouselObjectLocked(o)) return;
      const input = host.querySelector("[data-text-scale-percent]");
      if (!MKWFields.validate(input, true)) return;
      const factor = +input.value / 100;
      if (factor === 1) return;
      try {
        const next = MKWTextEdit.scale(o, factor, true);
        checkpoint();
        Object.assign(o, next);
        changed(false);
        carouselPanel();
        carouselRefresh();
        status(
          "Text und Rahmen auf " +
            Math.round(factor * 10000) / 100 +
            " % skaliert.",
        );
      } catch (error) {
        MKWFields.error(input, error.message);
      }
    };
    sync();
  }
  return Object.freeze({ active, markup, bind });
})();
