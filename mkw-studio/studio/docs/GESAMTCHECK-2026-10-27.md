# MKW Studio: Gesamtcheck aus fünf Perspektiven

Stand: 27. Oktober 2026 · Ausgangsstand `041c78787fffd1344b1f6b917053ef19695808f0`.

## Umfang und Methode

Heuristischer Check aus den fünf gewünschten Rollen, keine Befragung von fünf realen Personen. Geprüft werden die vorhandenen 36 UI-Familien aus dem [Bestandsinventar](MATERIAL-3-AUDIT-2026-10-26.md), beide Editoren, Vorlagen, Einstellungen, Bibliotheken, Datei-/Browser-Speicherung und Export. Grundlage: Quellprüfung der Owner und gemeinsamen Dienste, vollständiger Firefox-Regressionslauf, zusätzliche Fehlerfälle und 41 erneut geöffnete UI-Kontexte mit DOM-/Accessibility-Snapshots und automatischen axe-Prüfungen. Wiederverwendete Controls werden gemeinsam beurteilt; unterschiedliche Kontexte bleiben getrennt.

**Korrektur der Prüfmethode:** Der bisherige automatische Audit nahm bei mehreren offenen modalen Dialogen das letzte Element in der DOM-Reihenfolge. Einstellungen und Einrichtung konnten dadurch irrtümlich gegen den darunterliegenden Startdialog geprüft werden. Der Audit verwendet jetzt den Dialog mit dem tatsächlichen Fokus und prüft ausdrücklich, dass Einstellungs-/Setup-Kontexte nicht den Startdialog erfassen. Die erneute Prüfung enthält beispielsweise 24 sichtbare Controls in Allgemein und 27 im FD-Setup statt jeweils sechs Startbuttons. Das ist eine Verbesserung der Testabdeckung, kein neu behaupteter Fehler dieser Dialoge.

Eine breit angelegte Regression ist keine Garantie für jede Objekt-/Datei-/Gerätekombination. Ein erfolgreicher automatischer Accessibilityscan beweist keine vollständige nichtvisuelle Bedienbarkeit eines grafischen Editors. Einschränkungen stehen unten.

## Ergebnisse je Bereich und Perspektive

N = neue Nutzerin, E = erfahrener Nutzer, U = UX/UI, A = Barrierefreiheit, Q = Entwicklung/QA. „Kein neuer Befund“ bedeutet ausschliesslich innerhalb des tatsächlich geprüften Umfangs. Die UI-Familiennummern entsprechen dem Bestandsinventar.

| Bereich | N: Verständnis | E: Ablauf | U: Material/Struktur | A: Bedienbarkeit | Q: Robustheit / Nachweis |
|---|---|---|---|---|---|
| Start, Header, Bibliothek (01,02,06) | Neues Projekt, Vorlage, Browserstand und Datei unterscheidbar | Öffnung darf nicht überlappen → G02 | Priorisierte Buttons und listenartige Projektwahl beibehalten | Native Modalität und Fokus während Öffnung → G02 | `project-open`, `project-storage`, neuer verzögerter Öffnungstest |
| Setup, FD-Formate, Designer-Slides (07–09) | Vorschau erklärt Grösse/Schutzzonen | 1–20 Slides, gemeinsame Grössen und Undo geprüft | Selektierbare Formate + direkte Zahlenfelder sinnvoll | Labels, Inlinefehler, schmale Dialoge; korrekter Auditkontext → G05 | `material-setup`, `designer-layout`, `carousel-limits`, `post-safezones` |
| Vorlagen auswählen, abfüllen, speichern (10–12) | Bild-/Textfelder und Vorschau zeigen Zusammenhang | Erforderliche Bilder, Wiederöffnung, Designvorlage und Übergang geprüft | Karten/Preview/Detaildisclosure erhalten | Dialognamen, Tastaturvorschau, Fehlerhinweise geprüft | `templates`, `template-library`, `material-workflow`; keine neue Änderung erforderlich |
| Werkzeug-Pillen, Hinweise, Footer (03–05) | Aktive Werkzeuge und Export getrennt; Scrollmöglichkeit neu sichtbar → G04 | Shortcuts, Zoom, seitliches Scrollen und Einpassen erhalten | Kompakte Werkzeuggruppen statt zusätzlicher Menühierarchie | Namen/States; neue Griffe mit Tastaturwerten | `workspace-ui`, `modifier-scroll`, `zoom-ui`, `material-bars` |
| FD-Karten und Optionen (13,14) | Erstes Bild als Vorlage; Optionen je Bild sichtbar | Format-/Bildaktionen, Winkel unabhängig, Familienmodus/Sponsoren geprüft | Gleiche Optionszeilen; kein geschmacksbasierter Umbau | Native Checkboxen/Disclosure und Fokus geprüft | `material-cards`, `post-angle`, `angle-axis`, `post-workspace` |
| FD-Zuschnitt, Text und Stapel (15,16) | Eingabefehler direkt beim Feld → G01/G06 | Temporäres Leeren darf nicht Bild/Text verkleinern → G01 | Unterstützender Fehlertext unter dem Feld → G06 | `aria-invalid`, beschriebener Text, korrigierbarer Fehler | Neuer Test + `post-text-stack`, `post-text-size-scope`, `advanced-typography` |
| Logos/Sponsoren im Dokument (17) | Darstellung/Grösse und Bibliothek getrennt | Automatik, Gruppen, Sortierung, Export geprüft | Bestehende Leisten-/Logoanordnung unverändert | Zugängliche Auswahl, Tastaturalternative zur Sortierung | `sponsor-auto`, `sponsors-help`; Fehlerbehandlung der Bibliothek → G03 |
| Designer: Transformieren, Bilder, Winkel (18) | Auswahl vs. Bildinhalt durch bestehende UI erklärt | Numerische Entwürfe dürfen Objekte nicht versetzen → G01 | Bestehende Eigenschaftsfelder erhalten | Numerische Alternative zur Maus; ungültige Werte beschrieben | `carousel-alignment`, `carousel-photo-effects`, `path-bounds`, neuer Test |
| Text/Absatz/Inlinebearbeitung (19) | Zeichen-/Absatzgruppen bleiben | Formatierung, Originaltext, Umbrüche, Trennung, Undo geprüft | Keine Schrift-/Satzänderung für das Redesign | Semantische Felder und Fokus geprüft; reale AT offen | `inline-fidelity`, `text-justification`, `text-hyphenation`, `advanced-typography` |
| Pfade/Kurven/Formen (20) | Advanced bleibt bewusst zusätzlicher Bereich | Fortsetzen/Verbinden/Schliessen, Griffe, Kurven und Formen geprüft | Präzisionswerkzeuge sind keine Standard-M3-Formulare | Freie grafische Knotenbearbeitung nicht vollständig nichtvisuell abgenommen | `path-continuation`, `advanced-tools`, `paint-paths`, `path-bounds` |
| Ebenen/Ordner/Menüs/FX (21–24) | Einrückung, Namen, Sichtbarkeit und FX trennbar | Umbenennen, Ordnung, Effekte und Undo geprüft | Temporäre Menüs für seltenere Aktionen passend | Menütasten, Fokus, Disabledzustände und sichere Löschdialoge | `layer-renaming`, `carousel-refinements`, `audit-interactions`, `material-inspectors` |
| Fläche/Kontur und Picker (25,26) | Affinity-artige überlappende Farbwahl bewusst erhalten | Leere Alpha-/Verlaufsfelder verändern Farbe nicht mehr → G01 | Gemeinsamer Picker, Rollenfarben, kompakte Toolbar bleiben | Tastaturzugang zu beiden Kanälen, Slidersemantik, Fokus | `paint-position`, `paint-rendering`, `material-paint-wiki`, neuer Test |
| Speichern, Dateiname, Export (27–29) | Browserstand und lokale MKW-Datei sind erklärt | Flexible Daten, Auswahl, JPG/PNG/WebP/PDF/PSD geprüft | Vorschau links, Einstellungen rechts, Status sichtbar | Native Felder/Dialogs, optionale Datumsfehler und Fortschritt | `five-person-check`, `render-export`, `carousel-pdf`, `native-incremental-save` |
| Einstellungen: Navigation/Themes/Raster (30,31) | Feste Kategorien und konsistente Namen | Vier Farbkonzepte, Hilfslinien, Raster, Präferenzen geprüft | Semantische Tokens, keine Übertragung auf Artwork | Vertikale Tabs, Fokus, Kontraste und reduzierte Bewegung | `colour-combinations`, `material-fields`, `dialog-layout`, korrigierter Audit |
| Schriften/Sponsor-/Vorlagenbibliothek/Exportdefaults (32) | Bibliotheken sind Werkzeugeinstellungen | Fehlgeschlagene Sponsoränderung muss rückgängig werden → G03 | Bestehende Verwaltung bleibt; Status am Ort des Problems | Fehler als Text/Alert, Controls werden wieder benutzbar | `user-fonts`, `sponsors-help`, `template-library`, neuer Quota-Test |
| MKW-Setup (33) | Verknüpfen/Aktualisieren/Exportieren erklärt | Alle Einstellungen, Rollback und Browserfallback geprüft | Drei klar getrennte Aktionen erhalten | Feedback und Feldvalidierung geprüft | `setup-file`, Modelltests; OS-Dialoge teils simuliert |
| Wiki (34) | Aufgabenbezogen, Suchfunktion und Verweise geprüft | Lazy Loading, Suche, Links, Popup/Standalone erhalten | Einheitliche Dialoggrösse/Theme bleibt | Fokus/Escape, schmaler Inhalt, Suche geprüft | `material-paint-wiki`, `sponsors-help`, `wiki.test.js`; Scrollanleitung aktualisiert |
| Laden/Fehler/Leere/Responsive/Performance (35,36) | Kein stiller Sponsorfehler und sichtbarer Öffnungsstatus | Wiederherstellung statt Phantomänderungen → G02/G03 | Bestehender Material-Ladeindikator wiederverwendet | Kein rein farblicher Fehler; Animationen reduziert, Scrollen direkt | `material-motion`, `interactive-performance`, `large-project-frames`, 41 Kontexte |

## Priorisierte Aufgabenliste

### G01 · P1 · Ungültige Zahlenentwürfe verändern das Artwork

- **Stelle:** `static/post-inspector.js` (gemeinsames Binding), `static/carousel-sidebar.js` (`data-prop`), `static/paint-picker.js` (Alpha, Winkel, Verlaufspunkt/Mitte).
- **Problem/Auswirkung:** `Number('')` ergibt null; bisher konnten Korrigieren/Leeren eines Zahlenfelds Text auf 1 px, Bildskalierung auf ein Minimum oder Positionen/Alpha auf null setzen, mit zusätzlichem Undo-Schritt. Das ist besonders bei direkter Tastatureingabe irritierend.
- **Verbesserung:** Gemeinsame native Feldvalidierung **vor** Mutation/Checkpoint. Ungültiger Entwurf bleibt bearbeitbar, bisheriger Dokumentwert bleibt erhalten. Gültiger Wert wirkt weiterhin sofort. Vorhandene Grenz-/Schrittwerte bleiben.
- **Prüfkriterium:** Leer, null/ausserhalb erlaubter Grenzen ändern weder Zielwert noch Farbdaten; Inlinefehler erscheint. Korrektur wirkt, Fehler verschwindet. Beide Editoren und Picker.
- **Status:** abgeschlossen; Firefox und Chromium, zusätzliche Regression siehe Prüfprotokoll.
- **Grundlage:** eigene Daten-/UX-Korrektur; Material-Web-Felderreferenz [S1].

### G02 · P1 · Überlappende asynchrone Projektöffnung

- **Stelle:** `static/project-session.js` (`open`, `openFile`, Bibliothek), `static/start.js`.
- **Problem/Auswirkung:** Während Laden/Restore war die Bibliothek schliessbar und ein anderer Öffnungsweg bedienbar. Ein älterer Vorgang konnte später Projekt/History ersetzen.
- **Verbesserung:** Ein Öffnungsvorgang zur Zeit, native modale Ladeanzeige ab Beginn des Store-/Dateilesens bis zum Abschluss. Zweiter Start wird abgefangen; Hintergrund bleibt inert. Fehler geben die Oberfläche wieder frei. Autosave-Konfliktprüfungen unverändert.
- **Prüfkriterium:** Verzögerter Record, Escape und zweiter Öffnungsaufruf ersetzen das Projekt nicht; erster Vorgang beendet sich korrekt, Busy/Modal werden aufgeräumt. Bestehende fehlerhafte Datei, Save As, Browserfallback und Konflikttests bleiben erfolgreich.
- **Status:** lokal verifiziert (`comprehensive-check`, `project-open`, `project-storage`, `large-project-frames`, Firefox).
- **Grenze:** Während dieses begrenzten Ladevorgangs kein scheinbarer Abbruchknopf ohne echte Restore-Abbruchsemantik. Neue echte Abbruchlogik wäre separat zu entwerfen.
- **Grundlage:** eigene Single-flight-Entscheidung; native Dialog-/Progressreferenzen [S2,S3] und Fokusregeln [S4].

### G03 · P1 · Fehler beim Speichern der Sponsorbibliothek

- **Stelle:** `static/sponsor-ui.js` (`sponsorRenderSettings` / `save` / `action` / Import).
- **Problem/Auswirkung:** Gruppenänderungen mutierten den sichtbaren Arbeitsspeicher vor erfolgreicher IndexedDB-Transaktion. Manche Handler fingen Fehler nicht ab. Die UI zeigte dadurch nicht gespeicherte Phantomänderungen; Teilimporte konnten unsichtbar bleiben.
- **Verbesserung:** Letzten erfolgreich gespeicherten Metadatenstand behalten und bei Fehler wiederherstellen. Aktionen gegen Doppelklick sperren; nach Erfolg/Fehler Controls und Fokus freigeben. Teilimport zeigt nach Reload den tatsächlich gespeicherten Stand und eine Fehlermeldung.
- **Prüfkriterium:** Simulierter Speicher-/Schreibfehler beim Hinzufügen und Löschen: Bibliothek und Modell unverändert, kein unhandled Fehler, sichtbarer Alert; anschliessendes normales Hinzufügen funktioniert. Bestehende Gruppensortierung/Logos/Setup weiterhin prüfen.
- **Status:** lokal verifiziert (`comprehensive-check`, Firefox); bestehende Bibliothekssuiten ergänzen dies.
- **Grundlage:** eigene Zuverlässigkeitskorrektur, Rückmeldung am Ort der Aktion; kein neuer M3-Komponententyp nötig.

### G04 · P2 · Eigene Scrollgriffe innerhalb der Arbeitsfläche

- **Stelle:** neues `static/workspace-scroll.js`, `static/chrome.css`, Designer-DOM-Lifecycle in `carousel-render.js`, FD-Pasteboard in `post-workspace.js`.
- **Problem/Auswirkung:** Verborgene native Scrollleisten machten seitlich/vertikal erreichbaren Arbeitsraum schwer auffindbar. Nutzerwunsch: Griffe dürfen nicht in die Rundungen laufen.
- **Verbesserung:** In beiden Editoren horizontale/vertikale Griffe. Laufwege enden am Beginn der Eckenrundung. Grösse/Position spiegeln sichtbaren Ausschnitt; ziehen, Track-Klick, Pfeile, Bild auf/ab, Pos1/Ende. Geometrie per ResizeObserver/einem RAF gebündelt; alte Observer beim Designer-Neuaufbau entfernt. Wheel/Pinch bleiben. Keine Export- oder Dokumentdatenänderung.
- **Prüfkriterium:** Beide Achsen und Grenzen per Tastatur/Pointer; Griffrechtecke innerhalb gerader Kanten; mobile Ansicht ohne Dokumentüberlauf; genau zwei Designer-Griffe auch nach wiederholtem Render; Dokument unverändert.
- **Status:** lokal verifiziert (`comprehensive-check`, Firefox), Screenshots Desktop/390 px angesehen.
- **Grundlage:** projektspezifische UX, bestehende Material-Farb-/Formtokens; keine behauptete offizielle Material-Scrollkomponente. ARIA-Rolle und Werte [S5].

### G05 · P2 · Audit muss den aktiven Dialog prüfen

- **Stelle:** `tests/seven-perspectives.cjs`.
- **Problem/Auswirkung:** DOM-Reihenfolge entspricht nicht der Stapelreihenfolge modaler Dialoge. Teile des alten Inventars enthielten den Startscreen statt Einstellungen/Setup.
- **Verbesserung:** Fokusdialog als Scope, tatsächliche Dialog-ID protokollieren, Scope-Assertions für Einstellungen/Setup. Keine Abschwächung der Regeln oder Unterdrückung von WCAG-Verstössen.
- **Prüfkriterium:** 41 Kontexte, Allgemein 24 Controls, FD-Setup 27; passende Modal-ID. Erneuter Lauf ohne unerwartete automatische Verstösse.
- **Status:** abgeschlossen; Firefox und Chromium; Aussage früherer Inventare entsprechend eingegrenzt.

### G06 · P2 · Fehlertext quetscht sich neben Zahlenfeld

- **Stelle:** `static/ui-fields.css` / FD-Seitenleisten-Labels.
- **Problem/Auswirkung:** Tatsächlich angesehener Screenshot zeigte den Hilfstext als dritte schmale Spalte neben Label und Bildgrösse. Schlecht lesbar, unnötiger Umbruch.
- **Verbesserung:** Die betroffenen Flex-Zeilen erlauben Umbruch; Fehlertext erhält eine ungeschrumpfte eigene Zeile. Feldwerte/-funktionen und valide Zustände unverändert.
- **Prüfkriterium:** Fehlertext unter statt neben Feld; weder Sidebar- noch Dokumentüberlauf. Semantische Fehlerfarbe/Description weiter vorhanden.
- **Status:** lokal verifiziert; abschliessender Firefox-Screenshot zeigt den Fehlertext in einer eigenen Zeile unter dem Feld.
- **Grundlage:** Material-Web Supporting Text [S1]; konkrete CSS-Lösung eigene Anpassung.

## Quellen und Abgrenzung

Erneut am 26./27. Oktober 2026 abgerufen:

- **S1** [Material Web: Textfelder, Supporting Text und Validierung](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md). Offizielle Web-Implementierungsreferenz für klare Labels und unterstützende Fehlertexte, kein Zwang zur Librarymigration.
- **S2** [Material Web: Dialoge](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md). Titel/Inhalt/Aktionen und Öffnen/Schliessen als Referenz für die bestehende native Umsetzung.
- **S3** [Material Web: Progress Indicators](https://github.com/material-components/material-web/blob/main/docs/components/progress.md). Unbestimmte Dauer wird nicht als erfundener Prozentfortschritt ausgegeben.
- **S4** [W3C APG: modaler Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Fokus und inaktiver Hintergrund; APG ist Implementierungshilfe, keine Material-Regel.
- **S5** [WAI-ARIA 1.2: scrollbar](https://www.w3.org/TR/wai-aria-1.2/#scrollbar). Name, Orientierung, zugehöriger Scrollbereich und aktuelle Werte.
- [Material Web: Menüs](https://github.com/material-components/material-web/blob/main/docs/components/menu.md) und [Slider](https://github.com/material-components/material-web/blob/main/docs/components/slider.md): bestehende Auswahl-/Wert-Controls beurteilt, kein Wechsel ohne konkreten Nutzen.
- [M3 Textfelder](https://m3.material.io/components/text-fields/guidelines), [Dialoge](https://m3.material.io/components/dialogs/guidelines), [States](https://m3.material.io/foundations/interaction/states/overview) lieferten im textuellen Zugriff nur eine JavaScript-Anforderung. Daraus keine unprüfbaren exakten Masse oder Animationseigenschaften abgeleitet.
- [Material Web README](https://github.com/material-components/material-web#readme) nennt weiterhin Wartungsmodus. Die Web-App behält daher ihre statische native Komponentenarchitektur; eine Librarymigration allein wäre keine Qualitätsverbesserung. Android-/Figma-Implementierungen sind keine verbindliche Webvorgabe.

## Prüfprotokoll und offene Grenzen

- Ausgangslauf: 61/64 Firefox-Suiten bestanden. Schutzzonen, grosser Import/Speicherung und Performance brachen mit Zeitüberschreitungen ab. Keine Assertions gelockert. Alle drei anschliessend einzeln erfolgreich: inklusive 50 echten Bildimporten, grosser komprimierter MKW-Datei, Wiederöffnung, Quota-Fallback und Pixel-/Preview-Cache-Prüfungen. Ursache der Zeitüberschreitungen nicht als bewiesener Appfehler dargestellt.
- Neuer gezielter Test: Eingaben, Sponsor-Schreibfehler und Erholung, langsame/gleichzeitige Öffnung, Scrollen per Tastatur/Pointer, Geometrie, mobiles Layout, Farbfelder und Observer-Lifecycle. Firefox erfolgreich.
- 124 Modelltests erfolgreich. Formatierung/Build erfolgreich. Abschliessender Gesamtumfang **65/65 Firefox-Suiten erfolgreich**; danach zusätzliche Firefox-Abnahme der letzten Kontrast-/Fehlertext-/Sponsor-Absicherungen (je 2/2). **10/10 Chromium-Suiten** erfolgreich: neuer Gesamtcheck, korrigierter 41-Kontext-Audit, Interaktion, Projektöffnung, Setup, Sponsoren/Wiki, Felder, Modifier-Scrollen, Inline-Texttreue und Render/Export.
- 41 Kontexte nach korrigierter Scope-Erkennung in Firefox erneut geprüft, ohne unerwartete automatische axe-Verstösse oder Dokumentüberlauf. Rohprotokolle, Accessibility-Snapshots und Screenshots liegen im Arbeitsbereich `work/audits/comprehensive-2026-10-27/`.
- Offen / nicht hier überprüfbar: echte VoiceOver-/NVDA-Nutzung sämtlicher Zeichenoperationen, physische Touch-/Stiftgeräte, Betriebssystem-Dateidialoge in allen Browsern, Photoshop-/Affinity-Interpretation aller PSD-Varianten, beliebige Font-/Foto-/MKW-Kombinationen und reales Team-Onboarding. Die bestehenden Pixel-/Datei-/Tastaturtests ersetzen diese Prüfungen nicht. Kein WCAG-Zertifikat und kein Anspruch „jeder denkbare Fehler ausgeschlossen“.
- Die neue Aufgabenliste ist dieser Bericht; die konkrete Regression liegt in `tests/comprehensive-check.cjs`. Es wurden keine Exportlayouts, Logos oder Dokumentformate für Material umgestaltet.

### Abschluss der lokalen Abnahme

Alle sechs Aufgaben G01–G06 sind anhand der genannten Kriterien lokal abgeschlossen. Screenshots der FD-Fehlerzeile, Einstellungen sowie Desktop-/Mobil-Scrollgriffe wurden tatsächlich betrachtet. Der 65er-Gesamtlauf enthält die gesamte bestehende Funktionsbreite; nach den letzten kleinen Absicherungen wurden die jeweils betroffenen Fälle erneut ausgeführt. Kein Anspruch auf zusätzliche reale Nutzer-/AT-Tests. Die Veröffentlichung und deren externe GitHub-Prüfung werden separat bestätigt; lokale Tests sind keine Behauptung eines bereits grünen neuen CI-Laufs.
