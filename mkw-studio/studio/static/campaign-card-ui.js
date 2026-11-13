"use strict";
const MKWCampaignCardUI = (() => {
  let active = null;
  function release() {
    active?.cleanup();
    active = null;
  }
  function markup({
    row,
    index,
    im,
    frame,
    height,
    master,
    sponsors,
    open,
    count,
    copyright,
  }) {
    const compact = (height + MKWCampaignDocument.rowGap) * carouselZoom < 460,
      tiny = (height + MKWCampaignDocument.rowGap) * carouselZoom < 88;
    const quick = `<div class="campaign-card-quick"><div class="campaign-primary-actions"><button data-campaign-action="replace">${studioIcon("image")}<span>Bild ersetzen</span></button><button data-campaign-action="format">${studioIcon("plus")}<span>Format hinzufügen</span></button></div><label class="campaign-copyright-field">Bildnachweis / Copyright<input data-campaign-copyright placeholder="Bildbeschreibung © Name" value="${esc(copyright)}"></label></div>`;
    return `<aside class="campaign-card image-info-card ${compact ? "is-compact" : ""} ${tiny ? "is-tiny" : ""}" data-campaign-row="${esc(im.id)}" aria-label="Bild ${index + 1}: ${esc(im.name)}" style="left:${frame.x * carouselZoom - 258}px;top:${frame.y * carouselZoom}px;width:230px"><button type="button" class="campaign-hero" data-campaign-action="open" aria-label="Bildreihe ${index + 1} anzeigen: ${esc(im.name)}" title="Bildreihe anzeigen"><canvas class="campaign-thumb" width="1" height="1" aria-hidden="true"></canvas></button><div class="campaign-card-heading"><div><small>Bild ${index + 1} von ${count}${master ? '<span class="campaign-inline-master"> · Vorlage</span>' : ""}</small><strong title="${esc(im.name)}">${esc(im.name)}</strong></div></div>${master ? '<span class="campaign-master-label">Vorlage für gleiche Formate</span>' : ""}${compact ? "" : quick}<details ${open ? "open" : ""}><summary aria-label="Bild ${index + 1}: Optionen und Aktionen" title="Bildoptionen">${studioIcon("more")}</summary><section class="campaign-card-popover" popover="manual" role="dialog" aria-label="Bild ${index + 1}: Optionen"><div class="campaign-card-popover-heading"><h2>Bild ${index + 1} · Optionen</h2><button type="button" class="icon-button" data-card-close aria-label="Bildoptionen schliessen">${studioIcon("close")}</button></div><p class="campaign-card-filename">${esc(im.name)}</p>${compact ? quick : ""}<h3>Gestaltung</h3><label class="post-option-row"><input type="checkbox" data-campaign-angle ${row.angle ? "checked" : ""}><span>Bildwinkel</span><select aria-label="Winkelrichtung" data-campaign-direction>${MKWAnglePolicy.directions.map((d) => `<option value="${d}" ${row.direction === d ? "selected" : ""}>${{ up: "Oben", left: "Links", down: "Unten" }[d]}</option>`).join("")}</select></label><label class="post-option-row"><input type="checkbox" data-campaign-family ${row.family ? "checked" : ""}><span>Familienkonzert</span></label>${row.family ? `<label>Hintergrundfarbe<input type="color" data-colour-draft data-campaign-background value="${esc(row.background || "#f4efdf")}"></label>` : ""}<label class="post-option-row"><input type="checkbox" data-campaign-sponsors ${sponsors?.enabled ? "checked" : ""}><span>Sponsorenleiste</span></label><button data-campaign-action="sponsors">Sponsoren auswählen</button><h3>Bildreihe</h3><div class="campaign-card-actions" role="group" aria-label="Reihenfolge ändern"><button data-campaign-action="up" ${index === 0 ? "disabled" : ""}>${studioIcon("up")}<span>Nach oben</span></button><button data-campaign-action="down" ${index === count - 1 ? "disabled" : ""}>${studioIcon("down")}<span>Nach unten</span></button></div><button class="campaign-card-remove" data-campaign-action="remove">${studioIcon("trash")}<span>Bildreihe entfernen</span></button></section></details></aside>`;
  }
  function bind(card, onToggle) {
    const details = card.querySelector("details"),
      panel = card.querySelector(".campaign-card-popover"),
      summary = details.querySelector("summary");
    let clean = null;
    const close = () => {
      onToggle(false);
      details.open = false;
      if (panel.matches(":popover-open")) panel.hidePopover();
    };
    summary.addEventListener("click", () => onToggle(!details.open));
    panel.querySelector("[data-card-close]").onclick = () => {
      close();
      summary.focus({ preventScroll: true });
    };
    details.ontoggle = () => {
      onToggle(details.open);
      clean?.();
      clean = null;
      if (!details.open) return;
      if (active && active.details !== details) active.close();
      release();
      let frame = 0;
      const viewport = document.querySelector("#carouselViewport"),
        position = () => {
          frame = 0;
          if (!summary.isConnected) return release();
          const r = summary.getBoundingClientRect(),
            b = panel.getBoundingClientRect();
          panel.style.left =
            Math.max(8, Math.min(innerWidth - b.width - 8, r.right + 8)) + "px";
          panel.style.top =
            Math.max(8, Math.min(innerHeight - b.height - 8, r.top)) + "px";
        },
        resize = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(position);
        },
        outside = (e) => {
          if (!panel.contains(e.target) && !summary.contains(e.target)) close();
        },
        key = (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
            summary.focus({ preventScroll: true });
          }
        };
      panel.showPopover();
      position();
      const observer = new ResizeObserver(resize);
      observer.observe(viewport);
      window.addEventListener("resize", resize);
      viewport.addEventListener("scroll", resize, { passive: true });
      document.addEventListener("pointerdown", outside, true);
      document.addEventListener("keydown", key, true);
      clean = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener("resize", resize);
        viewport.removeEventListener("scroll", resize);
        document.removeEventListener("pointerdown", outside, true);
        document.removeEventListener("keydown", key, true);
        if (panel.matches(":popover-open")) panel.hidePopover();
      };
      active = { details, cleanup: clean, close };
    };
  }
  return Object.freeze({ markup, bind, release });
})();
