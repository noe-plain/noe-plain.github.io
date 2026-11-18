# MKW Studio – verbindlicher Masterplan

Stand: **18. November 2026**. Dies ist die einzige aktive Aufgaben- und Prioritätenliste. Sie vereinigt die lokalen Pläne, die bestätigten Präzisierungen dieses Chats und die Planungsdateien des aktuellen öffentlichen GitHub-Stands. Bisherige Plandateien dienen nur noch als Verweise oder gekennzeichnete historische Nachweise.

**Historischer Konsolidierungsauftrag vom 17. November:** nur planen. **Ausdrücklicher Umsetzungsauftrag vom 18. November:** Bildkommentare abschliessen, Winkel-Plan umsetzen und bei verfügbarem Guthaben die durchgehenden Artboards prüfen/herstellen. Die tatsächlichen Ergebnisse stehen unter D29–D31; offene Aufgaben bleiben davon getrennt.

## 1. Grundlage, Quellen und Status

- Umsetzung am 18. November auf sauberem `origin/main` **ec79fe59b8b0291137dfea81f596bd7447dc365a** begonnen; öffentliche offene Issues beim erneuten Abruf leer. Eigene getrennte Arbeitskopie verwendet. Aktuelle Code-/CI-/Live-Nachweise: [REVIEW-2026-11-18.md](REVIEW-2026-11-18.md).

- Historische Konsolidierungsbasis vom 17. November: `main` **4a86da1ef7d60535b985ff50bf307ca7871c2c89**, einschliesslich der Vorlagen-Veröffentlichung vom 16. November. Der neuere Hauptzweig wurde zur Konsolidierung übernommen; gegenüber diesem Stand werden ausschliesslich Planungsunterlagen geändert. Vor einer späteren Implementierung erneut den dann aktuellen Hauptzweig abgleichen.
- 42 Markdown-Unterlagen aus dem GitHub-Dokumentationsordner erfasst und auf offene Checklisten abgeglichen; die einschlägigen Fachpläne, Aufgaben-JSON und die bestätigten Ergänzungen vom 17. November ausgewertet. Öffentliche Repository-Issues und Meilensteine lieferten beim Abruf keine Einträge. Die öffentliche Projektseite lieferte keine auswertbare Aufgabenliste; private Boards sind damit nicht geprüft.
- Der GitHub-Reihenplan vom 13./16. November priorisiert Bildkommentare vor Backup-Entfernung und danach Zeichen-/Farbwerkzeuge, Dateiformate und weitere Gestaltung. Diese Reihenfolge bleibt erhalten. Die neuen Artboard-/Vorlagengrundlagen werden nach der Backup-Bereinigung und vor neuen Zeichenwerkzeugen eingeordnet: Sie sichern das Verhalten, auf dem die weiteren Vorlagen aufbauen.
- Die drei Vorlagen „Nahe am Orchester“, „Konzertauftakt“ und „Bilder-Slider“ sind laut neuerem Releasebericht bereits freigegeben, veröffentlicht und geprüft. Nicht nochmals als offene Entwurfsaufgabe beginnen. Die neue Platzhalter-/Absatzformat-Bedienung und die noch angekündigten konkreten Nutzervorlagen bleiben separate Aufgaben.
- Ältere offene Kästchen „Push / CI / Live prüfen“ werden nicht automatisch als heutiger Fehler übernommen. Neuere Freigaben ersetzen diese Zwischenstände; erneute Kontrolle erfolgt gesammelt im unteren Abschlussblock.
- Historische Performance-Vorschläge zuerst am aktuellen Code prüfen. Bereits vorhandene Streaming-/Kompressions-, inkrementelle Speicher- und Vorschauwege nicht erneut entwickeln. Eine vollständige Dateiformat- oder Framework-Neuschreibung ist kein Selbstzweck.

**Statuswerte:** `offen`, `teilweise vorhanden`, `wartet auf Vorlage/Freigabe`, `pausiert`, `Erledigt – nochmals prüfen für Abschluss`. Nur neue tatsächliche Befunde dürfen aus der Abschlussprüfung wieder eine offene Fehleraufgabe machen.

## 2. Priorisierung anhand der fünf Personas

| Persona | Was erhält Vorrang? | Was verhindert die Priorisierung? |
| --- | --- | --- |
| Neue Nutzerin ohne Gestaltungswissen | Eindeutige Begriffe, sichtbarer Änderungsumfang, direkt befüllbare Vorlagen, nachvollziehbarer Speicherstatus und Fehlerhilfe. | Neue Einstellungsflut und versteckte Doppelklick-/Drag-Zwänge. |
| Erfahrener Nutzer mit Zeitdruck | Stabile Reihen, unveränderte Bilder über Slide-Grenzen, wiederholbare Formatierung, kurze Wege, schneller Wechsel und effiziente Speicherung. | Wiederholte Handarbeit, verlorene Ausschnitte und unnötiges Neuladen. |
| Senior UX/UI-Designerin | Zuerst ein verständliches Interaktionsmodell, danach konsistente Material-3-Komponenten und gezielte optische Korrekturen. Viel Platz für das Artwork. | Rein dekorative Komplettumbauten ohne nachgewiesenen Nutzen. |
| Barrierefreiheitsexperte | Tastaturalternativen, Fokusführung, zugängliche Namen, verständliche Fehler und Kontrast bei jeder Etappe. | Barrierefreiheit als erst am Ende angehängte Zusatzaufgabe. |
| Entwicklerin und QA-Testerin | Klare Modellgrenzen, sichere Dateien und Migrationen, reproduzierbare Tests, begrenzter Speicher und nachvollziehbare Abnahme. | Doppelte Komponenten, konkurrierende Dokumentmodelle und ungeprüfte Exportversprechen. |

**Entscheidungsregel:** Nachgewiesene Datenverlust-, Sicherheits-, blockierende Bedien- oder wesentliche Zugänglichkeitsfehler sind P0 und unterbrechen die Reihenfolge. Danach zählen konkreter Alltagsnutzen und Abhängigkeiten; kleiner Aufwand allein macht eine kosmetische Aufgabe nicht dringend. Es werden keine neu geprüften Fehler oder realen Persona-Interviews behauptet.

## 3. Gemeinsame Regeln für jede Umsetzung

- Browserbetrieb auf GitHub Pages, ohne Installation, Laufzeitserver, Konto oder zusätzliche kostenpflichtige Dienste erhalten. PDF-Editor bleibt pausiert.
- Designer und FD-Kampagnen bilden den Funktionsvergleich. Der alte FD-Backup-Editor gehört nicht dazu; die Fähigkeit, alte MKW-Dateien sicher zu öffnen/konvertieren, bleibt erforderlich.
- Vorhandene Gestaltungen beim Öffnen, beim Themewechsel und beim Ändern von Werkzeugvorgaben nicht still verändern. UI-Farben und Dokumentfarben strikt trennen.
- Gemeinsame Regeln, Ressourcen und Komponenten einmal besitzen. Gezielte Module statt neuer globaler Sonderfälle oder eines parallelen Dokumentbaums.
- Abbruch ohne halbe Mutation, sinnvolles Undo/Redo, stabile IDs, begrenzte Asset-Caches, zuverlässige Browser-/Dateisicherung und verständliche Speicherfehler gehören zur jeweiligen Aufgabe.
- Material-3-Prinzipien anhand der tatsächlichen Aufgabe anwenden. Die Affinity-artigen überlappenden Fläche-/Konturfelder bleiben erhalten. Desktop priorisieren, schmale Fenster und gelegentliche Touchbedienung erhalten.
- Hilfe, neue Dateieigenschaften und Fehlerzustände mit der jeweiligen Funktion abschliessen. Tests und Meldungen dürfen keine nur vermeintliche Bearbeitbarkeit versprechen.
- Pro Arbeitsfenster einen abschliessbaren Teil bearbeiten und eine reale Prüf-/Abschlussreserve halten. Frühere Kontingentwerte nicht als aktuelle Werte übernehmen. Keine zusätzlichen Credits, Agenten oder weiteren Nutzungsfenster automatisch einplanen.

## 4. P0 – vor jeder neuen Umsetzung und Veröffentlichung

| ID | Aufgabe | Nutzen und Abnahme | Status |
| --- | --- | --- | --- |
| Q01 | Tatsächlichen aktuellen Hauptzweig, letzte Veröffentlichung und verbleibende Fehler prüfen. | Neuere Arbeiten nicht überschreiben und behobene Fehler nicht erneut beginnen. Eindeutiger Ausgangscommit, tatsächliche CI-/Pages-Ergebnisse; neu gefundene Fehler konkret mit Reproduktion eintragen. | Vor jedem Umsetzungsschritt |
| Q02 | Betroffenen vollständigen Nutzerweg und Dateisicherheit absichern. | Neue Nutzerin schafft Einstieg → Gestalten → MKW → Wiederöffnen → Export; erfahrener Nutzer behält Verknüpfungen, Datei-/Browserkonfliktschutz und Undo. Relevante Tests vor Veröffentlichung, Live-Dateien und echte Ergebnisse danach kontrollieren. | Durchgehendes Freigabekriterium |
| Q03 | Zugänglichkeit, Darstellung und Leistung im betroffenen Bereich prüfen. | Tastatur/Fokus, benannte Felder, Hell/Dunkel/Farbkonzepte, reduzierte Bewegung, schmale Fenster; bei betroffenen Bild-/Speicherwegen mindestens 50 Bilder, gemessene Arbeit/Menge/Speicher. Fehlende manuelle Screenreader-/Touch-/Desktop-App-Prüfung ausdrücklich benennen. | Durchgehendes Freigabekriterium |

Keine dieser Zeilen behauptet, dass im heutigen Produkt bereits ein neuer P0-Fehler festgestellt wurde.

## 5. Priorisierte offene Umsetzung – Reihenfolge 1 bis 7

### 1 · Bildkommentare — B01 abgeschlossen am 18. November

Nachweis und Grenzen stehen unter **D29** und in [REVIEW-2026-11-18.md](REVIEW-2026-11-18.md). Nächste reguläre Priorität ist B02; B01 nicht neu beginnen.

### 2 · FD-Backup entfernen und gemeinsam benötigten Code bewahren — P1 / B02

**Abhängigkeit:** B01 fertig und geprüft; der bestehende GitHub-Auftrag setzt diese Reihenfolge ausdrücklich fest.

**Fortschritt 18. November, Folgeauftrag:** Abhängigkeitsmatrix und echte Konvertierungsdiagnose erstellt. Sichtbarkeit eines ausgeblendeten Logos beim Umwandeln korrigiert; neue Kampagnen unverändert. **Historischer Befund dieses Teilschritts:** eigener Test belegte Verlust der unabhängigen Winkel-Bilddrehung/des Ausschnitts; dieser wurde im anschliessenden Qualitätslauf behoben (siehe unten). Unterschiedliche Alt-/Neu-Formatgrenzen und die eigentliche Modusentfernung bleiben offen. [Konkrete Schritte, Messung und sechs Personas](FD-BACKUP-RETIREMENT-2026-11-18.md). Keine Backup-Dateien oder gemeinsamen Dienste entfernt. Teilschritt `8cbe941` veröffentlicht: vollständiger Lauf 44302332505 mit 214 Modelltests, 115 Chrome-/100 Firefox-Suiten erfolgreich; zwei echte Live-Fälle bestanden. Dies bestätigt weiterhin keine vollständige B02-Abnahme.

**Qualitäts-Folgeauftrag 18. November, Ausgang `b0200e5`:** Unabhängige Bilddrehung/Ausschnitt zentral modelliert, Alt-Hintergrund und Winkel behalten ihre Transformation. Vier Richtungen, Spiegelung, Sponsorenbereich sowie MKW/PNG/PDF/PSD tatsächlich geprüft; die frühere 17°-Fixture ist nun pixelgleich. Reale Varianten liegen höchstens 1/255 je Kanal auseinander. **B02 weiterhin offen:** grosse Altformate, repräsentativer Übergang und Entfernung der exklusiven Wege/ungenutzten Dateien stehen noch aus. [Qualitätsbericht mit sechs Personas und Grenzen](QUALITY-REVIEW-2026-11-18.md). Prüf-/Veröffentlichungsnachweis dort fortschreiben; keine vollständige Modusentfernung behaupten.

- Funktions-/Abhängigkeitsmatrix für Designer und FD-Kampagnen erstellen: gemeinsam, modusbezogen, nur Backup oder unbenutzt; dynamische Referenzen und Vorlagen berücksichtigen.
- Den alten Backup-Einstieg samt tatsächlich exklusiver UI/Logik entfernen. Gemeinsame Text-, Bild-, Speicher-, Export- und Wiederherstellungsfunktionen erhalten.
- Alte MKW-Dateien weiterhin öffnen und bei Bedarf ausdrücklich in eine geschützte, bearbeitbare neue Fassung konvertieren. Kein stiller Verlust von Inhalt, Typografie, Assets oder Originaldatei.
- Nur belegbar ungenutzte Dateien/Styles/Assets bereinigen; Grössen vorher/nachher messen. PSD und MKW bleiben verfügbar.

**Nutzen:** Weniger Verwirrung für Einsteigerinnen, weniger doppelte Wartung für QA. **Fertig, wenn:** Beide verbleibenden Modi ihre vollständigen Arbeitswege beherrschen, alte Dateien nutzbar bleiben und keine toten Backup-Verweise übrig sind.

### 3 · Durchgehendes Artboard — A01 normaler Reihenablauf geprüft am 18. November

Gemeinsame Fläche und Export-Schnitte nutzen bereits das vorhandene Gruppenmodell. Gezielte Abnahme unter **D30**; kein zweites Dokumentmodell eingeführt. Explizite alte Seitenmasken/Fragmentobjekte bleiben unverändert lesbar und werden nicht ungefragt entclippt. Für abweichende Altdateien ist weiterhin ein bewusster Migrationsentscheid nötig.

### 4 · Vorlagentexte mit vorbereiteten Absatzformaten — P1 / T01

**Abhängigkeit:** A01 für mehrseitige Vorlagen; bestehende Text-/Vorlagenmodelle wiederverwenden.

- Vorlagen beim Befüllen über beschriftete Inputfelder bearbeiten. Damit wird keine zweite Inhaltseingabe in der Editor-Seitenleiste beauftragt.
- Vorbereitete passende Absatzformate anbieten: Anwendung auf den gesamten Absatz an der Cursorposition, auch ohne Markierung.
- Harte Absätze und weiche Zeilenumbrüche unterscheiden. Auswahl über mehrere Absätze, lokale Zeichenabweichungen und spätere Formatänderungen vor der Umsetzung eindeutig entwerfen.
- Texte auf Bildern unten **im Textrahmen** verankern; horizontale Ausrichtung und Rahmenposition bleiben eigene Eigenschaften.
- Eingabe/Vorschau/Designer-Übergang zeigen dieselbe Gestaltung. Absatzgrössen folgen der bereits korrigierten Flusslogik statt in vorangehende Absätze hineinzuwachsen.

**Nutzen:** Weniger Typografie-Handarbeit für beide Nutzergruppen, nachvollziehbare Bedienung ohne Gestaltungswissen. **Fertig, wenn:** Format bei Cursor in Absatz 2 den ganzen zweiten Absatz ändert, die Nachbarabsätze unverändert bleiben und weiche Umbrüche, Undo/Redo, Speicherung und Export stimmen.

### 5 · Bildplatzhalter direkt befüllbar machen — P1 / T02

- Jeder Bildrahmen erhält eine andere stabile Pastellfarbe, einen verständlichen Namen und eine sichtbare Ersetzen-Aktion.
- Anklicken öffnet die Bildauswahl; Ersetzen behält Rahmenform, Position und Gestaltung. Dieselbe Aktion ersetzt später ein schon eingefügtes Bild. Tastaturalternative und Abbruch erhalten.
- Vorschau, Befüllfelder und tatsächlicher Rahmen beziehen sich auf dasselbe Ziel. Vorhandene Hintergrund-/Winkel-Bildverknüpfung bewahren.
- Platzhalter als leichte Designinformation speichern; keine unnötigen Bilddateien je Farbfeld erzeugen.

**Nutzen:** Einsteigerinnen erkennen direkt, wo ihre Bilder erscheinen; erfahrene Nutzer befüllen schneller. **Fertig, wenn:** Mehrere Plätze eindeutig zuordenbar sind, Ersetzen/Abbrechen/Undo/MKW/Setup funktionieren und keine Information nur durch Farbe vermittelt wird.

### 6 · Gemeinsame Oberfläche im Hintergrund vorbereiten — P1 / L01

**Abhängigkeit:** Gemeinsame Besitzerschaft aus B02; zunächst messen, was heute schon beim Start verfügbar ist.

- Ressourcen für Werkzeug-Pille, Ebenenpanel, Arbeitsfläche, Header-Buttons und Seitenleiste von Designer und FD-Kampagnen beim Start im Hintergrund vorbereiten.
- Gemeinsam nötigen Code, Styles, Icons und Dienste einmal laden/initialisieren; spätere Wechsel verwenden sie wieder. Backup ist vom Vergleich ausgeschlossen.
- Start und Eingaben nicht blockieren; priorisierte, unterbrechbare Arbeit, aktiven Nutzerwunsch bevorzugen. Keine zwei montierten Editoren, verdeckten riesigen Canvasflächen oder doppelten Listener.
- Projektbilder nicht mit UI-Ressourcen verwechseln; Bildcache-/Speichergrenzen erhalten. Das Wiki bleibt wie beauftragt erst beim Öffnen geladen.
- Langsame Verbindung, Fehler und Wiederholung berücksichtigen. Vorhandenes Lazy-Loading nicht pauschal abschaffen.

**Nutzen:** Kürzere wahrnehmbare Wartezeit ohne schwereren Start. **Fertig, wenn:** Kaltstart, erster Einstieg und Wechsel in beiden Modi gemessen sind; keine doppelte gemeinsame Initialisierung und keine Dokumentänderung durch die Vorbereitung.

### 7 · Winkel-Defaults — W01 abgeschlossen am 18. November

Zentrale neue Defaults **200 px / 50 px / 0,8**, bestehende Werte bleiben erhalten. Nachweis unter **D31**.

## 6. Danach – Editorhilfen und Dateiformate

| Reihenfolge / ID | Priorität | Offene Aufgabe | Abhängigkeit / überprüfbares Ziel |
| --- | --- | --- | --- |
| 8 / E01 | P2 | Tatsächliche Formvorschau während des Zeichnens | Gewählte Form, Proportionen, Füllung/Kontur vor Loslassen sichtbar. Escape/Pointer-Abbruch ohne Mutation/Undo-Eintrag; Zoom/Touch prüfen. |
| 9 / E02 | Erledigt – nochmals prüfen für Abschluss | Winkel mit Farbfüllung am 18. November implementiert | Nachweise D31; echte Photoshop-Handbearbeitung komplexer Effekte bleibt unter F04 offen. |
| 10 / C01 | P2 | Pipette im Farbpicker | Sichtbare Farben bei korrekten Zoom-/Ausschnittkoordinaten übernehmen, Abbruch sicher; lokale Browseralternative bei fehlender Bildschirm-Pipetten-API. |
| 11 / C02 | P2 | Farbhilfe mit fünf Farben | Aktive Reihenbilder lokal analysieren, fünf bearbeitbare Felder und passende Vorschläge; gezielte Übernahme ohne automatische Umfärbung. Transparenz, ähnliche Farben und grosse/fehlende Bilder behandeln. |
| 12 / F01 | P2 | IDML: erster bearbeitbarer Textrahmen | Bestehende tatsächlich in InDesign geöffnete leere Einseiten-Basis erhalten. Einen einfachen Text mit Basisschrift exportieren und wirklich in InDesign öffnen/bearbeiten; Schema-/Referenzlücke dokumentieren. Kein nativer INDD-Browserexport. |
| 13 / F02 | P2 | SVG als reguläres Bild | Import, Platzieren, Ersetzen, ViewBox/Masse, Transparenz, Fehler/unsichere externe Inhalte, MKW-Assetgraph und Exporte prüfen. SVG nicht ungeprüft als HTML einsetzen; keine erfundene Vektorqualität versprechen. |
| 14 / F03 | P3, gestuft | Weiterer IDML-Inhaltsausbau | Nach F01: mehrere Seiten/Bögen, Bilder/Ausschnitte/Transformationen, Absatz-/Zeichenformate, Vektoren und Effekte. Jede Stufe mit eigenen realen InDesign-Dateien abnehmen. PSD erst nach vollständiger repräsentativer Abnahme ablösen. |
| 15 / F04 | P3, nur belegte Lücken | PSD-Interop und native Spezialfunktionen | Konservative Verbesserungen sind bereits vorhanden. Offene reale Fotoersetzung, Maskenmanipulation, Sonderfonts/FX/Verläufe gezielt prüfen; Reparaturdialoge nicht unterdrücken, Rasterausnahmen benennen. Kein erneuter kompletter PSD-Neubau. |

F01 bleibt ein begrenzter Exportmeilenstein und überholt die bestätigte Folge bestehender Editoraufgaben nicht. Die leere IDML-Datei ist kein fertiger Studio-Projektexport.

## 7. Später, abhängig von Material und Nutzen

| ID | Priorität / Status | Aufgabe | Abnahme / Grenze |
| --- | --- | --- | --- |
| T03 | P3, wartet auf Nutzervorlagen | Noch angekündigte konkrete Vorlagen übernehmen | T01/T02 nutzen; Originale tatsächlich zugänglich machen, Bild-/Textplätze und Formatierung prüfen. Neue Entwürfe zeigen und nur ausdrücklich freigegebene Layouts mitliefern. Drei bereits veröffentlichte Vorlagen nicht erneut entwerfen. |
| S01 | P3 | Startseiten-Bildauswahl/-vorschau gezielt verbessern | Gewähltes Bild/Ausschnitt deutlicher, Einstellungszugang und direkter Einstieg erhalten; reale fünf-Persona-/schmale Fenster-Prüfung statt Komplettumbau aus Geschmack. |
| UI02 | P2, geplant – Nutzerauftrag 18. November | Floating Labels für alle Eingabefelder | Gemeinsame Feld-Komponenten verwenden. Bei Fokus ODER vorhandenem Wert wandert das Label nach oben und wird kleiner; leer und ohne Fokus kehrt es zurück. Nutzerbeispiel: `input:focus + label, input:not(:placeholder-shown) + label` mit `top: 0` und `transform: translateY(-50%) scale(0.8)`. Vorhandenen Stand zuerst abgleichen; die Labels nicht nur bei neu erstellten Feldern anwenden. Text-/Zahl-/Such-/Datumsfelder und Textareas sowie passende Auswahlfelder übergreifend prüfen; spezifische Beschriftung nicht textbasierter Eingaben erhalten. Auch Initialwerte, Import/Projektwechsel, Autofill, 0, ungültige Zahlen, Deaktivierung/Readonly, Hell/Dunkel und reduzierte Bewegung beachten. Dauerhaft zugeordnetes echtes Label, keine Platzhalter als Ersatz; Animation ohne springendes Layout oder teure Dauerberechnung. Noch nicht umgesetzt. |
| UI03 | P2, geplant – Nutzerauftrag 18. November | Seitenmenü für Artboards/Reihen vereinfachen | Reihe hinzufügen und anschliessend direkt anpassen können. Grösse/Format und Safezone leicht auffindbar und ohne Umwege bedienen. Klar benannte aktive Reihe und sichtbarer Reihenbezug jeder Aktion; keine unbemerkten Änderungen an anderen Reihen. Häufige Aktionen direkt sichtbar, seltene Aktionen verständlich gruppiert und leicht erreichbar. Keine zusätzlichen Overflow-Menüs oder verschachtelten Scrollbereiche; die bereits scrollende Seitenleiste bleibt der einzige Scrollkontext. Gemeinsames Gruppenmodell, einheitliche Formate je Reihe, M3-Komponenten, Desktop-Vorrang und Tablet-/Tastaturbedienung erhalten. Konkreter Ablauf und Abnahme unten; noch nicht umgesetzt. |
| S02 | P3, Bestandsabgleich zuerst | MKW-Studio-Übersicht und WebP-Redesign | Übersicht passend zu den Tools prüfen. WebP existiert und ist als Redesign vorgemerkt, PDF als geplant gekennzeichnet. WebP-Umbau erst als begrenztes eigenes Vorhaben nach dem Designtool planen; kein zweiter aktiver Projektplan. |
| K01 | P3, nach Messung | Weitere Bereinigung / Wartbarkeit / Ressourcen | Über B02 hinaus nur tote oder doppelte Bestandteile nachweisen und entfernen. Grössen/Referenzen messen, Zuständigkeiten modularisieren, bestehende Features und Dateien erhalten. Keine komplette ES-Modul-/Framework-Migration allein aus Prinzip. |
| K02 | P3, nach Messung | Weitere Import-/Render-/Speicheroptimierung | Lastfälle und aktuelle Grenzen messen, nur noch bestehende Flaschenhälse bearbeiten. Historische JSON-/Gesamtraster-Annahmen nicht ungeprüft übernehmen; bei Formatänderung alten Import/geschützte Konvertierung sicherstellen. |
| A11Y01 | P2, extern noch offen | Manuelle Nutzung mit assistiver Technik / realen Eingabegeräten | VoiceOver/NVDA, native 200-%-Vergrösserung, physisches Touch/Stift und echte Team-Erstnutzung gesondert prüfen. Automatische Tests ersetzen diese Nachweise nicht. Einzelne blockierende Befunde werden P0. |


### UI03 · Geplanter Nutzerweg und Struktur des Reihenmenüs

- **Orientierung:** Am Anfang des Bereichs „Reihen & Slides“ steht klar, welche Reihe bearbeitet wird (Nummer und Name). Klick auf eine Reihe wählt diese; Flächenauswahl, „Ebenen – N“ und Eigenschaften zeigen denselben aktiven Kontext. Während einer offenen Bearbeitung darf ein Reihenwechsel keine Eingaben still auf eine andere Reihe anwenden.
- **Häufige Aufgaben direkt:** Eine gut sichtbare Hauptaktion „Neue Reihe“; in der aktiven Reihe „Slide hinzufügen“, Anzahl **1–20** und „Reihe bearbeiten“. Neu angelegte Reihe unmittelbar benennen, formatieren und auf der Fläche erkennen können. Keine Vielzahl identischer Aktionsleisten je Slide.
- **Format und Safezone leicht erreichbar:** Gemeinsame Eigenschaften der aktiven Reihe in einem kompakten, beschrifteten Bereich im normalen Seitenleistenfluss: Formatvorgabe, Breite/Höhe mit Einheit und Safezone. Sichtbar erklären: gilt für alle Slides dieser Reihe; andere Reihen bleiben unverändert. Entwürfe, Anwenden/Abbrechen und Validierungsfehler konsistent darstellen; keine gemischten Formate erzeugen.
- **Seltenere Funktionen zugänglich:** Umbenennen, duplizieren, Reihenfolge und Entfernen in klar benannten, bei Bedarf aufklappbaren Abschnitten derselben Seitenleiste statt in einem verschachtelten Overflow-/Dreipunktmenü. Destruktive Aktionen getrennt, mit benannter Zielreihe und verständlicher Bestätigung. Bestehende freie/alte Dokumente samt nötigen Sonderfunktionen erhalten.
- **Ein Scrollbereich:** Keine innere Scrollliste, horizontalen Overflow-Leisten oder abgeschnittenen Aktionsgruppen ergänzen. Abschnitte wachsen im vorhandenen Seitenleistenfluss; Platz durch Hierarchie, kompakte Felder und aufklappbare seltene Optionen sparen. Lange Namen umbrechen sinnvoll, ohne Bedienelemente zu verdrängen.
- **Abnahme mit sechs Personas:** Neue Reihe → Grösse/Safezone ändern → Slides hinzufügen → Reihe wechseln → erneut bearbeiten; lange Namen, 1/20 Slides und abgewiesene 21., mehrere verschieden formatierte Reihen, schmale Desktopfenster/iPad Mini, Hell/Dunkel, Tastatur/Fokus, ungültige Werte, Abbrechen und Undo/Redo. Bestehende Inhalte/MKW-Rundlauf bewahren. M3-Auswahl-, Fokus-, Fehler- und Deaktivierungszustände einheitlich. Expertenprüfung, keine behauptete Nutzerstudie.

UI03 verbessert die vorhandene Oberfläche; D04/D05 und das vorhandene Reihenmodell werden nicht neu gebaut. Die Reihenfolge B02 vor weiteren Editorhilfen bleibt erhalten. Floating Labels UI02 bei den gemeinsam genutzten Feldern berücksichtigen, ohne dafür eine zweite Feldkomponente einzuführen.

## 8. Ausdrücklich pausiert oder gestrichen

- **PDF bearbeiten, kommentieren und komprimieren:** pausiert, bis der Nutzer dieses Projekt ausdrücklich wieder aufnimmt. Erkenntnisse erhalten: separates Kommentieren ohne Inhaltsänderung, eigenständige Annotationen/Antworten/Status, Originalfonts und Subset-Grenzen, Text-/Bildobjekte, Seitenorganisation, messbare Komprimierung sowie Export/Wiederöffnen. Zuerst echter Engine-/Font-Nachweis, dann klar begrenzte Fähigkeiten; keine PDF-Demo als fertiger Editor ausgeben. Bestehender PDF-Slideexport des Designtools bleibt verfügbar.
- **KI-Bilderweiterung:** auf Nutzerwunsch gestrichen, wegen kostenloser Lösung ohne Installation. Nicht wieder in die Prioritäten aufnehmen.
- **Datenimport/Serienproduktionsmodus:** wurde auf Nutzerwunsch entfernt; nicht als fehlende Automatisierung erneut hinzufügen.
- **Paralleler Neuaufbau-Prototyp:** kein zusätzlich aktiver Arbeitsplan. Der aktuelle Auftrag gilt dem bestehenden Designer/FD-Studio; alte Prototypunterlagen sind nur historische Referenz.

## 9. Freigabe und Fortschreibung

1. Beim nächsten Umsetzungsauftrag von Q01 und dem ersten offenen priorisierten Schritt ausgehen, nicht von alten „nächster Schritt“-Abschnitten.
2. Planfreigabe und bereits beauftragte Aufgaben nicht verwechseln: Der Planungslauf vom 17. November implementierte nichts. Am 18. November wurden B01/W01/E02 auf ausdrücklichen Auftrag umgesetzt und A01 gezielt abgenommen.
3. Neue notwendige Fehler hier mit Reproduktion, Auswirkung und Prüfkriterium ergänzen; bei P0 die begründete Umpriorisierung nennen.
4. Nach Umsetzung tatsächlichen Commit, Tests/Browser, Datei-/Exportnachweise und Grenzen eintragen. Den Eintrag anschliessend nach unten verschieben und **„Erledigt – nochmals prüfen für Abschluss“** markieren.
5. In der Abschlussprüfung nur relevante Regressionen wiederholen; keine bereits erfolgreiche Vollprüfung ohne neue Änderung oder Sorge grundlos neu starten. Neue spätere Änderungen verlangen ihre passende Prüfung.
6. Keine automatischen Termine ändern und keine zusätzlichen Automationen anlegen. Fünf-Persona-Review ist eine Expertenprüfung, keine behauptete Nutzerstudie.

## 10. Quellen und historische Nachweise

- [GitHub-Reihen-/Phasenplanung, festgehaltener Stand](https://github.com/noe-plain/noe-plain.github.io/blob/4a86da1ef7d60535b985ff50bf307ca7871c2c89/mkw-studio/studio/docs/DESIGNER-ROWS-PLAN.md).
- [Vorlagen-Release vom 16. November](https://github.com/noe-plain/noe-plain.github.io/blob/4a86da1ef7d60535b985ff50bf307ca7871c2c89/mkw-studio/studio/docs/TEMPLATE-RELEASE-2026-11-16.md), [maschinelle Nachweise](https://github.com/noe-plain/noe-plain.github.io/blob/4a86da1ef7d60535b985ff50bf307ca7871c2c89/mkw-studio/studio/docs/TEMPLATE-VERIFICATION-2026-11-16.json).
- [InDesign-Fortschritt und Abnahmegrenzen](https://github.com/noe-plain/noe-plain.github.io/blob/4a86da1ef7d60535b985ff50bf307ca7871c2c89/mkw-studio/studio/docs/INDESIGN-EXPORT-PLAN.md).
- [Material-3-Befundliste](https://github.com/noe-plain/noe-plain.github.io/blob/4a86da1ef7d60535b985ff50bf307ca7871c2c89/mkw-studio/studio/docs/MATERIAL-3-AUFGABEN-2026-10-26.json), [Release-/PSD-Grenzen](RELEASE-2026-10-28.md), [Text-/Karten-Fortschritt](TEXT-WORKFLOW-2026-11-13.md).
- Bestätigte Nutzervorgaben dieses Chats vom 17. November: durchgehende Artboards, Pastellplätze, Vorlagen-Inputfelder/Absatzformat am Cursor, untere Verankerung, 200/50/0,8 und gemeinsame UI-Vorbereitung.
- Lokale ursprüngliche Pläne sind vor der Zusammenführung vollständig in `work/checkpoints/PLANUNG-ARCHIV-2026-11-17.json` gesichert. Historische Prüfberichte und eingefrorene alte Arbeitskopien bleiben Nachweise, keine zweiten Backlogs. Die Material-JSON bleibt ein historisches Befundprotokoll, keine aktive Prioritätenliste.

## 11. Erledigt – nochmals prüfen für Abschluss

Alle folgenden Einträge haben genau diesen Status. Ein noch leeres Abschlusskästchen bedeutet **erneute Endkontrolle**, nicht „Funktion fehlt“. Bestehende Nachweise bleiben gültig für ihren jeweils geprüften Stand; der Planungslauf vom 17. November enthielt keine neue Produktabnahme. Die Ergänzungen D29–D31 beziehen sich auf die tatsächlichen Prüfungen vom 18. November.

| ID | Bereits umgesetzt / vorhandener Stand | Nochmals prüfen für Abschluss | Endkontrolle |
| --- | --- | --- | --- |
| D01 | Material-3-Grundgestaltung: Start/Bento, Flächen, Header/Toolbars, Sidebar/Ebenen, FD-Karten/Optionen, Einrichten/Vorlagen, Einstellungen, Bibliothek/Speichern/Export, Picker und Wiki | Gleiche Aktionen/States/Abstände, schmale Fenster und UI-/Artwork-Trennung am letzten Gesamtstand; nur belegte Restbefunde korrigieren. | [ ] |
| D02 | Kontrast, zugängliche Namen, Fokus-/Popupgrenzen, Fehlermeldungen, Löschdialoge und übrige abgeschlossene Material-Auditpunkte A01–A10/F01/F02/R01 | Keine Rückkehr früherer Fehler; Grenzen manueller AT-Prüfung bleiben bei A11Y01 offen. | [ ] |
| D03 | Einheitliche Werkzeuge ohne Advanced-Funktionssperre; kompakte Affinity-artige Fläche/Kontur mit Tausch/Ein-Aus | Vollständiger Zugriff in beiden verbleibenden Modi, sichtbare aktive Kanäle, Tastatur/Touch und keine Überlagerung. | [ ] |
| D04 | Mehrere freie Artboards/Reihen, 1–20 Slides je Reihe, Format/Schutzzonen, lokale Nummerierung und Ebenen-/Ordnerscope | Vorhandene Grundlagen erhalten; durchgehende Semantik im normalen Ablauf unter D30 gezielt abgenommen. | [ ] |
| D05 | Seiten-/Reihenaktionen, Drag-and-drop mit Alternativen, unabhängige Formate und Inhalte | Hinzufügen/Verschieben/Duplizieren/Entfernen/Abbrechen ohne fremde Reihen zu verändern. | [ ] |
| D06 | Getrennte Eigenschaften und Ebenen mit verschiebbarer Höhe; Sidebarbreite 300–450 px | Grenzen, Keyboard, Persistenz und gemeinsame Breiten von Header/Arbeitsfläche. | [ ] |
| D07 | Neuer FD-Designer-Ablauf, geschützte Altdatei-Konvertierung, gleiche Formatvorlage mit individuellen Eigenschaftsabweichungen | Textinhalt und Position unabhängig verknüpft, zusätzliche Bilder individuell, alte Originale erhalten. B02 ist die spätere Modusbereinigung. | [ ] |
| D08 | Hero-Bildkarten ohne inneren Overflow, Optionen-Popover und kompakte Zoomdarstellung | Lange Dateinamen, alle Aktionen, Copyright, niedriger Zoom und Fokus/Schliessen. | [ ] |
| D09 | Direkte Texteingabe, Softbreaks, grosse Auswahlflächen, Absatz-/Zeilensynchronisierung; Inhaltseditor aus Sidebar entfernt | Schreiben ohne Ansichtswechsel/-sprung, Scope richtig, Details unter Hauptfunktionen. Vorlagen-Input T01 ist ein anderer Ablauf. | [ ] |
| D10 | Rich-/Plain-Copy/Paste, proportionale Textskalierung und numerische Alternative | Native Tasten und Menü, Formatgrenzen, Sperren, Undo/Redo, gemischte Schriftgrössen und MKW. | [ ] |
| D11 | Absatzgrösse nach vollständiger Markierung/Dreifachklick | Absatz erhält passende Höhe, vorige Absätze unverändert, folgende rücken mit; bei Altdaten vorhandene Regeln nicht heimlich ändern. | [ ] |
| D12 | Ausrichtung/Blocksatz, Schweizer Silbentrennung, Absatz-/Zeilenwerte, Gross-/Hochstellung und Familienfarben | Gemeinsame Layout-/Inline-/Exporttreue, Auswahlumfang, Copyright ohne Familienkontur; benannte Vorlagen-Absatzformate unter T01 bleiben neue Arbeit. | [ ] |
| D13 | Winkel/Bildrahmen, Masken, Inhalt-/Rahmentrennung, Drehen, Snapping und sichtbarkeitsbezogene Abdeckungswarnungen | Exportrahmen und echte sichtbare Lücken; neue Defaults W01/Farbfüllung E02 unter D31 separat abgenommen. | [ ] |
| D14 | Pfad-/Kurven-/Formwerkzeuge, Fortsetzen/Verbinden, Mehrfachpunkte, Raster/Schutzzonen und Ebenen/Ordner/FX | Kurven-/Auswahl-/Undo-Zustände, Masken und reihenbezogene Zugehörigkeit; Formvorschau E01 bleibt separat offen. | [ ] |
| D15 | Sponsorenleisten und Gruppen, Gewichtung, Reihenfolge, automatische Darstellung, anpassbare Farbe | Heller/dunkler Hintergrund, JPG-Hintergründe, Gruppenbeschriftung und optisch stabile Logogrösse. | [ ] |
| D16 | Projektbibliothek, Speichern/Öffnen, max. fünf Browserprojekte, Konflikt-/Wiederherstellungsschutz und Asset-Bereinigung | 50 Bilder, gelöschte Inhalte, mehrere Tabs, Quota/Abbruch und kein Download durch Autosave. | [ ] |
| D17 | Effiziente Projektdateien, Stream-/Kompressionswege und inkrementelles natives Chrome-Speichern | Tatsächlich geschriebene Datenmenge/Zeiten messen; keine Assets neu schreiben, wenn nur Layout geändert wird. | [ ] |
| D18 | MKW-Setup, persönliche Fonts, Standardtextgrössen, Themen/Farbkonzepte, Hilfslinien-/Snap-/Grid-Einstellungen | Export/Verknüpfen/Aktualisieren, Fehler-Rollback, Entfernen und Trennung von Werkzeug- und Dokumenteinstellungen. | [ ] |
| D19 | Zoom/Pan/Pinch, Shortcuts, Scrollgriffe, sichtbereichsbezogene Vorschauen und Cache-Arbeit | Beide Richtungen, Ansicht bleibt stabil, unveränderte Bilder nicht erneut dekodieren; bei neuem Ressourcenablauf L01 messen. | [ ] |
| D20 | JPG/PNG/PNG-8/WebP und PDF mit Voreinstellungen, Qualität/Transparenz, Grössen/Fortschritt und flexiblen Datumsangaben | Echte Downloads, Auswahl/Namen/Abmessungen, optionale Datumswarnung, PNG-Palette/Transparenz und PDF-Einzelseiten. | [ ] |
| D21 | Exportvorschau, feste Navigation, Reihen-/Slide-Auswahl und vollständiges MKW im Bild-ZIP | Vorschau/Anzahl/Dateien synchron, null Auswahl, nur eine Reihe vs. alle, beiliegende MKW wirklich öffnen. | [ ] |
| D22 | Konservativ verbesserter PSD: zusammenhängende Texte, Bildquellen/Masken, Logos/Sponsoren, Reihen-/Gesamtumfang und Slide-Slices | Reale Bearbeitung nur im abgenommenen Umfang behaupten; offene Spezialfälle unter F04, PSD nicht vor F03 entfernen. | [ ] |
| D23 | Vorlagengalerie/Befüllen, Live-Vorschau, bildfreie MKW-Setup-Vorlagen, isolierte/cached Vorschauen und wiederholbare Fehler | Abbruch, längere Texte, eigene Bibliothek, Auswahl/Projektwechsel und MKW-Rundlauf erhalten. | [ ] |
| D24 | Drei freigegebene Vorlagen vom 16. November plus bestehende Winkel-Slidepost-Vorlage veröffentlicht | Vier Katalogeinträge, tatsächlich veröffentlichte Schlussfassung: Slider mit sechs Bildplätzen/allen Hintergründen, Winkel hinter Fotos, 40-px-Abstände und freigegebene Typografie; Originalzugriff war damals begrenzt. | [ ] |
| D25 | Leere IDML-Einseite technisch erzeugt und wirklich in InDesign geöffnet/erneut exportiert | Begrenzten Basisnachweis erhalten; kein fertiger Inhaltsexport. F01/F03 bleiben offen. | [ ] |
| D26 | Lazy Wiki/How-to und dokumentierte bestehende Bedienwege | Nach jeder neuen Funktion aktualisieren, erst beim Öffnen laden, Suche/Tastatur und verständliche Nutzersprache. | [ ] |
| D27 | MKW-Studio-Übersicht führt WebP als verfügbar/Redesign geplant und PDF als geplant | Kennzeichnung mit tatsächlichem Angebot abgleichen; spätere UX-Verbesserungen unter S02. | [ ] |
| D28 | Historische CI-/Pages-/Live-Abnahmen und automatische Browser-/Dateitests vorhanden | Neueste relevante Release-Nachweise übernehmen, keine veralteten Zwischenfehler als heutigen Zustand ausgeben und keine Tests ohne tatsächlichen Lauf behaupten. | [ ] |
| D29 | Bildkommentare B01: Vorschau-Eingabe/Bearbeiten/Entfernen, maximal 1000 Zeichen, explizites Speichern/Abbrechen, Cmd/Ctrl+Enter und Escape; diskrete M3-Notiz ausserhalb der Motive | Echte Browserabnahme mit Undo/Redo, FD-Formaten/Ersetzen/Löschen, Designer-Duplikat, Autosave/MKW und tatsächlich entpacktem ZIP. PNG/PDF/PSD-Pixel unverändert. Keine Cloud-/Mehrpersonenkommentare. | [x] Chrome/Firefox/Live, siehe Bericht |
| D30 | A01: normale Reihe bleibt eine durchgehende Fläche mit Panorama, Text, Verlauf, Form und Winkel/FX; vorhandenes Gruppenmodell beibehalten | Bewegung pixelgleich, neue Slide erhält Ausschnitte, andere Reihe unverändert, Zoom/MKW. PNG-Schnitte vs. Gesamtreferenz: maximale Kanaldifferenz 20/255, mittlere 0,00294/255; Rastertoleranz ausdrücklich, kein verlustfreies Vektorversprechen. Explizite Altmasken bleiben erhalten. | [x] Chrome/Firefox/Live, siehe Bericht |
| D31 | W01/E02: zentrale neue Winkel-Defaults 200/50/0,8; Bild/Farbfüllung mit bestehender Deckkraft, Crop beim Zurückwechseln erhalten | Gemeinsame Picker-/Geometrie-/Effektpfade, MKW, Vorlagen ohne erzwungenes Bild, echte PNG/PDF/PSD-Pixel inkl. Transparenz und FD-Adapter. PSD mit Rasterreferenz plus editierbarer Füllung/Maske; keine native Gesamt-FX-Abnahme behauptet. | [x] Chrome/Firefox/Live, siehe Bericht |
