# Wochenstart-Bericht · 6. November 2026

## 1. Aktueller Projektstand

Das aktive Projekt liegt unter `/Users/noeplain/Developer/noe-plain.github.io/mkw-studio/studio`. Der separate Ordner `FD-Kampagnen-Layouttool` ist der ältere lokale Vorgänger. Ausgangsstand: Repository `edfa4d3`, letzte Studio-Änderung `ac5ca2a`; Arbeitskopie zu Beginn sauber. Die vorherigen Textkorrekturen sind bereits integriert.

- [GitHub-Repository](https://github.com/noe-plain/noe-plain.github.io): öffentlicher API-Abgleich zeigt denselben aktuellen Commit wie lokal. [Offene Issues](https://github.com/noe-plain/noe-plain.github.io/issues): keine am 6. November 2026.
- [Live-Studio](https://noe-plain.github.io/mkw-studio/studio/): HTTP 200; Projektstart im frischen Chrome erfolgreich, keine JavaScript-Fehler oder fehlgeschlagenen Ressourcen. Desktop und Tabletfenster geprüft. Der abgerufene HTML-Inhalt entspricht bytegenau dem lokalen Ausgangsstand.
- Die App arbeitet statisch auf GitHub Pages mit lokaler Projektsicherung. Modell, Seitenstruktur, Rendering, Export und Oberfläche bleiben getrennte Verantwortlichkeiten. Der geplante PDF-Bearbeitungsmodus bleibt pausiert.
- Das Browsing-Tool konnte GitHub und Live-Seite nicht abrufen; der Check erfolgte deshalb über direkte HTTPS-Abrufe und einen echten Browser. Es wurden keine CI-Ergebnisse unterstellt.

Die folgenden Änderungen sind umgesetzt, die Laufzeitdateien neu gebaut. Die Veröffentlichung wurde anschliessend beauftragt; der Abschlussbericht ergänzt den tatsächlichen GitHub- und Live-Status. Die neuen Kopier- und Umbenennungstests sowie die betroffenen Seiten-/Textregressionen laufen auch im expliziten Firefox-CI-Aufruf. Die Prüfung priorisiert Desktop und Tablet ab iPad-Mini-Grösse; Smartphone-Optimierung und spezielle Workflows für starke Sehbehinderung waren nicht Teil des Auftrags.

## 2. Zwei ausgewählte Kernprobleme und refactorter Code

### A · Kopieraktionen konnten ungültige Projekte erzeugen

**Priorität: P1, Datenintegrität.** Bei 500 Ebenen erzeugte Cmd/Strg+D eine 501. Ebene. Cmd/Strg+V und weitere Erzeugungswege besassen dieselbe Lücke. Eine Kopie mit dem üblichen Versatz von 30 px konnte ausserdem den zulässigen Koordinatenbereich verlassen. Solche Zustände werden bei der späteren Projektvalidierung abgewiesen.

**Lösung:** Gemeinsame Kapazitätsprüfung vor Änderungen und vor dem Undo-Eintrag. Duplizieren und Einfügen bereiten einen vollständigen Kandidaten samt Bildern und Fonts vor und validieren ihn vor dem Übernehmen. Fehler lassen Dokument, Assets, Auswahl, Revision und Undo unverändert. Der übliche Versatz und das Remapping von Bildverknüpfungen bleiben erhalten.

**Zu ersetzende Blöcke:** In `static/carousel.js` den bisherigen `carouselDuplicate()`-Block durch die folgenden drei Funktionen ersetzen; `carouselObject()` und `carouselImport()` erhalten die vorgeschalteten Prüfungen aus dem Patch. In `static/carousel-bootstrap.js` ruft Cmd/Strg+V jetzt denselben Einfügepfad auf. `static/carousel-input.js` sichert Option/Alt-Ziehen sowie einen abgewiesenen Textrahmen ab. `static/carousel-slides.js` prüft Kapazität und Koordinaten vor dem Duplizieren einer Slide.

```js
function carouselCanAddObjects(count) {
  if (p.carousel.objects.length + count <= 500) return true;
  status(
    "Ein Projekt kann höchstens 500 Ebenen enthalten. Entferne nicht benötigte Ebenen oder kopiere eine kleinere Auswahl.",
  );
  return false;
}

function carouselInsertCopies(objects, images = [], fonts = []) {
  if (!objects.length || !carouselCanAddObjects(objects.length)) return false;
  const copies = objects.map((o) => ({
    ...clone(o),
    id: uid(),
    x: o.x + 30,
    y: o.y + 30,
  }));
  MKWTemplateModel.remapLinks(objects, copies);
  const candidate = {
    ...p,
    images: [
      ...p.images,
      ...images.filter((im) => !p.images.some((a) => a.id === im.id)),
    ],
    fonts: [
      ...p.fonts,
      ...fonts.filter((font) => !p.fonts.some((f) => f.role === font.role)),
    ],
    carousel: { ...p.carousel, objects: [...p.carousel.objects, ...copies] },
  };
  try {
    if (copies.some((o) => Math.abs(o.x) > 100000 || Math.abs(o.y) > 100000))
      throw Error(
        "Verschiebe die Auswahl vor dem Kopieren näher an die Mitte der Montagefläche.",
      );
    validate(candidate);
    validateCarousel(candidate);
  } catch (error) {
    status("Kopie nicht eingefügt: " + error.message);
    return false;
  }
  checkpoint();
  const addedFonts = candidate.fonts.length !== p.fonts.length;
  p.images = candidate.images;
  p.fonts = candidate.fonts;
  p.carousel.objects.push(...copies);
  if (addedFonts) loadFonts();
  carouselUI.ids = new Set(copies.map((o) => o.id));
  carouselSelection = copies.at(-1).id;
  changed();
  return true;
}

function carouselDuplicate() {
  return carouselInsertCopies(
    carouselSelected().filter((o) => !carouselObjectLocked(o)),
  );
}

```

Der Einfügeaufruf im Cmd/Strg+V-Zweig lautet:

```js
carouselInsertCopies(
  carouselUI.clipboard,
  carouselUI.clipboardAssets,
  carouselUI.clipboardFonts,
);
```

### B · Artboard umbenennen ignorierte Enter und leere Eingaben

**Priorität: P2, täglicher Bedienablauf.** Enter im Namensfeld bestätigte nichts. Bei ausschliesslich Leerzeichen blieb der Dialog ohne klare feldbezogene Rückmeldung stehen.

**Lösung:** Ein echtes Formular verarbeitet Enter und den Bestätigungsbutton über denselben Pfad. Namen werden getrimmt und auf 1–80 Zeichen geprüft. Fehler erscheinen am Feld. Ein unveränderter Name schliesst ohne Undo-Eintrag; Escape bricht ab. Die gemeinsame Modelltransaktion bleibt für die Umbenennung zuständig.

**Zu ersetzender Block:** `renameBoard(info)` in `static/spread-layout-ui.js`:

```js
  function renameBoard(info) {
    const identity = p,
      dialog = document.createElement("dialog");
    dialog.id = "artboardRenameDialog";
    dialog.setAttribute("aria-labelledby", "artboardRenameTitle");
    dialog.innerHTML = `<form novalidate><h2 id="artboardRenameTitle">Artboard umbenennen</h2><label>Name<input id="artboardNameInput" value="${esc(info.name)}" maxlength="80" required></label><div class="studio-feedback-actions"><button type="button" data-board-cancel>Abbrechen</button><button type="submit" data-board-apply class="primary">Umbenennen</button></div></form>`;
    const input = dialog.querySelector("input");
    input.oninput = () => MKWFields.clear(input);
    dialog.querySelector("[data-board-cancel]").onclick = () => dialog.close();
    dialog.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      if (p !== identity) return;
      const name = input.value.trim();
      if (!MKWFields.validate(input, true)) {
        input.focus();
        return;
      }
      if (name.length > 80) {
        MKWFields.error(input, "Verwende einen Namen mit 1–80 Zeichen.");
        input.focus();
        return;
      }
      if (
        name === info.name ||
        commit(
          { type: "rename-artboard", id: info.id, name },
          "Artboard umbenannt.",
        )
      )
        dialog.close();
    };
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        document.querySelector("#spreadPages")?.focus({ preventScroll: true });
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector("input").focus();
    dialog.querySelector("input").select();
  }
```

**Finales UI-Tuning:** `static/spread-layout.css` teilt die bestehenden Dialogregeln nun über `:is(#movePagesDialog, #artboardRenameDialog)`. Der Namensdialog erhält dadurch 440 px Maximalbreite, 24 px Innenabstand, die vorhandenen Material-Farbrollen und ein 48 px hohes Eingabefeld. Hell/Dunkel im Tabletfenster visuell geprüft.

Der vollständige Quellcode-Patch enthält alle ersetzten Blöcke und Tests. Generierte Bundles werden nicht von Hand bearbeitet; nach dem Quellcode-Patch erzeugt `npm run build` die Laufzeitdateien und Inhaltsversionen neu.

## 3. Strukturierte Persona-Prüfmatrix

| Persona | Identifiziertes Feedback / Problem | Status (Gelöst / Offen für nächste Woche) |
| :--- | :--- | :--- |
| Neue Nutzerin | Eine abgewiesene Kopie braucht eine verständliche nächste Handlung; leere Namen dürfen nicht still ignoriert werden. Bestehende Statusanzeige erklärt die 500-Ebenen-Grenze, der Namensfehler steht direkt am Feld. | Gelöst – im Browser geprüft. |
| Erfahrener Designer | Cmd/Strg+D, Cmd/Strg+C/V, Option/Alt-Ziehen, Enter und Escape müssen verlässlich sein. Erfolgreiche Kopien bleiben um 30 px versetzt; Undo/Redo funktionieren. | Gelöst – Tastatur, echte Mausgesten und Undo/Redo geprüft. |
| Senior UX-Experte | Fehlgeschlagene Aktionen dürfen keine Projekt- oder History-Änderung erzeugen. Unveränderte Umbenennungen benötigen keinen zusätzlichen Bearbeitungsschritt. | Gelöst – Dokument, Revision, Assets und History bei Ablehnung unverändert; unveränderter Name schliesst. |
| UI-Expertin | Der Umbenennungsdialog hatte ein kleines ungestaltetes Feld und zu viel Breite. Er verwendet jetzt die bestehende Material-Oberfläche, Feldhöhe und Abstände. | Gelöst – nach Sichtprüfung automatisch nachgebessert; Hell/Dunkel und Tablet geprüft. |
| QA-Entwicklerin | Bisher fehlten Prüfungen für die 501. Ebene und Enter im Dialog. Zwei neue Suiten sind im Standardlauf registriert. | Gelöst – 157 Modelltests, Build, Formatprüfung und acht relevante Chrome-Suiten erfolgreich. |
| Der Fehlersucher | Wiederholtes Einfügen am Limit, Kopie am Koordinatenrand, veraltete Clipboard-Referenzen sowie Leerzeichen/81 Zeichen im Namen konnten ungültige oder unklare Zustände auslösen. | Gelöst für die untersuchten Wege – keine Teiländerung bei Ablehnung; korrigierte Eingaben bleiben nutzbar. |

### Tatsächliche Prüfung und letzte Korrekturen

- Vor der Änderung reproduziert: 500 → 501 Ebenen durch Cmd/Strg+D; Enter liess den Umbenennungsdialog offen.
- `npm test`: **157/157 bestanden**. Formatprüfung und Build erfolgreich.
- Acht unterschiedliche Chrome-Suiten erfolgreich abgeschlossen: `designer-copy-safety`, `artboard-rename`, `pages-panel`, `page-transfer`, `advanced-tools`, `carousel-limits`, `asset-cache`, `carousel-refinements`.
- Neue Grenztests: 499 → 500 erlaubt; weitere Duplikate/Paste und Slide-Kopie abgewiesen; neue Zeichen-/Importaktion und echte Option/Alt-Geste am Limit ohne Änderung. Kopien über die 100000-px-Grenze und ungültige Clipboard-Referenzen werden vor der Asset-Übernahme abgewiesen. Normales Kopieren, Undo/Redo und MKW-Rundlauf bleiben gültig.
- Die bestehenden Suiten prüfen zusätzlich Bildfüllungen/-ausschnitte, Verknüpfungen, Pfade, Fonts, Folder, PSD-Pixel, MKW-Wiederöffnung und Seitenlimits. Es wurden keine Pixeltoleranzen gelockert.
- `page-transfer` scheiterte zunächst auch im unveränderten Ausgangsstand: Beim automatischen Ziehen waren Quell- und Zielkarte durch den Inspector abgeschnitten, es entstand kein Drag-Ereignis. Die Testvorbereitung öffnet jetzt über die vorhandene Einstellung einen grösseren Eigenschaftenbereich und scrollt die Seitenliste in Sicht. Dieselbe echte Rand-Ziehgeste und alle inhaltlichen Assertions bleiben erhalten; der Test besteht danach.
- Finale Persona-Nachkontrolle: den Umbenennungsdialog an das vorhandene Dialogdesign angepasst und nach der Korrektur erneut geprüft. Keine offenen Fehler in den ausgewählten Abläufen.

Die Persona-Bewertung ist eine heuristische Prüfung mit automatisierten Szenarien, keine Studie mit sechs realen Personen. Tabletprüfung in einem 768 × 1024 Browserfenster; keine physische iPad-/Touchhardware-Abnahme. Kein Firefox-Lauf oder vollständiger Anwendungstest in diesem Durchlauf.
