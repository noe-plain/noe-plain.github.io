# B02 · Familiengestaltung je Ausgabe erhalten

Eine alte Bildreihe kann dieselbe Fotodatei in mehreren Ausgabeformaten verwenden und die Familiengestaltung nur bei einzelnen Ausgaben einschalten. Nach der Konvertierung verwendete die Textvorschau das gemeinsame Reihenmerkmal. Damit konnte ein reguläres Sujet beim Export seinen ursprünglichen Logoschatten und seine Typografie verlieren. Ein Wechsel der Winkeloptionen konnte zusätzlich die gespeicherte Familienvariante überschreiben.

Kampagnen verwenden für Text, Hintergrund und Logoschatten die gespeicherten Einstellungen der jeweiligen Ausgabe. In der Bildkarte zeigt das vorhandene Kontrollkästchen einen gemischten Zustand, wenn nur ein Teil der Reihe zur Familiengestaltung gehört. Ein bewusster Klick kann die Gestaltung auf alle Ausgaben der Bildreihe anwenden. Die Farbauswahl gilt für die bereits aktiven Familienausgaben. Winkeländerungen bleiben davon unabhängig. Die Konvertierung und der MKW-Export verwenden die vorhandenen Seitendaten und das bestehende Dateiformat.

| Persona | Feedback / Prüfung | Status |
| --- | --- | --- |
| Neue Nutzerin | Eine alte Bildreihe bleibt nach der Übernahme visuell nachvollziehbar. Die Bildkarte zeigt unterschiedliche Zustände an. | Gelöst für diesen Fall |
| Erfahrener Designer | Familienfarben, Palettenversatz und der reguläre Logoschatten bleiben pro Ausgabe erhalten. | Gelöst für diesen Fall |
| Senior UX-Experte | Familienfarbe, Winkel und ausdrückliches Anwenden auf die Reihe sind getrennte Aktionen mit nachvollziehbarer Wirkung. | Gelöst für diesen Fall |
| UI-Expertin | Der gemischte Zustand nutzt das vorhandene Kontrollkästchen und lässt sich per Tastatur bedienen. | Gelöst für diesen Fall |
| QA-Entwicklerin | Zwei synthetische Ausgaben wurden pixelgenau vor und nach Konvertierung und MKW-ZIP-Wiederöffnung verglichen. Weitere Originalprojekte fehlen. | Teilfall gelöst, vollständige Abnahme offen |
| Destruktiver Fehlersucher | Original bleibt getrennt. Änderung und Undo stellen den gemischten Zustand wieder her. Der Wechsel der Familiengestaltung lässt bestehende Winkelobjekte bestehen. | Gelöst für diesen Fall |

Der Testfall verwendet eigene synthetische Daten. Die acht bereits geprüften Palettenversätze sowie die PNG-, PDF-, PSD-, Winkel- und Alttext-Regressionsfälle decken zusätzliche vorhandene Funktionen ab. Die vollständige B02-Abnahme benötigt weiterhin weitere echte Familien-, Winkel- und Sponsorenprojekte. FD-Backup bleibt verfügbar.
