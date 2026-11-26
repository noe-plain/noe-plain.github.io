# Vorlagentexte mit vorbereiteten Absatzformaten

## Ausgang und Entscheidung

Fortsetzung ab `04e259a`, nach Abgleich mit main am 25. November 2026. Die vorherige Veröffentlichung ist vollständig abgenommen: [Chromium, Firefox, Windows](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45356450683), [Pages](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45356450047) und eigener Live-Fall vom 24. November.

T01 erweitert die beschrifteten Vorlagenfelder statt eines zweiten Texteditors in der Designer-Seitenleiste. Die vorhandene Vorlage liefert ihre vorbereiteten Formate; Namen verbinden Ebene und Beispielabsatz. Die Auswahl gilt für den gesamten Absatz am Cursor, bei Markierung für die betroffenen Absätze mit exklusivem Bereichsende. Lokale Zeichenformate dieser Absätze werden bewusst ersetzt, andere Absätze bleiben erhalten. Der Hinweis am Feld erklärt dies vor der Anwendung.

Enter erzeugt einen Absatz, Shift+Enter eine weiche Zeile. Rückgängig/Wiederholen gilt im jeweiligen Feld für Inhalt, Absatzformat und Rahmenanker. Text im Rahmen kann oben, mittig oder unten stehen. Bestehende Vorlagen behalten ihre bisherige Position und Geometrie. Die angekündigten konkreten Nutzervorlagen fehlen noch; ihre untere Verankerung wird bei der Übernahme unter T03 geprüft. Keine existierende Vorlage wird ungefragt umgestaltet.

## Material-Grundlage und eigene Entscheidungen

[Offizielle Material-Web-Textfelder](https://material-web.dev/components/text-field/) erläutern mehrzeilige Eingaben, Beschriftungen, Hilfs-/Fehlertexte und Validierung. [Offizielle Select-Dokumentation](https://material-web.dev/components/select/) beschreibt feste Auswahllisten, die nativen Selects entsprechen, sowie semantische Farb-/Formrollen. Die Implementierung verwendet die vorhandenen nativen Felder und Material-Tokens des Projekts, keine zusätzliche Komponentenbibliothek. Diese Dokumentation ist eine Web-Implementierungsquelle, keine Pflicht zur Übernahme ihres Frameworks. Auswahl des Wirkungsbereichs, lokale Historie und die abgeleiteten Formatnamen sind eigene Produktentscheidungen aus den Aufgaben der Personas.

## Umsetzung und Grenzen

- Reines `template-text-model.js` verwendet die vorhandenen Text-/Editiermodelle. Inkrementelle Eingaben halten Formate bei den zugehörigen Absätzen. Vollständiger Feldersatz bewahrt die vorbereiteten Absatzschriften auch bei gemeinsamem Textpräfix.
- Galerie, isolierte Vorschau und Projekterstellung verwenden dieselbe geprüfte Feldprojektion. Keine temporäre globale Dokumentumschaltung, kein neues MKW-Schema und keine zusätzliche permanente Formatbibliothek.
- `template-text-fields.js` besitzt die nativen Eingaben und begrenzte lokale Historie: maximal 50 Einträge bzw. ungefähr 2 MiB serialisierte UTF-16-Daten pro Feld, mindestens zwei Zustände. Tippen wird gebündelt. Die lokale Historie endet beim Neuaufbau/Schliessen des Feldes; innerhalb des offenen Fensters bleiben die Entwurfswerte bei Vorlagenwechsel erhalten.
- Formatoptionen entstehen erst beim Aktivieren der jeweiligen Auswahl und werden beim Verlassen entfernt. Dadurch kein Produkt aus allen Feldern und allen Formatoptionen im dauerhaften DOM.
- Ein gewählter Font im letzten noch leeren Absatz bleibt eine vorübergehende Eingabeinformation. Er wird bei der nächsten Eingabe übernommen, aber nicht als Zusatzmetadatum in MKW-Dateien gespeichert.
- Grenzen werden vor Übernahme geprüft; bei ungültiger Eingabe bleibt der bisherige Entwurf erhalten. Der Fehler hat Text und einen semantischen Fehlerzustand, nicht nur eine Farbe.

## Persona-Prüfung

| Persona | Prüfung / Ergebnis | Status |
| --- | --- | --- |
| Neue Nutzerin | Beschriftete Felder, vorhandene Designbeispiele statt freier Typografieparameter; Anzeige des aktiven Absatzes und erklärter Wirkungsbereich. | Native Eingabe, Vorschau und Designer-Übergang geprüft. Keine Nutzerstudie behauptet. |
| Erfahrener Nutzer | Cursor genügt, Mehrfachabsätze, Shift+Enter und lokale Undo-/Redo-Kurzbefehle. | Echte Browser-Tastatur- und Formatabläufe geprüft. |
| UX/UI | Bestehende Material-Feldgestaltung, gemeinsame Token, schmale Ansicht ohne horizontales Überlaufen. | Helle Desktop- und schmale dunkle Darstellung visuell angesehen. |
| Barrierefreiheit | Native Felder/Auswahl, zugängliche Namen, verknüpfte Hilfen/Fehler und benannte Undo-/Redo-Buttons; keine ausschliessliche Farbcodierung. | Tastatur und axe geprüft; keine manuelle Screenreader-/Touch-Abnahme. |
| Entwicklerin / QA | Reine Projektion, unveränderte Quellvorlage/aktives Projekt, Grenzen, gemischte Typografie, MKW und gleiche Renderausgabe. | Modell- und Browsernachweise; neu gefundener Vollersatz-Regressionsfall korrigiert und abgesichert. |

## Tatsächliche Nachweise

231 Modell-/Dateitests, Formatprüfung und Build bestanden. Acht gezielte Chromium-Suiten: `template-text`, `template-placeholders`, `templates`, `approved-templates`, `template-library`, `template-guidance`, `project-setup`, `unified-text-tools`. Der neue Browserfall prüft Cursor, Mehrfachabsätze, Softbreak, Undo/Redo, Rahmenanker, Entwurfswechsel, native Tastatur, schmales dunkles Fenster, axe, unveränderte Ausgangsdatei/Projekt, MKW-ZIP-Rundlauf und bytegleiche Rasterpixel zwischen befüllter Vorschau und Designer bei derselben Rastergrösse. Die bestehenden freigegebenen Vorlagen behalten auch nach vollständigem Feldersatz ihre Absatzschriften. Die Fehlergrenze von über 10 000 Absätzen wird zusätzlich mit einem eingespeisten Eingabeereignis geprüft; daraus folgt kein Leistungsnachweis für eine native Masseneinfügung.

Externe neue GitHub-/Pages-Ergebnisse und Live-Abnahme werden im Arbeits-Handoff nach tatsächlicher Bereitstellung festgehalten. Noch laufende externe Prüfungen sind kein behaupteter Erfolg. Die einzige aktive Aufgabenliste bleibt der Masterplan, D34/T03; dieses Dokument ist ein Nachweis, keine zweite Planung.

## Fortsetzung · 26. November: Chromium-Klickprüfung

Der vollständige Lauf [45630758326](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45630758326) bestand in Firefox und Windows; Chromium meldete in `template-placeholders` beim ersten Vorschauklick keinen File-Chooser. Der neue Textfall und die übrigen dort ausgeführten Browserprüfungen waren nicht als Fehler annotiert. Das ursprüngliche Chromium-Problem war lokal bei denselben Desktopmassen nicht zuverlässig reproduzierbar; keine unabhängig belegte App-Ursache behauptet.

Die Bildprüfung verwendete rohe Fensterkoordinaten ohne Sichtbarkeits-/Stabilitätsprüfung des Zielbildes. Sie scrollt das betreffende Bild jetzt bei Bedarf in Sicht und klickt es mit der tatsächlich abgeleiteten Position innerhalb des Bildes. Playwright prüft dabei Erreichbarkeit und Stabilität. Es gibt keinen erzwungenen Klick, keine Ersatz-Dateiauswahl, keine Wiederholungs- oder erhöhte Zeitgrenze. Die echte native Auswahl und die Ziel-ID bleiben Pflicht. Auswahl, Ersetzen, Abbrechen, Wischen, Tastatur, Masken, Entwurfsisolierung und MKW werden weiterhin geprüft.

Zusätzlich durchläuft die gesamte Suite einen frischen schmalen Fensterkontext. Dort wird vor der ersten Bildauswahl absichtlich zu einem Textfeld gescrollt und geprüft, dass die Vorschau ausserhalb des sichtbaren Dialogbereichs liegt. Auch von dort muss der echte Bildklick die richtige Dateiauswahl öffnen. Die übrigen inhaltlichen Assertions bleiben erhalten. Nur Testcode wurde geändert; ein Neuaufbau bestätigt bytegleiche Laufzeitdateien. Kein Produkt- oder Dateiformatwechsel.

Lokal: 231 Modell-/Dateitests, Format/Build und sieben betroffene Vorlagensuiten erfolgreich. Die Platzhalterprüfung führt dabei Desktop und schmales Fenster jeweils mit eigenem Projektkontext aus. Die erneute externe Chromium-/Firefox-/Windows-Abnahme wird erst nach ihrem tatsächlichen Abschluss im Arbeits-Handoff festgehalten.
