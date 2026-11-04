(function (root) {
  "use strict";
  function markup(prefix) {
    return `<section class="paragraph-scope"><h4>Einzelne Absätze &amp; Zeilen</h4><div class="paragraph-scope-heading"><output data-paragraph-count role="status" aria-live="polite"></output><button data-paragraph-all>Alle</button></div><fieldset data-paragraph-selection class="scope-options" aria-label="Absätze auswählen" aria-describedby="${prefix}-paragraphMultiHint"></fieldset><p id="${prefix}-paragraphMultiHint" class="type-hint">Mehrere Kästchen wählen. Umschalt wählt einen Bereich.</p><section data-line-scope class="typo-line-controls"><h4>Einzelne Zeilen</h4><fieldset data-line-selection class="scope-options" aria-label="Zeilen in der Auswahl"></fieldset><label>Abstand der ausgewählten Zeilen (px)<input data-lines-leading type="number" min="1" max="3000" step="any"></label><button data-lines-auto>Automatischen Zeilenabstand verwenden</button></section></section>`;
  }
  function options(host, items, chosen) {
    const signature = JSON.stringify(items);
    if (host.dataset.items !== signature) {
      host.replaceChildren(
        ...items.map(({ value, number, text }) => {
          const row = document.createElement("label"),
            input = document.createElement("input"),
            label = document.createElement("span"),
            badge = document.createElement("strong"),
            copy = document.createElement("span");
          input.type = "checkbox";
          input.value = value;
          badge.textContent = number;
          copy.textContent = text;
          label.className = "scope-option-text";
          label.append(badge, copy);
          row.className = "scope-option";
          row.append(input, label);
          return row;
        }),
      );
      host.dataset.items = signature;
    }
    for (const input of host.querySelectorAll("input"))
      input.checked = chosen.has(input.value);
  }
  const selection = (host) =>
    [...host.querySelectorAll("input:checked")].map((input) => input.value);
  function bindSelection(host, changed) {
    let anchor = null;
    host.onclick = (event) => {
      const input = event.target;
      if (!input.matches('input[type="checkbox"]')) return;
      const items = [...host.querySelectorAll("input")],
        index = items.indexOf(input);
      if (event.shiftKey && anchor !== null)
        for (const item of items.slice(
          Math.min(anchor, index),
          Math.max(anchor, index) + 1,
        ))
          item.checked = input.checked;
      anchor = index;
    };
    host.onchange = () => changed(selection(host));
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
    let lineRows = [],
      began = false;
    const common = (values) =>
      values.length && values.every((v) => v === values[0]) ? values[0] : null;
    function update(indices) {
      const values = o.text.split("\n"),
        chosenParagraphs = new Set(indices.map(String));
      options(
        paragraphs,
        values.map((text, i) => ({
          value: String(i),
          number: String(i + 1),
          text: text.trim().slice(0, 160) || "Leerer Absatz",
        })),
        chosenParagraphs,
      );
      const count = host.querySelector("[data-paragraph-count]"),
        countText = `${indices.length} von ${values.length} ${values.length === 1 ? "Absatz" : "Absätzen"} ausgewählt`;
      if (count.textContent !== countText) count.textContent = countText;
      host.querySelector("[data-paragraph-all]").disabled =
        indices.length === values.length;
      const result = layout(),
        list = result.lines.filter((l) => indices.includes(l.paragraph));
      lineRows = list.map((l) => ({ ...l, key: `${l.paragraph}:${l.index}` }));
      const valid = new Set(lineRows.map((l) => l.key));
      if (state.lineSelection)
        state.lineSelection = new Set(
          [...state.lineSelection].filter((key) => valid.has(key)),
        );
      const chosen = state.lineSelection || valid;
      options(
        lines,
        lineRows.map((l) => ({
          value: l.key,
          number: `${l.paragraph + 1}.${l.index + 1}`,
          text: l.text.trim().slice(0, 160) || "Leere Zeile",
        })),
        chosen,
      );
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
    }
    bindSelection(paragraphs, (values) => {
      delete state.lineSelection;
      select(values.map(Number));
    });
    host.querySelector("[data-paragraph-all]").onclick = () => {
      delete state.lineSelection;
      select(o.text.split("\n").map((_, i) => i));
    };
    bindSelection(lines, (values) => {
      state.lineSelection = new Set(values);
      update(selection(paragraphs).map(Number));
    });
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
