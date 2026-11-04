# Seiten und Druckbögen – Umsetzung und Prüfung

Ausgangspunkt: a4104ba; vor der Veröffentlichung mit b061e18 vom 3. November zusammengeführt. Bestehende FD-Kampagnen, zusammenhängende Designer-Slides und freie Zeichenflächen bleiben unverändert, bis die Seitenverwaltung ausdrücklich verwendet wird.

## Entscheidungen aus den fünf Perspektiven

1. Neue Nutzerin: Auswahl „Einzelseiten / Druckbögen (2–20 Seiten)“, klare primäre Aktion, getrennte Seitennummer und Name, kurze kontextuelle Erklärung. Alle Drag-Aktionen erhalten Buttons. Trennen erhält sichtbare Ausschnitte; Rückgängig funktioniert in einem Schritt.
2. Erfahrener Nutzer: Seitenauswahl mit Umschalt/Befehl, gemeinsame Formate, Reihenfolge per Tastatur und Ziehen, explizite Kopplung und automatische Zweiergruppen. Neue Bögen per Befehl+Alt+N. Bilddaten werden geteilt, nicht kopiert.
3. UX: Format und Struktur direkt benachbart; erweiterte Druckangaben unter „Weitere Optionen“. Papier bleibt weiss, UI-Elemente/Falze gehören nicht zum Export. Keine automatische Umordnung beim blossen Öffnen alter Dateien.
4. Barrierefreiheit: virtualisierte Mehrfachauswahl-Liste mit Position/Gesamtzahl, Pfeiltasten, Leertaste/Pfeile/Eingabe und Escape; sichtbare Alternativen zum Ziehen, Statusansagen, 44-px-Ziele und Fokus. Automatische Prüfungen ersetzen keinen manuellen Screenreader-Test.
5. Entwicklung/QA: reines, deterministisches Layoutmodell; vollständiger Kandidat vor einer einzigen Historienmutation; stabile Seiten-IDs, eindeutige Bogenmitgliedschaft, begrenzte Dokumentgrösse; abgebrochene Gesten mutieren nichts. Geteilte Bildausschnitte benutzen dieselbe Asset-ID. Keine neue Runtime-Abhängigkeit.

## Quellen und Abgrenzung

- Adobe: https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/arrange-and-order-pages/redistribute-spreads-and-pages.html – Nachrücken als Konzept, keine verbindliche Web-Komponente.
- WAI APG: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/ – Listenfokus, Auswahl und Verschieben.
- Material 3: https://m3.material.io/components/segmented-buttons/overview – exklusive Moduswahl; vorhandene semantische Tokens bleiben die UI-Grundlage.

## Aufgaben / überprüfbare Kriterien

- [x] P0: vorherige CI-Fehler korrigieren: Überschriftenfolge, geteilte Oberflächen korrekt prüfen, Projektbereitschaft abwarten. Fehlgeschlagene Suiten müssen in Firefox bestehen.
- [x] P0: Modell, Validierung und Transaktionen. Ungültige/abgebrochene Befehle verändern weder Dokument noch Historie. Keine verlorenen oder doppelt zugeordneten Seiten.
- [x] P0: Inhalte beim Trennen, Zusammenfügen, Verschieben und Löschen erhalten. Übergreifende Inhalte werden bei Bedarf in editierbare, seitenbeschnittene Instanzen mit gemeinsamen Bilddaten überführt. Pixelvergleich je Seite.
- [x] P1: Inspector unter Format, Modi, Nachrücken, erweiterte Optionen, nummerierte Miniaturen, Mehrfachauswahl, Umbenennen, Reihenfolge, Gruppieren/Trennen, Hinzufügen/Duplizieren/Löschen und gemeinsame Formatänderungen.
- [x] P1: Canvas-Bögen, Falz, Abstand mindestens 32 Dokumentpixel, Seiten-Auswahl und Drag mit Andockanzeige/Abbrechen. Keine Falz/Bedienelemente im Export.
- [x] P1: Tastatur, Alternativaktionen, Fokus und Live-Ansagen; mindestens 44 px Trefferflächen; reduzierte Bewegung.
- [x] P1: 100+ Seiten: begrenztes DOM, sichtbare Seiten zeichnen, scharfe viewportbezogene Vorschau, Ladezustand. Ehrliche Ressourcenlimits (maximal 200 Seiten, 500 Objekte; PSD behält seine gesonderten Pixelgrenzen).
- [x] P1: leeres Dokument, beschädigte Struktur, alte MKW-Dateien, neue MKW-/Vorlagen-Roundtrips und Rückgängig/Wiederholen testen.
- [x] P1: Wiki/Architektur aktualisiert; Format/Build, Unit-Tests und relevante Firefox-/Chrome-Prüfungen erfolgreich.
- [ ] P1: Veröffentlichung und GitHub-Ergebnisse des finalen Commits prüfen.

Druckangaben sind Dokumentmetadaten. Anschnitt wird als Hilfe angezeigt; bestehende Seitenexporte behalten ihre exakten Endformatmasse. Kein Versprechen einer Druck-PDF mit Schnittmarken/CMYK oder nativer Photoshop-Zeichenflächen.

## Verifizierungsprotokoll

- 152 reine Tests erfolgreich (einschliesslich 16 Seiten-/Bogenmodelltests).
- Firefox: `spread-layout` prüft SHA-256 der gerenderten Seiten vor/nach Konvertieren, Zusammenfügen und Trennen; Undo/Redo, Mehrfachauswahl, Umbenennen, Seitennummern, ungültige Werte, gemeinsame freie Formate, Tastatur-Reordering und Escape, Shortcut, Drag-Cancel, 120 Seiten (DOM/Rastergrenzen), Axe, Browser-Roundtrip, Löschen bis 0/Neuanlegen und schmales Fenster.
- Firefox: `spread-layout-files` prüft ein echtes seitenübergreifendes Foto und eine Form mit Weichzeichner pixelgleich; MKW-Codec, gemeinsame Asset-Referenz, bildfreie Vorlage/Instanziierung, PDF-Einzelseiten, PSD-Slices/Composite/Seitenausschnitte, fehlende Seitenreferenz, Andocken in der Liste und Canvas-Verschieben. PDF-Werte werden in Punkten (0,75 × CSS-Ausgabepixel) geprüft, nicht mit Pixeln verwechselt.
- Sichtkontrolle: Screenshots der Doppelseite und schmalen Ansicht. Danach Format auf Breite/Höhe verdichtet; Position und Schutzzone eingeklappt, Seitenliste direkt unter dem Format.
- Vorherige CI-Befunde: fehlende H3 zwischen verschobener H2 und H4 korrigiert. Bento-/Farbtests prüfen nun die beiden sichtbaren Flächen statt des absichtlich transparenten Containers. Projektbereitschaft vor Tastatureingaben abgewartet. Neuer Einstellungsstandard `inspectorSplit:70` im exakten Erwartungswert ergänzt. Die betroffenen fünf Suiten bestehen in Firefox.

### Konkrete Grenzen

Keine echte Photoshop- oder manuelle Screenreader-Prüfung verfügbar: PSD wurde mit ag-psd gelesen und gegen Pixel/Slices geprüft, Tastatur und Axe im Browser. Keine Aussage über universelle assistive Kompatibilität. Laufzeitmessungen beruhen auf der lokalen Browserumgebung; kein allgemeines Versprechen für 200 hochaufgelöste Fotos gleichzeitig im RAM. Alte App-Versionen können neue optionale Seitenmetadaten nicht korrekt interpretieren; neue Dateien mit dieser Version öffnen. Alte MKW-Dateien bleiben unverändert lesbar und werden nur nach ausdrücklicher Strukturaktion konvertiert.

- Abschliessende Persona-Korrekturen: kompakte segmentierte Moduswahl statt durch globale Feldregeln vergrösserter Radios; dunkle ausgewählte Zustände mit passenden On-Container-Farben; Cmd/Ctrl+Z funktioniert auch im Seitenlistenfokus; leeres/unverändertes Umbenennen beendet den Editor; Seitennummer und Anschnitt lassen manuelle Bogenpositionen unverändert; neue Bögen ab Legacy-Layout sind eine einzige Transaktion; behaltene gelöschte Inhalte liegen ausserhalb der verbleibenden Seiten. Geteilte/duplizierte Effekte behalten einen validierten deterministischen Rausch-Seed, damit auch Rauschen beim Trennen pixelgleich bleibt.

## Ergänzung: digitale Bögen und individuelle Bearbeitung

Je Druckbogen maximal 20 direkt aneinandergereihte Seiten; insgesamt maximal 200. „Bogen bearbeiten“ öffnet für jeden ausgewählten Bogen einen eigenen Entwurf mit Seitenzahl, Position und optional einheitlichem Format/Schutzzonen. Verkleinern trennt Seiten ab, statt sie zu löschen. Reine Änderungen am Entwurf/Abbrechen verändern keine Dokumentdaten oder Historie; Bestätigen erzeugt genau einen Undo-Schritt. Andocken übernimmt die bestehende Zielgruppe vollständig und weist mehr als 20 Seiten ohne Seiteneffekte zurück.

## Abschlussumfang vom 4. November – neue Anmerkungen

| Priorität / Fundstelle                           | Problem und Auswirkung                                                                                                       | Änderung / Akzeptanzkriterium                                                                                                                                      | Status                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| P0 `designer-artboards.js`                       | Veralteter Auswahl-Controller bzw. fehlendes Legacy-Auswahlfeld blockierte die echte Miniatur-Auswahl nach Strukturwechseln. | Controller auf verbundenen Host/Dokument prüfen; optionales Legacy-Feld; Seitenwahl aktualisiert Format, Canvas und Fokus ohne Neuaufbau.                          | behoben; Firefox Seiten-, Leerdokument- und Wiederöffnungsabläufe bestanden                 |
| P0 `spread-layout-ui.js`                         | Nach Abbrechen einer Canvas-Ziehaktion konnte der folgende Klick die Ansicht neu zentrieren.                                 | Folge-Klick nach Ziehen/Abbruch kurz unterdrücken; Dokument/History/Ansicht bleiben unverändert.                                                                   | behoben; Firefox Escape-Transaktion bestanden                                               |
| P1 `pages-panel.js`                              | Eine lange flache Liste erklärt unabhängige Designs und zusammenhängende Seiten zu wenig.                                    | Benannte einklappbare Artboards mit proportionalen Inhaltsminiaturen, vertikalen Abständen, Auswahlzuständen und Aktionen; Ziel-Artboard behält seinen Namen.      | implementiert und Firefox geprüft                                                           |
| P1 `spread-layout-model.js`                      | Umkopieren/Verschieben darf weder Seiten verlieren noch Bilddaten vervielfachen.                                             | Ganze Artboards kopieren, Seiten zwischen Artboards verschieben, Alt-Drop kopieren, Löschablage mit drei sicheren Entscheidungen; ein Undo pro bestätigter Aktion. | implementiert; Kopier-/Ablagetests und echte Firefox-Mausgeste bestanden                    |
| P1 `typography-ui.js`, `paragraph-scope-ui.js`   | Normale/Advanced-Textpanels doppelt, Absatzfunktionen verborgen, einzelne Zeilen nur umständlich bearbeitbar.                | Ein Panel für beide Editoren/Modi, immer sichtbare native Mehrfachauswahl, gemeinsame Absatzgrössen und Zeilenabstände, klare Zeichen-/Absatzreichweite.           | Firefox Typografie, direkte Eingabe, Blocksatz, Vererbung und bestehende Textsuiten geprüft |
| P1 `inspector-width.js`, `inspector-ui.css`      | Feste Breite verhindert aufgabenbezogene Platzverteilung.                                                                    | Gleicher Griffstil;300–450px, Escape/Pointercancel/Blur, Pfeile/Home/End/Reset; Header/Workspace gleiche rechte Kante; keine Dokumentmutation.                     | Firefox beide Modi, Tastatur, Persistenz und schmale Ansicht bestanden                      |
| P1 `page-preview-cache.js`, `carousel-render.js` | Unbegrenzte Miniaturen oder Gesamt-Canvas bei100+ Seiten würden Speicher und Interaktion belasten.                           | 100-Raster-LRU, feste Fingerprint-Schlüssel, serielle Vorschau, Generation-Cancel, virtualisierte Artboardzeilen, sichtbarer4MP-Viewport.                          | Unit-/Firefox-Grenzprüfungen und tatsächliche Inhaltsvorschauen bestanden                   |
| P1 `setup-model.js`, Wiki                        | UI-Voreinstellungen dürfen nicht in Projektdateien landen; alte Anleitung widerspricht neuer Bedienung.                      | Breite/Höhenratio nur in Tool/MKW-Setup; Wiki beschreibt aktuelle Menüs, Auswahl, Grenzen und Rückgängig.                                                          | aktualisiert; Abschlussprüfung ausstehend                                                   |

### Erneute Prüfung mit den fünf Personas

1. **Neue Nutzerin:** „Neues Artboard“ ist die Hauptaktion. Vorschaubilder und Namen erklären die Zuordnung; beim Klick öffnet sich die echte Seite. Ein Bogen bedeutet mehrere direkt gekoppelte Seiten. Einrichtungswahl erklärt „Zusammenhängende Slides“ versus „Unabhängige Artboards“. Zusätzliche Aktionen liegen in den jeweiligen Menüs. Keine Behauptung eines externen unerfahrenen Usability-Testteams.
2. **Erfahrener Nutzer:** Mehrfachauswahl, numerische Formate, individuelle Bögen, Tastatur-Reordering, Alt-Kopie, Drag-Docking und Undo bleiben unmittelbar erreichbar. Thumbnail-Neuzeichnung ist unabhängig von Umbenennen/Auswahl. Bestätigungsdialog nur für die inhaltlich mehrdeutige Löschentscheidung, nicht bei jedem Verschieben.
3. **UX/UI:** Bestehende M3-Rollen, Fokus-/Auswahlflächen und Abstände weiterverwendet. Ein einziges Textpanel statt doppelter Kontrollen. Format direkt über Seitenstruktur. Kontext und Ebenen bleiben getrennt70:30; Breite verändert Header und Canvas kohärent. Licht/Dunkel und schmale Fenster werden visuell geprüft; keine Neugestaltung der eigentlichen Artworks.
4. **Barrierefreiheit:** Native Text-Mehrfachauswahl, beschriftete Felder und Tab-Reiter; Baum-Semantik mit expliziten Positionen, Tastatur-Umordnung und Abbruch, Menüs statt Drag-Zwang; Fokus und Statusmeldungen. Automatische Axe-Prüfung in beiden Themes. Ein vollständiger manueller Screenreader-Test ist weiterhin offen und wird nicht aus Axe abgeleitet.
5. **Entwicklung/QA:** Reines Kandidatenmodell und eingespritzte UI-Services; keine globale Dokumentersetzung für Miniaturen, keine doppelten Asset-Bytes. Alte Dokumente konvertieren nur ausdrücklich. Pixelvergleiche für Trennen/Verschieben/Exports, Transaktions-/Datei-/Cachetests. PSD-Prüfung bleibt Bibliotheks-/Rasterprüfung, keine Photoshop-Zertifizierung.

Zusätzliche Quellen: [WAI Baum-Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) für Hierarchie/Fokus, [Adobe mehrseitige Bögen](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-documents/create-multi-page-spreads.html) als fachliche Referenz. Unsere kompakte Panelaufteilung, Cachegrenzen und unabhängigen Artboards sind Produktentscheidungen; sie sind keine erfundenen Material-Vorgaben.

### Zusammenführung des inzwischen aktualisierten Repository-Stands

Die Änderungen von b061e18 wurden vor dem Veröffentlichen übernommen: gemeinsame Formatierung mehrerer Textebenen, Einrichtungs-Reihenfolge, vorhandene Legacy-Gruppen/Orientierung und die separate Kompatibilitäts-Testseite. Die neue produktive Seitenübersicht ersetzt keine davon stillschweigend. Vorhandene `pageGroups` werden weiter gelesen; eine ausdrücklich aktivierte Struktur entfernt diese doppelte Eigentümerliste und verwendet ausschliesslich `pageStructure`. Geometrie bleibt beim Aktivieren erhalten. Neue unabhängige Projekte verwenden die neue Übersicht. Die inzwischen überholte zweite Breitenverwaltung wurde durch den einen gemeinsamen 300–450px-Service ersetzt. Ältere Breitenwerte 240–560 werden beim Setup-Import sicher auf 300–450 begrenzt.

Weitere konkrete Korrekturen aus der Endprüfung:

- Verzögerte Fokus-Rückgabe überspringt aktive Namenseingaben und Menüs; Doppelklick-Umbenennen bleibt offen.
- Der globale Breitengriff und sein Hilfetext liegen in einer benannten Region; die 42 geprüften Kontexte haben danach keine automatischen Axe-Befunde.
- Die ältere Firefox-Seiten-Ziehfläche benutzt ein tastaturbedienbares, beschriftetes Drag-Element, weil die native Button-Variante die Geste in Firefox nicht startete. Native Mausbewegungen und die alternative Tastatursortierung sind geprüft. Untergruppen-Überschriften sind normale Panelbereiche statt global gestylter App-Header.
- Der Verlaufgriff-Test misst seine Genauigkeit in Bildschirmpixeln (maximal 1,5px für native Pointer-Rundung), statt eine bei verschiedenen Zoomstufen unterschiedlich strenge relative Dokumenttoleranz anzunehmen. Die eigentliche Verlaufsgeometrie wurde dafür nicht geändert.
- Breite und Header-/Arbeitsflächenkante werden zusätzlich bei 900/1024/1300px und 450px Sidebar geprüft.

#### Durchgeführte Gesamtprüfung

Der vollständige Firefoxlauf umfasst 83 Suiten. Beim ersten Durchlauf bestanden 79; die vier Befunde oben wurden anschliessend gezielt korrigiert und erneut geprüft. Weitere gezielte Firefoxläufe prüfen den finalen gemeinsamen Stand. Die Chrome-Gegenprüfung umfasst die 11 direkt betroffenen Seiten-, Text-, Datei-, Einrichtungs- und Sidebar-Suiten. Ein zeitlicher Fehler im neuen mobilen Breitentest wurde auf echte Footer-Bedienung nach dem Responsive-Wechsel korrigiert. Formatierung, reproduzierbarer Bundle-Build und die 152 Unit-Tests werden vor dem Commit erneut ausgeführt. Endgültige GitHub-Ergebnisse sind an den jeweiligen Release-Commit gebunden.
