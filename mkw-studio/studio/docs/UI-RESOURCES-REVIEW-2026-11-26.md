# Gemeinsame UI-Ressourcen · L01-Bestandsabnahme

## Entscheidung

Der aktuelle statische Ladeweg stellt Code und Styles der gemeinsamen Werkzeugleiste, Ebenen, Arbeitsfläche, Header, Seitenleiste, Farbwahl und Typografie bereits vor Freigabe der Startaktionen bereit. Ein weiteres Vorladen derselben Ressourcen würde sie nicht früher verfügbar machen. Deshalb wurde keine zusätzliche Initialisierung, kein versteckter Editor und keine vorgehaltene grosse Zeichenfläche ergänzt. Das Produkt wird dadurch weder umgebaut noch um eine zusätzliche Hintergrundaufgabe erweitert. Die Backup-Entfernung bleibt die separate offene Aufgabe B02.

## Tatsächlicher Aufbau

`index.html` lädt das gemeinsame `editor.bundle.css`, `editor.bundle.js` sowie die bereits vorhandenen Vendor-Dateien `ag-psd.js` und `paper-core.min.js`. Das Manifest bündelt die gemeinsamen Module einmal. Das Startskript schaltet die Einstiege erst nach Browser-/Setup-/Font-Vorbereitung frei. Werkzeug- und Ebenen-DOM benötigen das aktive Dokument und entstehen beim Einstieg; sie müssen nicht als zweiter unsichtbarer Editor vorgehalten werden. Die vorhandene Designer-Montage wird auch für FD-Kampagnen verwendet. Das Wiki bleibt ein Bedarfsdialog, und Projektbilder sind keine vorzuladenden UI-Ressourcen.

Diese Untersuchung ist keine Empfehlung, künftig alle optionalen Bibliotheken unbedingt im Startbundle zu halten. Grössen-/Codebereinigung nach B02 bleibt eine eigene, messungsabhängige Aufgabe. Ein neues Framework oder ein zusätzlicher Loader ist für L01 nicht begründet.

## Messung und reproduzierbarer Nachweis

[Messdaten](UI-RESOURCES-VERIFICATION-2026-11-26.json) · [Probe](../tests/ui-resource-probe.cjs)

```sh
node tests/run-browser.mjs ui-resource-probe
```

Der optionale Messlauf gehört nicht zur dauernd wiederholten Gesamtsuite. `MKW_TEST_OUTPUT` bestimmt den Ergebnisordner; `MKW_RESOURCE_PROBE_OUTPUT` kann eine genaue JSON-Zieldatei setzen. Der vorhandene Runner liefert die statische App aus. Für einen tatsächlich verfügbaren anderen Browser kann dessen bestehender `MKW_TEST_BROWSER`-Parameter verwendet werden.

Umgebung: lokales macOS, installiertes Chrome 158.0.8127.37, 1500 × 1100 CSS-Pixel. Je drei frische Browserkontexte pro Einstiegsmodus; derselbe Browserprozess und lokale Dateien, keine sechs unabhängigen Geräte-/Netz-Kaltstarts. Bei FD wird ein synthetisches 64 × 64-Pixel-Bild über den echten Dateiimport eingesetzt. Ein gesetztes Save-Data-Signal überspringt die Personenerkennung, damit deren Modelldownload nicht als UI-Ladezeit gezählt wird. Keine Grossfoto-/Mobilnetz- oder Wahrnehmungsstudie.

| Ablauf | Designer zuerst, Median (Bereich) | FD zuerst, Median (Bereich) |
| --- | --- | --- |
| Navigation bis freigegebener Startaktion | 222 ms (219–322) | 213 ms (157–214) |
| Öffnen/Benennen/Erstellen bis Projekt bereit | 159 ms (158–277) | 114 ms (111–124) |
| Erster sichtbarer Arbeitsbereich inkl. synthetischem FD-Import | 191 ms (191–306) | 192 ms (191–208) |
| Wechsel über echten Neu-Projekt-Ablauf in den anderen Modus, inkl. dessen FD-Import | 213 ms (213–214) | 179 ms (179–180) |

Die Zeiten beinhalten die automatisierten realen UI-Aktionen und zwei Animationsframes; sie sind kein isoliertes Renderer-Benchmark und keine zugesagte Obergrenze. Es gibt keine Vorher-/Nachher-Optimierung, daher keinen behaupteten Beschleunigungsfaktor.

Alle sechs Fälle zeigen:

- Gemeinsame Funktionen/Module sind bereits am Start verfügbar und behalten beim Moduswechsel ihre Identität.
- Erster Einstieg und Wechsel fordern **0 zusätzliche Script-/Stylesheet-Ressourcen** an. Diese Aussage bezieht sich auf UI-Code/Styles, nicht auf Fotos, Logos oder alle Netzwerkarten.
- Vor dem Einstieg ist kein Designer montiert; danach genau ein Editor, eine Montagefläche und eine Designer-Seitenleiste. Keine zwei gleichzeitig montierten Editoren.
- Kein Wiki-Iframe vor oder nach diesen Abläufen.
- Die Leerlaufphase nach Freigabe des Starts verändert den dokumentierten Projektstand nicht.

## Produktperspektiven

| Persona | Bewertung | Status |
| --- | --- | --- |
| Neue Nutzerin | Verfügbare Startaktionen führen direkt in die vorbereitete gemeinsame Oberfläche; kein weiterer Lade-/Wartebildschirm. | Reale Einstiege in beide Modi geprüft. |
| Erfahrener Nutzer | Beim Wechsel kein wiederholter Code-/Style-Download und keine zweite Werkzeugimplementierung. | Sechs Wechsel mit identischen gemeinsamen Referenzen geprüft. |
| UX/UI | Vorhandene Oberfläche und Gestaltungen bleiben erhalten; kein unnötiger Zwischenzustand oder neuer Schalter. | Keine UI-/Artworkänderung. |
| Barrierefreiheit | Keine neu montierten unsichtbaren Bedienelemente oder zusätzlichen Fokusziele durch eine Vorwärmschicht. | DOM-Bestand geprüft; keine neue manuelle Screenreader-Abnahme. |
| Entwicklerin / QA | Ein gemeinsamer Ressourcenbesitzer, explizite Messung statt Doppelinitialisierung. | Reproduzierbare Probe, begrenzter Umfang und offene Plattformmessungen dokumentiert. |

Firefox-/Safari-Zeiten, andere Rechner, hohe Netzlatenz, physische Touchgeräte und grosse echte Kampagnen wurden in dieser Messung nicht geprüft. Die automatische Funktionsregression auf GitHub ist ein separater Nachweis und ersetzt diese Messungen nicht. Die einzige aktive Prioritätenliste bleibt der Masterplan; dieser Bericht ist ein Nachweis.
