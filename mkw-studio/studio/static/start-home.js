"use strict";
(() => {
  const dialog = $("#startDialog"),
    brand = dialog.querySelector(".start-brand"),
    settings = $("#startSettings"),
    title = $("#startTitle"),
    intro = dialog.querySelector(".start-intro"),
    post = $("#startNew"),
    templates = $("#startTemplates"),
    open = $("#startOpen"),
    status = $("#startStatus"),
    help = $("#startHelp"),
    notice = $("#startBackgroundNotice"),
    header = document.createElement("div"),
    body = document.createElement("div"),
    modes = document.createElement("section"),
    returning = document.createElement("section"),
    footer = document.createElement("div"),
    designer = document.createElement("button");
  header.className = "start-home-header";
  header.append(brand, settings);
  body.className = "start-home-content";
  title.textContent = "Was möchtest du gestalten?";
  title.tabIndex = -1;
  title.setAttribute("autofocus", "");
  intro.textContent = "Wähle den Arbeitsbereich, der zu deiner Aufgabe passt.";
  modes.className = "start-mode-grid";
  modes.setAttribute("aria-label", "Neues Projekt starten");
  function mode(button, icon, name, description, example) {
    button.className = "start-mode-card";
    button.innerHTML = `${studioIcon(icon)}<strong>${name}</strong><span>${description}</span><small>${example}</small><span class="start-mode-action">Neues Projekt ${studioIcon("plus")}</span>`;
  }
  mode(
    post,
    "image",
    "FD-Kampagnen",
    "Viele Fotos. Ein einheitliches Layout.",
    "Ein Foto automatisch in mehreren Formaten gestalten.",
  );
  designer.id = "startDesigner";
  designer.type = "button";
  designer.disabled = true;
  mode(
    designer,
    "builder",
    "Designer",
    "Dein Design. Eine oder mehrere Slides.",
    "Bilder, Texte und Formen frei zusammensetzen.",
  );
  modes.append(post, designer);
  returning.className = "start-returning";
  returning.setAttribute("aria-label", "Vorlagen und bestehende Projekte");
  templates.innerHTML = `${studioIcon("layers")}<span><strong>Mit Vorlage starten</strong><small>Design wählen und mit deinen Inhalten füllen.</small></span>`;
  open.innerHTML = `${studioIcon("folder")}<span><strong>Projekt öffnen</strong><small>MKW-Datei oder eines deiner letzten fünf Browserprojekte.</small></span>`;
  returning.append(templates, open);
  footer.className = "start-home-footer";
  const local = document.createElement("span");
  local.textContent = "Deine Dateien bleiben auf deinem Gerät.";
  footer.append(local);
  if (help) footer.append(help);
  body.append(title, intro, modes, returning, status);
  if (notice) body.append(notice);
  body.append(footer);
  dialog.replaceChildren(header, body);
})();
