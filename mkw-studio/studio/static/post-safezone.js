"use strict";
const MKWPostSafezone = (() => {
  function bind(b, panel) {
    const initial = MKWLayout.safeRect({ ...b, sponsors: undefined }),
      values = {
        w: b.w,
        h: b.h,
        top: initial.top,
        bottom: b.safe?.bottom ?? initial.bottom,
        left: initial.left,
        right: initial.right,
      },
      section = document.createElement("section");
    for (const key of ["top", "bottom", "left", "right"])
      values[key] = Math.round(values[key]);
    section.className = "tool-section post-safezone-section";
    section.innerHTML = `<h3>Schutzzone</h3>${MKWFormats.editor(values, (f, key, label) => `<label>${label} (px)<input data-post-safe="${key}" aria-label="Schutzzone ${label}" type="number" min="0" max="10000" step="1" value="${Math.round(f[key])}"></label>`)}<p class="post-safezone-error" role="status"></p>`;
    panel.append(section);
    const box = section.querySelector(".safe-preview"),
      error = section.querySelector(".post-safezone-error");
    MKWFormats.preview(box, values);
    let began = false;
    section.querySelectorAll("[data-post-safe]").forEach((input) => {
      input.onfocus = () => (began = false);
      input.oninput = () => {
        values[input.dataset.postSafe] =
          input.value === "" ? NaN : Number(input.value);
        const valid = MKWFormats.validate(values);
        section.classList.toggle("invalid", !valid);
        MKWFields.group(
          section.querySelectorAll("input"),
          MKWFormats.feedback(values),
          error,
        );
        if (!valid) return;
        if (!began) {
          checkpoint();
          began = true;
        }
        b.safe = MKWFormats.safe(values);
        MKWFormats.preview(box, values);
        changed(false);
      };
      input.onblur = () => {
        if (MKWFormats.validate(values)) return;
        for (const key of ["top", "bottom", "left", "right"]) {
          values[key] = b.safe?.[key] ?? initial[key];
          section.querySelector(`[data-post-safe="${key}"]`).value = Math.round(
            values[key],
          );
        }
        section.classList.remove("invalid");
        error.textContent = "";
        MKWFields.group(section.querySelectorAll("input"), "", error);
      };
    });
  }
  return { bind };
})();
