"use strict";
const postViewport = $("#workspace"),
  postPasteboard = document.createElement("div");
postPasteboard.id = "postPasteboard";
postPasteboard.hidden = true;
postViewport.append(postPasteboard);
postPasteboard.append($("#boardSpace"), $("#addMoreImages"));
postViewport.tabIndex = 0;
let postProject = null,
  postImages = new Set(),
  postPadX = 0,
  postPadY = 0,
  postSpace = false,
  postHand = false,
  postPan = null,
  postRoomFrame = 0,
  postPinch = null,
  postTouchNavigation = false;
const postTouches = new Map();
const postActive = () => !p.carousel && p.images.length > 0;
function postCaptureAnchor(point = null) {
  if (p.carousel || !p.images.length) return null;
  const v = postViewport.getBoundingClientRect(),
    x = point?.clientX ?? v.left + postViewport.clientWidth / 2,
    y = point?.clientY ?? v.top + postViewport.clientHeight / 2;
  const canvases = [...postViewport.querySelectorAll("canvas[data-board]")];
  if (!canvases.length) return null;
  const canvas = canvases.reduce((best, canvas) => {
      const r = canvas.getBoundingClientRect(),
        distance = Math.hypot(
          Math.max(r.left - x, 0, x - r.right),
          Math.max(r.top - y, 0, y - r.bottom),
        );
      return !best || distance < best.distance ? { canvas, distance } : best;
    }, null).canvas,
    r = canvas.getBoundingClientRect();
  return {
    id: canvas.dataset.board,
    u: (x - r.left) / r.width,
    v: (y - r.top) / r.height,
    x: x - v.left,
    y: y - v.top,
  };
}
function postRestoreAnchor(anchor) {
  if (!anchor) return;
  const canvas = postViewport.querySelector(
    `canvas[data-board="${anchor.id}"]`,
  );
  if (!canvas) return;
  const r = canvas.getBoundingClientRect(),
    v = postViewport.getBoundingClientRect();
  postViewport.scrollLeft += r.left + anchor.u * r.width - v.left - anchor.x;
  postViewport.scrollTop += r.top + anchor.v * r.height - v.top - anchor.y;
}
function postUpdatePadding() {
  postPadX = Math.max(postPadX, 320, postViewport.clientWidth * 0.75);
  postPadY = Math.max(postPadY, 260, postViewport.clientHeight * 0.65);
  postPasteboard.style.setProperty("--post-pad-x", postPadX + "px");
  postPasteboard.style.setProperty("--post-pad-y", postPadY + "px");
}
// Cards decode a small, shared display raster only when approaching the viewport.
const postThumbnailCache = new WeakMap();
let postThumbnailGeneration = 0,
  postThumbnailPending = [],
  postThumbnailRunning = false;
const postThumbnailObserver = new IntersectionObserver(
  (entries) => {
    for (const { isIntersecting, target } of entries)
      if (isIntersecting) {
        postThumbnailObserver.unobserve(target);
        const im = p.images.find((im) => im.id === target.dataset.imagePreview);
        if (im)
          postThumbnailPending.push({
            target,
            im,
            data: im.data,
            project: p,
            generation: postThumbnailGeneration,
          });
      }
    postRunThumbnails();
  },
  { root: postViewport, rootMargin: "200px" },
);
function postObserveThumbnails() {
  postThumbnailGeneration++;
  postThumbnailPending = [];
  postThumbnailObserver.disconnect();
  for (const target of postViewport.querySelectorAll("[data-image-preview]"))
    postThumbnailObserver.observe(target);
}
async function postThumbnail(im) {
  const old = postThumbnailCache.get(im);
  if (old?.data === im.data) return old.promise;
  const data = im.data,
    promise = (async () => {
      const source = await previewImage(data),
        canvas = makeCanvas(460, 220),
        scale = Math.max(
          canvas.width / source.width,
          canvas.height / source.height,
        );
      canvas
        .getContext("2d")
        .drawImage(
          source,
          (canvas.width - source.width * scale) / 2,
          (canvas.height - source.height * scale) / 2,
          source.width * scale,
          source.height * scale,
        );
      const result = canvas.toDataURL("image/png");
      canvas.width = canvas.height = 1;
      return result;
    })();
  postThumbnailCache.set(im, { data, promise });
  try {
    return await promise;
  } catch (error) {
    if (postThumbnailCache.get(im)?.promise === promise)
      postThumbnailCache.delete(im);
    throw error;
  }
}
async function postRunThumbnails() {
  if (postThumbnailRunning) return;
  postThumbnailRunning = true;
  try {
    while (postThumbnailPending.length) {
      const job = postThumbnailPending.shift();
      if (
        job.project !== p ||
        job.generation !== postThumbnailGeneration ||
        !job.target.isConnected
      )
        continue;
      try {
        const src = await postThumbnail(job.im);
        if (
          job.project === p &&
          job.generation === postThumbnailGeneration &&
          job.target.isConnected &&
          job.im.data === job.data
        )
          job.target.src = src;
      } catch {
        job.target.alt = "Vorschau nicht verfügbar";
      }
    }
  } finally {
    postThumbnailRunning = false;
  }
}
function postAlignCards() {
  postViewport.querySelectorAll(".image-group").forEach((row) => {
    row.querySelector(".image-info-card").style.marginTop =
      (row.querySelector(".board-label")?.getBoundingClientRect().height || 0) +
      "px";
  });
}
function postApplyZoomLayout() {
  const scale = surfaceScale();
  for (const b of p.boards) {
    const card = postViewport.querySelector(`.board-card[data-id="${b.id}"]`);
    if (!card) continue;
    card.style.width = b.w * scale + "px";
    Object.assign(card.querySelector(".board-surface").style, {
      width: b.w * scale + "px",
      height: b.h * scale + "px",
    });
  }
  postAlignCards();
}
function postFitRow(row = null) {
  if (!postActive()) return;
  row ??=
    postViewport
      .querySelector(".board-card.selected")
      ?.closest(".image-group") || postViewport.querySelector(".image-group");
  if (!row) return;
  if (editingText) editingText.el.blur();
  const boards = p.boards.filter((b) => b.imageId === row.dataset.imageRow);
  if (!boards.length) return;
  const card = row.querySelector(".image-info-card"),
    gap = matchMedia("(max-width:760px)").matches ? 24 : 40,
    cardGap = 28;
  const width =
      postViewport.clientWidth -
      card.offsetWidth -
      cardGap -
      64 -
      Math.max(0, boards.length - 1) * gap,
    height = postViewport.clientHeight - 150 - 24;
  view = Math.max(
    0.2,
    Math.min(
      3,
      width / (boards.reduce((sum, b) => sum + b.w, 0) * 0.24),
      height / (Math.max(...boards.map((b) => b.h)) * 0.24),
    ),
  );
  postApplyZoomLayout();
  postUpdatePadding();
  updateDock();
  draw();
  const r = row.getBoundingClientRect(),
    v = postViewport.getBoundingClientRect();
  postViewport.scrollLeft +=
    r.left - v.left - Math.max(24, (postViewport.clientWidth - r.width) / 2);
  postViewport.scrollTop +=
    r.top -
    v.top -
    Math.max(32, (postViewport.clientHeight - 100 - r.height) / 2);
}
function postAfterRender(anchor) {
  const sameProject =
      postProject === p || p.images.some((im) => postImages.has(im.id)),
    hadImages = postImages.size > 0;
  postProject = p;
  postImages = new Set(p.images.map((im) => im.id));
  postPasteboard.hidden = !p.images.length;
  postObserveThumbnails();
  $("#postFit").disabled = $("#postHand").disabled = !p.images.length;
  if (!p.images.length) {
    postPadX = postPadY = 0;
    postHand = postSpace = false;
    postUpdateHand();
    postViewport.scrollLeft = postViewport.scrollTop = 0;
    return;
  }
  postAlignCards();
  postUpdatePadding();
  if (!sameProject || !hadImages)
    postFitRow(postViewport.querySelector(".image-group"));
  else postRestoreAnchor(anchor);
}
function postSetZoom(value, point = null, anchor = null) {
  if (!postActive()) return;
  anchor ??= postCaptureAnchor(point);
  if (editingText) editingText.el.blur();
  view = Math.max(0.2, Math.min(3, value));
  postApplyZoomLayout();
  postUpdatePadding();
  postRestoreAnchor(anchor);
  updateDock();
  draw();
}
function postUpdateHand() {
  document.body.classList.toggle("post-hand-active", postHand || postSpace);
  $("#postHand").setAttribute("aria-pressed", String(postHand || postSpace));
}
function postTyping(target) {
  return (
    target.isContentEditable ||
    !!target.closest("input,textarea,select,button,summary")
  );
}
$("#postHand").onclick = () => {
  postHand = !postHand;
  postUpdateHand();
  postViewport.focus({ preventScroll: true });
};
$("#postFit").onclick = () => postFitRow();
postViewport.addEventListener(
  "wheel",
  (event) => {
    if (!postActive() || busy) return;
    if (MKWWorkspaceWheel.horizontal(event, postViewport)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) {
      event.preventDefault();
      postSetZoom(view * Math.exp(-event.deltaY * 0.003), event);
    } else if (event.shiftKey && !event.deltaX) {
      event.preventDefault();
      postViewport.scrollLeft += event.deltaY;
    }
  },
  { passive: false },
);
window.addEventListener("keydown", (event) => {
  if (
    !postActive() ||
    busy ||
    document.querySelector("dialog[open]") ||
    postTyping(event.target)
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    postSpace = true;
    postUpdateHand();
  }
  if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "h") {
    event.preventDefault();
    postHand = !postHand;
    postUpdateHand();
  }
  if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "v") {
    postHand = false;
    postUpdateHand();
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    postSpace = false;
    postUpdateHand();
  }
});
window.addEventListener("blur", () => {
  postSpace = false;
  postPan = null;
  postPinch = null;
  postTouches.clear();
  postTouchNavigation = false;
  document.body.classList.remove("post-panning");
  postUpdateHand();
});
function postCancelEditMovement() {
  MKWPostAngleEditor.cancelMotion();
  if (typeof movement === "undefined" || !movement) return;
  const { b, key, initial } = movement;
  Object.assign(
    key === "image" ? b.image : key === "textBox" ? b.textBox : b.elements[key],
    initial,
  );
  movement = null;
  draw();
}
window.addEventListener(
  "pointerdown",
  (event) => {
    if (
      !postActive() ||
      busy ||
      document.querySelector("dialog[open]") ||
      !event.target.closest?.("#workspace")
    )
      return;
    if (event.pointerType === "touch") {
      postTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (postTouches.size === 2) {
        postCancelEditMovement();
        postPan = null;
        const [a, b] = [...postTouches.values()],
          mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
        postPinch = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          view,
          anchor: postCaptureAnchor(mid),
        };
        postTouchNavigation = true;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    const hand = postHand || postSpace || event.button === 1,
      artwork = event.target.closest(".board-card");
    if (
      event.target.closest(".group-heading") ||
      (!hand &&
        event.target.closest("button,input,select,textarea,.text-editor"))
    )
      return;
    if ((event.button === 0 || event.button === 1) && (hand || !artwork)) {
      postPan = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: postViewport.scrollLeft,
        top: postViewport.scrollTop,
        hand,
      };
      if (hand) {
        if (editingText) editingText.el.blur();
        event.preventDefault();
        event.stopImmediatePropagation();
        postViewport.focus({ preventScroll: true });
        document.body.classList.add("post-panning");
      }
    }
  },
  true,
);
window.addEventListener(
  "pointermove",
  (event) => {
    if (postTouches.has(event.pointerId))
      postTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (postPinch && postTouches.size >= 2) {
      const [a, b] = [...postTouches.values()],
        mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 },
        r = postViewport.getBoundingClientRect(),
        anchor = {
          ...postPinch.anchor,
          x: mid.clientX - r.left,
          y: mid.clientY - r.top,
        };
      postSetZoom(
        (postPinch.view * Math.hypot(a.x - b.x, a.y - b.y)) /
          postPinch.distance,
        mid,
        anchor,
      );
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (postTouchNavigation) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!postPan || postPan.id !== event.pointerId) return;
    const dx = event.clientX - postPan.x,
      dy = event.clientY - postPan.y;
    if (!postPan.hand && Math.hypot(dx, dy) < 3) return;
    postViewport.scrollLeft = postPan.left - dx;
    postViewport.scrollTop = postPan.top - dy;
    document.body.classList.add("post-panning");
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true, passive: false },
);
for (const name of ["pointerup", "pointercancel"])
  window.addEventListener(
    name,
    (event) => {
      postTouches.delete(event.pointerId);
      if (postTouches.size < 2) postPinch = null;
      if (!postTouches.size) postTouchNavigation = false;
      if (postPan?.id === event.pointerId) {
        postPan = null;
        document.body.classList.remove("post-panning");
      }
    },
    true,
  );
let postGesture = null;
for (const name of ["gesturestart", "gesturechange", "gestureend"])
  window.addEventListener(
    name,
    (event) => {
      if (!postActive() || busy || !event.target.closest?.("#workspace"))
        return;
      event.preventDefault();
      if (name === "gesturestart")
        postGesture = { view, anchor: postCaptureAnchor(event) };
      else if (name === "gesturechange" && postGesture)
        postSetZoom(postGesture.view * event.scale, event, postGesture.anchor);
      else if (name === "gestureend") postGesture = null;
    },
    { passive: false },
  );
postViewport.addEventListener("scroll", () => {
  if (postRoomFrame || !postActive()) return;
  postRoomFrame = requestAnimationFrame(() => {
    postRoomFrame = 0;
    if (!postActive()) return;
    draw();
    if (performance.now() < (postViewport.scrollControlUntil || 0)) return;
    const x = postViewport.scrollLeft,
      y = postViewport.scrollTop;
    const addX =
        x < 64 || postViewport.scrollWidth - postViewport.clientWidth - x < 64
          ? postViewport.clientWidth
          : 0,
      addY =
        y < 64 || postViewport.scrollHeight - postViewport.clientHeight - y < 64
          ? postViewport.clientHeight
          : 0;
    if (addX || addY) {
      postPadX += addX;
      postPadY += addY;
      postUpdatePadding();
      postViewport.scrollLeft = x + addX;
      postViewport.scrollTop = y + addY;
      if (postPan) {
        postPan.left += addX;
        postPan.top += addY;
      }
    }
  });
});
window.addEventListener("resize", () => {
  if (!postActive()) return;
  const anchor = postCaptureAnchor();
  postAlignCards();
  postUpdatePadding();
  postRestoreAnchor(anchor);
  draw();
});
