"use strict";
// Root blocks are front-to-back; each block retains its internal paint order.
function carouselLayerBlocks(c) {
  const blocks = [],
    seen = new Set();
  for (const o of [...c.objects].reverse()) {
    if (!o.folderId) {
      blocks.push({ key: "layer:" + o.id, objects: [o] });
      continue;
    }
    if (seen.has(o.folderId)) continue;
    seen.add(o.folderId);
    const folder = c.folders?.find((f) => f.id === o.folderId);
    if (folder)
      blocks.push({
        key: "folder:" + folder.id,
        folder,
        objects: c.objects.filter((v) => v.folderId === folder.id),
      });
  }
  const pending = (c.folders || []).filter((f) => !seen.has(f.id));
  while (pending.length) {
    let progress = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const folder = pending[i],
        index = blocks.findIndex((b) => b.key === folder.before);
      if (index < 0 && pending.some((f) => "folder:" + f.id === folder.before))
        continue;
      const minimum = blocks.filter((b) =>
        b.objects.some((o) => o.type === "logo"),
      ).length;
      blocks.splice(index < 0 ? blocks.length : Math.max(minimum, index), 0, {
        key: "folder:" + folder.id,
        folder,
        objects: [],
      });
      pending.splice(i, 1);
      progress = true;
    }
    // Invalid/stale anchor cycles never prevent an old project from opening.
    if (!progress)
      for (const folder of pending.splice(0))
        blocks.push({ key: "folder:" + folder.id, folder, objects: [] });
  }
  return blocks;
}
function carouselFolderCanMove(c, folder) {
  return (
    !!folder &&
    !folder.locked &&
    !c.objects.some((o) => o.folderId === folder.id && o.locked)
  );
}
function carouselReorderFolder(c, folderId, targetKey, after = false) {
  const blocks = carouselLayerBlocks(c),
    source = blocks.findIndex((b) => b.folder?.id === folderId);
  if (
    source < 0 ||
    !carouselFolderCanMove(c, blocks[source].folder) ||
    targetKey === blocks[source].key
  )
    return null;
  const next = [...blocks],
    [block] = next.splice(source, 1),
    target = next.findIndex((b) => b.key === targetKey);
  if (targetKey && target < 0) return null;
  const minimum = next.filter((b) =>
    b.objects.some((o) => o.type === "logo"),
  ).length;
  const index = targetKey ? target + (after ? 1 : 0) : next.length;
  next.splice(Math.max(minimum, index), 0, block);
  if (next.every((b, i) => b.key === blocks[i].key)) return null;
  return {
    objects: [...next].reverse().flatMap((b) => b.objects),
    folders: (c.folders || []).map((folder) => {
      const index = next.findIndex((b) => b.folder?.id === folder.id);
      return { ...folder, before: next[index + 1]?.key || null };
    }),
  };
}
function carouselMoveFolder(folderId, targetKey, after = false, record = true) {
  const next = carouselReorderFolder(p.carousel, folderId, targetKey, after);
  if (!next) return false;
  if (record) checkpoint();
  Object.assign(p.carousel, next);
  if (record) changed();
  return true;
}
function carouselFolderDragEnd() {
  carouselUI.folderDrag = null;
  carouselUI.layerDrag = null;
  document
    .querySelectorAll(
      ".folder-drop-before,.folder-drop-after,.is-folder-dragging",
    )
    .forEach((el) =>
      el.classList.remove(
        "folder-drop-before",
        "folder-drop-after",
        "is-folder-dragging",
      ),
    );
}
function carouselFolderDragOver(event, row) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
  const bounds = row.getBoundingClientRect(),
    after = event.clientY > bounds.top + bounds.height / 2;
  row.classList.toggle("folder-drop-before", !after);
  row.classList.toggle("folder-drop-after", after);
}
function carouselFolderDrop(event, row, targetKey) {
  event.preventDefault();
  event.stopPropagation();
  const source = carouselUI.folderDrag,
    bounds = row.getBoundingClientRect(),
    after = event.clientY > bounds.top + bounds.height / 2;
  carouselFolderDragEnd();
  if (source) carouselMoveFolder(source, targetKey, after);
}
function carouselBindFolderDropTargets(root) {
  root
    .querySelectorAll(".carousel-layer,.carousel-layer-box")
    .forEach((row) => {
      const layer = row.matches(".carousel-layer")
          ? row
          : row.querySelector(".carousel-layer"),
        object = p.carousel.objects.find((o) => o.id === layer.dataset.layer),
        targetKey = object.folderId
          ? "folder:" + object.folderId
          : "layer:" + object.id,
        over = row.ondragover,
        leave = row.ondragleave,
        drop = row.ondrop;
      row.ondragover = (event) => {
        if (carouselUI.folderDrag) carouselFolderDragOver(event, row);
        else over?.(event);
      };
      row.ondragleave = (event) => {
        if (event.relatedTarget && row.contains(event.relatedTarget)) return;
        row.classList.remove("folder-drop-before", "folder-drop-after");
        leave?.(event);
      };
      row.ondrop = (event) => {
        if (carouselUI.folderDrag) carouselFolderDrop(event, row, targetKey);
        else drop?.(event);
      };
    });
}
