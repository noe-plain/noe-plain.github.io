"use strict";
const search = document.getElementById("helpSearch"),
  sections = [...document.querySelectorAll("main section")],
  links = [...document.querySelectorAll("nav a")],
  results = document.getElementById("helpResults"),
  normalize = (text) =>
    text
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  text = new Map(
    sections.map((section) => [section.id, normalize(section.textContent)]),
  );
search.hidden = false;
document.getElementById("searchHint").hidden = false;
search.addEventListener("input", () => {
  const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  let count = 0;
  for (const section of sections) {
    section.hidden = !words.every((word) =>
      text.get(section.id).includes(word),
    );
    if (!section.hidden) count++;
    links.find((link) => link.hash === "#" + section.id).hidden =
      section.hidden;
  }
  results.hidden = !words.length;
  results.textContent = count
    ? `${count} ${count === 1 ? "passendes Kapitel" : "passende Kapitel"}`
    : "Keine passenden Kapitel. Versuche einen anderen Suchbegriff.";
});
function markSection(hash = location.hash) {
  const target = document.getElementById(hash.slice(1)),
    section = target?.closest("main section");
  if (section?.hidden) {
    search.value = "";
    search.dispatchEvent(new Event("input"));
    target.scrollIntoView();
  }
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
