# Projekt öffnen und speichern: Material-3-Überarbeitung

Stand: 27.10.2026 · Ausgangsstand `797059c01a7b4dcaf2d14c717da8cb7d89b6d68d`.

## Entscheidung aus fünf Perspektiven

| Perspektive | Wichtigster Bedarf | Umsetzung |
|---|---|---|
| Neue Nutzerin | MKW zum Weiterarbeiten von PSD und fertigen Bildern unterscheiden; Browserstand von Computerdatei unterscheiden. | Zwei benannte Quellen beim Öffnen. MKW als primäre Speicheraktion, weitere Formate in einer eigenen Gruppe; direkter Übergang zum Export. |
| Erfahrener Nutzer | Verknüpfte Datei schnell aktualisieren, zweite Datei bewusst anlegen; wenig unnötige Schritte. | Primäraktion folgt Browser und Dateiverknüpfung. Zusätzliches Speichern unter nur bei bereits verknüpfter Datei; Shortcut bleibt. Live-Vorschau des tatsächlich bereinigten Dateinamens. |
| UX/UI-Designerin | Eindeutige Hierarchie, zusammengehörige Felder, konsistente Flächen und Zustände. | Gemeinsame Dialoggrösse mit Studio/Wiki, ruhige Material-Flächen, 24/28-px-Abstände, grosse Schaltflächen. Gesonderter Statusbereich und fest sichtbare Speicheraktion. |
| Barrierefreiheitsexperte | Beschriftete Aktionen, Tastatur/Fokus, lesbare Kontraste, verständliche Fehler. | Native Dialoge, semantische Projektliste, Textkennzeichnung des aktuellen Projekts, Fokus-Rückkehr, Textfehler und Ladeanzeige. Keine Kommunikation ausschliesslich über Farbe. |
| Entwicklerin & QA | Speicher-/Konfliktregeln und Dateiidentität erhalten; keine unnötige Bildarbeit beim Öffnen. | Eigene Darstellungsschicht für bestehende IDs und Handler, nur Listenmetadaten, keine Thumbnail-Decodierung. Schutz vor parallelem Speichern schon während Dateiauswahl; Schutz vor verspäteten Listenantworten. |

Die Perspektiven sind heuristische Rollen, keine Befragung von fünf realen Personen.

## Öffnen

- Linke Hauptfläche: bis fünf Browserprojekte mit Name, Modus, Zeit und gegebenenfalls verknüpftem Dateinamen. Das aktuelle Projekt wird ausdrücklich bezeichnet; seine Löschaktion bleibt deaktiviert.
- Rechte Fläche: MKW-Datei vom Computer öffnen. Bei schmalen Fenstern steht diese Dateiauswahl über der Liste.
- Lade-, Leer- und Fehlerzustände behalten den Kontext. „Erneut laden“ wiederholt einen fehlgeschlagenen Listenabruf, die Dateiauswahl bleibt verfügbar.
- Eine Antwort eines zuvor geschlossenen Dialogs darf eine frisch geladene Liste nicht ersetzen.
- Löschen bleibt hinter der vorhandenen ausdrücklichen Rückfrage. Datei-/Projektkonfliktregeln bleiben im bestehenden Session-Service.

## Speichern

- Hauptbereich: Projektangaben und MKW-Dateiname. Datum bleibt freiwillig, mit Hinweis bei fehlendem Datum. Flexible Datumsformate bleiben erhalten.
- Name und tatsächlicher neuer Dateiname werden getrennt gezeigt; die Vorschau verwendet den vorhandenen Dateinamen-Helper. Bei einer verknüpften Datei ist benannt, dass der geänderte Name für Speichern unter/PSD gilt.
- Feststehende Aktion unten: erstmalig native Speicherortauswahl, Aktualisieren einer verknüpften MKW-Datei oder Firefox-Download. Die zusätzliche Speichern-unter-Aktion wird nur für eine bereits verknüpfte Datei benötigt. Dieselbe Funktion bleibt über Cmd/Ctrl+Shift+S verfügbar.
- PSD und Designer-Vorlage bleiben erreichbar. „Zum Export“ führt zu JPG/PNG/WebP bzw. Designer-PDF. MKW bleibt das bearbeitbare Studio-Projekt.
- Während Dateiauswahl/Verarbeitung sind doppelte Schreibaktionen gesperrt. Bei Abbruch bleibt der Dialog mit Rückmeldung benutzbar. Laufendes Schreiben wird nicht durch einen scheinbaren Abbrechen-Button unterbrochen.

## Material-Quellen und eigene Entscheidungen

- [Offizielle Dialog-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md): Titel, Inhalt, Aktionen und zugängliche Beschriftung; der vorhandene native Dialog bleibt erhalten.
- [Offizielle Button-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/button.md): gefüllte, tonale, umrandete und Textvarianten. Die Primäraktion nutzt die semantische Hauptfarbe, zusätzliche Möglichkeiten erhalten geringere visuelle Priorität.
- [Offizielle Listen-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/list.md): vertikale Einträge mit Haupt-/Zusatztext und Aktionen. Unsere Projektliste verwendet native Buttons innerhalb semantischer Listeneinträge.
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): Modalität, Tastatur und Fokus.

Das Zweispaltenlayout, die Priorisierung von MKW und die kompakte Liste bei maximal fünf Projekten sind eigene produktbezogene UX-Entscheidungen. Es wird keine konkrete Material-Vorgabe für Dateiformate, Browserretention oder exakt diese Anordnung behauptet. Die M3-Website selbst benötigt JavaScript; verwendet wurden die lesbaren offiziellen Repository-Dokumente.

## Akzeptanzkriterien

| Kriterium | Nachweis |
|---|---|
| Formate und Funktionen erhalten | Vorhandene Speicher-, PSD-, Vorlagen-, Export-, Retention- und Konflikttests; neuer Test der Export-/Vorlagenübergänge. |
| Fokus und Bedienung verständlich | Native Escape-/Schliessen-Rückkehr, benannte Buttons und aktuelles Projekt; neuer `project-dialogs`-Test. |
| Hauptspeicheraktion bleibt sichtbar | Test vergleicht Position vor und nach Scrollen im Dialoginhalt. |
| Fehler nicht blockierend | Defekter Listenabruf → Dateiöffnen bleibt aktiv; Retry lädt die Liste; alte Antwort ersetzt neue Liste nicht. |
| Kein paralleles Speichern bei offenem Chooser | Verzögerte Picker-Promise, zweiter Save ignoriert, Abbruch stellt Bedienung wieder her. |
| Native und Firefox-Dateiwege bleiben korrekt | `project-open`, `project-storage`, `native-incremental-save`, neue Fehler-/Abbruchfälle. |
| Responsive und visuelle Qualität | Hell/Dunkel, 1500×1050, 1024×768, 390×844, 700×500; Screenshots und automatische Überbreiten-/Kontrastprüfung. |
| Bestehende Designs bleiben erhalten | Dokumentvergleich beim Dialogöffnen; vorhandene Render-/Export- und Grossprojekt-Regression. |

Eine ältere sehr spezifische Light-Theme-Regel überstimmte zunächst den Text auf dem neuen primären Dateiöffnen-Button. Der komponenteneigene Farbrollen-Selektor wurde korrigiert; die Kontrastprüfung bleibt unverändert aktiv. Keine Ausnahme im Test hinzugefügt.

Vollständige manuelle Screenreader- und physische Touchgeräteprüfungen sind weiterhin nicht erfolgt. Testergebnisse und Artefakte werden lokal unter `work/audits/project-dialogs-2026-10-27` abgelegt; GitHub-Prüfungen nach dem Push sind separat zu bewerten.

## Vorherige GitHub-Prüfung und zusätzliche Korrekturen

Die GitHub-Prüfung der vorherigen Veröffentlichung (Run 40501496035) meldete drei Browserfehler. Diese waren im ursprünglichen lokalen Lauf nicht aufgetreten:

- `settings-redesign`: Die Orientierung wurde unmittelbar nach dem Resize geprüft, bevor das asynchrone Media-Query-Änderungsereignis angekommen war. Der Test wartet jetzt auf die zur tatsächlichen Media Query passende Orientierung und prüft danach weiterhin den erwarteten Wert.
- `sponsors-help`: Ein fester Zieh-Zielpunkt war keine robuste Beschreibung von „hinter dieses Logo“. Der echte Drag-and-drop-Test verwendet jetzt 75 % der aktuell gemessenen Zielhöhe; die erwartete Reihenfolge, Speicherung und anschliessenden Gruppenwechsel bleiben unverändert.
- `comprehensive-check`: Der erwartete Endpunkt war nicht erreicht. Zusätzlich zu einer zu frühen Prüfung konnte die Scroll-Tastaturaktion einen zwischengespeicherten maximalen Wert verwenden. End und Clamping lesen nun die aktuelle Viewport-Ausdehnung; der Test wartet auf die fertige Designer-Vorschau und den tatsächlichen Scrollzustand statt fester 80 ms. Die Endpositions- und Rundungsgrenzen bleiben unverändert geprüft. Der genaue zeitliche Ablauf des Linux-Fehlers wurde lokal nicht vollständig reproduziert.

Die neue Listenanzeige behält ausserdem die eindeutige Angabe „n / 5 Projekte“ und den Hinweis auf automatisches Entfernen älterer Browsersicherungen; der Retention-Test bleibt unverändert.

## Lokales Abschlussresultat

- Produktionsbuild, Formatprüfung und 124/124 Modelltests erfolgreich.
- 16 unterschiedliche Firefox-Suiten erfolgreich. Im ersten 14er-Lauf schlug nur der unveränderte Retention-Test auf die gekürzte Zählungsbeschriftung an; die eindeutige vollständige UI-Beschriftung wurde wiederhergestellt und die betroffenen fünf Suiten bestanden. Nach den letzten Änderungen zusätzlich beide Dialog-/Sponsor-Suiten erfolgreich.
- Sieben unterschiedliche Chromium-Suiten erfolgreich, einschliesslich echter Dateihandles, 50-Bilder-Datei, inkrementeller Updates, Speicherfehler-/Abbruchfällen und erneuter Sponsor-DnD-Prüfung. Die DnD-Prüfung wurde um gemeinsame Sichtbarkeit beider Drag-Enden ergänzt; alle echten Verschiebeaktionen und erwarteten persistierten Reihenfolgen bleiben geprüft.
- 42 UI-Kontexte im Firefox-Audit erfasst, ohne unerwartete automatische Accessibilitybefunde. Neue Dialoge zusätzlich in beiden Themes und vier Fenstergrössen geprüft.
- Manuell angesehen: Speichern und Öffnen auf Desktop sowie beide schmalen Dialoge, darunter dunkle Darstellung. Weitere Screenshots wurden automatisch erfasst.
- Der Speichern-Shortcut verhindert während laufender Speicherung zusätzlich den nativen Browser-Befehl zum Speichern der Webseite.
- Gepackte UI-Assets wachsen lokal um rund 2 kB. Kein neues Bildladen für die Projektübersicht. Dies ist keine pauschale Performancegarantie.
- GitHub-Prüfung und Veröffentlichung müssen nach dem Push gesondert bestätigt werden.
