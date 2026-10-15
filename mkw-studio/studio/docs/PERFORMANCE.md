# Performance-Prüfung · 15. Oktober 2026

Geprüft wurde der produktive Browser-Build in einem isolierten Chrome-Profil, mit synthetischen Fotos und denselben Abläufen vor und nach der Änderung. Die Werte gelten für diese lokale Messung; sie sind keine Geschwindigkeitsgarantie für andere Geräte. Es wurden keine Kundendaten hochgeladen.

## Befunde und umgesetzte Änderungen

| Ablauf | Vorher | Nachher |
| --- | --- | --- |
| Fünf unveränderte Aktualisierungen mit 24 Einzelpost-Zeichenflächen | 120 vollständige Zeichenaufrufe, rund 33 ms | 0 neue Zeichenaufrufe, rund 7 ms; gültige Vorschauen bleiben sichtbar |
| Nur Text/Metadaten ändern, mit einem Foto von 27,6 MiB | rund 27,9 MiB erneut gehasht; Sicherung rund 99 ms | keine unveränderten Assetdaten erneut gehasht; rund 7 ms |
| Startseite mit einem gespeicherten Projekt | 3 Bild-/Schrift-Blobs bereits vor „Fortsetzen“ gelesen | 0; erst „Fortsetzen“ lädt die Inhalte |
| Drei Aktualisierungen eines Carousels mit drei Fotos von je 24 MP | 9 erneute Originalladevorgänge; rund 333 ms für die Zeichenaufrufe | 0 erneute Originalladevorgänge nach Aufbau des Vorschau-Caches |
| 100 Mausbewegungen vor demselben Bildschirm-Frame | 100 Bearbeitungsschritte | 1 Schritt; die letzte Position wird auch bei schnellem Loslassen angewendet |

Die Zeichenzeiten messen Browser-Aufrufe, keine vollständige GPU-Präsentation und keine FPS. Der erste Aufbau einer grossen Bildvorschau muss das Original weiterhin einmal laden. Nachfolgende Bearbeitungen verwenden ausschliesslich im Arbeitsspeicher gehaltene Bildschirmbilder (max. 2048 px lange Kante, eigener Cache max. 128 MiB). Beim Export werden weiterhin die vollständigen Originale verwendet.

Einzelposts zeichnen nur den sichtbaren Bereich plus 200 px Reserve. Scrollen und Zoom laden die neu sichtbaren Zeichenflächen nach. Warnlisten und ihre Bedienelemente werden nur neu aufgebaut, wenn sich ihr Inhalt ändert. Textmessungen im Carousel verwenden eine wiederverwendete Messfläche. Der bestehende Schutz vor konkurrierenden Speicherständen, externe Dateiänderungen, Asset-Bereinigung und Originalauflösung bleiben erhalten.

Der zusätzliche strenge Image.decode-Aufruf wurde entfernt: erfolgreiche Bildladung und gültige Originalabmessungen genügen. Echte fehlerhafte Bilddaten brechen den Export weiterhin ab und geben die temporäre Zeichenfläche frei. Der Firefox-Export verwendet weiterhin den separaten CPU-Lesepfad.

## Wiederholbare Prüfungen

`interactive-performance.cjs` prüft sichtbare Zeichenflächen, Nachladen beim Scrollen, Vorschau-Wiederverwendung, unveränderte Originalabmessungen, Freigabe gelöschter Vorschauen, Hash-Wiederverwendung und Invalidierung, Start ohne Asset-Lesen sowie Loslassen/Abbrechen einer gebündelten Mausbewegung. Bildfüllungen werden zwischen Original- und Vorschau-Renderer verglichen. Zeitwerte sind Beobachtungen; die Tests verlangen stabile Funktions- und Arbeitsmengen-Eigenschaften statt flüchtiger Millisekunden-Grenzen.

Die vorhandenen Prüfungen decken zusätzlich Projektkonflikte und Wiederherstellung, Werkzeuge, Schriften, Bildausschnitte, Ebenen sowie JPG/PNG/WebP/PDF/PSD mit grossen Bildern ab. Die CI führt die Performance- und Exportprüfungen auch in Firefox aus.

## Verbleibendes Potenzial, nach Priorität

1. **Import und Öffnen sehr grosser MKW-Dateien:** Das bisherige JSON/Base64-Format und die verlustfreie PNG-Normalisierung benötigen weiterhin viel Arbeitsspeicher. Eine binäre, versionierte Projektdatei mit kompatiblem Import alter MKW-Dateien wäre der nächste grössere Schritt. Keine Änderung daran in diesem Update.
2. **Sehr viele Carousel-Slides:** Die Arbeitsansicht zeichnet weiterhin das gesamte Artwork. Ein gekachelter Renderer für den sichtbaren Ausschnitt könnte bei 10–20 Slides zusätzlich helfen; Verläufe, Schlagschatten und übergreifende Bilder müssen dabei exakt erhalten bleiben.
3. **Erster Seitenaufruf:** PSD- und Formkonstrukteur-Bibliotheken werden derzeit direkt geladen (zusammen rund 488 kB entpacktes JavaScript). Sie könnten wie die PDF-Bibliothek erst bei Bedarf geladen werden.
4. **Wachstum der Oberfläche:** Die Informationskarten und die übrigen Overlays existieren weiter für das gesamte Projekt. Falls Kampagnen mit sehr vielen Einzelbildern üblich werden, wäre eine Virtualisierung der Bildreihen sinnvoll.

Das Pages-Paket ist durch Ausschluss der Kundengalerie bereits von rund 5,4 GB auf rund 557 MB verkleinert. Diese Paketgrösse ist nicht die Ladegrösse des Studios: Portfoliofotos werden beim Start des Studios nicht abgerufen.
