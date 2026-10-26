"use strict";
/* Short decisions/errors share one native modal; document mutations stay with callers. */
const MKWFeedback = (() => {
  let active = null;
  function ask({
    title,
    message,
    confirm = "",
    destructive = false,
    trigger = document.activeElement,
  }) {
    if (active) return Promise.resolve(false);
    const dialog = document.createElement("dialog");
    dialog.id = "studioFeedbackDialog";
    dialog.setAttribute("aria-labelledby", "studioFeedbackTitle");
    dialog.setAttribute("aria-describedby", "studioFeedbackMessage");
    if (!confirm) dialog.setAttribute("role", "alertdialog");
    const heading = document.createElement("h2"),
      description = document.createElement("p"),
      actions = document.createElement("div"),
      cancel = document.createElement("button");
    heading.id = "studioFeedbackTitle";
    heading.textContent = title;
    description.id = "studioFeedbackMessage";
    description.textContent = message;
    actions.className = "studio-feedback-actions";
    cancel.type = "button";
    cancel.textContent = confirm ? "Abbrechen" : "Schliessen";
    cancel.autofocus = true;
    cancel.onclick = () => dialog.close("cancel");
    actions.append(cancel);
    if (confirm) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.dataset.feedbackConfirm = "";
      accept.textContent = confirm;
      accept.className = destructive ? "studio-destructive" : "primary";
      accept.onclick = () => dialog.close("confirm");
      actions.append(accept);
    }
    dialog.append(heading, description, actions);
    document.body.append(dialog);
    active = dialog;
    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => {
          const accepted = dialog.returnValue === "confirm";
          active = null;
          dialog.remove();
          if (
            trigger?.isConnected &&
            trigger.getClientRects().length &&
            !trigger.disabled
          )
            trigger.focus({ preventScroll: true });
          resolve(accepted);
        },
        { once: true },
      );
      dialog.showModal();
    });
  }
  return Object.freeze({ ask });
})();
