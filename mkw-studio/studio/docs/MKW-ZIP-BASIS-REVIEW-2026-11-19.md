# MKW ZIP v1 · Basiscontainer · 19. November 2026

Der Nutzer hat die Endung `.mkw` auch für den neuen ZIP-/SQLite-Container festgelegt. N01.1 wurde auf Hauptstand `224b38c` als isolierter Entwicklungs-Codec umgesetzt. Der bestehende Editor-Build ist bytegleich zum Ausgangsstand. Die Beispieldatei wird über den Entwicklungs-Codec und unabhängige Programme geöffnet. [Beispiel](../examples/mkw-zip-v1.mkw) · [Schema, Formatprofil und Befehle](../tools/mkw-container/README.md)

Die Datei ist 62.649 Bytes gross und enthält eine Zeichenfläche mit 128 × 80 px, eine Ebene, den Text «MKW» und zwei Bildobjekte. Beide Bildobjekte referenzieren dasselbe binäre 48 × 32-PNG. Die separat gespeicherte 128 × 80-PNG-Vorschau bildet das synthetische Beispiel ab.

## Prüfung

- **UnZip 6.00** las und entpackte vier Einträge. Der ZIP-Test bestätigte alle CRCs.
- **SQLite-CLI 3.54.0** öffnete die entpackte Datenbank schreibgeschützt. `integrity_check` meldete `ok`, `foreign_key_check` lieferte keine Zeilen. Die Abfragen bestätigten Anwendungskennung, Schemaversion, Zeichenfläche, Textebene und genau eine Bildreferenz für zwei Bildobjekte.
- **macOS sips** dekodierte die Bilddatei und die Vorschau tatsächlich nach BMP. Das erneute Erzeugen des Beispiels im gleichen Werkzeugstand lieferte dieselben Bytes.
- **12 Codec-Tests** prüften echten Datei-Rundlauf, Signaturen, Endung, Schreibschutz, ungültige ZIP-CRC, veralteten SHA-256 bei gültiger CRC, unbekannte Versionen/Schemaänderungen, Fremdschlüssel, Manifest-Abgleich, doppelte oder unerwartete Einträge und abgeschnittenes ZIP.
- Build, Formatierung, 217 vorhandene Modelltests und gezielte Editorregressionen für MKW-Ablegen, Öffnen und inkrementelles Speichern geprüft. [Maschinenprotokoll](MKW-ZIP-BASIS-VERIFICATION-2026-11-19.json)

| Persona | Feedback / Problem | Stand |
| --- | --- | --- |
| Neue Nutzerin | Eine vertraute Endung für Projektdateien | `.mkw` für beide Formatfamilien festgelegt. Öffnen des ZIP-Profils im Studio folgt später. |
| Erfahrener Designer | Bearbeitbare Objekte und geteilte Medien | Text und Geometrie sind abfragbar. Zwei Objekte teilen genau eine Binärdatei. |
| Senior UX-Experte | Bestehende Projekte müssen zugänglich bleiben | Bisherige Öffnungs-/Speicherwege erhalten und geprüft. Konvertierung steht als Nächstes an. |
| UI-Expertin | Vorschau und Originalmedien getrennt halten | Eigene Vorschau pro Zeichenfläche im Profil geprüft. Studio-Anzeige folgt später. |
| QA-Entwicklerin | Unabhängige Lesbarkeit und eindeutige Version | UnZip und SQLite-CLI bestätigen Struktur und Inhalt. |
| Destruktiver Fehlersucher | Defekte oder uneindeutige Dateien früh abweisen | CRC, SHA, Schema, Referenzen und Versionen abgedeckt. Grössere Last- und Absturzfälle folgen später. |

Die Tabelle ist eine Expertenprüfung. N01.2 bildet die bisherigen Projektmodelle auf das Profil ab und prüft vollständige Übernahme und Rendervergleich. Der vorliegende Typ unterstützt als Entwicklungsbasis Text und PNG. Der SQLite-Browsernachweis für weitere Plattformen und die vollständige UI-Integration bleiben Folgeaufgaben.
