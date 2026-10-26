"use strict";
const MKWDateFields = (() => {
  function attach(field) {
    field.maxLength = 48;
    field.autocomplete = "off";
    field.spellcheck = false;
    field.setAttribute("aria-label", "Konzertdatum");
    const hint = document.createElement("small");
    hint.id = field.id + "Formats";
    hint.className = "studio-date-hint";
    hint.textContent = "Freiwillig · z. B. 151126, 15.11.2026 oder 2026-11-15.";
    field.after(hint);
    const ids = new Set(
      (field.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    ids.add(hint.id);
    field.setAttribute("aria-describedby", [...ids].join(" "));
    field.addEventListener("blur", () => validate(field));
  }
  function message(value) {
    if (!String(value || "").trim()) return "";
    try {
      MKW.dateName(value);
      return "";
    } catch (error) {
      return error.message;
    }
  }
  function validate(field) {
    let error = message(field.value);
    if (error && field.id === "saveDate")
      error +=
        " Die MKW-Sicherung bleibt möglich; der Dateiname enthält vorerst kein Datum.";
    return MKWFields.error(field, error);
  }
  return { attach, message, validate };
})();
