"use strict";
function studioApplyDensity() {
  const density = studioPreferences.density;
  document.documentElement.dataset.density = density;
  document.querySelectorAll("[data-ui-density]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.uiDensity === density),
    );
  });
}
function studioDensitySettings(section) {
  section.insertAdjacentHTML(
    "beforeend",
    `<fieldset class="settings-density"><legend>Bedienelemente</legend><div class="settings-density-options" role="group" aria-label="Grösse der Bedienelemente"><button type="button" data-ui-density="comfortable" aria-pressed="true">Komfortabel</button><button type="button" data-ui-density="compact" aria-pressed="false">Kompakt</button></div><p>Kompakt zeigt mehr Eigenschaften auf einmal.</p></fieldset>`,
  );
  section.querySelectorAll("[data-ui-density]").forEach((button) => {
    button.onclick = () => {
      studioPreferences.density = button.dataset.uiDensity;
      studioApplyDensity();
      studioPersistPreferences();
    };
  });
  studioApplyDensity();
}
/* Delegation adds feedback without replacing the editors' click/drag handlers. */
const MKWUIControls = (function () {
  const excluded =
      ".handle,.carousel-handle,.carousel-point-handle,.carousel-rotate-handle,.vector-node,.vector-control,.frame-point-choice,.picker-stop,.picker-mid,.paint-fill,.paint-stroke,.paint-wells button,.paint-actions button",
    reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    ripples = new WeakMap();
  function ripple(button, event) {
    if (
      button.disabled ||
      button.getAttribute("aria-disabled") === "true" ||
      button.matches(excluded) ||
      reduced.matches
    )
      return;
    ripples.get(button)?.cancel();
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const layer = document.createElement("mkw-state-ripple"),
      wave = document.createElement("mkw-state-wave"),
      size = Math.hypot(rect.width, rect.height) * 2,
      x =
        event.type === "pointerdown"
          ? event.clientX - rect.left
          : rect.width / 2,
      y =
        event.type === "pointerdown"
          ? event.clientY - rect.top
          : rect.height / 2;
    layer.setAttribute("aria-hidden", "true");
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
    layer.append(wave);
    button.append(layer);
    const animation = wave.animate(
      [
        { transform: "scale(0)", opacity: 0.14 },
        { transform: "scale(0.8)", opacity: 0.12, offset: 0.6 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { duration: 450, easing: "cubic-bezier(.31,.94,.34,1)" },
    );
    ripples.set(button, animation);
    const remove = () => {
      layer.remove();
      if (ripples.get(button) === animation) ripples.delete(button);
    };
    animation.finished.then(remove, remove);
  }
  let tooltip, target, showTimer, hideTimer, savedTitle;
  function hideTooltip() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (target) {
      const ids = (target.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== "studioTooltip");
      if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
      else target.removeAttribute("aria-describedby");
      if (savedTitle !== null && !target.hasAttribute("title"))
        target.setAttribute("title", savedTitle);
    }
    if (tooltip) {
      tooltip.hidden = true;
    }
    target = null;
    savedTitle = null;
  }
  function scheduleTooltip(button, immediate) {
    if (button === target) {
      clearTimeout(hideTimer);
      return;
    }
    hideTooltip();
    if (
      !button ||
      button.disabled ||
      button.matches(excluded) ||
      button.innerText.trim()
    )
      return;
    const label =
      button.getAttribute("aria-label") || button.getAttribute("title");
    if (!label) return;
    target = button;
    savedTitle = button.getAttribute("title");
    button.removeAttribute("title");
    showTimer = setTimeout(
      () => {
        if (!button.isConnected || !button.getClientRects().length) {
          hideTooltip();
          return;
        }
        if (!tooltip) {
          tooltip = document.createElement("div");
          tooltip.id = "studioTooltip";
          tooltip.setAttribute("role", "tooltip");
        }
        const host = button.closest("dialog,[popover]") || document.body;
        if (tooltip.parentElement !== host) host.append(tooltip);
        tooltip.textContent = label;
        tooltip.style.left = "0px";
        tooltip.style.top = "0px";
        tooltip.hidden = false;
        const rect = button.getBoundingClientRect(),
          box = tooltip.getBoundingClientRect();
        let top = button.closest("header")
          ? rect.bottom + 4
          : rect.top - box.height - 4;
        if (top < 8) top = rect.bottom + 4;
        top = Math.max(8, Math.min(innerHeight - box.height - 8, top));
        tooltip.style.left =
          Math.max(
            8,
            Math.min(
              innerWidth - box.width - 8,
              rect.left + (rect.width - box.width) / 2,
            ),
          ) + "px";
        tooltip.style.top = top + "px";
        const ids = (button.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean);
        button.setAttribute("aria-describedby", [...ids, tooltip.id].join(" "));
      },
      immediate ? 0 : 500,
    );
  }
  document.addEventListener(
    "pointerdown",
    (event) => {
      hideTooltip();
      const button = event.target.closest?.("button");
      if (button && event.button === 0) ripple(button, event);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      hideTooltip();
      const button = event.target.closest?.("button");
      if (button && !event.repeat && ["Enter", " "].includes(event.key))
        ripple(button, event);
    },
    true,
  );
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "touch")
      scheduleTooltip(event.target.closest?.("button,a.icon-button"), false);
  });
  document.addEventListener("pointerout", (event) => {
    if (target && !target.contains(event.relatedTarget)) {
      clearTimeout(showTimer);
      hideTimer = setTimeout(hideTooltip, 1500);
    }
  });
  document.addEventListener("focusin", (event) =>
    scheduleTooltip(event.target.closest?.("button,a.icon-button"), true),
  );
  document.addEventListener("focusout", hideTooltip);
  document.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
  document.addEventListener("mkw-ui-theme-change", hideTooltip);

  const rangeSelector = 'input[type="range"]:not(#paintAlphaSlider)';
  function syncRanges(root) {
    const ranges = root.matches?.(rangeSelector)
      ? [root]
      : root.querySelectorAll?.(rangeSelector) || [];
    for (const input of ranges) {
      const min = input.min === "" ? 0 : Number(input.min),
        max = input.max === "" ? 100 : Number(input.max),
        percent =
          max > min
            ? Math.max(
                0,
                Math.min(
                  100,
                  ((Number(input.value) - min) * 100) / (max - min),
                ),
              )
            : 0;
      if (input.style.getPropertyValue("--range-percent") !== percent + "%")
        input.style.setProperty("--range-percent", percent + "%");
    }
  }
  for (const name of ["input", "change", "focusin", "pointerover"])
    document.addEventListener(name, (event) => {
      if (event.target.matches?.(rangeSelector)) syncRanges(event.target);
    });
  document.addEventListener("click", (event) => {
    const root = event.target.closest?.(
      "dialog,#toolsSidebar,#carouselSidebar,[popover]",
    );
    if (root) queueMicrotask(() => syncRanges(root));
  });
  document.addEventListener(
    "toggle",
    (event) => syncRanges(event.target),
    true,
  );
  reduced.addEventListener("change", () => {
    if (reduced.matches)
      document.querySelectorAll("mkw-state-wave").forEach((wave) => {
        for (const animation of wave.getAnimations()) animation.cancel();
      });
  });
  // Observe fixed inspectors only, never artwork or per-frame path overlays.
  const onInserted = (records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node.nodeType === 1) syncRanges(node);
    },
    designerObserver = new MutationObserver(onInserted);
  function designer(root) {
    designerObserver.disconnect();
    if (!root) return;
    syncRanges(root);
    designerObserver.observe(root, { childList: true, subtree: true });
  }
  queueMicrotask(() => {
    const observer = new MutationObserver(onInserted);
    for (const root of document.querySelectorAll(
      "#toolsSidebar,#settingsDialog,#projectSetup,#exportDialog,#saveDialog",
    )) {
      syncRanges(root);
      observer.observe(root, { childList: true, subtree: true });
    }
  });
  for (const name of ["input", "change"])
    document.addEventListener(name, (event) => {
      if (!event.target.matches?.('input[type="number"],select')) return;
      const root = event.target.closest?.(
        "dialog,#toolsSidebar,#carouselSidebar,[popover]",
      );
      if (root) syncRanges(root);
    });
  return Object.freeze({ designer });
})();
