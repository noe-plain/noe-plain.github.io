# Drei MKW-Entwürfe zur Freigabe – 16. November 2026

Status: bearbeitbare Entwürfe, nicht in der mitgelieferten Bibliothek registriert. Diese Vorlagenarbeit wurde ausdrücklich vorgezogen; die übrige Phasenplanung bleibt bestehen. Keine Produktionsquelle oder bestehende Vorlage wurde ersetzt.

## Gestaltung

Alle Slides: 1080 × 1350. Höchstens ein linksbündiges Textfeld pro Slide; reine Bildfolien benötigen keines. Übertitel 64 px, Titel 100–110 px, beide Replica LL in Versalien. Enge Absatzabstände statt separater verteilter Textfelder. Untertitel und Fliesstext: Harriet V2 Text, im Studio als „Harriet Regular“ geführt, normale Schreibweise. Gemischte Schriften und Versalien werden durch vorhandene Zeichenformate im selben Textfeld umgesetzt. Normaler Trenner: Gedankenstrich „–“.

Alle Verläufe: Multiplizieren, 39 % Deckkraft. Konzertauftakt und Bilder-Slider verwenden vollflächige Fotos; neue Fotos erfordern einen geeigneten Ausschnitt für lesbaren Text. Die vorhandenen Studio-Logos werden unverzerrt eingesetzt.

| Datei              | Aufbau                                                                                                                                                          | Schnell austauschen                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `auftakt.mkw`      | Eine Konzertankündigung mit vollflächigem Foto; kompakter Übertitel/Titel/Termin-Block.                                                                         | Foto und gemeinsamer Textblock.               |
| `menschen.mkw`     | Nahe am Orchester: 1. Logo → Bild → Titel; 2. schmaleres rechtsbündiges Bild, freier Streifen links; 3. Übertitel und Harriet-Fliesstext, ohne Hintergrundfoto. | Zwei Bilder, Titel, Übertitel und Fliesstext. |
| `bilderslider.mkw` | Drei Slides mit sieben unabhängigen Bildplätzen. Titelblock nur auf Slide 1; zwei übergreifende Bildrahmen führen über beide Slide-Grenzen weiter.              | Übertitel/Titel und sieben Bildplätze.        |

Bildstrecken-Inspiration: [Seamly – durchgehende Bildstrecken über Slide-Grenzen](https://seamly.art/). Eigenständiger Entwurf, keine fremden Vorlagen oder Bilder kopiert.

## Öffnen und bearbeiten

Die MKW-Dateien über „Projekt öffnen“ im Studio öffnen. Texte über das gemeinsame Textfeld und dessen vorhandene Absatz-/Zeilenauswahl bearbeiten. Bilder im vorhandenen Bildrahmen ersetzen; die übergreifenden Bilder des Sliders sind jeweils eine einzige Ebene, damit der Ausschnitt an der Slide-Kante zusammenpasst. Rahmen und Verläufe sind gegen versehentliches Verschieben gesperrt und können bei Bedarf entsperrt werden.

Die zusätzlichen JSON-Dateien enthalten die bildfreien Vorlagendaten für eine spätere freigegebene Aufnahme. Zum direkten Bearbeiten die MKW-Dateien verwenden. Die Vorlagenbibliothek wurde noch nicht erweitert.

Alle Termine, Texte und Personenbezeichnungen sind Beispiele. Fotos: Noë Plain, zwei vorhandene Probeaufnahmen aus dem Studio-Testbestand. Dieselben beiden Fotos veranschaulichen mehrere Slots; sieben Bildplätze bedeuten nicht sieben verschiedene Beispielaufnahmen. Bei Veröffentlichung Inhalte, Ausschnitte und Bildnachweise redaktionell einsetzen.

## Prüfung und Grenzen

- Drei native MKW-Dateien mit insgesamt sieben Slides erzeugt, mit bestehendem Schreiber/Leser geprüft und im echten lokalen Studio geöffnet.
- Alle Standardtexte ohne Überlauf; längere repräsentative Titel geprüft. Kein automatisches Versprechen für beliebig lange Texte.
- Textbearbeitung über sichtbaren Editor, unveränderte übrige Ebenen und Undo/Redo in allen drei Dateien geprüft.
- Renderpixel vor/nach MKW-Rundlauf exakt gleich. Beide Slider-Übergänge zusätzlich mit jeweils 32 Pixel breiten Randstreifen bei halber Vorschauauflösung gegen die durchgehende Bildstrecke geprüft: maximal 8/255 Kanalabweichung und mittlere Kanalabweichung maximal 0,02/255 als Toleranz für vereinzelte Canvas-Rasterrundungen an skalierten Bildkanten. Tatsächliche Messwerte stehen in verification.json. Dies ist keine Behauptung identischer Rasterung sämtlicher SVG-Logo-Pixel zwischen verschieden breiten Zeichenflächen.
- Native PNG-Vorschauen aus dem bestehenden Renderer; keine zusätzlichen PDF-/PSD- oder InDesign-Abnahmen für diese Entwürfe behauptet.
- Bestehende Bibliothek, aktives Ausgangsprojekt und dessen Verlauf bleiben bei der Erzeugung unverändert. Vorherige Basis: 203 Modelltests und bestehende Chrome-Vorlagensuiten bestanden.
- Firefox-Prüfung nicht bestanden/abgenommen: der lokale Firefox konnte wegen macOS-Prozess-/Grafikbeschränkungen nicht starten. Keine Sicherheitsfunktionen umgangen.
- Die drei vom Nutzer benannten Originalprojekte im Downloads-Ordner waren wegen macOS-Lesezugriffssperre nicht lesbar. Sie wurden nicht verändert und noch nicht als visuelle Referenz ausgewertet. Der direkte Abgleich bleibt offen, bis lesbare Kopien vorliegen.

## Sechs Persona-Perspektiven

| Persona             | Prüfung / Feedback                                                                                                       | Status                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Neue Nutzerin       | Wenige klar benannte Bild- und Textplätze; Beispiele statt leerer Fläche.                                                | Entwurf umgesetzt; Freigabe offen.                                               |
| Erfahrener Designer | Gemeinsame Textblöcke, Absatz-/Zeichenformate, echte übergreifende Bildebenen.                                           | Im Editor geprüft.                                                               |
| Senior UX-Experte   | Konzert ankündigen, Menschen vorstellen und Bildstrecke erzählen sind getrennte klare Anwendungsfälle.                   | Aufbau umgesetzt.                                                                |
| UI-Expertin         | Gemeinsames Raster, eng gesetzte Versalien, Harriet-Fliesstext, Logo und 39-%-Verläufe konsistent. Keine neue Editor-UI. | Visueller Entwurfscheck; Abgleich der drei Originalprojekte offen.               |
| QA-Entwicklerin     | Modellvalidierung, Dateirundlauf, identische Rundlaufpixel und reale Textbearbeitung.                                    | Chrome geprüft; Firefox-Zugang offen.                                            |
| Fehlersucher        | Längere Titel, Erzeugung ohne Bibliotheks-/Projektmutation, Rückgängig/Wiederholen.                                      | Gezielte Prüfungen bestanden; extreme Inhaltslängen nicht automatisch abgedeckt. |

## Reproduzieren

Im Studio-Projekt mit installierten vorhandenen Abhängigkeiten:

```sh
npm run test:browser -- ../drafts/content-templates-2026-11-16/verify ../drafts/content-templates-2026-11-16/exercise-editor
node drafts/content-templates-2026-11-16/make-preview.cjs
```

Ausgabe standardmässig `/tmp/mkw-vorlagen-2026-11-16`; abweichend mit `MKW_DRAFT_OUTPUT`. Die Rezepte registrieren keine Vorlagen. Nach ausdrücklicher Freigabe des Nutzers: Originalreferenzen abgleichen, ausgewählte Entwürfe finalisieren und erst dann in die Bibliothek aufnehmen.
