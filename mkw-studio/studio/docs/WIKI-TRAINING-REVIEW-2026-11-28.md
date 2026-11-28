# Wiki als Schulung · 27.–28. November 2026

## Ergebnis

Das Handbuch richtet sich ausdrücklich an Menschen ohne Gestaltungs- oder Toolwissen. Zwei fachliche Redaktionsdurchgänge verbinden gestalterische Empfehlungen mit überprüften Studio-Handgriffen. Anschliessend wurde der Text aus vollständiger Anfängerperspektive durchgegangen. Diese Perspektiven wurden redaktionell simuliert; es haben keine externen Designer oder unerfahrenen Testpersonen teilgenommen.

- Zehn aufgabenbezogene Kapitel; neue Kapitel «Gestalten ohne Vorwissen» und «Texte schreiben & gestalten».
- Geführte Übung: FD-Kampagne anlegen, quadratisches Format wählen, Foto importieren, Titel schreiben, Ausschnitt/Logo prüfen, MKW sichern und JPG exportieren.
- Gestaltungskurs mit Hierarchie, Kontrast, Ausrichtung, Weissraum, Formaten und abschliessender Checkliste.
- Glossar für Schriftschnitt, Absatzformat, Pixel/Auflösung, Slide/Reihe, Artboard, Bildausschnitt, Schutzzone, Fläche/Kontur und Deckkraft.
- Elf leichte HTML-/SVG-Abbildungen, davon sieben neu: Texthierarchie, Kontrast, Abstände, Absatz/Zeile, Rahmen/Bildinhalt, Ebenen und Kurvengriffe. Die bisherigen Abbildungen bleiben erhalten.
- Gemeinsame Textanleitung für FD und Designer. Bestehende Backup-Karten/Textoptionen sind separat aufgeklappt nachschlagbar und klar als bisheriger Ablauf gekennzeichnet.
- Suche öffnet passende eingeklappte Anleitungen; beim Leeren wird der Zustand vor der Suche wiederhergestellt. Bestehende Anker und direkte Links bleiben erhalten.
- Das Wiki wird weiterhin erst beim Öffnen geladen. Keine neuen Bibliotheken, externen Bilddateien oder dauernd laufenden Animationen. Dokumentmodell, Rendering, Speicherung und Artwork-Farben wurden nicht verändert.

## Prüfung aus den drei verlangten Perspektiven

| Perspektive | Befund / Überarbeitung | Status / Nachweis |
| --- | --- | --- |
| Profidesigner mit Tipps und Tricks | Reine Bedienlisten erklären nicht, warum ein Motiv funktioniert. Gestaltungstipps nennen zuerst eine Aufgabe: Titel priorisieren, Bildstellen beruhigen, gemeinsame Kanten und Gruppenabstände verwenden. Keine allgemeingültige Gestaltungsregel oder Material-Vorgabe erfunden. | Umgesetzt. Empfehlungen als Gestaltungstipps gekennzeichnet, mit schematischen Gegenüberstellungen und Übungen. |
| Toolprofi | Aktueller FD-Ablauf war mit Backup-Anleitungen zu festen Textoptionen vermischt. Textwerkzeuge standen im FD-Kapitel, obwohl sie auch im Designer gelten. Kartenfelder waren unter Einstellungen statt beim Arbeitsablauf erklärt. | Umgesetzt. Aktuelle Karten-/Textbedienung mit Quellmodulen abgeglichen; Backup getrennt, Textkapitel gemeinsam, Kartenfelder im FD-Kapitel. Die echte FD-Lektion wurde im Browser bis zum Download durchlaufen. |
| Vollständiger Anfänger in beiden Bereichen | Begriffe wie Absatz, Zeile, Rahmen und Ausschnitt waren vorausgesetzt; der Schnellstart hatte kein überprüfbares Endergebnis. Ein langer Beispielkonzerttitel umbrach bei der visuellen Probe ungünstig. Eine Kurvenbeschriftung lag auf der Linie; die Kontrastgrafik beschrieb im dunklen Theme eine tatsächlich helle Fläche als dunkel. | Korrigiert. Glossar, Bildvergleiche, klare Handgriffe und Erfolgskriterien ergänzt; kurzer Einstiegstitel, Beschriftungen freigestellt und themeneutrale Erklärung. Eine echte Schulung mit Testperson bleibt offen. |

## Konkrete Befunde und Prüfkriterien

| ID | Problem und Auswirkung | Änderung | Prüfkriterium | Status |
| --- | --- | --- | --- | --- |
| W01 | Aktuelle Nutzer folgen fälschlich alten Textoptionen. | Backup-Anleitung abtrennen, aktuelle Schritte an echten Kartenfeldern und direkter Flächenbearbeitung ausrichten. | Übung ohne Zugriff auf Backup durchführbar; Altlinks öffnen ihre Anleitung. | bestanden |
| W02 | Unklarer Einstieg und Unterschied zwischen Sicherung und Veröffentlichung. | Geführte FD-Aufgabe mit zwei Dateiergebnissen. | Normale UI erzeugt eine gültige MKW-ZIP-Datei und JPG-Ausgabe. | bestanden |
| W03 | Textbegriffe/Änderungsumfang unverständlich. | Gemeinsames Kapitel, Absatz-/Zeilenbeispiel und Auswahlhinweise. | Kapitel erreichbar aus beiden Modus-Anleitungen; vorhandene Typografieanker funktionieren. | bestanden |
| W04 | Wenig Hilfe beim tatsächlichen Gestalten. | Drei Grundlagenabbildungen und konkrete Gestaltungstipps. | Lesbare Erklärungen in Hell/Dunkel und schmalen Fenstern; ohne Farbe verständlich. | bestanden |
| W05 | Suche zeigt Treffer in geschlossenen Referenzen nicht. | Suchzustand erweitert; Details bei Treffer öffnen, vorherigen Zustand danach wiederherstellen. | Geschlossene und vorher geöffnete Referenz, Nulltreffer, Reset und direkter Altanker funktionieren. | bestanden |
| W06 | Kleine oder überlagerte Grafikbeschriftungen erschweren Lernen. | Native HTML-Labels/Legenden, responsive Stapelung und freigestellte Kurvenlabels. | Kein horizontaler Seitenüberlauf bei 390/700/1500 CSS-px; Grafiken visuell kontrolliert. | bestanden |

## Tatsächlich ausgeführte Prüfungen

- `npm run format`, gezielte Prettier-Prüfung/-Formatierung der Wiki-Dateien, `npm run build`, `git diff --check`.
- `npm test`: **237/237** Modell-/Strukturtests erfolgreich. Wiki-IDs, lokale Ressourcen und interne Links geprüft.
- Chromium: **6/6** betroffene Browsersuiten im abschliessenden gemeinsamen Lauf erfolgreich: `wiki-training`, `wiki-illustrations`, `material-paint-wiki`, `seven-perspectives`, `material-bars`, `project-migration`.
- `wiki-training`: eigenständiges Wiki, zehn Navigationsziele/Kapitel, Suche in eingeklapptem Backup, Zustandswiederherstellung, Tastatur am nativen Aufklapper, alter Direktlink, vollständiges Axe-Scanning des Hauptinhalts ohne Befund, responsive Breiten, zusätzlich Layout mit CSS-Zoom 2 (kein Ersatz für alle Browser-/OS-Zoomvarianten).
- Tatsächliche Anfängerübung über UI: FD anlegen, nur Quadrat wählen, Bild über Dateieingabe importieren, Karten-Titel schreiben, MKW herunterladen (ZIP-Signatur geprüft), JPG auswählen, tatsächliches Vorschaubild laden und Export herunterladen. Foto ist ein synthetisches lokales Testbild. Native Betriebssystem-Speicherwahl wird dabei nicht automatisiert; geprüft wurde der Downloadweg.
- `wiki-illustrations`: alle elf Figuren in Hell/Dunkel als Screenshots, Bildtitel/Beschreibungen, sichtbare native Legenden, keine externen SVG-Bilder; Axe-Prüfung. Ausgewählte neue Abbildungen und Ergebnisvorschau zusätzlich visuell betrachtet und korrigiert.
- `material-paint-wiki`: Theme-Weitergabe einschliesslich Komplementärpalette, lesbare Kontraste, Suche/Reset/Fokus, modale Wiederverwendung, Lazy Loading, eigenständiges Wiki, schmale Fenster; bestehendes Artwork und Undo-Verlauf unverändert.

Lokale Nachweise: `checkpoints/WIKI-TRAINING-2026-11-27/` im Arbeits-Checkout. Dieser Ordner enthält die Browserlogs und Screenshots und wird nicht als Website veröffentlicht.

## Grenzen und offene Punkte

- Lokales Firefox startet wegen fehlender `libmozglue.dylib` in der vorhandenen Playwright-Installation nicht. Der Versuch ist protokolliert; kein erfolgreicher lokaler Firefox-Test behauptet. Die vorhandene GitHub-Matrix prüft Firefox auf sauberem Runner.
- Eine echte Anfänger-Schulung, manuelle Screenreader-Abnahme und sämtliche Betriebssystem-/Zoom-/Browserkombinationen sind nicht durchgeführt. Automatisches Axe ersetzt diese Abnahmen nicht.
- Keine vollständige erneute Funktionsabnahme jeder dokumentierten Spezialfunktion: bestehende Referenzanleitungen wurden erhalten, die geänderten zentralen Lehrschritte am Code und Browser geprüft.
- U49 (eigenes Bézier-Lernspiel) bleibt im Masterplan geplant. Die neue Kurvengrafik und Übung sind kein implementiertes Spiel. U47 (Erklärungen in der gesamten App reduzieren) ist damit ebenfalls nicht vollständig umgesetzt. PDF bleibt pausiert.
- Release-/GitHub-Status wird separat nach dem Push ermittelt und nicht aus lokalen Tests abgeleitet.

## Beim Abschluss gefundener Fehler im vorigen GitHub-Lauf

Die Veröffentlichung von `24470f5` war erfolgreich, der Lauf [46009625222](https://github.com/noe-plain/noe-plain.github.io/actions/runs/46009625222) scheiterte in beiden Browsern. Die tatsächlichen Anmerkungen wurden abgerufen und lokal nachgestellt:

1. **Echter Zugänglichkeitsfehler:** Der sichtbare Button «Auswahl» hiess für assistive Technik «Exportauswahl anzeigen». Axe meldete `label-content-name-mismatch` in vier Exportzuständen. Der Name lautet jetzt «Auswahl anzeigen». Funktionsweise und Gestaltung bleiben erhalten; die Regel wird nicht unterdrückt.
2. **Veralteter Exporttest:** `material-bars` erwartete drei Bildformate; seit JPG+ gibt es vier. Er prüft nun die konkreten Optionen `jpg`, `jxl`, `png`, `webp`, statt nur die Anzahl zu erhöhen. PDF bleibt in diesem bisherigen FD-Kontext verborgen.
3. **Veralteter Speichertest:** `project-migration` erwartete den alten Erklärungssatz «nur heruntergeladen». Er prüft jetzt den aktuellen Download-/Browserhinweis und zusätzlich die Aktion «MKW-Datei herunterladen». Echte Migration, projektübergreifende Asset-Bereinigung, kein automatischer Download und genau ein expliziter MKW-Download bleiben unverändert Prüfgegenstand.

Der neue Schulungstest ist auch in der expliziten Firefox-Liste enthalten. Das lokale Firefox-Startproblem wurde nicht durch Änderungen an App oder Tests umgangen.

Nach den Korrekturen ist der gemeinsame Lauf aller sechs genannten Suiten erfolgreich. `seven-perspectives` prüfte dabei 42 reale Kontexte ohne automatische Zugänglichkeitsbefunde. Formatprüfung, Build, 237 Modelltests und `git diff --check` sind ebenfalls erfolgreich. Der anfängliche Fehlerlauf bleibt als Reproduktionsnachweis gespeichert; er wird nicht als erfolgreiche Prüfung gezählt.
