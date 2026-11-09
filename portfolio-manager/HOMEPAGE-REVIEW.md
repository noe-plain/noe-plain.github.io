# Startseiten-Verwaltung: Konzeption und Prüfung

Die Prüfung verwendet die sechs gewünschten Personas als heuristische Perspektiven. Es handelt sich nicht um eine Studie mit sechs realen Testpersonen.

| Perspektive | Umsetzung und geprüfte Aufgabe |
| --- | --- |
| Neue Nutzerin | Ein Menüpunkt **Startseite**, drei klar benannte Bereiche. Projekte visuell auswählen; Auswahlgrenze und Speicherzustand sichtbar. Vorschau ohne Veröffentlichung. |
| Erfahrener Designer | Originalvorschau, Flexible Breite/Mobil und separate Originalvorschau, Bild füllen oder vollständig zeigen, Mediathek und vorhandenes Projektbild, Reihenfolge mit beschrifteten Tasten, Entfernen rückgängig, Cmd/Strg+S. Tabs per Pfeiltasten sowie Home/End erreichbar. |
| Senior UX | Auswahl, Bearbeitung und Veröffentlichung sind getrennte Schritte. Ungespeicherte Änderungen werden beim Verlassen geschützt. Speichern bestätigt lokale Änderungen; Konflikte verhindern stilles Überschreiben. |
| UI-Expertin | Violetttöne der Website, tonale Flächen, konsistente Rundungen und sichtbarer Tastaturfokus. Neue Bedienelemente innerhalb des Startseiten-Editors mit mindestens 48 px Höhe. Auf Mobil drei Bildspalten ohne horizontales Scrollen. Die Gestaltung orientiert sich an Material-Prinzipien und dem vorhandenen Erscheinungsbild. |
| QA-Entwicklerin | Automatisierte API-, Modell- und Laufzeitprüfungen. Originaldateien bleiben bei Vorschauen unberührt. Maximal sieben eindeutige Projekte, lokale Bildpfade, Revisionen und Sitzungsschutz. |
| Destruktiver Tester | Acht Projekte, Duplikate, unbekannte Projekte, ungültige Bildpfade, fehlende Dateien, ungültige Bewegungswerte, leere Lebenslauf-Stationen, HTML in Textfeldern, veraltete Revisionen und fremde Origins werden abgewiesen. Schneller Einstieg wartet auf die Sitzung. |

## Funktionsprüfung

- Im Browser: Projektbild öffnet das passende Projekt; Auswahl, Reihenfolge, Entfernen/Rückgängig und Speichern getestet.
- Im Browser: HTML-Abschnitt und Lebenslauf-Stationen in einer getrennten Testumgebung geändert und per Strg+S gespeichert. Leere Lebenslauf-Station wird mit einer Meldung abgewiesen.
- Im Browser: `&shy;` bleibt im Eingabefeld erhalten und erscheint als bedingter Trennstrich im Originaldesign. Hero-Projekttitel und Hero-Texte werden ohne HTML-Ausführung dargestellt.
- Im Browser: Smartphone-Vorschau mit 390 px Rahmenbreite (375 px Inhalt), auch mit sieben Bildern; drei Spalten, siebtes Bild mittig, kein horizontaler Überlauf.
- Automatisiert: Umgekehrte, begrenzte Parallax-Bewegung; keine dauerhaft laufende JavaScript-Animation nach dem Einpendeln; Abschaltung bei reduzierter Bewegung, Touch und ausserhalb des sichtbaren Bereichs; fehlgeschlagene Bilder lassen das bisherige Titelbild stehen.
- Bestehende CMS-Prüfung für Vorschauen, Revisionen und Git-Veröffentlichung weiterhin erfolgreich.

## Daten und Bedienung

- Hero: `portfolio/home-hero.json`; Referenzen auf bestehende Projekte statt Kopien. Titel und Projektbilder werden aus den aktuellen Projektdaten aufgelöst; Bild lässt sich gezielt überschreiben.
- Das bin ich: Nur der markierte HTML-Abschnitt in `index.html`. Der Versionsabgleich bezieht die gesamte Seite ein und schützt parallele Änderungen.
- Lebenslauf: `lebenslauf.json`, unveränderte Zeitleisten-Darstellung. Bis zu 80 Stationen, Text ohne HTML-Tags; `&shy;` wird erhalten.
- Bestehende Fotoprojekt-Änderungen wurden nicht überschrieben. Testtexte und Teststationen wurden nicht in die eigentliche Website übernommen.
- Bestätigte Startauswahl: sechs Projekte mit Bewegungsstärke 32. Die Obergrenze bleibt sieben.

Prüfbefehl:

```sh
node --test portfolio-manager/homepage.test.js portfolio-manager/homepage-runtime.test.js portfolio-manager/studio.test.js
```
