'use strict';
icons();
busy=true;
const startDialog=$('#startDialog');
startDialog.showModal();
startDialog.addEventListener('cancel',ev=>ev.preventDefault());
(async()=>{
 let saved=null,restoreError='';
 try{
  await MKWBrowser.init();
  try{saved=await MKWBrowser.saved();if(saved)validate(saved)}catch(e){saved=null;restoreError=e.message}
  for(const [role,name] of [['Replica LL','ReplicaLL-Bold.otf'],['Harriet Regular','Harrietv2Text-Regular.otf'],['Harriet','HarrietText-Bold.otf'],['Harriet Italic','HarrietText-BoldItalic.otf']]){
   const response=await fetch('static/fonts/'+name);if(!response.ok)throw Error('Schrift fehlt: '+name);
   p.fonts.push({role,name,data:await dataURL(await response.blob())});
  }
  await loadFonts();render();
  $('#startStatus').textContent=restoreError?'Letzter Stand nicht verfügbar: '+restoreError:saved?`${saved.meta.title||'Unbenanntes Projekt'} · ${saved.images.length} Bilder`:'Noch kein gespeichertes Projekt vorhanden.';
  $('#startContinue').disabled=!saved;
 }catch(e){$('#startStatus').textContent='Start nur eingeschränkt möglich: '+e.message}
 $('#startNew').disabled=$('#startOpen').disabled=false;
 $('#startOpen').onclick=()=>$('#projectFile').click();
 $('#startNew').onclick=()=>{
  // Keep the previous autosave until the new project is actually edited.
  const fonts=p.fonts;p=fresh();p.fonts=fonts;selected=null;history=[];future=[];revision=savedRevision=0;
  busy=false;startDialog.close();render();status('Neues Projekt · Bilder auswählen oder hierher ziehen.');
 };
 $('#startContinue').onclick=async()=>{
  $('#startNew').disabled=$('#startContinue').disabled=$('#startOpen').disabled=true;
  try{await restore(clone(saved));busy=false;startDialog.close();status('Dein letzter Stand ist wieder da.')}
  catch(e){$('#startStatus').textContent='Projekt konnte nicht geöffnet werden: '+e.message;$('#startNew').disabled=$('#startContinue').disabled=$('#startOpen').disabled=false}
 };
})();
