# MKW-ZIP im normalen Editor · 20. November 2026

Der Editor öffnet die Projektstruktur und referenziert Fotos zunächst als binäre Ausschnitte der MKW-Datei. Beim ersten Gebrauch werden ZIP- und Inhaltsprüfsumme überprüft. Die Bibliothek sichert die Originalbytes für die Wiederherstellung. Schriften und Logos werden beim Öffnen vorbereitet. In Browsern ohne Dateiauswahl sichert IndexedDB die Binärdaten als Puffer, bevor ein Projekt als lokal gesichert gilt.

**Projekt speichern**, **Speichern unter …** und die Projektbeigabe im Bild-ZIP schreiben MKW-ZIP v3. Die ZIP-Sonderaktionen sind aus dem Speicherdialog entfernt. Vorhandene JSON-, gzip- und MKWBLK1-Dateien können geöffnet werden und bleiben bei der Migration erhalten.

| Projektkopie | In der ersten Ansicht angeforderte Bilddaten | Pixelgleiche PNG-Ausgaben | Geschriebene Bytes beim Text-Autosave |
| --- | ---: | ---: | ---: |
| Yulianna Avdeeva – Konzertrückblick | 5 von 6 | 3 | 18’530 |
| Dichterlos | 2 von 18 | 18 | 20’593 |
| Outlook Down – Moët/Shenko | 1 von 2 | 1 | 17’838 |

Alle drei Kopien hatten identische PSD-Kompositionen und Ebenenstrukturen. Die zwei Designer-Projekte bestanden ausserdem den PDF-Pixelvergleich auf je einer Seite. Beim automatischen Textspeichern wurden 0 Medienbytes neu geschrieben. Ein Abbruch nach dem ersten Schreibzugriff liess jede Arbeitsdatei bytegleich. Nach Neuladen stellte die Bibliothek den neueren Text wieder her. Er liess sich in derselben Arbeitsdatei sichern. Die Eingabekopien und Originale blieben erhalten.

Zusätzlich geprüft wurden der Chrome-Rundlauf mit 50 Bildern, Kompaktierung, No-op und Fremddateischutz sowie der WebKit-Rundlauf mit Download, Bibliothekswiederherstellung und MKW-Beigabe. Der lokale Firefox-Prozess startete auf diesem Mac nicht stabil. Die Firefox-Prüfung kann über GitHub Actions laufen.

| Persona | Beobachtung | Status |
| --- | --- | --- |
| Neue Nutzerin | Der normale Speichern-Knopf erstellt die Arbeitsdatei. Der Import meldet, wie ein altes Projekt weitergespeichert werden kann. | Gelöst |
| Erfahrener Designer | Alle 22 PNG-Ausgaben sowie die geprüften PDF- und PSD-Ausgaben behalten ihre Darstellung. | Gelöst |
| Senior UX-Experte | Autosave, Bibliothek und explizite Wiederaufnahme greifen auf denselben Projektstand zu. | Gelöst |
| UI-Expertin | Die doppelten ZIP-Aktionen entfallen. Der Speicherdialog behält seine vorhandene Hierarchie und Tastaturbedienung. | Gelöst |
| QA-Entwicklerin | Die drei Eingabekopien, 50 Bilder, Selektivexport und die beiden getesteten lokalen Browser-Pfade bestanden. | Firefox lokal offen |
| Fehlersucher | Schreibabbruch, Wiederaufnahme, Fremdänderung und beschädigte ZIP-Einträge sind abgedeckt. | Gelöst |
