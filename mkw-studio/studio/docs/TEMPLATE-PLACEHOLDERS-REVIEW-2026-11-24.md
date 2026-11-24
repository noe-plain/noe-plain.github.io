# Vorlagen mit direkt befüllbaren Bildplätzen

Am 24. November 2026 wurde Aufgabe T02 umgesetzt: Bildfelder in Vorlagen erhalten unterschiedliche Pastellfarben und eine stabile Bildplatznummer. Ein Klick auf ein Bild in der Vorschau öffnet das zugehörige Dateifeld. Das funktioniert auch beim Ersetzen eines bereits eingefügten Bildes; bildgefüllte Winkel adressieren ihr vorhandenes Quellbild.

Die bestehende Vorlage, Rahmenform, Position und Ausschnitte bleiben erhalten. Die Tastaturalternative verwendet die benannten Dateifelder. Wischen oder abgebrochene Pointer-Gesten öffnen keinen Dateidialog. Abbrechen der Dateiauswahl behält das zuvor gewählte Bild. Während eines Uploads oder der Projekterstellung startet kein zweiter Bildwechsel über die Vorschau.

## Umsetzung

- Das reine Vorlagenmodell liefert einmalig ableitbare Bild-/Konturplätze mit eindeutiger Nummer und Pastellfarbe, auch für 500 Ebenen mit je zwei Bildkanälen.
- Galerie und Live-Vorschau benutzen dieselbe Zuordnung. Zur Erkennung dienen Farbe, Bildplatznummer und Ebenenname gemeinsam.
- Der vorhandene Dateiimport bleibt für Auswahl, Validierung, Fehler und Entwürfe zuständig. Es gibt keinen zweiten Importweg.
- Die Trefferprüfung nutzt die vorhandenen Masken, Pfade, Transformationen und Inhaltsbegrenzungen mit explizitem Vorlagenkontext. Keine temporäre globale Projektumschaltung.
- Einpixel-Platzhalter mit begrenztem Cache entstehen nur in der Vorschau. Sie werden nicht als Fotos im erstellten MKW oder Setup gespeichert. Originalfotos und deren Auflösung bleiben unverändert.

## Prüfung anhand der Produktperspektiven

| Perspektive | Ergebnis | Status |
| --- | --- | --- |
| Neue Nutzerin | Direkte Bildauswahl; Nummer/Farbe führen zum benannten Feld. | Mit echten Auswahl- und Ersetzen-Abläufen geprüft. |
| Erfahrener Nutzer | Weniger Suchen zwischen Vorschau und Feldern, bestehende Verknüpfungen bleiben erhalten. | Bestehende Bibliotheks-/Winkel-/Undo- und Vorlagenabläufe bestanden. |
| UX/UI | Vorhandene Dialoge, Felder und Material-Farbrollen bleiben; keine weitere Menüebene. | Desktop sowie schmales dunkles Fenster visuell angesehen. |
| Barrierefreiheit | Benannte Dateifelder per Tab/Enter, Information nicht nur über Pastellfarbe. | Echte Tastatur-Dateiauswahl und axe bestanden; kein manueller Screenreader-Nachweis. |
| Entwicklerin / QA | Unveränderliche Vorlage und isolierte Vorschau; Originalgeometrie und Dateien erhalten. | Palette, Masken/Rotation, Abbruch, MKW und bestehende Exporte/Projektwege geprüft. |

## Tatsächliche lokale Nachweise

- 224 Modell-/Dateitests erfolgreich, Formatprüfung und Build erfolgreich.
- Sieben Chromium-Suiten: `template-placeholders`, `templates`, `template-library`, `approved-templates`, `template-guidance`, `project-setup`, `artboard-parity`.
- Der neue Browserfall verwendet reale native File-Chooser-Ereignisse, Einsetzen, Ersetzen, Abbrechen, die Tastaturalternative, eine Ziehgeste, polygonale/gedrehte Treffer, schmale dunkle Ansicht, axe, Projektisolierung und den echten MKW-Rundlauf.
- Bestehende Vorlagenprüfungen enthalten verknüpfte Winkel, Fehler/Rollback, Undo, eigene Bibliothek, Setup-Rundlauf und die drei freigegebenen Vorlagen.
- Der Ausgangsstand `3960fb6` hatte auf GitHub einen Chromium-Kontextverlust im Artboard-Test, während Firefox bestand. Derselbe Artboard-Test besteht im lokalen Kandidaten ohne geänderte Assertions; kein unabhängig behobener Produktfehler behauptet.
- Die neue Suite wird regulär in Chromium und Firefox ausgeführt. Externe GitHub-/Pages-Ergebnisse und ein Live-Fall werden nach Bereitstellung im Arbeits-Handoff festgehalten, nicht aus lokalen Prüfungen abgeleitet.

Vorlagen-Absatzformate, Backup-Entfernung, Pipette und weitere Aufgaben wurden in diesem begrenzten Auftrag nicht begonnen. Die Winkel-Defaults waren im abgeglichenen Hauptzweig bereits erledigt.
