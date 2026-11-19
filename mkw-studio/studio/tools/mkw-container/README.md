# MKW ZIP v1 · Basisprofil

Der Entwicklungs-Codec erzeugt und liest eigenständige `.mkw`-Container mit SQLite. Er wird separat vom Studio ausgeführt und nutzt ausschliesslich die Python-Standardbibliothek. Python 3.9 oder neuer mit SQLite ab 3.37 unterstützt die benötigten strikten Tabellen. Die Beispielgrafik besteht aus eigens erzeugten Testpixeln.

Vom Studio-Ordner aus:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/mkw-container/example.py inspect examples/mkw-zip-v1.mkw
PYTHONDONTWRITEBYTECODE=1 python3 tools/mkw-container/example.py generate /tmp/eigenes-mkw-beispiel.mkw
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/mkw-container -v
tools/mkw-container/verify-example.sh examples/mkw-zip-v1.mkw
```

Der letzte Befehl verwendet `unzip` und das eigenständige SQLite-Kommandozeilenprogramm. Der Generator prüft den geschriebenen Container und veröffentlicht die Datei erst danach im Zielverzeichnis. Existiert die Zieldatei schon, bricht er ab. Das Ziel-Dateisystem muss Hardlinks unterstützen.

| Eintrag | Inhalt |
| --- | --- |
| `manifest.json` | Formatkennung `mkw-studio-zip`, Format-/Schemaversion, minimale Leserversion, Werkzeugversion, ID/Titel/Revision und SHA-256/Bytegrösse der drei übrigen Beispiel-Einträge |
| `project.sqlite` | SQLite-Anwendungskennung `MKWZ`, Schemaversion 1 sowie Tabellen für Projekt, Zeichenflächen, Ebenen, Bilddatenreferenzen und Text-/Bildobjekte |
| `assets/<sha256>.png` | Eine binäre PNG pro Inhalts-Hash. Beliebig viele Bildobjekte derselben Datei teilen die entsprechende Referenz im Rahmen der Profilgrenzen. |
| `previews/<artboard-id>.png` | Eine getrennte PNG-Vorschau pro Zeichenfläche |

Die gemeinsame Dateiendung ist `.mkw`. Die Familie wird anhand der Dateisignatur unterschieden. Bei ZIP entscheiden zusätzlich Formatkennung und Version im Manifest sowie die SQLite-Kennung und das Schema. Der Editor verwendet weiterhin seine vorhandenen Formate JSON, gzip-JSON und MKWBLK1. Der lokale Konverter erzeugt ZIP v2 und kann daraus wieder eine gzip-MKW für den bestehenden Editor schreiben.

Das Basisprofil verwendet ZIP STORE und begrenzt Archive auf 64 MiB, SQLite auf 4 MiB und Vorschaubilder auf längstens 1.024 Pixel. Der Leser akzeptiert die spezifizierten Einträge und genau das v1-Schema. Er prüft CRC, SHA-256, Fremdschlüssel und Manifest-/DB-Identität. PNG-Typ und Abmessungen werden anhand des Headers geprüft. Das eigentliche Dekodieren erfolgt über einen Bildleser. Die Grenzen gelten für diesen Entwicklungs-Codec. Weitere Objekttypen, Schriften, ZIP64 und Streaming werden in den Folgestufen spezifiziert.

[ZIP-Spezifikation](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) · [SQLite-Anwendungskennung](https://www.sqlite.org/pragma.html#pragma_application_id) · [SQLite-Kommandozeilenwerkzeug](https://www.sqlite.org/cli.html)

## Vorhandene Projekte in MKW ZIP v2 umwandeln

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/mkw-container/migration.py convert "/pfad/Original.mkw" "/pfad/Kopie – ZIP.mkw"
PYTHONDONTWRITEBYTECODE=1 python3 tools/mkw-container/migration.py restore "/pfad/Kopie – ZIP.mkw" "/pfad/Kopie – Studio.mkw"
```

Beide Befehle brauchen einen neuen Zielnamen im gewünschten Verzeichnis. Der Konverter prüft die Quelldatei vor und nach dem Lesen. Er rekonstruiert und vergleicht das gesamte Projektmodell vor der Freigabe der neuen Datei. Die Veröffentlichung erfolgt per Hardlink zu der vollständig geschriebenen Datei im selben Dateisystem. Bei fehlender Hardlink-Unterstützung meldet der Befehl einen Fehler. Der Reader prüft ZIP-CRC, Manifest, SHA-256, SQLite-Schema, Datenbankintegrität, Fremdschlüssel und die Zuordnung jedes Medienverweises.

ZIP v2 hält die geordneten Sammlungen des alten Modells in SQLite-Datensätzen fest. Unbekannte Eigenschaften und die ursprünglichen Projekt- und Objekt-IDs bleiben erhalten. Medien aus standardkonformen Base64-Daten-URLs liegen binär unter `assets/<sha256>.bin`. Identische Dateien teilen sich denselben Archiveintrag. Ungewöhnlich kodierte Daten-URLs bleiben bei Bedarf exakt in ihrer ursprünglichen Textform erhalten. Das Profil bewahrt vorhandene Vorschaudaten und erzeugt noch keine neuen Vorschaubilder.

Für diesen lokalen Konverter gelten 768 MiB für die Quelle und das entpackte Legacy-JSON, 576 MiB für ZIP, 32 MiB für SQLite und 5.000 ZIP-Einträge. Der Konverter hält das Modell und die Medien während der vollständigen Prüfung im Speicher. Anwendungen für Lazy Loading und inkrementelle Aktualisierung folgen im Masterplan. Studio-Speichern und -Öffnen bleiben beim bisherigen Profil.

Der manuelle Rendering-Vergleich nimmt eine private JSON-Liste mit `case`, `source` und `restored` pro Datei. Er öffnet beide Projekte im bestehenden Editor und protokolliert ausschliesslich Vergleichsergebnisse. Eingaben, Zwischenkopien und Ausgaben aus privaten Projekten gehören ausserhalb des Repositorys.

```sh
MKW_MIGRATION_INPUT=/pfad/paare.json MKW_TEST_OUTPUT=/pfad/lokale-pruefung \
  npm run test:browser -- mkw-zip-migration-render
```

## Browser-Arbeitsmodus (N01.3)

Die Module in `working-session/` verwenden das vorhandene v2-Schema. `serveSession` erhält die lokal ausgelieferte SQLite-WASM-Initialisierung. Ein Worker besitzt genau eine Arbeitskopie. `open` erhält ein schreibgeschütztes `File` und eine UUID. `asset` erhält einen Modellpfad wie `["images", 0, "data"]`. `saveText` erhält die erwartete Revision und eine Liste von Designer-Texten oder FD-Textfeldern. Eine Transaktion schreibt jeweils nur die geänderten Datensätze und die Revisionsnummer. `open` mit `resume: true` benötigt einen neuen Worker, dieselbe UUID und die zur Sitzung gehörende Quelldatei. `close` gibt den Arbeitsstand frei. `close` mit `discard: true` entfernt die Arbeitskopie.

Der Test nutzt eine private Liste mit `case`, `target` und optional `targetHash`. Die lokale Testseite erhält die MKW-Dateien über den Datei-Input. Die optionalen Felder `source` und `sourceHash` erlauben zusätzlich eine Vorher-/Nachher-Prüfung der alten Arbeitskopie. Der Ergebnisbericht enthält nur Messwerte. Bezug und Version der SQLite-WASM-Ressourcen stehen im [Machbarkeitsnachweis](../design-format-probe/README.md).

```sh
node tools/mkw-container/working-session/check.mjs /pfad/sqlite-wasm/dist /pfad/paare.json /pfad/ergebnis.json
```

Der reguläre Editor verwendet weiterhin seine bisherigen MKW-Speicherwege. Das Übernehmen einer Arbeitsrevision in die portable Datei und die Anbindung an Projektdialoge und Autosave folgen im Masterplan.
