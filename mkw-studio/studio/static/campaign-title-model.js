(function (root) {
  "use strict";
  const edit =
    typeof module !== "undefined"
      ? require("./text-edit-model.js")
      : root.MKWTextEdit;
  const text =
    typeof module !== "undefined" ? require("./text-model.js") : root.MKWText;
  const fields = Object.freeze([
    { key: "date", label: "Übertitel", size: 70, font: "Replica LL Regular" },
    { key: "title", label: "Titel", size: 120, font: "Replica LL" },
    {
      key: "subtitle",
      label: "Untertitel",
      size: 55,
      font: "Replica LL Regular",
    },
  ]);
  function parts(object, board) {
    if (!object) return new Map();
    const result = new Map(),
      legacy = fields.flatMap(({ key }) => {
        const value = board?.elements?.[key];
        return value?.text && value.visible && value.enabled !== false
          ? value.text.split("\n").map(() => key)
          : [];
      });
    const marked = object.textStyles?.some((s) => s?.fdRole);
    let prior;
    for (const p of edit.paragraphs(object.text)) {
      const role =
        object.textStyles?.[p.index]?.fdRole ||
        legacy[p.index] ||
        (marked ? prior : null) ||
        fields[Math.min(p.index, 2)].key;
      prior = role;
      const part = result.get(role);
      if (part) part.end = p.end;
      else result.set(role, { start: p.start, end: p.end });
    }
    return result;
  }
  function read(object, board) {
    const ranges = parts(object, board);
    return Object.fromEntries(
      fields.map(({ key }) => {
        const p = ranges.get(key);
        return [
          key,
          p ? object.text.slice(p.start, p.end).replaceAll("\u2028", "\n") : "",
        ];
      }),
    );
  }
  function update(object, key, input, board) {
    if (!fields.some((f) => f.key === key)) throw Error("Unbekannte Textart.");
    const ranges = parts(object, board),
      fragments = [];
    for (const field of fields) {
      const range = ranges.get(field.key),
        previous = range ? edit.slice(object, range.start, range.end) : null;
      if (field.key !== key) {
        if (previous?.text) fragments.push({ ...previous, role: field.key });
        continue;
      }
      const value = input.replace(/\r\n?/g, "\n").replaceAll("\n", "\u2028");
      if (!value) continue;
      if (previous?.text) {
        const source = { ...object, ...previous },
          diff = text.diff(previous.text, value);
        fragments.push({
          ...edit.replace(
            source,
            diff.start,
            diff.end,
            { text: diff.insert },
            false,
          ),
          role: key,
        });
      } else
        fragments.push({
          text: value,
          role: key,
          textStyles: [{ size: field.size, lineHeight: 0.95 }],
          characterStyles: [
            { start: 0, end: value.length, font: field.font, size: field.size },
          ],
        });
    }
    let value = "",
      characterStyles = [],
      textStyles = [];
    for (const fragment of fragments) {
      if (value) value += "\n";
      const start = value.length;
      value += fragment.text;
      characterStyles.push(
        ...fragment.characterStyles.map((run) => ({
          ...run,
          start: run.start + start,
          end: run.end + start,
        })),
      );
      textStyles.push(
        ...fragment.text.split("\n").map((_, i) => ({
          ...fragment.textStyles[i],
          fdRole: fragment.role,
        })),
      );
    }
    if (value.length > edit.maxLength || textStyles.length > 10000)
      throw Error("Höchstens 100 000 Zeichen und 10 000 Absätze verwenden.");
    return {
      text: value,
      characterStyles: text.merge(characterStyles),
      textStyles,
    };
  }
  const api = Object.freeze({ fields, read, update });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWCampaignTitles = api;
})(globalThis);
