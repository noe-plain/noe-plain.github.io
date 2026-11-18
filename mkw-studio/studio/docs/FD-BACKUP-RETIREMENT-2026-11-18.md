# FD-Backup-Ausstieg · Abhängigkeitsprüfung und erster Korrekturschritt

Stand 18. November 2026, Ausgang `0e80750`. **B02 begonnen, nicht abgeschlossen. Der Backup-Modus wurde noch nicht entfernt.** Beim Start dieses Folgeauftrags waren 31 % des laufenden Fünf-Stunden-Fensters frei, nach Bestandsaufnahme 29 %. Kein neues Fenster, Zusatzcredits, Reset, Modellwechsel oder weitere Agenten. Der Umfang wurde auf Abhängigkeitsabgleich, echte Konvertierungsdiagnose und eine kleine belegte Korrektur begrenzt; Prüfung und Abschluss bleiben reserviert.

## Funktions- und Abhängigkeitsmatrix

Die Einordnung beruht auf Quellen, Manifest und tatsächlichen Aufrufern. Sie ist keine Behauptung eines bereits vollständigen dynamischen Callgraphs.

| Bereich / Quellen | Einstufung | Vorgehen beim Entfernen |
| --- | --- | --- |
| `campaign-ui.js: install`, `start-home.js`, `project-setup.js` (`post`-Auswahl und alter Erzeugungszweig), `studio.js` Start-Aktion | Exklusive Backup-Erzeugungswege liegen in sonst gemeinsam genutzten Modulen | Nur diese Zweige entfernen; FD-Kampagnen/Designer, Einrichtung und Start nicht als ganze Dateien löschen. |
| `project-dialogs.js` Bibliotheksmodus und Konvertierungsbutton, `campaign-ui.js: convert`, `campaign-migration.js` | Übergang alter MKW-Dateien | Explizite neue Projektkopie, Abbrechen, Original-ID/Datei und Browserkopie erhalten; Konvertierung erst nach vollständiger Abnahme zum einzigen Weg machen. |
| `state.js`, `project-validation.js`, `project-assets.js`, `project-file.js`, `project-blocks.js`, `project-store.js`, `project-session.js`, `file-io.js` | Gemeinsam: Import, sichere Dateien, Identität, Assetgraph, Verlauf und Sicherung | Behalten. `fresh()`/`basicBoard()` werden weiterhin durch neue FD-Kampagnen verwendet; nicht allein wegen alter Namen entfernen. |
| `renderer.js`, Textlayout-/Familienmodule, `post-angle-model.js`, `post-angle.js`, Sponsor-/Schrift-/PSD-Dienste | Gemeinsam oder noch zwingende Altdatei-Kompatibilität | Neues FD nutzt unter anderem `basicBoard`, `textBlock`, `paintSponsors`; Migration braucht bisherige Textmetriken. Winkelgeometrie, Quellen und Exporte bleiben nötig. Erst nach Nachweis einzelne exklusive Bedienzweige trennen. |
| `post-inspector.js`, alte feste Textauswahl, Bild-/Text-Verknüpfungsbedienung, alte Arbeitsflächen-Controls | Kandidaten für spätere Entfernung, derzeit Altdatei-Bearbeitung | Noch nicht löschen: Der neue Konvertierungsweg ist bei individuellen Winkelbildern nicht layouttreu. |
| `campaign-document.js`, `campaign-model.js`, `campaign-card-ui.js`, `carousel-*`, aktuelle Werkzeuge, Vorlagen | Aktuelle FD-Kampagnen und Designer | Behalten; bestehendes Objekt-/Gruppenmodell weiterverwenden. |
| `hilfe/index.html`, Start-/Setup-Styles, Manifest und Browserfälle | Begleitende UI/Dokumentation/Abnahme | Nach dem echten Ausstieg aktualisieren. 85 bestehende Browserdateien verwenden `#startNew`; echte Altdatei-Fixtures von normalen Neueinstiegen trennen, keine Assertions deaktivieren und keinen versteckten Test-Backup-Modus bauen. |

## Tatsächlicher Befund und Korrektur

Ein eigenes, neues 600×750-Testprojekt mit vierfarbigem 128×128-Prüfbild, interner Notiz, ausgeblendetem Logo und einem um 17° gedrehten, individuell zugeschnittenen Winkel wurde über den vorhandenen Kopie-Konvertierungsweg umgewandelt. Keine Nutzerdatei angefasst.

1. **Gelöst: ausgeblendetes Logo erschien wieder.** `campaign-document.append()` erzeugt für neue Kampagnen absichtlich ein sichtbares Logo. Die Altdatei-Migration übernimmt nun in `campaign-migration.add()` ausdrücklich die gespeicherte Sichtbarkeit. Neue Kampagnen behalten ihr normales sichtbares Logo. Kein zweites Render- oder Speichermodell.
2. **Offen, Pflicht vor Entfernung: individueller Winkel-Bildausschnitt/Drehung.** Der bisherige Konverter setzt `scale: 1.12`, `panX: 24`, `panY: -24` und erhält die unabhängige Bilddrehung nicht. Im eigenen Test werden 17° zu 0°; maximale Kanaldifferenz 255/255, mittlere 12,1596/255. Dies ist ein Diagnosebefund, kein bestandener Winkel-Fidelitätstest. Original und Notiz bleiben erhalten. Der alte Editor darf deshalb noch nicht ersatzlos entfallen.
3. **Offen: ältere grössere Formate.** Der bisherige Setup-Pfad erlaubt bis 10000 px, die neue FD-Kampagne 240–4000 px. Aktuell wird die Konvertierung grösserer Formate abgewiesen. Vor Entfernung einen bewussten sicheren Altdatei-Weg festlegen; nicht still umformatieren oder Speichergrenzen ungeprüft anheben.

## Nächste begrenzte Schritte für B02

1. Unabhängige Bildtransformation des Alt-Winkels über denselben Geometrie-/Masken-/Paintpfad erhalten; Winkelrichtungen, Schenkelbreite/Schein, Farbfüllung, Spiegelung, Sponsorenbereich und echte PNG/PDF/PSD-/MKW-Ausgaben vergleichen. Fehlende direkte Darstellbarkeit ausdrücklich abfangen, Original erhalten.
2. Repräsentative Altdateien (auch grosse Formate, feste Textarten/Zeilenabweichungen, Familienlayout, versteckte Elemente, Logos/Sponsoren, Bildkorrekturen) samt Abbruch und sicherer Kopie abnehmen. Die bisher geprüfte einzelne Text-/Verlaufsfixture ist keine Abnahme aller Altdateien.
3. Erst danach Backup-Neuerzeugung, exklusiven Inspector und Arbeitsflächenzweige entfernen. Aktuelle Modi bleiben direkt erreichbar; alte Dateien erhalten einen ausdrücklichen Import-/Kopieweg. Legacy-Tests echte Dateien öffnen lassen und ihre inhaltlichen Assertions erhalten.
4. Ausschliesslich nachweislich ungenutzte Quellen/Styles/Assets entfernen, Manifest bereinigen und Grössen erneut erfassen. PSD, MKW, Schriften und benötigte Bearbeitungsgrundlagen behalten.

## Sechs-Persona-Prüfung

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Drei statt zwei Moduswege bleiben zunächst sichtbar; verstecktes Logo darf nach Konvertieren nicht auftauchen | Logo gelöst; Modusbereinigung offen |
| Erfahrener Designer | Individueller Winkelausschnitt und Bilddrehung müssen erhalten bleiben | Offen, reproduziert und vor Entfernung zu lösen |
| Senior UX-Experte | Konvertierung erstellt eigene Kopie, Abbrechen/Original erhalten; kein erzwungener Umstieg mit unbemerktem Layoutverlust | Kopiesicherheit geprüft; kompletter Übergang offen |
| UI-Expertin | Alte Start-/Setup-/Hilfepfade kohärent entfernen und aktuelle M3-Oberfläche bewahren | Abhängigkeiten zugeordnet; UI-Umbau noch offen |
| QA-Entwicklerin | Gemeinsame Modelle/Fonts/Speicher-/Exportsysteme behalten, direkte Fixture statt verstecktem Testmodus | Matrix und Logo-Regression fertig; Gesamtentfernung offen |
| Destruktiver Fehlersucher | Versteckte Elemente, unübliche Winkel, grosse Formate und Abbruch testen | Logo gelöst, Winkel-/Formatgrenzen ausdrücklich offen |

Experten- und Browserprüfung, keine Nutzerstudie. Anfangsbestand: **492 versionierte Studio-Dateien, 50.366.658 Bytes**, ohne `.git`/`node_modules`; 85 Browserdateien mit altem Einstieg. **Keine Datei entfernt, keine Grössenreduktion behauptet.** Bericht, Regression und kleine Korrektur fügen zunächst Daten hinzu. Die spätere Bereinigung erhält ihren eigenen Vorher-/Nachher-Nachweis.

Lokal: 214 Modell-/Pakettests und `backup-migration`, `campaign-migration`, `campaign-preview`, `review-comments-fd` bestanden. Bestehende 50-Bild-/100-Ausgaben-Fixture inklusive MKW erneut geprüft; im lokalen Lauf etwa 371 ms für Modell-/Dateirundlauf und 331 ms für den Scrollprüfblock, keine neuen Repaints (0), Karten/Ansicht unverändert. Es handelt sich um synthetische kleine Bilder, nicht um einen 50-Grossfoto-Benchmark. **Endnachweis:** `8cbe941`, [vollständiger GitHub-Lauf 44302332505](https://github.com/noe-plain/noe-plain.github.io/actions/runs/44302332505) erfolgreich: **214 Modelltests, 115 Chrome- und 100 Firefox-Suiten**, beide Browser und Studio-Gate erfolgreich. Live-Prüfungen `backup-migration` und `campaign-preview` bestanden, HTML/JS/CSS bytegleich zum geprüften Stand. Anschliessend nur Prüfdokumentation ergänzt, kein Laufzeitcode geändert. Der grüne Lauf bestätigt den Logo-/Kompatibilitätsteilschritt, ausdrücklich nicht die vollständige Backup-Entfernung oder Winkel-Fidelität. Maschinelle Diagnose in [FD-BACKUP-VERIFICATION-2026-11-18.json](FD-BACKUP-VERIFICATION-2026-11-18.json).

## Nachtrag · Qualitäts-Folgeauftrag auf b0200e5

Der oben dokumentierte historische Winkelverlust ist inzwischen im geprüften Umfang behoben: `photo-transform-model.js` erhält die unabhängige Bilddrehung/Ausschnitte für Hintergrund und Winkel. Vier Richtungen, Spiegelungen und Sponsorenbereich wurden tatsächlich gegen alte Referenzpixel verglichen (maximal 1/255), die ursprüngliche 17°-Fixture ist exakt. MKW, Undo/Redo und reale PNG/PDF/PSD-Ausgaben geprüft. [Bericht und aktuelle Grenzen](QUALITY-REVIEW-2026-11-18.md), [Rohwerte](QUALITY-VERIFICATION-2026-11-18.json). Die alten Zahlen oben bleiben als ursprünglicher Diagnose-/Veröffentlichungsnachweis stehen, nicht als aktueller ungelöster Transformationsfehler.

**B02 nicht abgeschlossen:** grosse Altformate und repräsentative weitere Konvertierungen bleiben vor Entfernung abzusichern. Backup-Einstieg und exklusiver Inspector sind weiterhin vorhanden, keine Dateireduktion behauptet. Nächsten Schritt 1 oben nicht erneut implementieren; von Schritt 2 und dem Formatfall weiterarbeiten.

Nachtrag abgeschlossen: Code `caa828e`, vollständiger GitHub-Endlauf 44332104938 und Pages erfolgreich (217 Modelltests, 120 Chrome-/105 Firefox-Suiten). Die neue Transformationsprüfung ist auch tatsächlich live bestanden. Ausführlicher Nachweis im Qualitätsbericht; anschliessend nur Dokumentation geändert.

## Weitere Fortsetzung · Konvertierungsgrenze

[Konvertierungsprüfung](CAMPAIGN-CONVERSION-REVIEW-2026-11-18.md): Format-/Safezone-Prüfung vor Kopie-Aufbau, konkreter sicherer Weiterweg, Projekt-/Revisionsbindung der Bestätigung und No-op für leere Bildgruppen. Original/MKW auch für 6000×4000 bzw. 240×239 erhalten. B02 weiterhin offen: Der alte Editor bleibt für nicht unterstützte Altformate erforderlich; ein klarer Hinweis allein ist kein Ersatz und keine Modusentfernung.

Weitere repräsentative Prüfung: Familien-Palettenversatz und bisherige Konturreihenfolge/Kerning waren nicht layouttreu (eigene Referenz max. 199/255). Über den bestehenden temporären Decorator korrigiert, alle acht Versätze lokal pixelgleich, echter MKW-/PNG-/PDF-/PSD-Rundlauf geprüft. Kein neues Dateimodell, kein nativer PSD-Kontur-Nachweis. Aktueller Nachweis im Konvertierungsbericht; B02 bleibt unvollständig.
