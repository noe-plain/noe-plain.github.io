(function (root) {
  "use strict";
  function markup(prefix, icon) {
    const picker = (kind, label, count, body) =>
      `<details class="scope-picker" data-scope-picker="${kind}"><summary><span>${label}</span><output ${count} role="status" aria-live="polite"></output><span class="scope-picker-arrow" aria-hidden="true">${icon("down")}</span></summary><div class="scope-picker-body">${body}</div></details>`;
    return `<section class="paragraph-scope"><h4>Einzelne Absätze &amp; Zeilen</h4>${picker("paragraph", "Absätze", "data-paragraph-count", `<div class="scope-picker-actions"><p id="${prefix}-paragraphMultiHint" class="type-hint">Kästchen kombinieren. Umschalt wählt einen Bereich.</p><button data-paragraph-all aria-label="Alle Absätze auswählen">Alle</button></div><fieldset data-paragraph-selection class="scope-options" aria-label="Absätze auswählen" aria-describedby="${prefix}-paragraphMultiHint"></fieldset>`)}<section data-line-scope>${picker("line", "Zeilen", "data-lines-count", `<div class="scope-picker-actions"><p class="type-hint">Zeilen der gewählten Absätze.</p><button data-lines-all aria-label="Alle Zeilen auswählen">Alle</button></div><fieldset data-line-selection class="scope-options" aria-label="Zeilen in der Auswahl"></fieldset>`)}</section></section>`;
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
    changedScope = () => {},
  }) {
    const paragraphs = host.querySelector("[data-paragraph-selection]"),
      lines = host.querySelector("[data-line-selection]"),
      input = host.querySelector("[data-lines-leading]");
    let lineRows = [],
      began = false;
    for (const picker of host.querySelectorAll("[data-scope-picker]")) {
      picker.open = !!state.pickers?.[picker.dataset.scopePicker];
      picker.ontoggle = () => {
        state.pickers ??= {};
        state.pickers[picker.dataset.scopePicker] = picker.open;
      };
    }
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
      const shortCount = `${indices.length} von ${values.length}`;
      if (count.textContent !== shortCount) count.textContent = shortCount;
      if (count.getAttribute("aria-label") !== countText)
        count.setAttribute("aria-label", countText);
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
      const lineCount = host.querySelector("[data-lines-count]"),
        lineCountText = `${chosen.size} von ${lineRows.length} ${lineRows.length === 1 ? "Zeile" : "Zeilen"} ausgewählt`;
      const shortLineCount = `${chosen.size} von ${lineRows.length}`;
      if (lineCount.textContent !== shortLineCount)
        lineCount.textContent = shortLineCount;
      if (lineCount.getAttribute("aria-label") !== lineCountText)
        lineCount.setAttribute("aria-label", lineCountText);
      host.querySelector("[data-lines-all]").disabled =
        chosen.size === lineRows.length;
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
      input.placeholder = !chosen.size
        ? "Keine Auswahl"
        : value === null
          ? "Gemischt"
          : "";
      input.disabled = locked || !chosen.size;
      host.querySelector("[data-line-scope]").hidden = !lineRows.length;
      lines.hidden = !lineRows.length;
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
      changedScope();
    });
    host.querySelector("[data-lines-all]").onclick = () => {
      delete state.lineSelection;
      update(selection(paragraphs).map(Number));
      changedScope();
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
    return { update };
  }
  root.MKWParagraphScopeUI = Object.freeze({ markup, mount });
})(globalThis);
