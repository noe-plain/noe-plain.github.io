/*
  Ein neues Tool ergänzen: Einen weiteren Eintrag in die Liste unten setzen.
  Der Ordner muss neben index.html liegen und eine eigene index.html enthalten.
  Alle Karten und Kategorien werden daraus automatisch erstellt.
*/
window.MKW_TOOLS = [
  {
    id: 'studio',
    name: 'MKW Studio',
    description: 'Ein Tool um schnell und einfach Futuredemand-Kampagnen erstellen zu könen.',
    category: 'Gestalten',
    icon: 'studio',
    path: './studio/index.html',
    tags: ['Sujet', 'Social Media', 'Gestaltung']
  },
  {
    id: 'webp-konverter',
    name: 'WebP Konverter',
    description: 'JPG- und PNG-Bilder in WebP umwandeln. Auf Wunsch mit Resize und Bildausschnitt.',
    category: 'Optimieren',
    icon: 'image',
    path: './webp-konverter/index.html',
    tags: ['WebP', 'Resize', 'Bild']
  }
  // Beispiel für später:
  // ,{ id:'neues-tool', name:'Neues Tool', description:'Kurzbeschreibung.',
  //    category:'Gestalten', icon:'tool', path:'./neues-tool/index.html', tags:['Stichwort'] }
];
