'use strict';
// The same encoded bytes drive the preview, size display and download.
let exportOptions={format:'jpg',quality:90,png8:false,colours:256,transparent:false},exportGeneration=0,previewTimer;
const exportCache=new Map();let exportCacheBytes=0,reviewIndex=0,reviewURL;
function clearExportCache(){for(const entry of exportCache.values())URL.revokeObjectURL(entry.url);exportCache.clear();exportCacheBytes=0}
function exportBytes(n){return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(1)} MB`}
function exportKey(b,settings){return JSON.stringify([revision,b,settings])}
function exportSettings(){return {...exportOptions,transparent:exportOptions.format!=='jpg'&&exportOptions.transparent}}
function encodePNG8(canvas,colours){return new Promise((resolve,reject)=>{
 const worker=new Worker('static/png-worker.js'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.buffer;
 const timer=setTimeout(()=>{worker.terminate();reject(Error('PNG-8 benötigt zu lange. Bitte weniger Pixel oder PNG ohne Farbreduktion verwenden.'))},120000);
 const finish=()=>{clearTimeout(timer);worker.terminate()};worker.onerror=()=>{finish();reject(Error('PNG-8 konnte nicht erstellt werden.'))};worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(new Blob([data.buffer],{type:'image/png'}))};worker.postMessage({pixels,width:canvas.width,height:canvas.height,colours},[pixels]);
})}
async function encodedBoard(b,settings){
 const key=exportKey(b,settings);if(exportCache.has(key))return exportCache.get(key);
 await document.fonts.ready;const c=makeCanvas(b.w,b.h);await paint(c.getContext('2d',{colorSpace:'srgb'}),b,1,{transparent:settings.transparent});
 const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[settings.format];
 const blob=settings.format==='png'&&settings.png8?await encodePNG8(c,settings.colours):await new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('Bild konnte nicht exportiert werden.')),mime,settings.quality/100));
 c.width=c.height=1;if(blob.type!==mime)throw Error('Dieses Bildformat wird von deinem Browser nicht unterstützt.');
 if(exportCache.has(key))return exportCache.get(key);
 const entry={blob,url:URL.createObjectURL(blob)};
 // Bound memory while keeping recent preview files ready for download.
 while(exportCacheBytes+blob.size>128*1024*1024&&exportCache.size){const oldest=exportCache.keys().next().value,old=exportCache.get(oldest);exportCacheBytes-=old.blob.size;URL.revokeObjectURL(old.url);exportCache.delete(oldest)}
 exportCache.set(key,entry);exportCacheBytes+=blob.size;return entry;
}
async function openExport(){
 if(!p.boards.length){status('Zuerst Bilder importieren.');return}
 const inferred=MKW.headingDate(p.boards.find(b=>b.imageId===p.images[0]?.id)?.elements.date.text||'');if(inferred)p.meta.date=inferred;
 exportOptions={format:'jpg',quality:90,png8:false,colours:256,transparent:false,...p.exportOptions};
 if(!['jpg','png','webp'].includes(exportOptions.format))exportOptions.format='jpg';
 exportOptions.quality=Math.max(10,Math.min(100,Number(exportOptions.quality)||90));if(![2,4,8,16,32,64,128,256].includes(exportOptions.colours))exportOptions.colours=256;
 $('#exportFields').innerHTML=field('Konzertdatum · TT.MM.JJ','date',p.meta.date,'text','placeholder="15.11.26"')+field('Projektkürzel','code',p.meta.code)+field('Projekttitel','title',p.meta.title)+field('Startnummer','start',p.meta.start,'number','min="0" step="1"');
 for(const key of ['date','code','title','start'])on(key,'input',ev=>{p.meta[key]=key==='start'?+ev.target.value:ev.target.value;revision++;clearTimeout(saveTimer);saveTimer=setTimeout(autosave,1200);updateExportNames()});
 $('#exportFormat').value=exportOptions.format;$('#exportQuality').value=exportOptions.quality;$('#png8').checked=exportOptions.png8;$('#pngColours').value=exportOptions.colours;$('#exportTransparent').checked=exportOptions.transparent;
 $('#exportNames').innerHTML=orderedBoards().map(b=>`<label class="export-card" data-id="${esc(b.id)}"><div class="export-preview checkerboard"><span>Vorschau wird berechnet …</span></div><input type="checkbox" data-export-id="${esc(b.id)}" ${b.checked?'checked':''}> <small>${MKW.ratio(b.w,b.h)} · ${b.w} × ${b.h} px</small><span class="export-name"></span><small class="export-size">Dateigrösse wird berechnet …</small></label>`).join('');
 $('#exportNames').onchange=ev=>{if(ev.target.dataset.exportId){p.boards.find(b=>b.id===ev.target.dataset.exportId).checked=ev.target.checked;changed(false);updateExportNames();updateExportTotal()}};
 $('#exportProgress').hidden=true;$('#exportDialog').showModal();syncExportSettings();updateExportNames();scheduleExportPreviews();
}
function syncExportSettings(){
 const jpg=exportOptions.format==='jpg',png=exportOptions.format==='png';$('#qualityField').hidden=png;$('#pngSettings').hidden=!png;$('#pngColoursField').hidden=!exportOptions.png8;$('#transparencyField').hidden=jpg;$('#qualityValue').textContent=exportOptions.quality+' %';$('#exportFormatHint').textContent=jpg?'JPG · deckender Hintergrund · sRGB':'Transparenz entfernt die Zeichenflächenfarbe. Fotos werden dadurch nicht freigestellt.';
}
function exportOptionsChanged(){
 exportOptions={format:$('#exportFormat').value,quality:+$('#exportQuality').value,png8:$('#png8').checked,colours:+$('#pngColours').value,transparent:$('#exportTransparent').checked};p.exportOptions={...exportOptions};revision++;clearTimeout(saveTimer);saveTimer=setTimeout(autosave,1200);syncExportSettings();updateExportNames();scheduleExportPreviews();
}
for(const id of ['exportFormat','png8','pngColours','exportTransparent'])$('#'+id).onchange=exportOptionsChanged;
$('#exportQuality').oninput=exportOptionsChanged;
function scheduleExportPreviews(){
 exportGeneration++;clearTimeout(previewTimer);const generation=exportGeneration;
 document.querySelectorAll('.export-size').forEach(el=>{el.textContent='Wird berechnet …';delete el.dataset.bytes});$('#exportTotal').textContent='Dateigrössen werden berechnet …';
 previewTimer=setTimeout(()=>refreshExportPreviews(generation),220);
}
async function refreshExportPreviews(generation){
 const settings=exportSettings();for(const b of orderedBoards()){
  if(generation!==exportGeneration||!$('#exportDialog').open)return;
  const cell=[...document.querySelectorAll('.export-card')].find(el=>el.dataset.id===b.id);if(!cell)continue;
  try{const entry=await encodedBoard(clone(b),settings);if(generation!==exportGeneration)return;const img=new Image();img.src=entry.url;img.alt=asset(b).name;cell.querySelector('.export-preview').replaceChildren(img);const size=cell.querySelector('.export-size');size.textContent='ca. '+exportBytes(entry.blob.size);size.dataset.bytes=entry.blob.size}
  catch(e){if(generation!==exportGeneration)return;cell.querySelector('.export-size').textContent=e.message}
  updateExportTotal();await new Promise(resolve=>setTimeout(resolve,0));
 }
}
function updateExportTotal(){let total=0,missing=0;for(const cell of document.querySelectorAll('.export-card'))if(cell.querySelector('input').checked){const bytes=cell.querySelector('.export-size').dataset.bytes;if(bytes===undefined)missing++;else total+=+bytes}$('#exportTotal').textContent=`Auswahl: ca. ${exportBytes(total)}${missing?' · weitere Grössen werden berechnet':''}`}
function updateExportNames(){
 let error='',names=[];const bs=orderedBoards().filter(b=>b.checked);try{names=MKW.names(p.meta,bs).map(name=>name.replace(/\.jpg$/,'.'+exportOptions.format));if(!bs.length)throw Error('Wähle mindestens ein Sujet.')}catch(e){error=e.message}
 exportPlan=error?[]:bs.map((b,i)=>({board:clone(b),name:names[i]}));
 document.querySelectorAll('.export-card').forEach(el=>{el.querySelector('.export-name').textContent=exportPlan.find(x=>x.board.id===el.dataset.id)?.name||'Nicht im Export'});
 $('#exportStatus').textContent=error||`${bs.length} Sujets bereit.`;$('#zip').disabled=$('#folder').disabled=!!error;$('#reviewExport').disabled=!bs.length;
}
function setExportProgress(done,total,text){
 const percent=total?Math.round(done/total*100):0;$('#exportProgress').hidden=false;$('#exportProgress').classList.toggle('is-running',done<total);$('#downloadProgress').value=done;$('#downloadProgress').max=total;$('#progressPercent').textContent=percent+' %';$('#progressText').textContent=text;
}
async function runExport(mode){
 if(busy||!exportPlan.length)return;busy=true;exportGeneration++;clearTimeout(previewTimer);const plan=clone(exportPlan),settings=exportSettings(),disabled=new Map();
 $('#exportDialog').querySelectorAll('input,select,button').forEach(el=>{disabled.set(el,el.disabled);el.disabled=true});const failures=[],items=[];let folder;
 try{
  if(mode==='folder')folder=await window.showDirectoryPicker({mode:'readwrite'});
  setExportProgress(0,plan.length,'Bilder werden vorbereitet …');
  for(const [i,x] of plan.entries()){
   setExportProgress(i,plan.length,`${i+1} / ${plan.length} · ${x.name}`);await new Promise(resolve=>setTimeout(resolve,20));
   try{const {blob}=await encodedBoard(x.board,settings);if(mode==='folder'){try{await folder.getFileHandle(x.name);throw Error('Datei existiert bereits.')}catch(e){if(e.name!=='NotFoundError')throw e}const handle=await folder.getFileHandle(x.name,{create:true}),stream=await handle.createWritable();try{await stream.write(blob);await stream.close()}catch(e){await stream.abort().catch(()=>{});throw e}}else items.push({name:x.name,bytes:new Uint8Array(await blob.arrayBuffer())})}
   catch(e){failures.push(`${x.name}: ${e.message}`)}
   setExportProgress(i+1,plan.length,`${i+1} / ${plan.length} verarbeitet`);
  }
  if(mode==='zip'&&items.length){setExportProgress(plan.length,plan.length+1,'ZIP wird zusammengestellt …');await new Promise(resolve=>setTimeout(resolve,20));download(MKWBrowser.zip(items),MKW.projectName(p.meta)+'_'+settings.format.toUpperCase()+'.zip')}
  const successes=plan.length-failures.length;$('#exportStatus').textContent=`${successes} von ${plan.length} Dateien ${mode==='zip'?'als ZIP an den Browser übergeben':'gespeichert'}.${failures.length?' '+failures.join(' · '):''}`;setExportProgress(plan.length,plan.length,failures.length?'Abgeschlossen mit Hinweisen':'Fertig · '+successes+' Dateien');status(`${successes} Bilder exportiert`);
 }catch(e){$('#exportStatus').textContent=e.name==='AbortError'?'Export abgebrochen.':e.message;$('#exportProgress').classList.remove('is-running')}
 finally{busy=false;for(const [el,value] of disabled)el.disabled=value;updateExportTotal();if($('#exportDialog').open)refreshExportPreviews(++exportGeneration)}
}
$('#closeExport').onclick=()=>{exportGeneration++;clearTimeout(previewTimer);$('#exportDialog').close();clearExportCache();step='text';renderPanel();updateDock();syncOverlays(true)};
$('#exportDialog').addEventListener('close',()=>{exportGeneration++;clearTimeout(previewTimer)});
$('#folder').hidden=!window.showDirectoryPicker;
function reviewBoards(){return orderedBoards().filter(b=>b.checked)}
async function showReview(){
 const boards=reviewBoards();if(!boards.length)return;reviewIndex=(reviewIndex+boards.length)%boards.length;const b=boards[reviewIndex],index=reviewIndex;
 document.querySelector('.review-stage').classList.toggle('checkerboard',exportSettings().transparent);
 $('#reviewPosition').textContent=`${index+1} / ${boards.length} · ${MKW.ratio(b.w,b.h)} · ${b.w} × ${b.h} px`;$('#reviewImage').hidden=true;$('#reviewMessage').textContent='Vorschau wird erstellt …';
 try{const {blob}=await encodedBoard(clone(b),exportSettings());if(index!==reviewIndex||!$('#reviewDialog').open)return;URL.revokeObjectURL(reviewURL);reviewURL=URL.createObjectURL(blob);$('#reviewImage').src=reviewURL;$('#reviewImage').alt=asset(b).name;$('#reviewImage').hidden=false;$('#reviewMessage').textContent=''}catch(e){$('#reviewMessage').textContent=e.message}
}
$('#reviewExport').onclick=()=>{reviewIndex=0;$('#reviewDialog').showModal();showReview()};
$('#reviewPrevious').onclick=()=>{reviewIndex--;showReview()};$('#reviewNext').onclick=()=>{reviewIndex++;showReview()};$('#closeReview').onclick=()=>$('#reviewDialog').close();
$('#reviewDialog').addEventListener('keydown',ev=>{if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();reviewIndex+=ev.key==='ArrowRight'?1:-1;showReview()}});
$('#reviewDialog').addEventListener('close',()=>{URL.revokeObjectURL(reviewURL);reviewURL=null;$('#reviewImage').removeAttribute('src')});
