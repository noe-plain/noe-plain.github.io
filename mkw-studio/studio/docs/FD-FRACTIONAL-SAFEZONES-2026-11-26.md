# FD-Altdateien mit Schutzzonen auf Teilpixeln

Der FD-Backup-Editor speichert Schutzzonen mit Nachkommastellen. Die Umwandlung rundete jede Seite separat. Bei einer kleinen Restfläche konnte die Summe nach dem Runden die gesamte Breite oder Höhe belegen und eine gültige Ausgabe abweisen. Auch bei grösseren Restflächen konnten die Hilfslinien gegenüber der Altgestaltung leicht versetzt erscheinen.

Die geschützte Umwandlung übernimmt die exakten Ränder in die Kampagnen-Artboards. Die gemeinsame Formatprüfung der Kampagne akzeptiert endliche, nichtnegative Ränder, die sich nicht berühren oder überschneiden. Die sichtbare Mindestfläche von einem Pixel entspricht der bisherigen Textlayout-Regel. Ausgabegrösse, ganzzahlige Pixelmasse und das bestehende Limit von 200 Ausgaben bleiben erhalten. Neue Designer-Formate verwenden weiterhin ganzzahlige Werte. Bereits konvertierte Kopien werden beim Öffnen nicht umformatiert.

| Persona | Feedback / Prüfung | Status |
| --- | --- | --- |
| Neue Nutzerin | Die vorhandene Konvertierung erstellt eine getrennte Kopie auch dann, wenn die alte Schutzzone Teilpixel enthält. | Gelöst für diesen Fall |
| Erfahrener Designer | Ränder, Logo und Text behalten ihre Position. Die Referenz-PNG bleibt auch nach dem MKW-ZIP-Rundlauf bytegleich. | Gelöst für diesen Fall |
| Senior UX-Experte | Bestätigung gilt nur für das aktuelle Original und dessen Revision. Bei echter Überschneidung greift weiterhin die Vorprüfung. | Gelöst für diesen Fall |
| UI-Expertin | Die Kampagnenführung verwendet die übernommenen Ränder mit derselben sichtbaren Mindestfläche wie die Altansicht. Die vorhandenen Bedienelemente bleiben konsistent. | Gelöst für diesen Fall |
| QA-Entwicklerin | Zwei knapp positive Restflächen, eine normale Teilpixel-Schutzzone mit Text und Logo sowie MKW und Exporte geprüft. | Gelöst für diesen Fall |
| Destruktiver Fehlersucher | Zwei absichtlich überlappende Ränder und ein Projekt- oder Revisionswechsel während der Bestätigung führen zu keiner Teilkonvertierung. | Gelöst für diesen Fall |

Formatierung, reproduzierbarer Build und 231 Modell-/Dateitests geprüft. Die gezielten Chromium-Prüfungen deckten Konvertierung, Familienlayout, Winkel, FD-Formatverknüpfung, PSD und ältere MKW-Speicherung ab. Die lokale «Dichterlos»-ZIP-Arbeitskopie lieferte nach der Umwandlung und Wiederöffnung erneut 18 pixelgleiche PNGs. Die Eingabedatei war danach bytegleich. Die präzisen Teilpixel-Grenzfälle entsprechen synthetischen Prüfdaten.

B02 bleibt offen. Die verfügbare echte FD-Arbeitskopie belegt die reguläre Konvertierung. Für eine repräsentative Abnahme fehlen weiterhin zusätzliche echte Familien-, Winkel- und Sponsorenprojekte. FD-Backup bleibt im Studio.
