# Neues Projekt: Überarbeitung aus fünf Perspektiven

Planungsstand: 27.10.2026. Umsetzung: 28.10.2026. NP-01–06, NP-08/09 umgesetzt und geprüft. NP-07: responsive Varianten, Themes, reduzierte Bewegung, Escape und Fokus geprüft; kein echter Screenreader-Test und keine gesonderte native 200-%-Browserzoom-Prüfung. PSD wurde am 28.10. zusätzlich beauftragt und separat bearbeitet. Siehe `RELEASE-2026-10-28.md`.

## Grundlage und Grenzen der Prüfung

Geprüft wurden `index.html`, `static/project-formats.js`, `static/carousel.js`, `static/carousel-policy.js`, `static/template-ui.js`, der Öffnungs-/Schliessablauf in `static/template-gallery.js`, die zugehörigen CSS-Regeln und `tests/material-setup.cjs`.

Zusätzlich visuell betrachtet: die vorhandenen Firefox-Aufnahmen `work/audits/comprehensive-2026-10-27/firefox/material-post-setup.png` und `material-setup-light-normal.png`. Diese sind frühere Prüfnachweise, keine neue Live-Prüfung. Für dieses Konzept wurden keine neuen Browser-, Screenreader- oder Nutzertests durchgeführt. Die fünf Rollen sind heuristische Perspektiven, keine Interviews.

## Fünf Perspektiven

| Perspektive | Befund / Risiko | Konsequenz für den Entwurf |
| --- | --- | --- |
| Neue Nutzerin | „FD-Kampagnen“ und „Designer“ erklären ihren Unterschied nicht. Viele Randwerte sehen wie Pflichtentscheidungen aus; „Safezone“ und „Schutzzone“ wechseln. | Modus mit je einer kurzen Erklärung. Projektname zuerst, sinnvolle bestehende Vorgaben sofort nutzbar. Einheitlich „Schutzzone“; eine kurze Erklärung direkt bei ihrer Vorschau. |
| Erfahrener Nutzer | Die gewählten FD-Formate brauchen viel vertikalen Platz. „Eigenes Format hinzufügen“ konkurriert im Abschlussbereich mit „Projekt erstellen“. Im Designer liegt die Slide-Anzahl relativ weit unten. | Kompakte Formatliste, Detailbearbeitung neben der Liste. Anzahl und Gesamtübersicht direkt beim Designer-Format. „Eigenes Format“ beim Listeninhalt, eine eindeutige Erstellen-Aktion im festen Footer. |
| UX/UI-Designerin | Der Dialog kombiniert grosse, unterschiedlich hohe Fieldsets, kleine wiederholte Vorschauen und einen weit gespannten Modusschalter. Links/rechts sind beim Designer anders aufgebaut als oben/unten. | Ruhiger Zweispaltenaufbau mit gemeinsamer Vorschau-/Schutzzonenkomponente. Einheitliche Beschriftung, Abstände und Zustände; vorhandene Material-Farbrollen und Dialogmasse wiederverwenden. |
| Barrierefreiheitsexperte | Auswahl eines Formats und Einblenden seiner Details sind unterschiedliche Vorgänge, die verständlich bleiben müssen. Versteckte Felder dürfen nicht im Fokusweg verbleiben. Gruppenfehler dürfen nicht beliebig alle Felder als fehlerhaft darstellen. | Checkbox = im Projekt enthalten; separate benannte Aktion = Details anzeigen. Native Semantik, sichtbarer Fokus, beschriebene Feldfehler, vollständiger Tastaturweg. Vorschau ist ergänzend, alle Werte sind auch als Text zugänglich. |
| Entwicklerin & QA-Testerin | Die Einrichtung hängt an mehreren Modulen und verketteten Click-Handlern. Beim Öffnen werden FD-Angaben zurückgesetzt, Designerwerte/Modus bleiben dagegen im DOM. Format hinzufügen rendert die komplette Liste neu. | Ein expliziter Dialogentwurf mit gemeinsamem Lebenszyklus, getrennt vom Dokument. Modus-/Vorlagenwechsel behalten Eingaben bewusst bei. Gezielte Aktualisierungen und atomare Projekterstellung; keine zusätzliche UI-Bibliothek. |

## Konkreter Aufbau

Ein übersichtlicher Dialog, kein verpflichtender mehrseitiger Assistent. Mit den Standardformaten reichen Projektname und „Projekt erstellen“.

1. **Kopf:** „Neues Projekt“, kurzer Zwecktext; feste Dialoggrenzen wie Öffnen/Speichern/Einstellungen. Abbrechen steht im Footer; Escape bleibt verfügbar, sofern kein unwiderruflicher Erstellvorgang läuft.
2. **Moduswahl:** zwei kompakte, beschriftete Optionen mit vorhandenen Google-Icons: „FD-Kampagnen“ / „Designer“. Unter der Auswahl eine kurze Erklärung des aktiven Modus:
   - FD-Kampagnen: „Mehrere Fotos mit einheitlichem Layout in verschiedenen Formaten.“
   - Designer: „Eine oder mehrere Slides frei gestalten.“
3. **Projektangaben:** „Projektname“ und „Kürzel“; Kürzel ist freiwillig und bekommt nur eine kurze Erklärung seines Verwendungszwecks beim Dateinamen. Kein zusätzliches Pflichtdatum.
4. **Hauptinhalt links:** Formatwahl bzw. Designer-Einrichtung.
5. **Hauptinhalt rechts:** grössere, schematische Vorschau mit zugehörigen Schutzzonen. Klarer Titel benennt das gerade bearbeitete Format. Keine echte Foto-/Dokumentvorschau erforderlich, keine Bilddecodierung beim Öffnen.
6. **Fester Footer:** knappe Zusammenfassung, „Abbrechen“ und eine gefüllte Hauptaktion „Projekt erstellen“. „Eigenes Format“ ist eine untergeordnete Aktion direkt bei der FD-Formatliste. Keine zwei gleich gewichteten Hauptaktionen.

### FD-Kampagnen

- Bestehende Vorgaben unverändert: 9:16 und 1:1 ausgewählt; 4:5 und 1080 × 1440 nicht ausgewählt. Bestehende Pixelmasse und Schutzzonen bleiben exakt erhalten.
- Formatzeilen zeigen immer Verhältnis, Breite und Höhe. Nicht gewählte Formate bleiben kompakt.
- Checkbox und Label schalten die Teilnahme am Projekt. Eine getrennte Aktion „Schutzzonen bearbeiten: 9:16“ öffnet die zugehörigen Details in der rechten Fläche. Sie darf eine Checkbox nicht unbeabsichtigt umschalten.
- Beim Anwählen eines Formats werden seine Details mit einem kurzen Übergang gezeigt. Der Tastaturfokus bleibt am bedienten Steuerelement; rechts ist das bearbeitete Format eindeutig bezeichnet.
- Die Zahl gewählter Formate und die resultierenden Grössen bleiben im Überblick. Eine vorhandene Formatzeile ist eindeutig der rechten Detailfläche zugeordnet, auch ohne Farbunterscheidung.
- Neues Format wird als bearbeitbarer Eintrag ergänzt und fokussiert. Alle vorhandenen Entwurfswerte bleiben erhalten. Eigene Formate können wieder aus dem Entwurf entfernt werden; Standardformate bleiben abwählbar.
- Ein Deselektieren verwirft bearbeitete Werte nicht. Doppelte ausgewählte Abmessungen werden verständlich an den betroffenen Zeilen markiert.

### Designer

- Format pro Slide, Slide-Anzahl und Vorschau der Anordnung stehen zusammen. 1–20 Slides bleiben möglich; Startwert 4, 1080 × 1350 px, weisser Hintergrund und alle aktuellen Randvorgaben bleiben erhalten.
- Rechts dasselbe Schutzzonenmodell mit oben/unten/links/rechts. Die Einstellungen gelten gemeinsam für alle Slides; Vorschau zeigt diese Bedeutung ausdrücklich.
- Anzahl per Zahleneingabe und zugänglichen Minus-/Plusaktionen; Grenzen sind erkennbar. Keine ausschliessliche Slider-Eingabe für präzise Zahlen.
- Der Übersichtsstreifen stellt maximal 20 einfache Flächen dar, ohne echte Renderarbeit. Gesamtbreite und -höhe bleiben lesbar; Breite pro Slide wird nicht mit Gesamtbreite verwechselt.
- „Mit Vorlage starten“ bleibt eine sekundäre Möglichkeit im Designer-Bereich. Beim Wechsel werden Name und Kürzel übernommen; Rückkehr stellt den gesamten bisherigen Einrichtungsentwurf wieder her. Kein dritter gleichwertiger Projektmodus.

### Gemeinsame Schutzzonen

- Eine proportional richtige schematische Zeichenfläche; oben/unten/links/rechts räumlich zugeordnet, Beschriftung in beiden Modi gleich.
- Eine einzige Erklärung: „In diesem Bereich bleiben wichtige Texte und Logos innerhalb der Hilfslinien.“ Nicht behaupten, alle Bildinhalte würden dort automatisch beschnitten.
- Alle Werte bleiben präzise in px einstellbar. Keine neue Kopplung gegenüberliegender Ränder und keine neuen Standardwerte.
- Feldwerte sind die Quelle; Vorschau ist eine kleine abgeleitete Darstellung, keine zweite Zustandsverwaltung.
- Bei ungültigen oder vorübergehend leeren Werten bleibt die letzte gültige Vorschau stabil. Rohwerte werden nicht still zu 0 konvertiert. Zulässige Wertebereiche und bestehende Modusunterschiede bleiben erhalten.

## Material 3: begründete Komponentenwahl

- Einrichtungsdialog mit Titel, Inhaltsbereich und Abschlussaktionen. Die Komplexität rechtfertigt eine grosse aufgabenbezogene Fläche; schmale Displays erhalten eine platzfüllende Darstellung. [Offizielle Dialog-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md).
- Ausfüllbare, dauerhaft beschriftete Text-/Zahlenfelder, Einheit px und zugeordnetes Fehlerfeedback. [Offizielle Textfelder](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md).
- Checkboxen für mehrere gleichzeitig gewählte FD-Formate, keine Switches für diese Zusammenstellung. [Offizielle Checkbox-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/checkbox.md).
- Hauptaktion gefüllt, Abbrechen als Textaktion, Zusatzformat als untergeordnete Aktion; semantische Farbrollen statt Sonderfarben. [Offizielle Buttons](https://github.com/material-components/material-web/blob/main/docs/components/button.md).
- Für die kompakte Modusauswahl die aktuelle Expressive-Button-Group-Empfehlung vor der Umsetzung im Browser prüfen; eindeutige Einzelauswahl beibehalten. [Material 3 Button groups](https://m3.material.io/components/button-groups/overview).
- Die M3-Website lieferte beim Abruf nur den JavaScript-Hinweis. Die lesbaren offiziellen Repository-Dokumente dienen hier als überprüfte Implementierungsreferenz. Material Web befindet sich laut [offizieller README](https://github.com/material-components/material-web#readme) im Wartungsmodus. Keine pauschale Migration auf diese Bibliothek; native Elemente und bestehende Tokens bleiben die Grundlage.
- Zweispaltenaufbau, kompakte Formatliste, Vorschauzuordnung und Verzicht auf Pflichtschritte sind eigene UX-Entscheidungen für dieses Produkt, keine behaupteten Material-Vorgaben.
- Kurze Zustands-/Einblendübergänge mit vorhandenen Motion-Tokens; keine dekorative Dauerschleife. Reduzierte Bewegung wird respektiert. Echte Wartezeiten bei Erstellung/Vorlagen zeigen vorhandene Ladeindikatoren; keine künstliche Ladepause beim Umschalten.

## Technischer Plan und Prioritäten

| ID | Priorität | Aufgabe / Fundstelle | Prüfkriterium | Status |
| --- | --- | --- | --- | --- |
| NP-01 | P0 | Isolierten Einrichtungsentwurf mit Öffnen, Moduswechsel, Vorlagenrückkehr und Abbrechen definieren; `project-formats.js`, `carousel.js`, `template-gallery.js`. | Alle Eingaben bleiben bei internen Wechseln erhalten; Abbruch ändert weder Dokument, Revision, Undo noch Dateiverknüpfung. Neuer Einstieg startet bewusst mit Defaults, kein gemischter Altzustand. | Umgesetzt / geprüft |
| NP-02 | P0 | Projekterstellung als einen kontrollierten, vorab validierten Vorgang bündeln; bisher verkettete Handler untersuchen. | Ein Klick erzeugt genau ein Projekt, erneuter Klick während Erstellung wirkungslos; Vorbereitungsfehler lassen bisherigen Stand und Entwurf erhalten. Speicherungsergebnis/Fehler danach eindeutig. Bestehendes Autosave-/Konfliktverhalten nicht umgehen. | Umgesetzt / geprüft |
| NP-03 | P1 | Dialoghülle, Modusbeschreibungen, Projektangaben und festen Footer angleichen. | Hauptaktion/Abbrechen bleiben bei kurzem Fenster erreichbar; keine horizontale Überbreite. Standard-FD-Projekt nur mit Name erstellbar. | Umgesetzt / geprüft |
| NP-04 | P1 | FD-Formatliste und getrennte Detailfläche. | Defaults/alle Werte unverändert; Checkbox und Detailaktion unabhängig; Auswahl, Bearbeitung und Mehrfachformate über Tastatur möglich. | Umgesetzt / geprüft |
| NP-05 | P1 | Gemeinsamer visueller Schutzzoneneditor und Designer-Anordnung. | Vier Ränder in beiden Modi, Format-/Gesamtabmessungen korrekt; 1 und 20 Slides funktionieren, 0/21/Bruchteile werden abgewiesen. | Umgesetzt / geprüft |
| NP-06 | P1 | Entwurfsvalidierung und Fehlerrückmeldung vereinheitlichen. | Leere Werte, NaN, Dezimalwerte, zu grosse Flächen, negative/überlappende Ränder, keine Auswahl und Duplikate verständlich; Fokus beim ersten verursachenden Feld, nicht pauschal alle Felder rot. | Umgesetzt / geprüft |
| NP-07 | P1 | Tastatur, Fokus, mobile Darstellung und Bewegung. | 390 × 844, 700 × 500, 1024 × 768 und Desktop; 200 % Zoom, lange Namen, alle vier Farbschemata in Hell/Dunkel; reduzierte Bewegung. Verdeckte Felder nicht im Fokusweg, Escape/Fokusrückkehr korrekt. | Geprüft mit dokumentierten Grenzen |
| NP-08 | P2 | Format hinzufügen gezielt aktualisieren, UI-Verantwortung bündeln. | Bestehende Zeilen und Fokus bleiben stabil; Vorschau ohne Fotos/Fonts/Vorlagen vorzuladen; kein Hintergrundpolling. Vorhandene Validators bleiben massgeblich. | Umgesetzt / geprüft |
| NP-09 | P1 | Regression und Wiki vor Veröffentlichung. | Format-/Modelltests, Firefox-Setup-/Vorlagen-/Speicherabläufe sowie Dokumentvergleich und relevante Render-/Exporttests bestehen; Wiki erklärt echten Ablauf. Chrome-Erstellablauf zusätzlich prüfen. Keine Photoshop-Tests für dieses UI-Vorhaben behaupten. | Umgesetzt / geprüft |

## Sinnvolle Reihenfolge

1. Entwurf und sichere Erstellung (NP-01/02), damit neue Oberfläche keine alten Zustandsprobleme verdeckt.
2. Dialoghülle, gemeinsame Randbearbeitung, FD und Designer (NP-03–05).
3. Fehler-, Tastatur- und Responsive-Zustände (NP-06/07), gezielte Aktualisierungen (NP-08).
4. Firefox-Regression, visuelle Kontrolle, Wiki und erst danach Veröffentlichung (NP-09).

Produktfunktionen, bestehende Dateien und erstellte Designs werden dabei nicht geändert. PSD-Arbeit bleibt separat im Plan `PSD-EXPORT-VERBESSERUNG-2026-10-27.md`.
