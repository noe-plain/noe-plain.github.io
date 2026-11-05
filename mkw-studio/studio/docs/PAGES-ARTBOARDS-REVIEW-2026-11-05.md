# Seiten & Artboards – Verschieben und Kontextmenüs

## Umfang und Entscheidungen vor Umsetzung

Die UI-Überarbeitung betrifft ausschliesslich Seiten & Artboards, nicht die Textwerkzeuge oder übrigen Inspektoren. Bereits vorhandene uncommittete Textänderungen werden nicht überschrieben.

| Persona | Problem | Entscheidung / Prüfkriterium |
| --- | --- | --- |
| Neue Nutzerin | Rand-Drop sortiert nur global, Mitte wechselt Artboard; Ziel-Dialog erlaubt wirkungslose Ziele. | Jeder Thumbnail-Drop gehört zum sichtbaren Ziel-Artboard; vor/nach oder anhängen. Nur verfügbare andere Ziele mit Ergebnisanzahl. |
| Erfahrener Nutzer | Bild wird beim Bewegen einer überlagerten Seite zerlegt. | Ein nicht-fragmentiertes Bild bleibt ein Objekt und folgt seiner ersten Seite; spätere Moves behalten die Zuordnung. Rückgängig bleibt atomar. |
| UX/UI | Aktionen ohne klare Hierarchie. | Gemeinsame Menüoberfläche, getrennte destruktive Aktion, klarer Zieldialog. |
| Barrierefreiheit | Kontextmenü verschwindet nach Rechtsklick; ungültige Aktionen. | Firefox-Pointerup berücksichtigen; Escape/Keyboard-Menü weiterverwenden; ungültige Aktionen deaktivieren. |
| Entwicklerin/QA | Join als indirekter Move-Algorithmus ordnet nach globaler Reihenfolge statt nach Ziel. | Direkte validierte Membership-Transaktion, stabile Ziel-ID, Tests für Einfügeposition und Bildbesitz. |

## Quellen und Einordnung

- https://m3.material.io/components/menus/guidelines (offizielle Designquelle; Textabruf benötigt JavaScript).
- https://github.com/material-components/material-web/blob/main/docs/components/menu.md (offizielle Web-Implementierung: ankerbezogene temporäre Oberfläche, Tastaturnavigation, Popover-Top-Layer). Die historische Browserwarnung dort wird nicht als aktuelle Firefox-Unterstützung übernommen.
- Eigene produktbezogene UX-Entscheidung: nur sinnvolle Ziel-Artboards anbieten, Vorschau der resultierenden Seitenanzahl. Keine neue UI-Abhängigkeit nötig.

## Technische Grenze

Diese Änderung behandelt das Verschieben von Seiten/Artboards. Explizites Trennen in Einzelseiten behält weiterhin die vorhandenen Seitenausschnitte, damit deren bestehender Export nicht geändert wird. Bereits gespeicherte Fragmente werden nicht automatisch zusammengeführt, da ihre individuellen Bearbeitungen sonst verloren gehen könnten. Neue übergreifende Bilder werden beim Verschieben nicht fragmentiert. Alte Dateiformate bleiben lesbar.

## Prüfung

157 Unit-Tests erfolgreich, inklusive zwei neuer Tests für die erste Bildseite und gezielte Artboard-Mitgliedschaft. Firefox: pages-panel, spread-layout, designer-stability, spread-layout-files erfolgreich (echtes Drag-and-drop, Undo, 120-Seiten-Virtualisierung, Datei-/Exportregressionen). Neuer page-transfer-Test prüft Rechtsklick, Zieldialog, echte Rand-Drops, Ganzbild-Geometrie, MKW-Roundtrip, wiederholtes Menüöffnen/Escape und Axe. Screenshots von Dialog/Panel visuell geprüft; Schriftdarstellung nachgebessert; eine zusätzliche Anzahl-Plakette wurde wegen Platzbedarf wieder entfernt. Keine externe Nutzerstudie oder manuelle Screenreader-Prüfung behauptet.

Abschliessend im tatsächlichen Projekt: 6/6 Firefox-Suiten inklusive persona-text-recovery erfolgreich. Bestehende Textkorrekturen blieben erhalten und wurden mitgeprüft.
