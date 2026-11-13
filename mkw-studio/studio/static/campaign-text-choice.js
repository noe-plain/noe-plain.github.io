"use strict";
const MKWCampaignTextChoice = (() => {
  let closeCurrent = null;
  function open(rect, choices, carousel) {
    closeCurrent?.();
    const project = p,
      host = $("#carouselEditingOverlay"),
      panel = document.createElement("section");
    panel.className = "campaign-text-choice";
    panel.onpointerdown = (event) => event.stopPropagation();
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Text für dieses Textfeld wählen");
    Object.assign(panel.style, {
      left: rect.x * carouselZoom + "px",
      top: rect.y * carouselZoom + "px",
      width: Math.max(224, rect.w * carouselZoom) + "px",
      height: Math.max(80, Math.min(240, rect.h * carouselZoom)) + "px",
    });
    panel.innerHTML = `<button type="button" data-new>Neuen Text schreiben</button><div class="campaign-adopt-list" role="group" aria-label="Vorhandenen Text übernehmen">${choices.map((o) => `<button type="button" data-adopt="${esc(o.id)}" title="Text und Formatierung übernehmen"><small>Übernehmen</small><span>${esc(o.text.slice(0, 120))}</span></button>`).join("")}</div><button type="button" class="icon-button campaign-text-cancel" data-cancel aria-label="Textfeld abbrechen" title="Abbrechen · Escape">${studioIcon("close")}</button>`;
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        document.removeEventListener("keydown", key, true);
        document.removeEventListener("pointerdown", outside, true);
        observer.disconnect();
        panel.remove();
        closeCurrent = null;
        $("#carouselViewport")?.focus({ preventScroll: true });
        resolve(project === p ? value : null);
      };
      const key = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(null);
        }
      };
      const outside = (event) => {
        if (!panel.contains(event.target)) finish(null);
      };
      const observer = new MutationObserver(() => {
        if (!panel.isConnected || p !== project) finish(null);
      });
      closeCurrent = () => finish(null);
      panel.querySelector("[data-new]").onclick = () => finish({});
      panel.querySelector("[data-cancel]").onclick = () => finish(null);
      for (const button of panel.querySelectorAll("[data-adopt]"))
        button.onclick = () => {
          const source = carousel.objects.find(
            (o) => o.id === button.dataset.adopt,
          );
          if (!source) return finish(null);
          const result = clone(source);
          for (const key of [
            "id",
            "pageId",
            "folderId",
            "x",
            "y",
            "w",
            "h",
            "campaignRole",
            "campaignLocal",
          ])
            delete result[key];
          finish(result);
        };
      host.append(panel);
      observer.observe(document.body, { childList: true, subtree: true });
      document.addEventListener("keydown", key, true);
      document.addEventListener("pointerdown", outside, true);
      panel.querySelector("[data-new]").focus({ preventScroll: true });
    });
  }
  return Object.freeze({ open });
})();
