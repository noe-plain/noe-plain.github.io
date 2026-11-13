# Textwerkzeuge: zweite Veröffentlichung, 13. November 2026

Erste Veröffentlichung: `55e7ff92ca7558cfb1f2150b5c38ac48f8fe3172`. [Pages erfolgreich](https://github.com/noe-plain/noe-plain.github.io/actions/runs/43427184863), [Chromium und Firefox erfolgreich](https://github.com/noe-plain/noe-plain.github.io/actions/runs/43427185384). Der zuvor gefundene Testhelfer-Fehler beim Wechsel zum zweiten Text ist korrigiert. Familienfarben auch auf der veröffentlichten Seite in Chrome geprüft.

## Fünf Perspektiven vor Umsetzung

| Persona | Problem / Entscheidung | Prüfkriterium |
| --- | --- | --- |
| Neue Nutzerin | Rahmenbreite und Schriftgrösse sind verschiedene Aufgaben. Sichtbare Wahl „Rahmen ändern / Text skalieren“, kurzer Hinweis; Zwischenablage neben direktem Bearbeiten. | Ohne versteckte Tastenkombination erreichbar; keine zweite Texteingabe in der Seitenleiste. |
| Erfahrener Nutzer | Skalieren muss Zeichen-, Absatzgrössen, Grundlinien, feste Zeilen-/Absatzabstände erhalten. Native Kopieren/Einfügen plus Einfügen ohne Formatierung. | Ein Undo je Aktion, keine Text-/Viewport-Sprünge, weiche Umbrüche und Unicode bleiben erhalten. |
| UX/UI | Bestehende Material-3-Farbrollen, kompakte Aktionshierarchie, Fokuszustände und gemeinsamer Ablauf in FD/Designer. | 300px-Seitenleiste ohne horizontalen Overflow; Kontextmenü und numerische Alternative. |
| Barrierefreiheit | Alle Funktionen auch ohne Griffziehen; Menü mit Tastatur und benannten Aktionen. | Fokus nach Menü zurück zum betreffenden Text, Sperren respektiert, Fehler als Text. |
| Entwicklerin/QA | Reine Fragment-/Skalierlogik; HTML wird nicht in die App eingefügt. Fonts nur aus vorhandener Liste, keine Assets/Projektzustände in Clipboard-Paketen. | Bösartige/ungültige Daten, Fremdschrift, mehrere Absätze, Abbruch, Sperren, FD-Eigenschaftsverknüpfungen, MKW und Export testen. |

## Aufgaben

- [x] Gemeinsame reine Textfragmente: Formatierung kopieren, ersetzen, erhalten; plain übernimmt Zielformat.
- [x] Sichere native HTML-/Plain-Zwischenablage in Designer, neuem FD und Backup. Browserrechte nur auf ausdrückliche Aktion; bei Ablehnung normale Tastenkombination anbieten, nichts verändern.
- [x] Vollständige typografische Skalierung über Griffe und numerisch; Rahmenänderung bleibt Standard. Modus ist Ansichtszustand, nicht Dokumentinhalt.
- [x] FD-Verknüpfungen bei kürzerem/längerem Text und lokal geänderter Typografie robust anpassen.
- [ ] Regressionen, Wiki und Schlussprüfung, danach zweite Veröffentlichung.

Native Zwischenablage: https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData , https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read , https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write . Browserberechtigungen und Formate variieren; eigene Logik fällt auf die nativen Paste-/Copy-Ereignisse zurück. Keine pauschale Office-/Photoshop-Kompatibilität behaupten.

## Ergänzungen aus dem laufenden Feedback

- FD-Bildkarte: grosses Hero wie beim Backup, Dateiname klar darunter, Bildaktionen und Nachweis direkt erreichbar. Drei-Punkte-Popover für Gestaltung/Reihenfolge/Entfernen; kompakte Übersicht bei wenig Zoom statt innerer Scrollfläche. Originalbild und Layout bleiben gleich. Lange Dateinamen werden nur als abgeleiteter Seitenname begrenzt; der Originalname bleibt erhalten.
- Der separate `text-content-editor`-Block wurde entfernt. Ein kleiner Aktionsbereich sitzt direkt in der Typografie; Inhalt wird ausschliesslich auf der Fläche geschrieben.
- Zwei entdeckte Abhängigkeiten korrigiert: Textcache berücksichtigt globale Farbe/Familienmodus; Textverknüpfungen passen lokale Formatbereiche an neue Textlängen an.
- HTML-Clipboard läuft linear über Absätze statt wiederholter Präfix-Scans. Nur individuelle FD-Typografie benötigt beim Quelltextwechsel eine Neuzuordnung; normale verknüpfte Ausgaben übernehmen weiterhin direkt.

Erste Freigabe bestätigt: Pages 43427184863 und beide Browser plus Sammeljob 43427185384 erfolgreich. Familienfarben wurden auf der tatsächlichen veröffentlichten URL in Chrome in allen drei Arbeitsbereichen geprüft.

Zwischenprüfung der zweiten Version: 202 Modell-/Dateitests, Build/Format; Textabläufe mit echten nativen Kopier-/Einfüge-Tasten in allen drei Arbeitsbereichen, Chrome-Menüzugang mit Berechtigungen, Plain/Rich, Undo/Redo, sichere HTML-Übernahme, Schrift-/Absatz-/Zeilenskalierung sowie MKW-Rundlauf erfolgreich. 8 betroffene Text-/Kampagnen-Suiten vor der letzten Karten-/Panelanpassung erfolgreich. Karten gesondert bei 60/20/5 % Weltzoom, langen Dateinamen, schmaler dunkler Ansicht und axe geprüft; zwischenzeitliche Fokus-/Popover-/Heading-Fehler wurden korrigiert. Vollständige letzte Regression und GitHub-Nachweise vor Abschluss aktualisieren.

Letzter gezielter Kandidat: 5/5 Suiten (Karten, neue Textabläufe, direkte Texteingabe, pixelgleiche Inline-Darstellung, Kampagnenablauf) erfolgreich. Separater Inhalt-Block entfernt, kleine Textaktionen bleiben in der Typografie. Hero-Raster erst bei sichtbarer Karte; Leserichtung und native Fokuszustände kontrolliert. Kartengestaltung liegt in eigenem Modul/Stylesheet statt gestapelter CSS-Überschreibungen.

Die vollständige lokale Regression fand zu viel vertikalen Abstand vor den Schriftkontrollen bei 768×1024 px. Doppelten Gruppenabstand entfernt; unveränderte Erreichbarkeitsprüfung für Schrift/Grösse/Farbe sowie Tastatur/axe danach erfolgreich. Hero-Test prüft nun zusätzlich sichtbare Bildpixel statt ausschliesslich Karten-Geometrie. GitHub-Prüfung der zweiten Veröffentlichung folgt.

## Schlussprüfung mit den fünf Perspektiven

Dies ist ein überprüfter Produkt-/Code-Review anhand der Personas, keine Studie mit fünf realen Personen.

| Persona | Abschliessendes Feedback | Nachweis / Status |
| --- | --- | --- |
| Neue Nutzerin | Kein zweiter Texteingabeort; direktes Bearbeiten, verständliche Wahl zwischen Rahmen und Schrift skalieren. Das Foto identifiziert seine Bildkarte. | Direkte Texteingabe in allen drei Arbeitsbereichen, sichtbares Hero, langer Dateiname, leere/gesperrte Zustände geprüft. Erledigt. |
| Erfahrener Nutzer | Native Tastenkürzel und ein zugängliches Zwischenablage-Menü; Rich/Plain bleiben unterscheidbar, Undo/Redo und FD-Verknüpfungen erhalten. | Reale native Tastaturevents in allen drei Modi, Chrome-Menü mit realen Clipboardrechten, Eigenschaften-/Inhaltsverknüpfungen, 50-Bilder-Speicherung geprüft. Erledigt; Systemrechte bleiben browserabhängig. |
| UX/UI-Designerin | Karten ohne innere Scrollfläche, kompakte/tiny Darstellung bei wenig Platz, ein Popover statt wachsender Kartenhöhe. Gemeinsame Typografie-Aktionen statt Inhaltskasten. | Hero-Screenshot und Pixelprüfung, Zoom 60/30/28/20/5 %, lange Namen, schmale dunkle Ansicht. Zusätzlichen vertikalen Abstand bei iPad-Grösse korrigiert und unveränderte Reach-Prüfung bestanden. Erledigt. |
| Barrierefreiheitsexperte | Benannte Aktionen, numerische Alternative zum Skaliergriff, sichtbare Fokuszustände und Tastatur/Escape in Menüs. | Axe in Karten und erweitertem Textpanel, bestehende 42-Kontexte-Prüfung, 300/450-px-Inspektor, 768×1024 und reduzierte Bewegung erfolgreich. Kein realer Screenreader-Test; keine pauschale WCAG-Zertifizierung. |
| Entwicklerin / QA | Reine begrenzte Fragmentlogik, keine HTML-Injektion, eine Eigentümerschaft je Karte/Stylesheet, Bildraster nur für sichtbare Karten; keine Originalbild-Veränderung. | 202 Modell-/Dateitests; lokale Vollsuite 107/108 plus erfolgreicher unveränderter Retest des korrigierten Textpanels. Neue Zwischenablage/Skalierung/Karten und Pixelgleichheit erfolgreich. Finale GitHub-/Live-Nachweise nach Freigabe ergänzen. |

[GitHub-Prüfung des zweiten Kandidaten cbbf920](https://github.com/noe-plain/noe-plain.github.io/actions/runs/43435887646). Lokal kann Firefox wegen seiner Grafik-/Plugin-Prozessinitialisierung nicht starten; deshalb ist der Ubuntu-Firefox-Lauf der konkrete Firefox-Nachweis. Photoshop/andere Desktop-Programme wurden nicht manuell geprüft. Unterstützte Formatattribute werden im Wiki ausdrücklich benannt; fremde Schriften werden nicht heimlich importiert.

## GitHub-Freigabe und Firefox-Testkorrektur

Kandidat `cbbf9209b6e3a41371428f5814820ef2ca276eaf`: Chromium vollständig erfolgreich (108 Browser-Suiten). Firefox lief vollständig durch; ausschliesslich der neue `text-workflow` scheiterte beim Prüfen eines synthetischen Copy-Ereignisses, das den ursprünglich übergebenen DataTransfer auslas. Die App schreibt korrekt in den tatsächlichen Event-Datencontainer. [Mozilla Bug 2027025](https://bugzilla.mozilla.org/show_bug.cgi?id=2027025) dokumentiert die abweichende ClipboardEvent-Konstruktorbehandlung. Der synthetische Test stellt seinen Datencontainer nun explizit am Test-Event bereit. Alle Inhalts-/Format-/Undo-Assertions bleiben erhalten; die zusätzlichen echten nativen Kopier-/Einfügetasten in allen drei Arbeitsbereichen bleiben unverändert. Keine Runtime-Änderung dafür erforderlich. Die vollständige Firefox-Wiederholung erfolgt nach dieser Testkorrektur auf main; Ergebnisse im finalen Arbeits-Handoff/Abschlussbericht.
