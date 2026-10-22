"use strict";
const MKWUIMenu = (() => {
  const triggers = new WeakSet();
  const items = (menu) => [...menu.querySelectorAll('[role="menuitem"]')];
  function focus(menu, index) {
    const choices = items(menu);
    if (!choices.length) return;
    const next = choices[(index + choices.length) % choices.length];
    for (const item of choices) item.tabIndex = item === next ? 0 : -1;
    next.focus();
  }
  function trigger(button) {
    if (triggers.has(button)) return;
    triggers.add(button);
    button.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key) || button.disabled)
        return;
      event.preventDefault();
      event.stopPropagation();
      button.click();
      const menu = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      if (menu?.matches(":popover-open"))
        focus(menu, event.key === "ArrowUp" ? -1 : 0);
    });
  }
  function open(menu, button) {
    trigger(button);
    button.setAttribute("aria-controls", menu.id);
    for (const item of items(menu)) {
      if (item.disabled) {
        item.disabled = false;
        item.setAttribute("aria-disabled", "true");
      }
      item.tabIndex = -1;
    }
    // Disabled menu choices remain discoverable with arrow keys, never actionable.
    menu.addEventListener(
      "click",
      (event) => {
        if (event.target.closest('[role="menuitem"][aria-disabled="true"]')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    let prefix = "",
      typedAt = 0;
    menu.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const choices = items(menu),
        current = choices.indexOf(document.activeElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        focus(
          menu,
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? -1
              : current + (event.key === "ArrowDown" ? 1 : -1),
        );
      } else if (
        ["Enter", " "].includes(event.key) &&
        document.activeElement?.getAttribute("aria-disabled") === "true"
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") event.preventDefault();
        event.stopPropagation();
        menu.hidePopover();
        if (button.isConnected && button.getClientRects().length)
          button.focus();
      } else if (event.key.length === 1 && event.key.trim()) {
        event.preventDefault();
        event.stopPropagation();
        const letter = event.key.toLocaleLowerCase("de-CH"),
          now = Date.now();
        prefix =
          now - typedAt < 700 && prefix !== letter ? prefix + letter : letter;
        typedAt = now;
        for (let offset = 1; offset <= choices.length; offset++) {
          const index = (current + offset) % choices.length;
          if (
            choices[index].innerText
              .trim()
              .toLocaleLowerCase("de-CH")
              .startsWith(prefix)
          ) {
            focus(menu, index);
            break;
          }
        }
      }
    });
    menu.showPopover();
    let positionFrame = 0;
    const position = () => {
      if (!button.isConnected || !button.getClientRects().length) {
        if (menu.matches(":popover-open")) menu.hidePopover();
        return;
      }
      const rect = button.getBoundingClientRect(),
        bounds = menu.getBoundingClientRect();
      menu.style.left =
        Math.max(
          8,
          Math.min(innerWidth - bounds.width - 8, rect.right - bounds.width),
        ) + "px";
      const above = rect.top - bounds.height - 8;
      menu.style.top =
        Math.max(
          8,
          Math.min(
            innerHeight - bounds.height - 8,
            above >= 8 ? above : rect.bottom + 8,
          ),
        ) + "px";
    };
    const resize = () => {
      cancelAnimationFrame(positionFrame);
      positionFrame = requestAnimationFrame(position);
    };
    window.addEventListener("resize", resize);
    menu.addEventListener("toggle", (event) => {
      if (event.newState !== "closed") return;
      cancelAnimationFrame(positionFrame);
      window.removeEventListener("resize", resize);
    });
    position();
    focus(menu, 0);
  }
  return Object.freeze({ open, trigger });
})();
