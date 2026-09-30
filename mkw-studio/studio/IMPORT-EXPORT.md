# Projektstart und Bildexport

Das Studio läuft weiterhin vollständig auf GitHub Pages. Es benötigt weder ein Konto noch eine Installation oder kostenpflichtige Schnittstelle.

## Neues Projekt

Vor dem ersten Import werden die Formate gewählt. Vorausgewählt sind 1080 × 1920 (9:16), 1080 × 1080 (1:1) und 1080 × 1350 (4:5). Eigene Formate haben eine einstellbare obere und untere Schutzzone in Ausgabepixeln. Links und rechts gelten jeweils 100 px bei 1080 px Breite, proportional skaliert. Formate und Schutzzonen werden in der MKW-Datei und lokal gespeichert. Alte Projekte behalten ihre vorhandenen Zeichenflächen und bisherige Schutzzonen; weitere Bilder in alten Projekten verwenden die bisherigen zwei Standardformate.

Beim Import bekommt jedes neue Sujet das weisse MKW-Logo. Die Logoauswahl bleibt verfügbar. Eine lokale Personenerkennung bereitet den Bildausschnitt pro Format vor. Gruppen werden möglichst zusammen gehalten; wenn sie nicht vollständig passen, wird die prominenteste erkannte Person bevorzugt. Die Zeichenfläche bleibt vollständig abgedeckt. Ohne Erkennung oder bei einem Ladefehler wird mittig zugeschnitten. Die Erkennung kann sich irren; der Ausschnitt bleibt von Hand anpassbar. Im Familienmodus bleibt die Illustration eingepasst.

Übertitel und Untertitel haben getrennte Grösseneinstellungen. Änderungen am ersten Bild folgen für denselben Texttyp bei anderen Bildern mit demselben Text. Änderungen an einem weiteren Bild gelten für die Formate dieses Bildes.

## Export und Freigabe

JPG und WebP haben einen Qualitätsregler. PNG lässt sich ohne Farbreduktion oder als indiziertes PNG-8 mit maximal 2 bis 256 Farben speichern. Die Vorschau und die Dateigrösse stammen aus dem tatsächlich codierten Bild. Die angezeigte Gesamtsumme bezieht sich auf die ausgewählten Bilder, ohne den kleinen ZIP-Verwaltungsanteil.

PNG und WebP können die Zeichenflächenfarbe transparent lassen. Dadurch wird kein Hintergrund aus einem Foto entfernt. In transparenten Exporten entfallen auch die flächigen Kontrastverläufe und der Logoschatten. JPG bleibt deckend. Alle Rasterexporte verwenden den sRGB-Canvas des Browsers.

Die Freigabeansicht zeigt die ausgewählten Sujets in Exportqualität ohne Hilfslinien. Mit den Pfeiltasten kann man blättern. Sie ist eine lokale Ansicht und erzeugt keinen Freigabelink. Der Fortschritt zeigt das Erstellen der Dateien; bei ZIP wird der fertige Download danach an den Browser übergeben. Ordnerexport ist in Browsern mit Ordnerauswahl verfügbar und überschreibt keine vorhandenen Dateien.

## Mitgelieferte Bibliotheken

- MediaPipe Tasks Vision 0.10.32, Apache-2.0. [Dokumentation](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js).
- EfficientDet-Lite0 INT8, Modellversion 1, Apache-2.0. [Modell](https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite).
- UPNG.js 2.1.0, MIT; pako als Abhängigkeit, MIT/Zlib. [Projekt](https://github.com/photopea/UPNG.js).

Laufzeitdateien, Modell und Lizenztexte liegen unter `static/vendor/`. Der erste Import lädt ungefähr 16 MB für die Erkennung vom eigenen Hosting; danach kann der Browser sie zwischenspeichern. Bilder werden nicht an einen Erkennungsdienst gesendet. Erkennung und PNG-8-Codierung laufen in Web Workern.

Entwicklung: `npm ci`, `npm run build:browser`, `npm test`. Der Browsertest `tests/release.cjs` prüft echte Personenerkennung, Formatkonfiguration, getrennte Textgrössen, Wiederöffnen, Exportqualität, indizierte PNG-Dateien, Transparenz und Freigabeansicht. `STUDIO_URL`, `FIXTURE` und `PLAYWRIGHT_PATH` können überschrieben werden.
