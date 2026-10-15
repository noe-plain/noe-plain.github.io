"use strict";
// Carousel text: see ARCHITECTURE.md for ownership and load order.
function carouselTextLayout(o, ctx = makeCanvas(1, 1).getContext("2d")) {
  const lines = [];
  let y = 0,
    offset = 0;
  for (const [paragraph, text] of o.text.split("\n").entries()) {
    const style = o.textStyles?.[paragraph],
      size = style?.size ?? o.size;
    ctx.font = `${size}px "${o.font}"`;
    const wrapped = carouselWrapText(
      text,
      o.w,
      (t) => ctx.measureText(t).width,
    );
    wrapped.forEach((part, index) => {
      const leading = style?.leading?.[index] ?? size * (o.lineHeight ?? 0.95);
      lines.push({
        text: part.raw.trimEnd(),
        raw: part.raw,
        start: offset + part.start,
        end: offset + part.end,
        paragraph,
        index,
        size,
        leading,
        y,
      });
      y += leading;
    });
    offset += text.length + 1;
  }
  return {
    lines,
    height: Math.max(0, ...lines.map((line) => line.y + line.size * 1.12)),
  };
}

function carouselTextHeight(o) {
  return carouselTextLayout(o).height;
}

function carouselTextOffset(o, layout = carouselTextLayout(o)) {
  return o.textAnchor === "bottom" ? o.h - layout.height : 0;
}

function carouselPositionText(el, o) {
  const layout = carouselTextLayout(o);
  Object.assign(el.style, {
    left: o.x * carouselZoom + "px",
    top: (o.y + carouselTextOffset(o, layout)) * carouselZoom + "px",
    width: o.w * carouselZoom + "px",
    height: layout.height * carouselZoom + "px",
    fontFamily: fontFamily(o.font),
    fontSize: o.size * carouselZoom + "px",
    lineHeight: "1.12",
    color: studioPaintRGBA(o.color, o.textAlpha ?? 1),
  });
  el.querySelectorAll("[data-text-size]").forEach((line) => {
    line.style.fontSize = line.dataset.textSize * carouselZoom + "px";
    line.style.lineHeight = line.dataset.textSize * 1.12 * carouselZoom + "px";
    line.style.height = line.dataset.textHeight * carouselZoom + "px";
  });
}

function carouselEditText(o) {
  if (o.locked) return;
  carouselEndText();
  carouselUI.ids = new Set([o.id]);
  carouselSelection = o.id;
  checkpoint();
  const el = document.createElement("div");
  el.className = "carousel-inline-text";
  el.contentEditable = "true";
  el.setAttribute("role", "textbox");
  el.setAttribute("aria-multiline", "true");
  el.setAttribute("aria-label", "Text direkt bearbeiten");
  el.spellcheck = false;
  const edit = { id: o.id, el, undo: [], redo: [], composing: false };
  carouselUI.editing = edit;
  $("#carouselEditingOverlay").append(el);
  carouselFormatEditable(el, o);
  carouselPositionText(el, o);
  const apply = (value, caret, styles, remember = true) => {
    const nextStyles = styles ?? carouselTextStylesForInput(o, value);
    if (remember && value !== o.text) {
      edit.undo.push({
        text: o.text,
        styles: clone(o.textStyles || []),
        caret: Math.min(caret, o.text.length),
      });
      if (edit.undo.length > 100) edit.undo.shift();
      edit.redo = [];
    }
    o.text = value;
    o.textStyles = nextStyles;
    carouselFormatEditable(el, o);
    carouselEditableCaret(el, caret);
    changed(false);
    const sidebar = $("#carouselProperties [data-prop=text]");
    if (sidebar) sidebar.value = o.text;
    carouselUpdateWarning(o);
    carouselTrackTextCaret(o, el);
    carouselRefreshTextStyles(o);
  };
  el.oninput = (ev) => {
    if (ev.isComposing || edit.composing) return;
    const caret = carouselEditableSelection(el).end;
    apply(carouselEditableValue(el), caret);
  };
  el.oncompositionstart = () => (edit.composing = true);
  el.oncompositionend = () => {
    edit.composing = false;
    apply(carouselEditableValue(el), carouselEditableSelection(el).end);
  };
  el.onbeforeinput = (ev) => {
    if (ev.isComposing || edit.composing) return;
    const { start, end } = carouselEditableSelection(el);
    let a = start,
      b = end,
      insert = "";
    if (["insertParagraph", "insertLineBreak"].includes(ev.inputType))
      insert = "\n";
    else if (ev.inputType === "deleteContentBackward") {
      if (a === b && a > 0) a -= Array.from(o.text.slice(0, a)).at(-1).length;
    } else if (ev.inputType === "deleteContentForward") {
      if (a === b && b < o.text.length)
        b += Array.from(o.text.slice(b))[0].length;
    } else return;
    ev.preventDefault();
    apply(
      o.text.slice(0, a) + insert + o.text.slice(b),
      a + insert.length,
      carouselReplaceTextStyles(o, a, b, insert),
    );
  };
  el.onpaste = (ev) => {
    ev.preventDefault();
    const text = ev.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"),
      { start, end } = carouselEditableSelection(el);
    apply(
      o.text.slice(0, start) + text + o.text.slice(end),
      start + text.length,
      carouselReplaceTextStyles(o, start, end, text),
    );
  };
  el.oncopy = el.oncut = (ev) => {
    const { start, end } = carouselEditableSelection(el);
    if (start === end) return;
    ev.preventDefault();
    ev.clipboardData.setData("text/plain", o.text.slice(start, end));
    if (ev.type === "cut")
      apply(
        o.text.slice(0, start) + o.text.slice(end),
        start,
        carouselReplaceTextStyles(o, start, end, ""),
      );
  };
  el.onmouseup = el.onkeyup = () => carouselTrackTextCaret(o, el);
  el.onkeydown = (ev) => {
    const key = ev.key.toLowerCase();
    if ((ev.metaKey || ev.ctrlKey) && key === "z") {
      ev.preventDefault();
      const from = ev.shiftKey ? edit.redo : edit.undo,
        to = ev.shiftKey ? edit.undo : edit.redo;
      if (from.length) {
        const value = from.pop();
        to.push({
          text: o.text,
          styles: clone(o.textStyles || []),
          caret: carouselEditableSelection(el).end,
        });
        apply(value.text, value.caret, value.styles, false);
      }
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      carouselEndText();
      $("#carouselViewport").focus();
    }
  };
  el.onblur = (event) =>
    carouselEndText(!!event.relatedTarget?.closest("#carouselProperties"));
  carouselPanel();
  carouselRefresh();
  el.focus();
  carouselEditableCaret(el, o.text.length);
}

function carouselEndText(preservePanel = false) {
  const edit = carouselUI.editing;
  if (!edit) return;
  carouselUI.editing = null;
  edit.el.onblur = null;
  edit.el.remove();
  if (carouselActive() && $("#carouselProperties")) {
    if (!preservePanel) carouselPanel();
    carouselRefresh();
  }
}

function carouselTextContentPanel(o) {
  return `<section class="carousel-property-section type-content"><div class="type-section-heading"><h4>Text</h4><button id="carouselTextEdit" title="Text direkt auf der Zeichenfläche bearbeiten">${studioIcon("text")}<span>Auf der Fläche</span></button></div><label class="type-content-label">Textinhalt<textarea data-prop="text" aria-label="Carousel-Text eingeben" placeholder="Dein Text …" rows="3">${esc(o.text)}</textarea></label><p class="type-hint">Enter beginnt einen neuen Absatz.</p></section>`;
}

function carouselTextFontPanel(o) {
  return `<section class="carousel-property-section type-font"><h4>Schrift</h4><label>Schriftfamilie<select data-prop="font">${studioFontOptions(o.font, false)}</select></label><div class="type-basics"><label>Grundgrösse<span class="type-unit"><input data-prop="size" type="number" aria-label="Grundgrösse des Textes" value="${o.size}" min="1" max="1000" step="any"><span>px</span></span></label></div>${studioPaintCards(o)}<p class="type-hint">Grundgrösse für Absätze ohne eigene Grösse.</p></section>`;
}

function carouselTextStylePanel(o) {
  const paragraphs = o.text.split("\n");
  carouselUI.textParagraph = Math.max(
    0,
    Math.min(paragraphs.length - 1, carouselUI.textParagraph),
  );
  const paragraph = carouselUI.textParagraph,
    lines = carouselTextLayout(o).lines.filter(
      (line) => line.paragraph === paragraph,
    );
  carouselUI.textLine = Math.max(
    0,
    Math.min(lines.length - 1, carouselUI.textLine),
  );
  const line = lines[carouselUI.textLine],
    style = o.textStyles?.[paragraph],
    custom = style?.size !== undefined,
    auto = style?.leading?.[carouselUI.textLine] == null;
  const label = (text) => text.trim().slice(0, 60) || "Leerer Absatz",
    round = (value) => Math.round(value * 100) / 100;
  const stepper = (id, value, min, max, name) =>
    `<div class="type-stepper"><button data-type-target="${id}" data-type-step="-1" aria-label="${name} verkleinern">${studioIcon("minus")}</button><span class="type-unit"><input id="${id}" type="number" aria-label="${name}" min="${min}" max="${max}" step="any" value="${round(value)}"><span>px</span></span><button data-type-target="${id}" data-type-step="1" aria-label="${name} vergrössern">${studioIcon("plus")}</button></div>`;
  return `<section id="carouselTextStyles" class="carousel-property-section"><h4>Absätze & Abstände</h4><div class="type-paragraphs" role="group" aria-label="Absatz auswählen">${paragraphs.map((text, i) => `<button data-paragraph="${i}" aria-pressed="${i === paragraph}" title="Absatz ${i + 1}: ${esc(text || "Leer")}"><span class="type-paragraph-number">${i + 1}</span><span class="type-paragraph-preview">${esc(label(text))}</span><span class="type-paragraph-size">${round(o.textStyles?.[i]?.size ?? o.size)} px</span></button>`).join("")}</div><p class="type-context" id="carouselTypographyContext">Absatz ${paragraph + 1} von ${paragraphs.length} ausgewählt</p><div class="type-control-heading"><label for="carouselParagraphSize">Schriftgrösse</label><button id="carouselParagraphReset" title="Grundgrösse (${o.size} px) übernehmen" ${!custom ? "disabled" : ""}>Grundgrösse</button></div>${stepper("carouselParagraphSize", style?.size ?? o.size, 1, 1000, "Schriftgrösse des Absatzes")}<label class="type-line-picker" ${lines.length === 1 ? "hidden" : ""}>Zeile im Absatz<select id="carouselTextLine">${options(
    lines.map((line, i) => [String(i), `${i + 1} · ${label(line.text)}`]),
    String(carouselUI.textLine),
  )}</select></label><div class="type-control-heading type-leading-heading"><label for="carouselLineLeading">Zeilenabstand</label><button id="carouselLeadingReset" aria-pressed="${auto}" title="Automatisch: Schriftgrösse × ${o.lineHeight ?? 0.95}">Automatisch</button></div>${stepper("carouselLineLeading", line.leading, 1, 3000, "Zeilenabstand")}<p class="type-hint" id="carouselLeadingHint">${auto ? "Automatisch:" : "Eigener Abstand für Zeile " + (carouselUI.textLine + 1) + ". Auto:"} ${round(line.size * (o.lineHeight ?? 0.95))} px · ${Math.round((o.lineHeight ?? 0.95) * 100)} %</p></section>`;
}

function carouselTextStyleValues(o) {
  const lines = carouselTextLayout(o).lines.filter(
    (line) => line.paragraph === carouselUI.textParagraph,
  );
  carouselUI.textLine = Math.min(carouselUI.textLine, lines.length - 1);
  const line = lines[carouselUI.textLine],
    style = o.textStyles?.[carouselUI.textParagraph],
    auto = style?.leading?.[carouselUI.textLine] == null;
  $("#carouselTextLine").innerHTML = options(
    lines.map((line, i) => [
      String(i),
      `${i + 1} · ${line.text.trim().slice(0, 60) || "Leere Zeile"}`,
    ]),
    String(carouselUI.textLine),
  );
  $("#carouselTextLine").closest("label").hidden = lines.length === 1;
  $("#carouselLineLeading").value = Math.round(line.leading * 100) / 100;
  $("#carouselParagraphReset").disabled =
    !!o.locked || style?.size === undefined;
  $("#carouselLeadingReset").setAttribute("aria-pressed", String(auto));
  $("#carouselLeadingHint").textContent =
    `${auto ? "Automatisch:" : "Eigener Abstand für Zeile " + (carouselUI.textLine + 1) + ". Auto:"} ${Math.round(line.size * (o.lineHeight ?? 0.95) * 100) / 100} px · ${Math.round((o.lineHeight ?? 0.95) * 100)} %`;
  document
    .querySelectorAll("#carouselTextStyles [data-paragraph]")
    .forEach(
      (button) =>
        (button.querySelector(".type-paragraph-size").textContent =
          Math.round(
            (o.textStyles?.[+button.dataset.paragraph]?.size ?? o.size) * 100,
          ) /
            100 +
          " px"),
    );
}

function carouselBindTextStyles(o, panel) {
  const section = panel.querySelector("#carouselTextStyles");
  if (!section) return;
  const list = section.querySelector(".type-paragraphs"),
    active = list.querySelector("[aria-pressed=true]"),
    bounds = list.getBoundingClientRect(),
    chosen = active.getBoundingClientRect();
  if (chosen.bottom > bounds.bottom)
    list.scrollTop += chosen.bottom - bounds.bottom;
  if (chosen.top < bounds.top) list.scrollTop -= bounds.top - chosen.top;
  for (const id of [
    "carouselTextLine",
    "carouselParagraphSize",
    "carouselLineLeading",
  ])
    $("#" + id).disabled = !!o.locked;
  section.querySelectorAll("[data-paragraph]").forEach((button) => {
    button.disabled = !!o.locked;
    button.onclick = () => {
      carouselUI.textParagraph = +button.dataset.paragraph;
      carouselUI.textLine = 0;
      carouselRefreshTextStyles(o);
    };
  });
  $("#carouselTextLine").onchange = (ev) => {
    carouselUI.textLine = +ev.target.value;
    carouselRefreshTextStyles(o);
  };
  const edit = (input, key) => {
    input.onfocus = () => (carouselUI.propertyUndo = false);
    input.oninput = () => {
      if (o.locked) return;
      const value = +input.value;
      if (!Number.isFinite(value) || value < +input.min || value > +input.max)
        return;
      if (!carouselUI.propertyUndo) {
        checkpoint();
        carouselUI.propertyUndo = true;
      }
      o.textStyles ??= [];
      const style = (o.textStyles[carouselUI.textParagraph] ??= {});
      if (key === "size") style.size = value;
      else {
        style.leading ??= [];
        style.leading[carouselUI.textLine] = value;
      }
      changed(false);
      carouselUpdateWarning(o);
      carouselTextStyleValues(o);
    };
  };
  edit($("#carouselParagraphSize"), "size");
  edit($("#carouselLineLeading"), "leading");
  section.querySelectorAll("[data-type-step]").forEach(
    (button) =>
      (button.onclick = () => {
        if (o.locked) return;
        const input = $("#" + button.dataset.typeTarget),
          next = Math.max(
            +input.min,
            Math.min(+input.max, +input.value + +button.dataset.typeStep),
          );
        if (next === +input.value) return;
        input.value = next;
        carouselUI.propertyUndo = false;
        input.oninput();
      }),
  );
  const reset = (key) => {
    if (o.locked) return;
    checkpoint();
    const style = o.textStyles?.[carouselUI.textParagraph];
    if (style) {
      if (key === "size") delete style.size;
      else if (style.leading) style.leading[carouselUI.textLine] = null;
    }
    changed(false);
    carouselRefreshTextStyles(o);
    carouselUpdateWarning(o);
  };
  $("#carouselParagraphReset").onclick = () => reset("size");
  $("#carouselLeadingReset").onclick = () => reset("leading");
  if (o.locked)
    section
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = true));
}

function carouselWrapText(text, width, measure) {
  if (!text.length) return [{ raw: "", start: 0, end: 0 }];
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = start,
      fit = start,
      space = -1;
    for (const char of Array.from(text.slice(start))) {
      end += char.length;
      if (fit > start && measure(text.slice(start, end).trimEnd()) > width)
        break;
      fit = end;
      if (/\s/u.test(char)) space = end;
    }
    const stop = fit < text.length && space > start ? space : fit;
    parts.push({ raw: text.slice(start, stop), start, end: stop });
    start = stop;
  }
  return parts;
}

function carouselFormatEditable(el, o) {
  const layout = carouselTextLayout(o),
    paragraphs = o.text.split("\n");
  el.innerHTML = paragraphs
    .map(
      (_, paragraph) =>
        `<div data-text-paragraph="${paragraph}">${layout.lines
          .filter((line) => line.paragraph === paragraph)
          .map(
            (line) =>
              `<span class="carousel-text-line" data-text-start="${line.start}" data-text-end="${line.end}" data-text-size="${line.size}" data-text-height="${line === layout.lines.at(-1) ? line.size * 1.12 : line.leading}">${line.raw ? esc(line.raw) : '<br data-placeholder="true">'}</span>`,
          )
          .join("")}</div>`,
    )
    .join("");
  carouselPositionText(el, o);
}

function carouselEditableValue(root) {
  if (root.nodeType === Node.TEXT_NODE) return root.textContent;
  if (root.nodeName === "BR")
    return root.hasAttribute("data-placeholder") ? "" : "\n";
  return [...root.childNodes]
    .map(
      (child, i) =>
        (i && ["DIV", "P"].includes(child.nodeName) ? "\n" : "") +
        carouselEditableValue(child),
    )
    .join("");
}

function carouselEditableSelection(el) {
  const selection = window.getSelection();
  if (
    !selection.rangeCount ||
    !el.contains(selection.anchorNode) ||
    !el.contains(selection.focusNode)
  ) {
    const end = carouselEditableValue(el).length;
    return { start: end, end };
  }
  const range = selection.getRangeAt(0),
    offset = (node, pos) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(el);
      prefix.setEnd(node, pos);
      return carouselEditableValue(prefix.cloneContents()).length;
    };
  return {
    start: offset(range.startContainer, range.startOffset),
    end: offset(range.endContainer, range.endOffset),
  };
}

function carouselEditableCaret(el, offset) {
  const lines = [...el.querySelectorAll("[data-text-start]")],
    line =
      lines.find(
        (line) =>
          +line.dataset.textStart <= offset && offset <= +line.dataset.textEnd,
      ) || lines.at(-1);
  if (!line) return;
  const range = document.createRange();
  if (line.firstChild?.nodeType === Node.TEXT_NODE)
    range.setStart(
      line.firstChild,
      Math.max(
        0,
        Math.min(line.firstChild.length, offset - line.dataset.textStart),
      ),
    );
  else range.setStart(line, 0);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function carouselReplaceTextStyles(o, start, end, text) {
  const styles = clone(o.textStyles || []);
  while (styles.length < o.text.split("\n").length) styles.push(null);
  const paragraph = o.text.slice(0, start).split("\n").length - 1,
    removed = o.text.slice(start, end).split("\n").length - 1,
    inserted = text.split("\n").length - 1;
  if (removed) styles.splice(paragraph + 1, removed);
  if (inserted)
    styles.splice(
      paragraph + 1,
      0,
      ...Array.from({ length: inserted }, () =>
        styles[paragraph]?.size !== undefined
          ? { size: styles[paragraph].size }
          : null,
      ),
    );
  return styles;
}

function carouselTextStylesForInput(o, value) {
  let start = 0;
  while (
    start < o.text.length &&
    start < value.length &&
    o.text[start] === value[start]
  )
    start++;
  let end = o.text.length,
    next = value.length;
  while (end > start && next > start && o.text[end - 1] === value[next - 1]) {
    end--;
    next--;
  }
  return carouselReplaceTextStyles(o, start, end, value.slice(start, next));
}

function carouselRefreshTextStyles(o) {
  const section = $("#carouselTextStyles");
  if (!section) return;
  const panel = $("#carouselProperties"),
    scroll = panel.scrollTop;
  section.outerHTML = carouselTextStylePanel(o);
  carouselBindTextStyles(o, panel);
  panel.scrollTop = scroll;
}

function carouselSetTextContext(o, offset) {
  offset = Math.max(0, Math.min(o.text.length, offset ?? 0));
  const paragraph = o.text.slice(0, offset).split("\n").length - 1,
    lines = carouselTextLayout(o).lines.filter(
      (line) => line.paragraph === paragraph,
    ),
    index = Math.max(
      0,
      lines.findLastIndex((line) => line.start <= offset),
    );
  if (carouselUI.textParagraph === paragraph && carouselUI.textLine === index)
    return false;
  carouselUI.textParagraph = paragraph;
  carouselUI.textLine = index;
  return true;
}

function carouselTrackTextCaret(o, el) {
  if (carouselSetTextContext(o, carouselEditableSelection(el).start))
    carouselRefreshTextStyles(o);
}
