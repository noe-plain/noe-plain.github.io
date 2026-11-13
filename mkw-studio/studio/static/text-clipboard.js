"use strict";
const MKWTextClipboard = (() => {
  const bindings = new WeakMap(),
    mime = "application/x-mkw-text";
  const fonts = () =>
    new Set([
      "Replica LL",
      "Harriet",
      "Harriet Italic",
      "Arial",
      ...p.fonts.map((f) => f.role),
    ]);
  function html(fragment) {
    let offset = 0;
    const body = fragment.text
      .split("\n")
      .map((part, index) => {
        const start = offset,
          ps = fragment.textStyles[index] || {};
        offset += part.length + 1;
        const runs = MKWText.segments(fragment, start, start + part.length)
          .map((run) => {
            const css = `font-family:${JSON.stringify(run.font || "Replica LL")};font-size:${run.size || 48}px;color:${run.color || "#000000"};letter-spacing:${((run.tracking || 0) * (run.size || 48)) / 1000}px;text-transform:${run.uppercase ? "uppercase" : "none"};text-decoration:${[run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none"};vertical-align:${run.script === "superscript" ? "super" : run.script === "subscript" ? "sub" : "baseline"}`;
            return `<span style="${esc(css)}">${esc(fragment.text.slice(run.start, run.end)).replaceAll("\u2028", "<br>")}</span>`;
          })
          .join("");
        return `<p style="margin:${ps.spaceBefore || 0}px 0 ${ps.spaceAfter || 0}px;text-align:${ps.align || "left"};line-height:${ps.lineHeight || 0.95}">${runs || "<br>"}</p>`;
      })
      .join("");
    return `<div data-mkw-rich="${esc(encodeURIComponent(JSON.stringify(fragment)))}">${body}</div>`;
  }
  function colour(value, fallback) {
    if (!value || !CSS.supports("color", value)) return fallback;
    const context = carouselMeasureContext;
    context.save();
    context.fillStyle = value;
    const result = context.fillStyle;
    context.restore();
    if (/^#[a-f\d]{6}$/i.test(result)) return result;
    const rgb = result.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/);
    return rgb
      ? "#" +
          rgb
            .slice(1)
            .map((n) => Math.round(+n).toString(16).padStart(2, "0"))
            .join("")
      : fallback;
  }
  function fromHTML(source, target, plain) {
    if (!source || source.length > 2000000) return null;
    const template = document.createElement("template");
    template.innerHTML = source;
    const marked = template.content.querySelector("[data-mkw-rich]");
    if (marked)
      try {
        const fragment = MKWTextEdit.normalize(
          JSON.parse(decodeURIComponent(marked.dataset.mkwRich)),
          fonts(),
          target.font || target.role,
        );
        if (fragment && (!plain || fragment.text === plain)) return fragment;
      } catch {}
    const result = {
      version: 1,
      text: "",
      characterStyles: [],
      textStyles: [],
    };
    let visited = 0,
      paragraphIndex = 0;
    const append = (text, style) => {
      if (!text) return;
      const start = result.text.length;
      result.text += text;
      paragraphIndex += text.split("\n").length - 1;
      if (result.text.length > MKWTextEdit.maxLength)
        throw Error("Der eingefügte Text ist zu lang.");
      result.characterStyles.push({ start, end: result.text.length, ...style });
    };
    const allowed = fonts(),
      base = {
        font: target.font || target.role,
        size: target.size,
        color: target.color,
        family: false,
        uppercase: false,
        underline: false,
        strike: false,
        script: "normal",
        tracking: 0,
        baselineShift: 0,
      },
      blocked = new Set([
        "SCRIPT",
        "STYLE",
        "SVG",
        "IFRAME",
        "OBJECT",
        "IMG",
        "VIDEO",
        "AUDIO",
        "TEMPLATE",
        "NOSCRIPT",
      ]),
      blocks = new Set([
        "P",
        "DIV",
        "LI",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "BLOCKQUOTE",
      ]);
    const visit = (node, inherited, paragraph) => {
      if (++visited > 20000)
        throw Error(
          "Die Formatierung ist zu umfangreich. Bitte ohne Formatierung einfügen.",
        );
      if (node.nodeType === Node.TEXT_NODE) {
        append(node.textContent.replace(/[\t\r\n ]+/g, " "), inherited);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || blocked.has(node.tagName))
        return;
      if (node.tagName === "BR") {
        append("\u2028", inherited);
        return;
      }
      const style = { ...inherited },
        ps = { ...paragraph },
        css = node.style;
      const family = (css.fontFamily || "")
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
      if (family.length && family.some((f) => allowed.has(f)))
        style.font = family.find((f) => allowed.has(f));
      const size = parseFloat(css.fontSize);
      if (Number.isFinite(size))
        style.size = Math.max(
          1,
          Math.min(
            1000,
            size *
              (css.fontSize.endsWith("pt")
                ? 4 / 3
                : css.fontSize.endsWith("em")
                  ? inherited.size
                  : css.fontSize.endsWith("%")
                    ? inherited.size / 100
                    : 1),
          ),
        );
      style.color = colour(css.color, style.color);
      if (css.textTransform === "uppercase") style.uppercase = true;
      const spacing = parseFloat(css.letterSpacing);
      if (Number.isFinite(spacing))
        style.tracking = Math.max(
          -500,
          Math.min(2000, (spacing / style.size) * 1000),
        );
      for (const [cssKey, key] of [
        ["marginTop", "spaceBefore"],
        ["marginBottom", "spaceAfter"],
      ]) {
        const value = parseFloat(css[cssKey]);
        if (Number.isFinite(value))
          ps[key] = Math.max(0, Math.min(5000, value));
      }
      if (css.fontStyle === "italic" || ["I", "EM"].includes(node.tagName)) {
        const italic = [...allowed].find(
          (f) => f.toLowerCase() === style.font.toLowerCase() + " italic",
        );
        if (italic) style.font = italic;
      }
      if (
        ["U"].includes(node.tagName) ||
        css.textDecoration.includes("underline")
      )
        style.underline = true;
      if (
        ["S", "STRIKE", "DEL"].includes(node.tagName) ||
        css.textDecoration.includes("line-through")
      )
        style.strike = true;
      if (
        ["SUP", "SUB"].includes(node.tagName) ||
        ["super", "sub"].includes(css.verticalAlign)
      )
        style.script =
          node.tagName === "SUP" || css.verticalAlign === "super"
            ? "superscript"
            : "subscript";
      if (["left", "center", "right", "justify"].includes(css.textAlign))
        ps.align = css.textAlign;
      if (css.lineHeight) {
        const n = parseFloat(css.lineHeight),
          factor = css.lineHeight.endsWith("%")
            ? n / 100
            : css.lineHeight.endsWith("px")
              ? n / style.size
              : n;
        if (Number.isFinite(factor))
          ps.lineHeight = Math.max(0.2, Math.min(5, factor));
      }
      const block = blocks.has(node.tagName);
      if (block && result.text && !result.text.endsWith("\n"))
        append("\n", inherited);
      if (block) result.textStyles[paragraphIndex] = ps;
      for (const child of node.childNodes) visit(child, style, ps);
      if (block && result.text && !result.text.endsWith("\n"))
        append("\n", style);
    };
    try {
      for (const node of template.content.childNodes) visit(node, base, {});
      if (result.text.endsWith("\n")) result.text = result.text.slice(0, -1);
      result.characterStyles = MKWText.merge(
        result.characterStyles.map((s) => ({
          ...s,
          end: Math.min(s.end, result.text.length),
        })),
      );
      while (result.textStyles.length < result.text.split("\n").length)
        result.textStyles.push(null);
      return MKWTextEdit.normalize(result, allowed, base.font);
    } catch {
      return null;
    }
  }
  function read(data, object, plainOnly = false) {
    const plain = data.getData("text/plain").replace(/\r\n?/g, "\n");
    if (!plainOnly) {
      try {
        const packet = data.getData(mime);
        if (packet.length < 2000000 && packet) {
          const value = MKWTextEdit.normalize(
            JSON.parse(packet),
            fonts(),
            object.font || object.role,
          );
          if (value && (!plain || value.text === plain)) return value;
        }
      } catch {}
      const value = fromHTML(data.getData("text/html"), object, plain);
      if (value) return value;
    }
    return { version: 1, text: plain, characterStyles: [], textStyles: [] };
  }
  function bind(
    el,
    {
      object,
      effective = () => object,
      replace,
      isCurrent = () => el.isConnected,
    },
  ) {
    let plainUntil = 0;
    const copy = (data, plainOnly = false) => {
      const r = carouselEditableSelection(el);
      if (!data || r.start === r.end) return false;
      if (plainOnly || r.end - r.start > MKWTextEdit.maxLength) {
        data.setData("text/plain", object.text.slice(r.start, r.end));
        return true;
      }
      const fragment = MKWTextEdit.slice(effective(), r.start, r.end);
      data.setData("text/plain", fragment.text);
      if (!plainOnly && fragment.text.length <= MKWTextEdit.maxLength) {
        data.setData("text/html", html(fragment));
        try {
          data.setData(mime, JSON.stringify(fragment));
        } catch {}
      }
      return true;
    };
    const paste = (data, plainOnly = false) => {
      if (!isCurrent()) return;
      const fragment = read(data, effective(), plainOnly),
        r = carouselEditableSelection(el);
      if (!fragment.text) return;
      try {
        replace(fragment, r, !plainOnly);
      } catch (error) {
        status("Text nicht eingefügt: " + error.message);
      }
    };
    el.oncopy = el.oncut = (event) => {
      if (copy(event.clipboardData)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === "cut")
          replace(
            { text: "", characterStyles: [], textStyles: [] },
            carouselEditableSelection(el),
            false,
          );
      }
    };
    el.onpaste = (event) => {
      event.preventDefault();
      event.stopPropagation();
      paste(event.clipboardData, performance.now() < plainUntil);
      plainUntil = 0;
    };
    el.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "v"
      )
        plainUntil = performance.now() + 1500;
    });
    bindings.set(el, { copy, paste, isCurrent, object });
  }
  function controls(command, { start, editor, object, locked, available }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.dataset.textClipboard = "";
    button.innerHTML = studioIcon("more");
    button.setAttribute("aria-label", "Text kopieren oder einfügen");
    button.title = "Text kopieren oder einfügen";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    MKWUIMenu.trigger(button);
    button.disabled = locked || !available();
    command.append(button);
    button.onclick = () => {
      const chosen = MKWTypography.range(object) || {
          start: 0,
          end: object.text.length,
        },
        project = p,
        menu = document.createElement("div");
      menu.id = "textClipboardMenu";
      document.querySelector("#textClipboardMenu")?.remove();
      menu.className = "carousel-effect-menu text-clipboard-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("popover", "auto");
      menu.setAttribute("aria-label", "Text-Zwischenablage");
      menu.innerHTML =
        "<strong>Text-Zwischenablage</strong>" +
        [
          ["copy", "Mit Formatierung kopieren"],
          ["copyPlain", "Nur Text kopieren"],
          ["paste", "Mit Formatierung einfügen"],
          ["pastePlain", "Ohne Formatierung einfügen"],
        ]
          .map(
            ([key, label]) =>
              `<button type="button" role="menuitem" data-text-clipboard-action="${key}">${label}</button>`,
          )
          .join("");
      let acted = false;
      button.setAttribute("aria-expanded", "true");
      menu.addEventListener("toggle", (e) => {
        if (e.newState === "closed") {
          button.setAttribute("aria-expanded", "false");
          if (!acted && p === project)
            MKWTypography.track(object, chosen.start, chosen.end);
          setTimeout(() => menu.remove(), 0);
        }
      });
      for (const item of menu.querySelectorAll("button"))
        item.onclick = async () => {
          const action = item.dataset.textClipboardAction;
          acted = true;
          menu.hidePopover();
          if (p !== project || locked || !available()) return;
          start(chosen);
          const el = editor(),
            binding = bindings.get(el);
          if (!binding) return;
          try {
            if (action.startsWith("copy")) {
              const data = new DataTransfer();
              if (!binding.copy(data, action === "copyPlain")) {
                status("Markiere zuerst den Text, den du kopieren möchtest.");
                return;
              }
              if (action === "copyPlain")
                await navigator.clipboard.writeText(data.getData("text/plain"));
              else
                await navigator.clipboard.write([
                  new ClipboardItem({
                    "text/plain": new Blob([data.getData("text/plain")], {
                      type: "text/plain",
                    }),
                    "text/html": new Blob([data.getData("text/html")], {
                      type: "text/html",
                    }),
                  }),
                ]);
              status(
                action === "copyPlain"
                  ? "Text ohne Formatierung kopiert."
                  : "Text mit Formatierung kopiert.",
              );
            } else {
              const data = new DataTransfer(),
                items = await navigator.clipboard.read();
              for (const entry of items)
                for (const type of ["text/plain", "text/html"])
                  if (entry.types.includes(type))
                    data.setData(
                      type,
                      await (await entry.getType(type)).text(),
                    );
              if (p !== project || !binding.isCurrent()) return;
              binding.paste(data, action === "pastePlain");
            }
          } catch {
            status(
              action.startsWith("copy")
                ? "Kopieren nicht freigegeben. Markiere Text auf der Fläche und verwende ⌘/Strg+C."
                : "Einfügen nicht freigegeben. Verwende ⌘/Strg+V; ohne Formatierung ⌘/Strg+Umschalt+V.",
            );
          }
        };
      document.body.append(menu);
      MKWUIMenu.open(menu, button);
    };
  }
  return Object.freeze({ bind, controls, read, html, fromHTML });
})();
