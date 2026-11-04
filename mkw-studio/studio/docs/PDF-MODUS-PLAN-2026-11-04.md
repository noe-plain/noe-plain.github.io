# PDF bearbeiten, kommentieren und komprimieren – Umsetzungsplan

Stand: 4. November 2026. **Auf Wunsch pausiert. Nur Erkenntnisse und Plan; keine Implementierung beginnen, bis die PDF-Arbeit ausdrücklich wieder aufgenommen wird.**

**Planungsstand, noch keine implementierte PDF-Bearbeitung.** Keine Demo-Oberfläche als fertigen Editor ausliefern. Die bestehende PDF-Ausgabe von FD-Kampagnen und Designer bleibt erhalten. Weiterhin kostenlos nutzbar, lokal im Browser und auf GitHub Pages, ohne Installation, Konto oder Dokument-Upload.

## 1. Ziel und klare Abgrenzung

Ein zusätzlicher Arbeitsbereich „PDF“ im bestehenden Tool-Hub. Nach dem Öffnen steht das Dokument im Mittelpunkt. „Kommentieren“ ist der sichere Startmodus: Text markieren und Rückmeldungen ergänzen, ohne vorhandene Inhalte versehentlich zu verändern. „Bearbeiten“ wird ausdrücklich gewählt. „Komprimieren“ ist eine Ausgabeaufgabe mit Vorschau, kein dritter widersprüchlicher Auswahlmodus.

Die Vorlage für die Arbeitsweise ist Acrobat, nicht dessen vollständiger Produktumfang. Reader und Acrobat bieten unterschiedliche Fähigkeiten: Die Adobe-Hilfe unterscheidet insbesondere Lesen/Kommentieren/Formularausfüllen von umfangreicher Inhaltsbearbeitung. Das Produkt soll diese Begriffe verständlich erklären, ohne eine Gleichwertigkeit mit allen Acrobat-Funktionen zu behaupten. [Adobe Reader – Öffnen und Bearbeiten](https://helpx.adobe.com/reader/desktop/open-edit-or-delete-pdfs.html), [Adobe – Text bearbeiten](https://helpx.adobe.com/ca/acrobat/web/edit-pdfs/edit-text-images-and-objects/edit-text.html).

## 2. Entscheidungen mit den fünf Personas

| Persona                              | Wichtigste Frage / Problem                                                                      | Entscheidung                                                                                                                                                                                                                                                        | Abnahmekriterium                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neue Nutzerin ohne Gestaltungswissen | „Schreibe ich auf die PDF oder ändere ich ihren Inhalt?“                                        | Deutlicher Umschalter „Kommentieren / Bearbeiten“, kurze Erklärung beim ersten Wechsel. Einfügen von Kommentartext und Einfügen von Dokumenttext werden unterschiedlich benannt. Speichern des Arbeitsstands und fertige PDF herunterladen sind getrennte Aktionen. | Eine Testperson öffnet eine PDF, markiert eine Passage, ergänzt einen Kommentar und lädt sie herunter, ohne versehentlich Dokumenttext zu ändern.                                                                     |
| Erfahrener Nutzer mit Zeitdruck      | Viele Seiten, Korrekturschleifen, wiederkehrende Qualitätsvorgaben.                             | Suche, Seitensprung, Tastenkürzel, Kommentare nach Person/Status filtern, direkt antworten/erledigen; Seitenreihenfolge und Komprimierungspresets. Nur betroffene Seiten erneut zeichnen.                                                                           | Ein längerer Review mit mehreren Personen-/Statuswerten bleibt bedienbar; Exportauswahl und wiederholtes Speichern sind deterministisch.                                                                              |
| Senior UX/UI                         | Ein weiterer Modus darf nicht ein zweites kompliziertes Acrobat werden.                         | Bestehende M3-Oberflächenrollen, zurückhaltende Werkzeugpille und rechter geteilter Inspector. Kontext oben, Seiten/Kommentare darunter; nicht sämtliche Regler gleichzeitig. PDF-Papier, Dokumentfarbe und UI-Theme strikt trennen.                                | Gleiche Aktionen sind gleich benannt, eine primäre Aktion pro Situation, aktiver Modus/Seite/Kommentar sichtbar; 390-px- und vergrösserte Ansichten sinnvoll bedienbar.                                               |
| Barrierefreiheitsexperte             | Canvas allein reicht weder zum Lesen noch zum Bearbeiten.                                       | Selektierbare Textschicht, Seiten-/Kommentarlisten, semantische Werkzeuggruppen, sichtbarer Fokus, Tastaturalternative für Position/Grösse und Annotationen, stabile Fokus-Rückgabe. Vorhandene PDF-Tags erhalten, soweit die Engine es ermöglicht.                 | Öffnen, Suchen, Kommentar erstellen/beantworten, Status, Speichern und Export sind mit Tastatur möglich. Tatsächlicher Screenreader-Test vor Freigabe; fehlende PDF-Tags werden nicht durch UI-Semantik vorgetäuscht. |
| Entwicklerin und QA-Testerin         | Original-PDFs haben keine verlässliche Absatzstruktur; Schrift-Untergruppen fehlen oft Zeichen. | Separater PDF-Dokumentdienst, unveränderte Quelle, explizite Inhaltsoperationen und separate Annotationen. Vor UI-Ausbau zuerst Engine-/Font-Nachweis mit echten Dateien.                                                                                           | Kein stiller Fonttausch, keine weissen Übermalungsrechtecke als „Text ersetzen“, keine global ausgetauschte Dokumentvariable; Wiederöffnen und unabhängige Exportprüfung bestehen.                                    |

## 3. Bestandsanalyse des aktuellen Codes

- `build/pdf-entry.js` bündelt bereits `pdf-lib` **1.17.1** und `@pdf-lib/fontkit` **1.1.1**; die Versionen stammen aus der lokalen `package.json`.
- `static/carousel-pdf.js` lädt die PDF-Bibliothek bei Bedarf und erstellt eine **neue** PDF. Die Seiten verwenden die kanonisch gerenderte Gestaltung; eine eingebettete unsichtbare Textschicht ermöglicht Suche/Selektion. Das ist keine Import-/Editing-Pipeline für beliebige Original-PDFs.
- Es gibt derzeit keinen eingebundenen PDF.js-/PDFium-Importdienst, keine allgemeine PDF-Seitentextanalyse und keinen persistenten PDF-Kommentar-Store. Designer-Pfade und Textobjekte sind nicht automatisch PDF-Objekte.
- `project-store.js`, `project-session.js`, `project-assets.js`, `project-file.js` und `project-blocks.js` liefern wiederverwendbare Bausteine für Identität, Binärdaten, Konflikte, Streaming und lokale Sicherung. Sie dürfen nicht ungeprüft mit einem neuen Dokumenttyp überladen werden.
- Gemeinsame UI: Farbwähler, Dialoge, Felder, Lade-/Fortschrittsanzeige, Dateidialoge, geteilte Sidebar und Themes weiterverwenden. Keine zweite Palette, kein neuer Framework-Stack.

**Folgerung:** Die vorhandene Bibliothek eignet sich weiter für bestehende Exporte und bestimmte neue PDF-Aufgaben. Ihre offizielle Dokumentation nennt ausdrücklich fehlende APIs zum Auslesen bzw. Entfernen/Bearbeiten gewöhnlichen Seitentexts ausserhalb von Formularfeldern. Ein bestehender Textblock lässt sich daher nicht einfach mit einer weiteren `drawText`-Zeile korrekt ersetzen. [pdf-lib – Limitations](https://github.com/Hopding/pdf-lib#limitations).

## 4. Acrobat-Funktionen und Produktpriorität

| Bereich                                                                                      | Übernahme                              | Reihenfolge / Begründung                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lesen, Suche, Textauswahl, Zoom, Seitenminiaturen, Seitensprung, Lesezeichen, Download/Druck | Ja                                     | Basis für alle weiteren Aufgaben; bestehende Dokumentansicht erhalten.                                                                                                                                                                                                                                                             |
| Highlight, Unterstreichen, Durchstreichen                                                    | Ja                                     | Exakte Text-Quads pro Zeile; keine grosse Markierbox über mehrere Spalten.                                                                                                                                                                                                                                                         |
| Haftnotiz, Freihand, Pfeil, Rechteck/Ellipse, Textkommentar                                  | Ja                                     | Eigene PDF-Annotationen mit Aussehen, Autor und Inhalt.                                                                                                                                                                                                                                                                            |
| Kommentare, Antworten, Erledigt-Status, Bearbeiten/Löschen/Einblenden/Filter                 | Ja                                     | Kern für Team-Reviews; lokale Autorenangaben, kein vorgetäuschter Online-Sync. [Adobe Antworten](https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/manage-reviews/reply-comments.html), [Status](https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/manage-reviews/unread-resolve-comments.html). |
| Vorhandenen Text korrigieren, neue Textfelder, Formatierung, Position/Grösse                 | Ja, nach Engine-/Font-Nachweis         | Der schwierigste Kern; Originalschrift und unveränderte Zeilenpositionen haben Vorrang vor einer langen Werkzeugliste.                                                                                                                                                                                                             |
| Bilder/Grafikobjekte bewegen, skalieren, ersetzen, hinzufügen/löschen                        | Ja, gestuft                            | Objektmatrizen, Masken und mehrfach verwendete Bildressourcen berücksichtigen. Komplexe Objekte erst freischalten, wenn sie zuverlässig isoliert werden können.                                                                                                                                                                    |
| Seiten drehen, umordnen, duplizieren, löschen; PDFs zusammenfügen/Seiten entnehmen           | Ja, nach zuverlässigem Basis-Speichern | Hoher Alltagsnutzen. Seiten-IDs, Kommentare, Lesezeichen und Verweise müssen korrekt folgen.                                                                                                                                                                                                                                       |
| Formulare ausfüllen                                                                          | Ergänzende frühe Stufe                 | Bestehende AcroForm-Felder erhalten; nicht mit statischem Seitentext verwechseln. Formular-Erstellung später.                                                                                                                                                                                                                      |
| Komprimierung mit Vorschau und Grössenvergleich                                              | Ja                                     | Sichere Vorgabe und verständliche Qualitätsprofile, zusätzliche Regler bei Bedarf. [Adobe Optimierung](https://helpx.adobe.com/acrobat/desktop/create-documents/optimize-pdfs/advance-size-reduction.html).                                                                                                                        |
| OCR für Scans, Signieren/Zertifikate, echte Schwärzung, Preflight/PDF-A, Dokumentvergleich   | Vorgemerkt                             | Eigenständige technische Anforderungen. Ein Scan wird nicht als direkt bearbeitbarer Text ausgegeben; Löschen oder Übermalen wird nicht als sichere Schwärzung bezeichnet.                                                                                                                                                         |
| Cloud-Review, Adobe-Konto, KI-Assistent, kostenpflichtige SDKs                               | Nicht Grundlage                        | Widerspricht dem lokalen, kostenlosen Browser-Werkzeug bzw. bringt derzeit zu wenig Nutzen.                                                                                                                                                                                                                                        |

## 5. Engine-Entscheidung zuerst durch einen kleinen Nachweis absichern

### Anzeige und Annotationen

**PDF.js** ist die bevorzugte Anzeige-/Textauswahlbasis: lokal gebündelte, versionierte Worker-Dateien, nur im PDF-Arbeitsbereich laden. Die offizielle API enthält unter anderem `getTextContent`, `getAnnotations` und `saveDocument`; letzteres verwendet Annotation Storage. Das belegt keine beliebige Bearbeitung ursprünglicher Text-/Grafik-Streams. Export und Interoperabilität jeder eigenen Kommentarart müssen gesondert geprüft werden. [Offizielles Repository](https://github.com/mozilla/pdf.js), [Display-API](https://github.com/mozilla/pdf.js/blob/master/src/display/api.js), [Annotation Storage](https://github.com/mozilla/pdf.js/blob/master/src/display/annotation_storage.js).

### Echtes Ändern bestehender Inhalte

**PDFium in WebAssembly** als erster Proof-of-Concept-Kandidat, hinter einer kleinen Engine-Schnittstelle. Die offizielle C-API bietet beispielsweise Textobjektänderung und Fontzugriff; Teile davon sind ausdrücklich experimentell. Ein WASM-Wrapper muss diese Möglichkeiten tatsächlich exportieren. Das ist noch keine Garantie für zuverlässigen Absatzumbruch, alle Fonttypen oder originalgetreue Bearbeitung jedes PDFs. Zunächst prüfen: ursprüngliches Fontobjekt wiederverwenden, Text ersetzen, Bild ersetzen, neue Seite schreiben, in einer zweiten Engine anzeigen. [Offizielle PDFium-Editing-API](https://pdfium.googlesource.com/pdfium/+/refs/heads/main/public/fpdf_edit.h).

Nicht vorzeitig zwei komplette Rendering-Engines dauerhaft im Speicher halten: Wenn derselbe geprüfte PDFium-Build Anzeige und Änderung zuverlässig leisten kann, gegen PDF.js-Rendering abwägen. Für die erste Entscheidung messen: Download-/Initialisierungsgrösse, Speicher, Genauigkeit und Firefox-Verhalten. Eventuelle Wrapper müssen auf Lizenz, veröffentlichte Binärherkunft, Wartung und API-Abdeckung geprüft werden. Noch kein Wrapper ausgewählt oder installiert.

**Freigabeschranke:** Kein allgemeiner Bearbeiten-Button vor bestandenem Font-/Roundtrip-Nachweis. Bei einem technisch nicht unterstützten Objekt bleibt die PDF les- und kommentierbar; die konkrete Einschränkung steht beim Objekt. Kein stilles Ersatzverfahren, das das Dokument anders aussehen lässt.

## 6. Originaltypografie erhalten

1. **Importinventar:** Pro Textobjekt Originalreferenz, Fontreferenz, PostScript-/Familienname, Schriftschnitt, Fonttyp, Einbettung/Subset, Encoding/CMap/ToUnicode, Textmatrix, Glyphenpositionen, Schriftgrösse, Zeichen-/Wortabstände, Farbe, Renderingmodus, Grundlinie, Rotation und Clip erfassen. Nicht alle Informationen sind in jeder PDF vorhanden.
2. **Unveränderte Objekte bleiben unangetastet.** PDF-Text nicht beim Import in die allgemeinen Designer-Textboxen umwandeln. Solche Umwandlung würde die typografische Grundlage ersetzen.
3. **Korrekturen zunächst lokal:** Einzelne vorhandene Glyphenläufe ändern; Originalfont und vorhandene Platzierung bevorzugen. Neue Zeichen nur übernehmen, wenn sie zuverlässig kodiert und gezeichnet werden können. Bei Subset-Fonts kann der Buchstabe fehlen, obwohl derselbe Familienname angezeigt wird.
4. **Schriftstatus sichtbar:** „Originalschrift“, „Originalschrift – nur vorhandene Zeichen“ oder „Ersatzschrift erforderlich“. Bei Ersatz erst Auswahl mit Vorschau, kein heimlicher Wechsel. Eine importierte vollständige Originalschrift aus den Tool-Einstellungen kann helfen, falls sie technisch und zur Verwendung geeignet ist. Keine automatische Installation oder Freigabe einer PDF-Schrift in der allgemeinen Fontbibliothek.
5. **Absätze sind oft nicht gespeichert:** Zeilen und Absätze werden aus Nähe, Grundlinien, Stil und Leserichtung vorsichtig abgeleitet. Zweispaltigen Text nicht zusammenziehen. Anfangs „Zeilenpositionen erhalten“; ein bewusster Befehl „Absatz neu umbrechen“ aktiviert Reflow nur innerhalb des gewählten Rahmens.
6. **Eingabe bleibt WYSIWYG:** Renderer/Editing-Overlay teilen Messwerte und Baselines. Originalpositionen stehen fest; keine springende Textarea. Überlauf vor dem Übernehmen zeigen; kein stilles Verkleinern der Schrift oder Verschieben benachbarter Spalten.
7. **Fonts nicht pauschal ausbetten.** Komprimierung darf diese Zusage nicht später wieder zerstören. Adobe bietet differenzierte Font-/Bild-/Transparenzoptionen; unser Standard bewahrt Fonts und editierbare Vektoren. [Adobe PDF-Optimizer-Einstellungen](https://helpx.adobe.com/in/acrobat/desktop/create-documents/optimize-pdfs/pdf-optimizer-settings.html).

## 7. Inhaltsmodell und Annotationen getrennt halten

Vorgeschlagene Modulgrenzen, noch nicht angelegt:

- `pdf-document-model`: stabile Seiten-/Objekt-IDs, Quellreferenzen, Fähigkeiten, validierte Inhaltsoperationen; keine DOM-Abhängigkeit.
- `pdf-engine`: Worker-/WASM-Adapter; Öffnen, Objekt-/Fontanalyse, Rendern, tatsächliche Änderungen und Schreiben. Versionierte Schnittstelle statt Engine-Aufrufe in jedem Button.
- `pdf-annotation-model`: eigene Typen, Quads/Geometrie, Autor, Inhalt, Zeit, Antworten, Status, Sichtbarkeit; reine Regeln und ID-Zuordnung.
- `pdf-review-ui`: Werkzeugzustand, Kommentarlisten, Auswahl, Suche/Filter und Fokus; Inhaltsbefehle im Kommentieren-Modus ausdrücklich gesperrt.
- `pdf-view`: sichtbare Seiten, Text-/Annotationsschicht und Trefferprüfung. Keine Speicherung.
- `pdf-session`: Aufgabenstatus, Undo/Redo, Cancel, Versions-/Tab-Konflikte und Binärasset-Referenzen über die vorhandenen Speicherverträge.
- `pdf-export`: Originalquelle plus bestätigte Änderungen und gewählte Annotation-Ausgabe; Validierung, Abbruch und Aufräumen temporärer Ressourcen.

Ein Kommentar verändert nur das Annotationsmodell. Rechtecke/Pfeile/Freihand bleiben Annotationen, auch wenn sie wie Vektorgrafik aussehen. „Textkommentar“ und „Neues Textfeld“ haben unterschiedliche Befehle und Exportarten. Antworten referenzieren stabile Kommentar-IDs, Seitenumbauten stabile Seiten-IDs statt blosser Seitennummern.

Beim Export Standard-PDF-Annotationen mit Appearance-Streams verwenden; Antworten/Status soweit interoperabel über die vorgesehenen PDF-Felder abbilden. Vorhandene unbekannte Annotationen erhalten. UI-Filter verstecken nur die Ansicht; sie löschen keine Daten. Export bietet ausdrücklich „Kommentare bearbeitbar mitgeben“, „Ohne Kommentare“ oder optional „Sichtbar einrechnen“. Letzteres ist ein bewusstes Ausgabeformat, nicht der gespeicherte editierbare Arbeitsstand. PDF-Inhaltsstreams bleiben im reinen Kommentierablauf unverändert.

## 8. Grafische Objekte und Seiten

- Originalmatrix, Proportionen, lokale Clip-Pfade, Transparenz und Ressourcenzuordnung erhalten. Anzeigeobjekt und zugrunde liegende gemeinsam verwendete Bilddatei unterscheiden.
- Bild ersetzen verändert zunächst die gewählte Platzierung; geteilte Ressourcen werden bei Bedarf kopiert, statt versehentlich alle Verwendungen zu ersetzen.
- Gruppen/Form-XObjects können gemeinsam verwendete Inhalte enthalten. Isolierung/Copy-on-write und deren Export müssen vor Freischalten der Bearbeitung getestet werden.
- Numerische Position/Grösse und Tastaturschritte als Alternative zu kleinen Griffen; Undo pro bestätigter Aktion, Escape für verworfene Entwürfe.
- Seitenverschieben/-drehen muss Kommentare, Textauswahl, Seitenlabels, Lesezeichen und interne Verweise konsistent mitnehmen. CropBox/MediaBox und Seitenrotation sind eigenständige Daten.

## 9. Komprimierung als verständliche Ausgabeaufgabe

Eigene erste Profilvorschläge, keine behaupteten Adobe-Standardwerte:

| Profil          | Verhalten                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Originaltreu    | Keine Reduktion von Bildauflösung, kein Font-Unembedding, keine pauschale Rasterung. Nur geprüfte verlustlose Struktur-/Stream-Bereinigung. |
| Bildschirm      | Vorschlag 150 ppi für übergrosse Fotos, JPEG-Qualität 85; Vektoren, Schriften und Annotationen erhalten.                                    |
| Klein versenden | Vorschlag 96 ppi und JPEG-Qualität 75; vor Download Lesbarkeitsvorschau und echte Dateigrösse anzeigen.                                     |
| Eigene Werte    | Auflösung, Fotoqualität und Kommentar-Ausgabe manuell; Profil kann jederzeit erneut geladen werden.                                         |

Vorschau immer aus den tatsächlich erzeugten Ausgabebytes, mit 100%-Ausschnitt und Vorher/Nachher. „Vorher 12 MB → Nachher 4 MB“ erst nach echter Kodierung, währenddessen ehrliche Schätzung/Fortschritt. Ersparnis nicht garantieren: schon optimierte Dateien können gleich gross bleiben oder wachsen; in diesem Fall Original anbieten. Keine unnötige Verarbeitung aller Bilder bei jedem Slider-Schritt: Entwurf entprellen, Vorschauseite zuerst, vollständiger Lauf erst auf Anforderung. Abbrechen verwirft den Kandidaten.

Nicht pauschal Kommentare, Formulare, Tags, Links oder Metadaten entfernen, nur um eine kleinere Zahl zu zeigen. Getaggte Strukturen, Farbräume, Masken und Transparenzen respektieren. Keine Umwandlung jeder Seite in ein JPEG als „PDF-Komprimierung“.

## 10. Speicherung und Zuverlässigkeit

- Original-PDF als Binärasset einmal halten, keine seitenweisen Originalkopien und keine riesige Base64-JSON-Zeichenkette. Modell/Operationen/Annotationen getrennt speichern. Bisherige MKW-Projekte unverändert weiter öffnen.
- Vor Aktivierung eines neuen PDF-Dokumenttyps die Asset-Referenzsuche, Codec-Validierung, portable Speicherung und Bereinigung im gemeinsamen Speichervertrag ausdrücklich erweitern und testen. Kein unvalidiertes PDF-Feld in den bisherigen globalen Projektzustand schreiben.
- Automatische Browser-Sicherung nur des geänderten Modells/Annotationsstands, vorhandene Hashes/Blobs wiederverwenden. Verknüpfte Dateien nur nach Versions-/Berechtigungsprüfung schreiben; Firefox behält die bewährte Browser-Sicherung plus bewussten Dateidownload.
- Ein ausschliesslich wachsendes Patchprotokoll reicht nicht: bestätigte Speicherstände regelmässig konsolidieren. Beim portablen Speichern entfernte Objekte/ungenutzte Ressourcen aus dem neu geschriebenen Quellstand bereinigen. Alte Quellbytes nur für sessioninternes Undo behalten, nicht dauerhaft als zusätzliche Versionen exportieren. Expliziter Test auf Dateigrösse nach wiederholtem Ersetzen/Löschen.
- Speichern, Import, Engine-Verarbeitung und Export als eindeutige Aufgaben mit Cancel-/Fehlerzuständen; kein halb übernommener Kandidat. Late Worker Replies nach Dokumentwechsel ignorieren.
- Bei verschlüsselten, signierten oder beschädigten Dokumenten die konkreten Fähigkeiten feststellen. Passwörter nicht speichern; keine erzwungene „ignore encryption“-Übernahme. Eine bearbeitete Kopie darf eine ungültig gewordene Signatur nicht als weiterhin geprüft anzeigen.
- Namen und Kommentare als Text behandeln; PDF-Skripte nicht automatisch ausführen. Unbekannte Dokumentobjekte bewahren, statt sie beim ersten Öffnen wegzufiltern.

## 11. Performance und Ladeverhalten

PDF-Code erst beim Öffnen dieses Arbeitsbereichs laden. Versionierte lokale Assets/Worker/WASM statt externer Runtime-CDNs. Keine Zusatzkosten beim normalen Studio-Start.

Virtuelle Seiten-/Kommentarlisten; nur sichtbare Seiten plus einen kleinen Vorlauf rendern. Begrenzter Pixel-/Bitmap-LRU, Render-Cancel bei Zoom/Seitenwechsel, freigegebene Offscreen-Ressourcen. Text-/Fontanalyse pro Seite zwischenspeichern, neue Auswahl zeichnet das Dokument nicht neu. Lange Jobs im Worker, übertragene Binärpuffer statt ständiger Kopien. Ein Fortschrittsbalken nur bei bekanntem Fortschritt; sonst vorhandener M3-Ladeindikator. Reduzierte Bewegung bleibt berücksichtigt.

Die erste Engine-Evaluation misst Startzeit, Dateigrösse des Moduls, Peak-Speicher, Scroll-/Zoom-Verhalten und Exportdauer mit dokumentierter Testmaschine. Erst daraus reale Dateigrössen-/Seitenlimits ableiten; keine Zusage „beliebig grosse PDF“.

## 12. Umsetzung in verifizierbaren Etappen

| Etappe                            | Ergebnis                                                                             | Freigabekriterium                                                                                                              | Status                                   |
| --------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| P0: Bestands-/Quellenanalyse      | Dieser Plan, Funktionspriorität und Engine-Kandidaten                                | Aktuelle Exportpipeline und technische Grenzen korrekt benannt                                                                 | erledigt als Code-/Dokumentationsanalyse |
| P0: Font-/Engine-Probe            | Kleiner interner Techniknachweis, keine ausgelieferte UI-Demo                        | Originaltext ersetzen, fehlendes Subset-Zeichen erkennen, unveränderte Nachbartexte/Vektoren und echte PDF-Objekte nach Export | offen                                    |
| P1: PDF-Session + Lesen           | Öffnen, Seiten, Suche, Zoom, Textauswahl, sichere lokale Sicherung                   | Originalansicht, Abbruch/Fehlerfälle, leere/rotierte/mehrspaltige Seiten, kein Laden im übrigen Studio                         | offen                                    |
| P1: Kommentieren Ende-zu-Ende     | Alle genannten Annotationen, Kommentare/Antworten/Status, Export/Wiederöffnen        | Inhalt unverändert; Annotationen in einem zweiten Reader editierbar; Tastatur/Fokus geprüft                                    | offen                                    |
| P1: Vorhandene Inhalte bearbeiten | Lokale Textkorrekturen, neue Textfelder, stabile Positionen, Bilder/Grafiken gestuft | Originalfont-/Layout-Nachweis je unterstütztem Fall; keine stillen Ersatzfonts oder Übermalung                                 | offen                                    |
| P2: Absätze + Seitenorganisation  | Bewusster Reflow, Seitenoperationen und Formularausfüllen                            | Kein Übergreifen auf falsche Spalten/Seiten; Kommentare/Verweise folgen                                                        | offen                                    |
| P2: Komprimierung                 | Profile, manuelle Werte, echte Ausgabevorschau und Grössen                           | Fonts/Vektoren/Annotationen erhalten; keine verschlechterte Ausgabe ohne sichtbare Qualitätsentscheidung                       | offen                                    |
| P2: Kompatibilität und Freigabe   | Firefox/Chrome, unabhängiger PDF-Reader, manuelle Persona-Abnahme                    | Prüfmatrix unten vollständig; offene Spezialfälle konkret ausgewiesen                                                          | offen                                    |

Die Kernanforderungen werden nicht auf eine spätere Phase abgeschoben: Die Originalfont-Probe ist vor dem grossen UI-Ausbau Pflicht. Bei scheiterndem Nachweis erst die Engine-/Schriftstrategie korrigieren; nicht einen scheinbar fertigen „Bearbeiten“-Modus veröffentlichen.

## 13. Prüfmatrix vor Produktfreigabe

- Vollständig eingebettete und nicht eingebettete Fonts, Subsets mit vorhandenem/fehlendem neuen Zeichen, Type1/TrueType/CFF/CID, Ligaturen/Umlaute, gemischte Schriften/Grössen, Tracking und manuelle Glyphenpositionen. RTL/vertikale Schriften als eigene Fälle, nicht ungeprüft versprechen.
- Mehrspaltige PDF, gedrehte Seiten/Textobjekte, CropBox-versetzt, gescannte Seite ohne Text, geschützte/beschädigte Datei; klare Möglichkeit weiter zu lesen/kommentieren, soweit zulässig/technisch möglich.
- Wörter/Sätze/Absatz ändern und löschen; neue Textfelder, Verschieben/Grösse, Überlauf, Rückgängig und Abbrechen. Unveränderte Regionen pixelgleich bei identischem Renderer/Scale; zweite unabhängige Engine erkennt Parser-/Darstellungsunterschiede.
- JPEG/PNG/Masken, wiederverwendete XObjects, Vektoren/Clips/Transparenzen: Ersetzen einer Platzierung darf andere Seiten nicht verändern.
- Jede Kommentarart, mehrere überlappende Kommentare, Antworten, Autoren, Erledigt, Ein-/Ausblenden/Filter; nach erneutem Öffnen und nach Seitenreihenfolgeänderung korrekt zugeordnet.
- Annotierte PDF in Adobe Reader und mindestens einem zweiten Reader öffnen; tatsächliche manuelle Prüfung protokollieren. Bibliotheks-Roundtrip ist kein Reader-Kompatibilitätsnachweis.
- Speichern/erneutes Öffnen/MKW-Portabilität, Tab-Konflikt, fehlende Schreibberechtigung, voller Speicher, Abbruch/Workerfehler, ersetzte/gelöschte Bilder und Bereinigung; Originaldatei bleibt bei Fehlversuchen nutzbar.
- Kommentar-Exportoptionen, Komprimierungsprofile, Textsuchbarkeit, Fonts, Tags/Links/Formulare und Originalseitenmasse. Fertige Byte-Vorschau entspricht dem Download.
- Tastatur, Fokus-Rückgabe, echte Screenreader, Kontrast in allen Themes, reduzierte Bewegung, Touch/Vergrösserung sowie schmale Fenster. Zeichenwerkzeuge haben soweit möglich numerische Alternativen.

**Noch nicht geprüft:** Es wurde für diesen Plan keine PDF-Engine eingebaut, kein Bearbeitungs-Prototyp ausgeführt und keine Adobe-Reader-Roundtrip-Prüfung behauptet. Die Produktfunktion beginnt erst mit der oben festgelegten Engine-/Font-Probe.
