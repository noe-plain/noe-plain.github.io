# Textüberarbeitung – GitHub-Nachkontrolle

Die Veröffentlichung von `7a3a6cb` war erfolgreich; der GitHub-Testlauf 41041180018 schlug in beiden Browsern bei zwei Prüfungen fehl.

1. **Produktfehler:** Nach der Winkelbearbeitung konnte die einfache Textansicht den internen Schlüssel `postAngle` übernehmen. Der Fallback war nur in Advanced vollständig. Beide Textansichten normalisieren jetzt vor dem Aufbau auf einen gültigen Texttyp. Die Material-Motion-Prüfung bleibt unverändert und besteht danach.
2. **Geänderte, beabsichtigte Bedienung:** Der alte Carousel-Test erwartete beim erneuten Öffnen automatisch das Textende. Die neue Textbearbeitung erhält die Auswahl. Der Test versetzt jetzt ausdrücklich die Einfügemarke ans Ende, prüft deren Position und weiterhin Anhängen/Undo. Zusätzlich prüft der gemeinsame Texttest den anderen Fall: Eingabe ersetzt exakt die erhaltene Markierung; Undo stellt den Text wieder her. Keine Behauptung eines korrigierten Datenverlusts, wo die Auswahl korrekt arbeitete.

Firefox und Chromium: jeweils 3/3 (`text-editing`, `material-motion`, `carousel-refinements`) erfolgreich. Format/Build und Unit-Tests erfolgreich. Der anschliessende vollständige GitHub-Lauf wird separat kontrolliert. Diese Korrektur verändert keine Dateiformate, Layoutwerte oder Exportgeometrie.
