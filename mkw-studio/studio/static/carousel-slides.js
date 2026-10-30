"use strict";
// Designer slides: see ARCHITECTURE.md for ownership and load order.
function carouselSlideControls() {
  const root = $("#carouselSlideControls"),
    c = p.carousel,
    s = carouselZoom;
  if (!root) return;
  if (MKWCarouselPolicy.isFree(c)) return MKWArtboardUI.controls(root);
  if (carouselUI.slide >= c.n) carouselUI.slide = c.n - 1;
  root.innerHTML =
    Array.from(
      { length: c.n },
      (_, i) =>
        `<button class="carousel-slide-tab ${carouselUI.slide === i ? "active" : ""}" data-slide="${i}" style="left:${i * c.w * s}px" aria-label="Slide ${i + 1} auswählen" aria-pressed="${carouselUI.slide === i}">Slide ${i + 1}</button>`,
    ).join("") +
    `<button id="carouselAddSlide" style="left:${c.w * c.n * s + 24}px;top:${(c.h * s) / 2 - 20}px" aria-label="Slide hinzufügen" title="Slide hinzufügen" ${c.n >= MKWCarouselPolicy.maxSlides ? "disabled" : ""}>${studioIcon("plus")}</button>`;
  root.querySelectorAll("[data-slide]").forEach(
    (btn) =>
      (btn.onclick = (ev) => {
        ev.stopPropagation();
        carouselSlideSelect(+btn.dataset.slide);
      }),
  );
  $("#carouselAddSlide").onclick = (ev) => {
    ev.stopPropagation();
    carouselSlideInsert(c.n);
  };
}

function carouselSlideSelect(index) {
  if (carouselPathDraft) carouselFinishPath();
  carouselEndText();
  carouselSelection = null;
  carouselUI.ids.clear();
  carouselUI.slide = index;
  carouselPanel();
  carouselRefresh();
}

function carouselSlidePanel(panel) {
  if (MKWCarouselPolicy.isFree(p.carousel)) return MKWArtboardUI.panel(panel);
  const c = p.carousel,
    index = carouselUI.slide;
  panel.innerHTML = `<div class="carousel-section-heading"><h3>Slide ${index + 1}</h3><span>${index + 1} von ${c.n}</span></div><div id="carouselSlideFormat"></div><section class="carousel-property-section"><h4>Anordnung</h4><div class="carousel-fields"><button id="carouselSlideBefore" ${c.n >= MKWCarouselPolicy.maxSlides ? "disabled" : ""}>Davor hinzufügen</button><button id="carouselSlideAfter" ${c.n >= MKWCarouselPolicy.maxSlides ? "disabled" : ""}>Danach hinzufügen</button><button id="carouselSlideLeft" ${index === 0 ? "disabled" : ""}>← Nach links</button><button id="carouselSlideRight" ${index === c.n - 1 ? "disabled" : ""}>Nach rechts →</button></div></section><section class="carousel-property-section"><h4>Slide bearbeiten</h4><button id="carouselSlideDuplicate" ${c.n >= MKWCarouselPolicy.maxSlides ? "disabled" : ""}>Slide duplizieren</button><button id="carouselSlideDelete" ${c.n <= MKWCarouselPolicy.minSlides ? "disabled" : ""}>Slide entfernen</button><p>Beim Entfernen werden vollständig enthaltene Elemente mit entfernt. Übergreifende Elemente bleiben auf der Montagefläche. Das MKW-Logo bleibt erhalten.</p></section>`;
  carouselSlideFormatPanel($("#carouselSlideFormat"));
  MKWArtboardUI.entry(panel);
  $("#carouselSlideBefore").onclick = () => carouselSlideInsert(index);
  $("#carouselSlideAfter").onclick = () => carouselSlideInsert(index + 1);
  $("#carouselSlideLeft").onclick = () => carouselSlideMove(-1);
  $("#carouselSlideRight").onclick = () => carouselSlideMove(1);
  $("#carouselSlideDuplicate").onclick = () =>
    carouselSlideInsert(index + 1, index);
  $("#carouselSlideDelete").onclick = carouselSlideDelete;
}

function carouselBoardIndexes() {
  p.boards.forEach((b, i) => (b.carouselSlide = i));
}

function carouselSlideInsert(index, duplicate = null) {
  if (MKWCarouselPolicy.isFree(p.carousel))
    return MKWArtboardUI.insert(index, duplicate);
  const c = p.carousel;
  if (c.n >= MKWCarouselPolicy.maxSlides) return;
  carouselEndText();
  checkpoint();
  const copies =
    duplicate === null
      ? []
      : c.objects
          .filter(
            (o) => o.x >= duplicate * c.w && o.x + o.w <= (duplicate + 1) * c.w,
          )
          .map((o) => ({
            ...clone(o),
            id: uid(),
            x: o.x + (index - duplicate) * c.w,
          }));
  if (duplicate !== null)
    MKWTemplateModel.remapLinks(
      c.objects.filter(
        (o) => o.x >= duplicate * c.w && o.x + o.w <= (duplicate + 1) * c.w,
      ),
      copies,
    );
  c.objects.forEach((o) => {
    if (o.x >= index * c.w) o.x += c.w;
  });
  c.objects.push(...copies);
  c.n++;
  const b = basicBoard(p.images[0], c.w, c.h);
  p.boards.splice(index, 0, b);
  carouselBoardIndexes();
  carouselUI.ids.clear();
  carouselSelection = null;
  carouselUI.slide = index;
  changed();
  carouselSlideCenter(index);
}

function carouselSlideDelete() {
  if (MKWCarouselPolicy.isFree(p.carousel)) return MKWArtboardUI.remove();
  const c = p.carousel,
    index = carouselUI.slide;
  if (index === null || c.n <= MKWCarouselPolicy.minSlides) return;
  carouselEndText();
  checkpoint();
  const start = index * c.w,
    end = start + c.w;
  c.objects = c.objects.filter(
    (o) => o.type === "logo" || !(o.x >= start && o.x + o.w <= end),
  );
  c.objects.forEach((o) => {
    if (o.x >= end) o.x -= c.w;
    else if (o.type === "logo" && o.x >= start && o.x < end) {
      o.x = c.w - c.right - o.w;
      o.y = c.top;
    }
  });
  c.n--;
  p.boards.splice(index, 1);
  carouselBoardIndexes();
  carouselUI.ids.clear();
  carouselSelection = null;
  carouselUI.slide = Math.min(index, c.n - 1);
  changed();
  carouselSlideCenter(carouselUI.slide);
}

function carouselSlideMove(delta) {
  if (MKWCarouselPolicy.isFree(p.carousel)) return MKWArtboardUI.reorder(delta);
  const c = p.carousel,
    index = carouselUI.slide,
    next = index + delta;
  if (index === null || next < 0 || next >= c.n) return;
  carouselEndText();
  checkpoint();
  c.objects.forEach((o) => {
    if (o.x >= index * c.w && o.x + o.w <= (index + 1) * c.w)
      o.x += delta * c.w;
    else if (o.x >= next * c.w && o.x + o.w <= (next + 1) * c.w)
      o.x -= delta * c.w;
  });
  [p.boards[index], p.boards[next]] = [p.boards[next], p.boards[index]];
  carouselBoardIndexes();
  carouselUI.slide = next;
  changed();
  carouselSlideCenter(next);
}

function carouselSlideCenter(index) {
  const v = $("#carouselViewport"),
    r = $("#carouselCanvas").getBoundingClientRect(),
    vr = v.getBoundingClientRect(),
    a = MKWCarouselPolicy.frame(p.carousel, index);
  v.scrollLeft +=
    r.left + (a.x + a.w / 2) * carouselZoom - vr.left - v.clientWidth / 2;
  if (MKWCarouselPolicy.isFree(p.carousel))
    v.scrollTop +=
      r.top + (a.y + a.h / 2) * carouselZoom - vr.top - v.clientHeight / 2;
}
