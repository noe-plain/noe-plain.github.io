# .design · Technischer Vorversuch · 19. November 2026

N01.0 auf Editorstand `742102e8b3f9d349fdf123b02e6f28a72c2d3341`. Isolierter Versuch mit eigenen Daten und bestehendem Studio-Build. Fest versioniertes SQLite-WASM 3.54.1-build1. Die Messwerte und die reproduzierbaren Rezepte stehen in [DESIGN-FORMAT-PROBE-RESULTS-2026-11-19.json](DESIGN-FORMAT-PROBE-RESULTS-2026-11-19.json) und [tools/design-format-probe](../tools/design-format-probe/README.md).

## Gemessener MKW-Vergleich

Chrome 157 auf macOS ARM64, 50 unterschiedliche synthetische 384 × 480-PNGs, 50 Ausgaben à 600 × 750 px. Ein Messlauf je Pfad, Zeit gerundet. Die erste Vorschau misst einen tatsächlichen ersten Canvas-Paint nach Lesen und Validieren. Dialog, Browser-Autosave und vollständiger sichtbarer Arbeitsbereich wurden in dieser Zeitmessung nicht mitgemessen.

| Messung | MKW-Download (gzip-JSON) | Native MKW (MKWBLK1) |
| --- | ---: | ---: |
| Dateigrösse | 26.096.179 B | 26.075.887 B |
| Vollständiges Schreiben auf Anwendungsebene | 26.096.179 B als Download-Datei | 26.075.887 B an den Writer |
| Datei erzeugen bzw. erster Schreibvorgang | 1.018 ms (Kodierung) | 2.409 ms (Packen, Plan und OPFS-Schreiben) |
| Lesen, Hydrieren und Validieren | 220 ms | 917 ms |
| Bis zum ersten Artwork-Paint | 265 ms | 960 ms |
| Native Layoutänderung inkl. Plan und Schreiben | – | 67 ms / 8.225 B |
| Native unveränderte Datei | – | 0 B Schreibplan |

Alle 50 Bilddaten und Ausgaben kamen durch beide realen Leser unverändert zurück. Abgetasteter Höchstwert des Chrome-JavaScript-Heaps etwa 127 MiB (108 Stichproben). Die Messung erfasst weder den gesamten Prozessspeicher noch den physischen Dateisystemaufwand. Die reproduzierten Werte zeigen eine Benchmark-Basis für MKW und keine behauptete Beschleunigung durch .design. Echte grosse Fotos und weitere Betriebssysteme brauchen eigene Vergleichsmessungen.

## SQLite und ZIP

- Auf einer statisch ausgelieferten lokalen Seite ohne COOP/COEP schrieb ein dedizierter Worker mit `opfs-sahpool` eine Datenbank mit 20 Seiten und 500 Objekten. Ein neuer Worker öffnete sie wieder, änderte einen Titel und rollte eine Transaktion mit ungültigem Fremdschlüssel vollständig zurück. `integrity_check` und `foreign_key_check` bestanden. Initialisierung der WASM-Bibliothek in diesem Lauf etwa 40 ms, Aufbau/Export rund 80 ms. Die getestete DB blieb 57.344 B gross und hatte zwei geänderte 8-KiB-Seiten. Die ausgewählte WASM-Ausgabe enthält rund 1,54 MB unkomprimiertes Browser-JS und WASM für diese Probe. Für die spätere Integration erst bei Nutzung laden. [SQLite WASM und OPFS](https://sqlite.org/wasm/doc/tip/persistence.md).
- Der ZIP-Versuch schrieb 16.655 B in sieben Bereichen eines 7.139.700 B grossen Containers. Zwei Datenbankseiten, Manifest und lokale/zentrale Prüfsummenfelder wurden aktualisiert. Die 7.081.647 Bildbytes blieben unverändert. Standard-ZIP-Leser prüften alle Einträge, ein unabhängiger SQLite-Leser bestätigte den geänderten Text und die Integrität. [ZIP-Spezifikation](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT).
- Der bestehende Studio-Schreibhelfer übernahm denselben Plan über ein echtes Chrome-OPFS-Dateihandle. Beim absichtlich ausgelösten Abbruch nach den Writes und vor `close()` blieb der SHA-256-Wert der Originaldatei identisch. Nach erfolgreichem Abschluss entsprach die Datei bytegenau dem unabhängig geprüften ZIP. Das misst übergebene Änderungen und den beobachteten Browser-Abbruchweg. Kopieraufwand beim nativen Nutzer-Dateihandle, Absturz/Stromausfall, DB-Wachstum, Ersetzung/Löschung und ZIP64 sind gesonderte Abnahmen. [Browser-Dateioperationen](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access).
- **Reichweite:** Chrome/macOS bestanden. Der lokale Playwright-Firefox startete wegen fehlender `libmozglue.dylib` nicht. WebKit war beim Prüflauf nicht lauffähig installiert. Safari und Windows wurden nicht abgenommen. Der Firefox-CI-Erfolg des veröffentlichten MKW-Ablagefelds ist ein eigener Nachweis ohne SQLite.

Auf dieser Basis wird N01.1 mit einem versionierten, vollständig geprüften Basiscontainer und einem kleinen strukturierten SQLite-Schema umgesetzt. Der gezielte ZIP-Schreibpfad bleibt eine separate Stufe. Er kommt nur für nachweislich geeignete Einträge infrage. Bei geänderter Datenbankgrösse oder Eintragsstruktur ist ein kompakter Neuaufbau vorgesehen. Die Pilotentscheidung zugunsten des dedizierten SQLite-Workers ist für den nachgewiesenen Chrome-Weg getroffen. Die Plattformprüfung bleibt vor jeder produktiven Aktivierung verbindlich.

| Persona | Feedback / Problem | Stand |
| --- | --- | --- |
| Neue Nutzerin | Öffnungszeit beeinflusst den Einstieg | MKW-Basis bis zum ersten Paint gemessen |
| Erfahrener Designer | Textänderung soll Bilddaten erhalten | Gezielte ZIP-Aktualisierung mit bytegleichem Bild belegt |
| Senior UX-Experte | Abbruch muss beim gültigen Stand bleiben | Chrome-OPFS-Abbruch im Versuch geprüft |
| UI-Expertin | Vorschau-Latenz gehört zur späteren Gestaltung | Baseline vorhanden, neue Oberfläche offen |
| QA-Entwicklerin | Portable Datei und Datenbank unabhängig prüfen | ZIP, Hashes, Fremdschlüssel und SQLite-Inhalt geprüft |
| Destruktiver Fehlersucher | Fehlerhafte Transaktion und unterbrochenes Schreiben | Kontrollierte Fälle bestanden, echte Abstürze und weitere Plattformen offen |

Der Vorversuch ist ein technischer Nachweis. Das Studio öffnet und speichert weiterhin MKW. Der Pilotcode gehört zu den Entwicklungswerkzeugen und wird nicht vom Editor geladen.
