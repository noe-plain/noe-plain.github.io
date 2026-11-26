# FD-Kampagnen · Formatgruppen und Altformate

Formatgruppen verwenden Breite und Höhe der Ausgabe. In jeder Gruppe kommt die gemeinsame Gestaltung vom obersten Sujet in der Reihenfolge der Bildreihen. Neue Ausgaben übernehmen Text, Position, Gestaltung und die tatsächlich gesetzte Logo-Sichtbarkeit der passenden Vorlage. Individuell gesetzte Eigenschaften anderer Sujets sowie eigenes Foto und Ausschnitt bleiben erhalten. Beim Umsortieren übernimmt das neue oberste Sujet die vorhandenen Verknüpfungen.

Gültige Backup-Ausgaben lassen sich nun in einer separaten, bearbeitbaren FD-Kampagne übernehmen. Die geprüften Masse waren 6000 × 4000, 240 × 239 und 6000 × 400 px. Das grosse Sujet blieb bearbeitbar und liess sich in MKW-ZIP öffnen. Eine 6000 × 400 px grosse Ausgabe blieb im PNG bytegleich und ergab 4500 × 300 pt im PDF-Originalformat. Auch die kleinere Ausgabe blieb im PDF bei ihren Originalmassen. Eine Schutzzone, die durch die nötige Rundung keinen Innenbereich mehr hätte, wird mit nachvollziehbarem Hinweis abgewiesen.

| Persona | Geprüfter Ablauf | Status |
| --- | --- | --- |
| Neue Nutzerin | Oberstes Sujet je Auflösung erkennen und späteres Format hinzufügen. | Gelöst |
| Erfahrener Designer | Logo und Texte des passenden Formats, lokale Fotoinhalte und einzelne Eigenschaftsabweichungen. | Gelöst |
| Senior UX-Experte | Formatführung folgt der Bildreihenfolge, die Altdatei bleibt bei der Konvertierung separat. | Gelöst |
| UI-Expertin | Vorlage und lokale Bearbeitung im bestehenden Eigenschaftenbereich, sichtbare M3-Formatdialoge und Axe-Prüfung des Editors. | Gelöst |
| QA-Entwicklerin | Drei Altmasse, MKW-ZIP-Rundlauf, PNG, PDF sowie bestehende PSD-Regressionsfälle. | Gelöst im geprüften Umfang |
| Fehlersucher | Rundungsgrenze der Schutzzonen, stale Projektbestätigung, Schutz des Originals und 200-Ausgaben-Grenze. | Gelöst im geprüften Umfang |

Lokal bestanden 223 Modell-/Pakettests und sieben Chromium-Suiten. Volle PSD-Abnahme grosser Altprojekte, weitere repräsentative Altdaten und Entfernung von FD-Backup bleiben in B02 offen. Die Standardgrenzen neu hinzugefügter Designer-Formate, die 200-Ausgaben-/500-Ebenen-Grenzen und das PSD-Exportlimit gelten weiterhin.

## Veröffentlichung

Commit `b942287` bestand den [GitHub-Freigabelauf in Firefox, Chromium und Windows](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45142717386). [Pages](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45145410000) lieferte das geprüfte HTML, JavaScript, CSS und Wiki bytegleich aus. Auf der Live-Seite bestanden die Kampagnenprüfung mit dem späteren Format und der MKW-Rundlauf sowie die Konvertierungsprüfung mit grossen und kleinen Originalmassen, PNG und PDF.


**Fortschreibung 26. November:** Die oben historisch beschriebene Rundungsgrenze wurde im nächsten B02-Teilschritt beseitigt. Gültige Bruchteil-Schutzzonen werden exakt übernommen, ohne den positiven Innenbereich wegzurunden. Nachweise und weiterhin offene Ablösungskriterien: [sichere Kopien](FD-SAFE-COPY-REVIEW-2026-11-26.md).
