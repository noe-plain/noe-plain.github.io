var previousDialogs=app.displayDialogs;
var previousDoc=app.documents.length?app.activeDocument:null;
var doc=null;
try {
 app.displayDialogs=DialogModes.NO;
 doc=app.open(new File('/private/tmp/mkw-v2.psd'));
 var lines=['Opened: '+doc.name,'Size: '+doc.width.as('px')+'x'+doc.height.as('px'),'Groups: '+doc.layerSets.length];
 for(var i=0;i<doc.layerSets.length;i++){
  var group=doc.layerSets[i];var ref=new ActionReference();ref.putIdentifier(charIDToTypeID('Lyr '),group.id);var desc=executeActionGet(ref);lines.push('Artboard enabled: '+(desc.hasKey(stringIDToTypeID('artboardEnabled'))&&desc.getBoolean(stringIDToTypeID('artboardEnabled'))));lines.push('Group: '+group.name+' / '+group.artLayers.length+' layers');
  for(var j=0;j<group.artLayers.length;j++){var l=group.artLayers[j];lines.push('  '+l.name+' | '+l.kind);}
 }
 var options=new PNGSaveOptions();doc.saveAs(new File('/private/tmp/mkw-photoshop-render.png'),options,true,Extension.LOWERCASE);
 var out=new File('/private/tmp/mkw-photoshop-report.txt');out.encoding='UTF8';out.open('w');out.write(lines.join('\n'));out.close();
} catch(e) {
 var out=new File('/private/tmp/mkw-photoshop-report.txt');out.encoding='UTF8';out.open('w');out.write('ERROR: '+e.message);out.close();
} finally {
 if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);
 app.displayDialogs=previousDialogs;
 if(previousDoc)app.activeDocument=previousDoc;
}
