(function (root) {
  "use strict";
  const minSlides = 1,
    maxSlides = 20;
  const validCount = (value) =>
    Number.isInteger(value) && value >= minSlides && value <= maxSlides;
  const api = Object.freeze({ minSlides, maxSlides, validCount });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWCarouselPolicy = api;
})(globalThis);
