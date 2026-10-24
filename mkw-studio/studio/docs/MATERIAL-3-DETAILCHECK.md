# Material 3: Detailprüfung und nächste Schritte

Stand: 24. Oktober 2026. Geprüft wurden die gemeinsam verwendeten Bedienelemente und ihre Ausprägungen in Start, Einrichtung, FD-Kampagnen, Designer, Einstellungen, Vorlagen, Bibliothek, Speichern, Export und Wiki. Grundlage sind die Quellmodule und die Firefox-/Chrome-Prüfungen. Diese Liste ist ein Arbeitsplan; die unten aufgeführten Restarbeiten sind noch nicht umgesetzt.

Das Tool verwendet eigene, an Material 3 angepasste Web-Komponenten. Es ist noch keine vollständige 1:1-Umsetzung der Material-Komponenten. Besonders Farbmodell, Form-Morphing und Bewegungsabläufe unterscheiden sich technisch von Googles Referenz. Die vorhandenen MKW-Schriften und die gewünschten platzsparenden Arbeitsflächen bleiben bewusst erhalten.

## Zuerst erledigen

1. **Eingabefelder und Fehlerzustände vereinheitlichen.** Ein gemeinsamer Aufbau für Beschriftung, Wert, Einheit und Fehlermeldung. Die heutigen Aussenbeschriftungen funktionieren; Filled-/Outlined-Felder mit konsistenter Fokus- und Fehlerdarstellung würden Material genauer entsprechen. Fehler müssen am betroffenen Feld erscheinen und über `aria-describedby`/`aria-invalid` verständlich sein. Keine springenden Texte oder veränderten Zahlenwerte.
2. **Browser-Meldungen durch gemeinsame Dialoge ersetzen.** Beim Entfernen eines Bildes, Importfehlern, Ersetzen von Vorlagen und einzelnen Projektentscheidungen werden noch `alert()`/`confirm()` verwendet. Diese sehen je nach Browser anders aus. Einheitliche Material-Dialoge mit eindeutigen Aktionen, sicherem Abbrechen und Rückkehr des Fokus verbessern den Ablauf. Die Systemfenster für Dateiauswahl bleiben erhalten.
3. **Interaktionszustände zentral abstimmen.** Hover, Tastaturfokus, gedrückt, ausgewählt und deaktiviert verwenden bereits gemeinsame Rollen, aber unterschiedliche Komponenten setzen noch eigene Überlagerungen und Deckkraftwerte. Die Zustandsflächen sollten aus einem gemeinsamen Satz von Tokens kommen. Auswahl darf beim Darüberfahren nicht verschwinden; deaktivierte Aktionen dürfen keine aktive Rückmeldung zeigen. Zoomtasten an ihren Grenzen sichtbar deaktivieren, statt einen weiteren Klick lediglich zu begrenzen.
4. **Kleine Bedienziele nachprüfen.** Besonders der Schliessen-Button im FX-Fenster und die technischen Farb-/Verlaufskontrollen brauchen einen durchgängigen grossen unsichtbaren Klickbereich. Die sichtbaren Griffe bleiben klein und präzise. Komfortabel und kompakt getrennt prüfen; für Touch die grösseren Ziele sicherstellen.

## Danach verfeinern

5. **Öffnen und Schliessen passend animieren.** Dialoge, Menüs und Farbpicker blenden momentan hauptsächlich ein; das Schliessen erfolgt unmittelbar. Material unterscheidet räumliche und reine Farbeffekte genauer. Kurze, unterbrechbare Ein-/Ausblendungen und zum Auslöser passende Menübewegungen ergänzen. Escape, Fokus, erneutes Öffnen und reduzierte Bewegung müssen zuverlässig bleiben. Keine Wartezeit vor Speichern oder Export hinzufügen.
6. **Tabs, Gruppen und Regler fein abstimmen.** Der aktive Tab-Unterstrich wechselt derzeit direkt. Einen gemeinsamen gleitenden Auswahlindikator für zusammengehörige Tabs/Segmentgruppen vorsehen. Bei Reglern fehlen teilweise die zum Griff gehörende Wertanzeige und ein eindeutig zusammengehöriger Track-Abstand. Vorhandene Zahlenfelder und Tastatursteuerung bleiben erhalten; keine Werte runden oder begrenzen, die das bisher nicht tun.
7. **Material-Farberzeugung präzisieren.** Die heutige Hauptfarbe erzeugt geprüfte, gut lesbare UI-Töne mit einer eigenen OKLab-Berechnung. Googles [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) verwenden HCT/CAM16 und eigene dynamische Schemata. Für möglichst genaue Material-Farben eine kleine, lokal gebündelte Lösung prüfen und mit der heutigen Palette vergleichen. Normal/Komplementär, beide Themes und Extremfarben testen. Farben von Artworks, Logos, Verläufen und exportierten Dateien dürfen davon niemals abhängen.
8. **Expressive-Bewegung und kleine Typografie angleichen.** Die Ladeform rotiert und morpht bereits in einem ruhigen Kreis; die Kurven sind eine CSS-Annäherung statt Googles gerundeter Polygon-/Federberechnung. Rundungen und Übergänge in einem kleinen Prototyp verbessern, ohne eine zusätzliche Animationsschleife einzuführen. Kleine Metadaten und FX-Hilfstexte besitzen noch eigene 10-/11-/13-px-Werte: nach tatsächlicher Rolle auf die gemeinsamen Schrift-Tokens abbilden. Die MKW-Schriften bleiben erhalten.

## Komponentenprüfung

„Angenähert“ bedeutet eine konkrete Restarbeit, keinen Funktionsausfall. Gemeinsame Änderungen sollen im jeweiligen Eigentümer erfolgen, statt neue globale CSS-Überschreibungen anzuhängen.

| Bereich / Elementfamilie | Vorhanden und beibehalten | Noch anzupassen |
| --- | --- | --- |
| Hauptfarbe, Light/Dark, Normal/Komplementär | Semantische UI-Rollen, Kontrastprüfungen, getrennte Dokumentfarben | Eigene OKLab-Palette statt HCT; Schritt 7 |
| Bento-Flächen, Header, Montage, Seitenleisten | Gemeinsame Oberflächen, abgerundete Container, gleiche Theme-Rollen, zurückhaltende Artwork-Schatten | Keine neue Layout-Umstellung erforderlich; kleine Abstände nur mit betroffenen Inhalten abgleichen |
| Startaktionen und Projekteinstieg | Zwei priorisierte Aktionsreihen, Vorlagen, Öffnen/Fortsetzen, Einstellungen, optionales Hintergrundbild | Gemeinsame Zustandsflächen/Bewegung, Schritte 3 und 5 |
| Gefüllte, tonale, umrandete und reine Icon-Buttons | Semantische Farben, Tastaturfokus, Press-Rückmeldung und Disabled | Eigene Hover-Werte an einzelnen Stellen; Schritt 3 |
| Schwebende Werkzeugpille und externer Export | Aktives Werkzeug, Beschriftungen bei genügend Platz, Icon-Modus, Advanced vertikal | Zustände zentral angleichen, keine Änderung der Werkzeugpositionen |
| Warnung neben Export | Gleiche Abmessungen, verständliche Warnliste und Export weiterhin möglich | Kein offener Grössenfehler in dieser Prüfung |
| Footer, Zoom, Grid, Magnet und Sidebar | Zoom in beiden Modi identisch: Einpassen, Minus, Prozentwert und Plus. 100 % als Smartphone-Referenz mit 390 CSS-Pixeln; Kurzbefehle und echte Exportgrössen bleiben erhalten | Übrige Ansichtsaktionen: lokale Hover-Werte über Schritt 3 angleichen |
| Checkboxen in FD-Optionen und Formularen | Native Mehrfachauswahl, sichtbarer Fokus, Checkmark und Mixed-State | Winkel-Innenlabel in dieser Änderung ohne zusätzliche graue Fläche/Umrandung; übrige Zustandsflächen Schritt 3 |
| Switches in Einstellungen | Eigener Daumen, Ein/Aus, Tastatur und reduzierte Bewegung | Hover-/Pressed-Rückmeldung mit gemeinsamen Zustandsflächen abstimmen |
| Modus-, Theme-, Format- und Schriftgruppen | Gewählte Option erkennbar, Labels/Icons und passende Rundungen | Auswahlwechsel/State-Layer, Schritte 3 und 6 |
| Text-/Zahlenfelder und Textareas | Beschriftungen, Einheiten, native Eingabe, Grenzen und Tastatur | Einheitliche Filled/Outlined-Anatomie und Fehler, Schritt 1 |
| Dropdown-Felder, einschliesslich Winkel | Native Auswahl, Fokus und Werterhalt; Winkel passend zur Optionszeile | Die geöffnete Liste ist weiterhin browserabhängig. Falls eigene Material-Liste: erst nach Feldern und mit vollständiger Tastatur-/Screenreader-Bedienung |
| Schieberegler für Qualität, Effekte und Deckkraft | Native Tastatur/Assistenz, reale Werte und bestehende Zahlenfelder | Track/Griff/Wertanzeige je Einsatzzweck abgleichen, Schritt 6 |
| Text-Tabs Zeichen/Absatz und Einstellungsnavigation | Klare aktive Auswahl, Tastaturwechsel und beschriftete Panels | Aktiver Indikator bewegt sich noch nicht zwischen Positionen, Schritt 6 |
| FD-Bildkarten, Copyright und Aktionen | Einheitliche Kartenbreite, alle Aktionen, Optionen und Thumbnail-Cache | Schriftrollen für Metadaten nachziehen, Schritt 8 |
| FD-Optionsbereich und Trennlinien | Textgruppe, Winkel, Familienkonzert und Sponsoren klar gegliedert | Keine weitere Trennlinie hinzufügen; bestehende Gruppierung erhalten |
| Designer-Ebenen, Ordner und FX-Zeilen | Auswahl, Farben, Auf-/Zuklappen, Sichtbarkeit, Sperre, Umbenennen und Reihenfolge | Zustände weiter vereinheitlichen; Drag-Ziel optisch klarer von normaler Auswahl abgrenzen |
| Ebenenmenüs und FX-Auswahl | Anker, Tastatur, deaktivierte Einträge auffindbar, Escape und Fokus-Rückkehr | Momentan einfache Einblendung; Schritt 5 |
| FX-Fenster und Bestätigungen | Eindeutiger Inhalt, anpassbare Werte, eigener Dialog | Kleiner FX-Schliessen-Bereich und native Bestätigungen, Schritte 2 und 4 |
| Farbpicker, Fläche/Kontur und Swatches | Ein gemeinsamer Picker, Alpha, Verlauf, Bild, Transparenz, Tastatur und Positionierung | Technische Controls bleiben eigene Grafikwerkzeuge; Hit-Targets und Zustände prüfen, Schritte 3 und 4 |
| Verlaufspunkte, Mittelpunkt, Farbflächen | Direkte Anpassung ohne verzögerte Darstellung | Keine dekorative Bewegung während des Ziehens; nur Fokus-/Auswahlfeedback vereinheitlichen |
| Einrichtung, Formatkarten und Safezone-Vorschau | Kontrolliertes Enthüllen mit Animation und inaktiven verborgenen Feldern | Gemeinsame Feld-/Fehlerzustände, Schritt 1 |
| Vorlagenkarten, Befüllen und Slider-Vorschau | Lazy-Vorschauen, Auswahl, Navigation, Bilder und Benennung | Zustandsflächen und kleine Schriftrollen, Schritte 3 und 8 |
| Bibliothek, Speichern und Exportdialog | Gemeinsame Flächen, Dateikonflikte, Downloadfortschritt, echte Grössen/Vorschauen | Feld- und Bestätigungsanatomie, Schritte 1 und 2 |
| Einstellungen und Wiki | Gleiche Fenstergrösse, linke Navigation, eigenständiges Scrollen, Wiki lazy | Gemeinsame Öffnungs-/Schliessbewegung, Schritt 5 |
| Tooltips | Eine beschriftete, begrenzte Hilfe, Fokusbezug und Bereinigung | Keine dringende strukturelle Abweichung; State-Layer-Abgleich mitnehmen |
| Ladeindikatoren | Rotierende Morph-Form mit stationärem Kreis, reale Lebensdauer, Ende-/Fehlerbereinigung | Rundungs-/Federannäherung, Schritt 8; keine zusätzlichen dauerhaft laufenden Indikatoren |
| Messbarer Import-/Exportfortschritt | Wavy-Indikator mit tatsächlichen Werten, Ende wird ruhig | Native Semantik beibehalten; bestehende Wellen sind eine Web-Annäherung |
| Speichermeldungen, Fehler und Leerzustände | Status, schliessbare Meldungen, finite Aufmerksamkeit und Wiederherstellung | Native Fehlermeldungen durch gemeinsamen Dialog oder Inline-Fehler ersetzen, Schritte 1 und 2 |
| Artwork, Texteingabe, Pfad-/Kurvengriffe, Crop, Snap und Pan/Zoom | Unmittelbares Gestalten und identische Exportdarstellung | Bewusst keine Material-Dekorationsanimation und keine Änderung der gestalteten Inhalte |
| System-Dateiauswahl | Native Speicherort-/Öffnen-Fenster, vorhandene Browser-Fallbacks | Systemoberfläche bleibt vom Betriebssystem gesteuert |

## Zustände und Bewegung

Für gemeinsam verwendete Controls wurden Normal, Hover, Tastaturfokus, gedrückt, ausgewählt, deaktiviert, Laden und Fehler berücksichtigt, soweit der jeweilige Control diese Zustände hat. Dazu kommen beide Themes, Komplementärfarbe, kompakte Dichte, schmale Fenster, reduzierte Bewegung und Systemkontrast. Die bestehenden Browser-Prüfungen decken diese Familien ab; eine Quellprüfung ersetzt keine Messung jeder möglichen Inhaltskombination.

Schon umgesetzt: Farbrückmeldung, Fokusrahmen, kurzlebige Press-Rückmeldung, Switch-/Checkbox-Übergänge, Enthüllen der Formatdetails, ruhige Karten-/Tool-Auswahl, morphende Ladeanzeigen und echter wellenförmiger Fortschritt. Noch angenähert: ein allgemeines Fade-in für sehr unterschiedliche Pop-ups, sofortiges Schliessen, springende Tab-Indikatoren, keine echte physikalische Feder und teils lokale statt gemeinsame Zustandswerte.

Bei reduzierter Bewegung bleiben alle Informationen und Aktionen vorhanden. Direkte Gestaltung darf weder weich nachlaufen noch auf eine Animation warten. Laufende Ladevorgänge/Erkennung/Exporte erhalten keine erfundene Prozentzahl.

## Sichere Reihenfolge für die Umsetzung

Jeden Schritt als kleine eigene Änderung behandeln: zuerst gemeinsames Element, danach seine Instanzen in beiden Editoren. Anschliessend Firefox, Chrome, Tastatur, schmale Darstellung und unveränderte Exportbilder prüfen. Dokumentmodell, Werkzeugbefehle, Dateiformat und gespeicherte Einstellungen dabei nicht beiläufig umbauen. Keine pauschale Framework-Umstellung oder neue CDN-Abhängigkeit.

## Referenzen und Code-Eigentümer

- [Material 3: Zustände](https://m3.material.io/foundations/interaction/states/overview) und [Bewegung](https://m3.material.io/styles/motion/overview/how-it-works).
- Offizielle Web-Komponenten: [Textfelder](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md), [Checkboxen](https://github.com/material-components/material-web/blob/main/docs/components/checkbox.md), [Menüs](https://github.com/material-components/material-web/blob/main/docs/components/menu.md), [Slider](https://github.com/material-components/material-web/blob/main/docs/components/slider.md) und [Dialoge](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md).
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities): HCT, dynamische Schemata, Komplementärfarben.
- [Offizielle Expressive-Ladeanzeige](https://github.com/material-components/material-components-android/blob/master/docs/components/LoadingIndicator.md). Android ist hier die Referenz für Form/Bewegung, keine zusätzliche Browser-Laufzeit.
- Gemeinsame Controls/Feedback: `controls.css`, `ui-controls.js`, `ui-menus.js`, `ui-theme.css`.
- Farben: `ui-colour-model.js`, `ui-theme.js`, `build/ui-theme.mjs`.
- Shell/Toolbar: `chrome.css`, `workspace-ui.css`; Formulare/Navigation: `editor-forms.css`, `dialogs.css`, `typography.css`.
- FD: `post-workspace.css`, `post-inspector.js`; Designer-Liste/FX: `carousel-refinements.css`, `carousel-layer-actions.js`, `carousel-layer-effects.js`.
- Native Bestätigungen: `state.js`, `studio.js`, `template-ui.js`, `project-session.js`.
- Picker: `paint-picker.css/js`; übrige Dialoge: `projects.css`, `export-ui.css`, `templates.css`; Hilfe: `hilfe/`.
