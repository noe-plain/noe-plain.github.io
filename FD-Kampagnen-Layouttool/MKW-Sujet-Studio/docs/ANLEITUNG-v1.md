# MKW Sujet Studio

Ein tatsächlich lokal arbeitendes Webtool für Social-Media-Sujets des Musikkollegiums Winterthur. Bilder, Originaldateien, Projekte, Schriften und Exporte bleiben auf dem Mac. Kein Konto, keine Cloud, keine Analyse- oder externen Schriftanfragen.

## Start auf diesem Mac

1. Im Finder diesen Projektordner öffnen.
2. **`Start.command` doppelklicken.** Ein Terminalfenster und der Browser öffnen sich.
3. Falls der Browser nicht automatisch öffnet: **http://127.0.0.1:8765** aufrufen.
4. Zum Beenden im Terminal `Ctrl+C` drücken. Das Terminal muss während der Arbeit geöffnet bleiben.

Die lokale Python-Umgebung wurde hier bereits eingerichtet. Pillow inklusive Bildcodecs ist installiert; der Installationsbaustein liegt zusätzlich unter `vendor/`. Nach Einrichtung ist kein Internet nötig. Der Server bindet ausschliesslich `127.0.0.1`, nicht das WLAN oder andere Netzwerkschnittstellen.

Falls macOS den Doppelklick blockiert: Rechtsklick auf `Start.command` → Öffnen. Alternativ im Terminal in diesem Ordner `./Start.command` ausführen. Bei „Permission denied“: `chmod +x Start.command`.

## Installation auf einem weiteren Mac

Den vollständigen Ordner kopieren, jedoch `.venv` nicht zwischen Computern übertragen. Voraussetzung: Python 3.9 oder neuer; bei Apples Python kann einmalig die Installation der Command Line Tools erforderlich sein. Beim ersten Start erstellt `Start.command` eine lokale `.venv` und installiert Pillow. Der mitgelieferte Offline-Baustein ist für **Apple Silicon, macOS 11+, Python 3.9**. Andere Python-Versionen oder Intel-Macs benötigen beim ersten Start Internet zum Herunterladen ihres passenden Pillow-Bausteins. Danach funktionieren auch diese Installationen offline.

Manuell:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install Pillow==11.3.0
.venv/bin/python server.py
```

Port 8765 muss frei sein. Das Tool verwendet ausschliesslich Python-Standardbibliothek, Pillow und Browserfunktionen. Kein Node.js für den Betrieb notwendig. Empfohlen ist ein aktueller Desktopbrowser; automatisiert geprüft wurde Chrome auf diesem Mac.

## Arbeitsablauf

### Bilder und Zeichenflächen

- **Bilder hinzufügen** oder mehrere Dateien ins Fenster ziehen: JPG/JPEG, PNG, TIFF/TIF und WebP.
- Pro Bild entstehen 1080 × 1080 und 1080 × 1920 px mit unabhängigem Ausschnitt.
- Links stehen Originaldateiname und Abmessungen nach EXIF-Ausrichtung. Ersetzen, Entfernen und Pfeile zum Umsortieren befinden sich direkt beim Bild.
- Zeichenflächen lassen sich auswählen, mit Pfeilen innerhalb ihres Bildes umsortieren und für den Export ankreuzen. Die sichtbare Reihenfolge von Bildern und ihren Zeichenflächen ist die Exportreihenfolge.
- **＋ Zeichenfläche** erstellt eine zusätzliche Quadratfläche. Rechts stehen 1:1, 9:16, 4:5, freie Abmessungen, Duplizieren und Löschen bereit.
- Maximal 100 MB pro Original, 80 Millionen Pixel beim Import; Ausgabe 16–10000 px je Seite und maximal 40 Millionen Pixel pro Zeichenfläche. Sehr grosse Projekte benötigen viel Arbeitsspeicher.

### Ausschnitte und Grössen

- Bild direkt ziehen; die blauen Eckpunkte der ausgewählten Fläche skalieren das Bild proportional um seinen Mittelpunkt. Alternativ Bildskalierung in Prozent oder Bildzoomregler verwenden. 100 % bedeutet ein Quellpixel je Ausgabepixel.
- **Ansicht** oberhalb der Vorschau ändert ausschliesslich die Anzeige. Sie beeinflusst die Ausgabe nicht.
- Fläche füllen, Vollständig einpassen, Originalgrösse, Zentrieren und Zurücksetzen sind separate Aktionen. Zurücksetzen setzt auch Drehung und Spiegelung zurück und füllt die Fläche neu.
- Bild X/Y bezeichnet den Bildmittelpunkt in Ausgabepixeln. Beliebige Drehwinkel sowie horizontales/vertikales Spiegeln sind möglich.
- **Fläche ändern / Ausschnitt beibehalten** behält die Bildskalierung und den Versatz zur Flächenmitte bei; die geänderte Begrenzung erzeugt den neuen Ausschnitt. Gestaltungselemente behalten ihre absoluten Positionen.
- **Gesamtes Layout proportional skalieren** skaliert Bild und Gestaltung mit dem kleineren Faktor der beiden Achsen und zentriert das bisherige Layout in der neuen Fläche. Bei anderem Seitenverhältnis kann zusätzliche Hintergrundfläche entstehen. Bilder und Texte werden niemals gestaucht.
- Rückgängig/Wiederholen über die Pfeile oder Cmd+Z / Cmd+Shift+Z. Bis zu 30 Bearbeitungsschritte; Verlauf gilt für die laufende Sitzung. Texteingabefelder verwenden ihre eigene Rückgängig-Funktion.

### Gestaltung und Schriften

- Gemeinsame Inhalte rechts unter Projekt eingeben. Projekttitel für den Dateinamen und Titel im Sujet sind getrennt.
- **Inhalte auf ausgewählte Flächen übertragen** aktualisiert Datum, Titel und Untertitel der angekreuzten Zeichenflächen. Bildausschnitte bleiben erhalten.
- Unter Gestaltung ein Element wählen und **Element sichtbar** aktivieren. Alle Elemente sind anfänglich ausgeblendet, damit reine Bildexporte einfach bleiben.
- Sichtbare Texte und Logos direkt in der Vorschau anklicken und ziehen. Doppelklick auf Text öffnet dessen Textbearbeitung. Der blaue Griff rechts unten skaliert das gewählte Element. Mehrzeilige Texte über das Textfeld rechts eingeben; Zeilenumbrüche sind manuell.
- Positionen, Schriftgrösse bzw. Logobreite, Drehung, Textfarbe und Links-/Mittel-/Rechtsausrichtung sind rechts einstellbar. Textpositionen bezeichnen die obere Textkante, Logopositionen die obere Kante; die horizontale Verankerung folgt der Ausrichtung.
- **Gestaltung auf Auswahl übertragen** kopiert Texte, Logo, Sichtbarkeit, Farben und Hintergrund auf angekreuzte Flächen. Positionen und Grössen werden proportional an die Zielfläche angepasst. Individuelle Bildausschnitte bleiben erhalten.
- Die bereitgestellte **Replica LL Bold** liegt lokal unter `static/fonts/`. Sie wird in portable Projekte eingebettet. Nur im Rahmen der eigenen Schriftlizenz weitergeben.
- **Harriet fehlt noch**. Bis zum Import wird das klar angezeigt; Copyright verwendet vorläufig Georgia als Ersatz. Der Export verwendet dieselbe Ersatzschrift wie die Vorschau. Harriet später über **Harriet importieren** als OTF, TTF, WOFF oder WOFF2 laden. Replica kann ebenfalls ersetzt werden.
- Vorhandene MKW-Logos Schwarz/Weiss sind enthalten. Eigene PNG-, JPG-, WebP- und eigenständige SVG-Logos lassen sich importieren. SVGs mit externen Ressourcen werden nicht unterstützt; alle Bestandteile müssen in der Datei enthalten sein. Eigene Logos behalten ihre Originalfarben.

### Projekte und automatische Sicherung

- Änderungen werden nach kurzer Pause automatisch in `lokale-daten/autosave.mkw` im Projektordner gesichert. Unten steht der Speicherstatus. Beim nächsten Öffnen wird dieser Stand wiederhergestellt.
- **Projekt speichern** lädt eine portable `.mkw`-Datei herunter: Originalbilder unverändert, farbkorrigierte Arbeitsbilder, Schriften, Logos, Texte, Flächen, Ausschnitte und Einstellungen sind enthalten.
- **Projekt öffnen** stellt diese Datei wieder her. Vor dem Ersetzen eines bearbeiteten Projekts gibt es eine Nachfrage.
- **Neues Projekt** leert das Projekt; geladene Schriften bleiben verfügbar. Vorher wichtige Projekte separat speichern.
- Nur ein Browserfenster zur Bearbeitung verwenden: mehrere Fenster teilen dieselbe Autosave-Datei, der zuletzt gespeicherte Stand gewinnt. Für grössere Projekte vor dem Schliessen die Anzeige „Automatisch lokal gesichert“ abwarten.
- `.mkw` ist bewusst unkomprimiertes JSON mit eingebetteten Dateien. Daher ist es grösser als die Originalbilder; es gibt keinen externen Datenbank- oder Cloudspeicher. Einzelne Serveranfragen sind auf 600 MB begrenzt.

### Dateinamen und Export

Datum ausschliesslich als **TT.MM.JJ** eingeben. Ausgabe ist immer **JJMMTT**; beispielsweise 15.11.26 → 261115. Die Kalenderprüfung interpretiert zweistellige Jahre als 2000–2099 und berücksichtigt Schaltjahre.

```text
DATUM_PROJEKTKÜRZEL_PROJEKTTITEL_FORMAT_NUMMER.jpg
261115_E2_Dichterlos_9x16_3.jpg
```

- Startnummer ist eine ganze Zahl ab 0. Nur angekreuzte Zeichenflächen werden fortlaufend in sichtbarer Reihenfolge nummeriert.
- Format wird durch Kürzen der tatsächlichen Pixelabmessungen berechnet, auch bei freien Grössen.
- Unzulässige Dateizeichen werden durch Bindestriche, Leerraum durch Unterstriche ersetzt. Leere Namensbestandteile werden `Ohne-Titel`. Die vollständigen bereinigten Dateinamen stehen **vor** dem Export im Dialog.
- **Zielordner wählen & exportieren** öffnet den nativen macOS-Ordnerdialog. Vorhandene gleichnamige Dateien werden ausgelassen und als Fehler aufgelistet; sie werden niemals überschrieben. Neue Namen über Startnummer oder Projektfelder erzeugen oder einen anderen Ordner wählen.
- **ZIP herunterladen** ist zusätzlich verfügbar, auch für eine einzelne Fläche. Der Browser bestimmt den Downloadordner; seine Downloadnamen-Behandlung gilt für die ZIP-Datei.
- Immer JPEG, Encoderqualität **100**, 4:4:4 ohne Farbunterabtastung, eingebettetes sRGB-Profil, exakte Ausgabepixel. Keine Qualitätsreduktion einstellbar. JPEG bleibt technisch ein verlustbehaftetes Format.
- Transparenz wird beim gemeinsamen Zeichnen von Vorschau und Export mit der gewählten Hintergrundfarbe gefüllt, standardmässig Weiss.
- Eingebettete ICC-Profile werden beim Import über LittleCMS nach sRGB konvertiert; EXIF-Ausrichtung wird angewendet. Dateien ohne Profil werden als sRGB behandelt und entsprechend gekennzeichnet. Unlesbare Profile werden mit Fehler abgewiesen. Bei TIFF wird die erste Seite verwendet; RAW, HDR und mehrseitige TIFF-Bearbeitung sind nicht vorgesehen. Die Arbeitsbilder haben 8 Bit pro Kanal.
- Zu geringe Bildauflösung ergibt eine Warnung; Export bleibt möglich. Unten bzw. im Dialog werden Fortschritt, Anzahl erfolgreicher Exporte und Fehler angezeigt.

## Quellcode

- `server.py`: ausschliesslich lokaler Server, Import, EXIF/ICC, JPG-Encoder, ZIP, Ordnerdialog und Autosave.
- `static/app.js`: vollständiger Editor, Projekte, Mausinteraktion und gemeinsame Canvas-Zeichenfunktion für Vorschau/Export.
- `static/core.js`: Dateinamen, Datum und Seitenverhältnisse.
- `index.html` / `static/style.css`: deutsche responsive Oberfläche, komplett ohne externe Ressourcen.
- `Start.command`, `vendor/`: Start und Offline-Installationsbaustein.
- `tests/`: wiederholbare Prüfungen. Details und ehrliche Grenzen in `TESTBERICHT.md`.
- `static/urspruengliche-demo.html`: Sicherung der vorherigen Demo, wird vom Server nicht ausgeliefert.

## Prüfungen selbst ausführen

```sh
.venv/bin/python -m unittest discover -s tests -v
node --test tests/core.test.js
```

Für den optionalen Browser-Integrationstest: Node.js, Playwright (`npm install --no-save playwright`) und Google Chrome unter `/Applications` bereitstellen, den lokalen Server starten, dann `node tests/browser.cjs`. Achtung: Dieser Test arbeitet mit den mitgelieferten Testbildern und ersetzt die lokale Autosave-Datei durch Testdaten. Wichtige Projekte vorher portabel sichern. Die Umgebung dieses Entwicklungsrechners verwendet für Playwright einen bereits vorhandenen lokalen Paketpfad (`PLAYWRIGHT_PATH`).
