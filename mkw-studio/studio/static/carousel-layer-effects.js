"use strict";
const carouselEffectTypes = [
  { key: "blur", name: "Gaussscher Weichzeichner", unit: "px", initial: 8 },
  { key: "noise", name: "Rauschen · monochrom", unit: "%", initial: 12 },
];
function carouselCloseEffectMenu() {
  const menu = $("#carouselEffectMenu");
  if (menu?.matches(":popover-open")) menu.hidePopover();
  menu?.remove();
}
function carouselCloseEffectEditor() {
  const popup = $("#carouselEffectEditor");
  if (popup?.matches(":popover-open")) popup.hidePopover();
  popup?.remove();
}
function carouselOpenEffectEditor(o, effect) {
  if (carouselObjectLocked(o)) return;
  carouselCloseEffectEditor();
  $("#carouselEffectEditor")?.remove();
  const project = p,
    popup = document.createElement("div");
  popup.id = "carouselEffectEditor";
  popup.className = "carousel-effect-editor";
  popup.setAttribute("popover", "auto");
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-labelledby", "carouselEffectTitle");
  popup.innerHTML = `<div class="carousel-effect-editor-heading"><h3 id="carouselEffectTitle">${effect.name}</h3><button data-effect-close aria-label="Effekteinstellungen schliessen">${studioIcon("close")}</button></div><p>${esc(o.name)}</p><label class="carousel-effect-strength" for="carouselEffectStrength">Stärke <span><input id="carouselEffectNumber" type="number" min="0" max="100" step="1" value="${o.effects[effect.key]}" aria-label="${effect.name}: ${effect.unit}">${effect.unit}</span></label><input id="carouselEffectStrength" type="range" min="0" max="100" step="1" value="${o.effects[effect.key]}" aria-label="${effect.name}: Stärke"><div class="carousel-effect-editor-footer"><label><input id="carouselEffectEnabled" type="checkbox" ${o.effects[effect.key + "Enabled"] !== false ? "checked" : ""}> Effekt sichtbar</label><button data-effect-done>Fertig</button></div>`;
  document.body.append(popup);
  let begun = false;
  const editable = () =>
    p === project &&
    p.carousel?.objects.includes(o) &&
    !carouselObjectLocked(o) &&
    o.effects?.[effect.key] !== undefined;
  const begin = () => {
    if (!begun) {
      checkpoint();
      begun = true;
    }
  };
  popup
    .querySelectorAll("[data-effect-close],[data-effect-done]")
    .forEach((button) => (button.onclick = carouselCloseEffectEditor));
  for (const id of ["carouselEffectStrength", "carouselEffectNumber"]) {
    const input = popup.querySelector("#" + id);
    input.oninput = () => {
      if (!editable()) return carouselCloseEffectEditor();
      if (!input.value || !input.validity.valid) return;
      begin();
      o.effects[effect.key] = +input.value;
      for (const name of ["carouselEffectStrength", "carouselEffectNumber"])
        if (name !== id) popup.querySelector("#" + name).value = input.value;
      const summary = $(
        `[data-layer-effects="${o.id}"] [data-effect-summary="${effect.key}"]`,
      );
      if (summary) summary.textContent = input.value + " " + effect.unit;
      changed(false);
    };
  }
  popup.querySelector("#carouselEffectEnabled").onchange = (event) => {
    if (!editable()) return carouselCloseEffectEditor();
    begin();
    o.effects[effect.key + "Enabled"] = event.target.checked;
    carouselForgetEffect(o);
    changed(false);
    carouselLayerPanel();
  };
  popup.addEventListener("toggle", (event) => {
    if (event.newState === "closed") popup.remove();
  });
  popup.showPopover();
  const sidebar = $("#carouselSidebar").getBoundingClientRect(),
    bounds = popup.getBoundingClientRect();
  popup.style.left =
    Math.max(
      8,
      Math.min(innerWidth - bounds.width - 8, sidebar.left - bounds.width - 20),
    ) + "px";
  popup.style.top = Math.max(76, (innerHeight - bounds.height) / 2) + "px";
  popup.querySelector("#carouselEffectStrength").focus();
}
function carouselOpenEffectMenu(button) {
  if ($("#carouselEffectMenu")?.matches(":popover-open")) {
    carouselCloseEffectMenu();
    return;
  }
  const project = p,
    items = carouselSelected().filter((o) => !carouselObjectLocked(o));
  if (!items.length) return;
  $("#carouselEffectMenu")?.remove();
  const menu = document.createElement("div");
  menu.id = "carouselEffectMenu";
  menu.className = "carousel-effect-menu";
  menu.setAttribute("popover", "auto");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Ebeneneffekt hinzufügen");
  menu.innerHTML = `<strong>Effekt hinzufügen</strong><p>Für ${items.length === 1 ? esc(items[0].name) : items.length + " ausgewählte Ebenen"}</p>${carouselEffectTypes.map((effect) => `<button role="menuitem" data-add-effect="${effect.key}"><span>${effect.name}</span>${studioIcon("plus")}</button>`).join("")}`;
  menu.addEventListener("toggle", (event) => {
    button.setAttribute("aria-expanded", String(event.newState === "open"));
    if (event.newState === "closed") menu.remove();
  });
  menu.querySelectorAll("[data-add-effect]").forEach((choice) => {
    choice.onclick = () => {
      if (p !== project) return carouselCloseEffectMenu();
      const effect = carouselEffectTypes.find(
          (v) => v.key === choice.dataset.addEffect,
        ),
        targets = items.filter(
          (o) => p.carousel.objects.includes(o) && !carouselObjectLocked(o),
        );
      if (!targets.length) return carouselCloseEffectMenu();
      checkpoint();
      for (const o of targets) {
        o.effects ??= {};
        o.effects[effect.key] ??= effect.initial;
        o.effects[effect.key + "Enabled"] = true;
      }
      carouselCloseEffectMenu();
      changed(false);
      carouselPanel();
      carouselOpenEffectEditor(targets[0], effect);
    };
  });
  document.body.append(menu);
  MKWUIMenu.open(menu, button);
}
function carouselLayerEffects(root, heading) {
  let button = $("#carouselAddEffect");
  if (!button) {
    button = document.createElement("button");
    button.id = "carouselAddEffect";
    button.textContent = "FX";
    button.title = "Effekt für ausgewählte Ebene hinzufügen";
    button.setAttribute("aria-label", "Ebeneneffekt hinzufügen");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.onclick = () => carouselOpenEffectMenu(button);
    MKWUIMenu.trigger(button);
    heading.insertBefore(button, $("#carouselNewFolder"));
  }
  button.disabled = !carouselSelected().some((o) => !carouselObjectLocked(o));
  root.querySelectorAll(".carousel-layer").forEach((layer) => {
    const o = p.carousel.objects.find((o) => o.id === layer.dataset.layer),
      effects = carouselEffectTypes.filter(
        (e) => o.effects?.[e.key] !== undefined,
      );
    const box = document.createElement("div"),
      list = document.createElement("div");
    box.className = "carousel-layer-box";
    const folder = carouselFolder(o);
    if (folder) {
      box.classList.add("in-folder");
      box.style.setProperty("--folder-colour", carouselFolderColour(folder));
    }
    box.hidden = layer.hidden;
    box.ondragover = layer.ondragover;
    box.ondragleave = layer.ondragleave;
    box.ondrop = layer.ondrop;
    list.className = "carousel-layer-effects";
    list.dataset.layerEffects = o.id;
    list.setAttribute("aria-label", `Effekte: ${o.name}`);
    layer.before(box);
    box.append(layer);
    if (effects.length) box.append(list);
    for (const effect of effects) {
      const row = document.createElement("div"),
        enabled = o.effects[effect.key + "Enabled"] !== false,
        locked = carouselObjectLocked(o);
      row.className = "carousel-effect-row";
      row.classList.toggle("is-disabled", !enabled);
      row.dataset.effectRow = effect.key;
      row.innerHTML = `<div class="carousel-effect-heading"><button data-effect-toggle="${effect.key}" aria-label="${effect.name} ein-/ausblenden" aria-pressed="${enabled}" ${locked ? "disabled" : ""}>${studioIcon(enabled ? "visible" : "hidden")}</button><button class="carousel-effect-name" data-effect-edit="${effect.key}" aria-label="${effect.name} einstellen" ${locked ? "disabled" : ""}><span>${effect.name}</span><small data-effect-summary="${effect.key}">${o.effects[effect.key]} ${effect.unit}</small></button><button data-effect-remove="${effect.key}" aria-label="${effect.name} entfernen" title="Effekt entfernen" ${locked ? "disabled" : ""}>${studioIcon("trash")}</button></div>`;
      row.querySelector("[data-effect-edit]").onclick = () =>
        carouselOpenEffectEditor(o, effect);
      row.querySelector("[data-effect-toggle]").onclick = () => {
        if (carouselObjectLocked(o)) return;
        checkpoint();
        o.effects[effect.key + "Enabled"] = !enabled;
        carouselForgetEffect(o);
        changed(false);
        carouselLayerPanel();
      };
      row.querySelector("[data-effect-remove]").onclick = () => {
        if (carouselObjectLocked(o)) return;
        checkpoint();
        carouselCloseEffectEditor();
        delete o.effects[effect.key];
        delete o.effects[effect.key + "Enabled"];
        if (!Object.keys(o.effects).length) delete o.effects;
        carouselForgetEffect(o);
        changed(false);
        carouselLayerPanel();
      };
      list.append(row);
    }
  });
}
