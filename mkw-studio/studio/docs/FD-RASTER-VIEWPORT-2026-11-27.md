# FD-Rastertreue und Arbeitsflächen-Vorschau

## Referenzprojekt und Rasterung

Bei drei Ausgaben lagen die Restabweichungen an der Abbildung unveränderter Alt-Transformationen. Für diese Hintergründe und Bildwinkel verwendet die Umwandlung dieselbe Zeichenreihenfolge und Canvas-Transformation wie das Altprojekt. Veränderte Geometrie, Masken oder Effekte verwenden die normalen editierbaren Ebenen. Die Umwandlung übernimmt ausserdem bewusst fehlende Rollen aus dem freigegebenen Prüfzweig. Neue Ausgaben können spätere Formatvorlagen weiterhin übernehmen.

Alle 14 PNGs des privaten Referenzprojekts waren vor und nach der Umwandlung sowie nach dem Wiederöffnen pixelgleich. Das Referenzprojekt enthält sieben Bilder, sieben Schriften, zwei Winkel- und zwei Familienausgaben. Drei PDF-Stichproben mit ihren Originalformaten wurden gelesen. Die Referenzdatei verbleibt lokal.

## Scrollen und Ziehen

Das sichtbare Raster behält seinen Ursprung und Inhalt, bis der neue Ausschnitt fertig ist. Der Positionswechsel und die Veröffentlichung der Pixel erfolgen zusammen. Identische Vorschauanfragen lassen eine laufende Zeichnung weiterarbeiten. Beim Verschieben starten die neue Vorschau und die Auswahlgriffe in derselben Eingabeverarbeitung. Die letzte Position aus Pointer-Up wird berücksichtigt. Die volle Aktualisierung beim Abschluss behält die bestehende Verknüpfungs-, Verlauf- und Speicherlogik bei.

| Persona | Nachweis |
| --- | --- |
| Neue Nutzerin | Keine umplatzierte alte Vorschau während eines absichtlich blockierten Scroll-Renderings. |
| Erfahrener Designer | Reale Mausgeste in FD-Kampagnen und Designer. Neue Pixelposition vor der Freigabe der Maustaste sichtbar, Position danach erhalten. |
| Senior UX-Experte | Derselbe Vorschauablauf in beiden Editoren, überlappender alter Ausschnitt bleibt bis zum Austausch korrekt verankert. |
| UI-Expertin | Farbe und Bildausschnitt der 14 Alt-Ausgaben stimmen mit dem Original überein. |
| QA-Entwicklerin | 234 Modell-/Dateitests, gezielte Chromium-Suiten, zwei reale Modusabläufe und 200-Slide-Vorschau geprüft. |
| Destruktiver Fehlersucher | Eine absichtlich wartende Vorschau bleibt korrekt verankert. Wiederholte identische Anforderungen verwerfen die Zeichnung nicht. |

Messumfang ist lokales Chromium mit einem realen FD-Projekt und synthetischen Designer-Lastfällen. FD-Backup bleibt bis zur vollständigen Ablösefreigabe verfügbar. Die Plattformfreigabe wird getrennt nach tatsächlichem Ergebnis dokumentiert.
