# Geplant: schrittweiser InDesign-Export

Auftrag vom 6. November 2026: Die PSD-Speichermöglichkeit soll künftig durch einen InDesign-Export ersetzt werden. Der Nutzer hat ausdrücklich klargestellt, dass dies derzeit geplant ist und schrittweise mit den bestehenden Wochen-Updates umgesetzt werden soll. Kein neuer Export ist mit diesem Plan implementiert.

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
- [ ] Fachliche Abnahme und repräsentative Quelldateien/Testfälle festgelegt.
- [ ] IDML-Export implementiert und tatsächlich in InDesign geprüft.

Quellen: [Adobe: unterstützte Dateiformate](https://helpx.adobe.com/au/indesign/desktop/get-started/system-and-product-info/supported-file-formats.html), [Adobe: IDML öffnen und als INDD speichern](https://helpx.adobe.com/indesign/desktop/troubleshoot/file-and-output-issues/cant-open-in-previous-versions.html), [Adobe: IDML-Exportformat](https://developer.adobe.com/indesign/uxp/dom/api/e/export-format/).
