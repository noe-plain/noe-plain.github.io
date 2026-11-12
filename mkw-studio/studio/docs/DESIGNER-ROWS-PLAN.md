# Designer-Reihen: Ziel und verbleibender Auftrag

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
- Guthaben heute zu Beginn: 99 % im Fünf-Stunden-Fenster und 81 % in der Woche frei. Kontostand mehrfach geprüft; keine zusätzlichen Credits, Agenten oder zweites Fenster verwendet. Nach Implementierung keine unabhängigen Bonusfunktionen begonnen.

### Präzisierung am Ende des Laufs: kompakte Reihenauswahl

Nutzerwunsch vom 12. November umgesetzt: Klick auf **„Ebenen – N“** in der Ebenenüberschrift öffnet die Reihenwahl; N ist die aktuelle Reihennummer. Vollständige Namen stehen im Menü/Tooltip. Die separate Reihenauswahl darunter ist entfernt. Tastatur, Escape, Fokus, unveränderte Dokumentrevision/Undo, gefilterte Ebenen und iPad-Mini-Ansicht geprüft. Exportvorschau zusätzlich auf leere Auswahl/Wiederwahl und eindeutige Reihen-/Slide-Beschriftung korrigiert.

### Schlussprüfung: echte Gesten weiterhin nachweisen

Erster vollständiger CI-Lauf `43182083492`: Chrome erfolgreich, Firefox mit einem Fehler am alten Drehgriff-Test. Dessen echte Pointer-Geste erhielt in `55cb80b` explizite Startbedingungen (Projekt/Fonts bereit, Griff stabil/erreichbar, Hit-Test auf tatsächlichen Griff); die Assertion auf geänderten Winkel bleibt unverändert. Lokal kompletter Firefox-Fall mit 50-Bilder-Rundlauf sowie gezielter Chrome-Fall bestanden. Endlauf an aktuellem Quellcommit prüfen; kein Erfolg allein aus lokalem Bestehen oder dem alten Chrome-Teil ableiten.

### Nächste begrenzte Aufgaben

1. Neue Reihenabläufe anhand tatsächlicher Rückmeldungen nachprüfen, bei Bedarf gezielt korrigieren; nicht die abgeschlossene Grundarbeit wiederholen.
2. Nächster normaler IDML-Schritt: genau ein einfacher bearbeitbarer Textrahmen mit echtem InDesign-Test. Bestehende leere Datei nicht erneut beginnen, PSD behalten.
3. Zeichen-/Farbwerkzeuge getrennt umsetzen: echte Formvorschau, Winkel-Farbfüllung, Pipette, anschliessend fünfteilige Farbhilfe. Keine Umsetzung allein aus der Planung ableiten.
4. Studio-Bereinigung mit Abhängigkeits-/Grösseninventar und Regression planen, siehe unten. Alles für Bearbeitung und bestehende Dateien Nötige erhalten.
5. Vorlagenentwürfe nach Gestaltungsgrundsätzen visuell vorlegen; nur ausdrücklich freigegebene Entwürfe mitliefern.

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

Nur das Studio bearbeiten, keine projektfremden Ordner oder Nutzerdateien entfernen. Git als nachvollziehbare Rückfallebene nutzen. Keine Bearbeitungsfunktion opfern und PSD nicht vor der tatsächlichen InDesign-Abnahme entfernen. Erst nach gezielter Regression und Prüfung des ausgelieferten Builds veröffentlichen; vorher/nachher Dateianzahl, Speicher-/Auslieferungsgrösse und echte Grenzen berichten. Dies ist eine geplante Folgeaufgabe, keine bereits durchgeführte Bereinigung und kein zusätzlicher Bonus zum heutigen Reihenumbau.


## Neuer Folgeauftrag: eine Werkzeugleiste ohne Advanced Mode

Nutzerpräzisierung vom 12. November: Die Werkzeugleiste vereinheitlichen und den Advanced-Mode-Schalter als Voraussetzung für Funktionen abschaffen. Alle Funktionen sollen ab Beginn erreichbar sein. Die Oberfläche auf Computer als Hauptgerät ausrichten; Tablets werden nur gelegentlich genutzt und bleiben sekundär unterstützt. Platz sparen und gleichzeitig Anfängern verständliche Wege anbieten.

Vor der Umsetzung die tatsächlich modeabhängigen Werkzeuge, Eigenschaften, Menüs, Shortcuts, Einstellungen und Setup-Voreinstellungen erfassen. Nicht nur den Schalter verstecken oder pauschal mehr Knöpfe nebeneinander stellen. Gemeinsam mit den sechs Personas die Aufgabenfolge, Gruppierung, Platzierung/Form der Werkzeugleiste, Auswahlzustände, Beschriftung/Hilfe und das Nutzungsverhalten entwerfen. Alle Funktionen ohne Moduswechsel zugänglich machen; aufgabenbezogene Gruppen und nachvollziehbare Kontextmenüs sind mit einer platzsparenden Oberfläche vereinbar. Ein Kontext darf fachlich unpassende Aktionen mit verständlichem Grund deaktivieren, aber keine Funktionsklasse hinter einer globalen Expertenfreigabe verstecken.

Bestehende Zeichen-/Text-/Bild-/Reihenfunktionen, Shortcuts sowie Auswahl-/Abbruch-/Undo-Abläufe erhalten. Alte Advanced-Mode-/MKW-Setup-Präferenzen verträglich einlesen, ohne Dokumentinhalte oder gespeicherte Gestaltung ungefragt zu ändern; ihre fachlich noch nötigen Daten nicht blind löschen. Erst Benutzerwege/Entwurf, dann zentral vorhandene Toolbar-/Inspector-Zuständigkeiten anpassen; keine zweite parallele Werkzeugleiste. Desktop bei üblichen und kleineren Fenstergrössen sowie Maus/Tastatur priorisieren; gelegentliche Nutzung ab iPad Mini und Touch nicht beschädigen. Sechs-Persona-Matrix, relevante Browser-/Datei-/Exportregressionen und Platzbedarf/Erreichbarkeit prüfen.

Dies ist ausdrücklich ein geplanter Folgeauftrag. Der heutige Editor besitzt den Advanced Mode noch; noch keine Entfernung oder fertige neue Werkzeugleiste behaupten. Den Auftrag im nächsten passenden begrenzten Review nach tatsächlichem Guthaben umsetzen, nicht zusätzlich auf Kosten der laufenden Schlussprüfung.
