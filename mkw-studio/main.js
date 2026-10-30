(() => {
  "use strict";
  const root = document.documentElement,
    iconPath = "studio/static/icons/material-symbols.svg#",
    icons = new Set(["shapes", "image", "note_add"]),
    button = document.getElementById("themeToggle");
  let theme = "light";
  const symbol = (name) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", iconPath + name);
    svg.append(use);
    return svg;
  };
  function appearance() {
    let preferences = {};
    try {
      preferences = JSON.parse(
        localStorage.getItem("mkw-studio-preferences") || "{}",
      );
      theme =
        localStorage.getItem("mkw-studio-theme") === "dark" ? "dark" : "light";
    } catch {}
    const palette = MKWUIColor.palette(
      preferences?.primaryColour,
      theme,
      preferences?.colourMode,
    );
    for (const [key, value] of Object.entries(palette))
      root.style.setProperty("--md-sys-color-" + key, value);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.getElementById("hubLogo").src =
      `studio/mkw-logo-bold-${theme === "dark" ? "neg" : "pos"}.svg`;
    document.querySelector('meta[name="theme-color"]').content =
      palette.surface;
    button.replaceChildren(
      symbol(theme === "dark" ? "light_mode" : "dark_mode"),
    );
    button.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Helle Darstellung verwenden"
        : "Dunkle Darstellung verwenden",
    );
  }
  button.onclick = () => {
    try {
      localStorage.setItem(
        "mkw-studio-theme",
        theme === "dark" ? "light" : "dark",
      );
      document.getElementById("hubStatus").textContent = "";
      appearance();
    } catch {
      document.getElementById("hubStatus").textContent =
        "Die Darstellung konnte in diesem Browser nicht gespeichert werden.";
    }
  };
  window.addEventListener("storage", (event) => {
    if (["mkw-studio-theme", "mkw-studio-preferences"].includes(event.key))
      appearance();
  });
  appearance();
  const tools = (
      Array.isArray(window.MKW_TOOLS) ? window.MKW_TOOLS : []
    ).filter(
      (tool) =>
        tool &&
        typeof tool.name === "string" &&
        (tool.status === "planned" ||
          (typeof tool.path === "string" && /^\.\//.test(tool.path))),
    ),
    available = tools.filter((tool) => tool.status !== "planned").length,
    planned = tools.length - available;
  document.getElementById("toolAvailability").textContent =
    `${available} verfügbar · ${planned} geplant`;
  const card = (tool) => {
    const article = document.createElement("article"),
      visual = document.createElement("div"),
      heading = document.createElement("h3"),
      description = document.createElement("p"),
      badge = document.createElement("span");
    article.className =
      "tool-card" +
      (tool.id === "studio" ? " tool-featured" : "") +
      (tool.status === "planned" ? " tool-planned" : "");
    article.dataset.tool = tool.id;
    visual.className = "tool-card-symbol";
    visual.append(symbol(icons.has(tool.icon) ? tool.icon : "note_add"));
    badge.className = "tool-status";
    badge.textContent = tool.note || "Verfügbar";
    heading.textContent = tool.name;
    description.textContent = tool.description;
    article.append(visual, badge, heading, description);
    if (tool.features?.length) {
      const features = document.createElement("ul");
      features.className = "tool-features";
      for (const label of tool.features) {
        const feature = document.createElement("li");
        feature.textContent = label;
        features.append(feature);
      }
      article.append(features);
    }
    if (tool.status !== "planned") {
      const link = document.createElement("a");
      link.href = tool.path;
      link.className = "tool-open";
      link.textContent =
        tool.id === "studio" ? "Studio öffnen" : "Konverter öffnen";
      link.setAttribute("aria-label", tool.name + " öffnen");
      link.append(symbol("chevron_right"));
      article.append(link);
    } else {
      const note = document.createElement("p");
      note.className = "tool-planning-note";
      note.textContent = "Noch nicht verfügbar";
      article.append(note);
    }
    return article;
  };
  document.getElementById("toolsGrid").replaceChildren(...tools.map(card));
})();
