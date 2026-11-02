# Rechte Seitenleiste: Kontext und Ebenen trennen

## Entscheidung aus fünf Perspektiven

- **Neue Nutzerin:** Kontext oben, Ebenen unten. Zwei sichtbare Bereiche mit je eigener Scrollfläche; nichts muss erst in einen Tab verschoben werden.
- **Erfahrener Nutzer:** 70:30 als Startwert, direkt ziehbarer Griff, dauerhaftes persönliches Verhältnis. Änderungen am Inhalt ersetzen den Griff nicht. Doppelklick und Taste 0 setzen 70:30 zurück.
- **UX/UI:** Die bestehenden Material-Farbrollen und abgerundeten Flächen bleiben Grundlage. Ein dezenter Griff in der Lücke zeigt die verstellbare Grenze. Kurze Fenster erhalten dynamische Mindestgrössen, beide Bereiche bleiben scrollbar.
- **Barrierefreiheit:** Fokussierbarer Separator mit Orientierung, kontrolliertem Bereich, Wert und verständlicher Prozentansage. Pfeile ändern in 2-Prozent-Schritten, Shift in 10; Pos1/Ende wählen die Grenzen. Escape/Abbruch stellen den vorherigen Zustand wieder her. Keine Zeichenflächen-Shortcuts auslösen, wenn der Griff fokussiert ist.
- **Entwicklung/QA:** Nur CSS-Tracks ändern; kein Neuaufbau der Ebenen, keine Bilddekodierung, kein Artwork-Repaint und keine Dokument-/Undo-Mutation beim Ziehen. Eine rAF-Schleife fasst Pointer-Ereignisse zusammen; Observer und Listener werden beim Editorwechsel entfernt. Das Verhältnis ist eine validierte Werkzeugeinstellung, Bestandteil des MKW-Setup, nicht der MKW-Projektdatei.

Die FD-Kampagnen haben keine solche freie Ebenenliste. Die Aufteilung wird daher dort aktiviert, wo die gemeinsame Inspector-Oberfläche eine Ebenenliste erhält (Designer, einfach und Advanced).

## Quellen und Einordnung

- [Offizielles Material Web: Divider](https://github.com/material-components/material-web/blob/main/docs/components/divider.md): visuelle Trennung und semantische Unterscheidung nicht-interaktiver Trennlinien. Ein verstellbarer Editorbereich ist eine eigene Produktkomponente, kein dekorativer Divider.
- [WAI-ARIA Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): Orientierung, Pfeilbedienung, Werte und kontrollierter Bereich. Das APG-Muster ist ausdrücklich noch nicht abschliessend reviewed. Diese Oberfläche erlaubt kein vollständiges Zuklappen; 0 setzt stattdessen auf 70:30 zurück. Es wird keine vollständige Übernahme sämtlicher optionaler APG-Interaktionen behauptet.

## Akzeptanz

- [x] Kontext und Ebenen bleiben untereinander, Standard 70:30 abzüglich Griffhöhe.
- [x] Beide Bereiche unabhängig scrollbar; Vergrössern/Verkleinern per Griff und Tastatur.
- [x] Mindestgrössen bei schmalen/kurzen Fenstern, Light/Dark/Forced Colours und reduzierte Bewegung.
- [x] Auswahl, Texteingabe, Ebenenaktionen und Drag-and-drop-Reihenfolge bleiben funktionsfähig.
- [x] Verhältnis über Auswahl, Panel-Neuaufbau, Reload und MKW-Setup erhalten; nicht in Projektdateien.
- [x] Abbruch, Daten-/Pixelgleichheit und unveränderte Render-/Undo-Zähler prüfen.
- [ ] Firefox vor dem Push; GitHub-Tests/Pages und öffentliche Version prüfen.

## Prüfung am 2. November 2026

- 132 Unit-Tests erfolgreich, Build und Formatierung geprüft.
- Firefox: 10/10 Suites erfolgreich (Splitter, gemeinsame Inspector-Navigation, Material-Inspector, Konsistenz, Ordner/FX/Drag-and-drop, Umbenennung, Textbearbeitung beider Modi, MKW-Setup, Einstellungen und Farbpicker-Position).
- Chrome: vier bestehende Prüfszenarien sowie der Splitter erfolgreich. Beim Übergang in den mobilen Breakpoint schliesst die vorhandene Anwendung die Seitenleiste automatisch. Der neue Test wartet diesen Wechsel ab, bevor er sie ausdrücklich öffnet; keine Grössen- oder Sichtbarkeitskriterien wurden reduziert.
- Echte Screenshots für Light/Dark, Desktop und 500×420px kontrolliert. Ein erkannter Überlagerungsfehler auf schmalen Fenstern wurde behoben: die offene Seitenleiste liegt über der schwebenden Werkzeugpille, der Footer-Schalter bleibt erreichbar.
- Gleichheit der Projekt-/Undo-Daten, Canvas-Pixel und Repaint-Zähler während Grössenänderungen geprüft. Beide Scrollpositionen sind unabhängig. Auswählen/Neuaufbau/Reload sowie Setup behalten das Verhältnis; Projektdateien enthalten die Einstellung nicht.
- Automatisierte axe-Prüfung ohne schwere/kritische Befunde. Keine Studie mit echten Persona-Testpersonen und kein manueller Screenreader-Test.
- Temporäre Firefox-Testumgebung nach Neustart wiederhergestellt; der automatische Browser-Entpacker blieb hängen. Das offizielle, vollständig heruntergeladene Archiv wurde per CRC geprüft und separat entpackt. Diese Vorbereitung betrifft nur die Tests, nicht das Produkt oder die Geräte der Nutzenden.

Nach dem Push werden GitHub-Prüfung, Pages und die isolierte öffentliche Firefox-Kontrolle im Releaseprotokoll des Arbeitsbereichs festgehalten.
