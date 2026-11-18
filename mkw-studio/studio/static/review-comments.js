"use strict";
window.MKWReviewCommentsUI = (() => {
  const model = MKWReviewCommentsModel;
  let host,
    current,
    editing = false,
    base = "",
    draftProject,
    popup,
    noteButton;
  const key = (ref) => (ref ? `${ref.kind}:${ref.id}` : "");
  function navigation() {
    const single = reviewBoards().length < 2;
    $("#reviewPrevious").disabled = $("#reviewNext").disabled =
      single || editing;
  }
  function mount() {
    if (host) return;
    host = document.createElement("section");
    host.id = "reviewComment";
    host.className = "review-comment";
    host.setAttribute("aria-label", "Interner Bildkommentar");
    host.innerHTML = `<div class="review-comment-heading"><h3>Bildkommentar</h3><span id="reviewCommentScope"></span></div><div id="reviewCommentRead"><p id="reviewCommentText"></p><div class="review-comment-actions"><button id="reviewCommentEdit" type="button">Kommentar hinzufügen</button><button id="reviewCommentRemove" type="button">Entfernen</button></div></div><form id="reviewCommentForm" hidden><label for="reviewCommentInput">Interne Notiz</label><textarea id="reviewCommentInput" rows="3" maxlength="${model.maxLength}" aria-describedby="reviewCommentHint reviewCommentCount reviewCommentError"></textarea><div class="review-comment-meta"><span id="reviewCommentHint">Reiner Text – erscheint nicht im Bildexport.</span><span id="reviewCommentCount"></span></div><p id="reviewCommentError" role="alert"></p><div class="review-comment-actions"><button id="reviewCommentSave" class="primary" type="submit">Speichern</button><button id="reviewCommentCancel" type="button">Abbrechen</button></div><p class="review-comment-hint">Zum nächsten Bild nach Speichern oder Abbrechen wechseln.</p></form><p id="reviewCommentStatus" role="status"></p>`;
    $("#reviewDialog .review-controls").after(host);
    $("#reviewCommentEdit").onclick = () => {
      base = model.read(p, current);
      draftProject = p.projectId;
      editing = true;
      $("#reviewCommentInput").value = base;
      refresh();
      count();
      $("#reviewCommentInput").focus();
    };
    $("#reviewCommentCancel").onclick = () => {
      editing = false;
      refresh();
      $("#reviewCommentEdit").focus();
    };
    $("#reviewCommentRemove").onclick = () => {
      base = model.read(p, current);
      draftProject = p.projectId;
      commit("");
    };
    $("#reviewCommentForm").onsubmit = (event) => {
      event.preventDefault();
      commit($("#reviewCommentInput").value);
    };
    $("#reviewCommentInput").oninput = count;
    $("#reviewCommentInput").onkeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        $("#reviewCommentForm").requestSubmit();
      }
    };
    $("#reviewDialog").addEventListener("cancel", (event) => {
      if (!editing) return;
      event.preventDefault();
      $("#reviewCommentCancel").click();
    });
    $("#reviewDialog").addEventListener("close", () => {
      editing = false;
      current = null;
    });
  }
  function count() {
    const input = $("#reviewCommentInput"),
      length = input.value.length;
    $("#reviewCommentCount").textContent = `${length} / ${model.maxLength}`;
    $("#reviewCommentError").textContent =
      length > model.maxLength ? "Der Kommentar ist zu lang." : "";
    input.setAttribute("aria-invalid", String(length > model.maxLength));
    $("#reviewCommentSave").disabled = length > model.maxLength;
  }
  function commit(value) {
    try {
      if (
        busy ||
        p.projectId !== draftProject ||
        !model.owner(p, current) ||
        model.read(p, current) !== base
      )
        throw Error(
          "Das Projekt oder der Kommentar wurde geändert. Bitte abbrechen und erneut öffnen.",
        );
      const next = model.update(p, current, value);
      if (next !== p) {
        checkpoint();
        Object.assign(p, next);
        changed();
      }
      editing = false;
      refresh();
      $("#reviewCommentStatus").textContent = model.read(p, current)
        ? "Kommentar im Projekt übernommen."
        : "Kommentar entfernt.";
      $("#reviewCommentEdit").focus();
    } catch (error) {
      const message = editing
        ? $("#reviewCommentError")
        : $("#reviewCommentStatus");
      message.setAttribute("role", "alert");
      message.textContent = error.message;
    }
  }
  function refresh() {
    const text = model.read(p, current);
    host.hidden = !current;
    $("#reviewCommentRead").hidden = editing;
    $("#reviewCommentForm").hidden = !editing;
    $("#reviewCommentText").textContent = text || "Noch kein Kommentar.";
    $("#reviewCommentEdit").textContent = text
      ? "Kommentar bearbeiten"
      : "Kommentar hinzufügen";
    $("#reviewCommentRemove").hidden = !text;
    $("#reviewCommentScope").textContent =
      current?.kind === "image" ? "Alle Formate dieses Bildes" : "Diese Slide";
    $("#reviewCommentError").textContent = "";
    $("#reviewCommentStatus").setAttribute("role", "status");
    $("#reviewCommentStatus").textContent = "";
    navigation();
  }
  function show(board) {
    mount();
    const target = board ? model.target(p, board.id) : null;
    if (key(target) !== key(current) || draftProject !== p.projectId)
      editing = false;
    current = target;
    draftProject = p.projectId;
    if (!editing) refresh();
    else navigation();
  }
  async function open(boardId) {
    if (busy || !p.boards.some((b) => b.id === boardId)) return;
    hidePopup();
    await openExport();
    openReview(boardId);
  }
  function hidePopup() {
    if (!popup) return;
    if (popup.hidePopover && popup.matches(":popover-open"))
      popup.hidePopover();
    popup.hidden = true;
    noteButton?.setAttribute("aria-expanded", "false");
  }
  function showPopup(button, board, text) {
    hidePopup();
    if (!popup) {
      popup = document.createElement("section");
      popup.className = "review-note-popup";
      popup.id = "reviewNotePopup";
      popup.setAttribute("popover", "auto");
      popup.setAttribute("aria-label", "Bildkommentar");
      popup.innerHTML =
        '<div class="review-comment-heading"><h3>Bildkommentar</h3><button type="button" data-note-close aria-label="Kommentar schliessen">×</button></div><p data-note-content></p><button type="button" data-note-edit>In Vorschau bearbeiten</button>';
      popup.querySelector("[data-note-close]").onclick = () => {
        const origin = noteButton;
        hidePopup();
        if (origin?.isConnected) origin.focus();
      };
      popup.onkeydown = (event) => {
        event.stopPropagation();
        if (event.key === "Escape") hidePopup();
      };
      popup.addEventListener("toggle", (event) => {
        if (event.newState === "closed")
          noteButton?.setAttribute("aria-expanded", "false");
      });
      document.body.append(popup);
    }
    popup.querySelector("[data-note-content]").textContent = text;
    popup.querySelector("[data-note-edit]").onclick = () => open(board.id);
    popup.hidden = false;
    noteButton = button;
    button.setAttribute("aria-expanded", "true");
    const rect = button.getBoundingClientRect(),
      width = Math.min(320, innerWidth - 32);
    popup.style.width = width + "px";
    popup.style.left =
      Math.max(16, Math.min(innerWidth - width - 16, rect.left)) + "px";
    popup.style.top =
      Math.max(16, Math.min(innerHeight - 340, rect.bottom + 8)) + "px";
    if (popup.showPopover) popup.showPopover();
    popup.querySelector("[data-note-close]").focus();
  }
  function chip(board, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-note-chip";
    button.dataset.commentBoard = board.id;
    button.textContent = "Kommentar";
    button.title = text;
    button.setAttribute("aria-label", "Bildkommentar öffnen");
    button.setAttribute("aria-expanded", "false");
    button.onpointerdown = (event) => event.stopPropagation();
    button.onclick = (event) => {
      event.stopPropagation();
      showPopup(button, board, text);
    };
    return button;
  }
  function workspace() {
    const artwork = $("#carouselArtwork"),
      scale = p.carousel ? carouselZoom : surfaceScale();
    const entries = p.boards
      .map((board) => ({
        board,
        text: model.read(p, model.target(p, board.id)),
      }))
      .filter((item) => item.text);
    const signature = JSON.stringify([
      p.projectId,
      scale,
      entries.map(({ board, text }) => [board.id, board.carouselSlide, text]),
      p.carousel?.artboards?.map((a) => [a.id, a.x, a.y, a.w, a.h]),
    ]);
    const root = p.carousel ? artwork : $("#boardSpace");
    if (!root || root.dataset.commentSignature === signature) return;
    root.dataset.commentSignature = signature;
    hidePopup();
    root
      .querySelectorAll(".review-note-chip,#reviewWorkspaceNotes")
      .forEach((node) => node.remove());
    if (p.carousel) {
      const layer = document.createElement("div");
      layer.id = "reviewWorkspaceNotes";
      artwork.append(layer);
      // At overview zoom, annotations stay available in the review instead of covering neighbouring artwork.
      if (scale < 0.12) return;
      const frames = MKWCarouselPolicy.frames(p.carousel);
      for (const { board, text } of entries) {
        const frame = frames[board.carouselSlide];
        if (!frame) continue;
        const box = {
          x: frame.x,
          y: frame.y + frame.h + 8 / scale,
          w: Math.min(frame.w, 160 / scale),
          h: 28 / scale,
        };
        if (
          frames.some(
            (a) => a !== frame && MKWCarouselPolicy.intersects(a, box),
          )
        )
          continue;
        const button = chip(board, text);
        Object.assign(button.style, {
          left: frame.x * scale + "px",
          top: (frame.y + frame.h) * scale + 8 + "px",
          maxWidth: Math.max(44, Math.min(160, frame.w * scale - 4)) + "px",
        });
        layer.append(button);
      }
    } else {
      const cards = new Map(
        [...root.querySelectorAll(".board-card")].map((node) => [
          node.dataset.id,
          node,
        ]),
      );
      for (const { board, text } of entries)
        cards.get(board.id)?.append(chip(board, text));
    }
  }
  return { show, workspace, editing: () => editing };
})();
