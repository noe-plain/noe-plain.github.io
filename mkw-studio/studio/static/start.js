"use strict";
icons();
busy = true;
const startDialog = $("#startDialog");
startDialog.showModal();
startDialog.addEventListener("cancel", (event) => event.preventDefault());
(async () => {
  let saved = null,
    restoreError = "";
  try {
    await MKWBrowser.init();
    try {
      saved = await MKWProjectStore.last();
    } catch (error) {
      restoreError =
        "Letzter Stand konnte nicht geladen werden: " + error.message;
    }
    await loadFonts();
    render();
    $("#startStatus").textContent = saved
      ? `${saved.title} · ${saved.project.images.length} Bilder · ${new Date(saved.updatedAt).toLocaleString("de-CH")}`
      : restoreError || "Noch kein gespeichertes Projekt vorhanden.";
    $("#startContinue").disabled = !saved;
  } catch (error) {
    $("#startStatus").textContent =
      "Start nur eingeschränkt möglich: " + error.message;
  }
  $("#startNew").disabled = $("#startOpen").disabled = false;
  $("#startOpen").onclick = MKWProjects.chooseOpen;
  $("#startNew").onclick = openProjectSetup;
  $("#startContinue").onclick = async () => {
    $("#startContinue").disabled = true;
    try {
      await MKWProjects.open(await MKWProjectStore.open(saved.id));
    } catch (error) {
      $("#startStatus").textContent =
        "Projekt konnte nicht geöffnet werden: " + error.message;
      $("#startContinue").disabled = false;
    }
  };
})();
