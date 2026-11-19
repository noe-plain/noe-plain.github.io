# B02 · Quellarchiv-Bereinigung · 19. November 2026

Ausgang `ff867e01a562c6096bf9ec84d6895b08804510b6`, eigene saubere Arbeitskopie. Masterplan ist die einzige aktive Aufgabenliste. Zuerst den offenen Endnachweis abgeschlossen: 217 Modelltests, 122 Chrome-/107 Firefox-Suiten und Pages grün; drei echte Live-Fälle erneut bestanden und HTML/JS/CSS/Hilfe bytegleich. Keine offenen öffentlichen GitHub-Issues beim Abruf.

## Entfernt und bewahrt

**Elf veraltete Quellkopien, 133.152 Bytes**, aus `backups/` entfernt: `app-v1.js`, `app-v1-final.js`, `browser-v1.cjs`, `index-v1.html`, `psd-v2.js`, `renderer-v2.js`, `smoke-v1.cjs`, `state-v2.js`, `studio-v2.js`, `style-v1.css`, `urspruengliche-demo.html`. Die beiden app-v1-Dateien waren zusätzlich byteidentisch. Keine Nutzerdateien oder MKW-Backups; es handelt sich um archivierte alte Programmversionen. Vollständige Fassungen bleiben im Ausgangscommit in Git erhalten. Die historische v1-Anleitung ist entsprechend gekennzeichnet und ihr Demo-Verweis führt jetzt auf diese Git-Fassung.

**Abhängigkeitsnachweis:** Nicht allein eine erfolglose Textsuche: Das Editor-Manifest und dessen explizite Builder-Eingaben enthalten keinen Archiveintrag; Vendor-Builds verwenden `build/*` und `node_modules`. Paket-/CI-Prüfwege verwenden aktuelle `tests/*`, nicht archivierte v1-Prüfskripte. Aktive HTML-Einstiege, lazy PDF-Lader, Worker-, Vorlagen-, Schrift-/Logo-/Profilpfade und die lokale Server-Allowlist beziehen ihre Ressourcen aus aktuellen statischen Quellen bzw. eingebetteten Assets. Der Archivordner ist kein Asset-Suchpfad. Die einzige zugehörige historische Demo-Erwähnung wurde auf die Git-Fassung umgestellt. Aktive Quellen und erforderliche Altdatei-Kompatibilität bleiben bestehen.

Vorher: **509 versionierte Studio-Dateien / 50.549.877 Bytes**. Die Entfernung spart brutto elf Dateien / 133.152 Bytes; aktuelle Prüf-/Planunterlagen kommen als Dokumentation hinzu. Netto-Stand wird im maschinellen Nachweis erfasst. Laufzeit-HTML/JS/CSS/Hilfe sollen nach dem Build bytegleich bleiben; die Archive wurden schon vorher nicht beim Gestalten geladen. Keine kleinere Laufzeit-Bundlegrösse oder neue Geschwindigkeitssteigerung behauptet.

Weiter vorhanden: aktueller Designer, neue FD-Kampagnen, bisheriger FD-Backup-Editor als notwendiger Altdatei-Weg, Modelle, Vorlagen, Fonts, Logos/Bilder, MKW/Autosave/Undo und PNG/PDF/PSD. **B02 nicht vollständig entfernt.** Grosse/kleine alte Formate ausserhalb 240–4000 px benötigen weiterhin den bisherigen Editor; dieser Rest wird nicht als fertige Migration ausgegeben. Masterplan-Personaabschnitt an den geltenden Sechs-Persona-Auftrag angeglichen, Prioritäten unverändert.

## Sechs-Persona-Prüfung

| Persona | Feedback / Problem | Status |
| --- | --- | --- |
| Neue Nutzerin | Veraltete Programmkopien gehören nicht in die aktive Auslieferung | Archivbereinigung gelöst; sichtbare Modusbereinigung offen |
| Erfahrener Designer | Alte Entwürfe, Ausschnitte, Fonts und Exporte erhalten | Aktive Dienste unverändert; Altformat-Ersatzweg offen |
| Senior UX-Experte | Keine widersprüchlichen Anleitungen als aktuelle Bedienung | v1-Anleitung als historisch gekennzeichnet, Demo-Link korrigiert |
| UI-Expertin | Bestehende M3-Oberfläche erhalten | Keine Laufzeit-UI geändert; bestehende Zustände bleiben |
| QA-Entwicklerin | Löschungen über Abhängigkeiten und reproduzierbaren Build belegen | Quellen-/Build-/Assetwege abgeglichen; tatsächliche Tests unten ergänzen |
| Destruktiver Fehlersucher | Grenzformate, Projektwechsel und Dateirundlauf dürfen nicht beschädigt werden | Passende vorhandene Datei-/Konvertierungsfälle wiederverwenden; Restgrenzen bleiben explizit |

Expertenprüfung, keine Nutzerstudie. Keine neuen Tests, die bloss die Abwesenheit gelöschter Dateien nachbilden. Vorhandene aussagekräftige Datei-/Modell-/Browserprüfungen verwenden. Keine manuelle Screenreader-/Touch-/InDesign-/Photoshop-Abnahme behauptet.

## Prüfungen und Veröffentlichung

Lokal bestanden: Formatierung, Build, Formatprüfung, 217 Modell-/Pakettests und 4/4 Chrome-Suiten (`campaign-conversion-guard`, `campaign-family-migration`, `legacy-photo-transform`, `row-export`), einschliesslich echter MKW-/PNG-/PDF-/PSD-/ZIP-Prüfungen. Aktive Quellen und erzeugte Laufzeitdateien sind bytegleich. Ausstehend: tatsächlicher CI-/Pages-/Live-Endstatus. [Maschinenprotokoll](CLEANUP-VERIFICATION-2026-11-19.json). Anschliessend am offenen B02-Altformat-/Migrationsweg weiterarbeiten; keine bereits abgeschlossenen Kommentare oder Familienkorrekturen neu beginnen.
