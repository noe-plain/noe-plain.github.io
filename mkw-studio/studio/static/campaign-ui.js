"use strict";
const MKWCampaignUI = (() => {
  const decorated = new WeakMap();
  const openOptions = new Set();
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
    let at = 0;
    for (const run of MKWFamily.runs(o.text)) {
      next.characterStyles.push({
        ...MKWText.at(o, at),
        start: at,
        end: at + run.text.length,
        color: run.color,
      });
      at += run.text.length;
    }
    next.campaignFamily = true;
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
        return `<aside class="campaign-card image-info-card ${carouselZoom < 0.22 ? "is-overview" : ""}" data-campaign-row="${esc(im.id)}" aria-label="Bild ${i + 1}: ${esc(im.name)}" style="left:${(a.x - 1000) * carouselZoom}px;top:${a.y * carouselZoom}px;width:${Math.max(80, Math.min(260, 900 * carouselZoom))}px"><div class="campaign-card-heading"><canvas class="campaign-thumb" width="72" height="54" aria-hidden="true"></canvas><div><small>Bild ${i + 1} von ${p.campaign.rows.length}</small><strong title="${esc(im.name)}">${esc(im.name)}</strong></div></div>${master ? '<span class="campaign-master-label">Vorlage für gleiche Formate</span>' : ""}<button class="campaign-overview-action" data-campaign-action="open">Bearbeiten</button><div class="campaign-primary-actions"><button data-campaign-action="replace">${studioIcon("image")}<span>Bild ersetzen</span></button><button data-campaign-action="format">${studioIcon("plus")}<span>Format hinzufügen</span></button></div><div class="campaign-card-actions" role="group" aria-label="Bildreihe verwalten"><button data-campaign-action="up" aria-label="Bildreihe nach oben" ${i === 0 ? "disabled" : ""}>${studioIcon("up")}</button><button data-campaign-action="down" aria-label="Bildreihe nach unten" ${i === p.campaign.rows.length - 1 ? "disabled" : ""}>${studioIcon("down")}</button><button data-campaign-action="remove" aria-label="Bildreihe entfernen">${studioIcon("trash")}</button></div><label>Bildnachweis / Copyright<input data-campaign-copyright placeholder="Bildbeschreibung © Name" value="${esc(p.boards.find((b) => b.campaignPage === a.id)?.elements.copyright.text || "")}"></label><details ${openOptions.has(im.id) ? "open" : ""}><summary>Gestaltungsoptionen</summary><label class="post-option-row"><input type="checkbox" data-campaign-angle ${row.angle ? "checked" : ""}><span>Bildwinkel</span><select aria-label="Winkelrichtung" data-campaign-direction>${MKWAnglePolicy.directions.map((d) => `<option value="${d}" ${row.direction === d ? "selected" : ""}>${{ up: "Oben", left: "Links", down: "Unten" }[d]}</option>`).join("")}</select></label><label class="post-option-row"><input type="checkbox" data-campaign-family ${row.family ? "checked" : ""}><span>Familienkonzert</span></label>${row.family ? `<label>Hintergrundfarbe<input type="color" data-colour-draft data-campaign-background value="${esc(row.background || "#f4efdf")}"></label>` : ""}<label class="post-option-row"><input type="checkbox" data-campaign-sponsors ${sponsors?.enabled ? "checked" : ""}><span>Sponsorenleiste</span></label><button data-campaign-action="sponsors">Sponsoren auswählen</button></details></aside>`;
      })
      .join("");
    host.querySelectorAll("[data-campaign-row]").forEach((card) => {
      const row = p.campaign.rows.find(
        (r) => r.imageId === card.dataset.campaignRow,
      );
      card.querySelector("details").ontoggle = (e) => {
        e.target.open
          ? openOptions.add(row.imageId)
          : openOptions.delete(row.imageId);
      };
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
      previewImage(im.data)
        .then((bitmap) => {
          if (!thumb?.isConnected) return;
          const ctx = thumb.getContext("2d"),
            scale = Math.min(72 / bitmap.width, 54 / bitmap.height);
          ctx.drawImage(
            bitmap,
            0,
            0,
            bitmap.width * scale,
            bitmap.height * scale,
          );
        })
        .catch(() => {});
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
    if (label) label.textContent = "FD-Kampagnen (Vorschau)";
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
      host.innerHTML = `<h3>FD-Kampagnen (Vorschau)</h3><p>Gestalte die erste Ausgabe eines Formats. Gleiche Formate übernehmen das Design. Bei weiteren Bildern bleibt jede Eigenschaft einzeln anpassbar.</p><button id="campaignImport">Bilder hinzufügen</button>${a ? `<p>${esc(a.name)} · ${a.w} × ${a.h} px</p>` : ""}`;
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
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "campaign-text-choice";
      dialog.setAttribute("aria-label", "Text für neues Format");
      dialog.innerHTML = `<h2>Textfeld aufziehen</h2><div class="campaign-text-choice-grid"><button data-new>Neuen Text schreiben</button><section><h3>Vorhandenen Text übernehmen</h3>${recent.map((o) => `<button data-adopt="${esc(o.id)}">${esc(o.text.slice(0, 120))}</button>`).join("")}</section></div><button data-cancel>Abbrechen</button>`;
      let result = null;
      dialog.querySelector("[data-new]").onclick = () => {
        result = {};
        dialog.close();
      };
      dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
      for (const button of dialog.querySelectorAll("[data-adopt]"))
        button.onclick = () => {
          const o = c.objects.find((o) => o.id === button.dataset.adopt);
          result = clone(o);
          for (const k of [
            "id",
            "pageId",
            "folderId",
            "x",
            "y",
            "w",
            "h",
            "campaignRole",
            "campaignLocal",
          ])
            delete result[k];
          dialog.close();
        };
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          resolve(result);
        },
        { once: true },
      );
      document.body.append(dialog);
      dialog.showModal();
    });
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
  async function convert() {
    if (p.carousel || p.campaign) return;
    const accepted = await MKWFeedback.ask({
      title: "Als Vorschau-Kopie weiterarbeiten?",
      message:
        "Deine bestehende Kampagne bleibt erhalten. Die Kopie erhält bearbeitbare Designer-Ebenen. Bitte Typografie und komplexe Ausschnitte vor dem Export vergleichen.",
      confirm: "Vorschau-Kopie erstellen",
    });
    if (!accepted) return;
    const source = p,
      q = {
        ...snapshot(),
        projectId: uid(),
        campaign: newState(),
        boards: [],
        carousel: undefined,
      };
    q.meta.title = (q.meta.title || "Kampagne") + " · Vorschau";
    try {
      for (const im of source.images) {
        const boards = source.boards
          .filter((b) => b.imageId === im.id)
          .map((b) => clone(b));
        await append(q, im, boards);
        for (const b of boards) {
          const a = q.carousel.artboards.find((a) => a.id === b.campaignPage),
            layout = textBlock(b);
          for (const key of ["date", "title", "subtitle", "copyright"]) {
            const e = layout.records.find((record) => record.key === key);
            if (!e?.text || !e.visible) continue;
            q.carousel.objects.push(
              base("text", a, {
                ...clone(b.elements[key]),
                campaignRole: key,
                name: elementNames[key],
                text:
                  key === "copyright"
                    ? MKWLayout.copyrightText(b.elements[key].text)
                    : b.elements[key].text,
                x: a.x + e.x,
                y: a.y + e.y,
                w: Math.max(1, e.w || a.w - a.left - a.right),
                h: Math.max(1, e.h || e.size * 2),
                size: e.size,
                font: e.role,
                textAlign: e.align,
                angle: e.angle || 0,
              }),
            );
          }
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
      await MKWProjects.startDocument(q);
      status(
        "Vorschau-Kopie erstellt. Das ursprüngliche MKW-Projekt bleibt im bisherigen Modus. Bitte Ausschnitte und Typografie vor dem Export vergleichen.",
      );
    } catch (e) {
      status("Umstieg nicht abgeschlossen: " + e.message);
    }
  }
  function install() {
    const start = document.createElement("button");
    start.id = "startCampaignPreview";
    start.className = "start-mode-card";
    start.disabled = true;
    start.innerHTML =
      studioIcon("image") +
      "<strong>FD-Kampagnen (Vorschau)</strong><span>Designer-Werkzeuge für viele Fotos und Formate.</span><small>Individuell anpassbar, je Format verbunden.</small>";
    $(".start-mode-grid").prepend(start);
    const old = $("#startNew");
    old.className = "start-backup";
    old.innerHTML =
      studioIcon("image") +
      "<span><strong>FD-Kampagnen (Backup)</strong><small>Bisherigen Bearbeitungsablauf verwenden.</small></span>";
    $(".start-returning").append(old);
    start.onclick = () => MKWProjectSetup.open({ mode: "preview" });
    const convertButton = document.createElement("button");
    convertButton.id = "campaignConvert";
    convertButton.textContent = "Als FD-Kampagnen-Vorschau weiterarbeiten";
    convertButton.onclick = convert;
    $("#saveDialog .save-alternatives").append(convertButton);
  }
  return {
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
