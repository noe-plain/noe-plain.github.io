# Noé · Redaktion

Lokales CMS für die bestehende GitHub-Pages-Website. Die öffentlichen HTML-, CSS-, JavaScript- und Inhaltsdateien werden durch die Installation nicht geändert.

## Starten

Im Ordner `portfolio-manager`:

```sh
npm start
```

Danach `http://127.0.0.1:3000` öffnen. Die vorhandenen Abhängigkeiten werden weiterverwendet. Bei einer frischen Installation zuerst `npm ci` ausführen. Der Server bindet ausschliesslich an `127.0.0.1`; `PORT` kann den Port ändern.

## Redaktion

- Design, Illustration und Video: Artikel auswählen oder erstellen, Metadaten und Inhaltsblöcke bearbeiten. Textblöcke unterstützen Fett, Kursiv und Listen. Blöcke lassen sich verschieben und entfernen; Artikel lassen sich duplizieren.
- Bilder und PDFs über „Aus Mediathek wählen“ einsetzen. Neue Dateien unter „Medien“ hochladen. Bestehende Optimierung von Bildern und Videos bleibt verfügbar. Die Videokonvertierung läuft im Hintergrund; ihren Fortschritt zeigen die Spezialwerkzeuge.
- Rechts wird die originale öffentliche HTML-Seite mit ihren originalen Styles und Skripten geladen. Nur ihre Inhaltsdatei wird für diese Vorschau durch den aktuellen Entwurf ersetzt. Desktop zeigt die verfügbare Panelbreite, Mobil ein 390-Pixel-Fenster. Kein nachgebautes Website-Layout.
- „Seiten“ zeigt bestehende HTML-Seiten. Seiten werden ausschliesslich im vollständigen HTML-Editor bearbeitet; rechts bleibt die Originalvorschau sichtbar. ＋ kopiert die ausgewählte Seite in denselben Ordner, sodass relative Asset-Pfade erhalten bleiben. Neue Seiten müssen anschliessend auf einer vorhandenen Seite verlinkt werden.
- Links werden weiterhin in `fake-cms.json` gespeichert.
- Fotoprojekte sind jetzt normale Inhalte mit Blöcken und Originalvorschau. Die öffentliche Fotoseite liest `photography.json` statt nach Dateinamen im früheren Bildordner zu suchen.
- Das Dashboard zeigt Inhaltszahlen, uncommittete Dateien, lokale Commits und die letzten 12 Commits auf dem Upstream mit Dateilisten. „Status aktualisieren“ ruft den tatsächlichen GitHub-Stand ab. Bei einem Abruffehler wird der Stand ausdrücklich als veraltet gekennzeichnet.


## Speichern und Veröffentlichen

„Speichern“ (auch Cmd/Ctrl+S) schreibt nur lokale Dateien. Die Vorschau vor dem Speichern existiert nur im Speicher des lokalen Servers; sie läuft nach einer Stunde ohne Aktualisierung ab. Ungespeicherte Eingaben sind kein dauerhafter Entwurf und gehen beim Schliessen verloren; der Editor warnt vorher.

„Änderungen prüfen“ zeigt den tatsächlichen Git-Status und lokale, noch nicht gepushte Commits. Ausgewählte Website-Dateien werden mit der eingegebenen Nachricht committed und über den vorhandenen Upstream gepusht. Ein Branch mit eingerichteter Upstream-Verbindung und die bestehende Git-Identität sind erforderlich. Neue Commits auf dem Upstream stoppen den Ablauf mit einer Meldung. Ein Commit enthält ausschliesslich die ausgewählten Dateien; andere bereits vorgemerkte Dateien bleiben vorgemerkt. Es gibt kein automatisches Rebase, keinen Force-Push und keine Änderung der Git-Identität.

CMS-Programmdateien können ebenfalls im Veröffentlichungsdialog ausgewählt werden. Versteckte Konfiguration, Rohbilder und nicht freigegebene Dateitypen bleiben ausgeschlossen. Bei Textdateien ist ein Diff verfügbar. Nach einem fehlgeschlagenen Push bleibt ein bereits erstellter Commit erhalten; über „Änderungen prüfen“ lässt sich der Push wiederholen, auch wenn keine Dateien mehr geändert sind.

Eine Push-Bestätigung ist keine Bestätigung eines erfolgreichen GitHub-Pages-Builds. Das CMS zeigt keinen simulierten Deployment-Fortschritt. Die vorhandene GitHub-Pages-Konfiguration wird nicht verändert.

## Technische Prüfung

```sh
node --test studio.test.js
```

Die Integrationstests verwenden ein temporäres Repository und ein lokales Bare-Repository als Remote. Sie prüfen localhost-/Origin-Schutz, Sitzungstoken, Pfadgrenzen, unveränderte Originaldateien bei Vorschauen, Versionskonflikte beim Speichern, ausgewählte Commit-Dateien, wörtliche Commit-Nachrichten und einen Push vorhandener Commits. Sie kontaktieren GitHub nicht.

Die neuen Speicherendpunkte prüfen Dateiversionen vor dem Schreiben. Die ältere Medienverwaltung bleibt als Spezialwerkzeug erhalten und besitzt diese Versionsprüfung nicht. Während der Veröffentlichung sind weitere API-Schreibzugriffe gesperrt. Der bestehende CMS-Quellcode kann weiterhin Teil des GitHub-Repositories sein; die schreibende API benötigt immer den lokalen Node-Prozess.

## Mediathek und Bildansicht

Fotogalerien öffnen Bilder wieder in der bestehenden Detailansicht mit Zoom, Infos, Favoriten und Vor-/Zurück-Navigation. Separate Bildseiten wurden entfernt; Bilder werden in der Galerie-Detailansicht geöffnet.

Die Mediathek und die Bildauswahl zeigen Original und erzeugte Grössen-/Formatvarianten gemeinsam. Bestehende Varianten werden anhand ihres Basisnamens und der bekannten Grössensuffixe erkannt. Neue Uploads speichern zusätzlich den Originaldateinamen in `images/portfolio/media-library.json`. Bereits früher anonymisierte Dateinamen lassen sich ohne vorhandene Originalinformationen nicht rekonstruieren.

Ordner lassen sich erstellen, auswählen und als Upload-Ziel verwenden. „Verschieben“ verschiebt das gesamte Medienpaket einschliesslich Original und aktualisiert vorhandene Verweise in den Website-Dateien. Zielkonflikte werden abgelehnt. Laufende Bildverarbeitungen sind gegen Verschieben gesperrt. Neue Dateinamen bleiben lesbar, etwa `Ferien-Foto.png`; bei Kollisionen entsteht `Ferien-Foto-2.png`.

Weitere Tests: `node --test media-library.test.js upload.test.js`. Beide verwenden ausschliesslich temporäre Dateien.
