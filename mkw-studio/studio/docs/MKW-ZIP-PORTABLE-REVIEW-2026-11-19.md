# Portable MKW-ZIP-Revisionen · 19. November 2026

Der OPFS-Arbeitsmodus überträgt die geprüfte Textrevision in eine portable MKW-ZIP-Datei. Bei gleich grosser Datenbank schreibt er deren geänderte Seiten, das aktualisierte Manifest und die ZIP-Prüfsummen. Der Dateischreibstrom prüft vor dem Öffnen und nach Erhalt des exklusiven Zugriffs Dateigrösse, Änderungszeit und Manifest. ZIP v3 verwendet weiterhin SQLite-Schema 2. Die Hashwerte unter `source` bezeichnen den Ursprung. Der Hash des SQLite-Eintrags identifiziert den aktuellen Stand. Der Browser und der lokale Konverter lesen v2 und v3. [ZIP-Spezifikation](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) · [Browser-Dateizugriff](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)

| Projekt | Archivgrösse | Gemessene ZIP-Schreibbytes | Bytes in Medienbereichen | Bytegleiche Medieneinträge |
| --- | ---: | ---: | ---: | ---: |
| Designer, 3 Slides | 111’460’314 B | 9’995 B | 0 | 8 |
| FD, 18 Ausgaben | 39’607’932 B | 12’058 B | 0 | 20 |
| Designer, 1 Slide | 7’983’898 B | 9’303 B | 0 | 4 |

Für die Messung wurde je eine separate Kopie im privaten Browserspeicher vorbereitet. Die Tabelle misst die anschliessend vom Studio an den Schreibstrom übergebenen Bytes. Die ursprüngliche Kopie und eine allfällige temporäre Kopie des Browsers oder Betriebssystems gehören nicht zu diesem Messwert. UnZip 6.00, SQLite 3.54.0 und der komplette Modellvergleich bestätigten, dass sich pro Projekt nur ein Textfeld änderte. Der Vergleich aller Medieneinträge umfasste Bilder und Schriften. Alle drei Ausgangskopien behielten ihre SHA-256-Werte.

Ein absichtlicher Abbruch nach dem ersten Schreibaufruf liess jede Kopie bytegleich. Ein veralteter Schreibplan wurde abgewiesen. Eine unveränderte Revision schrieb 0 B. Im separaten Wachstumstest erzeugte der Fallback einen kompakten ZIP-Snapshot mit 8’065’819 B und denselben vier Medieneinträgen. Dieser Fall schreibt das Archiv vollständig.

Im regulären Editor ist die Dateiauswahl kompatibel mit MKW ZIP. Der Speicherdialog bietet einen separaten Download als MKW-ZIP-Kopie an. Im Bild-Export lässt sich dieses Profil für die vollständige Projektbeigabe auswählen. Die normale ZIP-Dateiauswahl hydriert den bisherigen Editor-Datensatz. Die bestehenden MKW-Speicherwege behalten die Verantwortung für Browsersicherung, direkte Dateiverknüpfung und Standard-Downloads.

221 Studio-Modell-/Formattests, 20 Python-Container-Tests und fünf lokale Chrome-Suiten bestanden. Alle drei Textrevisionen wurden über die reguläre Dateiauswahl geöffnet. Die Belastungsprüfung umfasst 50 Bilder, 24 Slides in Reihen mit 1, 3 und 20 Slides, unveränderte unbekannte Daten und Kompaktierung nach Löschen eines Bildes. WebKit bestand den eigenständigen Codec-Rundlauf. Die vollständige WebKit-Suite scheiterte bei der bestehenden Browsersicherung des Testprojekts. Die lokale Firefox-Automation konnte ihren gepatchten Browser unter macOS nicht starten.

Die vollständigen GitHub-Suiten für Chromium und Firefox sowie die synthetische Format- und Studio-Prüfung auf Windows waren erfolgreich. GitHub Pages lieferte HTML, Worker und SQLite-WASM bytegleich mit der veröffentlichten Arbeitsversion aus. Die synthetische Browser-Suite für Öffnen, Speichern, Bild-ZIP und 50 Bilder bestand auch auf der Live-Seite. [GitHub-Prüfungen](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44550941570) · [Veröffentlichung](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44550939839) · [Messprotokoll](MKW-ZIP-PORTABLE-VERIFICATION-2026-11-19.json)

Der private Testlauf `mkw-zip-ui` prüfte zusätzlich die drei ZIP-Projekte nach einer explizit abgeschlossenen Browsersicherung. Nach Neuladen und Öffnen aus der Projektbibliothek war der neu bearbeitete Text in allen drei Fällen vorhanden. Die drei ZIP-Dateien blieben bytegleich. Der Nachweis betrifft die normale Browserbibliothek. Verknüpfte ZIP-Autosaves und Wiederherstellung nach einem abgebrochenen verknüpften Schreibvorgang sind weiterhin offen.

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Eine ZIP-Datei öffnet sich über die gewohnte Dateiauswahl. Eine neue ZIP-Kopie hat eine eigene Speicheraktion. | Gelöst |
| Erfahrener Designer | Beim gezielten Speichern einer portablen Textrevision bleiben die Bilder bytegleich und ausserhalb der Schreibbereiche. | Gelöst |
| Senior UX-Experte | Der inkrementelle Schreibpfad braucht noch die Anbindung an gewöhnliches Speichern und Wiederaufnahme. | Offen |
| UI-Expertin | Gewohnter Speicherdialog und eigene Auswahl für das Projektformat im Bild-ZIP. | Gelöst |
| QA-Entwicklerin | Chrome, unabhängige Programme und WebKit-Codec geprüft. Vollständige Plattform- und Altformatabnahme bleibt Voraussetzung für den Standardwechsel. | Offen |
| Destruktiver Fehlersucher | Schreibabbruch, veraltete Dateiversion, beschädigter ZIP-Inhalt, doppelte Pfade und unbekannte Versionen geprüft. | Gelöst im geprüften Umfang |
