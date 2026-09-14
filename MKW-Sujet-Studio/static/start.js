'use strict';
icons();
(async()=>{try{
 token=(await(await fetch('/api/session')).json()).token;
 const saved=await(await fetch('/api/autosave')).json();
 if(saved){await restore(saved);status('Dein letzter Stand ist wieder da.')}else{
  const blob=await(await fetch('/fonts/ReplicaLL-Bold.otf')).blob();p.fonts.push({role:'Replica LL',name:'ReplicaLL-Bold.otf',data:await dataURL(blob)});await loadFonts();render();status('Bereit · Alles bleibt auf deinem Mac.');
 }
}catch(e){render();status('Wiederherstellung fehlgeschlagen: '+e.message);alert('Start / Wiederherstellung: '+e.message)}})();
