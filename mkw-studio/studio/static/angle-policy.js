(function (root) {
  "use strict";
  const directions = Object.freeze(["up", "left", "down"]);
  const horizontal = (direction) =>
    direction === "left" || direction === "right";
  const accepts = (direction) =>
    directions.includes(direction) || direction === "right";
  const choices = (current) =>
    current === "right" ? [...directions, "right"] : [...directions];
  const api = Object.freeze({ directions, horizontal, accepts, choices });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWAnglePolicy = api;
})(globalThis);
