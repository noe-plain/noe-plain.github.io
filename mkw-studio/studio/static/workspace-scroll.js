"use strict";
// View-only scroll controls. Rendered artwork and stored document geometry are untouched.
window.MKWWorkspaceScroll = (() => {
  const entries = [];
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  function update() {
    frame = 0;
    for (const entry of entries) {
      const { viewport, layer, bars } = entry;
      const rect = viewport.getBoundingClientRect();
      layer.hidden = !rect.width || !rect.height || !p.boards.length;
      if (layer.hidden) continue;
      const style = getComputedStyle(viewport);
      const radius = Math.max(
        ...[
          "borderTopLeftRadius",
          "borderTopRightRadius",
          "borderBottomLeftRadius",
          "borderBottomRightRadius",
        ].map((key) => parseFloat(style[key]) || 0),
      );
      const inset = Math.max(24, radius);
      layer.style.left = rect.left + "px";
      layer.style.top = rect.top + "px";
      layer.style.width = rect.width + "px";
      layer.style.height = rect.height + "px";
      for (const bar of bars) {
        const horizontal = bar.axis === "x";
        const size = horizontal ? viewport.clientWidth : viewport.clientHeight;
        const total = horizontal ? viewport.scrollWidth : viewport.scrollHeight;
        const position = horizontal ? viewport.scrollLeft : viewport.scrollTop;
        const length = Math.max(0, size - inset * 2);
        const maximum = Math.max(0, total - size);
        bar.track.hidden = maximum < 1 || length < 48;
        if (bar.track.hidden) continue;
        const thumb = Math.min(length, Math.max(44, (length * size) / total));
        bar.maximum = maximum;
        bar.travel = length - thumb;
        bar.track.style[horizontal ? "left" : "top"] = inset + "px";
        bar.track.style[horizontal ? "width" : "height"] = length + "px";
        bar.handle.style[horizontal ? "width" : "height"] = thumb + "px";
        bar.handle.style.transform = `translate${horizontal ? "X" : "Y"}(${(bar.travel * position) / maximum}px)`;
        bar.handle.setAttribute("aria-valuemax", String(Math.round(maximum)));
        bar.handle.setAttribute("aria-valuenow", String(Math.round(position)));
        bar.handle.setAttribute(
          "aria-valuetext",
          Math.round((position / maximum) * 100) + " %",
        );
      }
    }
  }
  function sync() {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry.viewport.isConnected) {
        entry.observer.disconnect();
        entry.viewport.removeEventListener("scroll", schedule);
        entry.layer.remove();
        entries.splice(i, 1);
      }
    }
    for (const [id, content, name] of [
      ["workspace", "postPasteboard", "FD-Kampagnen"],
      ["carouselViewport", "carouselPasteboard", "Designer"],
    ]) {
      const viewport = document.getElementById(id);
      if (!viewport || entries.some((entry) => entry.viewport === viewport))
        continue;
      const layer = document.createElement("aside");
      layer.className = "workspace-scroll-controls";
      layer.setAttribute("aria-label", name + ": Arbeitsfläche scrollen");
      layer.hidden = true;
      const entry = { viewport, layer, bars: [] };
      for (const axis of ["x", "y"]) {
        const horizontal = axis === "x";
        const track = document.createElement("div");
        track.className = "workspace-scroll-track scroll-" + axis;
        const handle = document.createElement("div");
        handle.className = "workspace-scroll-handle";
        handle.tabIndex = 0;
        handle.setAttribute("role", "scrollbar");
        handle.setAttribute(
          "aria-label",
          horizontal
            ? "Arbeitsfläche horizontal scrollen"
            : "Arbeitsfläche vertikal scrollen",
        );
        handle.setAttribute("aria-controls", id);
        handle.setAttribute(
          "aria-orientation",
          horizontal ? "horizontal" : "vertical",
        );
        handle.setAttribute("aria-valuemin", "0");
        const bar = { axis, track, handle, maximum: 0, travel: 0 };
        const read = () =>
          horizontal ? viewport.scrollLeft : viewport.scrollTop;
        const maximum = () =>
          Math.max(
            0,
            horizontal
              ? viewport.scrollWidth - viewport.clientWidth
              : viewport.scrollHeight - viewport.clientHeight,
          );
        const write = (value) => {
          viewport.scrollControlUntil = performance.now() + 200;
          viewport[horizontal ? "scrollLeft" : "scrollTop"] = Math.max(
            0,
            Math.min(maximum(), value),
          );
          schedule();
        };
        let drag = null;
        track.onpointerdown = (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          handle.focus({ preventScroll: true });
          const coordinate = horizontal ? event.clientX : event.clientY;
          if (event.target === handle) {
            drag = {
              coordinate,
              value: read(),
              maximum: bar.maximum,
              travel: bar.travel,
            };
            handle.setPointerCapture(event.pointerId);
          } else {
            const r = handle.getBoundingClientRect();
            write(
              read() +
                (coordinate < (horizontal ? r.left : r.top) ? -1 : 1) *
                  (horizontal ? viewport.clientWidth : viewport.clientHeight) *
                  0.85,
            );
          }
        };
        handle.onpointermove = (event) => {
          if (!drag || !drag.travel) return;
          write(
            drag.value +
              (((horizontal ? event.clientX : event.clientY) -
                drag.coordinate) /
                drag.travel) *
                drag.maximum,
          );
        };
        handle.onpointerup =
          handle.onpointercancel =
          handle.onlostpointercapture =
            () => {
              drag = null;
            };
        handle.onkeydown = (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const step = horizontal
            ? viewport.clientWidth
            : viewport.clientHeight;
          const values = {
            Home: 0,
            End: maximum(),
            PageUp: read() - step * 0.85,
            PageDown: read() + step * 0.85,
          };
          values[horizontal ? "ArrowLeft" : "ArrowUp"] = read() - 40;
          values[horizontal ? "ArrowRight" : "ArrowDown"] = read() + 40;
          if (!(event.key in values)) return;
          event.preventDefault();
          event.stopPropagation();
          write(values[event.key]);
        };
        track.append(handle);
        layer.append(track);
        entry.bars.push(bar);
      }
      document.body.append(layer);
      entries.push(entry);
      viewport.addEventListener("scroll", schedule, { passive: true });
      const observer = new ResizeObserver(schedule);
      entry.observer = observer;
      observer.observe(viewport);
      const canvas = document.getElementById(content);
      if (canvas) observer.observe(canvas);
    }
    schedule();
  }
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("resize", schedule);
  sync();
  return Object.freeze({ sync });
})();
