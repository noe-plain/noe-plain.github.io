(function (root) {
  "use strict";
  const collapsed = new Set();
  function mount(host, api) {
    const { c, selected } = api,
      box = host.querySelector("#spreadPages"),
      s = c.pageStructure;
    box.setAttribute("role", "tree");
    box.setAttribute("aria-label", "Seiten und Artboards");
    let focused = api.focused || [...selected][0] || s.artboardInfo[0]?.id,
      frame = 0,
      drag = null,
      moving = null,
      disposed = false,
      renderKey = null,
      dropTarget = null;
    const groups = s.groups.map((ids, i) => ({ ids, info: s.artboardInfo[i] }));
    const alive = new Set(s.artboardInfo.map((a) => a.id));
    for (const id of collapsed) if (!alive.has(id)) collapsed.delete(id);
    const trash = document.createElement("button");
    trash.className = "pages-drop-delete";
    trash.hidden = true;
    trash.textContent = "Hier ablegen, um ausgewählte Seiten zu löschen";
    const feedback = document.createElement("p");
    feedback.className = "pages-drag-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;
    box.after(feedback, trash);
    const placeFeedback = () => {
      const r = box.getBoundingClientRect(),
        panel = box.closest("#carouselProperties").getBoundingClientRect();
      feedback.style.left = `${r.left + 8}px`;
      feedback.style.width = `${Math.max(0, r.width - 16)}px`;
      feedback.style.top = `${Math.max(r.top, Math.min(r.bottom, panel.bottom) - feedback.offsetHeight - 8)}px`;
    };
    const reportDrop = (node, kind, message, copy = false) => {
      if (
        dropTarget?.node === node &&
        dropTarget.kind === kind &&
        dropTarget.message === message &&
        dropTarget.copy === copy
      )
        return;
      cleanDrop();
      dropTarget = { node, kind, message, copy };
      node.classList.add(kind);
      feedback.hidden = false;
      feedback.textContent = (copy ? "Kopie: " : "") + message;
      placeFeedback();
    };
    const stopDrag = () => {
      drag = null;
      trash.hidden = true;
      feedback.hidden = true;
      for (const node of box.querySelectorAll(".is-dragging"))
        node.classList.remove("is-dragging");
      cleanDrop();
    };
    trash.onclick = () => api.remove();
    trash.ondragover = (e) => {
      if (drag) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        reportDrop(
          trash,
          "drop-join",
          "Ausgewählte Seiten löschen – danach Inhalt behalten oder löschen wählen.",
        );
      }
    };
    trash.ondragleave = () => cleanDrop();
    trash.ondrop = (e) => {
      if (!drag) return;
      e.preventDefault();
      stopDrag();
      api.remove();
    };

    let rows = [];
    const geometry = () => {
      let top = 0;
      rows = groups.map((g) => {
        const h = collapsed.has(g.info.id) ? 68 : 184;
        const row = { ...g, top, h };
        top += h + 24;
        return row;
      });
      return top;
    };
    function state() {
      for (const row of box.querySelectorAll("[data-page]")) {
        row.setAttribute("aria-selected", selected.has(row.dataset.page));
        row.classList.toggle("active-descendant", focused === row.dataset.page);
      }
      for (const row of box.querySelectorAll("[data-artboard]")) {
        const g = groups.find((g) => g.info.id === row.dataset.artboard);
        row.setAttribute(
          "aria-selected",
          g.ids.every((id) => selected.has(id)),
        );
        row.classList.toggle("active-descendant", focused === g.info.id);
      }
      const node =
        box.querySelector(`[data-page="${CSS.escape(focused || "")}"]`) ||
        box.querySelector(`[data-artboard="${CSS.escape(focused || "")}"]`);
      if (node) box.setAttribute("aria-activedescendant", node.id);
      else box.removeAttribute("aria-activedescendant");
      api.actionsState();
    }
    function contextAction(event, run) {
      event.preventDefault();
      event.stopPropagation();
      // Firefox dispatches the context menu before the releasing pointerup.
      // Opening afterwards avoids immediately light-dismissing the popover.
      if (event.buttons)
        window.addEventListener(
          "pointerup",
          () => {
            setTimeout(run, 0);
          },
          { once: true },
        );
      else run();
    }
    function selectPage(id, e) {
      api.choose(id, e);
      focused = id;
      state();
      box.focus({ preventScroll: true });
      api.openPage(id);
    }
    function selectBoard(g, e = {}) {
      if (!e.ctrlKey && !e.metaKey) selected.clear();
      const remove =
        (e.ctrlKey || e.metaKey) && g.ids.every((id) => selected.has(id));
      for (const id of g.ids) remove ? selected.delete(id) : selected.add(id);
      focused = g.info.id;
      state();
      box.focus({ preventScroll: true });
      api.highlightBoard(g.info.id, g.ids);
    }
    function toggle(g) {
      collapsed.has(g.info.id)
        ? collapsed.delete(g.info.id)
        : collapsed.add(g.info.id);
      focused = g.info.id;
      draw();
    }
    const cleanDrop = () => {
      dropTarget?.node?.classList.remove(dropTarget.kind);
      dropTarget = null;
      for (const node of box.querySelectorAll(
        ".drop-join,.drop-before,.drop-after",
      ))
        node.classList.remove("drop-join", "drop-before", "drop-after");
    };
    function draw() {
      frame = 0;
      if (disposed || !box.isConnected) return;
      if (box.querySelector("input:focus")) return;
      const height = geometry(),
        visible = rows.filter(
          (g) =>
            g.top + g.h >= box.scrollTop - 170 &&
            g.top <= box.scrollTop + box.clientHeight + 170,
        );
      const key = visible
        .map((g) => g.info.id + ":" + g.top + ":" + g.h)
        .join("|");
      if (key === renderKey) {
        state();
        return;
      }
      renderKey = key;
      box.innerHTML =
        `<div class="pages-tree-space" style="height:${height}px" aria-hidden="true"></div>` +
        visible
          .map((g) => {
            const closed = collapsed.has(g.info.id),
              first = c.artboards.findIndex((a) => a.id === g.ids[0]);
            return `<div class="pages-artboard" style="top:${g.top}px;height:${g.h}px" data-board-row="${g.info.id}"><div class="pages-artboard-heading" id="board-option-${g.info.id}" role="treeitem" aria-expanded="${!closed}" aria-level="1" aria-setsize="${groups.length}" aria-posinset="${groups.findIndex((v) => v.info.id === g.info.id) + 1}" aria-selected="${g.ids.every((id) => selected.has(id))}" data-artboard="${g.info.id}" ${closed ? "" : `aria-controls="board-pages-${g.info.id}"`}><span class="pages-disclosure" aria-hidden="true" data-expanded="${!closed}">${api.icon("down")}</span><strong class="pages-board-name">${api.esc(g.info.name)}</strong><span class="pages-board-count">${g.ids.length}<span class="visually-hidden"> Seiten</span></span><button class="pages-board-add" aria-label="Seite zu ${api.esc(g.info.name)} hinzufügen" title="Seite in diesem Artboard hinzufügen" ${g.ids.length >= 20 || c.n >= 200 ? "disabled" : ""}>${api.icon("plus")}</button><button class="pages-board-menu" aria-label="Aktionen für ${api.esc(g.info.name)}" aria-haspopup="menu">${api.icon("more")}</button></div>${
              closed
                ? ""
                : `<div class="pages-strip" id="board-pages-${g.info.id}" role="group" tabindex="0" aria-label="Seiten in ${api.esc(g.info.name)}">${g.ids
                    .map((id, j) => {
                      const a = c.artboards.find((a) => a.id === id),
                        index = c.artboards.indexOf(a),
                        ratio = Math.min(56 / a.w, 64 / a.h);
                      return `<div class="pages-thumb" id="page-option-${id}" data-page="${id}" role="treeitem" aria-level="2" aria-posinset="${j + 1}" aria-setsize="${g.ids.length}" aria-selected="${selected.has(id)}" draggable="true"><span class="pages-paper" style="width:${Math.round(a.w * ratio)}px;height:${Math.round(a.h * ratio)}px;background:${a.bg}" aria-hidden="true"><canvas width="1" height="1"></canvas></span><span class="pages-thumb-title" title="${api.esc(MKWCarouselPolicy.slideInfo(c, index).label)} · ${api.esc(a.name)}"><strong>${j + 1}</strong> · ${api.esc(MKWCarouselPolicy.slideInfo(c, index).title)}</span><span class="visually-hidden">${a.w} × ${a.h}</span></div>`;
                    })
                    .join("")}</div>`
            }</div>`;
          })
          .join("");
      state();
      for (const row of box.querySelectorAll("[data-board-row]")) {
        const g = groups.find((g) => g.info.id === row.dataset.boardRow),
          heading = row.querySelector(".pages-artboard-heading"),
          disclosure = row.querySelector(".pages-disclosure"),
          menu = row.querySelector(".pages-board-menu");
        row.querySelector(".pages-board-add").onclick = (e) => {
          e.stopPropagation();
          api.addPage(g.info);
        };
        heading.onclick = (e) => {
          if (!e.target.closest("button")) selectBoard(g, e);
        };
        heading.ondblclick = (e) => {
          if (!e.target.closest("button")) api.renameBoard(g.info);
        };
        heading.oncontextmenu = (e) =>
          contextAction(e, () => {
            if (!heading.isConnected) return;
            selectBoard(g);
            api.boardMenu(
              g.info,
              e,
              document.querySelector(
                `[data-board-row="${g.info.id}"] .pages-board-menu`,
              ) || menu,
            );
          });
        disclosure.onclick = (e) => {
          e.stopPropagation();
          toggle(g);
        };
        menu.onclick = (e) => {
          e.stopPropagation();
          selectBoard(g);
          api.boardMenu(
            g.info,
            e,
            document.querySelector(
              `[data-board-row="${g.info.id}"] .pages-board-menu`,
            ) || menu,
          );
        };
        heading.ondragover = (e) => {
          if (!drag) return;
          e.preventDefault();
          const copy = drag.copy || e.altKey;
          e.dataTransfer.dropEffect = copy ? "copy" : "move";
          reportDrop(
            heading,
            "drop-join",
            `Mit „${g.info.name}“ verbinden.`,
            copy,
          );
        };
        heading.ondrop = (e) => {
          if (!drag) return;
          e.preventDefault();
          const moved = drag.ids,
            copy = drag.copy || e.altKey;
          stopDrag();
          api.commit(
            copy
              ? { type: "duplicate-to", artboardId: g.info.id, ids: moved }
              : { type: "move-to-artboard", id: g.info.id, ids: moved },
            copy
              ? "Seiten in dieses Artboard kopiert."
              : "Seiten in dieses Artboard verschoben.",
          );
        };
      }
      for (const node of box.querySelectorAll("[data-page]")) {
        const id = node.dataset.page;
        node.onclick = (e) => {
          e.stopPropagation();
          selectPage(id, e);
        };
        node.ondblclick = () => api.renamePage(id);
        node.oncontextmenu = (e) =>
          contextAction(e, () => {
            if (!node.isConnected) return;
            if (!selected.has(id)) api.choose(id, e);
            focused = id;
            state();
            api.pageMenu(e, id, node);
          });
        node.ondragstart = (e) => {
          if (!selected.has(id)) api.choose(id, e);
          drag = {
            ids: [...selected],
            copy: e.altKey,
            detach: (e.metaKey || e.ctrlKey) && e.shiftKey,
          };
          e.dataTransfer.setData(
            "application/x-mkw-page",
            JSON.stringify(drag),
          );
          e.dataTransfer.effectAllowed = "copyMove";
          trash.hidden = false;
          feedback.hidden = false;
          feedback.textContent =
            "Am Rand einsortieren · in der Mitte mit dem Artboard verbinden. Option/Alt erstellt eine Kopie.";
          placeFeedback();
          for (const item of box.querySelectorAll("[data-page]"))
            item.classList.toggle(
              "is-dragging",
              drag.ids.includes(item.dataset.page),
            );
          state();
        };
        node.ondragover = (e) => {
          if (!drag) return;
          e.preventDefault();
          e.stopPropagation();
          const r = node.getBoundingClientRect(),
            f = (e.clientX - r.left) / r.width,
            copy = drag.copy || e.altKey,
            index = c.artboards.findIndex((a) => a.id === id),
            group = groups.find((g) => g.ids.includes(id)),
            message = drag.detach
              ? "Aus dem bisherigen Artboard lösen."
              : f < 0.25
                ? `Vor Seite ${s.startNumber + index} einfügen.`
                : f > 0.75
                  ? `Nach Seite ${s.startNumber + index} einfügen.`
                  : `Mit „${group.info.name}“ verbinden.`;
          e.dataTransfer.dropEffect = copy ? "copy" : "move";
          reportDrop(
            node,
            f < 0.25 ? "drop-before" : f > 0.75 ? "drop-after" : "drop-join",
            message,
            copy,
          );
        };
        node.ondrop = (e) => {
          if (!drag) return;
          e.preventDefault();
          e.stopPropagation();
          const index = c.artboards.findIndex((a) => a.id === id),
            r = node.getBoundingClientRect(),
            f = (e.clientX - r.left) / r.width,
            group = groups.find((g) => g.ids.includes(id));
          const copy = drag.copy || e.altKey;
          const targetIndex = group.ids.indexOf(id) + (f > 0.75 ? 1 : 0),
            beforeId =
              f >= 0.25 && f <= 0.75 ? undefined : group.ids[targetIndex];
          const command = copy
            ? {
                type: "duplicate-to",
                ids: drag.ids,
                artboardId: group.info.id,
                beforeId,
              }
            : drag.detach
              ? { type: "detach", ids: drag.ids }
              : {
                  type: "move-to-artboard",
                  id: group.info.id,
                  ids: drag.ids,
                  beforeId,
                };
          stopDrag();
          api.commit(
            command,
            copy ? "Seiten kopiert und einsortiert." : "Seiten verschoben.",
          );
        };
        node.ondragend = stopDrag;
        const canvas = node.querySelector("canvas");
        api.preview(id, canvas, () => !disposed && node.isConnected);
      }
    }
    function ensure(id) {
      const g = rows.find((g) => g.info.id === id || g.ids.includes(id));
      if (!g) return;
      if (g.top < box.scrollTop) box.scrollTop = g.top;
      if (g.top + g.h > box.scrollTop + box.clientHeight)
        box.scrollTop = g.top + g.h - box.clientHeight;
      draw();
      const node = box.querySelector(`[data-page="${CSS.escape(id)}"]`);
      node?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    box.ondragleave = (e) => {
      if (drag && !box.contains(e.relatedTarget)) {
        cleanDrop();
        feedback.hidden = true;
      }
    };
    box.onscroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    box.onkeydown = (e) => {
      if (
        e.target.closest("button,input") ||
        e.altKey ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() !== "a")
      )
        return;
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        " ",
        "Enter",
        "Escape",
        "F2",
        "a",
      ];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const pageIndex = c.artboards.findIndex((a) => a.id === focused),
        group = groups.find(
          (g) => g.info.id === focused || g.ids.includes(focused),
        );
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        selected.clear();
        for (const a of c.artboards) selected.add(a.id);
        state();
        return;
      }
      if (e.key === "Escape") {
        moving = null;
        api.announce("Verschieben abgebrochen.");
        return;
      }
      if (e.key === "F2") {
        group?.info.id === focused
          ? api.renameBoard(group.info)
          : api.renamePage(focused);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (group) {
          if (e.key === "ArrowLeft") {
            collapsed.add(group.info.id);
            focused = group.info.id;
          } else {
            collapsed.delete(group.info.id);
            focused = group.ids[0];
          }
          draw();
          ensure(focused);
        }
        return;
      }
      if (e.key === " ") {
        if (!selected.size && group)
          for (const id of group.ids) selected.add(id);
        moving = { ids: [...selected], index: Math.max(0, pageIndex) };
        api.announce(
          "Pfeile wählen die Zielposition. Eingabe bestätigt; Escape bricht ab.",
        );
        state();
        return;
      }
      if (e.key === "Enter") {
        if (moving) {
          const v = moving;
          moving = null;
          api.commit(
            { type: "move", ids: v.ids, index: v.index },
            "Seiten verschoben.",
          );
        } else if (pageIndex >= 0) api.openPage(focused);
        else if (group) toggle(group);
        return;
      }
      if (moving) {
        moving.index = Math.max(
          0,
          Math.min(
            c.n,
            moving.index +
              (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0),
          ),
        );
        api.announce(`Zielposition ${moving.index + 1}.`);
        return;
      }
      const visibleIds = groups.flatMap((g) =>
          collapsed.has(g.info.id) ? [g.info.id] : g.ids,
        ),
        index = visibleIds.indexOf(focused),
        next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? visibleIds.length - 1
              : Math.max(
                  0,
                  Math.min(
                    visibleIds.length - 1,
                    index + (e.key === "ArrowUp" ? -1 : 1),
                  ),
                ),
        id = visibleIds[next];
      if (!id) return;
      focused = id;
      const g = groups.find((g) => g.info.id === id);
      g ? selectBoard(g, e) : api.choose(id, e);
      ensure(id);
      state();
    };
    const observer = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(draw);
    });
    observer.observe(box);
    geometry();
    draw();
    ensure(focused);
    return () => {
      disposed = true;
      observer.disconnect();
      trash.remove();
      feedback.remove();
      cancelAnimationFrame(frame);
    };
  }
  root.MKWPagesPanel = Object.freeze({ mount });
})(globalThis);
