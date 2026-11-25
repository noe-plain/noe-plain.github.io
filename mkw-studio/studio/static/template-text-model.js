(function (root) {
  "use strict";
  const text =
    typeof module !== "undefined" ? require("./text-model.js") : root.MKWText;
  const edit =
    typeof module !== "undefined"
      ? require("./text-edit-model.js")
      : root.MKWTextEdit;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function filled(object, value) {
    const paragraphs = edit.paragraphs(object.text),
      next = value.split("\n"),
      characters = [],
      styles = [];
    let offset = 0;
    next.forEach((line, index) => {
      const source = paragraphs[Math.min(index, paragraphs.length - 1)],
        original = object.text.slice(source.start, source.end);
      const fragment = {
        ...object,
        text: original,
        characterStyles: text
          .segments(object, source.start, source.end)
          .map((run) => ({
            ...run,
            start: run.start - source.start,
            end: run.end - source.start,
          })),
      };
      for (const run of text.forInput(
        fragment,
        line,
        original ? undefined : text.at(object, source.start),
      ))
        characters.push({
          ...run,
          start: run.start + offset,
          end: run.end + offset,
        });
      if (index < next.length - 1)
        characters.push({
          start: offset + line.length,
          end: offset + line.length + 1,
          ...text.at(object, Math.max(source.start, source.end - 1)),
        });
      styles.push(copy(object.textStyles?.[source.index] || null));
      offset += line.length + 1;
    });
    return {
      text: value,
      characterStyles: text.merge(characters),
      textStyles: styles,
    };
  }
  function value(object, draft = {}) {
    const next = draft.text ?? object.text;
    if (
      typeof next !== "string" ||
      next.length > edit.maxLength ||
      next.split("\n").length > 10000
    )
      throw Error(
        "Bitte höchstens 100 000 Zeichen und 10 000 Absätze pro Textfeld verwenden.",
      );
    const result =
      next === object.text ||
      (draft.characterStyles !== undefined && draft.textStyles !== undefined)
        ? {
            text: next,
            characterStyles: copy(
              draft.characterStyles ?? object.characterStyles ?? [],
            ),
            textStyles: copy(draft.textStyles ?? object.textStyles ?? []),
          }
        : filled(object, next);
    if (draft.characterStyles !== undefined)
      result.characterStyles = copy(draft.characterStyles);
    if (draft.textStyles !== undefined)
      result.textStyles = copy(draft.textStyles);
    result.textAnchor = draft.textAnchor ?? object.textAnchor ?? "top";
    if (!["top", "center", "bottom"].includes(result.textAnchor))
      throw Error("Ungültige Textposition im Rahmen.");
    text.validate(
      { ...object, ...result },
      new Set(
        [
          object.font,
          object.role,
          ...result.characterStyles.map((s) => s.font),
        ].filter(Boolean),
      ),
    );
    return result;
  }
  function character(object, paragraph) {
    const ps = object.textStyles?.[paragraph.index] || {},
      inherited = text.at(object, paragraph.start);
    return {
      font: object.font || object.role,
      size: ps.size ?? object.size,
      color: object.color,
      tracking: object.tracking ?? 0,
      baselineShift: object.baselineShift ?? 0,
      script: object.script || "normal",
      uppercase: !!object.uppercase,
      underline: !!object.underline,
      strike: !!object.strike,
      family: !!object.family,
      ...inherited,
    };
  }
  function formats(template) {
    const seen = new Set(),
      result = [];
    for (const object of template.carousel.objects.filter(
      (o) => o.type === "text",
    ))
      for (const p of edit.paragraphs(object.text)) {
        if (p.start === p.end) continue;
        const { leading, ...source } = object.textStyles?.[p.index] || {},
          chars = character(object, p);
        const paragraph = {
          align: object.textAlign || "left",
          opticalAlign: object.opticalAlign ?? false,
          lineHeight: object.lineHeight ?? 0.95,
          spaceBefore: 0,
          spaceAfter: 0,
          hyphenate: object.hyphenate ?? true,
          ...source,
          size: chars.size,
        };
        const key = JSON.stringify([chars, paragraph]);
        if (seen.has(key)) continue;
        seen.add(key);
        const sample = object.text
          .slice(p.start, p.end)
          .replace(/\s+/g, " ")
          .slice(0, 36);
        result.push({
          id: `${object.id}:${p.index}`,
          name: `${object.name} · ${sample}`,
          character: chars,
          paragraph,
        });
      }
    return result;
  }
  function indices(object, range) {
    const start = Math.max(0, Math.min(object.text.length, range.start || 0)),
      end = Math.max(start, Math.min(object.text.length, range.end ?? start));
    return text.paragraphs(object.text, start, end);
  }
  function apply(object, draft, format, range) {
    const next = value(object, draft),
      selected = indices(next, range),
      paragraphs = edit.paragraphs(next.text);
    const patch = Object.fromEntries(
      text.keys.map((key) => [key, format.character[key] ?? null]),
    );
    for (const index of selected) {
      const p = paragraphs[index];
      next.textStyles[index] = copy(format.paragraph);
      next.characterStyles = text.patch(
        next,
        p.start,
        Math.min(next.text.length, p.end + 1),
        patch,
      );
    }
    const last = paragraphs.at(-1);
    if (last.start === last.end && selected.includes(last.index))
      next.pending = { index: last.index, character: copy(format.character) };
    else if (draft.pending && !selected.includes(draft.pending.index))
      next.pending = copy(draft.pending);
    return next;
  }
  function input(object, draft, nextText, replacementRange = null) {
    const current = { ...object, ...value(object, draft) },
      diff = text.diff(current.text, nextText);
    const at = indices(current, { start: diff.start })[0],
      pending = draft.pending?.index === at ? draft.pending : null;
    let next;
    if (
      !pending &&
      ((diff.start === 0 && diff.end === current.text.length) ||
        (replacementRange?.start === 0 &&
          replacementRange.end === current.text.length))
    )
      next = value(current, { text: nextText });
    else
      next = {
        ...edit.replace(current, diff.start, diff.end, {
          text: diff.insert,
          ...(pending && diff.insert
            ? {
                characterStyles: [
                  { start: 0, end: diff.insert.length, ...pending.character },
                ],
              }
            : {}),
        }),
        textAnchor: current.textAnchor,
      };
    const last = edit.paragraphs(next.text).at(-1);
    if (draft.pending && last.start === last.end)
      next.pending = {
        index: last.index,
        character: copy(draft.pending.character),
      };
    return valueWithPending(object, next);
  }
  function valueWithPending(object, draft) {
    return {
      ...value(object, draft),
      ...(draft.pending ? { pending: copy(draft.pending) } : {}),
    };
  }
  const api = { value, formats, indices, apply, input };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWTemplateTextModel = api;
})(globalThis);
