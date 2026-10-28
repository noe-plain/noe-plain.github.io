"use strict";
// Designer bootstrap: see ARCHITECTURE.md for ownership and load order.
window.addEventListener(
  "keydown",
  (ev) => {
    if (
      !carouselActive() ||
      busy ||
      document.querySelector("dialog[open],[popover]:popover-open")
    )
      return;
    const target = ev.target,
      typing =
        target.isContentEditable || target.closest("input,textarea,select");
    if (typing) return;
    if (
      target.closest("button,summary,a[href]") &&
      [
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Enter",
        " ",
      ].includes(ev.key)
    )
      return;
    const key = ev.key.toLowerCase(),
      command = ev.metaKey || ev.ctrlKey;
    if (studioPicker) return;
    if (carouselVectorKey(ev)) return;
    if (command && key === "z") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      carouselEndText();
      ev.shiftKey ? redo() : undo();
      return;
    }
    if (command && key === "a") {
      ev.preventDefault();
      carouselSelect(
        p.carousel.objects
          .filter((o) => !carouselObjectLocked(o) && o.visible !== false)
          .map((o) => o.id),
      );
      return;
    }
    if (command && key === "d") {
      ev.preventDefault();
      carouselDuplicate();
      return;
    }
    if (command && key === "c") {
      ev.preventDefault();
      carouselUI.clipboard = carouselSelected().map(clone);
      carouselUI.clipboardAssets = [...p.images];
      carouselUI.clipboardFonts = [...p.fonts];
      return;
    }
    if (command && key === "v") {
      ev.preventDefault();
      if (carouselUI.clipboard.length) {
        checkpoint();
        for (const im of carouselUI.clipboardAssets || [])
          if (!p.images.some((item) => item.id === im.id)) p.images.push(im);
        for (const font of carouselUI.clipboardFonts || [])
          if (!p.fonts.some((item) => item.role === font.role))
            p.fonts.push(font);
        loadFonts();
        const copies = carouselUI.clipboard.map((o) => ({
          ...clone(o),
          id: uid(),
          x: o.x + 30,
          y: o.y + 30,
        }));
        MKWTemplateModel.remapLinks(carouselUI.clipboard, copies);
        p.carousel.objects.push(...copies);
        carouselUI.ids = new Set(copies.map((o) => o.id));
        carouselSelection = copies.at(-1).id;
        changed();
      }
      return;
    }
    if (ev.code === "Space") {
      ev.preventDefault();
      carouselUI.space = true;
      carouselToolUI();
      return;
    }
    if (key === "escape") {
      ev.preventDefault();
      carouselEndText();
      if (carouselUI.content) {
        carouselUI.content = false;
        carouselToolUI();
        carouselRefresh();
        carouselPanel();
        return;
      }
      carouselSelect([]);
      carouselUI.tool = "select";
      carouselToolUI();
      return;
    }
    if (key === "delete" || key === "backspace") {
      ev.preventDefault();
      if (carouselUI.slide !== null) carouselSlideDelete();
      else carouselDelete();
      return;
    }
    if (key === "[" || key === "]") {
      ev.preventDefault();
      carouselLayerOrder(
        key === "]"
          ? ev.shiftKey
            ? "front"
            : "up"
          : ev.shiftKey
            ? "back"
            : "down",
      );
      return;
    }
    if (key.startsWith("arrow")) {
      const chosen = carouselSelected().filter((o) => !carouselObjectLocked(o));
      if (!chosen.length) return;
      ev.preventDefault();
      checkpoint();
      const delta = ev.shiftKey ? 10 : 1;
      chosen.forEach((o) => {
        if (key === "arrowleft") o.x -= delta;
        if (key === "arrowright") o.x += delta;
        if (key === "arrowup") o.y -= delta;
        if (key === "arrowdown") o.y += delta;
      });
      changed(false);
      carouselPanel();
      return;
    }
    if (!command && carouselToolKeys[key]) {
      ev.preventDefault();
      if (key === "m" || key === "l")
        carouselUI.shapeKind = key === "m" ? "rect" : "ellipse";
      carouselTool(carouselToolKeys[key]);
    }
  },
  true,
);

window.addEventListener("keyup", (ev) => {
  if (ev.code === "Space" && carouselUI.space) {
    carouselUI.space = false;
    carouselToolUI();
  }
});

window.addEventListener("blur", () => {
  carouselUI.space = false;
  carouselUI.touches.clear();
  carouselUI.pinch = null;
  carouselToolUI();
});

window.addEventListener("resize", () => {
  if (carouselActive() && $("#carouselViewport")) carouselSetZoom(carouselZoom);
});

window.addEventListener(
  "pointerdown",
  (ev) => {
    if (
      !carouselActive() ||
      busy ||
      ev.pointerType !== "touch" ||
      !ev.target.closest?.("#carouselViewport")
    )
      return;
    carouselUI.touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (carouselUI.touches.size === 2) {
      carouselUI.drag?.cancel();
      carouselEndText();
      const [a, b] = [...carouselUI.touches.values()];
      carouselUI.pinch = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        zoom: carouselZoom,
        anchor: carouselPoint({
          clientX: (a.x + b.x) / 2,
          clientY: (a.y + b.y) / 2,
        }),
      };
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  },
  true,
);

window.addEventListener(
  "pointermove",
  (ev) => {
    if (!carouselUI.touches.has(ev.pointerId)) return;
    carouselUI.touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (!carouselUI.pinch || carouselUI.touches.size < 2) return;
    const [a, b] = [...carouselUI.touches.values()];
    carouselSetZoom(
      (carouselUI.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
        carouselUI.pinch.distance,
      { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 },
    );
    const v = $("#carouselViewport"),
      r = $("#carouselCanvas").getBoundingClientRect();
    v.scrollLeft +=
      r.left + carouselUI.pinch.anchor.x * carouselZoom - (a.x + b.x) / 2;
    v.scrollTop +=
      r.top + carouselUI.pinch.anchor.y * carouselZoom - (a.y + b.y) / 2;
    ev.preventDefault();
    ev.stopImmediatePropagation();
  },
  true,
);

for (const name of ["pointerup", "pointercancel"])
  window.addEventListener(
    name,
    (ev) => {
      if (!carouselUI.touches.has(ev.pointerId)) return;
      carouselUI.touches.delete(ev.pointerId);
      if (carouselUI.pinch) {
        if (carouselUI.touches.size < 2) carouselUI.pinch = null;
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    true,
  );

for (const name of ["gesturestart", "gesturechange", "gestureend"])
  window.addEventListener(
    name,
    (ev) => {
      if (
        !carouselActive() ||
        busy ||
        !ev.target.closest?.("#carouselViewport")
      )
        return;
      ev.preventDefault();
      if (name === "gesturestart") carouselGestureZoom = carouselZoom;
      else if (name === "gesturechange" && carouselGestureZoom !== null)
        carouselSetZoom(
          carouselGestureZoom * ev.scale,
          Number.isFinite(ev.clientX) ? ev : null,
        );
      else if (name === "gestureend") carouselGestureZoom = null;
    },
    { passive: false },
  );
