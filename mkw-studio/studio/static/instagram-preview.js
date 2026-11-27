"use strict";
/* Reference UI only. Neither persisted nor drawn into an export canvas. */
const MKWInstagramPreview = (() => {
  let enabled = false,
    signature = "";
  function profile(a) {
    if (Math.abs(a.w / a.h - 9 / 16) < 0.002) return "reel";
    if (Math.abs(a.w / a.h - 1) < 0.002) return "feed";
    return null;
  }
  function render() {
    const artwork = $("#carouselArtwork");
    if (!artwork || !p.carousel) return;
    let button = $("#instagramPreview"),
      overlay = $("#instagramPreviewOverlay");
    if (!button) {
      button = document.createElement("button");
      button.id = "instagramPreview";
      button.className = "icon-button";
      button.type = "button";
      button.setAttribute("aria-label", "Instagram-Schutzzone");
      button.setAttribute("aria-keyshortcuts", "Shift+I");
      button.title = "Instagram-Schutzzone (Shift+I)";
      button.innerHTML = studioIcon("visible");
      button.onclick = toggle;
      $("#footerGuides").after(button);
    }
    button.setAttribute("aria-pressed", String(enabled));
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "instagramPreviewOverlay";
      overlay.setAttribute("aria-hidden", "true");
      artwork.append(overlay);
      signature = "";
    }
    overlay.hidden = !enabled;
    if (!enabled) return;
    const a = MKWCarouselPolicy.frame(p.carousel, carouselUI.slide ?? 0),
      type = profile(a),
      s = carouselZoom;
    const key = JSON.stringify([a, s, type]);
    if (key === signature) return;
    signature = key;
    overlay.replaceChildren();
    if (!type) return;
    const layer = document.createElement("div");
    layer.className = "instagram-reference " + type;
    Object.assign(layer.style, {
      left: a.x * s + "px",
      top: a.y * s + "px",
      width: "1080px",
      height: (type === "reel" ? 1920 : 1080) + "px",
      transform: `scale(${(a.w * s) / 1080})`,
    });
    layer.innerHTML =
      type === "reel"
        ? `<div class="instagram-ad-zone"></div><div class="instagram-reel-top">Reels <span>◎</span></div><div class="instagram-reel-actions">♡<br>◯<br>➤<br>•••</div><div class="instagram-reel-caption"><strong>◎ musikkollegium</strong><p>Gesponsert</p><p>Konzert entdecken …</p><div class="instagram-cta">Mehr dazu <span>›</span></div><p>♪ Original-Audio</p></div><span class="instagram-reference-label">9:16 · Werbung</span>`
        : `<div class="instagram-feed-top">◎ musikkollegium <span>•••</span></div><div class="instagram-feed-bottom"><div class="instagram-cta">Mehr dazu <span>›</span></div><p>♡　◯　➤ <span>♧</span></p><strong>musikkollegium</strong> Konzert entdecken …</div><span class="instagram-reference-label">1:1 · Feed mit Werbung</span>`;
    overlay.append(layer);
  }
  function toggle() {
    enabled = !enabled;
    signature = "";
    render();
    if (
      enabled &&
      !profile(MKWCarouselPolicy.frame(p.carousel, carouselUI.slide ?? 0))
    )
      status(
        "Instagram-Vorschau für 9:16 und 1:1. Wähle ein passendes Format.",
      );
  }
  window.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      !carouselActive() ||
      busy ||
      !event.shiftKey ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.key.toLowerCase() !== "i" ||
      event.target.isContentEditable ||
      event.target.closest("input,textarea,select") ||
      document.querySelector("dialog[open],[popover]:popover-open")
    )
      return;
    event.preventDefault();
    toggle();
  });
  return Object.freeze({ render, profile });
})();
