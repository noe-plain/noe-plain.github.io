# Replica, FD-Bildkarte und Export · 27. November 2026

## Entscheidungen und Umsetzung

1. Replica Regular wird Grundschrift für neue Texte und UI; Bold dient Titeln/Hervorhebungen, Light ist nur manuell auswählbar. Die alte gespeicherte Rolle «Replica LL» bleibt Bold. Die drei Originaldateien wurden gelesen; Bold ist bytegleich mit der bisherigen Auslieferung. Neue Rollen sind auch bei Dateivalidierung und Wiederöffnung erlaubt.
2. Drei beschriftete Felder auf der ersten FD-Bildkarte bearbeiten ein gemeinsames natives Textobjekt im ersten Format. Neue Absatzrollen: 70 px Regular / 120 px Bold / 55 px Regular. Vorhandene Formatierung wird beim Ändern des Inhalts erhalten. Gleichformatige Verknüpfungen und lokale Eigenschaften bleiben im bestehenden Modell. Bei wenig Platz wandern Kartenfelder in das vorhandene Optionsfenster. Ein veralteter Blur-Handler darf nach Projektwechsel nicht schreiben.
3. Schwarz/Weiss-Wechsel des eingebauten Logos erhalten exakt seine Geometrie. Ein Farbwechsel erzeugt damit keinen unbeabsichtigten individuellen Höhenwert. Asynchrone Ersatzlogos prüfen Projekt, Objekt und Quelle vor dem Schreiben.
4. Die Instagram-Schutzzone liegt bei den Ansichtsoptionen im Footer, mit Shift+I und aktivem Zustand. Nur ausgewähltes 9:16-/1:1-Artwork, keine Mutation und kein Export. Die Meta-Werbezonen sind Empfehlungen; die App-Symbole sind eine skalierte Referenz, keine universelle gerätegenaue Messung.
5. Exportauswahl und grosse Vorschau teilen eine Oberfläche. Optionen und Download-Footer bleiben erreichbar. Kommentarverwaltung, feste Navigation, direkte Exportauswahl, PNG8/WebP/PDF und Transparenz bleiben erhalten. Dateinamen für Designer-Reihen enthalten lesbare Reihennamen und feste Rxx/Sxx-Nummern. Die vollständige MKW-Datei im ZIP ist optional, für Kompatibilität zunächst eingeschaltet.
6. JPG+ bedeutet echte JPEG-XL-Dateien (.jxl), Hover «JPEG-XL». Normaler JPG-Export bleibt separat. Ein lokaler, versionierter Worker lädt den Codec erst bei Bedarf. 100 % ist verlustfrei. Die Vorschau stammt aus wieder decodierten JXL-Pixeln; Codecgrenze 16 MP pro Bild, Zeitlimit und Abbruch sind ausdrücklich behandelt. Für Social-Media-Uploads bleibt JPG die kompatible Wahl.

## Prüfung aus den fünf Produktperspektiven

| Persona | Befund und Korrektur | Tatsächlicher Nachweis / Grenze |
| --- | --- | --- |
| Neue Nutzerin | Benannte Textarten, gleiche Karte und direkt sichtbare Exportauswahl statt zusätzlichem modalem Fenster. Speichern und Export bleiben getrennt. | FD-Felder und Exportablauf mit UI-Eingaben getestet. Keine echte Erstnutzerstudie behauptet. |
| Erfahrener Nutzer | Formatbezogene Übernahme bleibt individuell korrigierbar; Logo-Farbe blockiert Geometrie nicht. Eindeutige Dateinamen und optionale Projektbeigabe sparen Handarbeit/Packzeit. | Verknüpfungen, MKW-Rundlauf und echte ZIP-Ausgaben geprüft. Vorlagen und bisherige Exportformate bleiben bestehen. |
| Senior UX/UI-Designerin | Gemeinsame Feld-/Theme-Tokens; feste Navigation und Footer; bei kleiner Darstellung kein Überlappen der Bildkarten. | Screenshots der Karte und Exportansichten in Hell/Dunkel, Desktop und schmalen Fenstern geprüft. M3 wird auf diese Aufgaben angewendet, keine vollständige Komponenten-Zertifizierung behauptet. |
| Barrierefreiheitsexperte | Echte Labels, benannte Vorschau-/Auswahlknöpfe, sichtbarer aktiver Zustand, Eingabe-Shortcut-Schutz, Escape und Fokuswege. | Axe in vorhandenen Export-/Karten-/Kommentarprüfungen ohne Befund; Tastaturabläufe geprüft. Manuelle VoiceOver-/NVDA- und physische Touchprüfung bleiben offen. |
| Entwicklerin & QA | Keine Änderung bestehender Schriftrollen oder zweiter Text-/Dokumentbaum. Reine Absatz-/Dateinamenmodelle; Codecs im Worker mit Begrenzung, Abbruch und Cachebudget. | 237 Modelltests; sieben betroffene Chromium-Suiten bestanden. JXL-Dateikennung und verlustfreie Testpixel sowie tatsächlicher ZIP-Download geprüft. Kein Photoshop-/Instagram-Uploadtest oder lokaler Firefox-Erfolg behauptet. |

## Reproduzierbare Prüfungen

`npm run format`, `npm run build`, `npm test`; Browser: `user-fonts`, `inline-fidelity`, `campaign-hidden-texts`, `fd-card-texts`, `campaign-cards`, `campaign-preview`, `text-soft-breaks`, `jxl-export`, `export-panel`, `row-export`, `review-comments`, `review-comments-fd`, `export-colour`. Fehlgeschlagene Zwischenläufe wurden nicht als Erfolg gewertet; sie fanden die fehlende Font-Whitelist, zu hohe erste Bildkarten, einen alten Blur-Handler und den Escape-Wechsel in der integrierten Vorschau. Diese Punkte wurden korrigiert und die betroffenen Prüfungen erneut bestanden.

Lokale Logs und Screenshots: Arbeitskopie `checkpoints/REPLICA-FD-EXPORT-2026-11-27`. Neue portable Suiten laufen auch in der GitHub-Firefox-Matrix. Die bekannte lokale Firefox-Startstörung wird nicht als bestandener Firefox-Test ausgegeben. Der erste Font-Push wurde auf ausdrücklichen Wunsch nicht beobachtet. Für den FD-Push ist Pages erfolgreich; Studio-CI war beim Zwischencheck noch aktiv.

## Quellen und Einordnung

- [Material 3 Dialoge](https://m3.material.io/components/dialogs/guidelines), [Material Web Buttons](https://github.com/material-components/material-web/blob/main/docs/components/button.md), [Material Web Textfelder](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md): Komponentenwahl, Beschriftung und Hierarchie. Die nativen HTML-Adapter und ihre konkrete Aufteilung sind unsere UX-Entscheidung, keine erfundene verbindliche Material-Vorgabe.
- [Meta: Instagram Reels Werbe-Schutzzonen](https://www.facebook.com/business/ads-guide/update/video/instagram-reels/outcome-sales), [Meta: Instagram Feed Carousel](https://www.facebook.com/business/ads-guide/update/carousel/instagram-feed): Referenzformate und empfohlenes Freihalten wichtiger Inhalte. Unterschied zu geräteabhängiger organischer App-UI bleibt im Wiki klar.
- [jSquash JPEG XL](https://github.com/jamsinclair/jSquash/tree/main/packages/jxl), [libjxl](https://github.com/libjxl/libjxl): echte lokale Codec-Implementierung. Gepinnter npm-Tarball SHA-512 geprüft, unveränderte generierte Vendor-Dateien und Lizenznachweise mitgeliefert.

Der aktive offene Plan bleibt ausschliesslich [MASTERPLAN.md](MASTERPLAN.md). Sponsorenleisten, neue Verläufe, vereinheitlichtes Hinzufügen von Formaten und die umfassende Verlagerung von Erklärungen ins Wiki sind dort vorgemerkt.
