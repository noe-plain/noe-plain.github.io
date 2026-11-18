# B02 · Sichere Konvertierungsgrenze · 18. November 2026

Ausgang `4387ee35395a8def97b1443eb7268093585c50ef`, eigene saubere Arbeitskopie. Fortsetzung des priorisierten Backup-Ausstiegs. Zu Beginn kurzes Fenster 79 % verbraucht / 21 % frei, Woche 25 % verbraucht / 75 % frei. Nutzer erlaubt Weiterarbeit trotz möglichem Kontingentabbruch; begrenzter prüfbarer Teilschritt, keine Zusatzcredits/Resets/Agenten und kein zweites Fenster.

## Änderung und tatsächliche Prüfung

- `static/campaign-document.js`: Gemeinsame `checkBoards`-Prüfung für Ausgabeformate/Safezones vor dem Aufbau; Append verwendet dieselbe Regel. Betroffene Ausgaben mit Nummer und Pixelmassen nennen (höchstens drei, Rest gezählt). Keine stille Verkleinerung oder ausgelassene Ausgabe. Leere Bildgruppen sind No-op und erzeugen kein defektes Basisformat/keine leeren Reihen.
- `static/campaign-ui.js`: Direkte Konvertierung prüft das vollständige Original vor Rückfrage/Kopie. Leeres Projekt verständlich abweisen. Bestätigung an Projekt und Revision binden; zwischenzeitlicher Wechsel oder Änderung verwirft sie. Formatgrenzen als Warnung, tatsächliche Fehler als Fehler im Footer. Der Bibliotheksweg lädt wie bisher das ausdrücklich gewählte Original und prüft es vor dem Kopie-Aufbau.
- Hilfe ergänzt; vorhandene M3-Rückfrage, Footer, Modelle und MKW-Schreiber wiederverwendet. Kein zweites Format-/Dokumentmodell.

Eigene synthetische 128×128-PNG-Quelle, keine Nutzerdateien. Alte Ausgaben **600×750**, **6000×4000**, **240×239** durch reguläre Projektvalidierung geprüft. Abweisung benennt die beiden nicht unterstützten Ausgaben; Projekt, Auswahl, Revision, Undo/Redo und Browsersicherung unverändert, keine neue Kopie. Regulärer MKW-Schreiber/-Leser mit Asset-Hydrierung erhält alle ursprünglichen Masse. 201 Ausgaben abgewiesen, keine Grenze erhöht. Leerer Append unverändert. Reguläre Umwandlung mit ungenutzter Bildquelle erfolgreich: eine Reihe, eine Ausgabe.

Echten Bestätigungsdialog nach tatsächlichem `startDocument`-Projektwechsel und nach Änderung derselben Instanz bestätigt: beide Male verworfen, kein falsches Projekt umgewandelt. Rückfrage-API nicht ersetzt, Funktionsassertions nicht deaktiviert.

**Lokal bestanden:** Formatierung, Build, Formatprüfung, **217 Modell-/Pakettests**, `campaign-conversion-guard`, `campaign-migration`, `backup-migration`. Neuer Fall in Chrome-Standardlauf und Firefox-CI registriert. [Maschinenwerte](CAMPAIGN-CONVERSION-VERIFICATION-2026-11-18.json).

## Sechs-Persona-Prüfung

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Nicht mögliche Umwandlung verständlich erklären | Betroffene Ausgabe, Masse, Grenze und sicherer Weiterweg gelöst |
| Erfahrener Designer | Altformate/Ausschnitte nicht heimlich verkleinern | Original/MKW erhalten; neue Übernahme grosser Altformate offen |
| Senior UX-Experte | Bestätigung gehört zum unveränderten Zielprojekt | Projekt-/Revisionswechsel verwirft die Aktion |
| UI-Expertin | Kohärente M3-Rückfrage und Footer-Zustände | Bestehende Komponenten verwendet; Warnung/Fehler unterschieden |
| QA-Entwicklerin | Gemeinsame Validierung und Datei-/Verlaufsabnahme | Geprüfter Umfang gelöst; Gesamtausstieg offen |
| Destruktiver Fehlersucher | Leere Gruppen, ungenutzte Quellen, 201 Ausgaben, Kontextwechsel | Eigene Fälle bestanden; nicht unterstützte Altformate bewusst blockiert |

Expertenprüfung, keine Nutzerstudie. **FD-Backup noch vorhanden.** Für Altformate ausserhalb 240–4000 px nun klarer verlustfreier Abweisungs-/Weiterbearbeitungsweg im bisherigen Editor, noch keine neue verlustfreie Übernahme. Vor vollständiger Entfernung weiterhin Ersatzweg und repräsentative Konvertierungsabnahme nötig. PSD/MKW, gemeinsame Dienste und alte Dateien bleiben; keine Grössenreduktion behauptet. Keine neue unabhängige Funktion in diesem Lauf beginnen.

## Veröffentlichung

Lokale Prüfung abgeschlossen; tatsächlichen Commit, CI-/Pages-Endstatus und Live-Abnahme nach Veröffentlichung ergänzen. Ein gestarteter Lauf ist kein Erfolgsnachweis.
