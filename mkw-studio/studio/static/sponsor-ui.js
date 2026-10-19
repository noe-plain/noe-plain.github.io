"use strict";
let sponsorGroups = [],
  sponsorGroupsLoaded = false,
  sponsorLoading = null,
  sponsorSelection = null;
async function sponsorLoadGroups(refresh = false) {
  if (refresh) sponsorGroupsLoaded = false;
  if (sponsorGroupsLoaded) return sponsorGroups;
  if (!sponsorLoading)
    sponsorLoading = MKWSponsorLibrary.groups()
      .then((groups) => {
        sponsorGroups = groups;
        sponsorGroupsLoaded = true;
        return groups;
      })
      .finally(() => (sponsorLoading = null));
  return sponsorLoading;
}
function sponsorLogoCaption(logo, colour) {
  const name = {
    black: "Schwarz",
    white: "Weiss",
    gray: "Graustufen",
    original: "Original",
  }[MKWSponsors.mode(logo, colour)];
  return `${logo.mode === "auto" ? "Automatisch · " : ""}${name} · ${Math.round(logo.scale * 100)} %`;
}
function sponsorDefaults() {
  return { enabled: false, colour: "#ffffff", height: 180, groups: [] };
}
function sponsorOptions(im) {
  const b = p.boards.find((b) => b.imageId === im.id),
    s = b?.sponsors || sponsorDefaults(),
    groups = [
      ...sponsorGroups,
      ...s.groups.filter((g) => !sponsorGroups.some((l) => l.id === g.id)),
    ];
  return `<div class="sponsor-options" data-sponsor-options="${esc(im.id)}"><div class="picker-heading">Sponsoren</div><label><input type="checkbox" data-sponsor-enable="${esc(im.id)}" ${s.enabled ? "checked" : ""}> Sponsorleiste anzeigen</label>${groups.map((g) => `<label><input type="checkbox" data-sponsor-group="${esc(g.id)}" data-sponsor-image="${esc(im.id)}" ${s.groups.some((a) => a.id === g.id && a.enabled) ? "checked" : ""}> ${esc(g.name)}</label>`).join("")}<button type="button" data-sponsor-edit="${esc(im.id)}">Leiste und Logos bearbeiten</button><button type="button" data-sponsor-settings>Sponsorgruppen verwalten</button><small>${s.enabled && !s.groups.some((g) => g.enabled) ? "Bitte mindestens eine Sponsorgruppe auswählen." : "Erstes Bild: Vorlage für weitere Bilder."}</small></div>`;
}
function sponsorRefreshOptions() {
  for (const im of p.images) {
    const old = document.querySelector(`[data-sponsor-options="${im.id}"]`);
    if (old) old.outerHTML = sponsorOptions(im);
  }
}
function sponsorApply(imageId, config) {
  const first = imageId === p.images[0]?.id;
  p.sponsorOverrides ??= {};
  if (!first) p.sponsorOverrides[imageId] = true;
  for (const b of p.boards)
    if (b.imageId === imageId || (first && !p.sponsorOverrides[b.imageId])) {
      const before = MKWSponsors.layout(b)?.content || b;
      b.sponsors = clone(config);
      const after = MKWSponsors.layout(b)?.content || b;
      b.image.x += (after.w - before.w) / 2;
      b.image.y += (after.h - before.h) / 2;
    }
  changed(false);
  sponsorRefreshOptions();
  const current = p.boards.find((b) => b.id === selected)?.sponsors;
  if (current)
    for (const button of document.querySelectorAll("[data-sponsor-select]")) {
      const logo = current.groups
        .flatMap((g) => g.logos)
        .find((l) => l.id === button.dataset.sponsorSelect);
      if (logo)
        button.querySelector("small").textContent = sponsorLogoCaption(
          logo,
          current.colour,
        );
    }
}
async function sponsorToggleGroup(imageId, id, enabled) {
  const project = p;
  await sponsorLoadGroups();
  const source = p.boards.find((b) => b.imageId === imageId);
  if (!source || p !== project) return;
  const config = clone(source.sponsors || sponsorDefaults());
  let group = config.groups.find((g) => g.id === id);
  if (!group) {
    const template = sponsorGroups.find((g) => g.id === id);
    if (!template) return;
    const assets = await Promise.all(
      template.logos.map((l) => MKWSponsorLibrary.logo(l.id)),
    );
    if (p !== project) return;
    for (const asset of assets) {
      if (!asset) throw Error("Sponsorlogo fehlt in der Bibliothek.");
      if (!p.logos.some((l) => l.id === asset.id)) {
        const { thumb, ...portable } = asset;
        p.logos.push(portable);
      }
    }
    group = {
      ...clone(template),
      enabled,
      logos: template.logos.map(({ thumb, ...l }) => ({
        ...l,
        mode: "auto",
        scale: 1,
      })),
    };
    config.groups.push(group);
  }
  checkpoint();
  group.enabled = enabled;
  if (enabled) config.enabled = true;
  sponsorApply(imageId, config);
  sponsorOpenProperties(imageId);
}
function sponsorOpenProperties(imageId, hit = null) {
  const b =
    p.boards.find(
      (b) => b.imageId === imageId && b.id === (hit?.boardId || selected),
    ) || p.boards.find((b) => b.imageId === imageId);
  if (!b) return;
  if (editingText) editingText.el.blur();
  selected = b.id;
  step = "logo";
  sponsorSelection = hit?.logoId || null;
  updateDock();
  renderPanel();
  syncOverlays(true);
  requestAnimationFrame(() =>
    (sponsorSelection
      ? $("#sponsorLogoProperties")
      : $("#postSponsors")
    )?.scrollIntoView({ block: "start" }),
  );
}
function sponsorPanel(b, panel) {
  const s = b.sponsors || sponsorDefaults(),
    root = document.createElement("section");
  root.id = "postSponsors";
  root.className = "tool-section sponsor-inspector";
  root.innerHTML = `<h3>Sponsorleiste</h3><label><input type="checkbox" id="postSponsorEnabled" ${s.enabled ? "checked" : ""}> Auf diesem Bild anzeigen</label><label>Balkenfarbe<input id="sponsorColour" type="color" aria-label="Balkenfarbe" value="${s.colour}"></label><label>Mindesthöhe bei 1080 px<input id="sponsorHeight" type="number" min="120" max="600" step="10" value="${s.height}"></label><p>180 px empfohlen. Gruppen stehen nebeneinander und brechen bei Platzmangel um. Quadrat und Querformat: Leiste rechts um −90°.</p>${s.groups.map((g) => `<div class="sponsor-project-group"><div class="sponsor-project-heading"><strong>${esc(g.name)}</strong><button data-sponsor-remove-group="${esc(g.id)}" class="icon-button" aria-label="Gruppe aus diesem Bild entfernen: ${esc(g.name)}">${studioIcon("trash")}</button></div>${g.logos.map((l) => `<button class="sponsor-logo-button" data-sponsor-select="${esc(l.id)}" aria-pressed="${sponsorSelection === l.id}">${esc(l.name)}<small>${sponsorLogoCaption(l, s.colour)}</small></button>`).join("")}</div>`).join("")}<button id="sponsorRefreshTemplates">Gruppen aus Bibliothek aktualisieren</button><div id="sponsorLogoProperties"></div><p class="carousel-warning">${esc(MKWSponsors.layout(b)?.warning || "")}</p><button type="button" data-sponsor-settings>Sponsorgruppen verwalten</button>`;
  panel.append(root);
  const apply = (fn) => {
    const config = clone(b.sponsors || sponsorDefaults());
    fn(config);
    sponsorApply(b.imageId, config);
  };
  root.querySelector("#postSponsorEnabled").onchange = (e) => {
    checkpoint();
    apply((s) => (s.enabled = e.target.checked));
  };
  root.querySelector("#sponsorColour").oninput = (e) => {
    if (!studioPicker?.editing) checkpoint();
    apply((s) => (s.colour = e.target.value));
  };
  root.querySelector("#sponsorHeight").onchange = (e) => {
    checkpoint();
    apply(
      (s) => (s.height = Math.max(120, Math.min(600, +e.target.value || 180))),
    );
    renderPanel();
  };
  root.querySelectorAll("[data-sponsor-remove-group]").forEach(
    (btn) =>
      (btn.onclick = () => {
        checkpoint();
        apply(
          (s) =>
            (s.groups = s.groups.filter(
              (g) => g.id !== btn.dataset.sponsorRemoveGroup,
            )),
        );
        renderPanel();
      }),
  );
  root.querySelectorAll("[data-sponsor-select]").forEach(
    (btn) =>
      (btn.onclick = () => {
        sponsorSelection = btn.dataset.sponsorSelect;
        renderPanel();
        requestAnimationFrame(() =>
          $("#sponsorLogoProperties")?.scrollIntoView({ block: "nearest" }),
        );
      }),
  );
  root.querySelector("#sponsorRefreshTemplates").onclick = async () => {
    const project = p;
    try {
      await sponsorLoadGroups(true);
      const config = clone(b.sponsors || sponsorDefaults()),
        assets = [],
        previous = new Map(
          config.groups.flatMap((g) => g.logos).map((l) => [l.id, l]),
        );
      for (const group of config.groups) {
        const template = sponsorGroups.find((g) => g.id === group.id);
        if (!template) continue;
        group.name = template.name;
        group.logos = template.logos.map(({ thumb, ...l }) => ({
          ...l,
          mode: previous.get(l.id)?.mode || "auto",
          scale: previous.get(l.id)?.scale || 1,
        }));
        for (const logo of group.logos)
          if (!p.logos.some((l) => l.id === logo.id)) {
            const asset = await MKWSponsorLibrary.logo(logo.id);
            if (!asset) throw Error("Sponsorlogo fehlt in der Bibliothek.");
            const { thumb, ...portable } = asset;
            assets.push(portable);
          }
      }
      if (p !== project) return;
      checkpoint();
      for (const asset of assets)
        if (!p.logos.some((l) => l.id === asset.id)) p.logos.push(asset);
      sponsorApply(b.imageId, config);
      renderPanel();
    } catch (error) {
      status(error.message);
    }
  };
  const logo = s.groups
    .flatMap((g) => g.logos)
    .find((l) => l.id === sponsorSelection);
  if (logo) {
    const properties = root.querySelector("#sponsorLogoProperties");
    properties.innerHTML = `<h4>${esc(logo.name)}</h4><label>Darstellung<select id="sponsorLogoMode">${options(
      [
        [
          "auto",
          "Automatisch · " +
            {
              black: "Schwarz",
              white: "Weiss",
              gray: "Graustufen",
              original: "Original",
            }[MKWSponsors.mode({ ...logo, mode: "auto" }, s.colour)],
        ],
        ["black", "Schwarz"],
        ["white", "Weiss"],
        ["gray", "Graustufen"],
        ["original", "Originalfarben"],
      ],
      logo.mode,
    )}</select></label><label>Grösse · %<input id="sponsorLogoSize" type="number" min="25" max="200" step="5" value="${Math.round(logo.scale * 100)}"></label><button id="sponsorLogoReset">Optische Grösse zurücksetzen</button>`;
    properties.querySelector("#sponsorLogoMode").onchange = (e) => {
      checkpoint();
      apply(
        (s) =>
          (s.groups.flatMap((g) => g.logos).find((l) => l.id === logo.id).mode =
            e.target.value),
      );
      renderPanel();
    };
    properties.querySelector("#sponsorLogoSize").onchange = (e) => {
      checkpoint();
      apply(
        (s) =>
          (s.groups
            .flatMap((g) => g.logos)
            .find((l) => l.id === logo.id).scale = Math.max(
            0.25,
            Math.min(2, +e.target.value / 100 || 1),
          )),
      );
      renderPanel();
    };
    properties.querySelector("#sponsorLogoReset").onclick = () => {
      checkpoint();
      apply(
        (s) =>
          (s.groups
            .flatMap((g) => g.logos)
            .find((l) => l.id === logo.id).scale = 1),
      );
      renderPanel();
    };
  }
}
async function sponsorRenderSettings() {
  const root = $("#settings-panel-sponsors");
  if (!root) return;
  root.innerHTML = '<p role="status">Sponsorgruppen werden geladen …</p>';
  try {
    await sponsorLoadGroups(true);
    root.innerHTML = `<h3>Sponsorgruppen</h3><p>Hier verwaltest du Vorlagen für dieses Gerät. Verwendete Logos werden in MKW-Dateien eingebettet. Änderungen und Löschungen hier verändern bestehende Projektleisten nicht.</p><button id="newSponsorGroup">Gruppe hinzufügen</button><p class="sponsor-order-help" id="sponsorOrderHelp">Logos ziehen, um sie zu sortieren oder in eine andere Gruppe zu verschieben. Tastatur: Alt + Pfeiltasten.</p><div id="sponsorLibraryGroups">${sponsorGroups.map((g) => `<section class="sponsor-library-group" data-library-group="${esc(g.id)}"><div class="sponsor-project-heading"><label>Gruppenname<input data-sponsor-name="${esc(g.id)}" value="${esc(g.name)}" maxlength="80"></label><button class="icon-button" data-sponsor-move="${esc(g.id)}" data-direction="-1" aria-label="Gruppe nach vorne: ${esc(g.name)}">${studioIcon("up")}</button><button class="icon-button" data-sponsor-move="${esc(g.id)}" data-direction="1" aria-label="Gruppe nach hinten: ${esc(g.name)}">${studioIcon("down")}</button><button class="icon-button" data-sponsor-delete="${esc(g.id)}" aria-label="Gruppe löschen: ${esc(g.name)}">${studioIcon("trash")}</button></div><div class="sponsor-library-logos" data-sponsor-drop-group="${esc(g.id)}">${g.logos.map((l) => `<div class="sponsor-library-logo" draggable="true" tabindex="0" data-sponsor-drag="${esc(l.id)}" data-source-group="${esc(g.id)}" aria-label="${esc(l.name)} · Logo verschieben" aria-describedby="sponsorOrderHelp" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"><i class="sponsor-drag-handle" aria-hidden="true">${studioIcon("move")}</i><img src="${esc(l.thumb || "")}" alt="" draggable="false"><span>${esc(l.name)}</span><button class="icon-button" data-library-logo="${esc(l.id)}" data-library-group="${esc(g.id)}" aria-label="Logo aus Bibliothek entfernen: ${esc(l.name)}">${studioIcon("trash")}</button></div>`).join("")}</div><button data-sponsor-upload="${esc(g.id)}">Logos hinzufügen</button></section>`).join("")}</div><p id="sponsorLibraryStatus" role="status"></p>`;
    const save = async (assets) => {
      await MKWSponsorLibrary.save(sponsorGroups, assets);
      sponsorRefreshOptions();
    };
    sponsorBindOrdering(root, save);
    $("#newSponsorGroup").onclick = async () => {
      if (sponsorGroups.length >= 20)
        return status("Maximal 20 Sponsorgruppen.");
      sponsorGroups.push({ id: uid(), name: "Neue Gruppe", logos: [] });
      await save();
      await sponsorRenderSettings();
    };
    root.querySelectorAll("[data-sponsor-name]").forEach(
      (input) =>
        (input.onchange = async () => {
          sponsorGroups.find((g) => g.id === input.dataset.sponsorName).name =
            input.value.trim().slice(0, 80) || "Sponsorgruppe";
          await save();
        }),
    );
    root.querySelectorAll("[data-sponsor-move]").forEach(
      (btn) =>
        (btn.onclick = async () => {
          const index = sponsorGroups.findIndex(
              (g) => g.id === btn.dataset.sponsorMove,
            ),
            target = Math.max(
              0,
              Math.min(
                sponsorGroups.length - 1,
                index + Number(btn.dataset.direction),
              ),
            );
          if (index === target) return;
          const [group] = sponsorGroups.splice(index, 1);
          sponsorGroups.splice(target, 0, group);
          await save();
          await sponsorRenderSettings();
        }),
    );
    root.querySelectorAll("[data-sponsor-delete]").forEach(
      (btn) =>
        (btn.onclick = async () => {
          sponsorGroups = sponsorGroups.filter(
            (g) => g.id !== btn.dataset.sponsorDelete,
          );
          await save();
          await sponsorRenderSettings();
        }),
    );
    root.querySelectorAll("[data-library-logo]").forEach(
      (btn) =>
        (btn.onclick = async () => {
          const g = sponsorGroups.find(
            (g) => g.id === btn.dataset.libraryGroup,
          );
          g.logos = g.logos.filter((l) => l.id !== btn.dataset.libraryLogo);
          await save();
          await sponsorRenderSettings();
        }),
    );
    root.querySelectorAll("[data-sponsor-upload]").forEach(
      (btn) =>
        (btn.onclick = () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".png,.svg,.jpg,.jpeg,.webp";
          input.multiple = true;
          input.id = "sponsorUploadInput";
          input.hidden = true;
          $("#sponsorUploadInput")?.remove();
          root.append(input);
          input.oncancel = () => input.remove();
          input.onchange = async () => {
            input.remove();
            const group = sponsorGroups.find(
              (g) => g.id === btn.dataset.sponsorUpload,
            );
            if (!group) return;
            const controls = [...root.querySelectorAll("button,input")];
            for (const control of controls) control.disabled = true;
            let count = 0;
            try {
              for (const file of input.files) {
                if (group.logos.length >= 30)
                  throw Error("Maximal 30 Logos pro Gruppe.");
                $("#sponsorLibraryStatus").textContent =
                  `Logo ${++count} / ${input.files.length}: ${file.name} · Freistellen und optische Grösse berechnen …`;
                await new Promise((r) => requestAnimationFrame(r));
                const asset = await sponsorImport(file);
                group.logos.push(
                  (({ data, purpose, background, ...meta }) => meta)(asset),
                );
                await save([asset]);
              }
              await sponsorRenderSettings();
            } catch (e) {
              $("#sponsorLibraryStatus").textContent = e.message;
              for (const control of controls) control.disabled = false;
            }
          };
          input.click();
        }),
    );
  } catch (e) {
    root.textContent =
      "Sponsorbibliothek konnte nicht geladen werden: " + e.message;
  }
}
document.addEventListener(
  "toggle",
  (event) => {
    if (event.target.matches?.(".text-type-picker") && event.target.open)
      sponsorLoadGroups()
        .then(sponsorRefreshOptions)
        .catch((e) => status(e.message));
  },
  true,
);
document.addEventListener("click", (event) => {
  const settings = event.target.closest?.("[data-sponsor-settings]"),
    edit = event.target.closest?.("[data-sponsor-edit]");
  if (settings) {
    $("#settings").click();
    $("#settings-tab-sponsors").click();
  }
  if (edit) sponsorOpenProperties(edit.dataset.sponsorEdit);
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  try {
    if (el.matches("[data-sponsor-group]"))
      await sponsorToggleGroup(
        el.dataset.sponsorImage,
        el.dataset.sponsorGroup,
        el.checked,
      );
    if (el.matches("[data-sponsor-enable]")) {
      await sponsorLoadGroups();
      const b = p.boards.find((b) => b.imageId === el.dataset.sponsorEnable);
      if (!b) return;
      if (!b.sponsors?.groups.length && el.checked) {
        if (!sponsorGroups.some((g) => g.logos.length)) {
          el.checked = false;
          $("#settings").click();
          $("#settings-tab-sponsors").click();
          return;
        }
        checkpoint();
        const config = clone(b.sponsors || sponsorDefaults());
        config.enabled = true;
        sponsorApply(b.imageId, config);
        sponsorOpenProperties(b.imageId);
      } else {
        checkpoint();
        const config = clone(b.sponsors || sponsorDefaults());
        config.enabled = el.checked;
        sponsorApply(b.imageId, config);
        sponsorOpenProperties(b.imageId);
      }
    }
  } catch (e) {
    status(e.message);
  }
});
