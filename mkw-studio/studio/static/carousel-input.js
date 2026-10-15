"use strict";
// Carousel input: see ARCHITECTURE.md for ownership and load order.
function carouselPoint(ev) {
  const rect = $("#carouselCanvas").getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) / carouselZoom,
    y: (ev.clientY - rect.top) / carouselZoom,
  };
}

function carouselHit(pt) {
  return [...p.carousel.objects].reverse().find((o) => {
    if (o.visible === false || o.locked) return false;
    if (carouselIsVector(o)) return carouselVectorHit(o, pt);
    if (pt.x < o.x || pt.x > o.x + o.w || pt.y < o.y || pt.y > o.y + o.h)
      return false;
    if (o.type !== "angle" && !(o.type === "image" && o.framePoints))
      return true;
    const ctx = makeCanvas(1, 1).getContext("2d");
    return ctx.isPointInPath(
      o.type === "angle" ? carouselAngleMask(o) : carouselImageMask(o),
      pt.x - o.x,
      pt.y - o.y,
    );
  });
}

function carouselListen(ev, move, finish, cancel = finish) {
  ev.preventDefault();
  const onMove = (e) => {
    if (e.pointerId !== ev.pointerId) return;
    move(e);
  };
  const onUp = (e) => {
    if (e.pointerId !== ev.pointerId) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    carouselUI.drag = null;
    carouselUI.snapLines = [];
    carouselDrawSnap();
    finish(e);
  };
  carouselUI.drag = {
    cancel: () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      carouselUI.drag = null;
      carouselUI.snapLines = [];
      carouselDrawSnap();
      cancel(ev);
    },
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function carouselPointer(ev) {
  if (
    busy ||
    ev.button !== 0 ||
    ev.target.closest("textarea,button,input,.carousel-inline-text")
  )
    return;
  carouselEndText();
  const pt = carouselPoint(ev),
    tool = carouselUI.space ? "hand" : carouselUI.tool;
  if (tool === "hand") {
    const v = $("#carouselViewport"),
      x = ev.clientX,
      y = ev.clientY,
      sx = v.scrollLeft,
      sy = v.scrollTop;
    carouselListen(
      ev,
      (e) => {
        v.scrollLeft = sx - (e.clientX - x);
        v.scrollTop = sy - (e.clientY - y);
      },
      () => {},
    );
    return;
  }
  if (tool === "zoom") {
    carouselSetZoom(carouselZoom * (ev.altKey ? 0.8 : 1.25), ev);
    return;
  }
  if (tool === "builder") {
    carouselBuilderPointer(ev, pt);
    return;
  }
  if (tool === "curve") {
    carouselCurvePointer(ev, pt);
    return;
  }
  if (
    carouselUI.vectorPoints &&
    tool === "select" &&
    carouselSelected()[0]?.type === "path"
  ) {
    carouselPathMarquee(ev, pt);
    return;
  }
  if (tool === "path") {
    if (!carouselPathDraft) {
      const selected = carouselSelected()[0];
      if (selected?.type === "path") {
        const segment = carouselNearestSegment(selected, pt);
        if (segment) {
          if (!ev.altKey) carouselInsertPathPointAt(selected, segment);
          return;
        }
      }
      const o = carouselHit(pt);
      if (carouselIsVector(o)) {
        carouselSelect([o.id]);
        carouselStartPointEditing(o);
        return;
      }
    }
    carouselPathPointer(ev, pt);
    return;
  }
  if (tool === "shape") {
    carouselCreateDrag(ev, tool, pt);
    return;
  }
  const hit = carouselHit(pt);
  if (tool === "text" && hit?.type === "text") {
    carouselSelect([hit.id]);
    carouselEditText(hit);
    return;
  }
  if (tool === "gradient" && hit?.type === "gradient") {
    carouselSelect([hit.id]);
    carouselGradientDrag(ev, hit);
    return;
  }
  if (["text", "image", "gradient", "angle"].includes(tool)) {
    carouselCreateDrag(ev, tool, pt);
    return;
  }
  if (hit) {
    if (ev.shiftKey) {
      const ids = new Set(carouselSelected().map((o) => o.id));
      ids.has(hit.id) ? ids.delete(hit.id) : ids.add(hit.id);
      carouselSelect([...ids]);
      return;
    }
    if (!carouselUI.ids.has(hit.id)) carouselSelect([hit.id]);
    carouselUI.content = tool === "content" || carouselUI.content;
    carouselMove(ev);
    return;
  }
  if (!ev.shiftKey) carouselSelect([]);
  carouselMarquee(ev, pt, ev.shiftKey);
}

function carouselCreateDrag(ev, type, start) {
  const anchor = carouselSnap(
    start.x,
    start.y,
    { w: 0, h: 0 },
    ev.ctrlKey || ev.metaKey,
    [],
  );
  start = { x: anchor.x, y: anchor.y };
  const sketch = document.createElement("div");
  sketch.className = "carousel-marquee";
  $("#carouselSelectionOverlay").append(sketch);
  let rect = { x: start.x, y: start.y, w: 1, h: 1 };
  carouselListen(
    ev,
    (e) => {
      const end = carouselPoint(e);
      let w = Math.abs(end.x - start.x),
        h = Math.abs(end.y - start.y);
      if (type === "angle") h = w * 2;
      else if (e.shiftKey) w = h = Math.max(w, h);
      rect = {
        x: end.x < start.x ? start.x - w : start.x,
        y: end.y < start.y ? start.y - h : start.y,
        w: Math.max(1, w),
        h: Math.max(1, h),
      };
      rect = carouselSnapResize(
        rect,
        (end.y < start.y ? "n" : "s") + (end.x < start.x ? "w" : "e"),
        e.ctrlKey || e.metaKey,
        type === "angle" || e.shiftKey,
        false,
        [],
      );
      carouselUI.snapLines = [...anchor.guides, ...rect.guides];
      carouselDrawSnap();
      Object.assign(sketch.style, {
        left: rect.x * carouselZoom + "px",
        top: rect.y * carouselZoom + "px",
        width: rect.w * carouselZoom + "px",
        height: rect.h * carouselZoom + "px",
      });
    },
    () => {
      if (rect.w * carouselZoom < 5 || rect.h * carouselZoom < 5) {
        sketch.remove();
        status("Rahmen mit gedrückter Maustaste aufziehen.");
        return;
      }
      const o = carouselObject(type, {
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
      });
      carouselUI.tool = "select";
      carouselToolUI();
      if (type === "text") carouselEditText(o);
      else if (type === "image") carouselFile(o.id);
    },
    () => sketch.remove(),
  );
}

function carouselMarquee(ev, start, add) {
  const existing = add ? carouselSelected().map((o) => o.id) : [],
    sketch = document.createElement("div");
  sketch.className = "carousel-marquee";
  $("#carouselSelectionOverlay").append(sketch);
  let end = start;
  carouselListen(
    ev,
    (e) => {
      end = carouselPoint(e);
      Object.assign(sketch.style, {
        left: Math.min(start.x, end.x) * carouselZoom + "px",
        top: Math.min(start.y, end.y) * carouselZoom + "px",
        width: Math.abs(end.x - start.x) * carouselZoom + "px",
        height: Math.abs(end.y - start.y) * carouselZoom + "px",
      });
    },
    () => {
      const x = Math.min(start.x, end.x),
        y = Math.min(start.y, end.y),
        w = Math.abs(end.x - start.x),
        h = Math.abs(end.y - start.y);
      const found = p.carousel.objects.filter(
        (o) =>
          !o.locked &&
          o.visible !== false &&
          o.x < x + w &&
          o.x + o.w > x &&
          o.y < y + h &&
          o.y + o.h > y,
      );
      carouselSelect([...new Set([...existing, ...found.map((o) => o.id)])]);
    },
    () => sketch.remove(),
  );
}

function carouselSnapLines(excluded = [...carouselUI.ids]) {
  const c = p.carousel,
    xs = [0, c.w * c.n, c.left, c.w * c.n - c.right],
    ys = [0, c.h, c.h / 2];
  for (let i = 0; i < c.n; i++) {
    xs.push(i * c.w, (i + 1) * c.w, (i + 0.5) * c.w);
    for (let j = 0; j <= 6; j++) xs.push(i * c.w + 100 + (j * (c.w - 200)) / 6);
  }
  for (let j = 0; j <= 6; j++)
    ys.push(c.top + (j * (c.h - c.top - c.bottom)) / 6);
  for (const o of c.objects)
    if (o.visible !== false && !excluded.includes(o.id)) {
      xs.push(o.x, o.x + o.w, o.x + o.w / 2);
      ys.push(o.y, o.y + o.h, o.y + o.h / 2);
    }
  carouselVectorSnapTargets(xs, ys, excluded);
  return { x: [...new Set(xs)], y: [...new Set(ys)] };
}

function carouselNearestSnap(values, lines) {
  const tolerance = studioPreferences.snapDistance / carouselZoom;
  let best = null;
  for (const value of values)
    for (const line of lines) {
      const delta = line - value;
      if (
        Math.abs(delta) <= tolerance &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      )
        best = { delta, line };
    }
  return best;
}

function carouselSnap(x, y, bounds, disabled = false, excluded) {
  const guides = [];
  if (disabled || !carouselUI.snap) return { x, y, guides };
  const lines = carouselSnapLines(excluded),
    sx = carouselNearestSnap([x, x + bounds.w, x + bounds.w / 2], lines.x),
    sy = carouselNearestSnap([y, y + bounds.h, y + bounds.h / 2], lines.y);
  if (sx) {
    x += sx.delta;
    guides.push({ axis: "x", value: sx.line });
  }
  if (sy) {
    y += sy.delta;
    guides.push({ axis: "y", value: sy.line });
  }
  return { x, y, guides };
}

function carouselSnapResize(
  rect,
  corner,
  disabled = false,
  preserve = false,
  symmetric = false,
  excluded,
) {
  // Snap the dragged edge; the opposite edge (or Alt centre) remains the anchor.
  const result = { ...rect, guides: [] };
  if (disabled || !carouselUI.snap) return result;
  const lines = carouselSnapLines(excluded),
    horizontal = /[ew]/.test(corner),
    vertical = /[ns]/.test(corner),
    west = corner.includes("w"),
    north = corner.includes("n");
  const sx = horizontal
      ? carouselNearestSnap([west ? rect.x : rect.x + rect.w], lines.x)
      : null,
    sy = vertical
      ? carouselNearestSnap([north ? rect.y : rect.y + rect.h], lines.y)
      : null;
  const setSize = (w, h) => ({
    x: symmetric
      ? rect.x + (rect.w - w) / 2
      : west
        ? rect.x + rect.w - w
        : rect.x,
    y: symmetric
      ? rect.y + (rect.h - h) / 2
      : north
        ? rect.y + rect.h - h
        : rect.y,
    w,
    h,
  });
  if (preserve) {
    const candidates = [];
    if (sx) {
      const w = rect.w + sx.delta * (west ? -1 : 1) * (symmetric ? 2 : 1);
      candidates.push({
        w,
        h: (w * rect.h) / rect.w,
        delta: Math.abs(sx.delta),
      });
    }
    if (sy) {
      const h = rect.h + sy.delta * (north ? -1 : 1) * (symmetric ? 2 : 1);
      candidates.push({
        w: (h * rect.w) / rect.h,
        h,
        delta: Math.abs(sy.delta),
      });
    }
    const best = candidates
      .filter((r) => r.w >= 10 && r.h >= 10)
      .sort((a, b) => a.delta - b.delta)[0];
    if (best) Object.assign(result, setSize(best.w, best.h));
  } else {
    const w =
        rect.w + (sx ? sx.delta * (west ? -1 : 1) * (symmetric ? 2 : 1) : 0),
      h = rect.h + (sy ? sy.delta * (north ? -1 : 1) * (symmetric ? 2 : 1) : 0);
    Object.assign(result, setSize(w >= 10 ? w : rect.w, h >= 10 ? h : rect.h));
  }
  if (sx && Math.abs((west ? result.x : result.x + result.w) - sx.line) < 0.001)
    result.guides.push({ axis: "x", value: sx.line });
  if (
    sy &&
    Math.abs((north ? result.y : result.y + result.h) - sy.line) < 0.001
  )
    result.guides.push({ axis: "y", value: sy.line });
  return result;
}

function carouselDrawSnap() {
  const root = $("#carouselSnapOverlay");
  if (!root) return;
  const c = p.carousel,
    s = carouselZoom;
  root.innerHTML = carouselUI.snapLines
    .map(
      (line) =>
        `<div class="carousel-snap-line ${line.axis === "x" ? "vertical" : "horizontal"}" style="${line.axis === "x" ? `left:${line.value * s}px;height:${c.h * s}px` : `top:${line.value * s}px;width:${c.w * c.n * s}px`}"></div>`,
    )
    .join("");
}

function carouselMove(ev) {
  let objects = carouselSelected().filter((o) => !o.locked);
  if (!objects.length) return;
  const start = carouselPoint(ev),
    content =
      carouselUI.content &&
      objects.length === 1 &&
      carouselHasImage(objects[0]);
  let begun = false,
    original,
    bounds;
  carouselListen(
    ev,
    (e) => {
      const pt = carouselPoint(e);
      let dx = pt.x - start.x,
        dy = pt.y - start.y;
      if (!begun && Math.hypot(dx, dy) * carouselZoom < 3) return;
      if (!begun) {
        checkpoint();
        if (ev.altKey && !content) {
          objects = objects.map((o) => {
            const copy = clone(o);
            copy.id = uid();
            p.carousel.objects.push(copy);
            return copy;
          });
          carouselUI.ids = new Set(objects.map((o) => o.id));
          carouselSelection = objects.at(-1).id;
        }
        original = objects.map(clone);
        bounds = carouselBounds(original);
        begun = true;
      }
      if (e.shiftKey) {
        const angle =
            (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4,
          length = Math.hypot(dx, dy);
        dx = Math.cos(angle) * length;
        dy = Math.sin(angle) * length;
      }
      carouselUI.snapLines = [];
      if (content) {
        const o = objects[0],
          base = original[0];
        o.panX = base.panX + dx;
        o.panY = base.panY + dy;
      } else {
        const snap = carouselSnap(
          bounds.x + dx,
          bounds.y + dy,
          bounds,
          e.ctrlKey || e.metaKey || e.shiftKey,
        );
        carouselUI.snapLines = snap.guides;
        objects.forEach((o, i) => {
          o.x = original[i].x + snap.x - bounds.x;
          o.y = original[i].y + snap.y - bounds.y;
        });
      }
      if (
        !content &&
        objects.length === 1 &&
        objects[0].type === "angle" &&
        carouselUI.snap &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        const o = objects[0],
          raw = { ...o, x: original[0].x + dx, y: original[0].y + dy },
          snap = carouselAngleTipSnap(raw);
        if (snap.x !== null) {
          o.x = snap.x;
          carouselUI.snapLines = carouselUI.snapLines.filter(
            (line) => line.axis !== "x",
          );
          carouselUI.snapLines.push({
            axis: "x",
            value: carouselAngleTip(o).x,
          });
        }
        if (snap.y !== null) {
          o.y = snap.y;
          carouselUI.snapLines = carouselUI.snapLines.filter(
            (line) => line.axis !== "y",
          );
          carouselUI.snapLines.push({
            axis: "y",
            value: carouselAngleTip(o).y,
          });
        }
      }
      carouselRefresh();
      carouselCoordinates(objects);
    },
    () => {
      if (begun) {
        objects
          .filter((o) => o.type === "angle")
          .forEach((o) => carouselAngleAlign(o));
        changed(false);
      }
      carouselPanel();
    },
  );
}

function carouselResize(ev, corner) {
  const objects = carouselSelected().filter((o) => !o.locked);
  if (!objects.length) return;
  const start = carouselPoint(ev),
    base = objects.map(clone),
    b = carouselBounds(base);
  let begun = false;
  carouselListen(
    ev,
    (e) => {
      if (!begun) {
        checkpoint();
        begun = true;
      }
      const pt = carouselPoint(e),
        dx = pt.x - start.x,
        dy = pt.y - start.y;
      let w = Math.max(
          10,
          b.w + (corner.includes("e") ? dx : corner.includes("w") ? -dx : 0),
        ),
        h = Math.max(
          10,
          b.h + (corner.includes("s") ? dy : corner.includes("n") ? -dy : 0),
        );
      const preserve =
        e.shiftKey ||
        objects.some((o) => o.type === "angle" || o.type === "logo");
      if (preserve) {
        if (corner === "n" || corner === "s") w = (h * b.w) / b.h;
        else if (corner === "e" || corner === "w") h = (w * b.h) / b.w;
        else {
          const scale = Math.max(w / b.w, h / b.h);
          w = b.w * scale;
          h = b.h * scale;
        }
      }
      let x = corner.includes("w") ? b.x + b.w - w : b.x,
        y = corner.includes("n") ? b.y + b.h - h : b.y;
      if (e.altKey) {
        x = b.x + (b.w - w) / 2;
        y = b.y + (b.h - h) / 2;
      }
      const snap = carouselSnapResize(
        { x, y, w, h },
        corner,
        e.ctrlKey || e.metaKey,
        preserve,
        e.altKey,
      );
      ({ x, y, w, h } = snap);
      carouselUI.snapLines = snap.guides;
      objects.forEach((o, i) => {
        const old = base[i];
        o.x = x + ((old.x - b.x) * w) / b.w;
        o.y = y + ((old.y - b.y) * h) / b.h;
        o.w = (old.w * w) / b.w;
        o.h = (old.h * h) / b.h;
        if (e.shiftKey && o.type === "text") {
          const factor = w / b.w;
          o.size = Math.max(1, Math.min(1000, old.size * factor));
          if (old.textStyles)
            o.textStyles = old.textStyles.map((style) =>
              style
                ? {
                    ...style,
                    size: style.size
                      ? Math.max(1, Math.min(1000, style.size * factor))
                      : undefined,
                    leading: style.leading?.map((value) =>
                      value == null
                        ? null
                        : Math.max(1, Math.min(3000, value * factor)),
                    ),
                  }
                : null,
            );
        }
      });
      carouselRefresh();
      carouselCoordinates(objects);
    },
    () => {
      if (begun) {
        objects
          .filter((o) => o.type === "angle")
          .forEach((o) => carouselAngleAlign(o));
        changed(false);
      }
      carouselPanel();
    },
  );
}

function carouselCoordinates(objects) {
  const b = carouselBounds(objects);
  if (b)
    $("#carouselCoordinates").textContent =
      `X ${Math.round(b.x)} · Y ${Math.round(b.y)} · ${Math.round(b.w)} × ${Math.round(b.h)} px`;
}

function carouselGradientDrag(ev, o, key = null) {
  checkpoint();
  const update = (e) => {
    const pt = carouselPoint(e),
      point = { x: (pt.x - o.x) / o.w, y: (pt.y - o.y) / o.h };
    if (key) o[key] = point;
    else o.gradientEnd = point;
    carouselRefresh();
  };
  if (!key) {
    const pt = carouselPoint(ev);
    o.gradientStart = { x: (pt.x - o.x) / o.w, y: (pt.y - o.y) / o.h };
    o.gradientEnd = { ...o.gradientStart };
  }
  carouselListen(ev, update, () => {
    changed(false);
    carouselPanel();
  });
}

let carouselGestureZoom = null;
