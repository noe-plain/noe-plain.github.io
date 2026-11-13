# Wochenstart-Bericht · 11. November 2026

## 1. Aktueller Projektstand

Der Donnerstag-Plan wurde auf ausdrücklichen Wunsch heute vorgezogen. Aktives Projekt: `mkw-studio/studio`, Ausgangspunkt `2ca248e`. Die öffentliche GitHub-API meldete keine offenen Issues, die Live-Seite HTTP 200. Das Browsing-Werkzeug konnte die Seiten nicht abrufen; direkte HTTPS-Abfragen und echte Browserabläufe wurden stattdessen verwendet. Andere lokale Portfolio-/Projektänderungen wurden durch eine isolierte Arbeitskopie bewahrt und nicht veröffentlicht.

Das vorhandene Gruppenmodell unterstützt bereits 1–20 Seiten je Gruppe und maximal 200 je Dokument. Die Lücke lag in der Bedienung und Inhaltsbehandlung: Artboard-Auswahl zeigte das Format einer einzelnen Seite, Formatwechsel konnten zusammenhängende Ebenen zerschneiden und Duplizieren kopierte seitenweise. Neue überhängende Objekte hatten keine eindeutige Begrenzung gegenüber anderen Reihen. Der InDesign-Plan hatte bisher Anforderungen und Testrezepte, aber keinen eigenen tatsächlich geöffneten Paketschreiber.

Die sechs Perspektiven wurden technisch auf Desktop und Tablet ab iPad-Mini-Grösse geprüft; keine Studie mit sechs realen Testpersonen. Smartphone-Optimierung und spezielle Abnahme für starke Sehbehinderung gehörten nicht zum Umfang.

## 2. Die zwei Kernprobleme und Codeänderungen

### Artboard-Parität mit dem bisherigen Designer

Ein Artboard enthält 1–20 Slides nebeneinander; mehrere solcher Reihen stehen untereinander. Die vorhandene Dokumentstruktur wird weiterverwendet. Auswahl der Artboard-Überschrift zeigt nun Format/Schutzzonen für die ganze Reihe und einen direkten Weg zur Slide-Anzahl. Einzelne Seiten bleiben weiterhin auswählbar und bearbeitbar. Andere Reihen behalten ihr Format und verschieben sich nur bei einer entstehenden Kollision.

Geändert: `carousel-slide-format.js`, `designer-artboards.js`, `spread-layout-ui.js` und `spread-layout-model.js`. Die Modellaktion `format-artboard` prüft vollständig vor der Übernahme. Ganze Artboards werden mit zusammenhängenden Ebenen statt seitenweisen Duplikaten kopiert, einschliesslich lokaler Bild-/Ordnerbezüge. Bestehende Designer-Objekte werden beim Aktivieren nicht verändert.

`carousel-policy.js` löst eine gemeinsame Artboard-Begrenzung auf. Neue bzw. bewusst positionierte Objekte erhalten `artboardScoped` und eine geprüfte Seitenzuordnung. Darstellung, Trefferprüfung, Vorschau, PDF-Text und PSD beachten dieselbe Reihe. Über benachbarte Slides hinweg bleiben Inhalte zusammenhängend; Überläufe in andere Reihen werden abgeschnitten. Nicht nativ begrenzbare PSD-Inhalte tragen ausdrücklich „Artboard-Ausschnitt“, übrige Ebenen behalten ihre bisherige Bearbeitbarkeit.

```js
const contentFrame = MKWCarouselPolicy.contentFrame(c, object);
// pageFragment: einzelne Seite; artboardScoped: gesamte zugehörige Reihe.
```

Beim finalen Persona-Durchgang fiel die mit 20 Slides horizontal scrollbare Übersicht auf: Sie war mit der Tastatur nicht direkt fokussierbar. `pages-panel.js` erhält dafür einen nativen Fokuspunkt; die abschliessende axe-Prüfung besteht. Zusätzlich wurden Positionsänderungen per Zahlenfeld und Pfeiltaste an dieselbe Eigentümerzuordnung angebunden. Ein zusätzlicher exakter Pixelvergleich deckte verändertes Effektrauschen beim ganzen Artboard-Duplikat auf. Die Kopie übernimmt nun den bestehenden Effekt-Startwert; der zunächst scheiternde Pixelvergleich besteht anschliessend.

### Minimale eigene IDML-Datei, wirklich in InDesign geöffnet

Neu: `static/idml-package.js`, eine unabhängige ZIP/XML-Basis mit genau einer leeren Seite, ohne neue allgemeine Export-Schaltfläche. Beispiel und tatsächlich getesteter Code:

```js
const bytes = MKWIDML.emptyPage({
  w: 800,
  h: 1000,
  name: "MKW IDML Test",
});
```

Die selbst erzeugten 800×1000- und 1080×1350-Dateien wurden in **Adobe InDesign 2026, Version 21.6.0.57**, geöffnet und dort erneut exportiert: jeweils eine Seite, 600×750 bzw. 810×1012,5 pt, keine Seitenobjekte, keine gemeldeten Fehler-/Reparaturmeldungen. Eine ausschliesslich eigene native Referenz half beim Aufbau. Die veröffentlichte [Beispieldatei](../examples/idml-empty-page.idml) entspricht bytegenau der nativ geprüften Datei; [Prüfprotokoll mit SHA-256](IDML-VERIFICATION-2026-11-11.json).

Dies ist eine leere Exportbasis, **kein Export der Studio-Inhalte**. Texte/Bilder/Mehrseiten/Effekte und andere InDesign-Versionen sind noch nicht abgenommen. PSD bleibt verfügbar, MKW bleibt das Studio-Projektformat. Dauerhafter Stand und nächster begrenzter Text-Meilenstein: [INDESIGN-EXPORT-PLAN.md](INDESIGN-EXPORT-PLAN.md).

## 3. Strukturierte Persona-Prüfmatrix

| Persona | Identifiziertes Feedback / Problem | Status |
| :--- | :--- | :--- |
| Neue Nutzerin | Artboard-Format und einzelne Slides waren schwer zu unterscheiden. Gemeinsames Formatpanel und direkter 1–20-Zugang erklären den Wirkungsbereich. | Gelöst in den geprüften Abläufen. |
| Erfahrener Designer | Panoramen dürfen beim Formatwechsel/Duplizieren nicht in einzelne Ebenen zerfallen. Undo/Redo und bisherige Exporte müssen erhalten bleiben. | Gelöst; zusammenhängende Ebenen und echte Undo-/Redo-Aktionen geprüft. Vollständiger IDML-Inhaltsexport offen für nächste Woche. |
| Senior UX-Experte | Änderungen einer Reihe dürfen andere Reihen nicht unbeabsichtigt formatieren oder übermalen. | Gelöst; getrennte Formate, gemeinsamer Begrenzungsweg und Kollisionstransport geprüft. |
| UI-Expertin | Wirkungsbereich und Beschriftungen konsistent halten; breite Slide-Reihen müssen bedienbar bleiben. | Gelöst; bestehende Material-Felder/Buttons, Desktop-/Tablet-Sichtung und fokussierbare Übersicht. |
| QA-Entwicklerin | Alte Dateien und MKW-Rundlauf erhalten; ZIP/XML-Prüfung nicht mit InDesign-Kompatibilität verwechseln. | Gelöst für die Testfälle; unabhängige Paketprüfung plus tatsächlicher nativer Öffnungs-/Exporttest. |
| Fehlersucher | 21. Slide, ungültige Formate, XML-Sonderzeichen und Überläufe dürfen keine Daten oder Redo zerstören. | Gelöst für die Testfälle; 24 Slides über drei Reihen, atomare Abweisung der 21. Slide je Reihe, Fehler-/Unicode- und Exportprüfungen. |

## 4. Prüfung, Budget und Fortsetzung

170 Modell-/Pakettests bestanden. Neue Browserfälle prüfen alte Designer-Pixel vor/nach Aktivierung, Reihen mit 1/3/20 Slides, insgesamt mehr als 20 Slides, Überlauf in PNG/PDF/PSD/Treffertests, ganzes Artboard duplizieren, Undo/Redo, unveränderten Verlauf bei abgewiesener 21. Slide, MKW-Rundlauf und unverändertes Projekt beim IDML-Schreiben. Formatierung und reproduzierbarer Build bestanden. 14 gezielte Chrome- und neun Firefox-Suiten bestanden, darunter vorhandene Seiten-/Gruppen-, MKW-/Vorlagen-, grosse Bild-, PDF-/PSD- und Textauswahlprüfungen. Die Paketprüfung weist auch XML-unzulässige Nichtzeichen zurück. GitHub-/Live-Abschluss wird im abschliessenden Bericht genannt.

Das tatsächliche Fünf-Stunden- und Wochenkontingent wurde zu Beginn und nach Arbeitsschritten geprüft. Startverbrauch: 2 % / 0 %. Keine Zusatzcredits, API-Abrechnung, Reset-Gutscheine, Zusatzagenten oder Modellwechsel. Verbleibendes Guthaben ist kontoweit geteilt; aus Plus wird keine feste Tokenmenge abgeleitet. Kein weiteres Feature wird heute begonnen.

Morgen folgt wieder der normale Montag-/Donnerstag-Review ab diesem dokumentierten Stand. Die abgeschlossene leere Einseiten-Basis wird nicht erneut begonnen; eine nächste begrenzte Inhaltsstufe bleibt dem nächsten Review vorbehalten.

## Nachtrag: bestätigtes Reihenverhalten und sofortiger Teilschritt

Der Nutzer präzisierte anschliessend: Jede Reihe soll sich durchgehend wie ein bisheriges Designer-Projekt mit normalen Slides verhalten. Die bisherige Veröffentlichung erfüllt das noch nicht vollständig. Nach zunächst beauftragter Umsetzung aller sechs Punkte am Donnerstag wurde die sofortige Umsetzung eines sauberen Teils mit Planung des Rests beauftragt.

Zusätzlich umgesetzt: dauerhafter, rein vorübergehender Reihenbezug für neue Objekte/Bildimporte und Strg/⌘A; aktive Reihe nach Objekt- und leerer Slide-Auswahl; Einfügen in eine andere Reihe relativ zu deren Ursprung statt um 30 px am ursprünglichen Ort. Einzelne kopierte Ebenen erhalten die Zielzuordnung und unabhängige geerbte Sichtbarkeit/Sperren; ein Quellordner wird dabei noch nicht als Zielordner kopiert. Explizites Duplizieren einer gemischten Auswahl behält die ursprünglichen Reihen bei; das Übertragen einer gemischten Auswahl in eine andere Reihe wird ohne Änderung am Verlauf abgewiesen.

Die Ebenen-/Ordneroberfläche ist weiterhin dokumentweit. Die übrigen fünf Punkte sind offen. Die vollständige, priorisierte Restliste und Abnahme stehen in [DESIGNER-ROWS-PLAN.md](DESIGNER-ROWS-PLAN.md); der bestehende Donnerstag-Termin wurde auf diesen Restauftrag ausgerichtet und der nächste IDML-Text-Meilenstein dafür verschoben. Kein vollständiges Designer-Gleichverhalten behaupten.

| Persona | Nachtragsprüfung | Status |
| --- | --- | --- |
| Neue Nutzerin | Weitere neue Elemente bleiben nach der ersten Auswahl in derselben Reihe. | Funktional gelöst; sichtbare Reihenführung/Ebenenliste noch offen. |
| Erfahrener Designer | Strg/⌘A bleibt in der aktiven Reihe; echtes Kopieren/Einfügen erreicht die Zielreihe; Undo/Redo bleiben korrekt. | In Chrome/Firefox geprüft; restliche gewohnte Slide-Aktionen offen. |
| Senior UX-Experte | Fokuswechsel darf nicht verdeckt andere Reihen ändern. | Kernablauf geprüft; Ordner-/Ebenenaktionen weiterhin Teil der Restliste. |
| UI-Expertin | Reihenbezug in der Oberfläche verständlich und konsistent sichtbar machen. | Offen für Donnerstag; keine umfassende UI-Überarbeitung in diesem Teilschritt. |
| QA-Entwicklerin | Temporärer Reihen-/Clipboard-Zustand darf nicht in MKW-Dateien gelangen. | MKW-Rundlauf, unverändertes Dokument bei Reihenauflösung und bestehende Kopier-/Seitenprüfungen bestanden. |
| Fehlersucher | Gemischte Auswahl, verdeckte/gesperrte Quellordner und abgewiesenes Einfügen dürfen keine Daten oder Redo verlieren. | Geerbte Zustände und atomare Abweisung in beiden Browsern geprüft. |


## Zweiter Nachtrag: ein Format je Artboard und weitere Planung

Auf erneuten Fortsetzungsauftrag wurde die verbindliche Formatregel technisch ergänzt: Breite/Höhe ändern sich auch aus den bisherigen Einzel-Slide-Feldern für die ganze Gruppe. Neu erzeugter Formatmix durch Zusammenfügen, Übertragen oder automatische Neuverteilung wird atomar abgewiesen. Die gemeinsame Regel liegt im bestehenden reinen Modell; der parallele Einzel-Formatzweig wurde entfernt. Andere Reihen behalten ihre Formate. Alte gemischte Dateien werden unverändert geöffnet und mit einem Hinweis zur bewussten Vereinheitlichung versehen, statt Inhalte beim Öffnen zu verformen. Das ist ausdrücklich eine Kompatibilitätsbehandlung, keine Behauptung bereits reparierter Altbestände.

173 Modell-/Pakettests bestehen. Der neue Browserfall prüft die tatsächlichen bisherigen Seitenfelder, ganze Reihe statt einzelne Slide, unverändertes Nachbarformat, zusammenhängende Ebene, Undo/Redo, abgewiesenen Formatmix ohne Verlaufsschaden, MKW-Rundlauf und axe. Vorhandene Reihen-/Datei-/Seitenregressionen werden in Chrome/Firefox wiederverwendet; GitHub-/Live-Endstatus wird erst nach tatsächlichem Abschluss im Ausführungsbericht genannt.

| Persona | Prüfung / Feedback | Status |
| --- | --- | --- |
| Neue Nutzerin | Formatfelder müssen ihren tatsächlichen Wirkungsbereich erklären. | Gruppentitel und Hinweis ergänzt; vollständiger Einrichtungs-/Reihenablauf bleibt offen. |
| Erfahrener Designer | Einzelne Seitenfelder dürfen eine Reihe nicht versehentlich verformen; Panoramen bleiben zusammenhängend. | Ganze Reihe geändert, Nachbarreihe unverändert, Undo/Redo geprüft. |
| Senior UX-Experte | Unterschiedliche Bedienwege müssen dieselbe Formatregel durchsetzen. | Zentraler Modellzugang; Einzel-/Auswahl-/Strukturaktionen abgeglichen. |
| UI-Expertin | Gleichlautende Formatbegriffe und verständliche Altbestands-/Fehlermeldungen. | Betroffene Felder/Hinweise angeglichen; umfassender UI-Umbau bleibt im Restplan. |
| QA-Entwicklerin | Wartbare Zuständigkeit, Datei-Kompatibilität und belastbare Regressionen. | Gemeinsame reine Prüfgrenze, alter paralleler Formatpfad entfernt, drei neue Modelltests und Browserfall. |
| Fehlersucher | Gemischte Formate beim Join, Transfer, Shuffle oder Altbestand-Duplikat dürfen keine stillen Änderungen erzeugen. | Ungültige Aktionen atomar abgewiesen; explizite Altbestandsreparatur geprüft. |

Zusätzliche Nutzeraufträge sind im Restplan festgehalten: UX für Einrichtung, Seitenleiste, Fläche, Eigenschaften, Speichern/Öffnen/Export als vollständige Nutzerwege gestalten; neue Vorlagen nach Gestaltungsgrundsätzen entwerfen, visuell vorlegen und nur nach ausdrücklicher Zustimmung in die mitgelieferte Bibliothek aufnehmen. Keine neuen Vorlagen oder Freigaben wurden in diesem Lauf behauptet.


Die vollständige Chrome-Prüfung deckte anschliessend eine fehlende Voraussetzung im vorhandenen nativen Drag-Test auf: Durch den längeren Formathinweis lagen Quelle und Ziel nicht gemeinsam im sichtbaren Ausschnitt. Chrome begann beim automatischen Scrollen während der Testgeste keinen Drag. Die Ereignisspur zeigte keine `dragstart`-Nachricht; bei vorab sichtbarer Übersicht wurden echte `dragstart`-/`dragover`-/`drop`-Ereignisse und die erwartete Mitgliedschaftsänderung nachgewiesen. Der Test scrollt nun die Übersicht vor der Geste in den sichtbaren Bereich und wartet zwei Renderframes. Die ursprüngliche Prüfung der tatsächlichen Modelländerung bleibt unverändert; keine abgeschwächte Erwartung und keine neue Produktlogik für diesen Test.

Die fünf weiteren Nutzerwünsche (Exportvorschau-Auswahl, Live-Formvorschau, farbgefüllter Winkel, Pipette, Fünf-Farben-Farbhilfe mit passenden Vorschlägen) sind ebenfalls im dauerhaften Restplan dokumentiert. Es wurden damit keine zusätzlichen Werkzeuge implementiert.
