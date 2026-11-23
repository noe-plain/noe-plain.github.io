# B02 · Abnahme eines echten FD-Altprojekts

Die zugänglichen Altbestände enthielten ein FD-Backup-Projekt und zwei Designer-Projekte. Die beiden Designer-Projekte eignen sich für die Abnahme des Projektformats, ihre Struktur geht bereits direkt in den Designer. Das Backup-Projekt wurde von einer unveränderten ZIP-Konvertierung der Originaldatei lokal geöffnet. Die reguläre Umwandlung erstellte eine neue Projekt-ID und hielt das Original in der Projektbibliothek. Die Eingabedatei war danach bytegleich.

| Prüfung | Ergebnis |
| --- | --- |
| Umfang und Geometrie | 18 Fotos, 18 Sujets, 1080 × 1080 und 1080 × 1920 px. Masse und Zuordnung erhalten. |
| Bearbeitung | Titelgestaltung geändert, rückgängig gemacht und wiederholt. Reguläres Speichern und Wiederöffnen als MKW-ZIP bestand. |
| PDF | Zwei Originalformat-Seiten mit 810 × 810 und 810 × 1440 pt erzeugt und mit PDF-lib gelesen. |
| PSD, aktive Ausgabe | Die Zuordnung per Seiten-ID verhindert einen Abbruch durch fremde Ausgabemetadaten. Das PSD mit 1080 × 1080 px und Textebene wurde erzeugt und mit ag-psd gelesen. |
| PNG | Alle 18 Originale und migrierten Sujets gerendert. Alle 18 weisen mindestens eine Kanalabweichung von mehr als 1/255 auf. Beim ersten Sujet reduzierte ein Diagnosevergleich ohne alten Logoschatten die Zahl dieser Pixel von 205’767 auf 3’836. |
| Weitere Altprojekte | Familienkonzert, Bildwinkel, Sponsoren und weitere reale Formatkombinationen stehen noch aus. Dieses Projekt enthält diese Sonderfälle nicht. |

| Persona | Befund | Status |
| --- | --- | --- |
| Neue Nutzerin | Umwandlung erstellt eine getrennte, erneut öffnbare Kopie. | Gelöst im geprüften Fall |
| Erfahrener Designer | Bearbeitung und Originalmasse bleiben erhalten. Die migrierte Darstellung weicht ab. | Offen |
| Senior UX-Experte | Original, Undo/Redo und neuer Entwurf bleiben getrennt erreichbar. | Gelöst im geprüften Fall |
| UI-Expertin | Der Logoschatten und weitere Details brauchen eine layouttreue Übernahme. | Offen |
| QA-Entwicklerin | Abmessungen, MKW, PDF und PSD mit echtem Projekt geprüft. Weitere Altdateien fehlen. | Offen |
| Fehlersucher | Export der kontrolliert extrahierten Ausgabe funktioniert wieder, fremde Metadaten bleiben ausserhalb des Ausschnitts. | Gelöst im geprüften Fall |

FD-Backup bleibt im Produkt. Nächster B02-Schritt ist die layouttreue Übernahme des Logoschattens sowie die Prüfung der restlichen Pixelabweichungen und weiterer echter Sonderfälle. Es wurde keine native Photoshop-Handabnahme durchgeführt.
