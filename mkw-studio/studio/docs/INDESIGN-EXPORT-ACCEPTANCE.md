# InDesign-Export: Anforderungen und Abnahmebasis

Stand: 9. November 2026. **Vorbereitung, kein IDML-Exporter.** Die folgenden Kriterien sind die technische Arbeitsgrundlage; eine Abnahme durch den Nutzer oder ein erfolgreiches Öffnen erzeugter IDML-Dateien wird damit nicht behauptet.

## Umfang und unveränderte Übergangsphase

IDML ist der geplante Austauschweg. Eine anschliessende INDD-Datei wird in InDesign gespeichert. MKW bleibt das verlustfreie Studio-Projektformat. PSD bleibt verfügbar, bis die unten genannten Freigabekriterien erfüllt sind. Der Export muss weiterhin vollständig lokal in der statischen GitHub-Pages-App arbeiten. Adobe-Cloud-APIs werden nicht als Laufzeitabhängigkeit eingeführt.

Das Ziel ist bearbeitbarer Inhalt, nicht lediglich eine platzierte Gesamtseiten-Grafik. Einschränkungen müssen vor dem Download verständlich benannt werden. Kein neues Dateiformat und kein neuer Speicherknopf werden mit diesem Meilenstein veröffentlicht.

## Referenzen und tatsächlich geprüfter Quellenstand

- Aktuelle offizielle Adobe-DOM-Referenzen: [Document](https://developer.adobe.com/indesign/uxp/dom/api/d/document/) und [ExportFormat](https://developer.adobe.com/indesign/uxp/dom/api/e/export-format/). `INDESIGN_MARKUP` ist dort als IDML-Exportformat dokumentiert. Die Seiten wurden am 9. November abgerufen. Sie ersetzen keine vollständige Paket-/Schema-Spezifikation.
- Die historische **IDML File Format Specification, CS6 / Version 8.0** wurde über die Adobe-Dokumentationsverweise identifiziert. Ihre bisherigen offiziellen Downloadadressen, unter anderem [Adobes bisherige PDF-Adresse](https://wwwimages.adobe.com/content/dam/acom/en/devnet/indesign/sdk/cs6/idml/idml-specification.pdf), antworteten beim direkten Abruf mit HTTP 404. Die vollständige PDF wurde daher heute **nicht** gelesen oder verifiziert. Ein Suchtreffer allein zählt nicht als Spezifikationsprüfung.
- In der installierten Adobe-InDesign-2026-Anwendung ist Adobes eigener Parser unter `Contents/Resources/UXP/com.adobe.indesign.creative-assistant/dc-idml/` vorhanden. Die gelesenen Module bestätigen die Trennung von Designmap, Ressourcen, Druckbögen und Stories. Diese lokalen Herstellerdateien werden weder kopiert noch Bestandteil des Studio-Exports.
- Vor dem Paket-Schreiber: eine verfügbare offizielle SDK-/Schema-Referenz beschaffen oder ein von InDesign selbst erzeugtes minimales Referenzpaket untersuchen; konkrete Versionskennung, Paketpfade und Referenzregeln dokumentieren. Heute wurden keine InDesign-Dokumente geöffnet oder verändert.

## Reproduzierbare Quellprojekte

Die Rezepte liegen in `tests/fixtures/indesign-projects.json`; `tests/indesign-source-fixtures.cjs` baut sie mit den echten Studio-Funktionen auf. Alle Bilder sind synthetische Testbilder. Keine Nutzerprojekte oder zusätzlichen Font-Binärdateien werden eingecheckt.

| Rezept | Prüfinhalt | Spätere InDesign-Abnahme |
| --- | --- | --- |
| `designer-typography` | Zwei Seiten, mehrere Absätze, Bereichsschrift/-farbe/Unterstreichung, Absatzgrösse/-ausrichtung, Rotation, Umlaute, `&`, `<…>` und Emoji | Texte bleiben editierbar und inhaltlich vollständig; Stilgrenzen und Rotation stimmen. |
| `fd-formats-crop` | Dasselbe Bild in 1080×1350 und 1080×1080, unabhängige Textgeometrie, Spiegelung und gedrehter Ausschnitt | Zwei korrekte Seiten; Ausschnitt, Spiegelung und Textpositionen entsprechen der jeweiligen Ausgabe. |
| `designer-free-effects` | Unterschiedliche freie Seitengrössen, Objekt mit negativem X-Wert (Anschnitt), Bildtransform, Verlauf mit Blur/Noise, ausgeblendeter Text | Seitenreihenfolge/-grössen stimmen; versteckter Inhalt bleibt erhalten; Effekte werden korrekt übertragen oder ausdrücklich als Raster behandelt. |

Die heutige Prüfung umfasst Modellvalidierung, vollständiges MKW-Schreiben/Lesen/Wiederherstellen und Vergleich aller Quelldaten. Die Reihenfolge von JSON-Feldnamen darf sich ändern; Feldwerte, Arrayreihenfolgen und Assetdaten dürfen es nicht. Das ist **kein** Nachweis für IDML-Paketgültigkeit, native Bearbeitbarkeit oder gleiche Umbrüche in InDesign.

## Verbindliche technische Prüfpunkte vor Freigabe

1. **Paket:** gültiger Container, wohlgeformtes XML, eindeutig auflösbare Objekt-/Dateireferenzen, konsistente IDs und dokumentierte Zielversion. Ungültige Eingaben dürfen keinen scheinbar erfolgreichen Download erzeugen. Die genaue Container-/Schemaausprägung wird am offiziellen Referenzpaket geprüft, bevor sie implementiert wird.
2. **Seiten/Druckbögen:** Seitenanzahl und Reihenfolge aus der tatsächlichen Dokumentstruktur; freie Seitengrössen, Objekte ausserhalb der Seitenkante, Ursprungsumrechnung, Druckbogenzuordnung und Beschnitt separat prüfen. Keine Annahme „alle Seiten entsprechen dem ersten Format“.
3. **Einheiten:** Arbeitsannahme entsprechend dem bestehenden PDF-Export: **1 Studio-Pixel = 0,75 Punkt**. Beispiele: 1080×1350 → 810×1012,5 pt; 800×1000 → 600×750 pt. Seitengrösse, Position, Schriftgrösse und explizites Leading müssen dieselbe Umrechnung verwenden. Native Mass-/Matrixkonventionen zunächst mit InDesign-Referenz vergleichen; geometrische Abweichung höchstens 0,01 pt.
4. **Text:** Quelltext inklusive Unicode und Absatzgrenzen bewahren; keine visuelle Grossschreibung oder Trennstriche in den Quelltext schreiben. XML-Zeichen maskieren. UTF-16-Bereichsgrenzen des Studios dürfen keine falschen Stilgrenzen für Emoji erzeugen. Absatz- und Zeichenformate sowie Schriftfamilie/-schnitt separat übertragen. Fehlende Schriften nicht still ersetzen. Physisches Öffnen und erneutes Bearbeiten sind Pflicht; unterschiedliche Textsatz-Engines können andere Umbrüche erzeugen.
5. **Bilder:** Originalpixel/Alpha und Referenzen erhalten; Position, Skalierung, Rotation, Spiegelung und Ausschnitt getrennt prüfen. Alle erforderlichen Bilder müssen mitgeliefert oder eindeutig auffindbar sein. Nicht auf temporäre Browser-Adressen verweisen.
6. **Effekte/Vektoren:** tatsächliche native Unterstützung je Eigenschaft prüfen. Unvermeidliche Rasteranteile begrenzen und sichtbar als solche deklarieren. Keine pauschale Zusage vollständig bearbeitbarer Verläufe, Blur-, Noise-, Masken- oder Mischmodus-Ergebnisse.
7. **Isolation:** Export/Abbruch/Fehler ändern weder Projekt, Auswahl, Undo/Redo, Assets noch bestehende Dateien. Gesperrte und unsichtbare Inhalte gemäss dokumentierter Exportauswahl behandeln; keine neuen Projekt- oder Setup-Präferenzen hineinschreiben.
8. **Abnahme in InDesign:** jedes Rezept ohne Reparaturfehler öffnen; Seiten, Texte, Fontzuweisung, Bilder und Grenzen kontrollieren; Text editieren, als INDD speichern, schliessen und erneut öffnen. Testversion und tatsächliches Ergebnis protokollieren. Erst dann die PSD-Ablösung in der Oberfläche erwägen.

## Nächster begrenzter Meilenstein

Referenz-/Schemafrage klären und ein minimales Paket für eine leere Seite entwickeln. Zuerst Paket- und Referenzprüfungen automatisieren, dann echtes Öffnen in InDesign nachweisen. Texte, Bilder und Effekte bleiben weitere getrennte Schritte. Dieser Dokumentstand enthält bewusst keinen Paket-Schreiber.
