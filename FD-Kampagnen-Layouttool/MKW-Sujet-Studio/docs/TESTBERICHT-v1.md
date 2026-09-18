# Testbericht – MKW Sujet Studio

Stand: 11. September 2026. Lokal auf diesem Mac mit Python 3.9.6, Pillow 11.3.0 und Google Chrome getestet. Keine Cloud-Dienste beteiligt.

## Automatisierte Prüfungen: bestanden

**11 Python-Tests** (`tests/test_server.py`):

- JPEG, PNG, TIFF und WebP werden dekodiert und als sRGB-Arbeitsbilder bereitgestellt.
- EXIF-Drehung 6 vertauscht Breite/Höhe korrekt.
- PNG-Transparenz bleibt beim Import erhalten.
- Eingebettetes sRGB-Profil wird verarbeitet; ein Lab-TIFF wird tatsächlich nach RGB/sRGB konvertiert und mit dem erwarteten LittleCMS-Ergebnis verglichen.
- Defekte Bilddaten und defekte eingebettete Farbprofile erzeugen Fehler.
- JPGs in 1080×1080, 1080×1920, 1080×1350 und 531×719 haben die exakten Pixelmasse, JPEG-Format, sRGB-Profil, Qualitäts-100-Quantisierung und 4:4:4-Farbabtastung.
- Autosave schreibt die angefragten Projektdaten.
- Wiederholter Export auf denselben Dateinamen liefert einen Konflikt; ursprüngliche Bytes bleiben unverändert.
- Schreibanfragen mit falschem Sitzungstoken werden abgelehnt.
- ZIP enthält die erwarteten Dateinamen und unveränderten JPG-Bytes.

**4 JavaScript-Tests** (`tests/core.test.js`):

- Datum ausschliesslich JJMMTT, inklusive 15.11.26 → 261115 und Schaltjahr.
- Ungültige Kalendertage und abweichende Eingabeformate werden abgewiesen.
- Seitenverhältnis wird aus tatsächlichen Abmessungen gekürzt.
- Bereinigte Dateinamen, sichtbare Reihenfolge und fortlaufende Startnummerierung; nicht ganzzahlige Startnummer abgewiesen.

**Browser-Integration** (`tests/browser.cjs`), mit den beiden vorhandenen Testfotos:

- Mehrfachimport → zwei Bilder und vier Zeichenflächen.
- Quadratänderungen verändern den Story-Ausschnitt nicht.
- Rückgängig und Wiederholen nach Skalierung.
- Proportionale Layoutvergrösserung und erneute Ausgabegrössenänderung.
- Gemeinsame Inhalte und sichtbare Text-/Logoebenen.
- Automatische Sicherung und Wiederherstellung nach Browser-Neuladen, inklusive Bilder, Schrift und Layout.
- Portables Projekt herunterladen und wieder öffnen; Projektzustand identisch.
- Bild mit Maus verschieben und mit Eckgriff proportional skalieren.
- Namensvorschau und tatsächlicher ZIP-Download für vier JPGs.
- Gleiche Layout-Zeichenfunktion für Vorschau/Export: Export-PNG wird zurückgelesen und pixelweise mit dem unmarkierten Renderbild verglichen.
- Fehlende Harriet-Schrift wird angezeigt; defekte nachgeladene Schrift wird abgewiesen.
- Gemischter PNG/TIFF/WebP-Import funktioniert trotz einer zusätzlichen beschädigten JPG-Datei.
- Gewählte Hintergrundfarbe ergibt deckende RGBA-Pixel.
- Einzelauswahl exportiert genau einen Namen mit der Startnummer.
- 390 px schmales Fenster ohne horizontalen Seitenüberlauf.
- Keine unbehandelten JavaScript-Fehler im Browser.

Die vier tatsächlich heruntergeladenen JPGs wurden zusätzlich aus der ZIP gelesen: 1080×1080 / 1080×1920, eingebettetes sRGB und Qualitäts-100-Quantisierung bestätigt. Die Anwendung wurde bei 1512×982 und 390×844 visuell geprüft. Screenshots liegen unter `docs/`.

## Implementiert, aber nicht vollständig automatisiert geprüft

- Der native macOS-Zielordnerdialog ist implementiert. Der Schreib-/Konfliktpfad wurde mit einem Testordner geprüft; der reale Finder-Dialog wurde nicht automatisiert bedient.
- Eigene Logos, direkte Textbearbeitung per Doppelklick, Logo-/Textgriffe, Bildersetzung, Entfernen, Duplizieren, Drehen/Spiegeln und alle Umsortierkombinationen sind implementiert; nicht jede Kombination erhielt einen eigenen Ende-zu-Ende-Test.
- Der Serverstart über `Start.command --no-browser` wurde durchgeführt und das ausschliessliche Lauschen auf `127.0.0.1:8765` geprüft. Der Finder-Doppelklick selbst und eine Neuinstallation auf einem zweiten Mac wurden nicht getestet.
- Offline-Ressourcen und ein passender Pillow-Installationsbaustein liegen lokal. Ein abschliessender Starttest (`tests/smoke.cjs`) bestätigte das leere Projekt, die geladene Replica und ausschliesslich lokale Browseranfragen; eine physisch getrennte Internetverbindung wurde nicht zusätzlich simuliert.
- Safari und Firefox, Intel-Macs sowie ältere macOS-Versionen sind nicht separat geprüft.
- Nicht jedes Kamera-/Druckprofil und jede TIFF-Untervariante wurde getestet. Farbgenauigkeit auf einem konkreten Monitor hängt zusätzlich von dessen Kalibrierung und Browser ab.

## Bekannte Grenzen

- Harriet steht noch aus und wird vorläufig durch Georgia ersetzt. Replica LL Bold ist mit der bereitgestellten Datei eingebunden. Andere Schnitte sind nicht enthalten.
- 8-Bit-sRGB-Arbeitsbilder, erste TIFF-Seite; keine RAW-Entwicklung, Retusche, Filter oder HDR-Bearbeitung.
- Zeilenumbrüche sind manuell. Lange Texte oder frei verschobene Elemente können ausserhalb der Zeichenfläche liegen und werden dort abgeschnitten.
- Projekte enthalten Originale **und** Arbeitsbilder als Base64; grössere Projekte benötigen entsprechend Arbeitsspeicher und Speicherplatz. Grenzen stehen in der Anleitung.
- Eine Autosave-Datei pro Toolordner; paralleles Bearbeiten in mehreren Tabs wird nicht synchronisiert. Der Undo-Verlauf ist auf 30 Schritte in der Sitzung begrenzt.
- ZIP wird im Speicher zusammengestellt. Eine sehr grosse Gesamtauswahl sollte in mehreren Chargen exportiert werden.
- Das mitgelieferte Offline-Wheel passt zu Apple Silicon/Python 3.9. Andere Systeme benötigen einmalig ein passendes Pillow-Paket.
