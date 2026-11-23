# Formvorschau beim Zeichnen · E01

Im Formwerkzeug stehen Rechteck, Ellipse, Dreieck, Vieleck und Stern vor dem Ziehen unter «Neue Form» zur Wahl, wenn keine Ebene ausgewählt ist. Die Vorschau verwendet Geometrie, Füllung, Kontur und Ausschnitt des Designers. Shift hält die Seiten gleich. Die Kürzel M und L wählen Rechteck und Ellipse.

Der Entwurf liegt in einer auf den sichtbaren Arbeitsbereich begrenzten Vorschau. Maus- und Touch-Bewegungen werden pro Bild zusammengefasst. Loslassen erzeugt genau einen Dokument- und Undo-Schritt. Escape, Pointer-Abbruch, Fokusverlust und Werkzeug- oder Projektwechsel verwerfen den Entwurf. Alte Rahmenwerkzeuge verwenden ihren bestehenden Ablauf.

| Persona | Prüffall | Status |
| --- | --- | --- |
| Neue Nutzerin | Auswahl unter «Neue Form» und erkennbare Silhouette vor dem Loslassen. | Gelöst |
| Erfahrener Designer | M/L, Shift, umgekehrte Ziehrichtung und pixelgleicher Vergleich der fünf Formen mit ihrer endgültigen Darstellung. | Gelöst |
| Senior UX-Experte | Während des Ziehens bleiben Dokument und Verlauf unverändert. Ein Abbruch lässt auch den Redo-Stapel intakt. | Gelöst |
| UI-Expertin | Bestehende beschriftete Formschaltflächen mit Auswahlzustand, in Hell und Dunkel sowie mit längerem Projektnamen geprüft. | Gelöst |
| QA-Entwicklerin | Desktop-Maus, Tablet-Viewport und emulierte Touch-Geste. Zeichen-, Reihen- und Exportregression geprüft. | Gelöst im geprüften Umfang |
| Fehlersucher | Einzelklick, Escape, Pointer-Abbruch und Fokusverlust hinterlassen kein Objekt und keine sichtbare Vorschau. | Gelöst |

Die Tablet-Prüfung verwendet einen simulierten 820 × 1180 px grossen Viewport. Der nächste priorisierte Rest gemäss Masterplan ist B02, zunächst ein bearbeitbarer Ersatzweg für bisher nicht unterstützte Altformate.

## Veröffentlichung

Der geprüfte Stand `d010897` wurde auf dem Hauptzweig veröffentlicht. Lokal bestanden 221 Modell-/Pakettests und acht gezielte Chromium-Suiten. Der vollständige [GitHub-Freigabelauf](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45136098761) war in Firefox, Chromium und Windows erfolgreich. [GitHub Pages](https://github.com/noe-plain/noe-plain.github.io/actions/runs/45138156376) meldete Erfolg. Auf der Live-Seite bestanden der Pixelvergleich für fünf Formen, Hell/Dunkel, Tastatur, Abbruch und emuliertes Tablet. HTML, JavaScript, CSS und Wiki stimmten bytegenau mit dem geprüften Stand überein.
