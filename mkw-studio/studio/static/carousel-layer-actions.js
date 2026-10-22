"use strict";
function carouselCloseLayerMenu() {
  const menu = $("#carouselLayerMenu");
  if (menu?.matches(":popover-open")) menu.hidePopover();
  menu?.remove();
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
    button.innerHTML = studioIcon("down");
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
            row
              .querySelector(".carousel-layer-name")
              .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
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
