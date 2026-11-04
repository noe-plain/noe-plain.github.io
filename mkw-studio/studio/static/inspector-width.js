(function (root) {
  "use strict";
  const min = 300,
    max = 450,
    initial = 300;
  let preferred = initial,
    handle = null,
    drag = null,
    frame = 0,
    pending = null;
  let save = () => {},
    resized = () => {};
  const clamp = (value) => Math.max(min, Math.min(max, Math.round(value)));
  function show(value) {
    const width = clamp(value);
    document.documentElement.style.setProperty(
      "--studio-sidebar-size",
      width + "px",
    );
    handle.setAttribute("aria-valuenow", width);
    handle.setAttribute("aria-valuetext", width + " Pixel");
    return width;
  }
  function commit(value) {
    const next = show(value),
      changed = next !== preferred;
    preferred = next;
    if (changed) save(next);
    resized();
  }
  function flush() {
    frame = 0;
    if (!drag || pending === null) return;
    drag.moved ||= Math.abs(pending - drag.x) >= 2;
    if (drag.moved) {
      drag.shown = show(drag.width + drag.x - pending);
      resized();
    }
    pending = null;
  }
  function stop(accept) {
    if (!drag) return;
    cancelAnimationFrame(frame);
    frame = 0;
    if (accept) flush();
    const state = drag;
    drag = null;
    pending = null;
    document.body.classList.remove("is-width-resizing");
    if (handle.hasPointerCapture(state.pointer))
      handle.releasePointerCapture(state.pointer);
    if (accept && state.moved) commit(state.shown);
    else {
      show(preferred);
      resized();
    }
  }
  function mount() {
    if (handle) return;
    handle = document.createElement("div");
    handle.className = "inspector-splitter inspector-width-splitter";
    handle.tabIndex = 0;
    for (const [key, value] of Object.entries({
      role: "separator",
      "aria-orientation": "vertical",
      "aria-label": "Breite der Seitenleiste",
      "aria-controls": "toolsSidebar",
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-describedby": "inspectorWidthHelp",
    }))
      handle.setAttribute(key, value);
    handle.title =
      "Breite anpassen · Ziehen oder ←/→ · Doppelklick oder 0: 300 px";
    handle.innerHTML = '<span aria-hidden="true"></span>';
    const help = document.createElement("p");
    help.id = "inspectorWidthHelp";
    help.className = "visually-hidden";
    help.textContent =
      "Nach links ziehen, um die Seitenleiste zu verbreitern. Breite 300 bis 450 Pixel. Pfeil links verbreitert, Pfeil rechts verkleinert; Umschalt verändert in grösseren Schritten. Pos1 und Ende wählen die Grenzen. Doppelklick oder 0 setzt zurück. Escape bricht das Ziehen ab.";
    const region = document.createElement("section");
    region.setAttribute("aria-label", "Seitenleiste anpassen");
    region.append(handle, help);
    document.body.append(region);
    handle.onpointerdown = (e) => {
      if (e.button !== 0 || drag) return;
      e.preventDefault();
      handle.focus({ preventScroll: true });
      drag = {
        x: e.clientX,
        width: preferred,
        shown: preferred,
        pointer: e.pointerId,
        moved: false,
      };
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add("is-width-resizing");
    };
    handle.onpointermove = (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      pending = e.clientX;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    handle.onpointerup = (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      pending = e.clientX;
      stop(true);
    };
    handle.onpointercancel = handle.onlostpointercapture = () => stop(false);
    handle.ondblclick = () => commit(initial);
    window.addEventListener("blur", () => stop(false));
    window.addEventListener(
      "keydown",
      (e) => {
        if (drag && e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          stop(false);
          return;
        }
        if (e.target !== handle || e.metaKey || e.ctrlKey || e.altKey) return;
        const step = e.shiftKey ? 20 : 5,
          value = {
            ArrowLeft: preferred + step,
            ArrowRight: preferred - step,
            Home: min,
            End: max,
            0: initial,
          }[e.key];
        if (value === undefined) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        commit(value);
      },
      true,
    );
  }
  function configure(width, onCommit, onResize) {
    stop(false);
    mount();
    preferred = Number.isInteger(width) ? clamp(width) : initial;
    save = typeof onCommit === "function" ? onCommit : () => {};
    resized = typeof onResize === "function" ? onResize : () => {};
    show(preferred);
  }
  root.MKWInspectorWidth = Object.freeze({
    configure,
    context(host) {
      handle?.setAttribute("aria-controls", host.id);
    },
  });
})(globalThis);
