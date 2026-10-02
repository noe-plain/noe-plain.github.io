'use strict';
let carouselSelection=null,carouselZoom=.35,carouselDraw=0,carouselMode='post';
const carouselActive=()=>!!p.carousel;
function carouselSetup(){
 const host=document.createElement('div');host.className='mode-buttons';host.innerHTML='<button data-project-mode="post" aria-pressed="true">Einzelposts</button><button data-project-mode="carousel" aria-pressed="false">Carousel</button>';$('#projectSetup .dialog-heading').after(host);
 const input=(id,label,value,min=0,max=4000)=>`<label>${label} (px)<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="1"></label>`;
 const options=document.createElement('section');options.id='carouselSetup';options.hidden=true;options.innerHTML=`
 <fieldset class="format-choice carousel-format-choice"><legend><span id="carouselFormatRatio">4:5</span> · Carousel</legend><div class="format-row"><div class="format-dimensions"><h4>Arbeitsfläche pro Slide</h4><div class="format-fields">${input('cw','Breite',1080,240)}${input('ch','Höhe',1350,240)}</div><small>Texthilfslinien: 100 px vom Slide-Rand</small></div><div class="safezone-editor"><div class="safe-preview" id="carouselSafePreview"><div class="safe-preview-inner sixths"><span>Safezone</span></div></div><div class="safe-input safe-top">${input('ct','Oben',100)}</div><div class="safe-input safe-bottom">${input('cb','Unten',100)}</div></div></div><div class="carousel-outer-margins"><span>Safezone für das gesamte Artwork</span><div class="format-fields">${input('cl','Links',100)}${input('cr','Rechts',100)}</div></div></fieldset>
 <fieldset class="format-choice carousel-slides-choice"><legend>Slides aneinanderreihen</legend><div class="carousel-slide-count"><label>Anzahl<input id="cn" type="number" value="4" min="2" max="20" step="1"></label><div><strong id="carouselArtworkSize"></strong><small>2–20 Slides · gemeinsame Montagefläche</small></div></div><div id="carouselSetupStrip" aria-label="Vorschau der Slide-Anordnung"></div><p>Bilder dürfen über die Slide-Grenzen laufen. Für Texte erscheinen Hinweise beim Überschreiten. Safezone und Sechstelraster helfen beim Ausrichten.</p></fieldset>`;$('#formatChoices').before(options);
 const refresh=()=>{const w=+$('#cw').value,h=+$('#ch').value,n=+$('#cn').value,top=+$('#ct').value,bottom=+$('#cb').value,left=+$('#cl').value,right=+$('#cr').value;const preview=$('#carouselSafePreview');preview.style.aspectRatio=`${Math.max(1,w)}/${Math.max(1,h)}`;preview.style.setProperty('--top',Math.min(95,top/Math.max(1,h)*100)+'%');preview.style.setProperty('--bottom',Math.min(95,bottom/Math.max(1,h)*100)+'%');$('#carouselFormatRatio').textContent=w>0&&h>0?MKW.ratio(w,h).replace('x',':'):'Eigenes Format';$('#carouselArtworkSize').textContent=`${w*n} × ${h} px gesamt`;$('#carouselSetupStrip').innerHTML=Array.from({length:Math.max(0,Math.min(20,n||0))},(_,i)=>`<div style="aspect-ratio:${Math.max(1,w)}/${Math.max(1,h)}"><span>${i+1}</span><i style="top:${Math.min(95,top/Math.max(1,h)*100)}%;bottom:${Math.min(95,bottom/Math.max(1,h)*100)}%;left:${(i===0?left:100)/Math.max(1,w)*100}%;right:${(i===n-1?right:100)/Math.max(1,w)*100}%"></i></div>`).join('');options.querySelector('.format-choice').classList.toggle('invalid',top+bottom>=h||left+right>=w||w<240||h<240);};options.querySelectorAll('input').forEach(el=>el.oninput=refresh);refresh();
 const intro=$('#formatChoices').previousElementSibling===options?options.previousElementSibling:null;const postIntro=intro?.textContent;
 host.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{carouselMode=btn.dataset.projectMode;host.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===btn));$('#carouselSetup').hidden=carouselMode!=='carousel';$('#formatChoices').hidden=carouselMode==='carousel';$('#addFormat').hidden=carouselMode==='carousel';$('#projectSetup .setup-actions').classList.toggle('carousel-setup-actions',carouselMode==='carousel');if(intro&&postIntro)intro.textContent=carouselMode==='carousel'?'Bestimme Format, Safezone und Anzahl der Slides. Alle Slides bilden eine gemeinsame Montagefläche.':postIntro;refresh()});
 const create=$('#createProject').onclick;$('#createProject').onclick=async()=>{if(carouselMode!=='carousel')return create();const w=+$('#cw').value,h=+$('#ch').value,n=+$('#cn').value,top=+$('#ct').value,bottom=+$('#cb').value,left=+$('#cl').value,right=+$('#cr').value;
 if(!$('#setupName').value.trim()||![w,h,n,top,bottom,left,right].every(Number.isInteger)||w<240||h<240||w>4000||h>4000||n<2||n>20||Math.min(top,bottom,left,right)<0||top+bottom>=h||left+right>=w){$('#setupError').textContent='Bitte Projektname, 2–20 Slides (240–4000 px) und passende Safezones angeben.';return}
 checkpoint();const fonts=p.fonts;p=fresh();p.fonts=fonts;p.meta.title=$('#setupName').value.trim();p.meta.code=$('#setupCode').value.trim();p.carousel={w,h,n,top,bottom,left,right,bg:'#252525',objects:[]};
 const c=makeCanvas(1,1),data=c.toDataURL();const im={id:uid(),name:'Carousel',data,original:data,width:w,height:h};p.images.push(im);for(let i=0;i<n;i++){const b=basicBoard(im,w,h);b.carouselSlide=i;p.boards.push(b)}
 const logo=await image('mkw-logo-bold-neg.svg'),lw=Math.min(650,w-left-right);p.carousel.objects.push({id:uid(),type:'logo',name:'MKW Logo',x:w-right-lw,y:top,w:lw,h:lw*logo.height/logo.width,source:'white',visible:true,locked:false,opacity:1});
 selected=null;carouselSelection=null;carouselUI.ids.clear();carouselUI.slide=null;carouselUI.tool='select';history=[];future=[];busy=false;setupCommitted=true;$('#projectSetup').close();$('#startDialog').close();changed();};
}
function carouselWarning(o){const c=p.carousel;if(o.type!=='text'||!o.text.trim()||o.visible===false)return '';const index=Math.floor(o.x/c.w);if(index<0||index>=c.n||o.x+o.w>(index+1)*c.w||o.y<0||o.y+o.h>c.h)return 'Text überschreitet eine Slide-Grenze.';if(o.x<index*c.w+100||o.x+o.w>(index+1)*c.w-100||o.y<c.top||o.y+o.h>c.h-c.bottom||o.x<c.left||o.x+o.w>c.n*c.w-c.right)return 'Text liegt ausserhalb der empfohlenen Safezone.';if(carouselTextHeight(o)>o.h+1)return 'Text passt nicht vollständig in den Textrahmen.';return ''}
function carouselAnglePath(o){const path=new Path2D(),w=o.w,h=o.h,t=Math.min(o.thickness*Math.SQRT2,w*.9,h*.44);path.moveTo(0,0);path.lineTo(w,h/2);path.lineTo(0,h);path.lineTo(0,h-t);path.lineTo(w-t,h/2);path.lineTo(0,t);path.closePath();return path}
async function carouselPaint(ctx,slide=null,scale=1,transparent=false,editingId=null){const c=p.carousel;ctx.save();ctx.scale(scale,scale);if(slide!==null){ctx.beginPath();ctx.rect(0,0,c.w,c.h);ctx.clip();ctx.translate(-slide*c.w,0)}if(!transparent){ctx.fillStyle=c.bg;ctx.fillRect(0,0,c.w*c.n,c.h)}for(const o of c.objects){if(o.visible===false||o.id===editingId)continue;ctx.save();ctx.globalAlpha=o.opacity??1;ctx.globalCompositeOperation=o.blend||'source-over';ctx.translate(o.x,o.y);
 if(o.type==='text'){ctx.fillStyle=o.color;ctx.font=`${o.size}px "${o.font}"`;ctx.textBaseline='top';const lines=MKWLayout.wrap(o.text,o.w,t=>ctx.measureText(t).width);lines.forEach((line,i)=>ctx.fillText(line,0,i*o.size*1.12));}
 else if(o.type==='gradient'){const a=o.rotation*Math.PI/180,dx=Math.cos(a)*o.w/2,dy=Math.sin(a)*o.h/2,start=o.gradientStart?{x:o.gradientStart.x*o.w,y:o.gradientStart.y*o.h}:o.kind==='radial'?{x:o.w/2,y:o.h/2}:{x:o.w/2-dx,y:o.h/2-dy},end=o.gradientEnd?{x:o.gradientEnd.x*o.w,y:o.gradientEnd.y*o.h}:{x:o.w/2+dx,y:o.h/2+dy};const g=o.kind==='radial'?ctx.createRadialGradient(start.x,start.y,0,start.x,start.y,Math.max(1,Math.hypot(end.x-start.x,end.y-start.y))):ctx.createLinearGradient(start.x,start.y,end.x,end.y);g.addColorStop(0,o.color);g.addColorStop(1,o.endColor+Math.round(o.endAlpha*255).toString(16).padStart(2,'0'));ctx.fillStyle=g;ctx.fillRect(0,0,o.w,o.h)}
 else if(o.type==='logo'){const im=await image(o.source==='black'?'mkw-logo-bold-pos.svg':'mkw-logo-bold-neg.svg');ctx.drawImage(im,0,0,o.w,o.h)}
 else{if(o.type==='angle'){const path=carouselAngleMask(o);ctx.save();ctx.shadowColor=o.glowColor+Math.round(o.glowAlpha*255).toString(16).padStart(2,'0');ctx.shadowBlur=o.glow*scale;ctx.fillStyle='#ffffff';ctx.fill(path);ctx.restore();ctx.clip(path)}else{ctx.beginPath();ctx.rect(0,0,o.w,o.h);ctx.clip()}
 const im=p.images.find(im=>im.id===o.imageId);if(im){const bitmap=await image(im.data),fw=o.w,fh=o.h,s=Math.max(fw/im.width,fh/im.height)*o.scale;ctx.translate(fw/2+o.panX,fh/2+o.panY);ctx.scale(o.flipX,o.flipY);ctx.drawImage(bitmap,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s)}else{ctx.fillStyle='#68768b';ctx.fillRect(0,0,o.w,o.h)}}ctx.restore()}ctx.restore()}
function validateCarousel(q){
 const c=q.carousel;if(!c)return;
 if(!['w','h','n','top','bottom','left','right'].every(k=>Number.isInteger(c[k]))||c.w<240||c.h<240||c.w>4000||c.h>4000||c.n<2||c.n>20||Math.min(c.top,c.bottom,c.left,c.right)<0||c.top+c.bottom>=c.h||c.left+c.right>=c.w||!/^#[0-9a-f]{6}$/i.test(c.bg)||!Array.isArray(c.objects)||c.objects.length>500||q.boards.length!==c.n)throw Error('Ungültiges Carousel-Projekt.');
 for(const [i,b] of q.boards.entries())if(b.carouselSlide!==i||b.w!==c.w||b.h!==c.h)throw Error('Ungültige Carousel-Slides.');
 const ids=new Set();for(const o of c.objects){if(typeof o.id!=='string'||ids.has(o.id)||!['text','image','logo','gradient','angle'].includes(o.type)||!['x','y','w','h','opacity'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||o.w>100000||o.h>100000||Math.abs(o.x)>100000||Math.abs(o.y)>100000||o.opacity<0||o.opacity>1)throw Error('Ungültige Carousel-Ebene.');ids.add(o.id);if(o.type==='text'&&(typeof o.text!=='string'||!Number.isFinite(o.size)||o.size<1||o.size>1000))throw Error('Ungültiger Carousel-Text.');if(o.imageId&&!q.images.some(im=>im.id===o.imageId))throw Error('Carousel-Bild fehlt.');}
}

const carouselUI={tool:'select',ids:new Set(),editing:null,space:false,content:false,guides:true,snap:true,drag:null,clipboard:[],layerDrag:null,propertyUndo:false,slide:null,touches:new Map(),pinch:null};
const carouselToolNames={select:'Auswahl',content:'Bildinhalt',text:'Text',image:'Bildrahmen',gradient:'Verlauf',angle:'Winkel',hand:'Hand',zoom:'Zoom'};
const carouselToolKeys={v:'select',a:'content',t:'text',f:'image',g:'gradient',w:'angle',h:'hand',z:'zoom'};
const carouselIcons={
 select:'<path d="M6 3v17l5-5 4 7 3-2-4-6 7-1Z"/>',
 content:'<path d="M6 3v17l5-5 4 7 3-2-4-6 7-1Z"/><path d="M3 3h3"/>',
 text:'<path d="M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3"/>',
 image:'<rect x="3" y="4" width="18" height="16"/><path d="m3 17 6-6 5 5 3-3 4 4"/><circle cx="16" cy="8" r="1.5"/>',
 gradient:'<rect x="3" y="4" width="18" height="16"/><path d="M7 4v16M11 4v16M15 4v16M19 4v16"/>',
 angle:'<path d="m7 3 13 9L7 21v-4l7-5-7-5Z"/>',
 hand:'<path d="M6 12V7a2 2 0 0 1 4 0V4a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v3a2 2 0 0 1 3 1v6c0 4-3 6-7 6h-2l-7-8c-2-2 0-4 2-3l3 3"/>',
 zoom:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/>'
};
function carouselIcon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${carouselIcons[name]||carouselIcons.select}</svg>`}
function carouselSelected(){
 const c=p.carousel;if(!c)return [];
 if(carouselSelection&&!carouselUI.ids.has(carouselSelection))carouselUI.ids=new Set([carouselSelection]);
 return c.objects.filter(o=>carouselUI.ids.has(o.id));
}
function carouselSelect(ids){carouselUI.slide=null;carouselUI.ids=new Set(ids);carouselSelection=ids.at(-1)||null;carouselUI.content=false;carouselPanel();carouselRefresh()}
function carouselTool(tool){
 carouselEndText();carouselUI.tool=tool;carouselUI.content=tool==='content';carouselToolUI();carouselPanel();carouselRefresh();
}
function carouselToolUI(){
 if(!$('#carouselEditor'))return;
 document.querySelectorAll('button[data-tool]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.tool===carouselUI.tool));
 $('#carouselViewport').dataset.tool=carouselUI.space?'hand':carouselUI.tool;
 $('#carouselToolName').textContent=carouselToolNames[carouselUI.tool];
 $('#carouselHint').textContent=({select:'Auswählen & verschieben · Shift: Mehrfachauswahl / 45° · Alt: Kopie ziehen',content:'Bildinhalt im Rahmen verschieben · Doppelklick auf ein Bild zum Umschalten',text:'Textrahmen aufziehen · Doppelklick auf Text zum Schreiben',image:'Bildrahmen aufziehen, danach Bild auswählen',gradient:'Verlaufsrahmen aufziehen · auf bestehendem Verlauf Richtung ziehen',angle:'Winkelrahmen aufziehen · Bildfüllung rechts auswählen',hand:'Montagefläche ziehen · Leertaste: vorübergehend Handwerkzeug',zoom:'Klicken: vergrössern · Alt: verkleinern · Pinch oder Cmd/Ctrl + Mausrad: Zoom'})[carouselUI.tool];
}
function carouselBounds(objects){if(!objects.length)return null;const x=Math.min(...objects.map(o=>o.x)),y=Math.min(...objects.map(o=>o.y));return {x,y,w:Math.max(...objects.map(o=>o.x+o.w))-x,h:Math.max(...objects.map(o=>o.y+o.h))-y}}
function carouselPoint(ev){const rect=$('#carouselCanvas').getBoundingClientRect();return {x:(ev.clientX-rect.left)/carouselZoom,y:(ev.clientY-rect.top)/carouselZoom}}
function carouselDefault(type,rect={}){
 const c=p.carousel;const viewport=$('#carouselViewport'),canvasRect=$('#carouselCanvas')?.getBoundingClientRect(),viewRect=viewport?.getBoundingClientRect();const x=Math.max(c.left,Math.min((c.n-1)*c.w,canvasRect&&viewRect?(viewRect.left-canvasRect.left)/carouselZoom:0));
 return {id:uid(),type,name:{text:'Text',gradient:'Verlauf',angle:'Winkel',image:'Bildrahmen'}[type],x,y:c.top,w:Math.min(800,c.w-200),h:type==='text'?200:400,visible:true,locked:false,opacity:1,text:'',size:70,font:'Replica LL',color:'#ffffff',endColor:'#000000',endAlpha:0,blend:'source-over',kind:'linear',rotation:0,direction:'right',thickness:75,glow:25,glowColor:'#ffffff',glowAlpha:.6,scale:1,panX:0,panY:0,flipX:1,flipY:1,...rect};
}
function carouselObject(type,rect={}){
 checkpoint();carouselUI.slide=null;const o=carouselDefault(type,rect);if(type==='angle'&&!rect.w){o.w=550;o.h=1100}
 if(type==='angle')carouselAngleBleed(o);p.carousel.objects.push(o);carouselUI.ids=new Set([o.id]);carouselSelection=o.id;changed();return o;
}
function carouselFile(target=null){const input=$('#carouselFile');input.value='';input.multiple=!target;input.onchange=ev=>carouselImport([...ev.target.files],target);input.click()}
async function carouselImport(files,target){
 if(!files.length||busy)return;carouselEndText();busy=true;$('#importDialog').showModal();let imported=0;
 try{checkpoint();for(const [index,file] of [...files].entries()){
  showImportStage(index,files.length,file.name,0);$('#importExplanation').textContent='Dein Bild wird geladen und in den Carousel-Rahmen eingesetzt.';
  if(file.size>100*1024*1024)throw Error('Maximal 100 MB pro Bild.');
  const normalized=await(await api('/api/import',file)).json(),im={...normalized,id:uid(),name:file.name,original:await dataURL(file)};
  await image(im.data);p.images.push(im);let o=p.carousel.objects.find(o=>o.id===target);
  if(!o){o=carouselDefault('image',{h:p.carousel.h,w:Math.min(im.width/im.height*p.carousel.h,100000),y:0});p.carousel.objects.unshift(o)}
  o.imageId=im.id;o.name=file.name;o.scale=1;o.panX=o.panY=0;carouselSelection=o.id;carouselUI.ids=new Set([o.id]);imported++;
 }changed();status(`${imported} Bilder im Carousel platziert.`)}catch(e){if(imported)changed();status(e.message)}finally{busy=false;$('#importDialog').close();carouselPanel()}
}
function carouselHit(pt){
 return [...p.carousel.objects].reverse().find(o=>{
  if(o.visible===false||o.locked||pt.x<o.x||pt.x>o.x+o.w||pt.y<o.y||pt.y>o.y+o.h)return false;
  if(o.type!=='angle')return true;
  const ctx=makeCanvas(1,1).getContext('2d');return ctx.isPointInPath(carouselAngleMask(o),pt.x-o.x,pt.y-o.y);
 });
}
function carouselRender(){
 carouselEndText();document.body.classList.toggle('carousel-mode',carouselActive());$('#carouselEditor')?.remove();if(!carouselActive())return false;
 const c=p.carousel;c.objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleBleed(o,c));if(carouselUI.slide!==null)carouselUI.slide=Math.max(0,Math.min(c.n-1,carouselUI.slide));const firstView=!Number.isFinite(c.zoom);carouselZoom=c.zoom||carouselZoom;carouselUI.ids=new Set([...carouselUI.ids].filter(id=>c.objects.some(o=>o.id===id)));if(!c.objects.some(o=>o.id===carouselSelection))carouselSelection=null;
 $('#projectName').value=p.meta.title;$('#projectCode').value=p.meta.code;$('#savePSD').hidden=true;
 const host=document.createElement('section');host.id='carouselEditor';host.innerHTML=`
 <nav class="carousel-contextbar" aria-label="Carousel-Aktionen"><div class="carousel-document"><strong>${esc(p.meta.title)}</strong><span>${c.n} Slides · ${c.w} × ${c.h} px</span></div><span id="carouselToolName"></span><div class="carousel-view-actions"><button id="carouselGuidesToggle" aria-pressed="${carouselUI.guides}" title="Hilfslinien anzeigen">Hilfslinien</button><button id="carouselSnapToggle" aria-pressed="${carouselUI.snap}" title="An Hilfslinien einrasten">Einrasten</button><button id="carouselFit">Einpassen</button><label>Zoom <input id="carouselZoom" type="number" min="5" max="200" step="5" value="${Math.round(carouselZoom*100)}"> %</label></div><span id="carouselNotice" role="status"></span><button id="carouselExport" class="primary">Export</button></nav>
 <nav class="carousel-toolrail" aria-label="Gestaltungswerkzeuge">${Object.entries(carouselToolNames).map(([key,name])=>`<button data-tool="${key}" aria-label="${name}" aria-pressed="${carouselUI.tool===key}" title="${name} (${Object.keys(carouselToolKeys).find(k=>carouselToolKeys[k]===key).toUpperCase()})">${carouselIcon(key)}<span>${name}</span></button>`).join('')}</nav>
 <div id="carouselViewport" tabindex="0" aria-label="Carousel-Montagefläche"><div id="carouselPasteboard"><div id="carouselArtwork"><canvas id="carouselCanvas" aria-label="Carousel-Gestaltung"></canvas><div id="carouselGuides"></div><div id="carouselSelectionOverlay"></div><div id="carouselEditingOverlay"></div><div id="carouselSlideControls"></div></div></div></div>
 <aside id="carouselSidebar"><section id="carouselProperties" aria-label="Eigenschaften"></section><section class="carousel-layers-panel"><div class="carousel-section-heading"><h3>Ebenen</h3><span>Oben liegt vorne</span></div><div id="carouselLayers"></div></section></aside><div class="carousel-statusbar"><span id="carouselHint"></span><span id="carouselCoordinates"></span></div><input id="carouselFile" type="file" accept="image/*" multiple hidden>`;
 document.body.append(host);host.querySelectorAll('button[data-tool]').forEach(btn=>btn.onclick=()=>carouselTool(btn.dataset.tool));
 $('#carouselExport').onclick=()=>{carouselEndText();openExport()};$('#carouselZoom').onchange=ev=>carouselSetZoom(+ev.target.value/100);
 $('#carouselFit').onclick=carouselFit;$('#carouselGuidesToggle').onclick=()=>{carouselUI.guides=!carouselUI.guides;$('#carouselGuidesToggle').setAttribute('aria-pressed',carouselUI.guides);carouselRefresh()};
 $('#carouselSnapToggle').onclick=()=>{carouselUI.snap=!carouselUI.snap;$('#carouselSnapToggle').setAttribute('aria-pressed',carouselUI.snap)};
 const viewport=$('#carouselViewport');if(firstView)carouselZoom=Math.min(.6,(viewport.clientWidth-160)/(c.w*c.n),(viewport.clientHeight-128)/c.h);
 viewport.onscroll=()=>{c.scrollX=viewport.scrollLeft;c.scrollY=viewport.scrollTop};viewport.onpointerdown=carouselPointer;
 viewport.ondblclick=ev=>{if(carouselUI.space||carouselUI.tool==='hand')return;const o=carouselHit(carouselPoint(ev));if(!o)return;carouselSelect([o.id]);if(o.type==='text')carouselEditText(o);else if(['image','angle'].includes(o.type)){carouselUI.content=!carouselUI.content;carouselRefresh();carouselPanel()}};
 viewport.onwheel=ev=>{if(ev.ctrlKey||ev.metaKey){ev.preventDefault();carouselSetZoom(carouselZoom*Math.exp(-ev.deltaY*.003),ev)}else if(ev.shiftKey){ev.preventDefault();viewport.scrollLeft+=ev.deltaY||ev.deltaX}};
 carouselToolUI();carouselPanel();carouselRefresh();if(firstView)carouselCenter();else{viewport.scrollLeft=c.scrollX??(viewport.scrollWidth-viewport.clientWidth)/2;viewport.scrollTop=c.scrollY??(viewport.scrollHeight-viewport.clientHeight)/2}return true;
}
function carouselMaxZoom(){const c=p.carousel;return Math.min(2,16000/(c.w*c.n),Math.sqrt(24000000/(c.w*c.n*c.h)))}
function carouselSetZoom(value,event=null){
 const viewport=$('#carouselViewport'),rect=viewport.getBoundingClientRect(),canvasRect=$('#carouselCanvas').getBoundingClientRect(),screenX=event?event.clientX:rect.left+viewport.clientWidth/2,screenY=event?event.clientY:rect.top+viewport.clientHeight/2;
 const px=(screenX-canvasRect.left)/carouselZoom,py=(screenY-canvasRect.top)/carouselZoom;
 carouselZoom=Math.max(.05,Math.min(carouselMaxZoom(),value));carouselRefresh();const next=$('#carouselCanvas').getBoundingClientRect();viewport.scrollLeft+=next.left+px*carouselZoom-screenX;viewport.scrollTop+=next.top+py*carouselZoom-screenY;
}
function carouselCenter(){const v=$('#carouselViewport');v.scrollLeft=(v.scrollWidth-v.clientWidth)/2;v.scrollTop=(v.scrollHeight-v.clientHeight)/2;p.carousel.scrollX=v.scrollLeft;p.carousel.scrollY=v.scrollTop}
function carouselFit(){const c=p.carousel,v=$('#carouselViewport');carouselSetZoom(Math.min((v.clientWidth-160)/(c.w*c.n),(v.clientHeight-128)/c.h));carouselCenter()}
function carouselRefresh(){
 if(!carouselActive()||!$('#carouselCanvas'))return;const c=p.carousel;carouselZoom=Math.max(.05,Math.min(carouselZoom,carouselMaxZoom()));const s=carouselZoom,canvas=$('#carouselCanvas'),generation=++carouselDraw;c.zoom=s;
 if(canvas.width!==Math.ceil(c.w*c.n*s))canvas.width=Math.ceil(c.w*c.n*s);if(canvas.height!==Math.ceil(c.h*s))canvas.height=Math.ceil(c.h*s);$('#carouselArtwork').style.width=canvas.width+'px';$('#carouselArtwork').style.height=canvas.height+'px';const viewport=$('#carouselViewport'),padX=Math.max(400,Math.round(viewport.clientWidth*.8)),padY=Math.max(250,Math.round(viewport.clientHeight*.6));$('#carouselPasteboard').style.width=(canvas.width+2*padX)+'px';$('#carouselPasteboard').style.height=(canvas.height+2*padY)+'px';$('#carouselArtwork').style.left=padX+'px';$('#carouselArtwork').style.top=padY+'px';$('#carouselZoom').value=Math.round(s*100);
 const buffer=makeCanvas(canvas.width,canvas.height);carouselPaint(buffer.getContext('2d'),null,s,false,carouselUI.editing?.id).then(()=>{if(generation===carouselDraw&&canvas.isConnected)canvas.getContext('2d').drawImage(buffer,0,0)}).catch(e=>status(e.message));
 $('#carouselGuides').hidden=!carouselUI.guides;
 $('#carouselGuides').innerHTML=Array.from({length:c.n},(_,i)=>`<div class="slide-guide" style="left:${i*c.w*s}px;width:${c.w*s}px;height:${c.h*s}px"><div class="sixths" style="left:${100*s}px;right:${100*s}px;top:${c.top*s}px;bottom:${c.bottom*s}px"></div></div>`).join('')+`<div class="artwork-safe" style="left:${c.left*s}px;top:${c.top*s}px;width:${(c.w*c.n-c.left-c.right)*s}px;height:${(c.h-c.top-c.bottom)*s}px"></div>`;
 const warnings=c.objects.filter(o=>carouselWarning(o)).length;$('#carouselNotice').textContent=warnings?`⚠ ${warnings} Texthinweis${warnings>1?'e':''}`:'';
 carouselDrawSelection();carouselSlideControls();
 if(carouselUI.editing){const o=c.objects.find(o=>o.id===carouselUI.editing.id);if(o)carouselPositionText(carouselUI.editing.el,o)}
}
function carouselDrawSelection(){
 const root=$('#carouselSelectionOverlay');if(!root)return;root.innerHTML='';const items=carouselSelected().filter(o=>o.visible!==false);let bounds=carouselBounds(items);const content=carouselUI.content&&items.length===1&&['image','angle'].includes(items[0].type)&&items[0].imageId;if(content)bounds=carouselImageBounds(items[0]);if(!bounds||carouselUI.editing){if(carouselUI.slide!==null){const c=p.carousel,frame=document.createElement('div');frame.className='carousel-slide-selection';Object.assign(frame.style,{left:carouselUI.slide*c.w*carouselZoom+'px',top:'0px',width:c.w*carouselZoom+'px',height:c.h*carouselZoom+'px'});root.append(frame)}return;}
 const s=carouselZoom;const frame=document.createElement('div');frame.className='carousel-frame'+(carouselUI.content?' content-selected':'')+(items.every(o=>o.locked)?' locked':'');
 Object.assign(frame.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.w*s+'px',height:bounds.h*s+'px'});
 frame.innerHTML=`<span class="carousel-frame-label">${items.length===1?esc(items[0].name):items.length+' Elemente'}${carouselUI.content?' · Bildinhalt':''}</span>`;
 if(!items.every(o=>o.locked)&&carouselUI.tool!=='hand'&&!carouselUI.content){for(const corner of ['nw','n','ne','e','se','s','sw','w']){const btn=document.createElement('button');btn.className='carousel-handle';btn.dataset.corner=corner;btn.setAttribute('aria-label','Auswahl skalieren: '+corner);btn.onpointerdown=ev=>{ev.stopPropagation();carouselResize(ev,corner)};frame.append(btn)}}
 if(content){frame.style.pointerEvents='auto';frame.onpointerdown=ev=>{ev.stopPropagation();carouselMove(ev)};if(!items[0].locked)for(const corner of ['nw','n','ne','e','se','s','sw','w']){const btn=document.createElement('button');btn.className='carousel-handle';btn.dataset.corner=corner;btn.setAttribute('aria-label','Bildinhalt skalieren: '+corner);btn.onpointerdown=ev=>{ev.stopPropagation();carouselImageResize(ev,items[0],corner)};frame.append(btn)}}root.append(frame);
 if(items.length===1&&items[0].type==='gradient'&&carouselUI.tool==='gradient')carouselDrawGradient(items[0],root);
}
function carouselDrawGradient(o,root){
 const start=o.gradientStart||{x:0,y:.5},end=o.gradientEnd||{x:1,y:.5},s=carouselZoom;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('carousel-gradient-line');svg.setAttribute('width',o.w*s);svg.setAttribute('height',o.h*s);Object.assign(svg.style,{left:o.x*s+'px',top:o.y*s+'px'});svg.innerHTML=`<line x1="${start.x*o.w*s}" y1="${start.y*o.h*s}" x2="${end.x*o.w*s}" y2="${end.y*o.h*s}"/>`;root.append(svg);
 for(const [key,point] of [['gradientStart',start],['gradientEnd',end]]){const handle=document.createElement('button');handle.className='carousel-gradient-stop';handle.style.left=(o.x+point.x*o.w)*s+'px';handle.style.top=(o.y+point.y*o.h)*s+'px';handle.style.background=key==='gradientStart'?o.color:o.endColor;handle.setAttribute('aria-label',key==='gradientStart'?'Verlauf Anfang':'Verlauf Ende');handle.onpointerdown=ev=>{ev.stopPropagation();carouselGradientDrag(ev,o,key)};root.append(handle)}
}
function carouselListen(ev,move,finish,cancel=finish){
 ev.preventDefault();const onMove=e=>{if(e.pointerId!==ev.pointerId)return;move(e)};const onUp=e=>{if(e.pointerId!==ev.pointerId)return;window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);carouselUI.drag=null;finish(e)};
 carouselUI.drag={cancel:()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);carouselUI.drag=null;cancel(ev)}};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onUp);
}
function carouselPointer(ev){
 if(busy||ev.button!==0||ev.target.closest('textarea,button,input'))return;carouselEndText();
 const pt=carouselPoint(ev),tool=carouselUI.space?'hand':carouselUI.tool;
 if(tool==='hand'){const v=$('#carouselViewport'),x=ev.clientX,y=ev.clientY,sx=v.scrollLeft,sy=v.scrollTop;carouselListen(ev,e=>{v.scrollLeft=sx-(e.clientX-x);v.scrollTop=sy-(e.clientY-y)},()=>{});return}
 if(tool==='zoom'){carouselSetZoom(carouselZoom*(ev.altKey?.8:1.25),ev);return}
 const hit=carouselHit(pt);
 if(tool==='text'&&hit?.type==='text'){carouselSelect([hit.id]);carouselEditText(hit);return}
 if(tool==='gradient'&&hit?.type==='gradient'){carouselSelect([hit.id]);carouselGradientDrag(ev,hit);return}
 if(['text','image','gradient','angle'].includes(tool)){carouselCreateDrag(ev,tool,pt);return}
 if(hit){
  if(ev.shiftKey){const ids=new Set(carouselSelected().map(o=>o.id));ids.has(hit.id)?ids.delete(hit.id):ids.add(hit.id);carouselSelect([...ids]);return}
  if(!carouselUI.ids.has(hit.id))carouselSelect([hit.id]);
  carouselUI.content=tool==='content'||carouselUI.content;carouselMove(ev);return;
 }
 if(!ev.shiftKey)carouselSelect([]);carouselMarquee(ev,pt,ev.shiftKey);
}
function carouselCreateDrag(ev,type,start){
 const sketch=document.createElement('div');sketch.className='carousel-marquee';$('#carouselSelectionOverlay').append(sketch);let rect={x:start.x,y:start.y,w:1,h:1};
 carouselListen(ev,e=>{const end=carouselPoint(e);let w=Math.abs(end.x-start.x),h=Math.abs(end.y-start.y);if(type==='angle')h=w*2;else if(e.shiftKey)w=h=Math.max(w,h);rect={x:end.x<start.x?start.x-w:start.x,y:end.y<start.y?start.y-h:start.y,w:Math.max(1,w),h:Math.max(1,h)};Object.assign(sketch.style,{left:rect.x*carouselZoom+'px',top:rect.y*carouselZoom+'px',width:rect.w*carouselZoom+'px',height:rect.h*carouselZoom+'px'})},()=>{
  if(rect.w*carouselZoom<5||rect.h*carouselZoom<5){sketch.remove();status('Rahmen mit gedrückter Maustaste aufziehen.');return}
  const o=carouselObject(type,rect);carouselUI.tool='select';carouselToolUI();if(type==='text')carouselEditText(o);else if(type==='image')carouselFile(o.id);
 },()=>sketch.remove());
}
function carouselMarquee(ev,start,add){
 const existing=add?carouselSelected().map(o=>o.id):[],sketch=document.createElement('div');sketch.className='carousel-marquee';$('#carouselSelectionOverlay').append(sketch);let end=start;
 carouselListen(ev,e=>{end=carouselPoint(e);Object.assign(sketch.style,{left:Math.min(start.x,end.x)*carouselZoom+'px',top:Math.min(start.y,end.y)*carouselZoom+'px',width:Math.abs(end.x-start.x)*carouselZoom+'px',height:Math.abs(end.y-start.y)*carouselZoom+'px'})},()=>{const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(end.x-start.x),h=Math.abs(end.y-start.y);const found=p.carousel.objects.filter(o=>!o.locked&&o.visible!==false&&o.x<x+w&&o.x+o.w>x&&o.y<y+h&&o.y+o.h>y);carouselSelect([...new Set([...existing,...found.map(o=>o.id)])])},()=>sketch.remove());
}
function carouselSnap(x,y,bounds,disabled=false){
 if(disabled||!carouselUI.snap)return {x,y};const c=p.carousel,tolerance=5/carouselZoom;
 const xs=[c.left,c.n*c.w-c.right,...Array.from({length:c.n},(_,i)=>Array.from({length:7},(_,j)=>i*c.w+100+j*(c.w-200)/6)).flat()],ys=Array.from({length:7},(_,j)=>c.top+j*(c.h-c.top-c.bottom)/6);
 let dx=tolerance,dy=tolerance;for(const line of xs)for(const edge of [0,bounds.w/2,bounds.w]){const delta=line-x-edge;if(Math.abs(delta)<Math.abs(dx))dx=delta}for(const line of ys)for(const edge of [0,bounds.h/2,bounds.h]){const delta=line-y-edge;if(Math.abs(delta)<Math.abs(dy))dy=delta}
 return {x:x+(Math.abs(dx)<tolerance?dx:0),y:y+(Math.abs(dy)<tolerance?dy:0)};
}
function carouselMove(ev){
 let objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;
 const start=carouselPoint(ev),content=carouselUI.content&&objects.length===1&&['image','angle'].includes(objects[0].type);let begun=false,original,bounds;
 carouselListen(ev,e=>{
  const pt=carouselPoint(e);let dx=pt.x-start.x,dy=pt.y-start.y;if(!begun&&Math.hypot(dx,dy)*carouselZoom<3)return;
  if(!begun){checkpoint();if(ev.altKey&&!content){objects=objects.map(o=>{const copy=clone(o);copy.id=uid();p.carousel.objects.push(copy);return copy});carouselUI.ids=new Set(objects.map(o=>o.id));carouselSelection=objects.at(-1).id}original=objects.map(clone);bounds=carouselBounds(original);begun=true}
  if(e.shiftKey){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,length=Math.hypot(dx,dy);dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
  if(content){const o=objects[0],base=original[0];o.panX=base.panX+dx;o.panY=base.panY+dy}
  else{const snap=carouselSnap(bounds.x+dx,bounds.y+dy,bounds,e.ctrlKey||e.metaKey||e.shiftKey);objects.forEach((o,i)=>{o.x=Math.round(original[i].x+snap.x-bounds.x);o.y=Math.round(original[i].y+snap.y-bounds.y)})}
  carouselRefresh();carouselCoordinates(objects);
 },()=>{if(begun){objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleBleed(o));changed(false)}carouselPanel()});
}
function carouselResize(ev,corner){
 const objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;const start=carouselPoint(ev),base=objects.map(clone),b=carouselBounds(base);let begun=false;
 carouselListen(ev,e=>{
  if(!begun){checkpoint();begun=true}const pt=carouselPoint(e),dx=pt.x-start.x,dy=pt.y-start.y;let w=Math.max(10,b.w+(corner.includes('e')?dx:corner.includes('w')?-dx:0)),h=Math.max(10,b.h+(corner.includes('s')?dy:corner.includes('n')?-dy:0));
  const preserve=e.shiftKey||objects.some(o=>o.type==='angle'||o.type==='logo');if(preserve){if(corner==='n'||corner==='s')w=h*b.w/b.h;else if(corner==='e'||corner==='w')h=w*b.h/b.w;else{const scale=Math.max(w/b.w,h/b.h);w=b.w*scale;h=b.h*scale}}
  let x=corner.includes('w')?b.x+b.w-w:b.x,y=corner.includes('n')?b.y+b.h-h:b.y;if(e.altKey){x=b.x+(b.w-w)/2;y=b.y+(b.h-h)/2}
  objects.forEach((o,i)=>{const old=base[i];o.x=x+(old.x-b.x)*w/b.w;o.y=y+(old.y-b.y)*h/b.h;o.w=old.w*w/b.w;o.h=old.h*h/b.h;if(e.shiftKey&&o.type==='text')o.size=Math.max(1,Math.min(1000,old.size*w/b.w))});carouselRefresh();carouselCoordinates(objects);
 },()=>{if(begun){objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleBleed(o));changed(false)}carouselPanel()});
}
function carouselCoordinates(objects){const b=carouselBounds(objects);if(b)$('#carouselCoordinates').textContent=`X ${Math.round(b.x)} · Y ${Math.round(b.y)} · ${Math.round(b.w)} × ${Math.round(b.h)} px`}
function carouselGradientDrag(ev,o,key=null){
 checkpoint();const update=e=>{const pt=carouselPoint(e),point={x:(pt.x-o.x)/o.w,y:(pt.y-o.y)/o.h};if(key)o[key]=point;else o.gradientEnd=point;carouselRefresh()};
 if(!key){const pt=carouselPoint(ev);o.gradientStart={x:(pt.x-o.x)/o.w,y:(pt.y-o.y)/o.h};o.gradientEnd={...o.gradientStart}}
 carouselListen(ev,update,()=>{changed(false);carouselPanel()});
}
function carouselTextHeight(o){const ctx=makeCanvas(1,1).getContext('2d');ctx.font=`${o.size}px "${o.font}"`;return Math.max(o.size*1.12,MKWLayout.wrap(o.text,o.w,t=>ctx.measureText(t).width).length*o.size*1.12)}
function carouselPositionText(el,o){Object.assign(el.style,{left:o.x*carouselZoom+'px',top:o.y*carouselZoom+'px',width:o.w*carouselZoom+'px',height:Math.max(o.h,carouselTextHeight(o))*carouselZoom+'px',fontFamily:fontFamily(o.font),fontSize:o.size*carouselZoom+'px',lineHeight:'1.12',color:o.color})}
function carouselEditText(o){
 if(o.locked)return;carouselEndText();carouselUI.ids=new Set([o.id]);carouselSelection=o.id;checkpoint();
 const el=document.createElement('textarea');el.className='carousel-inline-text';el.setAttribute('aria-label','Text direkt bearbeiten');el.value=o.text;el.spellcheck=false;
 carouselUI.editing={id:o.id,el};$('#carouselEditingOverlay').append(el);carouselPositionText(el,o);
 el.oninput=()=>{o.text=el.value;changed(false);const sidebar=$('#carouselProperties [data-prop=text]');if(sidebar)sidebar.value=o.text;carouselUpdateWarning(o)};
 el.onkeydown=ev=>{if(ev.key==='Escape'){ev.preventDefault();carouselEndText();$('#carouselViewport').focus()}};
 el.onblur=()=>carouselEndText();carouselPanel();carouselRefresh();el.focus();el.setSelectionRange(el.value.length,el.value.length);
}
function carouselEndText(){const edit=carouselUI.editing;if(!edit)return;carouselUI.editing=null;edit.el.onblur=null;edit.el.remove();if(carouselActive()&&$('#carouselProperties')){carouselPanel();carouselRefresh()}}
function carouselUpdateWarning(o){const warning=$('#carouselProperties .carousel-warning');if(warning)warning.textContent=carouselWarning(o)}
function carouselDuplicate(){const objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;checkpoint();const copies=objects.map(o=>({...clone(o),id:uid(),x:o.x+30,y:o.y+30}));p.carousel.objects.push(...copies);carouselUI.ids=new Set(copies.map(o=>o.id));carouselSelection=copies.at(-1).id;changed()}
function carouselDelete(){const ids=carouselSelected().filter(o=>!o.locked&&o.type!=='logo').map(o=>o.id);if(!ids.length)return;checkpoint();p.carousel.objects=p.carousel.objects.filter(o=>!ids.includes(o.id));carouselSelection=null;carouselUI.ids.clear();changed()}
function carouselLayerOrder(direction){const selectedIds=new Set(carouselSelected().map(o=>o.id));if(!selectedIds.size)return;checkpoint();const a=p.carousel.objects;if(direction==='front'||direction==='back'){const chosen=a.filter(o=>selectedIds.has(o.id)),rest=a.filter(o=>!selectedIds.has(o.id));p.carousel.objects=direction==='front'?[...rest,...chosen]:[...chosen,...rest]}else if(direction==='up'){for(let i=a.length-2;i>=0;i--)if(selectedIds.has(a[i].id)&&!selectedIds.has(a[i+1].id))[a[i],a[i+1]]=[a[i+1],a[i]]}else{for(let i=1;i<a.length;i++)if(selectedIds.has(a[i].id)&&!selectedIds.has(a[i-1].id))[a[i],a[i-1]]=[a[i-1],a[i]]}changed()}
function carouselPanel(){
 if(!carouselActive()||!$('#carouselProperties'))return;const c=p.carousel,items=carouselSelected(),o=items.at(-1),panel=$('#carouselProperties');
 const number=(key,label,min=0,max=100000)=>`<label>${label}<input data-prop="${key}" type="number" value="${Math.round(o[key]*100)/100}" min="${min}" max="${max}" step="any"></label>`;
 const color=(key,label)=>`<label>${label}<input data-prop="${key}" type="color" value="${esc(o[key])}"></label>`;
 const select=(key,label,values)=>`<label>${label}<select data-prop="${key}">${options(values,o[key])}</select></label>`;
 const section=(title,body)=>`<section class="carousel-property-section"><h4>${title}</h4>${body}</section>`;
 if(!items.length&&carouselUI.slide!==null){carouselSlidePanel(panel);carouselLayerPanel();return}
 if(items.length>1){panel.innerHTML=`<h3>${items.length} Elemente ausgewählt</h3><p>Gemeinsam verschieben und an den Griffen skalieren.</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button><button id="carouselDelete">Entfernen</button></div>`;$('#carouselDuplicate').onclick=carouselDuplicate;$('#carouselDelete').onclick=carouselDelete}
 else if(o){panel.innerHTML=`<div class="carousel-section-heading"><h3>${esc(o.name)}</h3><span>${o.locked?'Gesperrt':carouselUI.content?'Bildinhalt':'Eigenschaften'}</span></div>${section('Transformieren',`<div class="carousel-fields">${number('x','X',-100000)}${number('y','Y',-100000)}${number('w','Breite',1)}${number('h','Höhe',1)}${number('opacity','Deckkraft · 0–1',0,1)}</div>`)}
 ${o.type==='text'?section('Text',`<label>Inhalt<textarea data-prop="text" placeholder="Text eingeben …">${esc(o.text)}</textarea></label><div class="carousel-fields">${number('size','Grösse',1,1000)}${color('color','Farbe')}</div>${select('font','Schrift',[['Replica LL','Replica'],['Harriet','Harriet Bold'],['Harriet Regular','Harriet Regular'],['Harriet Italic','Harriet Italic']])}<button id="carouselTextEdit">Auf der Fläche bearbeiten</button>`):''}
 ${o.type==='gradient'?section('Verlauf',select('kind','Art',[['linear','Linear'],['radial','Radial']])+`<div class="carousel-fields">${color('color','Anfang')}${color('endColor','Ende')}${number('endAlpha','Enddeckkraft',0,1)}${number('rotation','Richtung · °',-360,360)}</div>`+select('blend','Mischmodus',[['source-over','Normal'],['multiply','Multiplizieren']])+'<button id="carouselGradientEdit">Verlauf auf der Fläche bearbeiten</button>'):''}
 ${o.type==='angle'?section('Winkel',select('direction','Richtung',[['up','Oben'],['right','Rechts'],['down','Unten']])+`<div class="carousel-fields">${number('thickness','Schenkelbreite',1)}${number('glow','Schein · px',0,200)}${color('glowColor','Scheinfarbe')}${number('glowAlpha','Intensität',0,1)}</div><p>Der Winkel überragt automatisch die nächste Artwork-Kante um mindestens 1 px.</p>`):''}
 ${['image','angle'].includes(o.type)?section('Bildinhalt','<button id="carouselReplace">Bild platzieren / ersetzen</button><div class="carousel-fields">'+number('scale','Bildzoom',.05,20)+number('panX','Ausschnitt X',-100000)+number('panY','Ausschnitt Y',-100000)+select('flipX','Horizontal',[['1','Original'],['-1','Gespiegelt']])+select('flipY','Vertikal',[['1','Original'],['-1','Gespiegelt']])+'</div><button id="carouselContentEdit">Bildinhalt verschieben</button><button id="carouselImageFit">Rahmen füllen</button>'):''}
 ${o.type==='logo'?section('MKW Logo',select('source','Farbe',[['white','Weiss'],['black','Schwarz']])):''}
 <p class="carousel-warning" role="status">${carouselWarning(o)}</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button>${o.type!=='logo'?'<button id="carouselDelete">Entfernen</button>':''}</div>`;
  panel.querySelectorAll('[data-prop]').forEach(input=>{input.disabled=!!o.locked;input.onfocus=()=>{carouselUI.propertyUndo=false};input.oninput=()=>{
   let value=input.type==='number'||['flipX','flipY'].includes(input.dataset.prop)?Number(input.value):input.value;
   if(input.type==='number'){if(!Number.isFinite(value))return;value=Math.max(+input.min,Math.min(+input.max,value))}
   if(!carouselUI.propertyUndo){checkpoint();carouselUI.propertyUndo=true}const oldRatio=o.h/o.w;o[input.dataset.prop]=value;
   if(o.type==='angle'){if(input.dataset.prop==='direction'){const tall=o.h>o.w;if((value==='right')!==tall)[o.w,o.h]=[o.h,o.w]}else if(input.dataset.prop==='w')o.h=o.direction==='right'?o.w*2:o.w/2;else if(input.dataset.prop==='h')o.w=o.direction==='right'?o.h/2:o.h*2}
   if(o.type==='angle')carouselAngleBleed(o);if(o.type==='logo'){if(input.dataset.prop==='w')o.h=o.w*oldRatio;if(input.dataset.prop==='h')o.w=o.h/oldRatio}
   if(o.type==='gradient'&&input.dataset.prop==='rotation'){delete o.gradientStart;delete o.gradientEnd}
   changed(false);carouselUpdateWarning(o);
   if(carouselUI.editing?.id===o.id&&input.dataset.prop==='text')carouselUI.editing.el.value=o.text;
   for(const key of ['w','h']){const field=panel.querySelector(`[data-prop="${key}"]`);if(field&&field!==input)field.value=Math.round(o[key]*100)/100}
  }});
  $('#carouselDuplicate').onclick=carouselDuplicate;if($('#carouselDelete'))$('#carouselDelete').onclick=carouselDelete;
  if($('#carouselReplace'))$('#carouselReplace').onclick=()=>carouselFile(o.id);
  if($('#carouselTextEdit'))$('#carouselTextEdit').onclick=()=>carouselEditText(o);
  if($('#carouselGradientEdit'))$('#carouselGradientEdit').onclick=()=>carouselTool('gradient');
  if($('#carouselContentEdit'))$('#carouselContentEdit').onclick=()=>carouselTool('content');
  if($('#carouselImageFit'))$('#carouselImageFit').onclick=()=>{checkpoint();o.scale=1;o.panX=o.panY=0;changed(false);carouselPanel()};
  if(o.locked)panel.querySelectorAll('button:not(#carouselDuplicate)').forEach(btn=>btn.disabled=true);
 }else{panel.innerHTML=`<h3>Dokument</h3><p>Werkzeug links auswählen. Rahmen aufziehen oder vorhandene Elemente mit dem Auswahlwerkzeug anklicken.</p>${section('Hintergrund',`<label>Farbe<input id="carouselBackground" type="color" value="${c.bg}"></label>`)}<p>V Auswahl · T Text · F Bildrahmen · G Verlauf · W Winkel · H Hand · Z Zoom</p><p>Leertaste zum Verschieben der Montagefläche. Shift zum Hinzufügen zur Auswahl.</p>`;$('#carouselBackground').onchange=e=>{checkpoint();c.bg=e.target.value;changed(false)}}
 carouselLayerPanel();
}
function carouselLayerPanel(){
 const c=p.carousel,ids=new Set(carouselSelected().map(o=>o.id));
 $('#carouselLayers').innerHTML=[...c.objects].reverse().map(o=>`<div class="carousel-layer ${ids.has(o.id)?'active':''}" data-layer="${o.id}" draggable="true"><button data-action="visible" aria-label="${o.visible===false?'Einblenden':'Ausblenden'}: ${esc(o.name)}">${o.visible===false?'○':'●'}</button><button data-action="locked" aria-label="${o.locked?'Entsperren':'Sperren'}: ${esc(o.name)}">${o.locked?'▣':'◇'}</button><button class="carousel-layer-name" data-action="select" title="${esc(o.name)}">${carouselIcon(o.type==='logo'?'image':o.type)}<span>${esc(o.name)}${carouselWarning(o)?' ⚠':''}</span></button><button data-action="up" aria-label="Nach vorne: ${esc(o.name)}">↑</button><button data-action="down" aria-label="Nach hinten: ${esc(o.name)}">↓</button></div>`).join('');
 $('#carouselLayers').querySelectorAll('[data-layer]').forEach(row=>{
  row.ondragstart=ev=>{carouselUI.layerDrag=row.dataset.layer;ev.dataTransfer.setData('text/plain',row.dataset.layer);ev.dataTransfer.effectAllowed='move'};
  row.ondragover=ev=>{ev.preventDefault();row.classList.add('drop-target')};row.ondragleave=()=>row.classList.remove('drop-target');
  row.ondrop=ev=>{ev.preventDefault();ev.stopPropagation();row.classList.remove('drop-target');const source=carouselUI.layerDrag,target=row.dataset.layer;if(!source||source===target)return;const index=c.objects.findIndex(o=>o.id===source);if(index<0)return;checkpoint();const [o]=c.objects.splice(index,1),targetIndex=c.objects.findIndex(o=>o.id===target);c.objects.splice(targetIndex+1,0,o);carouselUI.layerDrag=null;changed()};
  row.ondragend=()=>carouselUI.layerDrag=null;
  row.querySelectorAll('button').forEach(btn=>btn.onclick=ev=>{const o=c.objects.find(o=>o.id===row.dataset.layer),action=btn.dataset.action;if(action==='select'){if(ev.shiftKey){const set=new Set(carouselSelected().map(o=>o.id));set.has(o.id)?set.delete(o.id):set.add(o.id);carouselSelect([...set])}else carouselSelect([o.id]);return}
   if(action==='up'||action==='down'){carouselSelect([o.id]);carouselLayerOrder(action);return}checkpoint();o[action]=action==='visible'?o.visible===false:!o.locked;changed(false);carouselPanel();
  });
  row.querySelector('.carousel-layer-name').ondblclick=ev=>{ev.preventDefault();ev.stopPropagation();const o=c.objects.find(o=>o.id===row.dataset.layer),input=document.createElement('input');input.value=o.name;input.setAttribute('aria-label','Ebene umbenennen');const name=row.querySelector('.carousel-layer-name');name.replaceChildren(input);input.focus();input.select();const save=()=>{if(input.value.trim()&&input.value.trim()!==o.name){checkpoint();o.name=input.value.trim();changed(false)}carouselLayerPanel()};input.onblur=save;input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.onblur=null;carouselLayerPanel()}}};
 });
}
window.addEventListener('keydown',ev=>{
 if(!carouselActive()||busy||document.querySelector('dialog[open]'))return;
 const target=ev.target,typing=target.isContentEditable||target.closest('input,textarea,select');
 if(typing)return;const key=ev.key.toLowerCase(),command=ev.metaKey||ev.ctrlKey;
 if(command&&key==='z'){ev.preventDefault();ev.stopImmediatePropagation();carouselEndText();ev.shiftKey?redo():undo();return}
 if(command&&key==='a'){ev.preventDefault();carouselSelect(p.carousel.objects.filter(o=>!o.locked&&o.visible!==false).map(o=>o.id));return}
 if(command&&key==='d'){ev.preventDefault();carouselDuplicate();return}
 if(command&&key==='c'){ev.preventDefault();carouselUI.clipboard=carouselSelected().map(clone);return}
 if(command&&key==='v'){ev.preventDefault();if(carouselUI.clipboard.length){checkpoint();const copies=carouselUI.clipboard.map(o=>({...clone(o),id:uid(),x:o.x+30,y:o.y+30}));p.carousel.objects.push(...copies);carouselUI.ids=new Set(copies.map(o=>o.id));carouselSelection=copies.at(-1).id;changed()}return}
 if(ev.code==='Space'){ev.preventDefault();carouselUI.space=true;carouselToolUI();return}
 if(key==='escape'){ev.preventDefault();carouselEndText();carouselSelect([]);carouselUI.tool='select';carouselToolUI();return}
 if(key==='delete'||key==='backspace'){ev.preventDefault();if(carouselUI.slide!==null)carouselSlideDelete();else carouselDelete();return}
 if(key==='['||key===']'){ev.preventDefault();carouselLayerOrder(key===']'?(ev.shiftKey?'front':'up'):(ev.shiftKey?'back':'down'));return}
 if(key.startsWith('arrow')){const chosen=carouselSelected().filter(o=>!o.locked);if(!chosen.length)return;ev.preventDefault();checkpoint();const delta=ev.shiftKey?10:1;chosen.forEach(o=>{if(key==='arrowleft')o.x-=delta;if(key==='arrowright')o.x+=delta;if(key==='arrowup')o.y-=delta;if(key==='arrowdown')o.y+=delta});changed(false);carouselPanel();return}
 if(!command&&carouselToolKeys[key]){ev.preventDefault();carouselTool(carouselToolKeys[key])}
},true);
window.addEventListener('keyup',ev=>{if(ev.code==='Space'&&carouselUI.space){carouselUI.space=false;carouselToolUI()}});
window.addEventListener('blur',()=>{carouselUI.space=false;carouselUI.touches.clear();carouselUI.pinch=null;carouselToolUI()});
window.addEventListener('resize',()=>{if(carouselActive()&&$('#carouselViewport'))carouselSetZoom(carouselZoom)});
carouselSetup();
function carouselSlideControls(){
 const root=$('#carouselSlideControls'),c=p.carousel,s=carouselZoom;if(!root)return;
 if(carouselUI.slide>=c.n)carouselUI.slide=c.n-1;
 root.innerHTML=Array.from({length:c.n},(_,i)=>`<button class="carousel-slide-tab ${carouselUI.slide===i?'active':''}" data-slide="${i}" style="left:${i*c.w*s}px" aria-label="Slide ${i+1} auswählen" aria-pressed="${carouselUI.slide===i}">Slide ${i+1}</button>`).join('')+`<button id="carouselAddSlide" style="left:${c.w*c.n*s+24}px;top:${c.h*s/2-20}px" aria-label="Slide hinzufügen" title="Slide hinzufügen" ${c.n>=20?'disabled':''}>+</button>`;
 root.querySelectorAll('[data-slide]').forEach(btn=>btn.onclick=ev=>{ev.stopPropagation();carouselSlideSelect(+btn.dataset.slide)});$('#carouselAddSlide').onclick=ev=>{ev.stopPropagation();carouselSlideInsert(c.n)};
}
function carouselSlideSelect(index){carouselEndText();carouselSelection=null;carouselUI.ids.clear();carouselUI.slide=index;carouselPanel();carouselRefresh()}
function carouselSlidePanel(panel){
 const c=p.carousel,index=carouselUI.slide;
 panel.innerHTML=`<div class="carousel-section-heading"><h3>Slide ${index+1}</h3><span>Zeichenfläche</span></div><section class="carousel-property-section"><h4>Format</h4><p>${c.w} × ${c.h} px · ${index+1} von ${c.n} Slides</p></section><section class="carousel-property-section"><h4>Anordnung</h4><div class="carousel-fields"><button id="carouselSlideBefore" ${c.n>=20?'disabled':''}>Davor hinzufügen</button><button id="carouselSlideAfter" ${c.n>=20?'disabled':''}>Danach hinzufügen</button><button id="carouselSlideLeft" ${index===0?'disabled':''}>← Nach links</button><button id="carouselSlideRight" ${index===c.n-1?'disabled':''}>Nach rechts →</button></div></section><section class="carousel-property-section"><h4>Slide bearbeiten</h4><button id="carouselSlideDuplicate" ${c.n>=20?'disabled':''}>Slide duplizieren</button><button id="carouselSlideDelete" ${c.n<=2?'disabled':''}>Slide entfernen</button><p>Beim Entfernen werden vollständig enthaltene Elemente mit entfernt. Übergreifende Elemente bleiben auf der Montagefläche. Das MKW-Logo bleibt erhalten.</p></section>`;
 $('#carouselSlideBefore').onclick=()=>carouselSlideInsert(index);$('#carouselSlideAfter').onclick=()=>carouselSlideInsert(index+1);$('#carouselSlideLeft').onclick=()=>carouselSlideMove(-1);$('#carouselSlideRight').onclick=()=>carouselSlideMove(1);$('#carouselSlideDuplicate').onclick=()=>carouselSlideInsert(index+1,index);$('#carouselSlideDelete').onclick=carouselSlideDelete;
}
function carouselBoardIndexes(){p.boards.forEach((b,i)=>b.carouselSlide=i)}
function carouselSlideInsert(index,duplicate=null){
 const c=p.carousel;if(c.n>=20)return;carouselEndText();checkpoint();const copies=duplicate===null?[]:c.objects.filter(o=>o.x>=duplicate*c.w&&o.x+o.w<=(duplicate+1)*c.w).map(o=>({...clone(o),id:uid(),x:o.x+(index-duplicate)*c.w}));
 c.objects.forEach(o=>{if(o.x>=index*c.w)o.x+=c.w});c.objects.push(...copies);c.n++;
 const b=basicBoard(p.images[0],c.w,c.h);p.boards.splice(index,0,b);carouselBoardIndexes();carouselUI.ids.clear();carouselSelection=null;carouselUI.slide=index;changed();carouselSlideCenter(index);
}
function carouselSlideDelete(){
 const c=p.carousel,index=carouselUI.slide;if(index===null||c.n<=2)return;carouselEndText();checkpoint();const start=index*c.w,end=start+c.w;
 c.objects=c.objects.filter(o=>o.type==='logo'||!(o.x>=start&&o.x+o.w<=end));c.objects.forEach(o=>{if(o.x>=end)o.x-=c.w;else if(o.type==='logo'&&o.x>=start&&o.x<end){o.x=c.w-c.right-o.w;o.y=c.top}});
 c.n--;p.boards.splice(index,1);carouselBoardIndexes();carouselUI.ids.clear();carouselSelection=null;carouselUI.slide=Math.min(index,c.n-1);changed();carouselSlideCenter(carouselUI.slide);
}
function carouselSlideMove(delta){
 const c=p.carousel,index=carouselUI.slide,next=index+delta;if(index===null||next<0||next>=c.n)return;carouselEndText();checkpoint();
 c.objects.forEach(o=>{if(o.x>=index*c.w&&o.x+o.w<=(index+1)*c.w)o.x+=delta*c.w;else if(o.x>=next*c.w&&o.x+o.w<=(next+1)*c.w)o.x-=delta*c.w});[p.boards[index],p.boards[next]]=[p.boards[next],p.boards[index]];carouselBoardIndexes();carouselUI.slide=next;changed();carouselSlideCenter(next);
}
function carouselSlideCenter(index){const v=$('#carouselViewport'),r=$('#carouselCanvas').getBoundingClientRect(),vr=v.getBoundingClientRect();v.scrollLeft+=r.left+(index+.5)*p.carousel.w*carouselZoom-vr.left-v.clientWidth/2}
function carouselAngleBleed(o,c=p.carousel){
 const width=c.w*c.n,height=c.h;
 if(o.x>=width)o.x=width-1;if(o.x+o.w<=0)o.x=1-o.w;
 if(o.y>=height)o.y=height-1;if(o.y+o.h<=0)o.y=1-o.h;
 const crosses=(o.x<=-1&&o.x+o.w>0)||(o.x+o.w>=width+1&&o.x<width)||(o.y<=-1&&o.y+o.h>0)||(o.y+o.h>=height+1&&o.y<height);if(crosses)return;
 const edges=[{axis:'x',value:-1},{axis:'x',value:width-o.w+1},{axis:'y',value:-1},{axis:'y',value:height-o.h+1}].sort((a,b)=>Math.abs(o[a.axis]-a.value)-Math.abs(o[b.axis]-b.value));o[edges[0].axis]=edges[0].value;
}
window.addEventListener('pointerdown',ev=>{
 if(!carouselActive()||busy||ev.pointerType!=='touch'||!ev.target.closest?.('#carouselViewport'))return;
 carouselUI.touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(carouselUI.touches.size===2){carouselUI.drag?.cancel();carouselEndText();const [a,b]=[...carouselUI.touches.values()];carouselUI.pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:carouselZoom,anchor:carouselPoint({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2})};ev.preventDefault();ev.stopImmediatePropagation()}
},true);
window.addEventListener('pointermove',ev=>{
 if(!carouselUI.touches.has(ev.pointerId))return;carouselUI.touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(!carouselUI.pinch||carouselUI.touches.size<2)return;
 const [a,b]=[...carouselUI.touches.values()];carouselSetZoom(carouselUI.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/carouselUI.pinch.distance,{clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});const v=$('#carouselViewport'),r=$('#carouselCanvas').getBoundingClientRect();v.scrollLeft+=r.left+carouselUI.pinch.anchor.x*carouselZoom-(a.x+b.x)/2;v.scrollTop+=r.top+carouselUI.pinch.anchor.y*carouselZoom-(a.y+b.y)/2;ev.preventDefault();ev.stopImmediatePropagation();
},true);
for(const name of ['pointerup','pointercancel'])window.addEventListener(name,ev=>{if(!carouselUI.touches.has(ev.pointerId))return;carouselUI.touches.delete(ev.pointerId);if(carouselUI.pinch){if(carouselUI.touches.size<2)carouselUI.pinch=null;ev.preventDefault();ev.stopImmediatePropagation()}},true);
function carouselAngleMask(o){
 const canonical=o.direction==='right'?o:{...o,w:o.h,h:o.w},path=carouselAnglePath(canonical);
 if(o.direction==='right')return path;const result=new Path2D(),matrix=new DOMMatrix().translate(o.w/2,o.h/2).rotate(o.direction==='up'?-90:90).translate(-canonical.w/2,-canonical.h/2);result.addPath(path,matrix);return result;
}
function carouselImageBounds(o){
 const im=p.images.find(im=>im.id===o.imageId);if(!im)return {x:o.x,y:o.y,w:o.w,h:o.h};const scale=Math.max(o.w/im.width,o.h/im.height)*o.scale,w=im.width*scale,h=im.height*scale;return {x:o.x+o.w/2+o.panX-w/2,y:o.y+o.h/2+o.panY-h/2,w,h};
}
function carouselImageResize(ev,o,corner){
 if(o.locked)return;const start=carouselPoint(ev),b=carouselImageBounds(o),base=clone(o);let begun=false;
 carouselListen(ev,e=>{if(!begun){checkpoint();begun=true}const pt=carouselPoint(e),dx=pt.x-start.x,dy=pt.y-start.y;let w=b.w+(corner.includes('e')?dx:corner.includes('w')?-dx:0),h=b.h+(corner.includes('s')?dy:corner.includes('n')?-dy:0),ratio=corner==='n'||corner==='s'?h/b.h:corner==='e'||corner==='w'?w/b.w:Math.max(w/b.w,h/b.h);ratio=Math.max(.05/base.scale,Math.min(20/base.scale,ratio));w=b.w*ratio;h=b.h*ratio;let x=corner.includes('w')?b.x+b.w-w:b.x,y=corner.includes('n')?b.y+b.h-h:b.y;if(e.altKey){x=b.x+(b.w-w)/2;y=b.y+(b.h-h)/2}o.scale=base.scale*ratio;o.panX=x+w/2-o.x-o.w/2;o.panY=y+h/2-o.y-o.h/2;carouselRefresh();carouselCoordinates([o])},()=>{if(begun)changed(false);carouselPanel()});
}
let carouselGestureZoom=null;
for(const name of ['gesturestart','gesturechange','gestureend'])window.addEventListener(name,ev=>{if(!carouselActive()||busy||!ev.target.closest?.('#carouselViewport'))return;ev.preventDefault();if(name==='gesturestart')carouselGestureZoom=carouselZoom;else if(name==='gesturechange'&&carouselGestureZoom!==null)carouselSetZoom(carouselGestureZoom*ev.scale,Number.isFinite(ev.clientX)?ev:null);else if(name==='gestureend')carouselGestureZoom=null},{passive:false});
