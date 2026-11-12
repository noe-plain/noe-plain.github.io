# FD-Kampagnen (Vorschau) – neuer Bearbeitungsablauf

## Auftrag und bestätigte Regeln

Neuer, separat wählbarer Kampagnenmodus mit Designer-Werkzeugen; alter FD-Ablauf bleibt als Backup erreichbar. Gleiche Ausgabeformate erben pro Eigenschaft. Ein eigenes X/Y löst nicht den Inhalt; eigener Text löst nicht die Position. Zusätzliche Bilder und spätere Verläufe bleiben lokal. Die Einrichtung behält das bestehende Format-/Schutzzonenformular; derzeit 240–4000 px wie die Designer-Engine. Keine zusammenhängenden Slides im Kampagnenmodus. Bewusste Konvertierung erstellt eine neue Projektidentität, keine Überschreibung der ursprünglichen MKW-Datei.

Während der Umsetzung bestätigt: anfängerfreundliche Bildkarten und Formatbeschriftungen oberhalb des Artworks; Fläche/Kontur in der Werkzeugleiste; Copyright mit alter Ausgangsgeometrie, aber frei verschieb-/drehbar; Familienkonzert-Farbwahl auf markierten Zeichen in allen Modi; kein Advanced-Schalter mehr, alle Werkzeuge direkt zugänglich.

## Architektur

- `campaign-model.js`: DOM-freie Zuordnung und Vererbung mit lokalen Koordinaten, je Eigenschaft getrennten Abweichungen und expliziten Löschmarkern. Bestehende Image-/Font-/Logo-Referenzen bleiben die einzigen Assets. Keine eingebetteten Bilder in Verknüpfungsmetadaten.
- `campaign-document.js`: Kandidaten vor Übernahme validieren, sequentieller Import, vorhandene Personenerkennung/Skip-Regeln, gemeinsame Frames, zeilenweise Positionierung mit Spaltenumbruch am Koordinatenlimit. Keine temporär ausgetauschte globale Projektvariable zum Rendern.
- `campaign-ui.js` / `campaign.css`: Karten, Formatbeschriftungen, Textübernahme, Eigenschaften-Hinweis, bewusste Migration. Dieselben Designer-Renderer, Text-/Pfadwerkzeuge, Ebenen, Farbwähler, History und Exportdienste.
- `text-model.js`: kleine optionale boolesche Zeichenattribute `family`; Quelltext/UTF16-Indizes bleiben erhalten. Farben/Kontur werden aus vorhandener MKW-Palette abgeleitet. Keine Palette pro Zeichen im File dupliziert.
- Die frühere `advanced`-Einstellung wird aus alten Setups akzeptiert/typgeprüft, aber nicht mehr als Schalter oder exportierte Vorgabe geführt. Werkzeugverfügbarkeit ist einheitlich, die Toolbar horizontal und platzsparend. Bestehende erweiterte Seitenaktionen bleiben eigene fachliche Menüs.

## Prüfung aus sechs Perspektiven

| Perspektive | Befund / Entscheidung | Prüfkriterium und Status |
| --- | --- | --- |
| Neue Nutzerin | Zwei Hauptbereiche, Backup sekundär; sprechende Bildaktionen und Format über der Fläche; keine Textarten-Checkboxen im neuen Ablauf. | Echter Start, Import, Karte, neues Format und Textübernahme geprüft. |
| Erfahrener Designer | Verknüpfung muss Inhalt und Geometrie unabhängig behandeln; weitere Bilder lokal. | Modelltests für beide Richtungen, neue Texte/Formate, erstes/späteres Gradient und Zusatzbild; MKW-Rundlauf. |
| Senior UX | Ausklappende Export-Gesamtauswahl und wandernde Pfeile stören; zu kleine Karten können kollidieren. | Auswahl-Dropdown entfernt, feste Navigationstracks; bei Übersichtszoom kompakte Karten mit „Bearbeiten“. |
| UI-Expertin | Gemeinsame semantische Farbrollen, klare Kartenhierarchie, beschriftete häufige Aktionen. | Screenshots visuell geprüft; Karten und Farbfelder nachgebessert, helle/dunkle bestehende Prüfungen beibehalten. |
| QA | Altdateien und Undo dürfen nicht überschrieben/verkoppelt werden; Import und Ebenengrenzen sicher. | Eigene Kopie bei Umstieg, validierte Kandidaten, tiefe History-Kopie der Verknüpfungen; 50 synthetische Bilder/100 Ausgaben samt MKW geprüft. |
| Fehlersuche | Veraltete Kartenreferenz nach Synchronisation, falscher Layout-Zugriff bei Migration, versteckte Pfadsperren. | Gefunden und korrigiert; tatsächliche neue Browserfälle und vorhandene Pfad-/Dateiregressionen entscheiden über Abschluss. |

Keine echte Studie mit sechs Personen. Automatisierte axe-Prüfung und Tastaturfälle ersetzen keine manuelle Screenreader-Abnahme.

## Grenzen und weitere Arbeit

Vorschau ist bewusst zusätzlich zum alten Modus. Komplexe Altlayouts können bei der Übertragung von festen Layoutregeln in frei bearbeitbare Rahmen abweichen; deshalb Kopie und Vergleichshinweis. Geprüftes 50-Bilder-Rezept verwendet kleine synthetische PNGs, keine Leistungszusage für 50 hochauflösende Originale. Die bestehenden Grenzen von 200 Ausgaben/500 Ebenen sowie Browserquote und Bildcache bleiben erhalten. Kein neues PDF-Tool (pausiert).

Nach Abschluss und Veröffentlichung dieses Nutzerauftrags folgt im bestehenden Plan der begrenzte IDML-Schritt mit genau einem bearbeitbaren Textrahmen und echtem InDesign-Test. Die bereits abgenommene leere Paketbasis bleibt erhalten, PSD bleibt verfügbar. SVG-Import, Pipette/Farbhilfe, Vorlagenentwürfe und grössere Bereinigung bleiben die separat dokumentierten Schritte; keine stillschweigende Bonusimplementierung.

## Material-3-Grundlage

Offizielle Komponentenreferenzen: https://m3.material.io/components/toolbars/overview und https://m3.material.io/components/cards/guidelines (Textabruf benötigt JavaScript). Implementierungsreferenz für verankerte temporäre Oberflächen/Tastatur: https://github.com/material-components/material-web/blob/main/docs/components/menu.md . Bestehende M3-Tokens und native semantische Buttons/Checkboxen/Dialoge wiederverwendet. Gruppierung, Kartenhierarchie und die Trennung je Eigenschaft sind eigene produktbezogene UX-Entscheidungen, keine erfundenen normativen M3-Vorgaben.

## Abschliessende lokale Prüfung

- 191/191 Modell-/Datei-/Geometrietests, Formatprüfung und reproduzierbarer Build bestanden.
- Vollständiger Chrome-Lauf mit 105 Suiten ausgeführt: zunächst 99 bestanden, sechs Fehler. Davon drei veraltete Erwartungen (Startkarten, drei statt zwei Modi, zehn statt sechs Werkzeuge), eine obsolete Advanced-Suche und zwei tatsächliche Bedien-/Trefferflächenprobleme der horizontalen Pille. Erwartungen aktualisiert; Anordnung, kompakte Beschriftung und Scrollbarkeit im gemeinsamen CSS/Toolbar-Layout korrigiert. Alle sechs betroffenen Suiten danach in Chrome und Firefox erneut bestanden, zusammen mit Familienfarben und Werkzeugleisten. Keine fachlichen Export-/Speicherprüfungen entfernt.
- 24 betroffene Suiten in Firefox bestanden; nach den letzten Layoutkorrekturen zusätzlich sieben Suiten (inklusive 42 Oberflächenkontexte mit axe, tatsächlicher Pfadbearbeitung, Kampagnenablauf/Migration) und drei Einstieg-/Vorlagen-/Arbeitsflächensuiten erneut bestanden.
- Nutzerpräzisierung: Farbtausch und Ein-/Ausblenden rechts neben den überlappenden Farbfeldern, vollständig innerhalb der Pille. Geometrie in Designer und Vorschau explizit geprüft, kleine Fenster/Tastatur in der Interaktionssuite. Aktuelle Screenshots der beiden Editoren visuell angesehen.
- Die neue Firefox-CI-Auswahl enthält die drei neuen Funktionssuiten; der allgemeine Chrome-Lauf enthält sie ebenfalls. GitHub-Endstatus separat nach Veröffentlichung bestätigen.

Kein erneuter Photoshop-/InDesign-Anwendungstest in diesem Lauf; PSD/PDF-Pixel- und Strukturregressionen sowie echte Browserdownloads sind automatisiert geprüft. Kein manueller Screenreader-Test und kein realer Nutzertest mit sechs Personen.
