(function (root) {
  "use strict";
  const phoneWidth = 390;
  function reference(width, unit = 1) {
    return (
      phoneWidth / (Number.isFinite(width) && width > 0 ? width : 1080) / unit
    );
  }
  const percent = (value, base) => (value / base) * 100;
  const value = (percentage, base) => (percentage / 100) * base;
  const api = Object.freeze({ phoneWidth, reference, percent, value });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWZoom = api;
})(globalThis);
