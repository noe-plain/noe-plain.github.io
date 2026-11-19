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

Die gemeinsame Dateiendung ist `.mkw`. Die Familie wird anhand der Dateisignatur unterschieden. Bei ZIP entscheiden zusätzlich Formatkennung und Version im Manifest sowie die SQLite-Kennung und das Schema. Der Editor verwendet weiterhin seine vorhandenen Formate JSON, gzip-JSON und MKWBLK1. Das Öffnen oder Speichern des ZIP-Profils im Editor sowie die Migration bleiben separate Schritte.

Das Basisprofil verwendet ZIP STORE und begrenzt Archive auf 64 MiB, SQLite auf 4 MiB und Vorschaubilder auf längstens 1.024 Pixel. Der Leser akzeptiert die spezifizierten Einträge und genau das v1-Schema. Er prüft CRC, SHA-256, Fremdschlüssel und Manifest-/DB-Identität. PNG-Typ und Abmessungen werden anhand des Headers geprüft. Das eigentliche Dekodieren erfolgt über einen Bildleser. Die Grenzen gelten für diesen Entwicklungs-Codec. Weitere Objekttypen, Schriften, ZIP64 und Streaming werden in den Folgestufen spezifiziert.

[ZIP-Spezifikation](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) · [SQLite-Anwendungskennung](https://www.sqlite.org/pragma.html#pragma_application_id) · [SQLite-Kommandozeilenwerkzeug](https://www.sqlite.org/cli.html)
