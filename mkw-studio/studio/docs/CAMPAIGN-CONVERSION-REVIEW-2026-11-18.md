# B02 · Sichere Konvertierungsgrenze · 18. November 2026

Ausgang `4387ee35395a8def97b1443eb7268093585c50ef`, eigene saubere Arbeitskopie. Fortsetzung des priorisierten Backup-Ausstiegs. Zu Beginn kurzes Fenster 79 % verbraucht / 21 % frei, Woche 25 % verbraucht / 75 % frei. Nutzer erlaubt Weiterarbeit trotz möglichem Kontingentabbruch; begrenzter prüfbarer Teilschritt, keine Zusatzcredits/Resets/Agenten und kein zweites Fenster.

## Änderung und tatsächliche Prüfung

- `static/campaign-document.js`: Gemeinsame `checkBoards`-Prüfung für Ausgabeformate/Safezones vor dem Aufbau; Append verwendet dieselbe Regel. Betroffene Ausgaben mit Nummer und Pixelmassen nennen (höchstens drei, Rest gezählt). Keine stille Verkleinerung oder ausgelassene Ausgabe. Leere Bildgruppen sind No-op und erzeugen kein defektes Basisformat/keine leeren Reihen.
- `static/campaign-ui.js`: Direkte Konvertierung prüft das vollständige Original vor Rückfrage/Kopie. Leeres Projekt verständlich abweisen. Bestätigung an Projekt und Revision binden; zwischenzeitlicher Wechsel oder Änderung verwirft sie. Formatgrenzen als Warnung, tatsächliche Fehler als Fehler im Footer. Der Bibliotheksweg lädt wie bisher das ausdrücklich gewählte Original und prüft es vor dem Kopie-Aufbau.
- Hilfe ergänzt; vorhandene M3-Rückfrage, Footer, Modelle und MKW-Schreiber wiederverwendet. Kein zweites Format-/Dokumentmodell.

Eigene synthetische 128×128-PNG-Quelle, keine Nutzerdateien. Alte Ausgaben **600×750**, **6000×4000**, **240×239** durch reguläre Projektvalidierung geprüft. Abweisung benennt die beiden nicht unterstützten Ausgaben; Projekt, Auswahl, Revision, Undo/Redo und Browsersicherung unverändert, keine neue Kopie. Regulärer MKW-Schreiber/-Leser mit Asset-Hydrierung erhält alle ursprünglichen Masse. 201 Ausgaben abgewiesen, keine Grenze erhöht. Leerer Append unverändert. Reguläre Umwandlung mit ungenutzter Bildquelle erfolgreich: eine Reihe, eine Ausgabe.

Echten Bestätigungsdialog nach tatsächlichem `startDocument`-Projektwechsel und nach Änderung derselben Instanz bestätigt: beide Male verworfen, kein falsches Projekt umgewandelt. Rückfrage-API nicht ersetzt, Funktionsassertions nicht deaktiviert.

**Lokal bestanden:** Formatierung, Build, Formatprüfung, **217 Modell-/Pakettests**, `campaign-conversion-guard`, `campaign-migration`, `backup-migration`. Neuer Fall in Chrome-Standardlauf und Firefox-CI registriert. [Maschinenwerte](CAMPAIGN-CONVERSION-VERIFICATION-2026-11-18.json).

## Anschliessender Familienlayout-Fall

Ein weiterer eigener Pixelvergleich belegte einen echten Altdatei-Unterschied: Familien-Titel zeichneten die Kontur bisher über der Füllung, die neue Darstellung darunter; ein alter Palettenversatz wurde nicht berücksichtigt. Bei einem eigenen 600×750-Projekt betrug die maximale Abweichung zunächst 199/255 (Versatz 0 und 3). Nach Korrektur der Kontur/Farbfolge blieb eine Copyright-Abweichung durch abweichendes Kerning; auch diese ist korrigiert.

Der vorhandene Kampagnen-Decorator liest bei migrierten Titeln den schon gespeicherten Palettenversatz aus dem ursprünglichen Board. Er liefert ausschliesslich temporäre Renderwerte; keine neuen Dokumentfelder, kein zweites Textmodell. Der vorhandene Glyphen-Paintpfad unterstützt dabei die bisherige Konturreihenfolge und das bisherige Kerning. Cache-Schlüssel berücksichtigen diese Werte. Direktbearbeitung verwendet entsprechende CSS-Werte. Designer-/neue Kampagnentexte behalten ihren bisherigen Standard.

`campaign-family-migration` prüft **alle acht** bisherigen Palettenversätze mit tatsächlichen Referenzpixeln, Copyright, Cache-Aktualisierung, unverändertem Rohmodell sowie MKW-Speichern/Lesen/Wiederöffnen. Im lokalen Chrome-Lauf sind alle acht Vergleiche **exakt**; echte PNG-/PDF-/PSD-Ausgaben ebenfalls exakt. PSD erhält für den Titel eine genaue Rasterdarstellung mit separat editierbarer Textreferenz, da die historische Konturreihenfolge nicht als nativ abgenommen ist. Angeschnittenes Copyright kann wie bisher gerastert bleiben. Keine vollständige native Photoshop-/App-Abnahme behauptet.

Zusätzlich lokal bestanden: `family-text-colour` in Designer/Backup/neuer Kampagne, bestehende `campaign-migration`, `psd-editability`, 217 Modelltests und Formatprüfung. Die anfängliche Testannahme zweier nativer PSD-Texte wurde durch die konkrete erforderliche Titelreferenz ersetzt; die Pixelvergleiche bleiben unverändert streng. Neuer Fall in beiden vollständigen Browserläufen registriert.

## Sechs-Persona-Prüfung

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Nicht mögliche Umwandlung verständlich erklären | Betroffene Ausgabe, Masse, Grenze und sicherer Weiterweg gelöst |
| Erfahrener Designer | Altformate/Ausschnitte und Familien-Typografie erhalten | Original/MKW erhalten; acht Familienfarbfolgen/Konturen korrigiert; grosse Altformate offen |
| Senior UX-Experte | Bestätigung gehört zum unveränderten Zielprojekt | Projekt-/Revisionswechsel verwirft die Aktion |
| UI-Expertin | Kohärente M3-Rückfrage und Footer-Zustände | Bestehende Komponenten verwendet; Warnung/Fehler unterschieden |
| QA-Entwicklerin | Gemeinsame Validierung und Datei-/Verlaufsabnahme | Geprüfter Umfang gelöst; Gesamtausstieg offen |
| Destruktiver Fehlersucher | Leere Gruppen, ungenutzte Quellen, 201 Ausgaben, Kontextwechsel und Palettenversatz | Eigene Fälle bestanden, inkl. acht Versätzen; nicht unterstützte Altformate bewusst blockiert |

Expertenprüfung, keine Nutzerstudie. **FD-Backup noch vorhanden.** Für Altformate ausserhalb 240–4000 px nun klarer verlustfreier Abweisungs-/Weiterbearbeitungsweg im bisherigen Editor, noch keine neue verlustfreie Übernahme. Vor vollständiger Entfernung weiterhin Ersatzweg und repräsentative Konvertierungsabnahme nötig. PSD/MKW, gemeinsame Dienste und alte Dateien bleiben; keine Grössenreduktion behauptet. Keine neue unabhängige Funktion in diesem Lauf beginnen.

## Veröffentlichung

**Endnachweis am 19. November ergänzt:** Code `ff867e01a562c6096bf9ec84d6895b08804510b6`. [Vollständiger CI-Endlauf 44340070962](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44340070962) erfolgreich: 217 Modelltests, **122/122 Chrome- und 107/107 Firefox-Suiten**, beide Browser und Studio-Gate grün. [GitHub Pages 44340069812](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44340069812) erfolgreich. Drei echte Chrome-Live-Fälle (`campaign-conversion-guard`, `campaign-family-migration`, `campaign-preview`) erneut bestanden; HTML/JS/CSS/Hilfe bytegleich zum Hauptstand. Dies schliesst den Konvertierungs-/Familien-Teilschritt ab, nicht die vollständige FD-Backup-Entfernung.
