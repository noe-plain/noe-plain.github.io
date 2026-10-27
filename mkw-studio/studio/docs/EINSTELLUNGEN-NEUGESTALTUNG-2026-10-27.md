# Einstellungen: neue Struktur und Bedienung

Stand: 27.10.2026 · Ausgangsstand `b9454ebe44bc30abc4241978aed27b7a0d4aa6b6`.

## Entscheidung aus fünf Perspektiven

Dies ist eine fachliche Bewertung aus fünf Rollen, keine Befragung realer Personen.

| Perspektive | Problem des bisherigen Aufbaus | Konsequenz für die Umsetzung |
|---|---|---|
| Neue Nutzerin | „Allgemein“ vermischte Darstellung, Advanced-Modus, Dateisicherung und Setup. Auf kleinen Fenstern fehlten die Kategorienamen. | Sieben klar benannte Bereiche; sichtbare Namen auch im schmalen Fenster, kurze Erklärungen, eindeutiges „Fertig“. |
| Erfahrener Nutzer | Eine bestimmte Einstellung musste über mehrere Bereiche gesucht werden. | Sofortige Suche mit Kategorienangabe, direkten Abschnittstreffern, Enter für den ersten Treffer, Escape zum Leeren. Zuletzt benutzter Bereich bleibt während der Sitzung erhalten. |
| UX/UI-Designerin | Abstände und Kartengrössen folgten mehreren überlagerten CSS-Regeln. Kategorien enthielten zusammenhanglose Inhalte. | Eigene Settings-Stylesheet, semantische Material-Farbrollen, klare Titelskala, konsistente Karten und Abstände. Darstellung nutzt bei ausreichend Platz ein zweispaltiges Raster, Formulare folgen einer gut lesbaren vertikalen Reihenfolge. |
| Barrierefreiheitsexperte | Symbolnavigation allein erschwert Orientierung. Ein stiller Speicherfehler ist nicht erkennbar. | Beschriftete Navigation, native Dialogmodalität, Tab-/Pfeiltasten/Home/End, passende Orientierung, benannte Suche, Live-Trefferzahl, Fokus am Ziel, Fehlermeldung als Text/Alert, reduzierte Bewegung. |
| Entwicklerin & QA | Einstellungen werden von mehreren Modulen ergänzt; globale DOM-Beobachtung oder ein neues Persistenzschema wären unnötige Risiken. | Bestehende IDs und Mutationshandler erhalten. Kleines `MKWSettings.register` für Suchmetadaten später geladener Bereiche, kein neues Framework und kein Index über Benutzerdateien. Dokument- und Exportvergleich als Regression. |

## Die sieben Bereiche

| Bereich | Enthaltene Funktionen |
|---|---|
| Darstellung | Hell/Dunkel, Hauptfarbe, vier Farbkonzepte, Rücksetzen der Hauptfarbe, Farbvorschau, Startbild wählen/ersetzen/entfernen. |
| Bedienung | Advanced-Modus, komfortable oder kompakte Bedienelemente. |
| Raster & Hilfslinien | Raster-/Schutzzonenfarbe, magnetische Hilfslinienfarbe, Einrastabstand, Designer-Spalten/Reihen/Stege samt Vorschau. |
| Schriften | Vier FD-Textgrössen, Designer-Zeilenhöhe, eigene Schriften hinzufügen und entfernen. |
| Sponsoren | Standard-Balkenfarbe, Gruppen, Logos, Reihenfolge und Verschieben; bestehende Bibliotheksfunktionen erhalten. |
| Vorlagen | Ansehen, aktuelles Design speichern, aus MKW erstellen, eigene Vorlagen entfernen; bestehende Abläufe erhalten. |
| Speichern & Export | Verknüpfte Datei automatisch aktualisieren, Bildformat/PDF-Vorgabe, MKW-Setup verknüpfen/aktualisieren/exportieren. |

## Ergänzte Elemente

- Suche über alle Einstellungen mit 16 registrierten Themen. Sie durchsucht feste Funktionsbeschreibungen und Stichwörter, keine Projektinhalte oder individuellen Bibliotheksdateien. Treffer zeigen den Bereich und führen zur betreffenden Karte.
- Leerergebnis mit hilfreichen Suchbeispielen; Suche leeren; Enter und Escape.
- Feste Abschlusszeile mit Hinweis auf direkte Übernahme und „Fertig“; Kreuz und Escape bleiben erhalten.
- Fehlerfeedback für fehlgeschlagene Browser-Präferenzspeicherung, einschliesslich Theme. Ein erfolgreicher Schreibvorgang für einen anderen Schlüssel darf den ursprünglichen Fehler nicht verdecken. Bibliotheken behalten ihre eigenen Fehler- und Rollbackmeldungen.
- Präzisere Hinweise zu Browser-/Dateisicherung, Schriftstartwerten und Einrastabstand. Das Wiki enthält die neue Navigation und den Suchablauf.

Kein allgemeines „Alles zurücksetzen“ ergänzt: Es wäre eine leicht fehlbedienbare Sammelaktion über Schriften, Logos, Vorlagen und Präferenzen. Die vorhandenen gezielten Entfernen-/Zurücksetzenaktionen und MKW-Setup bleiben verfügbar. Diese Abwägung ist eine eigene UX-Einschätzung.

## Quellen und Einordnung

- [Material Web: Tabs](https://github.com/material-components/material-web/blob/main/docs/components/tabs.md): verwandte Inhalte auf gleicher Hierarchieebene. Die responsive, beschriftete Kategorieauswahl ist eine Anpassung für dieses umfangreiche Einstellungsfenster; die vertikale Form ist kein behaupteter unveränderter Material-Web-Tab.
- [Material Web: Dialoge](https://github.com/material-components/material-web/blob/main/docs/components/dialog.md): Titel, Inhalt und Aktionen sowie native Dialogverwandtschaft. Der vorhandene native Dialog und seine gemeinsame Fenstergrösse bleiben erhalten.
- [Material Web: Switch](https://github.com/material-components/material-web/blob/main/docs/components/switch.md): unabhängige Ein-/Aus-Einstellung. Die Schalter für Advanced und Dateiaktualisierung bleiben direkte Einstellungen.
- [Material Web: Textfelder](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md): Labels, Eingabetypen und Fehlerfeedback. Die vorhandenen validierten Felder bleiben native Controls.
- [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): Beziehungen zwischen Tab und Panel, Tastatur und Fokus. Die mobile Leiste meldet horizontale statt vertikale Orientierung.
- [Material Web Wartungsstatus](https://github.com/material-components/material-web#readme): Maintenance Mode. Die Quellen dienen als offizielle Komponentenreferenz; keine neue Laufzeitabhängigkeit eingebaut.

Die Material-3-Website liefert im Textzugriff nur eine JavaScript-Startseite. Konkrete Aussagen oben beruhen auf den lesbaren offiziellen Repository-Dokumenten. Kategorien, Suchbegriffe und Desktop-Raster sind begründete eigene Produktentscheidungen, keine erfundenen Material-Pflichtvorgaben.

## Akzeptanz und Prüfung

| Anforderung | Nachweis / Status |
|---|---|
| Alle bisherigen Einstellungen erreichbar und wirksam | Sieben Bereiche, erhaltene Control-IDs; Firefox-Regressionssuiten für Setup, Schriften, Sponsoren, Vorlagen, Raster, Themes und Advanced-Werkzeuge. |
| Suchen, Leeren und direkt zum richtigen Bereich springen | `settings-redesign`: Treffer zu acht unterschiedlichen Aufgaben, kein Treffer, Enter, Escape, Ziel-Fokus. Erfolgreich in Firefox und Chromium. |
| Einstellungen ändern keine gestalteten Projekte | Neuer Test vergleicht Projektzustand; vorhandene Theme-/Control-/Rastertests vergleichen zusätzlich Exportpixel, History und Dokument. |
| Desktop und schmale Fenster verständlich bedienbar | 1500×1050, 1024×768, 390×844 und 700×500. Keine horizontale Inhaltsüberbreite; Kategorien bleiben beschriftet. Screenshots geprüft. |
| Zugängliche Namen, Beziehungen und Kontraste | Automatische axe-Prüfung aller sieben Bereiche in Hell/Dunkel und bei 390 px; Tastatur-/Fokustests. Keine gemeldeten Verstösse im geprüften Umfang. |
| Speicherfehler sichtbar und behebbar | Injizierter Fehler für Präferenzen und Theme; Status bleibt bei fehlgeschlagenem Schlüssel erhalten und verschwindet nach erfolgreichem erneuten Schreiben. |
| Bewegungen berücksichtigen Systemeinstellung | Neue Bereichsanimation bei `prefers-reduced-motion: reduce` deaktiviert; vorhandene Control-Regressionsprüfung erhalten. |
| Wartbare gemeinsame Struktur | Settings-CSS aus `dialogs.css` in `settings.css` überführt; Suchindex registriert nur feste Metadaten, keine globalen Beobachter oder zusätzlichen Datei-Ladevorgänge. |

Konkrete Testlauf-Ergebnisse stehen im Abschlussnachweis unter `work/audits/settings-2026-10-27` im lokalen Arbeitsbereich. Eine automatische Accessibilityprüfung ersetzt keine vollständige manuelle Screenreaderprüfung; reale Touchgeräte und alle Browser-/Betriebssystemkombinationen wurden nicht vollständig abgenommen.

### Abschlussstand der lokalen Prüfung

- 124/124 Modelltests, Formatprüfung und Produktionsbuild erfolgreich.
- 24 unterschiedliche Firefox-Suiten erfolgreich (14 im ersten und 11 im zweiten Lauf, mit einer Überschneidung). Nach den letzten kleinen Anpassungen zusätzlich `settings-redesign` und `seven-perspectives` erfolgreich.
- 42 UI-Kontexte erneut erfasst, einschliesslich der neuen Kategorie Bedienung; keine unerwarteten automatischen Accessibilityverstösse.
- Chromium: `settings-redesign`, `setup-file` und `colour-combinations` erfolgreich.
- Visuell angesehen: Darstellung auf Desktop und bei 390 px, Bedienung, Schriften, Speichern/Export in Dunkel. Weitere Ansichten wurden automatisiert erfasst und geprüft, nicht alle manuell betrachtet.
- Komprimierte Produktionsassets wachsen lokal um rund 3,5 kB (JS +2.918 B, CSS +583 B). Das ist eine Grössenmessung, keine allgemeine Laufzeit-Performancegarantie.
- GitHub-Prüfungen und Veröffentlichung sind erst nach dem Push separat bewertbar.
