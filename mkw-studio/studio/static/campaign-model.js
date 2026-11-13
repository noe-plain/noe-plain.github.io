/* Campaign links use the Designer object model; positions are local to each output. */
(function (root) {
  "use strict";
  const copy = (value) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ignored = new Set([
    "id",
    "pageId",
    "pageFragment",
    "artboardScoped",
    "folderId",
    "imageId",
    "imageSourceId",
    "campaignRole",
    "campaignLocal",
  ]);
  const key = (a) => `${a.w}x${a.h}`;
  function values(o, frame) {
    const v = {};
    for (const [k, value] of Object.entries(o))
      if (!ignored.has(k)) v[k] = copy(value);
    v.x = o.x - frame.x;
    v.y = o.y - frame.y;
    return v;
  }
  function apply(o, v, frame) {
    for (const k of Object.keys(o))
      if (!ignored.has(k) && !(k in v)) delete o[k];
    Object.assign(o, copy(v), { x: v.x + frame.x, y: v.y + frame.y });
  }
  function valid(q) {
    const s = q.campaign;
    if (!s) return true;
    if (
      s.version !== 1 ||
      !Array.isArray(s.rows) ||
      !Array.isArray(s.links) ||
      s.rows.length > 200 ||
      s.links.length > 500
    )
      return false;
    if (!q.carousel) return !s.rows.length && !s.links.length;
    if (
      !Array.isArray(q.carousel.artboards) ||
      !Array.isArray(q.carousel.objects) ||
      !Array.isArray(q.images)
    )
      return false;
    const frames = new Set(q.carousel.artboards.map((a) => a.id)),
      images = new Set(q.images.map((a) => a.id)),
      assigned = new Set(),
      objects = new Map(q.carousel.objects.map((o) => [o.id, o]));
    for (const row of s.rows) {
      if (
        !images.has(row.imageId) ||
        !Array.isArray(row.pages) ||
        !row.pages.length
      )
        return false;
      for (const id of row.pages) {
        if (!frames.has(id) || assigned.has(id)) return false;
        assigned.add(id);
      }
    }
    if (assigned.size !== frames.size) return false;
    const sources = new Set();
    for (const link of s.links) {
      if (
        !objects.has(link.source) ||
        sources.has(link.source) ||
        !Array.isArray(link.targets) ||
        !link.last ||
        typeof link.last !== "object"
      )
        return false;
      sources.add(link.source);
      const source = objects.get(link.source),
        sourceFrame = q.carousel.artboards.find((a) => a.id === source.pageId);
      if (!sourceFrame || link.format !== key(sourceFrame)) return false;
      const targets = new Set();
      for (const t of link.targets)
        if (
          !frames.has(t.page) ||
          targets.has(t.page) ||
          !Array.isArray(t.overrides) ||
          t.overrides.some((k) => typeof k !== "string") ||
          !t.last ||
          typeof t.last !== "object" ||
          t.overrides.length > 100 ||
          (t.id && (!objects.has(t.id) || objects.get(t.id).pageId !== t.page))
        )
          return false;
        else targets.add(t.page);
    }
    return true;
  }
  function reconcile(q, makeId) {
    const c = q.carousel,
      s = q.campaign;
    if (!c || !s) return;
    const frames = new Map(c.artboards.map((a) => [a.id, a])),
      objects = new Map(c.objects.map((o) => [o.id, o]));
    s.rows = s.rows
      .map((r) => ({ ...r, pages: r.pages.filter((id) => frames.has(id)) }))
      .filter((r) => r.pages.length);
    const first = new Map();
    for (const row of s.rows)
      for (const id of row.pages) {
        const a = frames.get(id);
        if (!first.has(key(a))) first.set(key(a), id);
      }
    const sources = new Set(s.links.map((l) => l.source)),
      followers = new Set(s.links.flatMap((l) => l.targets.map((t) => t.id)));
    for (const o of [...c.objects]) {
      const a = frames.get(o.pageId);
      if (
        !a ||
        first.get(key(a)) !== a.id ||
        sources.has(o.id) ||
        followers.has(o.id) ||
        o.campaignLocal ||
        o.campaignRole === "background" ||
        o.type === "image"
      )
        continue;
      if (
        o.type === "gradient" &&
        s.links.some(
          (l) =>
            l.format === key(a) && objects.get(l.source)?.type === "gradient",
        )
      )
        continue;
      s.links.push({
        source: o.id,
        format: key(a),
        last: values(o, a),
        targets: [],
      });
      sources.add(o.id);
    }
    s.links = s.links.filter((l) => {
      if (objects.has(l.source)) return true;
      const removed = new Set(l.targets.map((t) => t.id).filter(Boolean));
      c.objects = c.objects.filter((o) => !removed.has(o.id));
      for (const id of removed) objects.delete(id);
      return false;
    });
    for (const l of s.links) {
      const source = objects.get(l.source),
        frame = frames.get(source.pageId);
      if (!frame) continue;
      const current = values(source, frame),
        changed = new Set(
          [
            ...new Set([...Object.keys(l.last), ...Object.keys(current)]),
          ].filter((k) => !same(current[k], l.last[k])),
        );
      l.targets = l.targets.filter((t) => frames.has(t.page));
      for (const row of s.rows)
        for (const page of row.pages) {
          const a = frames.get(page);
          if (page === source.pageId || key(a) !== l.format) continue;
          let t = l.targets.find((t) => t.page === page);
          if (!t) {
            let o =
              source.campaignRole &&
              c.objects.find(
                (o) =>
                  o.pageId === page &&
                  o.campaignRole === source.campaignRole &&
                  !followers.has(o.id),
              );
            if (!o) {
              if (c.objects.length >= 500)
                throw Error(
                  "Die Kampagne erreicht 500 Ebenen. Entferne Ebenen oder verwende weniger Bilder/Formate.",
                );
              o = {
                ...copy(source),
                id: makeId(),
                pageId: page,
                artboardScoped: true,
              };
              delete o.folderId;
              apply(o, current, a);
              if (source.type === "gradient") {
                const at = c.objects.findIndex(
                  (item) => item.pageId === page && item.type === "text",
                );
                c.objects.splice(at < 0 ? c.objects.length : at, 0, o);
              } else c.objects.push(o);
              objects.set(o.id, o);
            }
            const initial = values(o, a);
            t = {
              page,
              id: o.id,
              last: initial,
              overrides: Object.keys(initial).filter(
                (k) => !same(initial[k], current[k]),
              ),
            };
            l.targets.push(t);
            followers.add(o.id);
          }
          const o = objects.get(t.id);
          if (!o) {
            t.id = null;
            t.last = {};
            t.overrides = [];
            continue;
          }
          const local = values(o, a),
            overrides = new Set(t.overrides);
          for (const k of new Set([
            ...Object.keys(local),
            ...Object.keys(t.last),
          ]))
            if (!same(local[k], t.last[k])) overrides.add(k);
          for (const k of changed)
            if (!overrides.has(k)) {
              if (k in current) local[k] = copy(current[k]);
              else delete local[k];
            }
          apply(o, local, a);
          t.last = values(o, a);
          t.overrides = [...overrides];
        }
      l.last = current;
    }
  }
  function reset(q, id) {
    const c = q.carousel;
    for (const l of q.campaign.links) {
      const t = l.targets.find((t) => t.id === id);
      if (!t) continue;
      const source = c.objects.find((o) => o.id === l.source),
        o = c.objects.find((o) => o.id === id),
        a = c.artboards.find((a) => a.id === o.pageId),
        f = c.artboards.find((a) => a.id === source.pageId);
      apply(o, values(source, f), a);
      t.last = values(o, a);
      t.overrides = [];
      return true;
    }
    return false;
  }
  const api = Object.freeze({ valid, reconcile, reset, values, key });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWCampaignModel = api;
})(globalThis);
