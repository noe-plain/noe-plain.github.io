# B02 · Dateirundlauf mit nach realen Vorgaben erstelltem Referenzprojekt

Das bereitgestellte FD-Projekt enthält sieben Bilder, sieben eingebettete Schriften und 14 Ausgaben, je sieben in 1080 × 1920 und 1080 × 1080 px. Zwei Ausgaben enthalten einen gespiegelten Bildwinkel und zwei verwenden die Familiengestaltung. Sponsoren gehören gemäss Nutzerentscheid vom 27. November nicht zu den Abnahmekriterien für alte Projekte.

## Befund und Korrektur

Die echte Umwandlung im freigegebenen Stand übertrug auf beide Familienausgaben einen Kontrastverlauf, den das jeweilige Original bewusst nicht enthielt. Betroffen waren 653’180 und 547’051 PNG-Pixel. Die Umwandlung registriert fehlende Rollen jetzt als bestehende lokale Abweichung. Vorhandene Ebenen behalten ihre Zuordnungen. Neue Ausgaben übernehmen weiterhin die vorhandene Formatvorlage. Die private Testdatei wurde ausschliesslich lokal gelesen.

| Kontrolle | Ergebnis |
| --- | --- |
| Speichern und Wiederöffnen | Alle 14 korrigierten Kampagnen-PNGs sind nach dem MKW-ZIP-Rundlauf pixelgleich. Formate, sieben Bilder und sieben eingebettete Schriften sind vorhanden. |
| Vergleich Altprojekt → korrigierte Kopie | 11 von 14 PNGs sind pixelgleich. Übrig bleiben 499, 1’455 und 8 Pixel in drei Ausgaben. Das sind insgesamt 1’962 von 22’680’000 Pixeln. Die grösste Abweichung eines einzelnen Farbkanals beträgt 8/255. |
| Archiv und Original | ZIP-CRC, SQLite-Integrität und Fremdschlüssel bestanden. Alle 14 binären Blobs waren anhand der SHA-256-Werte identisch. Die ursprüngliche Eingabedatei war bytegleich mit der vorab angelegten lokalen Prüfkopie. |
| PDF | Drei Originalformat-Seiten geschrieben und wieder gelesen. Die Grössen entsprechen den Originalformaten. |
| PSD | Je eine Winkel- und Familienausgabe als PSD erzeugt und programmatisch wieder gelesen. Abmessungen und je eine Textebene geprüft. |
| Regression | 234 Modell-/Dateitests und sieben gezielte Chromium-Suiten bestanden. |

**B02-Status:** Dateirundlauf bestanden. Die Umwandlung war im Referenzprojekt nach der Korrektur bis auf die gemessenen Restpixel gleich. Die vollständige Ablösefreigabe für FD-Backup bleibt offen. Die PSD-Analyse ist ein programmatischer Nachweis. Die Bearbeitung in Photoshop wurde hier nicht abgenommen.
