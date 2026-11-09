# Sponsor QA asset

`sponsor-zkb.svg` is the original logo from https://www.zkb.ch/media/zkb/system/logo-zkb.svg . It is used only by import/render regression checks and the user-requested design examples. No sponsor association is configured by default. Other example marks are placeholders.

# InDesign-Quellprojekte (Planungsmeilenstein)

`indesign-projects.json` beschreibt drei deterministische Projekt-Rezepte für den künftigen Export: Designer-Typografie, zwei FD-Ausgabeformate mit transformiertem Bild und freie Seiten mit ausgeblendeten Objekten/Effekten. `tests/indesign-source-fixtures.cjs` erstellt daraus echte Studio-Projekte, validiert sie, speichert/liest MKW und stellt sie wieder her. Bildmaterial entsteht synthetisch im Test; Schriftdateien werden nicht dupliziert. Es sind keine IDML-Dateien und keine Belege für eine InDesign-Abnahme. Anforderungen und nächste Schritte: `docs/INDESIGN-EXPORT-ACCEPTANCE.md`.
