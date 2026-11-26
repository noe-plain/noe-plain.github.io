# B02 · Ausgeblendete Texte und verlässliche Exportvorschauen

Stand 26. November 2026, Ausgang `55d9540`. Nachweis zum einzigen aktiven [Masterplan](MASTERPLAN.md), keine zusätzliche Aufgabenliste.

## Vorherige GitHub-Läufe

Beide zuvor offenen Veröffentlichungen sind vollständig erfolgreich: [45836766693](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45836766693) und [45837503600](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45837503600). Die abgerufenen Jobs bestätigen Chromium, Firefox, Windows ZIP und das gemeinsame Studio-Gate. Für diese Stände war keine Fehlerkorrektur erforderlich.

## Gewählter nächster Planschritt

Alte Kampagnen behalten ausgeblendete Inhalte in ihren Board-Metadaten. Diese Texte waren in der neuen Kopie bislang nicht vollständig mit den üblichen Ebenenwerkzeugen zugänglich. Der nächste begrenzte B02-Schritt macht sie bewusst einzeln zugänglich; die vollständige Entfernung des Backup-Modus wird nicht vorweggenommen.

Im Ebenenbereich erscheint bei betroffenen Ausgaben ein zunächst geschlossener Bereich **Ausgeblendete Texte**. Er steht vor der Ebenenliste, damit er auch bei vielen Ebenen erreichbar bleibt. Format-/Bildname und eine Vorschau des gespeicherten Texts kennzeichnen die aktuelle Ausgabe. **Als Textebene hinzufügen** erstellt eine eigene, auswählbare Ebene. Danach gelten die normalen Text-, Positions-, Dreh-, Sichtbarkeits- und Speicherwerkzeuge. Die vorhandenen Ebenen und andere Ausgaben bleiben unverändert. Die neue Ebene ist ausdrücklich lokal und wird nicht automatisch auf gleichformatige Sujets übertragen. Einfügen lässt sich rückgängig machen; ein vorhandener übernommener Text wird nicht nochmals angeboten.

Die Anzeige erzeugt nur wenige Text-/Buttonelemente für die aktive Ausgabe. Es entstehen keine vorsorglichen Textebenen für alle Fotos, keine zusätzlichen Bilder und kein zusätzlicher Scrollbereich. Bei 500 Ebenen bleibt der gespeicherte Text erhalten; die Oberfläche erklärt die notwendige Freigabe einer Ebene. Eine nicht darstellbare alte Formatierung wird vor jeder Dokumentmutation abgewiesen.

## Fünf Personas vor und nach der Umsetzung

Fachliche Prüfung mit reproduzierbaren Interaktionen und angesehenen Ansichten, keine Studie mit fünf realen Personen.

| Persona | Problem / abgeleitete Entscheidung | Prüfkriterium | Ergebnis |
| --- | --- | --- | --- |
| Neue Nutzerin ohne Gestaltungswissen | Verborgene Inhalte müssen auffindbar sein; eine Übernahme darf bestehende Titel nicht umsortieren. | Benannte aktuelle Ausgabe, lesbarer Textausschnitt und sichtbare Aktion. Vorhandene Ebenen und Arbeitsflächenansicht bleiben unverändert. | Im geprüften Ablauf bestanden |
| Erfahrener Nutzer mit Zeitdruck | Viele Ausgaben dürfen nicht mit ungenutzten Ebenen aufgefüllt werden. Ergänzungen sollen individuell bleiben. | Genau eine Ebene pro Aktion, keine gleichformatige Replikation, erneutes Angebot unterdrückt, Undo/Redo und weiteres direktes Schreiben. | Bestanden |
| Senior UX/UI-Designerin | Die Funktion gehört zur Ebenenverwaltung und soll beim normalen Neuprojekt nicht ablenken. | Geschlossene gemeinsame Offenlegung vor der Liste; 300-px-Seitenleiste, keine X-Überläufe, vorhandene Farb-/Formrollen in Hell/Dunkel. | Ansichten kontrolliert; Platzierung nach Review verbessert |
| Barrierefreiheitsexperte | Versteckte Inhalte dürfen nicht nur über Spezialklicks erreichbar sein. | Native Details-/Buttonsemantik, sichtbare Namen, Enter-Bedienung, Fokus auf der hinzugefügten Ebene, 44-px-Aktionen und automatische axe-Prüfung. | Automatisch/interaktiv bestanden; manuelle assistive Technik offen |
| Entwicklerin & QA-Testerin | Quelldaten, aktive Ausgabe, Limit und Dateirundlauf müssen zuverlässig bleiben. | Getrennte Herkunftsmarkierung, vorbereiteter/validierter Kandidat, stale Seiten-/Projektaktionen ohne Wirkung, Original erhalten, MKW und reale Exportdateien. | Regression unten; verbleibende Grenzen ausdrücklich dokumentiert |

## Komponentenwahl und Quellen

Eigene UX-Entscheidung: eine seltene Ergänzungsaktion in einer nativen Inline-Offenlegung mit normaler Liste, statt eines zusätzlichen Dialogablaufs oder einer neuen Palette. Die bestehenden semantischen M3-Farben und gemeinsamen Buttonzustände werden verwendet. Die [offizielle Material-Web-Button-Dokumentation](https://github.com/material-components/material-web/blob/main/docs/components/button.md) begründet beschreibende Aktionslabels und zugängliche Namen; die vorhandenen HTML-Buttons werden dafür weiterverwendet. Referenzen: [M3 Buttons](https://m3.material.io/components/buttons/guidelines), [M3 Lists](https://m3.material.io/components/lists/guidelines). Die beiden M3-Webseiten lieferten im Textabruf nur einen JavaScript-Hinweis; daraus werden keine zusätzlichen Detailvorgaben erfunden. Keine neue Komponentenbibliothek eingeführt.

## Daten- und Implementierungsgrenzen

- `campaign-migration` kennzeichnet den tatsächlich gespeicherten Kandidaten-Board mit dem optionalen, boolesch validierten `campaignLegacyTexts`. Bestehende Dateihüllen und Codecs bleiben erhalten. Eine alte Kopie mit expliziter Titel-/Verlaufsebene kann ohne Umschreiben erkannt werden.
- `recoverText` kopiert nur den ausgewählten Text, seine Formatierung und die nötige Rahmengeometrie in ein neues Objekt. Quellboard und Originalprojekt bleiben erhalten. Die vorhandenen Absatz-/Zeichenkonverter und die Copyright-Geometrie werden wiederverwendet; Familien-Palettenversatz und Konturreihenfolge bleiben wirksam.
- `campaign-legacy-text-ui` verwaltet den aktiven Ausgabe- und Dokumentbezug, Validierung vor dem Checkpoint, normale Änderungs-/Auswahlbefehle und den temporären Offenlegungszustand. Keine Datei- oder Speicherlogik in der UI.
- Direkte Ergänzung der nativen Ebene verändert keine vorhandenen Titelpositionen und führt keine zusätzliche automatische Stapelberechnung aus. Nach dem Einfügen lässt sich die Ebene normal neu platzieren.

## Gefundene und korrigierte Cache-Kollision

Die neue Dateiprüfung zeigte identische gespeicherte Objekte, Rahmen und Schriften, aber eine ältere PNG-Ausgabe nach dem Wiederöffnen. Die bisherige Cache-Kennung bestand aus Revision, Board, Exporteinstellungen und Silbentrennungsversion. Eine geladene Datei startet wieder mit Revision 1; Board-IDs und gespeicherte Altmetadaten können unverändert sein, während neue native Ebenen hinzugekommen sind. Dadurch konnte ein früheres Bild unter derselben Kennung wiederverwendet werden.

Beim Commit eines vorbereiteten Dokuments werden die codierten Exportergebnisse jetzt verworfen. Die Cache-Kennung enthält zusätzlich die Projekt-ID und eine fortlaufende Cache-Generation. Ein später fertiggestelltes Ergebnis aus einer älteren Generation erhält damit nicht die Kennung der aktuellen Vorschau. Vorhandene decodierte Originalfotos bleiben in ihrem eigenen Cache; kein vollständiges Hashing des Dokuments bei Auswahl oder Bewegung. Der vorher reproduzierte PNG-Unterschied verschwindet im Dateirundlauf vollständig.

## Tatsächliche Prüfung und noch offene Abnahme

`campaign-hidden-texts` verwendet synthetische alte Daten mit zwei gleichformatigen Sujets, drei ausgeblendeten Textarten, gemischten Schriften/Zeichen-/Absatzformaten, Familienfarben und einer sehr schmalen positiven Restfläche. Geprüft wurden:

- PNG vor/nach der eigentlichen Konvertierung unverändert; Original bleibt separates Browserprojekt.
- Übertitel, deaktivierter Untertitel und verborgenes Copyright gezielt als lokale Ebene; keine Veränderung anderer Ausgaben oder vorhandener Titel.
- Cursorbearbeitung, Formatierung, Familienversatz, Copyright-Drehung, Tastatur/Fokus, Undo/Redo, doppelte und stale Aktionen.
- MKW-ZIP speichern und wieder öffnen, Herkunftsmarker prüfen, malformed Marker abweisen, Original-Metadaten/Medienzahl behalten. PNG-Dateirundlauf pixelgleich; reale PDF- und PSD-Dateien erzeugt und mit vorhandenen Bibliotheken gelesen.
- Native Titel-/Untertitelebenen in PSD vorhanden. Am Artboard beschnittenes Copyright nutzt weiterhin den vorhandenen Rasterpfad. Kein vollständiger Photoshop-Editierbarkeitsnachweis.
- Ebenenlimit und nicht darstellbarer Kleinsttext führen zu keinem Teil-Commit; neue normale Kampagnen zeigen keinen unnötigen Alttextbereich.
- Helle Desktop- und schmale dunkle Ansicht angesehen; axe und horizontale Overflow-Grenze geprüft.

**Lokaler Abschluss:** 233 Modell-/Dateitests, Formatprüfung und reproduzierbarer Build bestanden. 15/15 gezielte Chromium-Suiten bestanden: `campaign-hidden-texts`, `backup-safe-copy`, `campaign-conversion-guard`, `campaign-family-migration`, `legacy-photo-transform`, `campaign-migration`, `campaign-preview`, `campaign-cards`, `text-frame-controls`, `project-storage`, `project-open`, `project-migration`, `export-panel`, `carousel-export-images`, `carousel-pdf`. Das umfasst auch 50-Foto-Kampagnen und tatsächliche 24–33-MP-Bildexporte aus den bestehenden Regressionen; kein neuer allgemeiner Leistungsbenchmark behauptet. Die neue Alttext-Prüfung ist in der vollständigen Chromium- und Firefox-Prüfliste enthalten. Auslieferungs-/GitHub-Nachweis folgt nach tatsächlichem Abschluss.

**B02 bleibt insgesamt offen.** Ältere bereits konvertierte Dateien ohne Herkunftsmarker und ohne erhaltene Titel-/Verlaufsebene lassen sich nicht sicher als solche erkennen; das unveränderte Original kann erneut umgewandelt werden. Weitere echte Familien-, Winkel- und Sponsorenprojekte sowie deren vollständige native Bedienung müssen vor dem Entfernen von FD-Backup abgenommen werden. Die neue Prüfung ist synthetisch und ersetzt diese Originale nicht. Keine lokale Firefox-, manuelle VoiceOver-/NVDA-, physische Touch- oder Photoshop-Handabnahme behauptet.
