"use strict";
(() => {
  const dialog = $("#startDialog"),
    brand = dialog.querySelector(".start-brand"),
    settings = $("#startSettings"),
    title = $("#startTitle"),
    intro = dialog.querySelector(".start-intro"),
    choices = dialog.querySelector(".start-choices"),
    open = dialog.querySelector(".start-open-options"),
    status = $("#startStatus"),
    help = dialog.querySelector("small"),
    header = document.createElement("div"),
    body = document.createElement("div"),
    create = document.createElement("section"),
    resume = document.createElement("section"),
    modes = document.createElement("div");
  header.className = "start-home-header";
  header.append(brand, settings);
  body.className = "start-home-content";
  title.textContent = "Was möchtest du gestalten?";
  title.tabIndex = -1;
  title.setAttribute("autofocus", "");
  intro.textContent =
    "Starte ein neues Design oder arbeite an einem gespeicherten Projekt weiter.";
  create.className = "start-home-card start-home-create";
  create.setAttribute("aria-labelledby", "startCreateTitle");
  create.innerHTML = '<h2 id="startCreateTitle">Neues Design</h2>';
  choices.removeChild(open);
  create.append(choices);
  resume.className = "start-home-card start-home-resume";
  resume.setAttribute("aria-labelledby", "startResumeTitle");
  resume.innerHTML = '<h2 id="startResumeTitle">Weiterarbeiten</h2>';
  open
    .querySelector("#startContinue")
    .setAttribute("aria-describedby", "startStatus");
  open
    .querySelector("#startOpen")
    .setAttribute("aria-describedby", "startOpenHint");
  resume.append(open, status);
  const hint = document.createElement("p");
  hint.id = "startOpenHint";
  hint.textContent =
    "MKW-Datei oder eines deiner letzten fünf Browserprojekte öffnen.";
  resume.append(hint);
  modes.className = "start-mode-help";
  modes.innerHTML = `<div>${studioIcon("image")}<p><strong>FD-Kampagnen</strong><span>Fotos in mehreren Formaten mit einheitlichem Layout.</span></p></div><div>${studioIcon("builder")}<p><strong>Designer</strong><span>Einzelne Slides und zusammenhängende Beiträge frei gestalten.</span></p></div>`;
  help.classList.add("start-home-footer");
  const note = $("#startBackgroundNotice");
  body.append(title, intro, create, resume, modes, help);
  if (note) resume.append(note);
  dialog.replaceChildren(header, body);
})();
