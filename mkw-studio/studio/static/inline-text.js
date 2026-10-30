"use strict";
const MKWInlineText = (() => {
  const baselines = new WeakMap(),
    views = new WeakMap(),
    panels = new WeakMap();
  let fieldSequence = 0;
  function domBaseline(font) {
    let cache = baselines.get(fontStatus);
    if (!cache) baselines.set(fontStatus, (cache = new Map()));
    const family = fontFamily(font),
      key = JSON.stringify([family, !!fontStatus[font]]);
    if (cache.has(key)) return cache.get(key);
    const probe = document.createElement("span"),
      marker = document.createElement("i");
    Object.assign(probe.style, {
      position: "fixed",
      left: "0",
      top: "0",
      visibility: "hidden",
      pointerEvents: "none",
      display: "inline-block",
      whiteSpace: "pre",
      padding: "0",
      margin: "0",
      border: "0",
      font: `100px ${family}`,
      lineHeight: "100px",
      letterSpacing: "0",
      textTransform: "none",
    });
    marker.style.cssText =
      "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
    probe.append(document.createTextNode("Mg"), marker);
    document.body.append(probe);
    const result =
      (marker.getBoundingClientRect().top - probe.getBoundingClientRect().top) /
      100;
    probe.remove();
    if (cache.size >= 128) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  }
  function runs(o, runs, zoom) {
    return runs
      .map((run) => {
        const top =
          run.dy +
          carouselTypeBaseline(carouselMeasureContext, run.font, run.size) -
          domBaseline(run.font) * run.size;
        return `<span ${run.empty ? 'data-empty-run="true"' : ""} data-script="${run.script || "normal"}" ${run.virtualHyphen ? 'class="discretionary-hyphen" aria-hidden="true" contenteditable="false"' : ""} style="position:absolute;white-space:pre;left:${run.x * zoom}px;top:${top * zoom}px;font-family:${esc(fontFamily(run.font).replaceAll('"', "'"))};font-size:${run.size * zoom}px;line-height:1;letter-spacing:${run.letterSpacing * zoom}px;transform:scaleX(${run.glyphScale || 1});transform-origin:0 0;text-transform:${run.uppercase ? "uppercase" : "none"};color:${esc(run.color || o.color)};text-decoration:${[run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none"}">${run.empty ? '<br data-placeholder="true">' : esc(run.raw)}</span>`;
      })
      .join("");
  }
  function empty(o, line, zoom) {
    return runs(
      o,
      [
        {
          font: o.font,
          size: line.size,
          x: 0,
          dy: 0,
          letterSpacing: 0,
          empty: true,
        },
      ],
      zoom,
    );
  }
  function holdView(el) {
    const viewport = el?.closest("#workspace, #carouselViewport");
    if (!viewport || views.has(viewport)) return;
    const point = { x: viewport.scrollLeft, y: viewport.scrollTop };
    views.set(viewport, point);
    requestAnimationFrame(() => {
      views.delete(viewport);
      if (!viewport.isConnected || !el.isConnected) return;
      viewport.scrollLeft = point.x;
      viewport.scrollTop = point.y;
    });
  }
  function focus(el) {
    if (!el) return;
    holdView(el);
    el.focus({ preventScroll: true });
  }
  function bindPanel({
    host,
    field,
    button,
    active,
    start,
    stop,
    available = () => true,
    locked = false,
  }) {
    if (!host || !field) return;
    host.classList.add("text-content-editor");
    if (!field.id) field.id = "studioTextContent" + ++fieldSequence;
    button ||= document.createElement("button");
    button.type = "button";
    button.dataset.textEditAction = "";
    button.classList.add("text-edit-action");
    const group = document.createElement("div"),
      command = document.createElement("div"),
      label = document.createElement("label"),
      help = document.createElement("p"),
      wrapper = field.closest("label"),
      owner = host.closest("#stepPanel,#carouselProperties");
    group.className = "text-content-group";
    command.className = "text-content-command";
    label.htmlFor = field.id;
    label.textContent = "Textinhalt";
    help.className = "text-edit-help";
    help.id = field.id + "Help";
    help.setAttribute("role", "status");
    const descriptions = new Set(
      (field.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    descriptions.add(help.id);
    field.setAttribute("aria-describedby", [...descriptions].join(" "));
    if (wrapper && host.contains(wrapper)) wrapper.replaceWith(group);
    else field.before(group);
    command.append(label, button);
    group.append(command, field, help);
    host.querySelector(":scope > .type-section-heading")?.remove();
    host.querySelector(":scope > h3")?.remove();
    let fieldUsed = false;
    field.addEventListener("focus", () => {
      fieldUsed = true;
    });
    const state = { field, button, help, active, available, locked };
    panels.set(host, state);
    button.onpointerdown = (event) => {
      if (event.button === 0 && active()) event.preventDefault();
    };
    button.onclick = () => {
      if (locked || !available()) return;
      if (active()) {
        stop();
        owner
          ?.querySelector("[data-text-edit-action]")
          ?.focus({ preventScroll: true });
      } else
        start(
          fieldUsed
            ? { start: field.selectionStart, end: field.selectionEnd }
            : null,
        );
      refreshPanel(owner);
    };
    refreshPanel(host);
  }
  function refreshPanel(root) {
    if (!root) return;
    const hosts = root.matches(".text-content-editor")
      ? [root]
      : root.querySelectorAll(".text-content-editor");
    for (const host of hosts) {
      const state = panels.get(host);
      if (!state) continue;
      const editing = state.active(),
        usable = !state.locked && state.available(),
        text = editing ? "Fertig" : "Auf der Fläche",
        hint = state.locked
          ? "Text ist gesperrt. Entsperre die Ebene zum Bearbeiten."
          : !usable
            ? "Text zuerst auf dem Bild anzeigen, um ihn dort zu bearbeiten."
            : editing
              ? "Auf der Fläche aktiv. Escape beendet die Bearbeitung."
              : "Hier schreiben oder direkt auf der Fläche bearbeiten.";
      if (state.button.textContent !== text || state.button.childElementCount)
        state.button.textContent = text;
      state.button.setAttribute(
        "aria-label",
        editing
          ? "Fertig · Textbearbeitung auf der Fläche beenden"
          : "Text auf der Fläche bearbeiten",
      );
      state.button.setAttribute("aria-pressed", String(editing));
      state.button.disabled = !usable;
      if (state.help.textContent !== hint) state.help.textContent = hint;
      host.dataset.textEditing = String(editing);
    }
  }
  return { domBaseline, runs, empty, holdView, focus, bindPanel, refreshPanel };
})();
