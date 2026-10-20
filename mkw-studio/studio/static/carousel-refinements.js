"use strict";
const carouselFolderColours = [
  "#537ae8",
  "#9170da",
  "#bf65a3",
  "#db7456",
  "#c39739",
  "#5b9d72",
  "#459ca4",
  "#6f8199",
];
function carouselFolderColour(folder) {
  if (/^#[0-9a-f]{6}$/i.test(folder.colour)) return folder.colour;
  // Stable fallback for older files, including after reordering/deleting folders.
  let hash = 0;
  for (const char of folder.id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return carouselFolderColours[hash % carouselFolderColours.length];
}
function carouselNextFolderColour() {
  const counts = new Map(carouselFolderColours.map((colour) => [colour, 0]));
  for (const folder of p.carousel.folders || []) {
    if (folder.colour === undefined) continue;
    const colour = folder.colour.toLowerCase();
    if (counts.has(colour)) counts.set(colour, counts.get(colour) + 1);
  }
  return [...counts].sort((a, b) => a[1] - b[1])[0][0];
}
function carouselFolder(o, c = p.carousel) {
  return c?.folders?.find((f) => f.id === o.folderId);
}
function carouselObjectVisible(o) {
  return o.visible !== false && carouselFolder(o)?.visible !== false;
}
function carouselObjectLocked(o) {
  return !!(o.locked || carouselFolder(o)?.locked);
}
function carouselValidateRefinements(o, c, q) {
  if (
    o.angle !== undefined &&
    (!Number.isFinite(o.angle) || Math.abs(o.angle) > 360)
  )
    throw Error("Ungültiger Drehwinkel.");
  if (o.uppercase !== undefined && typeof o.uppercase !== "boolean")
    throw Error("Ungültige Textdarstellung.");
  if (o.type === "text")
    MKWText.validate(
      o,
      new Set([
        "Arial",
        "Georgia",
        "Replica LL",
        "Harriet",
        "Harriet Regular",
        "Harriet Italic",
        ...q.fonts.map((f) => f.role),
      ]),
    );
  if (
    o.effects &&
    ["blur", "noise"].some(
      (k) =>
        !Number.isFinite(o.effects[k] ?? 0) ||
        (o.effects[k] ?? 0) < 0 ||
        (o.effects[k] ?? 0) > (k === "blur" ? 100 : 100),
    )
  )
    throw Error("Ungültiger Ebeneneffekt.");
  if (
    o.effects &&
    ["blurEnabled", "noiseEnabled"].some(
      (key) =>
        o.effects[key] !== undefined && typeof o.effects[key] !== "boolean",
    )
  )
    throw Error("Ungültige Effektsichtbarkeit.");
  if (
    o.folderId &&
    (o.type === "logo" || !c.folders?.some((f) => f.id === o.folderId))
  )
    throw Error("Ungültiger Ebenenordner.");
  if (
    o.type === "logo" &&
    !["white", "black"].includes(o.source) &&
    !q.logos.some((l) => l.id === o.source)
  )
    throw Error("Logo fehlt.");
}
function carouselValidateFolders(c) {
  if (!c.folders) return;
  const ids = new Set();
  if (!Array.isArray(c.folders) || c.folders.length > 500)
    throw Error("Ungültige Ebenenordner.");
  for (const f of c.folders) {
    if (
      !f ||
      typeof f.id !== "string" ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      f.name.length > 160 ||
      (f.before !== undefined &&
        f.before !== null &&
        (typeof f.before !== "string" ||
          f.before.length > 4000 ||
          !/^(folder|layer):/.test(f.before))) ||
      (f.colour !== undefined &&
        (typeof f.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(f.colour))) ||
      ["visible", "locked", "collapsed"].some(
        (k) => f[k] !== undefined && typeof f[k] !== "boolean",
      )
    )
      throw Error("Ungültiger Ebenenordner.");
    ids.add(f.id);
  }
}
function carouselArrangeFolders(c = p.carousel) {
  if (!c?.folders?.length) return;
  const out = [],
    done = new Set();
  for (const o of c.objects) {
    if (o.type === "logo" || !o.folderId) {
      out.push(o);
      continue;
    }
    if (done.has(o.folderId)) continue;
    done.add(o.folderId);
    out.push(...c.objects.filter((v) => v.folderId === o.folderId));
  }
  c.objects = out;
}
function carouselCreateFolder() {
  checkpoint();
  p.carousel.folders ??= [];
  const folder = {
    id: uid(),
    name: `Ordner ${p.carousel.folders.length + 1}`,
    colour: carouselNextFolderColour(),
    visible: true,
    locked: false,
    collapsed: false,
  };
  p.carousel.folders.push(folder);
  carouselSelected()
    .filter((o) => o.type !== "logo" && !carouselObjectLocked(o))
    .forEach((o) => (o.folderId = folder.id));
  carouselArrangeFolders();
  carouselUI.folder = folder.id;
  changed();
}
function carouselAssignFolder(o, id) {
  if (o.type === "logo" || carouselObjectLocked(o)) return;
  const folder = p.carousel.folders?.find((f) => f.id === id),
    wasEmpty = folder && !p.carousel.objects.some((v) => v.folderId === id);
  checkpoint();
  if (id) o.folderId = id;
  else delete o.folderId;
  carouselArrangeFolders();
  if (wasEmpty) carouselMoveFolder(id, folder.before || null, false, false);
  changed();
}
function carouselLayerPanel() {
  carouselArrangeFolders();
  carouselLegacyLayerPanel();
  for (const folder of p.carousel.folders || [])
    if (folder.colour === undefined) folder.colour = carouselNextFolderColour();
  const c = p.carousel,
    root = $("#carouselLayers"),
    heading = $(".carousel-layers-panel .carousel-section-heading");
  if (!$("#carouselNewFolder")) {
    const b = document.createElement("button");
    b.id = "carouselNewFolder";
    b.innerHTML = studioIcon("folder") + "<span>Ordner</span>";
    b.title = "Ordner erstellen · gewählte Ebenen werden einsortiert";
    b.onclick = carouselCreateFolder;
    heading.append(b);
  }
  const rows = new Map(
      [...root.children].map((row) => [row.dataset.layer, row]),
    ),
    fragment = document.createDocumentFragment();
  const folderRow = (f) => {
    const row = document.createElement("div");
    row.className = "carousel-folder";
    row.dataset.folder = f.id;
    row.draggable = carouselFolderCanMove(c, f);
    row.title = row.draggable
      ? "Ordner mit Inhalt verschieben"
      : "Gesperrter Ordner";
    row.ondragstart = (event) => {
      if (!carouselFolderCanMove(c, f)) return event.preventDefault();
      carouselUI.folderDrag = f.id;
      carouselUI.layerDrag = null;
      event.dataTransfer.setData("application/x-mkw-folder", f.id);
      event.dataTransfer.setData("text/plain", f.name);
      event.dataTransfer.effectAllowed = "move";
      row.classList.add("is-folder-dragging");
    };
    row.ondragend = carouselFolderDragEnd;
    row.style.setProperty("--folder-colour", carouselFolderColour(f));
    row.innerHTML = `<button data-folder-action="collapse" aria-label="${f.collapsed ? "Ordner öffnen" : "Ordner zuklappen"}" aria-expanded="${!f.collapsed}">${studioIcon(f.collapsed ? "angle" : "down")}</button><button data-folder-action="visible" aria-label="Ordner ein-/ausblenden" aria-pressed="${f.visible !== false}">${studioIcon(f.visible === false ? "hidden" : "visible")}</button><button data-folder-action="locked" aria-label="Ordner sperren/entsperren" aria-pressed="${!!f.locked}">${studioIcon(f.locked ? "locked" : "unlocked")}</button><button class="carousel-folder-name" data-folder-action="select">${studioIcon("folder")}<span>${esc(f.name)}</span><small>${c.objects.filter((o) => o.folderId === f.id).length}</small></button><button data-folder-action="remove" aria-label="Ordner entfernen" title="Ordner entfernen" ${f.locked ? "disabled" : ""}>${studioIcon("trash")}</button>`;
    row.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          const action = b.dataset.folderAction;
          if (action === "remove") return carouselRequestDeleteFolder(f);
          if (action === "select") {
            carouselSelect(
              c.objects.filter((o) => o.folderId === f.id).map((o) => o.id),
            );
            carouselUI.folder = f.id;
            carouselPanel();
            return;
          }
          if (action !== "collapse") checkpoint();
          f[action === "collapse" ? "collapsed" : action] =
            action === "visible"
              ? f.visible === false
              : action === "locked"
                ? !f.locked
                : !f.collapsed;
          if (action === "collapse") carouselLayerPanel();
          else {
            changed(false);
            carouselPanel();
          }
        }),
    );
    row.ondragover = (e) => {
      if (carouselUI.folderDrag) return carouselFolderDragOver(e, row);
      e.preventDefault();
      row.classList.add("drop-target");
    };
    row.ondragleave = () =>
      row.classList.remove(
        "drop-target",
        "folder-drop-before",
        "folder-drop-after",
      );
    row.ondrop = (e) => {
      if (carouselUI.folderDrag)
        return carouselFolderDrop(e, row, "folder:" + f.id);
      e.preventDefault();
      e.stopPropagation();
      const o = c.objects.find((o) => o.id === carouselUI.layerDrag);
      if (o) carouselAssignFolder(o, f.id);
      carouselUI.layerDrag = null;
    };
    return row;
  };
  for (const block of carouselLayerBlocks(c)) {
    if (block.folder) {
      fragment.append(folderRow(block.folder));
      for (const child of [...block.objects].reverse()) {
        const row = rows.get(child.id);
        row.classList.add("in-folder");
        row.hidden = !!block.folder.collapsed;
        fragment.append(row);
      }
    } else fragment.append(rows.get(block.objects[0].id));
  }
  root.replaceChildren(fragment);
  carouselLayerEffects(root, heading);
  carouselLayerActions(root);
  carouselBindFolderDropTargets(root);
}
function carouselRefinementsPanel(panel, items) {
  const o = items.at(-1),
    folder = p.carousel.folders?.find((f) => f.id === carouselUI.folder);
  if (
    folder &&
    (!items.length || items.every((o) => o.folderId === folder.id))
  ) {
    const section = document.createElement("section");
    section.className = "carousel-property-section folder-properties";
    section.innerHTML = `<h4>Ordner</h4><label>Name<input id="carouselFolderName" maxlength="160" value="${esc(folder.name)}"></label><button id="carouselRemoveFolder" ${folder.locked ? "disabled" : ""}>Ordner entfernen …</button>`;
    panel.prepend(section);
    $("#carouselFolderName").onchange = (e) => {
      if (!e.target.value.trim()) return;
      checkpoint();
      folder.name = e.target.value.trim();
      changed(false);
      carouselLayerPanel();
    };
    $("#carouselRemoveFolder").onclick = () =>
      carouselRequestDeleteFolder(folder);
  }
  if (!o) return;
  if (items.length === 1 && o.type !== "logo") {
    const section = document.createElement("section");
    section.className = "carousel-property-section";
    section.innerHTML = `<h4>Ablage</h4><label>Ebenenordner<select id="carouselFolderChoice"><option value="">Ohne Ordner</option>${(p.carousel.folders || []).map((f) => `<option value="${f.id}" ${o.folderId === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>`;
    panel.append(section);
    $("#carouselFolderChoice").disabled = carouselObjectLocked(o);
    $("#carouselFolderChoice").onchange = (e) =>
      carouselAssignFolder(o, e.target.value);
  }
  if (studioPreferences.advanced && items.length === 1) {
    const section = panel.querySelector('[data-prop="w"]')?.closest("section");
    if (section) {
      const label = document.createElement("label");
      label.className = "rotation-value";
      label.innerHTML = `Drehung <span class="type-unit"><input id="carouselRotation" type="number" min="-180" max="180" step="1" value="${Math.round((o.angle || 0) * 10) / 10}"><span>°</span></span>`;
      section.append(label);
      let begun = false;
      $("#carouselRotation").disabled = carouselObjectLocked(o);
      $("#carouselRotation").onfocus = () => (begun = false);
      $("#carouselRotation").oninput = (e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n) || Math.abs(n) > 180) return;
        if (!begun) {
          checkpoint();
          begun = true;
        }
        carouselSetRotation(o, n);
        changed(false);
      };
    }
  }
  const position = [
    ...panel.querySelectorAll(":scope > .carousel-property-section"),
  ].find(
    (section) =>
      section.querySelector("h4")?.textContent === "Position & Grösse",
  );
  if (position) panel.append(position);
}
async function carouselLogoImage(o) {
  return image(
    o.source === "black"
      ? "mkw-logo-bold-pos.svg"
      : o.source === "white"
        ? "mkw-logo-bold-neg.svg"
        : p.logos.find((l) => l.id === o.source)?.data ||
          "mkw-logo-bold-neg.svg",
  );
}
function carouselReplaceLogo(o) {
  const project = p;
  let input = $("#carouselLogoFile");
  if (!input) {
    input = document.createElement("input");
    input.id = "carouselLogoFile";
    input.type = "file";
    input.accept = ".svg,.png,.jpg,.jpeg,.webp";
    input.hidden = true;
    document.body.append(input);
  }
  input.value = "";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file || carouselObjectLocked(o)) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("Logo maximal 20 MB.");
      const data = await dataURL(file),
        bitmap = await image(data);
      if (
        project !== p ||
        !p.carousel.objects.includes(o) ||
        carouselObjectLocked(o)
      )
        return;
      checkpoint();
      const logo = { id: uid(), name: file.name, data };
      p.logos.push(logo);
      o.source = logo.id;
      o.h = (o.w * bitmap.height) / bitmap.width;
      changed();
    } catch (e) {
      status(e.message);
    }
  };
  input.click();
}
