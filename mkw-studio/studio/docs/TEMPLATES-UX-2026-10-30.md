# Vorlagen – Überarbeitung und Abnahme

## Bewertung vor der Umsetzung

| Perspektive | Bisheriges Problem / Auswirkung | Entscheidung und Prüfkriterium |
|---|---|---|
| Neue Nutzerin | Die Auswahl blieb über dem Befüllen stehen; unklar, was als Nächstes zu tun ist | Zwei Ansichten in einem Dialog: Design wählen → Inhalte einsetzen. Rückweg klar beschriften, ein primärer Abschluss „Im Designer öffnen“. Der Projektname wird aus der Einrichtung übernommen. Fehlende Bilder werden am Feld erklärt. |
| Erfahrener Nutzer | Bei vielen Vorlagen und Ebenen lange Suche; Wechsel kann wiederholte Arbeit verursachen | Suche und Sammlung, Inhaltsfilter pro Zeichenfläche. Entwürfe je Vorlage während des offenen Dialogs bewahren, Filter blenden nur aus und erstellen Felder nicht neu. |
| UX/UI | Zu viel gleichzeitig sichtbar, Ebenenposition kaum erkennbar | Auswahlkarten mit Vorschau, beim Befüllen Formular links / Instagram-artige Vorschau rechts. Fokus auf ein Feld zeigt die passende Fläche und einen nicht exportierten Positionsrahmen. Einheitliche Material-Farben, Abstände und Zustände. |
| Barrierefreiheit | Räumliche Zuordnung war nur aus Bildern abzuleiten; Fehlerfokus wenig präzise | Native beschriftete Suche/Selects/Buttons, textliche Flächenzugehörigkeit, Fokus nach Auswahl, Feldfehler statt nur globalem Fehler. Tastatur und schmale Ansicht prüfen; kein Zwang zu Wischen/Drag. |
| Entwicklung/QA | Vorschauen müssen isoliert bleiben; unterschiedliche Zeichenflächen benötigen gemeinsame Geometrie | Unveränderliche Vorlagen, getrennte Vorschau-Dokumente, bewährter Renderer. Nur aktuelle Slide malen, Vorschauen verzögert/gecached. Freie Zeichenflächen mit Format und Position speichern; Winkel beziehen sich standardmässig auf ein Bild derselben Fläche. |

Die Abläufe sind eigene produktbezogene UX-Entscheidungen. Material 3 liefert Komponentenkonzept und visuelle Rollen, keine Vorschrift für einen Designvorlagen-Assistenten.

## Quellen / Einordnung

- [M3 Cards](https://m3.material.io/components/cards/overview): Karten repräsentieren einzelne auswählbare Designs.
- [M3 Dialogs](https://m3.material.io/components/dialogs/guidelines): fokussierter modaler Arbeitsablauf; vorhandene native Dialog- und Fokusinfrastruktur bleibt erhalten.
- [Material Web](https://github.com/material-components/material-web): offizieller Web-Bezug, laut README im Maintenance-Modus. Keine neue UI-Laufzeitabhängigkeit allein für diese Änderung. Browser-native Semantik und bestehende zentrale Tokens bleiben Grundlage.
- Die M3-Webseiten lieferten beim Textabruf nur den JavaScript-Hinweis. Deshalb keine erfundenen Detailvorgaben zu exakten Abständen/Animationen aus diesen Seiten.

## Aufgaben / Akzeptanz

- [x] T01 Auswahl und Befüllen trennen; Zurück erhält Entwürfe, Projektname und Kürzel. Erstellen ist nur beim Befüllen möglich.
- [x] T02 Suche/Sammlung mit verständlichem Leerzustand, lazy Vorschauen und Tastaturbedienung.
- [x] T03 Felder pro Zeichenfläche filtern, Eingaben erhalten, Fokus mit Vorschau verknüpfen; gemischte Formate korrekt.
- [x] T04 Vorlagenspeichern erklärt foto-freie Inhalte, prüft Namen lokal; Originaldesign bleibt bei Abbruch erhalten.
- [x] T05 Bestandsvorlagen, freie Flächen, MKW/Setup, Abbruch, Fehler und Rückwege in Firefox/Chromium prüfen; schmale und dunkle Ansicht/axe kontrollieren.
- [ ] T06 Wiki aktualisieren, geprüften Stand veröffentlichen und CI/Pages nachverfolgen.

## Nachkontrolle

Wird mit tatsächlichen Prüfungen ergänzt. Persona-Szenarien sind keine Studie mit fünf echten Testpersonen.

## Durchgeführte Prüfungen vor Veröffentlichung

- 131 Unit-Tests, Formatprüfung und reproduzierbarer Browser-Build erfolgreich.
- Vollständiger Firefox-Durchlauf: 75/76 erfolgreich. Der einzelne Fehler betraf einen veralteten Test, der bewusst ausgeblendete Auswahlbuttons vermass. Die Prüfung misst nun die Auswahl vor dem Befüllen und die sichtbaren Bedienelemente danach; keine Mindestgrössen wurden reduziert.
- Abschliessend 13/13 relevante Firefox-Suites erfolgreich: freie Einrichtung/Position/Format/Schutzzonen, Undo, Legacy-Pixelgleichheit, MKW/Browsersicherung, PDF-Mischformate, PSD-Slices/Masken, Vorlagen-Auswahl/Befüllen/Abbruch/Fehler, Bestandsbibliothek, Einrichtung, Winkel, Ausrichtung und Textüberarbeitung.
- Automatische axe-Prüfung im Vorlagen- und Zeichenflächenbereich; visuelle Screenshots für Desktop, 500px und tatsächlichen Darkmode kontrolliert. Keine Studie mit echten Persona-Testpersonen, kein manueller Screenreader- oder Photoshop-Test.
- Im vollständigen Firefox-Lauf auch 50 Fotoimporte, MKW speichern/wiederöffnen, grosse Bildexporte, Speicherfehler und mehrere Tabs geprüft.
- Sehr grosse/weit auseinanderliegende Flächen: Studio-Raster auf 16000 px pro Kante / 24 MP begrenzt. PSD weiterhin maximal 30000 px pro Kante / 80 MP; Grenzen werden erklärt, Einzelbilder behalten ihr Format.

Chromium: dieselben 13 Prüfszenarien bestanden, davon die asynchrone Löschbestätigung separat erneut geprüft. Der Test wartet ausdrücklich auf den abgeschlossenen Dialogauftrag statt nur auf das Ende des Klicks.

Veröffentlichungsprüfung folgt nach dem Push; die abschliessenden GitHub- und Live-Ergebnisse werden im lokalen Releaseprotokoll des Arbeitsbereichs festgehalten.
