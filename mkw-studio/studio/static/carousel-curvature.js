"use strict";
function carouselCurvatureSamples(a, b, count = 20) {
  return MKWPath.curvatureSamples(a, b, count);
}
function carouselCurvatureOverlay() {
  let button = $("#footerCurvature");
  if (!button) {
    button = document.createElement("button");
    button.id = "footerCurvature";
    button.className = "icon-button";
    button.innerHTML = studioIcon("curve");
    button.title = "Kurvenenergie anzeigen";
    button.setAttribute("aria-label", "Kurvenenergie anzeigen");
    $("#footerGuides").after(button);
    button.onclick = () => {
      studioPreferences.curvature = !studioPreferences.curvature;
      studioApplyPreferences();
      carouselRefresh();
    };
  }
  const paths = carouselActive()
    ? carouselSelected().filter(
        (o) => o.type === "path" && carouselObjectVisible(o),
      )
    : [];
  button.hidden = !carouselActive();
  button.setAttribute("aria-pressed", String(!!studioPreferences.curvature));
  let svg = $("#carouselCurvatureOverlay");
  if (button.hidden || !studioPreferences.curvature || !paths.length) {
    svg?.remove();
    return;
  }
  const root = $("#carouselEditingOverlay"),
    key = JSON.stringify([
      carouselZoom,
      paths.map((o) => [
        o.id,
        o.x,
        o.y,
        o.w,
        o.h,
        o.angle,
        o.points,
        o.contours,
        o.closed,
      ]),
    ]);
  if (svg?.dataset.key === key) return;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "carouselCurvatureOverlay";
    svg.setAttribute("aria-hidden", "true");
    root.append(svg);
  }
  svg.dataset.key = key;
  svg.setAttribute(
    "width",
    MKWCarouselPolicy.extent(p.carousel).w * carouselZoom,
  );
  svg.setAttribute(
    "height",
    MKWCarouselPolicy.extent(p.carousel).h * carouselZoom,
  );
  // A shared scale makes curvature jumps at adjoining segments visible.
  const segments = [];
  let remaining = 600,
    maxCurvature = 0;
  for (const o of paths) {
    for (let c = 0; c < carouselPathContours(o).length; c++) {
      const points = carouselPathWorld(o, c);
      for (
        let i = 0;
        i < points.length - (o.closed ? 0 : 1) && remaining > 3;
        i++
      ) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          length =
            Math.hypot((a.out || a).x - a.x, (a.out || a).y - a.y) +
            Math.hypot(
              (b.in || b).x - (a.out || a).x,
              (b.in || b).y - (a.out || a).y,
            ) +
            Math.hypot(b.x - (b.in || b).x, b.y - (b.in || b).y),
          samples = carouselCurvatureSamples(
            a,
            b,
            Math.min(
              remaining - 1,
              80,
              Math.max(6, Math.ceil((length * carouselZoom) / 9)),
            ),
          );
        segments.push(samples);
        remaining -= samples.length;
        for (const sample of samples)
          maxCurvature = Math.max(maxCurvature, Math.abs(sample.k));
      }
    }
  }
  const gain = Math.min(
      p.carousel.w ** 2 * 0.02,
      80 / (carouselZoom * (maxCurvature || 1)),
    ),
    z = carouselZoom;
  let comb = "",
    envelope = "",
    bands = "";
  for (const samples of segments) {
    if (!samples.length) continue;
    const tips = samples.map((sample) => ({
      x: (sample.x - sample.nx * sample.k * gain) * z,
      y: (sample.y - sample.ny * sample.k * gain) * z,
    }));
    for (const [i, sample] of samples.entries())
      comb += `M${sample.x * z},${sample.y * z}L${tips[i].x},${tips[i].y}`;
    const edge = tips
      .map((tip, i) => `${i ? "L" : "M"}${tip.x},${tip.y}`)
      .join("");
    envelope += edge;
    bands +=
      edge +
      [...samples]
        .reverse()
        .map((sample) => `L${sample.x * z},${sample.y * z}`)
        .join("") +
      "Z";
  }
  svg.innerHTML = `<path class="curvature-band" d="${bands}"/><path class="curvature-comb" d="${comb}"/><path class="curvature-envelope" d="${envelope}"/>`;
}
