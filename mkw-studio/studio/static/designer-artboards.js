"use strict";
const MKWArtboardUI = (() => {
  const policy = MKWCarouselPolicy;
  let moveContent = true,
    selectionController = null;
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
    c.pageGroups = [
      {
        id: uid(),
        name: "Carousel 1",
        orientation: "horizontal",
        artboardIds: c.artboards.map((a) => a.id),
      },
    ];
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
    if (MKWSpreadUI.active())
      return MKWSpreadLayoutModel.plan(
        p.carousel,
        {
          type: "edit",
          ids: [p.carousel.artboards[index].id],
          values: { ...p.carousel.artboards[index], ...values },
        },
        carouselObjectBounds,
        uid,
      ).artboards[index];
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
    if (MKWSpreadUI.active())
      return MKWSpreadUI.commit(
        { type: "edit", ids: [p.carousel.artboards[index].id], values },
        "Seite aktualisiert.",
      );
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
    if (MKWSpreadUI.active())
      return MKWSpreadUI.commit(
        duplicate === null
          ? { type: "add" }
          : { type: "duplicate", ids: [p.carousel.artboards[duplicate].id] },
      );
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
    const groups = policy.pageGroups(c).map((group) => ({
        ...group,
        artboardIds: [...group.artboardIds],
      })),
      previousId = c.artboards[index - 1]?.id,
      nextId = c.artboards[index]?.id,
      target = groups.find((group) =>
        group.artboardIds.includes(previousId || nextId),
      );
    if (target) {
      const neighbor = previousId || nextId,
        position = target.artboardIds.indexOf(neighbor);
      target.artboardIds.splice(position + (previousId ? 1 : 0), 0, frame.id);
    }
    c.artboards.splice(index, 0, frame);
    c.pageGroups = groups;
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
    if (MKWSpreadUI.active()) return MKWSpreadUI.action("delete");
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
    const groups = policy
      .pageGroups(c)
      .map((group) => ({
        ...group,
        artboardIds: group.artboardIds.filter((id) => id !== frame.id),
      }))
      .filter((group) => group.artboardIds.length);
    c.artboards.splice(index, 1);
    c.pageGroups = groups;
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
    if (MKWSpreadUI.active())
      return MKWSpreadUI.action(delta < 0 ? "previous" : "next");
    const c = p.carousel,
      i = carouselUI.slide,
      j = i + delta;
    if (i === null || j < 0 || j >= c.n) return;
    reorderTo(i, j);
  }
  function applyGroups(groups) {
    const c = p.carousel,
      byId = new Map(c.artboards.map((a) => [a.id, a])),
      boards = new Map(c.artboards.map((a, i) => [a.id, p.boards[i]])),
      normalized = groups
        .map((group) => ({
          ...group,
          artboardIds: group.artboardIds.filter((id) => byId.has(id)),
        }))
        .filter((group) => group.artboardIds.length),
      ids = normalized.flatMap((group) => group.artboardIds);
    if (ids.length !== c.artboards.length || new Set(ids).size !== ids.length)
      throw Error("Die Seitengruppen sind unvollständig.");
    c.pageGroups = normalized;
    c.artboards = ids.map((id) => byId.get(id));
    p.boards = ids.map((id) => boards.get(id));
    syncBoards();
  }
  function reorderTo(from, to) {
    const c = p.carousel;
    if (from < 0 || to < 0 || from >= c.n || to >= c.n || from === to) return;
    checkpoint();
    const draggedId = c.artboards[from].id,
      targetId = c.artboards[to].id,
      existingGroups = policy.pageGroups(c),
      groups = window.MKWPageManagementTest
        ? existingGroups.map((group) => ({
            ...group,
            artboardIds: [...group.artboardIds],
          }))
        : [
            {
              ...existingGroups[0],
              name: "Carousel-Slides",
              orientation: "horizontal",
              artboardIds: c.artboards.map((artboard) => artboard.id),
            },
          ],
      source = groups.find((group) => group.artboardIds.includes(draggedId)),
      target = groups.find((group) => group.artboardIds.includes(targetId));
    source.artboardIds.splice(source.artboardIds.indexOf(draggedId), 1);
    if (source.id === target.id) {
      const position = target.artboardIds.indexOf(targetId);
      target.artboardIds.splice(
        from < to ? position + 1 : position,
        0,
        draggedId,
      );
    } else {
      const position = target.artboardIds.indexOf(targetId);
      target.artboardIds.splice(
        from < to ? position + 1 : position,
        0,
        draggedId,
      );
    }
    applyGroups(groups);
    carouselUI.slide = c.artboards.findIndex((a) => a.id === draggedId);
    changed();
  }
  function moveToGroup(index, groupId) {
    if (!window.MKWPageManagementTest) return;
    const c = p.carousel,
      frame = c.artboards[index];
    if (!frame) return;
    const groups = policy.pageGroups(c).map((group) => ({
        ...group,
        artboardIds: [...group.artboardIds],
      })),
      source = groups.find((group) => group.artboardIds.includes(frame.id)),
      target = groups.find((group) => group.id === groupId);
    if (!source || !target || source.id === target.id) return;
    checkpoint();
    source.artboardIds.splice(source.artboardIds.indexOf(frame.id), 1);
    target.artboardIds.push(frame.id);
    applyGroups(groups);
    carouselUI.slide = c.artboards.findIndex((a) => a.id === frame.id);
    changed();
  }
  function splitGroup(index) {
    if (!window.MKWPageManagementTest) return;
    const c = p.carousel,
      frame = c.artboards[index],
      groups = policy.pageGroups(c).map((group) => ({
        ...group,
        artboardIds: [...group.artboardIds],
      })),
      groupIndex = groups.findIndex((group) =>
        group.artboardIds.includes(frame?.id),
      );
    if (groupIndex < 0) return;
    const group = groups[groupIndex],
      pageIndex = group.artboardIds.indexOf(frame.id);
    if (pageIndex <= 0 || groups.length >= c.n) return;
    checkpoint();
    const pages = group.artboardIds.splice(pageIndex);
    groups.splice(groupIndex + 1, 0, {
      id: uid(),
      name: `Carousel ${groups.length + 1}`,
      orientation: group.orientation,
      artboardIds: pages,
    });
    applyGroups(groups);
    changed();
  }
  function setGroupOrientation(groupId, orientation) {
    if (!window.MKWPageManagementTest) return;
    if (!["horizontal", "vertical"].includes(orientation)) return;
    const groups = policy.pageGroups(p.carousel).map((group) => ({
        ...group,
        artboardIds: [...group.artboardIds],
      })),
      group = groups.find((item) => item.id === groupId);
    if (!group || group.orientation === orientation) return;
    checkpoint();
    group.orientation = orientation;
    p.carousel.pageGroups = groups;
    changed();
  }
  function arrangeGroup(groupId) {
    if (!window.MKWPageManagementTest) return false;
    const c = p.carousel,
      group = policy.pageGroups(c).find((item) => item.id === groupId);
    if (!group || group.artboardIds.length < 2) return false;
    const byId = new Map(c.artboards.map((frame) => [frame.id, frame])),
      positions = new Map([
        [group.artboardIds[0], byId.get(group.artboardIds[0])],
      ]);
    for (let i = 1; i < group.artboardIds.length; i++) {
      const id = group.artboardIds[i],
        previous = positions.get(group.artboardIds[i - 1]),
        frame = byId.get(id),
        x =
          group.orientation === "horizontal"
            ? previous.x + previous.w + 24
            : previous.x,
        y =
          group.orientation === "vertical"
            ? previous.y + previous.h + 24
            : previous.y;
      positions.set(id, { ...frame, x, y });
    }
    const artboards = c.artboards.map((frame) =>
        positions.has(frame.id) ? positions.get(frame.id) : frame,
      ),
      next = { ...c, artboards };
    if (!policy.validBoards(next))
      throw Error(
        "Die Anordnung überschneidet andere Zeichenflächen oder überschreitet den Arbeitsbereich. Verschiebe sie zuerst an eine freie Stelle.",
      );
    const moves = moveContent
      ? c.objects.flatMap((object) => {
          const index = policy.owner(c, boundsOf(object)),
            before = c.artboards[index],
            after = before && positions.get(before.id);
          if (!after) return [];
          const dx = after.x - before.x,
            dy = after.y - before.y;
          if (
            Math.abs(object.x + dx) > 100000 ||
            Math.abs(object.y + dy) > 100000
          )
            throw Error(
              "Ein Inhalt würde zu weit ausserhalb liegen. Verschiebe ihn zuerst näher an die Zeichenfläche oder deaktiviere „Inhalt mitverschieben“.",
            );
          return [{ object, dx, dy }];
        })
      : [];
    if (
      group.artboardIds.every((id) => {
        const before = byId.get(id),
          after = positions.get(id);
        return before.x === after.x && before.y === after.y;
      })
    )
      return false;
    carouselEndText();
    checkpoint();
    c.artboards = artboards;
    for (const { object, dx, dy } of moves) {
      object.x += dx;
      object.y += dy;
    }
    syncBoards();
    changed();
    return true;
  }
  function panel(host) {
    selectionController = null;
    if (MKWSpreadUI.active() && !p.carousel.n) {
      host.innerHTML = "";
      MKWSpreadUI.panel(host);
      return;
    }
    const c = p.carousel;
    let index = carouselUI.slide ?? 0,
      a = c.artboards[index];
    const groups = policy.pageGroups(c),
      visibleGroups = window.MKWPageManagementTest
        ? groups
        : [
            {
              ...groups[0],
              name: "Carousel-Slides",
              orientation: "horizontal",
              artboardIds: c.artboards.map((f) => f.id),
            },
          ];
    const input = (key, label, min = 0, max = 100000) =>
      `<label>${label} (px)<input data-artboard="${key}" type="number" min="${min}" max="${max}" step="1" value="${a[key]}"></label>`;
    if (MKWSpreadUI.active()) {
      const input = (key, label, min = 0, max = 100000) =>
        `<label>${label} (px)<input data-artboard="${key}" type="number" min="${min}" max="${max}" step="1" value="${a[key]}"></label>`;
      host.innerHTML = `<section class="carousel-property-section"><h4>Zeichenflächen</h4><label>Auswahl<select id="designerArtboardChoice">${c.artboards.map((f, i) => `<option value="${i}" ${i === index ? "selected" : ""}>${esc(f.name)} · ${f.w} × ${f.h}</option>`).join("")}</select></label><button id="designerAddArtboard" ${c.n >= 20 ? "disabled" : ""}>${studioIcon("plus")}Zeichenfläche hinzufügen</button></section><section class="carousel-property-section"><h4>Position &amp; Grösse</h4><label>Name<input type="text" data-artboard-name maxlength="80" value="${esc(a.name)}" required></label><div class="carousel-fields">${input("x", "X")}${input("y", "Y")}${input("w", "Breite", 240, 4000)}${input("h", "Höhe", 240, 4000)}</div><label class="artboard-move-content"><input type="checkbox" id="designerMoveContent" ${moveContent ? "checked" : ""}>Inhalt mitverschieben</label><label class="artboard-move-content"><input type="checkbox" id="designerSnapArtboards" ${carouselUI.snap ? "checked" : ""}>An Zeichenflächen einrasten</label><p class="artboard-help">Zugeordnet sind die Elemente mit der grössten Überschneidung mit dieser Fläche. Ziehe den Namen über der Fläche oder gib die Position ein.</p></section><section class="carousel-property-section"><h4>Schutzzone &amp; Hintergrund</h4><div class="carousel-fields">${input("top", "Oben", 0, 4000)}${input("bottom", "Unten", 0, 4000)}${input("left", "Links", 0, 4000)}${input("right", "Rechts", 0, 4000)}</div><label>Hintergrundfarbe<input type="color" data-artboard-bg data-colour-draft aria-label="Hintergrundfarbe dieser Zeichenfläche" value="${a.bg}"></label></section><p id="designerArtboardError" role="status"></p><button id="designerApplyArtboard" class="primary" disabled>Änderungen übernehmen</button><section class="carousel-property-section"><h4>Reihenfolge &amp; Aktionen</h4><p class="artboard-help">Die Reihenfolge bestimmt den Export. Positionen auf der Montagefläche bleiben erhalten.</p><div class="carousel-fields"><button id="designerArtboardPrevious" ${index === 0 ? "disabled" : ""}>Im Export vor</button><button id="designerArtboardNext" ${index === c.n - 1 ? "disabled" : ""}>Im Export zurück</button><button id="designerDuplicateArtboard" ${c.n >= 20 ? "disabled" : ""}>Duplizieren</button><button id="designerDeleteArtboard" ${c.n <= 1 ? "disabled" : ""}>Entfernen …</button></div></section>`;
      if (MKWSpreadUI.active()) {
        const sections = host.querySelectorAll(":scope > section"),
          format = document.createElement("section"),
          fields = document.createElement("div"),
          details = document.createElement("details"),
          summary = document.createElement("summary"),
          slot = document.createElement("div");
        format.className = "carousel-property-section spread-current-format";
        format.innerHTML = "<h4>Format dieser Seite</h4>";
        fields.className = "carousel-fields";
        for (const key of ["w", "h"])
          fields.append(
            host.querySelector(`[data-artboard=${key}]`).closest("label"),
          );
        format.append(
          fields,
          host.querySelector("#designerArtboardError"),
          host.querySelector("#designerApplyArtboard"),
        );
        sections[0].hidden = true;
        sections[sections.length - 1].hidden = true;
        host.querySelector("#designerMoveContent").disabled = true;
        host.querySelector(".artboard-move-content").hidden = true;
        host.querySelector(".artboard-help").textContent =
          "Positionen gelten für den ganzen Bogen. Inhalte bleiben bei ihrer Seite. Grösse und Schutzzonen verändern keine Elementgrössen.";
        details.className = "spread-page-details";
        summary.textContent = "Position, Schutzzone & Hintergrund";
        details.append(summary, sections[1], sections[2]);
        host.prepend(format, slot);
        host.append(details);
        if (MKWSpreadUI.selectedBoard()) {
          format.hidden = true;
          carouselArtboardFormatPanel(host, index);
          host.prepend(host.lastElementChild);
        }
        MKWSpreadUI.panel(slot);
      } else MKWSpreadUI.panel(host);
    } else {
      const groupsMarkup = visibleGroups
        .map(
          (group) =>
            `<section class="designer-page-group" data-page-group="${esc(group.id)}" data-orientation="${group.orientation}"><div class="page-group-heading"><strong>${esc(group.name)}</strong>${window.MKWPageManagementTest ? `<label>Anordnung<select data-group-orientation="${esc(group.id)}" aria-label="${esc(group.name)}: Anordnung"><option value="horizontal" ${group.orientation === "horizontal" ? "selected" : ""}>Nebeneinander</option><option value="vertical" ${group.orientation === "vertical" ? "selected" : ""}>Untereinander</option></select></label>` : ""}</div><ol aria-label="${esc(group.name)} Seiten">${group.artboardIds
              .map((id) => {
                const i = c.artboards.findIndex((f) => f.id === id),
                  f = c.artboards[i];
                return `<li><div role="button" tabindex="0" draggable="true" data-artboard-order="${i}" aria-current="${i === index ? "true" : "false"}" aria-label="${esc(f.name)}, Position ${i + 1} von ${c.n}. Mit Ziehen oder Pfeiltasten neu ordnen">${esc(f.name)}</div>${
                  window.MKWPageManagementTest
                    ? `<select data-move-page="${i}" aria-label="${esc(f.name)} zu einer anderen Seitengruppe verschieben">${groups
                        .filter((target) => target.id !== group.id)
                        .map(
                          (target) =>
                            `<option value="${esc(target.id)}">${esc(target.name)}</option>`,
                        )
                        .join("")}</select>`
                    : ""
                }</li>`;
              })
              .join(
                "",
              )}</ol>${window.MKWPageManagementTest ? `<button type="button" data-group-arrange="${esc(group.id)}" aria-label="${esc(group.name)} auf der Montagefläche ${group.orientation === "horizontal" ? "nebeneinander" : "untereinander"} anordnen" ${group.artboardIds.length < 2 ? "disabled" : ""}>Auf Montagefläche anordnen</button>` : ""}</section>`,
        )
        .join("");
      host.innerHTML = `<section class="carousel-property-section"><h4>Zeichenflächen</h4><label>Auswahl<select id="designerArtboardChoice">${c.artboards.map((f, i) => `<option value="${i}" ${i === index ? "selected" : ""}>${esc(f.name)} · ${f.w} × ${f.h}</option>`).join("")}</select></label><button id="designerAddArtboard" ${c.n >= 20 ? "disabled" : ""}>${studioIcon("plus")}Zeichenfläche hinzufügen</button></section><section class="carousel-property-section"><h4>Position &amp; Grösse</h4><label>Name<input type="text" data-artboard-name maxlength="80" value="${esc(a.name)}" required></label><div class="carousel-fields">${input("x", "X")}${input("y", "Y")}${input("w", "Breite", 240, 4000)}${input("h", "Höhe", 240, 4000)}</div><label class="artboard-move-content"><input type="checkbox" id="designerMoveContent" ${moveContent ? "checked" : ""}>Inhalt mitverschieben</label><label class="artboard-move-content"><input type="checkbox" id="designerSnapArtboards" ${carouselUI.snap ? "checked" : ""}>An Zeichenflächen einrasten</label><p class="artboard-help">Zugeordnet sind die Elemente mit der grössten Überschneidung mit dieser Fläche. Ziehe den Namen über der Fläche oder gib die Position ein.</p></section><section class="carousel-property-section"><h4>Schutzzone &amp; Hintergrund</h4><div class="carousel-fields">${input("top", "Oben", 0, 4000)}${input("bottom", "Unten", 0, 4000)}${input("left", "Links", 0, 4000)}${input("right", "Rechts", 0, 4000)}</div><label>Hintergrundfarbe<input type="color" data-artboard-bg data-colour-draft aria-label="Hintergrundfarbe dieser Zeichenfläche" value="${a.bg}"></label></section><p id="designerArtboardError" role="status"></p><button id="designerApplyArtboard" class="primary" disabled>Änderungen übernehmen</button><section class="carousel-property-section"><h4>${window.MKWPageManagementTest ? "Testumgebung: Seitenmanagement" : "Carousel-Slides"}</h4>${window.MKWPageManagementTest ? `<p class="artboard-help">Testbereich für Seitengruppen und Montageflächen-Docking. Exportreihenfolge und Flächenposition bleiben getrennt.</p>` : `<p class="artboard-help">Eine zusammenhängende Slide-Sequenz. Ziehe Seiten oder nutze die Pfeiltasten, um die Reihenfolge zu ändern.</p>`}<div class="designer-page-groups">${groupsMarkup}</div>${window.MKWPageManagementTest ? `<button id="designerSplitGroup" ${groups.length >= c.n || groups.find((group) => group.artboardIds.includes(a.id))?.artboardIds[0] === a.id ? "disabled" : ""}>Ab dieser Seite neue Gruppe</button>` : ""}<div class="carousel-fields"><button id="designerArtboardPrevious" ${index === 0 ? "disabled" : ""}>Im Export vor</button><button id="designerArtboardNext" ${index === c.n - 1 ? "disabled" : ""}>Im Export zurück</button><button id="designerDuplicateArtboard" ${c.n >= 20 ? "disabled" : ""}>Duplizieren</button><button id="designerDeleteArtboard" ${c.n <= 1 ? "disabled" : ""}>Entfernen …</button></div></section>`;

      MKWSpreadUI.panel(host);
    }
    host.querySelector("#designerArtboardChoice").onchange = (e) => {
      carouselSlideSelect(+e.target.value);
      carouselSlideCenter(+e.target.value);
    };
    host.querySelector("#designerAddArtboard").onclick = () => insert(c.n);
    host.querySelector("#designerMoveContent").onchange = (e) => {
      moveContent = e.target.checked;
    };
    host.querySelector("#designerSnapArtboards").onchange = (e) => {
      carouselUI.snap = e.target.checked;
      carouselRefresh();
    };
    let orderDrag = null;
    for (const item of host.querySelectorAll("[data-artboard-order]")) {
      item.onclick = () => carouselSlideSelect(+item.dataset.artboardOrder);
      item.onkeydown = (event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          carouselSlideSelect(+item.dataset.artboardOrder);
          return;
        }
        if (
          !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        const from = +item.dataset.artboardOrder,
          to = Math.max(
            0,
            Math.min(
              c.n - 1,
              from + (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1),
            ),
          );
        if (from === to) return;
        reorderTo(from, to);
        host.querySelector(`[data-artboard-order="${to}"]`)?.focus();
      };
      item.ondragstart = (event) => {
        orderDrag = +item.dataset.artboardOrder;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(orderDrag));
      };
      item.ondragover = (event) => {
        if (orderDrag !== null) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          item.closest("li").classList.add("is-drop-target");
        }
      };
      item.ondragleave = () =>
        item.closest("li").classList.remove("is-drop-target");
      item.ondrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        item.closest("li").classList.remove("is-drop-target");
        const from =
          orderDrag ?? Number(event.dataTransfer.getData("text/plain"));
        orderDrag = null;
        reorderTo(from, +item.dataset.artboardOrder);
      };
      item.ondragend = () => (orderDrag = null);
    }
    for (const group of host.querySelectorAll("[data-page-group]")) {
      group.ondragover = (event) => {
        if (orderDrag === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        group.classList.add("is-drop-target");
      };
      group.ondragleave = (event) => {
        if (!group.contains(event.relatedTarget))
          group.classList.remove("is-drop-target");
      };
      group.ondrop = (event) => {
        event.preventDefault();
        group.classList.remove("is-drop-target");
        const from =
          orderDrag ?? Number(event.dataTransfer.getData("text/plain"));
        orderDrag = null;
        moveToGroup(from, group.dataset.pageGroup);
      };
    }
    for (const select of host.querySelectorAll("[data-group-orientation]"))
      select.onchange = () =>
        setGroupOrientation(select.dataset.groupOrientation, select.value);
    for (const button of host.querySelectorAll("[data-group-arrange]"))
      button.onclick = () => {
        try {
          arrangeGroup(button.dataset.groupArrange);
        } catch (e) {
          host.querySelector("#designerArtboardError").textContent = e.message;
        }
      };
    for (const select of host.querySelectorAll("[data-move-page]"))
      select.onchange = () =>
        moveToGroup(+select.dataset.movePage, select.value);
    host
      .querySelector("#designerSplitGroup")
      ?.addEventListener("click", () => splitGroup(index));
    const fields = [...host.querySelectorAll("input[data-artboard]")],
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
    selectionController = {
      select(next) {
        if (
          !host.isConnected ||
          !name.isConnected ||
          p.carousel !== c ||
          !c.artboards[next]
        )
          return false;
        index = next;
        a = c.artboards[index];
        for (const f of fields) f.value = a[f.dataset.artboard];
        name.value = a.name;
        bg.value = a.bg;
        const choice = host.querySelector("#designerArtboardChoice");
        if (choice) choice.value = index;
        check();
        return true;
      },
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
  return {
    selectPage: (index) => selectionController?.select(index),
    enable,
    entry,
    panel,
    controls,
    insert,
    remove,
    reorder,
    apply,
  };
})();
