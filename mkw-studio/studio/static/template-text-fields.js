"use strict";
const MKWTemplateTextFields = (() => {
  function markup(object, draft, formats) {
    const id = `template-text-${object.id}`,
      current = MKWTemplateTextModel.value(object, draft);
    return `<div class="template-text-field"><label for="${esc(id)}">Text</label><textarea id="${esc(id)}" data-template-text="${esc(object.id)}" aria-label="Text: ${esc(object.name)}" aria-describedby="${esc(id)}-hint" aria-errormessage="${esc(id)}-error" maxlength="100000" rows="4">${esc(current.text)}</textarea><p id="${esc(id)}-hint" class="template-text-hint">Enter: neuer Absatz · Shift+Enter: neue Zeile im Absatz.</p><div class="template-text-controls"><label>Absatzformat<select data-template-format aria-label="Absatzformat: ${esc(object.name)}" aria-describedby="${esc(id)}-format-hint"><option value="">Format anwenden …</option></select></label><label>Text im Rahmen<select data-template-anchor aria-label="Vertikale Textposition: ${esc(object.name)}">${[
      ["top", "Oben"],
      ["center", "Mitte"],
      ["bottom", "Unten"],
    ]
      .map(
        ([key, label]) =>
          `<option value="${key}" ${current.textAnchor === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label></div><p id="${esc(id)}-format-hint" class="template-text-hint">Das Format gilt für ganze Absätze und ersetzt dort lokale Zeichenformate. Andere Absätze bleiben erhalten.</p><div class="template-text-actions"><span data-template-text-scope role="status" aria-live="polite"></span><button type="button" class="icon-button" data-template-text-undo aria-label="Textänderung rückgängig: ${esc(object.name)}" title="Rückgängig (Cmd/Ctrl+Z)">${studioIcon("undo")}</button><button type="button" class="icon-button" data-template-text-redo aria-label="Textänderung wiederholen: ${esc(object.name)}" title="Wiederholen (Cmd/Ctrl+Shift+Z)">${studioIcon("redo")}</button></div><p id="${esc(id)}-error" class="template-text-error" data-template-text-error role="alert" hidden></p></div>`;
  }
  function attach(host, object, formats, get, set) {
    const input = host.querySelector("[data-template-text]"),
      select = host.querySelector("[data-template-format]"),
      anchor = host.querySelector("[data-template-anchor]"),
      scope = host.querySelector("[data-template-text-scope]"),
      undo = host.querySelector("[data-template-text-undo]"),
      redo = host.querySelector("[data-template-text-redo]"),
      error = host.querySelector("[data-template-text-error]");
    const clone = (value) => structuredClone(value);
    const entry = (value, range) => {
      const item = { value: clone(value), range };
      item.bytes = JSON.stringify(item).length * 2;
      return item;
    };
    let history = [entry(get(), { start: 0, end: 0 })],
      index = 0,
      bytes = history[0].bytes,
      lastTyping = 0,
      beforeRange = null;
    const range = () => ({
      start: input.selectionStart,
      end: input.selectionEnd,
      direction: input.selectionDirection,
    });
    function update() {
      const selected = MKWTemplateTextModel.indices(
        { text: input.value },
        range(),
      );
      const label =
        selected.length === 1
          ? `Absatz ${selected[0] + 1}`
          : `Absätze ${selected[0] + 1}–${selected.at(-1) + 1}`;
      if (scope.textContent !== label) scope.textContent = label;
      undo.disabled = index === 0;
      redo.disabled = index === history.length - 1;
    }
    function valid() {
      error.hidden = true;
      error.textContent = "";
      input.removeAttribute("aria-invalid");
    }
    function showError(e) {
      error.hidden = false;
      error.textContent = `${e.message} Der vorherige Text bleibt erhalten.`;
      input.setAttribute("aria-invalid", "true");
    }
    function remember(next, typing = false) {
      const now = performance.now(),
        item = entry(next, range());
      if (
        typing &&
        index > 0 &&
        index === history.length - 1 &&
        now - lastTyping < 600
      ) {
        bytes -= history[index].bytes;
        history[index] = item;
      } else {
        for (const old of history.splice(index + 1)) bytes -= old.bytes;
        history.push(item);
        index++;
      }
      bytes += item.bytes;
      lastTyping = typing ? now : 0;
      while (
        (history.length > 50 || bytes > 2 * 1024 * 1024) &&
        history.length > 2
      ) {
        bytes -= history.shift().bytes;
        index--;
      }
      set(clone(next));
      valid();
      update();
    }
    function restore(delta) {
      const next = index + delta;
      if (next < 0 || next >= history.length) return;
      index = next;
      const item = history[index],
        scroll = input.scrollTop;
      input.value = item.value.text ?? object.text;
      anchor.value = item.value.textAnchor ?? object.textAnchor ?? "top";
      set(clone(item.value));
      input.focus({ preventScroll: true });
      input.setSelectionRange(
        item.range.start,
        item.range.end,
        item.range.direction,
      );
      input.scrollTop = scroll;
      lastTyping = 0;
      valid();
      update();
    }
    function before() {
      beforeRange = range();
      history[index].range = beforeRange;
    }
    input.addEventListener("beforeinput", (event) => {
      if (
        event.inputType === "historyUndo" ||
        event.inputType === "historyRedo"
      ) {
        event.preventDefault();
        restore(event.inputType === "historyUndo" ? -1 : 1);
      } else before();
    });
    input.addEventListener("input", (event) => {
      try {
        const previous = get().text ?? object.text;
        const replacement =
          beforeRange ||
          (event.data === input.value
            ? { start: 0, end: previous.length }
            : null);
        const next = MKWTemplateTextModel.input(
          object,
          get(),
          input.value,
          replacement,
        );
        remember(next, event.inputType === "insertText" || event.isComposing);
      } catch (e) {
        input.value = get().text ?? object.text;
        showError(e);
      } finally {
        beforeRange = null;
      }
    });
    host.addEventListener("keydown", (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        ["z", "y"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        event.stopPropagation();
        restore(event.shiftKey || event.key.toLowerCase() === "y" ? 1 : -1);
      } else if (
        event.target === input &&
        event.key === "Enter" &&
        event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        before();
        input.setRangeText(
          "\u2028",
          input.selectionStart,
          input.selectionEnd,
          "end",
        );
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertLineBreak",
            data: "\u2028",
          }),
        );
      }
    });
    for (const name of ["select", "click", "keyup", "focus"])
      input.addEventListener(name, update);
    function loadFormats() {
      if (select.options.length > 1) return;
      const fragment = document.createDocumentFragment();
      for (const format of formats)
        fragment.append(new Option(format.name, format.id));
      select.append(fragment);
    }
    select.addEventListener("focus", loadFormats);
    select.addEventListener("pointerdown", loadFormats);
    select.addEventListener("blur", () => {
      while (select.options.length > 1) select.remove(1);
    });
    select.addEventListener("change", () => {
      const format = formats.find((f) => f.id === select.value);
      if (!format) return;
      try {
        const selection = range(),
          scroll = input.scrollTop;
        before();
        remember(MKWTemplateTextModel.apply(object, get(), format, selection));
        input.focus({ preventScroll: true });
        input.setSelectionRange(
          selection.start,
          selection.end,
          selection.direction,
        );
        input.scrollTop = scroll;
        scope.textContent += " · Format angewendet";
      } catch (e) {
        showError(e);
      }
      select.value = "";
    });
    anchor.addEventListener("change", () => {
      before();
      remember({ ...get(), textAnchor: anchor.value });
    });
    undo.addEventListener("click", () => restore(-1));
    redo.addEventListener("click", () => restore(1));
    update();
  }
  return { markup, attach };
})();
