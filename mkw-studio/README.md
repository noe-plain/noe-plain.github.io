> **GitHub Pages:** Das Studio läuft jetzt auch ohne Python direkt im Browser. Veröffentlichung, Speicherung und Unterschiede zur lokalen Version: [GITHUB-PAGES.md](GITHUB-PAGES.md). Die folgenden Angaben zu TIFF, EXIF und Pillow beziehen sich auf die lokale Python-Version.

# MKW Sujet Studio · Version 2

Ein lokales Tool mit einer gemeinsamen Arbeitsfläche für alle Sujets. Die fünf Schritte stehen als Icons in der unteren Leiste. Bilder, Schriften, Projekte und Exporte bleiben auf deinem Mac. Alle Laufzeitressourcen sind lokal enthalten.

## Start

**`Start.command` im Finder doppelklicken.** Anschliessend http://127.0.0.1:8765 öffnen, falls sich der Browser nicht automatisch öffnet. Das Terminalfenster während der Arbeit geöffnet lassen; zum Beenden dort Ctrl+C drücken.

Die Python-Umgebung ist auf diesem Mac bereits eingerichtet. macOS kann beim ersten Öffnen einen Rechtsklick → Öffnen verlangen. Für den normalen Betrieb sind weder npm noch eine Internetverbindung nötig.

## Die fünf Schritte

1. **Bild-Icon:** Mehrere Bilder auswählen oder ins Fenster ziehen. Pro Bild entstehen Quadrat und Story nebeneinander. Danach ist automatisch die Textbearbeitung aktiv.
2. **Text-Icon:** Direkt in Titel, Datum, Untertitel oder Copyright klicken und schreiben. Es öffnet sich kein Eingabedialog. Leere Felder zeigen nur während der Bearbeitung Platzhalter; diese werden nicht exportiert. Datum, Titel und Untertitel stehen in einer gemeinsamen Box; ihr ↕-Griff verschiebt nur diesen Block und nur vertikal. Das Copyright steht fest und vertikal im rechten Rand. Schriftgrösse, Farbe, Ausrichtung und Sichtbarkeit stehen im kleinen Einstellungsfeld über der Leiste.
3. **Ausschnitt-Icon:** Bild anklicken und verschieben. An einer tatsächlichen Bildecke ziehen: Die gegenüberliegende Ecke bleibt fest, das Original-Seitenverhältnis bleibt erhalten. Die Regler unten verändern das Bild; der Zoom rechts unten verändert nur die Ansicht. „Mehr“ enthält Drehung, Spiegelung und Hintergrundfarbe.
4. **Logo-Icon:** Schwarz, Weiss oder ein eigenes Logo wählen. Die Auswahl gilt für beide Formate des Bildes. Das Logo sitzt fest oben rechts in der Safe-Zone und ist 650 px breit. Nur bei zu kleinen freien Formaten wird es passend verkleinert. „Auf alle übertragen“ übernimmt es für alle Bilder.
5. **Export-Icon:** Fertige Bildvorschauen prüfen, Sujets ankreuzen und die Dateinamen kontrollieren. Danach als ZIP herunterladen oder über den macOS-Dialog in einen Zielordner speichern.

### So verhalten sich die Texte

- Das erste Bild in der Arbeitsfläche ist die gemeinsame Textvorlage.
- Änderungen dort gelten für alle Bilder, die für dieses Textfeld noch keine eigene Anpassung haben.
- Änderungen an einem anderen Bild gelten nur für dieses Bild, aber **für beide Formate** und auch seine zusätzlich erstellten Zeichenflächen.
- Ein individuell angepasster Text bleibt bei späteren Vorlagenänderungen erhalten. „Vorlagentext verwenden“ verknüpft dieses Feld wieder mit dem ersten Bild.
- Nur der Textinhalt wird gemeinsam geführt. Die vertikale Position der gemeinsamen Textbox und ihre Gestaltung können je Zeichenfläche unterschiedlich bleiben. Die X-Position ist durch die Schutzzone festgelegt.
- Die Titelgrösse wird auf alle Zeichenflächen mit demselben Titel übertragen. Datum und Untertitel bilden eine gemeinsame Grössengruppe: Eine Änderung an einem der beiden Felder setzt beide auf denselben Wert. Copyright-Grössen folgen allen Zeichenflächen mit identischem Copyright-Text.
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

Datum, Titel und Untertitel bilden **eine gemeinsame Textbox**, genau zwischen dem linken und rechten sicheren Rand. Sie sitzt zunächst auf dem unteren sicheren Rand. Nur die Box kann über ihren ↕-Griff verschoben werden, ausschliesslich auf der Y-Achse. Das Copyright wird automatisch um −90° gedreht, mittig zwischen dem rechten Rand der Safe-Zone und der rechten Bildkante gesetzt und mit seinem unteren Ende an der unteren Safe-Zone-Kante ausgerichtet. Es hat keinen Verschiebegriff. Unter jedem Bilddateinamen steht ein Copyright-Feld. Die Eingabe gilt für alle Formate dieses Bildes; andere Bilder behalten ihren eigenen Eintrag. Ein leerer Eintrag blendet das Copyright aus. Die sichtbaren Buchstaben sind an der unteren Safe-Zone-Kante ausgerichtet.

Lange Zeilen werden automatisch an Wörtern umgebrochen; sehr lange Einzelwörter werden ebenfalls geteilt. Wenn der gesamte Text sonst die sichere Höhe überschreitet, verkleinert das Tool alle Schriftgrössen gemeinsam, ohne Text zu entfernen. Die angeforderten Schriftgrössen bleiben gespeichert, damit sie bei kürzerem Inhalt wieder verwendet werden können.

Ein schwarzer Verlauf bleibt von der unteren Bildkante bis zur Grundlinie der ersten Konzerttitelzeile gleich dunkel. Von dort läuft er nach oben aus und ist 50 px oberhalb des obersten sichtbaren Textes vollständig transparent und wird mit **Multiplizieren und maximal 42 % Deckkraft** angewendet. Seine Position folgt dem Text. Das Logo behält seinen Konturschatten mit 28 % Deckkraft, 125 px Weichzeichnung und 4 px Abstand nach unten. Die Hilfslinien erscheinen weder in JPG noch in PSD. PSD enthält den Verlauf als eigene multiplizierende Ebene.

Neue Projekte starten mit **104 px Titelgrösse**, **52 px für Datum und Untertitel** und **32 px Copyright**. Bestehende Schriftgrössen bleiben erhalten; zu langer Text wird weiterhin automatisch passend umbrochen beziehungsweise verkleinert.

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

Die bereitgestellten Schriften **Replica LL Bold**, **Harriet V2 Text Regular**, **Harriet Text Bold** und **Harriet Text Bold Italic** sind lokal eingebunden und funktionieren nach der Installation offline. Copyright verwendet standardmässig Harriet V2 Text Regular; Harriet Bold Italic steht zusätzlich in der Schriftauswahl. Weitere OTF-, TTF-, WOFF- und WOFF2-Dateien lassen sich im Textschritt importieren. Für Photoshop müssen die verwendeten OTF-/TTF-Schriften auch lokal installiert sein.

## Dateinamen und JPG

Datumseingabe `TT.MM.JJ`, Ausgabe ausschliesslich **JJMMTT**: `15.11.26 → 261115`. Echte Kalendertage werden geprüft, zweistellige Jahre als 2000–2099 interpretiert. Beim Bildimport liest das Studio zuerst das EXIF-Aufnahmedatum samt Wochentag. Fehlt es, wird ein führendes JJMMTT aus dem Dateinamen erkannt. Für sämtliche Exportnamen gilt ausschliesslich das im Exportdialog eingetragene Konzertdatum. Bilddaten aus EXIF oder Originaldateinamen dienen nur zur Information und beeinflussen den Exportnamen nicht. Ein fehlendes oder ungültiges Konzertdatum verhindert den Export.

Projektkürzel und Projektname lassen sich jederzeit direkt in der oberen Leiste eintragen. Die Werte erscheinen automatisch im Exportdialog und werden mit dem Projekt gesichert.

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
- Automatische Wortumbrüche und manuelle Zeilenumbrüche werden unterstützt. Zu hoher Haupttext wird gemeinsam passend verkleinert; das Tool zeigt eine Warnung. Datum, Titel, Untertitel und Logo bleiben innerhalb der Safe-Zone, während das Copyright im dafür vorgesehenen rechten Rand steht.
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
npm test
```

Der Browser-Test `tests/studio.cjs` verwendet ausschliesslich Port 8876. Dafür separat starten:

```sh
MKW_PORT=8876 MKW_DATA_DIR=/private/tmp/mkw-v2-tests .venv/bin/python server.py --no-browser
```

Zum Entwickeln: `npm install`, optional `npm install --no-save playwright`, dann `node tests/studio.cjs`. Google Chrome unter `/Applications` wird erwartet. Der Browser-Test ersetzt **nur die Testdaten auf Port 8876**. Ein vorhandener Playwright-Paketpfad lässt sich über `PLAYWRIGHT_PATH` angeben. Zum erneuten Bauen der mitgelieferten PSD-Bibliothek: `npm run build:psd`.

Die Textgestaltung verwendet 100 % Zeilenhöhe und 8 px Abstand zwischen Datum, Titel und Untertitel (bei 1080 px Bildbreite). Vorschau und Exporte verwenden dieselben Abstände.

Beim ersten Öffnen älterer Projekte wird Copyright bis zur bisherigen Standardgrösse von 24 px einmalig auf 32 px angehoben. Danach bleibt die Grösse frei einstellbar.

Copyright-Angaben ohne © erhalten das Zeichen automatisch vorangestellt. Ein vorhandenes © bleibt an seiner Position, auch nach einer Bildbeschreibung. Leere Namen bleiben unsichtbar. Bestehende Projekte werden einmalig auf Harriet V2 Text Regular umgestellt.

## Familienkonzerte

Im Menü „Textarten auswählen“ unterhalb der Trennlinie „Familienkonzert“ aktivieren. Der Modus verwendet einen einfarbigen Hintergrund ohne Verlauf. Die Zeichenflächenfarbe lässt sich in der Seitenleiste unter „Bildausschnitt“ direkt auswählen. Für freigestellte Illustrationen transparente PNG- oder WebP-Dateien importieren. Positionen von Logo und Text bleiben erhalten; beim Wechsel zurück wird der ursprüngliche Bildausschnitt wiederhergestellt.

Die acht Buchstabenfarben haben dieselbe OKLCH-Helligkeit (0,72), mit für sRGB begrenzter Farbsättigung. Sichtbare Zeichen wechseln durch die Palette, ohne direkt wiederholte Farben. Eine dunkle 2-px-Kontur verbessert die Lesbarkeit. Die Farbreihenfolge lässt sich wechseln. Die PSD-Datei enthält weiterhin editierbare Texte mit einzelnen Farbläufen.

Änderungen am ersten Bild gelten auch für die weiteren Bilder und neue Importe. Pro Bild geänderte Einstellungen bleiben individuell; „Design vom ersten Bild übernehmen“ setzt sie zurück. Die Texte verwenden weiterhin die bestehende gemeinsame Texteingabe und individuelle Anpassungen. Die Oberfläche verwendet die mitgelieferten MKW-Schriften Replica LL und Harriet.
