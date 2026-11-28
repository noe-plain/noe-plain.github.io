# Bézier-Lernspiel, Wiki-Fachprüfung und Exportvorschau · 28. November 2026

## Ausgangsprüfung auf GitHub

Der vollständige Lauf [46130914344](https://github.com/noe-plain/noe-plain.github.io/actions/runs/46130914344) war in **Chromium und Firefox fehlgeschlagen**. Windows-MKW-ZIP war erfolgreich. Die tatsächlichen Anmerkungen beider Browser nennen denselben Test: `sponsors-help` erwartete acht Wiki-Kapitel statt der inzwischen vorhandenen zehn.

Nach der Korrektur wurde im lokalen Ablauf zusätzlich sichtbar: Der alte Test verwendete einen inzwischen mehrfach vorhandenen Link ohne Kapitelkontext und erwartete den Textanker noch im FD-Kapitel. Er wählt jetzt gezielt den Link aus dem Designer-Kapitel und erwartet korrekt das gemeinsame Textkapitel. Zehn Kapitel, interne Navigation, Suche, Lazy Loading, Fokus, schmale Fenster, Hilfe ohne JavaScript, Sponsoren, MKW/PNG/PSD und Asset-Bereinigung bleiben weiterhin Prüfgegenstand. Keine Prüfregeln entfernt. Der korrigierte vollständige `sponsors-help`-Ablauf besteht lokal.

## Lernspiel

Sechs eigene geführte Lektionen plus freies Üben:

1. Ecken mit Klicks setzen und eine offene Linie beenden.
2. Kurven mit Klicken und Ziehen aufziehen.
3. Griffachsen mit Shift auf 45°-Schritte ausrichten.
4. Mit Control die andere Grifflänge erhalten; sichtbare Alternativen «Richtung verbunden» und «Frei».
5. Offene Enden fortsetzen und zwei Linien verbinden.
6. Eine Form ausdrücklich am ersten Punkt oder über die sichtbare Aktion schliessen.
7. Frei üben ohne vorgegebenes Ergebnis.

Zielkontur gestrichelt, eigener Pfad durchgezogen, optionale Zielpunkte/Griffe und Krümmungskamm («Kurvenenergie»), verständliche Ergebnisrückmeldung ohne Zeitdruck. Schritt zurück/vor, Neustart, Abbrechen und freie Lektionenwahl. Punkte und Griffe über Maus, Touch, Zahlenfelder und fokussierbare SVG-Bedienflächen mit Pfeiltasten bearbeitbar. Native Aktionen für Fortsetzen, Verbinden und Schliessen ergänzen die direkte Flächenbedienung.

Inspiration ist das Lernprinzip von [The Bézier Game](https://bezier.method.ac/): eine Zielkontur interaktiv nachzeichnen. Eigene Formen, eigener Code und Studio-Tastenregeln; keine kopierten Spielgrafiken und kein externer Iframe.

### Technische Grenzen und gemeinsame Ursachen

- Reine Geometrie aus `carousel-curves.js`/`carousel-curvature.js` nach `path-model.js` verschoben; bestehende Studio-Funktionen delegieren ohne mathematische Änderung. Spiel und Studio benutzen dadurch dieselbe Kurvenauswertung, Griffkopplung, Umkehrung/Verbindung und Krümmungsberechnung.
- Flüchtiges, separates Übungsmodell ohne Projektvariable, Assets oder Autosave. Höchstens 80 Punkte, acht Pfade und 60 Undo-Schritte. Drag-Abbruch stellt den vorherigen Zustand wieder her; Fortsetzung kann vollständig verworfen werden.
- Drei lokale Scripts werden erst mit «Kurven-Lernspiel starten» geladen; der Build versioniert ihre Abhängigkeiten gemeinsam. Fehler haben einen erneuten Versuch. Öffnen des Wikis allein lädt keinen Spielcode. Wiederöffnen verwendet geladene Ressourcen; Schliessen der Übung entfernt deren Observer und ausstehende Frame-Arbeit.
- SVG-Aktualisierungen pro Animationsframe gebündelt, Krümmungssamples begrenzt. Geometrieprüfung erst bei ausdrücklichem Prüfen. Es wird keine pauschale Geschwindigkeitssteigerung behauptet.
- Der Krümmungskamm ist eine relative Ansichtshilfe, keine physikalische Energieeinheit. Die geometrische Bewertung verwendet begrenzte Stichproben und Toleranzen; sie ist ein Lernfeedback, keine mathematische Gleichheitsprüfung beliebiger Pfade.

## Illustrationen und Kontrast

Das Wiki hat nun **13 statische HTML-/SVG-Abbildungen**, dazu die interaktive Übungsfläche. Neue Abbildungen erklären Eckpunkte/verbundene/freie Griffe und offene/geschlossene Pfade.

Die Kontrastabbildung zeigt dasselbe schematische Foto vor und nach einem schwarzen, transparent auslaufenden Verlauf. Der Text erklärt euren tatsächlichen Ausgangspunkt: Bild unter dem hellen Text abdunkeln, zum übrigen Foto weich auslaufen lassen. Eine feste dunkle Fläche wird als gleichmässigere, aber bildverdeckende Alternative eingeordnet. Keine pauschale Kontrastgarantie für jeden Verlauf. «Deckkraft 0 %» und das tatsächlich andersherum arbeitende Zahlenfeld «Transparenz 100 %» werden ausdrücklich unterschieden.

## Fachliche Prüfung des Handbuchs

Zwei redaktionelle Fachperspektiven (Gestaltung/Toolbedienung), anschliessend simulierte Anfängerprüfung. Keine tatsächlichen externen Fachpersonen oder unerfahrenen Testpersonen beteiligt. Die Kapitel wurden redaktionell und anhand der folgenden zuständigen Module abgeglichen. Das bedeutet keine vollständige manuelle Neuabnahme jeder dokumentierten Spezialfunktion.

| Bereich | Sachprüfung / Fundstelle | Korrektur oder Ergebnis |
| --- | --- | --- |
| Erste Schritte / Grundlagen | `project-setup.js`, `campaign-card-ui.js`, `campaign-title-model.js`, `paint-model.js`, `paint-picker.js` | Geführter Einstieg bleibt ausführbar. Abdunklung durch Verlauf statt abgebildeter fester Fläche; Deckkraft und Transparenz richtig zugeordnet. |
| FD-Kampagnen / Backup | `campaign-title-model.js`, `campaign-model.js`, `carousel-sidebar.js`, `state.js` | Aktuelle Kartenfelder starten fest mit 70/120/55 px. Alte feste Textarten und neue native Absätze nicht vermischen; individuelle Eigenschaften bleiben getrennt vom Textinhalt. |
| Designer / Pfade | `carousel-curves.js`, `carousel-path-drawing.js`, `carousel-curvature.js`, `path-model.js` | Shift/Control/Alt, Fortsetzen, Verbinden und ausdrückliches Schliessen abgeglichen. Spiel verwendet dieselben reinen Regeln. |
| Texte | `text-edit-model.js`, `carousel-sidebar.js`, `campaign-title-model.js` | Keine Texteingabe rechts in den aktuellen Modi behaupten. FAQ für leere Felder verweist auf Ebenenauswahl und «Auf der Fläche». |
| Speichern / Wiederöffnen | `project-session.js`, `project-dialogs.js`, `project-store.js` | Browsersicherung und lokale Datei unterscheiden; Firefox-Download und Chrome-Verknüpfung, Konflikte, höchstens fünf Projekte und separate MKW-Setup-Datei beibehalten. |
| Bildexport / PSD | `export.js`, `export-panel.js`, `psd.js`, `carousel-psd.js` | «Rahmen füllen» gilt für aktuellen FD und Designer; «Fläche füllen» bleibt Backup. Aktueller FD nutzt Designer-PSD mit Slices, nicht zugesagte native Photoshop-Artboards. Entsprechende alte Aussage korrigiert. |
| Einstellungen / Schriften | `settings-ui.js`, `state.js`, `campaign-title-model.js` | Einstellbare feste Textarten nicht mit den neuen Karten-Startwerten verwechseln. Auch Überschrift der betreffenden Einstellung präzisiert; keine bestehende Typografie geändert. |
| Tastenkürzel / Fehler | Editor-Tastenhandler, `carousel-curves.js`, `paint-picker.js`, `project-dialogs.js` | Einheiten und Änderungsumfang geprüft; falschen Sidebar-Schreibweg und alte Füllen-Beschriftung in FAQ korrigiert. |

## Höhere Exportvorschau

Dialoggrösse und verfügbare Funktionen bleiben erhalten. In der Vorschau kompaktere Navigation, reduzierte innere Leerabstände und mehr nutzbarer Bildraum. Bei 1500 × 1100 CSS-Pixeln zeigt dieselbe Hochformat-Testausgabe **515 statt 447 px Bildhöhe** (+68 px). Das ist eine konkrete Vergleichsmessung, keine Zusage für alle Formate/Fenster. Vor/Zurück bleiben auf festen Plätzen; lange Namen scrollen innerhalb ihres begrenzten Bereichs. Auswahl, Kommentare, Meldungen, Originalpixel, Einpassen und Download bleiben vorhanden.

## Fünf-Persona-Abnahme

| Persona | Feedback und Entscheidung | Status |
| --- | --- | --- |
| Neue Nutzerin | Kurze Ziele, gestrichelte Vorgabe, klare Legende und unmittelbare Ergebnisprüfung. Zahlenfelder sind als benannte Alternative aufklappbar. Keine versteckte Pflicht, eine Lektion vor dem Weitergehen perfekt zu treffen. | umgesetzt, geführte Browserabläufe; echte Anfänger-Schulung offen |
| Erfahrener Nutzer | Direkter Wechsel, Undo/Redo, Shift/Control/Alt und numerische Korrektur. Mehr Höhe für die Exportbeurteilung, Navigation bleibt fest. | betroffene Abläufe automatisiert geprüft |
| UX/UI-Designerin | Bestehende Theme-Rollen, klare Trennung von Übung und Projekt. Bedienelemente auf Aufgabe reduziert, Zahlenbearbeitung nachgeordnet, zusätzliche Erklärgrafiken. Gefundenen Hover-Kontrastfehler vor Veröffentlichung behoben. | visuelle Kontrolle und Zustandsprüfung |
| Barrierefreiheitsexperte | Native Labels/Buttons, Live-Rückmeldung, SVG-Punkte mit Namen und Tastaturzugang, Zahlenalternative für Drag-Vorgänge. Keine reine Farbcodierung, keine Pflichtanimation. | automatische Axe-/Tastaturprüfung; manuelle Screenreader-/Hardware-Abnahme offen |
| Entwicklerin / QA | Gemeinsame reine Geometrie, begrenztes lokales Modell, atomarer Drag-Abbruch, Lazy Loading mit Retry und getrennte Tests für Modell und echte Oberfläche. | Modell-/Browsernachweise unten; externe CI separat |

## Prüfnachweise und Grenzen

Prüflogs/Screenshots im Arbeits-Checkout `checkpoints/BEZIER-WIKI-2026-11-28/`. Ausgangsfehler und Zwischenfehler bleiben zur Nachvollziehbarkeit erhalten und zählen nicht als bestandene Endprüfung. Endergebnisse werden nach dem letzten Lauf ergänzt.

Nicht durchgeführt: echte Schulung mit Testpersonen, manuelle Screenreader-Sitzung, physische Touchgeräte, Photoshop-Neuabnahme, sämtliche Browser-/Gerätekombinationen. Das Spielen bei unverändertem Theme und unveränderter Fenstergrösse wird auf vollständige Projekt-/Undo-Gleichheit geprüft; ein Theme-Wechsel oder tatsächlicher Browser-Resize kann den gespeicherten Scrollversatz der Arbeitsfläche begrenzen, darf aber keine Gestaltung verändern. Lokales Firefox startet weiterhin wegen fehlender `libmozglue.dylib` nicht; die GitHub-Matrix führt echtes Firefox auf einem frischen Runner aus. Keine Neuinstallation oder Umgehung dieser Prüfung. PDF bleibt pausiert.

### Abschliessend tatsächlich bestandene Prüfungen

- Formatierung, `npm run format:check`, zusätzliche Prettier-Prüfung der Wiki-/Spiel-Dateien, Build und `git diff --check` erfolgreich.
- **246/246 Modell-/Strukturtests** erfolgreich, darunter neun neue Spiel-/Geometrietests: Endpunkte, Kurvenmitte, Griffkopplung, endliche Krümmung, jede Lektion mit falschem Startzustand und richtigem Ziel, Undo/Redo, Umkehrung/Verbindung, Abbruch nach vielen Schritten und Limits.
- **16 unterschiedliche Chromium-Suiten** bestanden: `bezier-game`, `export-preview-space`, `wiki-training`, `wiki-illustrations`, `material-paint-wiki`, `sponsors-help`, `path-continuation`, `path-bounds`, `paint-paths`, `advanced-tools`, `carousel-refinements`, `export-panel`, `review-comments`, `review-comments-fd`, `settings-redesign`, `seven-perspectives`.
- Der erste gemeinsame Lauf war 15/16, weil der Isolationstest vor Änderungen der Ansichtsfarbe und Fenstergrösse unterscheiden musste. Die vollständige Projekt-/History-Gleichheit wird jetzt direkt nach dem Spielen vor diesen zusätzlichen UI-Änderungen geprüft. Die Gestaltung bleibt auch danach gleich; erlaubte Pan-Clamps werden gesondert benannt. Der korrigierte Spieltest und anschliessend alle fünf direkt betroffenen Wiki-/Exportsuiten wurden erneut erfolgreich ausgeführt (`release-browser.log`, 5/5). Kein fehlgeschlagener Zwischenlauf wird als grün ausgegeben.
- Tatsächliche UI-Lektionen mit Maus, synthetischer Touch-Eingabe, Shift/Control, Enter, Zahlenfeldern, SVG-Pfeiltasten, Undo/Redo, Pointer-Abbruch und Wiederöffnung. Simulierter Ladefehler mit erfolgreichem erneuten Versuch; kein Spielcode vor Öffnen der Übung. Axe ohne Befund im ausgeklappten Spiel; allgemeine Prüfung über 42 Kontexte ebenfalls ohne automatischen Befund.
- Helle/dunkle Abbildungen und Übung, vollständige eigenständige Lektion, Kontrastverlauf und grössere Exportvorschau visuell angesehen; Mobil-/Kurzfensterüberlauf geprüft. Höchstens 600 px breite Übungsfläche lässt Aufgabe und Aktionen näher beieinander stehen.
- Bestehende Pfadpixel, Transformationsgrenzen, MKW-/PSD-Ergebnisse und Kommentare wurden durch die relevanten Bestandssuiten auf Regression geprüft. Dies ersetzt keine neue manuelle Photoshop-Abnahme.
- Die neuen Spiel-/Vorschautests stehen sowohl im Chromium-Standardlauf als auch in der expliziten Firefox-Matrix. Neue Release-Ergebnisse werden nach dem Push separat abgefragt.
