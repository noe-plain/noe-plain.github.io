# Wochenstart-Bericht · 12. November 2026

## Projektstand und Fokus

Statisches MKW Studio in `mkw-studio/studio`, auf Basis von `f17cac22f087ad7ed1f6d0ede3e0f65b76a99229`. Aktuellen origin/main vor Veröffentlichung abgeglichen; getrennte Arbeitskopie, keine fremden ungesicherten Änderungen übernommen. Der veröffentlichte Vorlauf enthielt Mehrreihen-Modell und Formatregel, aber noch dokumentweite Ebenen/Ordner und alte Druckbogen-Bedienwege. Die sechs zusammenhängenden Reihenanforderungen hatten heute Vorrang vor weiterem IDML-Ausbau. Der GitHub-Check ergab keine offenen Issues (Pull Requests ausgenommen); offene Funktionen wurden deshalb aus den verbindlichen Projektplänen übernommen.

## Änderungen am Code

1. **Jede Reihe als Bearbeitungsbereich:** `row-scope-model.js` zentralisiert Ebenen-/Ordnerzuordnung und explizite Altordner-Trennung. `carousel*.js` zeigt nur aktive Inhalte und begrenzt Ordner-/Reihenfolgeaktionen. `spread-layout-model.js` und `spread-layout-ui.js` implementieren normale Slide-Aktionen, bestätigtes Entfernen statt Abtrennen, gruppenweiten Hintergrund und einfachere Reihensteuerung. Einrichtung, Seitenübersicht und Formatfelder erklären denselben Wirkungsbereich.
2. **Verständlicher Export mit bearbeitbarem Original:** `export.js`/`export-panel.js` synchronisieren Reihen-/Slide-Auswahl bis in die Vorschau, benennen Ausgaben eindeutig und packen über den vorhandenen Projektschreiber die vollständige MKW-Datei ins Bild-ZIP. `psd.js`/`carousel-psd.js` unterstützen aktive Reihe oder ganzes Projekt ohne globale Dokumenttausch-Tricks.

Quellen sind direkt überarbeitet; gebündelte Dateien wurden aus dem Manifest erzeugt. Die neuen reinen Modellgrenzen verhindern parallele Sonderlogik pro Schaltfläche. Bestehende Texteinstellungen, Assetgraph, MKW-Identität und globalen Grenzen bleiben erhalten. Kein vollständiges Neuschreiben des Editors.

## Strukturierte Persona-Prüfung

| Persona | Identifiziertes Feedback / Problem | Status |
| :--- | :--- | :--- |
| Neue Nutzerin | Aktive Reihe, neue Reihe und Slide-Aktionen waren schwer zu unterscheiden. Klare Reihenauswahl und Hauptaktionen, erste Reihe in der Einrichtung erklärt. | Gelöst im normalen Reihenablauf; alte Sonderfunktionen bleiben ausdrücklich erweitert. |
| Erfahrener Designer | Reihenlokales Einfügen/Duplizieren/Verschieben und Löschen mit Undo erwartet; übergreifende Gestaltung soll zusammenhängend bleiben. | Gelöst und geprüft; nur vollständig in einer Slide enthaltene Inhalte werden einzeln dupliziert, wie bisher. |
| Senior UX-Experte | Versteckte Wirkungsbereiche, Abtrennen beim Verkleinern und getrennte Exportauswahl erzeugten Überraschungen. | Gelöst: lokale Aktionen, bestätigtes Entfernen, ein synchroner Auswahlzustand bis in die Vorschau. |
| UI-Expertin | Zu viele gleichwertige Druckbogenaktionen; fehlende Ausrichtung von Einrichtung, Ebenen und Export. | Gelöst für den Reihenablauf mit vorhandenen Komponenten; Desktop und iPad-Mini-Ansicht geprüft. Neue Vorlagen bleiben spätere Entwürfe mit Nutzerfreigabe. |
| QA-Entwicklerin | Gemeinsame Ordner, Dateirundlauf und Exportabhängigkeiten brauchten explizite Prüfpunkte. | Gelöst durch reine Modelle und echte Browser-/Downloadprüfungen; keine neue native Photoshop-Abnahme behauptet. |
| Destruktiver Fehlersucher | 21. Slide, gemischte Auswahlen, Altordner, Abbruch und Vorschauwechsel dürfen keine versteckten Änderungen erzeugen. | Geprüfte Ablehnungen/Abbrüche bleiben atomar; gemischte Altformate verlangen bewusste Reparatur und werden nicht automatisch verändert. |

Diese Matrix ist eine Expertenprüfung anhand der sechs Perspektiven, keine behauptete Nutzerstudie. Smartphones und spezielle Nutzung bei starker Sehbehinderung gehörten nicht zur Abnahme.

## Tatsächliche Prüfung

183 Modell-/Pakettests bestanden. Neue Browserfälle `row-folders`, `row-workflow`, `row-export` und `row-psd` bestehen in Chrome und Firefox. Vollständige lokale Regressionen wurden ausgeführt; nach Korrektur alter UI-Erwartungen und der sichtbaren Drag-Voraussetzung bestanden die betroffenen Fälle erneut in beiden Browsern. Bestehende Artboard-/Format-/Datei-/PDF-/PSD-/Textprüfungen wiederverwendet. `format:check`, Build und Diff-Prüfung gehören zum Abschluss.

ZIP wirklich heruntergeladen, unabhängig entpackt/CRC-geprüft und vollständige enthaltene MKW mit vorhandenem Leser validiert: auch nicht exportierte andere Reihe, Text und Bild erhalten. PSD wirklich aus Speicherdialog heruntergeladen und auf Abmessungen, Slices, Pixel und bearbeitbare Textdaten geprüft. Desktop und 768×1024-Ansicht visuell geprüft, relevante Seitenleiste zusätzlich mit axe geprüft. Kein realer Touch-Hardwaretest und kein neuer nativer Photoshop-/InDesign-Test behauptet.

Veröffentlichung und vollständige GitHub-/Live-Prüfung: noch im Abschluss; diesen Absatz erst nach tatsächlichem Ergebnis ergänzen.

## IDML und nächste Aufgaben

Heute kein neuer IDML-Meilenstein. Die leere Einseiten-Basis vom 11. November wurde damals tatsächlich in InDesign 2026 21.6.0.57 geöffnet und erneut exportiert. Nächster Schritt bleibt genau ein einfacher bearbeitbarer Textrahmen mit echtem InDesign-Test. **PSD bleibt verfügbar, MKW bleibt Projektformat.**

Weitere Werkzeuge bleiben geplant: echte Formvorschau beim Ziehen, Winkel mit Farbfüllung, Arbeitsbereich-Pipette, Fünf-Farben-Hilfe. Neue Vorlagen erst zeigen und nach ausdrücklicher Zustimmung mitliefern. Neu aufgenommen: Studio-Dateien und Auslieferungsgrösse mit vorherigem Abhängigkeitsinventar reduzieren, alles für Bearbeitung/Altdateien Nötige erhalten. Heute keine ungeprüfte Löschung.

Details und verbleibende Kompatibilitätsgrenzen: [Reihenplan](DESIGNER-ROWS-PLAN.md), [InDesign-Plan](INDESIGN-EXPORT-PLAN.md).
