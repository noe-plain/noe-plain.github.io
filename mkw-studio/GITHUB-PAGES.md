# GitHub Pages

Das Studio läuft direkt unter `https://noe-plain.github.io/mkw-studio/` sobald die Änderungen im veröffentlichten GitHub-Pages-Branch liegen. Kein npm-Build oder Python-Server ist für die Website erforderlich. Die bestehende GitHub-Pages-Konfiguration der Website kann bleiben.

## Veröffentlichen

Den Ordner `mkw-studio` mit `index.html`, `static/` und den beiden `mkw-logo-bold-*.svg` in das Website-Repository übernehmen, committen und pushen. Auf Gross-/Kleinschreibung des Ordnernamens achten. Nicht veröffentlichen: `.venv/`, `node_modules/`, `lokale-daten/`, Backups, ZIP-Kopien und alte Referenzprojekte. Für Pages werden nur die oben genannten Laufzeitdateien benötigt.

## Browser-Version

- JPG, PNG und WebP importieren; Bilder werden ausschliesslich auf dem Gerät verarbeitet.
- Automatische Speicherung in IndexedDB, getrennt nach Website-Pfad und Browserprofil. Gelöschte Browserdaten entfernen auch die automatische Sicherung. Wichtige Projekte zusätzlich als MKW-Datei herunterladen.
- Vorhandene MKW-Dateien öffnen und wieder herunterladen; Schriften, Logos und PSD-Export sind enthalten.
- JPGs als ZIP herunterladen. In Browsern mit Ordnerzugriff auch direkt in einen gewählten Ordner speichern. Vorhandene gleichnamige Dateien werden nicht überschrieben.
- TIFF vorab in PNG/JPG umwandeln oder mit `Start.command` lokal arbeiten.
- Online übernimmt der Browser Bildausrichtung und Farbkonvertierung nach sRGB. JPEG-Kodierung und Profilbehandlung können von Pillow abweichen; keine Garantie für identische Pixel oder JPEG-Subsampling. Das Aufnahmedatum wird online aus dem Dateinamen abgeleitet, nicht aus EXIF. PSD enthält ein eingebettetes sRGB-Profil.

## Lokale Python-Version

`Start.command` funktioniert weiterhin. Unter localhost erkennt das Studio den Python-Server und verwendet wie bisher dessen Import, Sicherung und JPG-Export, inklusive TIFF, EXIF-Aufnahmedatum und Pillow-Farbkonvertierung. Die relativen Ressourcenpfade werden ebenfalls unterstützt.

## Statische Vorschau

Im Website-Hauptordner `python3 -m http.server 8876` starten und `http://localhost:8876/mkw-studio/` öffnen. Ein fehlender `/api/session`-Endpunkt auf localhost ist bei dieser Vorschau normal; anschliessend wird die Browser-Version verwendet.

## Bedienung ab September 2026

Beim Start zwischen **Neues Projekt starten** und **Letztes Projekt fortsetzen** wählen. Ein leeres neues Projekt ersetzt die bisherige automatische Sicherung erst bei der ersten Änderung. Fortsetzen bezieht sich auf den letzten Stand im selben Browser und Website-Pfad. Projekte vom früheren Website-Pfad bei Bedarf als MKW-Datei öffnen.

Oberhalb jedes Bildes unter **Textarten auswählen** Datum, Konzerttitel und Untertitel kombinieren. Die Auswahl gilt für alle Formate dieses Bildes. Ausblenden behält den Textinhalt; Änderungen lassen sich rückgängig machen und werden mit dem Projekt gespeichert.

Der Logoschatten wird aus einer schwarzen, weichgezeichneten Transparenzmaske erzeugt. Vorschau, JPG und PSD verwenden denselben Schatten.
