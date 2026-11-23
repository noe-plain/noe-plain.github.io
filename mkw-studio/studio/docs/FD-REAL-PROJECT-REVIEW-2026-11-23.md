# B02 · Abnahme eines echten FD-Altprojekts

Die zugänglichen Altbestände enthielten ein FD-Backup-Projekt und zwei Designer-Projekte. Die beiden Designer-Projekte eignen sich für die Abnahme des Projektformats, ihre Struktur geht bereits direkt in den Designer. Das Backup-Projekt wurde von einer unveränderten ZIP-Konvertierung der Originaldatei lokal geöffnet. Die reguläre Umwandlung erstellte eine neue Projekt-ID und hielt das Original in der Projektbibliothek. Die Eingabedatei war danach bytegleich.

| Prüfung | Ergebnis |
| --- | --- |
| Umfang und Geometrie | 18 Fotos, 18 Sujets, 1080 × 1080 und 1080 × 1920 px. Masse und Zuordnung erhalten. |
| Bearbeitung | Titelgestaltung geändert, rückgängig gemacht und wiederholt. Reguläres Speichern und Wiederöffnen als MKW-ZIP bestand. |
| PDF | Zwei Originalformat-Seiten mit 810 × 810 und 810 × 1440 pt erzeugt und mit PDF-lib gelesen. |
| PSD, aktive Ausgabe | Die Zuordnung per Seiten-ID verhindert einen Abbruch durch fremde Ausgabemetadaten. Das PSD mit 1080 × 1080 px und Textebene wurde erzeugt und mit ag-psd gelesen. |
| PNG | Alle 18 Sujets in Chromium vor und nach der Umwandlung exportiert. Nach der Korrektur sind die dekodierten RGBA-Pixel aller Sujets identisch, auch nach dem Herunterladen und Wiederöffnen der MKW-ZIP-Kopie. Vor der Korrektur hatte allein das erste Sujet 205’767 Pixel mit einer Kanalabweichung grösser als 1/255. |
| Weitere Altprojekte | Familienkonzert, Bildwinkel, Sponsoren und weitere reale Formatkombinationen stehen noch aus. Dieses Projekt enthält diese Sonderfälle nicht. |

| Persona | Befund | Status |
| --- | --- | --- |
| Neue Nutzerin | Umwandlung erstellt eine getrennte, erneut öffnbare Kopie. | Gelöst im geprüften Fall |
| Erfahrener Designer | Originalmasse und Pixel stimmen überein. Ein verschobener Titel wird weiterhin als bearbeitbare Ebene neu gerendert. | Gelöst im geprüften Fall |
| Senior UX-Experte | Original, Undo/Redo und neuer Entwurf bleiben getrennt erreichbar. | Gelöst im geprüften Fall |
| UI-Expertin | Logoschatten, Textverlauf, Satz und Copyright entsprechen dem Original. | Gelöst im geprüften Fall |
| QA-Entwicklerin | Alle 18 PNGs und der Dateirundlauf bestanden. Weitere echte Altprojekte fehlen. | Offen |
| Fehlersucher | Export der kontrolliert extrahierten Ausgabe funktioniert wieder, fremde Metadaten bleiben ausserhalb des Ausschnitts. | Gelöst im geprüften Fall |

Beim Umwandeln wird die Logo-Verankerung aus der bisherigen Schutzzone und dem tatsächlichen Seitenverhältnis des Logos bestimmt. Kampagnen verwenden den vorhandenen Silhouettenschatten, und unveränderte Alttexte sowie der unveränderte Kontrastverlauf werden mit dem ursprünglichen Zeichenpfad gerendert. Sobald eine solche Ebene gestalterisch verändert wird, zeichnet der reguläre Editor die bearbeitete Ebene. Die Quelldatei blieb bytegleich.

Die PSD-Korrektur aus Commit `00072f2` ist live. Der ausgelieferte Editor-Build entsprach beim Abgleich bytegenau dem Commit. [GitHub-Prüflauf 45151483930](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45151483930).

FD-Backup bleibt bis zur vollständigen Abnahme im Produkt. Der nächste B02-Schritt prüft weitere echte Familien-, Winkel- und Sponsorenprojekte. Die Photoshop-Handabnahme steht aus.
