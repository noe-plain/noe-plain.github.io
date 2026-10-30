"use strict";
const MKWArtboardUI = (() => {
  const policy = MKWCarouselPolicy;
  let moveContent = true;
  const boundsOf = (o) => carouselObjectBounds(o);
  const owned = (c, index) =>
    c.objects.filter((o) => policy.owner(c, boundsOf(o)) === index);
  function syncBoards() {
    p.boards.forEach((b, i) => {
      const a = policy.frame(p.carousel, i);
      b.carouselSlide = i;
      b.w = a.w;
      b.h = a.h;
    });
  }
  function enable() {
    const c = p.carousel;
    if (policy.isFree(c)) return;
    carouselEndText();
    checkpoint();
    c.artboards = policy
      .frames(c)
      .map((a, i) => ({ ...a, id: uid(), name: `Zeichenfläche ${i + 1}` }));
    c.layout = "free";
    carouselUI.ids.clear();
    carouselSelection = null;
    carouselUI.slide = 0;
    changed();
    status(
      "Freie Zeichenflächen aktiviert. Bisherige Positionen und Inhalte bleiben erhalten.",
    );
  }
  function entry(host) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "designerFreeLayout";
    button.textContent = "Freie Zeichenflächen verwenden";
    button.onclick = enable;
    host.append(button);
  }
  function plan(index, values) {
    const c = p.carousel,
      a = { ...c.artboards[index], ...values },
      candidate = {
        ...c,
        artboards: c.artboards.map((old, i) => (i === index ? a : old)),
      };
    if (!a.name?.trim()) throw Error("Gib der Zeichenfläche einen Namen.");
    if (c.artboards.some((b, i) => i !== index && policy.intersects(a, b)))
      throw Error(
        "Diese Position überschneidet sich mit einer anderen Zeichenfläche. Wähle eine freie Stelle.",
      );
    if (!policy.validBoards(candidate))
      throw Error(
        "Position: ab 0 px und höchstens 100 000 px Gesamtbereich. Formate: 240–4000 px. Schutzzonen müssen ins Format passen; Zeichenflächen dürfen sich nicht überlappen.",
      );
    return a;
  }
  function apply(index, values, withContent = moveContent) {
    const c = p.carousel,
      before = c.artboards[index],
      next = plan(index, values),
      members = withContent ? owned(c, index) : [],
      dx = next.x - before.x,
      dy = next.y - before.y;
    if (JSON.stringify(before) === JSON.stringify(next)) return false;
    if (
      members.some(
        (o) => Math.abs(o.x + dx) > 100000 || Math.abs(o.y + dy) > 100000,
      )
    )
      throw Error(
        "Ein Inhalt würde zu weit ausserhalb liegen. Verschiebe ihn zuerst näher an die Zeichenfläche oder deaktiviere „Inhalt mitverschieben“.",
      );
    carouselEndText();
    checkpoint();
    Object.assign(before, next);
    for (const o of members) {
      o.x += dx;
      o.y += dy;
    }
    syncBoards();
    changed();
    return true;
  }
  function vacancy(format, preferred) {
    const c = p.carousel,
      extent = policy.extent(c),
      candidates = [
        preferred,
        { x: 0, y: extent.h + 120 },
        { x: extent.w + 120, y: 0 },
      ];
    for (const point of candidates) {
      const next = { ...format, ...point };
      if (
        next.x >= 0 &&
        next.y >= 0 &&
        next.x + next.w <= 100000 &&
        next.y + next.h <= 100000 &&
        !c.artboards.some((a) => policy.intersects(a, next))
      )
        return point;
    }
    throw Error(
      "Für eine weitere Zeichenfläche fehlt Platz. Verschiebe vorhandene Flächen näher zusammen.",
    );
  }
  function insert(index, duplicate = null) {
    const c = p.carousel;
    if (c.n >= policy.maxSlides) return;
    const source =
        c.artboards[duplicate ?? carouselUI.slide ?? Math.max(0, c.n - 1)],
      point = vacancy(source, { x: source.x + source.w + 120, y: source.y }),
      members = duplicate === null ? [] : owned(c, duplicate),
      copies = members.map((o) => ({
        ...clone(o),
        id: uid(),
        x: o.x + point.x - source.x,
        y: o.y + point.y - source.y,
      }));
    if (c.objects.length + copies.length > 500) {
      status(
        "Diese Kopie würde die Grenze von 500 Ebenen überschreiten. Entferne nicht benötigte Ebenen oder füge eine leere Zeichenfläche hinzu.",
      );
      return;
    }
    if (copies.some((o) => Math.abs(o.x) > 100000 || Math.abs(o.y) > 100000)) {
      status(
        "Für diese Kopie fehlt Platz. Verschiebe vorhandene Flächen näher zusammen.",
      );
      return;
    }
    MKWTemplateModel.remapLinks(members, copies);
    carouselEndText();
    checkpoint();
    const frame = {
      ...source,
      ...point,
      id: uid(),
      name: (duplicate === null
        ? `Zeichenfläche ${c.n + 1}`
        : `${source.name} Kopie`
      ).slice(0, 80),
    };
    c.artboards.splice(index, 0, frame);
    c.n++;
    c.objects.push(...copies);
    p.boards.splice(index, 0, basicBoard(p.images[0], frame.w, frame.h));
    syncBoards();
    carouselUI.ids.clear();
    carouselSelection = null;
    carouselUI.slide = index;
    changed();
    carouselSlideCenter(index);
  }
  function removePrompt(name) {
    const trigger = document.activeElement,
      dialog = document.createElement("dialog");
    dialog.id = "designerRemoveArtboard";
    dialog.setAttribute("aria-labelledby", "designerRemoveArtboardTitle");
    dialog.innerHTML = `<h2 id="designerRemoveArtboardTitle">„${esc(name)}“ entfernen?</h2><p>Wähle, ob die zugeordneten Inhalte auf der Montagefläche bleiben sollen. Elemente, die auch andere Zeichenflächen überdecken, und das MKW-Logo bleiben erhalten.</p><div class="studio-feedback-actions"><button data-artboard-remove="cancel" autofocus>Abbrechen</button><button data-artboard-remove="keep">Inhalt behalten</button><button data-artboard-remove="delete" class="studio-destructive">Mit Inhalt entfernen</button></div>`;
    document.body.append(dialog);
    for (const b of dialog.querySelectorAll("button"))
      b.onclick = () => dialog.close(b.dataset.artboardRemove);
    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => {
          const value = dialog.returnValue;
          dialog.remove();
          if (trigger?.isConnected) trigger.focus({ preventScroll: true });
          resolve(value);
        },
        { once: true },
      );
      dialog.showModal();
    });
  }
  async function remove() {
    const c = p.carousel,
      index = carouselUI.slide;
    if (index === null || c.n <= 1) return;
    const frame = c.artboards[index],
      identity = p,
      choice = await removePrompt(frame.name);
    if (
      choice === "cancel" ||
      !choice ||
      p !== identity ||
      !c.artboards.includes(frame)
    )
      return;
    const members = new Set(owned(c, index).map((o) => o.id));
    carouselEndText();
    checkpoint();
    if (choice === "delete")
      c.objects = c.objects.filter(
        (o) =>
          o.type === "logo" ||
          !members.has(o.id) ||
          c.artboards.some(
            (a, i) => i !== index && policy.intersects(a, boundsOf(o)),
          ),
      );
    c.artboards.splice(index, 1);
    p.boards.splice(index, 1);
    c.n--;
    syncBoards();
    for (const o of c.objects)
      if (o.type === "logo" && members.has(o.id)) {
        const a = c.artboards[0];
        o.x = a.x + a.w - a.right - o.w;
        o.y = a.y + a.top;
      }
    carouselUI.ids.clear();
    carouselSelection = null;
    carouselUI.slide = Math.min(index, c.n - 1);
    changed();
    carouselSlideCenter(carouselUI.slide);
  }
  function reorder(delta) {
    const c = p.carousel,
      i = carouselUI.slide,
      j = i + delta;
    if (i === null || j < 0 || j >= c.n) return;
    checkpoint();
    [c.artboards[i], c.artboards[j]] = [c.artboards[j], c.artboards[i]];
    [p.boards[i], p.boards[j]] = [p.boards[j], p.boards[i]];
    syncBoards();
    carouselUI.slide = j;
    changed();
  }
  function panel(host) {
    const c = p.carousel,
      index = carouselUI.slide ?? 0,
      a = c.artboards[index],
      input = (key, label, min = 0, max = 100000) =>
        `<label>${label} (px)<input data-artboard="${key}" type="number" min="${min}" max="${max}" step="1" value="${a[key]}"></label>`;
    host.innerHTML = `<section class="carousel-property-section"><h4>Zeichenflächen</h4><label>Auswahl<select id="designerArtboardChoice">${c.artboards.map((f, i) => `<option value="${i}" ${i === index ? "selected" : ""}>${esc(f.name)} · ${f.w} × ${f.h}</option>`).join("")}</select></label><button id="designerAddArtboard" ${c.n >= 20 ? "disabled" : ""}>${studioIcon("plus")}Zeichenfläche hinzufügen</button></section><section class="carousel-property-section"><h4>Position &amp; Grösse</h4><label>Name<input type="text" data-artboard-name maxlength="80" value="${esc(a.name)}" required></label><div class="carousel-fields">${input("x", "X")}${input("y", "Y")}${input("w", "Breite", 240, 4000)}${input("h", "Höhe", 240, 4000)}</div><label class="artboard-move-content"><input type="checkbox" id="designerMoveContent" ${moveContent ? "checked" : ""}>Inhalt mitverschieben</label><p class="artboard-help">Zugeordnet sind die Elemente mit der grössten Überschneidung mit dieser Fläche. Ziehe den Namen über der Fläche oder gib die Position ein.</p></section><section class="carousel-property-section"><h4>Schutzzone &amp; Hintergrund</h4><div class="carousel-fields">${input("top", "Oben", 0, 4000)}${input("bottom", "Unten", 0, 4000)}${input("left", "Links", 0, 4000)}${input("right", "Rechts", 0, 4000)}</div><label>Hintergrundfarbe<input type="color" data-artboard-bg data-colour-draft aria-label="Hintergrundfarbe dieser Zeichenfläche" value="${a.bg}"></label></section><p id="designerArtboardError" role="status"></p><button id="designerApplyArtboard" class="primary" disabled>Änderungen übernehmen</button><section class="carousel-property-section"><h4>Reihenfolge &amp; Aktionen</h4><p class="artboard-help">Die Reihenfolge bestimmt den Export. Positionen auf der Montagefläche bleiben erhalten.</p><div class="carousel-fields"><button id="designerArtboardPrevious" ${index === 0 ? "disabled" : ""}>Im Export vor</button><button id="designerArtboardNext" ${index === c.n - 1 ? "disabled" : ""}>Im Export zurück</button><button id="designerDuplicateArtboard" ${c.n >= 20 ? "disabled" : ""}>Duplizieren</button><button id="designerDeleteArtboard" ${c.n <= 1 ? "disabled" : ""}>Entfernen …</button></div></section>`;
    host.querySelector("#designerArtboardChoice").onchange = (e) => {
      carouselSlideSelect(+e.target.value);
      carouselSlideCenter(+e.target.value);
    };
    host.querySelector("#designerAddArtboard").onclick = () => insert(c.n);
    host.querySelector("#designerMoveContent").onchange = (e) => {
      moveContent = e.target.checked;
    };
    const fields = [...host.querySelectorAll("[data-artboard]")],
      name = host.querySelector("[data-artboard-name]"),
      bg = host.querySelector("[data-artboard-bg]"),
      button = host.querySelector("#designerApplyArtboard"),
      error = host.querySelector("#designerArtboardError");
    const read = () => ({
      ...Object.fromEntries(
        fields.map((f) => [
          f.dataset.artboard,
          f.value === "" ? NaN : f.valueAsNumber,
        ]),
      ),
      name: name.value.trim(),
      bg: bg.value,
    });
    const check = () => {
      try {
        const next = plan(index, read());
        error.textContent = "";
        button.disabled = JSON.stringify(next) === JSON.stringify(a);
      } catch (e) {
        error.textContent = e.message;
        button.disabled = true;
      }
      MKWFields.group([...fields, name], error.textContent, error);
    };
    for (const field of [...fields, name, bg])
      field.addEventListener("input", check);
    button.onclick = () => {
      try {
        apply(index, read());
        carouselSlideCenter(index);
        $("#designerArtboardChoice")?.focus({ preventScroll: true });
      } catch (e) {
        error.textContent = e.message;
      }
    };
    host.querySelector("#designerArtboardPrevious").onclick = () => reorder(-1);
    host.querySelector("#designerArtboardNext").onclick = () => reorder(1);
    host.querySelector("#designerDuplicateArtboard").onclick = () =>
      insert(index + 1, index);
    host.querySelector("#designerDeleteArtboard").onclick = remove;
  }
  function controls(root) {
    const c = p.carousel,
      s = carouselZoom,
      extent = policy.extent(c);
    root.innerHTML =
      c.artboards
        .map(
          (a, i) =>
            `<div class="designer-artboard-surface" style="left:${a.x * s}px;top:${a.y * s}px;width:${a.w * s}px;height:${a.h * s}px"></div><button class="carousel-slide-tab ${carouselUI.slide === i ? "active" : ""}" data-slide="${i}" style="left:${a.x * s}px;top:${a.y * s - 38}px" aria-label="${esc(a.name)} auswählen oder verschieben" aria-pressed="${carouselUI.slide === i}">${esc(a.name)}</button>`,
        )
        .join("") +
      `<button id="carouselAddSlide" style="left:${extent.w * s + 24}px;top:12px" aria-label="Zeichenfläche hinzufügen" ${c.n >= 20 ? "disabled" : ""}>${studioIcon("plus")}</button>`;
    for (const btn of root.querySelectorAll("[data-slide]")) {
      const i = +btn.dataset.slide;
      btn.onclick = (e) => {
        e.stopPropagation();
        carouselSlideSelect(i);
        root
          .querySelector(`[data-slide="${i}"]`)
          ?.focus({ preventScroll: true });
      };
      btn.onpointerdown = (e) => drag(e, i);
    }
    root.querySelector("#carouselAddSlide").onclick = (e) => {
      e.stopPropagation();
      insert(c.n);
    };
  }
  function drag(event, index) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const c = p.carousel,
      a = c.artboards[index],
      start = { x: event.clientX, y: event.clientY },
      before = { ...a },
      members = moveContent ? owned(c, index) : [],
      positions = members.map((o) => ({ o, x: o.x, y: o.y }));
    let began = false;
    carouselListen(
      event,
      (e) => {
        let x = Math.max(
            0,
            Math.round(before.x + (e.clientX - start.x) / carouselZoom),
          ),
          y = Math.max(
            0,
            Math.round(before.y + (e.clientY - start.y) / carouselZoom),
          );
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4 && !began)
          return;
        carouselUI.snapLines = [];
        if (carouselUI.snap) {
          const other = c.artboards.filter((_, i) => i !== index),
            sx = carouselNearestSnap(
              [x, x + a.w, x + a.w / 2],
              other.flatMap((f) => [f.x, f.x + f.w, f.x + f.w / 2]),
            ),
            sy = carouselNearestSnap(
              [y, y + a.h, y + a.h / 2],
              other.flatMap((f) => [f.y, f.y + f.h, f.y + f.h / 2]),
            );
          if (sx) {
            x = Math.round(x + sx.delta);
            carouselUI.snapLines.push({ axis: "x", value: sx.line });
          }
          if (sy) {
            y = Math.round(y + sy.delta);
            carouselUI.snapLines.push({ axis: "y", value: sy.line });
          }
        }
        let next;
        try {
          next = plan(index, { x, y });
        } catch {
          return;
        }
        if (
          positions.some(
            (item) =>
              Math.abs(item.x + x - before.x) > 100000 ||
              Math.abs(item.y + y - before.y) > 100000,
          )
        )
          return;
        if (!began) {
          checkpoint();
          carouselSlideSelect(index);
          began = true;
        }
        Object.assign(a, next);
        for (const item of positions) {
          item.o.x = item.x + x - before.x;
          item.o.y = item.y + y - before.y;
        }
        changed(false);
        carouselRefresh();
      },
      () => {
        if (began) {
          carouselPanel();
          changed(false);
        }
      },
      () => {
        if (!began) return;
        Object.assign(a, before);
        for (const item of positions) {
          item.o.x = item.x;
          item.o.y = item.y;
        }
        changed(false);
        carouselPanel();
        carouselRefresh();
      },
    );
  }
  return { enable, entry, panel, controls, insert, remove, reorder, apply };
})();
