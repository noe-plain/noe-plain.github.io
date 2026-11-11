"use strict";
const MKWSpreadUI = (() => {
  const model = MKWSpreadLayoutModel,
    policy = MKWCarouselPolicy;
  let selected = new Set(),
    selectedArtboard = null,
    focusedPage = null,
    anchor = null,
    project = null,
    pendingMove = null,
    disposeList = () => {},
    repaintFrame = 0;
  const active = () => model.active(p.carousel);
  function reset() {
    if (project !== p.projectId) {
      selected.clear();
      anchor = null;
      pendingMove = null;
      project = p.projectId;
    }
    const ids = new Set(p.carousel.artboards?.map((a) => a.id));
    selected = new Set([...selected].filter((id) => ids.has(id)));
    if (!selected.size && p.carousel.artboards?.[carouselUI.slide ?? 0])
      selected.add(p.carousel.artboards[carouselUI.slide ?? 0].id);
  }
  function announce(message) {
    let node = document.querySelector("#spreadStatus");
    if (!node) {
      node = document.createElement("p");
      node.id = "spreadStatus";
      node.className = "visually-hidden";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.append(node);
    }
    node.textContent = message;
  }
  function commit(
    action,
    message = "Seitenstruktur aktualisiert.",
    focus = true,
  ) {
    if (busy) return false;
    try {
      carouselEndText();
      const previous = p.carousel,
        next = model.plan(previous, action, carouselPaintBounds, uid);
      if (JSON.stringify(next) === JSON.stringify(previous)) return false;
      const oldBoards = new Map(
        previous.artboards?.map((a, i) => [a.id, p.boards[i]]) ||
          next.artboards
            .slice(0, previous.n)
            .map((a, i) => [a.id, p.boards[i]]),
      );
      let im = p.images[0];
      const added = next.artboards.filter((a) => !oldBoards.has(a.id));
      if (added.length && !im) {
        const canvas = makeCanvas(1, 1),
          data = canvas.toDataURL();
        canvas.width = canvas.height = 0;
        im = {
          id: uid(),
          name: "Designer",
          data,
          original: data,
          width: next.w,
          height: next.h,
        };
      }
      const boards = next.artboards.map((a, i) => ({
        ...(oldBoards.get(a.id) || basicBoard(im, a.w, a.h)),
        w: a.w,
        h: a.h,
        carouselSlide: i,
      }));
      const candidate = {
        ...p,
        carousel: next,
        boards,
        images: im && !p.images.includes(im) ? [...p.images, im] : p.images,
      };
      validate(candidate);
      validateCarousel(candidate);
      checkpoint();
      p.carousel = next;
      p.boards = boards;
      p.images = candidate.images;
      if (added.length) {
        selected = new Set(added.map((a) => a.id));
        focusedPage = added[0].id;
        selectedArtboard = null;
      } else
        selected = new Set(
          [...selected].filter((id) => next.artboards.some((a) => a.id === id)),
        );
      if (!selected.size && next.n)
        selected.add(
          next.artboards[Math.min(carouselUI.slide ?? 0, next.n - 1)].id,
        );
      carouselSelection = null;
      carouselUI.ids.clear();
      carouselUI.slide = next.artboards.findIndex((a) => selected.has(a.id));
      if (carouselUI.slide < 0) carouselUI.slide = null;
      pendingMove = null;
      changed();
      if (added.length && carouselUI.slide !== null)
        carouselSlideCenter(carouselUI.slide);
      announce(message);
      if (focus)
        requestAnimationFrame(() => {
          const list = document.querySelector("#spreadPages");
          list?.focus({ preventScroll: true });
          list?.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      return true;
    } catch (error) {
      const node = document.querySelector("#spreadError");
      if (node) node.textContent = error.message;
      status(error.message);
      announce(error.message);
      return false;
    }
  }
  function choose(id, event = {}) {
    const ids = p.carousel.artboards.map((a) => a.id);
    if (event.shiftKey && anchor && ids.includes(anchor)) {
      const a = ids.indexOf(anchor),
        b = ids.indexOf(id);
      if (!event.metaKey && !event.ctrlKey) selected.clear();
      for (const v of ids.slice(Math.min(a, b), Math.max(a, b) + 1))
        selected.add(v);
    } else if (event.metaKey || event.ctrlKey) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      anchor = id;
    } else {
      selected.clear();
      selected.add(id);
      anchor = id;
    }
    carouselUI.ids.clear();
    carouselSelection = null;
    carouselUI.slide = ids.indexOf(id);
  }
  function panel(host) {
    disposeList();
    disposeList = () => {};
    if (!p.carousel) return;
    reset();
    const c = p.carousel,
      s = c.pageStructure,
      initialMode = s?.mode || (policy.isFree(c) ? "single" : "spreads"),
      section = document.createElement("section");
    section.className = "carousel-property-section spread-panel";
    section.innerHTML = `<h4 id="spreadTitle">Seiten &amp; Artboards</h4><div class="spread-modes" role="radiogroup" aria-label="Seitenanordnung"><label><input type="radio" name="spreadMode" value="single" ${initialMode === "single" ? "checked" : ""}>Einzelseiten</label><label title="Ermöglicht bis zu 20 verbundene Seiten. Die vorhandene Gestaltung bleibt unverändert; Seiten mit Zusammenfügen verbinden."><input type="radio" name="spreadMode" value="spreads" ${initialMode === "spreads" ? "checked" : ""}>Artboards (1–20 Slides)</label></div>${!s ? '<p class="spread-note">Seiten verwalten, ohne die vorhandene Gestaltung zu verändern.</p><button id="spreadEnable">Seitenverwaltung aktivieren</button>' : `<label class="spread-shuffle"><input id="spreadShuffle" type="checkbox" ${s.shuffle ? "checked" : ""}>Automatisches Nachrücken</label><p class="spread-note">${s.shuffle ? "Neue Seiten rücken nach." : "Seiten auswählen und mit „Zusammenfügen“ verbinden."}</p><div id="spreadPages" class="spread-pages" role="listbox" aria-labelledby="spreadTitle" aria-multiselectable="true" tabindex="0" aria-describedby="spreadKeys"></div><p id="spreadEmpty" ${c.n ? "hidden" : ""}>Noch keine Seiten. Füge deine erste Seite hinzu.</p><p id="spreadKeys" class="spread-note">Mehrfachauswahl: Umschalt oder ⌘/Strg. Verschieben: Leertaste, Pfeile, Eingabe; Escape bricht ab.</p><p id="spreadCount"></p><button id="spreadAdd" class="primary">${studioIcon("plus")}<span>Neues Artboard</span></button><div class="spread-actions"><button data-spread-action="join">Zusammenfügen</button><button data-spread-action="split">Trennen</button><button data-spread-action="edit-spread">Artboard bearbeiten …</button><button data-spread-action="more">Weitere Aktionen</button></div><div class="spread-fields"><label>Auswahl gemeinsam formatieren<select id="spreadFormat"><option value="">Format wählen …</option><option value="1080x1920">9:16 · 1080 × 1920</option><option value="1080x1080">1:1 · 1080 × 1080</option><option value="1080x1350">4:5 · 1080 × 1350</option><option value="custom">Eigene Grösse …</option></select></label></div><details class="spread-advanced"><summary>Weitere Optionen</summary><label>Bindung<select id="spreadBinding"><option value="left" ${s.binding === "left" ? "selected" : ""}>Links (Leserichtung →)</option><option value="right" ${s.binding === "right" ? "selected" : ""}>Rechts (Leserichtung ←)</option></select></label><label>Erste Seitennummer<input id="spreadNumber" type="number" min="1" max="999999" step="1" value="${s.startNumber}"></label><label>Abstand zwischen Bögen (px)<input id="spreadGap" type="number" min="32" max="1000" step="1" value="${s.gap}"></label><label>Anschnitt-Hilfe (px)<input id="spreadBleed" type="number" min="0" max="100" step="1" value="${s.bleed}"></label><p class="spread-note">Anschnitt ist eine Anzeigehilfe. Der Export bleibt im Seiten-Endformat; keine Schnittmarken oder CMYK-Ausgabe.</p></details>`}<p id="spreadError" role="status"></p>`;
    host.append(section);
    for (const radio of section.querySelectorAll("[name=spreadMode]")) {
      const applyMode = () => {
        if (p.carousel === c)
          commit({ type: "mode", mode: radio.value }, "Seitenmodus geändert.");
      };
      radio.onchange = applyMode;
      radio.onclick = () => {
        if (!s && radio.checked) applyMode();
      };
    }
    if (!s) {
      section.querySelector("#spreadEnable").onclick = () =>
        commit({ type: "enable" }, "Seitenverwaltung aktiviert.");
      return;
    }
    section.querySelector("#spreadShuffle").onchange = (e) =>
      commit(
        { type: "settings", shuffle: e.target.checked },
        "Bogen-Zuordnung aktualisiert.",
      );
    for (const [selector, key] of [
      ["#spreadBinding", "binding"],
      ["#spreadNumber", "startNumber"],
      ["#spreadGap", "gap"],
      ["#spreadBleed", "bleed"],
    ])
      section.querySelector(selector).onchange = (e) =>
        commit({
          type: "settings",
          [key]: key === "binding" ? e.target.value : e.target.valueAsNumber,
        });
    section.querySelector("#spreadAdd").onclick = () =>
      commit(
        { type: "add", count: 1, spread: true, ids: [...selected] },
        "Neues Artboard hinzugefügt.",
      );
    for (const b of section.querySelectorAll("[data-spread-action]"))
      b.onclick = () => action(b.dataset.spreadAction);
    section.querySelector("#spreadFormat").onchange = (e) =>
      format(e.target.value);
    list(section);
  }
  function actionsState(host) {
    const c = p.carousel,
      size = selected.size;
    host.querySelector("#spreadCount").textContent =
      `${size} ausgewählt · ${c.n} von ${model.maxPages} Seiten`;
    for (const b of host.querySelectorAll("[data-spread-action]"))
      b.disabled =
        b.dataset.spreadAction === "add-pair"
          ? c.n > model.maxPages - 2
          : b.dataset.spreadAction === "join"
            ? size < 2
            : b.dataset.spreadAction === "rename"
              ? size !== 1
              : !size;
    host.querySelector("#spreadAdd").disabled = c.n >= model.maxPages;
    host.querySelector("#spreadFormat").disabled = !size;
  }
  function list(host) {
    const c = p.carousel;
    disposeList = MKWPagesPanel.mount(host, {
      c,
      selected,
      focused: focusedPage || selectedArtboard,
      esc,
      icon: studioIcon,
      choose,
      commit,
      announce,
      actionsState: () => actionsState(host),
      openPage: (id) => {
        const wasArtboard = !!selectedArtboard;
        const index = c.artboards.findIndex((a) => a.id === id);
        if (index < 0) return;
        selectedArtboard = null;
        focusedPage = id;
        carouselUI.slide = index;
        carouselUI.ids.clear();
        carouselSelection = null;
        if (wasArtboard || !MKWArtboardUI.selectPage(carouselUI.slide))
          carouselPanel();
        const scroll = $("#carouselProperties").scrollTop;
        carouselPresentInspector();
        $("#carouselProperties").scrollTop = scroll;
        carouselDrawSelection();
        carouselSlideControls();
        carouselSlideCenter(index);
        requestAnimationFrame(() => {
          const list = document.querySelector("#spreadPages"),
            focus = document.activeElement;
          if (
            list &&
            !(list.contains(focus) && focus !== list) &&
            !focus?.closest('[role="menu"],dialog[open]')
          )
            list.focus({ preventScroll: true });
        });
      },
      highlightBoard: (id, ids) => {
        selectedArtboard = id;
        focusedPage = null;
        carouselUI.slide = c.artboards.findIndex((a) => a.id === ids[0]);
        carouselSelection = null;
        carouselUI.ids.clear();
        carouselPanel();
        const scroll = $("#carouselProperties").scrollTop;
        carouselPresentInspector();
        $("#carouselProperties").scrollTop = scroll;
        carouselDrawSelection();
        carouselSlideControls();
        carouselSlideCenter(carouselUI.slide);
        requestAnimationFrame(() => {
          const list = document.querySelector("#spreadPages"),
            focus = document.activeElement;
          if (
            list &&
            !(list.contains(focus) && focus !== list) &&
            !focus?.closest('[role="menu"],dialog[open]')
          )
            list.focus({ preventScroll: true });
        });
      },
      preview: previewPage,
      remove,
      renamePage: rename,
      pageMenu: menu,
      renameBoard,
      boardMenu,
      addPage,
    });
  }
  async function previewPage(id, canvas, current) {
    const project = p,
      c = project.carousel,
      index = c.artboards.findIndex((a) => a.id === id),
      a = c.artboards[index];
    if (!a) return;
    const token = MKWPagePreviewCache.tokens(project),
      relevant = c.objects.filter(
        (o) =>
          carouselObjectVisible(o, c) &&
          (!MKWCarouselPolicy.contentFrame(c, o) ||
            policy.intersects(MKWCarouselPolicy.contentFrame(c, o), a)) &&
          (!o.pageFragment || o.pageId === id) &&
          MKWCarouselPolicy.intersects(carouselPaintBounds(o), a),
      );
    const assets = [
        ...new Set(
          relevant.flatMap((o) => [
            "image:" + o.imageId,
            "image:" + o.strokeImageId,
            "logo:" + o.source,
          ]),
        ),
      ].map((id) => [id, token(id)]),
      fonts = project.fonts.map((f) => [f.role, token("font:" + f.role)]);
    const objects = relevant.map((o) => ({
      ...o,
      x: o.x - a.x,
      y: o.y - a.y,
      id: undefined,
      pageId: undefined,
      name: undefined,
      locked: undefined,
      imageSourceId: undefined,
      effectSeed: o.effectSeed ?? (o.effects?.noise ? o.id : undefined),
    }));
    const fingerprint = JSON.stringify([
      a.w,
      a.h,
      a.bg,
      objects,
      c.folders
        ?.filter((f) => relevant.some((o) => o.folderId === f.id))
        .map((f) => ({ id: f.id, visible: f.visible })),
      assets,
      fonts,
      fontStatus,
      MKWTextHyphen.version,
    ]);
    const view = {
      ...project,
      images: project.images.map((a) => ({ ...a })),
      logos: project.logos.map((a) => ({ ...a })),
      fonts: project.fonts.map((a) => ({ ...a })),
      carousel: {
        ...c,
        artboards: c.artboards.map((a) => ({ ...a })),
        folders: clone(c.folders || []),
        objects: relevant.map(clone),
      },
    };
    let loading = null,
      finishLoading = () => {};
    const timer = setTimeout(() => {
      if (!current()) return;
      loading = document.createElement("span");
      loading.className = "pages-preview-loading";
      loading.setAttribute("aria-hidden", "true");
      canvas.parentElement.append(loading);
      finishLoading = MKWUIControls.loading(loading);
    }, 150);
    try {
      const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(fingerprint),
        ),
        key = [...new Uint8Array(digest)]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      if (!current() || p !== project || p.carousel !== c) return;
      const preview = await MKWPagePreviewCache.get(
        project,
        key,
        async (isCurrent) => {
          const scale = Math.min(64 / a.w, 80 / a.h),
            out = makeCanvas(
              Math.max(1, Math.round(a.w * scale)),
              Math.max(1, Math.round(a.h * scale)),
            );
          await carouselPaint(
            out.getContext("2d"),
            index,
            scale,
            false,
            null,
            null,
            isCurrent,
            previewImage,
            view,
          );
          return out;
        },
      );
      if (preview && current()) {
        canvas.width = preview.width;
        canvas.height = preview.height;
        canvas.getContext("2d").drawImage(preview, 0, 0);
      }
    } catch (error) {
      if (current()) announce("Vorschau nicht verfügbar: " + error.message);
    } finally {
      clearTimeout(timer);
      finishLoading();
      loading?.remove();
    }
  }
  function renameBoard(info) {
    const identity = p,
      dialog = document.createElement("dialog");
    dialog.id = "artboardRenameDialog";
    dialog.setAttribute("aria-labelledby", "artboardRenameTitle");
    dialog.innerHTML = `<form novalidate><h2 id="artboardRenameTitle">Artboard umbenennen</h2><label>Name<input id="artboardNameInput" value="${esc(info.name)}" maxlength="80" required></label><div class="studio-feedback-actions"><button type="button" data-board-cancel>Abbrechen</button><button type="submit" data-board-apply class="primary">Umbenennen</button></div></form>`;
    const input = dialog.querySelector("input");
    input.oninput = () => MKWFields.clear(input);
    dialog.querySelector("[data-board-cancel]").onclick = () => dialog.close();
    dialog.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      if (p !== identity) return;
      const name = input.value.trim();
      if (!MKWFields.validate(input, true)) {
        input.focus();
        return;
      }
      if (name.length > 80) {
        MKWFields.error(input, "Verwende einen Namen mit 1–80 Zeichen.");
        input.focus();
        return;
      }
      if (
        name === info.name ||
        commit(
          { type: "rename-artboard", id: info.id, name },
          "Artboard umbenannt.",
        )
      )
        dialog.close();
    };
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        document.querySelector("#spreadPages")?.focus({ preventScroll: true });
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector("input").focus();
    dialog.querySelector("input").select();
  }
  function addPage(info) {
    const c = p.carousel,
      index = c.pageStructure.artboardInfo.findIndex((a) => a.id === info.id),
      group = c.pageStructure.groups[index];
    if (group)
      commit(
        { type: "append-page", ids: [group[0]] },
        "Seite in diesem Artboard hinzugefügt.",
      );
  }
  function boardMenu(info, event, trigger) {
    document.querySelector("#artboardContextMenu")?.remove();
    const menu = document.createElement("div");
    menu.id = "artboardContextMenu";
    menu.className = "carousel-effect-menu pages-action-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("popover", "auto");
    menu.setAttribute("aria-label", "Artboard-Aktionen");
    for (const [key, label] of [
      ["add-page", "Seite hinzufügen"],
      ["edit", "Artboard bearbeiten"],
      ["rename", "Umbenennen"],
      ["duplicate", "Artboard duplizieren"],
      ["delete", "Artboard löschen …"],
    ]) {
      const b = document.createElement("button");
      b.setAttribute("role", "menuitem");
      b.textContent = label;
      if (key === "delete") b.classList.add("pages-delete-action");
      b.onclick = () => {
        menu.hidePopover();
        if (key === "add-page") {
          addPage(info);
        } else if (key === "rename") renameBoard(info);
        else if (key === "edit") editSpread();
        else if (key === "duplicate")
          commit(
            { type: "duplicate-artboard", id: info.id },
            "Artboard dupliziert.",
          );
        else remove();
      };
      menu.append(b);
    }
    document.body.append(menu);
    MKWUIMenu.open(
      menu,
      document.querySelector(
        `[data-board-row="${CSS.escape(info.id)}"] .pages-board-menu`,
      ) || trigger,
    );
  }
  function rename(id = [...selected][0]) {
    const row = document.querySelector(`[data-page="${CSS.escape(id || "")}"]`),
      a = p.carousel.artboards.find((a) => a.id === id);
    if (!row || !a) return;
    const text = row.querySelector(".pages-thumb-title"),
      input = document.createElement("input");
    input.value = a.name;
    input.maxLength = 80;
    input.setAttribute("aria-label", "Seite umbenennen");
    row.draggable = false;
    text.replaceChildren(input);
    let done = false;
    const finish = (accept) => {
      if (done) return;
      done = true;
      input.onblur = null;
      if (accept && input.value.trim() && input.value.trim() !== a.name)
        commit(
          { type: "rename", ids: [id], name: input.value },
          "Seite umbenannt.",
        );
      else {
        carouselPanel();
        requestAnimationFrame(() => {
          const list = document.querySelector("#spreadPages"),
            focus = document.activeElement;
          if (
            list &&
            !(list.contains(focus) && focus !== list) &&
            !focus?.closest('[role="menu"],dialog[open]')
          )
            list.focus({ preventScroll: true });
        });
      }
    };
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (["Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        finish(e.key === "Enter");
      }
    };
    input.onblur = () => finish(true);
    input.focus();
    input.select();
  }
  async function remove() {
    const identity = p,
      ids = [...selected];
    if (!ids.length) return;
    const dialog = document.createElement("dialog");
    dialog.id = "spreadDeleteDialog";
    dialog.setAttribute("aria-labelledby", "spreadDeleteTitle");
    dialog.innerHTML = `<h2 id="spreadDeleteTitle">${ids.length} ${ids.length === 1 ? "Seite" : "Seiten"} löschen?</h2><p>Inhalte behalten legt die Elemente auf der Montagefläche ab. Gemeinsam verwendete Bilddateien werden weiterverwendet. Rückgängig stellt die Seiten wieder her.</p><div class="studio-feedback-actions"><button data-choice="cancel" autofocus>Abbrechen</button><button data-choice="keep">Inhalte behalten</button><button data-choice="delete" class="studio-destructive">Mit Inhalten löschen</button></div>`;
    for (const b of dialog.querySelectorAll("button"))
      b.onclick = () => dialog.close(b.dataset.choice);
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener(
      "close",
      () => {
        const choice = dialog.returnValue;
        dialog.remove();
        if (p === identity && ["keep", "delete"].includes(choice))
          commit(
            { type: "delete", ids, content: choice === "delete" },
            "Seiten gelöscht. Rückgängig ist möglich.",
          );
        else document.querySelector("#spreadPages")?.focus();
      },
      { once: true },
    );
  }
  function action(key) {
    const ids = [...selected],
      c = p.carousel,
      index = c.artboards.findIndex((a) => selected.has(a.id));
    if (key === "more")
      return menu(
        null,
        [...selected][0],
        document.querySelector("[data-spread-action=more]"),
      );
    if (key === "move-to") return moveToArtboard();
    if (key === "edit-spread") return editSpread();
    if (key === "rename") return rename();
    if (key === "delete") return remove();
    if (key === "add-pair")
      return commit(
        { type: "add", count: 2, spread: true },
        "Neuer Druckbogen mit zwei Seiten hinzugefügt.",
      );
    if (["previous", "next"].includes(key))
      return commit(
        {
          type: "move",
          ids,
          index:
            key === "previous"
              ? Math.max(0, index - 1)
              : Math.min(c.n, index + ids.length + 1),
        },
        "Seiten verschoben.",
      );
    return commit(
      { type: key, ids },
      key === "join"
        ? "Seiten zu einem Druckbogen zusammengefügt."
        : key === "split"
          ? "Bogen getrennt. Seiteninhalte bleiben erhalten."
          : "Seiten dupliziert.",
    );
  }
  function menu(event, id, anchor = document.querySelector("#spreadPages")) {
    document.querySelector("#spreadContextMenu")?.remove();
    const menu = document.createElement("div");
    menu.id = "spreadContextMenu";
    menu.className = "carousel-effect-menu pages-action-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("popover", "auto");
    menu.setAttribute("aria-label", "Seitenaktionen");
    for (const [key, label] of [
      ["add-pair", "Neuer Druckbogen"],
      ["move-to", "In Artboard verschieben …"],
      ["previous", "Nach vorne"],
      ["next", "Nach hinten"],
      ["join", "Zu Druckbogen zusammenfügen"],
      ["split", "Bogen trennen"],
      ["duplicate", "Duplizieren"],
      ["rename", "Umbenennen"],
      ["delete", "Löschen …"],
    ]) {
      const b = document.createElement("button");
      b.setAttribute("role", "menuitem");
      b.textContent = label;
      if (key === "join" && selected.size < 2) b.disabled = true;
      if (key === "rename" && selected.size !== 1) b.disabled = true;
      if (
        key === "split" &&
        !p.carousel.pageStructure.groups.some(
          (g) => g.length > 1 && g.some((id) => selected.has(id)),
        )
      )
        b.disabled = true;
      if (key === "delete") b.classList.add("pages-delete-action");
      b.onclick = () => {
        menu.hidePopover();
        action(key);
      };
      menu.append(b);
    }
    document.body.append(menu);
    MKWUIMenu.open(
      menu,
      document.querySelector(`[data-page="${CSS.escape(id || "")}"]`) || anchor,
    );
  }
  function moveToArtboard() {
    const identity = p,
      ids = [...selected],
      dialog = document.createElement("dialog");
    dialog.id = "movePagesDialog";
    dialog.setAttribute("aria-labelledby", "movePagesTitle");
    const structure = p.carousel.pageStructure;
    const targets = structure.artboardInfo
      .map((a, i) => ({
        ...a,
        count: structure.groups[i].length,
        added: ids.filter((id) => !structure.groups[i].includes(id)).length,
      }))
      .filter((a) => a.added > 0 && a.count + a.added <= 20);
    dialog.innerHTML = `<h2 id="movePagesTitle">${ids.length === 1 ? "Seite verschieben" : `${ids.length} Seiten verschieben`}</h2><p>Wähle das Ziel. Die Seiten werden dort am Ende angefügt. Bilder bleiben ganz und folgen ihrer ersten Seite.</p><label>Ziel-Artboard<select id="movePagesTarget">${targets.map((a) => `<option value="${esc(a.id)}">${esc(a.name)} · ${a.count} → ${a.count + a.added} Seiten</option>`).join("")}</select></label><p id="movePagesError" role="status">${targets.length ? "" : "Kein anderes Artboard mit genügend Platz vorhanden. Erstelle zuerst ein neues Artboard (maximal 20 Seiten pro Artboard)."}</p><div class="studio-feedback-actions"><button data-move-cancel autofocus>Abbrechen</button><button data-move-apply class="primary" ${targets.length ? "" : "disabled"}>Verschieben</button></div>`;
    dialog.querySelector("[data-move-cancel]").onclick = () => dialog.close();
    dialog.querySelector("[data-move-apply]").onclick = () => {
      if (p !== identity) return;
      const id = dialog.querySelector("select").value;
      if (
        commit(
          { type: "move-to-artboard", id, ids },
          "Seiten in das Ziel-Artboard verschoben.",
        )
      )
        dialog.close();
      else
        dialog.querySelector("#movePagesError").textContent =
          "Die Seiten konnten nicht verschoben werden. Prüfe das Ziel und versuche es erneut. Dein Layout bleibt erhalten.";
    };
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        document.querySelector("#spreadPages")?.focus({ preventScroll: true });
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  }
  function editSpread() {
    const c = p.carousel,
      identity = p,
      first = c.artboards.find((a) => selected.has(a.id));
    if (!first) return;
    const group = c.pageStructure.groups.find((g) => g.includes(first.id)),
      pages = group.map((id) => c.artboards.find((a) => a.id === id)),
      base = pages[0],
      x = Math.min(...pages.map((a) => a.x)),
      y = Math.min(...pages.map((a) => a.y)),
      trigger = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.id = "spreadEditDialog";
    dialog.setAttribute("aria-labelledby", "spreadEditTitle");
    const field = (key, label, value, min, max) =>
      `<label>${label}<input data-bogen="${key}" type="number" step="1" min="${min}" max="${max}" value="${value}" required></label>`;
    dialog.innerHTML = `<h2 id="spreadEditTitle">${esc(c.pageStructure.artboardInfo[c.pageStructure.groups.indexOf(group)].name)} bearbeiten</h2><p>Die Änderungen gelten nur für diesen Bogen. Überzählige Seiten werden abgetrennt und bleiben erhalten.</p>${field("count", "Slides nebeneinander (1–20)", group.length, 1, 20)}<div class="carousel-fields">${field("x", "Position X (px)", x, 0, 100000)}${field("y", "Position Y (px)", y, 0, 100000)}</div><label class="spread-format-toggle"><input id="spreadUniform" type="checkbox">Für alle Seiten dieses Bogens dasselbe Format verwenden</label><div id="spreadUniformFields" class="carousel-fields" hidden>${policy.formatKeys.map((k) => field(k, { w: "Breite (px)", h: "Höhe (px)", top: "Schutzzone oben", bottom: "Schutzzone unten", left: "Schutzzone links", right: "Schutzzone rechts" }[k], base[k], k === "w" || k === "h" ? 240 : 0, 4000)).join("")}</div><p id="spreadEditError" role="status"></p><div class="studio-feedback-actions"><button data-bogen-cancel autofocus>Abbrechen</button><button data-bogen-apply class="primary">Artboard übernehmen</button></div>`;
    const uniform = dialog.querySelector("#spreadUniform"),
      button = dialog.querySelector("[data-bogen-apply]"),
      error = dialog.querySelector("#spreadEditError");
    const read = () =>
      Object.fromEntries(
        [...dialog.querySelectorAll("[data-bogen]")].map((f) => [
          f.dataset.bogen,
          f.valueAsNumber,
        ]),
      );
    const operations = () => {
      const v = read();
      return {
        type: "edit-spread",
        ids: [base.id],
        count: v.count,
        x: v.x,
        y: v.y,
        ...(uniform.checked
          ? {
              format: Object.fromEntries(
                policy.formatKeys.map((k) => [k, v[k]]),
              ),
            }
          : {}),
      };
    };
    dialog.oninput = () => {
      dialog.querySelector("#spreadUniformFields").hidden = !uniform.checked;
      try {
        model.plan(c, operations(), carouselObjectBounds, uid);
        error.textContent = "";
        button.disabled = false;
      } catch (e) {
        error.textContent = e.message;
        button.disabled = true;
      }
    };
    dialog.querySelector("[data-bogen-cancel]").onclick = () => dialog.close();
    button.onclick = () => {
      if (p !== identity || p.carousel !== c) return;
      try {
        const value = operations();
        model.plan(c, value, carouselObjectBounds, uid);
        dialog.close();
        commit(value, "Druckbogen aktualisiert. Inhalte bleiben erhalten.");
      } catch (e) {
        error.textContent = e.message;
      }
    };
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  }
  async function format(value) {
    if (!value) return;
    const a = p.carousel.artboards.find((a) => selected.has(a.id));
    if (!a) return;
    if (value === "custom") {
      const identity = p,
        ids = [...selected],
        trigger = document.activeElement,
        dialog = document.createElement("dialog");
      dialog.id = "spreadFormatDialog";
      dialog.setAttribute("aria-labelledby", "spreadFormatTitle");
      dialog.innerHTML = `<h2 id="spreadFormatTitle">${ids.length} Seiten formatieren</h2><p>Inhalte behalten ihre Grösse. Die Schutzzonen gelten für alle gewählten Seiten.</p><div class="carousel-fields">${policy.formatKeys.map((k) => `<label>${{ w: "Breite", h: "Höhe", top: "Oben", bottom: "Unten", left: "Links", right: "Rechts" }[k]} (px)<input data-spread-format="${k}" type="number" step="1" min="${k === "w" || k === "h" ? 240 : 0}" max="4000" value="${a[k]}" required></label>`).join("")}</div><p id="spreadFormatError" role="status"></p><div class="studio-feedback-actions"><button data-format-cancel autofocus>Abbrechen</button><button data-format-apply class="primary">Übernehmen</button></div>`;
      const read = () =>
          Object.fromEntries(
            [...dialog.querySelectorAll("input")].map((f) => [
              f.dataset.spreadFormat,
              f.valueAsNumber,
            ]),
          ),
        button = dialog.querySelector("[data-format-apply]"),
        error = dialog.querySelector("#spreadFormatError");
      dialog.oninput = () => {
        const ok = policy.validFormat(read());
        button.disabled = !ok;
        error.textContent = ok
          ? ""
          : "Breite und Höhe: 240–4000 px. Die Schutzzonen müssen ins Format passen.";
      };
      dialog.querySelector("[data-format-cancel]").onclick = () =>
        dialog.close();
      button.onclick = () => {
        if (!policy.validFormat(read()) || p !== identity) return;
        const values = read();
        dialog.close();
        commit(
          { type: "format", ids, format: values },
          "Format der ausgewählten Seiten übernommen.",
        );
      };
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        },
        { once: true },
      );
      document.body.append(dialog);
      dialog.showModal();
      return;
    }
    const [w, h] = value.split("x").map(Number),
      factor = Math.min(w / a.w, h / a.h),
      fmt = {
        w,
        h,
        ...Object.fromEntries(
          ["top", "bottom", "left", "right"].map((k) => [
            k,
            Math.floor(a[k] * factor),
          ]),
        ),
      };
    commit(
      { type: "format", ids: [...selected], format: fmt },
      "Format für die ausgewählten Seiten übernommen. Elemente wurden nicht skaliert.",
    );
  }
  function canvas(root) {
    const c = p.carousel,
      s = carouselZoom;
    const view = visible(),
      groups = c.pageStructure.groups,
      byId = new Map(c.artboards.map((a, i) => [a.id, { ...a, index: i }]));
    const visibleIds = groups
      .filter((g) => g.some((id) => policy.intersects(byId.get(id), view)))
      .flat();
    const key = JSON.stringify([
      c.artboards,
      visibleIds,
      s,
      carouselUI.slide,
      c.pageStructure,
    ]);
    if (root.dataset.spreadLayout === key) return;
    root.dataset.spreadLayout = key;
    root.innerHTML = "";
    for (const group of groups) {
      const pages = group.map((id) => byId.get(id)).sort((a, b) => a.x - b.x),
        left = pages[0],
        rect = {
          x: left.x,
          y: left.y,
          w: pages.reduce((sum, a) => sum + a.w, 0),
          h: Math.max(...pages.map((a) => a.h)),
        };
      if (!policy.intersects(rect, view)) continue;
      const surface = document.createElement("div");
      surface.className = "spread-canvas-surface";
      Object.assign(surface.style, {
        left: rect.x * s + "px",
        top: rect.y * s + "px",
        width: rect.w * s + "px",
        height: rect.h * s + "px",
      });
      root.append(surface);
      const info = c.pageStructure.artboardInfo[groups.indexOf(group)],
        add = document.createElement("button");
      add.className = "spread-add-page";
      if (!root.querySelector("#carouselAddSlide")) add.id = "carouselAddSlide";
      add.dataset.addToArtboard = info.id;
      add.innerHTML = studioIcon("plus");
      add.setAttribute("aria-label", `Seite zu „${info.name}“ hinzufügen`);
      add.title = "Seite in diesem Artboard hinzufügen";
      add.disabled =
        group.length >= model.maxSpreadPages || c.n >= model.maxPages;
      Object.assign(add.style, {
        left: (rect.x + rect.w) * s + 12 + "px",
        top: rect.y * s + "px",
      });
      add.onclick = (e) => {
        e.stopPropagation();
        addPage(info);
      };
      root.append(add);
      for (const a of pages) {
        if (!policy.intersects(a, view)) continue;
        const button = document.createElement("button");
        button.className = "carousel-slide-tab";
        button.dataset.slide = a.index;
        button.textContent = `${c.pageStructure.startNumber + a.index} · ${a.name}`;
        button.setAttribute(
          "aria-label",
          `${a.name} auswählen oder Bogen verschieben`,
        );
        button.setAttribute("aria-pressed", carouselUI.slide === a.index);
        const sideLabel = pages.length === 1 && c.pageStructure.gap * s < 72;
        button.classList.toggle("spread-side-label", sideLabel);
        button.hidden = a.w * s < 48 || a.h * s < 56;
        Object.assign(button.style, {
          left: a.x * s - (sideLabel ? 12 : 0) + "px",
          top: a.y * s - (sideLabel ? 0 : 44) + "px",
          maxWidth: sideLabel ? "160px" : Math.max(44, a.w * s - 8) + "px",
        });
        button.onclick = (e) => {
          e.stopPropagation();
          if (+button.dataset.suppressClickUntil > performance.now()) return;
          selected = new Set([a.id]);
          carouselSlideSelect(a.index);
        };
        button.onpointerdown = (e) => dragPage(e, a);
        root.append(button);
        if (a !== left) {
          const fold = document.createElement("div");
          fold.className = "spread-fold";
          Object.assign(fold.style, {
            left: a.x * s + "px",
            top: a.y * s + "px",
            height: rect.h * s + "px",
          });
          root.append(fold);
        }
        if (c.pageStructure.bleed) {
          const bleed = document.createElement("div");
          bleed.className = "spread-bleed";
          const n = c.pageStructure.bleed;
          Object.assign(bleed.style, {
            left: (a.x - n) * s + "px",
            top: (a.y - n) * s + "px",
            width: (a.w + n * 2) * s + "px",
            height: (a.h + n * 2) * s + "px",
          });
          root.append(bleed);
        }
      }
    }
    if (c.n) return;
    const add = document.createElement("button");
    add.id = "carouselAddSlide";
    add.innerHTML = studioIcon("plus");
    add.setAttribute("aria-label", "Neue Seite hinzufügen");
    add.disabled = c.n >= model.maxPages;
    const a = c.artboards.at(-1) || { x: 0, y: 0, w: 100, h: 0 };
    Object.assign(add.style, {
      left: (a.x + a.w) * s + 24 + "px",
      top: a.y * s + "px",
    });
    add.onclick = (e) => {
      e.stopPropagation();
      commit({ type: "add" }, "Neue Seite hinzugefügt.");
    };
    root.append(add);
  }
  function visible() {
    const canvas = document.querySelector("#carouselCanvas"),
      viewport = document.querySelector("#carouselViewport");
    if (!canvas || !viewport) return { x: 0, y: 0, w: 100000, h: 100000 };
    const r = carouselOrigin(),
      v = viewport.getBoundingClientRect(),
      pad = 200 / carouselZoom;
    return {
      x: (v.left - r.left) / carouselZoom - pad,
      y: (v.top - r.top) / carouselZoom - pad,
      w: (v.width + 400) / carouselZoom,
      h: (v.height + 400) / carouselZoom,
    };
  }
  function dragPage(event, a) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const initial = p.carousel,
      identity = p,
      button = event.currentTarget,
      start = { x: event.clientX, y: event.clientY },
      detach = (event.metaKey || event.ctrlKey) && event.shiftKey;
    let proposal = null,
      moved = false;
    const ghost = document.createElement("div");
    ghost.className = "spread-drag-ghost";
    ghost.textContent = a.name;
    document.body.append(ghost);
    const move = (e) => {
      if (e.pointerId !== event.pointerId) return;
      if (p !== identity) return;
      moved ||= Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5;
      Object.assign(ghost.style, {
        left: e.clientX + 12 + "px",
        top: e.clientY + 12 + "px",
      });
      const point = carouselPoint(e),
        target = initial.artboards.find(
          (v) =>
            v.id !== a.id &&
            point.x >= v.x - 30 &&
            point.x <= v.x + v.w + 30 &&
            point.y >= v.y &&
            point.y <= v.y + v.h,
        );
      ghost.classList.toggle("docking", !!target);
      proposal = target
        ? {
            type: "join",
            ids: [
              ...new Set([
                a.id,
                ...initial.pageStructure.groups.find((g) =>
                  g.includes(target.id),
                ),
              ]),
            ],
          }
        : {
            type: "position",
            ids: [a.id],
            x: Math.max(
              0,
              Math.round(a.x + (e.clientX - start.x) / carouselZoom),
            ),
            y: Math.max(
              0,
              Math.round(a.y + (e.clientY - start.y) / carouselZoom),
            ),
          };
      if (detach)
        proposal = {
          type: "batch",
          actions: [
            { type: "detach", ids: [a.id] },
            {
              type: "position",
              ids: [a.id],
              x: Math.max(
                0,
                Math.round(a.x + (e.clientX - start.x) / carouselZoom),
              ),
              y: Math.max(
                0,
                Math.round(a.y + (e.clientY - start.y) / carouselZoom),
              ),
            },
          ],
        };
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancel);
      ghost.remove();
    };
    const cancel = () => {
      button.dataset.suppressClickUntil = performance.now() + 300;
      cleanup();
      announce("Verschieben abgebrochen.");
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        cancel();
      }
    };
    const up = (e) => {
      if (e.pointerId !== event.pointerId) return;
      move(e);
      if (moved) button.dataset.suppressClickUntil = performance.now() + 300;
      cleanup();
      if (moved && proposal && p === identity && p.carousel === initial)
        commit(
          proposal,
          detach
            ? "Seite aus dem Bogen gelöst."
            : "Bogenstruktur aktualisiert.",
        );
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
  }
  function scroll() {
    if (!active() || repaintFrame) return;
    repaintFrame = requestAnimationFrame(() => {
      repaintFrame = 0;
      if (active() && document.querySelector("#carouselCanvas"))
        carouselRefresh();
    });
  }
  return {
    selectedBoard: () =>
      p.carousel?.pageStructure?.artboardInfo?.find(
        (a) => a.id === selectedArtboard,
      ),
    panel,
    editArtboard: (id) => {
      selected = new Set([id]);
      editSpread();
    },
    commit,
    active,
    canvas,
    visible,
    scroll,
    action,
    dispose: () => {
      disposeList();
      disposeList = () => {};
    },
    addSpread: () =>
      commit(
        {
          type: "batch",
          actions: [
            ...(active() ? [] : [{ type: "mode", mode: "spreads" }]),
            { type: "add", count: 2, spread: true },
          ],
        },
        "Neuer Druckbogen hinzugefügt.",
      ),
  };
})();
