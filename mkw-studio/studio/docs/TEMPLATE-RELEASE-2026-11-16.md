# Drei freigegebene Studio-Vorlagen – 16. November 2026

Der Nutzer hat die drei gezeigten Layouts mit seinen letzten Änderungswünschen ausdrücklich zur Veröffentlichung freigegeben. Dieser begrenzte Vorlagenauftrag wurde vorgezogen. Bildkommentare, FD-Backup-Entfernung und andere Phasen bleiben unverändert geplant.

## Ergebnis

- **Nahe am Orchester:** drei Slides. Aufmacher mit Logo, grösserem Bild (888 × 620), darunter ein gemeinsamer linksbündiger Titelblock. Abstand Bild/Titel 40 statt 80, unterer Freiraum ungefähr halbiert; gemeinsame untere Schutzzone 100. Danach rechtsbündiges schmaleres Bild; dritte Slide mit Übertitel und Harriet-V2-Fliesstext.
- **Konzertauftakt:** ein vollflächiges Foto, gemeinsamer linksbündiger Übertitel-/Titel-/Terminblock.
- **Bilder-Slider:** drei Slides, sechs unabhängige Bildfelder und vorhandener bildgefüllter Winkel. Aufmacher beibehalten; zweiter Slide mit grossem linkem Winkel hinter allen drei darüberliegenden Fotos; nur seine zwei vorderen Ecken liegen innerhalb der Folie. Gleichmässige Abstände von 40 px zwischen den weissen Rahmen; Anschnitte auf 90/125 px halbiert. Zwei Bildbrücken verbinden die Slides. Alle drei Slides haben ein vollflächiges Hintergrundfoto. Schluss-Slide ohne weitere eigene Vordergrundelemente, mit angeschnittenem Bild als Übergang. Keine zusätzliche Farbfüllungsfunktion für Winkel implementiert.

64 px Übertitel, 100–110 px Titel, Replica LL/Versalien; Harriet V2 Text für normalen Fliesstext und Untertitel. Enge Absätze, Trenner „–“, Verläufe Multiplizieren/39 %. Höchstens ein linksbündiges Textfeld auf einer textführenden Slide.

Die bestehende Winkel-Slidepost-Vorlage bleibt erhalten. Die drei neuen bildfreien Layoutdateien benötigen zusammen ungefähr 20 KB. Keine Beispielbilder oder zusätzlichen Schriftdateien werden mitgeliefert. Der gemeinsame Loader lädt jeden Katalogeintrag separat erst bei Bedarf, prüft dessen ID und erlaubt einen neuen Versuch nach Fehlern. Alle Layout-URLs erhalten automatisch einen Inhalts-Hash.

Notwendiges abschliessendes Refactoring: Das bestehende reine Vorlagenmodell erhält beim Befüllen die Absatzgrössen und ordnet Zeichenformate innerhalb der jeweiligen Absätze neu zu. Unterschiedlich lange neue Titel verschieben dadurch Harriet nicht mehr an die falsche Textstelle. Vorhandene gemeinsame Textmodell-Funktionen werden wiederverwendet; keine zweite Dokumentstruktur.

## Tatsächliche lokale Prüfung

- 206 Modell-/Pakettests bestanden, inklusive getrennter Katalog-Caches, Kopien statt Mutation, Wiederholung nach Ladefehler sowie Schrift-/Absatzzuordnung bei unterschiedlich langen und zusätzlichen Absätzen.
- Echte Chrome-Galerie für alle drei Vorlagen: auswählen, Bilder hochladen, Texte ändern, Designer öffnen, MKW speichern/lesen/validieren. Desktop und kompakte 768-px-Galerie geprüft.
- Alle Standardtexte und repräsentative längere Titel passen; beliebig lange Texte werden nicht automatisch passend skaliert. Die unveränderte Editor-Warn-/Formatierfunktion bleibt dafür zuständig.
- Native Renderpixel vor/nach MKW-Rundlauf gleich. Die Bildbrücken wurden in voller Exportauflösung gegen den durchgehenden Entwurf geprüft: 32-Pixel-Randstreifen mit maximal 8/255 Kanalabweichung und mittlerer Kanalabweichung maximal 0,05/255 für Canvas-Rasterrundungen. Tatsächliche Werte siehe Rezept-Prüfdatei; keine pixelidentische SVG-Logo-Rasterung zwischen verschieden breiten Zeichenflächen behauptet.
- Sichtbare Textbearbeitung und Undo/Redo in den drei MKW-Beispielen. Neue Galerieprüfung bestätigt ausdrücklich den Winkel hinter den drei Bildern sowie das Hintergrundbild auf dem dritten Slide.
- Bestehende Vorlagen-/Setup-/Lösch-/Rollback-Tests, PNG-/ZIP-Export mit vollständigem MKW, PDF und PSD bestanden. Die beiden Einstellungen-Prüfungen wurden korrekt auf vier mitgelieferte statt einer Vorlage aktualisiert; eigene Vorlage bleibt weiterhin getrennt löschbar.
- Lokaler Firefox konnte auf diesem Rechner wegen macOS-Prozess-/Grafikbeschränkungen nicht starten. Der neue Galerie-Fall ist deshalb auch im regulären Firefox-GitHub-Lauf enthalten. GitHub-Endstatus und echte Live-Abnahme nach Bereitstellung gesondert dokumentieren.

## Sechs Persona-Perspektiven

| Persona | Feedback / geprüfter Punkt | Status |
| --- | --- | --- |
| Neue Nutzerin | Drei klare Anwendungsfälle und wenige Bild-/Textplätze im bestehenden Galerieablauf. | Gelöst. |
| Erfahrener Designer | Gemeinsame Textfelder, verlässliche Formatierung, frei bearbeitbare Bildrahmen und Winkel unter den Fotos. | Gelöst, realer Bearbeitungs-/Dateiweg geprüft. |
| Senior UX-Experte | Logo–Bild–Titel, Bildfolie und Textfolie bilden einen nachvollziehbaren Ablauf; Slider führt über die Kanten weiter. | Gelöst. |
| UI-Expertin | Einheitliches Raster, Typografie und 39-%-Verläufe; bestehende Material-3-Galerie ohne neue parallele UI. | Visuell geprüft und vom Nutzer freigegeben. |
| QA-Entwicklerin | Neue Layouts unabhängig laden, Fehler erneut versuchen, eigene Bibliothek und Dateikompatibilität erhalten. | Lokal gelöst; tatsächlichen GitHub-/Live-Endnachweis ergänzen. |
| Fehlersucher | Längere/geänderte Absätze, Ladefehler, Abbruch, Undo/Redo und Schlussfolie mit Hintergrund. | Gezielte Prüfungen bestanden; beliebig lange Texte bleiben begrenzt. |

## Grenzen und Nachweise

Die drei vom Nutzer genannten MKW-Dateien im Downloads-Ordner waren wegen macOS-Lesesperre nicht zugänglich und wurden nicht verändert. Die Freigabe bezieht sich auf die tatsächlich gezeigten Entwürfe und die zuletzt beauftragten Korrekturen. Kein direkter Originaldatei-Abgleich behauptet. Vorschau-Fotos stammen ausschliesslich aus den beiden vorhandenen Studio-Testbildern und sind nicht Bestandteil der bildfreien Vorlagen.

PSD und MKW bleiben verfügbar. Kein neuer IDML- oder SVG-Meilenstein, kein sonstiges Editor-Feature und keine FD-Backup-Entfernung in diesem Auftrag. Quellen und reproduzierbare Vorschauen: `drafts/content-templates-2026-11-16/`.
