"use strict";
const MKWTypography = (() => {
  const sessions = new WeakMap();
  let current = null,
    panelSequence = 0;
  const session = (o) => {
    if (!sessions.has(o)) sessions.set(o, {});
    return sessions.get(o);
  };
  let selectionFrame = 0;
  document.addEventListener("selectionchange", () => {
    if (selectionFrame) return;
    selectionFrame = requestAnimationFrame(() => {
      selectionFrame = 0;
      const el = document.activeElement;
      if (!current?.host.isConnected || !el?.matches(".mkw-inline-input"))
        return;
      const selected = window.getSelection();
      if (
        !selected?.anchorNode ||
        !el.contains(selected.anchorNode) ||
        !el.contains(selected.focusNode)
      )
        return;
      const next = carouselEditableSelection(el);
      track(current.o, next.start, next.end);
    });
  });
  const record = (o) => ({
    ...o,
    font: o.font || o.role,
    textAlign: o.textAlign || o.align || "left",
    uppercase: o.uppercase ?? (o.key === "date" ? true : undefined),
  });
  function track(o, start, end) {
    const s = session(o);
    if (s.range?.start !== start || s.range?.end !== end) {
      delete s.pending;
      delete s.paragraphSelection;
      delete s.lineSelection;
    }
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
  function useLists() {
    const state = session(current.o);
    delete state.range;
    delete state.pending;
    const field = current.host
      .closest("#stepPanel,#carouselProperties")
      ?.querySelector("[data-post-text],[data-prop=text]");
    if (field) field.setSelectionRange(field.selectionEnd, field.selectionEnd);
  }
  function formattingScope(o = current.o) {
    const state = session(o),
      single = current.targets.length === 1,
      layout = single ? current.layout || (() => carouselTextLayout(o)) : null,
      available =
        single && state.lineSelection
          ? layout().lines.filter((l) =>
              paragraphIndices(o).includes(l.paragraph),
            )
          : null,
      selected = available?.filter((l) =>
        state.lineSelection.has(`${l.paragraph}:${l.index}`),
      ),
      partialLines = available && selected.length < available.length;
    return MKWTextScope.resolve(o, {
      paragraphs: paragraphIndices(o),
      range: single ? range(o) : null,
      ...(partialLines ? { lines: selected } : {}),
    });
  }
  function scope(o) {
    const selection = formattingScope(o);
    if (selection.direct)
      return `${selection.ranges[0].end - selection.ranges[0].start} Zeichen markiert`;
    if (selection.lineScoped)
      return `${session(o).lineSelection.size} ${session(o).lineSelection.size === 1 ? "Zeile" : "Zeilen"} ausgewählt`;
    return selection.whole
      ? "Alle Absätze & Zeilen"
      : `${selection.paragraphs.length} ${selection.paragraphs.length === 1 ? "Absatz" : "Absätze"} ausgewählt`;
  }
  function panel() {
    const prefix = "typo-" + ++panelSequence;
    const field = (key, label, unit, min, max, step = "any") => {
      const input = `<span class="type-unit"><input id="${prefix}-${key}" data-typo="${key}" aria-label="${label}" type="number" min="${min}" max="${max}" step="${step}"><span>${unit}</span></span>`;
      return `<label for="${prefix}-${key}">${label}${input}</label>`;
    };
    return `<section class="carousel-property-section typography-inspector"><h3 class="visually-hidden">Textformatierung</h3><div class="typo-scope"><span data-typo-scope role="status"></span><button data-typo-all>Absatz-/Zeilenauswahl verwenden</button></div>${MKWParagraphScopeUI.markup(prefix, studioIcon)}<div class="typo-control-group" data-typo-page="character"><h4>Schrift &amp; Farbe</h4><label>Schriftfamilie<select data-typo="font" aria-label="Schriftfamilie"></select></label><div class="typo-grid">${field("size", "Schriftgrösse", "px", 1, 5000)}${field("tracking", "Laufweite", "‰", -500, 2000)}</div><div class="typo-colour-row"><span>Textfarbe</span><button data-typo-colour aria-label="Textfarbe wählen"><i></i><span data-typo-colour-label></span></button></div><div class="typo-format" role="group" aria-label="Zeichenformatierung">${[
      ["uppercase", "AA", "Grossbuchstaben"],
      ["underline", "U", "Unterstrichen"],
      ["strike", "S", "Durchgestrichen"],
      ["superscript", "x²", "Hochgestellt"],
      ["subscript", "x₂", "Tiefgestellt"],
    ]
      .map(
        ([key, text, label]) =>
          `<button data-typo-toggle="${key}" title="${label}" aria-label="${label} · ${text}" aria-pressed="false"><span class="typo-symbol typo-${key}" aria-hidden="true">${text}</span></button>`,
      )
      .join(
        "",
      )}</div><details class="typo-details"><summary>Weitere Zeichenoptionen</summary>${field("baselineShift", "Grundlinienversatz", "px", -5000, 5000)}<button data-typo-size-auto>Schriftgrösse zurücksetzen</button><button data-typo-reset>Zeichenformatierung zurücksetzen</button></details></div><div class="typo-control-group" data-typo-page="paragraph"><h4>Absatz &amp; Abstände</h4><p class="typo-paragraph-scope" data-typo-paragraph-scope></p><div class="type-control-heading"><span>Ausrichtung der Auswahl</span><button data-typo-align-auto>Vom Textfeld</button></div>${carouselTextAlignButtons("left", "data-typo-align", "Absatzausrichtung")}${carouselJustificationHint(true, "data-typo-hyphenate")}<div class="typo-grid">${field("lineHeight", "Zeilenabstand", "%", 20, 500)}<label data-line-spacing>Zeilenabstand (px)<span class="type-unit"><input data-lines-leading aria-label="Zeilenabstand in Pixeln" type="number" min="1" max="3000" step="any"><span>px</span></span></label></div><button data-typo-leading-auto>Automatischen Zeilenabstand verwenden</button><div class="typo-grid">${field("spaceBefore", "Abstand davor", "px", 0, 5000)}${field("spaceAfter", "Abstand danach", "px", 0, 5000)}</div><div data-typo-extra></div></div></section>`;
  }
  function values(key) {
    return current.targets.flatMap((o) => {
      const styled = record(o);
      if (
        current.post &&
        current.textRole === "date" &&
        o.uppercase === undefined
      )
        styled.uppercase = true;
      return MKWTextScope.values(styled, formattingScope(o), key);
    });
  }
  function common(list) {
    return list.length && list.every((v) => v === list[0]) ? list[0] : null;
  }
  function paragraphIndices(o = current.o) {
    const r = current.targets.length === 1 ? range(o) : null,
      chosen =
        current.targets.length === 1 ? session(o).paragraphSelection : null;
    if (r && r.end > r.start) return MKWText.paragraphs(o.text, r.start, r.end);
    if (chosen)
      return [...chosen]
        .filter((i) => i >= 0 && i < o.text.split("\n").length)
        .sort((a, b) => a - b);
    return r
      ? MKWText.paragraphs(o.text, r.start, r.end)
      : o.text.split("\n").map((_, i) => i);
  }
  function sync() {
    if (!current?.host.isConnected) return;
    const { o, host, locked, family, copyright, targets } = current,
      base = record(o),
      indices = paragraphIndices(),
      allIndices = targets.flatMap((target) =>
        paragraphIndices(target).map((index) => ({ target, index })),
      );
    current.paragraphScope?.update(indices);
    const selection = formattingScope(),
      hasSelection =
        selection.whole ||
        selection.ranges.length > 0 ||
        (!selection.lineScoped &&
          !selection.direct &&
          selection.paragraphs.length > 0),
      paragraphEnabled =
        (!selection.direct || selection.completeParagraphs) &&
        !selection.lineScoped;
    host.querySelector(".typo-scope").hidden =
      targets.length === 1 && !selection.direct && hasSelection;
    host.querySelector("[data-typo-scope]").textContent =
      targets.length > 1
        ? `${targets.length} Textebenen ausgewählt · Formatierung gilt für alle`
        : hasSelection
          ? "Gilt für: " + scope(o)
          : "Keine Auswahl. Wähle Absätze oder Zeilen.";
    host.querySelector("[data-typo-all]").hidden =
      targets.length > 1 || !selection.direct;
    host.querySelector("[data-typo-all]").disabled =
      targets.length > 1 || !selection.direct;
    host.querySelector("[data-typo-paragraph-scope]").hidden =
      paragraphEnabled && targets.length === 1;
    host.querySelector("[data-typo-paragraph-scope]").textContent =
      selection.direct && !selection.completeParagraphs
        ? "Für Ausrichtung und Absatzabstände ganze Absätze auswählen. Schriftänderungen gelten nur für die markierten Zeichen."
        : selection.lineScoped
          ? "Zeilenabstand gilt nur für die ausgewählten Zeilen. Absatzoptionen sind für ganze Absätze verfügbar."
          : targets.length > 1
            ? `Änderungen gelten für alle Absätze der ${targets.length} ausgewählten Textebenen.`
            : indices.length === 1
              ? `Änderungen gelten für Absatz ${indices[0] + 1}.`
              : `Änderungen gelten für ${indices.length} Absätze.`;
    host.querySelectorAll("[data-typo]").forEach((input) => {
      const key = input.dataset.typo,
        para = ["lineHeight", "spaceBefore", "spaceAfter"].includes(key),
        list =
          key === "lineHeight" && selection.lineScoped
            ? selectedLines().map(
                (line) =>
                  line.leading /
                  Math.max(
                    line.size,
                    ...(line.runs || []).map((run) => run.size),
                  ),
              )
            : para
              ? allIndices.map(
                  ({ target, index }) =>
                    target.textStyles?.[index]?.[key] ??
                    (key === "lineHeight"
                      ? (target.lineHeight ?? (current.post ? 1 : 0.95))
                      : 0),
                )
              : key === "uppercase" &&
                  current.post &&
                  current.textRole === "date" &&
                  o.uppercase === undefined
                ? [true]
                : values(key);
      let value = common(list);
      if (key === "lineHeight" && value !== null) value *= 100;
      if (
        key === "font" &&
        (current.fontValue !== value || current.fontBase !== base.font)
      ) {
        current.fontValue = value;
        current.fontBase = base.font;
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
      input.disabled =
        locked ||
        !hasSelection ||
        (para &&
          ((selection.direct && !selection.completeParagraphs) ||
            (selection.lineScoped && key !== "lineHeight")));
    });
    host.querySelectorAll("[data-typo-toggle]").forEach((button) => {
      const key = button.dataset.typoToggle,
        script = ["superscript", "subscript"].includes(key),
        value = common(values(script ? "script" : key));
      button.setAttribute(
        "aria-pressed",
        value === null ? "mixed" : String(script ? value === key : !!value),
      );
      button.disabled = locked || !hasSelection;
    });
    const colour = common(values("color")),
      colourButton = host.querySelector("[data-typo-colour]");
    colourButton.disabled = locked || !hasSelection;
    colourButton.querySelector("i").style.background =
      colour || "linear-gradient(135deg,#111 50%,#fff 50%)";
    host.querySelector("[data-typo-colour-label]").textContent =
      family && copyright
        ? "Schwarz / Weiss"
        : familyState() === true
          ? "Familienkonzert"
          : colour || "Gemischt";
    colourButton.setAttribute(
      "aria-label",
      "Textfarbe wählen · " +
        host.querySelector("[data-typo-colour-label]").textContent,
    );
    const align = common(
      allIndices.map(
        ({ target, index }) =>
          target.textStyles?.[index]?.align ||
          record(target).textAlign ||
          "left",
      ),
    );
    host.querySelector(".justification-settings").hidden = align !== "justify";
    host.querySelector("[data-typo-align-auto]").disabled =
      locked ||
      !paragraphEnabled ||
      !allIndices.some(
        ({ target, index }) => target.textStyles?.[index]?.align !== undefined,
      );
    const hyphen = host.querySelector("[data-typo-hyphenate]"),
      hyphenValue = common(
        allIndices.map(
          ({ target, index }) =>
            (target.textStyles?.[index]?.hyphenate ?? target.hyphenate) !==
            false,
        ),
      );
    hyphen.checked = hyphenValue !== false;
    hyphen.indeterminate = hyphenValue === null;
    hyphen.disabled =
      locked || copyright || !allIndices.length || !paragraphEnabled;

    host.querySelector("[data-typo-size-auto]").disabled =
      locked ||
      !hasSelection ||
      !targets.some((target) => {
        const scope = formattingScope(target);
        return (
          (!scope.direct &&
            !scope.lineScoped &&
            scope.paragraphs.some(
              (i) => target.textStyles?.[i]?.size !== undefined,
            )) ||
          target.characterStyles?.some(
            (run) =>
              run.size !== undefined &&
              scope.ranges.some((r) => run.start < r.end && run.end > r.start),
          )
        );
      });
    host.querySelectorAll("[data-typo-align]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.typoAlign === align),
      );
      button.disabled =
        locked || copyright || !allIndices.length || !paragraphEnabled;
    });
    host.querySelector("[data-typo-reset]").disabled = locked || !hasSelection;
    host.querySelector("[data-typo-leading-auto]").disabled =
      locked ||
      !hasSelection ||
      (selection.direct && !selection.completeParagraphs);
    if (selection.direct && !selection.completeParagraphs) {
      host.querySelector("[data-lines-leading]").disabled = true;
    }
  }
  function remember() {
    const { o } = current;
    checkpoint();
    const edit = carouselUI.editing;
    if (current.targets.length === 1 && !current.post && edit?.id === o.id) {
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
  function character(values, checkpointed = false, scopes = null) {
    if (!current || current.locked) return;
    scopes ??= current.targets.map((target) => formattingScope(target));
    if (
      !scopes.some(
        (s) =>
          s.whole ||
          s.ranges.length ||
          (!s.direct && !s.lineScoped && s.paragraphs.length),
      )
    )
      return;
    if (!checkpointed) remember();
    current.targets.forEach((target, index) => {
      if (current.post) target.typographyVersion = 1;
      MKWTextScope.apply(
        target,
        scopes[index],
        values,
        current.post ? "role" : "font",
      );
    });
    current.commit({ kind: "character", scope: scopes[0], values });
    sync();
  }
  function lineLeading(lines, value) {
    const groups = new Map();
    for (const line of lines) {
      if (!groups.has(line.paragraph)) groups.set(line.paragraph, []);
      groups.get(line.paragraph).push(line);
    }
    if (current.post) current.o.typographyVersion = 1;
    for (const [index, rows] of groups) {
      const leading = [...(current.o.textStyles?.[index]?.leading || [])];
      for (const line of rows)
        leading[line.index] = typeof value === "function" ? value(line) : value;
      MKWText.changeParagraphs(current.o, [index], { leading });
      current.commit({
        kind: "paragraph",
        indices: [index],
        values: { leading },
        lineSpecific: true,
      });
    }
    sync();
  }
  function selectedLines() {
    const state = session(current.o);
    return (
      current.layout || (() => carouselTextLayout(current.o))
    )().lines.filter(
      (l) =>
        paragraphIndices().includes(l.paragraph) &&
        (!state.lineSelection ||
          state.lineSelection.has(`${l.paragraph}:${l.index}`)),
    );
  }
  function paragraph(values, checkpointed = false) {
    if (
      !current ||
      current.locked ||
      !current.targets.some((target) => paragraphIndices(target).length)
    )
      return false;
    const selection = formattingScope();
    if (selection.direct && !selection.completeParagraphs) return false;
    if (selection.lineScoped) {
      if (Object.keys(values).length !== 1 || values.lineHeight === undefined)
        return false;
      const lines = selectedLines(),
        // FD layout converts display sizes back to source pixels. Remove
        // floating-point residue before testing the inclusive 1–3000px limits.
        leading = (line) =>
          Math.round(
            Math.max(line.size, ...(line.runs || []).map((r) => r.size)) *
              values.lineHeight *
              1e9,
          ) / 1e9;
      if (lines.some((line) => leading(line) < 1 || leading(line) > 3000)) {
        MKWFields.error(
          current.host.querySelector('[data-typo="lineHeight"]'),
          "Der ausgewählte Zeilenabstand muss zwischen 1 und 3000 px liegen.",
        );
        return false;
      }
      if (!checkpointed) remember();
      lineLeading(lines, leading);
      return true;
    }
    if (!checkpointed) remember();
    const { o, targets } = current,
      indices = paragraphIndices();
    for (const target of targets) {
      if (current.post) target.typographyVersion = 1;
      MKWText.changeParagraphs(
        target,
        targets.length === 1 ? indices : paragraphIndices(target),
        values,
      );
    }
    current.commit({ kind: "paragraph", indices, values });
    sync();
    return true;
  }
  function bind(host, options) {
    current = { ...options, host, targets: options.targets || [options.o] };
    const advanced = [...host.querySelectorAll("details.typo-details")];
    if (advanced.length) {
      const extra =
        host.querySelector(":scope > .typo-more-options") ||
        document.createElement("section");
      extra.className = "typo-more-options";
      extra.setAttribute("aria-label", "Weitere Textoptionen");
      extra.append(...advanced);
      host.append(extra);
    }
    host.querySelector(".paragraph-scope").hidden = current.targets.length > 1;
    const lineScope = host.querySelector("[data-line-scope]");
    lineScope.hidden = current.targets.length > 1;
    host.querySelector("[data-line-spacing]").hidden =
      current.targets.length > 1;
    current.paragraphScope =
      current.targets.length > 1
        ? null
        : MKWParagraphScopeUI.mount({
            host,
            o: options.o,
            state: session(options.o),
            locked: options.locked,
            layout: options.layout || (() => carouselTextLayout(options.o)),
            remember,
            select: (indices) => {
              useLists();
              session(options.o).paragraphSelection = new Set(indices);
              sync();
            },
            leading: lineLeading,
            changedScope: () => {
              useLists();
              sync();
            },
          });
    host.querySelector("[data-typo=size]").max = options.post ? 5000 : 1000;
    host.querySelector("[data-typo-all]").onclick = () => {
      useLists();
      sync();
    };
    host.querySelectorAll("[data-typo]").forEach((input) => {
      let began = false,
        scopes = null;
      input.onfocus = () => {
        began = false;
        scopes = current.targets.map((target) => formattingScope(target));
      };
      input.oninput = () => {
        const key = input.dataset.typo,
          numeric = input.type === "number";
        let value = numeric ? Number(input.value) : input.value;
        if (numeric && !MKWFields.validate(input, true)) return;
        if (
          !input.value ||
          (numeric &&
            (!Number.isFinite(value) ||
              value < +input.min ||
              value > +input.max))
        )
          return;
        if (["lineHeight", "spaceBefore", "spaceAfter"].includes(key)) {
          if (
            paragraph(
              { [key]: key === "lineHeight" ? value / 100 : value },
              began,
            )
          )
            began = true;
          return;
        }
        if (!began) {
          remember();
          began = true;
        }
        character({ [key]: value }, true, scopes);
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
    host.querySelector("[data-typo-align-auto]").onclick = () =>
      paragraph({ align: undefined });
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
      character({ size: null });
    host.querySelector("[data-typo-leading-auto]").onclick = () => {
      if (formattingScope().lineScoped) {
        remember();
        lineLeading(selectedLines(), null);
      } else paragraph({ lineHeight: 0.95 });
    };
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
        scopes = current.targets.map((target) => formattingScope(target)),
        o = current.o;
      studioOpenColourPicker({
        anchor: ev.currentTarget,
        colour: common(values("color")) || o.color,
        label: "Textfarbe",
        onBegin: remember,
        onFamily: owner.copyright
          ? null
          : (enabled) => character({ family: enabled }, false, scopes),
        familyState: () => familyState(null, scopes),
        isCurrent: () => current === owner && host.isConnected,
        onChange: (value) =>
          character(
            {
              family: false,
              color:
                owner.family && owner.copyright
                  ? MKWFamily.copyrightColor(value)
                  : value,
            },
            true,
            scopes,
          ),
      });
    };
    sync();
  }
  function carousel(o, panel, targets = [o]) {
    const host = panel.querySelector(".typography-inspector");
    if (!host) return;
    if (targets.length === 1) {
      host.querySelector("[data-typo-extra]").replaceChildren();
      host
        .querySelector("[data-typo-page=character]")
        .insertAdjacentHTML(
          "beforeend",
          `<details class="typo-details"><summary>Textfeldfarbe & Deckkraft</summary>${studioPaintCards(o)}</details>`,
        );
      studioBindPaintCards(host, o);
    }
    bind(host, {
      o,
      targets,
      locked: targets.some((target) => carouselObjectLocked(target)),
      copyright: targets.some((target) => target.campaignRole === "copyright"),
      commit: () => {
        changed(false);
        targets.forEach(carouselUpdateWarning);
        if (targets.length === 1 && carouselUI.editing?.id === o.id) {
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
    panel.innerHTML = `<section class="tool-section typo-content"><h3>Text</h3><label class="text-layer-choice">Text auswählen<select data-post-text-layer aria-label="Text auswählen">${options(
      Object.entries(elementNames).filter(([k]) => k !== "logo"),
      key,
    )}</select></label><label>Textinhalt<textarea data-post-text rows="3" aria-label="${elementNames[key]} eingeben">${esc(o.text)}</textarea></label><label class="typo-visible"><input type="checkbox" data-post-text-visible ${o.visible ? "checked" : ""}>Auf dem Bild anzeigen</label>${b.imageId !== p.images[0]?.id ? `<button data-post-text-reset ${p.textOverrides?.[b.imageId]?.[key] ? "" : "hidden"}>Text vom ersten Bild übernehmen</button>` : ""}<button data-post-text-edit>Auf der Fläche bearbeiten</button></section>${panelHTML()}`;
    panel.querySelector("[data-post-text-visible]").onchange = (ev) => {
      mutate(() => {
        if (key === "copyright") o.visible = ev.target.checked;
        else setImageTextType(b.imageId, key, ev.target.checked);
      }, false);
    };
    const reset = panel.querySelector("[data-post-text-reset]");
    if (reset) reset.id = "resetText";
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
    field.id = key === "copyright" ? "copyrightText" : "mainTextInput";
    panel.querySelector("[data-post-text-layer]").id = "textLayer";
    panel.querySelector("[data-post-text-visible]").id = "textVisible";
    panel.querySelector("[data-typo=size]").id = "textSize";
    panel.querySelector("[data-typo=font]").id = "fontRole";
    let began = false;
    field.onfocus = () => (began = false);
    field.oninput = () => {
      if (!began) {
        checkpoint();
        began = true;
      }
      setSharedText(
        b,
        key,
        key === "copyright"
          ? field.value.replace(/[\r\n]+/g, " ")
          : field.value,
      );
      track(o, field.selectionStart, field.selectionEnd);
      changed(false);
      if (reset) reset.hidden = !p.textOverrides?.[b.imageId]?.[key];
    };
    for (const event of ["select", "keyup", "click"])
      field.addEventListener(event, () => {
        if (document.activeElement === field)
          track(o, field.selectionStart, field.selectionEnd);
      });
    panel.querySelector("[data-post-text-layer]").onchange = (ev) => {
      if (editingText) editingText.el.blur();
      layer = ev.target.value;
      clear(b.elements[layer]);
      renderPanel();
      syncOverlays(true);
    };
    postTextContent(b, key, panel, field);
    bind(panel.querySelector(".typography-inspector"), {
      o,
      post: true,
      textRole: key,
      layout: () => {
        const item = textBlock(b, key).records.find((r) => r.key === key),
          factor = item?.size / o.size || 1,
          layout =
            item?.styled || postLayout({ ...o, key }, item?.w || b.w, factor);
        return {
          ...layout,
          lines: layout.lines.map((l) => ({
            ...l,
            leading: l.leading / factor,
            size: l.size / factor,
            runs: l.runs?.map((run) => ({ ...run, size: run.size / factor })),
          })),
        };
      },
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
          if (!sameFormat && change.lineSpecific) continue;
          if (!sameFormat) delete values.size;
          if (!Object.keys(values).length) continue;
          const e = target.elements[key];
          e.typographyVersion = 1;
          if (change.kind === "character") {
            MKWTextScope.apply(e, change.scope, values, "role");
          } else MKWText.changeParagraphs(e, change.indices, values);
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
    if (!layout) return;
    const styled =
        layout.styled ||
        postLayout(
          {
            ...e,
            key,
            family: key !== "copyright" && (e.family ?? !!b.family?.enabled),
          },
          layout.w,
          layout.size / e.size,
        ),
      o = styled.source;
    el.classList.add("mkw-inline-input");
    el.dataset.canvasText = String(!!layout.visible);
    el.innerHTML = e.text
      .split("\n")
      .map(
        (_, paragraph) =>
          `<div>${styled.lines
            .filter((line) => line.paragraph === paragraph)
            .map(
              (line) =>
                `<span class="carousel-text-line" data-text-start="${line.start}" data-text-end="${line.end}" style="position:absolute;width:${Math.max(1, styled.source.w - line.x) * surfaceScale()}px;left:${line.x * surfaceScale()}px;top:${line.y * surfaceScale()}px;font-size:${line.size * surfaceScale()}px;line-height:1.12">${line.raw ? carouselEditableRuns(o, line, surfaceScale()) : MKWInlineText.empty(o, line, surfaceScale())}</span>${o.text[line.end] === "\u2028" ? '<br data-soft-break="true" contenteditable="false">' : ""}`,
            )
            .join("")}</div>`,
      )
      .join("");
    el.style.textTransform = "none";
    if (r) restoreSelection(el, r);
  }
  function bindPostInline(b, key, el) {
    MKWInlineText.bindSelection(el);
    const o = b.elements[key],
      undo = [],
      redo = [];
    let nativeRemembered = false;
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
    el.addEventListener("input", () => {
      if (
        !nativeRemembered &&
        !editingText?.composing &&
        carouselEditableValue(el) !== o.text
      )
        rememberText();
      nativeRemembered = false;
    });
    el.onpaste = (ev) => {
      ev.preventDefault();
      replace(ev.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"));
    };
    el.addEventListener("compositionstart", () => {
      rememberText();
      if (editingText?.el === el) editingText.composing = true;
      el.classList.add("mkw-composing");
      draw();
    });
    el.addEventListener("compositionend", () => {
      if (editingText?.el === el) editingText.composing = false;
      el.classList.remove("mkw-composing");
      inputText(b, key, el);
    });
    el.onbeforeinput = (ev) => {
      MKWInlineText.holdView(el);
      if (ev.isComposing || editingText?.composing) return;
      const r = carouselEditableSelection(el);
      if (["insertParagraph", "insertLineBreak"].includes(ev.inputType)) {
        ev.preventDefault();
        replace(
          key === "copyright"
            ? " "
            : ev.inputType === "insertLineBreak"
              ? "\u2028"
              : "\n",
        );
      } else if (ev.inputType === "insertText" && ev.data != null) {
        ev.preventDefault();
        replace(ev.data);
      } else if (
        ["deleteContentBackward", "deleteContentForward"].includes(ev.inputType)
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
      } else {
        rememberText();
        nativeRemembered = true;
      }
    };
    el.addEventListener("keydown", (ev) => {
      if (!(ev.metaKey || ev.ctrlKey) || ev.key.toLowerCase() !== "z") return;
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
  function familyState(target = null, scopes = null) {
    if (
      !current?.host?.isConnected ||
      (target && !current.targets.includes(target))
    )
      return null;
    const states = current.targets.flatMap((o, index) => {
      const styled = record(o),
        decorated = !current.post && p.campaign ? MKWCampaignUI.decorate(o) : o;
      styled.family = o.family ?? (current.family || decorated.family || false);
      return MKWTextScope.values(
        styled,
        scopes?.[index] || formattingScope(o),
        "family",
      ).map(Boolean);
    });
    return states.length && states.every(Boolean)
      ? true
      : states.some(Boolean)
        ? "mixed"
        : false;
  }
  function familyText(target, enabled) {
    if (
      !current ||
      current.post ||
      !current.host?.isConnected ||
      !current.targets.includes(target)
    )
      return false;
    if (!current.copyright) character({ family: enabled });
    return true;
  }
  return {
    familyText,
    familyState,
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
