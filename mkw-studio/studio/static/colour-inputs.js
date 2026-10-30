"use strict";
// Native hex fields are adapters to the same picker, not separate implementations.
function studioColourInputPosition({
  rect,
  width,
  height,
  viewportWidth,
  viewportHeight,
}) {
  const onRight = rect.left + rect.width / 2 > viewportWidth / 2;
  return {
    x: onRight ? rect.left - width - 20 : rect.right + 20,
    y: (viewportHeight - height) / 2,
  };
}
function studioOpenColourInput(input) {
  if (input.disabled) return;
  const project = p,
    selection = p.carousel ? carouselSelection : selected,
    owner = input.closest("dialog[open]"),
    label =
      input.getAttribute("aria-label") ||
      input.closest("label")?.textContent.trim() ||
      "Farbe";
  studioOpenColourPicker({
    anchor: input,
    colour: input.value,
    label,
    position: studioColourInputPosition,
    onBegin: () => {
      if (!owner && !input.hasAttribute("data-colour-draft")) checkpoint();
    },
    isCurrent: () =>
      p === project &&
      (owner
        ? owner.open
        : (p.carousel ? carouselSelection : selected) === selection),
    onChange: (colour) => {
      input.value = colour;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (input.id) {
        const current = document.getElementById(input.id);
        if (current?.type === "color") current.value = colour;
      }
    },
  });
}
document.addEventListener(
  "click",
  (event) => {
    const input = event.target.closest?.('input[type="color"]');
    if (!input) return;
    event.preventDefault();
    studioOpenColourInput(input);
  },
  true,
);
