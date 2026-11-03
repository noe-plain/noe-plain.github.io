# UI-Erweiterungen · 3. November 2026

## Umsetzung

- **Textwerkzeuge:** Ein gemeinsamer Typografie-Inspector ersetzt die getrennten einfachen und erweiterten Textwerkzeugleisten. Die bestehende Gliederung „Einzelne Absätze & Zeilen“ bleibt im Einzeltext-Inspector erhalten. Mehrere ausgewählte Textebenen lassen sich gemeinsam auf Zeichen- und Absatzebene formatieren; gemischte Werte werden als solche angezeigt. Auch die Textfeldausrichtung ist in beiden Modi identisch. Inhaltsbearbeitung bleibt eindeutig einer Textebene zugeordnet.
- **Freie Zeichenflächen:** Neue freie Flächen liegen mit 120 px Abstand untereinander. Im Einrichtungsdialog lassen sich die Seiten per Ziehen sowie mit Pfeiltasten sortieren. Im Inspector gibt es dieselben Bedienwege; die Exportreihenfolge ändert sich, die Montageflächenpositionen nicht. Einrastung an anderen Zeichenflächen kann ein- und ausgeschaltet werden; das bestehende Ausrichten an Kanten/Mitten und die sichtbaren Hilfslinien bleiben erhalten.
- **Gemeinsame Breite:** Ein vertikaler Separator verändert die gemeinsame Inspectorbreite und damit Seitenleiste wie Ebenen zusammen. Der Wert wird in den Werkzeugeinstellungen gespeichert und auf 240–420 px begrenzt. Tastatur: Pfeile, Pos1 und Ende.

## Farb- und Lesbarkeitsprüfung

Die Ergänzungen verwenden die vorhandenen Material-Farbrollen für Oberfläche, Inhalt, Umriss und Fokus statt neuer, isolierter Farbcodes. Auswahl wird zusätzlich durch Text/Position und Fokusmarkierung kenntlich gemacht; Drag-Sortierung hat Pfeiltasten als Alternative. Im Browser werden die Einrichtungsoberfläche und die Seitenleiste in hellem und dunklem Theme mit axe gegen WCAG 2.0/2.1/2.2 A/AA geprüft; schwerwiegende und kritische Befunde lassen den Test fehlschlagen. Das ist eine automatisierte Prüfung, kein vollständiger visueller Kontrast- oder Screenreader-Test.

## Fünf-Persona-Prüfung

| Persona | Prüfung des aktualisierten Konzepts | Ergebnis / verbleibender Hinweis |
|---|---|---|
| Neue Nutzerin | Einheitliche Textwerkzeuge, klare Auswahl mehrerer Textebenen, vertikale Startanordnung freier Flächen | Formatumfang steht im Inspector; eine Texteingabe ändert nicht unbeabsichtigt mehrere Ebenen. Drag-Vorschau und kurze Erklärungen zeigen die Seitenreihenfolge. |
| Erfahrener Nutzer | Wiederholte Textformatierung, Kanten-Einrasten, Neuordnung ohne Verschieben der Montagefläche, gemeinsamer Breitenregler | Zeichen-/Absatzformatierungen werden mit einem Undo-Schritt angewandt. Exportreihenfolge bleibt unabhängig von der Position. Breite ist begrenzt und persistent. |
| UX/UI | Vergleich einfache/erweiterte Ansicht, Beschriftungen, Zustände, helle/dunkle Oberfläche und enge Layouts | Typografie-Inspector ist in beiden Modi gleich. Neue Interaktionen folgen vorhandenen Farbrollen; automatische Theme-Prüfung ist enthalten. Ein manuelles visuelles Review auf weiteren Geräten bleibt sinnvoll. |
| Barrierefreiheit | Sortierung per Tastatur, Separator-Semantik und Werte, sichtbarer Fokus, Kontrast-/Semantikprüfung | Seiten lassen sich mit Pfeiltasten sortieren; Breite per Pfeil/Pos1/Ende. axe prüft Einrichtungsdialog und Inspector in beiden Themes. Screenreader und Touch wurden nicht manuell getestet. |
| Entwicklung/QA | Dokumentdaten, Export, Undo, bestehende freie Projekte, Laufzeit und Wartbarkeit | Sortierung bearbeitet nur die Exportreihenfolge; Positions- und Boarddaten bleiben gekoppelt. Unit- und Browserregressionen decken Auswahl, Formatierung, DnD und responsive Breiten ab. Keine grossen Abhängigkeiten hinzugefügt. |

Diese strukturierte Review ist eine heuristische Prüfung anhand der fünf Produktperspektiven, keine Studie mit fünf realen Testpersonen.
