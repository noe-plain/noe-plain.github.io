(function (root) {
  "use strict";
  const defaultRatio = 70,
    minInspectorWidth = 300,
    maxInspectorWidth = 420;
  let current = null,
    preferred = defaultRatio,
    save = () => {},
    preferredWidth = 288,
    saveWidth = () => {};
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function configure(ratio, onCommit, width = preferredWidth, onWidthCommit) {
    current?.cancel();
    preferred = Number.isFinite(ratio) ? clamp(ratio, 20, 85) : defaultRatio;
    save = typeof onCommit === "function" ? onCommit : () => {};
    preferredWidth = Number.isFinite(width)
      ? clamp(width, minInspectorWidth, maxInspectorWidth)
      : 288;
    saveWidth = typeof onWidthCommit === "function" ? onWidthCommit : () => {};
    document.documentElement.style.setProperty(
      "--studio-inspector-width",
      `${preferredWidth}px`,
    );
    current?.refresh();
  }
  function detach() {
    current?.dispose();
    current = null;
  }
  function attach(host, header, panel, layers) {
    if (current?.host === host) return;
    detach();
    const context = document.createElement("section"),
      separator = document.createElement("div"),
      help = document.createElement("p");
    context.id = "designerContextPane";
    context.className = "inspector-context-pane";
    context.setAttribute("aria-label", "Kontext-Einstellungen");
    separator.className = "inspector-splitter";
    separator.tabIndex = 0;
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "horizontal");
    separator.setAttribute("aria-label", "Kontext-Einstellungen: Bereichshöhe");
    separator.setAttribute("aria-controls", context.id);
    separator.setAttribute("aria-describedby", "designerSplitHelp");
    separator.title =
      "Bereiche aufteilen · Ziehen oder ↑/↓ · Doppelklick oder 0: 70:30";
    separator.innerHTML = '<span aria-hidden="true"></span>';
    help.id = "designerSplitHelp";
    help.className = "visually-hidden";
    help.textContent =
      "Nach oben oder unten ziehen, um die Höhe der Kontext-Einstellungen und Ebenen aufzuteilen. Mit Pfeil hoch und runter anpassen; Umschalt verändert in grösseren Schritten. Pos1 und Ende wählen die Grenzen. Doppelklick oder Taste 0 stellt 70 zu 30 wieder her. Escape bricht das Ziehen ab.";
    host.prepend(context);
    context.append(header, panel, help);
    layers.before(separator);
    host.classList.add("split-inspector");
    layers.setAttribute("aria-label", "Ebenen");
    let shown = preferred,
      drag = null,
      pendingY = null,
      frame = 0;
    function limits() {
      const height = host.clientHeight - separator.offsetHeight;
      if (height <= 0) return { min: 20, max: 85, height: 0 };
      return {
        min: Math.max(
          20,
          Math.ceil((Math.min(180, height * 0.55) / height) * 100),
        ),
        max: Math.min(
          85,
          Math.floor((1 - Math.min(120, height * 0.35) / height) * 100),
        ),
        height,
      };
    }
    function refresh(value = preferred) {
      const { min, max } = limits();
      shown = clamp(Math.round(value), min, max);
      host.style.setProperty("--inspector-context-track", `${shown}fr`);
      host.style.setProperty("--inspector-layers-track", `${100 - shown}fr`);
      separator.setAttribute("aria-valuemin", min);
      separator.setAttribute("aria-valuemax", max);
      separator.setAttribute("aria-valuenow", shown);
      separator.setAttribute(
        "aria-valuetext",
        `Kontext-Einstellungen ${shown} Prozent, Ebenen ${100 - shown} Prozent`,
      );
    }
    function commit(value) {
      const next = clamp(Math.round(value), 20, 85),
        changed = preferred !== next;
      preferred = next;
      refresh();
      if (changed) save(preferred);
    }
    function flush() {
      frame = 0;
      if (!drag || pendingY === null) return;
      const { height } = limits();
      drag.moved ||= Math.abs(pendingY - drag.y) >= 2;
      if (height && drag.moved)
        refresh(drag.ratio + ((pendingY - drag.y) / height) * 100);
      pendingY = null;
    }
    function stop(accept) {
      if (!drag) return;
      cancelAnimationFrame(frame);
      frame = 0;
      if (accept) flush();
      const previous = drag.preferred,
        pointer = drag.pointer,
        moved = drag.moved;
      drag = null;
      pendingY = null;
      host.classList.remove("is-split-resizing");
      if (separator.hasPointerCapture(pointer))
        separator.releasePointerCapture(pointer);
      if (accept && moved) commit(shown);
      else {
        preferred = previous;
        refresh();
      }
    }
    separator.onpointerdown = (event) => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      separator.focus({ preventScroll: true });
      drag = {
        y: event.clientY,
        ratio: shown,
        preferred,
        pointer: event.pointerId,
        moved: false,
      };
      separator.setPointerCapture(event.pointerId);
      host.classList.add("is-split-resizing");
    };
    separator.onpointermove = (event) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      pendingY = event.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    separator.onpointerup = (event) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      pendingY = event.clientY;
      stop(true);
    };
    separator.onpointercancel = () => stop(false);
    separator.onlostpointercapture = () => stop(false);
    separator.ondblclick = () => commit(defaultRatio);
    function keys(event) {
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        event.stopPropagation();
        stop(false);
        return;
      }
      if (event.target !== separator) return;
      const { min, max } = limits(),
        step = event.shiftKey ? 10 : 2,
        value = {
          ArrowUp: shown - step,
          ArrowDown: shown + step,
          Home: min,
          End: max,
          0: defaultRatio,
        }[event.key];
      if (value === undefined || event.altKey || event.metaKey || event.ctrlKey)
        return;
      event.preventDefault();
      event.stopPropagation();
      commit(clamp(value, min, max));
    }
    separator.onkeydown = keys;
    const cancelKey = (event) => {
        if (drag && event.key === "Escape") keys(event);
      },
      blur = () => stop(false),
      observer = new ResizeObserver(() => refresh(drag ? shown : preferred));
    window.addEventListener("keydown", cancelKey);
    window.addEventListener("blur", blur);
    observer.observe(host);
    current = {
      host,
      refresh,
      cancel: () => stop(false),
      dispose() {
        stop(false);
        observer.disconnect();
        window.removeEventListener("keydown", cancelKey);
        window.removeEventListener("blur", blur);
      },
    };
    refresh();
  }
  function attachWidth(editor, sidebar) {
    if (
      !editor ||
      !sidebar ||
      editor.querySelector(":scope > .inspector-width-grip")
    )
      return;
    const grip = document.createElement("div");
    grip.className = "inspector-width-grip";
    grip.tabIndex = 0;
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-orientation", "vertical");
    grip.setAttribute(
      "aria-label",
      "Seitenleiste und Ebenen: gemeinsame Breite",
    );
    grip.setAttribute("aria-valuemin", String(minInspectorWidth));
    grip.setAttribute("aria-valuemax", String(maxInspectorWidth));
    grip.setAttribute("aria-controls", sidebar.id || "carouselSidebar");
    grip.title = `Gemeinsame Breite ändern · Ziehen oder ←/→ · ${minInspectorWidth}–${maxInspectorWidth} px`;
    grip.innerHTML = '<span aria-hidden="true"></span>';
    sidebar.before(grip);
    let drag = null,
      width = preferredWidth;
    const set = (value) => {
      width = clamp(
        Math.round(value),
        minInspectorWidth,
        Math.min(maxInspectorWidth, innerWidth - 360),
      );
      document.documentElement.style.setProperty(
        "--studio-inspector-width",
        `${width}px`,
      );
      grip.setAttribute("aria-valuenow", String(width));
      grip.setAttribute(
        "aria-valuemax",
        String(Math.min(maxInspectorWidth, innerWidth - 360)),
      );
      grip.setAttribute("aria-valuetext", `${width} Pixel`);
    };
    const finish = (accept) => {
      if (!drag) return;
      const previous = drag.width;
      drag = null;
      editor.classList.remove("is-width-resizing");
      if (accept) {
        preferredWidth = width;
        if (previous !== width) saveWidth(width);
      } else set(previous);
    };
    grip.onpointerdown = (event) => {
      if (event.button !== 0 || innerWidth <= 760) return;
      event.preventDefault();
      drag = { x: event.clientX, width: preferredWidth };
      grip.focus({ preventScroll: true });
      grip.setPointerCapture(event.pointerId);
      editor.classList.add("is-width-resizing");
    };
    grip.onpointermove = (event) => {
      if (!drag) return;
      set(drag.width - (event.clientX - drag.x));
    };
    grip.onpointerup = () => finish(true);
    grip.onpointercancel = grip.onlostpointercapture = () => finish(false);
    grip.onkeydown = (event) => {
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        finish(false);
        return;
      }
      const step = event.shiftKey ? 24 : 8;
      if (event.key === "ArrowLeft") set(width + step);
      else if (event.key === "ArrowRight") set(width - step);
      else if (event.key === "Home") set(minInspectorWidth);
      else if (event.key === "End")
        set(Math.min(maxInspectorWidth, innerWidth - 360));
      else return;
      event.preventDefault();
      event.stopPropagation();
      preferredWidth = width;
      saveWidth(width);
    };
    set(preferredWidth);
  }
  root.MKWInspectorSplit = { attach, attachWidth, detach, configure };
})(globalThis);
