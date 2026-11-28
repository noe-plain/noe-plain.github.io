"use strict";
const search = document.getElementById("helpSearch"),
  sections = [...document.querySelectorAll("main section")],
  links = [...document.querySelectorAll("nav a")],
  results = document.getElementById("helpResults"),
  clear = document.getElementById("helpSearchClear"),
  chapterLinks = new Map(links.map((link) => [link.hash.slice(1), link])),
  normalize = (text) =>
    text
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  text = new Map(
    sections.map((section) => [section.id, normalize(section.textContent)]),
  );
const references = [...document.querySelectorAll("main details")],
  referenceText = new Map(
    references.map((element) => [element, normalize(element.textContent)]),
  ),
  referenceState = new Map();
search.hidden = false;
document.getElementById("searchHint").hidden = false;
search.addEventListener("input", () => {
  const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  clear.hidden = !search.value;
  let count = 0;
  for (const section of sections) {
    section.hidden = !words.every((word) =>
      text.get(section.id).includes(word),
    );
    if (!section.hidden) count++;
    chapterLinks.get(section.id).hidden = section.hidden;
  }
  // Search also reveals matching instructions inside the legacy reference.
  for (const reference of references) {
    if (words.length) {
      if (!referenceState.has(reference))
        referenceState.set(reference, reference.open);
      reference.open = words.every((word) =>
        referenceText.get(reference).includes(word),
      );
    } else if (referenceState.has(reference)) {
      reference.open = referenceState.get(reference);
      referenceState.delete(reference);
    }
  }
  results.hidden = !words.length;
  results.textContent = count
    ? `${count} ${count === 1 ? "passendes Kapitel" : "passende Kapitel"}`
    : "Keine passenden Kapitel. Versuche einen anderen Suchbegriff.";
});
clear.addEventListener("click", () => {
  search.value = "";
  search.dispatchEvent(new Event("input"));
  search.focus({ preventScroll: true });
});
function markSection(hash = location.hash || "#schnellstart") {
  const target = document.getElementById(hash.slice(1)),
    section = target?.closest("main section");
  const wasHidden = section?.hidden;
  if (wasHidden) {
    search.value = "";
    search.dispatchEvent(new Event("input"));
  }
  let reference = target?.closest("details"),
    expanded = false;
  while (reference) {
    expanded ||= !reference.open;
    reference.open = true;
    reference = reference.parentElement.closest("details");
  }
  if (target && (wasHidden || expanded)) target.scrollIntoView();
  for (const link of links) {
    if (link.hash === "#" + section?.id)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[href^="#"]');
  if (
    link &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
    markSection(link.hash);
});
window.addEventListener("hashchange", () => markSection());
markSection();

const bezierResources = [
  "../static/path-model.js?v=89e214c51293",
  "bezier-model.js?v=89e214c51293",
  "bezier-game.js?v=89e214c51293",
];
const startBezier = document.getElementById("startBezier"),
  closeBezier = document.getElementById("closeBezier"),
  bezierHost = document.getElementById("bezierHost"),
  bezierStatus = document.getElementById("bezierLoadStatus");
let bezierLoaded = false,
  bezierSession = null;
function loadBezierScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(
        Error(
          "Die Übung konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.",
        ),
      );
    };
    document.head.append(script);
  });
}
if (startBezier) {
  startBezier.hidden = false;
  startBezier.addEventListener("click", async () => {
    startBezier.disabled = true;
    document.getElementById("bezierLoadProgress").hidden = false;
    bezierStatus.textContent = "Übung wird geladen …";
    bezierHost.setAttribute("aria-busy", "true");
    try {
      if (!bezierLoaded) {
        for (const resource of bezierResources)
          await loadBezierScript(resource);
        bezierLoaded = true;
      }
      bezierHost.hidden = false;
      bezierSession = MKWBezierLesson.mount(bezierHost);
      closeBezier.hidden = false;
      startBezier.hidden = true;
      bezierStatus.textContent = "";
      bezierHost.querySelector("select").focus({ preventScroll: true });
    } catch (error) {
      bezierStatus.textContent = error.message;
    } finally {
      document.getElementById("bezierLoadProgress").hidden = true;
      startBezier.disabled = false;
      bezierHost.setAttribute("aria-busy", "false");
    }
  });
  closeBezier.addEventListener("click", () => {
    bezierSession?.close();
    bezierSession = null;
    bezierHost.hidden = true;
    closeBezier.hidden = true;
    startBezier.hidden = false;
    bezierStatus.textContent =
      "Übung beendet. Dein Studio-Projekt bleibt unverändert.";
    startBezier.focus({ preventScroll: true });
  });
}
