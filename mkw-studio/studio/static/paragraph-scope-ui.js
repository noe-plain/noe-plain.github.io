(function (root) {
  "use strict";
  function markup(prefix) {
    return `<section class="paragraph-scope"><h4>Einzelne Absätze &amp; Zeilen</h4><div class="paragraph-scope-heading"><label class="visually-hidden" for="${prefix}-paragraphSelection">Absätze auswählen</label><output data-paragraph-count role="status" aria-live="polite"></output><button data-paragraph-all>Alle</button></div><select id="${prefix}-paragraphSelection" data-paragraph-selection multiple size="4" aria-describedby="${prefix}-paragraphMultiHint"></select><p id="${prefix}-paragraphMultiHint" class="type-hint">Mit ⌘/Strg oder Umschalt mehrere wählen.</p><section data-line-scope class="typo-line-controls"><h4>Einzelne Zeilen</h4><label for="${prefix}-lineSelection">Zeilen in der Auswahl</label><select id="${prefix}-lineSelection" data-line-selection multiple size="3"></select><label>Abstand der ausgewählten Zeilen (px)<input data-lines-leading type="number" min="1" max="3000" step="any"></label><button data-lines-auto>Automatischen Zeilenabstand verwenden</button></section></section>`;
  }
  function mount({
    host,
    o,
    state,
    layout,
    select,
    leading,
    remember,
    locked,
  }) {
    const paragraphs = host.querySelector("[data-paragraph-selection]"),
      lines = host.querySelector("[data-line-selection]"),
      input = host.querySelector("[data-lines-leading]");
    let textKey = null,
      lineRows = [],
      began = false;
    const common = (values) =>
      values.length && values.every((v) => v === values[0]) ? values[0] : null;
    function update(indices) {
      const values = o.text.split("\n");
      if (textKey !== o.text) {
        paragraphs.replaceChildren(
          ...values.map((text, i) => {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `${i + 1} · ${text.trim().slice(0, 60) || "Leerer Absatz"}`;
            return option;
          }),
        );
        textKey = o.text;
      }
      paragraphs.size = Math.max(2, Math.min(4, values.length));
      host.querySelector("[data-paragraph-count]").textContent =
        `${indices.length} von ${values.length} ${values.length === 1 ? "Absatz" : "Absätzen"} ausgewählt`;
      host.querySelector("[data-paragraph-all]").disabled =
        indices.length === values.length;
      for (const option of paragraphs.options)
        option.selected = indices.includes(+option.value);
      const result = layout(),
        list = result.lines.filter((l) => indices.includes(l.paragraph));
      lineRows = list.map((l) => ({ ...l, key: `${l.paragraph}:${l.index}` }));
      const valid = new Set(lineRows.map((l) => l.key));
      if (state.lineSelection)
        state.lineSelection = new Set(
          [...state.lineSelection].filter((k) => valid.has(k)),
        );
      const chosen = state.lineSelection || valid;
      const options = lineRows.map((l) => {
        const option = document.createElement("option");
        option.value = l.key;
        option.selected = chosen.has(l.key);
        option.textContent = `${l.paragraph + 1}.${l.index + 1} · ${l.text.trim().slice(0, 45) || "Leere Zeile"}`;
        return option;
      });
      const signature = options
        .map((v) => v.value + "|" + v.textContent)
        .join("\n");
      if (lines.dataset.layout !== signature) {
        lines.replaceChildren(...options);
        lines.dataset.layout = signature;
      } else
        for (const option of lines.options)
          option.selected = chosen.has(option.value);
      const value = common(
        lineRows
          .filter((l) => chosen.has(l.key))
          .map((l) => Math.round(l.leading * 100) / 100),
      );
      if (document.activeElement !== input) input.value = value ?? "";
      input.placeholder = value === null ? "Gemischt" : "";
      input.disabled = locked || !chosen.size;
      host.querySelector("[data-lines-auto]").disabled = locked || !chosen.size;
      host.querySelector("[data-line-scope]").hidden = !lineRows.length;
      lines.hidden = lineRows.length < 2;
      lines.previousElementSibling.hidden = lines.hidden;
    }
    paragraphs.onchange = () => {
      delete state.lineSelection;
      select([...paragraphs.selectedOptions].map((o) => +o.value));
    };
    host.querySelector("[data-paragraph-all]").onclick = () => {
      delete state.lineSelection;
      select(o.text.split("\n").map((_, i) => i));
    };
    lines.onchange = () => {
      state.lineSelection = new Set(
        [...lines.selectedOptions].map((o) => o.value),
      );
      update([...paragraphs.selectedOptions].map((o) => +o.value));
    };
    const targets = () =>
      lineRows.filter(
        (l) => !state.lineSelection || state.lineSelection.has(l.key),
      );
    input.onfocus = () => {
      began = false;
    };
    input.oninput = () => {
      if (locked || !MKWFields.validate(input, true)) return;
      if (!began) {
        remember();
        began = true;
      }
      leading(targets(), input.valueAsNumber);
    };
    host.querySelector("[data-lines-auto]").onclick = () => {
      if (locked) return;
      remember();
      leading(targets(), null);
    };
    return { update };
  }
  root.MKWParagraphScopeUI = Object.freeze({ markup, mount });
})(globalThis);
