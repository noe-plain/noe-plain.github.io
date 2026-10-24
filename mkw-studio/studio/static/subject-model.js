(function (root) {
  "use strict";
  const startupBudget = 4500,
    detectionBudget = 1500;
  function skipConnection(connection) {
    if (!connection) return false;
    return (
      connection.saveData === true ||
      ["slow-2g", "2g", "3g"].includes(connection.effectiveType) ||
      (Number.isFinite(connection.downlink) &&
        connection.downlink > 0 &&
        connection.downlink < 2) ||
      (Number.isFinite(connection.rtt) && connection.rtt >= 600)
    );
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function position(board, im) {
    if (board.family?.enabled || !im.people?.length) return null;
    const { width, height } = im,
      s = board.image.scale;
    if (
      ![width, height, s, board.w, board.h].every(
        (v) => Number.isFinite(v) && v > 0,
      )
    )
      return null;
    const people = im.people.filter(
      (r) =>
        [r.x, r.y, r.w, r.h, r.score].every(Number.isFinite) &&
        r.w > 0 &&
        r.h > 0,
    );
    if (!people.length) return null;
    const prominent = (items) =>
      items.reduce((a, r) =>
        r.w * r.h * r.score > a.w * a.h * a.score ? r : a,
      );
    const faces = people.filter(
      (r) =>
        r.eyes &&
        [r.eyes.x, r.eyes.y].every(
          (v) => Number.isFinite(v) && v >= 0 && v <= 1,
        ),
    );
    let cx, cy, anchorY;
    if (faces.length) {
      const face = prominent(faces);
      cx = face.x + face.w / 2;
      cy = face.eyes.y;
      anchorY = board.h / 3;
    } else {
      const left = Math.min(...people.map((r) => r.x)),
        right = Math.max(...people.map((r) => r.x + r.w)),
        top = Math.min(...people.map((r) => r.y)),
        bottom = Math.max(...people.map((r) => r.y + r.h)),
        lead = prominent(people),
        group = right - left <= board.w / s / width,
        head = group ? top : lead.y,
        bodyBottom = group ? bottom : lead.y + lead.h,
        visibleH = board.h / s / height;
      cx = group ? (left + right) / 2 : lead.x + lead.w / 2;
      cy =
        bodyBottom - head <= visibleH
          ? (head + bodyBottom) / 2
          : head + visibleH * 0.42;
      anchorY = board.h / 2;
    }
    return {
      x: clamp(
        board.w / 2 - (cx - 0.5) * width * s,
        board.w - (width * s) / 2,
        (width * s) / 2,
      ),
      y: clamp(
        anchorY - (cy - 0.5) * height * s,
        board.h - (height * s) / 2,
        (height * s) / 2,
      ),
    };
  }
  const api = Object.freeze({
    skipConnection,
    position,
    startupBudget,
    detectionBudget,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWSubjectModel = api;
})(globalThis);
