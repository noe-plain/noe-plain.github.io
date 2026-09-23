(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const s = { image:null, file:null, objectUrl:null, resize:false, width:300, height:600, zoom:1, panX:0, panY:0, drag:null, format:'webp', exporting:false, loading:false, items:[], selected:-1 };
  const maxPixels=24_000_000, golden=(3-Math.sqrt(5))/2;
  const size=()=>s.resize?{w:s.width,h:s.height}:{w:s.image.naturalWidth,h:s.image.naturalHeight};
  const prettyBytes=n=>n<1_000_000?`${(n/1000).toFixed(1)} KB`:`${(n/1_000_000).toFixed(2)} MB`;
  const nativeWebP=(()=>{try{let c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL('image/webp').startsWith('data:image/webp')}catch{return false}})();
  const supportsWebP=nativeWebP||!!window.MKWWebPCodec;
  const formats={webp:{label:'WebP',mime:'image/webp'},jpg:{label:'JPG',mime:'image/jpeg'}};
  const canExport=()=>s.format==='jpg'||supportsWebP;
  let codecPromise;
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
  function valid(){return Number.isInteger(s.width)&&Number.isInteger(s.height)&&s.width>0&&s.height>0&&s.width<=10000&&s.height<=10000&&s.width*s.height<=maxPixels}
  function updateSummary(){
    const count=s.items.length,label=formats[s.format].label;
    $('selectionCount').textContent=count;
    $('chooseLabel').textContent=count?'Auswahl ersetzen':'Bilder auswählen';
    $('selectionHint').textContent=count?'Eine neue Auswahl ersetzt die bisherigen Bilder.':'Dateien hierher ziehen oder auswählen.';
    $('workflowCount').textContent=count?`${count} ${count===1?'BILD':'BILDER'}`:'BILDER';
    $('exportSummary').textContent=count?`${count} ${count===1?'Bild':'Bilder'} · ${label} · ${s.resize?s.width+' × '+s.height+' px':'Originalmasse'}${count>1?' · ZIP-Download':''}`:'Wähle Bilder für den Export aus.';
  }
  function ready(){updateSummary(); $('downloadLabel').textContent=s.items.length>1?`${s.items.length} Bilder als ZIP herunterladen`:formats[s.format].label+' herunterladen'; $('download').disabled=s.loading||s.exporting||!s.image||!canExport()||(s.resize&&!valid());
    if(!canExport())status('Der lokale WebP-Encoder konnte nicht geladen werden. Bitte das gesamte Tool entpacken.',true);
    else if(s.resize&&!valid())status('Breite und Höhe: 1 bis 10 000 px; maximal 24 Megapixel.',true);
    else if(s.image){const {w,h}=size();status(`${w} × ${h} px · Bereit für ${formats[s.format].label}`)}else status('Wähle zuerst ein Bild aus.'); }
  function scale(){const {w,h}=size();return Math.max(w/s.image.naturalWidth,h/s.image.naturalHeight)*s.zoom}
  function clamp(){if(!s.resize){s.panX=s.panY=0;return}const {w,h}=size(),k=scale(),mx=Math.max(0,(s.image.naturalWidth*k-w)/2),my=Math.max(0,(s.image.naturalHeight*k-h)/2);s.panX=Math.min(mx,Math.max(-mx,s.panX));s.panY=Math.min(my,Math.max(-my,s.panY))}
  function paint(canvas,format=s.format){const ctx=canvas.getContext('2d'),{w,h}=size();ctx.clearRect(0,0,canvas.width,canvas.height);if(format==='jpg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)}ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(!s.resize){ctx.drawImage(s.image,0,0,canvas.width,canvas.height);return}clamp();const k=scale();ctx.save();ctx.scale(canvas.width/w,canvas.height/h);ctx.drawImage(s.image,(w-s.image.naturalWidth*k)/2+s.panX,(h-s.image.naturalHeight*k)/2+s.panY,s.image.naturalWidth*k,s.image.naturalHeight*k);ctx.restore()}
  function drawGuides(){const svg=$('guides'),type=s.resize?$('guideType').value:'none',p=type==='golden'?[golden*100,(1-golden)*100]:type==='thirds'?[100/3,200/3]:type==='center'?[50]:[];svg.hidden=!p.length;
    svg.innerHTML=p.map(v=>`<line x1="${v}" y1="0" x2="${v}" y2="100"/><line x1="0" y1="${v}" x2="100" y2="${v}"/>`).join('')+(type==='golden'?p.flatMap(x=>p.map(y=>`<circle cx="${x}" cy="${y}" r="0.55"/>`)).join(''):'');
    svg.querySelectorAll('line').forEach(e=>{e.setAttribute('stroke','#e9edff');e.setAttribute('stroke-opacity','0.83');e.setAttribute('stroke-width','1');e.setAttribute('vector-effect','non-scaling-stroke')});svg.querySelectorAll('circle').forEach(e=>{e.setAttribute('fill','#e9edff');e.setAttribute('stroke','#222a3b');e.setAttribute('stroke-width','0.25')})}
  function render(){if(!s.image)return;ready();if(s.resize&&!valid())return;const {w,h}=size(),factor=Math.min(1,940/w,650/h),c=$('previewCanvas');c.width=Math.max(1,Math.round(w*factor));c.height=Math.max(1,Math.round(h*factor));paint(c);drawGuides();$('previewBadge').textContent=s.resize?`${w} × ${h} PX`:'ORIGINALGRÖSSE';$('canvasHint').textContent=s.resize?'Bild ziehen, um den Ausschnitt zu verschieben. Hilfslinien werden nicht exportiert.':'Das Bild wird vollständig in seiner Originalgrösse konvertiert.';$('artworkFrame').classList.toggle('draggable',s.resize)}
  function mode(resize){s.items.forEach(item=>{item.zoom=1;item.panX=item.panY=0});s.resize=resize;s.zoom=1;s.panX=s.panY=0;s.drag=null;$('zoom').value=100;$('zoomValue').textContent='100 %';$('modeOriginal').classList.toggle('selected',!resize);$('modeOriginal').setAttribute('aria-pressed',String(!resize));$('modeResize').classList.toggle('selected',resize);$('modeResize').setAttribute('aria-pressed',String(resize));$('resizeControls').hidden=!resize;$('sizeExplanation').textContent=resize?'Zielgrösse und Bildausschnitt festlegen.':'Originalmasse beibehalten. Das Bild wird im gewählten Format exportiert.';render()}
  function setFormat(format){s.format=format;const label=formats[format].label;
    for(const [id,value] of [['formatWebp','webp'],['formatJpg','jpg']]){$(id).classList.toggle('selected',format===value);$(id).setAttribute('aria-pressed',String(format===value))}
    $('filenameExtension').textContent='.'+format;$('workflowFormat').textContent=label.toUpperCase();$('formatSummary').textContent='JPG / PNG / WEBP → '+label.toUpperCase();$('formatHint').textContent=format==='jpg'?'Transparente Flächen werden weiss.':'Transparenz bleibt erhalten.';ready();render();
  }
  $('formatWebp').addEventListener('click',()=>setFormat('webp'));$('formatJpg').addEventListener('click',()=>setFormat('jpg'));
  $('modeOriginal').addEventListener('click',()=>mode(false));$('modeResize').addEventListener('click',()=>mode(true));
  function dimensions(){s.items.forEach(item=>{item.panX=item.panY=0});s.width=Number($('targetWidth').value);s.height=Number($('targetHeight').value);s.panX=s.panY=0;render()}
  $('targetWidth').addEventListener('input',dimensions);$('targetHeight').addEventListener('input',dimensions);document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{const [w,h]=b.dataset.size.split('x').map(Number);$('targetWidth').value=w;$('targetHeight').value=h;dimensions()}));
  $('zoom').addEventListener('input',e=>{s.zoom=Number(e.target.value)/100;$('zoomValue').textContent=e.target.value+' %';render()});$('guideType').addEventListener('change',drawGuides);$('quality').addEventListener('input',e=>$('qualityValue').textContent=e.target.value+' %');
  const frame=$('artworkFrame');frame.addEventListener('pointerdown',e=>{if(!s.resize||!s.image||!valid())return;s.drag={x:e.clientX,y:e.clientY,px:s.panX,py:s.panY};frame.setPointerCapture(e.pointerId)});frame.addEventListener('pointermove',e=>{if(!s.drag||!s.resize)return;const rect=$('previewCanvas').getBoundingClientRect();s.panX=s.drag.px+(e.clientX-s.drag.x)*s.width/rect.width;s.panY=s.drag.py+(e.clientY-s.drag.y)*s.height/rect.height;render()});frame.addEventListener('pointerup',()=>s.drag=null);frame.addEventListener('pointercancel',()=>s.drag=null);
  function saveSelection(){const item=s.items[s.selected];if(item){item.zoom=s.zoom;item.panX=s.panX;item.panY=s.panY;item.name=$('filename').value}}
  function selectImage(index){
    saveSelection();s.selected=index;const item=s.items[index];
    s.image=item.image;s.file=item.file;s.zoom=item.zoom;s.panX=item.panX;s.panY=item.panY;s.drag=null;
    $('zoom').value=Math.round(s.zoom*100);$('zoomValue').textContent=$('zoom').value+' %';$('filename').value=item.name;
    $('sourceName').textContent=item.file.name;$('sourceMeta').textContent=`${s.image.naturalWidth} × ${s.image.naturalHeight} px · ${prettyBytes(item.file.size)} · ${s.items.length} Bild(er)`;
    $('previewTitle').textContent=item.file.name;$('previewPosition').textContent=`VORSCHAU · BILD ${index+1} VON ${s.items.length}`;$('thumbnailList').querySelectorAll('button').forEach((button,i)=>{button.classList.toggle('selected',i===index);button.setAttribute('aria-pressed',String(i===index))});$('sourceDetails').hidden=false;$('emptyState').hidden=true;$('previewState').hidden=false;render();
  }
  function renderThumbnails(){
    $('imageTray').hidden=!s.items.length;$('trayCount').textContent=`${s.items.length} ${s.items.length===1?'Bild':'Bilder'}`;
    $('thumbnailList').replaceChildren(...s.items.map((item,index)=>{
      const button=document.createElement('button');button.type='button';button.className='thumbnail';button.title=item.file.name;button.setAttribute('aria-label',`Bild ${index+1}: ${item.file.name}`);
      const img=document.createElement('img');img.src=item.url;img.alt='';
      const label=document.createElement('span');label.textContent=item.file.name;
      button.append(img,label);button.addEventListener('click',()=>selectImage(index));return button;
    }));
  }
  async function loadFiles(files){
    if(s.loading||s.exporting||!files.length)return;
    s.loading=true;ready();const items=[],errors=[];
    try{
      for(const file of files){
        status(`Lade ${file.name} …`);
        const supported=/^image\/(jpeg|png|webp)$/.test(file.type)||(!file.type&&/\.(jpe?g|png|webp)$/i.test(file.name));
        if(!supported){errors.push(`${file.name}: Dateiformat nicht unterstützt`);continue}
        const url=URL.createObjectURL(file),img=new Image();
        try{
          await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Bild konnte nicht gelesen werden'));img.src=url});
          if(!img.naturalWidth||!img.naturalHeight)throw Error('Keine lesbaren Pixel');
          if(img.naturalWidth*img.naturalHeight>maxPixels)throw Error('Mehr als 24 Megapixel');
          items.push({image:img,file,url,name:file.name.replace(/\.[^.]+$/,'')||'bild',zoom:1,panX:0,panY:0});
        }catch(error){URL.revokeObjectURL(url);errors.push(`${file.name}: ${error.message}`)}
      }
      if(items.length){
        s.items.forEach(item=>URL.revokeObjectURL(item.url));s.items=items;s.selected=-1;
        renderThumbnails();selectImage(0);
      }
    }finally{s.loading=false;ready();if(errors.length)status(errors.join(' · '),true)}
  }
  const input=$('fileInput');$('chooseMain').addEventListener('click',()=>input.click());$('chooseSide').addEventListener('click',()=>input.click());input.addEventListener('change',e=>{loadFiles(Array.from(e.target.files));input.value=''});
  const drop=$('dropArea');let dragDepth=0;drop.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;drop.classList.add('drag-active');$('dragOverlay').hidden=false});drop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});drop.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth){drop.classList.remove('drag-active');$('dragOverlay').hidden=true}});drop.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;drop.classList.remove('drag-active');$('dragOverlay').hidden=true;loadFiles(Array.from(e.dataTransfer.files))});
  async function fallbackWebP(canvas,quality){
    if(!codecPromise){
      codecPromise=(async()=>{const base64=window.MKWWebPWasm,raw=atob(base64),binary=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)binary[i]=raw.charCodeAt(i);const module=await window.MKWWebPCodec({wasmBinary:binary});window.MKWWebPWasm=null;return module})();
    }
    const module=await codecPromise, rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const pointer=module._malloc(rgba.length),sizePointer=module._malloc(4);
    if(!pointer||!sizePointer){if(pointer)module._free(pointer);if(sizePointer)module._free(sizePointer);throw Error('Zu wenig Speicher für dieses Bild.')}
    let output=0;
    try{module.HEAPU8.set(rgba,pointer);output=module._webp_encode_rgba(pointer,canvas.width,canvas.height,Math.round(quality*100),0,sizePointer);const length=module.HEAPU32[sizePointer>>>2];if(!output||!length)throw Error('WebP-Kodierung fehlgeschlagen.');return new Blob([module.HEAPU8.slice(output,output+length)],{type:'image/webp'})}
    finally{if(output)module._webp_free(output);module._free(pointer);module._free(sizePointer)}
  }
  async function encodeWebP(canvas,quality){
    if(nativeWebP){try{const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(Error('Leere Bildausgabe.')),'image/webp',quality));if(blob.type==='image/webp')return blob}catch{/* Use local encoder. */}}
    return fallbackWebP(canvas,quality);
  }
  async function encodeJPG(canvas,quality){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    if(!blob||blob.type!=='image/jpeg')throw Error('JPG-Kodierung fehlgeschlagen.');
    return blob;
  }
  // ZIP with stored entries: image formats are already compressed.
  async function zipFiles(files){
    const local=[],central=[];let offset=0,centralSize=0;
    for(const file of files){
      const data=new Uint8Array(await file.blob.arrayBuffer()),name=new TextEncoder().encode(file.name);
      let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
      const header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const entry=new Uint8Array(46+name.length),cv=new DataView(entry.buffer);
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);entry.set(header.subarray(4,30),6);cv.setUint32(42,offset,true);entry.set(name,46);
      local.push(header,data);central.push(entry);offset+=header.length+data.length;centralSize+=entry.length;
      if(offset+centralSize>0xffffffff||files.length>65535)throw Error('Die Auswahl ist zu gross für eine ZIP-Datei. Bitte weniger Bilder auswählen.');
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...local,...central,end],{type:'application/zip'});
  }
  $('download').addEventListener('click',async()=>{
    if(s.loading||s.exporting||!s.image||!canExport()||(s.resize&&!valid()))return;
    saveSelection();
    const format=s.format,quality=Number($('quality').value)/100,settings={resize:s.resize,width:s.width,height:s.height};
    const jobs=s.items.map(item=>({...item})),used=new Set(),files=[];
    s.exporting=true;$('download').disabled=true;$('downloadLabel').textContent='Bilder werden exportiert …';$('exportProgress').hidden=false;$('exportProgress').value=0;
    try{
      for(const [index,item] of jobs.entries()){
        status(`${formats[format].label}: Bild ${index+1} von ${jobs.length} wird erstellt …`);
        const canvas=document.createElement('canvas'),previous={...s};
        try{
          Object.assign(s,settings,{image:item.image,zoom:item.zoom,panX:item.panX,panY:item.panY});
          const {w,h}=size();canvas.width=w;canvas.height=h;
          if(canvas.width!==w||canvas.height!==h)throw Error('Diese Bildgrösse ist im Browser zu hoch.');
          paint(canvas,format);
        }finally{Object.assign(s,previous)}
        const blob=await (format==='jpg'?encodeJPG(canvas,quality):encodeWebP(canvas,quality));
        canvas.width=canvas.height=1;$('exportProgress').value=Math.round((index+1)/jobs.length*100);
        const base=(item.name.trim().replace(/\.(webp|jpe?g|png)$/i,'')||'bild').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');
        let name=base+'.'+format,suffix=2;while(used.has(name.toLowerCase()))name=base+'-'+suffix+++'.'+format;used.add(name.toLowerCase());files.push({name,blob});
      }
      if(files.length>1)status('ZIP wird erstellt …');
      const blob=files.length===1?files[0].blob:await zipFiles(files),name=files.length===1?files[0].name:'bilder-'+format+'.zip';
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
      status(`${name} · ${files.length} Bild(er) · ${prettyBytes(blob.size)}`);
    }catch(error){status(error.message||String(error),true)}
    finally{s.exporting=false;$('exportProgress').hidden=true;$('downloadLabel').textContent=s.items.length>1?`${s.items.length} Bilder als ZIP herunterladen`:formats[s.format].label+' herunterladen';$('download').disabled=s.loading||!s.image||!canExport()||(s.resize&&!valid())}
  });
  ready();
})();
