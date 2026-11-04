# Wochenstart-Review – Designer, Text und Seiten

Stand: 4. November 2026. Zwei gezielte Verbesserungsbereiche; PDF bleibt ausdrücklich pausiert. Vorhandene Dokumente, Zeichnungen, Textdaten und Exportberechnungen bleiben erhalten.

## Bewertung vor der Umsetzung

| Persona | Drängendes Problem | Entscheidung / Prüfkriterium |
| --- | --- | --- |
| Neue Nutzerin | „Slides“ und „Artboards“ erklären nicht, welches Ergebnis entsteht. Textauswahl und betroffene Formatierung sind räumlich getrennt. | Zwei beschriebene Anordnungen, passende Begriffe und Formatvorgaben. Absatzauswahl direkt vor den gemeinsamen Formatierungsreitern, Auswahlumfang sichtbar. |
| Erfahrener Nutzer | Format erneut eintippen; ungesicherte Formatentwürfe können beim Neuzeichnen verschwinden. Drop-Ziel ist mehrdeutig. | Häufige Formate direkt wählen; nicht angewendete Formatangaben über Panel-Neuaufbau erhalten. Drop kündigt Einfügen, Verbinden oder Kopieren konkret an. |
| Senior UX/UI | Native Mehrfachauswahl, versteckte Scope-Verknüpfung und gleichartige Drop-Markierungen erzeugen Unruhe. | Bestehende M3-Tokens, kompakte Auswahl vor zwei Reitern; genaue Zeilenregler innerhalb Absatz. Deutlich unterschiedliche Einfügelinie und Andockfläche mit Text. |
| Barrierefreiheit | Drag-Geste allein erklärt ihr Ergebnis nicht; Scope ist schwer zu erfassen. | Native Felder/Listen beibehalten, zugängliche Namen, Auswahlstatus und angekündigtes Drop-Ziel. Bestehende Menü-/Tastaturalternativen, sichtbarer Fokus und reduzierte Bewegung erhalten. |
| Entwicklerin/QA | Firefox-CI verlor in `designer-layout` die zuerst eingegebene Breite. Droprückmeldung verursacht viele identische DOM-Änderungen. | Flüchtiger Entwurf pro Dokumentmodell, keine Änderung der MKW-Struktur. Rückmeldungen nur bei Zielwechsel; echte Browsergesten, Abbruch, Rückgängig und Wiederaufbau gezielt testen. |

## Aufgaben und Akzeptanz

| ID | Fundstelle / Auswirkung | Änderung | Priorität | Abnahme | Status |
| --- | --- | --- | --- | --- | --- |
| A1 | `project-setup.js/.css`: Anordnung ohne aufgabenbezogene Erklärung, Breite pro Slide auch bei Einzel-Artboards | Beschriebene Anordnungskarten, kontextabhängige Feldnamen; 4:5, 9:16, 1:1, 3:4 als freiwillige Vorgaben, numerische Eingaben bleiben | P1 | Moduswechsel behält Werte; Vorlage ändert nur Grösse; Vorschau/Schutzzonen folgen; schmal und beide Themes bedienbar | umgesetzt und geprüft |
| A2 | `carousel-slide-format.js`: Panel-Neuaufbau verwirft nicht übernommene Eingaben; Firefox-CI 41839623527 | Nicht persistierten Entwurf am aktuellen Modell halten; nach realer Formatänderung/Undo neu initialisieren | P1 | Breite nach erzwungenem Panel-Neuaufbau erhalten, erst Übernehmen verändert Dokument, Undo stellt ursprüngliche Geometrie her | umgesetzt und geprüft |
| B1 | `typography-ui.js`, `paragraph-scope-ui.js/.css`: Absatzwahl fern von Absatzreglern, Zeilen-Spezialregler unterbrechen Grundformatierung | Absatzauswahl vor Reitern, Auswahlanzahl; Zeilenregler im Absatz-Reiter, kompakte native Liste | P1 | Ein/mehrere Absätze, gemischte Werte, Zeilenauswahl, Sperre und beide Editoren erhalten; keine Zeichen-/Absatzdatenänderung nur durch Tabwechsel | umgesetzt und geprüft |
| B2 | `pages-panel.js/.css`: Rand/Mitte einer Miniatur haben unterschiedliche, schlecht erklärte Wirkung | Zielbeschreibung, Einfügelinie vs Andockfläche, korrekter Kopiercursor und Herkunftsmarkierung; Feedback bei Zielwechsel | P1 | Echte Mausgeste sortiert/fügt zusammen, Option kopiert, Abbruch unverändert, Rückgängig vollständig; Menüs/Tastatur bleiben | umgesetzt und geprüft |

## Quellen und Grenzen

[M3 Cards](https://m3.material.io/components/cards/guidelines), [Segmented buttons](https://m3.material.io/components/segmented-buttons/guidelines), [Material Web](https://github.com/material-components/material-web), [offizielle Tabs-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/tabs.md). Die M3-Webseiten liefern ohne JavaScript keinen Detailtext. Konkrete Anordnung, Formatauswahl und Scope-Führung sind begründete Produktentscheidungen, keine erfundenen normativen Material-Vorgaben. Bestehende Tokens/native Komponenten werden weiterverwendet; keine neue Laufzeitbibliothek. Material Web ist laut offiziellem README im Wartungsmodus.

Abschliessende Persona-Matrix und tatsächliche Testergebnisse werden nach der Umsetzung ergänzt. Automatische Axe-/Tastaturprüfungen sind kein manueller Screenreader-Test und keine externe Studie mit fünf Testpersonen.

## Abschlussprüfung der fünf Personas

| Persona | Feedback nach der Überarbeitung | Status |
| --- | --- | --- |
| Neue Nutzerin | Zwei Aufgaben statt unklarer Fachbegriffe; Startformat und freie Masse erkennbar. Textauswahl nennt ihren Umfang; Drop nennt das Ergebnis. | Geprüft: Einrichtung, Auswahl und sichtbare Rückmeldung; keine externe Testperson beteiligt. |
| Erfahrener Nutzer | Häufige Grössen direkt erreichbar; ungeänderte Schutzzonen bleiben. Entwurf übersteht Inspector-Neuaufbau. Mehrfachauswahl, Kopieren, Abbrechen und Undo erhalten. | Funktionsprüfungen in Firefox und Chrome bestanden. |
| Senior UX/UI | Weniger doppelte Beschriftung, dichtere Einrichtung, Absatzauswahl vor den Reitern. Zeilen-Spezialregler unter Absatz. Nach Sichtkontrolle Drop-Hinweis im sichtbaren Inspector positioniert. | Hell/Dunkel, schmal und Desktop geprüft; abschliessende Korrekturen umgesetzt. |
| Barrierefreiheit | Native Listen/Felder, klare Namen und Statusansagen, vorhandene Tastatur-/Menüalternativen erhalten. Drag-Ergebnis nicht nur farbig erkennbar. Unveränderte Auswahlzahlen werden beim Formatieren nicht nochmals angesagt. | Axe und Tastatur geprüft; manueller Screenreader-Test offen. |
| Entwicklerin/QA | Kein neues Dateiformat, keine neue Laufzeitbibliothek. Flüchtige Entwürfe per WeakMap; Model besitzt weiter alle Strukturmutationen. Identische Drop-Hinweise werden nicht ständig neu gesetzt. | Unit-, Build-, Format- und betroffene Browserprüfungen; Dateiroundtrips und Export-Pixelparität geprüft. |

## Tatsächliche Prüfungen und Korrekturen

152 Unit-Tests bestanden. Firefox prüfte zwölf betroffene Bereiche (Designer-Einrichtung/Format, gemeinsame Textwerkzeuge, Seitenpanel, Bestandsverbesserungen, Abstände, Strukturmodell/Dateien, Textbearbeitung, Advanced-Typografie, 42 UI-Kontexte mit Axe). Der erweiterte Lauf fand im Artboard-Dialog eine alte feste Beschriftungsfarbe aus dem Dark-Design (nur 1,7:1 Kontrast auf hellem Grund). Die gemeinsame Feldbeschriftung nutzt jetzt die passende M3-Farbrolle in beiden Themes. Zusätzlich wartet die Prüfung gezielt das Ende der Dialoganimation ab; die Kontrastprüfung bleibt vollständig. Die abschliessenden gezielten Firefox-Prüfungen decken auch diese Korrektur ab. Chrome prüfte fünf zentrale Abläufe; die abschliessenden Text-/Drag-Prüfungen liefen nochmals.

Der neue `persona-workflow`-Test benutzt echte Mausgesten für Reihenfolge, Option-Kopie und Escape-Abbruch, prüft den sichtbaren Hinweis und vollständiges Undo. `designer-layout` erzwingt zusätzlich einen Panel-Neuaufbau mitten im Formatentwurf und prüft Breite, explizites Übernehmen, Geometrie und Undo. Vorschau und Textformatierung werden durch die UI-Umordnung nicht neu berechnet oder anders exportiert.

Auswahlfarben werden in Sichtaufnahmen nach dem Zustandsübergang beurteilt; in der Prüfung mit reduzierter Bewegung bereits vor dem Seitenaufruf. Eine Aufnahme mitten in einer noch laufenden Farbtransition gilt nicht als fertiger Zustand. Die anfänglich zu luftige Einrichtung und der unter den sichtbaren Bereich fallende Drop-Hinweis wurden nach der Sichtkontrolle korrigiert.

GitHub-Veröffentlichung und vollständige Tests werden nach dem Push separat auf ihren tatsächlichen Abschluss geprüft. Der PDF-Modus bleibt pausiert; sein recherchierter Plan ist unverändert erhalten.

## Ergänzungen während der Schlussprüfung

Die nachgereichten Wünsche sind Teil derselben Überarbeitung: Raster und magnetische Hilfslinien beim Verschieben stabil halten; Wechsel zu Druckbögen ohne Zerlegen/Umordnen; ein direktes Plus pro Artboard; sauber ausgerichtetes „Neues Artboard“; feste HTML/CSS-Listen für Absätze/Zeilen ohne horizontalen Überlauf.

- **Neue Nutzerin:** Strukturmodus ändert bestehende Gestaltung nicht überraschend. Das lokale Plus ergänzt den gewählten Bogen, „Neues Artboard“ bleibt eine unabhängige Seite. Auswahllisten besitzen sichtbare Kästchen statt eines browserspezifischen Mehrfach-Selects.
- **Erfahrener Nutzer:** Hilfslinien bleiben über dem Artwork; unveränderte Linien werden nicht ständig neu erstellt. Mehrfachwahl und Umschalt-Bereich bleiben möglich. Veränderte Viewportkoordinaten werden sofort gemerkt, nicht erst in einem späteren Scroll-Ereignis.
- **UX/UI:** Icon und Beschriftung der Hinzufügen-Aktionen sind zentriert. Feste Panelbreiten, umbrochene Textauszüge und ein vertikaler Scrollbereich verhindern horizontalen Überlauf auch bei langen Wörtern.
- **Barrierefreiheit:** Native Checkboxen, benannte Gruppen, sichtbare Häkchen und 44-px-Zeilen; Tastatur-/Menüalternativen bleiben. Warnung bei fehlendem Platz enthält eine nächste Handlung.
- **Entwicklerin/QA:** Modellaktionen erhalten bestehende Objekte/Koordinaten. Ergänzen prüft 20/200-Seiten-Limits und Überlappung vor dem Commit. Neue Tests prüfen tatsächliche Mausbewegung, unveränderte Exportpixel, Undo und lange Textlisten in beiden Editoren. PDF-Arbeit bleibt pausiert.

Diese Ergänzungen werden vor der Veröffentlichung nochmals mit Unit-, Firefox- und Chrome-Prüfungen abgeglichen. Die ältere fehlgeschlagene GitHub-Prüfung zeigte verzögert aktualisierte Scrollmetadaten nach einer bereits erfolgten Zentrierung; die Quelle synchronisiert diese jetzt unmittelbar. Der Abbruchtest bleibt vollständig erhalten.

### Abschluss der Ergänzungen

155 Unit-Tests bestanden. Der abschliessende Firefoxlauf besteht 14/14 Suiten; Chrome 7/7. Zusätzlich bestand davor die vollständige Migration der Absatz-/Zeilenprüfungen (u.a. Blocksatz, Ausrichtung und Rahmen-/Zeilentypografie) in Firefox mit 11/11 Suiten. Die 42-Kontext-Axe-Prüfung besteht auch mit den HTML-Checkboxlisten und den lokalen Artboard-Buttons. Sichtaufnahmen geprüft: Hilfslinien während echter Bewegung, Textlisten mit langen Wörtern, 300/450 px und helle Oberfläche. Neue Tests prüfen die identischen Exportpixel vor/nach dem Druckbogen-Wechsel und unveränderte Nachbar-Artboards beim Ergänzen. Der neue Inhalt wird nach dem Hinzufügen ausgewählt und sichtbar zentriert.

Die finale Prüfung findet keine offenen Funktionsfehler in den untersuchten Abläufen. Manueller Screenreader-Test und externe Persona-Nutzertests bleiben ausdrücklich ungetestet. Die GitHub-Ergebnisse gelten erst nach abgeschlossenem Lauf für den dazugehörigen Commit.
