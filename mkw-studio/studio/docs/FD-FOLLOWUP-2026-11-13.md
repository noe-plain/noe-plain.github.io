# FD-Kampagnen: Fortsetzung am 13. November 2026

## Umfang und Entscheidungen

- Der neue Modus heisst FD-Kampagnen, der alte bleibt als kleiner Link im Start-Footer links neben Hilfe erreichbar. Interne Moduskennungen bleiben für vorhandene Dateien unverändert.
- Alte FD-Browsersicherungen erhalten unter dem Papierkorb eine Umwandeln-Aktion. Bestätigung vor dem Öffnen; Abbrechen lässt den aktuellen Stand unverändert. Die Umwandlung verwendet eine eigene Projektidentität, einen konsistenten Snapshot und sichert das Original im Browser ohne Schreiben in seine lokale Datei. So bleibt es auch bei der Fünf-Projekte-Bereinigung aktuell.
- Titel werden je Ausgabe in EINEM bearbeitbaren Rahmen zusammengeführt, mit absoluten Schriftgrössen, Zeichenattributen, Absatzformatierung, Ausgangsabständen und optischen Grundlinien. Copyright bleibt wegen seiner separaten Drehung eine eigene Ebene. Der Textkontrast-Verlauf übernimmt dieselbe gemeinsame Geometrieberechnung wie der alte Renderer, Multiplizieren und 42 % Deckkraft.
- Werkzeuge haben ausschliesslich Icons; zugängliche Namen sowie Maus-/Fokushinweise bleiben erhalten. Fläche/Kontur und deren Tausch-/Ein-Aus-Aktionen bleiben gemeinsam in der Pille. Die beiden 24×24-px-Aktionen stehen übereinander rechts neben den Farbfeldern, mit semantischen Kontrastfarben und sichtbarem Fokus; die Werkzeugleiste bleibt 58 px hoch.
- Textübernahme liegt unmittelbar am aufgezogenen Feld statt in einem eigenen Dialog. Neue Eingabe links, bestehende Texte rechts; Escape und Klick ausserhalb brechen ohne Dokumentänderung ab. Tastaturfokus wird ohne Scrollsprung geführt.
- Shift+Enter verwendet Unicode-Zeilentrenner U+2028 innerhalb desselben Absatzes; Enter bleibt U+000A für neue Absätze. MKW erhält den unveränderten Quelltext. Umbruch, native Eingabe, Absatz-/Zeilenformatierung und direkte Auswahl verwenden dieselben Indizes.
- Auswahl auf der Fläche synchronisiert die Absatz-/Zeilenanzeige, ohne die direkte Zeichenformatierung auf ganze Absätze auszuweiten. Der freie Bereich rechts von Zeilen gehört zur Auswahlfläche. Einklappbare Zusatzoptionen stehen gesammelt unter den Hauptoptionen.
- Die Texteingabe erfolgt nur auf der Arbeitsfläche. Die Seitenleiste behält den sichtbaren Tastaturzugang „Auf der Fläche / Fertig“ und die Formatierung. Verborgene Textareas dienen vorläufig nur als interne Brücke für vorhandene Handler; sie sind weder sichtbar noch fokussierbar. Der direkte Einstieg stellt auch bei einem leeren Alt-FD-Text die ausgewählte Karte vor dem Fokussieren richtig.
- Familienkonzert im Farbwähler ist ein reversibler Schalter mit `aria-pressed` false/true/mixed und einer lesbaren Zustandsbeschreibung. Ausschalten setzt die bisherige normale Farbe wieder frei, ohne sie zu überschreiben. Zeichen-, Absatz- und Zeilenauswahl sowie globale Familien-Defaults werden respektiert; Copyright bleibt ausgenommen.
- Abdeckungswarnungen prüfen die echte Rahmenkontur inklusive Winkelrotation, zugeschnitten auf tatsächlich ausgegebene Seiten und gegebenenfalls den zugeordneten Bogen. Leerstellen ausserhalb und reine Kantenkontakte erzeugen keine Warnung. Sichtbare Leerstellen behalten die Warnung und die bisherige Reparaturaktion.

## Performance und Speicherung

Der vorhandene Renderer verwendet bereits kleine Vorschauen, sichtbare Regionen und unveränderte Originaldaten für Exporte. Die Scrollroutine hat dennoch pro Bildschritt einen vollständigen UI-/Vorschauaufbau angefordert. Jetzt wird der vorbereitete, über den Viewport hinausreichende Bereich bis zu seiner Sicherheitsgrenze wiederverwendet. Off-Artwork-Objekte werden bei Geometrieänderungen bestimmt; leere Aussenflächen werden beim Scrollen nicht erneut gelöscht/rasterisiert.

Bildkarten sind 230 CSS-Pixel breit, bleiben oben am Artwork ausgerichtet und verkleinern ihre Schrift beim Zoom nicht. Bei wenig Höhe scrollen ihre Inhalte lokal. Vorschaubilder werden erst beim Annähern an den Viewport geladen, aus demselben bestehenden Bildcache. Beobachter werden bei Neubau/Projektwechsel freigegeben.

Vor dem Neubau wird die tatsächliche Scrollposition desselben Projekts erfasst. Entfernte Viewports dürfen keine alten Scrollwerte zurückschreiben. Sidebar-Zentrierung nutzt Weltkoordinaten der Arbeitsfläche anstelle einer wechselnden Ausschnittsfläche; unveränderte Sidebar-Sichtbarkeit verursacht keinen zusätzlichen Neuaufbau. Bewusstes Einpassen/Seitenauswahl bleibt möglich.

Der bestehende binäre MKW-Schreiber und unveränderte Bildreferenzen bleiben erhalten. Gelöschte verknüpfte Ziele behalten nur den erforderlichen Löschmarker; unnötige Text-/Stilkopien werden entfernt. Keine neue JSON-/Base64-Gesamtdatei und keine zweite Speicherstruktur.

## Prüfung aus den Produktperspektiven

| Perspektive | Entscheidung und Prüfkriterium |
| --- | --- |
| Neue Nutzerin | Kein Vorschau-Zusatz, kleiner Backup-Link, klarer Umwandeln-Button und Textentscheidung direkt am betreffenden Feld. |
| Erfahrener Nutzer | Gepufferte Scrollregion, konstante Kartenbreite, Shift+Enter, gekoppelte Auswahl und bestandserhaltende Ansicht. Dokument, Undo und Ausgaben bleiben erhalten. |
| Senior UX | Primäre Eingabe vor Zusatzoptionen, keine springenden Bedienelemente und nachvollziehbare Positionierung statt eines zweiten Modals. |
| Barrierefreiheit | Sichtbare Text-/Mischzustände statt ausschliesslicher Farbinformation, zugängliche Namen und Fokus, native Texteingabe mit Tastatur. Der Scrollgriff hat einen eigenen, nicht überdeckten Bereich. |
| Entwicklerin/QA | Gemeinsames Polygon-Clipping, getrennte Umwandlungs-/Textauswahlmodule, Modell-/Browserfälle und 50-Bilder-Rezept. Stale Scroll-Ereignisse, Zeilenidentität, Altdateien ohne explizite Schutzzonen und unsichtbare Bildränder gezielt geprüft. |

Keine echte Persona-Studie oder manuelle Screenreader-Prüfung. Die kleinen synthetischen 50-Bilder-Rezepte sind keine Zusage für beliebige 50 hochauflösende Motive. Native Photoshop-/InDesign-Anwendungen wurden in dieser Fortsetzung nicht geprüft; bestehende Struktur-, Dateirundlauf- und Exportpixelprüfungen bleiben relevant.

## Material 3: Quellen und Abgrenzung

- Offizielle Icon-Button-Dokumentation: https://github.com/material-components/material-web/blob/main/docs/components/icon-button.md (kompakte Aktionen, zugängliche Namen, unterschiedliche Zustände/Varianten).
- Offizielle Menü-Dokumentation: https://github.com/material-components/material-web/blob/main/docs/components/menu.md (am Auslöser verankerte Auswahl und Tastaturverhalten).
- https://m3.material.io/components/toolbars/guidelines , https://m3.material.io/components/menus/guidelines , https://m3.material.io/components/cards/guidelines : offizielle Referenzen; deren Fliesstext war im Textabruf wegen JavaScript nicht verfügbar. Deshalb keine erfundenen Mass-/Animationsvorgaben daraus behaupten.

Die direkte Entscheidung im Textrahmen und die konstante Kartenbreite sind produktbezogene UX-Entscheidungen. Bestehende Tokens/Animationen und native HTML-Bedienung werden weiterverwendet, kein neues Framework eingeführt.

## Tatsächliche Nachweise (laufend aktualisieren)

Vor Veröffentlichung aktualisieren: Modell-/Format-/Build-Ergebnisse, Browserläufe und deren Grenzen. Der lokale Firefox-Testbrowser konnte in dieser Sitzung wegen eines Grafik-/Prozessinitialisierungsfehlers nicht zuverlässig starten. Vor dem Hauptzweig ist daher eine Firefox-Prüfung auf einem separaten GitHub-Prüfzweig erforderlich; ein nicht gestarteter Browser wird nicht als bestandene Prüfung ausgegeben.

Lokaler Zwischenstand: 193/193 Modell-/Dateitests, Format und Build bestanden. 17 gezielte Chrome-Suiten vor den letzten Text-/Farb-Anpassungen erfolgreich, darunter drei Editorabläufe für Softbreaks/Markierung/MKW, Umwandlung samt unverändertem Original, gemeinsamer formatierter Text (im geprüften Rezept pixelgleich), Verlauf (maximal ein 8-Bit-Rundungswert), sichtbare Bildabdeckung, Start/Öffnen, konsistente Werkzeugleisten, Inline-Darstellung und 42 axe-Kontexte. Weitere bestehende Prüfungen: grosse Originalbilder, inkrementelles natives Speichern, Viewport-Rendercache und Layout/Sidebar-Abmessungen.

Messrezept mit 50 synthetischen Fotos/100 Ausgaben: zehn kleine Scrollschritte erfordern keinen vollständigen Neuaufbau; Kartenidentität, Dokumentgeometrie und 230-Pixel-Breite bleiben erhalten. Ein vollständiger Bearbeitungs-Neuaufbau erhält die tatsächliche Scrollposition und den Zoom. Im bestehenden echten 50-Bilder-Speicherrezept wurden ca. 8,5 KB statt ca. 26 MB für eine Layoutänderung geschrieben. Diese Messungen gelten für die konkreten Rezepte und das Testgerät, nicht für jede Hardware/Datei.

Schlusspräzisierungen: Die Moduskennung der Projektübersicht wird aus den Dokumentmetadaten abgeleitet, damit alte Datensätze ohne aktuelle Modusbeschriftung korrekt erkannt werden, ohne Bilddaten zu laden. Alte Einträge sind als Backup gekennzeichnet. Eine abgeschlossene Umwandlung schliesst den Speicherdialog und passt bewusst die erste Bildreihe ein. Normale Änderungen im selben Projekt behalten dagegen die aktuelle Ansicht. Leere Aussenflächen benötigen keine grosse transparente Zeichenfläche; die dafür verwendete Zusatzfläche ist dann ausgeblendet und auf einen Pixel freigegeben.

Letzte gezielte Chrome-Prüfung: Familien-Ein/Aus und gemischte Auswahl in Designer, neuem FD und Backup, einschliesslich aktivem Familien-Design und Wiederherstellung der ursprünglichen Farbe; Softbreaks, direkte Markierung und Datei-Rundlauf; alle umgestellten Text-Tests. Drei bei der Umstellung gefundene Fehler wurden korrigiert: versteckter leerer Text wegen nicht synchronisierter Kartenauswahl, ein Test mit doppeltem Bearbeiten-Klick und ein Test, der beim simulierten Anhängen fälschlich den gesamten formatierten Text ersetzte. Die ursprünglichen Ergebnis-/Formatierungsprüfungen bleiben erhalten. Vollständiger Chrome-Lauf und GitHub-Firefox stehen zum Zeitpunkt dieser Notiz noch aus.

Vollständiger lokaler Chrome-Lauf: 105/106 Suiten erfolgreich. Der eine Fehler war eine doppelt sichtbare Kontur beim Aktivieren der direkten Textbearbeitung eines alten Familienkonzerts. Die native Textebene übernimmt Auswahl/Caret, das Canvas bleibt die sichtbare Darstellung; deshalb wird bei aktivem Canvas auch die native Konturfarbe transparent gesetzt (Kompositionseingabe bleibt ausgenommen). Zusätzliche Prüfung über die Farbfelder der Werkzeugleiste statt nur den Textfarbe-Button bestanden. Der vollständige GitHub-Lauf prüft den abschliessenden Stand erneut.

Freigabeentscheidung: Der Nutzer hat anschliessend erlaubt, nach erfolgreichen Chromium-Checks bereits zu veröffentlichen; Firefox darf parallel fertiglaufen. Testzweig `studio/fd-editing-2026-11-13`, aktuelle Läufe: https://github.com/noe-plain/noe-plain.github.io/actions?query=branch%3Astudio%2Ffd-editing-2026-11-13 . Historische Zwischenstände mit einem später korrigierten Inline-Fehler sind kein Nachweis für die letzte Version.

Abschliessende lokale Wiederholung: Inline-Fidelity, Familienfarben (einschliesslich Toolbar-Zugang), direkte Texteingabe und Softbreaks: 4/4 Suiten bestanden. Der ursprünglich fehlgeschlagene Pixelvergleich besteht ohne Lockerung seiner Assertions. Modelltests weiterhin 193/193; Format und Build bestanden.
