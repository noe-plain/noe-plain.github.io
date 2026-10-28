# Plan: PSD-Dateien für die Weiterbearbeitung in Photoshop

Stand: 27. Oktober 2026 · untersuchter Code: `9e1954c5d98f025e6175fa9a9cc1f0dc3809ac28`.
Status am 27.10.: reine Planung. Am 28.10. wurden die konservativen Verbesserungen umgesetzt, Browser- und echte Photoshop-Tests durchgeführt. Der ursprüngliche Plan bleibt als Ausgangsstand erhalten. Native Verläufe/Smartfilter bleiben vorbereitete, versteckte Alternativen; komplexe Darstellung und Winkel-Schein bleiben gerastert. Vollständig native Interoperabilität ist nicht abgenommen. Details und Prüfgrenzen: `RELEASE-2026-10-28.md`.

## Ziel und Leitentscheidung

Eine exportierte PSD soll sich wie ein ordentlich aufgebautes Photoshop-Projekt bearbeiten lassen: Text als zusammenhängende Textfelder, Bilder austauschbar, Beschnitte separat veränderbar, Ebenen eindeutig benannt. Das Anfangsbild soll der Studio-Gestaltung entsprechen. Die entscheidende Prüfung ist das Bearbeiten und erneute Speichern in Photoshop, nicht nur das Vorhandensein von Ebenen im Dateiformat.

Empfehlung: schrittweise Verbesserung des bestehenden Exporters. Keine neue Bedienoberfläche mit vielen technischen Exportoptionen. Vorhandene MKW-, Bild- und PDF-Exporte bleiben fachlich unabhängig. Die App läuft weiterhin vollständig im Browser auf GitHub Pages, ohne lokale Zusatzsoftware oder Server für den Export. Photoshop wird für die tatsächliche Weiterbearbeitung und die Abnahme benötigt.

## Tatsächlicher Ausgangsstand

| Bereich | Im untersuchten Code | Nachteil beim Weiterbearbeiten |
|---|---|---|
| FD-Hintergrundbilder | Bereits eingebettete Smartobjekte über `placedLayer` und `linkedFiles`, wiederverwendete Bildquellen, Transformation; bei Sponsorleisten zusätzlich Inhaltsmaske. | Gute Grundlage. Übernahme für weitere Bildarten und Masken-/Ersetzungsverhalten in Photoshop prüfen. |
| Designer-Bilder und Winkel | `carouselPSDLayer` rendert die Objekte als begrenzte Pixel-Canvas. FD-Winkel ebenfalls gerastert. | Inhalt, Bildausschnitt, Rahmen und Effekte sind teilweise zusammengebacken. |
| FD-Standardtext | Native Textebene, `shapeType: point`, Fontname und Formatierung. | Mehrzeilige Fliesstexte sollten bei Bedarf echte Absatztextfelder werden. |
| Designer-Text | Pro gemessenem Textlauf/Zeile eigene Textebenen; bei Effekten oder Blocksatz sichtbares Raster plus ausgeblendete Textläufe. | Ein Satz muss unter Umständen über viele Einzelteile bearbeitet werden. |
| Erweiterter FD-Text | Rasterdarstellung plus versteckte Gruppe einzelner editierbarer Textläufe. | Originales Textfeld ist nicht als eine zusammenhängende Einheit bearbeitbar. |
| Formen/Pfade | Native Füll-/Konturpfade bei einfachen, ungedrehten, deckenden Volltonformen. Komplexere Objekte: Raster plus deaktivierte Vektormaske. | Verläufe, transparente Farben und manche Transformationen sind trotz vorhandener Pfadgeometrie nicht als normale Form weiterbearbeitbar. |
| Sponsoren | Eine gerasterte Sponsorenleiste. | Einzelne Logos, Gruppennamen, Abstände und Balkenfarbe lassen sich nicht direkt ändern. |
| Effekte/Hintergründe | Viele Effekte, Glows und Hintergründe als Pixelinhalt; einige Mischmodi/Deckkräfte separat. | Stärke/Farbe nicht durchgängig als Photoshop-Parameter zugänglich. |
| Dokumentstruktur | FD mit Zeichenflächen; Designer mit zusammenhängender Montage und Slide-Slices; vorhandene Designer-Ordner werden exportiert. | Gute Basis. Es fehlen einheitliche Objektgruppen, Schutz-/Farbmarkierungen und eine klare Strategie für Rasterausnahmen. |
| Prüfung | Bestehende Browser-Roundtrips, Pixel-/Strukturtests und `tests/photoshop-verify.jsx`. | Das Photoshop-Skript öffnet/listet/rendert, unterdrückt aber Dialoge und prüft keine echten Bearbeitungsschritte. Das beweist noch keine praktische Editierbarkeit. |

Fundstellen: `static/psd.js`, `static/carousel-psd.js`, `static/carousel-psd-vectors.js`, `tests/photoshop-verify.jsx`, `ARCHITECTURE.md`.

## Umsetzungsreihenfolge

### 0 · Verlässliche Photoshop-Testbasis schaffen — P0, Voraussetzung

**Arbeit**

- Kleine Referenzprojekte für beide Editoren festlegen: Standardtext, gemischte Schriftgrössen, Hochstellung/Grossbuchstaben, Blocksatz, Familienkonzert, Bild mit Drehung/Spiegelung, Winkel, Sponsorleisten, Verläufe, Masken, FX, ausgeblendete/gesperrte Ebenen, mehrere Slides.
- Pro Referenz den aktuellen PNG-Export und die bisherige PSD sichern.
- Verwendete Photoshop-Version und verfügbare Schriften protokollieren.
- Einen Minimalexport mit Absatztext, maskiertem Smartobjekt, Verlaufsfüllung und Smartfilter erstellen und in Photoshop bearbeiten, speichern und erneut öffnen. Noch keine Umstellung aller Exporte.
- Installierte `ag-psd`-Version 28.4.1 gezielt prüfen. Die aktuelle Repository-Dokumentation hat teils andere Fähigkeiten als diese Version. Ein Upgrade nur mit nachgewiesenem Bedarf und Regressionstest.

**Abnahme**

Die Datei öffnet ohne Reparaturfehler. Fehlende Schriften und Text-Aktualisierungsdialoge werden erfasst, nicht unterdrückt. Nach tatsächlichem Neuberechnen durch Photoshop bleiben Darstellung, Masken und Koordinaten plausibel. Nicht abgenommene Features bleiben als solche markiert.

### 1 · Gemeinsames Exportmodell und Ebenenordnung — P1

**Arbeit**

- Einen Exportplan aus einem unveränderlichen Projektstand ableiten: logische Objekt-ID, Quelle, Maske, Transformation, Textformatierung, Effekte und Rasterausnahmen.
- Gemeinsame Hilfen für Bildquellen, Transformationen, Masken, Texte und Farbprofil; bestehende Renderer bleiben Quelle der Referenzdarstellung.
- Klare Namen wie „Übertitel“, „Konzerttitel“, „Bild – Konzertsaal“, „Winkel – Bildinhalt“, „Sponsorengruppe – Hauptpartnerin“ verwenden. Eigene Namen und Ordner erhalten.
- Pro komplexem Gestaltungselement eine nachvollziehbare Gruppe; nicht jede Silbe oder Linie zur obersten Ebene machen.
- Ebenenreihenfolge, Sichtbarkeit, Deckkraft, Mischmodi und unterstützte Sperren/Farbmarkierungen erhalten. Keine neue Sortierung nach Objekttyp, die das Design verändert.
- FD-Zeichenflächen und Designer-Slices behalten. Designer-Objekte über Slidegrenzen nicht duplizieren oder zerschneiden. Optional passende native Photoshop-Hilfslinien ergänzen.

**Abnahme**

Ein Objekt im Studio ist in Photoshop als eine logische Einheit auffindbar. Alle bisher sichtbaren/ausgeblendeten Inhalte bleiben korrekt angeordnet. Ein Export verändert weder das Projekt noch seine Undo-Historie.

### 2 · Bilder, Logos und Winkel als Smartobjekte mit Masken — P1

**Arbeit**

- Die bestehende FD-Smartobjekt-Lösung für Designer-Bildrahmen, Bildfüllungen und Winkel nutzbar machen.
- Originalen Projekt-Bildinhalt in voller gespeicherter Auflösung einbetten; nicht den bereits beschnittenen Bildschirm-Canvas als einzige Bildquelle verwenden.
- Rahmenform/Beschnitt als separate Maske exportieren. Bildtransformation und Rahmenposition getrennt abbilden; Maskenverknüpfung so wählen, dass der Bildinhalt im Rahmen verschoben werden kann.
- Beim Winkel Bild, Winkelmaske und Schein trennen. Eine Änderung der Maskenform darf die Bildquelle nicht zerstören oder ungewollt mitdrehen.
- Wiederverwendung bewusst behandeln: dieselbe logische Bildquelle über FD-Formate und zugehörigen Winkel hinweg darf gemeinsame Inhalte haben; separat importierte Bilder bleiben unabhängig. Keine stille Kopplung nur aufgrund identischer Pixelbytes.
- Standardmässig eingebettete, mit der PSD portable Inhalte; keine Abhängigkeit von lokalen Downloadpfaden.
- Logos ebenfalls austauschbar halten. Bei vorhandenen Rasterlogos keine nachträglich erfundene Vektorqualität versprechen.

**Abnahme**

In Photoshop kann man Bildinhalt öffnen/ersetzen und den Ausschnitt ändern. Der Rahmen bleibt stehen. Skalierung, Drehung, Spiegelung und slideübergreifende Objekte stimmen. Gemeinsame und unabhängige Quellen verhalten sich jeweils wie geplant.

### 3 · Zusammenhängende native Textfelder — P1, höchste typografische Wirkung

**Arbeit**

- Pro Studio-Textfeld möglichst genau eine native Photoshop-Textebene erzeugen. Kurze Einzeltitel können Punkttext bleiben; mehrzeilige/fliessende Texte werden Absatztext mit passendem Rahmen.
- Originalen Text mit expliziten Absatzumbrüchen exportieren. Automatische Studio-Zeilenumbrüche nicht pauschal zu harten Umbrüchen oder separaten Ebenen machen.
- Zeichen- und Absatzformatierung über `styleRuns` und `paragraphStyleRuns` übertragen: Familien/PostScript-Namen, Grössen, Farben, Laufweite, Zeilenhöhe, Ausrichtung und unterstützte Hochstellung/Unterstreichung etc.
- Nichtdestruktive Grossschreibung über geeignete native Textattribute prüfen; Quelltext soll nach Möglichkeit normal weiterbearbeitbar bleiben.
- Blocksatz-Werte weiterreichen: Wortabstand 80/100/120 %, Zeichenabstand −2/0/+2 %, Glyphenskalierung 98/100/102 %. Schweizer Sprach-/Silbentrennungseinstellungen prüfen und keine identischen Umbrüche verschiedener Text-Engines versprechen.
- Per-Zeile-Abstände, unten verankerte Rahmen, optische Textstarts und Rotationen gesondert gegen Photoshop prüfen.
- Familienkonzert: zusammenhängender Text mit farbigen Zeichenformaten und nativer Kontur soweit zuverlässig; Copyright bleibt schwarz/weiss.
- Die im Browser importierte Schrift ist dadurch nicht automatisch für Photoshop verfügbar. Benötigte Fontnamen verständlich ausgeben; keine automatische Verfügbarkeit oder Weitergabe lizenzierter Fonts versprechen.

**Abnahme**

„Konzerttitel ändern“ ist ein normaler Textbearbeitungsschritt. Längeren Text einfügen führt zu normalem Umbruch innerhalb des Textfelds. Absatz-/Zeichenformatierungen bleiben nach Bearbeiten, Speichern und Wiederöffnen erhalten. Keine Hunderte von Wortebenen als Standardlösung.

**Risikoregel**

Die Photoshop-Textengine kann anders umbrechen als der Browser. Für nicht zuverlässig übertragbare Fälle einen klar bezeichneten Ausnahmeweg anbieten, siehe Abschnitt „Darstellung und Bearbeitbarkeit“. Ein Text-Experiment darf nicht unbemerkt den gesamten Export verschlechtern.

### 4 · Sponsorenleiste in bearbeitbare Bestandteile zerlegen — P2

**Arbeit**

- Balken als native Farbfläche, Gruppennamen als Textebenen und jedes Logo als eigenes Smartobjekt mit vorhandener optischer Grösse/Position exportieren.
- Quer-/Hochformat und gedrehte Leiste über nachvollziehbare Gruppentransformation bzw. korrekt transformierte Einzelelemente abbilden.
- Multiply/Screen und Deckkräfte als native Eigenschaften; Graustufen-/Tonwertnormalisierung gezielt auf Photoshop-Einstellungsebenen abbilden, wo geprüft möglich.
- Wenn diese Tonwertverarbeitung nicht exakt nativ abbildbar ist, die vorbereitete Logoerscheinung einzeln erhalten und eine eindeutig bezeichnete Originalquelle verfügbar halten. Nicht wieder die ganze Leiste zu einem einzigen Bild zusammenfassen.

**Abnahme**

Logo ersetzen, Gruppennamen ändern und Balkenfarbe ändern funktionieren einzeln. Die Verteilung und optischen Gewichte entsprechen dem Export. Farbwechsel ändern die Geometrie nicht.

### 5 · Native Formen, Verläufe und Effekte erweitern — P2

**Arbeit**

- Vorhandene Bézierdaten auch bei gedrehten Formen als tatsächlich aktive Pfade/Möglichkeiten nutzbar machen. Welttransformation, Füllkoordinaten und Kontur gemeinsam prüfen.
- Lineare/radiale Verläufe möglichst als native Verlaufsfüllung mit Stops, Transparenz und Mittelpunkten übertragen; Bildfüllungen über Smartobjekt plus Pfadmaske.
- Hintergrund-Volltonflächen als native Füllebenen statt unnötiger Vollformat-Pixelbilder.
- Konturen, Deckkräfte und unterstützte Verläufe auf Konturen gezielt abbilden; keine stillen Verluste von Linienenden, Strichmustern oder transparenten Farben.
- Winkel-Schein als nativen Ebenenstil prüfen. Gausschen Blur und monochromes Rauschen als Smartfilter prüfen; die installierte Bibliothek hat entsprechende Typen, deren korrektes Photoshop-Verhalten aber erst getestet werden muss.
- Bei Bildern die bestehende Reihenfolge bewahren: Bild weichzeichnen, dann mit der scharfen Rahmenmaske beschneiden. Rauschen/Blur sollen weiter einzeln deaktivierbar sein.

**Abnahme**

Punkt verschieben, Verlaufsfarbe/Mittelpunkt ändern und Effektstärke ändern funktionieren mit normalen Photoshop-Werkzeugen. Parameteränderungen zerstören weder Quelle noch Maske. Unterschiede der Rauschalgorithmen/Blur-Ränder werden sichtbar geprüft statt als pixelgleich vorausgesetzt.

### 6 · Exportbedienung, Dateigrösse und Übergabe — P2

**Arbeit**

- Vor dem Generieren eine kurze, verständliche Auskunft: welche Inhalte normal editierbar sind, welche Rasterausnahmen bleiben und welche Schriften benötigt werden.
- Nur bei Bedarf eine Option „Referenzdarstellung beilegen“, ohne eine Vielzahl technischer Schalter.
- Bildquellen und berechnete Darstellungen pro logischer Quelle wiederverwenden; temporäre Puffer zeitnah freigeben und grosse Layer nacheinander aufbauen.
- Die normalen Bild-/Textbearbeitungen im Studio erhalten keinen zusätzlichen Rechenaufwand. PSD-Arbeit erfolgt erst beim ausdrücklichen Export.
- Die vorhandenen PSD-Limits und das sRGB-Profil behalten. Für grosse FD-Serien später gegebenenfalls „Eine PSD pro Bild mit seinen Formaten“ anbieten, statt eine unbenutzbare Riesendatei zu erzeugen. Aktuell kein PSB-Versprechen.
- Fortschritt, Browserunterschiede und Abbruchgrenzen korrekt beschreiben. Wiki: kurze Photoshop-Schritte für Text, Bild, Maske und Fonts.

**Abnahme**

Die vorhandenen zulässigen Projekte exportieren zuverlässig. Dateigrösse, Spitzenverbrauch und Exportzeit werden gegenüber den gesicherten Referenzen gemessen. Ein vorhandenes Limit wird vor teurer Generierung verständlich gemeldet. Keine unnötigen mehrfachen eingebetteten Kopien derselben logischen Quelle.

## Darstellung und Bearbeitbarkeit: keine versteckten Kompromisse

Empfohlene Regel: native, editierbare Elemente überall dort, wo Verhalten und Darstellung abgenommen sind. Die Entscheidung erfolgt pro Objektmerkmal, nicht pauschal für das ganze Projekt.

Wenn ein Spezialfall nicht zuverlässig nachgebildet werden kann, bleibt dessen korrekte Erscheinung klar als „Darstellung – gerastert“ bezeichnet; dazu möglichst ein zusammenhängendes „Text bearbeiten“ bzw. eine originale Bildquelle. Nicht gleichzeitig sichtbare Doppelungen erzeugen. Solche Ausnahmegruppen sollen sich einzeln verständlich austauschen lassen und vor dem Export benannt werden.

Eine ausgeblendete, geschützte Referenzdarstellung ist ein Vergleich, kein Ersatz für editierbare Ebenen. Keine Zusage „100 % vollständig editierbar“, solange Fonts, Textengine und Spezialeffekte dies nicht nachweislich erlauben.

## Verifikation und Freigabekriterien

1. Automatisch: PSD wieder lesen, Typen/IDs/Gruppen/Masken/Assets/Slices/Textläufe prüfen; keine Projektmutation, keine falsche Bildkopplung, keine verlorenen ausgeblendeten Inhalte.
2. Browser: Firefox und Chromium; kleine/grosse Dateien, fehlende Fonts, lange Texte, gemischte Formate, 1–20 Designer-Slides, transparente PNGs und gedrehte/gespiegelte Objekte.
3. Visuell: Browser-Referenz gegen neu berechnete Photoshop-Darstellung vergleichen. Das zwischengespeicherte PSD-Gesamtbild allein reicht nicht.
4. In Photoshop: Text ändern und zurückändern (erzwingt Neuberechnung), Absatzrahmen verkleinern, Bild ersetzen, Bild unter Maske verschieben, Pfadpunkt/Verlauf ändern, FX aus-/einschalten und danach speichern/wieder öffnen.
5. Warnungen/fehlende Schriften sichtbar protokollieren. `DialogModes.NO` des bisherigen Skripts darf nicht die einzige Öffnungsprüfung bleiben.
6. Jede Stufe erst als Standard freigeben, wenn diese Prüfung bestanden ist. Bei fehlendem Photoshop-Zugriff verbleibt die Abnahme ausdrücklich offen; ein Browser-Roundtrip ersetzt sie nicht.

## Priorisierung und Aufwand

| Stufe | Priorität | Aufwand / Unsicherheit | Status |
|---|---|---|---|
| 0 Referenzen und Photoshop-Minimalproben | P0 | Mittel; entscheidet Machbarkeit und Versionsbedarf | Geplant |
| 1 Exportmodell und Ebenenordnung | P1 | Mittel | Geplant |
| 2 Smartobjekte und Masken | P1 | Mittel bis hoch; Transformation/Quellenkopplung | Geplant |
| 3 Zusammenhängender Text | P1 | Hoch; Textengine, Blocksatz und Fonts | Geplant |
| 4 Einzelne Sponsorenbestandteile | P2 | Mittel; Tonwertbehandlung teilweise unsicher | Geplant |
| 5 Formen, Verläufe und Smartfilter | P2 | Hoch; Photoshop-spezifische Semantik | Geplant |
| 6 Bedienung, Skalierung und Wiki | P2 | Mittel; nach bewährten Exportfähigkeiten | Geplant |

Erstes sinnvoll nutzbares Zwischenziel: geordnete PSDs mit austauschbaren Designer-/Winkelbildern und gewöhnlichem zusammenhängendem Text. Aufwendige Spezialtypografie und native FX folgen auf dieser Grundlage.

## Quellen und technische Grenzen

- [Adobe: Smartobjekte und ihre Vorteile](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html): ursprünglichen Inhalt erhalten, flexible Masken, Filter und Transformationen. Eingebettete Inhalte sind für den portablen Standard vorgesehen.
- [Adobe: Smartobjektkopien](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/duplicate-an-embedded-smart-object.html): gemeinsam aktualisierte Instanzen und unabhängige Kopien unterscheiden; das ist eine bewusste Exportentscheidung.
- [Adobe: Textebenen, Punkt- und Absatztext](https://helpx.adobe.com/photoshop/desktop/text-typography/type-layers-creation/type-layers-in-photoshop.html): editierbare Texte und kontrollierter Textfluss.
- [Adobe: Fehlende Schriften](https://helpx.adobe.com/photoshop/desktop/text-typography/select-manage-fonts/replace-missing-fonts.html): Ersatz/Verfügbarkeit im Photoshop-System bleibt relevant.
- [ag-psd: offizielle Projektdokumentation und Grenzen](https://github.com/Agamnentzar/ag-psd#limitations): unvollständige Textunterstützung und keine eigene Neuberechnung von Photoshop-Layer-/Gesamtbildern. Der aktuelle Master ersetzt nicht die Prüfung der lokal installierten Version 28.4.1.
- Lokal verifizierte Typen in `node_modules/ag-psd/dist/psd.d.ts`: Absatz-/Zeichenläufe, Absatzboxen, Smartobjekte, Vektormasken/-füllungen, Farb-/Verlaufsdaten, Smartfiltertypen für Gaussian Blur und monochromes Add Noise, Schutz-/Farbmarkierungen und Hilfslinien. Vorhandene TypeScript-Felder sind eine technische Grundlage, keine bereits erfolgte Photoshop-Abnahme.

Es wurde für diesen Plan Code gelesen und offizielle Dokumentation recherchiert. Keine Photoshop-Bedienung oder erfolgreiche neue Exportfähigkeit wird behauptet.
