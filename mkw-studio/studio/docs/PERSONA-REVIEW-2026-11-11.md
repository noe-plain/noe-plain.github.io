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
