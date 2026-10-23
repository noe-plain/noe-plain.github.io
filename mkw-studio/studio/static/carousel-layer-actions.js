"use strict";
function carouselSetItemName(item, name) {
  const c = p.carousel;
  if (!c || (!c.objects.includes(item) && !c.folders?.includes(item)))
    return false;
  name = String(name).trim();
  if (!name || name === item.name) return false;
  name = name.slice(0, 160);
  checkpoint();
  item.name = name;
  changed(false);
  return true;
}
function carouselRenameItem(item, kind) {
  document.querySelector(".carousel-name-input")?.blur();
  const project = p,
    selector =
      kind === "folder"
        ? `[data-folder="${CSS.escape(item.id)}"]`
        : `[data-layer="${CSS.escape(item.id)}"]`,
    row = $("#carouselLayers")?.querySelector(selector),
    name = row?.querySelector(
      kind === "folder" ? ".carousel-folder-name" : ".carousel-layer-name",
    );
  if (!name) return;
  const input = document.createElement("input"),
    draggable = row.draggable;
  input.id = "carouselRenameInput";
  input.className = "carousel-name-input";
  input.type = "text";
  input.maxLength = 160;
  input.value = item.name;
  input.setAttribute(
    "aria-label",
    kind === "folder" ? "Ordner umbenennen" : "Ebene umbenennen",
  );
  input.setAttribute("autocomplete", "off");
  name.hidden = true;
  row.draggable = false;
  name.after(input);
  let finished = false;
  const finish = (commit, focus = false) => {
    if (finished) return;
    finished = true;
    input.onblur = null;
    if (commit && p === project) carouselSetItemName(item, input.value);
    name.querySelector("span").textContent = item.name;
    name.setAttribute(
      "aria-label",
      `${kind === "folder" ? "Ordner" : "Ebene"} auswählen: ${item.name}`,
    );
    name.title = item.name;
    row
      .querySelector("[aria-haspopup=menu]")
      ?.setAttribute("aria-label", `Aktionen: ${item.name}`);
    if (
      p === project &&
      kind === "folder" &&
      carouselUI.folder === item.id &&
      $("#carouselFolderName")
    )
      $("#carouselFolderName").value = item.name;
    input.remove();
    name.hidden = false;
    row.draggable = draggable;
    if (focus && name.isConnected) name.focus({ preventScroll: true });
  };
  input.onblur = () => finish(true);
  input.onkeydown = (event) => {
    if (!["Enter", "Escape"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    finish(event.key === "Enter", true);
  };
  input.ondragstart = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  input.focus({ preventScroll: true });
  input.select();
}
function carouselCloseLayerMenu() {
  for (const id of ["carouselLayerMenu", "carouselFolderMenu"]) {
    const menu = $("#" + id);
    if (menu?.matches(":popover-open")) menu.hidePopover();
    menu?.remove();
  }
}
function carouselFolderActions(root) {
  root.querySelectorAll(".carousel-folder").forEach((row) => {
    const button = document.createElement("button");
    button.className = "carousel-folder-actions";
    button.setAttribute("aria-label", "Ordneraktionen");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.title = "Ordneraktionen";
    button.innerHTML = studioIcon("more");
    row.append(button);
    const folderName = row.querySelector(".carousel-folder-name");
    folderName.ondblclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const folder = p.carousel.folders?.find(
        (f) => f.id === row.dataset.folder,
      );
      if (folder) carouselRenameItem(folder, "folder");
    };
    folderName.addEventListener("keydown", (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        folderName.ondblclick(event);
      }
    });
    MKWUIMenu.trigger(button);
    button.onclick = () => {
      carouselCloseLayerMenu();
      const project = p,
        c = p.carousel,
        folder = c.folders.find((f) => f.id === row.dataset.folder);
      if (!folder) return;
      const blocks = carouselLayerBlocks(c),
        index = blocks.findIndex((b) => b.folder?.id === folder.id),
        front = blocks[index - 1]?.key,
        back = blocks[index + 1]?.key,
        actions = [
          ["rename", "Umbenennen", "text", false],
          [
            "up",
            "Nach vorne",
            "front",
            !front || !carouselReorderFolder(c, folder.id, front),
          ],
          [
            "down",
            "Nach hinten",
            "back",
            !back || !carouselReorderFolder(c, folder.id, back, true),
          ],
          ["remove", "Ordner entfernen …", "trash", !!folder.locked],
        ],
        menu = document.createElement("div");
      menu.id = "carouselFolderMenu";
      menu.className = "carousel-effect-menu carousel-layer-menu";
      menu.setAttribute("popover", "auto");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", "Aktionen: " + folder.name);
      menu.innerHTML = `<strong>${esc(folder.name)}</strong>${actions.map(([key, label, icon, disabled]) => `${["up", "remove"].includes(key) ? '<hr role="separator">' : ""}<button role="menuitem" data-folder-menu="${key}" ${disabled ? "disabled" : ""}><span>${label}</span>${studioIcon(icon)}</button>`).join("")}`;
      menu.querySelectorAll("button").forEach((item) => {
        item.onclick = () => {
          carouselCloseLayerMenu();
          if (p !== project || !p.carousel.folders.includes(folder)) return;
          const action = item.dataset.folderMenu;
          if (action === "rename") {
            carouselRenameItem(folder, "folder");
          } else if (action === "remove") carouselRequestDeleteFolder(folder);
          else
            carouselMoveFolder(
              folder.id,
              action === "up" ? front : back,
              action === "down",
            );
        };
      });
      menu.addEventListener("toggle", (event) => {
        button.setAttribute("aria-expanded", String(event.newState === "open"));
        if (event.newState === "closed") menu.remove();
      });
      document.body.append(menu);
      MKWUIMenu.open(menu, button);
    };
  });
}
function carouselLayerActions(root) {
  root.querySelectorAll(".carousel-layer").forEach((row) => {
    const o = p.carousel.objects.find((o) => o.id === row.dataset.layer);
    for (const action of ["up", "down"])
      row.querySelector(`[data-action="${action}"]`).hidden = true;
    const button = document.createElement("button");
    button.className = "carousel-layer-actions";
    button.setAttribute("aria-label", `Aktionen: ${o.name}`);
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.title = "Ebenenaktionen";
    button.innerHTML = studioIcon("more");
    row.append(button);
    MKWUIMenu.trigger(button);
    button.onclick = () => {
      carouselCloseLayerMenu();
      $("#carouselLayerMenu")?.remove();
      const menu = document.createElement("div");
      menu.id = "carouselLayerMenu";
      menu.className = "carousel-effect-menu carousel-layer-menu";
      menu.setAttribute("popover", "auto");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", `Aktionen: ${o.name}`);
      const actions = [
        ["rename", "Umbenennen", "text", false],
        [
          "up",
          "Nach vorne",
          "front",
          row.querySelector('[data-action="up"]').disabled ||
            carouselObjectLocked(o),
        ],
        [
          "down",
          "Nach hinten",
          "back",
          row.querySelector('[data-action="down"]').disabled ||
            carouselObjectLocked(o),
        ],
        ["duplicate", "Duplizieren", "duplicate", carouselObjectLocked(o)],
        [
          "delete",
          "Entfernen",
          "trash",
          o.type === "logo" || carouselObjectLocked(o),
        ],
      ];
      menu.innerHTML = `<strong>${esc(o.name)}</strong>${actions.map(([key, label, icon, disabled]) => `${["up", "duplicate"].includes(key) ? '<hr role="separator">' : ""}<button role="menuitem" data-layer-menu="${key}" ${disabled ? "disabled" : ""}><span>${label}</span>${studioIcon(icon)}</button>`).join("")}`;
      menu.querySelectorAll("button").forEach((item) => {
        item.onclick = () => {
          carouselCloseLayerMenu();
          const action = item.dataset.layerMenu;
          if (action === "rename") {
            carouselRenameItem(o, "layer");
          } else if (["up", "down"].includes(action)) {
            row.querySelector(`[data-action="${action}"]`).click();
          } else {
            carouselSelect([o.id]);
            if (action === "duplicate") carouselDuplicate();
            else carouselDelete();
          }
        };
      });
      document.body.append(menu);
      menu.addEventListener("toggle", (event) => {
        button.setAttribute("aria-expanded", String(event.newState === "open"));
        if (event.newState === "closed") menu.remove();
      });
      MKWUIMenu.open(menu, button);
    };
  });
}
function carouselRequestDeleteFolder(folder) {
  if (folder.locked) return;
  $("#carouselDeleteFolderDialog")?.remove();
  const project = p,
    members = p.carousel.objects.filter((o) => o.folderId === folder.id),
    dialog = document.createElement("dialog");
  dialog.id = "carouselDeleteFolderDialog";
  dialog.className = "carousel-folder-delete";
  dialog.setAttribute("aria-labelledby", "carouselDeleteFolderTitle");
  dialog.innerHTML = `<h3 id="carouselDeleteFolderTitle">Ordner entfernen?</h3><p>Was soll mit den ${members.length} Ebenen in «${esc(folder.name)}» geschehen?</p><button data-folder-delete="keep">${studioIcon("layers")}<span>Inhalt behalten<small>Nur den Ordner entfernen. Alle Ebenen bleiben an ihrer Position.</small></span></button><button data-folder-delete="content" ${members.some((o) => o.locked) ? "disabled" : ""}>${studioIcon("trash")}<span>Mit Inhalt löschen<small>${members.some((o) => o.locked) ? "Gesperrte Ebenen zuerst entsperren." : "Ordner und seine Ebenen entfernen."}</small></span></button><button data-folder-delete="cancel" autofocus>Abbrechen</button>`;
  dialog.querySelectorAll("[data-folder-delete]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.folderDelete;
      dialog.close();
      if (
        action === "cancel" ||
        p !== project ||
        !p.carousel.folders.includes(folder)
      )
        return;
      checkpoint();
      if (action === "keep") {
        for (const o of p.carousel.objects) {
          if (o.folderId !== folder.id) continue;
          delete o.folderId;
          if (folder.visible === false) o.visible = false;
        }
      } else {
        p.carousel.objects = p.carousel.objects.filter(
          (o) => o.folderId !== folder.id,
        );
        const ids = carouselSelected().map((o) => o.id);
        carouselUI.ids = new Set(ids);
        carouselSelection = ids.at(-1) || null;
      }
      p.carousel.folders = p.carousel.folders.filter((f) => f !== folder);
      carouselUI.folder = null;
      changed();
    };
  });
  dialog.onclose = () => dialog.remove();
  document.body.append(dialog);
  dialog.showModal();
}
