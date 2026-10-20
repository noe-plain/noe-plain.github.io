"use strict";
const MKWPostAngleEditor = (() => {
  const postAngleContent = { board: null };
  const postAngleArea = (b) => MKWSponsors.layout(b)?.content || b;
  const postAngleActive = (b) =>
    selected === b.id &&
    step === "crop" &&
    layer === "postAngle" &&
    b.angle?.enabled;
  const postAngleEditing = (b) =>
    postAngleActive(b) && postAngleContent.board === b.id;
  function postAngleCreate(b, source = {}) {
    b.angle = MKWPostAngle.defaults(b, source);
    MKWPostAngle.cover(b, asset(b), postAngleArea(b));
    return b.angle;
  }
  function postAngleOption(im) {
    const b = p.boards.find((b) => b.imageId === im.id),
      a = b?.angle;
    return `<div class="post-option-row post-angle-option"><label class="post-option-label"><input type="checkbox" data-post-angle="${esc(im.id)}" ${a?.enabled ? "checked" : ""}><span class="visually-hidden">Winkel anzeigen</span></label><select data-post-angle-direction="${esc(im.id)}" aria-label="Winkel · Ausrichtung">${[
      ["up", "Oben"],
      ["right", "Rechts"],
      ["down", "Unten"],
    ]
      .map(
        ([key, label]) =>
          `<option value="${key}" ${(a?.direction || "right") === key ? "selected" : ""}>Winkel · ${label}</option>`,
      )
      .join("")}</select></div>`;
  }
  function postAngleRefreshOptions() {
    for (const im of p.images) {
      const a = p.boards.find((b) => b.imageId === im.id)?.angle,
        input = document.querySelector(`[data-post-angle="${im.id}"]`),
        select = document.querySelector(
          `[data-post-angle-direction="${im.id}"]`,
        );
      if (input) input.checked = !!a?.enabled;
      if (select) select.value = a?.direction || "right";
    }
  }
  function postAngleSetOption(imageId, changes) {
    for (const b of p.boards) {
      if (b.imageId !== imageId) continue;
      const values = changes;
      if (!b.angle) postAngleCreate(b);
      Object.assign(b.angle, values);
      MKWPostAngle.cover(b, asset(b), postAngleArea(b));
    }
    const b = p.boards.find((b) => b.imageId === imageId);
    if (b?.angle.enabled) postAngleSelect(b, false);
    else if (layer === "postAngle") layer = "image";
    syncTextTypes();
    postAngleRefreshOptions();
    renderPanel();
    syncOverlays(true);
  }
  function postAngleSelect(b, content = false) {
    if (editingText) editingText.el.blur();
    step = "crop";
    layer = "postAngle";
    postAngleContent.board = content ? b.id : null;
    selectBoard(b.id);
    updateDock();
    draw();
  }
  async function postAnglePaint(ctx, b, scale, opts) {
    if (!b.angle?.enabled || (opts.only && opts.only !== "postAngle")) return;
    const { o } = MKWPostAngle.geometry(b, postAngleArea(b)),
      photo = asset(b),
      im = await (opts.preview ? previewImage : image)(photo.data),
      t = b.angle.image;
    ctx.save();
    ctx.translate(o.x, o.y);
    carouselClipPhoto(ctx, o, scale);
    ctx.translate(-o.x, -o.y);
    ctx.translate(t.x, t.y);
    ctx.rotate((t.angle * Math.PI) / 180);
    ctx.scale(t.scale * t.flipX, t.scale * t.flipY);
    ctx.drawImage(
      im,
      -photo.width / 2,
      -photo.height / 2,
      photo.width,
      photo.height,
    );
    ctx.restore();
  }
  function postAnglePanel(b, panel) {
    const a = b.angle,
      editing = postAngleEditing(b);
    $("#toolTitle").textContent = editing
      ? "Winkel · Bildinhalt"
      : "Winkel gestalten";
    panel.innerHTML = `<div class="panel-row"><section class="tool-section"><h3>Bearbeiten</h3><div class="tool-button-grid post-angle-mode"><button data-angle-mode="frame" aria-pressed="${!editing}">${studioIcon("move")}Winkel</button><button data-angle-mode="content" aria-pressed="${editing}">${studioIcon("image")}Bildinhalt</button></div><p class="post-angle-hint">${editing ? "Bild ziehen oder an den Eckgriffen skalieren. Escape beendet die Bildbearbeitung." : "Winkel entlang der Mittelachse ziehen. Doppelklick öffnet den Bildinhalt."}</p></section><section class="tool-section"><h3>Winkel</h3><label>Ausrichtung<select id="postAngleDirection">${options(
      [
        ["up", "Oben"],
        ["right", "Rechts"],
        ["down", "Unten"],
      ],
      a.direction,
    )}</select></label><label>Schenkelbreite (px)<input id="postAngleThickness" type="number" min="1" max="1000" value="${a.thickness}"></label></section><section class="tool-section"><h3>Bildinhalt</h3><div class="tool-button-grid"><button data-angle-flip="flipX">${studioIcon("flip")}Horizontal</button><button data-angle-flip="flipY">${studioIcon("flip", "flip-vertical")}Vertikal</button></div><button id="postAngleFill">Winkel vollständig füllen</button><button id="postAngleReset" class="tool-secondary">Bildausschnitt zurücksetzen</button></section><section class="tool-section"><h3>Schein</h3><label>Weichheit (px)<input id="postAngleGlow" type="number" min="0" max="300" value="${a.glow}"></label><label>Deckkraft (%)<input id="postAngleGlowAlpha" type="number" min="0" max="100" value="${Math.round(a.glowAlpha * 100)}"></label><label>Farbe<input id="postAngleGlowColor" type="color" value="${a.glowColor}"></label></section></div>`;
    panel
      .querySelectorAll("[data-angle-mode]")
      .forEach(
        (el) =>
          (el.onclick = () =>
            postAngleSelect(b, el.dataset.angleMode === "content")),
      );
    on("postAngleDirection", "change", (e) =>
      mutate(() => {
        a.direction = e.target.value;
        MKWPostAngle.cover(b, asset(b), postAngleArea(b));
        postAngleRefreshOptions();
        syncOverlays(true);
      }, false),
    );
    for (const [id, key, min, max, factor] of [
      ["postAngleThickness", "thickness", 1, 1000, 1],
      ["postAngleGlow", "glow", 0, 300, 1],
      ["postAngleGlowAlpha", "glowAlpha", 0, 100, 0.01],
    ])
      on(id, "change", (e) => {
        const value = Number(e.target.value);
        if (
          !e.target.value ||
          !Number.isFinite(value) ||
          value < min ||
          value > max
        ) {
          e.target.value = a[key] / factor;
          return;
        }
        mutate(() => {
          a[key] = value * factor;
        }, false);
      });
    on("postAngleGlowColor", "input", (e) => {
      if (/^#[a-f0-9]{6}$/i.test(e.target.value))
        mutate(() => (a.glowColor = e.target.value), false);
    });
    panel
      .querySelectorAll("[data-angle-flip]")
      .forEach(
        (el) =>
          (el.onclick = () =>
            mutate(() => (a.image[el.dataset.angleFlip] *= -1), false)),
      );
    on("postAngleFill", "click", () =>
      mutate(() => MKWPostAngle.cover(b, asset(b), postAngleArea(b)), false),
    );
    on("postAngleReset", "click", () => {
      mutate(() => {
        a.image = MKWPostAngle.defaults(b).image;
        MKWPostAngle.cover(b, asset(b), postAngleArea(b));
      }, false);
    });
  }
  function postAngleOverlay(b, root, s) {
    if (!postAngleActive(b)) {
      root
        .querySelectorAll(".post-angle-outline,.post-angle-transform")
        .forEach((el) => el.remove());
      return;
    }
    const area = postAngleArea(b),
      points = MKWPostAngle.visiblePoints(b, area),
      svg =
        root.querySelector(".post-angle-outline") ||
        document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("post-angle-outline");
    svg.setAttribute("viewBox", `0 0 ${b.w} ${b.h}`);
    if (!svg.firstChild) svg.innerHTML = "<polygon/>";
    svg.firstChild.setAttribute(
      "points",
      points.map((p) => `${p.x},${p.y}`).join(" "),
    );
    if (!svg.isConnected) root.append(svg);
    if (!postAngleEditing(b)) {
      root.querySelector(".post-angle-transform")?.remove();
      return;
    }
    const im = asset(b),
      t = b.angle.image,
      box =
        root.querySelector(".post-angle-transform") ||
        document.createElement("div");
    box.className = "image-transform post-angle-transform";
    Object.assign(box.style, {
      left: (t.x - (im.width * t.scale) / 2) * s + "px",
      top: (t.y - (im.height * t.scale) / 2) * s + "px",
      width: im.width * t.scale * s + "px",
      height: im.height * t.scale * s + "px",
      transform: `rotate(${t.angle}deg)`,
    });
    for (let n = box.children.length; n < 4; n++) {
      const handle = document.createElement("button");
      handle.className = "handle";
      handle.dataset.corner = n;
      handle.setAttribute("aria-label", "Winkelbild proportional skalieren");
      handle.onpointerdown = (e) => postAngleBegin(e, b, "content", n);
      box.append(handle);
    }
    if (!box.isConnected) root.append(box);
  }
  let postAngleMotion = null,
    postAngleFrame = 0,
    postAnglePending = null;
  function postAngleBegin(ev, b, mode, corner = null) {
    if (busy || ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    const base = clone(b.angle),
      start = positionInBoard(ev, b);
    postAngleMotion = {
      b,
      base,
      start,
      mode,
      corner,
      begun: false,
      project: p,
    };
    if (corner !== null) {
      const im = asset(b),
        sx = [-1, 1, 1, -1][corner],
        sy = [-1, -1, 1, 1][corner],
        v = rotatePoint(
          (-sx * im.width * base.image.scale) / 2,
          (-sy * im.height * base.image.scale) / 2,
          base.image.angle,
        );
      postAngleMotion.fixed = { x: base.image.x + v.x, y: base.image.y + v.y };
      postAngleMotion.signs = { sx, sy };
    }
  }
  function postAngleApplyMotion(ev) {
    const m = postAngleMotion;
    if (!m || m.project !== p) return;
    const { b, base, start, mode, corner } = m,
      pt = positionInBoard(ev, b);
    let dx = pt.x - start.x,
      dy = pt.y - start.y;
    if (!m.begun && Math.hypot(dx, dy) * surfaceScale() < 2) return;
    if (!m.begun) {
      checkpoint();
      m.begun = true;
    }
    if (ev.shiftKey) {
      const rad =
          (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4,
        d = dx * Math.cos(rad) + dy * Math.sin(rad);
      dx = d * Math.cos(rad);
      dy = d * Math.sin(rad);
    }
    const a = b.angle,
      t = a.image,
      im = asset(b),
      area = postAngleArea(b);
    if (corner !== null) {
      const {
          fixed,
          signs: { sx, sy },
        } = m,
        q = rotatePoint(pt.x - fixed.x, pt.y - fixed.y, -base.image.angle),
        scale = Math.max(
          0.001,
          Math.min(
            100,
            (q.x * sx * im.width + q.y * sy * im.height) /
              (im.width ** 2 + im.height ** 2),
          ),
        ),
        v = rotatePoint(
          (sx * im.width * scale) / 2,
          (sy * im.height * scale) / 2,
          base.image.angle,
        );
      Object.assign(t, { scale, x: fixed.x + v.x, y: fixed.y + v.y });
    } else if (mode === "content") {
      t.x = base.image.x + dx;
      t.y = base.image.y + dy;
    } else {
      const original = MKWPostAngle.geometry({ ...b, angle: base }, area).tip;
      a.tip = {
        x:
          a.direction === "right"
            ? Math.max(0, Math.min(1, (original.x + dx) / area.w))
            : 0.5,
        y:
          a.direction === "right"
            ? 0.5
            : Math.max(0, Math.min(1, (original.y + dy) / area.h)),
      };
      const tip = MKWPostAngle.geometry(b, area).tip;
      Object.assign(t, {
        x: base.image.x + tip.x - original.x,
        y: base.image.y + tip.y - original.y,
        scale: base.image.scale,
      });
      MKWPostAngle.cover(b, im, area);
    }
    changed(false);
  }
  function postAngleFlush() {
    cancelAnimationFrame(postAngleFrame);
    postAngleFrame = 0;
    const next = postAnglePending;
    postAnglePending = null;
    if (next) postAngleApplyMotion(next);
  }
  function postAngleCancelMotion() {
    if (!postAngleMotion) return;
    const m = postAngleMotion;
    cancelAnimationFrame(postAngleFrame);
    postAngleFrame = 0;
    postAnglePending = null;
    if (m.project === p && m.begun) {
      m.b.angle = m.base;
      changed(false);
    }
    postAngleMotion = null;
  }
  window.addEventListener(
    "pointermove",
    (ev) => {
      if (!postAngleMotion) return;
      ev.preventDefault();
      postAnglePending = ev;
      if (!postAngleFrame)
        postAngleFrame = requestAnimationFrame(postAngleFlush);
    },
    { passive: false },
  );
  window.addEventListener("pointerup", () => {
    if (!postAngleMotion) return;
    postAngleFlush();
    postAngleMotion = null;
    renderPanel();
  });
  window.addEventListener("pointercancel", postAngleCancelMotion);
  window.addEventListener("blur", postAngleCancelMotion);
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.querySelector("dialog[open]") &&
      board() &&
      postAngleEditing(board())
    ) {
      postAngleCancelMotion();
      postAngleSelect(board(), false);
      e.preventDefault();
    }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.matches("[data-post-angle],[data-post-angle-direction]")) return;
    const imageId = el.dataset.postAngle || el.dataset.postAngleDirection,
      b = p.boards.find((b) => b.imageId === imageId),
      changes = el.matches("[data-post-angle]")
        ? { enabled: el.checked }
        : {
            direction: el.value,
            ...(!b?.angle?.enabled ? { enabled: true } : {}),
          };
    mutate(() => postAngleSetOption(imageId, changes), false);
  });

  return {
    begin: postAngleBegin,
    area: postAngleArea,
    active: postAngleActive,
    editing: postAngleEditing,
    create: postAngleCreate,
    options: postAngleOption,
    refreshOptions: postAngleRefreshOptions,
    select: postAngleSelect,
    paint: postAnglePaint,
    panel: postAnglePanel,
    overlay: postAngleOverlay,
    cancelMotion: postAngleCancelMotion,
    resetContent: () => {
      postAngleContent.board = null;
    },
  };
})();
