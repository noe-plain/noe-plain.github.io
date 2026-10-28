(function (root) {
  "use strict";
  const keys = ["w", "h", "top", "bottom", "left", "right"];
  function errors(format, designer = false) {
    const result = {},
      max = designer ? 4000 : 10000;
    for (const key of keys) {
      const value = format[key],
        dimension = key === "w" || key === "h";
      if (!Number.isInteger(value))
        result[key] = "Bitte eine ganze Zahl eingeben.";
      else if (
        value < (dimension ? 240 : 0) ||
        value > (dimension ? max : Infinity)
      )
        result[key] = dimension
          ? `Bitte einen Wert zwischen 240 und ${max} px eingeben.`
          : "Schutzzonen dürfen nicht negativ sein.";
    }
    const pair = (a, b, dimension, text) => {
      if (
        ![a, b, dimension].some((key) => result[key]) &&
        format[a] + format[b] >= format[dimension]
      )
        result[a] = result[b] = text;
    };
    pair(
      "top",
      "bottom",
      "h",
      "Oben und unten müssen zusammen kleiner als die Höhe sein.",
    );
    pair(
      "left",
      "right",
      "w",
      "Links und rechts müssen zusammen kleiner als die Breite sein.",
    );
    if (!designer && !result.w && !result.h && format.w * format.h > 40000000)
      result.w = result.h =
        "Die Arbeitsfläche darf höchstens 40 Millionen Pixel haben.";
    return result;
  }
  function duplicateIds(formats) {
    const sizes = new Map(),
      ids = new Set();
    for (const f of formats.filter((f) => f.enabled)) {
      if (!Number.isInteger(f.w) || !Number.isInteger(f.h)) continue;
      const key = `${f.w}x${f.h}`;
      if (sizes.has(key)) {
        ids.add(sizes.get(key));
        ids.add(f.id);
      } else sizes.set(key, f.id);
    }
    return ids;
  }
  const format = (f) => Object.fromEntries(keys.map((key) => [key, f[key]]));
  const api = Object.freeze({ keys, errors, duplicateIds, format });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWNewProjectModel = api;
})(globalThis);
