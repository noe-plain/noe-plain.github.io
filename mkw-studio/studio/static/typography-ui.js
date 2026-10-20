"use strict";
const MKWTypography = (() => {
  const sessions = new WeakMap();
  let current = null;
  const session = (o) => {
    if (!sessions.has(o)) sessions.set(o, {});
    return sessions.get(o);
  };
  const record = (o) => ({
    ...o,
    font: o.font || o.role,
    textAlign: o.textAlign || o.align || "left",
  });
  function track(o, start, end) {
    const s = session(o);
    if (s.range?.start !== start || s.range?.end !== end) delete s.pending;
    s.range = {
      start: Math.max(0, Math.min(o.text.length, start)),
      end: Math.max(0, Math.min(o.text.length, end)),
    };
    if (current?.o === o) sync();
  }
  function range(o) {
    return session(o).range;
  }
  function pending(o) {
    return session(o).pending;
  }
  function clear(o) {
    sessions.delete(o);
    if (current?.o === o) sync();
  }
  function scope(o) {
    const r = range(o);
    return !r
      ? "Gesamter Text"
      : r.end > r.start
        ? `${r.end - r.start} Zeichen markiert`
        : "Neue Zeichen";
  }
  function panel() {
    const field = (key, label, unit, min, max, step = "any") =>
      `<label>${label}<span class="type-unit"><input data-typo="${key}" aria-label="${label}" type="number" min="${min}" max="${max}" step="${step}"><span>${unit}</span></span></label>`;
    return `<section class="carousel-property-section typography-inspector"><div class="typo-scope"><span data-typo-scope role="status"></span><button data-typo-all>Gesamter Text</button></div><div class="typo-tabs" role="tablist" aria-label="Text gestalten"><button role="tab" id="typo-tab-character" aria-controls="typo-character" data-typo-tab="character">Zeichen</button><button role="tab" id="typo-tab-paragraph" aria-controls="typo-paragraph" data-typo-tab="paragraph">Absatz</button></div><div id="typo-character" role="tabpanel" aria-labelledby="typo-tab-character" data-typo-page="character"><label>Schriftfamilie<select data-typo="font" aria-label="Schriftfamilie"></select></label><div class="typo-grid">${field("size", "Schriftgrösse", "px", 1, 5000)}${field("tracking", "Laufweite", "‰", -500, 2000)}</div><div class="typo-format" role="group" aria-label="Zeichenformatierung">${[
      ["uppercase", "AA", "Grossbuchstaben"],
      ["underline", "U", "Unterstrichen"],
      ["strike", "S", "Durchgestrichen"],
      ["superscript", "x²", "Hochgestellt"],
      ["subscript", "x₂", "Tiefgestellt"],
    ]
      .map(
        ([key, text, label]) =>
          `<button data-typo-toggle="${key}" title="${label}" aria-label="${label}" aria-pressed="false"><span class="typo-symbol typo-${key}">${text}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="typo-colour-row"><span>Textfarbe</span><button data-typo-colour aria-label="Textfarbe wählen"><i></i><span data-typo-colour-label></span></button></div><details class="typo-details"><summary>Weitere Zeichenoptionen</summary>${field("baselineShift", "Grundlinienversatz", "px", -5000, 5000)}<button data-typo-reset>Zeichenformatierung zurücksetzen</button></details></div><div id="typo-paragraph" role="tabpanel" aria-labelledby="typo-tab-paragraph" data-typo-page="paragraph" hidden><p class="typo-paragraph-scope" data-typo-paragraph-scope></p>${carouselTextAlignButtons("left", "data-typo-align", "Absatzausrichtung")}${carouselJustificationHint(true, "data-typo-hyphenate")}<div class="typo-grid">${field("paragraphSize", "Schriftgrösse des Absatzes", "px", 1, 5000)}${field("lineHeight", "Zeilenabstand", "%", 20, 500)}<button data-typo-size-auto>Grundgrösse</button><button data-typo-leading-auto>Automatisch · 95 %</button>${field("spaceBefore", "Abstand davor", "px", 0, 5000)}${field("spaceAfter", "Abstand danach", "px", 0, 5000)}</div><div data-typo-extra></div></div></section>`;
  }
  function values(key) {
    const { o } = current,
      base = record(o),
      r = range(o),
      attrs = session(o).pending;
    const runs =
      r && r.end > r.start
        ? MKWText.segments(o, r.start, r.end)
        : MKWText.segments(o);
    if (r && r.start === r.end)
      return [
        attrs?.[key] ??
          MKWText.at(o, Math.max(0, r.start - 1))[key] ??
          base[key] ??
          defaults(key),
      ];
    return (runs.length ? runs : [{}]).map(
      (run) =>
        run[key] ??
        (key === "size"
          ? o.textStyles?.[
              o.text.slice(0, run.start || 0).split("\n").length - 1
            ]?.size
          : undefined) ??
        base[key] ??
        defaults(key),
    );
  }
  function defaults(key) {
    return key === "script"
      ? "normal"
      : key === "uppercase" || key === "underline" || key === "strike"
        ? false
        : 0;
  }
  function common(list) {
    return list.every((v) => v === list[0]) ? list[0] : null;
  }
  function paragraphIndices() {
    const { o } = current,
      r = range(o);
    return r
      ? MKWText.paragraphs(o.text, r.start, r.end)
      : o.text.split("\n").map((_, i) => i);
  }
  function sync() {
    if (!current?.host.isConnected) return;
    const { o, host, locked, family, copyright } = current,
      s = session(o),
      base = record(o),
      r = range(o),
      indices = paragraphIndices();
    host.querySelector("[data-typo-scope]").textContent = scope(o);
    host.querySelector("[data-typo-all]").disabled = !r;
    host.querySelector("[data-typo-paragraph-scope]").textContent =
      indices.length === 1
        ? `Absatz ${indices[0] + 1}`
        : `${indices.length} Absätze`;
    host.querySelectorAll("[data-typo]").forEach((input) => {
      const key = input.dataset.typo,
        para = [
          "paragraphSize",
          "lineHeight",
          "spaceBefore",
          "spaceAfter",
        ].includes(key),
        list = para
          ? indices.map(
              (i) =>
                o.textStyles?.[i]?.[key === "paragraphSize" ? "size" : key] ??
                (key === "paragraphSize"
                  ? o.size
                  : key === "lineHeight"
                    ? (o.lineHeight ?? (current.post ? 1 : 0.95))
                    : 0),
            )
          : values(key);
      let value = common(list);
      if (key === "lineHeight" && value !== null) value *= 100;
      if (key === "font") {
        input.innerHTML =
          (value === null ? '<option value="">Gemischt</option>' : "") +
          studioFontOptions(value || base.font);
      }
      if (document.activeElement !== input)
        input.value =
          value === null
            ? ""
            : typeof value === "number"
              ? Math.round(value * 100) / 100
              : value;
      input.placeholder = value === null ? "Gemischt" : "";
      input.disabled = locked;
    });
    host.querySelectorAll("[data-typo-toggle]").forEach((button) => {
      const key = button.dataset.typoToggle,
        script = ["superscript", "subscript"].includes(key),
        value = common(values(script ? "script" : key));
      button.setAttribute(
        "aria-pressed",
        value === null ? "mixed" : String(script ? value === key : !!value),
      );
      button.disabled = locked;
    });
    const colour = common(values("color")),
      colourButton = host.querySelector("[data-typo-colour]");
    colourButton.disabled = locked || (family && !copyright);
    colourButton.querySelector("i").style.background =
      colour || "linear-gradient(135deg,#111 50%,#fff 50%)";
    host.querySelector("[data-typo-colour-label]").textContent = family
      ? copyright
        ? "Schwarz / Weiss"
        : "Familienpalette"
      : colour || "Gemischt";
    const align = common(
      indices.map((i) => o.textStyles?.[i]?.align || base.textAlign),
    );
    host.querySelector(".justification-settings").hidden = align !== "justify";
    const hyphen = host.querySelector("[data-typo-hyphenate]"),
      hyphenValue = common(
        indices.map(
          (i) => (o.textStyles?.[i]?.hyphenate ?? o.hyphenate) !== false,
        ),
      );
    hyphen.checked = hyphenValue !== false;
    hyphen.indeterminate = hyphenValue === null;
    hyphen.disabled = locked || copyright;

    host.querySelector("[data-typo-size-auto]").disabled =
      locked || !indices.some((i) => o.textStyles?.[i]?.size !== undefined);
    host.querySelectorAll("[data-typo-align]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.typoAlign === align));
      b.disabled = locked || copyright;
    });
    for (const button of host.querySelectorAll(
      "[data-typo-reset], [data-typo-leading-auto]",
    ))
      button.disabled = locked;
    const tab = s.tab || "character";
    host.querySelectorAll("[data-typo-tab]").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.typoTab === tab));
      b.tabIndex = b.dataset.typoTab === tab ? 0 : -1;
    });
    host
      .querySelectorAll("[data-typo-page]")
      .forEach((p) => (p.hidden = p.dataset.typoPage !== tab));
  }
  function remember() {
    const { o } = current;
    checkpoint();
    const edit = carouselUI.editing;
    if (!current.post && edit?.id === o.id) {
      edit.undo.push({
        text: o.text,
        styles: clone(o.textStyles || []),
        characters: clone(o.characterStyles || []),
        caret: range(o)?.end || 0,
      });
      if (edit.undo.length > 100) edit.undo.shift();
      edit.redo = [];
    }
  }
  function character(values, checkpointed = false) {
    if (!current || current.locked) return;
    const { o } = current,
      s = session(o),
      r = range(o);
    if (r && r.start === r.end && o.text.length) {
      s.pending = { ...s.pending };
      for (const [key, value] of Object.entries(values))
        if (value === null) delete s.pending[key];
        else s.pending[key] = value;
      sync();
      return;
    }
    if (!checkpointed) remember();
    if (current.post) o.typographyVersion = 1;
    MKWText.changeCharacters(o, r, values, current.post ? "role" : "font");
    current.commit({ kind: "character", range: r, values });
    sync();
  }
  function paragraph(values) {
    if (!current || current.locked) return;
    remember();
    const { o } = current;
    if (current.post) o.typographyVersion = 1;
    const indices = paragraphIndices();
    MKWText.changeParagraphs(o, indices, values);
    current.commit({ kind: "paragraph", indices, values });
    sync();
  }
  function bind(host, options) {
    current = { ...options, host };
    host.querySelector("[data-typo=size]").max = options.post ? 5000 : 1000;
    host.querySelector("[data-typo=paragraphSize]").max = options.post
      ? 5000
      : 1000;
    host.querySelectorAll("[data-typo-tab]").forEach((button) => {
      button.onclick = () => {
        session(current.o).tab = button.dataset.typoTab;
        sync();
      };
      button.onkeydown = (ev) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key))
          return;
        ev.preventDefault();
        session(current.o).tab =
          ev.key === "Home"
            ? "character"
            : ev.key === "End"
              ? "paragraph"
              : session(current.o).tab === "paragraph"
                ? "character"
                : "paragraph";
        sync();
        host.querySelector('[aria-selected="true"]').focus();
      };
    });
    host.querySelector("[data-typo-all]").onclick = () => {
      delete session(current.o).range;
      delete session(current.o).pending;
      sync();
    };
    host.querySelectorAll("[data-typo]").forEach((input) => {
      let began = false;
      input.onfocus = () => (began = false);
      input.oninput = () => {
        const key = input.dataset.typo,
          numeric = input.type === "number";
        let value = numeric ? Number(input.value) : input.value;
        if (
          !input.value ||
          (numeric &&
            (!Number.isFinite(value) ||
              value < +input.min ||
              value > +input.max))
        )
          return;
        if (
          ["paragraphSize", "lineHeight", "spaceBefore", "spaceAfter"].includes(
            key,
          )
        ) {
          paragraph({
            [key === "paragraphSize" ? "size" : key]:
              key === "lineHeight" ? value / 100 : value,
          });
          return;
        }
        if (!began) {
          remember();
          began = true;
        }
        character({ [key]: value }, true);
      };
    });
    host.querySelectorAll("[data-typo-toggle]").forEach(
      (button) =>
        (button.onclick = () => {
          const key = button.dataset.typoToggle,
            script = ["superscript", "subscript"].includes(key),
            v = common(values(script ? "script" : key));
          character({
            [script ? "script" : key]: script
              ? v === key
                ? "normal"
                : key
              : !v,
          });
        }),
    );
    host
      .querySelectorAll("[data-typo-align]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            paragraph({ align: button.dataset.typoAlign })),
      );
    host.querySelector("[data-typo-hyphenate]").onchange = (ev) => {
      paragraph({ hyphenate: ev.target.checked });
      if (ev.target.checked)
        MKWTextHyphen.ensure(true).catch((error) =>
          MKWProjects.notice(error.message),
        );
    };
    host.querySelector("[data-typo-size-auto]").onclick = () =>
      paragraph({ size: undefined });
    host.querySelector("[data-typo-leading-auto]").onclick = () =>
      paragraph({ lineHeight: 0.95 });
    host.querySelector("[data-typo-reset]").onclick = () =>
      character(
        Object.fromEntries(
          MKWText.keys.map((k) => [
            k,
            k === "script"
              ? "normal"
              : ["uppercase", "underline", "strike"].includes(k)
                ? false
                : ["tracking", "baselineShift"].includes(k)
                  ? 0
                  : null,
          ]),
        ),
      );
    host.querySelector("[data-typo-colour]").onclick = (ev) => {
      const owner = current,
        o = current.o;
      studioOpenColourPicker({
        anchor: ev.currentTarget,
        colour: common(values("color")) || o.color,
        label: "Textfarbe",
        onBegin: remember,
        isCurrent: () => current === owner && host.isConnected,
        onChange: (value) =>
          character(
            {
              color:
                owner.family && owner.copyright
                  ? MKWFamily.copyrightColor(value)
                  : value,
            },
            true,
          ),
      });
    };
    sync();
  }
  function carousel(o, panel) {
    const host = panel.querySelector(".typography-inspector");
    if (!host) return;
    host.querySelector("[data-typo-extra]").innerHTML =
      `<details class="typo-details"><summary>Einzelne Absätze & Zeilen</summary>${carouselTextStylePanel(o)}</details>`;
    host
      .querySelector("[data-typo-page=character]")
      .insertAdjacentHTML(
        "beforeend",
        `<details class="typo-details"><summary>Textfeldfarbe & Deckkraft</summary>${studioPaintCards(o)}</details>`,
      );
    studioBindPaintCards(host, o);
    carouselBindTextStyles(o, panel);
    bind(host, {
      o,
      locked: carouselObjectLocked(o),
      commit: () => {
        changed(false);
        carouselUpdateWarning(o);
        if (carouselUI.editing?.id === o.id) {
          const r = range(o);
          carouselFormatEditable(carouselUI.editing.el, o);
          if (r && document.activeElement === carouselUI.editing.el)
            restoreSelection(carouselUI.editing.el, r);
        }
      },
    });
  }
  function post(b, key, panel) {
    const o = b.elements[key];
    panel.innerHTML = `<section class="tool-section typo-content"><h3>Text</h3><select data-post-text-layer aria-label="Text auswählen">${options(
      Object.entries(elementNames).filter(([k]) => k !== "logo"),
      key,
    )}</select><label>Textinhalt<textarea data-post-text rows="3" aria-label="${elementNames[key]} eingeben">${esc(o.text)}</textarea></label><label class="typo-visible"><input type="checkbox" data-post-text-visible ${o.visible ? "checked" : ""}>Auf dem Bild anzeigen</label>${p.textOverrides?.[b.imageId]?.[key] ? `<button data-post-text-reset>Text vom ersten Bild übernehmen</button>` : ""}<button data-post-text-edit>Auf der Fläche bearbeiten</button></section>${panelHTML()}`;
    panel.querySelector("[data-post-text-visible]").onchange = (ev) => {
      mutate(() => {
        if (key === "copyright") o.visible = ev.target.checked;
        else setImageTextType(b.imageId, key, ev.target.checked);
      }, false);
    };
    const reset = panel.querySelector("[data-post-text-reset]");
    if (reset)
      reset.onclick = () => {
        mutate(() => {
          const source = p.boards.find((b) => b.imageId === p.images[0]?.id)
            ?.elements[key];
          if (!source) return;
          delete p.textOverrides[b.imageId][key];
          for (const target of p.boards.filter(
            (t) => t.imageId === b.imageId,
          )) {
            target.elements[key].text = source.text;
            if (source.typographyVersion)
              target.elements[key].typographyVersion = source.typographyVersion;
            const matching = p.boards.find(
                (t) =>
                  t.imageId === p.images[0]?.id &&
                  t.w === target.w &&
                  t.h === target.h,
              )?.elements[key],
              previous = clone(target.elements[key]),
              from = matching || source;
            target.elements[key].characterStyles = clone(
              from.characterStyles || [],
            );
            target.elements[key].textStyles = clone(from.textStyles || []);
            if (!matching) MKWText.keepSizes(target.elements[key], previous);
          }
        }, false);
        renderPanel();
      };
    const field = panel.querySelector("[data-post-text]");
    let began = false;
    field.onfocus = () => (began = false);
    field.oninput = () => {
      if (!began) {
        checkpoint();
        began = true;
      }
      o.typographyVersion = 1;
      setSharedText(
        b,
        key,
        key === "copyright"
          ? field.value.replace(/[\r\n]+/g, " ")
          : field.value,
      );
      track(o, field.selectionStart, field.selectionEnd);
      changed(false);
    };
    for (const event of ["select", "keyup", "click"])
      field.addEventListener(event, () =>
        track(o, field.selectionStart, field.selectionEnd),
      );
    panel.querySelector("[data-post-text-layer]").onchange = (ev) => {
      if (editingText) editingText.el.blur();
      layer = ev.target.value;
      clear(b.elements[layer]);
      renderPanel();
      syncOverlays(true);
    };
    panel.querySelector("[data-post-text-edit]").onclick = () => {
      const el = document.querySelector(
        `.interaction[data-board="${b.id}"] [data-key="${key}"]`,
      );
      el?.focus();
    };
    bind(panel.querySelector(".typography-inspector"), {
      o,
      post: true,
      family: !!b.family?.enabled,
      copyright: key === "copyright",
      commit: (change) => {
        const first = b.imageId === p.images[0]?.id;
        for (const target of p.boards) {
          if (
            target === b ||
            !(
              target.imageId === b.imageId ||
              (first && target.elements[key].text === o.text)
            )
          )
            continue;
          const sameFormat = target.w === b.w && target.h === b.h,
            values = { ...change.values };
          if (!sameFormat) delete values.size;
          if (!Object.keys(values).length) continue;
          const e = target.elements[key];
          e.typographyVersion = 1;
          if (change.kind === "character")
            MKWText.changeCharacters(e, change.range, values, "role");
          else MKWText.changeParagraphs(e, change.indices, values);
        }
        changed(false);
        if (
          editingText?.el &&
          editingText.boardId === b.id &&
          editingText.key === key
        )
          postInline(b, key, editingText.el, true);
      },
    });
    if (b.family?.enabled)
      panel.insertAdjacentHTML("beforeend", familyTools(b));
  }
  const panelHTML = panel;
  function restoreSelection(el, r) {
    const selection = window.getSelection();
    carouselEditableCaret(el, r.start);
    if (!selection.rangeCount) return;
    const start = selection.getRangeAt(0).cloneRange();
    carouselEditableCaret(el, r.end);
    if (!selection.rangeCount) return;
    start.setEnd(
      selection.getRangeAt(0).endContainer,
      selection.getRangeAt(0).endOffset,
    );
    selection.removeAllRanges();
    selection.addRange(start);
  }
  function postLayout(e, width, factor) {
    const scaleStyle = (s) => {
      if (!s) return s;
      const out = { ...s };
      for (const k of ["size", "baselineShift", "spaceBefore", "spaceAfter"])
        if (out[k] !== undefined) out[k] *= factor;
      if (out.leading)
        out.leading = out.leading.map((v) => (v === null ? null : v * factor));
      return out;
    };
    const o = {
      ...record(e),
      size: e.size * factor,
      w: width,
      lineHeight: e.lineHeight ?? 1,
      characterStyles: e.characterStyles?.map(scaleStyle),
      textStyles: e.textStyles?.map(scaleStyle),
    };
    if (o.baselineShift) o.baselineShift *= factor;
    const layout = carouselTextLayout(o),
      lastSpace =
        o.textStyles?.[o.text.split("\n").length - 1]?.spaceAfter || 0;
    return {
      ...layout,
      height:
        Math.max(
          0,
          ...layout.lines.map(
            (line) =>
              line.y +
              Math.max(
                line.size * (e.key === "copyright" ? 1.15 : 1),
                ...line.runs.map((run) => run.dy + run.size),
              ),
          ),
        ) + lastSpace,
      source: o,
    };
  }
  function postInline(b, key, el, keepSelection = false) {
    const e = b.elements[key],
      r = keepSelection ? range(e) : null,
      layout = textBlock(b, key).records.find((item) => item.key === key);
    if (!layout?.styled) return;
    const o = layout.styled.source;
    el.innerHTML = e.text
      .split("\n")
      .map(
        (_, paragraph) =>
          `<div>${layout.styled.lines
            .filter((line) => line.paragraph === paragraph)
            .map(
              (line) =>
                `<span class="carousel-text-line" data-text-start="${line.start}" data-text-end="${line.end}" style="position:absolute;left:${line.x * surfaceScale()}px;top:${line.y * surfaceScale()}px;font-size:${line.size * surfaceScale()}px;line-height:1.12">${line.raw ? carouselEditableRuns(o, line, surfaceScale()) : '<br data-placeholder="true">'}</span>`,
            )
            .join("")}</div>`,
      )
      .join("");
    el.style.textTransform = "none";
    if (r) restoreSelection(el, r);
  }
  function bindPostInline(b, key, el) {
    const o = b.elements[key],
      undo = [],
      redo = [];
    const rememberText = () => {
      undo.push({
        text: o.text,
        characters: clone(o.characterStyles || []),
        paragraphs: clone(o.textStyles || []),
        range: range(o) || { start: o.text.length, end: o.text.length },
      });
      if (undo.length > 100) undo.shift();
      redo.length = 0;
    };
    const replace = (text) => {
      const r = carouselEditableSelection(el);
      rememberText();
      setSharedText(
        b,
        key,
        o.text.slice(0, r.start) + text + o.text.slice(r.end),
      );
      track(o, r.start + text.length, r.start + text.length);
      changed(false);
      postInline(b, key, el, true);
    };
    el.onpaste = (ev) => {
      ev.preventDefault();
      replace(ev.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"));
    };
    el.oncompositionstart = () => {
      rememberText();
      if (editingText?.el === el) editingText.composing = true;
    };
    el.oncompositionend = () => {
      if (editingText?.el === el) editingText.composing = false;
      inputText(b, key, el);
    };
    el.onbeforeinput = (ev) => {
      if (ev.isComposing || editingText?.composing) return;
      const r = carouselEditableSelection(el);
      if (["insertParagraph", "insertLineBreak"].includes(ev.inputType)) {
        ev.preventDefault();
        replace(key === "copyright" ? " " : "\n");
      } else if (
        ev.inputType === "insertText" &&
        ev.data != null &&
        MKWText.rich(o)
      ) {
        ev.preventDefault();
        replace(ev.data);
      } else if (
        ["deleteContentBackward", "deleteContentForward"].includes(
          ev.inputType,
        ) &&
        MKWText.rich(o)
      ) {
        ev.preventDefault();
        if (r.start === r.end) {
          if (ev.inputType.endsWith("Backward") && r.start > 0)
            r.start -= Array.from(o.text.slice(0, r.start)).at(-1).length;
          else if (ev.inputType.endsWith("Forward") && r.end < o.text.length)
            r.end += Array.from(o.text.slice(r.end))[0].length;
        }
        restoreSelection(el, r);
        replace("");
      } else rememberText();
    };
    el.addEventListener("keydown", (ev) => {
      if (
        !(ev.metaKey || ev.ctrlKey) ||
        ev.key.toLowerCase() !== "z" ||
        !MKWText.rich(o)
      )
        return;
      ev.preventDefault();
      ev.stopPropagation();
      const from = ev.shiftKey ? redo : undo,
        to = ev.shiftKey ? undo : redo;
      if (!from.length) return;
      const previous = from.pop();
      to.push({
        text: o.text,
        characters: clone(o.characterStyles || []),
        paragraphs: clone(o.textStyles || []),
        range: range(o),
      });
      setSharedText(b, key, previous.text);
      o.characterStyles = previous.characters;
      o.textStyles = previous.paragraphs;
      track(o, previous.range?.start || 0, previous.range?.end || 0);
      changed(false);
      postInline(b, key, el, true);
    });
  }
  return {
    panel,
    bind,
    carousel,
    post,
    track,
    range,
    pending,
    clear,
    sync,
    record,
    postLayout,
    postInline,
    restoreSelection,
    bindPostInline,
  };
})();
