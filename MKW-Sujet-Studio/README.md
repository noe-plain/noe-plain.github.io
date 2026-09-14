# MKW Sujet Studio · Version 2

Ein lokales Tool mit einer gemeinsamen Arbeitsfläche für alle Sujets. Die fünf Schritte stehen als Icons in der unteren Leiste. Bilder, Schriften, Projekte und Exporte bleiben auf deinem Mac. Alle Laufzeitressourcen sind lokal enthalten.

## Start

**`Start.command` im Finder doppelklicken.** Anschliessend http://127.0.0.1:8765 öffnen, falls sich der Browser nicht automatisch öffnet. Das Terminalfenster während der Arbeit geöffnet lassen; zum Beenden dort Ctrl+C drücken.

Die Python-Umgebung ist auf diesem Mac bereits eingerichtet. macOS kann beim ersten Öffnen einen Rechtsklick → Öffnen verlangen. Für den normalen Betrieb sind weder npm noch eine Internetverbindung nötig.

## Die fünf Schritte

1. **Bild-Icon:** Mehrere Bilder auswählen oder ins Fenster ziehen. Pro Bild entstehen Quadrat und Story nebeneinander. Danach ist automatisch die Textbearbeitung aktiv.
2. **Text-Icon:** Direkt in Titel, Datum, Untertitel oder Copyright klicken und schreiben. Es öffnet sich kein Eingabedialog. Leere Felder zeigen nur während der Bearbeitung Platzhalter; diese werden nicht exportiert. Alle Texte stehen in einer gemeinsamen Box. Ihr ↕-Griff verschiebt nur den gesamten Block und nur vertikal. Schriftgrösse, Farbe, Ausrichtung und Sichtbarkeit stehen im kleinen Einstellungsfeld über der Leiste.
3. **Ausschnitt-Icon:** Bild anklicken und verschieben. An einer tatsächlichen Bildecke ziehen: Die gegenüberliegende Ecke bleibt fest, das Original-Seitenverhältnis bleibt erhalten. Die Regler unten verändern das Bild; der Zoom rechts unten verändert nur die Ansicht. „Mehr“ enthält Drehung, Spiegelung und Hintergrundfarbe.
4. **Logo-Icon:** Schwarz, Weiss oder ein eigenes Logo wählen. Die Auswahl gilt für beide Formate des Bildes. Das Logo auf der Fläche verschieben und am Griff skalieren. „Auf alle übertragen“ übernimmt es für alle Bilder.
5. **Export-Icon:** Fertige Bildvorschauen prüfen, Sujets ankreuzen und die Dateinamen kontrollieren. Danach als ZIP herunterladen oder über den macOS-Dialog in einen Zielordner speichern.

### So verhalten sich die Texte

- Das erste Bild in der Arbeitsfläche ist die gemeinsame Textvorlage.
- Änderungen dort gelten für alle Bilder, die für dieses Textfeld noch keine eigene Anpassung haben.
- Änderungen an einem anderen Bild gelten nur für dieses Bild, aber **für beide Formate** und auch seine zusätzlich erstellten Zeichenflächen.
- Ein individuell angepasster Text bleibt bei späteren Vorlagenänderungen erhalten. „Vorlagentext verwenden“ verknüpft dieses Feld wieder mit dem ersten Bild.
- Nur der Textinhalt wird gemeinsam geführt. Die vertikale Position der gemeinsamen Textbox und ihre Gestaltung können je Zeichenfläche unterschiedlich bleiben. Die X-Position ist durch die Schutzzone festgelegt.
- Neue Bilder übernehmen die aktuellen Vorlagentexte. Zusätzliche Zeichenflächen übernehmen die Texte ihres Bildes.
- Beim Öffnen älterer MKW-Projekte werden abweichende Bildtexte als individuelle Anpassungen übernommen.

### Arbeitsfläche

Alle Zeichenflächen befinden sich in derselben scrollbaren Arbeitsfläche. Über „•••“ bei einer Fläche lassen sich Ausgabegrösse, weitere Formate, Duplizieren, Reihenfolge und Löschen erreichen. Die kleinen Icons bei einem Bild erlauben Ersetzen, Umsortieren, Hinzufügen und Entfernen.

Freie Abmessungen und 1:1, 9:16 sowie 4:5 sind verfügbar. „Fläche ändern“ behält den Bildmassstab bei; „Layout proportional skalieren“ skaliert das gesamte Layout mit dem kleineren Achsenfaktor und zentriert es. Bei unterschiedlichen Seitenverhältnissen kann zusätzlicher Hintergrund entstehen. Die Originalbilder werden nicht verändert.

Rückgängig/Wiederholen: Pfeile oben oder Cmd+Z / Cmd+Shift+Z. Textfelder verwenden während der Eingabe ihren eigenen Undo-Verlauf. Bis zu 30 abgeschlossene Bearbeitungsschritte werden für die laufende Sitzung gehalten.

## Schutzzonen und Textbox

| Format | Oben | Rechts | Unten | Links |
| --- | ---: | ---: | ---: | ---: |
| 1080 × 1080 / 1x1 | 100 px | 100 px | 200 px | 100 px |
| 1080 × 1920 / 9x16 | 200 px | 100 px | 500 px | 100 px |

Die gestrichelte Linie zeigt den erlaubten Bereich an. Text und Logo können diesen Bereich nicht verlassen, auch nicht beim Skalieren. Das Hintergrundbild bleibt formatfüllend. Für andere Formate gelten die Quadratabstände, proportional zur Breite; 9x16 verwendet immer die Story-Abstände.

Datum, Titel, Untertitel und Copyright bilden **eine gemeinsame Textbox**, genau zwischen dem linken und rechten sicheren Rand. Sie sitzt zunächst auf dem unteren sicheren Rand. Nur die Box kann über ihren ↕-Griff verschoben werden, ausschliesslich auf der Y-Achse. Einzelne Texte haben keine Verschiebegriffe mehr. Ein noch leeres Textfeld lässt sich über die Textauswahl unten aktivieren und anschliessend direkt in der Box ausfüllen.

Lange Zeilen werden automatisch an Wörtern umgebrochen; sehr lange Einzelwörter werden ebenfalls geteilt. Wenn der gesamte Text sonst die sichere Höhe überschreitet, verkleinert das Tool alle Schriftgrössen gemeinsam, ohne Text zu entfernen. Die angeforderten Schriftgrössen bleiben gespeichert, damit sie bei kürzerem Inhalt wieder verwendet werden können.

Text und Logo erhalten jeweils einen dezenten schwarzen Konturschatten mit **Multiplizieren**, **28 % Deckkraft**, **18 px Weichzeichnung** und **4 px Abstand nach unten**. Der Schatten folgt den Buchstaben beziehungsweise der Logoform und erzeugt keine rechteckige Fläche. Die Hilfslinien erscheinen weder in JPG noch in PSD. PSD enthält eine gemeinsame Text-Ebenengruppe und separate multiplizierende Schattenebenen.

Alte Projekte erhalten beim Öffnen automatisch das neue sichere Layout. Ihre Originaldateien und Texte bleiben erhalten. Die Sicherung vor dieser Änderung liegt unter `backups/Projekt-vor-Schutzzonen.mkw`.

## Speichern: PSD und MKW

Das Speicher-Icon oben bietet zwei Dateitypen:

**Photoshop-Datei (.psd)**

- Alle Zeichenflächen des Projekts, unabhängig von der JPG-Auswahl.
- Echte Photoshop-Zeichenflächen in den festgelegten Pixelabmessungen.
- Bearbeitbare Textebenen.
- Eingebettete Bild-Smartobjekte mit dem vollständigen, nach sRGB normalisierten Arbeitsbild; Ausschnitte bleiben in Photoshop weiter veränderbar.
- Separate Logo- und Hintergrundebenen. Logos werden als Pixelebenen gespeichert.
- Eingebettetes sRGB-Farbprofil und Gesamtvorschau.

**Studio-Projekt (.mkw)**

Zum Wiederöffnen **in diesem Tool**. Enthält unveränderte Originaldateien, Arbeitsbilder, lokale Schriftdateien, Logos, Ausschnitte und sämtliche Einstellungen. Die automatische lokale Sicherung bleibt ebenfalls MKW.

PSD ist das Austauschformat für Photoshop; PSD-Import ins Studio ist nicht implementiert. Zum Weiterarbeiten hier zusätzlich MKW speichern. Photoshop bettet die Schriften nicht als nutzbare Fonts in die PSD ein; die verwendeten Schriftdateien müssen dort lokal installiert sein. Beim Aktualisieren von Textebenen kann Photoshop deren Darstellung neu berechnen.

### Automatische Sicherung und vorhandenes Projekt

Nach einer kurzen Bearbeitungspause wird `lokale-daten/autosave.mkw` gespeichert. Beim nächsten Öffnen erscheint der letzte Stand. Vor dem Schliessen den Speicherstatus abwarten. Nur ein Browserfenster gleichzeitig bearbeiten; mehrere Tabs werden nicht synchronisiert.

Dein Projekt vor der Überarbeitung wurde zusätzlich unter `backups/Projekt-vor-Vereinfachung.mkw` gesichert. Diese private Sicherung ist **nicht** im Quellcode-ZIP enthalten.

## Schriften

Die bereitgestellte **Replica LL Bold** ist lokal eingebunden. **Harriet fehlt noch**; bis zum Import wird Georgia als Ersatz angezeigt und verwendet. Schriftimport im Textschritt unter „Schriften“. OTF, TTF, WOFF und WOFF2 werden im Tool unterstützt. Für Photoshop ist eine lokal installierbare OTF-/TTF-Schrift mit passendem PostScript-Namen erforderlich.

## Dateinamen und JPG

Datumseingabe `TT.MM.JJ`, Ausgabe ausschliesslich **JJMMTT**: `15.11.26 → 261115`. Echte Kalendertage werden geprüft, zweistellige Jahre als 2000–2099 interpretiert.

```text
261115_E2_Dichterlos_9x16_3.jpg
```

Das Format wird aus den tatsächlichen Pixelmassen berechnet. Die Nummerierung beginnt mit der eingegebenen ganzen Startnummer und folgt der sichtbaren Reihenfolge der ausgewählten Sujets. Ungültige Dateizeichen werden bereinigt; sämtliche resultierenden Namen erscheinen im Exportdialog.

JPG wird immer mit **Qualität 100**, 4:4:4-Farbabtastung und sRGB-Profil geschrieben, in den exakten Ausgabemassen. Transparenz wird mit dem gewählten Hintergrund gefüllt. Bestehende JPG-Dateien im Zielordner werden ausgelassen und als Konflikt gemeldet, niemals still überschrieben. JPEG bleibt technisch verlustbehaftet.

## Technische Grenzen

- Import: JPG/JPEG, PNG, TIFF/TIF und WebP, maximal 100 MB pro Original und 80 Millionen Pixel. EXIF-Ausrichtung und ICC-Profile werden berücksichtigt. Ohne Profil wird sRGB angenommen; unlesbare Profile werden abgewiesen.
- TIFF: erste Seite, 8-Bit-sRGB-Arbeitsbild. Kein RAW/HDR oder mehrseitiger TIFF-Editor.
- Ausgabe: 16–10000 px je Seite und maximal 40 Millionen Pixel pro Zeichenfläche.
- PSD: maximal 30000 px je Seite des Gesamtdokuments und 80 Millionen Pixel insgesamt. Grosse PSDs benötigen viel Arbeitsspeicher und können länger dauern.
- MKW speichert Originale und Arbeitsbilder als Base64. Grosse Projekte brauchen entsprechend Speicherplatz; Serveranfragen sind auf 600 MB begrenzt.
- Automatische Wortumbrüche und manuelle Zeilenumbrüche werden unterstützt. Zu hoher Text wird gemeinsam passend verkleinert; das Tool zeigt eine Warnung. Texte und Logos bleiben innerhalb der Schutzzone.
- Eigene SVG-Logos müssen eigenständig sein; externe SVG-Ressourcen werden nicht geladen.
- Getestete Umgebung: Chrome und Photoshop 2026 auf diesem Mac. Einzelheiten in `TESTBERICHT.md`.

## Auf einem anderen Mac installieren

Den Projektordner ohne `.venv`, private `lokale-daten` und `backups` kopieren oder das Quellcode-ZIP entpacken. Python 3.9+ muss vorhanden sein. `Start.command` erstellt die lokale Umgebung und installiert Pillow. Der mitgelieferte Offline-Baustein passt zu Apple Silicon/macOS 11+/Python 3.9. Andere Python-Versionen bzw. Intel benötigen beim ersten Start Internet für ihren passenden Pillow-Baustein. Danach ist der Betrieb offline möglich.

Der Server hört ausschliesslich auf `127.0.0.1`. Port 8765 muss frei sein.

## Quellcode und Tests

- `server.py`: lokaler Import, EXIF/ICC, JPG-Encoder, ZIP, Ordnerdialog und Autosave.
- `static/state.js`: Projektzustand, Import, Speichern, Undo und Fonts.
- `static/layout.js`: Schutzzonen, automatische Textumbrüche und Geometrie der gemeinsamen Textbox.
- `static/renderer.js`: gemeinsames Zeichnen für Arbeitsfläche/Export und Interaktion.
- `static/studio.js`: schrittweise Oberfläche, direkte Texte und Exportvorschau.
- `static/psd.js`: echte PSD-Zeichenflächen, Textebenen und Bild-Smartobjekte.
- `static/core.js`: Datum, Dateinamen und Seitenverhältnisse.
- `static/vendor/ag-psd.js`: lokal gebündelte [ag-psd-Bibliothek](https://github.com/Agamnentzar/ag-psd), samt Lizenzen. Keine Netzwerkanfrage zur Laufzeit.

```sh
.venv/bin/python -m unittest discover -s tests -v
node --test tests/core.test.js tests/layout.test.js
```

Der Browser-Test `tests/studio.cjs` verwendet ausschliesslich Port 8876. Dafür separat starten:

```sh
MKW_PORT=8876 MKW_DATA_DIR=/private/tmp/mkw-v2-tests .venv/bin/python server.py --no-browser
```

Zum Entwickeln: `npm install`, optional `npm install --no-save playwright`, dann `node tests/studio.cjs`. Google Chrome unter `/Applications` wird erwartet. Der Browser-Test ersetzt **nur die Testdaten auf Port 8876**. Ein vorhandener Playwright-Paketpfad lässt sich über `PLAYWRIGHT_PATH` angeben. Zum erneuten Bauen der mitgelieferten PSD-Bibliothek: `npm run build:psd`.
