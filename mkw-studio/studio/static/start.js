"use strict";
icons();
busy = true;
const startDialog = $("#startDialog");
startDialog.showModal();
startDialog.addEventListener("cancel", (event) => event.preventDefault());
(async () => {
  const finishLoading = MKWUIControls.loading("#startStatus");
  try {
    await MKWBrowser.init();
    await MKWSetupSession.recover();
    await loadFonts();
    render();
    MKWFields.notice($("#startStatus"), "");
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
    $("#startDesigner").disabled =
      false;
  $("#startOpen").onclick = () =>
    MKWProjects.library().catch((error) => MKWProjects.notice(error.message));
  $("#startNew").onclick = openProjectSetup;
  $("#startDesigner").onclick = () =>
    MKWProjectSetup.open({ mode: "carousel" });
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
