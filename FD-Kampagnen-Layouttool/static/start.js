'use strict';
icons();
(async()=>{try{
 await MKWBrowser.init();
 let saved=null,restoreError='';
 try{saved=await MKWBrowser.saved();if(saved)await restore(saved)}catch(e){restoreError=e.message}
 for(const [role,name] of [['Replica LL','ReplicaLL-Bold.otf'],['Harriet Regular','Harrietv2Text-Regular.otf'],['Harriet','HarrietText-Bold.otf'],['Harriet Italic','HarrietText-BoldItalic.otf']])if(!p.fonts.some(f=>f.role===role)){const response=await fetch('static/fonts/'+name);if(!response.ok)throw Error('Schrift fehlt: '+name);p.fonts.push({role,name,data:await dataURL(await response.blob())})}
 await loadFonts();render();status(restoreError?'Wiederherstellung fehlgeschlagen: '+restoreError:saved?'Dein letzter Stand ist wieder da.':'Bereit · Bilder bleiben auf deinem Gerät.');
}catch(e){render();status('Start fehlgeschlagen: '+e.message);alert('Start: '+e.message)}})();
