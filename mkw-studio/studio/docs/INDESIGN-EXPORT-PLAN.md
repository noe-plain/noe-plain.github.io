# Geplant: schrittweiser InDesign-Export

## Aktuelle Priorität · 13. November 2026

Der Nutzer ordnet die bearbeitbare IDML-Weiterentwicklung ausdrücklich **Phase 3.1** zu. Zuerst Phase 1 (Bildkommentare fertigstellen, FD-Backup entfernen) und Phase 2 (Formvorschau, Winkel-Farbfüllung, Pipette, fünfteilige Farbhilfe) gemäss [verbindlichem Studio-Plan](DESIGNER-ROWS-PLAN.md) bearbeiten. Dies ersetzt ältere Aussagen, IDML sei unmittelbar der nächste Wochen-Schritt. Die technische Reihenfolge innerhalb dieses Exportplans bleibt erhalten: vorhandene echte Einseiten-Abnahme nutzen, mit genau einem bearbeitbaren Textrahmen und echtem InDesign-Test fortfahren. PSD und MKW bleiben gemäss den bestehenden Abnahmeregeln verfügbar.


Auftrag vom 6. November 2026: Die PSD-Speichermöglichkeit soll künftig durch einen InDesign-Export ersetzt werden. Der Nutzer hat ausdrücklich klargestellt, dass dies derzeit geplant ist und schrittweise mit den bestehenden Wochen-Updates umgesetzt werden soll. Seit 11. November besteht eine experimentelle, tatsächlich in InDesign geprüfte Einseiten-Basis; ein vollständiger Projekt-Export ist noch nicht verfügbar.

## Ziel

IDML als überprüfbares InDesign-Austauschformat vorbereiten; in InDesign lässt es sich anschliessend als native INDD-Datei speichern. Keinen nativen INDD-Browserexport ohne technische Grundlage versprechen. MKW bleibt das Format zum Weiterarbeiten im Studio. Der bestehende PSD-Weg bleibt verfügbar, bis seine Ablösung tatsächlich funktioniert und in InDesign geöffnet/geprüft wurde.

## Nächste Wochen-Schritte

1. Anforderungen und offizielle IDML-Spezifikation, Testprojekte und Abnahmekriterien festlegen.
2. Gültiges IDML-Paket mit Dokumentressourcen, Seiten und Druckbögen entwickeln.
3. Bearbeitbare Textfelder, Schriftzuweisung, Absatz- und Zeichenformatierung übertragen.
4. Bilder, Ausschnitte, Transformationen und Verknüpfungen übertragen.
5. Vektoren und Effekte auf echte InDesign-Unterstützung prüfen; erforderliche Rasterdarstellungen korrekt benennen.
6. Repräsentative Dateien tatsächlich in InDesign öffnen, Layout/Text/Bildgeometrie abnehmen und erst danach PSD in der Speicheroberfläche ablösen.

Je bestehendem Montag-/Donnerstag-Review einen überschaubaren nächsten Meilenstein umsetzen und prüfen. Kritische Fehler können Vorrang erhalten. Der Wochenbericht nennt den erreichten Stand, tatsächliche Nachweise, verbleibende Grenzen und den nächsten Schritt. Keine erneute Gesamtimplementierung bei jedem Lauf.

## Stand

- [x] Nutzerwunsch und schrittweise Umsetzung dokumentiert.
- [x] Bestehende Wochen-Automation um diese Arbeitsfolge ergänzt; Termine unverändert.
- [x] Technische Anforderungen, drei reproduzierbare Quellprojekt-Rezepte und Abnahmekriterien festgelegt (9. November 2026).
- [ ] Offizielle vollständige Paket-/Schema-Referenz verfügbar und am Referenzpaket geprüft.
- [ ] Fachliche Abnahme durch den Nutzer und echte InDesign-Dateiabnahme.
- [x] Eigener minimaler IDML-Paketschreiber: leere Einseiten-Datei tatsächlich in InDesign geöffnet und erneut exportiert (11. November).
- [ ] Vollständiger Projekt-IDML-Export mit bearbeitbaren Inhalten implementiert und repräsentativ in InDesign abgenommen.

Quellen: [Adobe: unterstützte Dateiformate](https://helpx.adobe.com/au/indesign/desktop/get-started/system-and-product-info/supported-file-formats.html), [Adobe: IDML öffnen und als INDD speichern](https://helpx.adobe.com/indesign/desktop/troubleshoot/file-and-output-issues/cant-open-in-previous-versions.html), [Adobe: IDML-Exportformat](https://developer.adobe.com/indesign/uxp/dom/api/e/export-format/).

## Fortschritt · 9. November 2026

Erster begrenzter Meilenstein: [Anforderungen und Abnahmebasis](INDESIGN-EXPORT-ACCEPTANCE.md), drei synthetische Projekt-Rezepte und eine Browserprüfung, die daraus echte Studio-Projekte erzeugt, validiert und über MKW speichert/liest/wiederherstellt. Es wurde kein IDML-Exporter und kein nativer INDD-Export implementiert; PSD und MKW bleiben verfügbar.

Die aktuelle offizielle Adobe-DOM-Referenz wurde geprüft. Die historische vollständige IDML-PDF ist identifiziert, ihre bisherigen offiziellen Downloadadressen liefern jedoch 404. Die installierten Adobe-Parsermodule wurden als ergänzende Herstellerreferenz gelesen; sie wurden nicht übernommen. Die Spezifikations-/Schemafrage bleibt ausdrücklich offen.

Nächster Schritt: offizielle Schema-/Referenzbasis klären, anschliessend ein minimales Einseiten-Paket erstellen und sowohl maschinell als auch durch tatsächliches Öffnen in InDesign prüfen. Ein vollständiger bearbeitbarer Export ist noch nicht verfügbar.


## Fortschritt · 11. November 2026 (Donnerstag-Meilenstein vorgezogen)

**Abgeschlossen:** eigener deterministischer, lokaler Paketschreiber `static/idml-package.js`, ohne Laufzeitabhängigkeit, Server oder Projektänderung. Acht Paketbestandteile, erste unkomprimierte `mimetype`-Datei, Container, Designmap, Ressourcen und genau eine leere Seite. Die neue Beispieldatei [idml-empty-page.idml](../examples/idml-empty-page.idml) wurde vom eigenen Schreiber erzeugt. Das eigene, neu in InDesign erzeugte Referenzpaket diente ausschliesslich zur Strukturklärung; persönliche InDesign-Vorgaben wurden nicht übernommen oder veröffentlicht. Die vollständige historische Schema-PDF bleibt nicht verfügbar; die Basis orientiert sich am tatsächlich erzeugten Referenzpaket (DOMVersion 21.5).

**Echter Öffnungstest:** Adobe InDesign 2026, Version **21.6.0.57**, lokal auf macOS. `node tests/verify-idml-indesign.mjs <neuer Testordner>` erzeugte zwei unabhängige eigene Dateien, öffnete sie jeweils in InDesign und exportierte sie dort erneut als IDML. Ausschliesslich eigene neue Testdokumente wurden geschlossen, ohne bestehende Nutzerdateien zu verändern.

| Eigene Datei | Ergebnis in InDesign | Seitengrösse (pt) | Seiten / Objekte | Fehler / Reparatur |
| --- | --- | --- | --- | --- |
| 800 × 1000 px | Geöffnet und nativ erneut exportiert | 600 × 750 | 1 / 0 | Keine gemeldete Fehler- oder Reparaturmeldung; synchroner Öffnungs-/Exportvorgang erfolgreich |
| 1080 × 1350 px | Geöffnet und nativ erneut exportiert | 810 × 1012,5 | 1 / 0 | Keine gemeldete Fehler- oder Reparaturmeldung; synchroner Öffnungs-/Exportvorgang erfolgreich |

Zeitpunkt und SHA-256-Werte: [IDML-VERIFICATION-2026-11-11.json](IDML-VERIFICATION-2026-11-11.json). Die Beispieldatei entspricht bytegenau der in InDesign geprüften 800×1000-Datei. Zusätzlich unabhängig mit Python-Standardbibliothek geprüft: ZIP/CRC, erste unkomprimierte MIME-Datei, XML, eindeutige IDs, Paketpfade/Referenzen, genau eine leere Seite und passende Dokument-/Seitengrösse. Modelltests prüfen Grenzen und defekte Eingaben; der Browser liefert dieselben Bytes ohne Änderung von Projekt, Revision, Undo oder Redo. ZIP-/XML-Prüfung und echter InDesign-Test werden ausdrücklich getrennt nachgewiesen.

**Grenzen:** nur leere Einseiten-Basis, kein Export der geöffneten Studio-Inhalte, keine öffentliche allgemeine Export-Schaltfläche, keine Texte/Bilder/Schriftverpackung/komplexen Effekte und kein nativer INDD-Browserexport. Nur die genannte installierte InDesign-Version ist tatsächlich geprüft. Die leere Datei ersetzt keine der drei repräsentativen Inhaltsabnahmen. **PSD bleibt vollständig verfügbar; MKW bleibt Studio-Projektformat.**

**Nächster begrenzter Schritt:** im normalen Wochenreview eine einzige einfache bearbeitbare Textgeschichte mit Textrahmen und Basisschrift übertragen, im eigenen Dokument automatisiert prüfen und tatsächlich in InDesign öffnen; die vorhandene Einseiten-Aufgabe nicht erneut beginnen. Bei kritischen Produktfehlern diese vorziehen. Kein Mehrseiten-/Bild-/Effektausbau im selben Schritt. Heute wurde dieser nächste Schritt nicht begonnen.

## Prioritätsänderung · 11. November, nach bestätigtem Reihenauftrag

Der Nutzer hat die noch fehlende Gleichheit jeder Reihe mit dem bisherigen Designer konkret in sechs Punkten bestätigt und zuerst für Donnerstag, dann als sofortigen Teilschritt mit Restplanung beauftragt. Der nächste IDML-Text-Meilenstein wird dafür auf einen späteren normalen Review verschoben. Am 12. November hat die dokumentierte Restliste in [DESIGNER-ROWS-PLAN.md](DESIGNER-ROWS-PLAN.md) Vorrang; keinen zusätzlichen IDML-Ausbau in dasselbe Guthabenfenster packen. Die tatsächlich geöffnete leere Einseiten-Basis bleibt erreicht, PSD und MKW bleiben verfügbar.


## Fortschritt · 12. November 2026

Heute bewusst kein zusätzlicher IDML-Inhaltsmeilenstein: der bestätigte zusammenhängende Reihen-/Exportauftrag hatte Vorrang. Die selbst erzeugte leere Einseiten-Datei und der dokumentierte echte InDesign-Öffnungstest vom 11. November bleiben unverändert. Die vorhandenen Paket-/Browserprüfungen laufen als Regression weiter; sie sind kein erneuter nativer Öffnungstest. PSD bleibt vollständig verfügbar und kann nun zusätzlich auf eine aktive Reihe begrenzt werden. MKW bleibt Projektformat und liegt vollständig in Bild-ZIP-Exporten bei.

Nächster begrenzter normaler Review: genau eine einfache bearbeitbare Textgeschichte mit Textrahmen und Basisschrift, eigenes neues Testdokument, Paketprüfung und tatsächliches Öffnen/Bearbeiten in InDesign dokumentieren. Kein erneutes leeres Einseiten-Paket, kein gleichzeitiger Mehrseiten-/Bild-/Effektausbau und kein nativer INDD-Browserexport.
