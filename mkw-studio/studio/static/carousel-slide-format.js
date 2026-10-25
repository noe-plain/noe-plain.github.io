"use strict";
function carouselSlideFormatPanel(host) {
  const c = p.carousel,
    values = Object.fromEntries(
      MKWCarouselPolicy.formatKeys.map((key) => [key, c[key]]),
    ),
    section = document.createElement("section");
  section.className = "carousel-property-section carousel-slide-format";
  const input = (key, label, min = 0) =>
    `<label>${label} (px)<input data-slide-format="${key}" aria-label="Slide ${label}" type="number" min="${min}" max="4000" step="1" value="${values[key]}"></label>`;
  section.innerHTML = `<h4>Format für alle Slides</h4><div class="carousel-fields">${input("w", "Breite", 240)}${input("h", "Höhe", 240)}</div><h4>Schutzzone</h4>${MKWFormats.editor(values, (_, key, label) => input(key, label))}<p class="slide-format-note">Elementgrössen bleiben erhalten. Die Inhalte jeder Slide behalten ihren Abstand zum linken Slide-Rand.</p><p class="post-safezone-error" role="status"></p><button id="carouselApplyFormat" class="primary" disabled>Für alle Slides übernehmen</button>`;
  host.append(section);
  const preview = section.querySelector(".safe-preview"),
    apply = section.querySelector("#carouselApplyFormat"),
    error = section.querySelector(".post-safezone-error");
  const refresh = () => {
    MKWFormats.preview(preview, values);
    MKWDesignerGrid.preview(
      preview.querySelector(".safe-preview-inner"),
      values,
    );
    let plan;
    try {
      plan = MKWCarouselPolicy.formatPlan(p.carousel, values);
      error.textContent = "";
    } catch (e) {
      error.textContent = e.message;
    }
    apply.disabled = !plan?.changed;
    section.classList.toggle("invalid", !plan);
    MKWFields.group(
      section.querySelectorAll("input"),
      error.textContent,
      error,
    );
  };
  for (const field of section.querySelectorAll("input"))
    field.oninput = () => {
      values[field.dataset.slideFormat] =
        field.value === "" ? NaN : Number(field.value);
      refresh();
    };
  apply.onclick = () => {
    try {
      carouselApplySlideFormat(values);
      status("Slideformat und Schutzzonen für alle Slides übernommen.");
    } catch (e) {
      error.textContent = e.message;
    }
  };
  refresh();
}
function carouselApplySlideFormat(values) {
  const c = p.carousel,
    plan = MKWCarouselPolicy.formatPlan(c, values);
  if (!plan.changed) return false;
  carouselEndText();
  checkpoint();
  const byId = new Map(plan.positions.map((o) => [o.id, o.x]));
  for (const o of c.objects) o.x = byId.get(o.id);
  Object.assign(c, plan.format);
  for (const b of p.boards) Object.assign(b, { w: c.w, h: c.h });
  changed();
  carouselSlideCenter(carouselUI.slide ?? 0);
  return true;
}
