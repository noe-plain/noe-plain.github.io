// Separate layout from source strings before posting to the SQLite worker.
export function mediaDraft(project, known = new Map()) {
  const indexes = new Map();
  const paths = [];
  const urls = [];
  const media = [];
  function visit(value, path) {
    const deferred = value?.blob instanceof Blob && value.encoding === "base64";
    if (
      deferred ||
      (typeof value === "string" && /^data:[^,]*,/i.test(value))
    ) {
      if (!indexes.has(value)) {
        indexes.set(value, media.length);
        urls.push(value);
        media.push(known.get(value) ?? value);
      }
      paths.push([JSON.stringify(path), indexes.get(value)]);
      return null;
    }
    if (Array.isArray(value))
      return Array.from(value, (item, i) => visit(item ?? null, [...path, i]));
    if (value && typeof value === "object") {
      const record = Object.create(null);
      for (const [name, item] of Object.entries(value))
        if (item !== undefined) record[name] = visit(item, [...path, name]);
      return record;
    }
    return value;
  }
  const layout = visit(project, []);
  return { urls, draft: { layout, paths, media } };
}
