(function (root) {
  "use strict";
  function create({ read, actions, views }) {
    const {
      mutate,
      fit,
      setFamilyDesign,
      checkpoint,
      setSharedText,
      setSharedTextSize,
      setImageTextType,
      syncOverlays,
      clone,
    } = actions;
    const {
      query: $,
      esc,
      options,
      icon: studioIcon,
      fontOptions: studioFontOptions,
      familyTools,
      sponsorPanel,
      bindFamilyTools,
      justificationHint: carouselJustificationHint,
      textTypes,
    } = views;
    const on = (panel, id, event, fn) =>
      panel.querySelector("#" + id)?.addEventListener(event, (ev) => {
        if (ev.target.type === "number" && !MKWFields.validate(ev.target, true))
          return;
        fn(ev);
      });
    function renderCrop({ b, panel }) {
      panel.innerHTML = `<div class="panel-row"><section class="tool-section"><h3>Bildausschnitt</h3><div class="tool-button-grid"><button data-fit="fill" title="Bild so vergrössern, dass es die ganze Fläche bedeckt">Fläche füllen</button><button data-fit="fit" title="Das gesamte Bild innerhalb der Zeichenfläche zeigen">Ganzes Bild</button></div><label>Bildgrösse (%) <input id="scale" aria-label="Bildskalierung in Prozent" type="number" min="0.1" step="0.1" value="${(b.image.scale * 100).toFixed(1)}"></label><div class="tool-button-grid"><button data-fit="center">Zentrieren</button><button data-fit="original">Originalgrösse</button></div></section><section class="tool-section"><h3>Gestaltung</h3><label>Drehung (°) <input id="angle" type="number" value="${b.image.angle}"></label><div class="tool-button-grid"><button id="flipX" title="Links und rechts tauschen">${studioIcon("flip")}Horizontal</button><button id="flipY" title="Oben und unten tauschen">${studioIcon("flip", "flip-vertical")}Vertikal</button></div><button data-fit="reset" class="tool-secondary">Bildausschnitt zurücksetzen</button></section><section class="tool-section"><h3>Hintergrund</h3><label>Zeichenflächenfarbe <input id="bg" aria-label="Zeichenflächenfarbe" type="color" value="${b.family?.enabled ? b.family.background : b.bg}"></label></section></div>`;
      panel.querySelectorAll("[data-fit]").forEach(
        (el) =>
          (el.onclick = () => {
            mutate(() => fit(b, el.dataset.fit), false);
            render();
          }),
      );
      on(panel, "scale", "change", (ev) =>
        mutate(
          () =>
            (b.image.scale = Math.max(
              0.001,
              Math.min(100, +ev.target.value / 100 || 0.001),
            )),
          false,
        ),
      );
      on(panel, "angle", "change", (ev) =>
        mutate(() => (b.image.angle = Number(ev.target.value) || 0), false),
      );
      for (const key of ["flipX", "flipY"])
        on(panel, key, "click", () =>
          mutate(() => (b.image[key] *= -1), false),
        );
      on(panel, "bg", "change", (ev) =>
        mutate(() => {
          if (b.family?.enabled)
            setFamilyDesign(b.imageId, { background: ev.target.value });
          else b.bg = ev.target.value;
        }, false),
      );
    }
    function renderText({ p, b, layer, panel, elementNames, selectLayer }) {
      const e = b.elements[layer] || b.elements.title,
        first = p.images[0]?.id === b.imageId,
        custom = p.textOverrides?.[b.imageId]?.[layer];
      panel.innerHTML = `<div class="panel-row text-tools"><section class="tool-section"><h3>Inhalt</h3><select id="textLayer" aria-label="Text auswählen">${options(
        Object.entries(elementNames).filter(([k]) => k !== "logo"),
        layer,
      )}</select><div id="textContentField"></div><label><input id="textVisible" type="checkbox" ${e.visible ? "checked" : ""}> Auf dem Bild anzeigen</label>${!first && custom ? '<button id="resetText">Text vom ersten Bild übernehmen</button>' : ""}</section><section class="tool-section"><h3>Gestaltung</h3><label class="tool-stacked">Schrift<select id="fontRole" aria-label="Schrift">${studioFontOptions(e.role)}</select></label><label>Schriftgrösse (px) <input id="textSize" type="number" min="1" max="5000" value="${Math.round(e.size)}"></label><label class="tool-stacked">Ausrichtung<select id="textAlign" aria-label="Textausrichtung" ${layer === "copyright" ? "disabled" : ""}>${options(
        [
          ["left", "Links"],
          ["center", "Zentriert"],
          ["right", "Rechts"],
          ["justify", "Blocksatz"],
        ],
        e.align,
      )}</select></label>${
        b.family?.enabled && layer === "copyright"
          ? `<label>Copyright-Farbe<select id="textColor" aria-label="Copyright-Farbe">${options(
              [
                ["#000000", "Schwarz"],
                ["#ffffff", "Weiss"],
              ],
              views.copyrightColor(e.color),
            )}</select></label>`
          : `<label ${b.family?.enabled ? "hidden" : ""}>Textfarbe<input id="textColor" aria-label="Textfarbe" type="color" value="${e.color}"></label>`
      }${b.family?.enabled && layer !== "copyright" ? "" : ""}<label ${!["date", "title"].includes(layer) ? "hidden" : ""}><input id="uppercase" type="checkbox" ${layer === "date" ? (e.uppercase !== false ? "checked" : "") : e.uppercase ? "checked" : ""}> ${layer === "date" ? "Übertitel in Grossbuchstaben" : "Konzerttitel in Grossbuchstaben"}</label></section></div>`;
      if (layer === "copyright") {
        const input = document.createElement("input");
        input.type = "text";
        input.id = "copyrightText";
        input.setAttribute("aria-label", "Copyright eingeben");
        input.placeholder = "Bildbeschreibung © Name";
        input.value = e.text;
        input.onfocus = () => checkpoint();
        input.oninput = () => {
          setSharedText(b, "copyright", input.value.replace(/[\r\n]+/g, " "));
          changed(false);
        };
        panel.querySelector("#textContentField").append(input);
      } else {
        const input = document.createElement("textarea");
        input.id = "mainTextInput";
        input.rows = 3;
        input.setAttribute("aria-label", elementNames[layer] + " eingeben");
        input.placeholder = elementNames[layer] + " eingeben …";
        input.value = e.text;
        input.onfocus = () => checkpoint();
        input.oninput = () => {
          setSharedText(b, layer, input.value);
          changed(false);
        };
        panel.querySelector("#textContentField").append(input);
      }
      on(panel, "textLayer", "change", (ev) => {
        actions.finishText();
        selectLayer(ev.target.value);
        render();
        syncOverlays(true);
      });
      on(panel, "textSize", "input", (ev) =>
        mutate(
          () =>
            setSharedTextSize(
              b,
              layer,
              Math.max(1, Math.min(5000, +ev.target.value || 1)),
            ),
          false,
        ),
      );
      for (const [id, key] of [
        ["textColor", "color"],
        ["textAlign", "align"],
        ["fontRole", "role"],
        ["textVisible", "visible"],
      ])
        on(panel, id, "change", (ev) =>
          mutate(() => {
            if (key === "visible" && textTypes.some(([k]) => k === layer))
              setImageTextType(b.imageId, layer, ev.target.checked);
            else {
              e[key] = key === "visible" ? ev.target.checked : ev.target.value;
              if (key === "align" && e.textStyles)
                for (const style of e.textStyles) if (style) delete style.align;
            }
            if (key === "align") render();
          }, false),
        );
      on(panel, "uppercase", "change", (ev) =>
        mutate(() => {
          if (layer === "date") {
            const first = b.imageId === p.images[0]?.id;
            for (const target of p.boards)
              if (
                target.imageId === b.imageId ||
                (first && target.elements.date.text === e.text)
              )
                target.elements.date.uppercase = ev.target.checked;
            if (first) p.meta.headingUppercase = ev.target.checked;
            return;
          }
          p.meta.uppercase = ev.target.checked;
          for (const x of p.boards)
            if (
              x.imageId === b.imageId ||
              (b.imageId === p.images[0]?.id &&
                x.elements.title.text === e.text)
            )
              x.elements.title.uppercase = ev.target.checked;
        }, false),
      );
      on(panel, "resetText", "click", () =>
        mutate(() => {
          delete p.textOverrides[b.imageId][layer];
          const template = p.boards.find((x) => x.imageId === p.images[0].id)
            ?.elements[layer];
          for (const x of p.boards.filter((x) => x.imageId === b.imageId)) {
            x.elements[layer].text = template?.text || "";
            x.elements[layer].visible =
              x.elements[layer].enabled !== false &&
              (template?.visible || false);
          }
        }, false),
      );
      if (b.family?.enabled)
        panel
          .querySelector(".panel-row")
          .insertAdjacentHTML("beforeend", familyTools(b));
    }
    function renderLogo({ p, b, panel }) {
      const e = b.elements.logo;
      panel.innerHTML = `<div class="panel-row logo-panel"><button class="logo-choice ${e.source === "black" && e.visible ? "active" : ""}" data-logo="black" title="Musikkollegium Schwarz"><img src="mkw-logo-bold-pos.svg" alt="Musikkollegium Schwarz"></button><button class="logo-choice dark ${e.source === "white" && e.visible ? "active" : ""}" data-logo="white" title="Musikkollegium Weiss"><img src="mkw-logo-bold-neg.svg" alt="Musikkollegium Weiss"></button>${p.logos
        .filter((l) => l.purpose !== "sponsor")
        .map(
          (l) =>
            `<div class="custom-logo-item"><button class="logo-choice ${e.source === l.id && e.visible ? "active" : ""}" data-logo="${esc(l.id)}" title="${esc(l.name)}"><img src="${esc(l.data)}" alt="${esc(l.name)}"></button><button class="remove-custom-logo" data-remove-logo="${esc(l.id)}" aria-label="Eigenes Logo entfernen: ${esc(l.name)}" title="Eigenes Logo entfernen">×</button></div>`,
        )
        .join(
          "",
        )}<div class="tool-button-grid"><button id="customLogo">Logo hinzufügen</button><button id="noLogo">Logo ausblenden</button></div><section class="tool-section"><h3>Auf weitere Bilder anwenden</h3><button id="allLogos">Logo auf alle Bilder übertragen</button></section></div>`;
      panel.querySelectorAll("[data-remove-logo]").forEach(
        (el) =>
          (el.onclick = () =>
            mutate(() => {
              const id = el.dataset.removeLogo;
              if (
                id === "black" ||
                id === "white" ||
                !p.logos.some((l) => l.id === id)
              )
                return;
              p.logos = p.logos.filter((l) => l.id !== id);
              for (const target of p.boards)
                if (target.elements.logo.source === id) {
                  target.elements.logo.source = "black";
                  target.elements.logo.visible = false;
                }
            })),
      );
      panel.querySelectorAll("[data-logo]").forEach(
        (el) =>
          (el.onclick = () =>
            mutate(() => {
              for (const x of p.boards.filter((x) => x.imageId === b.imageId)) {
                x.elements.logo.source = el.dataset.logo;
                x.elements.logo.visible = true;
              }
            })),
      );
      on(panel, "customLogo", "click", () => $("#logoFile").click());
      on(panel, "noLogo", "click", () =>
        mutate(() => {
          for (const x of p.boards.filter((x) => x.imageId === b.imageId))
            x.elements.logo.visible = false;
        }),
      );
      on(panel, "allLogos", "click", () =>
        mutate(() => {
          for (const x of p.boards) {
            const scale = x.w / b.w;
            x.elements.logo = {
              ...clone(e),
              x: e.x * scale,
              y: e.y * scale,
              size: e.size * scale,
            };
          }
        }),
      );
    }
    function render() {
      const {
        project: p,
        board: b,
        step,
        advanced,
        elementNames,
        layer: currentLayer,
      } = read();
      let layer = currentLayer;
      const selectLayer = (value) => {
        layer = value;
        actions.selectLayer(value);
      };
      const panel = $("#stepPanel");
      panel.hidden = !b || step === "export";
      $("#toolTitle").textContent = !b
        ? "Dein Bild gestalten"
        : {
            text: "Text gestalten",
            logo: "Logo auswählen",
            sponsors: "Sponsorenleiste",
            crop: "Bildausschnitt",
            export: "Vorschau & Export",
          }[step] || "Dein Bild gestalten";
      $("#toolEmpty").hidden = !!b && step !== "export";
      $("#toolEmpty").textContent =
        step === "export"
          ? "Wähle im Exportfenster deine Formate und Dateinamen."
          : "Wähle ein Bild und ein Werkzeug in der Leiste.";
      if (!b) return;
      if (layer === "postAngle" && !b.angle?.enabled) selectLayer("image");
      if (step === "crop" && layer === "postAngle") {
        views.angle(b, panel);
        return;
      }
      if (step === "crop") {
        renderCrop({ b, panel });
      } else if (step === "text" && advanced) {
        if (!views.textKeys().includes(layer)) selectLayer("title");
        views.typography(b, layer, panel);
      } else if (step === "text") {
        renderText({ p, b, layer, panel, elementNames, selectLayer });
      } else if (step === "sponsors") {
        panel.innerHTML = "";
        sponsorPanel(b, panel);
      } else if (step === "logo") {
        renderLogo({ p, b, panel });
      }
      if (step === "text") {
        if (!advanced && b.elements[layer]?.align === "justify") {
          panel.insertAdjacentHTML(
            "beforeend",
            carouselJustificationHint(
              false,
              "data-post-hyphenate",
              b.elements[layer].hyphenate !== false,
            ),
          );
          panel.querySelector("[data-post-hyphenate]").onchange = (ev) => {
            const enabled = ev.target.checked;
            mutate(() => {
              b.elements[layer].hyphenate = enabled;
            });
            if (enabled) actions.hyphenation();
          };
        }
        views.stack(b, panel);
      }
      bindFamilyTools(panel);
    }
    return { render };
  }
  const api = { create };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWPostInspector = api;
})(globalThis);
