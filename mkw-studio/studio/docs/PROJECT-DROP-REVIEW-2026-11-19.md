# MKW-Ablagefeld und neue Dateiformat-Priorität · 19. November 2026

Ausgang der Zusatzaufträge: `05c97619e749ea3135ef6e97f8144d10790b6434`. Der Nutzer hat während der Bereinigungsabnahme zusätzlich die hoch priorisierte `.design`-Planung und ein sofort nutzbares MKW-Drop-Feld angefordert.

## Tatsächlich umgesetzt

- Im Dialog **Projekt öffnen** ist die vorhandene Dateiauswahl jetzt ein sichtbares Material-3-Ablagefeld: „MKW-Datei öffnen – Hier ablegen oder Datei auswählen“. Auch die Startkarte **Projekt öffnen** nimmt eine abgelegte MKW-Datei direkt an. Klick, Enter und Leertaste bleiben nutzbar.
- Genau eine `.mkw`-Datei, einschliesslich grosser/kleiner Schreibweise der Endung. Vorhandene JSON-, gzip- und MKWBLK1-Leser übernehmen Inhalt und Prüfung. Keine neue Dateiparser- oder Restore-Implementierung. Bilder ausserhalb der Projektziele gehen weiterhin an den vorhandenen Bildimport; Bilder/mehrere Dateien auf dem Projektfeld werden verständlich abgewiesen.
- Bestehender Schutz für ungesicherte Änderungen, Projektidentität, Browserkopien und Dateiverknüpfungen bleibt massgeblich. Vor gültigem Wechsel wird das bisherige Projekt gesichert. Beschädigte Dateien ersetzen es nicht. Drop erteilt keine stille Überschreibberechtigung für die Quelldatei. Während des Öffnens werden weitere Drops nicht eingereiht; danach ist das Feld wieder bedienbar.
- Sichtbare Drag-Markierung ohne Layoutsprung; Kinderwechsel flackern nicht, Escape/Dragende/Blur räumen auf. Fehler bleiben im richtigen Start-/Öffnen-Kontext sichtbar, danach Fokus zurück zum Feld. Der absichtlich gesperrte Begrüssungszustand wird von tatsächlich laufenden Öffnungs-/Einrichtungsaktionen unterschieden.
- `project-dialogs.js/.css` besitzt Darstellung und UI-Delegation. `project-session.js` liefert Verfügbarkeit, bestehenden Öffner und Fehlerweg. Registrierung erfolgt erst nach Initialisierung des Dialogmoduls; keine Veränderung der bisherigen Speicher- oder Dokumentmodelle. `start-home.js` und Hilfe erklären den neuen Weg.

## Neu geplant, noch nicht implementiert

**N01 / P1: `.design` als zukünftiges natives Projektformat** steht mit Ist-Analyse, Komponentenübersicht, Architektur und sieben Abnahmestufen direkt im [Masterplan](MASTERPLAN.md). Keine zweite aktive Prioritätenliste.

Ziel: ZIP-Container, SQLite-Projektdaten, binäre deduplizierte Assets, Manifest und getrennte Vorschauen. Verlustfreier MKW-Import, Lazy Loading, Transaktionen, inkrementelle Speicherwege, Integrität, Versionsmigrationen, Recovery und macOS/Windows sind eingeplant. Bestehende native MKW-Binär-/Schreibplanmechanismen werden berücksichtigt. Arbeitsdatenbank und atomarer ZIP-Snapshot werden getrennt; vollständiges ZIP-Neupacken zählt nicht als bestandener inkrementeller ZIP-Pfad. Zunächst Machbarkeits-/Messnachweis im statischen Browserbetrieb, kein voreiliger Standardwechsel. Keine SQLite-Abhängigkeit oder `.design`-Laufzeitfunktion in diesem Commit eingebaut. MKW-Lesbarkeit und bisherige Funktionen bleiben erhalten.

## Prüfung und sechs Personas

Lokal: **217 Modell-/Pakettests**, Formatierung, Build und Formatprüfung. Browserfälle `project-file-drop`, `project-open`, `project-dialogs`, `material-start`, `material-workflow`, `dialog-layout`, `material-paint-wiki` und `footer-messages` bestanden.

Der neue Fall verwendet File/DataTransfer-Browserereignisse und tatsächlich erzeugte MKW-Dateien aller drei Leserwege. Keine Ersetzung des Öffners/Decoders. Geprüft: ungültige/beschädigte/mehrere Dateien, ungesicherter Ursprung, Wiederholung während laufendem Öffnen, Tastatur Enter/Leertaste, Fokus, kein Download, keine stille Quelldatei-Verknüpfung, Hell/Dunkel und 1500-/780-Pixel-Fenster. Feld visuell in beiden Themes geprüft. Kein manueller Finder-/Explorer-Drag oder physischer Touchtest behauptet.

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Erkennbares Ziel für Projektdateien und verständliche Fehler | Gelöst: beschriftetes Feld und Startkarte |
| Erfahrener Designer | Schneller Dateiwechsel, alte Projekte und ungesicherte Arbeit schützen | Gelöst im geprüften Öffnungsablauf; N01 noch geplant |
| Senior UX-Experte | Ein Öffnungsprozess statt parallelem Import; klare Abbruch-/Busy-Zustände | Gelöst: bestehender Session-Weg und Wiederholungsschutz |
| UI-Expertin | Kohärentes platzsparendes M3-Feld mit sichtbarem Fokus/Drag-/Fehlerzustand | Gelöst und visuell in Hell/Dunkel geprüft |
| QA-Entwicklerin | Alle bisherigen MKW-Leser und Datei-/Versionsschutz wiederverwenden | Gelöst; echte Codec-/Browserregressionen bestanden |
| Destruktiver Fehlersucher | Mehrfachdrop, Fremdformat und defekte Datei dürfen keine halbe Mutation auslösen | Geprüfte Fälle gelöst; neue `.design`-Robustheit bleibt N01-Abnahme |

Expertenprüfung, keine Nutzerstudie. Im ersten Bereinigungs-CI-Lauf 44488529697 scheiterte ein bestehender Firefox-Menüfall an einem noch geöffneten Hinweis-Popup. Der Menütest schliesst es jetzt über den unterstützten Escape-Weg und prüft „versteckt“, bevor er das Ebenenmenü bedient. Der echte Schliessen-Klick wird zusätzlich separat in `footer-messages` geprüft. Keine Menü-, Kontrast- oder Dateiassertions entfernt.

## Veröffentlichung

Der endgültige Code `742102e` ist veröffentlicht. [GitHub-Prüfung](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44498195214) und [GitHub Pages](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44498194562) bestanden. Die Schlussprüfung umfasst 217 Modelltests, 123 Chrome- und 108 Firefox-Suiten. Beide gezielten Live-Fälle bestanden. Laufzeit-HTML, JavaScript, CSS und Hilfe sind bytegleich zum geprüften Code. Die zuvor elf gelöschten Quellarchive bleiben gelöscht; der anschliessende Nutzerauftrag verändert die Laufzeit gezielt um das Drop-Feld. Die Bytegleichheit des ursprünglichen reinen Archivschritts bezieht sich auf `05c9761`, nicht auf diesen neuen UI-Stand.

### Beschriftungskorrektur im vollständigen Endlauf

Der erste vollständige Drop-Lauf 44494795963 fand in beiden Browsern `label-content-name-mismatch`: Ein verkürztes `aria-label` überlagerte die neue sichtbare Hilfszeile. Das Feld verwendet jetzt seinen vollständigen nativen sichtbaren Buttonnamen; keine doppelte Beschreibung, keine abweichende zugängliche Beschriftung. Die unveränderte `seven-perspectives`-Prüfung besteht lokal in allen 42 Kontexten, ebenso der Drop-Fall und 217 Modelltests. Der korrigierte vollständige CI- und Live-Nachweis ist oben dokumentiert.
