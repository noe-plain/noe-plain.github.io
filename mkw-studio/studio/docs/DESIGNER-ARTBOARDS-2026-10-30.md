# Freie Zeichenflächen im Designer – Konzept und Abnahme

## Fünf Perspektiven

| Persona | Risiko | Umsetzung und Prüfkriterium |
|---|---|---|
| Neue Nutzerin | Slides und einzelne Zeichenflächen werden verwechselt; zusätzliche Werkzeuge erschweren den Einstieg | Klare Wahl „Zusammenhängende Slides“ / „Freie Zeichenflächen“, kurze Aufgabenbeschreibung. Plus und benannte Flächen. Neues Projekt → zwei getrennte Flächen → Text/Bild → Einzelbilder exportieren ohne Entwicklerhilfe |
| Erfahrener Nutzer | Wiederholte Anordnung und unterschiedliche Formate kosten Zeit; bestehende Carousels dürfen sich nicht verändern | Eigene Position, Grösse und Schutzzone; Duplizieren, Reihenfolge, mit Inhalt verschieben, Undo. Bestehende Projekte behalten den verbundenen Modus und identische Exporte |
| UX/UI | Beliebige Positionen erzeugen unübersichtliche Montagefläche; Eigenschaften und Exportumfang müssen eindeutig sein | Gemeinsamer Inspector, klare Auswahl/Name, Position und Format als explizite Dokumentaktion, numerische Alternative zu Ziehen. Freie Flächen haben sichtbare Ränder und Abstand, keine grosse weisse Verbundfläche |
| Barrierefreiheit | Freies Anordnen darf keine reine Drag-Interaktion werden | Beschriftete native Position/Formatfelder, Plus, Auswahlliste, Tastaturbedienung, Fokus, Status und sichtbare Namen; Farbe allein trägt keine Information |
| Entwicklung/QA | Zeilenarithmetik ist in Rendering, Snap, Export und Vorlagen verteilt | Gemeinsame reine Zeichenflächen-Geometrie, Legacy-Fallback, validierte Metadaten. Raster/PDF/PSD-Slices, Vorlagen, Persistenz, Undo und Speicherbereinigung mit verschiedenen Formaten/Positionen prüfen; begrenzte Preview-Raster |

## Daten- und Verhaltensentscheidungen

- Bisheriger Carousel-Modus bleibt unverändert, inklusive 1–20 Slides und zusammenhängender Bilder. Neue Dokumentmetadaten nur bei freier Anordnung; keine Zwangskonvertierung beim Öffnen.
- Freie Zeichenflächen haben Name, X/Y, Breite/Höhe und vier Schutzzonen. Die gemeinsame Montagefläche behält ein positives Koordinatensystem; die Flächen dürfen nebeneinander und untereinander liegen. Überlappende Flächen werden als ungültig gemeldet, statt mehrdeutige Exporte zu erzeugen.
- Position/Format sind Dokumentdaten; Raster, Theme und Einraststärke bleiben Tool-Einstellungen.
- „Inhalt mitverschieben“ ist ausdrücklich sichtbar. Räumliche Zugehörigkeit wird deterministisch anhand der grössten Überschneidung ermittelt; übergreifende Elemente bleiben normale Designer-Ebenen. Keine Asset-Duplikation allein durch zusätzliche Zeichenflächen.
- Jede Zeichenfläche liefert ein eigenes Bild; PDF-Originalformat berücksichtigt die einzelnen Formate. PSD behält bearbeitbare Ebenen und erhält Slices für die tatsächlichen Rechtecke. Keine unbelegte Zusage von Photoshop-Nativ-Artboards.
- Neu erzeugte freie Dokumente starten übersichtlich mit wenigen Flächen und Lücken. Eine Umstellung vorhandener Slides darf deren aktuelle Position und sichtbares Artwork nicht automatisch verändern. Anordnen/Verschieben ist eine ausdrückliche, rückgängig machbare Aktion.

## Aufgaben

- [x] A01 Textkorrektur: vollständige CI und Veröffentlichung erfolgreich abschliessen.
- [x] A02 Reine Geometrie/Validierung für Legacy- und freie Flächen, begrenzte Arbeitsfläche.
- [x] A03 Einrichtung und freie Zeichenflächenliste/-eigenschaften; hinzufügen, duplizieren, bewegen, entfernen und Undo.
- [x] A04 Rendering, Auswahl/Guides/Snap, Winkel, Pasteboard und Zoom auf dieselben Rechtecke umstellen.
- [x] A05 Bild/PDF/PSD-Export, Vorlagen und MKW-Rundlauf absichern.
- [x] A06 Fünf-Persona-Nachkontrolle, Firefox/Chromium, Pixel-Legacy und Performance; Wiki aktualisieren.
- [ ] A07 Geprüften Stand pushen, CI/Pages und Live-Version prüfen.

Die Einordnung der konkreten Zeichenflächen-UI ist eine eigene UX-Entscheidung im Material-3-Farb-/Komponentensystem, keine Behauptung einer Material-Vorgabe für professionelle Zeichenwerkzeuge. Automatisierte Persona-Szenarien ersetzen keine Tests mit fünf echten Personen.

Textabschluss: Commit0b91e3e, Tests41063510094 (Chromium/Firefox/studio) erfolgreich, Pages41063508256 erfolgreich, öffentliche Firefox-Textbedienung geprüft. Weitere Feature-Arbeiten werden separat veröffentlicht.

## Durchgeführte Prüfungen vor Veröffentlichung

- 131 Unit-Tests, Formatprüfung und reproduzierbarer Browser-Build erfolgreich.
- Vollständiger Firefox-Durchlauf: 75/76 erfolgreich. Der einzelne Fehler betraf einen veralteten Test, der bewusst ausgeblendete Auswahlbuttons vermass. Die Prüfung misst nun die Auswahl vor dem Befüllen und die sichtbaren Bedienelemente danach; keine Mindestgrössen wurden reduziert.
- Abschliessend 13/13 relevante Firefox-Suites erfolgreich: freie Einrichtung/Position/Format/Schutzzonen, Undo, Legacy-Pixelgleichheit, MKW/Browsersicherung, PDF-Mischformate, PSD-Slices/Masken, Vorlagen-Auswahl/Befüllen/Abbruch/Fehler, Bestandsbibliothek, Einrichtung, Winkel, Ausrichtung und Textüberarbeitung.
- Automatische axe-Prüfung im Vorlagen- und Zeichenflächenbereich; visuelle Screenshots für Desktop, 500px und tatsächlichen Darkmode kontrolliert. Keine Studie mit echten Persona-Testpersonen, kein manueller Screenreader- oder Photoshop-Test.
- Im vollständigen Firefox-Lauf auch 50 Fotoimporte, MKW speichern/wiederöffnen, grosse Bildexporte, Speicherfehler und mehrere Tabs geprüft.
- Sehr grosse/weit auseinanderliegende Flächen: Studio-Raster auf 16000 px pro Kante / 24 MP begrenzt. PSD weiterhin maximal 30000 px pro Kante / 80 MP; Grenzen werden erklärt, Einzelbilder behalten ihr Format.

Chromium: dieselben 13 Prüfszenarien bestanden, davon die asynchrone Löschbestätigung separat erneut geprüft. Der Test wartet ausdrücklich auf den abgeschlossenen Dialogauftrag statt nur auf das Ende des Klicks.

Veröffentlichungsprüfung folgt nach dem Push; die abschliessenden GitHub- und Live-Ergebnisse werden im lokalen Releaseprotokoll des Arbeitsbereichs festgehalten.
