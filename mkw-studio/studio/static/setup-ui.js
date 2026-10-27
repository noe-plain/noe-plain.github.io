"use strict";
(() => {
  const section = document.createElement("section");
  section.className = "settings-setup";
  section.innerHTML = `<h3>MKW-Setup</h3><p>Werkzeugeinstellungen, eigene Schriften, Sponsorlogos, bildfreie Vorlagen und dein Startbild gemeinsam speichern.</p><div class="setup-file-card">${studioIcon("folder")}<div><strong id="setupFileName">Keine Setup-Datei verknüpft</strong><small id="setupFileDetail">Verknüpfen übernimmt die Einstellungen aus der gewählten Datei.</small></div></div><div class="settings-setup-actions"><button type="button" id="setupLink">${studioIcon("folder")}<span>Verknüpfen</span></button><button type="button" id="setupRefresh" disabled>${studioIcon("refresh")}<span>Aktualisieren</span></button><button type="button" id="setupExport">${studioIcon("export")}<span>Exportieren</span></button></div><p id="setupBrowserHint" class="setup-browser-hint"></p><p id="setupStatus" role="status" aria-live="polite" hidden></p><input type="file" id="setupFile" accept=".mkwsetup" hidden>`;
  $("#settings-panel-export").append(section);
  MKWSettings.register(
    "setup",
    "export",
    ".settings-setup",
    "MKW-Setup weitergeben",
    "Einstellungen, Schriften und Bibliotheken gemeinsam übertragen.",
    "verknüpfen aktualisieren exportieren import team sichern backup",
  );
  const dialog = $("#settingsDialog"),
    input = $("#setupFile"),
    status = $("#setupStatus");
  let running = false,
    link = null;
  const supported = () => typeof window.showOpenFilePicker === "function";
  function message(text, error = false) {
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle("is-error", error);
    status.setAttribute("role", error ? "alert" : "status");
  }
  async function refresh() {
    link = (await MKWSetupStore.link()) || null;
    $("#setupFileName").textContent =
      link?.name || "Keine Setup-Datei verknüpft";
    $("#setupFileDetail").textContent = link
      ? "Zuletzt übernommen: " +
        new Date(link.updatedAt).toLocaleString("de-CH", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "Verknüpfen übernimmt die Einstellungen aus der gewählten Datei.";
    $("#setupRefresh").disabled = running || !link;
    $("#setupBrowserHint").textContent = !supported()
      ? "Firefox und Browser ohne direkten Dateizugriff merken sich den Dateinamen. Zum Aktualisieren wählst du die Datei erneut aus."
      : link && !link.handle
        ? "Diese Verknüpfung enthält noch keinen Dateizugriff. Beim Aktualisieren bitte die Datei erneut auswählen."
        : "";
    $("#setupBrowserHint").hidden = !$("#setupBrowserHint").textContent;
  }
  async function run(action) {
    if (running) return;
    running = true;
    const finishLoading = MKWUIControls.loading(status);
    const controls = [
      ...dialog.querySelectorAll("button,input,select,textarea"),
    ].map((el) => [el, el.disabled]);
    for (const [el] of controls) el.disabled = true;
    dialog.setAttribute("aria-busy", "true");
    try {
      await MKWSetupSession.recover();
      await action();
    } catch (error) {
      if (error.name !== "AbortError")
        message("Setup nicht abgeschlossen: " + error.message, true);
    } finally {
      await refresh().catch((error) =>
        message("Setup-Verknüpfung nicht verfügbar: " + error.message, true),
      );
      finishLoading();
      running = false;
      for (const [el, disabled] of controls)
        if (el.isConnected) el.disabled = disabled;
      $("#setupRefresh").disabled = !link;
      dialog.removeAttribute("aria-busy");
    }
  }
  async function takeFile(file, handle) {
    message("Setup wird geprüft …");
    const imported = await MKWSetupSession.importFile(file, handle);
    message("Alle Einstellungen übernommen · " + imported.name);
  }
  function fileChoice() {
    if (!supported()) {
      input.value = "";
      input.click();
      return;
    }
    // Keep the native chooser inside the click gesture.
    const chosen = window.showOpenFilePicker({
      id: "mkw-studio-setup",
      multiple: false,
      types: [
        {
          description: "MKW-Setup",
          accept: { "application/octet-stream": [".mkwsetup"] },
        },
      ],
    });
    chosen.catch(() => {});
    run(async () => {
      const [handle] = await chosen;
      await takeFile(await handle.getFile(), handle);
    });
  }
  input.onchange = () => {
    const file = input.files[0];
    if (file) run(() => takeFile(file, null));
    input.value = "";
  };
  $("#setupLink").onclick = () => fileChoice();
  $("#setupRefresh").onclick = () => {
    if (!link) return;
    if (!link.handle || !supported()) {
      fileChoice();
      return;
    }
    const handle = link.handle;
    run(async () => {
      let permission = await handle.queryPermission({ mode: "read" });
      if (permission !== "granted")
        permission = await handle.requestPermission({ mode: "read" });
      if (permission !== "granted")
        throw Error(
          "Dateizugriff nicht freigegeben. Über „Verknüpfen“ kannst du die Datei erneut auswählen.",
        );
      await takeFile(await handle.getFile(), handle);
    });
  };
  $("#setupExport").onclick = () => {
    const target = window.showSaveFilePicker
      ? window.showSaveFilePicker({
          id: "mkw-studio-setup-export",
          suggestedName: "MKW-Studio.mkwsetup",
          types: [
            {
              description: "MKW-Setup",
              accept: { "application/octet-stream": [".mkwsetup"] },
            },
          ],
        })
      : Promise.resolve(null);
    target.catch(() => {});
    run(async () => {
      const handle = await target;
      message("Setup-Datei wird erstellt …");
      await MKWSetupSession.exportFile(handle);
      message("Alle Einstellungen als MKW-Setup exportiert.");
    });
  };
  dialog.addEventListener("cancel", (event) => {
    if (running) event.preventDefault();
  });
  $("#settings").addEventListener("click", () =>
    refresh().catch((error) =>
      message("Setup-Verknüpfung nicht verfügbar: " + error.message, true),
    ),
  );
})();
