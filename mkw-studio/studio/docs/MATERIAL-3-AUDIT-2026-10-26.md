# MKW Studio: Prüfung aus sieben Blickwinkeln

Stand: 26. Oktober 2026. Ausgangscommit: `09b9b0042b28bad4b16bdaf4eb0b793e32b4d70f`. Bestandsprüfung **vor** Änderungen an der Anwendung; Instrumentierung separat. Die Korrekturen A01–A10 sind nach den unten protokollierten Prüfungen abgeschlossen; L01/L02 bleiben konkret benannte externe Prüfgrenzen.

## Methodik und Aussagegrenzen

36 Komponentenfamilien, 41 tatsächlich geöffnete Firefox-Kontexte. Wiederholte Controls werden pro Verwendungskontext erfasst. Vollständige Rohbelege liegen im Arbeitsbereich unter `work/audits/material3-2026-10-26/` (JSON, Accessibility-Snapshots, PNGs). Quellinventar allein ist kein Laufzeitbeweis. Die exportierbaren Designs werden nicht auf M3 umgestaltet.

Diese Matrix ist ein Bestandsreview aller UI-Familien, keine Behauptung jedes möglichen Zustands jeder Datei-/Font-/Objektkombination. Zustände Standard/Hover/Fokus/Pressed/Auswahl/Disabled/Laden/Leer/Erfolg/Fehler werden am gemeinsamen Owner und in abweichenden Kontexten geprüft; bei nichtinteraktiven Informationen sind Hover/Pressed/Disabled N/A. Canvas-Artefaktfarben sind Nutzerinhalt und in Kontrastscans ausgeschlossen; Präzisionsgriffe sind separat zu beurteilen. Automatische axe-Ergebnisse, Codebeurteilung und Screenshotkontrolle werden nicht mit einer vollständigen WCAG-Zertifizierung gleichgesetzt. Reale AT, Touchhardware, Photoshop und OS-Dialoge: L01/L02.

## Quellen und Geltungsbereich

D = offizielle M3 Designempfehlung; W = konkrete offizielle Web-Implementierung; A = separate W3C Accessibilitygrundlage. Komponentenwahl für dieses Tool und Ausführung mit nativen HTML-Controls sind eigene begründete UX-/Engineeringentscheidungen. dp/sp aus Android sind keine pauschalen CSS-Pixelvorgaben. 24CSSpx ist WCAG2.2 mit Ausnahmen; grössere Ziele sind eigene robuste Webanpassung.

- **D01** [M3 Grundlagen (Designempfehlung)](https://m3.material.io/foundations/)
- **D02** [M3 Farbrollen (Designempfehlung)](https://m3.material.io/styles/color/the-color-system)
- **D03** [M3 Typografie (Designempfehlung)](https://m3.material.io/styles/typography/applying-type)
- **D04** [M3 Listen (Designempfehlung)](https://m3.material.io/components/lists/overview)
- **D05** [M3 App-Bar (Designempfehlung)](https://m3.material.io/components/app-bars/)
- **D06** [M3 Motion (Designempfehlung)](https://m3.material.io/styles/motion)
- **D07** [M3 Toolbar (JS-Seite; textueller Abruf eingeschränkt)](https://m3.material.io/components/toolbars/overview)
- **W01** [Material Web: Dialog; Web-Implementierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md)
- **W02** [Material Web: Textfelder; Web-Implementierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md)
- **W03** [Material Web: Slider; Web-Implementierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/slider.md)
- **W04** [Material Web: Iconbutton; Web-Implementierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/icon-button.md)
- **W05** [Material Web: Menu; Web-Implementierungsreferenz](https://github.com/material-components/material-web/blob/main/docs/components/menu.md)
- **A01** [W3C WCAG2.2: Kontrast (Understanding erklärt SC1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **A02** [W3C WCAG2.2: sichtbarer Name (SC2.5.3)](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
- **A03** [W3C WCAG2.2: Zielgrösse (SC2.5.8; Ausnahmen beachten)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **A04** [W3C APG Dialog (Implementierungsleitfaden, keine separate WCAG-Norm)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **A05** [W3C APG Toolbar (Implementierungsleitfaden)](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)

- **A06** [W3C WCAG2.2 Name/Role/Value (SC4.1.2)](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)

Material-Web ist laut [offiziellem README](https://github.com/material-components/material-web#readme) im Wartungsmodus. Kein Frameworkwechsel: native Controls und bestehende Owner behalten. [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) ist offizielle HCT/CAM16-Referenz; die bestehende OKLab-Palette wird nicht fälschlich als identische Implementierung bezeichnet. Abweichung allein rechtfertigt keine Migration, nachweisbar schlechte Rollenzuordnung dagegen A01. [Material Symbols](https://github.com/google/material-design-icons) werden lokal genutzt. [Android LoadingIndicator](https://github.com/material-components/material-components-android/blob/master/docs/components/LoadingIndicator.md) liefert Expressive-Inspiration, keine Web-Laufzeitvorschrift. [Angular Components](https://github.com/angular/components) ist offiziell, aber kein Grund für Angular-Migration.

Wartungsstatus (GitHub API am Prüftag; pushed_at ist kein Wartungsversprechen):

| Repository | Archiviert | Letzter Push UTC | Einordnung |
|---|---|---|---|
| [material-components/material-web](https://github.com/material-components/material-web) | False | 2026-10-22T22:43:48Z | Wartungsmodus laut README |
| [material-foundation/material-color-utilities](https://github.com/material-foundation/material-color-utilities) | False | 2026-10-19T19:42:38Z | Referenz; Plattformkontext beachten |
| [material-components/material-components-android](https://github.com/material-components/material-components-android) | False | 2026-10-16T19:16:37Z | Referenz; Plattformkontext beachten |
| [google/material-design-icons](https://github.com/google/material-design-icons) | False | 2026-10-23T02:18:57Z | Referenz; Plattformkontext beachten |
| [angular/components](https://github.com/angular/components) | False | 2026-10-23T19:35:47Z | Referenz; Plattformkontext beachten |

Einige m3.material.io Unterseiten liefern im textuellen Abruf nur „requires JavaScript“. Ausgewertet wurden dort verfügbare offizielle indexierte Inhalte und verlinkte offizielle Repo-Dokumente; keine erfundenen Detailmasse oder behauptete visuelle Inspektion dieser Quellseiten. Motion: aktuelles M3 Expressive arbeitet mit Spring-System; vorhandene CSS-Easings sind Webannäherungen, kein Anspruch identischer Plattformphysik. Effekte wie opacity dürfen nicht überschwingen.

## Inventar und sieben Bewertungen je Elementfamilie

Pro Familie: Zweck/Komponentenentscheidung, anschliessend sieben getrennte Bewertungen. Fundstellen sind relativ zum Studio-Quellverzeichnis `mkw-studio/studio/` im Git-Repository (hier `work/mkw-studio/`). Verbindliche Korrekturen und Abnahme unten; nicht aufgeführte Alternativen bringen keinen nachgewiesenen Vorteil.

### 01. Startseite
Fundstelle: `start.js`, `style.css`
Zweck und Komponentenwahl: Projekt beginnen/fortsetzen; priorisierte Buttons statt Menü, beibehalten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Neues Projekt klar priorisiert; leeres Fortsetzen erklärt |
| 2 Komponentenwahl | Filled/tonal/outlined passend zu Aktion und Priorität |
| 3 Visuelles Design | Hilfstexte zu blass → A01 |
| 4 Interaktion/Zustände | Laden/leeres Archiv vorhanden |
| 5 Barrierefreiheit | Namen vorhanden, Kontrast korrigieren |
| 6 Animation | Einblendung/Ripple; reduzierte Bewegung vorhanden |
| 7 Responsive/Technik | 1500 und 390 px; Status wächst |

### 02. Header & globale Aktionen
Fundstelle: `workspace-ui.js`, `chrome.css`
Zweck und Komponentenwahl: Datei, Hilfe, Einstellungen; kompakter App-Header.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Inspector-Schalter als Eigenschaften benennen → A03 |
| 2 Komponentenwahl | App-Bar für Kontext, Toolaktionen separat sinnvoll |
| 3 Visuelles Design | Lokale Material-Symbole, semantische Farben |
| 4 Interaktion/Zustände | Undo/Redo deaktiviert, Speichern/Öffnen vorhanden |
| 5 Barrierefreiheit | Funktionale Namen überwiegend vorhanden |
| 6 Animation | Ripple blockiert Klick nicht |
| 7 Responsive/Technik | Gemessener Icon-only-Wechsel statt abgeschnittener Namen |

### 03. Werkzeug-Pillen beider Editoren
Fundstelle: `workspace-ui.js`, `carousel-render.js`
Zweck und Komponentenwahl: Werkzeug wählen; gruppierte Befehle.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Ausschnitt/Sponsoren Namen konsistent → A02 |
| 2 Komponentenwahl | Floating Toolbar als gruppierte Werkzeugnavigation passend |
| 3 Visuelles Design | Externes Exportziel bleibt erhalten |
| 4 Interaktion/Zustände | Aktiver Zustand sichtbar und aria-pressed |
| 5 Barrierefreiheit | Nav+native Buttons; kein role=toolbar ohne Roving-Fokus |
| 6 Animation | Zustandslayer zentral, Präzisionsgriffe ausgenommen |
| 7 Responsive/Technik | Advanced vertikal, einfach horizontal; schmale Ansicht geprüft |

### 04. Footer, Zoom, Raster, Magnet, Seitenleiste
Fundstelle: `workspace-ui.js`, `post-workspace.js`, `carousel-render.js`
Zweck und Komponentenwahl: Ansicht steuern ohne Designänderung; Zoomfeld mit +/-.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Eigenschaften statt globaler Einstellungen → A03 |
| 2 Komponentenwahl | Numerischer Zoom mit Buttons sinnvoller als unpräziser Slider |
| 3 Visuelles Design | Gleiche Zoomdarstellung vorhanden |
| 4 Interaktion/Zustände | Grenzwerte ohne deaktivierte Buttons → A06 |
| 5 Barrierefreiheit | Labels/Shortcuts vorhanden; Grenzen synchronisieren |
| 6 Animation | Zoom folgt Eingabe; kein dekorativer Übergang nötig (N/A) |
| 7 Responsive/Technik | Phone-Referenz390 bleibt; Clamps editorabhängig |

### 05. Hinweise am Export
Fundstelle: `workspace-ui.js`, `workspace-ui.css`
Zweck und Komponentenwahl: Problem finden und betroffenes Objekt wählen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Text erklärt Ursache und Ziel; Anzahl + Symbol |
| 2 Komponentenwahl | Nicht blockierendes Panel statt Bestätigungsdialog passend |
| 3 Visuelles Design | Warnung nicht nur Farbe |
| 4 Interaktion/Zustände | Schliessen/Escape verliert Fokus → A04 |
| 5 Barrierefreiheit | Fokus zum Auslöser/Zielkontrolle → A04 |
| 6 Animation | Nicht blinkend; N/A Dauer bei statischem Panel |
| 7 Responsive/Technik | Panel höhenbegrenzt, Inhalt scrollbar |

### 06. Projektbibliothek
Fundstelle: `project-session.js`, `projects.css`
Zweck und Komponentenwahl: Browserprojekt oder MKW-Datei öffnen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Quelle/Datum/Entfernen verständlich; gemeinsamer Einstieg |
| 2 Komponentenwahl | Listenkarten passend; kein Dateimenü zusätzlich nötig |
| 3 Visuelles Design | Keine neue Palette erforderlich |
| 4 Interaktion/Zustände | Leere/Lade/Fehlerzustände vorhanden; native Bestätigung → A07 |
| 5 Barrierefreiheit | Dialog + zugängliche Aktionen; Rückkehr nach Löschen prüfen |
| 6 Animation | Ladeindikator vorhandener gemeinsamer Owner |
| 7 Responsive/Technik | Max5 Projekte, Originaldatei bleibt beim Löschen |

### 07. Einrichten: Modus & Name
Fundstelle: `setup-ui.js`, `dialogs.css`
Zweck und Komponentenwahl: FD/Designer wählen und benennen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Icons+Namen besser als unbeschriftete Auswahl |
| 2 Komponentenwahl | Exklusive Segmentbuttons als pressed-Gruppe zulässig |
| 3 Visuelles Design | Gemeinsame Abstände/Flächen vorhanden |
| 4 Interaktion/Zustände | Pflichtname und Rückmeldung vorhanden |
| 5 Barrierefreiheit | Tastatur/Labels; native Inputs erhalten |
| 6 Animation | Auswahlwechsel reduziert Bewegung berücksichtigt |
| 7 Responsive/Technik | Schmale Dialoglayouts in vorhandenen Tests |

### 08. FD-Formate & Safezonen
Fundstelle: `project-formats.js`, `post-safezone.js`
Zweck und Komponentenwahl: Formate anlegen und Innenabstände verstehen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Skizze unterstützt Zahlen; abgewählte Formate kompakt |
| 2 Komponentenwahl | Checkboxen für Mehrfachwahl, Zahlen für exakte Masse passend |
| 3 Visuelles Design | Skizze ist Dokumentvorschau, nicht Theme-Artwork |
| 4 Interaktion/Zustände | Ungültige Summen verhindern Anwenden |
| 5 Barrierefreiheit | Preview aria-label braucht semantischen Bildkontext → A02 |
| 6 Animation | Expansion unterstützt Zuordnung; reduced-motion vorhanden |
| 7 Responsive/Technik | Werte nicht still auf andere Dokumente übertragen |

### 09. Designer-Slides & Format
Fundstelle: `carousel-slides.js`, `carousel-slide-format.js`
Zweck und Komponentenwahl: 1–20 Slides und gemeinsames Format bearbeiten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Wirkung auf alle Slides ausdrücklich benannt |
| 2 Komponentenwahl | Kontextpanel statt sofortiger Resize-Mutation passend |
| 3 Visuelles Design | Safezonen-Vorschau konsistent FD |
| 4 Interaktion/Zustände | Übernehmen deaktiviert bis gültige Änderung; Warnung bleibt |
| 5 Barrierefreiheit | Nummerische Alternativen; grössere Touchziele vorhanden |
| 6 Animation | Geometrieänderung bewusst direkt; Motion N/A |
| 7 Responsive/Technik | 20-Slide Limits reine Policytests, Export begrenzt Raster |

### 10. Vorlagengalerie
Fundstelle: `template-gallery.js`, `template-session.js`
Zweck und Komponentenwahl: Vorlage wählen und Inhalte abfüllen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Schritte/Fehlende Bilder/Designer-Ziel vorhanden |
| 2 Komponentenwahl | Karten für visuelle Auswahl, danach Formular sinnvoll |
| 3 Visuelles Design | Beschreibung/Status hell zu blass → A01 |
| 4 Interaktion/Zustände | Laden/Fehler/Retry und Entwurfserhalt vorhanden |
| 5 Barrierefreiheit | Dialogsemantik; Livepreview erfordert zusätzliche SR-Prüfung |
| 6 Animation | Preview coalesced; keine Blockieranimation |
| 7 Responsive/Technik | Slider+Formular rechts/untereinander adaptiv |

### 11. Vorlagen-Vorschau & Abfüllfelder
Fundstelle: `template-fill-preview.js`, `templates.css`
Zweck und Komponentenwahl: Welches Feld verändert welche Stelle?.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Benannte Ebenen+Slide-Vorschau erhalten |
| 2 Komponentenwahl | Spezial-Artworkpreview statt generischer M3-Komponente nötig |
| 3 Visuelles Design | Dokumentrendering unverändert |
| 4 Interaktion/Zustände | Pflichtbilder gezählt; Winkel nutzt Hintergrund |
| 5 Barrierefreiheit | Dateiinputs und beschriftete Texte; Pixelpreview nicht Textalternative |
| 6 Animation | Stale Resultate verworfen |
| 7 Responsive/Technik | Bilder nicht in Designvorlage speichern; grosse Daten nicht duplizieren |

### 12. Vorlagen speichern/Bibliothek
Fundstelle: `template-save.js`, `template-ui.js`
Zweck und Komponentenwahl: Benannte Designs wiederverwenden.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Ebenenprüfung erhält Ordnung |
| 2 Komponentenwahl | Dialog für mehrstufige Benennung passend |
| 3 Visuelles Design | Gemeinsame Felder, bestehende Vorlagenkarten |
| 4 Interaktion/Zustände | Entfernen über Browserconfirm → A07 |
| 5 Barrierefreiheit | Abbrechen muss zuverlässig bleiben |
| 6 Animation | Ladezustände vorhanden |
| 7 Responsive/Technik | IndexedDB Fehlerpfad getestet; Rückkehrstatus |

### 13. FD-Bildkarten & Aktionen
Fundstelle: `studio.js`, `post-workspace.js`
Zweck und Komponentenwahl: Bild verwalten; Formate und Copyright.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Erstes Bild Textvorlage sichtbar, individuelle Optionen |
| 2 Komponentenwahl | Karte bündelt objektbezogene Aktionen sinnvoll |
| 3 Visuelles Design | Abstände/Thumbnail konsistent |
| 4 Interaktion/Zustände | Entfernen-Bestätigung verbessern → A07 |
| 5 Barrierefreiheit | Format hinzufügen zugänglicher Name abweichend → A02 |
| 6 Animation | Keine einklappenden Karten mehr |
| 7 Responsive/Technik | Thumbs viewportnah/seriell, keine Vollbildkopien |

### 14. FD-Optionen & Winkel
Fundstelle: `studio.js`, `post-angle.js`
Zweck und Komponentenwahl: Texte/Familie/Sponsoren/Winkel aktivieren.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Zusammenfassung und Auswahlziel sinnvoll |
| 2 Komponentenwahl | Mehrfachcheckboxen plus exklusives Richtungsselect korrekt |
| 3 Visuelles Design | Keine neue generische Dropdown-Ersetzung nötig |
| 4 Interaktion/Zustände | Checkbox unabhängig, Winkel nur pro Bild |
| 5 Barrierefreiheit | Summary-Namen dynamischen Inhalt nutzen → A02 |
| 6 Animation | Native details; reduzierte Bewegung |
| 7 Responsive/Technik | Keine Winkelübertragung auf andere Bilder; Geometrie testen |

### 15. FD-Zuschnitt & Format ändern
Fundstelle: `post-inspector.js`, `studio.js`, `state.js`
Zweck und Komponentenwahl: Foto/Arbeitsfläche präzise einstellen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Rahmen versus Inhalt erklärt |
| 2 Komponentenwahl | Exakte Zahlen + direkte Griffe ergänzen sich |
| 3 Visuelles Design | Foto ist Nutzerinhalt, M3-Farben N/A |
| 4 Interaktion/Zustände | Resizefehler bisher Browseralert → A08 |
| 5 Barrierefreiheit | Resizeart ohne Name, Pfeile ohne Zwecktext → A02 |
| 6 Animation | Drag coalesced, kein Layout-Animationzwang |
| 7 Responsive/Technik | Bestehende Grenzwerte erhalten; Inlinefehlermeldung statt Alert |

### 16. FD-Texte & Stapel
Fundstelle: `post-inspector.js`, `post-text-stack.js`
Zweck und Komponentenwahl: Titel, Format und Abstände je Format.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Vererbung nur vom ersten Bild und gleichem Format |
| 2 Komponentenwahl | Textfelder/Stackabstand passend; kein Datumpflichtfeld |
| 3 Visuelles Design | Markenschriften bleiben im Artwork |
| 4 Interaktion/Zustände | Fontgrössen/Case/Absatz ändern Source nicht |
| 5 Barrierefreiheit | Labels/Fehlerrückmeldung zentral |
| 6 Animation | Direkteditieren soll pixelgleich bleiben |
| 7 Responsive/Technik | Inline-Fidelity + Titelgrössenscope Regressiontests |

### 17. Logo & Sponsoren im Projekt
Fundstelle: `sponsor-ui.js`, `post-inspector.js`
Zweck und Komponentenwahl: Logo wählen/ersetzen; Sponsoren verteilen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Automatik und manuelle Korrektur ergänzen sich |
| 2 Komponentenwahl | Buttons/Select je exklusive Darstellung passend |
| 3 Visuelles Design | Auto/Mulitply/Screen sind Dokumentfarben, nicht Theme |
| 4 Interaktion/Zustände | MKW-Logo geschützt; Sponsorassets kompakt |
| 5 Barrierefreiheit | Beschriftete Größen/Modi, DnD hat Tastaturalternative |
| 6 Animation | Import-Laden und Ergebnisstatus vorhanden |
| 7 Responsive/Technik | Rasteranalysen einmalig, Cache begrenzt |

### 18. Designer-Auswahl/Transform/Foto/Winkel
Fundstelle: `carousel-input.js`, `carousel-transform.js`, `carousel-sidebar.js`
Zweck und Komponentenwahl: Objekte auswählen, positionieren, drehen, Inhalt skalieren.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Doppelklick Inhalt; Werte als exakte Alternative |
| 2 Komponentenwahl | Spezialcanvasgriffe erforderlich, generischer Button wäre ungeeignet |
| 3 Visuelles Design | User-Artwork nicht M3-Theme unterwerfen |
| 4 Interaktion/Zustände | Shift-Snap/Undo/Logoobergrenze bestehende Tests |
| 5 Barrierefreiheit | Numerische Position/Grösse/Rotation; freie Gesten nicht vollständig SR-geprüft |
| 6 Animation | Pointerbursts coalesced statt springender Objektanimation |
| 7 Responsive/Technik | Precisiontargets nicht pauschal vergrössern; reale Touchhardware offen |

### 19. Designer-Text & gemeinsame Typografie
Fundstelle: `typography-ui.js`, `carousel-text.js`
Zweck und Komponentenwahl: Zeichen/Absatz bearbeiten ohne Sourceverlust.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Zeichen/Absatz klare progressive Aufteilung |
| 2 Komponentenwahl | Tabs für gleichrangige Propertyseiten passend |
| 3 Visuelles Design | Tabindikator/Felder vorhanden |
| 4 Interaktion/Zustände | Case/Script/Justify/Trennung bleiben |
| 5 Barrierefreiheit | Symbolknöpfe als Icons kennzeichnen, Farbwert im Namen → A02 |
| 6 Animation | Zustandswechsel ohne Textmutation |
| 7 Responsive/Technik | Absatz-/Zeichentests, Schriftfallbackplattform separat |

### 20. Pfade/Kurven/Formkonstrukteur
Fundstelle: `carousel-vectors.js`, `carousel-curves.js`, `carousel-constructor.js`
Zweck und Komponentenwahl: Freie Vektoren und Knoten bearbeiten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Nur Advanced; Shortcuts/Beenden/Offene Enden vorhanden |
| 2 Komponentenwahl | Spezialisierte Zeicheninteraktion, kein exaktes M3-Äquivalent (N/A) |
| 3 Visuelles Design | Toolbar-Icons M3, Pfaddarstellung Designspezifikation |
| 4 Interaktion/Zustände | Weiterführen/Schliessen/Verbinden/Undo Tests erhalten |
| 5 Barrierefreiheit | Mehrpunktgesten nicht vollständig per SR bedienbar; Einschränkung L01 |
| 6 Animation | Gestrichelte Vorschau dient Feedback; keine dekorative Animation |
| 7 Responsive/Technik | Tight bounds, cache und stale guards geprüft in vorhandenen Suiten |

### 21. Ebenenliste & Ordner
Fundstelle: `carousel-sidebar.js`, `carousel-refinements.js`, `carousel-layer-actions.js`
Zweck und Komponentenwahl: Reihenfolge, Auswahl, Sichtbarkeit, Sperren, Umbenennen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Label/Kinderzahl/Ordnerbezug nachvollziehbar |
| 2 Komponentenwahl | Segmentierte Liste mit trailing actions sinnvoller als Tree-Rolle ohne Tree-Tastatur |
| 3 Visuelles Design | Farben ergänzen Namen und Einrückung |
| 4 Interaktion/Zustände | F2/Doppelklick/Enter/Escape vereinheitlicht |
| 5 Barrierefreiheit | Ordnernamen ohne sichtbare Kinderzahl → A02; Landmark → A02 |
| 6 Animation | Collapse/Rename braucht keinen wilden Übergang |
| 7 Responsive/Technik | Native DnD plus Tastaturreorder; versteckte Objekte bleiben im File |

### 22. Ebenen-Menüs
Fundstelle: `ui-menus.js`, `carousel-layer-actions.js`
Zweck und Komponentenwahl: Seltenere Befehle ohne überladene Zeile.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Mehr-Icon mit Objektname |
| 2 Komponentenwahl | Menü statt Buttonliste dauerhaft passend |
| 3 Visuelles Design | Divider logisch vorhanden |
| 4 Interaktion/Zustände | Pfeile/Home/End/Tippen/Escape implementiert |
| 5 Barrierefreiheit | Popup-Inhalt ausserhalb Landmark → A02; Rollen nicht entfernen |
| 6 Animation | Kurzer transform/opacity Übergang, reduced-motion |
| 7 Responsive/Technik | Viewportclamp + ein Resize-Frame; keine neue Pollingloop |

### 23. FX-Auswahl & Effektzeilen
Fundstelle: `carousel-layer-effects.js`
Zweck und Komponentenwahl: Einzeleffekte hinzufügen/sichtbar machen/entfernen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Eingerückt bei Ebene statt separater Effektlayer |
| 2 Komponentenwahl | Menu für Add, Buttons pro Effekt passend |
| 3 Visuelles Design | FX-Name sollte im zugänglichen Namen beginnen → A02 |
| 4 Interaktion/Zustände | Gespeicherte Effekte unabhängig von Ebene schaltbar |
| 5 Barrierefreiheit | Effektname+Wert gemeinsam benennen → A02 |
| 6 Animation | Stärke live, keine zeitbasierte Datenmutation |
| 7 Responsive/Technik | Deterministisches Noise, begrenzte Effectcache |

### 24. FX-Popup
Fundstelle: `carousel-layer-effects.js`, `carousel-refinements.css`
Zweck und Komponentenwahl: Effekt numerisch/mit Slider anpassen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Ebene im Popup genannt, Fertig eindeutig |
| 2 Komponentenwahl | Nichtmodales Propertypopup statt modaler Bestätigung passend |
| 3 Visuelles Design | Close-Ziel vergrössern → A05 |
| 4 Interaktion/Zustände | Fokus nach Schliessen verloren → A04 |
| 5 Barrierefreiheit | Stärke mit Einheit vorlesen → A04 |
| 6 Animation | Livevorschau; reduced-motion vorhandene Popoverregeln |
| 7 Responsive/Technik | Vertikales Clamp bei kurzer Höhe ergänzen → A04 |

### 25. Farbwahl: Fläche/Kontur
Fundstelle: `paint-picker.js`, `paint-picker.css`
Zweck und Komponentenwahl: Füllung/Kontur wählen und tauschen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Überlappende Ziele erschweren Bedienung → A05 |
| 2 Komponentenwahl | Iconbuttons mit ausgewähltem Zustand, keine Dokument-Neustruktur |
| 3 Visuelles Design | Affinity-Überlappung bleibt in einem46px-Gesamttarget; Kanalwahl im Popup → A05 |
| 4 Interaktion/Zustände | Keine Farbe/Swap erhalten |
| 5 Barrierefreiheit | 46px-Gesamttarget und48px-Kanalwahl im Popup → A05 |
| 6 Animation | N/A: Farbfelder müssen keine Animation erzwingen |
| 7 Responsive/Technik | Kompakte vertikale Advancedpille, Überlauf prüfen |

### 26. Farbpicker: Farbe/Alpha/Verlauf/Bild
Fundstelle: `paint-picker.js`, `paint-model.js`
Zweck und Komponentenwahl: Farbe/Transparenz/Stops/Bild bearbeiten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Modus schliesst nicht unterstützte Optionen aus |
| 2 Komponentenwahl | Custom Farbspektrum erforderlich, Select für Modus passend |
| 3 Visuelles Design | Ein Singleton, Paletteoberfläche von Dokumentpaint getrennt |
| 4 Interaktion/Zustände | Picker-Koordinaten/Klaviatur/Abbruch vorhanden |
| 5 Barrierefreiheit | HSV/Alpha alternative Zahlen; Farbwertnamensproblem in Aufrufer → A02 |
| 6 Animation | Direkte Rückmeldung; reduced-motion |
| 7 Responsive/Technik | Position relativ Aufrufer mit Viewportgrenzen, Bildloader begrenzt |

### 27. Speichern/Dateiname
Fundstelle: `project-session.js`, `file-io.js`, `projects.css`
Zweck und Komponentenwahl: Datei speichern/unter/Autosave erklären.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Firefox Downloadlimits ausdrücklich benannt |
| 2 Komponentenwahl | Dialog für expliziten Dateivorgang; Autosave Status nichtmodal |
| 3 Visuelles Design | Speicherhinweis durch opacity zu blass → A01 |
| 4 Interaktion/Zustände | Dateiversionskonflikt verhindert stilles Überschreiben |
| 5 Barrierefreiheit | Dialoglabels/Validierung vorhanden |
| 6 Animation | Nonblocking Status und dismissible Fehler |
| 7 Responsive/Technik | Streamingcontainer/Indexänderung; fünf Browserprojekte; grosse Datei Tests |

### 28. Export: Auswahl & Vorschau
Fundstelle: `export.js`, `projects.css`
Zweck und Komponentenwahl: Motive prüfen/auswählen und herunterladen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Bilder links, Einstellungen rechts, alle an/ab |
| 2 Komponentenwahl | Kartencheckboxen + separate Aktion korrekt |
| 3 Visuelles Design | Rasterpreview bewusst encoded bytes wie Download |
| 4 Interaktion/Zustände | Stale Vorschauen verworfen; leere Auswahl blockiert |
| 5 Barrierefreiheit | Beschriftete Formate, Anzahl, Fortschritt |
| 6 Animation | Messbarer Vorgang determiniert statt unendlicher Spinner |
| 7 Responsive/Technik | Serial encoding + CPUreadback gegen Firefoxfotoverlust |

### 29. Export: JPG/PNG/WebP/PDF/PSD
Fundstelle: `export.js`, `carousel-pdf.js`, `carousel-psd.js`
Zweck und Komponentenwahl: Plattformformat und Qualität wählen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Presets mit manueller Korrektur; PSD Grenzen benannt |
| 2 Komponentenwahl | Exklusive Formatbuttons, Slider Qualität, Zahlen PNGfarben passend |
| 3 Visuelles Design | Transparenz nur wenn Ausgabe transparent |
| 4 Interaktion/Zustände | Grössenabschätzung, busy, Fehler, abbrechbare Vorbereitung |
| 5 Barrierefreiheit | Einheiten/Labels vorhanden; OSdialog nicht automatisierbar → L02 |
| 6 Animation | Wavy determiniert, lange Exportphase kein blinder Spinner |
| 7 Responsive/Technik | PNG8/PDF/PSD spezielle Regressiontests; keine Vektorfidelity behaupten |

### 30. Einstellungen-Navigation
Fundstelle: `settings-ui.js`, `dialogs.css`
Zweck und Komponentenwahl: Werkzeugpräferenzen finden.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Links Kategorien, rechts Aufgaben; Dateien getrennt |
| 2 Komponentenwahl | Vertikale Tabs für gleichrangige Bereiche passend |
| 3 Visuelles Design | Responsive gemeinsame Dialoggrössen |
| 4 Interaktion/Zustände | Auswahl + Tastatur vorhanden |
| 5 Barrierefreiheit | Label/tabpanel Beziehungen vorhanden |
| 6 Animation | Unmittelbarer Tabwechsel; Animation kurz und optional |
| 7 Responsive/Technik | Mobile auf obere Navigation; lange Inhalte scrollen |

### 31. Einstellungen: Darstellung/Bedienung/Raster
Fundstelle: `appearance.js`, `ui-theme.js`, `carousel-grid.js`
Zweck und Komponentenwahl: Theme, Hauptfarbe, Grids, Snapdistanz.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Defaults ändern existierende Designs nicht |
| 2 Komponentenwahl | Exklusive Segmente und Checkboxes passend |
| 3 Visuelles Design | Dynamische Rollen vorhanden; lokale Previewbehauptung nicht reine HCT |
| 4 Interaktion/Zustände | Dichte/Snap/Format validiert |
| 5 Barrierefreiheit | Rasterpreview Rolle → A02, helle Hilfe global → A01 |
| 6 Animation | Themewechsel unterdrückt unpassende Mischfarbtransitions |
| 7 Responsive/Technik | UIseed und Bildschirmgrid unabhängig von Export |

### 32. Einstellungen: Schriften/Sponsoren/Export
Fundstelle: `user-fonts.js`, `sponsor-ui.js`
Zweck und Komponentenwahl: Bibliotheken und künftige Defaults verwalten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Eigene Fonts entfernbar, Brandfonts geschützt |
| 2 Komponentenwahl | Listen + Add/Remove, exakte Zahlinputs sinnvoll |
| 3 Visuelles Design | Gleiche Bibliothekzeilen statt neue Komponenten |
| 4 Interaktion/Zustände | Importfehler/Rückmeldung/Laden vorhanden |
| 5 Barrierefreiheit | Zugängliche Remove-Namen; Fontdateiprüfung |
| 6 Animation | Fontimportindikator, keine künstliche Mindestladezeit |
| 7 Responsive/Technik | Binarylibraries ausser Dokument; nur verwendete Assets portabel |

### 33. MKW-Setup verknüpfen/aktualisieren/exportieren
Fundstelle: `setup-session.js`, `setup-store.js`
Zweck und Komponentenwahl: Werkzeugpräferenzen gemeinsam wiederverwenden.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Drei Aktionen und Quelle sichtbar |
| 2 Komponentenwahl | Explizite Buttons statt automatischer Fremddateizugriff |
| 3 Visuelles Design | Gemeinsame Status-/Fehlerdarstellung |
| 4 Interaktion/Zustände | Transaktion/Rollback schützt vorhandene Bibliotheken |
| 5 Barrierefreiheit | FF Dateiauswahl erneut nötig, verständlicher Hinweis |
| 6 Animation | Messbare Ladephasen, kein Runtimepolling |
| 7 Responsive/Technik | Keine Bilder der Projekte, kein Filehandle im Setup |

### 34. Wiki: Popup/Navigation/Suche
Fundstelle: `help-popup.js`, `hilfe/index.html`
Zweck und Komponentenwahl: Aufgaben ohne Vorwissen nachschlagen.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Schnellstart/Howto, Suchen statt Entwicklerbegriffe |
| 2 Komponentenwahl | Eigenes lesbares Dokument in lazy Dialog passend |
| 3 Visuelles Design | Theme über UIrollen; Artworkbeispiele unabhängig |
| 4 Interaktion/Zustände | Escape auch aus iframe; Rückkehr zum Auslöser |
| 5 Barrierefreiheit | iframe-Titel/Suchlabel/Resultstatus vorhanden |
| 6 Animation | Nur beim Öffnen geladen; Loading dann beendet |
| 7 Responsive/Technik | Text ohne JS lesbar, schmale Sidebar in Tests |

### 35. Laden/Erfolg/Fehler/Leere
Fundstelle: `ui-controls.js`, `ui-fields.js`, `project-session.js`
Zweck und Komponentenwahl: Aktion/Risiko/Recovery vermitteln.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Spezifische Fehlermeldung statt nur Farbe |
| 2 Komponentenwahl | Status für Fortschritt, Alert für Fehler, Dialog nur Entscheidung |
| 3 Visuelles Design | Gemeinsame Tokens vorhanden; Dialogaltfarben → A01 |
| 4 Interaktion/Zustände | Native alerts ersetzen wo kein Inlinefehler möglich → A07/A08 |
| 5 Barrierefreiheit | aria-busy/live/Fehlertext; reduzierte Bewegung ersetzt nicht Text |
| 6 Animation | Morph/Wavy vorhanden, pausieren bei Reduce; kein blockierendes Warten |
| 7 Responsive/Technik | Refcount Loading, nur echte Arbeiten; keine globale Observerflut |

### 36. Shell/Touch/Highcontrast/Performance
Fundstelle: `ui-theme.css`, `ui-controls.js`, `post-workspace.js`
Zweck und Komponentenwahl: Nutzbaren Platz ohne Funktionsverlust erhalten.

| Perspektive | Bewertung / Befund |
|---|---|
| 1 Nutzerverständnis | Sidebar umschaltbar, Inhalte wachsen |
| 2 Komponentenwahl | Adaptive Pane/Bento passend für Desktopeditor |
| 3 Visuelles Design | Kein Redesign der exportierten Inhalte |
| 4 Interaktion/Zustände | Mehrfachaufrufe/Undo/Lock/Projektwechsel Regressionen |
| 5 Barrierefreiheit | Forcedcolors vorhanden; reale AT/Touchhardware offen → L01/L02 |
| 6 Animation | Keine neuen Endlosschleifen; Effekte ohne Überschwingen |
| 7 Responsive/Technik | 390px geprüft; 320px+coarse+kurze Popups ergänzen → A09 |

## Konkrete Aufgaben und Abnahme

Vollständige maschinenlesbare Liste: [MATERIAL-3-AUFGABEN-2026-10-26.json](MATERIAL-3-AUFGABEN-2026-10-26.json). P1 vor P2; Status erst nach Prüfung.

### A01 · P1 · Kontrast & Textlesbarkeit
- Fundstelle: static/style.css:1675, static/projects.css:#saveAsHint, static/workspace-ui.css:.carousel-document-summary
- Problem: Helle Hilfstexte verwenden alte Dunkelmodus-Hexwerte; Speicherhinweis zusätzlich opacity0.8.
- Auswirkung: Start, Vorlagen und Dateihinweise sind schwer lesbar.
- Änderung/Begründung: Bestehende on-surface-variant Rolle verwenden, Opacity entfernen, Hinweise mindestens Labelgröße12px. UI-Farben nicht Artwork.
- Quellen: [D02](https://m3.material.io/styles/color/the-color-system), [D03](https://m3.material.io/styles/typography/applying-type), [A01](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Abhängigkeiten: Keine
- Akzeptanz: Stable axe-Kontrastfehler beseitigt; helle/dunkle Screenshots; Paletteunit-/Exporthashes unverändert.
- Status: **abgeschlossen**
- Nachweis: Firefox41 Kontexte ohne automatische Kontrastverletzung; Start/Vorlage/Speichern/FD-Format/PDF visuell angesehen; material-ui zeigt Original-Exporthashes unverändert.
- Nachweis: Letzte manuelle Nachsicht der gradientbedingten Incomplete-Befunde siehe Bericht; keine vollständige Pixel-/AT-Zertifizierung behauptet.

### A02 · P1 · Namen/Semantik
- Fundstelle: static/studio.js, carousel-render.js, carousel-refinements.js, carousel-layer-effects.js, typography-ui.js, paint-picker.js, carousel-grid.js
- Problem: Sichtbarer Text fehlt im zugänglichen Namen; Resize-Select unbenannt; Sidebar fehlt Name; FD Hauptüberschrift fehlt. Manuelle Sichtung von axe-Incomplete: benannte generische Container ohne zulässige Rolle und dangling aria-controls bei lazy Wiki/entfernten Menüs.
- Auswirkung: Sprachbedienung/Screenreader findet sichtbare Befehle nicht zuverlässig.
- Änderung/Begründung: Natürliche Buttonnamen mit sichtbarem Kontext nutzen, echte Symbole aria-hidden, Label Resize, Landmark Sidebar; Preview roleimg. Keine Menürollen löschen um axe ruhigzustellen. Container mit echtem Gruppenzweck erhalten role=group; Bildindex erhält echten Text. Zielreferenzen nur bei existierendem Dialog/Menü.
- Quellen: [D01](https://m3.material.io/foundations/), [W02](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md), [A02](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html), [A06](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- Abhängigkeiten: Keine
- Akzeptanz: Alle Kontexte ohne label-content-name-mismatch/select-name/region; Ordnerzählung/Effektwert weiter zugänglich; Exportname sofort vorhanden.
- Status: **abgeschlossen**
- Nachweis: Firefox und Chrome41 Kontexte; keine unerwarteten axe-Verstösse; keine fehlende aria-controls-ID.
- Nachweis: Symbol-/Popup-Incomplete-Befunde manuell klassifiziert; zwei benannte temporäre Menüs behalten dokumentierte region-Advisories.

### A03 · P2 · Inspector-Benennung
- Fundstelle: static/workspace-ui.js:studioSetSidebar
- Problem: Seitenleisten-Schalter nennt sich Einstellungen wie die globale Konfiguration.
- Auswirkung: Nutzende öffnen falschen Bereich (eigene UX-Einschätzung).
- Änderung/Begründung: Eigenschaften ein-/ausblenden; echte globale Einstellungen bleiben so benannt.
- Quellen: [D01](https://m3.material.io/foundations/), [D05](https://m3.material.io/components/app-bars/)
- Abhängigkeiten: A02
- Akzeptanz: Beide Editoren aria-label/title stimmen mit Ziel überein; keine Funktionsänderung.
- Status: **abgeschlossen**
- Nachweis: workspace-ui/material-bars bestanden; globaler Gearbereich weiterhin Einstellungen, Inspector-Schalter Eigenschaften.

### A04 · P1 · Fokus und Popupgrenzen
- Fundstelle: static/carousel-layer-effects.js; static/workspace-ui.js:studioCloseWarnings
- Problem: Effekt schliessen/Escape und Warnungen schliessen lassen Fokus verschwinden; Popup kann auf kurzer Höhe unten hinausragen.
- Auswirkung: Tastaturfluss bricht ab, Eigenschaften unerreichbar.
- Änderung/Begründung: Fokus an aktuellen Effektknopf zurück; beim Hinweis Schliessen zum Auslöser, bei Zielwahl in Eigenschaften; Viewportclamp und Grössenlimit; Sliderwert mit Einheit.
- Quellen: [W01](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md), [W03](https://github.com/material-components/material-web/blob/main/docs/components/slider.md), [A04](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Abhängigkeiten: A02
- Akzeptanz: Escape/Fertig/X prüfen, kein Fokusstehlen bei Pointer-light-dismiss, detached trigger fallback, 320×480 Popup innerhalb8px.
- Status: **abgeschlossen**
- Nachweis: audit-interactions: FX Escape/Fertig/X führen zurück zum Effekt; Warnungs-Escape/X zum Auslöser; 320×480 Popup innerhalb8px; Slider aria-valuetext mit px.

### A05 · P1 · Farbwerkzeug-Ziele & FX Schliessen
- Fundstelle: static/paint-picker.css:.paint-wells,.paint-actions; static/carousel-refinements.css:.carousel-effect-editor-heading
- Problem: Überlappende27px-Swatches lassen nur13px frei;20px Aktionsziele.
- Auswirkung: Fehlklicks, besonders Touch oder Motorikeinschränkung.
- Änderung/Begründung: Affinity-Anordnung kompakt erhalten: zwei visuelle28px-Felder mit15px Versatz in einem einzigen nativen46px-Button (48px/coarse). Direkter Klick auf das sichtbare Feld wählt den Kanal, Enter öffnet den aktiven Kanal. Im Popup bieten zwei48px-Buttons Fläche/Kontur die vollständige Tastatur-/Touchalternative. Pille bleibt62px breit. Tauschen/KeineFarbe sind26×28px bzw.48px/coarse; FXclose40px.
- Quellen: [W04](https://github.com/material-components/material-web/blob/main/docs/components/icon-button.md), [A03](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Abhängigkeiten: Keine
- Akzeptanz: Keine target-size-Befunde; beide visuellen Felder direkt anwählbar; gemeinsamer Button>=44px, Popupkanäle48px; Keyboard Enter/Fläche/Kontur/Fokusreturn, Vordergrund/Swap/None; Pille<70px; coarse48px; Artwork unverändert.
- Status: **abgeschlossen**
- Nachweis: Firefox10/10 und Chrome8/8 abschliessend bestanden; advanced-tools Pille<70px; paint-paths Vordergrund, direkte Feldwahl und Transparenz; audit-interactions Gesamttarget/Enter/Kanalwechsel/Rückkehr/coarse48px.
- Nachweis: Screenshot finale Farbfelder28px/15px Versatz in ursprünglicher62px-Pille angesehen.

### A06 · P2 · Zoomgrenzen
- Fundstelle: static/post-workspace.js; static/carousel-render.js; static/workspace-ui.js
- Problem: +/- an Grenze bleiben klickbar obwohl Aktion nichts tut.
- Auswirkung: Unklare Grenze und unnötige Klicks.
- Änderung/Begründung: Beide Buttons mit bestehendem Min/Max synchronisieren; keine anderen Zoomgrenzen/Phone-Referenz ändern.
- Quellen: [W04](https://github.com/material-components/material-web/blob/main/docs/components/icon-button.md), [D01](https://m3.material.io/foundations/)
- Abhängigkeiten: Keine
- Akzeptanz: Min/Max je Editor deaktiviert nur richtige Richtung; Fit und Cmd0/1 funktionieren weiter; ungültige Zahl kein NaN.
- Status: **abgeschlossen**
- Nachweis: audit-interactions prüft beide Clamps und deaktivierte Richtung; zoom-ui Smartphone390px/20%-Schritte/Cmd0/1/Fit bestanden.

### A07 · P2 · Destruktive Entscheidungen
- Fundstelle: static/studio.js:removeImage, static/project-session.js:delete-project, static/template-ui.js:remove-template
- Problem: Browserconfirm passt nicht zur Anwendung; generische Bestätigung ohne nativeapp-Fokusstrategie.
- Auswirkung: Inkonsistente Bedienung und unklare Rückkehr.
- Änderung/Begründung: Kleiner gemeinsamer nativer dialog mit Titel/Text, Abbrechen voreingestellt, benanntem Löschziel. Asynchrone Ziel/Projektguards vor Mutation.
- Quellen: [W01](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md), [A04](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Abhängigkeiten: A02
- Akzeptanz: Enter default löscht nichts, Escape schliesst, bestätigtes Ziel wird genau einmal entfernt; Projektwechsel während Frage löscht nichts; Browserdatei bleibt.
- Status: **abgeschlossen**
- Nachweis: audit-interactions: Abbrechen voreingestellt, Enter/Escape behalten Bild, Tab erreicht Löschaktion, Stale-Owner löscht nichts, Bestätigen genau einmal, Undo stellt wieder her.
- Nachweis: Browsersicherung abbrechen/bestätigen und Vorlage entfernen erfolgreich; native Alerts/Confirms im Anwendungscode entfallen.

### A08 · P1 · Fehler im Bearbeiten/Import
- Fundstelle: static/state.js:resize/importFiles, static/studio.js:logo upload
- Problem: Native Alerts stoppen Arbeit; Resizefehler nicht am Feld.
- Auswirkung: Fehlbedienung und Statusverlust; Fehler wirkt ohne Feldbezug.
- Änderung/Begründung: Resize als shared MKWFields Fehler an Breite/Höhe; Dateifehler über gemeinsamen benannten Fehlerdialog wenn kein eigener Fehlerplatz; Import erst nach busy cleanup anzeigen.
- Quellen: [W02](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md), [W01](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md), [D01](https://m3.material.io/foundations/)
- Abhängigkeiten: A07
- Akzeptanz: Ungültige Größe verändert Board nicht; Inputs korrekt aria-invalid; korrigierbar ohne Alert; Import bleibt nach Fehler bedienbar.
- Status: **abgeschlossen**
- Nachweis: audit-interactions: ungültige Resizewerte verändern Board nicht; aria-invalid am Feld, Korrektur möglich; kaputtes PNG zeigt Fehler erst nach busy-cleanup.
- Nachweis: material-fields/post-safezones und 50 reale Bildimporte, MKW Save/Reopen/Quota-Fallback im breiten Firefoxlauf bestanden.

### A09 · P1 · Dauerhafte Nachweise & Responsive
- Fundstelle: tests/seven-perspectives.cjs; tests/audit-interactions.cjs; docs/MATERIAL-3-*
- Problem: Bisherige Tests erkennen keine Label/Target/Theme-Regressionskombinationen.
- Auswirkung: Wiederholte Änderungen können Barrieren unbemerkt zurückbringen.
- Änderung/Begründung: Dev-only axe, getrennte settled States/Animation, Kontextinventar; explizite Tastatur/Grenz-/coarse/320px Prüfungen, Exportreferenz.
- Quellen: [D01](https://m3.material.io/foundations/), [A01](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [A02](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html), [A03](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Abhängigkeiten: A01–A08
- Akzeptanz: Firefox Audit+Interaktion+bestehendeSuiten grün, relevante Chrome-Suite, build/unit/format; Rohbelege und Grenzen dokumentiert.
- Status: **abgeschlossen**
- Nachweis: 119/119 Modelltests, Formatierung und reproduzierbarer Build bestanden.
- Nachweis: Breiter Firefoxlauf60/61: ein bestehender Optionen-Namen-Check deckte fehlenden Gruppenkontext auf; korrigiert. Betroffene Bereiche anschliessend8/8, finale Farbwahl-/UI-Prüfungen10/10 plus Dienste3/3 bestanden. Alle61 verschiedenen Suiten damit abgedeckt; kein roter Befund bleibt offen.
- Nachweis: Chrome abschliessend8/8; zwei Browser ×41 axe-Kontexte; Light/Dark/320/390/1500px, reduced-motion, simuliertes coarse Target, Tastatur, Code und Screenshots; keine Behauptung realer Touchhardware-/OSzoom-/SR-Abnahme.

### A10 · P1 · FD Format-Inspector: Feldüberlauf und Gruppierung
- Fundstelle: static/studio.js:editBoardOptions, static/editor-forms.css
- Problem: Visuelle Nachkontrolle zeigt abgeschnittene Breite/Höhe und aneinandergeklebte Aktionen. Dokumentoverflow allein erkennt den abgeschnittenen Inspectorinhalt nicht.
- Auswirkung: Masse teilweise unsichtbar; Formatbearbeitung schwer verständlich.
- Änderung/Begründung: Begrenzte zweispaltige Zahlenfelder, volle Breite für Resize-Verhalten/Anwenden; Presets und Formataktionen in benannten Gruppen mit Abstand; IDs und Handler erhalten.
- Quellen: [D01](https://m3.material.io/foundations/), [D03](https://m3.material.io/styles/typography/applying-type), [W02](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md)
- Abhängigkeiten: A02/A08
- Akzeptanz: Feldboxen vollständig im Sidebar bei1500 und320px, Text/Values sichtbar; alle9 Aktionen bleiben vorhanden; Format/Undo/Safezonentests grün.
- Status: **abgeschlossen**
- Nachweis: audit-interactions: alle Formatfelder passen bei1500/320px, Screenshots angesehen; Handler/Presets/Formatreihenfolge/Duplizieren/Löschen beibehalten. material-fields, post-safezones, post-workspace bestanden.

### L01 · P2 · Reale assistive Technik & freie Zeichengesten
- Fundstelle: Canvas Vektor-/Kurvenediting und Inline-Text; VoiceOver/NVDA
- Problem: Automatischer Accessibilitytree ist keine reale Screenreader-Nutzung; freie Knotenoperationen nicht vollständig nichtvisuell geprüft.
- Auswirkung: Keine seriöse Aussage vollständiger Barrierefreiheit.
- Änderung/Begründung: Separater moderierter Durchlauf mit realer assistiver Technik; priorisierte Taskliste bei Befund. Keine Gestenfunktion entfernen.
- Quellen: [A04](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [D01](https://m3.material.io/foundations/)
- Abhängigkeiten: Gerät/AT-Prüfung
- Akzeptanz: VoiceOver und NVDA tatsächliche Ausgabe dokumentiert; derzeit explizit nicht verifiziert.
- Status: **nicht vollständig verifizierbar**

### L02 · P2 · Externe Plattformtests
- Fundstelle: OS-Dateiauswahl, Photoshop, reale Touchhardware
- Problem: Headless/portable Tests ersetzen nicht physische Bedienung, Photoshop oder Betriebssystem-Dateidialog.
- Auswirkung: Verbleibende plattformspezifische Risiken.
- Änderung/Begründung: Konkrete manuelle Abnahme ergänzen, vorhandene File/PSDreadback Tests erhalten.
- Quellen: [D01](https://m3.material.io/foundations/)
- Abhängigkeiten: Verfügbare Programme/Geräte
- Akzeptanz: Reale OS/Photoshop/Touch Ergebnisse protokolliert; derzeit eingeschränkt.
- Status: **nicht vollständig verifizierbar**

## Prüfprotokoll

- Vorher: Firefox 41 Kontexte inklusive Wiki-iframe, sechs Einstellungsseiten, FD-Werkzeuge/Optionen, Designer-Werkzeuge/Advanced, Ebenen/FX/Picker und Save/Exportvarianten. Native Modals werden isoliert betrachtet; 450ms Settling verhindert kurzzeitige Animations-Kontrastfalsepositives.
- Visuelle Vorher-Kontrolle: Startseite, Designer Advanced Text und Effekt-Popup als tatsächliche Firefox-Screenshots angesehen. Weitere Screenshotkontrollen und Interaktionsnachweise folgen nach Korrektur.
- Nachher: Abnahmeergebnisse unten; maschinenlesbare Aufgaben wurden nach erfolgreicher Prüfung aktualisiert.

### A10 · P1 · FD Format-Inspector (Nachbefund)
Die tatsächliche Screenshot-Nachkontrolle von `fd-options` zeigte abgeschnittene Zahlenfelder und eine unstrukturierte Aktionsfolge. Der Dokument-Overflowcheck allein fand dies nicht. Ergänzte Abnahme: Feldboxen vollständig innerhalb der Seitenleiste bei 320px und Desktop; bestehende Handler/Formataktionen und Safezonen bleiben erhalten. Vorschlag: zweispaltige Zahlenfelder, eigenständiges Resize-Verhalten, Presetgruppe und Formataktionen. Quellen: D01/D03/W02. Status: abgeschlossen.

## Ergänzungen aus manueller Befundsichtung

- Auch axe-`incomplete` wurde geprüft. Beschriftete generische `div`-Container für Vorlagen, Zoom, Bibliothek, Verlauf und Effekte erhielten eine passende Gruppenrolle; der Bildindex echten Text. Lazy Wiki-Auslöser referenzieren den Dialog erst nach dessen Erstellung. Entfernte Menüs lassen keine ungültigen Zielreferenzen zurück. Grundlage: [W3C Name/Role/Value (A06)](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html). Dies ist eine Web-Semantik-Korrektur, keine erfundene Material-Designvorschrift.
- Ein benanntes temporäres `role=menu` im Top-Layer braucht nicht zusätzlich eine Dokument-Landmark. Zwei `region`-Best-Practice-Advisories bleiben deshalb explizit als `menuLandmarkAdvisories` im Bericht, statt die gültige Menüstruktur für den Scanner umzubauen. Keine WCAG-Regel wird unterdrückt.
- 26. Oktober, Nutzervorgabe während der Prüfung: Fläche/Kontur weiterhin wie bei Affinity. Visuelle Überlappung und aktives Vordergrundfeld bleiben; Grösse/Versatz ergeben zugleich erreichbare Zentren und mindestens24px unverdeckte Flächen.

### A05 · abschliessende kompakte Affinity-Variante
Nach weiterer Nutzerpräzisierung bleiben die Farbfelder klein und stärker überlappend (28px,15px Versatz) und die Pille62px schmal. Um dabei keine kleinen verdeckten Einzel-Buttons zu erzwingen, ist die gesamte Farbwahl ein nativer46px-Button. Die sichtbaren Teilflächen reagieren weiterhin direkt auf Mausklicks und bringen Fläche/Kontur nach vorn. Enter öffnet den aktiven Kanal; im Farbfeld stehen zwei48px-Kanalbuttons bereit. Bei Touch ist das Gesamttarget48px gross. Dies ist eine eigene Web-UX-Lösung innerhalb der Material-/Accessibilitygrundlagen, keine behauptete Affinity-Implementierung.

## Abschliessende Abnahme

Alle korrigierbaren Aufgaben A01–A10 sind abgeschlossen. Die JSON-Aufgabenliste enthält je Aufgabe konkrete Prüfbelege. Folgende Grenzen bleiben ausdrücklich offen: **L01** reale VoiceOver-/NVDA-Nutzung einschliesslich freier Zeichengesten; **L02** reale Touchhardware, Betriebssystem-Dateidialoge und Photoshop. Tastatur-/AX-Tests und PSD-Readback ersetzen diese Prüfungen nicht.

- **Bestand:**36 Familien,41 tatsächlich geöffnete Kontexte;382 eindeutige kontextuelle Vorher-Controlbeobachtungen. Die Matrix beschreibt den Ausgangsbefund; Nachher-Ergebnisse stehen hier und in der Aufgaben-JSON. Die Inventardatei bewahrt Vorher und Nachher getrennt.
- **Firefox:** breiter Lauf60/61. Der einzige rote Check betraf den bei der Namenskorrektur verlorenen Optionen-Gruppenkontext. Dieser ist korrigiert; der betroffene Sponsorentest und weitere Bereiche anschliessend8/8 erfolgreich. Nach der vom Nutzer gewünschten kompakten Affinity-Variante nochmals10/10 betroffene UI-/Paint-Suiten plus3/3 Bibliothek/Sponsor-/Speicherprüfungen erfolgreich. Damit sind alle61 unterschiedlichen Browser-Suiten abgedeckt, ohne den anfänglichen Fehlversuch zu verschweigen.
- **Chrome:** finale8/8 Suiten einschliesslich41-Kontext-Audit, Interaktion, Vektor-/Paint-Funktionen, Popupgeometrie, Wiki, Original-Artworkhashes und echter50-Bild-Speicherprüfung erfolgreich.
- **Modelle/Build:**119/119 Modelltests, Prettier und Build erfolgreich. axe-core4.14 ist ausschliesslich Entwicklungsabhängigkeit; keine zusätzliche Laufzeitbibliothek für die App.
- **Accessibility:** beide Browser-Audits ohne unerwartete axe-Verstösse; alle sichtbaren aria-controls-Zielreferenzen existieren. Zwei zusätzliche `region`-Best-Practice-Hinweise auf benannte Top-Layer-Menüs sind explizit dokumentiert, keine WCAG-Regel abgeschaltet. Verbleibende `incomplete`-Einträge werden nicht als automatisch bestanden ausgegeben: Popup-Zielreferenzen zusätzlich per DOM geprüft; Ellipsen/AA/U/S sind bewusst symbolische Bedienelemente mit sprachlichem Namen. Kontrastfälle durch Überlagerung/Gradienten wurden im Kontext und über die semantischen Rollen nachgesehen; PDF/Start/Vorlagen/Picker/Safezonen-Screenshots tatsächlich angesehen. Dies ist keine vollständige messtechnische WCAG-Zertifizierung.
- **Darstellung:** Start, Wiki, Vorlagenformular, FD Optionen/Format (inkl.320px), Designer Text/FX/Farbwahl, PDF-Export und Darkmode wurden visuell angesehen. Farben/Schriften der Artworks bleiben getrennt von UI-Tokens; Exportreferenzen und Bild-/PDF-/PSD-Suiten bestehen.
- **Interaktion:** Bestätigen/Abbrechen/Enter/Tab/Escape, Fokusreturn, Stale-Projekt-Guard, Entfernen/Undo, Inlinefehler/Korrektur, Import-Recovery, Zoomgrenzen, Glyph-/Verlauf-/Bildfüllung und kleine Popupgrenzen geprüft. Atomarer Bildimport bleibt während Verarbeitung geschützt; nach Abschluss ist der ganze Import über Rückgängig zurücknehmbar. Keine zusätzliche Import-Abbruchfunktion wird behauptet.
- **Bewegung:** vorhandene material-motion/material-consistency-Suiten prüfen Morph/Wavy-Laden, echten Fortschritt, Cleanup, reduzierte Bewegung und Systemfarben. Die kurzen Dialoge nutzen native Modalität und gemeinsame Motionregeln; CSS-Kurven sind keine vorgetäuschte1:1-Physikimplementierung aller Androidsprings.
- **Performance:** keine neuen permanenten Renderloops/DOM-Observer. Bestehende Performance-/50-Bild-/Speicherprüfungen bestehen. Chrome-Messlauf: Layoutupdate8532 statt26385183 Bytes (50ms einschliesslich Browsersicherung); dies belegt die erhaltene inkrementelle Speicherung für diesen Test, keine allgemeine Zeitgarantie oder neue Optimierung durch diesen UI-Patch.

Rohbelege im Arbeitsbereich:`work/audits/material3-2026-10-26/{before,final-firefox,final-chrome,logs}/`, samt Repositorymetadaten und Bundlegrössen.

| Runtime-Asset | Gzip vorher | Gzip nachher | Differenz |
|---|---:|---:|---:|
| `static/editor.bundle.js` | 195802 B | 197773 B | +1971 B |
| `static/editor.bundle.css` | 41474 B | 41855 B | +381 B |

Diese Grössen sind komprimierte Assetgrössen, keine gemessene Netzwerk-Ladezeit. Testdaten, axe und Screenshots werden nicht in die Produktionsdatei eingebündelt.

## Nachträge: Scrollen, vier Farbkonzepte und GitHub-Befund

Nach der lokalen Erstabnahme meldete [GitHub-Lauf 40295226958](https://github.com/noe-plain/noe-plain.github.io/actions/runs/40295226958) zwei rote Browserfälle. Der vorstehende lokale Prüfbericht behauptet damit keine grüne GitHub-Abnahme. Die tatsächlichen Annotationen und Jobprotokolle wurden gelesen. R01 dokumentiert die Nachprüfung.

- Beim Entfernen prüfte der Test vor Abschluss der asynchronen Dialogaktion. Er wartet jetzt auf den tatsächlichen Modellzustand und behält die ursprüngliche Assertion.
- Der Textbildvergleich konnte unabhängige Floating-UI und Fokusfeedback enthalten; die Wartephase brach nach 100 Frames ab. Er wartet jetzt auf die reale Renderqueue und Fontbereitschaft. UI-Hilfsebenen sind für diesen Artworkvergleich ausgeblendet; der strikte Screenshotvergleich bleibt. Zusätzlich müssen sämtliche nativen Canvaspixel vor und nach Eintritt in die Textbearbeitung identisch bleiben. Fehler liefern PNG- und Layoutartefakte. Der Designer-Rendercache berücksichtigt wie das Textlayout die Trennmuster-Epoche. Die ursprüngliche Linux-Abweichung liess sich lokal nicht reproduzieren; eine unbewiesene Satzkorrektur wird nicht behauptet.
- **F01:** Cmd + Scrollen auf Mac bzw. physisches Ctrl + Scrollen auf Windows verschiebt beide Montageflächen seitlich. Alt/Option + Scrollen und Pinch bleiben Zoom. Der Tastenzustand wird beim Fensterwechsel verworfen.
- **F02:** Auf Nutzerwunsch vier UI-Schemata: Normal, Komplementär, Harmonisch und Lebendig. Die neuen Varianten sind eigene OKLab-Ableitungen, keine offiziellen Google-HCT-Presets. Die Hauptfarbe bleibt; Zusatzrollen werden um 30° bzw. ±120° versetzt. Sie sind reine Werkzeugeinstellungen und im Setup portabel. Bestehende MKW-Objekte und Exporte ändern sich nicht.

Lokale Nachweise: 121 Modelltests; neue Farb- und Scrolltests und beide ursprünglichen Regressionsfälle in Firefox und Chromium 145 jeweils 4/4 erfolgreich. Vollständige Pushprüfungen bleiben aktiv; manuell kann der fokussierte Umfang `text-and-scroll` gewählt werden.

Im [Folgelauf 40301334490](https://github.com/noe-plain/noe-plain.github.io/actions/runs/40301334490) bestanden beide ursprünglichen Fälle sowie Scrollen und Farbkonzepte auf Linux Chromium. Insgesamt waren 61/63 Suiten erfolgreich. Zwei weitere Prüfprobleme betrafen die responsive Seitenleiste unmittelbar nach Resize und einen Tastatur-Tooltip bei noch über einer anderen Fläche stehender Maus. Das verzögerte automatische Schliessen der Seitenleiste wurde lokal reproduziert. Der Test wartet jetzt auf die Resize-/Mediaquery-Verarbeitung; die Tastaturprüfung beginnt mit neutraler Mausposition. Alle ursprünglichen Aussagen werden weiterhin geprüft. Beide angepassten Suiten bestanden anschliessend in gepinntem Chromium und Firefox.

Die vollständige Nachprüfung [40347731047](https://github.com/noe-plain/noe-plain.github.io/actions/runs/40347731047) ist **erfolgreich** abgeschlossen. Geprüfter Quellstand: `90283d28e2bde3e737b01c90dec8f002295f2528`. Tatsächliches GitHub-Protokoll: **121 Modelltests**, Formatierung und reproduzierbarer Build, **63/63 Chromium-Suiten** sowie **48/48 Firefox-Suiten** erfolgreich. R01 ist damit abgeschlossen. Die vollständigen Protokolle und Jobmetadaten liegen unter `work/audits/material3-2026-10-26/scroll-ci-fix/github-final-*` im Arbeitsbereich.

[GitHub Pages 40347729840](https://github.com/noe-plain/noe-plain.github.io/actions/runs/40347729840) wurde erfolgreich veröffentlicht. Die ausgelieferten HTML-, JavaScript- und CSS-Dateien stimmen bytegenau mit dem lokal geprüften Stand überein; dies ist ein Assetvergleich und keine zusätzliche visuelle Live-Abnahme. Der anschliessende Dokumentationsabschluss ändert keine Anwendungsdateien. **L01/L02 bleiben die benannten externen Prüfgrenzen.**
