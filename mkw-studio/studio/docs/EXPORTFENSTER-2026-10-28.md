# Exportfenster: Plan aus fünf Perspektiven

Status: umgesetzt und geprüft am 28.10.2026. Die ursprüngliche Planung folgt; Nachweise und Grenzen stehen in `RELEASE-2026-10-28.md`.

## Ausgangsstand
Code: `static/export.js`, `static/carousel-pdf.js`, `static/export-ui.css`, Dialogmarkup in `index.html`. Die vorhandene Aufteilung Vorschau links/Einstellungen rechts, die gemeinsamen Vorschau-/Downloadbytes, JPG/PNG/WebP, PNG-8, Transparenz, PDF-Presets, Dateinamen, Einzel-/Gesamtauswahl, Ordner-/ZIP-Download und Exportvorschau bleiben erhalten. PSD bleibt wie bisher im Speichern-Dialog; keine zweite widersprüchliche PSD-Implementierung.

## Fünf Perspektiven und Entscheidungen

| Perspektive | Konkretes Problem / Bedarf | Geplante Verbesserung |
| --- | --- | --- |
| Neue Nutzerin | Format, Preset, Qualität und Dateinamen sind optisch wenig getrennt; „Preset“ ist erklärungsbedürftig. | Gruppen „Dateiformat & Qualität“ und „Dateinamen“, Beschriftung „Voreinstellung“, ein kurzer Zusammenhang mit den Einstellungen für das gewählte Format. |
| Erfahrener Nutzer | Platz in der rechten Spalte wird vom Fortschritt/Speichern belegt; bei vielen Bildern soll die Auswahl im Blick bleiben. | Vorschau und Einstellungen erhalten mehr nutzbare Höhe; Gesamtauswahl und Vorschau erreichbar, Fortschritt/Grösse/Download in einem gemeinsamen festen Footer. |
| UX/UI-Designerin | Anschluss an die neuen Projekt-/Speicherfenster fehlt; viele dünne Trenner und kompakte Untergruppen statt klarer Material-Flächen. | Bestehende Material-Farbrollen, abgerundete Inhaltsflächen und konsistente Abstände. Verbundene Formatwahl mit eindeutiger Auswahl; keine rein dekorativen Zusatzaktionen. |
| Barrierefreiheitsexperte | Gewähltes Format, Lade-/Fehlerzustand und fehlende Auswahl müssen ohne Farbe verständlich sein. | Native Buttons/Checkboxen, dauerhafte Labels und bestehende Textfehler erhalten. Formatbereich benennen; Text-/Fokuszustände, Theme-Kontraste, Tastatur und reduzierte Bewegung prüfen. |
| Entwicklerin & QA-Testerin | Neue Oberfläche darf weder die Encoder verdoppeln noch Namen/Dateiauswahl/Abbruchlogik neu implementieren. Kurze Fenster können durch die bisherigen Mindesthöhen überlaufen. | Bestehende DOM-Elemente/Handler in eine UI-eigene Hülle verschieben; keine neuen Encoder/Observer. Footer ausserhalb beider Scrollbereiche. Responsive Geometrie, bestehende Exporte und Bytes erneut prüfen. |

## Aufbau

- Kopf: „Exportieren“, knappe Anleitung, vorhandener Schliessen-Button.
- Links: „Bilder auswählen“ bzw. „Slides auswählen“, Auswahlzahl, beide Sammelaktionen, Originalvorschauen und Dateinamen. Bestehende Exportvorschau bleibt verfügbar.
- Rechts: Dateiformat, Voreinstellung, nur die passenden Qualitäts-/PNG-/PDF-/Transparenzoptionen; danach eigener Bereich für Dateinamen.
- Fester Footer über die gesamte Breite: Auswahlgrösse/Fehler, Fortschritt mit vorhandenem Material-Indikator, bestehende Download-/Ordneraktionen. Keine neue Bedienung, die einen laufenden Schreibvorgang scheinbar abbrechen würde.
- Schmal: gemeinsamer scrollbarer Inhalt; Vorschauliste mit eigener begrenzter Höhe. Footer bleibt ausserhalb. Keine neuen verschachtelten Dialoge.

## Quellen / Einordnung

[Dialoge](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md), [Buttons](https://github.com/material-components/material-web/blob/main/docs/components/button.md), [Textfelder](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md), [Checkboxen](https://github.com/material-components/material-web/blob/main/docs/components/checkbox.md). Die M3-Website benötigt JavaScript; gelesen wurden die offiziellen Repository-Dokumente. Das konkrete Zweispaltenlayout und der feste Exportfooter sind produktbezogene UX-Entscheidungen, keine behaupteten normativen M3-Vorgaben. Native Elemente und vorhandene Design-/Motion-Tokens bleiben erhalten; kein zusätzliches UI-Paket.

## Akzeptanz

1. Alle bisherigen Exportoptionen und Speicherwege bleiben erreichbar; JPG/PNG/WebP, PNG-8, PDF und Presets regressionsgeprüft.
2. Vorschau-/Exportdateien und Dokumentgeometrie bleiben unverändert.
3. Footer innerhalb des Dialogs bei 1500×1050, 1024×768, 700×500 und 390×844; keine horizontale Überbreite.
4. Hell/Dunkel, Tastatur, reduzierte Bewegung und automatische Barrierefreiheitsprüfung des betroffenen Dialogs.
5. Keine Auswahl: klare Meldung und kein Download. Fehlendes Datum bleibt erlaubt; ungültiges Datum bleibt korrigierbar.
6. Während des Exports bleiben Rückmeldung/Prozentanzeige sichtbar; vorhandene doppelte-Ausführung-Sperre und Dateiauswahl erhalten.
7. Wiki und Umsetzungsbericht nennen die tatsächlichen Bedienwege und offen gebliebene Prüfgrenzen.
