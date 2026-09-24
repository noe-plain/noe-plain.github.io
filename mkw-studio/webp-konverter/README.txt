Musikkollegium Winterthur · Bild Studio
======================================

Öffne index.html in Safari, Firefox oder Chrome.
Das Tool läuft lokal und benötigt keine Internetverbindung.

Schritt 1: Bilder bearbeiten
---------------------------
Eine oder mehrere JPG-, JPEG-, PNG- oder WebP-Dateien auswählen oder auf die
Arbeitsfläche ziehen. Eine neue Auswahl ersetzt die bisherigen Bilder.
Jedes Bild erhält eine eigene Zeichenfläche, alle werden gleichzeitig angezeigt.

Ein Bild über seine Zeichenfläche auswählen. Die Einstellungen rechts gelten
nur für dieses Bild. „Original“ erhält seine Originalmasse. „Resize“ erlaubt,
die ausgewählte Zeichenfläche über Breite und Höhe anzupassen.
Mit „Zeichenfläche hinzufügen“ oder einem Grössen-Preset können weitere
Zeichenflächen für genau dieses Bild erstellt werden. Andere Bilder behalten
ihre eigenen Grössen und Einstellungen. Mindestens eine Zeichenfläche bleibt
pro Bild bestehen. Doppelte Zielgrössen innerhalb desselben Bildes verhindern
den Export; gleiche Grössen bei unterschiedlichen Bildern sind erlaubt.

Jede Zeichenfläche besitzt ihren eigenen Ausschnitt und Zoom. Zum Bearbeiten
auswählen und direkt im Bild ziehen oder die Pfeiltasten verwenden (mit
Umschalttaste in 10-Pixel-Schritten). „Ausschnitt zurücksetzen“ setzt nur diese
Zeichenfläche zurück. Änderungen ihrer Abmessungen setzen ebenfalls nur ihren
Ausschnitt zurück. „Original“ blendet zusätzliche Resize-Zeichenflächen dieses
Bildes vorübergehend aus; der Wechsel zurück zu „Resize“ stellt sie wieder her.
Hilfslinien dienen nur der Bearbeitung und werden nicht exportiert.

Der Basisdateiname gilt für alle Zeichenflächen des ausgewählten Bildes.
Die tatsächlichen Ausgabenamen werden direkt unter den Zeichenflächen gezeigt.

Schritt 2: Export
----------------
Über die Workflow-Leiste „Export“ öffnen. Erst hier werden Format, Qualität,
Ausgabeübersicht und Download angezeigt. Die Übersicht zeigt alle Dateien
ohne Hilfslinien. Über „Bilder bearbeiten“ lassen sich die Einstellungen ändern;
Grössen, Namen und Ausschnitte bleiben beim Schrittwechsel erhalten.

WebP oder JPG und die Qualität gelten für alle Ausgaben. Eine Datei wird
direkt heruntergeladen, mehrere gemeinsam als ZIP. Jede sichtbare Zeichenfläche
ergibt eine Datei; es werden keine zusätzlichen Grössen auf andere Bilder
übertragen. Der Export verwendet genau die angegebenen Pixelmasse.

Web-safe Dateinamen
------------------
Resize-Dateien enthalten immer ihre Grösse, beispielsweise:
  sommerkonzert-300x600.webp
  sommerkonzert-600x500.webp
Erlaubt sind Kleinbuchstaben, Zahlen, Bindestriche und die Dateiendung.
Umlaute werden umgeschrieben (ä → ae, ö → oe, ü → ue, ß → ss), Akzente entfernt
und Leerzeichen/Sonderzeichen durch Bindestriche ersetzt. Leere Namen erhalten
„bild“. Kollisionen erhalten eine Nummer vor der Grösse. Namen in der Vorschau
und im Export stimmen überein.

Transparenz bleibt in WebP erhalten; bei JPG werden transparente Flächen weiss.
Der enthaltene lokale WebP-Encoder übernimmt, falls der Browser WebP nicht
selbst ausgeben kann. Der Ausgabetyp wird geprüft. Pro Bild bzw. Zielgrösse
sind maximal 24 Megapixel erlaubt (Zielseiten maximal 10 000 Pixel).

Lizenztexte für den mitgelieferten WebP-Encoder: assets/LICENSES.txt.

Arbeitsflächen-Zoom und Exportauswahl
------------------------------------
Die Seitenleiste füllt die Höhe zwischen Kopf- und Fussleiste. Werkzeuge und
Arbeitsfläche lassen sich unabhängig scrollen. Der Ansichtszoom (25–200 %)
vergrössert oder verkleinert nur die Zeichenflächen. Beschriftungen und
Bildleisten behalten ihre Schriftgrösse. Die Startansicht ist grösser. Er verändert
weder Bildzuschnitte noch Exportmasse. Klick auf den Prozentwert setzt 100 %.

Der Export öffnet ein Fenster mit Formatwahl, Qualität und Vorschaukarten.
Per Checkbox oder „Alle“/„Keine“ auswählen, welche Zeichenflächen exportiert
werden. Eine ausgewählte Datei wird direkt, mehrere als ZIP heruntergeladen.
Das Kreuz oder Escape führt zur Bearbeitung zurück. Während des Exports ist
das Schliessen gesperrt. Alle Bilder bleiben lokal im Browser.

Jede Bildleiste enthält ein eigenes Feld für den Exportnamen. Der Name gilt
für alle Zeichenflächen dieses Bildes. Darunter stehen die tatsächlichen
web-safe Dateinamen mit Grössen. „Originalname“ stellt den ursprünglichen
Basisnamen wieder her. Das Namensfeld in der Seitenleiste bleibt synchron.
