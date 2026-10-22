"use strict";
function carouselOpenPath(o) {
  return (
    o?.type === "path" &&
    !o.closed &&
    !o.contours &&
    carouselObjectVisible(o) &&
    !carouselObjectLocked(o)
  );
}
function carouselPathEndpoint(o, index) {
  const point = o.points[index],
    result = carouselToWorld(o, { x: point.x * o.w, y: point.y * o.h });
  for (const key of ["in", "out"])
    if (point[key])
      result[key] = carouselToWorld(o, {
        x: point[key].x * o.w,
        y: point[key].y * o.h,
      });
  return result;
}
function carouselPathEndpointHit(point) {
  let hit = null,
    distance = 8 / carouselZoom;
  for (const o of [...p.carousel.objects].reverse()) {
    if (!carouselOpenPath(o) || o.id === carouselPathDraft?.originId) continue;
    for (const index of [0, o.points.length - 1]) {
      const endpoint = carouselPathEndpoint(o, index),
        d = Math.hypot(point.x - endpoint.x, point.y - endpoint.y);
      if (d < distance) {
        hit = { o, index };
        distance = d;
      }
    }
  }
  return hit;
}
function carouselResumePath(o, index) {
  if (!carouselOpenPath(o)) return;
  const reversed = index === 0,
    world = carouselPathWorld(o, 0);
  carouselPathDraft = {
    originId: o.id,
    reversed,
    originalCount: world.length,
    points: reversed ? MKWPath.reverse(world) : world,
    undo: [],
  };
  carouselSelect([o.id]);
  carouselUI.vectorPoints = true;
  carouselRefresh();
  carouselPanel();
}
function carouselCancelPath() {
  const id = carouselPathDraft?.originId;
  carouselPathDraft = null;
  carouselUI.vectorExtension = null;
  carouselUI.snapLines = [];
  if (id) carouselSelect([id]);
  carouselRefresh();
  carouselPanel();
}
function carouselJoinPath(o, index) {
  const draft = carouselPathDraft;
  if (!draft?.points.length || !carouselOpenPath(o) || o.id === draft.originId)
    return;
  const world = carouselPathWorld(o, 0),
    reversed = index !== 0,
    points = MKWPath.join(
      draft.points,
      reversed ? MKWPath.reverse(world) : world,
    );
  if (points.length > 2000) {
    status("Maximal 2000 Punkte pro Pfad. Die Pfade wurden nicht verbunden.");
    return;
  }
  draft.points = points;
  draft.joinedId = o.id;
  draft.endEnd = reversed ? o.startEnd : o.endEnd;
  draft.endSize = reversed ? o.startSize : o.endSize;
  carouselFinishPath();
}
function carouselPathEndpointsOverlay(root) {
  if (carouselUI.tool !== "path" || !studioPreferences.advanced) return;
  const draft = carouselPathDraft,
    selected = carouselSelected()[0];
  for (const o of p.carousel.objects) {
    if (
      !carouselOpenPath(o) ||
      o.id === draft?.originId ||
      (!draft && o.id === selected?.id && carouselUI.vectorPoints)
    )
      continue;
    for (const index of [0, o.points.length - 1]) {
      const point = carouselPathEndpoint(o, index),
        button = document.createElement("button");
      button.dataset.vectorOverlay = "";
      button.dataset.pathEnd = o.id;
      button.dataset.pathEndIndex = index;
      button.className = "vector-node vector-endpoint";
      button.setAttribute(
        "aria-label",
        `${draft ? "Mit Pfad verbinden" : "Pfad weiterzeichnen"}: ${o.name || "Pfad"}`,
      );
      button.title = button.getAttribute("aria-label");
      Object.assign(button.style, {
        left: point.x * carouselZoom + "px",
        top: point.y * carouselZoom + "px",
      });
      button.onpointerdown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.button !== 0) return;
        if (event.altKey) {
          if (carouselPathDraft) return;
          carouselSelect([o.id]);
          carouselUI.vectorNode = index;
          carouselUI.vectorNodes = new Set([index]);
          carouselDeletePathPoint(o);
        } else if (carouselPathDraft) carouselJoinPath(o, index);
        else carouselResumePath(o, index);
      };
      root.append(button);
    }
  }
}

function carouselFinishPath(closed = false) {
  const draft = carouselPathDraft;
  if (!draft) return;
  if (draft.points.length < 2) {
    return carouselCancelPath();
  }
  const origin = p.carousel.objects.find((o) => o.id === draft.originId),
    joined = p.carousel.objects.find((o) => o.id === draft.joinedId),
    source = origin || joined;
  if (
    (draft.originId && !carouselOpenPath(origin)) ||
    (draft.joinedId && !carouselOpenPath(joined))
  ) {
    carouselCancelPath();
    status(
      "Pfad nicht geändert: Eine beteiligte Ebene wurde entfernt, gesperrt oder ausgeblendet.",
    );
    return;
  }
  if (
    origin &&
    !closed &&
    !joined &&
    draft.points.length === draft.originalCount
  )
    return carouselCancelPath();
  const rect = source
    ? clone(source)
    : {
        ...carouselVectorDefaults("path"),
        fillEnabled:
          !!closed &&
          draft.points.length > 2 &&
          carouselVectorColours.fillEnabled,
      };
  if (origin && draft.reversed) {
    [rect.startEnd, rect.endEnd] = [rect.endEnd, rect.startEnd];
    [rect.startSize, rect.endSize] = [rect.endSize, rect.startSize];
  }
  if (joined) {
    rect.endEnd = draft.endEnd;
    rect.endSize = draft.endSize;
    if (!origin) {
      rect.startEnd = "none";
      rect.startSize = 28;
    }
  }
  rect.closed = closed && draft.points.length > 2;
  carouselSetPathGeometry(rect, draft.points);
  carouselValidateVector(rect);
  carouselPathDraft = null;
  carouselUI.vectorExtension = null;
  carouselUI.snapLines = [];
  if (source) {
    checkpoint();
    Object.assign(source, rect);
    if (origin && joined)
      p.carousel.objects = p.carousel.objects.filter((o) => o.id !== joined.id);
    carouselSelect([source.id]);
    changed();
  } else carouselObject("path", rect);
  carouselUI.tool = source ? "path" : "select";
  carouselUI.vectorPoints = !!source;
  carouselUI.vectorNode = rect.closed ? 0 : draft.points.length - 1;
  carouselUI.vectorNodes = new Set([carouselUI.vectorNode]);
  carouselToolUI();
  carouselRefresh();
  carouselPanel();
}
function carouselPathPointer(ev, pt) {
  ev.preventDefault();
  if (!studioPreferences.advanced) return;
  const endpoint = !ev.altKey && carouselPathEndpointHit(pt);
  if (endpoint) {
    if (carouselPathDraft) carouselJoinPath(endpoint.o, endpoint.index);
    else carouselResumePath(endpoint.o, endpoint.index);
    return;
  }
  if (ev.detail > 1 && carouselPathDraft?.points.length >= 2) {
    carouselFinishPath();
    return;
  }
  if (!carouselPathDraft) carouselUI.vectorNodes = new Set();
  const draft = (carouselPathDraft ??= { points: [], undo: [] }),
    last = draft.points.at(-1);
  if (last && ev.shiftKey) {
    const a =
        (Math.round(Math.atan2(pt.y - last.y, pt.x - last.x) / (Math.PI / 4)) *
          Math.PI) /
        4,
      d = Math.hypot(pt.x - last.x, pt.y - last.y);
    pt = { x: last.x + Math.cos(a) * d, y: last.y + Math.sin(a) * d };
  }
  const snap = carouselSnapPathPoint(
    pt,
    draft.points,
    draft.points.length,
    ev,
    draft.originId ? [draft.originId] : [],
  );
  pt = { x: snap.x, y: snap.y };
  if (last && Math.hypot(pt.x - last.x, pt.y - last.y) * carouselZoom < 2)
    return;
  if (draft.points.length >= 2000) {
    status("Maximal 2000 Punkte pro Pfad.");
    return;
  }
  const point = { ...pt };
  draft.undo.push(clone(draft.points));
  if (draft.undo.length > 30) draft.undo.shift();
  draft.points.push(point);
  delete draft.cursor;
  carouselSelect([]);
  carouselPanel();
  carouselRefresh();
  carouselListen(
    ev,
    (e) => {
      const p = carouselPoint(e);
      if (Math.hypot(p.x - pt.x, p.y - pt.y) * carouselZoom < 3) return;
      carouselLinkedHandle(point, "out", p, e, pt);
      carouselVectorOverlay();
    },
    () => {
      carouselVectorOverlay();
      carouselPanel();
    },
    () => {
      draft.points = draft.undo.pop();
      carouselVectorOverlay();
      carouselPanel();
    },
  );
}
function carouselDraftPanel(panel) {
  panel.innerHTML = `<h3>Pfad zeichnen</h3><output class="vector-point-count">${carouselPathDraft.points.length} Punkte</output><div class="carousel-fields"><button id="finishVectorPath" ${carouselPathDraft.points.length < 2 ? "disabled" : ""}>Offenen Pfad beenden</button><button id="cancelVectorPath">Abbrechen</button></div>`;
  $("#finishVectorPath").onclick = () => carouselFinishPath();
  $("#cancelVectorPath").onclick = carouselCancelPath;
}
