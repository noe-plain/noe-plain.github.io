# Musikkollegium Winterthur · MKW Studio

Einzelposts und zusammenhängende Carousel-Posts direkt im Browser gestalten. Auf [GitHub Pages](https://noe-plain.github.io/mkw-studio/studio/) ohne Installation nutzbar. Bilder, Projekte und importierte Schriften werden auf dem Gerät verarbeitet.

## Einrichten und gestalten

Neues Projekt benennen, Einzelposts oder Carousel wählen und Formate/Schutzzonen bestimmen. Bei Einzelposts sind 9:16 und 1:1 vorausgewählt; 4:5, 1080 × 1440 und eigene Formate sind zusätzlich verfügbar. Importierte Bilder erhalten ein weisses MKW-Logo und, soweit die lokale Personenerkennung verfügbar ist, einen passenden Ausschnitt.

Das erste Bild trägt die Kennzeichnung **Textvorlage für weitere Bilder**. Seine Texte und Textarten folgen auf weitere Bilder, solange diese keine eigene Anpassung haben. Verknüpfungen lassen sich im Textbereich wiederherstellen. Ausschnitte, Familienkonzert-Design und einzelne Formate bleiben anpassbar.

Im Carousel lassen sich Bildrahmen, Bildwinkel, Texte und Verläufe frei anordnen. Doppelklick auf ein Bild bearbeitet seinen Inhalt. Der Advanced-Modus ergänzt Pfade, Kurven, Formen und Formkonstrukteur. Hilfslinien, Einrasten, Deckkraft und Mischmodi helfen beim Gestalten. Das MKW-Logo bleibt zuoberst.

## Sicher speichern

**Projekt öffnen** im Header oder Startbildschirm öffnet die gemeinsame Auswahl für MKW-Dateien und Browsersicherungen. Jedes Projekt besitzt eine eigene Browsersicherung. Mehrere Tabs werden nicht live synchronisiert: Bei konkurrierenden Änderungen wird eine separate Konfliktkopie gesichert, anstatt einen Stand zu überschreiben.

**Projekt speichern** verknüpft in Browsern mit Dateizugriff eine MKW-Datei. Weitere manuelle und automatische Sicherungen aktualisieren diese Datei, solange Zugriff besteht und sie extern unverändert ist. **Speichern unter …** legt bei einem neuen Ziel eine eigenständige Projektkopie an. Cmd/Ctrl+S speichert; Shift+Cmd/Ctrl+S öffnet „Speichern unter …“.

Browser ohne Dateizugriff sichern automatisch ausschliesslich im Browser. Ein MKW-Download wird dort nur ausdrücklich ausgelöst. Wichtige Projekte zusätzlich als MKW-Datei sichern: Das Löschen von Browserdaten entfernt auch die Browsersicherungen. In der Projektübersicht lassen sich nicht aktive Browsersicherungen löschen; Dateien auf dem Gerät bleiben erhalten.

MKW enthält nur verwendete Bilder, Logos und Schriften. Gelöschte Elemente und die bis zu 30 Schritte umfassende Sitzungshistorie werden nicht mitgeschrieben; ausgeblendete Elemente bleiben erhalten. Das vollständige normalisierte PNG-Arbeitsbild ersetzt die frühere doppelte Speicherung von Rohoriginal und Arbeitsbild. Alte MKW-Dateien bleiben lesbar.

**Speichern unter …** öffnet in Browsern mit Dateizugriff immer die Auswahl für Ordner und Dateiname, auch bei bereits verknüpften Dateien. In Browsern ohne diese Funktion wird der Speicherort durch die Download-Einstellungen des Browsers bestimmt; dort lässt sich die Nachfrage vor jedem Download aktivieren.

## Einstellungen und Export

Darstellung, Hilfslinienfarben, Einrastabstand, Advanced-Modus, Schriftbibliothek, Standard-Zeilenhöhe und Exportvorgaben gelten für das Tool auf diesem Gerät. Eine neue Standard-Zeilenhöhe wirkt nur auf künftig erstellte Texte.

JPG, PNG, PNG-8, WebP und Carousel-PDF sind verfügbar. Der Export zeigt Vorschauen, Dateigrössen, Auswahl und Fortschritt. **Exportvorschau** zeigt die gewählten Ergebnisse gross. PDFs haben eine Seite pro Slide und auswählbaren/durchsuchbaren Text; das sichtbare Artwork ist gerastert. PSD enthält bearbeitbare Texte und Slide-Slices. Einfache solide Vektorformen bleiben nativ; komplexe Pfadfüllungen enthalten eine Rasterdarstellung plus separat erhaltenen Pfad.

Datum ist optional. Ohne Datum erscheint ein Hinweis und der Datumspräfix entfällt. Ein eingegebenes Datum muss `TT.MM.JJ` entsprechen. Ein eindeutig erkennbares Datum im Übertitel kann übernommen werden. Dateinamen folgen `JJMMTT_Kürzel_Projektname_Format_Nummer`; MKW und PDF verwenden den gemeinsamen Projektnamen ohne Format/Nummer.

## Projekte öffnen

**Projekt öffnen** auf der Startseite oder im Header führt zu einer gemeinsamen Ansicht. Dort kannst du eine **MKW-Datei öffnen** oder eines der **in diesem Browser** gesicherten Projekte auswählen. Browsersicherungen lassen sich dort auch löschen; die MKW-Datei auf deinem Gerät bleibt erhalten.

## Entwicklung

```sh
npm ci
npm run format
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Für Anwender ist dies nicht erforderlich. Architektur, Modulzuständigkeiten, Speichervertrag und Exportgrenzen stehen in [ARCHITECTURE.md](ARCHITECTURE.md). GitHub-Pages-Hinweise: [GITHUB-PAGES.md](GITHUB-PAGES.md).

Der optionale lokale Python-Server über `Start.command` unterstützt zusätzlich TIFF, EXIF und Pillow-Farbkonvertierung. Die Projektverwaltung verwendet auch dort die neue Browsersicherung und explizit verknüpfte MKW-Dateien. TIFF lässt sich online vorab in PNG/JPG umwandeln. Bilder maximal 100 MB / 80 Mio. Pixel; PSD maximal 30 000 px je Seite / 80 Mio. Gesamtpixel. Grosse Projekte bleiben durch den Arbeitsspeicher und die Browser-Speicherquote begrenzt.
