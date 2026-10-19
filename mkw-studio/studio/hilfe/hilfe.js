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
function markSection() {
  for (const link of links) {
    if (link.hash === location.hash)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", markSection);
markSection();
