"use strict";
const MKWCampaignUI = (() => {
  const decorated = new WeakMap();
  const openOptions = new Set();
  const previewObservers = new Set();
  function releaseCards() {
    MKWCampaignCardUI.release();
    for (const observer of previewObservers) observer.disconnect();
    previewObservers.clear();
  }
  let optionsProject = null;
  const active = () => !!p.campaign;

  const {
    base,
    newState,
    rowFor,
    candidate,
    sync,
    room,
    place,
    append,
    importPhotos,
  } = MKWCampaignDocument;
  function fit() {
    const c = p.carousel;
    if (!c?.n) return;
    const a = c.artboards[carouselUI.slide ?? 0] || c.artboards[0],
      row = rowFor(a.id),
      frames = row.pages.map((id) => c.artboards.find((a) => a.id === id)),
      v = $("#carouselViewport"),
      width = Math.max(...frames.map((a) => a.x + a.w));
    carouselSetZoom(
      Math.max(
        0.05,
        Math.min(
          0.6,
          (v.clientWidth - 80) / width,
          (v.clientHeight - 140) / Math.max(...frames.map((a) => a.h)),
        ),
      ),
    );
    carouselSlideCenter(c.artboards.findIndex((f) => f.id === a.id));
  }
  function change(fn, record = true, full = true) {
    const before = snapshot();
    try {
      fn();
      const next = {
        ...p,
        carousel: clone(p.carousel),
        campaign: clone(p.campaign),
      };
      MKWCampaignModel.reconcile(next, uid);
      validate(next);
      validateCarousel(next);
      if (record) {
        history.push(before);
        if (history.length > 30) history.shift();
        future = [];
      }
      changed(full);
    } catch (error) {
      p = before;
      render();
      status("Änderung nicht übernommen: " + error.message);
    }
  }
  function decorate(o, project = p) {
    if (!project.campaign || o.type !== "text") return o;
    const row = rowFor(o.pageId, project);
    if (!row?.family) return o;
    const signature = JSON.stringify(o),
      cached = decorated.get(o);
    if (cached?.signature === signature) return cached.value;
    const next = { ...o, characterStyles: [] };
    if (o.campaignRole === "copyright") {
      next.color = MKWFamily.copyrightColor(o.color);
      next.characterStyles = (o.characterStyles || []).map((s) => ({
        ...s,
        color: next.color,
      }));
      decorated.set(o, { signature, value: next });
      return next;
    }
    next.characterStyles = o.characterStyles || [];
    next.family = o.family ?? true;
    decorated.set(o, { signature, value: next });
    return next;
  }
  function adoptOptions(row) {
    const c = p.carousel;
    for (const id of row.pages) {
      const a = c.artboards.find((a) => a.id === id),
        b = p.boards.find((b) => b.campaignPage === id),
        bg = c.objects.find(
          (o) => o.pageId === id && o.campaignRole === "background",
        );
      a.bg = row.family ? row.background || "#f4efdf" : b.bg;
      b.family = {
        ...MKWFamily.defaults(),
        enabled: !!row.family,
        background: row.background || "#f4efdf",
      };
      if (row.angle)
        b.angle = MKWPostAngle.defaults(b, {
          direction: row.direction || "left",
        });
      else delete b.angle;
      const old = c.objects.find(
        (o) => o.pageId === id && o.campaignRole === "angle",
      );
      if (row.angle) {
        if (!old) {
          const geometry = MKWPostAngle.geometry({
            ...b,
            angle: MKWPostAngle.defaults(b, {
              direction: row.direction || "left",
            }),
          });
          const g = geometry.o;
          const o = base("angle", a, {
            ...g,
            x: a.x + g.x,
            y: a.y + g.y,
            campaignRole: "angle",
            campaignLocal: true,
            imageId: bg.imageId,
            imageSourceId: bg.id,
            scale: 1.12,
            panX: 24,
            panY: -24,
          });
          c.objects.push(o);
        } else old.direction = row.direction || "left";
      } else if (old) c.objects = c.objects.filter((o) => o !== old);
    }
  }
  function cards(root) {
    if (optionsProject !== p.projectId) {
      openOptions.clear();
      optionsProject = p.projectId;
    }
    let host = root.querySelector(".campaign-cards");
    if (!host) {
      root.replaceChildren();
      host = document.createElement("div");
      host.className = "campaign-cards";
      root.append(host);
    }
    const c = p.carousel,
      signature = JSON.stringify([
        p.campaign.rows,
        p.images.map((i) => [i.id, i.name]),
        c.artboards.map((a) => [a.id, a.x, a.y]),
        carouselZoom,
      ]);
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    releaseCards();
    host.innerHTML = p.campaign.rows
      .map((row, i) => {
        const im = p.images.find((im) => im.id === row.imageId),
          a = c.artboards.find((a) => a.id === row.pages[0]);
        const master = p.campaign.links.some((l) =>
          c.objects.some(
            (o) => o.id === l.source && row.pages.includes(o.pageId),
          ),
        );
        const sponsors = p.boards.find(
          (b) => b.campaignPage === a.id,
        )?.sponsors;
        return MKWCampaignCardUI.markup({
          row,
          index: i,
          im,
          frame: a,
          height: Math.max(
            ...row.pages.map(
              (id) => c.artboards.find((frame) => frame.id === id).h,
            ),
          ),
          master,
          sponsors,
          open: openOptions.has(im.id),
          count: p.campaign.rows.length,
          copyright:
            p.boards.find((b) => b.campaignPage === a.id)?.elements.copyright
              .text || "",
        });
      })
      .join("");
    host.querySelectorAll("[data-campaign-row]").forEach((card) => {
      const row = p.campaign.rows.find(
        (r) => r.imageId === card.dataset.campaignRow,
      );
      MKWCampaignCardUI.bind(card, (open) =>
        open ? openOptions.add(row.imageId) : openOptions.delete(row.imageId),
      );
      card.querySelector("[data-campaign-sponsors]").onchange = (e) =>
        change(() => {
          for (const page of row.pages) {
            const b = p.boards.find((b) => b.campaignPage === page);
            b.sponsors ??= sponsorDefaults();
            b.sponsors.enabled = e.target.checked;
          }
        });
      const thumb = card.querySelector(".campaign-thumb"),
        im = p.images.find((i) => i.id === row.imageId);
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          previewObservers.delete(observer);
          previewImage(im.data)
            .then((bitmap) => {
              if (!thumb.isConnected) return;
              thumb.width = 460;
              thumb.height = 220;
              const context = thumb.getContext("2d"),
                scale = Math.max(460 / bitmap.width, 220 / bitmap.height);
              context.drawImage(
                bitmap,
                (460 - bitmap.width * scale) / 2,
                (220 - bitmap.height * scale) / 2,
                bitmap.width * scale,
                bitmap.height * scale,
              );
            })
            .catch(() => {});
        },
        { root: $("#carouselViewport"), rootMargin: "200px" },
      );
      previewObservers.add(observer);
      observer.observe(thumb);
      card._previewObserver = observer;
      for (const [selector, key] of [
        ["[data-campaign-angle]", "angle"],
        ["[data-campaign-family]", "family"],
        ["[data-campaign-direction]", "direction"],
        ["[data-campaign-background]", "background"],
      ]) {
        const input = card.querySelector(selector);
        let began = false;
        if (input)
          input.onchange = () => {
            change(
              () => {
                const live = p.campaign.rows.find(
                  (r) => r.imageId === row.imageId,
                );
                live[key] =
                  input.type === "checkbox" ? input.checked : input.value;
                adoptOptions(live);
              },
              key !== "background" || !began,
              key !== "background",
            );
            began = true;
          };
      }
      card.querySelector("[data-campaign-copyright]").onchange = (e) =>
        change(() => {
          for (const page of row.pages) {
            const a = c.artboards.find((a) => a.id === page),
              b = p.boards.find((b) => b.campaignPage === page);
            b.elements.copyright.text = MKWLayout.copyrightText(e.target.value);
            b.elements.copyright.visible = true;
            let o = c.objects.find(
              (o) => o.pageId === page && o.campaignRole === "copyright",
            );
            if (!o) {
              const standard = textBlock(b).copyright;
              o = base("text", a, {
                name: "Copyright",
                campaignRole: "copyright",
                campaignLocal: true,
                x: a.x + standard.x,
                y: a.y + standard.y,
                w: Math.max(1, standard.w + 1),
                h: standard.h,
                angle: standard.angle,
                size: standard.size,
                font: standard.role,
                textAlign: "left",
                color: standard.color,
              });
              c.objects.push(o);
            }
            o.text = b.elements.copyright.text;
            o.w = Math.max(1, measureTextWidth(o.text, o.size, o.font) + 1);
          }
        });
      card.querySelectorAll("[data-campaign-action]").forEach(
        (button) =>
          (button.onclick = (e) => {
            e.stopPropagation();
            const action = button.dataset.campaignAction;
            if (action === "open") {
              carouselSlideSelect(
                c.artboards.findIndex((a) => a.id === row.pages[0]),
              );
              fit();
            } else if (action === "up" || action === "down")
              change(() => {
                const at = p.campaign.rows.findIndex(
                    (r) => r.imageId === row.imageId,
                  ),
                  to = at + (action === "up" ? -1 : 1);
                if (to < 0 || to >= p.campaign.rows.length) return;
                const [r] = p.campaign.rows.splice(at, 1);
                p.campaign.rows.splice(to, 0, r);
                place(p);
              });
            else if (action === "remove") removeRow(row);
            else if (action === "replace") replacePhoto(row);
            else if (action === "format") addFormat(row);
            else sponsors(row);
          }),
      );
    });
    for (const [i, a] of c.artboards.entries()) {
      const button = document.createElement("button");
      button.className = "carousel-slide-tab";
      button.textContent =
        MKW.ratio(a.w, a.h).replace("x", ":") + ` · ${a.w} × ${a.h} px`;
      button.classList.add("campaign-artboard-label");
      button.style.width = a.w * carouselZoom + "px";
      button.title = button.textContent;
      button.style.left = a.x * carouselZoom + "px";
      button.style.top = a.y * carouselZoom - 48 + "px";
      button.onclick = () => carouselSlideSelect(i);
      host.append(button);
    }
  }
  function mount() {
    if (!active()) return;
    document.body.classList.add("campaign-preview");
    const label = $("#carouselEditor .studio-mode-label");
    if (label) label.textContent = "FD-Kampagnen";
    const rail = $(".carousel-toolrail");
    if (rail && !$("#campaignAdd")) {
      const button = document.createElement("button");
      button.id = "campaignAdd";
      button.innerHTML = studioIcon("plus") + "<span>Bilder hinzufügen</span>";
      button.onclick = () => $("#files").click();
      rail.prepend(button);
    }
  }
  function panel(host, items) {
    if (!active()) return false;
    const c = p.carousel;
    if (!items.length) {
      const a = c.artboards[carouselUI.slide ?? 0] || c.artboards[0];
      host.innerHTML = `<h3>FD-Kampagnen</h3><p>Gestalte die erste Ausgabe eines Formats. Gleiche Formate übernehmen das Design. Bei weiteren Bildern bleibt jede Eigenschaft einzeln anpassbar.</p><button id="campaignImport">Bilder hinzufügen</button>${a ? `<p>${esc(a.name)} · ${a.w} × ${a.h} px</p>` : ""}`;
      host.querySelector("#campaignImport").onclick = () => $("#files").click();
      return true;
    }
    return false;
  }
  function scopePanel(host, items) {
    if (!active() || !items.length) return;
    const o = items[0],
      link = p.campaign.links.find(
        (l) => l.source === o.id || l.targets.some((t) => t.id === o.id),
      ),
      target = link?.targets.find((t) => t.id === o.id),
      section = document.createElement("section");
    section.className = "campaign-link-info";
    section.innerHTML = `<strong>${!link ? "Nur diese Ausgabe" : target ? (target.overrides.length ? "Einzeln angepasst" : "Mit Formatvorlage verbunden") : "Formatvorlage"}</strong><p>${!link ? "Zusätzliche Bilder werden nicht übernommen." : target ? "Text, Position und Gestaltung können getrennt angepasst werden." : "Änderungen werden auf gleiche Formate übernommen."}</p>${target ? '<button id="campaignRelink">Alle Eigenschaften der Formatvorlage übernehmen</button>' : ""}`;
    if (items.length === 1) {
      const label = document.createElement("label");
      label.textContent = "Drehung (°)";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "-360";
      input.max = "360";
      input.step = "any";
      input.value = o.angle || 0;
      input.setAttribute("data-campaign-rotation", "");
      label.append(input);
      section.append(label);
      input.onchange = () => {
        if (MKWFields.validate(input, true))
          change(() => {
            o.angle = +input.value;
          });
      };
    }
    host.prepend(section);
    if (target)
      section.querySelector("button").onclick = () =>
        change(() => MKWCampaignModel.reset(p, o.id));
  }
  async function textChoice(rect) {
    const c = p.carousel,
      a = MKWCarouselPolicy.sourcePage(c, rect),
      texts = c.objects.filter(
        (o) =>
          o.type === "text" &&
          o.pageId !== a?.id &&
          o.campaignRole !== "copyright" &&
          o.text.trim(),
      );
    const recent = [...texts]
      .reverse()
      .filter((o, i, list) => list.findIndex((v) => v.text === o.text) === i);
    if (!recent.length) return {};
    return MKWCampaignTextChoice.open(rect, recent, c);
  }

  async function replacePhoto(row) {
    const project = p;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file || p !== project) return;
      busy = true;
      try {
        const normalized = await (await api("/api/import", file)).json(),
          im = {
            ...normalized,
            id: row.imageId,
            name: file.name,
            original: normalized.data,
          };
        await image(im.data);
        if (p !== project) return;
        checkpoint();
        p.images = p.images.map((a) => (a.id === im.id ? im : a));
        changed();
      } catch (e) {
        status(e.message);
      } finally {
        busy = false;
      }
    };
    input.click();
  }
  async function removeRow(row) {
    const yes = await MKWFeedback.ask({
      title: "Bild mit allen Ausgaben entfernen?",
      message: "Die Bildreihe wird entfernt. Rückgängig stellt sie wieder her.",
      confirm: "Entfernen",
    });
    if (!yes) return;
    change(() => {
      const ids = new Set(row.pages);
      p.carousel.objects = p.carousel.objects.filter((o) => !ids.has(o.pageId));
      p.carousel.artboards = p.carousel.artboards.filter((a) => !ids.has(a.id));
      p.boards = p.boards.filter((b) => !ids.has(b.campaignPage));
      p.campaign.rows = p.campaign.rows.filter(
        (r) => r.imageId !== row.imageId,
      );
      for (const link of p.campaign.links) {
        if (!p.carousel.objects.some((o) => o.id === link.source)) {
          const next = link.targets.find(
            (t) => t.id && p.carousel.objects.some((o) => o.id === t.id),
          );
          if (next) {
            link.source = next.id;
            link.last = MKWCampaignModel.values(
              p.carousel.objects.find((o) => o.id === next.id),
              p.carousel.artboards.find((a) => a.id === next.page),
            );
          }
        }
        link.targets = link.targets.filter(
          (t) => !ids.has(t.page) && t.id !== link.source,
        );
      }
      place(p);
    });
  }
  async function addFormat(row) {
    const project = p;
    const dialog = document.createElement("dialog");
    dialog.className = "campaign-format-dialog";
    dialog.innerHTML =
      '<h2>Format hinzufügen</h2><label>Breite<input type="number" data-w min="240" max="4000" value="1080"></label><label>Höhe<input type="number" data-h min="240" max="4000" value="1350"></label><p role="status"></p><button data-cancel>Abbrechen</button><button data-add>Hinzufügen</button>';
    dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
    dialog.querySelector("[data-add]").onclick = async () => {
      const w = +dialog.querySelector("[data-w]").value,
        h = +dialog.querySelector("[data-h]").value,
        im = p.images.find((i) => i.id === row.imageId);
      if (
        p.carousel.artboards.some(
          (a) => row.pages.includes(a.id) && a.w === w && a.h === h,
        )
      ) {
        dialog.querySelector("p").textContent =
          "Dieses Format ist schon vorhanden.";
        return;
      }
      const q = candidate(),
        b = basicBoard(im, w, h);
      const previous = p.boards.find((b) => row.pages.includes(b.campaignPage));
      if (previous?.family) b.family = clone(previous.family);
      if (previous?.angle) b.angle = clone(previous.angle);
      if (previous?.sponsors) b.sponsors = clone(previous.sponsors);
      b.safe = {
        top: 100,
        bottom: Math.min(200, h - 101),
        left: 100,
        right: 100,
      };
      try {
        const prior = q.campaign.rows.find((r) => r.imageId === row.imageId);
        await append(q, im, [b]);
        if (p !== project || !dialog.open) return;
        prior.pages.push(...q.campaign.rows.pop().pages);
        place(q);
        MKWCampaignModel.reconcile(q, uid);
        validate(q);
        validateCarousel(q);
        checkpoint();
        Object.assign(p, {
          boards: q.boards,
          carousel: q.carousel,
          campaign: q.campaign,
        });
        changed();
        dialog.close();
      } catch (e) {
        dialog.querySelector("p").textContent = e.message;
      }
    };
    dialog.onclose = () => dialog.remove();
    document.body.append(dialog);
    dialog.showModal();
  }
  async function sponsors(row) {
    const project = p;
    const groups = await sponsorLoadGroups(),
      b = p.boards.find((b) => row.pages.includes(b.campaignPage)),
      config = clone(b.sponsors || sponsorDefaults()),
      dialog = document.createElement("dialog");
    if (p !== project) return;
    dialog.className = "campaign-sponsor-dialog";
    dialog.innerHTML = `<h2>Sponsorenleiste</h2><label><input type="checkbox" data-enabled ${config.enabled ? "checked" : ""}>Sponsorenleiste anzeigen</label><label>Balkenfarbe<input type="color" data-colour value="${esc(config.colour)}"></label><label>Höhe<input type="number" min="120" max="600" data-height value="${config.height}"></label><fieldset><legend>Sponsorgruppen</legend>${groups.map((g) => `<label><input type="checkbox" data-group="${esc(g.id)}" ${config.groups.some((v) => v.id === g.id) ? "checked" : ""}>${esc(g.name)}</label>`).join("") || "<p>Lege Gruppen zuerst in den Einstellungen an.</p>"}</fieldset><button data-cancel>Abbrechen</button><button data-apply>Übernehmen</button>`;
    dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
    dialog.querySelector("[data-apply]").onclick = async () => {
      const height = +dialog.querySelector("[data-height]").value;
      if (!Number.isFinite(height) || height < 120 || height > 600) return;
      const selectedGroups = groups.filter(
        (g) =>
          dialog.querySelector(`[data-group="${CSS.escape(g.id)}"]`).checked,
      );
      const assets = await Promise.all(
        selectedGroups.flatMap((g) =>
          g.logos.map((l) => MKWSponsorLibrary.logo(l.id)),
        ),
      );
      if (p !== project || !dialog.open) return;
      if (assets.some((a) => !a)) {
        status("Sponsorlogo fehlt in der Bibliothek.");
        return;
      }
      change(() => {
        for (const asset of assets)
          if (!p.logos.some((a) => a.id === asset.id)) {
            const { thumb, ...portable } = asset;
            p.logos.push(portable);
          }
        const next = {
          ...config,
          enabled: dialog.querySelector("[data-enabled]").checked,
          colour: dialog.querySelector("[data-colour]").value,
          height,
          groups: groups
            .filter(
              (g) =>
                dialog.querySelector(`[data-group="${CSS.escape(g.id)}"]`)
                  .checked,
            )
            .map((g) => ({
              ...clone(g),
              enabled: true,
              logos: g.logos.map(({ thumb, ...l }) => ({
                ...l,
                mode: "auto",
                scale: 1,
              })),
            })),
        };
        for (const page of row.pages)
          p.boards.find((b) => b.campaignPage === page).sponsors = clone(next);
      });
      dialog.close();
    };
    dialog.onclose = () => dialog.remove();
    document.body.append(dialog);
    dialog.showModal();
  }
  async function paintDecorations(ctx, project, slide) {
    if (!project.campaign) return;
    for (const [i, b] of project.boards.entries()) {
      if (slide !== null && slide !== i) continue;
      const a = project.carousel.artboards[i];
      ctx.save();
      ctx.translate(a.x, a.y);
      await paintSponsors(ctx, b, { project });
      ctx.restore();
    }
  }
  async function convert({ confirmed = false } = {}) {
    if (busy || p.carousel || p.campaign) return;
    const accepted =
      confirmed ||
      (await MKWFeedback.ask({
        title: "FD-Kampagne umwandeln?",
        message:
          "Das ursprüngliche Projekt bleibt erhalten. Die Kopie erhält gemeinsame Textfelder mit bisherigen Schriftgrössen und den bisherigen Verlauf. Bitte das Ergebnis vor dem Export vergleichen.",
        confirm: "Kopie umwandeln",
      }));
    if (!accepted) return;
    const source = p,
      original = snapshot(),
      q = {
        ...original,
        projectId: uid(),
        campaign: newState(),
        boards: [],
        carousel: undefined,
      };
    q.meta.title = (q.meta.title || "Kampagne") + " · Kopie";
    busy = true;
    status("Kampagne wird umgewandelt …");
    const finishLoading = MKWUIControls.loading("#status");
    try {
      for (const im of original.images) {
        const boards = original.boards
          .filter((b) => b.imageId === im.id)
          .map((b) => clone(b));
        await append(q, im, boards);
        for (const b of boards) {
          if (p !== source) return;
          const a = q.carousel.artboards.find((a) => a.id === b.campaignPage);
          MKWCampaignMigration.add(q, b, a);
          if (b.angle?.enabled) {
            const row = rowFor(a.id, q);
            row.angle = true;
            row.direction = b.angle.direction;
          }
        }
      }
      MKWCampaignModel.reconcile(q, uid);
      validate(q);
      validateCarousel(q);
      if (p !== source) return;
      await MKWProjects.autosave({ writeFile: false });
      if (p !== source) return;
      carouselUI.slide = 0;
      await MKWProjects.startDocument(q);
      if ($("#saveDialog").open) $("#saveDialog").close();
      fit();
      status(
        "FD-Kampagne umgewandelt. Das ursprüngliche Projekt bleibt erhalten. Bitte das Ergebnis vor dem Export vergleichen.",
      );
    } catch (e) {
      status(
        "Umwandlung nicht abgeschlossen. Das ursprüngliche Projekt bleibt erhalten: " +
          e.message,
      );
    } finally {
      busy = false;
      finishLoading();
    }
  }
  function install() {
    const start = document.createElement("button");
    start.id = "startCampaignPreview";
    start.className = "start-mode-card";
    start.disabled = true;
    start.innerHTML =
      studioIcon("image") +
      '<strong>FD-Kampagnen</strong><span>Viele Fotos. Ein einheitliches Layout.</span><small>Gleiche Formate übernehmen dein Design.</small><span class="start-mode-action">Neues Projekt ' +
      studioIcon("plus") +
      "</span>";
    $(".start-mode-grid").prepend(start);
    const old = $("#startNew");
    old.className = "start-backup-link";
    old.textContent = "FD-Kampagnen (Backup)";
    const links = document.createElement("div");
    links.className = "start-home-links";
    const help = $("#startHelp");
    help.before(links);
    links.append(old, help);
    start.onclick = () => MKWProjectSetup.open({ mode: "preview" });
    const convertButton = document.createElement("button");
    convertButton.id = "campaignConvert";
    convertButton.textContent = "In den neuen FD-Ablauf umwandeln";
    convertButton.onclick = convert;
    $("#saveDialog .save-alternatives").append(convertButton);
  }
  return {
    releaseCards,
    active,
    newState,
    sync,
    room,
    importPhotos,
    fit,
    cards,
    mount,
    panel,
    scopePanel,
    textChoice,
    decorate,
    paintDecorations,
    install,
    convert,
  };
})();
