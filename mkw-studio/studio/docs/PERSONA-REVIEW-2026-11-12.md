# Wochenstart-Bericht · 12. November 2026

## Projektstand und Fokus

Statisches MKW Studio in `mkw-studio/studio`, auf Basis von `f17cac22f087ad7ed1f6d0ede3e0f65b76a99229`. Aktuellen origin/main vor Veröffentlichung abgeglichen; getrennte Arbeitskopie, keine fremden ungesicherten Änderungen übernommen. Der veröffentlichte Vorlauf enthielt Mehrreihen-Modell und Formatregel, aber noch dokumentweite Ebenen/Ordner und alte Druckbogen-Bedienwege. Die sechs zusammenhängenden Reihenanforderungen hatten heute Vorrang vor weiterem IDML-Ausbau. Der GitHub-Check ergab keine offenen Issues (Pull Requests ausgenommen); offene Funktionen wurden deshalb aus den verbindlichen Projektplänen übernommen.

## Änderungen am Code

1. **Jede Reihe als Bearbeitungsbereich:** `row-scope-model.js` zentralisiert Ebenen-/Ordnerzuordnung und explizite Altordner-Trennung. `carousel*.js` zeigt nur aktive Inhalte und begrenzt Ordner-/Reihenfolgeaktionen. `spread-layout-model.js` und `spread-layout-ui.js` implementieren normale Slide-Aktionen, bestätigtes Entfernen statt Abtrennen, gruppenweiten Hintergrund und einfachere Reihensteuerung. Einrichtung, Seitenübersicht und Formatfelder erklären denselben Wirkungsbereich.
2. **Verständlicher Export mit bearbeitbarem Original:** `export.js`/`export-panel.js` synchronisieren Reihen-/Slide-Auswahl bis in die Vorschau, benennen Ausgaben eindeutig und packen über den vorhandenen Projektschreiber die vollständige MKW-Datei ins Bild-ZIP. `psd.js`/`carousel-psd.js` unterstützen aktive Reihe oder ganzes Projekt ohne globale Dokumenttausch-Tricks.

Quellen sind direkt überarbeitet; gebündelte Dateien wurden aus dem Manifest erzeugt. Die neuen reinen Modellgrenzen verhindern parallele Sonderlogik pro Schaltfläche. Bestehende Texteinstellungen, Assetgraph, MKW-Identität und globalen Grenzen bleiben erhalten. Kein vollständiges Neuschreiben des Editors.

### Letztes Tuning nach Nutzerrückmeldung

Die aktive Reihe wird platzsparend direkt über die klickbare Ebenenüberschrift gewählt: **„Ebenen – 1“, „Ebenen – 2“ …**. Der Klick öffnet das vorhandene Material-Menü mit Nummer und vollständigem Reihennamen. Die separate Auswahlzeile entfällt; nur ein notwendiger Altordner-Hinweis kann zusätzlich erscheinen. Tastatur (Pfeile/Enter/Escape), Fokus-Rückgabe, Auswahlmarkierung, unveränderte Revision/Undo und die Tablet-Ansicht wurden geprüft. Die normale Ebenen-Navigation bleibt erhalten.

Die Exportvorschau nennt jetzt ebenfalls Reihe/Slide und den Auswahlstatus; eine leere Auswahl blendet das alte Bild aus und sperrt den Export. Alle Auswahlwege nutzen denselben Besitzer, veraltete asynchrone Ergebnisse dürfen auch den Transparenzhintergrund nicht mehr überschreiben. Leere Auswahl, Wiederwahl und bestehende PDF-/Export-Panels zusätzlich in Chrome und Firefox geprüft.

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

Veröffentlichungsnachweise: [vollständige GitHub-Prüfungen](https://github.com/noe-plain/noe-plain.github.io/actions/workflows/mkw-studio.yml) und [Live-Studio](https://noe-plain.github.io/mkw-studio/studio/). Der Ausführungsbericht nennt den konkreten Quellcommit und das tatsächliche Endergebnis; beim nächsten Review diesen aktuellen Stand direkt abgleichen. Die vier neuen Fälle wurden bereits auf der Live-Seite des ersten Änderungscommits 15b4540 bestanden, HTML/JS/CSS und IDML-Beispiel waren bytegleich. Die anschliessende kompakte Reihenwahl und Vorschaukorrektur wurden zusätzlich in beiden Browsern geprüft und werden mit dem abschliessenden Quellcommit erneut veröffentlicht/geprüft.

### Korrektur der vollständigen CI-Abnahme

Der erste GitHub-Lauf `43182083492` bestand vollständig in Chrome, scheiterte in Firefox beim alten `large-project-frames`-Fall an der realen Drehgeste (Winkel blieb unter der bestehenden Mindeständerung). Die identische vollständige Prüfung bestand lokal in Firefox einschliesslich 50-Bilder-Import und MKW-Rundlauf. Commit `55cb80b9f16b5e436a9c3361a5d53fe9d0d3f96e` ergänzt für den Gestenstart abgeschlossene Projekteinrichtung/Schriftladung, stabile sichtbare Griffgeometrie und den tatsächlichen Pointer-Empfänger. Die unveränderte Prüfung einer echten Winkeländerung bleibt bestehen; kein Ersetzen durch direkten Modellaufruf oder Entfernen der Assertion. Die so ergänzte Prüfung bestand lokal in Firefox vollständig und in Chrome gezielt ohne Wiederholung des unveränderten 50-Bilder-Imports. Massgeblich bleibt der nachfolgende vollständige GitHub-Endlauf; den ersten Fehlerlauf nicht als erfolgreichen Abschluss anführen.

## IDML und nächste Aufgaben

Heute kein neuer IDML-Meilenstein. Die leere Einseiten-Basis vom 11. November wurde damals tatsächlich in InDesign 2026 21.6.0.57 geöffnet und erneut exportiert. Nächster Schritt bleibt genau ein einfacher bearbeitbarer Textrahmen mit echtem InDesign-Test. **PSD bleibt verfügbar, MKW bleibt Projektformat.**

Weitere Werkzeuge bleiben geplant: echte Formvorschau beim Ziehen, Winkel mit Farbfüllung, Arbeitsbereich-Pipette, Fünf-Farben-Hilfe. Neue Vorlagen erst zeigen und nach ausdrücklicher Zustimmung mitliefern. Neu aufgenommen: Studio-Dateien und Auslieferungsgrösse mit vorherigem Abhängigkeitsinventar reduzieren, alles für Bearbeitung/Altdateien Nötige erhalten. Heute keine ungeprüfte Löschung. Ebenfalls neu geplant: einheitliche, platzsparende und anfängertaugliche Werkzeugleiste ohne Advanced Mode; alle Funktionen von Anfang an erreichbar, Computer als Hauptgerät und Tablets als sekundäre Nutzung. Der Mode-Schalter ist heute noch vorhanden.

Details und verbleibende Kompatibilitätsgrenzen: [Reihenplan](DESIGNER-ROWS-PLAN.md), [InDesign-Plan](INDESIGN-EXPORT-PLAN.md).
