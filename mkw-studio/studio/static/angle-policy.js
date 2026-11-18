(function (root) {
  "use strict";
  const directions = Object.freeze(["up", "left", "down"]);
  const horizontal = (direction) =>
    direction === "left" || direction === "right";
  const accepts = (direction) =>
    directions.includes(direction) || direction === "right";
  const choices = (current) =>
    current === "right" ? [...directions, "right"] : [...directions];
  const defaults = Object.freeze({
    thickness: 200,
    glow: 50,
    glowColor: "#ffffff",
    glowAlpha: 0.8,
  });
  const solid = (o) => o?.angleFillMode === "solid";
  const fill = (o) => ({
    kind: solid(o) ? "solid" : "image",
    colour: o?.angleColour || "#315bcc",
    alpha: o?.opacity ?? 1,
  });
  const paintFields = (o) =>
    Object.fromEntries(
      ["angleFillMode", "angleColour", "opacity"]
        .filter((key) => o[key] !== undefined)
        .map((key) => [key, o[key]]),
    );
  function validateFill(o) {
    if (
      (o.angleFillMode !== undefined &&
        !["image", "solid"].includes(o.angleFillMode)) ||
      (o.angleColour !== undefined && !/^#[a-f0-9]{6}$/i.test(o.angleColour)) ||
      (o.opacity !== undefined &&
        (!Number.isFinite(o.opacity) || o.opacity < 0 || o.opacity > 1))
    )
      throw Error("Ungültige Winkel-Farbfüllung.");
  }
  const api = Object.freeze({
    directions,
    horizontal,
    accepts,
    choices,
    defaults,
    solid,
    fill,
    paintFields,
    validateFill,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWAnglePolicy = api;
})(globalThis);
