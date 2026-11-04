(function (root) {
  "use strict";
  let owner = null,
    generation = 0,
    serial = 0;
  let queue = Promise.resolve();
  const entries = new Map(),
    sources = new Map(),
    pending = new Map();
  function release() {
    generation++;
    for (const value of entries.values()) value.width = value.height = 1;
    entries.clear();
    sources.clear();
    pending.clear();
    owner = null;
    queue = Promise.resolve();
  }
  function tokens(project) {
    if (owner !== project) {
      release();
      owner = project;
    }
    const alive = new Set();
    for (const [kind, items] of [
      ["image", project.images],
      ["logo", project.logos],
      ["font", project.fonts],
    ])
      for (const item of items || []) {
        const id = kind + ":" + (item.id || item.role);
        alive.add(id);
        const old = sources.get(id);
        if (!old || old.source !== item.data)
          sources.set(id, { source: item.data, token: ++serial });
      }
    for (const id of sources.keys()) if (!alive.has(id)) sources.delete(id);
    return (id) => sources.get(id)?.token || 0;
  }
  async function get(project, key, render) {
    if (owner !== project) {
      release();
      owner = project;
    }
    if (entries.has(key)) {
      const canvas = entries.get(key);
      entries.delete(key);
      entries.set(key, canvas);
      return canvas;
    }
    if (pending.has(key)) return pending.get(key);
    const current = generation;
    const task = queue
      .catch(() => {})
      .then(async () => {
        if (current !== generation || owner !== project) return null;
        const canvas = await render(
          () => generation === current && owner === project,
        );
        if (!canvas || current !== generation || owner !== project) {
          if (canvas) canvas.width = canvas.height = 1;
          return null;
        }
        entries.set(key, canvas);
        while (entries.size > 100) {
          const first = entries.keys().next().value,
            old = entries.get(first);
          entries.delete(first);
          old.width = old.height = 1;
        }
        return canvas;
      });
    queue = task.then(
      () => undefined,
      () => undefined,
    );
    pending.set(key, task);
    try {
      return await task;
    } finally {
      if (pending.get(key) === task) pending.delete(key);
    }
  }
  const api = Object.freeze({
    tokens,
    get,
    release,
    stats: () => ({ entries: entries.size, pending: pending.size }),
  });
  root.MKWPagePreviewCache = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
