/* Browser-only series production. Preview and explicit mapping precede project creation. */
const MKWBatch = (() => {
  "use strict";
  let data = null,
    mapping = {},
    files = [],
    rows = [],
    generated = [];
  const normalized = new Map();
  const button = document.createElement("button");
  button.id = "batch";
  button.className = "icon-button";
  button.innerHTML = studioIcon("layers");
  button.title = "Datenimport & Serienproduktion";
  button.setAttribute("aria-label", button.title);
  $("#projects").after(button);
  const dialog = document.createElement("dialog");
  dialog.id = "batchImport";
  dialog.innerHTML = `<div class="dialog-heading"><div><h2>Datenimport & Serienproduktion</h2><p>Aus der aktuellen Gestaltung mehrere benannte Projekte erstellen.</p></div><button id="closeBatch">Schliessen</button></div><p class="batch-help">Einzelposts verwenden das erste Bild als Gestaltungsvorlage. Im Carousel verwendest du Textplatzhalter wie <strong>{{konzerttitel}}</strong>, <strong>{{übertitel}}</strong> und <strong>{{untertitel}}</strong>; ein zugeordnetes Bild ersetzt den ersten Bildrahmen. Leere Bildangaben behalten das Vorlagenbild.</p><div class="batch-intro"><label class="batch-file-card"><strong>1 · Daten wählen</strong><input id="batchDataFile" type="file" accept=".csv,.json"><small>CSV (Komma, Semikolon, Tab) oder JSON · bis 500 Einträge</small><button id="batchExample" type="button">CSV-Beispiel herunterladen</button></label><label class="batch-file-card"><strong>2 · Zugehörige Bilder wählen</strong><input id="batchImages" type="file" accept=".jpg,.jpeg,.png,.webp" multiple><small>Die Spalte „Bilddatei“ wird mit den Dateinamen abgeglichen.</small></label></div><h3>3 · Spalten zuordnen</h3><div id="batchMapping" class="batch-mapping"></div><div id="batchPreview" class="batch-table-wrap"></div><p id="batchStatus" role="status"></p><progress id="batchProgress" aria-label="Fortschritt der Serienproduktion" value="0" max="1" hidden></progress><div class="batch-actions"><label>Bildexport<select id="batchFormat"><option value="jpg">JPG · 90 %</option><option value="png">PNG · verlustfrei</option><option value="webp">WebP · 90 %</option></select></label><button id="batchCreate">Projekte im Browser erstellen</button><button id="batchExport" class="primary">Projekte erstellen & Bilder als ZIP</button><button id="batchOpenResult" hidden>Erstes Ergebnis öffnen</button></div>`;
  document.body.append(dialog);
  function buildRows() {
    if (!data) return [];
    return data.records.map((record, index) => {
      const row = MKWBatchData.map(record, mapping),
        errors = [],
        warnings = [];
      let asset;
      if (row.image) {
        const name = row.image.toLocaleLowerCase(),
          provided = files.filter(
            (file) => file.name.toLocaleLowerCase() === name,
          ),
          candidates = provided.length
            ? provided
            : p.images.filter((file) => file.name.toLocaleLowerCase() === name);
        asset = candidates[0];
        if (candidates.length > 1)
          errors.push("Mehrdeutiger Bildname: " + row.image);
        if (!asset) errors.push("Bilddatei fehlt: " + row.image);
      }
      if (row.date) {
        try {
          MKW.dateName(row.date);
        } catch (error) {
          errors.push(error.message);
        }
      } else if (!MKW.headingDate(row.concert))
        warnings.push("Kein Datum · Export ohne Datumspräfix");
      if (
        p.carousel &&
        ["concert", "headline", "subtitle"].some((key) => row[key])
      ) {
        const text = p.carousel.objects
          .filter((object) => object.type === "text")
          .map((object) => object.text)
          .join(" ");
        if (!/\{\{/.test(text))
          errors.push(
            "Für Serientexte bitte {{konzerttitel}} usw. in die Vorlage schreiben.",
          );
      }
      return {
        row,
        asset,
        index,
        errors,
        warnings,
        checked: rows[index]?.checked ?? true,
      };
    });
  }
  function preview() {
    rows = buildRows();
    const valid = rows.filter(
      (row) => !row.errors.length && row.checked,
    ).length;
    $("#batchPreview").innerHTML = data
      ? `<table class="batch-table"><thead><tr><th><input id="batchSelectAll" type="checkbox" aria-label="Alle Datensätze auswählen" ${rows.every((row) => row.checked) ? "checked" : ""}></th><th>Projekt</th><th>Übertitel</th><th>Konzerttitel</th><th>Bild</th><th>Prüfung</th></tr></thead><tbody>${rows.map((entry, i) => `<tr><td><input data-batch-row="${i}" type="checkbox" aria-label="Datensatz ${i + 1}" ${entry.checked ? "checked" : ""}></td><td>${esc(entry.row.title || `${p.meta.title} ${i + 1}`)}</td><td>${esc(entry.row.concert)}</td><td>${esc(entry.row.headline)}</td><td>${esc(entry.row.image || "Vorlagenbild")}</td><td class="${entry.errors.length ? "batch-error" : entry.warnings.length ? "batch-warning" : ""}">${esc([...entry.errors, ...entry.warnings].join(" · ") || "Bereit")}</td></tr>`).join("")}</tbody></table>`
      : '<p class="batch-help">Nach dem Datenimport erscheint hier die Vorschau.</p>';
    $("#batchCreate").disabled = $("#batchExport").disabled =
      !valid || rows.some((row) => row.checked && row.errors.length);
    $("#batchStatus").textContent = data
      ? `${valid} von ${rows.length} Datensätzen bereit. Projektdateien werden getrennt in diesem Browser gesichert.`
      : "Wähle eine Datendatei, um zu beginnen.";
    dialog.querySelectorAll("[data-batch-row]").forEach(
      (input) =>
        (input.onchange = () => {
          rows[+input.dataset.batchRow].checked = input.checked;
          preview();
        }),
    );
    if ($("#batchSelectAll"))
      $("#batchSelectAll").onchange = (event) => {
        rows.forEach((row) => (row.checked = event.target.checked));
        preview();
      };
  }
  function mappingUI() {
    if (!data) return;
    $("#batchMapping").innerHTML = Object.entries(MKWBatchData.fields)
      .map(
        ([key, label]) =>
          `<label>${label}<select data-batch-map="${key}"><option value="">Nicht zuordnen</option>${data.columns.map((column) => `<option value="${esc(column)}" ${mapping[key] === column ? "selected" : ""}>${esc(column)}</option>`).join("")}</select></label>`,
      )
      .join("");
    dialog.querySelectorAll("[data-batch-map]").forEach(
      (input) =>
        (input.onchange = () => {
          mapping[input.dataset.batchMap] = input.value;
          preview();
        }),
    );
    preview();
  }
  async function asset(file) {
    if (!file || file.data) return file;
    const key = file.name + ":" + file.size + ":" + file.lastModified;
    if (!normalized.has(key)) {
      if (file.size > 100 * 1024 * 1024)
        throw Error("Bilddatei grösser als 100 MB: " + file.name);
      const im = await (await api("/api/import", file)).json();
      normalized.set(key, {
        ...im,
        id: uid(),
        name: file.name,
        original: im.data,
      });
    }
    return normalized.get(key);
  }
  async function run(withExport) {
    if (busy) return;
    const entries = rows.filter((row) => row.checked);
    if (!entries.length || entries.some((row) => row.errors.length)) return;
    busy = true;
    generated = [];
    const template = snapshot(),
      original = p,
      originalRevision = revision,
      originalSaved = savedRevision;
    let activeChanged = false,
      zipBytes = 0;
    const downloads = [],
      controls = [...dialog.querySelectorAll("input,select,button")],
      previous = controls.map((control) => control.disabled);
    controls.forEach((control) => (control.disabled = true));
    $("#batchProgress").hidden = false;
    $("#batchProgress").max = entries.length;
    try {
      await autosave();
      await carouselWaitForPaint();
      for (const [i, entry] of entries.entries()) {
        $("#batchStatus").textContent =
          `${i + 1} / ${entries.length} · ${entry.row.title || "Projekt"} vorbereiten …`;
        await new Promise((resolve) => setTimeout(resolve, 0));
        const project = MKWBatchData.expand(
          template,
          entry.row,
          await asset(entry.asset),
          entry.index,
        );
        validate(project);
        validateCarousel(project);
        const result = await MKWProjectStore.save(project);
        generated.push(result.id);
        if (withExport) {
          p = project;
          activeChanged = true;
          revision = originalRevision + i + 1;
          const settings = {
              format: $("#batchFormat").value,
              quality: 90,
              png8: false,
              colours: 256,
              transparent: false,
            },
            boards = project.boards.filter((board) => board.checked),
            names = MKW.names(project.meta, boards);
          for (const [j, board] of boards.entries()) {
            const { blob } = await encodedBoard(board, settings);
            zipBytes += blob.size;
            if (zipBytes > 256 * 1024 * 1024)
              throw Error(
                "Die Bildserie ist grösser als 256 MB. Bitte weniger Datensätze auf einmal als ZIP exportieren. Bereits erstellte Projekte bleiben gesichert.",
              );
            downloads.push({
              name: `${String(i + 1).padStart(3, "0")}_${MKW.projectName(project.meta)}/${names[j].replace(/\.jpg$/, "." + settings.format)}`,
              bytes: new Uint8Array(await blob.arrayBuffer()),
            });
          }
          p = original;
          revision = originalRevision;
          activeChanged = false;
          clearExportCache();
        }
        $("#batchProgress").value = i + 1;
      }
      if (withExport && downloads.length)
        download(
          MKWBrowser.zip(downloads),
          MKW.clean(template.meta.title) + "_Serie.zip",
        );
      $("#batchStatus").textContent =
        `${generated.length} Projekte erstellt.${withExport ? " Bilder als ZIP an den Browser übergeben." : ""} Die Ausgangsvorlage bleibt erhalten.`;
      $("#batchOpenResult").hidden = !generated.length;
    } catch (error) {
      $("#batchStatus").textContent =
        `${generated.length} Projekte erstellt. Vorgang gestoppt: ${error.message}`;
      $("#batchOpenResult").hidden = !generated.length;
    } finally {
      if (activeChanged) {
        p = original;
        revision = originalRevision;
        savedRevision = originalSaved;
      }
      busy = false;
      controls.forEach((control, i) => (control.disabled = previous[i]));
      normalized.clear();
      clearExportCache();
    }
  }
  button.onclick = () => {
    if (!p.boards.length) {
      status("Bitte zuerst eine Gestaltung als Vorlage erstellen.");
      return;
    }
    $("#batchFormat").value = studioPreferences.exportFormat;
    preview();
    dialog.showModal();
  };
  $("#closeBatch").onclick = () => dialog.close();
  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  $("#batchDataFile").onchange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024)
        throw Error("Datendatei maximal 10 MB.");
      data = MKWBatchData.parse(await file.text(), file.name);
      mapping = MKWBatchData.suggest(data.columns);
      rows = [];
      mappingUI();
    } catch (error) {
      data = null;
      rows = [];
      preview();
      $("#batchStatus").textContent = error.message;
    }
  };
  $("#batchImages").onchange = (event) => {
    files = [...event.target.files];
    normalized.clear();
    preview();
  };
  $("#batchExample").onclick = (event) => {
    event.preventDefault();
    download(
      new Blob(
        [
          "\uFEFFDatum;Kürzel;Projektname;Übertitel;Konzerttitel;Untertitel;Copyright;Bilddatei\n19.11.26;E2;Herbstkonzert;DO 19. NOV 2026;Dichterlos;Musik entdecken;© Name;konzert.jpg\n;F1;Familienkonzert;FÜR DIE GANZE FAMILIE;Musikreise;Ab 6 Jahren;© Name;familie.jpg\n",
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "MKW_Serienimport_Beispiel.csv",
    );
  };
  $("#batchCreate").onclick = () => run(false);
  $("#batchExport").onclick = () => run(true);
  $("#batchOpenResult").onclick = async () => {
    await MKWProjects.open(await MKWProjectStore.open(generated[0]));
    dialog.close();
  };
  return { buildRows, run };
})();
