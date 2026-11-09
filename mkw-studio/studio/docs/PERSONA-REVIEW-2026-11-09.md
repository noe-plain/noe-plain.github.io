# Wochenstart-Bericht · 9. November 2026

## 1. Projektstand

Aktives Projekt: `mkw-studio/studio` im Repository `noe-plain.github.io`; `FD-Kampagnen-Layouttool` ist der ältere lokale Vorgänger. Ausgangspunkt `1503ecf`, lokale Arbeitskopie zu Beginn sauber und mit `origin/main` identisch. Die zwischenzeitliche Änderung „Link: Contao“ ausserhalb des Studios bleibt erhalten.

Die öffentliche GitHub-API lieferte keine offenen Issues. Die Live-Seite antwortete mit HTTP 200; ihr HTML entsprach dem lokalen Ausgangsstand. Das Browsing-Tool konnte die beiden Projektseiten nicht laden, deshalb wurden direkte HTTPS-Abfragen und echte Browserabläufe verwendet. Das gemeinsame Textpanel vom letzten Review ist weiterhin integriert; keine neue Benutzeroberfläche oder zusätzliche Laufzeitbibliothek war für diese Korrektur nötig.

Fokus: Desktop und Tablet ab iPad-Mini-Grösse. Keine Smartphone-Optimierung oder spezielle Abnahme für starke Sehbehinderung. Die Persona-Prüfung ist eine technische Prüfung aus sechs Perspektiven, keine Studie mit sechs realen Testpersonen.

## 2. Ausgewähltes Kernproblem: abgewiesene Eingabe zerstörte Wiederholen

**Priorität: P1 für den Bearbeitungsverlauf.** Bei einer gewählten einzelnen Zeile konnte eine formal gültige Prozentangabe einen unzulässigen absoluten Zeilenabstand erzeugen: 1000 px Schriftgrösse × 500 % = 5000 px, oberhalb der erlaubten 3000 px. Die Eingabe wurde korrekt abgewiesen. Zuvor hatte der Eingabehandler aber bereits `remember()` aufgerufen. `checkpoint()` legte damit einen überflüssigen Undo-Eintrag an und leerte `future` – ein zuvor mögliches Wiederholen ging verloren.

**Reproduktion vor der Korrektur:** Laufweite ändern, rückgängig machen, eine Zeile wählen, 500 % eingeben. Der Regressionstest scheiterte am Vergleich von Dokument, Undo, Redo und Revision; `future` war danach leer.

**Refactoring:** `static/typography-ui.js`, Absatzaktion `paragraph()` und Eingabehandler in `bind()`. Die Aktion prüft zuerst den vollständigen Wirkungsbereich und die absolute Abstandshöhe. Erst bei einer zulässigen Änderung erzeugt sie den ersten Undo-Eintrag und gibt `true` zurück. Die Eingabegruppe startet nur nach einer tatsächlich übernommenen Änderung:

```js
if (
  paragraph(
    { [key]: key === "lineHeight" ? value / 100 : value },
    began,
  )
)
  began = true;
```

Im finalen FD-Test fiel ausserdem ein Rundungsrest der Skalierungsumrechnung auf (`1300.0000000000002` statt `1300`). Der errechnete Abstand wird jetzt auf neun Nachkommastellen in Pixeln normalisiert, bevor die inklusive Grenze von 1–3000 px geprüft wird. Der Regressionstest prüft 300 % bei 1000 px ausdrücklich als gültige 3000 px; die Grenze wurde nicht erweitert.

Alle Ablehnungswege liefern `false`; erfolgreiche Absatz-/Zeilenaktionen liefern `true`. Die bisherige Gruppierung einer fortlaufenden Eingabe bleibt erhalten. Eine ungültige Zwischeneingabe beendet oder dupliziert diese Gruppe nicht. Bestehende Formatierung, Dateischema, Rendering und Export-Encoder bleiben unverändert.

**Prüfung:** `tests/text-leading-validation.cjs` prüft reale Eingaben in Designer und FD, einen vorhandenen Redo-Eintrag, unveränderte vollständige Undo-/Redo-Snapshots anhand SHA-256, unveränderte Quelldaten und Revision, tatsächliches Wiederholen, Fehlerkorrektur sowie einen einzelnen Undo-Schritt für mehrere gültige Eingaben mit einer abgewiesenen Zwischeneingabe. Der neue Test und die InDesign-Quellprüfung sind in beiden Browser-CI-Aufrufen registriert.

## 3. Persona-Prüfmatrix und finales Tuning

| Persona | Identifiziertes Feedback / Problem | Status |
| :--- | :--- | :--- |
| Neue Nutzerin | Nach einer Fehlermeldung korrigieren, ohne einen verborgenen Bearbeitungsschritt auszulösen. | Gelöst; ungültig → gültig und erneute ungültige Zwischeneingabe geprüft. |
| Erfahrener Designer | Eine abgewiesene Eingabe darf Wiederholen nicht löschen; gültige Eingaben brauchen einen zusammenhängenden Undo-Schritt. | Gelöst; tatsächliche Undo-/Redo-Aktionen in beiden Editoren geprüft. Der InDesign-Export bleibt offen für weitere Wochen. |
| Senior UX-Experte | Fehlerversuch und tatsächliche Dokumentänderung waren im Verlauf unlogisch vermischt. | Gelöst; erst validieren, dann Änderung und Verlauf übernehmen. |
| UI-Expertin | Fehlermeldung und Korrektur sollen im vorhandenen Material-Feld bleiben und zum tatsächlichen Zustand passen. | Gelöst; bestehende Feldgestaltung erhalten, `aria-invalid` wird bei Korrektur entfernt; weitere Material-/Panelprüfungen erfolgreich. |
| QA-Entwicklerin | Dokument, Verlauf und Dateirundlauf vollständig prüfen; Testassets dürfen beim Aufbau nicht vorzeitig freigegeben werden. | Gelöst in den geprüften Abläufen; Testrezepte erzeugen Bildreferenzen unmittelbar mit ihrer Verwendung und vergleichen alle Quelldaten beim MKW-Rundlauf. |
| Fehlersucher | Grosse Schrift, extreme Prozentwerte und gültig/ungültig im Wechsel dürfen Layout oder Redo nicht beschädigen. | Gelöst; 5000-px-Ergebnis abgewiesen, gültige Korrektur und unveränderte Nachbarinhalte geprüft. |

Die abschliessende Testkorrektur betraf die neuen Quellrezepte: Asset-Bereinigung und vollständige Seitenformate wurden im Aufbau berücksichtigt. Beim MKW-Rundlauf wird jeder Feldwert und jede Arrayposition verglichen; die Reihenfolge von JSON-Feldnamen ist kein Layoutinhalt. Es wurde keine bestehende Toleranz oder Pixelprüfung gelockert.

## 4. InDesign-Meilenstein und tatsächliche Grenzen

Umgesetzt ist der erste **Vorbereitungsmeilenstein**: [Anforderungen und Abnahmekriterien](INDESIGN-EXPORT-ACCEPTANCE.md), drei reproduzierbare synthetische Projekt-Rezepte in `tests/fixtures/indesign-projects.json` und deren Browserprüfung `tests/indesign-source-fixtures.cjs`. Sie decken Typografie/Unicode, FD-Formate/Bildausschnitte und freie Seiten/Effekte/ausgeblendete Inhalte ab.

Die Rezepte werden mit den echten Studio-Funktionen erstellt, validiert und vollständig als MKW geschrieben, gelesen und wiederhergestellt. Seitengrössen werden zudem gegen die geplante, zum bestehenden PDF-Export passende Punktumrechnung geprüft. Es entstehen keine zusätzlichen eingecheckten Bild-/Font-Binärdateien.

Die aktuelle offizielle Adobe-DOM-Referenz wurde abgerufen. Die historische IDML-Spezifikation ist identifiziert; die bisherigen offiziellen PDF-Downloadadressen liefern 404. Diese vollständige Referenz ist deshalb nicht als gelesen oder verifiziert markiert. Lokal vorhandene Adobe-Parsermodule wurden als ergänzende Herstellerreferenz gelesen, aber nicht übernommen.

**Noch nicht umgesetzt:** IDML-Paket-Schreiber, bearbeitbarer IDML-Text-/Bildexport, tatsächliches Öffnen einer erzeugten IDML-Datei in InDesign oder nativer INDD-Browserexport. PSD und MKW bleiben verfügbar. Nächster Schritt: Referenz-/Schemafrage klären und ein minimal gültiges Einseiten-Paket entwickeln und tatsächlich in InDesign öffnen. Dauerhafter Fortschritt: [INDESIGN-EXPORT-PLAN.md](INDESIGN-EXPORT-PLAN.md).

## 5. Nachweise und Veröffentlichung

Formatierung, reproduzierbarer Build und die 163 vorhandenen Modelltests sind erfolgreich. Die lokalen gezielten Browserprüfungen umfassen die neue Verlaufskorrektur, die drei Quellrezepte, Textauswahl, direkte Bearbeitung, Fehlererholung, Gruppierung von Undo, Typografie, Panel-UX, Material-Felder und vorhandene PNG-/PSD-/PDF-/MKW-Regressionen in Chrome und Firefox. Keine geschwächten Vergleiche in bestehenden Prüfungen.

GitHub-Prüfungen und tatsächlicher Live-Abschluss werden nach dem Push für den neuen Commit kontrolliert und im Abschlussbericht genannt; sie werden hier nicht vorweggenommen.
