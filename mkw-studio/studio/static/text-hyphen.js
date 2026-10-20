/* TeX/Knuth-Liang points, with a lazy local dictionary and bounded word cache. */
(function (root) {
  "use strict";
  const patternURL = "static/hyphenation/hyph-de-1996.tex?v=374ad1ce3263";
  const listeners = new Set();
  let engine = null,
    promise = null,
    error = null,
    version = 0;
  function create(source, deferred = false) {
    const body = source.match(/\\patterns\s*\{([\s\S]*?)\}/)?.[1];
    if (!body) throw Error("Die Trennmuster sind ungültig.");
    const trie = Object.create(null),
      alphabet = new Set(),
      patterns = body
        .replace(/%[^\n]*/g, "")
        .split(/\s+/)
        .filter(Boolean);
    function insert(pattern) {
      let node = trie,
        weights = [0];
      for (const char of pattern) {
        if (/[0-9]/.test(char)) weights[weights.length - 1] = +char;
        else {
          alphabet.add(char);
          node = node[char] ??= Object.create(null);
          weights.push(0);
        }
      }
      node.$ = weights;
    }
    const cache = new Map();
    const segmenter =
      typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter("de-CH", { granularity: "grapheme" })
        : null;
    function points(word) {
      if (cache.has(word)) return [...cache.get(word)];
      const segments = segmenter
          ? Array.from(segmenter.segment(word), (s) => s.segment)
          : Array.from(word),
        letters = segments.map((s) =>
          s.normalize("NFC").toLocaleLowerCase("de-CH"),
        ),
        normalized = letters.join(""),
        boundaries = [0];
      for (const segment of segments)
        boundaries.push(boundaries.at(-1) + segment.length);
      if (
        letters.some((c) => c.length !== 1 || !alphabet.has(c)) ||
        letters.length < 5 ||
        letters.length > 150
      )
        return [];
      const text = "." + normalized + ".",
        weights = new Uint8Array(text.length + 1);
      for (let i = 0; i < text.length; i++) {
        let node = trie;
        for (let j = i; j < text.length; j++) {
          node = node[text[j]];
          if (!node) break;
          if (node.$)
            for (let k = 0; k < node.$.length; k++)
              weights[i + k] = Math.max(weights[i + k], node.$[k]);
        }
      }
      const out = [];
      for (let i = 2; i <= letters.length - 2; i++)
        if (weights[i + 1] % 2) out.push(boundaries[i]);
      if (cache.size >= 1024) cache.delete(cache.keys().next().value);
      cache.set(word, out);
      return [...out];
    }
    const result = { points, patternCount: patterns.length };
    if (deferred)
      return (async () => {
        for (let i = 0; i < patterns.length; i++) {
          insert(patterns[i]);
          if (i % 1000 === 999)
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        return result;
      })();
    for (const pattern of patterns) insert(pattern);
    return result;
  }
  function requires(o) {
    if (!o?.text) return false;
    return o.text
      .split("\n")
      .some(
        (_, i) =>
          (o.textStyles?.[i]?.align ?? o.textAlign ?? o.align) === "justify" &&
          (o.textStyles?.[i]?.hyphenate ?? o.hyphenate) !== false,
      );
  }
  function notify() {
    version++;
    for (const listener of listeners) queueMicrotask(listener);
  }
  function ensure(retry = false) {
    if (engine) return Promise.resolve(engine);
    if (promise && (!retry || !error)) return promise;
    if (error && !retry) return Promise.reject(error);
    error = null;
    promise = (async () => {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(patternURL, { signal: controller.signal });
        if (!response.ok)
          throw Error("Trennmuster konnten nicht geladen werden.");
        const source = await response.text();
        engine = await create(source, true);
        notify();
        return engine;
      } catch (cause) {
        error = Error(
          "Silbentrennung konnte nicht geladen werden. Bitte erneut einschalten oder die Verbindung prüfen.",
          { cause },
        );
        notify();
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();
    return promise;
  }
  const api = {
    create,
    requires,
    ensure,
    points: (word) => engine?.points(word) || [],
    onChange: (listener) => listeners.add(listener),
    get version() {
      return version;
    },
    get error() {
      return error;
    },
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWTextHyphen = api;
})(globalThis);
