# Gemeinsames Textbedienfeld · 6. November 2026

## Ergebnis

„Schrift & Farbe“ und „Absatz & Abstände“ stehen ohne Reiterwechsel in einem Bedienfeld. Die Auswahl „Einzelne Absätze & Zeilen“ bleibt erhalten und bestimmt den normalen Bearbeitungsumfang. Es gibt ein gemeinsames Feld für die Schriftgrösse.

Das anschliessende UX-Review ordnet das Panel nach dem Arbeitsablauf: **Auswahl → Schrift, Grösse und Farbe → Zeichenoptionen → Absatz und Abstände**. Absatz- und Zeilenauswahl stehen kompakt nebeneinander mit ständig sichtbaren Zählern; ihre Listen öffnen sich bei Bedarf. Mehrfachauswahl, Umschalt-Bereiche und „Alle“ bleiben verfügbar. Die geöffneten Listen werden nur als vorübergehender Bedienzustand gemerkt, ohne Änderung an Projekt oder Rückgängig-Verlauf.

Die Pixeleingabe für Zeilenabstand steht neben der Prozentangabe im Bereich „Absatz & Abstände“. Es gibt nur eine gemeinsame Aktion für automatischen Zeilenabstand. Selten benötigte Rücksetzfunktionen liegen unter „Weitere Zeichenoptionen“. Schrift, Grösse, Farbe und Zeichen-Schalter bleiben bei geschlossenen Auswahllisten auch im 768 × 1024 grossen Tabletfenster erreichbar. Doppelte Abstände aus allgemeinen Seitenleisten-Regeln wurden für diese Feldgruppen entfernt.

Die Navigation zu „Design“ verwendet das sichtbare Abschnittselement als Scrollziel, wenn die Überschrift nur für die semantische Struktur vorhanden ist. Wiederholtes Aufrufen verschiebt die Textregler dadurch nicht mehr aus dem sichtbaren Bereich.

Eine nicht leere direkte Textmarkierung hat Vorrang: Schriftfamilie, Farbe, Grösse, Laufweite und Zeichenoptionen verändern nur diese Quellzeichen. Ein bloss gesetzter Cursor verwendet die Absatz-/Zeilenauswahl. Das explizite Zurückkehren zur Liste beendet die alte native Markierung. Verzögerte Auswahlmeldungen eines verlassenen Textfelds können sie nicht wiederherstellen.

Absatzweite Optionen bleiben für teilweise markierte Absätze oder einzelne Zeilen gesperrt; vollständig markierte Absätze dürfen damit bearbeitet werden. Prozentualer oder pixelgenauer Zeilenabstand wirkt bei einer Zeilenauswahl nur auf deren Zeilen. Grössenänderungen einer laufenden Eingabe behalten ihre ursprünglichen Quellbereiche, auch wenn der Text dabei umbricht.

Das Verhalten gilt in Designer und FD-Kampagnen, im einfachen und im erweiterten Modus. Bestehende Texte und Formatierungen werden beim Öffnen nicht verändert; die bisherigen Quellzeichen-, Absatz- und Exportmodelle bleiben erhalten. Grössen in anderen FD-Ausgabeformaten bleiben unabhängig.

## Code

- `static/text-scope-model.js`: DOM-freie Auflösung, Werte und Anwendung von Zeichen-/Absatz-/Zeilenbereichen; vorhandene `characterStyles` und `textStyles`, kein neues Dateiformat.
- `static/typography-ui.js`, `static/typography.css`: gemeinsames Bedienfeld, ein Grössenfeld, tatsächliche Auswahlwerte und passende Aktivierung der Regler.
- `static/paragraph-scope-ui.js`: Auswahländerungen synchronisieren die gemeinsamen Regler.
- `static/carousel-sidebar.js`: ignoriert verspätete Auswahlereignisse des verlassenen Textfelds.
- `static/inspector-ui.js`: stabiles Scrollziel bei visuell ausgeblendeten Überschriften.
- `tests/text-panel-ux.cjs`: echte Tastatur-/Mausbedienung der Auswahllisten, Erreichbarkeit häufiger Regler in 300/450-px-Seitenleisten und im Tabletfenster, helle/dunkle Darstellung und Prüfung geöffneter Auswahllisten. In beiden Browser-Aufrufen registriert.
- `build/editor-manifest.json`: neue reine Auswahllogik; Laufzeitdateien aus Quellen neu gebaut.

## Prüfung aus sechs Perspektiven

| Persona | Feedback / Prüfkriterium | Status |
| --- | --- | --- |
| Neue Nutzerin | Auswahl vor Formatierung, kompakte Listen und sichtbare Zähler; häufige Regler direkt erreichbar. | Gelöst; in beiden Editoren geprüft. |
| Erfahrener Designer | Explizite Textmarkierung hat Vorrang, Rückgängig und Bearbeitung auf der Fläche bleiben erhalten. | Gelöst; Zeichenbereich, Schrift/Farbe, Undo und Fokuswechsel geprüft. |
| Senior UX-Experte | Normaler Weg über Absatz/Zeile; weniger Scrollen und keine wandernden Regler bei wiederholter Navigation. | Gelöst; Ursache gefunden und mit echten Bedienabläufen geprüft. |
| UI-Expertin | Vorhandene Material-Farbrollen, konsistente Feldabstände, native aufklappbare Auswahllisten und Tastaturfokus. | Gelöst; Sichtkontrolle und 42 bestehende UI-Kontexte geprüft. |
| QA-Entwicklerin | Ungewählte Quellzeichen, Dateirundlauf und Ausgabeformate bleiben unverändert. | Gelöst in den dokumentierten Prüfungen; 163 Modelltests erfolgreich, Browsernachweise siehe unten. |
| Fehlersucher | Leere Auswahl, Umbruch während der Grösseneingabe und veraltete Markierung nach Löschen/Ersetzen. | Gelöst in den geprüften Abläufen; keine Teilformatierung ausserhalb der Quellbereiche. |

## Tatsächliche Nachweise

Neue Suiten `text-scope-model.test.js` und `text-selection-panel.cjs` prüfen nicht benachbarte Absätze, visuelle Zeilen, direkte UTF-16-Markierungen, Grösse/Farbe, unveränderte Nachbarzeichen, leere Auswahl, Formatvererbung und MKW-Rundlauf. Die reine Textdarstellung bleibt unabhängig davon, ob gerade das Datumsfeld inspiziert wird.

Die bestehenden Prüfungen für Textbearbeitung, Typografie, Absatz-/Zeilenhöhe, Trennung, Blocksatz, Formatvererbung, Schriftdateien, PNG-/PSD-Pixel, PDF-Textpositionen und Seitenverwaltung bleiben erhalten. Alte Reiterklicks wurden durch die tatsächliche Auswahl im gemeinsamen Panel ersetzt; keine Pixeltoleranzen oder inhaltlichen Vergleiche gelockert.

Die Veröffentlichung des gemeinsamen Panels (`3ee3674`) wurde erfolgreich über GitHub Pages abgeschlossen und live bytegenau sowie mit echten Browserabläufen geprüft. Die GitHub-Prüfung meldete anschliessend noch einen Firefox-Fehler nach dem Ersetzen eines markierten Textes: Der alte Zeichenbereich konnte vollständig ausserhalb des neuen Textes liegen. `text-scope-model.js` begrenzt jetzt Start und Ende auf die aktuelle Textlänge, **bevor** entschieden wird, ob eine direkte Markierung vorhanden ist. Der neue Modelltest deckt leeren, kürzeren und teilweise überlappenden Ersatztext ab; der vollständige Textbearbeitungsablauf ist lokal in Firefox erfolgreich.

Testvorbereitungen warten auf abgeschlossenen Projektstart, vorbereitende Sicherungen und asynchrone Rückgängig-Aktionen. Nach der Umstellung auf aufklappbare Auswahllisten öffnen Bedienprüfungen diese vor der Auswahl. Inhaltliche Vergleiche, Pixelvergleiche und Toleranzen bleiben erhalten.

Formatierung, Build und 163 Modelltests sind erfolgreich. Lokal bestehen 23 der 24 ausgewählten Chrome-Suiten. In Firefox bestehen alle elf verschiedenen ausgewählten Suiten über Hauptlauf und gezielte Wiederholung; `unified-text-tools` hatte beim parallelen Lauf eine Zeitüberschreitung beim Bildimport und bestand anschliessend allein. Die neue UX-Prüfung und die komplette Textbearbeitung bestehen in beiden Browsern.

Die zusätzliche breite Chrome-Prüfung `seven-perspectives` lief lokal zweimal in eine Zeitüberschreitung im Einstellungsdialog, bevor die neuen Textfunktionen erreicht wurden. Dieser Lauf wird nicht als bestanden gezählt. Die vollständigen GitHub-Prüfungen und die Live-Veröffentlichung werden separat nachverfolgt; ihr Ergebnis wird im Abschlussbericht eindeutig genannt.

Keine externe Studie mit sechs Testpersonen; Tablet-Sichtprüfung im Browser, keine physische iPad-Abnahme. GitHub-Prüfungen und Live-Abschluss werden für den veröffentlichten Commit separat nachverfolgt.

## Geplanter InDesign-Export

Nur geplant: [INDESIGN-EXPORT-PLAN.md](INDESIGN-EXPORT-PLAN.md). Die bestehende Wochen-Automation wurde um einen kleinen, prüfbaren InDesign-Meilenstein pro Review ergänzt. Termine bleiben Montag und Donnerstag um 9 Uhr. Heute wurde kein IDML-/INDD-Export implementiert und PSD nicht entfernt.
