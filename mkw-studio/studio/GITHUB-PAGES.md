# GitHub Pages

Die veröffentlichte App läuft unter `https://noe-plain.github.io/mkw-studio/studio/`. Nutzer benötigen keine Installation und keinen Server. Alle Runtime-Bibliotheken sind lokal enthalten; projektbezogene Daten werden nicht zu GitHub hochgeladen.

## Veröffentlichung

Im App-Ordner nach Änderungen `npm ci`, `npm run format`, `npm run build`, `npm test` und die relevanten Browserprüfungen ausführen. Quellen, Modulmanifest, generierte Bundles, Source Map, `index.html`, lokale Runtime-Ressourcen und Logos zusammen committen. Die HTML-Ressourcen werden aus ihrem Inhalt versioniert. Nicht veröffentlichen: `node_modules/`, `.venv/`, private MKW-Dateien, Backups und Testausgaben.

Das Build-Skript fasst 40 first-party Module und 13 Stylesheets zusammen. Es ist nur für die Entwicklung nötig; GitHub Pages liefert fertige statische Dateien aus. Der Workflow `.github/workflows/mkw-studio.yml` prüft Unit-Tests, Formatierung, reproduzierbare Bundles und isolierte Browserabläufe. Die bestehende Pages-Veröffentlichung bleibt zuständig für das Deployment.

## Speicherung

Projekte liegen getrennt nach Website-Pfad und Browserprofil in IndexedDB. Eine alte Einzelsicherung wird übernommen. Konkurrenz zwischen Tabs erzeugt Konfliktkopien. Bilder/Logos/Schriften werden gemeinsam nach Inhalt abgelegt; ungenutzte Bestandteile werden eingesammelt, ohne andere Projekte zu beschädigen.

Browser mit File System Access können vom Nutzer gewählte MKW-Dateien aktualisieren, inklusive Autosave bei bereits erteiltem Zugriff. Ohne diese Schnittstelle ist direktes Überschreiben technisch nicht verfügbar. Dort bleiben automatische Browsersicherung und bewusster Download. Private Fenster, gelöschte Website-Daten oder Browser-Speichergrenzen können Browsersicherungen entfernen; wichtige Projekte zusätzlich als MKW-Datei sichern.

## Lokale Vorschau

`npm run test:browser` startet seine eigene Vorschau. Manuell beispielsweise `python3 -m http.server 8912` im App-Ordner starten. Ein fehlender `/api/session`-Endpunkt ist bei rein statischer lokaler Vorschau normal. `Start.command` bietet optional Pillow/TIFF/EXIF; die neue Projektverwaltung bleibt im Browser.
