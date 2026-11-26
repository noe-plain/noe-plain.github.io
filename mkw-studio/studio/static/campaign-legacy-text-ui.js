"use strict";
const MKWCampaignLegacyTextUI = (() => {
  const expanded = new WeakMap();
  function mount(root) {
    root.parentElement.querySelector(".campaign-legacy-texts")?.remove();
    if (!p.campaign) return;
    const project = p,
      frame = carouselRow()?.page,
      keys = frame && MKWCampaignMigration.hiddenTexts(project, frame.id);
    if (!keys?.length) return;
    const board = project.boards.find((b) => b.campaignPage === frame.id),
      open = expanded.get(project) || new Set(),
      details = document.createElement("details"),
      full = project.carousel.objects.length >= 500;
    expanded.set(project, open);
    details.className = "campaign-legacy-texts";
    details.open = open.has(frame.id);
    details.innerHTML = `<summary>Ausgeblendete Texte (${keys.length})</summary><p>Aus der Altdatei für ${esc(frame.name)}. Nur diese Ausgabe wird ergänzt; vorhandene Ebenen bleiben unverändert.</p>${full ? '<p role="status">Die Kampagne erreicht 500 Ebenen. Entferne zuerst eine Ebene.</p>' : ""}<ul>${keys.map((key) => `<li><strong>${elementNames[key]}</strong><p class="campaign-legacy-preview">${esc(board.elements[key].text.slice(0, 160))}</p><button type="button" data-legacy-text="${key}" aria-label="${elementNames[key]} aus Altdatei als Textebene hinzufügen" ${full ? "disabled" : ""}>${studioIcon("plus")}<span>Als Textebene hinzufügen</span></button></li>`).join("")}</ul>`;
    details.ontoggle = () =>
      details.open ? open.add(frame.id) : open.delete(frame.id);
    for (const button of details.querySelectorAll("[data-legacy-text]")) {
      button.onclick = () => {
        if (
          p !== project ||
          busy ||
          !details.isConnected ||
          !project.carousel.artboards.includes(frame) ||
          !project.boards.includes(board) ||
          carouselRow()?.page.id !== frame.id
        )
          return;
        if (!carouselCanAddObjects(1)) return;
        try {
          const object = MKWCampaignMigration.recoverText(
            project,
            frame,
            button.dataset.legacyText,
          );
          if (!object) return;
          validateCarousel({
            ...project,
            carousel: {
              ...project.carousel,
              objects: [...project.carousel.objects, object],
            },
          });
          open.add(frame.id);
          checkpoint();
          project.carousel.objects.push(object);
          changed(false);
          carouselSelect([object.id]);
          const target = root.querySelector(
            `[data-layer="${CSS.escape(object.id)}"] .carousel-layer-name`,
          );
          target?.focus();
          status(
            `${elementNames[button.dataset.legacyText]} aus der Altdatei als eigene Textebene hinzugefügt. Nur diese Ausgabe wurde geändert.`,
          );
        } catch (error) {
          status(
            "Alttext nicht übernommen. Die gespeicherten Texte und deine Gestaltung bleiben erhalten: " +
              error.message,
            "error",
          );
        }
      };
    }
    root.before(details);
  }
  return Object.freeze({ mount });
})();
