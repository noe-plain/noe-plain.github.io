"use strict";
icons();
const createWithFeedback = $("#createProject").onclick;
$("#createProject").onclick = async function (...args) {
  const finishLoading = MKWUIControls.loading(this);
  try {
    return await createWithFeedback.apply(this, args);
  } finally {
    finishLoading();
  }
};
busy = true;
const startDialog = $("#startDialog");
startDialog.showModal();
startDialog.addEventListener("cancel", (event) => event.preventDefault());
(async () => {
  const finishLoading = MKWUIControls.loading("#startStatus");
  let saved = null,
    restoreError = "";
  try {
    await MKWBrowser.init();
    await MKWSetupSession.recover();
    try {
      saved = await MKWProjectStore.last({ metadataOnly: true });
    } catch (error) {
      restoreError =
        "Letzter Stand konnte nicht geladen werden: " + error.message;
    }
    await loadFonts();
    render();
    MKWFields.notice(
      $("#startStatus"),
      saved
        ? `${saved.title} · ${saved.document.images.length} Bilder · ${new Date(saved.updatedAt).toLocaleString("de-CH")}`
        : restoreError || "Noch kein gespeichertes Projekt vorhanden.",
      !!restoreError,
    );
    $("#startContinue").disabled = !saved;
  } catch (error) {
    MKWFields.notice(
      $("#startStatus"),
      "Start nur eingeschränkt möglich: " + error.message,
      true,
    );
  }
  finishLoading();
  $("#startNew").disabled =
    $("#startOpen").disabled =
    $("#startTemplates").disabled =
      false;
  $("#startOpen").onclick = () =>
    MKWProjects.library().catch((error) => MKWProjects.notice(error.message));
  $("#startNew").onclick = openProjectSetup;
  $("#startContinue").onclick = async () => {
    $("#startContinue").disabled = true;
    const finishLoading = MKWUIControls.loading("#startStatus");
    try {
      await MKWProjects.open(MKWProjectStore.open(saved.id));
    } catch (error) {
      MKWFields.notice(
        $("#startStatus"),
        "Projekt konnte nicht geöffnet werden: " + error.message,
        true,
      );
      $("#startContinue").disabled = false;
    } finally {
      finishLoading();
    }
  };
})();

MKWTextHyphen.onChange(() => {
  if (MKWTextHyphen.error) {
    MKWProjects.notice(MKWTextHyphen.error.message);
    return;
  }
  if (p.carousel) {
    const edit = carouselUI.editing,
      o = edit && p.carousel.objects.find((o) => o.id === edit.id),
      range = o ? carouselEditableSelection(edit.el) : null;
    if (o) {
      carouselFormatEditable(edit.el, o);
      if (range) MKWTypography.restoreSelection(edit.el, range);
    }
    carouselRefresh();
  } else {
    draw();
    syncOverlays();
  }
});
