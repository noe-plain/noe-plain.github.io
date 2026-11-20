# Verknüpfte MKW-ZIP-Arbeitsdateien · 20. November 2026

Der normale Speicherdialog bietet in Browsern mit Dateiauswahl **MKW-ZIP-Arbeitsdatei verknüpfen** an. Das Studio legt eine neue, vom Nutzer gewählte Datei an. Bereits belegte Dateinamen bleiben geschützt. Die Projektbibliothek führt die Datei zusammen mit Projektversion, Dateistempel und Manifest-Prüfsumme. Nach einer Textänderung sichert der bestehende Autosave den Browserstand und aktualisiert anschliessend die verknüpfte Arbeitsdatei.

| Testprojekt | Ausgaben | Dateigrösse | Geschriebene ZIP-Bytes | Davon Medienbytes |
| --- | ---: | ---: | ---: | ---: |
| Designer | 3 | 112’949’457 | 18’530 | 0 |
| FD | 18 | 41’097’075 | 20’593 | 0 |
| Designer | 1 | 9’477’137 | 17’838 | 0 |

Jeder Test öffnete eine lokale Kopie über die reguläre Dateiauswahl, erstellte eine verknüpfte Arbeitsdatei und löste den Autosave durch eine Textänderung aus. Die Teststeuerung ersetzte die Betriebssystem-Dateiauswahl durch einen echten Chromium-Dateihandle im privaten Browserspeicher. Gemessen wurden die tatsächlich an dessen exklusiven Schreibstrom übergebenen Datenbereiche. Medien und Dateigrösse blieben beim Text-Update gleich. Die vorhandenen Medien wurden beim nächsten Speichervorgang über ihre Referenzen wiederverwendet. Der SQLite-Worker erhielt für die Textänderung keine Bilddaten. Ein unveränderter Stand verursachte 0 Schreibbytes.

Nach dem ersten tatsächlich ausgeführten Dateischreibaufruf wurde pro Projekt ein Fehler ausgelöst. Der Abbruch liess die letzte Datei bytegleich. Nach einem Neuladen enthielt die Projektbibliothek den neueren Text und die Verknüpfung. «Projekt speichern» übertrug daraufhin den wiederhergestellten Stand in dieselbe Arbeitsdatei. Die drei Eingabedateien behielten ihre SHA-256-Werte. [Messprotokoll](MKW-ZIP-LINKED-VERIFICATION-2026-11-20.json)

Ein zusätzlicher synthetischer Fall deckt einen Unterbruch nach dem Dateicommit ab. Die nächste Sitzung erkennt das bereits geschriebene Manifest. Der Link speichert vor einem weiteren Update dieses Manifest als Ausgangspunkt. Die Regression prüft einen zweiten Abbruch mit anschliessender Wiederherstellung. Sie prüft auch den kompakten Neuaufbau nach der Entfernung eines Mediums und den Schutz einer ausserhalb des Studios geänderten Datei.

Der bestehende MKW-Speicherweg und die ZIP-Downloads bleiben verfügbar. Das bedarfsweise Laden im eigenständigen Arbeitsmodus ist bereits belegt. Die normale Dateiauswahl verwendet weiterhin die kompatible, vollständige Hydrierung des Editor-Modells. Kaltstart, vollständige WebKit-Abnahme und native Betriebssystem-Dateiauswahl bleiben vor der Umstellung des Standards zu prüfen.

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Die gewählte Arbeitskopie bekommt eine klare Verknüpfungsanzeige. Beim Öffnen des Entwurfs benennt die Meldung den neueren Browserstand. | Gelöst |
| Erfahrener Designer | Eine Textänderung an den drei Testprojekten schreibt ausschliesslich Projekt- und ZIP-Daten. Unveränderte Medien bleiben an derselben Stelle. | Gelöst |
| Senior UX-Experte | Der neuere Stand ist nach Abbruch über die gewohnte Bibliothek erreichbar und kann in der Arbeitsdatei gesichert werden. | Gelöst |
| UI-Expertin | Die neue Arbeitskopie ist als eigene Option im bestehenden Speicherdialog erreichbar. | Gelöst |
| QA-Entwicklerin | Originalkontrolle, Schreibbereiche, No-op und Neuöffnung sind automatisiert geprüft. Die vollständige Plattformabnahme bleibt offen. | Gelöst im geprüften Umfang |
| Destruktiver Fehlersucher | Abbruch, Unterbruch zwischen Dateicommit und Link-Aktualisierung sowie externe Dateiversion sind abgedeckt. | Gelöst im geprüften Umfang |
