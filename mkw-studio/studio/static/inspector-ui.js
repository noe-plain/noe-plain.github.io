(function (root) {
  "use strict";
  const sessions = new WeakMap();
  function group(title) {
    if (
      /Position|Grösse|Schutzzone|Format|Rahmenform|Textstapel|Text im Rahmen/.test(
        title,
      )
    )
      return "layout";
    if (
      /Gestaltung|Schrift|Typografie|Zeichen|Absätze|Farbe|Fläche|Kontur|Linienenden|Verlauf|Hintergrund|Effekte/.test(
        title,
      )
    )
      return "style";
    return "content";
  }
  function present({
    root: host,
    panel,
    title,
    subtitle,
    scope = "",
    icon,
    key,
    layers = null,
  }) {
    if (!host || !panel) return;
    let state = sessions.get(host);
    if (!state) {
      const header =
          host.querySelector(".tool-sidebar-heading") ||
          document.createElement("div"),
        heading = header.querySelector("h2") || document.createElement("h2"),
        identity = document.createElement("div"),
        symbol = document.createElement("span"),
        labels = document.createElement("div"),
        description = document.createElement("p"),
        hint = document.createElement("p"),
        nav = document.createElement("nav");
      header.className = "tool-sidebar-heading inspector-header";
      identity.className = "inspector-identity";
      symbol.className = "inspector-symbol";
      labels.className = "inspector-labels";
      description.className = "inspector-subtitle";
      hint.className = "inspector-scope";
      nav.className = "inspector-navigation";
      nav.setAttribute("aria-label", "Zu den Eigenschaften");
      labels.append(heading, description);
      identity.append(symbol, labels);
      header.replaceChildren(identity, hint, nav);
      host.prepend(header);
      host.classList.add("unified-inspector");
      state = {
        header,
        heading,
        symbol,
        description,
        hint,
        nav,
        targets: new Map(),
        key: null,
      };
      sessions.set(host, state);
    }
    for (const [node, value] of [
      [state.heading, title],
      [state.description, subtitle],
      [state.hint, scope],
    ])
      if (node.textContent !== value) node.textContent = value;
    state.heading.title = title;
    state.description.title = subtitle;
    if (state.description.hidden !== !subtitle)
      state.description.hidden = !subtitle;
    if (state.hint.hidden !== !scope) state.hint.hidden = !scope;
    if (state.icon !== icon) {
      state.symbol.innerHTML = icon;
      state.icon = icon;
    }
    const previous = state.key;
    state.key = key;
    state.targets.clear();
    const sections = panel.hidden
      ? []
      : [
          ...panel.querySelectorAll(
            ".tool-section,.carousel-property-section,.family-tools,.sponsor-inspector",
          ),
        ];
    for (const section of sections) {
      if (section.closest("[hidden]")) continue;
      const heading = section.querySelector(
          ":scope > h3,:scope > h4,:scope > .type-section-heading h4",
        ),
        name = section.classList.contains("typography-inspector")
          ? "Typografie"
          : heading?.textContent || "Inhalt",
        category = group(name);
      if (section.dataset.inspectorGroup !== category)
        section.dataset.inspectorGroup = category;
      if (!state.targets.has(category))
        state.targets.set(category, heading || section);
    }
    if (layers)
      state.targets.set("layers", layers.querySelector("h3") || layers);
    const names = {
        content: "Inhalt",
        style: "Design",
        layout: "Position",
        layers: "Ebenen",
      },
      categories = ["content", "style", "layout", "layers"].filter((key) =>
        state.targets.has(key),
      ),
      signature = categories.join();
    if (state.nav.dataset.groups !== signature) {
      state.nav.dataset.groups = signature;
      state.nav.replaceChildren(
        ...categories.map((category) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = names[category];
          button.dataset.inspectorJump = category;
          button.onclick = () => {
            const target = state.targets.get(category);
            if (!target?.isConnected) return;
            const scroller =
                category === "layers"
                  ? layers
                  : host.id === "carouselSidebar"
                    ? panel
                    : host,
              top =
                target.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top +
                scroller.scrollTop -
                (scroller === host ? state.header.offsetHeight : 0) -
                12;
            scroller.scrollTo({ top, behavior: "instant" });
            target.tabIndex = -1;
            target.focus({ preventScroll: true });
          };
          return button;
        }),
      );
    }
    state.nav.hidden = !state.targets.size;
    panel
      .querySelectorAll(":scope > .carousel-section-heading,:scope > h3")
      .forEach((heading) => {
        if (!heading.classList.contains("inspector-source-heading"))
          heading.classList.add("inspector-source-heading");
      });
    if (previous !== null && previous !== key) {
      const scroller = host.id === "carouselSidebar" ? panel : host;
      scroller.scrollTop = 0;
    }
  }
  root.MKWInspectorUI = { present };
})(globalThis);
