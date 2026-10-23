"use strict";
const MKWTemplateFillPreview = (() => {
  function attach(host) {
    host.innerHTML = `<div class="template-live-heading"><h3>Vorschau</h3><span id="templatePreviewCount" aria-live="polite"></span></div><div class="template-instagram"><div class="template-instagram-header"><img src="mkw-logo-bold-pos.svg" alt="Musikkollegium Winterthur"><span>Dein Beitrag</span></div><div class="template-artwork-track" tabindex="0" aria-label="Slide-Vorschau · nach links oder rechts wischen"></div><div class="template-preview-navigation"><button type="button" data-preview-step="-1" aria-label="Vorherige Slide in der Vorschau">${studioIcon("back")}</button><div class="template-preview-dots" role="group" aria-label="Slide auswählen"></div><button type="button" data-preview-step="1" aria-label="Nächste Slide in der Vorschau">${studioIcon("front")}</button></div></div><p class="template-preview-status" role="status"></p><small>Aktualisiert sich mit deinen Eingaben. Neutrale Bildflächen sind Platzhalter.</small>`;
    const track = host.querySelector(".template-artwork-track"),
      dots = host.querySelector(".template-preview-dots"),
      status = host.querySelector(".template-preview-status");
    let template = null,
      readValues,
      slide = 0,
      revision = 0,
      rendered = new Map(),
      timer = null,
      painting = false,
      active = false;
    function controls() {
      host.querySelector("#templatePreviewCount").textContent =
        `${slide + 1} / ${template.carousel.n}`;
      host.querySelector('[data-preview-step="-1"]').disabled = slide === 0;
      host.querySelector('[data-preview-step="1"]').disabled =
        slide === template.carousel.n - 1;
      for (const b of dots.children)
        b.setAttribute(
          "aria-pressed",
          String(+b.dataset.previewSlide === slide),
        );
      const dot = dots.children[slide];
      if (dot && dots.clientWidth) {
        const left = dot.offsetLeft,
          right = left + dot.offsetWidth;
        if (left < dots.scrollLeft) dots.scrollLeft = left;
        else if (right > dots.scrollLeft + dots.clientWidth)
          dots.scrollLeft = right - dots.clientWidth;
      }
    }
    async function draw() {
      timer = null;
      if (painting || !active || !template || rendered.get(slide) === revision)
        return;
      painting = true;
      const item = template,
        index = slide,
        version = revision,
        current = () =>
          active &&
          template === item &&
          revision === version &&
          slide === index;
      status.textContent = "Vorschau wird aktualisiert …";
      const finishLoading = MKWUIControls.loading(status);
      try {
        const src = await MKWTemplatePreview.paint(
          item,
          readValues(),
          index,
          current,
        );
        if (src && current()) {
          const frame = track.children[index],
            img = frame.querySelector("img");
          img.src = src;
          img.hidden = false;
          frame.querySelector("span").hidden = true;
          rendered.set(index, version);
          status.textContent = "";
        }
      } catch (error) {
        if (current())
          status.textContent = "Vorschau nicht verfügbar: " + error.message;
      } finally {
        finishLoading();
        painting = false;
        if (
          active &&
          rendered.get(slide) !== revision &&
          !(template === item && slide === index && revision === version)
        )
          schedule();
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(draw, 140);
    }
    function jump(index) {
      if (!template) return;
      slide = Math.max(0, Math.min(template.carousel.n - 1, index));
      track.scrollTo({ left: slide * track.clientWidth, behavior: "auto" });
      controls();
      schedule();
    }
    track.onscroll = () => {
      if (!template || !track.clientWidth) return;
      const next = Math.max(
        0,
        Math.min(
          template.carousel.n - 1,
          Math.round(track.scrollLeft / track.clientWidth),
        ),
      );
      if (next !== slide) {
        slide = next;
        controls();
        schedule();
      }
    };
    track.onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        jump(slide + (e.key === "ArrowRight" ? 1 : -1));
      }
    };
    for (const b of host.querySelectorAll("[data-preview-step]"))
      b.onclick = () => jump(slide + Number(b.dataset.previewStep));
    const size = new ResizeObserver(() => {
      if (active) track.scrollLeft = slide * track.clientWidth;
    });
    size.observe(track);
    function show(t, values) {
      template = t;
      host.style.setProperty(
        "--template-preview-ratio",
        `${t.carousel.w}/${t.carousel.h}`,
      );
      readValues = values;
      active = true;
      slide = 0;
      revision++;
      rendered = new Map();
      track.innerHTML = Array.from(
        { length: t.carousel.n },
        (_, i) =>
          `<div class="template-artwork-slide" style="aspect-ratio:${t.carousel.w}/${t.carousel.h}" role="group" aria-label="Slide ${i + 1}"><img alt="Dein Design · Slide ${i + 1}" hidden><span>Slide ${i + 1}</span></div>`,
      ).join("");
      dots.innerHTML = Array.from(
        { length: t.carousel.n },
        (_, i) =>
          `<button type="button" data-preview-slide="${i}" aria-label="Slide ${i + 1} in der Vorschau" aria-pressed="${i === 0}"></button>`,
      ).join("");
      for (const b of dots.children)
        b.onclick = () => jump(+b.dataset.previewSlide);
      track.scrollLeft = 0;
      controls();
      schedule();
    }
    function changed() {
      revision++;
      schedule();
    }
    function reveal(o) {
      if (!template) return;
      const c = template.carousel,
        b = carouselObjectBounds(o);
      if (b.w > c.w && b.x <= slide * c.w && b.x + b.w >= (slide + 1) * c.w)
        return;
      jump(Math.floor((b.x + b.w / 2) / c.w));
    }
    function close() {
      active = false;
      revision++;
      clearTimeout(timer);
      template = null;
      readValues = null;
      track.replaceChildren();
      dots.replaceChildren();
      pruneImageCache();
    }
    return { show, changed, reveal, close };
  }
  return { attach };
})();
