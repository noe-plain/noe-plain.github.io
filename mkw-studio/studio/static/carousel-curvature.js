"use strict";
function carouselCurvatureSamples(a, b, count = 20) {
  const p = a.out || a,
    q = b.in || b,
    curved = !!(a.out || b.in),
    result = [];
  if (!curved) return result;
  for (let i = 1; i < count; i++) {
    const t = i / count,
      u = 1 - t,
      point = carouselBezierPoint(a, b, t),
      dx =
        3 *
        (u * u * (p.x - a.x) + 2 * u * t * (q.x - p.x) + t * t * (b.x - q.x)),
      dy =
        3 *
        (u * u * (p.y - a.y) + 2 * u * t * (q.y - p.y) + t * t * (b.y - q.y)),
      ddx = 6 * (u * (q.x - 2 * p.x + a.x) + t * (b.x - 2 * q.x + p.x)),
      ddy = 6 * (u * (q.y - 2 * p.y + a.y) + t * (b.y - 2 * q.y + p.y)),
      speed = Math.hypot(dx, dy);
    if (speed < 1e-6) continue;
    result.push({
      ...point,
      nx: -dy / speed,
      ny: dx / speed,
      k: (dx * ddy - dy * ddx) / speed ** 3,
    });
  }
  return result;
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
  button.hidden = !studioPreferences.advanced || !paths.length;
  button.setAttribute("aria-pressed", String(!!studioPreferences.curvature));
  let svg = $("#carouselCurvatureOverlay");
  if (button.hidden || !studioPreferences.curvature) {
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
  svg.setAttribute("width", p.carousel.w * p.carousel.n * carouselZoom);
  svg.setAttribute("height", p.carousel.h * carouselZoom);
  let d = "",
    remaining = 600;
  for (const o of paths) {
    const diag = Math.hypot(o.w, o.h);
    for (let c = 0; c < carouselPathContours(o).length; c++) {
      const points = carouselPathWorld(o, c);
      for (
        let i = 0;
        i < points.length - (o.closed ? 0 : 1) && remaining > 0;
        i++
      ) {
        const samples = carouselCurvatureSamples(
          points[i],
          points[(i + 1) % points.length],
          Math.min(24, remaining + 1),
        );
        for (const sample of samples) {
          const length = Math.max(
            -70 / carouselZoom,
            Math.min(70 / carouselZoom, sample.k * diag * diag * 0.12),
          );
          if (Math.abs(length) * carouselZoom < 0.2) continue;
          d += `M${sample.x * carouselZoom},${sample.y * carouselZoom}l${sample.nx * length * carouselZoom},${sample.ny * length * carouselZoom}`;
          remaining--;
        }
      }
    }
  }
  svg.innerHTML = `<path d="${d}"/>`;
}
