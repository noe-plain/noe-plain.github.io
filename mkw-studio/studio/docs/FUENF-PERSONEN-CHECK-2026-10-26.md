# MKW Studio: erneuter Check aus fünf Perspektiven

26. Oktober 2026 · Ausgangsstand `d13f02148b22816da51e31012e5c8ab84dc311ff`.

Dies ist eine heuristische Prüfung aus fünf Rollen, keine Befragung von fünf tatsächlichen Personen. Grundlage sind der vorhandene umfassende Material-Audit, die aktuelle Codeprüfung und erneut geöffnete laufende UI-Kontexte. Die konkreten Korrekturen betreffen Benennung und Export; Gestaltung und Bilddaten der Artworks bleiben erhalten.

## Die fünf Rückmeldungen

| Perspektive | Ehrliche Einschätzung | Konsequenz |
|---|---|---|
| Ewiger Pessimist | „Wenn ich vor dem Download erst ein Datum umformatieren muss und meine Korrektur beim nächsten Öffnen wieder weg ist, nervt das jeden Tag.“ | Gewohnte Datumsvarianten akzeptieren; manuelle und bewusst leere Eingaben dauerhaft respektieren. |
| Senior Software-Entwickler | Der Kalenderparser war streng, der Wochentag hatte eine separate Prüfung, und PDF benannte Dateien anders als Bildexporte. Wiederholte lineare Suchen machten die Zuordnung aller Dateinamen unnötig quadratisch. | Reine gemeinsame Datumslogik, echte Kalenderprüfung, gleiche Prüfung für alle Exportformate; vorberechnete Maps für Namen und Vorschauzellen. Kein Rendererumbau und keine neue Laufzeitabhängigkeit. |
| Senior UX/UI-Designerin | Das Datumsformat stand im Label, die Fehlermeldung aber nur weit entfernt im Footer. Für PDF war eine Bildnummer sichtbar, die dort nichts bewirkt. | Stabiles Feldlabel mit Beispielen und zugänglicher Inlinefehlermeldung; konkurrierende CSS-Spezifität korrigieren, damit Fehler auch fokussiert den Fehlerrahmen behalten; Datum über die ganze Spaltenbreite; Bildnummer bei PDF ausblenden. Bestehende Material-Feldzustände wiederverwenden. |
| Technik- und Design-Laie | „Ist das Bild abgewählt? Da steht ‚Nicht im Export‘, obwohl ich es angehakt habe.“ Auch „Startnummer“ sagt wenig über die Wirkung aus. | Zwischen fehlender Auswahl und noch ungültiger Benennung unterscheiden; „Erste Bildnummer“ verwenden. |
| Strenger Projektmanager | Wiederholtes Formatieren und Eintippen kostet Zeit; zusätzliche Pflichtschritte würden den Nutzen zunichtemachen. Arbeit darf wegen unvollständiger Metadaten nicht verloren gehen. | Datum bleibt freiwillig; sofort korrigierbarer Exportfehler; MKW-Entwürfe lassen sich weiterhin auch mit unvollständigem/ungültigem Datum sichern. Anleitung aktualisieren, keine zusätzlichen Modi. |

## Befunde, Umsetzung und Abnahme

### P1 · Datumseingabe und Kalenderprüfung

- Fundstellen: `static/core.js`, `tests/core.test.js`.
- Vorher: ausschliesslich `TT.MM.JJ`; PDF nutzte eine fehlertolerante Dateinamenfunktion und liess ungültige Angaben still weg.
- Neu: `151126`, `15112026`, `15.11.26`, `15.11.2026`, `15/11/2026`, `15-11-26`, `2026-11-15`, `20261115`, ausgeschriebene deutsche Monate und einstellige Tages-/Monatsangaben mit Trennzeichen. Numerische lokale Angaben werden tagzuerst gelesen; kein Raten einer US-Schreibweise. Zweistellige Jahre liegen wie bisher in 2000–2099. Kompakte Foto-Dateinamen behalten ihre separate Interpretation als `JJMMTT`.
- Die Ausgabe bleibt kompatibel: 15. November 2026 ergibt das Präfix `261115`. Schaltjahre und echte Kalenderdaten werden ohne sprachabhängiges `Date.parse` geprüft. Beliebige Zahlen in Übertiteln werden weiterhin nicht automatisch als Datum geraten.
- Akzeptanz: gleiche Namen in allen Varianten; ungültige Kalenderdaten blockieren JPG/PNG/WebP/PDF gleichermassen; leere Datumsfelder bleiben zulässig; existierende Bildnamen unverändert.
- Status: abgeschlossen; anhand der unten dokumentierten lokalen Prüfungen abgenommen.

### P1 · Manuelle Eingaben nicht überschreiben

- Fundstellen: `static/core.js:syncHeadingDate`, `static/studio.js`, `static/export.js`, `static/appearance.js`, `static/project-validation.js`.
- Vorher: Öffnen von Speichern/Export konnte die manuelle Angabe erneut durch den Übertitel ersetzen.
- Neu: benannte Herkunft `meta.dateSource` (`heading` oder `manual`). Automatisch übernommene Daten folgen weiterhin dem Übertitel, bis sie manuell bearbeitet werden. Auch bewusstes Leeren bleibt erhalten. Nichtleere Daten aus alten Dateien werden als explizite Angabe behandelt. Diese kleine Information gehört zur Projektbenennung und wird validiert in MKW und Browsersicherung behalten; keine Tool-Einstellung im Dokument.
- Akzeptanz: Öffnen/Schliessen, Speichern, MKW-Wiederöffnung und bewusst leere Eingabe ändern den manuellen Wert nicht. Keine Veränderung an Texten, Geometrie oder Exportpixeln.
- Status: abgeschlossen; anhand der unten dokumentierten lokalen Prüfungen abgenommen.

### P2 · Verständliche Felder und Rückmeldungen

- Fundstellen: `static/date-fields.js`, `static/ui-fields.css`, `static/export-ui.css`, `static/projects.css`, `static/export.js`.
- Neu: ein gemeinsamer kleiner UI-Service für Beispiele und `MKWFields`-Fehlerzustände, mit `aria-describedby` und `aria-invalid`. Kein zusätzlicher Observer, Renderer oder Timer. Die Formularregeln des Exportfensters verwenden für die Typauswahl `:where`, damit der gemeinsame Fehlerzustand nicht durch einen spezifischeren blauen Fokusrahmen überstimmt wird. Das Datum bleibt im Export eindeutig beschriftet und erhält die gesamte Spaltenbreite. Bei ungültiger Benennung bleibt erkennbar, dass ein angehaktes Bild ausgewählt ist. Bei PDFs entfällt die wirkungslose Bildnummer; bei Bildexporten heisst sie „Erste Bildnummer“.
- Akzeptanz: Fehler wird am Feld und im vorhandenen Status angezeigt; Korrektur entfernt den Feldfehler; der fokussierte Fehlerrahmen entspricht in Hell/Dunkel der semantischen Fehlerfarbe; Datum freiwillig; MKW-Sicherung eines ungültig benannten Entwurfs bleibt möglich; schmale Ansicht ohne horizontalen Dokumentüberlauf.
- Status: abgeschlossen; anhand der unten dokumentierten lokalen Prüfungen abgenommen.

### P2 · Technische Konsistenz und kleine Performanceverbesserungen

- Fundstelle: `static/export.js`.
- Datum wird pro Namensliste einmal ausgewertet. Zuordnungen von Dateinamen zu Karten und Vorschauzellen werden über vorberechnete Maps durchgeführt. Kein Versprechen einer messbaren allgemeinen Beschleunigung; es entfallen nachweisbar wiederholte Suchdurchläufe. Encodierung, Farbwerte, Bildauflösung und Persistenz der Assets bleiben unverändert.
- Akzeptanz: bestehende Auswahl-/Vorschau-/Exportprüfungen und Pixelvergleiche bestehen.
- Status: abgeschlossen; anhand der unten dokumentierten lokalen Prüfungen abgenommen.

## Tatsächliche Prüfungen und Grenzen

- 124 Modelltests erfolgreich, einschliesslich gültiger/ungültiger Datumsvarianten, Schaltjahren, Dateinamen, Wochentagen, manueller Herkunft und bestehender Metadaten.
- Firefox: neuer echter Download-/MKW-Roundtrip-Test für FD-Kampagnen und Designer; zusätzliche Formular-, PDF-, Texttreue-, Speicher- und Projektöffnungsprüfungen. 41 erneut geöffnete UI-Kontexte im vorhandenen `seven-perspectives`-Audit ohne unerwartete automatische Accessibility-Verstösse.
- Chromium: neuer Ablauf sowie Formulare, PDF, Projektöffnung und FD-Arbeitsfläche erfolgreich. Die neue Suite wird auch im regulären GitHub-Lauf und in dessen Firefox-Phase ausgeführt.
- Bilder-/PDF-/MKW-Dateinamen anhand tatsächlicher Downloads geprüft. Native Canvas-Pixel vor und nach den Datums-/Namensänderungen sowie der MKW-Wiederöffnung exakt verglichen. Desktop und 390-Pixel-Ansichten als Screenshots angesehen.
- Nachweise im Arbeitsbereich unter `work/audits/five-person-2026-10-26/`; der neue Browserfall liegt in `tests/five-person-check.cjs`. GitHub-Veröffentlichung wird separat protokolliert.
- Die bereits dokumentierten Grenzen bleiben: keine reale neue Nutzerstudie, keine vollständige Screenreader-/Touchhardware-/Photoshop-Abnahme, kein Anspruch auf Prüfung jeder Datei-/Gerätekombination.

## Gestaltungsgrundlage

Die Wahl einer toleranten, deterministischen Datumseingabe und die Benennungen sind eigene UX-/Produktentscheidungen, keine behaupteten Material-Pflichtregeln. Die bestehenden nativen Felder erhalten zusätzliche Unterstützung und Fehlertext entsprechend der [offiziellen Material-Web-Feldreferenz](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md#supporting-text) und deren [Validierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md#validation). Material Web ist eine Implementierungsreferenz. Die [M3-Designseite](https://m3.material.io/components/text-fields/guidelines) war beim textuellen Abruf JavaScript-pflichtig; daraus wurden keine unprüfbaren Detailvorgaben abgeleitet.
