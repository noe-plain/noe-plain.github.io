# Gemeinsames Textbedienfeld · 6. November 2026

## Ergebnis

„Schrift & Farbe“ und „Absatz & Abstände“ stehen ohne Reiterwechsel in einem Bedienfeld. Die Auswahl „Einzelne Absätze & Zeilen“ bleibt erhalten und bestimmt den normalen Bearbeitungsumfang. Es gibt ein gemeinsames Feld für die Schriftgrösse.

Eine nicht leere direkte Textmarkierung hat Vorrang: Schriftfamilie, Farbe, Grösse, Laufweite und Zeichenoptionen verändern nur diese Quellzeichen. Ein bloss gesetzter Cursor verwendet die Absatz-/Zeilenauswahl. Das explizite Zurückkehren zur Liste beendet die alte native Markierung. Verzögerte Auswahlmeldungen eines verlassenen Textfelds können sie nicht wiederherstellen.

Absatzweite Optionen bleiben für teilweise markierte Absätze oder einzelne Zeilen gesperrt; vollständig markierte Absätze dürfen damit bearbeitet werden. Prozentualer oder pixelgenauer Zeilenabstand wirkt bei einer Zeilenauswahl nur auf deren Zeilen. Grössenänderungen einer laufenden Eingabe behalten ihre ursprünglichen Quellbereiche, auch wenn der Text dabei umbricht.

Das Verhalten gilt in Designer und FD-Kampagnen, im einfachen und im erweiterten Modus. Bestehende Texte und Formatierungen werden beim Öffnen nicht verändert; die bisherigen Quellzeichen-, Absatz- und Exportmodelle bleiben erhalten. Grössen in anderen FD-Ausgabeformaten bleiben unabhängig.

## Code

- `static/text-scope-model.js`: DOM-freie Auflösung, Werte und Anwendung von Zeichen-/Absatz-/Zeilenbereichen; vorhandene `characterStyles` und `textStyles`, kein neues Dateiformat.
- `static/typography-ui.js`, `static/typography.css`: gemeinsames Bedienfeld, ein Grössenfeld, tatsächliche Auswahlwerte und passende Aktivierung der Regler.
- `static/paragraph-scope-ui.js`: Auswahländerungen synchronisieren die gemeinsamen Regler.
- `static/carousel-sidebar.js`: ignoriert verspätete Auswahlereignisse des verlassenen Textfelds.
- `build/editor-manifest.json`: neue reine Auswahllogik; Laufzeitdateien aus Quellen neu gebaut.

## Prüfung aus sechs Perspektiven

| Persona | Feedback / Prüfkriterium | Status |
| --- | --- | --- |
| Neue Nutzerin | Ein Bedienfeld und sichtbarer Auswahlumfang; keine konkurrierenden Grössenfelder. | Gelöst; in beiden Editoren geprüft. |
| Erfahrener Designer | Explizite Textmarkierung hat Vorrang, Rückgängig und Bearbeitung auf der Fläche bleiben erhalten. | Gelöst; Zeichenbereich, Schrift/Farbe, Undo und Fokuswechsel geprüft. |
| Senior UX-Experte | Normaler Weg über Absatz/Zeile; kein Rückfall in eine alte direkte Auswahl nach Fokuswechsel. | Gelöst; Ursache gefunden und mit echten Bedienabläufen geprüft. |
| UI-Expertin | Vorhandene Material-Farbrollen und native Listen/Felder ohne zusätzlichen Dialog oder Bibliothek. | Gelöst; Sichtkontrolle und 42 bestehende UI-Kontexte geprüft. |
| QA-Entwicklerin | Ungewählte Quellzeichen, Dateirundlauf und Ausgabeformate bleiben unverändert. | Gelöst; 162 Modelltests und 20 relevante Chrome-Suiten erfolgreich durchlaufen. |
| Fehlersucher | Leere Auswahl, mehrfache Grössenänderung beim Umbruch, teilweise Absätze und verspätete Auswahlereignisse. | Gelöst in den geprüften Abläufen; keine Teilformatierung ausserhalb der Quellbereiche. |

## Tatsächliche Nachweise

Neue Suiten `text-scope-model.test.js` und `text-selection-panel.cjs` prüfen nicht benachbarte Absätze, visuelle Zeilen, direkte UTF-16-Markierungen, Grösse/Farbe, unveränderte Nachbarzeichen, leere Auswahl, Formatvererbung und MKW-Rundlauf. Die reine Textdarstellung bleibt unabhängig davon, ob gerade das Datumsfeld inspiziert wird.

Die bestehenden Prüfungen für Textbearbeitung, Typografie, Absatz-/Zeilenhöhe, Trennung, Blocksatz, Formatvererbung, Schriftdateien, PNG-/PSD-Pixel, PDF-Textpositionen und Seitenverwaltung bleiben erhalten. Alte Reiterklicks wurden durch die tatsächliche Auswahl im gemeinsamen Panel ersetzt; keine Pixeltoleranzen oder inhaltlichen Vergleiche gelockert.

Die erste Veröffentlichung zeigte auf GitHub Timingfehler in der Testvorbereitung: Der Formatentwurf-Test wartet jetzt auf den abgeschlossenen Projektstart, die Kopiergrenzen-Prüfung auf das Ende ihrer vorbereitenden Sicherung. Die Rückgängig-Prüfung wartet auf das tatsächlich abgeschlossene asynchrone Wiederherstellen, bevor sie Revision und Dokument vergleicht. Der bisherige GitHub-Pages-Deploy wurde mit Zeitüberschreitung abgebrochen; der neue Stand wird separat veröffentlicht und auf seinen tatsächlichen Abschluss kontrolliert.

Formatierung und Build geprüft. Die 20 verschiedenen lokalen Chrome-Suiten umfassen das neue Panel sowie `unified-text-tools`, `persona-workflow`, `persona-text-recovery`, `editor-forms`, `advanced-typography`, `post-text-size-scope`, `text-editing`, `text-hyphenation`, `text-justification`, `carousel-text-alignment`, `carousel-frames-text`, `post-text-stack`, `material-consistency`, `seven-perspectives`, `ui-improvements`, `designer-layout`, `designer-copy-safety`, `pages-panel`, `page-transfer`. Nach dem gefundenen Undo-Timingfehler wurde die betroffene Prüfung korrigiert und erfolgreich nachgeprüft; der strenge Zustandsvergleich bleibt vollständig.

Keine externe Studie mit sechs Testpersonen; Tablet-Sichtprüfung im Browser, keine physische iPad-Abnahme. GitHub-Prüfungen und Live-Abschluss werden für den veröffentlichten Commit separat nachverfolgt.

## Geplanter InDesign-Export

Nur geplant: [INDESIGN-EXPORT-PLAN.md](INDESIGN-EXPORT-PLAN.md). Die bestehende Wochen-Automation wurde um einen kleinen, prüfbaren InDesign-Meilenstein pro Review ergänzt. Termine bleiben Montag und Donnerstag um 9 Uhr. Heute wurde kein IDML-/INDD-Export implementiert und PSD nicht entfernt.
