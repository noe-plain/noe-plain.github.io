(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const s = { image:null, file:null, objectUrl:null, resize:false, width:300, height:600, zoom:1, panX:0, panY:0, drag:null };
  const maxPixels=24_000_000, golden=(3-Math.sqrt(5))/2;
  const size=()=>s.resize?{w:s.width,h:s.height}:{w:s.image.naturalWidth,h:s.image.naturalHeight};
  const prettyBytes=n=>n<1_000_000?`${(n/1000).toFixed(1)} KB`:`${(n/1_000_000).toFixed(2)} MB`;
  const nativeWebP=(()=>{try{let c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL('image/webp').startsWith('data:image/webp')}catch{return false}})();
  const supportsWebP=nativeWebP||!!window.MKWWebPCodec;
  let codecPromise;
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
  function valid(){return Number.isInteger(s.width)&&Number.isInteger(s.height)&&s.width>0&&s.height>0&&s.width<=10000&&s.height<=10000&&s.width*s.height<=maxPixels}
  function ready(){ $('download').disabled=!s.image||!supportsWebP||(s.resize&&!valid());
    if(!supportsWebP)status('Der lokale WebP-Encoder konnte nicht geladen werden. Bitte das gesamte Tool entpacken.',true);
    else if(s.resize&&!valid())status('Breite und Höhe: 1 bis 10 000 px; maximal 24 Megapixel.',true);
    else if(s.image){const {w,h}=size();status(`${w} × ${h} px · Bereit für WebP`)} }
  function scale(){const {w,h}=size();return Math.max(w/s.image.naturalWidth,h/s.image.naturalHeight)*s.zoom}
  function clamp(){if(!s.resize){s.panX=s.panY=0;return}const {w,h}=size(),k=scale(),mx=Math.max(0,(s.image.naturalWidth*k-w)/2),my=Math.max(0,(s.image.naturalHeight*k-h)/2);s.panX=Math.min(mx,Math.max(-mx,s.panX));s.panY=Math.min(my,Math.max(-my,s.panY))}
  function paint(canvas){const ctx=canvas.getContext('2d'),{w,h}=size();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(!s.resize){ctx.drawImage(s.image,0,0,canvas.width,canvas.height);return}clamp();const k=scale();ctx.save();ctx.scale(canvas.width/w,canvas.height/h);ctx.drawImage(s.image,(w-s.image.naturalWidth*k)/2+s.panX,(h-s.image.naturalHeight*k)/2+s.panY,s.image.naturalWidth*k,s.image.naturalHeight*k);ctx.restore()}
  function drawGuides(){const svg=$('guides'),type=s.resize?$('guideType').value:'none',p=type==='golden'?[golden*100,(1-golden)*100]:type==='thirds'?[100/3,200/3]:type==='center'?[50]:[];svg.hidden=!p.length;
    svg.innerHTML=p.map(v=>`<line x1="${v}" y1="0" x2="${v}" y2="100"/><line x1="0" y1="${v}" x2="100" y2="${v}"/>`).join('')+(type==='golden'?p.flatMap(x=>p.map(y=>`<circle cx="${x}" cy="${y}" r="0.55"/>`)).join(''):'');
    svg.querySelectorAll('line').forEach(e=>{e.setAttribute('stroke','#e9edff');e.setAttribute('stroke-opacity','0.83');e.setAttribute('stroke-width','1');e.setAttribute('vector-effect','non-scaling-stroke')});svg.querySelectorAll('circle').forEach(e=>{e.setAttribute('fill','#e9edff');e.setAttribute('stroke','#222a3b');e.setAttribute('stroke-width','0.25')})}
  function render(){if(!s.image)return;ready();if(s.resize&&!valid())return;const {w,h}=size(),factor=Math.min(1,940/w,650/h),c=$('previewCanvas');c.width=Math.max(1,Math.round(w*factor));c.height=Math.max(1,Math.round(h*factor));paint(c);drawGuides();$('previewBadge').textContent=s.resize?`${w} × ${h} PX`:'ORIGINALGRÖSSE';$('canvasHint').textContent=s.resize?'Bild ziehen, um den Ausschnitt zu verschieben. Hilfslinien werden nicht exportiert.':'Das Bild wird vollständig in seiner Originalgrösse konvertiert.';$('artworkFrame').classList.toggle('draggable',s.resize)}
  function mode(resize){s.resize=resize;s.zoom=1;s.panX=s.panY=0;s.drag=null;$('zoom').value=100;$('zoomValue').textContent='100 %';$('modeOriginal').classList.toggle('selected',!resize);$('modeOriginal').setAttribute('aria-pressed',String(!resize));$('modeResize').classList.toggle('selected',resize);$('modeResize').setAttribute('aria-pressed',String(resize));$('resizeControls').hidden=!resize;$('sizeExplanation').textContent=resize?'Zielgrösse und Bildausschnitt festlegen.':'Originalmasse beibehalten. Das Bild wird nur in WebP konvertiert.';render()}
  $('modeOriginal').addEventListener('click',()=>mode(false));$('modeResize').addEventListener('click',()=>mode(true));
  function dimensions(){s.width=Number($('targetWidth').value);s.height=Number($('targetHeight').value);s.panX=s.panY=0;render()}
  $('targetWidth').addEventListener('input',dimensions);$('targetHeight').addEventListener('input',dimensions);document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{const [w,h]=b.dataset.size.split('x').map(Number);$('targetWidth').value=w;$('targetHeight').value=h;dimensions()}));
  $('zoom').addEventListener('input',e=>{s.zoom=Number(e.target.value)/100;$('zoomValue').textContent=e.target.value+' %';render()});$('guideType').addEventListener('change',drawGuides);$('quality').addEventListener('input',e=>$('qualityValue').textContent=e.target.value+' %');
  const frame=$('artworkFrame');frame.addEventListener('pointerdown',e=>{if(!s.resize||!s.image||!valid())return;s.drag={x:e.clientX,y:e.clientY,px:s.panX,py:s.panY};frame.setPointerCapture(e.pointerId)});frame.addEventListener('pointermove',e=>{if(!s.drag||!s.resize)return;const rect=$('previewCanvas').getBoundingClientRect();s.panX=s.drag.px+(e.clientX-s.drag.x)*s.width/rect.width;s.panY=s.drag.py+(e.clientY-s.drag.y)*s.height/rect.height;render()});frame.addEventListener('pointerup',()=>s.drag=null);frame.addEventListener('pointercancel',()=>s.drag=null);
  async function load(file){if(!file)return;const supported=/^image\/(jpeg|png)$/.test(file.type)||(!file.type&&/\.(jpe?g|png)$/i.test(file.name));if(!supported){status('Bitte eine JPG-, JPEG- oder PNG-Datei auswählen.',true);return}const url=URL.createObjectURL(file),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Bild konnte nicht gelesen werden.'));img.src=url});if(!img.naturalWidth||!img.naturalHeight)throw Error('Das Bild enthält keine lesbaren Pixel.');if(img.naturalWidth*img.naturalHeight>maxPixels)throw Error('Das Bild überschreitet 40 Megapixel.');if(s.objectUrl)URL.revokeObjectURL(s.objectUrl);s.image=img;s.file=file;s.objectUrl=url;s.zoom=1;s.panX=s.panY=0;$('zoom').value=100;$('zoomValue').textContent='100 %';$('filename').value=file.name.replace(/\.[^.]+$/,'')||'bild';$('sourceName').textContent=file.name;$('sourceMeta').textContent=`${img.naturalWidth} × ${img.naturalHeight} px · ${prettyBytes(file.size)} · ${file.type==='image/png'?'PNG':'JPG'}`;$('previewTitle').textContent=file.name;$('sourceDetails').hidden=false;$('emptyState').hidden=true;$('previewState').hidden=false;render()}catch(error){URL.revokeObjectURL(url);status(error.message,true)}}
  const input=$('fileInput');$('chooseMain').addEventListener('click',()=>input.click());$('chooseSide').addEventListener('click',()=>input.click());input.addEventListener('change',e=>{load(e.target.files[0]);input.value=''});
  const drop=$('dropArea');let dragDepth=0;drop.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;drop.classList.add('drag-active');$('dragOverlay').hidden=false});drop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});drop.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth){drop.classList.remove('drag-active');$('dragOverlay').hidden=true}});drop.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;drop.classList.remove('drag-active');$('dragOverlay').hidden=true;load(e.dataTransfer.files[0])});
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
  $('download').addEventListener('click',async()=>{if(!s.image||(s.resize&&!valid()))return;const button=$('download');button.disabled=true;status('WebP wird erstellt …');try{const {w,h}=size(),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;if(canvas.width!==w||canvas.height!==h)throw Error('Diese Bildgrösse ist im Browser zu hoch.');paint(canvas);const blob=await encodeWebP(canvas,Number($('quality').value)/100);const name=($('filename').value.trim()||'bild').replace(/\.webp$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+'.webp',url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);status(`${name} · ${w} × ${h} px · ${prettyBytes(blob.size)}`)}catch(error){status(error.message||String(error),true)}finally{button.disabled=false}});
  ready();
})();
