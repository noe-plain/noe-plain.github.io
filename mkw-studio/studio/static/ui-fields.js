"use strict";
/* Native fields keep their values and handlers; feedback belongs to the UI only. */
const MKWFields = (() => {
  const scope =
      "dialog,#toolsSidebar,#carouselProperties,.image-info-card,#studioPaintPicker",
    selector =
      'input:not([type]),input[type="text"],input[type="number"],input[type="search"],input[type="email"],input[type="url"],textarea,select',
    states = new WeakMap();
  let nextId = 0,
    pendingFocus = false,
    pointerActive = false,
    blurredField = null;
  function eligible(field) {
    return (
      field?.matches?.(selector) &&
      field.closest(scope) &&
      !field.closest(
        ".carousel-layer-name,.layer-name-editor,[data-canvas-text]",
      )
    );
  }
  function describe(field, id, add) {
    const ids = new Set(
      (field.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    add ? ids.add(id) : ids.delete(id);
    if (ids.size) {
      const value = [...ids].join(" ");
      if (field.getAttribute("aria-describedby") !== value)
        field.setAttribute("aria-describedby", value);
    } else field.removeAttribute("aria-describedby");
  }
  function clear(field) {
    const state = states.get(field);
    if (!state) return;
    describe(field, state.host.id, false);
    field.removeAttribute("data-field-error");
    if (state.previous === null) field.removeAttribute("aria-invalid");
    else field.setAttribute("aria-invalid", state.previous);
    states.delete(field);
    if (state.own) {
      state.host.remove();
      field.dispatchEvent(
        new CustomEvent("mkw-field-feedback", { bubbles: true }),
      );
    }
  }
  function error(field, text, host, native = false) {
    if (!field) return false;
    if (!text) {
      clear(field);
      return true;
    }
    let state = states.get(field);
    const previousText = state?.host.textContent;
    if (state && host && state.host !== host) {
      clear(field);
      state = null;
    }
    if (!state) {
      const own = !host;
      if (!host) {
        host = document.createElement("span");
        host.className = "studio-field-feedback";
        host.setAttribute("role", "status");
        const label = field.closest("label");
        if (label) label.append(host);
        else field.after(host);
      }
      if (!host.id) host.id = "studioFieldFeedback" + ++nextId;
      state = {
        host,
        own,
        previous: field.getAttribute("aria-invalid"),
        native,
      };
      states.set(field, state);
    }
    state.native = native;
    if (state.host.textContent !== text) state.host.textContent = text;
    field.setAttribute("data-field-error", "true");
    field.setAttribute("aria-invalid", "true");
    describe(field, state.host.id, true);
    if (state.own && previousText !== text)
      field.dispatchEvent(
        new CustomEvent("mkw-field-feedback", { bubbles: true }),
      );
    return false;
  }
  function message(field, required = false) {
    const v = field.validity;
    if ((required || field.required) && !field.value.trim())
      return "Bitte einen Wert eingeben.";
    if (v.badInput) return "Bitte eine gültige Zahl eingeben.";
    if (v.rangeUnderflow || v.rangeOverflow) {
      if (field.min !== "" && field.max !== "")
        return `Bitte einen Wert zwischen ${field.min} und ${field.max} eingeben.`;
      return v.rangeUnderflow
        ? `Mindestens ${field.min} eingeben.`
        : `Höchstens ${field.max} eingeben.`;
    }
    if (v.stepMismatch && field.hasAttribute("step"))
      return field.step === "1"
        ? "Bitte eine ganze Zahl eingeben."
        : `Bitte Schritte von ${field.step} verwenden.`;
    if (v.typeMismatch)
      return field.type === "email"
        ? "Bitte eine gültige E-Mail-Adresse eingeben."
        : "Bitte eine vollständige Adresse eingeben.";
    if (v.tooLong) return `Höchstens ${field.maxLength} Zeichen verwenden.`;
    if (v.patternMismatch)
      return field.title || "Bitte das angegebene Format verwenden.";
    if (v.customError) return field.validationMessage;
    return "";
  }
  function validate(field, required = false) {
    const text = message(field, required);
    if (text) {
      error(field, text, null, true);
      states.get(field).required = required;
      return false;
    }
    clear(field);
    return true;
  }
  function group(fields, text, host) {
    if (host.textContent !== text) host.textContent = text;
    for (const field of fields) text ? error(field, text, host) : clear(field);
    return !text;
  }
  function reset(root) {
    for (const field of root.querySelectorAll("[data-field-error]"))
      clear(field);
  }
  function refresh(root) {
    if (!root) return;
    for (const field of root.querySelectorAll("[data-field-error]")) {
      const state = states.get(field);
      if (state?.native && !message(field, state.required)) clear(field);
    }
  }
  function notice(host, text, failed = false) {
    host.classList.toggle("is-error", failed);
    host.setAttribute("role", failed ? "alert" : "status");
    host.textContent = text;
  }
  function validateBlur(field) {
    if (field?.isConnected && eligible(field) && !states.has(field))
      validate(field);
  }
  document.addEventListener(
    "pointerdown",
    () => {
      pointerActive = true;
    },
    true,
  );
  const finishPointer = () => {
    pointerActive = false;
    const field = blurredField;
    blurredField = null;
    // Wait until the original click has run before adding supporting text.
    if (field) setTimeout(() => validateBlur(field), 0);
  };
  document.addEventListener("pointerup", finishPointer, true);
  document.addEventListener("pointercancel", finishPointer, true);
  window.addEventListener("blur", finishPointer);
  document.addEventListener("focusout", (event) => {
    if (pointerActive) blurredField = event.target;
    else validateBlur(event.target);
  });
  document.addEventListener("input", (event) => {
    const state = states.get(event.target);
    if (state?.native) validate(event.target, state.required);
  });
  document.addEventListener(
    "invalid",
    (event) => {
      if (!eligible(event.target)) return;
      event.preventDefault();
      validate(event.target);
      if (!pendingFocus) {
        pendingFocus = true;
        const field = event.target;
        setTimeout(() => {
          pendingFocus = false;
          if (
            field.isConnected &&
            !field.disabled &&
            field.getClientRects().length &&
            states.has(field)
          )
            field.focus({ preventScroll: false });
        }, 0);
      }
    },
    true,
  );
  document.addEventListener(
    "close",
    (event) => {
      if (event.target.matches?.("dialog")) reset(event.target);
    },
    true,
  );
  return Object.freeze({
    error,
    clear,
    validate,
    group,
    reset,
    refresh,
    notice,
  });
})();
