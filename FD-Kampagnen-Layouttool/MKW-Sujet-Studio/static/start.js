'use strict';
icons();
(async()=>{try{
 token=(await(await fetch('/api/session')).json()).token;
 const saved=await(await fetch('/api/autosave')).json();
 if(saved)await restore(saved);
 for(const [role,name] of [['Replica LL','ReplicaLL-Bold.otf'],['Harriet Regular','Harrietv2Text-Regular.otf'],['Harriet','HarrietText-Bold.otf'],['Harriet Italic','HarrietText-BoldItalic.otf']])if(!p.fonts.some(f=>f.role===role)){const blob=await(await fetch('/fonts/'+name)).blob();p.fonts.push({role,name,data:await dataURL(blob)})}
 await loadFonts();render();status(saved?'Dein letzter Stand ist wieder da.':'Bereit · Alles bleibt auf deinem Mac.');
}catch(e){render();status('Wiederherstellung fehlgeschlagen: '+e.message);alert('Start / Wiederherstellung: '+e.message)}})();
