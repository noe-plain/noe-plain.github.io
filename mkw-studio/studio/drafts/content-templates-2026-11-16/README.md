# Drei freigegebene MKW-Vorlagen – 16. November 2026

Status: Der Nutzer hat die drei gezeigten Vorlagen einschliesslich der letzten Änderungen ausdrücklich zur Veröffentlichung freigegeben. Die vorhandene Winkel-Slidepost-Vorlage bleibt erhalten; die drei neuen Layouts werden im bestehenden Galerieablauf ergänzt. Diese Vorlagenarbeit wurde ausdrücklich vorgezogen; die übrige Phasenplanung bleibt bestehen.

## Gestaltung

Alle Slides: 1080 × 1350. Höchstens ein linksbündiges Textfeld pro Slide; reine Bildfolien benötigen keines. Übertitel 64 px, Titel 100–110 px, beide Replica LL in Versalien. Enge Absatzabstände statt separater verteilter Textfelder. Untertitel und Fliesstext: Harriet V2 Text, im Studio als „Harriet Regular“ geführt, normale Schreibweise. Gemischte Schriften und Versalien werden durch vorhandene Zeichenformate im selben Textfeld umgesetzt. Normaler Trenner: Gedankenstrich „–“.

Alle Verläufe: Multiplizieren, 39 % Deckkraft. Konzertauftakt und Bilder-Slider verwenden vollflächige Fotos; neue Fotos erfordern einen geeigneten Ausschnitt für lesbaren Text. Die vorhandenen Studio-Logos werden unverzerrt eingesetzt.

| Datei              | Aufbau                                                                                                                                                                                            | Schnell austauschen                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `auftakt.mkw`      | Eine Konzertankündigung mit vollflächigem Foto; kompakter Übertitel/Titel/Termin-Block.                                                                                                           | Foto und gemeinsamer Textblock.               |
| `menschen.mkw`     | Nahe am Orchester: 1. Logo → Bild → Titel; 2. schmaleres rechtsbündiges Bild, freier Streifen links; 3. Übertitel und Harriet-Fliesstext, ohne Hintergrundfoto.                                   | Zwei Bilder, Titel, Übertitel und Fliesstext. |
| `bilderslider.mkw` | Drei Slides mit vier unabhängigen Bildplätzen. Slide 2 hat einen linken Bildwinkel hinter drei Fotos; Slide 3 bleibt ohne eigene Ebenen offen und zeigt nur den Anschnitt der zweiten Bildbrücke. | Übertitel/Titel und vier Bildplätze.          |

Bildstrecken-Inspiration: [Seamly – durchgehende Bildstrecken über Slide-Grenzen](https://seamly.art/). Eigenständiger Entwurf, keine fremden Vorlagen oder Bilder kopiert.

## Öffnen und bearbeiten

Die MKW-Dateien über „Projekt öffnen“ im Studio öffnen. Texte über das gemeinsame Textfeld und dessen vorhandene Absatz-/Zeilenauswahl bearbeiten. Bilder im vorhandenen Bildrahmen ersetzen; die übergreifenden Bilder des Sliders sind jeweils eine einzige Ebene, damit der Ausschnitt an der Slide-Kante zusammenpasst. Rahmen und Verläufe sind gegen versehentliches Verschieben gesperrt und können bei Bedarf entsperrt werden.

Die zusätzlichen JSON-Dateien enthalten die bildfreien Vorlagendaten für eine spätere freigegebene Aufnahme. Zum direkten Bearbeiten die MKW-Dateien verwenden. Im Studio sind die drei Layouts zusätzlich über „Vorlagen“ verfügbar, sobald der veröffentlichte Stand geladen ist.

Alle Termine, Texte und Personenbezeichnungen sind Beispiele. Fotos: Noë Plain, zwei vorhandene Probeaufnahmen aus dem Studio-Testbestand. Dieselben beiden Fotos veranschaulichen mehrere Slots; vier Bildplätze bedeuten nicht sieben verschiedene Beispielaufnahmen. Bei Veröffentlichung Inhalte, Ausschnitte und Bildnachweise redaktionell einsetzen.

## Prüfung und Grenzen

- Drei native MKW-Dateien mit insgesamt sieben Slides erzeugt, mit bestehendem Schreiber/Leser geprüft und im echten lokalen Studio geöffnet.
- Alle Standardtexte ohne Überlauf; längere repräsentative Titel geprüft. Kein automatisches Versprechen für beliebig lange Texte.
- Textbearbeitung über sichtbaren Editor, unveränderte übrige Ebenen und Undo/Redo in allen drei Dateien geprüft.
- Renderpixel vor/nach MKW-Rundlauf exakt gleich. Beide Slider-Übergänge zusätzlich mit jeweils 32 Pixel breiten Randstreifen bei voller Exportauflösung gegen die durchgehende Bildstrecke geprüft: maximal 8/255 Kanalabweichung und mittlere Kanalabweichung maximal 0,05/255 als Toleranz für vereinzelte Canvas-Rasterrundungen an skalierten Bildkanten. Tatsächliche Messwerte stehen in verification.json. Dies ist keine Behauptung identischer Rasterung sämtlicher SVG-Logo-Pixel zwischen verschieden breiten Zeichenflächen.
- Native PNG-Vorschauen aus dem bestehenden Renderer; keine zusätzlichen PDF-/PSD- oder InDesign-Abnahmen für diese Entwürfe behauptet.
- Bestehende Bibliothek, aktives Ausgangsprojekt und dessen Verlauf bleiben bei der Erzeugung unverändert. 206 Modell-/Pakettests bestanden, einschliesslich neuer Katalog-/Ladefehler- und Typografieprüfungen. Die bestehenden Vorlagensuiten sowie PNG/ZIP/MKW-, PDF- und PSD-Regressionen bestanden lokal; der neue Galerieablauf prüft alle drei Vorlagen, die Winkelebenenreihenfolge und die offene dritte Folie.
- Firefox-Prüfung nicht bestanden/abgenommen: der lokale Firefox konnte wegen macOS-Prozess-/Grafikbeschränkungen nicht starten. Keine Sicherheitsfunktionen umgangen.
- Die drei vom Nutzer benannten Originalprojekte im Downloads-Ordner waren wegen macOS-Lesezugriffssperre nicht lesbar. Sie wurden nicht verändert und noch nicht als visuelle Referenz ausgewertet. Der direkte Abgleich bleibt offen, bis lesbare Kopien vorliegen.

## Sechs Persona-Perspektiven

| Persona             | Prüfung / Feedback                                                                                                       | Status                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Neue Nutzerin       | Wenige klar benannte Bild- und Textplätze; Beispiele statt leerer Fläche.                                                | Umgesetzt und ausdrücklich freigegeben.                                          |
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

Ausgabe standardmässig `/tmp/mkw-vorlagen-2026-11-16`; abweichend mit `MKW_DRAFT_OUTPUT`. Die Rezepte registrieren keine Vorlagen. Die ausdrückliche Freigabe der gezeigten Entwürfe liegt vor. Der noch fehlende Zugriff auf die drei Originalreferenzen wird nicht als gestalterischer Abgleich behauptet und verhindert die beauftragte Veröffentlichung dieser bestätigten Layouts nicht. Verbindlicher Veröffentlichungs-/CI-Nachweis: docs/TEMPLATE-RELEASE-2026-11-16.md und die zugehörige Prüfdatei.
