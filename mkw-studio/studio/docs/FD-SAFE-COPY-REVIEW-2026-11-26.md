# Sichere FD-Altdateikopien und gezielte Bedienungsverbesserungen

Prüfstand: 26. November 2026, Ausgang `328d275`, vor Veröffentlichung mit Hauptzweig `028a601` zusammengeführt. Dies ist ein Nachweis zum einzigen aktiven [Masterplan](MASTERPLAN.md), keine weitere Aufgabenliste. FD-Backup bleibt bis zur vollständigen B02-Abnahme erreichbar.

## Entscheidung und Änderungen

Die Kopienumwandlung darf weder gültige Schutzzonen verändern noch nach asynchroner Vorbereitung einen inzwischen anderen Arbeitsstand ersetzen. Die fünf Perspektiven priorisieren diesen Schutz vor dem blossen Entfernen des alten Menüpunkts.

- **Schutzzonen:** Endliche nichtnegative Bruchteile bleiben bei alten Kampagnen exakt erhalten. Breite/Höhe und vorhandene Grenzen bleiben geprüft; ein positiver Innenbereich ist weiter erforderlich. Normale neue Designer-Formate behalten die bisherige Ganzzahlregel.
- **Sichere Übergabe:** Ausgangsobjekt, Projekt-ID und Revision werden vor Bestätigung, nach Vorbereitung und unmittelbar vor dem Ersetzen des Dokuments geprüft. Eine veraltete Kopie wird verworfen. Bild-/Logo-/Schriftmetadaten des Kandidaten sind getrennt; unveränderliche Mediendaten werden wiederverwendet. Das alte verknüpfte File wird dabei nicht beschrieben.
- **Vertikale Textposition:** Drei Icon-Buttons direkt unter der horizontalen Ausrichtung. Die vertikale Position betrifft das ganze Textfeld, auch wenn nur ein Absatz ausgewählt ist. Mehrfachauswahl, gesperrte Objekte, Verknüpfungen und Undo/Redo nutzen die bestehende gemeinsame Typografie-Anbindung. Der alte doppelte Rahmenbereich entfällt.
- **Kartenaktionen:** Icon-Buttons mit kleinen Rundungen und 44 × 44 px Bedienfläche. Namen nach 900 ms Maus-Hover, bei Tastaturfokus unmittelbar. Bild als Hero, Copyright-Eingabe, Optionen und Umsortieren bleiben erhalten.
- **Neue Winkel:** Breit aufziehen ergibt Spitze unten, hoch oder quadratisch ergibt Spitze links. Die Richtung wird während des Ziehens benannt. Hoch bleibt manuell wählbar; bestehende Winkel und übrige Einstellungen bleiben erhalten. Rückwärtsziehen funktioniert gleich, Escape verwirft den Entwurf.

## Typografische Grundlage und Grenze

Adobe beschreibt [Optical Margin Alignment](https://helpx.adobe.com/indesign/desktop/format-and-style-text/composition-and-text-wrapping/apply-and-manage-text-formatting.html) als gezielte Korrektur sichtbarer Textkanten, einschließlich überhängender Satzzeichen. Daraus folgt keine allgemeine Pflicht, den Effekt in jedem Text und jeder Anwendung einzuschalten. **Eigene Produktentscheidung entsprechend dem Nutzerwunsch:** Neue Studio-Textfelder beginnen mit aktivierter vorhandener optischer Kantenkorrektur; sie bleibt pro Absatz abschaltbar.

Studio misst bereits sichtbare Glyphenkanten und berücksichtigt Einzüge. Das ist kein vollständiger Nachbau von InDesigns optischem Satzzeichenüberhang. Blocksatz verwendet weiterhin seine eigene Satzregelung; dort ist diese Korrektur deaktiviert und erklärt. Bestehende Dateien, Vorlagen, explizite Aus-Werte und übernommener Alttext werden nicht nachträglich umgestaltet. Die vorhandenen Canvas-/Inline-/Exportpfade bleiben gemeinsam.

## Prüfung aus fünf Perspektiven

Dies ist eine fachliche Prüfung mit automatisierten Interaktionsnachweisen und angesehenen Ansichten, keine Studie mit fünf realen Testpersonen.

| Persona | Problem / Entscheidung | Prüfkriterium und Ergebnis | Status |
| --- | --- | --- | --- |
| Neue Nutzerin ohne Gestaltungswissen | Veraltete Umwandlung darf keine Arbeit verdrängen. Vertikale Textposition muss neben der bekannten Ausrichtung stehen. | Klare Abbruchmeldung, Original weiter vorhanden; drei benannte Icons direkt unter horizontaler Ausrichtung. | Im geprüften Umfang gelöst |
| Erfahrener Nutzer mit Zeitdruck | Keine gerundeten Safezones; keine mehrfachen Ausrichtungsstellen; Winkelrichtung ohne zusätzlichen Menüsprung. | Exakte Ränder/PNG, gemeinsame Rahmenposition, native weite/hohe/rückwärtige Ziehbewegungen und manuelle Richtung. | Im geprüften Umfang gelöst |
| Senior UX/UI-Designerin | Kleine Aktionsflächen sollen kompakt, lesbar und konsistent sein. Optik darf vorhandene Designs nicht verändern. | 8-px-Rundung und 44-px-Trefferflächen, Hero bleibt, verzögerte Hilfen, deutliche Auswahl; bestehende Layoutwerte und Alttext bleiben erhalten. | Gezielte Ansichten kontrolliert |
| Barrierefreiheitsexperte | Icon-only darf die Namen nicht entfernen; Rahmenposition braucht erkennbare Auswahl und Tastaturzugang. | Native Buttons, zugängliche Namen, `aria-pressed`, Fokus-Hinweis ohne lange Verzögerung, deaktivierte gesperrte Ziele; automatisierte axe-Prüfung des dunklen Panels. | Automatisch geprüft; manuelle assistive Technik offen |
| Entwicklerin & QA-Testerin | Transaktionsrennen, geteilte Metadaten und stiller Geometriedrift müssen reproduzierbar abgesichert sein. | Projekt-/Revisionswechsel während Aufbau und Wiederherstellung, ursprünglicher Hash/Verlauf/Selektion/Asset-Metadaten, MKW/PNG sowie bestehende Import-/Exportregressionen. | Reproduzierbare Nachweise unten |

## Tatsächliche Prüfungen

- 233 Modell-/Dateitests, Formatprüfung und reproduzierbarer Build bestanden.
- Gezielte Chromium-Prüfungen: `backup-safe-copy`, `text-frame-controls`, `campaign-conversion-guard`, `backup-migration`, `campaign-migration`, `campaign-family-migration`, `legacy-photo-transform`, `optical-alignment`, `campaign-cards`, `campaign-preview`, `text-workflow`, `advanced-typography`, `carousel-text-alignment`, `angle-axis`, `post-angle`, `shape-preview`, `project-setup`, `template-text`, `appearance-carousel-psd`, `project-storage` bestanden. Der alte Ausrichtungstest stellt seinen historischen optisch unveränderten Ausgang nun ausdrücklich mit `opticalAlign: false` her; die neuen Defaults haben einen eigenen Test.
- Neue Altdatei-Fixture: gzip-MKW tatsächlich geöffnet, 600 × 750 und 240 × 239 px, endlicher Bruchteil-Innenbereich, verborgener Untertitel im Original und in den erhaltenen Board-Metadaten, originaler gzip-Hash unverändert. Tatsächliche PNG-Blobs vor/nach Konvertierung und nach MKW-ZIP-Wiederöffnung SHA256-identisch.
- Vier kontrollierte Unterbrechungen: Revision oder Projekt-ID während Aufbau sowie während tatsächlicher Wiederherstellung geändert. Kein neuer Browserprojekteintrag, kein Download, aktuelles Dokument/Selektion/Historie/Assetmetadaten bleiben erhalten.
- Gemeinsame Rahmenausrichtung einzeln/mehrfach/gesperrt, Undo/Redo und MKW-ZIP; neu/alt optisch unterschieden. Winkel mit nativer Maus aufgezogen und abgebrochen. Kartenhint kurz verborgen, nach Verzögerung sichtbar.
- Desktop-Ansichten der Typografie und Kartenaktionen tatsächlich angesehen. Vollständiger zusätzlicher Chromium-Lauf: **130/130 Suiten bestanden**. Nach der letzten Anpassung der einheitlichen 44-px-Ausrichtungsflächen bestanden am finalen Build erneut 233 Modelltests und zehn gezielte Browser-Suiten: die drei neuen/erweiterten Kopien- und Rahmenprüfungen, gemeinsame Texttools, Typografie, Textausrichtung, Material-Konsistenz, Inspektoren, Karten und Textpanel. Die finale Textansicht wurde nochmals angesehen. Veröffentlichung wird unten nach tatsächlichem Abschluss ergänzt.

## Weiter offen

- B02 darf nicht als vollständig erledigt gelten: weitere repräsentative echte Originalprojekte mit Familien-/Winkel-/Sponsorenvarianten und vollständig ersetzbare Bearbeitung verborgener Alttexte sind noch nötig. Verborgene Ausgangsdaten bleiben erhalten, sind aber nicht damit bereits als identische native Editorfunktion abgenommen. Keine aktiven Backup-Funktionen entfernt.
- Lokaler Firefox kann auf diesem Rechner weiterhin nicht zuverlässig initialisieren; keine erfolgreiche lokale Firefox-Abnahme behauptet. Der vollständige GitHub-Firefox-Lauf wird separat bewertet.
- Keine manuelle VoiceOver-/NVDA-, physische Touch-, Photoshop- oder InDesign-Abnahme. Synthetische Dateiprüfungen ersetzen keine weiteren echten Nutzervorlagen oder Nutzerstudien.

Vor dem Push wurden die inzwischen veröffentlichten Teilpixel-/Logo-Korrekturen (`ced0612`, `b27e308`) übernommen. Ihre erweiterten Pixel-/Schutzzonenprüfungen und der Ein-Pixel-Innenbereich bleiben erhalten. Die Revisions-/Projekt-ID-Sicherung während der Vorbereitung und die neuen Bedienungsänderungen ergänzen diesen Stand.
