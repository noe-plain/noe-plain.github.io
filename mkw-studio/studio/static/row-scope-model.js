(function (root) {
  "use strict";
  const policy =
    typeof module !== "undefined"
      ? require("./carousel-policy.js")
      : root.MKWCarouselPolicy;
  function scope(c, pageId, bounds = (o) => o) {
    const ids = c.pageStructure?.groups.find((g) => g.includes(pageId));
    if (!ids)
      return {
        view: { ...c, folders: c.folders || [] },
        shared: [],
        ids: null,
      };
    const objects = c.objects.filter((o) =>
        ids.includes(o.pageId || policy.sourcePage(c, bounds(o))?.id),
      ),
      selected = new Set(objects.map((o) => o.id));
    const folders = (c.folders || []).filter((f) => {
      const members = c.objects.filter((o) => o.folderId === f.id);
      return members.length
        ? members.some((o) => selected.has(o.id))
        : f.pageId
          ? ids.includes(f.pageId)
          : c.pageStructure.groups[0] === ids;
    });
    return {
      ids,
      view: { ...c, objects, folders },
      shared: folders
        .filter((f) =>
          c.objects.some((o) => o.folderId === f.id && !selected.has(o.id)),
        )
        .map((f) => f.id),
    };
  }
  function isolate(c, pageId, bounds, id) {
    const row = scope(c, pageId, bounds);
    if (!row.shared.length) return c;
    if ((c.folders || []).length + row.shared.length > 500)
      throw Error(
        "Für unabhängige Ordner fehlen freie Ordnerplätze (maximal 500).",
      );
    const members = new Set(row.view.objects.map((o) => o.id)),
      map = new Map(),
      used = new Set([...(c.folders || []), ...c.objects].map((v) => v.id));
    for (const key of row.shared) {
      const next = id();
      if (!next || used.has(next)) throw Error("Ungültige neue Ordner-ID.");
      used.add(next);
      map.set(key, next);
    }
    return {
      ...c,
      objects: c.objects.map((o) =>
        members.has(o.id) && map.has(o.folderId)
          ? { ...o, folderId: map.get(o.folderId) }
          : o,
      ),
      folders: [
        ...(c.folders || []),
        ...c.folders
          .filter((f) => map.has(f.id))
          .map((f) => ({
            ...f,
            id: map.get(f.id),
            pageId: row.ids[0],
            before: map.has(f.before?.slice(7))
              ? "folder:" + map.get(f.before.slice(7))
              : null,
          })),
      ],
    };
  }
  function mergeOrder(c, view) {
    const selected = new Set(view.objects.map((o) => o.id)),
      ordered = [...view.objects];
    if (c.objects.filter((o) => selected.has(o.id)).length !== ordered.length)
      throw Error("Die Ebenenauswahl hat sich verändert.");
    const folders = new Map((view.folders || []).map((f) => [f.id, f]));
    return {
      ...c,
      objects: c.objects.map((o) => (selected.has(o.id) ? ordered.shift() : o)),
      folders: (c.folders || []).map((f) => folders.get(f.id) || f),
    };
  }
  function extract(c, pageId, bounds = (o) => o) {
    const row = scope(c, pageId, bounds);
    if (!row.ids) throw Error("Wähle eine vorhandene Reihe.");
    const frames = c.artboards.filter((a) => row.ids.includes(a.id)),
      x = Math.min(...frames.map((a) => a.x)),
      y = Math.min(...frames.map((a) => a.y));
    const extent = {
      x,
      y,
      w: Math.max(...frames.map((a) => a.x + a.w)) - x,
      h: Math.max(...frames.map((a) => a.y + a.h)) - y,
    };
    const visible = new Set(
        c.objects
          .filter((o) => {
            const clip = policy.contentFrame(c, o);
            return clip
              ? policy.intersects(clip, extent)
              : policy.intersects(bounds(o), extent);
          })
          .map((o) => o.id),
      ),
      needed = new Set(visible);
    let added = true;
    while (added) {
      added = false;
      for (const o of c.objects)
        if (
          needed.has(o.id) &&
          o.imageSourceId &&
          !needed.has(o.imageSourceId)
        ) {
          needed.add(o.imageSourceId);
          added = true;
        }
    }
    const objects = c.objects
      .filter((o) => needed.has(o.id))
      .map((o) => ({
        ...JSON.parse(JSON.stringify(o)),
        x: o.x - x,
        y: o.y - y,
        pageId: row.ids.includes(o.pageId) ? o.pageId : row.ids[0],
        artboardScoped: true,
        ...(!visible.has(o.id) ? { visible: false } : {}),
      }));
    const folders = (c.folders || [])
      .filter((f) => objects.some((o) => o.folderId === f.id))
      .map((f) => ({
        ...f,
        ...(f.pageId
          ? { pageId: row.ids.includes(f.pageId) ? f.pageId : row.ids[0] }
          : {}),
      }));
    const index = c.pageStructure.groups.findIndex((g) => g.includes(pageId));
    return {
      ...c,
      n: frames.length,
      objects,
      folders,
      artboards: frames.map((a) => ({ ...a, x: a.x - x, y: a.y - y })),
      pageStructure: {
        ...c.pageStructure,
        shuffle: false,
        groups: [[...row.ids]],
        artboardInfo: [{ ...c.pageStructure.artboardInfo[index] }],
      },
    };
  }
  const api = Object.freeze({ scope, isolate, mergeOrder, extract });
  if (typeof module !== "undefined") module.exports = api;
  root.MKWRowScope = api;
})(globalThis);
