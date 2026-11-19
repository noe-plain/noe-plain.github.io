# MKW ZIP v2 · Konvertierungsprüfung vom 19. November 2026

Der lokale [Konverter](../tools/mkw-container/README.md) erzeugt aus JSON-, gzip- und MKWBLK1-Projekten eine neue `.mkw`-Datei. Er bewahrt das vollständige Projektmodell inklusive unbekannter Felder und schreibt identische Bild- und Schriftdaten pro Projekt nur einmal. Die drei bereitgestellten Originale wurden zur Prüfung lokal kopiert und an ihrem Speicherort belassen. Das Prüfprotokoll enthält ausschliesslich anonymisierte Ergebnisse.

| Fall | Projekt | Modell und Medien | PNG | PDF | PSD |
| --- | --- | --- | --- | --- | --- |
| 1 | Designer, 3 Slides | Vollständig, 9 Referenzen auf 8 Assets | 3 pixelgleich | Erste Seite, Abmessungen und Bilddaten gleich | Gesamtbild und geprüfte Ebenenstruktur gleich |
| 2 | FD, 18 Ausgaben | Vollständig, 20 Referenzen auf 20 Assets | 18 pixelgleich | Im FD-Modus nicht verfügbar | Gesamtbild und geprüfte Ebenenstruktur gleich |
| 3 | Designer, 1 Slide | Vollständig, 4 Referenzen auf 4 Assets | 1 pixelgleich | Erste Seite, Abmessungen und Bilddaten gleich | Gesamtbild und geprüfte Ebenenstruktur gleich |

Die unabhängigen Programme UnZip 6.00 und SQLite 3.54.0 bestätigten ZIP-CRC, Schema-ID, Version, Datenbankintegrität und Fremdschlüssel. Für den Rendering-Vergleich rekonstruierte der ZIP-v2-Leser eine gzip-MKW je Projekt. Der unveränderte Studio-Build öffnete Original und rekonstruierte Kopie jeweils in getrennten Chrome-Sitzungen. Verglichen wurden dekodierte PNG-RGBA-Pixel, PDF-Bilddaten und Seitengrösse sowie PSD-Gesamtpixel, Ebenenhierarchie, Sichtbarkeit und Texte. 20 Container- und 217 Studio-Tests sowie 4 Chrome-Suiten bestanden. [Prüfprotokoll](MKW-ZIP-MIGRATION-VERIFICATION-2026-11-19.json)

Das erste Archiv wurde rund 14 % kleiner. Die beiden anderen wuchsen um rund 0,2 % und 2,9 %. Streaming, neue Vorschauen, weitere Browser-/Plattformabnahme und direktes Öffnen des ZIP-Profils im Editor folgen im Masterplan.

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Separate Kopie schützt das Original. Das direkte Öffnen der ZIP-Kopie im Editor fehlt. | Offen |
| Erfahrener Designer | Pixelgleiches PNG über alle Slides. PSD und repräsentatives Designer-PDF stimmen im geprüften Umfang überein. | Gelöst |
| Senior UX-Experte | Konvertieren und Wiederherstellen verlangen ausdrücklich einen neuen Dateinamen. Ein bestehendes Ziel führt zu einer Fehlermeldung. | Gelöst |
| UI-Expertin | Ausrichtung, Typografie, Farbe und Bildausschnitte bleiben im geprüften Rendering pixelgleich. | Gelöst |
| QA-Entwicklerin | Alle drei vollständigen Modelle stimmen überein. JSON und MKWBLK1 sind zusätzlich durch gezielte Testdateien abgedeckt. | Gelöst |
| Destruktiver Fehlersucher | Beschädigte Medien, doppelte JSON-Felder und Kollisionen werden abgewiesen. Der geprüfte Schreibweg kann keine Originale überschreiben. | Gelöst |
