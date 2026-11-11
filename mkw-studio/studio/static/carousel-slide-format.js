"use strict";
const carouselSlideFormatDrafts = new WeakMap();
function carouselSlideFormatPanel(host) {
  const c = p.carousel,
    base = Object.fromEntries(
      MKWCarouselPolicy.formatKeys.map((key) => [key, c[key]]),
    ),
    signature = JSON.stringify(base),
    section = document.createElement("section");
  if (carouselSlideFormatDrafts.get(c)?.signature !== signature)
    carouselSlideFormatDrafts.set(c, { signature, values: { ...base } });
  const { values } = carouselSlideFormatDrafts.get(c);
  section.className = "carousel-property-section carousel-slide-format";
  const input = (key, label, min = 0) =>
    `<label>${label} (px)<input data-slide-format="${key}" aria-label="Slide ${label}" type="number" min="${min}" max="4000" step="1" value="${values[key]}"></label>`;
  section.innerHTML = `<h4>Format für alle Slides</h4><div class="carousel-fields">${input("w", "Breite", 240)}${input("h", "Höhe", 240)}</div><h4>Schutzzone</h4>${MKWFormats.editor(values, (_, key, label) => input(key, label))}<p class="slide-format-note">Elementgrössen bleiben erhalten. Die Inhalte jeder Slide behalten ihren Abstand zum linken Slide-Rand.</p><p class="post-safezone-error" role="status"></p><button id="carouselApplyFormat" class="primary" disabled>Für alle Slides übernehmen</button>`;
  host.append(section);
  MKWSpreadUI.panel(host);
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

function carouselArtboardFormatPanel(host, index) {
  const c = p.carousel,
    page = c.artboards[index],
    ids = c.pageStructure.groups.find((group) => group.includes(page.id)),
    first = c.artboards.find((a) => a.id === ids[0]),
    info = c.pageStructure.artboardInfo[c.pageStructure.groups.indexOf(ids)],
    values = Object.fromEntries(
      MKWCarouselPolicy.formatKeys.map((key) => [key, first[key]]),
    );
  const section = document.createElement("section");
  section.className = "carousel-property-section carousel-row-format";
  const field = (key, label) =>
    `<label>${label} (px)<input data-row-format="${key}" aria-label="Artboard ${label}" type="number" min="${key === "w" || key === "h" ? 240 : 0}" max="4000" step="1" value="${values[key]}"></label>`;
  section.innerHTML = `<h4>Format für dieses Artboard</h4><p>${esc(info.name)} · ${ids.length} ${ids.length === 1 ? "Slide" : "Slides"}</p><button data-row-slides>Slides bearbeiten (1–20) …</button><div class="carousel-fields">${field("w", "Breite")}${field("h", "Höhe")}</div><h4>Schutzzonen</h4><div class="carousel-fields">${field("top", "Oben")}${field("bottom", "Unten")}${field("left", "Links")}${field("right", "Rechts")}</div><p class="slide-format-note">Gilt für alle Slides dieses Artboards. Elementgrössen bleiben erhalten; andere Artboards behalten ihr Format. Darunterliegende Artboards rücken bei Bedarf nach.</p><p data-row-error class="post-safezone-error" role="status"></p><button data-row-apply class="primary" disabled>Für dieses Artboard übernehmen</button>`;
  host.append(section);
  const button = section.querySelector("[data-row-apply]"),
    error = section.querySelector("[data-row-error]");
  function refresh() {
    try {
      const next = MKWSpreadLayoutModel.plan(
        c,
        { type: "format-artboard", ids: [first.id], format: values },
        carouselPaintBounds,
        uid,
      );
      button.disabled = JSON.stringify(next) === JSON.stringify(c);
      error.textContent = "";
    } catch (e) {
      button.disabled = true;
      error.textContent = e.message;
    }
    MKWFields.group(
      section.querySelectorAll("input"),
      error.textContent,
      error,
    );
  }
  for (const input of section.querySelectorAll("input"))
    input.oninput = () => {
      values[input.dataset.rowFormat] = input.valueAsNumber;
      refresh();
    };
  section.querySelector("[data-row-slides]").onclick = () =>
    MKWSpreadUI.editArtboard(first.id);
  button.onclick = () =>
    MKWSpreadUI.commit(
      { type: "format-artboard", ids: [first.id], format: values },
      "Format und Schutzzonen für dieses Artboard übernommen.",
    );
  refresh();
}
