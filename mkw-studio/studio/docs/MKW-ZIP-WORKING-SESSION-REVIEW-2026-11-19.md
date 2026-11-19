# MKW ZIP v2 · Arbeitsmodus und bedarfsweises Laden

Der SQLite-Worker öffnet die vorhandenen MKW-ZIP-v2-Kopien über die Datei-API des Browsers. Er liest zunächst die Verzeichnisdaten, das Manifest und die SQLite-Datenbank. Bilder und Schriften lädt und prüft er erst bei Anforderung. Das ZIP bleibt eine unveränderliche Quelle. Die SQLite-Arbeitskopie und die Revision liegen im privaten Speicher des Browsers. Der reguläre Studio-Build ist bytegleich. [Quellcode und Prüfanleitung](../tools/mkw-container/README.md) · [SQLite-Persistenz](https://sqlite.org/wasm/doc/tip/persistence.md)

## Messung mit den drei bereitgestellten Projekten

| Projekt | Bilddatensätze bei erster Ansicht | Weitere Bilddatensätze bei letzter Ansicht | Gelesene Bildbytes beim Öffnen | Geschriebene Bildbytes bei einer Textänderung |
| --- | ---: | ---: | ---: | ---: |
| Designer, 3 Slides | 3 von 7 | 3 | 0 | 0 |
| FD, 18 Ausgaben | 1 von 18 | 1 | 0 | 0 |
| Designer, 1 Slide | 1 von 2 | – | 0 | 0 |

Die erste Ansicht las 58.534.177, 1.824.588 bzw. 7.611.175 Bildbytes. Die Designer-Prüfung nutzt die sichtbaren Objekte und den bestehenden Designer-Renderer, die FD-Prüfung den bestehenden FD-Renderer. Eine reine Textänderung schrieb pro Projekt einen geänderten Datensatz und die Revision. Instrumentiert wurden die SQLite-Schreibaufrufe im Browser inklusive Journal. Sie summierten sich auf 29.756 B je Projekt. Während dieser Transaktion wurden 0 Bildbytes gelesen. Ohne Änderung wurden 0 B geschrieben. Die SHA-256-Werte aller ZIP-Dateien stimmten vor und nach dem Lauf mit der Konvertierung überein. [Messprotokoll](MKW-ZIP-WORKING-SESSION-VERIFICATION-2026-11-19.json)

Je Projekt wurden eine veraltete Revision und ein konkurrierender Worker abgewiesen. Ein absichtlich ausgelöster OPFS-Schreibfehler liess den letzten gültigen Textstand erhalten. Ein neu gestarteter Worker nahm ihn mit 0 gelesenen Medienbytes wieder auf. 217 Studio-Tests, 20 Container-Tests und die drei bestehenden Chrome-Suiten für Dateiauswahl, Drag-and-drop und natives inkrementelles Speichern bestanden. Der neue Pfad wurde in Chrome auf macOS mit SQLite 3.54.1 geprüft.

Die Textrevision liegt im lokalen Arbeitsstand. N01.4 übernimmt sie in die portable ZIP-Datei. Die anschliessende Editor-Anbindung umfasst Auswahl, Autosave, Undo/Redo, die Projektbibliothek und die Abnahme auf weiteren Plattformen im jeweils vorgesehenen Schritt des [Masterplans](MASTERPLAN.md).

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Die reguläre Dateiauswahl funktioniert wie bisher. Das Öffnen und Speichern des neuen Arbeitsmodus über diese Auswahl folgt. | Offen |
| Erfahrener Designer | Eine andere Zeichenfläche fordert weitere Bilder erst bei ihrer Darstellung an. Beim Schreiben eines Texts bleiben Bildbytes unberührt. | Gelöst |
| Senior UX-Experte | Ein Worker übernimmt den letzten gültigen Arbeitsstand nach Neustart. Revisionen schützen vor Stale Writes. | Gelöst |
| UI-Expertin | Der bestehende Renderer zeichnet beide Projektmodi mit dem bedarfsweisen Bildzugang. Der reguläre Studio-Build bleibt bytegleich. | Gelöst |
| QA-Entwicklerin | Reale Browser-Schreibaufrufe, Prüfsummen, No-op und gezielte Modelländerung sind für alle drei Fälle geprüft. Plattformabnahme folgt. | Gelöst im geprüften Umfang |
| Destruktiver Fehlersucher | Zweiter Worker und alte Revision sind abgewiesen. Der ausgelöste Schreibfehler ist zurückgerollt. | Gelöst im geprüften Umfang |
