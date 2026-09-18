## Weicher Logoschatten

Logoschatten mit 125 px Weichzeichnung bei unveränderten 28 % Deckkraft. Vorschauzoom bei der Weichzeichnung berücksichtigt, PSD-Ebenenrand vergrössert. Zwölf Tests und Browser-/PSD-Integrationstest bestanden; kein gesonderter Pixelvergleich des Logoschattens durchgeführt.

## Konzertdatum für Exportnamen

Exportnamen verwenden ausschliesslich das eingegebene Konzertdatum. Zwölf Tests bestanden, einschliesslich abweichendem Bilddatum sowie fehlendem oder ungültigem Konzertdatum. Syntaxprüfung der Exportoberfläche bestanden. Kein erneuter JPG-Download für diese reine Benennungsänderung.

## Harriet V2 Regular, Copyright-Präfix und Verlauf

Neue lokale Schriftdatei eingebunden und internen PostScript-Namen geprüft. Elf bestehende Tests bestanden. Browser-/PSD-Test erneut bestanden, einschliesslich Harriet Regular, automatischem © für Namen ohne Zeichen und mehrfach eingegebenem ©, pixelgenauer PSD-Verlaufsebene, voller Transparenz 50 px über dem obersten Text und konstanter Dunkelheit ab der ersten Titel-Grundlinie bis zur Bildunterkante.

## Grössere Copyright-Schrift

Copyright-Standard auf 32 px erhöht. Elf Tests und Browser-/PSD-Test erneut bestanden, einschliesslich der tatsächlichen Buchstabenposition in beiden Formaten. Ältere Projekte erhalten einmalig 32 px für Copyright-Grössen bis 24 px.

## Kompaktere Texte und dunklerer Verlauf

Zeilenhöhe auf 100 %, Blockabstand auf 8 px und Verlauf auf maximal 42 % Deckkraft angepasst. Elf bestehende Tests und der Browser-/PSD-Test `tests/gradient.cjs` erneut bestanden. Screenshot geprüft.

## Nachprüfung · Verlauf bis Bildunterkante

`npm test`: 11 Tests bestanden. `tests/gradient.cjs`: Browser-Test erneut bestanden, einschliesslich 650-px-Logo, nach unten zunehmend dunklem Verlauf bis zur Bildkante, Pixelvergleich zur PSD-Verlaufsebene und Copyright-Eingabe unter dem Dateinamen für beide Formate. Wiederherstellung und PSD-Erzeugung ebenfalls bestanden. Aktualisierte Vorschau visuell geprüft.

## Ergänzung · 18. September 2026

Für diese Änderung neu ausgeführt: `npm test` (11 Tests bestanden) und `tests/gradient.cjs` im lokalen Chrome mit separatem Datenordner auf Port 8878.

- Quadrat und Story: Logo exakt 350 px breit, oben rechts innerhalb der Safe-Zone.
- Neue Standardgrössen 104 / 52 / 52 px für Titel / Datum / Untertitel.
- Copyright mit Harriet tatsächlich gerendert: sichtbare Pixel horizontal mittig im rechten Rand und unten bündig zur Safe-Zone (Antialiasing-Toleranz 2 px).
- Verlauf mit 32 % Deckkraft: normale Darstellung und exportierte PSD-Verlaufsebene pixelgenau verglichen; oben links bleibt das Testbild unbeeinflusst, im Textbereich wird es abgedunkelt.
- Copyright-Eingabefeld und Wiederherstellung nach Neuladen getestet.
- PSD erzeugt und wieder eingelesen: multiplizierender Verlauf mit 32 % Deckkraft und Copyright mit −90°-Transformation vorhanden.
- Keine Browserfehler. Screenshot `docs/Textverlauf.png` visuell geprüft.

Nicht erneut geprüft: Öffnen dieser neuen PSD in Photoshop, vollständiger JPG-Download und alle älteren Import-/Export-Sonderfälle. Die folgenden Abschnitte dokumentieren frühere Prüfungen. Bei sehr kleinen freien Formaten wird das Logo auf den verfügbaren sicheren Platz verkleinert. Bestehende Schriftgrössen werden nicht überschrieben.

# Testbericht · Version 2

11. September 2026 · lokal auf diesem Mac · Chrome, Python 3.9/Pillow 11.3 und Photoshop 2026.

## Neuer Ablauf: im Browser bestanden

Der Integrationstest `tests/studio.cjs` arbeitet auf **Port 8876 mit getrenntem Datenordner**; das vorhandene Benutzerprojekt auf Port 8765 wird nicht ersetzt.

- Zwei Bilder importiert; vier Zeichenflächen gemeinsam auf derselben Arbeitsfläche.
- Fünf Bearbeitungsschritte als reine Icons, ohne sichtbare Beschriftung der Leiste.
- Bild am tatsächlichen Eckgriff skaliert; gegenüberliegende Ecke bleibt rechnerisch unverändert, Seitenverhältnis bleibt fix.
- Rückgängig stellt die vorherige Skalierung wieder her.
- Direktes Tippen in den Titel des ersten Bildes aktualisiert alle vier Flächen.
- Direktes Tippen in den Titel des zweiten Bildes aktualisiert nur dessen beide Flächen.
- Eine spätere Änderung der Vorlage erhält den individuell überschriebenen Titel des zweiten Bildes.
- Logoauswahl und Übernahme auf alle Flächen.
- Automatische Sicherung und vollständige Wiederherstellung einschliesslich individueller Textzuordnung.
- Exportdialog enthält vier tatsächliche Bildvorschauen und korrekt nummerierte Dateinamen im Format JJMMTT.
- JPG-ZIP wurde tatsächlich heruntergeladen.
- PSD wurde tatsächlich heruntergeladen und wieder eingelesen: vier Artboards mit korrekten Rechtecken, Textebenen und vier Smartobjekt-Platzierungen mit zwei gemeinsam eingebetteten Bilddateien.
- Keine unbehandelten JavaScript-Fehler.

Zusätzliche Browserprüfungen bestätigten Copyright-Direkteingabe, Textübernahme auf zusätzliche Formate, portablen MKW-Download und einen 390 px breiten Browser ohne horizontalen Überlauf der Seite. Die gemeinsame Arbeitsfläche scrollt unabhängig.

## PSD zusätzlich in Photoshop 2026 geprüft

Die erzeugte Datei wurde lokal in Photoshop geöffnet, untersucht, als PNG gerendert und ohne Änderungen an der PSD wieder geschlossen. Andere bereits offene Dokumente wurden nicht verändert.

- Gesamtgrösse: 2260 × 3940 px.
- Vier Gruppen, jeweils mit dem tatsächlichen Photoshop-Merkmal **`artboardEnabled: true`**.
- Titel und Copyright als **`LayerKind.TEXT`**.
- Bilder als **`LayerKind.SMARTOBJECT`**.
- Logo und Hintergrund als separate Ebenen.
- Korrekte Ebenenreihenfolge und eingebettetes sRGB-Profil.
- Das von Photoshop gerenderte Bild wurde visuell geprüft und je Zeichenfläche mit der erzeugten PSD-Gesamtvorschau verglichen: mittlere absolute Abweichung je RGB-Kanal **unter 0,004 von 255**. Die Darstellung stimmt damit praktisch pixelgleich überein.

Der Test erkannte zunächst eine umgekehrte Ebenenreihenfolge. Diese wurde korrigiert und anschliessend erneut in Photoshop geprüft. `docs/Photoshop-Pruefung.txt` enthält das Ergebnis, `docs/Photoshop-Vorschau.png` eine verkleinerte Darstellung.

## Bestehende Bildverarbeitung: Regression bestanden

**11 Python-Tests** und **4 JavaScript-Tests** wurden auch nach der Überarbeitung erfolgreich ausgeführt:

- JPEG/PNG/TIFF/WebP, EXIF-Ausrichtung, Transparenz.
- ICC-Verarbeitung einschliesslich echter Lab-nach-sRGB-Konvertierung.
- Defekte Bilder und Profile werden abgewiesen.
- Exakte JPG-Abmessungen für Quadrat, Story, 4:5 und freie Grösse.
- Qualität-100-Quantisierung, 4:4:4 und sRGB-Profil.
- Autosave, ZIP, Schreibzugriffsschutz und unveränderte vorhandene Dateien bei Namenskonflikten.
- JJMMTT, echte Kalendertage, Seitenverhältnis, Namensbereinigung und Nummerierung.

## Grenzen und nicht vollständig geprüfte Fälle

- PSD dient zum Öffnen in Photoshop. PSD-Import ins Studio ist nicht implementiert; hier wird MKW geöffnet und automatisch gesichert.
- Nicht jede Kombination aus beliebiger Textdrehung, importierten Fremdschriften, freien Formaten und Smartobjekt-Transformationen wurde separat in Photoshop getestet.
- Schriftdateien werden in MKW mitgeführt, aber nicht als installierbare Fonts in PSD eingebettet. Photoshop benötigt die passenden lokal installierten Schriften. Bei Neuberechnung von Text kann es zu Schriftmetrik-Unterschieden kommen.
- Der native Zielordnerdialog wurde in Version 2 nicht erneut interaktiv geprüft. Sein unveränderter Schreibpfad und die Konfliktbehandlung sind automatisiert getestet.
- Sehr grosse PSDs, Safari, Firefox, andere Macs und parallele Bearbeitung in mehreren Browserfenstern sind nicht separat geprüft.
- Die weitere Anwendung von Photoshop-Smartobjekt-Filtern oder tiefgehende Nachbearbeitung ist nicht Teil dieser Tests.
- Details zu Speicher- und Pixelgrenzen stehen in `README.md`.

Der Bericht der vorherigen Oberfläche liegt zur Nachvollziehbarkeit unter `docs/TESTBERICHT-v1.md`.

## Ergänzung: Schutzzonen, gemeinsame Textbox und Schatten

Am 11.09.2026 zusätzlich geprüft:

- Fünf Geometrietests: exakte Schutzzonen für Quadrat und Story, feste X-Position und untere Ausrichtung der Textbox, begrenzte Y-Bewegung, Wortumbrüche einschliesslich langer Wörter, automatische gemeinsame Verkleinerung und Begrenzung gedrehter Logos.
- Browserprüfung mit separatem Testprojekt: nur ein Verschiebegriff für den Haupttext, horizontales Ziehen ohne X-Änderung, Begrenzung übergrosser Logos sowie Wiederherstellung der gespeicherten Boxposition.
- Schattenpixel geprüft: 75 % schwarze Mitte, linearer Verlauf über 100 Pixel, vollständig transparent ausserhalb des Verlaufs. Keine unbehandelten Browserfehler.
- PSD erneut eingelesen: zwei Zeichenflächen, gemeinsame Textgruppen, editierbare umgebrochene Texte und vier Schattenebenen mit Multiplizieren.
- Dieselbe PSD in Photoshop 2026 geöffnet und gerendert: Textgruppen und Multiplizieren bestätigt. PSD speichert Deckkraft in 8 Bit; 75 % wird dabei als 191/255 (74,90 %) dargestellt.
- Photoshop-Rendering gegenüber gespeicherter Gesamtvorschau: mittlere absolute RGB-Kanalabweichung je Zeichenfläche unter 0,14 von 255. Kleine Rundungsunterschiede bestehen, keine pixelidentische Darstellung zugesichert.
- Bestehendes Projekt im normalen lokalen Browser wiederhergestellt; Schutzzonen werden auch für vorhandene Zeichenflächen angezeigt. Tests verwendeten eine separate Datensicherung, nicht die produktive Projektdatei.

Die Schutzlinien erscheinen ausschliesslich im Editor. Bildhintergrund und weiche Schatten dürfen bis in die Schutzzonen reichen; Text und Logo bleiben innerhalb der sicheren Fläche. Andere Seitenverhältnisse verwenden die Quadratabstände, proportional zur Breite; extrem kleine freie Formate begrenzen diese Abstände auf eine nutzbare Restfläche.

## Ergänzung: Konturschatten und Reihenfolge der Schritte

Am 11.09.2026 angepasst und geprüft:

- Text- und Logoschatten folgen nun den tatsächlichen Buchstaben und der Logoform. Die bisherige rechteckige Schattenfläche der gemeinsamen Textbox wurde entfernt.
- Beide Schatten verwenden Multiplizieren mit 28 % Ebenendeckkraft, 18 px Weichzeichnung und 4 px vertikalem Abstand. Der PSD-Export enthält diese Schatten als eigene multiplizierende Ebenen.
- Die untere Leiste führt nun von Bildimport über Textbearbeitung zu Bildausschnitt, Logo und Export. Nach einem Import wird direkt die Textbearbeitung geöffnet.
- JavaScript-Syntaxprüfung, neun Kern- und Geometrietests sowie elf lokale Servertests bestanden. Die lokale Browserprüfung bestätigte die neue Reihenfolge und meldete keine Browserfehler.

Der frühere Schatten-Pixeltest für die 75%-Box ist durch den neuen Konturschatten absichtlich nicht mehr gültig und wurde entsprechend angepasst.

## Ergänzung: Bilddatum, Projektkopf, Textgrössen und Harriet

Am 14.09.2026 ergänzt und geprüft:

- EXIF-Aufnahmedatum wird vor der Bildnormalisierung gelesen; Testwert `2026:08:31 19:30:00` ergibt `31.08.26 · Montag`.
- Fehlt EXIF, erkennt die Dateinamenslogik `260831_…` als `31.08.26`. Ungültige Kalendertage werden nicht übernommen.
- Exportnamen verwenden je Bild dessen Aufnahmedatum und fallen nur bei fehlendem Bilddatum auf das manuelle Projektdatum zurück. Ein reales Testbild mit EXIF-Datum 02.09.26 ergab `260902_E2_Dichterlos_1x1_1.jpg` und `260902_E2_Dichterlos_9x16_2.jpg`.
- Projektkürzel und Projektname sind in der Kopfleiste bearbeitbar, werden automatisch gesichert und im Exportdialog übernommen.
- Titelgrösse wurde zwischen Quadrat und Story synchronisiert. Eine Änderung der Datumsgrösse wurde unmittelbar als Untertitelgrösse übernommen.
- Harriet Text Bold und Harriet Text Bold Italic sind lokal gebündelt, werden ohne Netzwerk geladen und stehen in der Schriftauswahl bereit.
- Elf JavaScript-Kern- und Geometrietests sowie dreizehn Python-Bild- und Servertests bestanden. Die Browserkonsole meldete keine Fehler.

## Ergänzung: vertikales Copyright

Am 14.09.2026 wurde das Copyright aus der verschiebbaren Haupttextbox gelöst. Es wird nun fest um −90° gedreht, mit seinem unteren Ende an der unteren Kante der Safe-Zone ausgerichtet und horizontal in der rechten Randfläche zentriert. Datum, Titel und Untertitel bleiben gemeinsam vertikal verschiebbar. Vorschau, JPG und PSD verwenden dieselbe berechnete Geometrie; die PSD behält das Copyright als bearbeitbare, gedrehte Textebene.
