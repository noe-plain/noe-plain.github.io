"use strict";
const studioHelpURL = "hilfe/?v=fb238abcb39e";
let studioHelpPopup = null;
function studioOpenHelp(trigger) {
  if (!studioHelpPopup) {
    const dialog = document.createElement("dialog");
    dialog.id = "studioHelpDialog";
    dialog.setAttribute("aria-labelledby", "studioHelpTitle");
    dialog.innerHTML = `<div class="dialog-heading"><h2 id="studioHelpTitle">Hilfe &amp; How-to</h2><button id="closeStudioHelp" class="icon-button" aria-label="Wiki schliessen" autofocus>${studioIcon("close")}</button></div><p id="studioHelpStatus" role="status">Wiki wird geladen …</p>`;
    const frame = document.createElement("iframe");
    frame.id = "studioHelpFrame";
    frame.name = "mkwHelp";
    frame.title = "MKW Studio: Hilfe und How-to";
    frame.hidden = true;
    const state = { dialog, frame, trigger: null, ready: false };
    const finishLoading = MKWUIControls.loading(
      dialog.querySelector("#studioHelpStatus"),
    );
    studioHelpPopup = state;
    frame.addEventListener("load", () => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.querySelector("#helpContent"))
          throw Error("Wiki nicht verfügbar");
        doc.documentElement.classList.add("help-embedded");
        studioApplyHelpTheme(doc);
        doc.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            dialog.close();
          }
        });
        doc
          .querySelector('footer a[href="../"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            dialog.close();
          });
        state.ready = true;
        frame.hidden = false;
        dialog.querySelector("#studioHelpStatus").hidden = true;
      } catch {
        dialog.querySelector("#studioHelpStatus").innerHTML =
          `Wiki konnte nicht geladen werden. <a href="${studioHelpURL}" target="_blank" rel="noopener">Wiki in einem neuen Tab öffnen</a>`;
      } finally {
        finishLoading();
      }
    });
    dialog.querySelector("#closeStudioHelp").onclick = () => dialog.close();
    dialog.addEventListener(
      "close",
      () =>
        state.trigger?.isConnected &&
        state.trigger.focus({ preventScroll: true }),
    );
    // Assign a URL only after the first explicit request. No iframe or wiki assets at startup.
    frame.src = studioHelpURL;
    dialog.append(frame);
    document.body.append(dialog);
    document
      .querySelectorAll("#help,#startHelp")
      .forEach((button) => button.setAttribute("aria-controls", dialog.id));
  }
  const state = studioHelpPopup;
  state.trigger = trigger;
  if (state.ready) studioApplyHelpTheme(state.frame.contentDocument);
  if (!state.dialog.open) state.dialog.showModal();
}
document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("#help,#startHelp");
  if (
    !trigger ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  studioOpenHelp(trigger);
});

function studioApplyHelpTheme(doc) {
  const state = studioHelpPopup;
  doc.documentElement.classList.add("studio-theme-changing");
  cancelAnimationFrame(state.themeFrame);
  state.themeFrame = requestAnimationFrame(() => {
    state.themeFrame = requestAnimationFrame(() =>
      doc.documentElement.classList.remove("studio-theme-changing"),
    );
  });
  doc.documentElement.style.colorScheme =
    document.documentElement.dataset.theme;
  doc.documentElement.dataset.theme = document.documentElement.dataset.theme;
  const palette = MKWUIColor.palette(
    studioPreferences.primaryColour,
    document.documentElement.dataset.theme,
    studioPreferences.colourMode,
  );
  for (const [role, value] of Object.entries(palette))
    doc.documentElement.style.setProperty("--md-sys-color-" + role, value);
}
document.addEventListener("mkw-ui-theme-change", () => {
  if (studioHelpPopup?.ready)
    studioApplyHelpTheme(studioHelpPopup.frame.contentDocument);
});
