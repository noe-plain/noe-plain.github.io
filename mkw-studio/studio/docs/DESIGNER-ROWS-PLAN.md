# Designer-Reihen: Ziel und verbleibender Auftrag

## Verbindliche Priorisierung · 13. November 2026

Die folgende vom Nutzer bestätigte Reihenfolge ist die aktuelle Arbeitsgrundlage. Sie ersetzt ältere Prioritäts-/„Nächster Schritt“-Angaben in diesem Dokument, im InDesign-Plan und in bisherigen Berichten. Die darunterstehenden technischen Anforderungen und Nachweise bleiben erhalten. Bereits umgesetzte Schritte vor Arbeitsbeginn mit aktuellem origin/main und dem neuesten Bericht abgleichen; keine Arbeit erneut bei null beginnen.

### Phase 1: Bestehendes Studio vervollständigen

1. **Bildkommentare fertigstellen:** sichtbare Material-3-UI in der Vorschau, Hinzufügen/Bearbeiten/Entfernen, diskrete Anzeige beim zugehörigen Bild auf der Fläche, stabile Zuordnung, validierte Eingabe, Undo/Redo/Abbruch und vollständige Speicherung. MKW-/ZIP-Rundlauf sowie tatsächliche PNG/PDF/PSD-Ausgaben auf unveränderte Motivpixel prüfen. Der nachgewiesene Speichervertrag ist eine Grundlage, keine fertige Kommentarfunktion.
2. **FD-Backup-Modus entfernen:** Abhängigkeiten und benötigte Features aller verbleibenden Modi analysieren, gemeinsame Fähigkeiten erhalten, ungenutzten Code/UI/Assets bereinigen und die verbleibenden Abläufe inklusive Dateikompatibilität regressionsprüfen. Details im Abschnitt zum FD-Backup-Auftrag unten.

### Phase 2: Editor verbessern

1. **Formvorschau beim Zeichnen** – tatsächliche Form/Füllung/Kontur während der Geste, sicherer Abbruch ohne Dokumentänderung.
2. **Winkel mit Farbfüllung** – vorhandene Bildfüllung und alte Dateien erhalten, Farbe/Deckkraft ergänzen und Darstellung/Exporte prüfen.
3. **Pipette** – Farbe aus dem Arbeitsbereich mit korrekten Koordinaten und sicherem Abbrechen übernehmen.
4. **Fünfteilige Farbhilfe** – fünf Bildfarben der aktiven Reihe und passende Vorschläge unter Berücksichtigung des Dokuments, gezielte Übernahme.

### Phase 3: Dateiformate erweitern

1. **Bearbeitbare IDML** – auf der tatsächlich in InDesign abgenommenen leeren Basis aufbauen; erster begrenzter Inhaltsschritt ein einfacher bearbeitbarer Textrahmen mit echtem InDesign-Test. Danach schrittweise nach dem InDesign-Plan fortfahren. PSD bleibt bis zur vollständigen repräsentativen Abnahme verfügbar; MKW bleibt Projektformat.
2. **SVG als reguläres Bildformat** – Import/Platzieren/Ersetzen, Masse/Transparenz/Skalierung, Assetrundlauf und bestehende Exporte abnehmen.

### Phase 4: Gestaltung

1. **Neue Vorlagen entwerfen und zur Freigabe vorlegen** – visuelle Vorschauen mit Gestaltungsbegründung; erst ausdrücklich gutgeheissene Entwürfe in die mitgelieferte Bibliothek übernehmen.
2. **Startseite und Bildvorschau verbessern** – das auswählbare Bild deutlicher darstellen und den betreffenden UI-Bereich entsprechend überarbeiten.

**Arbeitsregel:** Innerhalb jeder Phase die angegebene Reihenfolge einhalten und zunächst den vorherigen Schritt im relevanten Umfang fertigstellen, prüfen und dokumentieren. Pro begrenztem Guthabenfenster nur einen sauber abschliessbaren Teil umsetzen; die Phasen sind kein Versprechen, alles in einem Lauf zu erledigen. Notwendige kritische Fehlerkorrekturen dürfen vorgezogen werden und sind im Bericht zu begründen. Material Design 3, wartbarer Code, Computer als Hauptgerät, die sechs Personas und die bestehenden Guthaben-/Freigaberegeln gelten durchgehend.

**Einordnung weiterer bisheriger Aufgaben:** Die vereinheitlichte Werkzeugleiste ohne Advanced-Schalter ist im aktuellen Kampagnen-Vorschau-Bericht bereits als umgesetzt dokumentiert; nicht erneut als offenen Ausbau beginnen. Allgemeine Dateibereinigung wird in Phase 1.2 mit erledigt, soweit sie zur FD-Backup-Entfernung gehört. Darüber hinausgehende Bereinigung bleibt im Backlog und überholt die bestätigten Phasen nicht. Die Einzelheiten der anderen Aufträge bleiben in den jeweiligen Abschnitten unten erhalten.


Bestätigt am 11. November 2026: Eine Reihe entspricht einem bisherigen Designer-Projekt mit 1–20 normalen, bündig nebeneinanderliegenden Slides. Mehrere solcher Reihen stehen untereinander in EINER MKW-Datei. Die Oberfläche und normalen Bearbeitungsaktionen sollen diesen Zusammenhang vermitteln. Das vorhandene Gruppenmodell wird wiederverwendet; kein zweiter Projektbaum und keine eingebetteten eigenständigen MKW-Dokumente.

Der Nutzer bat zuerst um Umsetzung der sechs Punkte am Donnerstag, 12. November, dann um sofortige Umsetzung dessen, was innerhalb des aktuellen Guthabens sauber möglich ist, und Planung des Rests. Ein gesamter Lauf inklusive Prüfung, Korrekturen, Veröffentlichung und Bericht bleibt auf das Guthaben EINES Fünf-Stunden-Fensters begrenzt. Keine Zusatzcredits, API-Abrechnung, automatischen Reset-Gutscheine, Zusatzagenten oder Nutzung eines weiteren Fensters. Geteilte Fünf-Stunden- und Wochenlimits jeweils tatsächlich prüfen; unbekannte Werte nicht als Kapazität behandeln. Mindestens ein Drittel des anfänglichen verfügbaren Rests für Abschluss/Prüfung behalten; spätestens bei etwa 20 % verbleibendem Kontingent keine Funktion mehr anfangen.

## Aktueller Fortschritt · 12. November 2026

Der zusammenhängende Sechspunkte-Auftrag ist für den normalen Reihenablauf implementiert; die Kompatibilitätsgrenzen unten bleiben ausdrücklich bestehen. Dieser Abschnitt ersetzt die historische Restliste vom 11. November als aktuelle Arbeitsgrundlage. Nicht beim nächsten Review erneut mit den sechs Punkten anfangen.

| Punkt | Tatsächlich umgesetzt | Prüfung / Grenze |
| --- | --- | --- |
| 1. Aktive Reihe | Platzsparende klickbare Ebenenüberschrift „Ebenen – N“ als Reihenauswahl; gefilterte Ebenen/Ordner, lokale Reihenfolge und Ordneraktionen. Neue leere Ordner haben eine validierte Seitenzuordnung. Gemeinsame Altordner können explizit und rückgängig machbar für die aktive Reihe unabhängig gemacht werden. | Andere Reihen und geerbte Sichtbarkeit/Sperren bleiben erhalten. Gemeinsame Altordner werden bis zur bewussten Trennung nicht mutiert. Gemischte Objektauswahlen dürfen keine versteckten reihenfremden Ordneränderungen auslösen. |
| 2. Slide-Aktionen | Davor/danach einfügen, duplizieren, links/rechts verschieben, entfernen in Seitenkontextmenü und Eigenschaften. Gemeinsamer reiner Modellbefehl, 1–20 Slides je Reihe, maximal 200 insgesamt. | Vollständig enthaltene Ebenen wandern/kopieren wie im bisherigen Designer; übergreifende Gestaltung bleibt eine durchgehende Ebene. Ganze Reihen kopieren weiterhin ihre Panoramen und Effekte. |
| 3. Gemeinsames Format | Gruppenweite Breite/Höhe/Schutzzonen bleiben zentral erzwungen. Hintergrund bewusst für die ganze Reihe bearbeiten; neue Slides übernehmen das Reihenformat. Normale Strukturaktionen ordnen die Reihe bündig horizontal an. | Andere Reihen behalten ihr Format. Alte gemischte Dateien werden nicht ungefragt umformatiert; Reparatur ausdrücklich über gemeinsames Artboard-Format. Ein blosses Umbenennen vereinheitlicht keine alten Hintergründe. |
| 4. Verkleinern/Entfernen | Überzählige Slides werden nach Bestätigung entfernt, nicht als neue Reihen abgetrennt. Dialog nennt Anzahl und Beispiele vollständig entfernter Ebenen; übergreifende Ebenen bleiben erhalten. Abbrechen ohne Dokument-/Verlaufsänderung; ein Undo/Redo-Schritt. | Bestehende Markenlogik bleibt: notwendiges Logo erhalten, entfernte Duplikate nicht übereinander stapeln. Erweiterte historische Druckbogenbefehle behalten ihre ausdrücklich andere Semantik. |
| 5. Reihen-UI | Einrichtung erklärt erste Reihe und 1–20-Grenze. Direkte Aktion „Neue Reihe“, daneben Slide hinzufügen / Reihe bearbeiten, lokale Slide-Aktionen und klare aktive Reihe. Alte Druckbogen-/Nachrück-/Zusammenführungswege in geschlossener erweiterter Verwaltung. | Alte freie Dokumente und ihre erweiterten Werkzeuge bleiben unterstützt. Die Bearbeitungsstruktur bleibt dieselbe; keine eingebetteten Einzelprojekte. Desktop und 768×1024-Ansicht geprüft. |
| 6. Nummerierung/Export | Lokale Slide-Nummern ab 1 in Übersicht, Fläche und Export. Exportauswahl: diese Reihe / ausgewählte Slides / alle Reihen. Auswahl direkt in der Vorschau ändern; eindeutige R01/S01-Dateinamen. PSD zusätzlich für aktive Reihe oder ganzes Projekt. | PNG-/PDF-/PSD-Regressionsprüfungen und tatsächliche Browserdownloads. PSD wurde maschinell auf Pixel, Dimensionen, Slices und nativen Text geprüft; kein neuer Photoshop-Anwendungsnachweis. |

### ZIP enthält das vollständige MKW-Projekt

Seit diesem Lauf enthalten Bild-ZIP-Exporte unter `Projekt/<Projektname>.mkw` zusätzlich die vollständige bearbeitbare gemeinsame Datei – auch bei nur einer exportierten Slide. Der bestehende binäre MKW-Schreiber wird mit einem konsistenten Snapshot zum Exportstart verwendet; kein vereinfachtes Nebenformat. Alle Reihen und benötigten Inhalte/Bilder/Schriften werden nach den bestehenden Regeln gespeichert. Projekt, Undo/Redo und bestehende Dateiverknüpfung werden dafür nicht verändert.

Nachweis: echtes ZIP heruntergeladen, unabhängig mit Python ZIP/CRC und sichere Pfade geprüft; enthaltene MKW-Datei mit vorhandenem Leser dekodiert, hydratisiert und validiert. Nicht exportierter Text und ein echtes Bild in der anderen Reihe sind erhalten. Direkter PDF-Download bleibt PDF; es wird kein ZIP behauptet, wo keines entsteht.

### Prüfung und verbleibende Grenzen

- 183 reine Modell-/Pakettests, darunter neue `row-slides.test.js` und `row-scope.test.js`.
- Vier neue echte Browserfälle: `row-folders`, `row-workflow`, `row-export`, `row-psd`, in Chrome und Firefox. Bestehende Prüfungen für alte Dateien, Kopiersicherheit, Artboard-Parität, Formatregel, MKW, PDF, PSD und Bilder wiederverwendet.
- Vollständige lokale Chrome-/Firefox-Regression ausgeführt; an die neue Oberfläche angepasste Erwartungen und die echte Drag-Geste danach gezielt in beiden Browsern erneut bestanden. Vollständiger GitHub-/Live-Endstatus wird im Ausführungsbericht mit dem konkreten Quellcommit genannt; im nächsten Lauf vor weiterer Arbeit direkt prüfen.
- Keine neue Dokumentstruktur und keine Erhöhung der globalen 200-Slide-/500-Ebenen-/500-Ordner-Grenzen. Text-/Absatz-/Zeilenformatierung bleibt erhalten.
- Alte gemeinsame Ordner und gemischte Formate verlangen einen bewussten, verlustfreien Übergang. Kein automatisches Normalisieren beim Öffnen und keine Behauptung einer rückwirkend vereinheitlichten Altdatei.
- Die sechs Personas sind eine strukturierte Expertenprüfung, keine durchgeführte Nutzerstudie. Details: [Persona-Bericht](PERSONA-REVIEW-2026-11-12.md).
- Guthaben zu Beginn und an Implementierungsschritten tatsächlich geprüft; keine zusätzlichen Credits, Agenten oder zweites Fenster verwendet. Nach Implementierung keine unabhängigen Bonusfunktionen begonnen.

### Präzisierung am Ende des Laufs: kompakte Reihenauswahl

Nutzerwunsch vom 12. November umgesetzt: Klick auf **„Ebenen – N“** in der Ebenenüberschrift öffnet die Reihenwahl; N ist die aktuelle Reihennummer. Vollständige Namen stehen im Menü/Tooltip. Die separate Reihenauswahl darunter ist entfernt. Tastatur, Escape, Fokus, unveränderte Dokumentrevision/Undo, gefilterte Ebenen und iPad-Mini-Ansicht geprüft. Exportvorschau zusätzlich auf leere Auswahl/Wiederwahl und eindeutige Reihen-/Slide-Beschriftung korrigiert.

### Schlussprüfung: echte Gesten weiterhin nachweisen

Erster vollständiger CI-Lauf `43182083492`: Chrome erfolgreich, Firefox mit einem Fehler am alten Drehgriff-Test. Dessen echte Pointer-Geste erhielt in `55cb80b` explizite Startbedingungen (Projekt/Fonts bereit, Griff stabil/erreichbar, Hit-Test auf tatsächlichen Griff); die Assertion auf geänderten Winkel bleibt unverändert. Lokal kompletter Firefox-Fall mit 50-Bilder-Rundlauf sowie gezielter Chrome-Fall bestanden. Vollständiger Folgelauf 43184759168 für 55cb80b erfolgreich, beide Browser bestanden. Nach anschliessenden Material-3-Feinkorrekturen den neuesten Endlauf ebenfalls direkt prüfen.

### Historische Aufgabenliste vom 12. November

Die frühere Reihenfolge an dieser Stelle ist durch die verbindliche Vier-Phasen-Priorisierung vom 13. November am Dokumentanfang ersetzt. Anforderungen und bereits erreichte Prüfungen bleiben in den Fachabschnitten erhalten.

## Historischer Ausgangsstand am 11. November

Bereits veröffentlicht: 1–20 Slides pro Gruppe, mehrere Reihen, gemeinsames Artboard-Format/Schutzzonen, ganze Reihen duplizieren mit zusammenhängenden Ebenen und identischem Effektrauschen, Begrenzung von Inhalten zu anderen Reihen. Das ergibt noch keine vollständige Gleichheit mit dem bisherigen Designer. Die vorherige Kurzformulierung war dafür zu weitgehend.

**Jetzt ergänzter begrenzter Teil von Punkt 1:** aktive Reihe als reine Bedieninformation; sie bleibt nach der Objektauswahl erhalten. Neue Elemente/Bildimporte und Strg/⌘A richten sich nach der aktiven Reihe. Klick auf eine leere Slide wechselt den Bearbeitungsbereich. Kopieren/Einfügen in eine andere Reihe überträgt die relative Position und setzt die Zielzuordnung neu, statt die Kopie um 30 px in der ursprünglichen Reihe einzufügen. Innerhalb derselben Reihe bleibt der bisherige 30-px-Versatz erhalten. Beim Übertragen einzelner Ebenen werden Ordnerzuordnungen gelöst und geerbte Sichtbarkeit/Sperren übernommen, damit keine globale Ordnerkopplung neu entsteht. Ganze Ordner werden damit noch nicht als unabhängige Zielordner kopiert. Explizite Auswahlen aus mehreren Reihen behalten beim Duplizieren ihre Zuordnungen; Einfügen einer solchen gemischten Auswahl in eine andere Reihe wird verständlich und ohne Verlaufseintrag abgewiesen.

Zum damaligen Zwischenstand blieben Ebenenliste und Ordneraktionen dokumentweit. Auch die übrigen fünf Punkte sind noch nicht vollständig umgesetzt. Nicht als sechs erledigte Aufgaben berichten.

## Historische Restliste vor dem Lauf vom 12. November

| Punkt | Ziel / notwendige Änderung | Stand |
| --- | --- | --- |
| 1. Aktive Reihe | Verbleibend: klarer sichtbarer Reihenbezug, Ebenenliste/Ordner/Ordnerauswahl und normale Aktionen auf die aktive Reihe begrenzen. Bestehende reihenübergreifende Ordner verlustfrei behandeln; Änderungen dürfen andere Reihen nicht versteckt mitändern. Projektwechsel, Undo und entfernte aktive Reihe berücksichtigen. | Auswahl, Einfügen und neue Elemente teilweise erledigt; Ebenen-/Ordneroberfläche offen. |
| 2. Normale Slide-Aktionen | Davor/danach einfügen, duplizieren, links/rechts verschieben und entfernen wie im bisherigen Designer – immer innerhalb der gewählten Reihe. 1–20 je Reihe, keine globale 20-Slide-Grenze. Keine versehentliche Abtrennung oder Verschiebung anderer Reihen. | Offen. |
| 3. Gemeinsames Reihenformat | Im normalen Reihenmodus ein Format, gemeinsame Schutzzonen und Hintergrund pro Reihe; Slides bündig und horizontal. Einzelne Slides nicht versehentlich separat verformen oder frei versetzen. Alte freie/gemischte Dokumente verlustfrei erhalten; keine ungefragte Umformatierung beim Öffnen. | Breite/Höhe werden jetzt zentral gruppenweit geändert; neu entstehender Formatmix wird abgewiesen. Durchgängige Einrichtung/UI und gemeinsamer Hintergrund noch offen. |
| 4. Verkleinern/Entfernen | Überzählige Slides nicht automatisch zu weiteren Reihen abtrennen. Bisherigen verständlichen Löschablauf übernehmen: betroffene Inhalte benennen, Abbrechen ohne Änderung, übergreifende Inhalte korrekt behandeln, gesamte Aktion mit Undo/Redo. | Offen; aktuell werden überzählige Slides abgetrennt. |
| 5. Oberfläche für Reihen | Hauptaktionen „Neue Reihe“, „Slide hinzufügen“, „Reihe bearbeiten“; verständlicher aktiver Reihenname. Druckbogen-/Zusammenfügen-/Trennen-/Nachrücken-Optionen aus dem normalen Ablauf nehmen, ohne alte freie Dateien oder ihre erweiterten Funktionen zu beschädigen. Keine parallelen widersprüchlichen Bedienwege. | Offen. |
| 6. Nummerierung und Export | Slides je Reihe ab 1 nummerieren; eindeutige Reihen-/Slide-Namen. Direkt „diese Reihe“, „ausgewählte Slides“ oder „alle Reihen“ exportieren. Bestehende PNG/PDF/PSD-Wege und richtige Abmessungen/Bild-/Textzuordnung erhalten, Namenskollisionen verhindern. MKW bleibt gemeinsame Projektdatei. Exportumfänge ehrlich benennen und tatsächlich prüfen. | Offen; aktuelle Auswahl ist überwiegend dokumentweit. |

Priorität: die verbleibende Reihenisolation in Punkt 1 vervollständigen, darauf die zusammenhängenden Punkte 2–5 umsetzen, danach Punkt 6 gezielt ergänzen. Alle sechs bleiben beauftragt; nur nachweisbar fertige Punkte abhaken. Falls tatsächliches Guthaben oder unerwarteter Aufwand nicht für alles reicht, den sicheren getesteten Teil veröffentlichen und die verbleibenden konkreten Lücken hier fortschreiben. Keine Behauptung vollständiger Designer-Parität allein aufgrund der Darstellung mehrerer Reihen.

## Gezielte Abnahme

- Alte Designer-Datei: Aktivierung/Öffnen ohne Inhalts-/Pixelverlust; bisherige Einzelreihe funktioniert weiter.
- Drei Reihen mit 1/3/20 Slides, insgesamt mehr als 20. 21. Slide je Reihe wird atomar ohne Undo-/Redo-/Datenverlust abgewiesen.
- Auswahl, neue Elemente, Einfügen, Ebenen/Ordner und Slide-Aktionen ändern nur die gewählte Reihe; direkt ausgewählter Text behält seine bisherige Formatierungslogik.
- Panorama über benachbarte Slides bleibt bearbeitbar; keine Überläufe in andere Reihen. Echte Kopien mit Effekten visuell vergleichen.
- Verkleinern: Abbrechen, Bestätigen, Undo und Redo; übergreifende und ausserhalb liegende Inhalte prüfen.
- MKW speichern/lesen/wiederherstellen, relevante vorhandene PNG-/PDF-/PSD-Prüfungen und gezielte echte Browserabläufe wiederverwenden. Desktop/iPad-Mini-Grösse und sechs Persona-Perspektiven prüfen. Keine Smartphone- oder spezielle Sehbehinderungs-Abnahme.
- Bewährte Dokument-/Speichergrenzen (derzeit 200 Slides und 500 Ebenen je Gesamtdokument) nicht ohne eigene begründete Leistungsprüfung anheben.

## Bewusst später

Mehrere bestehende MKW-Dateien als neue Reihen importieren ist eine zusätzliche mögliche Funktion, keine Voraussetzung für diese sechs bestätigten Punkte und kein Bonusziel dieses Laufs.

IDML-Ausbau erhält am Donnerstag gegenüber diesem konkret bestätigten Reihenauftrag keine zusätzliche Implementierungszeit. Die tatsächlich in InDesign geöffnete leere Einseiten-Basis bleibt erreicht. Der nächste einfache bearbeitbare Text-Meilenstein folgt in einem späteren normalen Review, siehe INDESIGN-EXPORT-PLAN.md. PSD bleibt verfügbar, MKW bleibt Studio-Projektformat.

## Arbeitskopie und Nachweise

Die ursprüngliche Arbeitskopie enthält andere ungesicherte Änderungen. Ihr Abgleich wurde von der automatischen Freigabe abgelehnt und darf ohne ausdrückliche Zustimmung nicht erneut versucht oder umgangen werden. Eine getrennte saubere Arbeitskopie auf aktuellem origin/main verwenden; nur eigene Studio-Änderungen veröffentlichen.

Der neue Browserfall `tests/row-context.cjs` prüft echte Tastaturaktionen, aktive Reihe nach wiederholtem Erstellen, reihenübergreifendes Einfügen, geerbte Ordnersichtbarkeit/Sperre, Klick auf eine leere Slide, Undo/Redo und MKW-Rundlauf ohne gespeicherten Bedienzustand. Bestehende Artboard-/Seitenverschiebe-/Datei-/Kopiersicherheits-Prüfungen bleiben relevant. GitHub-/Live-Abschluss wird im Ausführungsbericht nach tatsächlicher Prüfung genannt.


## Verbindliche Präzisierung: kein Formatmix innerhalb einer Gruppe

Alle Slides innerhalb derselben Seitengruppe / desselben Artboards haben identische Breite und Höhe. Verschiedene Formate sind nur zwischen getrennten Artboards erlaubt. Auch Einzel-Slide-Auswahl oder erweiterte Felder dürfen diese Regel nicht umgehen. Bestehende Altbestände mit gemischten Gruppen müssen ohne Inhaltsverlust ausdrücklich vereinheitlicht werden können; keine ungefragte Umformatierung beim Öffnen.

## Zusätzlicher Vorlagenauftrag (erst nach Reihenumbau)

Neue Studio-Vorlagen nach Gestaltungsgrundsätzen entwerfen: klare visuelle Hierarchie, Typografie, Raster/Ausrichtung, Abstände und Weissraum, stimmige Farben und Kontraste sowie konsistente Wirkung über alle Slides. Bestehende Marken-/Studio-Vorgaben und reale Inhaltslängen berücksichtigen. Entwürfe als verständliche visuelle Vorschauen mit kurzer Begründung zeigen, bevor sie mitgeliefert werden.

**Freigabe ist ausdrücklich erforderlich:** Der Nutzer beurteilt die Entwürfe. Nur ausdrücklich von ihm gutgeheissene Vorlagen dürfen anschliessend in die mitgelieferte Vorlagenbibliothek aufgenommen werden. Eine ausbleibende Antwort ist keine Zustimmung. Vor der Aufnahme Bearbeitbarkeit, Textumbruch, Bildausschnitte, sichere Bereiche, Reihenformat und Speichern/Öffnen prüfen. Die bestehenden Vorlagen bis zur Freigabe bewahren. Dieser Auftrag ist geplant; noch keine neuen Entwürfe oder Freigaben behaupten und nicht zusätzlich in den laufenden Format-Fix packen.


## UX-Auftrag für den gesamten Reihenablauf

Präzisierung vom 11. November: Die UI muss überall zum Modell „mehrere bisherige Designer-Projekte als Reihen in einer Datei“ passen. Zuerst die Nutzerwege und Zustände prüfen, danach die UI daran ausrichten; keine reine Umbenennung alter Druckbogen-Funktionen.

- Einrichtung: Anzahl und Format der Slides einer ersten Reihe verständlich festlegen, zusätzliche Reihen nachvollziehbar ergänzen, keine verwirrende doppelte Aktivierung/Moduswahl. Vorschau und Erklärung zeigen, dass 1–20 Slides JE Reihe gelten.
- Seitenleiste: aktive Reihe klar erkennbar; Reihenübersicht und darunterliegende Slides verständlich unterscheiden. Reihenname, lokale Slide-Nummerierung und Aktionen müssen zusammenpassen. Ebenen-/Ordnerbereich und Formatfelder beziehen sich nachvollziehbar auf die aktive Reihe.
- Fläche und Navigation: ausgewählte Reihe/Slide/Objekt klar unterscheiden; Zoom, Zentrieren, Reihenwechsel und neue Elemente müssen vorhersehbar funktionieren. Verschieben, Duplizieren, Einfügen und Entfernen einschliesslich Abbrechen/Undo/Redo ohne versteckte Nebenwirkungen gestalten.
- Eigenschaften: eindeutig zeigen, welche Änderungen für alle Slides der Reihe gelten. Keine Einzel-Slide-Grössenfelder, die einen Formatmix vortäuschen oder erlauben. Textauswahl und Absatz-/Zeilenformatierung bleiben wie beauftragt.
- Speichern, Öffnen und Export: gemeinsame MKW-Datei und Reihen-/Slide-Auswahl verständlich vermitteln; echte Ausgabedimensionen und Dateinamen zeigen, damit Reihen nicht verwechselt oder Ausgaben überschrieben werden. Leere/ungültige Zustände sowie Fehler und Fortschritt berücksichtigen.
- Konsistenz und Abnahme: vorhandene Material-3-Komponenten und klare Begriffe wiederverwenden, normale/erweiterte Bedienwege abstimmen. Desktop und iPad-Mini-Grösse mit Tastatur und Touch berücksichtigen. Die sechs Personas entlang der vollständigen Abläufe prüfen, nicht nur einzelne Panels.

Der damalige technische Format-Fix allein erfüllte diesen UI-Auftrag noch nicht. Der folgende Fortschrittsabschnitt vom 12. November dokumentiert den anschliessenden Umbau.


## Weiterer technischer Schritt: gruppenweit einheitliche Formate

Die öffentliche Modellfunktion ist jetzt die gemeinsame Prüfgrenze aller Strukturaktionen. Formataktionen und Grössenänderungen über die bisherigen Einzel-Slide-Felder werden an die bestehende ganze-Artboard-Aktion weitergereicht; der bisherige parallele Einzel-Formatpfad wurde entfernt. Andere Reihen behalten ihr Format. Zusammenfügen, Verschieben in eine Gruppe oder automatisches Neuverteilen dürfen keine gemischten Gruppen erzeugen und werden andernfalls vor der Dokument-/Verlaufsübernahme verständlich abgewiesen. Neue Slides übernehmen das Gruppenformat. Drei zusätzliche Modelltests und ein echter Browserfall decken diese Wege ab.

Alte bereits gemischte Dateien bleiben ohne automatische Verformung lesbar. Die Seitenleiste weist auf den Altbestand und die bewusste Vereinheitlichung über das Artboard-Format hin. Solche Gruppen dürfen nicht erweitert oder als gemischte Gruppe neu dupliziert werden. Der explizite gemeinsame Formatwechsel repariert die Gruppe; nicht behaupten, alle historischen Dateien seien beim Öffnen automatisch vereinheitlicht worden.

## Wartbarkeit und sechs Personas

Verbindliche Ergänzung des Nutzers: Regeln zentral im vorhandenen zuständigen Modell halten, keine duplizierten Sonderfälle je Schaltfläche, keine zweite Dokumentstruktur. Kleine nachvollziehbare Änderungen, klare Verantwortungen und aussagekräftige Regressionstests verwenden. Vor Veröffentlichung aus allen sechs Perspektiven prüfen: neue Nutzerin, erfahrener Designer, Senior UX-Experte, UI-Expertin, QA-Entwicklerin und destruktiver Fehlersucher. Findings und tatsächlich offene UX-Schritte dokumentieren; die sechs Personas ersetzen keine Tests und sind keine behauptete Nutzerstudie.


## Weitere beauftragte Editor- und Farbwerkzeuge

Stand 12. November: Die Auswahl in der Exportvorschau ist implementiert und browsergeprüft. Die übrigen Funktionen bleiben geplant. Exportauswahl ist mit dem Reihen-/Export-Umbau verbunden; die anderen vier Werkzeuge nach der stabilen Reihenbasis in begrenzten, prüfbaren Schritten umsetzen. Die geltenden Guthabengrenzen und sechs-Persona-Prüfungen gelten weiterhin.

| Funktion | Gewünschtes Verhalten / Abnahme |
| --- | --- |
| Auswahl in der Exportvorschau | Reihen/Slides direkt in der Vorschau ein-/ausschliessen und Auswahl anpassen, ohne Einstellungen zu verlieren. Vorschau, Anzahl, Namen und echte Exportdateien zeigen stets dieselbe Auswahl; leere Auswahl und schnelle Wechsel/Abbrechen berücksichtigen. |
| Tatsächliche Formvorschau beim Ziehen | Vor dem Loslassen die ausgewählte Form mit Füllung/Kontur/Proportionen zeigen, nicht nur einen allgemeinen Rahmen. Vorhandene Geometrie/Zeichenlogik wiederverwenden. Entwurf ohne laufende Dokument-/Undo-Einträge; Escape/Pointer-Abbruch hinterlässt keine Änderung. Zoom und Touch prüfen. |
| Winkel mit Farbfüllung | Zusätzlich zu Bildinhalt eine klare Farbfüllung mit Farbe/Deckkraft ermöglichen. Bisherige Winkel, Dateien und Effekte bewahren; Darstellung, Vorlagen, MKW sowie PNG/PDF/PSD prüfen und tatsächliche Bearbeitbarkeit ehrlich benennen. |
| Pipette im Farbpicker | Sichtbare Farben direkt aus dem Arbeitsbereich aufnehmen; Zoom, Bildausschnitte und Abbrechen korrekt behandeln. Passenden lokalen Weg für unterstützte Desktop-/Tablet-Browser anbieten, ohne ausschliessliche Abhängigkeit von einer eventuell nicht verfügbaren Bildschirm-Pipetten-API. |
| Farbhilfe-Fenster mit fünf Farben | Fünf Farben aus Bildern der aktiven Reihe zusammenstellen, als fünf bearbeitbare Farbfelder zeigen und gezielt übernehmen. Zu einer ausgewählten Farbe mehrere passende Vorschläge unter Berücksichtigung des restlichen Dokuments anbieten. Keine ungefragte Umfärbung; sichtbare Ausschnitte, ähnliche Farben, Transparenz, fehlende und grosse Bilder beachten. Lokale Analyse ohne zusätzliche API-Kosten bevorzugen. |

Neue Vorlagen weiterhin vorlegen und nur nach ausdrücklicher Nutzerfreigabe mitliefern. Keine dieser Wunschfunktionen allein durch diese Planung als erledigt darstellen.

## Neuer Folgeauftrag: Studio-Dateien und Datenmenge aufräumen

Nutzerauftrag vom 12. November: Anzahl und Grösse der Studio-Dateien reduzieren. Alles für Bearbeitung, Öffnen/Speichern bestehender MKW-Dateien, Vorlagen und Exporte Nötige behalten; tatsächlich unbenötigte Bestandteile entfernen. Vorher Abhängigkeiten erfassen und Grössen/Dateianzahl messen. Besonders veraltete oder doppelte Artefakte, ungenutzte Assets und vermeidbare Auslieferungsduplikate prüfen. Quellcode, notwendige Build-/Prüfgrundlagen sowie benötigte Bilder, Schriften, Logos und Bibliotheken nicht aufgrund einer einfachen Textsuche als ungenutzt einstufen. Auch dynamische Referenzen, Vorlagen und ältere Projektdateien berücksichtigen.

Nur das Studio bearbeiten, keine projektfremden Ordner oder Nutzerdateien entfernen. Git als nachvollziehbare Rückfallebene nutzen. Bearbeitungsfunktionen der verbleibenden Modi erhalten; ausschliesslich zum ausdrücklich abgekündigten FD-Backup-Modus gehörende Funktionen dürfen nach Abhängigkeitsprüfung entfernt werden. PSD nicht vor der tatsächlichen InDesign-Abnahme entfernen. Erst nach gezielter Regression und Prüfung des ausgelieferten Builds veröffentlichen; vorher/nachher Dateianzahl, Speicher-/Auslieferungsgrösse und echte Grenzen berichten. Dies ist eine geplante Folgeaufgabe, keine bereits durchgeführte Bereinigung und kein zusätzlicher Bonus zum heutigen Reihenumbau.


## Neuer Folgeauftrag: eine Werkzeugleiste ohne Advanced Mode

Nutzerpräzisierung vom 12. November: Die Werkzeugleiste vereinheitlichen und den Advanced-Mode-Schalter als Voraussetzung für Funktionen abschaffen. Alle Funktionen sollen ab Beginn erreichbar sein. Die Oberfläche auf Computer als Hauptgerät ausrichten; Tablets werden nur gelegentlich genutzt und bleiben sekundär unterstützt. Platz sparen und gleichzeitig Anfängern verständliche Wege anbieten.

Vor der Umsetzung die tatsächlich modeabhängigen Werkzeuge, Eigenschaften, Menüs, Shortcuts, Einstellungen und Setup-Voreinstellungen erfassen. Nicht nur den Schalter verstecken oder pauschal mehr Knöpfe nebeneinander stellen. Gemeinsam mit den sechs Personas die Aufgabenfolge, Gruppierung, Platzierung/Form der Werkzeugleiste, Auswahlzustände, Beschriftung/Hilfe und das Nutzungsverhalten entwerfen. Alle Funktionen ohne Moduswechsel zugänglich machen; aufgabenbezogene Gruppen und nachvollziehbare Kontextmenüs sind mit einer platzsparenden Oberfläche vereinbar. Ein Kontext darf fachlich unpassende Aktionen mit verständlichem Grund deaktivieren, aber keine Funktionsklasse hinter einer globalen Expertenfreigabe verstecken.

Bestehende Zeichen-/Text-/Bild-/Reihenfunktionen, Shortcuts sowie Auswahl-/Abbruch-/Undo-Abläufe erhalten. Alte Advanced-Mode-/MKW-Setup-Präferenzen verträglich einlesen, ohne Dokumentinhalte oder gespeicherte Gestaltung ungefragt zu ändern; ihre fachlich noch nötigen Daten nicht blind löschen. Erst Benutzerwege/Entwurf, dann zentral vorhandene Toolbar-/Inspector-Zuständigkeiten anpassen; keine zweite parallele Werkzeugleiste. Desktop bei üblichen und kleineren Fenstergrössen sowie Maus/Tastatur priorisieren; gelegentliche Nutzung ab iPad Mini und Touch nicht beschädigen. Sechs-Persona-Matrix, relevante Browser-/Datei-/Exportregressionen und Platzbedarf/Erreichbarkeit prüfen.

Dies ist ausdrücklich ein geplanter Folgeauftrag. Der heutige Editor besitzt den Advanced Mode noch; noch keine Entfernung oder fertige neue Werkzeugleiste behaupten. Den Auftrag im nächsten passenden begrenzten Review nach tatsächlichem Guthaben umsetzen, nicht zusätzlich auf Kosten der laufenden Schlussprüfung.


## Verbindliche UI-Regel: Material Design 3 und stimmige Designsprache

Nutzerpräzisierung vom 12. November gilt für alle jetzt und künftig bearbeiteten oder neuen Bedienelemente: Material Design 3 und eine schöne, funktional konsistente Designsprache gemeinsam umsetzen. Vorhandene semantische Farb-/Oberflächenrollen, Form-/Abstands-/Typografietokens, Hierarchie, Menü-/Dialog-/Feld-/Button-Zuständigkeiten und Zustände wiederverwenden. Auswahl, Fokus, Hover/Druck, Deaktivierung, Fehler/Laden und Abbruch müssen verständlich und im ganzen Ablauf konsistent sein; nicht bloss runde Knöpfe als M3 ausgeben. Computer und Platzersparnis priorisieren, seltene Tablet-/Touch-Nutzung erhalten. Mit sechs Personas und tatsächlichen hellen/dunklen Browseransichten prüfen.

Heute entsprechend nachgestimmt: kompakte Ebenenüberschrift mit korrekter Typografie/Zuständen, aktive Reihe im Menü markiert, lange Namen ohne Überlauf, einheitliche Auswahlflächen/-zustände in der Exportvorschau. Bestehende Material-/axe-Regressionen und die neuen Reihenprüfungen verwendet. Die künftige Toolbar ohne Advanced Mode bleibt geplant, diese Gestaltungsregel ist Teil ihrer Abnahme.


## Export-Präzisierungen und Bildnotizen · 12. November

**Umgesetzt:** In der Einzelvorschau kann „Dieses Bild exportieren“ direkt an-/abgehakt werden. Das gerade betrachtete Bild bleibt beim Abwählen sichtbar und kann sofort wieder gewählt werden; die Vorschau dient nun zum Durchsehen aller Bilder, beginnend bei der ersten ausgewählten Ausgabe. Anzahl, Gesamtauswahl und echte Exportdateien bleiben synchron; null ausgewählte Bilder sperren den Export. Die Exportübersicht zeigt Bilder ALLER Reihen, jeweils unter eigenem Reihentitel und mit einer visuellen Trennlinie zur folgenden Reihe. Das begrenzt nur die Ausgabewahl, nicht die Sichtbarkeit der übrigen Bilder. PNG-/ZIP-/PDF-Regressionsprüfungen in Chrome/Firefox verwenden.

**Nächster beauftragter Schritt: interne Bildkommentare (noch offen).** Kommentar direkt in der Vorschau hinzufügen, bearbeiten und entfernen; auf der Arbeitsfläche beim zugehörigen Bild/Slide anzeigen, ohne Motiv, Auswahlgriffe oder Designprozess zu verdecken. Eine kleine zurückhaltende Notiz am Rand mit zugänglicher, ausklappbarer vollständiger Anzeige entwerfen, in der vorhandenen Material-3-Designsprache. Es handelt sich um eine interne Notiz, nicht um sichtbaren Motivtext.

Vor Umsetzung stabile Bild-/Slide-Zuordnung statt Vorschauindex klären und die bestehenden Modell-/Speicherzuständigkeiten nutzen. Kommentar dauerhaft mit der gemeinsamen MKW-Datei und der vollständigen Projektbeigabe im ZIP speichern. Eingabegrenzen, reiner Text/HTML-Escaping, leere/lange Kommentare, Undo/Redo, Autosave, Öffnen/Speichern sowie Duplizieren/Ersetzen/Löschen berücksichtigen. Kommentare dürfen keine Exportpixel verändern und nicht versehentlich als Gestaltungsebene gerendert werden; PNG/PDF/PSD sowie MKW-Dateirundlauf tatsächlich prüfen. Zoom/Reihenwechsel/Tastatur und gelegentliches Tablet dürfen die Notiz nicht falsch zuordnen oder den Editor blockieren. Keine zweite Projektvariante oder kostenpflichtige Cloud-Kommentarfunktion.

Die Bildnotizen sind konkret beauftragt und als nächster begrenzter Editor-Meilenstein priorisiert. Sie wurden in diesem Lauf zugunsten der Schlussprüfung und des verbindlich begrenzten Guthabens nicht als halb gespeicherte UI-Skizze implementiert. Kein fertiges Kommentarsystem behaupten. Die übrigen Folgeaufträge inklusive Toolbar ohne Advanced Mode, Bereinigung, Farbwerkzeugen, Vorlagenfreigabe und IDML-Text bleiben erhalten.

Die Budgetbasis wurde am Ende des Laufs durch den Nutzer präzisiert. Das begrenzte Wochenkontingent und die Abschlussreserve bleiben verbindlich; bei späteren Läufen beide Werte neu prüfen und die heutigen Zahlen nicht übernehmen.


## Niedrige Priorität: Startseite und Bildvorschau

Nutzerauftrag vom 12. November: Das auf der Startseite auswählbare Bild besser darstellen und die UI dieses Bereichs dafür etwas umgestalten. Als spätere, bewusst niedrig priorisierte Aufgabe aufnehmen; nicht vor Bildnotizen, den bereits priorisierten Editoraufgaben oder notwendigen Fehlerkorrekturen beginnen.

Beim Startseiten-Review den tatsächlichen Bildauswahl-/Vorschaubereich gezielt prüfen und anschliessend Anordnung, Grösse, Hierarchie und Zusammenspiel von Auswahl und Vorschau verbessern. Das ausgewählte Bild soll deutlicher erkennbar sein; Seitenverhältnis/Ausschnitt verständlich vermitteln und den Einstieg weiterhin einfach und platzsparend halten. Computer priorisieren, Material-3-Farbrollen/Typografie/Formen/Zustände und die sechs Personas verwenden. Vorhandene Start-/Öffnen-/Auswahlabläufe und Bilddaten nicht ungefragt verändern. Entwurf und tatsächliche Desktop-/Browserprüfung vor einer Veröffentlichung. Noch keine neue Startseiten-UI umgesetzt oder abgenommen.


## Geplant: SVG als reguläre Bilder unterstützen

Nutzerauftrag vom 12. November: SVG-Dateien als Bilder importieren, platzieren und ersetzen können. Vorhandene Bild-/Asset-/Renderer-Zuständigkeiten nutzen und die tatsächlichen Importwege zuerst abgleichen. SVG nicht als ungeprüftes HTML in die Oberfläche einsetzen. Intrinsische Masse/ViewBox, Seitenverhältnis, Transparenz, Skalierung sowie defekte oder extern abhängige Dateien verständlich behandeln. Bestehende Bild-/Dateigrössenlimits nicht pauschal erhöhen und keine bezahlte externe Konvertierung voraussetzen.

Benötigte SVG-Inhalte im gemeinsamen MKW-Assetgraph erhalten, normale Bildausschnitte/Transformationen/Effekte und den vollständigen MKW-/ZIP-Rundlauf prüfen. Reale PNG/PDF/PSD-Ausgaben kontrollieren; native Vektor-Bearbeitbarkeit oder verlustfreien SVG-Einzelexport nur behaupten, wenn tatsächlich implementiert und abgenommen. Logos und alte Projekte unverändert nutzbar halten. Neue Auswahl-/Fehler-/Fortschrittszustände in der gemeinsamen Material-3-Designsprache und aus sechs Persona-Perspektiven prüfen. Dies ist ein geplanter Auftrag; heute keine neu implementierte allgemeine SVG-Bildunterstützung behaupten.


## Abgenommener Code-Endstand dieses Laufs

**f5120b374c4e40ea751d53ac766698f3579f2b42** veröffentlicht und vollständig geprüft: [GitHub 43190905005](https://github.com/noe-plain/noe-plain.github.io/actions/runs/43190905005), Chrome und Firefox erfolgreich, 183 Modell-/Pakettests. Echte Live-Prüfungen und bytegleiche Auslieferung bestätigt; siehe [Nachweis](REVIEW-VERIFICATION-2026-11-12.json) und [Persona-Bericht](PERSONA-REVIEW-2026-11-12.md). Danach nur Folgeplanung/Dokumentation ergänzt. Beim nächsten Review von diesem tatsächlichen Stand ausgehen. Bildkommentare, Toolbar ohne Advanced Mode, Bereinigung, SVG, Farbwerkzeuge, Vorlagenfreigabe und Startseitenvorschau bleiben wie jeweils angegeben geplant; IDML-Text bleibt nächster begrenzter InDesign-Inhaltsmeilenstein, PSD bleibt verfügbar.


## Fortsetzung · 12. November: Speichervertrag für Bildnotizen geprüft

Erster begrenzter Grundlagen-Schritt, noch keine sichtbare Kommentarfunktion: `tests/review-comment-storage.test.js` verwendet den bestehenden echten MKW-Schreiber/-Leser und das vorhandene reine Reihenmodell. Drei neue Prüfungen bestehen; insgesamt 186 Modell-/Pakettests.

Technisch geprüfter Vorschlag: optionale reine Textmetadaten `reviewComment` am FD-Quellbild (für dessen verknüpfte Formate) beziehungsweise an der kanonischen Designer-Slide mit stabiler ID. Unicode/Zeilenumbrüche und HTML-artiger Text bleiben unverändert als Daten erhalten. Verschieben behält die Notiz an derselben Slide-ID, Duplizieren kopiert sie, Entfernen entfernt sie mit der Slide. Der vollständige MKW-Schreiber erhält auch die Notiz einer nicht zur Ausgabe gewählten Reihe; dabei entstehen keine Gestaltungsebenen. Quellen werden durch die reinen Operationen nicht verändert. Kein neuer Dateischreiber und keine zweite Projektstruktur erforderlich.

Grenzen: synthetische Datenrezepte, keine neue Eingabe-/Validierungsoberfläche, keine Legacy-Slide-Migration, keine Arbeitsflächenanzeige und keine neue Exportpixel-Abnahme. Die Testdaten sind keine als reale Bilddateien freigegebenen Beispiele. Ein bestandener Speichervertrag ist kein fertig implementiertes Kommentarsystem.

Nächster Schritt: Zuordnung im tatsächlichen Vorschauablauf einschliesslich bisheriger Designer-Dateien abschliessen; begrenzte validierte Texteingabe mit einem Undo-Schritt und sicherem Abbrechen, diskrete Material-3-Notiz auf der Fläche, echter Browser-/MKW-/ZIP-Rundlauf und unveränderte PNG/PDF/PSD-Pixel. Den Speicher-Grundlagenschritt nicht erneut als neue Gesamtfunktion beginnen.

| Persona | Ergebnis dieses Teilschritts | Offen |
| --- | --- | --- |
| Neue Nutzerin | Notizdaten gehen beim Dateiwechsel nicht verloren. | Verständliche Eingabe und Anzeige. |
| Erfahrener Designer | Stabile Slide-Zuordnung bei Bewegung/Kopie nachgewiesen. | Bedienung, Undo/Redo und alte Dateien. |
| Senior UX-Experte | Vorschauindex wird nicht als dauerhafte Slide-Identität verwendet. | Durchgängiger Vorschau-/Flächenablauf. |
| UI-Expertin | Keine ungeprüfte zusätzliche Bedienfläche ausgeliefert. | Material-3-Entwurf und visuelle Abnahme. |
| QA-Entwicklerin | Drei echte Modell-/Dateischreiber-Verträge, 186 Tests bestanden. | Vollständige Browser-/Datei-/Pixelabnahme. |
| Fehlersucher | Sonderzeichen bleiben reine Metadaten, Quellzustand unverändert. | Längenbegrenzung, Escaping der Anzeige und Abbruchfälle. |


## Aktuelle Fortsetzung: Kampagnen-Vorschau und einheitliche Werkzeuge

Der inzwischen zusätzlich beauftragte FD-Kampagnen-Vorschauablauf wurde vor den übrigen geplanten Erweiterungen umgesetzt. Der alte FD-Modus bleibt als Backup; eine bewusste Konvertierung erstellt eine separate Vorschau-Kopie. Der Advanced-Schalter entfällt, alle Designer-Werkzeuge sind grundsätzlich verfügbar. Fläche/Kontur behalten die kompakten überlappenden Farbfelder; Tausch/Ein-Aus rechts daneben. Exportvorschau ohne „Auswahl anpassen“, mit festen Vor-/Zurückpositionen. Verknüpfung nur gleicher Formate, Abweichungen je Eigenschaft, Familienfarben und frei positionierbarer Copyright-Text sind dokumentiert und geprüft.

Aktueller Umsetzungs-/Persona- und Prüfnachweis: [FD-Kampagnen-Vorschau](FD-CAMPAIGN-PREVIEW-2026-11-12.md). Dieser Abschnitt ersetzt die älteren „Toolbar ohne Advanced Mode noch offen“-Einträge; diese Arbeit nicht erneut beginnen. Bildnotizen bleiben nach dem geprüften Speichervertrag noch als sichtbarer Ablauf offen. IDML-Textrahmen, SVG, weitere Farbwerkzeuge und die übrigen ausdrücklich vorgemerkten Schritte sind nicht automatisch mitimplementiert. PDF-Editor bleibt pausiert.


## Geplant · 13. November: FD-Backup-Modus entfernen und gemeinsam genutzten Code bereinigen

Nutzerauftrag: Den **FD-Backup-Modus aus dem Tool entfernen** und die verbleibende Codebasis aufräumen. Dies konkretisiert den allgemeinen Bereinigungsauftrag. Die benötigten Fähigkeiten der anderen Modi bestimmen; anschliessend tatsächlich ungenutzte Elemente löschen. Noch keine Entfernung umgesetzt.

1. **Modi und Fähigkeiten erfassen:** Den konkreten FD-Backup-Modus mit Einstieg, Navigation, Einstellungen, Werkzeugen, Dateipfaden und Abhängigkeiten identifizieren. Für jeden verbleibenden Modus eine Funktions-/Abhängigkeitsmatrix erstellen: nötig, gemeinsam genutzt, ausschliesslich FD-Backup oder tatsächlich ungenutzt. Auch dynamische Referenzen, Vorlagen und alte Projektdateien berücksichtigen.
2. **Gemeinsame Funktionen erhalten:** Die benötigten Teile für Öffnen/Speichern/MKW, Autosave/Wiederherstellung, Bilder/Schriften/Assets, Text-/Absatz-/Zeilenbearbeitung, Reihen/Slides, Vorlagen und Exporte im jeweils zuständigen gemeinsamen Modul behalten beziehungsweise sauber dorthin lösen. Die tatsächliche Nutzung pro Modus entscheidet; keine zweite Implementierung und keine pauschale Löschung aufgrund eines Dateinamens.
3. **Abgekündigten Modus entfernen:** Zugehörige Einstiege, UI-Elemente, Optionen und Shortcuts entfernen. Exklusive Implementierungen, Styles, Assets, Dokumentation und überholte Tests löschen, sobald sie für die verbleibenden Modi und nötige Dateikompatibilität unbenutzt sind. Manifest, Bundles und Hilfetexte entsprechend aktualisieren. Für alte Dateien bei Bedarf einen ausdrücklichen verlustfreien Import-/Migrationsweg erhalten; Nutzerdateien bewahren.
4. **Grösse und Wartbarkeit nachweisen:** Kleine nachvollziehbare Schritte; Datei-/Speicher-/Auslieferungsgrössen vorher/nachher vergleichen. Geteilte Regeln zentral halten, tote Zweige und doppelte Komponenten entfernen. Die benötigten Backup-/Wiederherstellungsfunktionen der verbleibenden Modi weiter unterstützen. PSD und MKW bleiben gemäss bestehendem Exportplan verfügbar.
5. **Abnahme:** Verbleibende Modi vom Einstieg über Bearbeitung bis Speichern/Öffnen und tatsächlichen Export prüfen; relevante alte Dateien/Vorlagen, Undo/Redo, Assetrundlauf und vorhandene Browser-/Modelltests wiederverwenden. Keine toten Verweise auf den entfernten Modus. Geänderte Bedienflächen nach Material Design 3 und aus allen sechs Persona-Perspektiven prüfen; erst den getesteten Stand veröffentlichen.

Planstatus: beauftragt, noch nicht umgesetzt. Den gezielten Ausbau der Bildnotizen und die übrigen bestätigten Folgeaufträge weiterführen; Umsetzung dieses Bereinigungsblocks im passenden begrenzten Guthabenfenster planen.
