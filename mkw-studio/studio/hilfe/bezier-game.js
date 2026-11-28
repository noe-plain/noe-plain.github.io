(function (root) {
  "use strict";
  function mount(host) {
    const M = root.MKWBezierLessonModel,
      Path = root.MKWPath;
    let state = M.create(),
      drag = null,
      frame = 0,
      hints = false;
    host.innerHTML = `
<div class="bezier-heading">
  <label>Übung<select data-lesson></select></label><span data-count></span>
</div>
<h3 data-title></h3>
<p data-goal></p>
<div class="bezier-controls" role="group" aria-label="Zeichenwerkzeug">
  <button type="button" data-tool="draw" aria-pressed="true">
    Pfad zeichnen</button
  ><button type="button" data-tool="edit" aria-pressed="false">
    Punkte bearbeiten</button
  ><label><input type="checkbox" data-hints />Zielpunkte zeigen</label><label><input type="checkbox" data-energy />Kurvenenergie</label>
</div>
<p class="bezier-legend">
  Gestrichelt: Zielkontur. Durchgezogen: deine Linie. Wähle einen Punkt oder
  Griff und verschiebe ihn mit den Pfeiltasten; Shift + Pfeil macht grössere
  Schritte.
</p>
<svg
  class="bezier-stage"
  viewBox="0 0 600 360"
  role="group"
  aria-label="Zeichenübung. Tab führt zu Punkten und Griffen; Pfeiltasten verschieben sie."
  tabindex="0"
>
  <g data-target aria-hidden="true"></g>
  <g data-lines aria-hidden="true"></g>
  <g data-comb aria-hidden="true"></g><g data-nodes></g>
</svg>
<div class="bezier-controls" role="group" aria-label="Pfadaktionen">
  <button type="button" data-action="finish">Linie beenden</button
  ><button type="button" data-action="close">Pfad schliessen</button
  ><button type="button" data-action="resume">Hier weiterzeichnen</button
  ><button type="button" data-action="undo">Schritt zurück</button
  ><button type="button" data-action="redo">Schritt vor</button
  ><button type="button" data-action="cancel">Zeichnen abbrechen</button><button type="button" data-action="reset">Neu beginnen</button>
</div>
<details class="wiki-reference bezier-numbers">
  <summary>Punkte und Griffe ohne Ziehen bearbeiten</summary>
  <label
    >Ausgewählter Punkt<select data-point>
      <option value="">Noch kein Punkt</option>
    </select></label
  >
  <div class="bezier-point-fields">
    <label
      >X<input type="number" data-value="x" min="0" max="600" step="1" /></label
    ><label
      >Y<input type="number" data-value="y" min="0" max="360" step="1" /></label
    ><label
      >Punktart<select data-kind>
        <option value="corner">Ecke</option>
        <option value="curve">Kurve</option>
      </select></label
    >
  </div>
  <div class="bezier-point-fields" data-handle-fields>
    <label
      >Eingang X<input
        type="number"
        data-value="in.x"
        min="-1200"
        max="1800"
        step="1" /></label
    ><label
      >Eingang Y<input
        type="number"
        data-value="in.y"
        min="-1200"
        max="1800"
        step="1" /></label
    ><label
      >Ausgang X<input
        type="number"
        data-value="out.x"
        min="-1200"
        max="1800"
        step="1" /></label
    ><label
      >Ausgang Y<input
        type="number"
        data-value="out.y"
        min="-1200"
        max="1800"
        step="1"
    /></label>
  </div>
  <div class="bezier-controls">
    <label
      >Griffe<select data-link>
        <option value="mirror">Spiegelsymmetrisch</option>
        <option value="direction">Richtung verbunden</option>
        <option value="free">Frei</option>
      </select></label
    ><label><input type="checkbox" data-snap />45° einrasten</label>
  </div>
  <form data-add class="bezier-controls">
    <label
      >Neuer Punkt X<input
        name="x"
        type="number"
        value="100"
        min="0"
        max="600"
        required /></label
    ><label
      >Neuer Punkt Y<input
        name="y"
        type="number"
        value="90"
        min="0"
        max="360"
        required /></label
    ><button type="submit">Punkt setzen</button>
  </form>
  <div class="bezier-controls">
    <label>Mit offenem Ende verbinden<select data-join></select></label
    ><button type="button" data-action="join">Verbinden</button>
  </div>
</details>
<p class="wiki-tip" data-tip></p>
<div class="bezier-controls">
  <button type="button" class="bezier-primary" data-action="check">
    Ergebnis prüfen</button
  ><button type="button" data-action="next">Nächste Übung</button>
</div>
<p class="bezier-feedback" role="status" aria-live="polite" data-feedback>
  Dein Projekt bleibt unverändert. Diese Übung wird nicht gespeichert.
</p>
`;
    const $ = (selector) => host.querySelector(selector),
      svg = $("svg"),
      feedback = $("[data-feedback]");
    $("[data-goal]").after($("[data-tip]"));
    $(".bezier-numbers").before(
      $(".bezier-primary").closest(".bezier-controls"),
      feedback,
    );

    for (const [i, l] of M.lessons.entries())
      $("[data-lesson]").add(new Option(`${i + 1} · ${l.name}`, i));
    function announce(message) {
      feedback.textContent = message;
      feedback.dataset.result = "";
    }
    function node() {
      const s = state.selected;
      return s ? state.paths[s.path]?.points[s.node] : null;
    }
    const hit = (pi, ni, key = "node") => `${pi}:${ni}:${key}`;
    function renderStage() {
      frame = 0;
      const focus = svg.contains(document.activeElement)
        ? document.activeElement.dataset.hit
        : null;
      const radius = Math.max(
        14,
        (22 * 600) / (svg.getBoundingClientRect().width || 600),
      );
      $("[data-target]").innerHTML = M.lessons[state.lesson].target
        .map(
          (p) =>
            `<path class="bezier-target" d="${M.d(p)}"/>${
              hints
                ? p.points
                    .map(
                      (n, i) =>
                        `${["in", "out"]
                          .filter((k) => n[k])
                          .map(
                            (k) =>
                              `<path class="bezier-target" d="M${n.x} ${n.y}L${n[k].x} ${n[k].y}"/><circle class="bezier-target-node" cx="${n[k].x}" cy="${n[k].y}" r="4"/>`,
                          )
                          .join(
                            "",
                          )}<circle class="bezier-target-node" cx="${n.x}" cy="${n.y}" r="7"/><text x="${n.x + 13}" y="${n.y - 12}">${i + 1}</text>`,
                    )
                    .join("")
                : ""
            }`,
        )
        .join("");
      $("[data-lines]").innerHTML = state.paths
        .map((p) => `<path class="bezier-line" d="${M.d(p)}"/>`)
        .join("");
      let comb = "";
      const selectedPath = state.paths[state.selected?.path];
      if ($("[data-energy]").checked && selectedPath) {
        const points = selectedPath.points,
          segments = points.length - (selectedPath.closed ? 0 : 1),
          samples = [];
        for (let i = 0; i < segments; i++)
          samples.push(
            ...Path.curvatureSamples(
              points[i],
              points[(i + 1) % points.length],
              Math.max(3, Math.min(20, Math.floor(240 / segments))),
            ),
          );
        const peak = Math.max(1e-9, ...samples.map((p) => Math.abs(p.k)));
        for (const p of samples) {
          const length = (42 * p.k) / peak;
          comb += `M${p.x} ${p.y}L${p.x + p.nx * length} ${p.y + p.ny * length}`;
        }
      }
      $("[data-comb]").innerHTML = comb
        ? `<path class="bezier-comb" d="${comb}"/>`
        : "";
      let markup = "";
      const grip = (p, pi, ni, key, selected) =>
        `<g role="button" tabindex="0" data-hit="${hit(pi, ni, key)}" aria-label="${key === "node" ? "Punkt" : key === "in" ? "Eingangsgriff" : "Ausgangsgriff"} ${ni + 1}, Pfad ${pi + 1}; X ${Math.round(p.x)}, Y ${Math.round(p.y)}"><circle class="bezier-hit" cx="${p.x}" cy="${p.y}" r="${radius}"/>${key === "node" ? `<rect class="bezier-node ${selected ? "is-selected" : ""}" x="${p.x - 6}" y="${p.y - 6}" width="12" height="12"/>` : `<circle class="bezier-handle" cx="${p.x}" cy="${p.y}" r="6"/>`}</g>`;
      state.paths.forEach((p, pi) =>
        p.points.forEach((n, ni) => {
          const selected =
            state.selected?.path === pi && state.selected.node === ni;
          if (selected)
            for (const key of ["in", "out"])
              if (n[key]) {
                markup += `<path class="bezier-guide" d="M${n.x} ${n.y}L${n[key].x} ${n[key].y}"/>`;
                markup += grip(n[key], pi, ni, key, false);
              }
          markup += grip(n, pi, ni, "node", selected);
        }),
      );
      $("[data-nodes]").innerHTML = markup;
      if (focus)
        svg
          .querySelector(`[data-hit="${focus}"]`)
          ?.focus({ preventScroll: true });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(renderStage);
    }
    function render() {
      const lesson = M.lessons[state.lesson],
        n = node(),
        p = state.paths[state.selected?.path];
      $("[data-title]").textContent = lesson.name;
      $("[data-goal]").textContent = lesson.goal;
      $("[data-tip]").textContent = lesson.tip;
      $("[data-count]").textContent =
        `${state.paths.reduce((sum, p) => sum + p.points.length, 0)} Punkte · ${lesson.target.reduce((sum, p) => sum + p.points.length, 0) || "keine"} Zielpunkte`;
      for (const b of host.querySelectorAll("[data-tool]"))
        b.setAttribute("aria-pressed", String(b.dataset.tool === state.tool));
      const options = state.paths
        .flatMap((p, pi) =>
          p.points.map(
            (n, ni) =>
              `<option value="${pi}:${ni}"${state.selected?.path === pi && state.selected.node === ni ? " selected" : ""}>Pfad ${pi + 1} · Punkt ${ni + 1}${ni === 0 ? " · Anfang" : ni === p.points.length - 1 ? " · Ende" : ""}</option>`,
          ),
        )
        .join("");
      const list = $("[data-point]");
      list.innerHTML = options || '<option value="">Noch kein Punkt</option>';
      list.disabled = !options;
      for (const input of host.querySelectorAll("[data-value]")) {
        const [key, axis] = input.dataset.value.split("."),
          value = axis ? n?.[key]?.[axis] : n?.[key];
        input.disabled = value === undefined;
        if (document.activeElement !== input)
          input.value =
            value === undefined ? "" : Math.round(value * 100) / 100;
      }
      $("[data-kind]").disabled = !n;
      $("[data-kind]").value = n && (n.in || n.out) ? "curve" : "corner";
      $("[data-handle-fields]").hidden = !n || !(n.in || n.out);
      $("[data-action=cancel]").disabled = state.draft === null;
      $("[data-action=undo]").disabled = !state.past.length;
      $("[data-action=redo]").disabled = !state.future.length;
      $("[data-action=resume]").disabled =
        !p ||
        p.closed ||
        ![0, p.points.length - 1].includes(state.selected?.node);
      $("[data-action=close]").disabled = !p || p.closed || p.points.length < 3;
      $("[data-action=finish]").disabled =
        state.draft === null || !p || p.points.length < 2;
      const join = $("[data-join]");
      join.innerHTML = state.paths
        .flatMap((p, i) =>
          !p.closed && i !== state.selected?.path
            ? [
                `<option value="${i}:0">Pfad ${i + 1} · Anfang</option>`,
                `<option value="${i}:${p.points.length - 1}">Pfad ${i + 1} · Ende</option>`,
              ]
            : [],
        )
        .join("");
      join.disabled = !join.options.length;
      $("[data-action=join]").disabled =
        join.disabled ||
        !p ||
        p.closed ||
        ![0, p.points.length - 1].includes(state.selected?.node);
      $("[data-action=next]").disabled = state.lesson === M.lessons.length - 1;
      schedule();
    }
    function modifiers(event = {}) {
      const mode = $("[data-link]").value;
      return {
        shiftKey: event.shiftKey || $("[data-snap]").checked,
        ctrlKey: event.ctrlKey || mode === "direction",
        altKey: event.altKey || mode === "free",
      };
    }
    function change(fn, message) {
      M.change(state, fn);
      render();
      if (message) announce(message);
    }
    function select(pi, ni) {
      state.selected = { path: pi, node: ni };
      render();
    }
    function switchLesson(index) {
      if (drag) cancelDrag();
      state = M.create(index);
      hints = false;
      $("[data-link]").value = "mirror";
      $("[data-snap]").checked = false;
      $("[data-energy]").checked = false;
      $("[data-hints]").checked = false;
      $("[data-lesson]").value = index;
      render();
      announce(
        `Übung ${index + 1}: ${M.lessons[index].name}. ${M.lessons[index].goal}`,
      );
    }
    $("[data-lesson]").onchange = (e) => switchLesson(+e.target.value);
    $("[data-hints]").onchange = (e) => {
      hints = e.target.checked;
      schedule();
    };
    $("[data-energy]").onchange = () => {
      schedule();
      announce(
        $("[data-energy]").checked
          ? "Kurvenenergie: Die Hilfslinien zeigen die relative Krümmung des gewählten Pfads. Sie verändern die Linie nicht."
          : "Kurvenenergie ausgeblendet.",
      );
    };
    $("[data-point]").onchange = (e) => {
      const [pi, ni] = e.target.value.split(":").map(Number);
      select(pi, ni);
    };
    $("[data-kind]").onchange = (e) =>
      change(() => {
        const n = node();
        if (!n) return;
        if (e.target.value === "corner") {
          delete n.in;
          delete n.out;
        } else {
          n.in = { x: n.x - 65, y: n.y };
          n.out = { x: n.x + 65, y: n.y };
        }
      }, "Punktart geändert.");
    for (const input of host.querySelectorAll("[data-value]"))
      input.onchange = () => {
        if (!input.checkValidity() || input.value === "") {
          input.reportValidity();
          return;
        }
        const [key, axis] = input.dataset.value.split("."),
          value = +input.value;
        change(() => {
          const n = node();
          if (!n) return;
          if (!axis)
            M.moveNode(n, key === "x" ? value : n.x, key === "y" ? value : n.y);
          else {
            const position = { ...n[key], [axis]: value };
            Path.linkedHandle(n, key, position, modifiers(), M.copy(n), false);
          }
        }, "Punkt oder Griff geändert.");
      };
    $("[data-add]").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!form.reportValidity()) return;
      let ok;
      change(() => {
        state.tool = "draw";
        ok = M.add(state, +form.elements.x.value, +form.elements.y.value);
      }, null);
      announce(
        ok
          ? "Punkt gesetzt. Beende die Linie oder setze weitere Punkte."
          : "Maximal 80 Punkte und acht Pfade pro Übung.",
      );
    };
    host.addEventListener("click", (e) => {
      const tool = e.target.closest("[data-tool]");
      if (tool) {
        state.tool = tool.dataset.tool;
        render();
        return;
      }
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "undo" || action === "redo") {
        M.undo(state, action === "redo");
        render();
        announce(
          action === "undo"
            ? "Schritt zurückgenommen."
            : "Schritt wiederhergestellt.",
        );
      }
      if (action === "cancel") {
        M.cancel(state);
        render();
        announce("Zeichnen abgebrochen. Vorhandene Linien bleiben erhalten.");
      }
      if (action === "reset") switchLesson(state.lesson);
      if (action === "next") switchLesson(state.lesson + 1);
      if (action === "check") {
        const result = M.check(state);
        announce(result.message);
        feedback.dataset.result = result.ok ? "success" : "retry";
      }
      if (action === "finish" || action === "close")
        change(
          () => M.finish(state, action === "close"),
          action === "close" ? "Pfad geschlossen." : "Offene Linie beendet.",
        );
      if (action === "resume")
        change(
          () => M.resume(state, state.selected.path, state.selected.node),
          "Offenes Ende gewählt. Zeichne weiter; Escape verwirft die Fortsetzung.",
        );
      if (action === "join")
        change(() => {
          if (state.draft === null)
            M.resume(state, state.selected.path, state.selected.node);
          const [pi, ni] = $("[data-join]").value.split(":").map(Number);
          M.connect(state, pi, ni);
        }, "Linien verbunden.");
    });
    function position(e) {
      const rect = svg.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.min(600, ((e.clientX - rect.left) * 600) / rect.width),
        ),
        y: Math.max(
          0,
          Math.min(360, ((e.clientY - rect.top) * 360) / rect.height),
        ),
      };
    }
    function cancelDrag() {
      if (!drag) return;
      Object.assign(state, drag.before);
      drag = null;
      render();
      announce("Ziehen abgebrochen. Der vorherige Stand bleibt erhalten.");
    }
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      svg.focus({ preventScroll: true });
      const target = e.target.closest("[data-hit]"),
        pt = position(e),
        before = M.snapshot(state);
      let kind = "new";
      if (target) {
        const [pi, ni, key] = target.dataset.hit.split(":");
        const p = state.paths[+pi];
        if (key === "node" && state.tool === "draw") {
          if (state.draft === +pi && +ni === 0 && p.points.length >= 3) {
            change(() => M.finish(state, true), "Pfad geschlossen.");
            return;
          }
          if (
            state.draft !== null &&
            state.draft !== +pi &&
            [0, p.points.length - 1].includes(+ni) &&
            !p.closed
          ) {
            change(() => M.connect(state, +pi, +ni), "Linien verbunden.");
            return;
          }
          if (
            state.draft === null &&
            [0, p.points.length - 1].includes(+ni) &&
            !p.closed
          ) {
            M.resume(state, +pi, +ni);
            M.remember(state, before);
            render();
            announce("Offenes Ende gewählt. Zeichne weiter.");
            return;
          }
        }
        state.selected = { path: +pi, node: +ni };
        kind = key;
      } else if (state.tool === "draw") {
        if (!M.add(state, pt.x, pt.y)) {
          announce("Maximal 80 Punkte und acht Pfade pro Übung.");
          return;
        }
      } else {
        return;
      }
      drag = { id: e.pointerId, before, start: pt, base: M.copy(node()), kind };
      svg.setPointerCapture(e.pointerId);
      render();
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const pt = position(e),
        n = node();
      if (!n) return;
      if (drag.kind === "node")
        M.moveNode(
          n,
          Math.max(0, Math.min(600, drag.base.x + pt.x - drag.start.x)),
          Math.max(0, Math.min(360, drag.base.y + pt.y - drag.start.y)),
        );
      else if (drag.kind === "new") {
        if (Math.hypot(pt.x - drag.start.x, pt.y - drag.start.y) > 3)
          Path.linkedHandle(n, "out", pt, modifiers(e), drag.base);
      } else
        Path.linkedHandle(n, drag.kind, pt, modifiers(e), drag.base, false);
      schedule();
    });
    svg.addEventListener("pointerup", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const before = drag.before;
      drag = null;
      M.remember(state, before);
      render();
      announce(
        "Punkt oder Griff gesetzt. Prüfe die Zielkontur oder zeichne weiter.",
      );
    });
    svg.addEventListener("pointercancel", cancelDrag);
    svg.addEventListener("lostpointercapture", () => {
      if (drag) cancelDrag();
    });
    host.addEventListener("keydown", (e) => {
      const input = e.target.matches("input,select,textarea");
      if (input) return;
      if (e.key === "Escape" && (drag || state.draft !== null)) {
        e.preventDefault();
        e.stopPropagation();
        if (drag) cancelDrag();
        else {
          M.cancel(state);
          render();
          announce("Zeichnen abgebrochen. Vorhandene Linien bleiben erhalten.");
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.stopPropagation();
        M.undo(state, e.shiftKey);
        render();
        return;
      }
      if (e.target === svg && e.key === "Enter" && state.draft !== null) {
        e.preventDefault();
        e.stopPropagation();
        if (state.paths[state.draft].points.length >= 2)
          change(() => M.finish(state), "Offene Linie beendet.");
        else
          announce(
            "Setze mindestens zwei Punkte, bevor du die Linie beendest.",
          );
        return;
      }
      if (e.key === "Backspace" && state.draft !== null) {
        e.preventDefault();
        e.stopPropagation();
        M.undo(state);
        render();
        announce("Letzten Zeichenschritt zurückgenommen.");
        return;
      }
      const hit = e.target.closest("[data-hit]");
      if (!hit) return;
      const [pi, ni, key] = hit.dataset.hit.split(":");
      state.selected = { path: +pi, node: +ni };
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(+pi, +ni);
        announce(
          "Punkt gewählt. Nutze die Zahlenfelder oder Pfeiltasten zum Bearbeiten.",
        );
        return;
      }
      const delta = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[e.key];
      if (!delta) return;
      e.preventDefault();
      const amount = e.shiftKey ? 10 : 1;
      change(() => {
        const n = node(),
          pt = key === "node" ? n : n[key],
          position = {
            x: pt.x + delta[0] * amount,
            y: pt.y + delta[1] * amount,
          };
        if (key === "node")
          M.moveNode(
            n,
            Math.max(0, Math.min(600, position.x)),
            Math.max(0, Math.min(360, position.y)),
          );
        else
          Path.linkedHandle(
            n,
            key,
            position,
            modifiers({ ctrlKey: e.ctrlKey, altKey: e.altKey }),
            M.copy(n),
            false,
          );
      }, "Punkt oder Griff verschoben.");
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(svg);
    render();
    return {
      close() {
        if (drag) cancelDrag();
        resize.disconnect();
        if (frame) cancelAnimationFrame(frame);
        host.replaceChildren();
      },
    };
  }
  root.MKWBezierLesson = Object.freeze({ mount });
})(globalThis);
