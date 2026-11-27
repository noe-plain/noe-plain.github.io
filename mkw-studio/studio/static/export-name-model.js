(function (root) {
  "use strict";
  const core = typeof module !== "undefined" ? require("./core.js") : root.MKW;
  function row(meta, board, info, extension) {
    const prefix = core.projectName(meta),
      number = String(info.row + 1).padStart(2, "0"),
      slide = String(info.local + 1).padStart(2, "0");
    return `${prefix}_R${number}_${core.ratio(board.w, board.h)}_S${slide}.${extension}`;
  }
  const api = Object.freeze({ row });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWExportNames = api;
})(globalThis);
