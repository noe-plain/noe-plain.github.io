"use strict";
// Google Fonts Material Symbols Rounded, bundled locally for GitHub Pages.
const studioIconSprite = "static/icons/material-symbols.svg?v=30485216e062";
const studioIconNames = {
  image: "image",
  crop: "crop",
  text: "text_fields",
  alignLeft: "format_align_left",
  alignCenter: "format_align_center",
  alignRight: "format_align_right",
  alignJustify: "format_align_justify",
  alignTop: "vertical_align_top",
  alignMiddle: "vertical_align_center",
  alignBottom: "vertical_align_bottom",
  logo: "branding_watermark",
  sponsors: "layers",
  export: "download",
  undo: "undo",
  redo: "redo",
  folder: "folder_open",
  save: "save",
  new: "note_add",
  plus: "add",
  minus: "remove",
  close: "close",
  up: "expand_less",
  down: "expand_more",
  more: "more_horiz",
  trash: "delete",
  replace: "swap_vert",
  refresh: "refresh",
  move: "open_with",
  layers: "layers",
  duplicate: "content_copy",
  select: "arrow_selector_tool",
  content: "drag_pan",
  gradient: "gradient",
  angle: "chevron_left",
  hand: "drag_pan",
  zoom: "zoom_in",
  visible: "visibility",
  hidden: "visibility_off",
  locked: "lock",
  unlocked: "lock_open",
  front: "keyboard_arrow_up",
  back: "keyboard_arrow_down",
  warning: "warning",
  info: "info",
  guides: "grid_on",
  snap: "align_horizontal_center",
  sidebar: "right_panel_close",
  sidebarOpen: "right_panel_open",
  fit: "center_focus_strong",
  settings: "settings",
  light: "light_mode",
  dark: "dark_mode",
  flip: "flip",
  path: "polyline",
  shape: "rectangle",
  builder: "shapes",
  rect: "rectangle",
  ellipse: "circle",
  triangle: "change_history",
  polygon: "pentagon",
  star: "star",
  curve: "gesture",
};
function studioIcon(name, extra = "") {
  const symbol = studioIconNames[name] || studioIconNames.plus;
  return `<svg class="ui-icon ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-google-icon="${symbol}"><use width="24" height="24" href="${studioIconSprite}#${symbol}"></use></svg>`;
}

const studioWorkspaceTitle = document.createElement("h1");
studioWorkspaceTitle.className = "visually-hidden";
studioWorkspaceTitle.textContent = "MKW Studio · Gestaltungsarbeitsplatz";
document.querySelector("header").prepend(studioWorkspaceTitle);

let studioSidebarOpen = !matchMedia("(max-width:760px)").matches,
  studioWarningItems = [];
let studioCommandbarFrame = 0,
  studioPostGuides = true;
function studioSyncFooter() {
  studioMountNoticeButtons();
  const carousel = !!p.carousel;
  if (!carousel) $("#footerCurvature")?.setAttribute("hidden", "");
  $("#footerGuides").setAttribute(
    "aria-pressed",
    String(carousel ? carouselUI.guides : studioPostGuides),
  );
  $("#footerGuides").setAttribute(
    "aria-label",
    carousel ? "Raster und Schutzzonen" : "Schutzzonen",
  );
  $("#footerGuides").title =
    (carousel ? "Raster und Schutzzonen" : "Schutzzonen") +
    " ein-/ausblenden · Shift + W";
  $("#footerGuides").setAttribute("aria-keyshortcuts", "Shift+W");
  for (const id of ["postFit", "carouselFit"]) {
    const button = $("#" + id);
    if (button) {
      button.title = "Artwork einpassen · Cmd/Ctrl + 0";
      button.setAttribute("aria-keyshortcuts", "Meta+0 Control+0");
    }
  }
  $("#viewValue").title =
    "Smartphone-Vorschau · 100 % = 390 px Breite · Cmd/Ctrl + 1";
  $("#viewValue").setAttribute("aria-keyshortcuts", "Meta+1 Control+1");
  $("#footerSnap").hidden = !carousel;
  if ($("#postHand")) $("#postHand").hidden = carousel;
  if (carousel)
    $("#footerSnap").setAttribute("aria-pressed", String(carouselUI.snap));
  $("#toolsToggle").setAttribute(
    "aria-controls",
    carousel ? "carouselSidebar" : "toolsSidebar",
  );
}
function studioFitCommandbars() {
  studioCommandbarFrame = 0;
  for (const bar of document.querySelectorAll(".studio-commandbar")) {
    if (!bar.getClientRects().length) continue;
    bar.querySelectorAll("button").forEach((button) => {
      const label =
        button.getAttribute("aria-label") || button.textContent.trim();
      if (label) {
        button.setAttribute("aria-label", label);
        if (!button.title) button.title = label;
      }
    });
    bar.classList.remove("studio-icons-only");
    const group = bar.querySelector(".studio-tool-group"),
      surface = bar.querySelector(".studio-tool-surface");
    bar.classList.toggle(
      "studio-icons-only",
      group.scrollWidth > group.clientWidth + 1 ||
        (surface && surface.scrollWidth > surface.clientWidth + 1) ||
        bar.scrollWidth > bar.clientWidth + 1,
    );
  }
}
function studioQueueCommandbarFit() {
  if (!studioCommandbarFrame)
    studioCommandbarFrame = requestAnimationFrame(studioFitCommandbars);
}
function studioSetSidebar(open) {
  const layoutChanged =
    document.body.classList.contains("sidebar-hidden") === open;
  const postAnchor =
    typeof postCaptureAnchor === "function" && !p.carousel
      ? postCaptureAnchor()
      : null;
  const viewport = $("#carouselViewport"),
    canvas = $("#carouselCanvas");
  const rect = viewport?.getBoundingClientRect(),
    art =
      p.carousel && canvas ? carouselOrigin() : canvas?.getBoundingClientRect();
  const center =
    rect && art
      ? {
          x: (rect.left + viewport.clientWidth / 2 - art.left) / carouselZoom,
          y: (rect.top + viewport.clientHeight / 2 - art.top) / carouselZoom,
        }
      : null;
  studioSidebarOpen = open;
  document.body.classList.toggle("sidebar-hidden", !open);
  document.body.classList.toggle("tools-open", open);
  for (const id of ["toolsToggle", "carouselSidebarToggle"]) {
    const button = $("#" + id);
    if (!button) continue;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      open ? "Eigenschaften ausblenden" : "Eigenschaften einblenden",
    );
    button.title = button.getAttribute("aria-label");
    button.innerHTML =
      studioIcon(open ? "sidebar" : "sidebarOpen") +
      "<span>Einstellungen</span>";
  }
  if (center && p.carousel && layoutChanged) {
    carouselRefresh();
    const next = carouselOrigin(),
      view = viewport.getBoundingClientRect();
    viewport.scrollLeft +=
      next.left +
      center.x * carouselZoom -
      view.left -
      viewport.clientWidth / 2;
    viewport.scrollTop +=
      next.top + center.y * carouselZoom - view.top - viewport.clientHeight / 2;
  }
  if (postAnchor) {
    postAnchor.x = postViewport.clientWidth / 2;
    postAnchor.y = postViewport.clientHeight / 2;
    postUpdatePadding();
    postRestoreAnchor(postAnchor);
  }
  studioQueueCommandbarFit();
  studioSyncFooter();
}
function studioToggleSidebar() {
  studioSetSidebar(!studioSidebarOpen);
}

let studioWarningButton = null,
  studioWarningSignature = null,
  studioWarningListSignature = null,
  studioFeedbackProject = null;
const studioFeedbackMessages = new Map();
function studioMountNoticeButtons() {
  const host = document.querySelector(".footer-view-controls");
  if (!host) return;
  for (const id of ["postNotice", "carouselNotice"]) {
    let button = $("#" + id);
    if (!button && id === "carouselNotice") {
      button = document.createElement("button");
      button.id = id;
      button.type = "button";
      button.className = "studio-action studio-notice-button";
      button.setAttribute("aria-controls", "studioWarnings");
      button.setAttribute("aria-expanded", "false");
      button.onclick = studioToggleWarnings;
      host.prepend(button);
    }
    if (!button) continue;
    button.hidden = (id === "carouselNotice") !== !!p.carousel;
    if (button.parentElement !== host) host.prepend(button);
  }
  const active = $(p.carousel ? "#carouselNotice" : "#postNotice");
  if (active && host.firstElementChild !== active) host.prepend(active);
}
function studioSystemMessages() {
  if (studioFeedbackProject !== p.projectId) {
    studioFeedbackProject = p.projectId;
    studioFeedbackMessages.clear();
    studioWarningItems = [];
  }
  return [...studioFeedbackMessages.values()];
}
function studioSetWarnings(items) {
  const messages = studioSystemMessages();
  studioWarningItems = items;
  studioMountNoticeButtons();
  const button = $(p.carousel ? "#carouselNotice" : "#postNotice"),
    signature = JSON.stringify([p.projectId, items, messages]);
  if (button === studioWarningButton && signature === studioWarningSignature)
    return;
  studioWarningButton = button;
  studioWarningSignature = signature;
  const error = [...items, ...messages].some(
      (item) => item.level === "error" || item.severity === "error",
    ),
    warning =
      items.length > 0 || messages.some((item) => item.level === "warning"),
    information = messages.some(
      (item) => item.source === "storage" && item.message,
    ),
    level = error ? "error" : warning ? "warning" : information ? "info" : "ok",
    count =
      items.length +
      messages.filter((item) => ["error", "warning"].includes(item.level))
        .length,
    label = error
      ? `${count} Meldung${count === 1 ? "" : "en"} – Fehler prüfen`
      : warning
        ? `${count} Hinweis${count === 1 ? "" : "e"} zum Artwork`
        : information
          ? "Informationen zum Projekt"
          : "Keine aktuellen Warnungen oder Fehler";
  if (button) {
    button.dataset.level = level;
    button.innerHTML =
      studioIcon(error || warning ? "warning" : "info") +
      `<span class="studio-warning-count" aria-hidden="true">${count > 99 ? "99+" : count}</span>`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-expanded", String(!$("#studioWarnings").hidden));
  }
  const system = $("#studioSystemMessages");
  system.replaceChildren();
  for (const item of messages) {
    if (
      item.source === "storage" &&
      $("#studioStorageMessages #projectStorageNotice")
    )
      continue;
    const node = document.createElement("div"),
      heading = document.createElement("strong"),
      text = document.createElement("p");
    node.className = "studio-feedback-item";
    node.dataset.level = item.level;
    heading.textContent =
      item.level === "error"
        ? "Fehler"
        : item.level === "warning"
          ? "Hinweis"
          : "Projektstatus";
    text.textContent = item.message;
    node.append(heading, text);
    system.append(node);
  }
  $("#studioNoMessages").hidden = !!(items.length || messages.length);
  const list = $("#studioWarningList"),
    listSignature = JSON.stringify([p.projectId, items]);
  if (listSignature !== studioWarningListSignature) {
    const hadFocus = list.contains(document.activeElement);
    if (!count && hadFocus) studioCloseWarnings(true);
    studioWarningListSignature = listSignature;
    list.innerHTML = items
      .map(
        (item, index) =>
          `<button class="studio-warning-item" data-warning-index="${index}">${studioIcon("warning")}<span><strong>${esc(item.title)}</strong><span>${esc(item.message)}</span></span>${studioIcon("angle")}</button>`,
      )
      .join("");
    list
      .querySelectorAll("[data-warning-index]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            studioFocusWarning(items[+button.dataset.warningIndex])),
      );
  }
}
function studioCloseWarnings(restore = false) {
  const panel = $("#studioWarnings"),
    hadFocus = panel.contains(document.activeElement);
  $("#studioWarnings").hidden = true;
  for (const id of ["postNotice", "carouselNotice"])
    $("#" + id)?.setAttribute("aria-expanded", "false");
  if (restore && hadFocus) {
    const trigger = $(p.carousel ? "#carouselNotice" : "#postNotice"),
      fallback = $(p.carousel ? "#carouselExport" : "#export");
    (trigger?.getClientRects().length ? trigger : fallback)?.focus();
  }
}
function studioToggleWarnings() {
  const panel = $("#studioWarnings"),
    open = panel.hidden;
  panel.hidden = !open;
  $(p.carousel ? "#carouselNotice" : "#postNotice")?.setAttribute(
    "aria-expanded",
    String(open),
  );
  if (open)
    (
      panel.querySelector("[data-warning-index]") || $("#closeStudioWarnings")
    ).focus();
}
function studioFocusWarning(item) {
  studioCloseWarnings();
  studioSetSidebar(true);
  if (p.carousel) {
    const o = p.carousel.objects.find((o) => o.id === item.id);
    if (!o) return;
    carouselTool("select");
    carouselSelect([o.id]);
    $("#carouselProperties")
      ?.querySelector(
        "input:not(:disabled),textarea:not(:disabled),button:not(:disabled)",
      )
      ?.focus({ preventScroll: true });
    const viewport = $("#carouselViewport"),
      rect = viewport.getBoundingClientRect(),
      art = $("#carouselCanvas").getBoundingClientRect();
    viewport.scrollLeft +=
      art.left +
      (o.x + o.w / 2) * carouselZoom -
      rect.left -
      viewport.clientWidth / 2;
    viewport.scrollTop +=
      art.top +
      (o.y + o.h / 2) * carouselZoom -
      rect.top -
      viewport.clientHeight / 2;
  } else {
    if (editingText) editingText.el.blur();
    selectBoard(item.id);
    if (item.key) layer = item.key;
    chooseStep(item.step);
    $("#toolsSidebar")
      ?.querySelector(
        "input:not(:disabled),textarea:not(:disabled),button:not(:disabled)",
      )
      ?.focus({ preventScroll: true });
    if (item.key === "postAngle" && board()?.angle?.enabled)
      MKWPostAngleEditor.select(board(), true);
    document
      .querySelector(`.board-card[data-id="${item.id}"]`)
      ?.scrollIntoView({ block: "center", inline: "center" });
  }
}

const studioWarnings = document.createElement("section");
studioWarnings.id = "studioWarnings";
studioWarnings.className = "studio-notices";
studioWarnings.hidden = true;
studioWarnings.setAttribute("aria-labelledby", "studioWarningsTitle");
studioWarnings.innerHTML = `<div class="studio-notices-heading"><h2 id="studioWarningsTitle">Hinweise &amp; Meldungen</h2><button id="closeStudioWarnings" class="icon-button" aria-label="Hinweise schliessen">${studioIcon("close")}</button></div><div id="studioStorageMessages"></div><div id="studioSystemMessages"></div><p id="studioNoMessages">Keine aktuellen Hinweise zum Artwork.</p><div id="studioWarningList"></div>`;
document.body.append(studioWarnings);
window.MKWFooterFeedback = Object.freeze({
  attachStorageNotice(node) {
    $("#studioStorageMessages").append(node);
  },
  report(message, level = "info", source = "operation") {
    studioSystemMessages();
    const text = String(message || "");
    if (text)
      studioFeedbackMessages.set(source, { message: text, level, source });
    else studioFeedbackMessages.delete(source);
    studioSetWarnings(studioWarningItems);
  },
});
$("#closeStudioWarnings").onclick = () => studioCloseWarnings(true);
$("#postNotice").onclick = studioToggleWarnings;
studioSetWarnings(studioWarningItems);
$("#toolsToggle").onclick = studioToggleSidebar;
$("#footerGuides").onclick = () => {
  if (p.carousel) {
    carouselUI.guides = !carouselUI.guides;
    carouselRefresh();
  } else {
    studioPostGuides = !studioPostGuides;
    document.body.classList.toggle("guides-hidden", !studioPostGuides);
  }
  studioSyncFooter();
};
window.addEventListener(
  "keydown",
  (event) => {
    if (
      !(event.metaKey || event.ctrlKey) ||
      event.shiftKey ||
      event.altKey ||
      !["0", "1"].includes(event.key) ||
      event.isComposing ||
      busy ||
      (!carouselActive() && !postActive()) ||
      document.querySelector("dialog[open],[popover]:popover-open")
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (p.carousel) {
      if (event.key === "0") carouselFit();
      else studioSetZoomPercent(100);
    } else if (event.key === "0") postFitRow();
    else studioSetZoomPercent(100);
  },
  true,
);
window.addEventListener(
  "keydown",
  (event) => {
    if (
      !event.shiftKey ||
      event.key.toLowerCase() !== "w" ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing ||
      busy ||
      (!carouselActive() && !postActive()) ||
      document.querySelector("dialog[open],[popover]:popover-open")
    )
      return;
    const target = event.target;
    if (
      target instanceof Element &&
      (target.isContentEditable ||
        target.closest("input,textarea,select,[role=textbox]"))
    )
      return;
    // Handle Shift+W before carousel shortcuts, where plain W selects the angle tool.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) $("#footerGuides").click();
  },
  true,
);
$("#footerSnap").onclick = () => {
  if (p.carousel) {
    carouselUI.snap = !carouselUI.snap;
    studioSyncFooter();
  }
};
// Track a physical Control key so synthetic Ctrl+wheel trackpad pinch keeps zooming.
const MKWWorkspaceWheel = (() => {
  let controlHeld = false;
  const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Control") controlHeld = true;
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (event.key === "Control") controlHeld = false;
    },
    true,
  );
  window.addEventListener("blur", () => {
    controlHeld = false;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) controlHeld = false;
  });
  function horizontal(event, viewport) {
    if (!(mac ? event.metaKey : event.ctrlKey && controlHeld) || event.altKey)
      return false;
    event.preventDefault();
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? viewport.clientWidth
          : 1;
    viewport.scrollLeft += (event.deltaY || event.deltaX) * unit;
    return true;
  }
  return Object.freeze({ horizontal });
})();
function studioSyncZoomLimits(carousel, value, min, max) {
  const out = $(carousel ? "#carouselZoomOut" : "#zoomOut"),
    into = $(carousel ? "#carouselZoomIn" : "#zoomIn");
  if (out) out.disabled = value <= min + 1e-8;
  if (into) into.disabled = value >= max - 1e-8;
}
function studioZoomReference(carousel = !!p.carousel) {
  const width = carousel
    ? p.carousel.w
    : p.formats?.[0]?.w || p.boards[0]?.w || 1080;
  return MKWZoom.reference(width, carousel ? 1 : 0.24);
}
function studioSetZoomPercent(percentage) {
  if (!Number.isFinite(percentage)) return;
  const next = MKWZoom.value(percentage, studioZoomReference());
  if (p.carousel) carouselSetZoom(next);
  else postSetZoom(next);
}
function studioStepZoom(amount) {
  studioSetZoomPercent(
    MKWZoom.percent(p.carousel ? carouselZoom : view, studioZoomReference()) +
      amount,
  );
}
$("#postViewControls").setAttribute("role", "group");
$("#postViewControls").setAttribute("aria-label", "Zoom");
$("#footerZoom").append($("#postViewControls"));
studioSetSidebar(studioSidebarOpen);
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#studioWarnings,#postNotice,#carouselNotice"))
    studioCloseWarnings();
});
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape" && !$("#studioWarnings").hidden) {
      studioCloseWarnings(true);
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true,
);
matchMedia("(max-width:760px)").addEventListener("change", (event) =>
  studioSetSidebar(!event.matches),
);
window.addEventListener("resize", studioQueueCommandbarFit);
document.fonts.addEventListener("loadingdone", studioQueueCommandbarFit);
document.fonts.ready.then(studioQueueCommandbarFit);
