"use strict";
const MKWPostTextStack = (() => {
  let motion = null,
    frame = 0,
    pending = null;
  const round = (n) => Math.round(n * 100) / 100;
  const pairs = (block) =>
    block.mainRecords.slice(1).map((after, i) => ({
      before: block.mainRecords[i],
      after,
      key: block.mainRecords[i].key + ":" + after.key,
    }));
  const label = (before, after) =>
    elementNames[before] + " → " + elementNames[after];
  function targets(b, before, after) {
    const first = b.imageId === p.images[0]?.id;
    return p.boards.filter(
      (target) =>
        target.imageId === b.imageId ||
        (first &&
          target.elements[before].text === b.elements[before].text &&
          target.elements[after].text === b.elements[after].text),
    );
  }
  function set(b, before, after, value) {
    for (const target of targets(b, before, after)) {
      const box = (target.textBox ??= { offset: 0 }),
        key = before + ":" + after;
      if (value === null) {
        if (box.gaps) {
          delete box.gaps[key];
          if (!Object.keys(box.gaps).length) delete box.gaps;
        }
      } else {
        box.gaps ??= {};
        box.gaps[key] = value;
      }
    }
    changed(false);
  }
  function panel(b, host) {
    host.querySelector(".post-text-stack")?.remove();
    const visible = pairs(textBlock(b, layer));
    if (!visible.length) return;
    const section = document.createElement("section");
    section.className = "tool-section post-text-stack";
    section.innerHTML = `<h3>Abstände im Textstapel</h3>${visible.map(({ before, after, key }) => `<div class="post-stack-control"><label><span>${label(before.key, after.key)}</span><span class="post-stack-unit"><input data-stack-gap="${key}" type="number" min="0" max="${MKWLayout.maxStackGap}" step="0.5" aria-label="Abstand ${label(before.key, after.key)}" value="${round(MKWLayout.stackGap(b, before.key, after.key))}"><span>px</span></span></label><button data-stack-reset="${key}" title="Ursprünglichen Abstand übernehmen" ${b.textBox?.gaps?.[key] === undefined ? "disabled" : ""}>Standard</button></div>`).join("")}`;
    host.append(section);
    section.querySelectorAll("[data-stack-gap]").forEach((input) => {
      const [before, after] = input.dataset.stackGap.split(":");
      let begun = false;
      input.onfocus = () => (begun = false);
      input.oninput = () => {
        const value = Number(input.value);
        if (
          !input.value ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > MKWLayout.maxStackGap
        )
          return;
        if (!begun) {
          checkpoint();
          begun = true;
        }
        set(b, before, after, value);
        syncFields(b);
      };
      input.onblur = () =>
        (input.value = round(MKWLayout.stackGap(b, before, after)));
    });
    section.querySelectorAll("[data-stack-reset]").forEach(
      (button) =>
        (button.onclick = () => {
          checkpoint();
          set(b, ...button.dataset.stackReset.split(":"), null);
          syncFields(b);
        }),
    );
  }
  function syncFields(b) {
    if (selected !== b.id) return;
    for (const input of document.querySelectorAll(
      "#stepPanel [data-stack-gap]",
    )) {
      const [before, after] = input.dataset.stackGap.split(":");
      if (document.activeElement !== input)
        input.value = round(MKWLayout.stackGap(b, before, after));
    }
    for (const button of document.querySelectorAll(
      "#stepPanel [data-stack-reset]",
    ))
      button.disabled =
        b.textBox?.gaps?.[button.dataset.stackReset] === undefined;
  }
  function focusField(key) {
    const input = document.querySelector(
      `#stepPanel [data-stack-gap="${key}"]`,
    );
    input?.focus();
    input?.select();
  }
  function overlay(b, root, block, scale) {
    const group = root.querySelector(".text-group");
    if (step !== "text" || selected !== b.id || !group) return;
    const visible = pairs(block),
      keys = new Set(visible.map((pair) => pair.key));
    group.querySelectorAll("[data-stack-handle]").forEach((el) => {
      if (!keys.has(el.dataset.stackHandle)) el.remove();
    });
    for (const { before, after, key } of visible) {
      let handle = group.querySelector(`[data-stack-handle="${key}"]`);
      if (!handle) {
        handle = document.createElement("button");
        handle.className = "post-stack-gap";
        handle.dataset.stackHandle = key;
        handle.setAttribute("role", "slider");
        handle.setAttribute("aria-orientation", "vertical");
        handle.setAttribute("aria-valuemin", "0");
        handle.setAttribute("aria-valuemax", MKWLayout.maxStackGap);
        handle.innerHTML =
          '<span class="post-stack-gap-line"></span><span class="post-stack-gap-value"></span>';
        handle.onpointerdown = (ev) => begin(ev, b, before.key, after.key);
        handle.ondblclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          focusField(key);
        };
        handle.onkeydown = (ev) => {
          if (
            !["ArrowUp", "ArrowDown", "Home", "End", "Enter"].includes(ev.key)
          )
            return;
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.key === "Enter") {
            focusField(key);
            return;
          }
          const old = MKWLayout.stackGap(b, before.key, after.key),
            delta = ev.shiftKey ? 10 : 1;
          checkpoint();
          set(
            b,
            before.key,
            after.key,
            ev.key === "Home"
              ? 0
              : ev.key === "End"
                ? MKWLayout.maxStackGap
                : Math.max(
                    0,
                    Math.min(
                      MKWLayout.maxStackGap,
                      old + (ev.key === "ArrowUp" ? delta : -delta),
                    ),
                  ),
          );
          syncFields(b);
        };
        group.append(handle);
      }
      const gap = MKWLayout.stackGap(b, before.key, after.key);
      handle.style.top = (before.y + before.h - block.y) * scale + "px";
      handle.style.setProperty("--stack-line-width", block.w * scale + "px");
      handle.setAttribute(
        "aria-label",
        "Abstand " + label(before.key, after.key),
      );
      handle.setAttribute("aria-valuenow", round(gap));
      handle.setAttribute("aria-valuetext", round(gap) + " Pixel");
      handle.title = `${label(before.key, after.key)} · ${round(gap)} px · nach oben ziehen vergrössert · Doppelklick: Wert eingeben`;
      handle.querySelector(".post-stack-gap-value").textContent = round(gap);
    }
  }
  function begin(ev, b, before, after) {
    if (busy || ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    cancel();
    motion = {
      b,
      before,
      after,
      y: ev.clientY,
      value: MKWLayout.stackGap(b, before, after),
      scale: surfaceScale() * textBlock(b, layer).factor,
      project: p,
      begun: false,
      saved: targets(b, before, after).map((target) => [
        target,
        target.textBox ? clone(target.textBox) : null,
      ]),
    };
  }
  function apply(ev) {
    const m = motion;
    if (!m || m.project !== p) return;
    if (step !== "text" || selected !== m.b.id) {
      cancel();
      return;
    }
    const dy = ev.clientY - m.y;
    if (!m.begun && Math.abs(dy) < 2) return;
    if (!m.begun) {
      if (editingText) editingText.el.blur();
      checkpoint();
      m.begun = true;
    }
    set(
      m.b,
      m.before,
      m.after,
      round(
        Math.max(
          0,
          Math.min(
            MKWLayout.maxStackGap,
            m.value - dy / Math.max(0.0001, m.scale),
          ),
        ),
      ),
    );
    syncFields(m.b);
  }
  function flush() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (pending) {
      const ev = pending;
      pending = null;
      apply(ev);
    }
  }
  function cancel() {
    cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
    const m = motion;
    motion = null;
    if (m?.begun && m.project === p) {
      for (const [b, box] of m.saved)
        if (box) b.textBox = box;
        else delete b.textBox;
      changed(false);
      syncFields(m.b);
    }
  }
  window.addEventListener(
    "pointermove",
    (ev) => {
      if (!motion) return;
      ev.preventDefault();
      pending = { clientY: ev.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    },
    { passive: false },
  );
  window.addEventListener("pointerup", () => {
    if (!motion) return;
    flush();
    motion = null;
  });
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", cancel);
  window.addEventListener("keydown", (ev) => {
    if (motion && ev.key === "Escape") {
      ev.preventDefault();
      cancel();
    }
  });
  return { panel, overlay };
})();
