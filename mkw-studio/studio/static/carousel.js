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
async function carouselPaint(ctx,slide=null,scale=1,transparent=false,editingId=null){const c=p.carousel;carouselKeepLogosOnTop(c);ctx.save();ctx.scale(scale,scale);if(slide!==null){ctx.beginPath();ctx.rect(0,0,c.w,c.h);ctx.clip();ctx.translate(-slide*c.w,0)}if(!transparent){ctx.fillStyle=c.bg;ctx.fillRect(0,0,c.w*c.n,c.h)}for(const o of c.objects){if(o.visible===false||o.id===editingId)continue;ctx.save();ctx.globalAlpha=o.opacity??1;ctx.globalCompositeOperation=o.blend||'source-over';ctx.translate(o.x,o.y);
 if(o.type==='text'){ctx.fillStyle=o.color;ctx.textBaseline='top';for(const line of carouselTextLayout(o,ctx).lines){ctx.font=`${line.size}px "${o.font}"`;ctx.fillText(line.text,0,line.y)}}
 else if(o.type==='gradient'){const a=o.rotation*Math.PI/180,dx=Math.cos(a)*o.w/2,dy=Math.sin(a)*o.h/2,start=o.gradientStart?{x:o.gradientStart.x*o.w,y:o.gradientStart.y*o.h}:o.kind==='radial'?{x:o.w/2,y:o.h/2}:{x:o.w/2-dx,y:o.h/2-dy},end=o.gradientEnd?{x:o.gradientEnd.x*o.w,y:o.gradientEnd.y*o.h}:{x:o.w/2+dx,y:o.h/2+dy};const g=o.kind==='radial'?ctx.createRadialGradient(start.x,start.y,0,start.x,start.y,Math.max(1,Math.hypot(end.x-start.x,end.y-start.y))):ctx.createLinearGradient(start.x,start.y,end.x,end.y);g.addColorStop(0,o.color+Math.round((o.startAlpha??1)*255).toString(16).padStart(2,'0'));g.addColorStop(1,o.endColor+Math.round((o.endAlpha??0)*255).toString(16).padStart(2,'0'));ctx.fillStyle=g;ctx.fillRect(0,0,o.w,o.h)}
 else if(o.type==='logo'){const im=await image(o.source==='black'?'mkw-logo-bold-pos.svg':'mkw-logo-bold-neg.svg');ctx.drawImage(im,0,0,o.w,o.h)}
 else{if(o.type==='angle'){const path=carouselAngleMask(o);ctx.save();ctx.shadowColor=o.glowColor+Math.round(o.glowAlpha*255).toString(16).padStart(2,'0');ctx.shadowBlur=o.glow*scale;ctx.fillStyle='#ffffff';ctx.fill(path);ctx.restore();ctx.clip(path)}else{ctx.clip(carouselImageMask(o))}
 const im=p.images.find(im=>im.id===o.imageId);if(im){const bitmap=await image(im.data),fw=o.w,fh=o.h,s=Math.max(fw/im.width,fh/im.height)*o.scale;ctx.translate(fw/2+o.panX,fh/2+o.panY);ctx.scale(o.flipX,o.flipY);ctx.drawImage(bitmap,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s)}else{ctx.fillStyle='#68768b';ctx.fillRect(0,0,o.w,o.h)}}ctx.restore()}ctx.restore()}
function validateCarousel(q){
 const c=q.carousel;if(!c)return;
 if(!['w','h','n','top','bottom','left','right'].every(k=>Number.isInteger(c[k]))||c.w<240||c.h<240||c.w>4000||c.h>4000||c.n<2||c.n>20||Math.min(c.top,c.bottom,c.left,c.right)<0||c.top+c.bottom>=c.h||c.left+c.right>=c.w||!/^#[0-9a-f]{6}$/i.test(c.bg)||!Array.isArray(c.objects)||c.objects.length>500||q.boards.length!==c.n)throw Error('Ungültiges Carousel-Projekt.');
 for(const [i,b] of q.boards.entries())if(b.carouselSlide!==i||b.w!==c.w||b.h!==c.h)throw Error('Ungültige Carousel-Slides.');
 const ids=new Set();for(const o of c.objects){if(typeof o.id!=='string'||ids.has(o.id)||!['text','image','logo','gradient','angle'].includes(o.type)||!['x','y','w','h','opacity'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||o.w>100000||o.h>100000||Math.abs(o.x)>100000||Math.abs(o.y)>100000||o.opacity<0||o.opacity>1)throw Error('Ungültige Carousel-Ebene.');ids.add(o.id);if(o.framePoints&&(o.type!=='image'||!Array.isArray(o.framePoints)||![4,5].includes(o.framePoints.length)||o.framePoints.some(point=>!point||!['x','y'].every(key=>Number.isFinite(point[key])&&point[key]>=0&&point[key]<=1))||(o.framePointSide&&!['left','right','top','bottom'].includes(o.framePointSide))))throw Error('Ungültige Bildrahmenpunkte.');if(o.type==='gradient'&&['startAlpha','endAlpha'].some(key=>o[key]!==undefined&&(!Number.isFinite(o[key])||o[key]<0||o[key]>1)))throw Error('Ungültige Verlaufstransparenz.');if(o.textStyles&&(o.type!=='text'||!Array.isArray(o.textStyles)||o.textStyles.length>10000||o.textStyles.some(style=>style&&((style.size!==undefined&&(!Number.isFinite(style.size)||style.size<1||style.size>1000))||(style.leading&&(!Array.isArray(style.leading)||style.leading.length>10000||style.leading.some(value=>value!==null&&(!Number.isFinite(value)||value<1||value>3000))))))))throw Error('Ungültige Absatzformatierung.');if(o.type==='text'&&(typeof o.text!=='string'||!Number.isFinite(o.size)||o.size<1||o.size>1000))throw Error('Ungültiger Carousel-Text.');if(o.imageId&&!q.images.some(im=>im.id===o.imageId))throw Error('Carousel-Bild fehlt.');}
}

const carouselUI={tool:'select',ids:new Set(),editing:null,space:false,content:false,framePoints:false,textParagraph:0,textLine:0,guides:true,snap:true,drag:null,clipboard:[],layerDrag:null,propertyUndo:false,snapLines:[],slide:null,touches:new Map(),pinch:null};
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
function carouselSelect(ids){const same=carouselSelection===ids.at(-1);carouselUI.slide=null;carouselUI.ids=new Set(ids);carouselSelection=ids.at(-1)||null;carouselUI.content=false;carouselUI.framePoints=false;if(!same)carouselUI.textParagraph=carouselUI.textLine=0;carouselPanel();carouselRefresh()}
function carouselTool(tool){
 carouselEndText();carouselUI.tool=tool;carouselUI.content=tool==='content';carouselUI.framePoints=false;carouselToolUI();carouselPanel();carouselRefresh();
}
function carouselToolUI(){
 if(!$('#carouselEditor'))return;
 document.querySelectorAll('button[data-tool]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.tool===carouselUI.tool));
 $('#carouselViewport').dataset.tool=carouselUI.space?'hand':carouselUI.tool;
 $('#carouselToolName').textContent=carouselToolNames[carouselUI.tool];
 $('#carouselHint').textContent=({select:'Auswählen & verschieben · Shift: Mehrfachauswahl / 45° · Alt: Kopie ziehen',content:'Bildinhalt im Rahmen verschieben · Doppelklick auf ein Bild zum Umschalten',text:'Textrahmen aufziehen · Doppelklick auf Text zum Schreiben',image:'Bildrahmen aufziehen, danach Bild auswählen',gradient:'Verlaufsrahmen aufziehen · auf bestehendem Verlauf Richtung ziehen',angle:'Winkelrahmen aufziehen · Bildfüllung rechts auswählen',hand:'Montagefläche ziehen · Leertaste: vorübergehend Handwerkzeug',zoom:'Klicken: vergrössern · Alt: verkleinern · Pinch oder Alt/Option + Scrollen: Zoom'})[carouselUI.tool];
}
function carouselBounds(objects){if(!objects.length)return null;const x=Math.min(...objects.map(o=>o.x)),y=Math.min(...objects.map(o=>o.y));return {x,y,w:Math.max(...objects.map(o=>o.x+o.w))-x,h:Math.max(...objects.map(o=>o.y+o.h))-y}}
function carouselPoint(ev){const rect=$('#carouselCanvas').getBoundingClientRect();return {x:(ev.clientX-rect.left)/carouselZoom,y:(ev.clientY-rect.top)/carouselZoom}}
function carouselDefault(type,rect={}){
 const c=p.carousel;const viewport=$('#carouselViewport'),canvasRect=$('#carouselCanvas')?.getBoundingClientRect(),viewRect=viewport?.getBoundingClientRect();const x=Math.max(c.left,Math.min((c.n-1)*c.w,canvasRect&&viewRect?(viewRect.left-canvasRect.left)/carouselZoom:0));
 return {id:uid(),type,name:{text:'Text',gradient:'Verlauf',angle:'Winkel',image:'Bildrahmen'}[type],x,y:c.top,w:Math.min(800,c.w-200),h:type==='text'?200:400,visible:true,locked:false,opacity:1,text:'',size:70,font:'Replica LL',color:'#ffffff',startAlpha:1,endColor:'#000000',endAlpha:0,blend:'source-over',kind:'linear',rotation:0,direction:'right',thickness:150,glow:25,glowColor:'#ffffff',glowAlpha:.6,scale:1,panX:0,panY:0,flipX:1,flipY:1,...rect};
}
function carouselObject(type,rect={}){
 checkpoint();carouselUI.slide=null;carouselUI.framePoints=false;const o=carouselDefault(type,rect);if(type==='angle'&&!rect.w){o.w=550;o.h=1100}
 if(type==='angle')carouselAngleAlign(o);p.carousel.objects.push(o);carouselUI.ids=new Set([o.id]);carouselSelection=o.id;changed();return o;
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
  if(o.type!=='angle'&&!(o.type==='image'&&o.framePoints))return true;
  const ctx=makeCanvas(1,1).getContext('2d');return ctx.isPointInPath(o.type==='angle'?carouselAngleMask(o):carouselImageMask(o),pt.x-o.x,pt.y-o.y);
 });
}
function carouselRender(){
 carouselEndText();document.body.classList.toggle('carousel-mode',carouselActive());$('#carouselEditor')?.remove();if(!carouselActive())return false;
 const c=p.carousel;carouselKeepLogosOnTop(c);c.objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleAlign(o,c));if(carouselUI.slide!==null)carouselUI.slide=Math.max(0,Math.min(c.n-1,carouselUI.slide));const firstView=!Number.isFinite(c.zoom);carouselZoom=c.zoom||carouselZoom;carouselUI.ids=new Set([...carouselUI.ids].filter(id=>c.objects.some(o=>o.id===id)));if(!c.objects.some(o=>o.id===carouselSelection))carouselSelection=null;
 $('#projectName').value=p.meta.title;$('#projectCode').value=p.meta.code;$('#savePSD').hidden=true;
 const host=document.createElement('section');host.id='carouselEditor';host.innerHTML=`
 <nav class="carousel-contextbar" aria-label="Carousel-Aktionen"><div class="carousel-document"><strong>${esc(p.meta.title)}</strong><span>${c.n} Slides · ${c.w} × ${c.h} px</span></div><span id="carouselToolName"></span><div class="carousel-view-actions"><button id="carouselGuidesToggle" aria-pressed="${carouselUI.guides}" title="Hilfslinien anzeigen">Hilfslinien</button><button id="carouselSnapToggle" aria-pressed="${carouselUI.snap}" title="An Hilfslinien einrasten">Einrasten</button></div><span id="carouselNotice" role="status"></span><button id="carouselExport" class="primary">Export</button></nav>
 <nav class="carousel-toolrail" aria-label="Gestaltungswerkzeuge">${Object.entries(carouselToolNames).map(([key,name])=>`<button data-tool="${key}" aria-label="${name}" aria-pressed="${carouselUI.tool===key}" title="${name} (${Object.keys(carouselToolKeys).find(k=>carouselToolKeys[k]===key).toUpperCase()})">${carouselIcon(key)}<span>${name}</span></button>`).join('')}</nav>
 <div id="carouselViewport" tabindex="0" aria-label="Carousel-Montagefläche"><div id="carouselPasteboard"><div id="carouselArtwork"><canvas id="carouselCanvas" aria-label="Carousel-Gestaltung"></canvas><div id="carouselGuides"></div><div id="carouselSnapOverlay"></div><div id="carouselSelectionOverlay"></div><div id="carouselEditingOverlay"></div><div id="carouselSlideControls"></div></div></div></div>
 <aside id="carouselSidebar"><section id="carouselProperties" aria-label="Eigenschaften"></section><section class="carousel-layers-panel"><div class="carousel-section-heading"><h3>Ebenen</h3><span>Oben liegt vorne</span></div><div id="carouselLayers"></div></section></aside><div class="carousel-statusbar"><span id="carouselHint"></span><span id="carouselCoordinates"></span><div class="carousel-zoom-controls"><button id="carouselFit">Einpassen</button><label>Zoom <input id="carouselZoom" type="number" min="5" max="200" step="5" value="${Math.round(carouselZoom*100)}"> %</label></div></div><input id="carouselFile" type="file" accept="image/*" multiple hidden>`;
 document.body.append(host);host.querySelectorAll('button[data-tool]').forEach(btn=>btn.onclick=()=>carouselTool(btn.dataset.tool));
 $('#carouselExport').onclick=()=>{carouselEndText();openExport()};$('#carouselZoom').onchange=ev=>carouselSetZoom(+ev.target.value/100);
 $('#carouselFit').onclick=carouselFit;$('#carouselGuidesToggle').onclick=()=>{carouselUI.guides=!carouselUI.guides;$('#carouselGuidesToggle').setAttribute('aria-pressed',carouselUI.guides);carouselRefresh()};
 $('#carouselSnapToggle').onclick=()=>{carouselUI.snap=!carouselUI.snap;$('#carouselSnapToggle').setAttribute('aria-pressed',carouselUI.snap)};
 const viewport=$('#carouselViewport');if(firstView)carouselZoom=Math.min(.6,(viewport.clientWidth-160)/(c.w*c.n),(viewport.clientHeight-128)/c.h);
 viewport.onscroll=()=>{c.scrollX=viewport.scrollLeft;c.scrollY=viewport.scrollTop};viewport.onpointerdown=carouselPointer;
 viewport.ondblclick=ev=>{if(carouselUI.space||carouselUI.tool==='hand'||ev.target.closest('.carousel-inline-text'))return;const o=carouselHit(carouselPoint(ev));if(!o)return;carouselSelect([o.id]);if(o.type==='text')carouselEditText(o);else if(['image','angle'].includes(o.type)){carouselUI.content=!carouselUI.content;carouselRefresh();carouselPanel()}};
 viewport.onwheel=ev=>{if(ev.ctrlKey||ev.metaKey||ev.altKey){ev.preventDefault();carouselSetZoom(carouselZoom*Math.exp(-ev.deltaY*.003),ev)}else if(ev.shiftKey){ev.preventDefault();viewport.scrollLeft+=ev.deltaY||ev.deltaX}};
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
 if(!carouselActive()||!$('#carouselCanvas'))return;const c=p.carousel;carouselKeepLogosOnTop(c);carouselZoom=Math.max(.05,Math.min(carouselZoom,carouselMaxZoom()));const s=carouselZoom,canvas=$('#carouselCanvas'),generation=++carouselDraw;c.zoom=s;
 if(canvas.width!==Math.ceil(c.w*c.n*s))canvas.width=Math.ceil(c.w*c.n*s);if(canvas.height!==Math.ceil(c.h*s))canvas.height=Math.ceil(c.h*s);$('#carouselArtwork').style.width=canvas.width+'px';$('#carouselArtwork').style.height=canvas.height+'px';const viewport=$('#carouselViewport'),padX=Math.max(400,Math.round(viewport.clientWidth*.8)),padY=Math.max(250,Math.round(viewport.clientHeight*.6));$('#carouselPasteboard').style.width=(canvas.width+2*padX)+'px';$('#carouselPasteboard').style.height=(canvas.height+2*padY)+'px';$('#carouselArtwork').style.left=padX+'px';$('#carouselArtwork').style.top=padY+'px';$('#carouselZoom').value=Math.round(s*100);
 const buffer=makeCanvas(canvas.width,canvas.height);carouselPaint(buffer.getContext('2d'),null,s,false,carouselUI.editing?.id).then(()=>{if(generation===carouselDraw&&canvas.isConnected)canvas.getContext('2d').drawImage(buffer,0,0)}).catch(e=>status(e.message));
 $('#carouselGuides').hidden=!carouselUI.guides;
 $('#carouselGuides').innerHTML=Array.from({length:c.n},(_,i)=>`<div class="slide-guide" style="left:${i*c.w*s}px;width:${c.w*s}px;height:${c.h*s}px"><div class="sixths" style="left:${100*s}px;right:${100*s}px;top:${c.top*s}px;bottom:${c.bottom*s}px"></div></div>`).join('')+`<div class="artwork-safe" style="left:${c.left*s}px;top:${c.top*s}px;width:${(c.w*c.n-c.left-c.right)*s}px;height:${(c.h-c.top-c.bottom)*s}px"></div>`;
 if(carouselSelected().some(o=>o.type==='angle')||carouselUI.tool==='angle')$('#carouselGuides').insertAdjacentHTML('beforeend',Array.from({length:c.n},(_,i)=>`<div class="carousel-angle-axis vertical" style="left:${(i+.5)*c.w*s}px;height:${c.h*s}px"></div>`).join('')+`<div class="carousel-angle-axis horizontal" style="top:${c.h*s/2}px;width:${c.w*c.n*s}px"></div>`);
 const warnings=c.objects.filter(o=>carouselWarning(o)).length;$('#carouselNotice').textContent=warnings?`⚠ ${warnings} Texthinweis${warnings>1?'e':''}`:'';
 carouselDrawSelection();carouselDrawSnap();carouselSlideControls();
 if(carouselUI.editing){const o=c.objects.find(o=>o.id===carouselUI.editing.id);if(o)carouselPositionText(carouselUI.editing.el,o)}
}
function carouselDrawSelection(){
 const root=$('#carouselSelectionOverlay');if(!root)return;root.innerHTML='';const items=carouselSelected().filter(o=>o.visible!==false);let bounds=carouselBounds(items);const content=carouselUI.content&&items.length===1&&['image','angle'].includes(items[0].type)&&items[0].imageId;if(content)bounds=carouselImageBounds(items[0]);if(!bounds||carouselUI.editing){if(carouselUI.slide!==null){const c=p.carousel,frame=document.createElement('div');frame.className='carousel-slide-selection';Object.assign(frame.style,{left:carouselUI.slide*c.w*carouselZoom+'px',top:'0px',width:c.w*carouselZoom+'px',height:c.h*carouselZoom+'px'});root.append(frame)}return;}
 const s=carouselZoom;const frame=document.createElement('div');frame.className='carousel-frame'+(carouselUI.content?' content-selected':'')+(items.every(o=>o.locked)?' locked':'');
 Object.assign(frame.style,{left:bounds.x*s+'px',top:bounds.y*s+'px',width:bounds.w*s+'px',height:bounds.h*s+'px'});
 frame.innerHTML=`<span class="carousel-frame-label">${items.length===1?esc(items[0].name):items.length+' Elemente'}${carouselUI.content?' · Bildinhalt':''}</span>`;
 const points=carouselUI.framePoints&&items.length===1&&items[0].type==='image';
 if(!items.every(o=>o.locked)&&carouselUI.tool!=='hand'&&!carouselUI.content&&!points){for(const corner of ['nw','n','ne','e','se','s','sw','w']){const btn=document.createElement('button');btn.className='carousel-handle';btn.dataset.corner=corner;btn.setAttribute('aria-label','Auswahl skalieren: '+corner);btn.onpointerdown=ev=>{ev.stopPropagation();carouselResize(ev,corner)};frame.append(btn)}}
 if(content){frame.style.pointerEvents='auto';frame.onpointerdown=ev=>{ev.stopPropagation();carouselMove(ev)};if(!items[0].locked)for(const corner of ['nw','n','ne','e','se','s','sw','w']){const btn=document.createElement('button');btn.className='carousel-handle';btn.dataset.corner=corner;btn.setAttribute('aria-label','Bildinhalt skalieren: '+corner);btn.onpointerdown=ev=>{ev.stopPropagation();carouselImageResize(ev,items[0],corner)};frame.append(btn)}}root.append(frame);
 if(items.length===1&&items[0].type==='gradient'&&carouselUI.tool==='gradient')carouselDrawGradient(items[0],root);
 if(items.length===1&&items[0].type==='image'&&!carouselUI.content&&(items[0].framePoints||points))carouselDrawFramePoints(items[0],root,points);
}
function carouselDrawGradient(o,root){
 const start=o.gradientStart||{x:0,y:.5},end=o.gradientEnd||{x:1,y:.5},s=carouselZoom;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('carousel-gradient-line');svg.setAttribute('width',o.w*s);svg.setAttribute('height',o.h*s);Object.assign(svg.style,{left:o.x*s+'px',top:o.y*s+'px'});svg.innerHTML=`<line x1="${start.x*o.w*s}" y1="${start.y*o.h*s}" x2="${end.x*o.w*s}" y2="${end.y*o.h*s}"/>`;root.append(svg);
 for(const [key,point] of [['gradientStart',start],['gradientEnd',end]]){const handle=document.createElement('button');handle.className='carousel-gradient-stop';handle.style.left=(o.x+point.x*o.w)*s+'px';handle.style.top=(o.y+point.y*o.h)*s+'px';handle.style.background=key==='gradientStart'?o.color:o.endColor;handle.setAttribute('aria-label',key==='gradientStart'?'Verlauf Anfang':'Verlauf Ende');handle.onpointerdown=ev=>{ev.stopPropagation();carouselGradientDrag(ev,o,key)};root.append(handle)}
}
function carouselListen(ev,move,finish,cancel=finish){
 ev.preventDefault();const onMove=e=>{if(e.pointerId!==ev.pointerId)return;move(e)};const onUp=e=>{if(e.pointerId!==ev.pointerId)return;window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);carouselUI.drag=null;carouselUI.snapLines=[];carouselDrawSnap();finish(e)};
 carouselUI.drag={cancel:()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);carouselUI.drag=null;carouselUI.snapLines=[];carouselDrawSnap();cancel(ev)}};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onUp);
}
function carouselPointer(ev){
 if(busy||ev.button!==0||ev.target.closest('textarea,button,input,.carousel-inline-text'))return;carouselEndText();
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
 const anchor=carouselSnap(start.x,start.y,{w:0,h:0},ev.ctrlKey||ev.metaKey,[]);start={x:anchor.x,y:anchor.y};
 const sketch=document.createElement('div');sketch.className='carousel-marquee';$('#carouselSelectionOverlay').append(sketch);let rect={x:start.x,y:start.y,w:1,h:1};
 carouselListen(ev,e=>{const end=carouselPoint(e);let w=Math.abs(end.x-start.x),h=Math.abs(end.y-start.y);if(type==='angle')h=w*2;else if(e.shiftKey)w=h=Math.max(w,h);rect={x:end.x<start.x?start.x-w:start.x,y:end.y<start.y?start.y-h:start.y,w:Math.max(1,w),h:Math.max(1,h)};rect=carouselSnapResize(rect,(end.y<start.y?'n':'s')+(end.x<start.x?'w':'e'),e.ctrlKey||e.metaKey,type==='angle'||e.shiftKey,false,[]);carouselUI.snapLines=[...anchor.guides,...rect.guides];carouselDrawSnap();Object.assign(sketch.style,{left:rect.x*carouselZoom+'px',top:rect.y*carouselZoom+'px',width:rect.w*carouselZoom+'px',height:rect.h*carouselZoom+'px'})},()=>{
  if(rect.w*carouselZoom<5||rect.h*carouselZoom<5){sketch.remove();status('Rahmen mit gedrückter Maustaste aufziehen.');return}
  const o=carouselObject(type,{x:rect.x,y:rect.y,w:rect.w,h:rect.h});carouselUI.tool='select';carouselToolUI();if(type==='text')carouselEditText(o);else if(type==='image')carouselFile(o.id);
 },()=>sketch.remove());
}
function carouselMarquee(ev,start,add){
 const existing=add?carouselSelected().map(o=>o.id):[],sketch=document.createElement('div');sketch.className='carousel-marquee';$('#carouselSelectionOverlay').append(sketch);let end=start;
 carouselListen(ev,e=>{end=carouselPoint(e);Object.assign(sketch.style,{left:Math.min(start.x,end.x)*carouselZoom+'px',top:Math.min(start.y,end.y)*carouselZoom+'px',width:Math.abs(end.x-start.x)*carouselZoom+'px',height:Math.abs(end.y-start.y)*carouselZoom+'px'})},()=>{const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(end.x-start.x),h=Math.abs(end.y-start.y);const found=p.carousel.objects.filter(o=>!o.locked&&o.visible!==false&&o.x<x+w&&o.x+o.w>x&&o.y<y+h&&o.y+o.h>y);carouselSelect([...new Set([...existing,...found.map(o=>o.id)])])},()=>sketch.remove());
}
function carouselSnapLines(excluded=[...carouselUI.ids]){
 const c=p.carousel,xs=[0,c.w*c.n,c.left,c.w*c.n-c.right],ys=[0,c.h,c.h/2];
 for(let i=0;i<c.n;i++){xs.push(i*c.w,(i+1)*c.w,(i+.5)*c.w);for(let j=0;j<=6;j++)xs.push(i*c.w+100+j*(c.w-200)/6)}
 for(let j=0;j<=6;j++)ys.push(c.top+j*(c.h-c.top-c.bottom)/6);
 for(const o of c.objects)if(o.visible!==false&&!excluded.includes(o.id)){xs.push(o.x,o.x+o.w,o.x+o.w/2);ys.push(o.y,o.y+o.h,o.y+o.h/2)}
 return {x:[...new Set(xs)],y:[...new Set(ys)]};
}
function carouselNearestSnap(values,lines){
 const tolerance=6/carouselZoom;let best=null;
 for(const value of values)for(const line of lines){const delta=line-value;if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,line}}
 return best;
}
function carouselSnap(x,y,bounds,disabled=false,excluded){
 const guides=[];if(disabled||!carouselUI.snap)return {x,y,guides};const lines=carouselSnapLines(excluded),sx=carouselNearestSnap([x,x+bounds.w,x+bounds.w/2],lines.x),sy=carouselNearestSnap([y,y+bounds.h,y+bounds.h/2],lines.y);
 if(sx){x+=sx.delta;guides.push({axis:'x',value:sx.line})}if(sy){y+=sy.delta;guides.push({axis:'y',value:sy.line})}return {x,y,guides};
}
function carouselSnapResize(rect,corner,disabled=false,preserve=false,symmetric=false,excluded){
 // Snap the dragged edge; the opposite edge (or Alt centre) remains the anchor.
 const result={...rect,guides:[]};if(disabled||!carouselUI.snap)return result;
 const lines=carouselSnapLines(excluded),horizontal=/[ew]/.test(corner),vertical=/[ns]/.test(corner),west=corner.includes('w'),north=corner.includes('n');
 const sx=horizontal?carouselNearestSnap([west?rect.x:rect.x+rect.w],lines.x):null,sy=vertical?carouselNearestSnap([north?rect.y:rect.y+rect.h],lines.y):null;
 const setSize=(w,h)=>({x:symmetric?rect.x+(rect.w-w)/2:west?rect.x+rect.w-w:rect.x,y:symmetric?rect.y+(rect.h-h)/2:north?rect.y+rect.h-h:rect.y,w,h});
 if(preserve){
  const candidates=[];if(sx){const w=rect.w+sx.delta*(west?-1:1)*(symmetric?2:1);candidates.push({w,h:w*rect.h/rect.w,delta:Math.abs(sx.delta)})}if(sy){const h=rect.h+sy.delta*(north?-1:1)*(symmetric?2:1);candidates.push({w:h*rect.w/rect.h,h,delta:Math.abs(sy.delta)})}
  const best=candidates.filter(r=>r.w>=10&&r.h>=10).sort((a,b)=>a.delta-b.delta)[0];if(best)Object.assign(result,setSize(best.w,best.h));
 }else{const w=rect.w+(sx?sx.delta*(west?-1:1)*(symmetric?2:1):0),h=rect.h+(sy?sy.delta*(north?-1:1)*(symmetric?2:1):0);Object.assign(result,setSize(w>=10?w:rect.w,h>=10?h:rect.h))}
 if(sx&&Math.abs((west?result.x:result.x+result.w)-sx.line)<.001)result.guides.push({axis:'x',value:sx.line});if(sy&&Math.abs((north?result.y:result.y+result.h)-sy.line)<.001)result.guides.push({axis:'y',value:sy.line});return result;
}
function carouselDrawSnap(){
 const root=$('#carouselSnapOverlay');if(!root)return;const c=p.carousel,s=carouselZoom;root.innerHTML=carouselUI.snapLines.map(line=>`<div class="carousel-snap-line ${line.axis==='x'?'vertical':'horizontal'}" style="${line.axis==='x'?`left:${line.value*s}px;height:${c.h*s}px`:`top:${line.value*s}px;width:${c.w*c.n*s}px`}"></div>`).join('');
}
function carouselMove(ev){
 let objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;
 const start=carouselPoint(ev),content=carouselUI.content&&objects.length===1&&['image','angle'].includes(objects[0].type);let begun=false,original,bounds;
 carouselListen(ev,e=>{
  const pt=carouselPoint(e);let dx=pt.x-start.x,dy=pt.y-start.y;if(!begun&&Math.hypot(dx,dy)*carouselZoom<3)return;
  if(!begun){checkpoint();if(ev.altKey&&!content){objects=objects.map(o=>{const copy=clone(o);copy.id=uid();p.carousel.objects.push(copy);return copy});carouselUI.ids=new Set(objects.map(o=>o.id));carouselSelection=objects.at(-1).id}original=objects.map(clone);bounds=carouselBounds(original);begun=true}
  if(e.shiftKey){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,length=Math.hypot(dx,dy);dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
  carouselUI.snapLines=[];
  if(content){const o=objects[0],base=original[0];o.panX=base.panX+dx;o.panY=base.panY+dy}
  else{const snap=carouselSnap(bounds.x+dx,bounds.y+dy,bounds,e.ctrlKey||e.metaKey||e.shiftKey);carouselUI.snapLines=snap.guides;objects.forEach((o,i)=>{o.x=original[i].x+snap.x-bounds.x;o.y=original[i].y+snap.y-bounds.y})}
  if(!content&&objects.length===1&&objects[0].type==='angle'&&carouselUI.snap&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){const o=objects[0],raw={...o,x:original[0].x+dx,y:original[0].y+dy},snap=carouselAngleTipSnap(raw);if(snap.x!==null){o.x=snap.x;carouselUI.snapLines=carouselUI.snapLines.filter(line=>line.axis!=='x');carouselUI.snapLines.push({axis:'x',value:carouselAngleTip(o).x})}if(snap.y!==null){o.y=snap.y;carouselUI.snapLines=carouselUI.snapLines.filter(line=>line.axis!=='y');carouselUI.snapLines.push({axis:'y',value:carouselAngleTip(o).y})}}
  carouselRefresh();carouselCoordinates(objects);
 },()=>{if(begun){objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleAlign(o));changed(false)}carouselPanel()});
}
function carouselResize(ev,corner){
 const objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;const start=carouselPoint(ev),base=objects.map(clone),b=carouselBounds(base);let begun=false;
 carouselListen(ev,e=>{
  if(!begun){checkpoint();begun=true}const pt=carouselPoint(e),dx=pt.x-start.x,dy=pt.y-start.y;let w=Math.max(10,b.w+(corner.includes('e')?dx:corner.includes('w')?-dx:0)),h=Math.max(10,b.h+(corner.includes('s')?dy:corner.includes('n')?-dy:0));
  const preserve=e.shiftKey||objects.some(o=>o.type==='angle'||o.type==='logo');if(preserve){if(corner==='n'||corner==='s')w=h*b.w/b.h;else if(corner==='e'||corner==='w')h=w*b.h/b.w;else{const scale=Math.max(w/b.w,h/b.h);w=b.w*scale;h=b.h*scale}}
  let x=corner.includes('w')?b.x+b.w-w:b.x,y=corner.includes('n')?b.y+b.h-h:b.y;if(e.altKey){x=b.x+(b.w-w)/2;y=b.y+(b.h-h)/2}
  const snap=carouselSnapResize({x,y,w,h},corner,e.ctrlKey||e.metaKey,preserve,e.altKey);({x,y,w,h}=snap);carouselUI.snapLines=snap.guides;
  objects.forEach((o,i)=>{const old=base[i];o.x=x+(old.x-b.x)*w/b.w;o.y=y+(old.y-b.y)*h/b.h;o.w=old.w*w/b.w;o.h=old.h*h/b.h;if(e.shiftKey&&o.type==='text'){const factor=w/b.w;o.size=Math.max(1,Math.min(1000,old.size*factor));if(old.textStyles)o.textStyles=old.textStyles.map(style=>style?{...style,size:style.size?Math.max(1,Math.min(1000,style.size*factor)):undefined,leading:style.leading?.map(value=>value==null?null:Math.max(1,Math.min(3000,value*factor)))}:null)}});carouselRefresh();carouselCoordinates(objects);
 },()=>{if(begun){objects.filter(o=>o.type==='angle').forEach(o=>carouselAngleAlign(o));changed(false)}carouselPanel()});
}
function carouselCoordinates(objects){const b=carouselBounds(objects);if(b)$('#carouselCoordinates').textContent=`X ${Math.round(b.x)} · Y ${Math.round(b.y)} · ${Math.round(b.w)} × ${Math.round(b.h)} px`}
function carouselGradientDrag(ev,o,key=null){
 checkpoint();const update=e=>{const pt=carouselPoint(e),point={x:(pt.x-o.x)/o.w,y:(pt.y-o.y)/o.h};if(key)o[key]=point;else o.gradientEnd=point;carouselRefresh()};
 if(!key){const pt=carouselPoint(ev);o.gradientStart={x:(pt.x-o.x)/o.w,y:(pt.y-o.y)/o.h};o.gradientEnd={...o.gradientStart}}
 carouselListen(ev,update,()=>{changed(false);carouselPanel()});
}
function carouselTextLayout(o,ctx=makeCanvas(1,1).getContext('2d')){
 const lines=[];let y=0,offset=0;for(const [paragraph,text] of o.text.split('\n').entries()){
  const style=o.textStyles?.[paragraph],size=style?.size??o.size;ctx.font=`${size}px "${o.font}"`;const wrapped=carouselWrapText(text,o.w,t=>ctx.measureText(t).width);
  wrapped.forEach((part,index)=>{const leading=style?.leading?.[index]??size*1.12;lines.push({text:part.raw.trimEnd(),raw:part.raw,start:offset+part.start,end:offset+part.end,paragraph,index,size,leading,y});y+=leading});offset+=text.length+1;
 }const last=lines.at(-1);return {lines,height:last?last.y+last.size*1.12:0};
}
function carouselTextHeight(o){return carouselTextLayout(o).height}
function carouselPositionText(el,o){Object.assign(el.style,{left:o.x*carouselZoom+'px',top:o.y*carouselZoom+'px',width:o.w*carouselZoom+'px',height:Math.max(o.h,carouselTextHeight(o))*carouselZoom+'px',fontFamily:fontFamily(o.font),fontSize:o.size*carouselZoom+'px',lineHeight:'1.12',color:o.color});el.querySelectorAll('[data-text-size]').forEach(line=>{line.style.fontSize=line.dataset.textSize*carouselZoom+'px';line.style.lineHeight=line.dataset.textSize*1.12*carouselZoom+'px';line.style.height=line.dataset.textHeight*carouselZoom+'px'})}
function carouselEditText(o){
 if(o.locked)return;carouselEndText();carouselUI.ids=new Set([o.id]);carouselSelection=o.id;checkpoint();
 const el=document.createElement('div');el.className='carousel-inline-text';el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-multiline','true');el.setAttribute('aria-label','Text direkt bearbeiten');el.spellcheck=false;
 const edit={id:o.id,el,undo:[],redo:[],composing:false};carouselUI.editing=edit;$('#carouselEditingOverlay').append(el);carouselFormatEditable(el,o);carouselPositionText(el,o);
 const apply=(value,caret,styles,remember=true)=>{const nextStyles=styles??carouselTextStylesForInput(o,value);if(remember&&value!==o.text){edit.undo.push({text:o.text,styles:clone(o.textStyles||[]),caret:Math.min(caret,o.text.length)});if(edit.undo.length>100)edit.undo.shift();edit.redo=[]}o.text=value;o.textStyles=nextStyles;carouselFormatEditable(el,o);carouselEditableCaret(el,caret);changed(false);const sidebar=$('#carouselProperties [data-prop=text]');if(sidebar)sidebar.value=o.text;carouselUpdateWarning(o);carouselTrackTextCaret(o,el);carouselRefreshTextStyles(o)};
 el.oninput=ev=>{if(ev.isComposing||edit.composing)return;const caret=carouselEditableSelection(el).end;apply(carouselEditableValue(el),caret)};
 el.oncompositionstart=()=>edit.composing=true;el.oncompositionend=()=>{edit.composing=false;apply(carouselEditableValue(el),carouselEditableSelection(el).end)};
 el.onbeforeinput=ev=>{if(ev.isComposing||edit.composing)return;const {start,end}=carouselEditableSelection(el);let a=start,b=end,insert='';
  if(['insertParagraph','insertLineBreak'].includes(ev.inputType))insert='\n';else if(ev.inputType==='deleteContentBackward'){if(a===b&&a>0)a-=Array.from(o.text.slice(0,a)).at(-1).length}else if(ev.inputType==='deleteContentForward'){if(a===b&&b<o.text.length)b+=Array.from(o.text.slice(b))[0].length}else return;
  ev.preventDefault();apply(o.text.slice(0,a)+insert+o.text.slice(b),a+insert.length,carouselReplaceTextStyles(o,a,b,insert));
 };
 el.onpaste=ev=>{ev.preventDefault();const text=ev.clipboardData.getData('text/plain').replace(/\r\n?/g,'\n'),{start,end}=carouselEditableSelection(el);apply(o.text.slice(0,start)+text+o.text.slice(end),start+text.length,carouselReplaceTextStyles(o,start,end,text))};
 el.oncopy=el.oncut=ev=>{const {start,end}=carouselEditableSelection(el);if(start===end)return;ev.preventDefault();ev.clipboardData.setData('text/plain',o.text.slice(start,end));if(ev.type==='cut')apply(o.text.slice(0,start)+o.text.slice(end),start,carouselReplaceTextStyles(o,start,end,''))};
 el.onmouseup=el.onkeyup=()=>carouselTrackTextCaret(o,el);
 el.onkeydown=ev=>{const key=ev.key.toLowerCase();if((ev.metaKey||ev.ctrlKey)&&key==='z'){ev.preventDefault();const from=ev.shiftKey?edit.redo:edit.undo,to=ev.shiftKey?edit.undo:edit.redo;if(from.length){const value=from.pop();to.push({text:o.text,styles:clone(o.textStyles||[]),caret:carouselEditableSelection(el).end});apply(value.text,value.caret,value.styles,false)}return}if(ev.key==='Escape'){ev.preventDefault();carouselEndText();$('#carouselViewport').focus()}};
 el.onblur=()=>carouselEndText();carouselPanel();carouselRefresh();el.focus();carouselEditableCaret(el,o.text.length);
}
function carouselEndText(){const edit=carouselUI.editing;if(!edit)return;carouselUI.editing=null;edit.el.onblur=null;edit.el.remove();if(carouselActive()&&$('#carouselProperties')){carouselPanel();carouselRefresh()}}
function carouselUpdateWarning(o){const warning=$('#carouselProperties .carousel-warning');if(warning)warning.textContent=carouselWarning(o)}
function carouselDuplicate(){const objects=carouselSelected().filter(o=>!o.locked);if(!objects.length)return;checkpoint();const copies=objects.map(o=>({...clone(o),id:uid(),x:o.x+30,y:o.y+30}));p.carousel.objects.push(...copies);carouselUI.ids=new Set(copies.map(o=>o.id));carouselSelection=copies.at(-1).id;changed()}
function carouselDelete(){const ids=carouselSelected().filter(o=>!o.locked&&o.type!=='logo').map(o=>o.id);if(!ids.length)return;checkpoint();p.carousel.objects=p.carousel.objects.filter(o=>!ids.includes(o.id));carouselSelection=null;carouselUI.ids.clear();changed()}
function carouselLayerOrder(direction){
 const selectedIds=new Set(carouselSelected().filter(o=>o.type!=='logo').map(o=>o.id));if(!selectedIds.size)return;
 let a=p.carousel.objects.filter(o=>o.type!=='logo');const logos=p.carousel.objects.filter(o=>o.type==='logo');
 if(direction==='front'||direction==='back'){const chosen=a.filter(o=>selectedIds.has(o.id)),rest=a.filter(o=>!selectedIds.has(o.id));a=direction==='front'?[...rest,...chosen]:[...chosen,...rest]}
 else if(direction==='up'){for(let i=a.length-2;i>=0;i--)if(selectedIds.has(a[i].id)&&!selectedIds.has(a[i+1].id))[a[i],a[i+1]]=[a[i+1],a[i]]}
 else{for(let i=1;i<a.length;i++)if(selectedIds.has(a[i].id)&&!selectedIds.has(a[i-1].id))[a[i],a[i-1]]=[a[i-1],a[i]]}
 const next=[...a,...logos];if(next.every((o,i)=>o===p.carousel.objects[i]))return;checkpoint();p.carousel.objects=next;changed();
}
function carouselPanel(){
 if(!carouselActive()||!$('#carouselProperties'))return;const c=p.carousel,items=carouselSelected(),o=items.at(-1),panel=$('#carouselProperties');
 const number=(key,label,min=0,max=100000)=>`<label>${label}<input data-prop="${key}" type="number" value="${Math.round(o[key]*100)/100}" min="${min}" max="${max}" step="any"></label>`;
 const color=(key,label)=>`<label>${label}<input data-prop="${key}" type="color" value="${esc(o[key])}"></label>`;
 const select=(key,label,values)=>`<label>${label}<select data-prop="${key}">${options(values,o[key])}</select></label>`;
 const section=(title,body)=>`<section class="carousel-property-section"><h4>${title}</h4>${body}</section>`;
 const transparency=(key,label,fallback)=>{const value=Math.round((1-(o[key]??fallback))*100);return `<div class="carousel-color-stop">${color(key==='startAlpha'?'color':'endColor',label)}<label class="carousel-transparency-toggle"><input type="checkbox" data-transparent="${key}" ${value>0?'checked':''}> Transparenz</label><label class="carousel-slider"><span>Transparenz <output>${value} %</output></span><input data-prop="${key}" data-transparency="true" type="range" min="0" max="100" step="1" value="${value}" ${value===0?'disabled':''}></label></div>`};
 if(!items.length&&carouselUI.slide!==null){carouselSlidePanel(panel);carouselLayerPanel();return}
 if(items.length>1){panel.innerHTML=`<h3>${items.length} Elemente ausgewählt</h3><p>Gemeinsam verschieben und an den Griffen skalieren.</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button><button id="carouselDelete">Entfernen</button></div>`;$('#carouselDuplicate').onclick=carouselDuplicate;$('#carouselDelete').onclick=carouselDelete}
 else if(o){panel.innerHTML=`<div class="carousel-section-heading"><h3>${esc(o.name)}</h3><span>${o.locked?'Gesperrt':carouselUI.content?'Bildinhalt':'Eigenschaften'}</span></div>${['image','angle'].includes(o.type)?'<button id="carouselReplace" class="primary carousel-place-image">Bild platzieren / ersetzen</button>':''}${section('Transformieren',`<div class="carousel-fields">${number('x','X',-100000)}${number('y','Y',-100000)}${number('w','Breite',1)}${number('h','Höhe',1)}</div>`)}
 ${section('Darstellung',`<div class="carousel-fields carousel-appearance">${select('blend','Mischmodus',[['source-over','Normal'],['multiply','Multiplizieren']])}<label class="carousel-slider"><span>Deckkraft <output>${Math.round(o.opacity*100)} %</output></span><input data-prop="opacity" type="range" min="0" max="100" step="1" value="${Math.round(o.opacity*100)}"></label></div>`)}
 ${o.type==='text'?section('Text',`<label>Inhalt<textarea data-prop="text" placeholder="Text eingeben …">${esc(o.text)}</textarea></label><div class="carousel-fields">${number('size','Standardgrösse',1,1000)}${color('color','Farbe')}</div>${select('font','Schrift',[['Replica LL','Replica'],['Harriet','Harriet Bold'],['Harriet Regular','Harriet Regular'],['Harriet Italic','Harriet Italic']])}<button id="carouselTextEdit">Auf der Fläche bearbeiten</button>`):''}
 ${o.type==='text'?carouselTextStylePanel(o):''}
 ${o.type==='gradient'?section('Verlauf',select('kind','Art',[['linear','Linear'],['radial','Radial']])+`<div class="carousel-fields carousel-gradient-colors">${transparency('startAlpha','Anfangsfarbe',1)}${transparency('endAlpha','Endfarbe',0)}</div>`+number('rotation','Richtung · °',-360,360)+'<button id="carouselGradientEdit">Verlauf auf der Fläche bearbeiten</button>'):''}
 ${o.type==='angle'?section('Winkel',select('direction','Richtung',[['up','Oben'],['right','Rechts'],['down','Unten']])+`<div class="carousel-fields">${number('thickness','Schenkelbreite',1)}${number('glow','Schein · px',0,200)}${color('glowColor','Scheinfarbe')}${number('glowAlpha','Intensität',0,1)}</div><p>Die Spitze sitzt auf einer Slide-Mittellinie. Der Winkel überragt eine Artwork-Kante um mindestens 1 px.</p>`):''}
 ${o.type==='image'?section('Rahmenform',`<div class="carousel-fields carousel-point-count"><button data-frame-count="4" aria-pressed="${!o.framePoints||o.framePoints.length===4}">4 Eckpunkte</button><button data-frame-count="5" aria-pressed="${o.framePoints?.length===5}">5 Eckpunkte</button></div>${o.framePoints?.length===5?`<label>Zusatzpunkt<select id="carouselPointSide">${options([['left','Links'],['right','Rechts'],['top','Oben'],['bottom','Unten']],o.framePointSide||'right')}</select></label>`:''}<button id="carouselFrameEdit" aria-pressed="${carouselUI.framePoints}">${carouselUI.framePoints?'Punktbearbeitung beenden':'Rahmenpunkte bearbeiten'}</button><button id="carouselFrameReset">Rechteck zurücksetzen</button><p>Eckpunkte direkt ziehen, um Bildübergänge hinter dem Winkel zu verbergen. Der Bildinhalt bleibt an seiner Position.</p>`):''}
 ${['image','angle'].includes(o.type)?section('Bildinhalt','<div class="carousel-fields">'+number('scale','Bildzoom',.05,20)+number('panX','Ausschnitt X',-100000)+number('panY','Ausschnitt Y',-100000)+select('flipX','Horizontal',[['1','Original'],['-1','Gespiegelt']])+select('flipY','Vertikal',[['1','Original'],['-1','Gespiegelt']])+'</div><button id="carouselContentEdit">Bildinhalt verschieben</button><button id="carouselImageFit">Rahmen füllen</button>'):''}
 ${o.type==='logo'?section('MKW Logo',select('source','Farbe',[['white','Weiss'],['black','Schwarz']])):''}
 <p class="carousel-warning" role="status">${carouselWarning(o)}</p><div class="carousel-fields"><button id="carouselDuplicate">Duplizieren</button>${o.type!=='logo'?'<button id="carouselDelete">Entfernen</button>':''}</div>`;
  panel.querySelectorAll('[data-prop]').forEach(input=>{input.disabled=!!o.locked||input.disabled;input.onfocus=()=>{carouselUI.propertyUndo=false};input.oninput=()=>{
   let value=['number','range'].includes(input.type)||['flipX','flipY'].includes(input.dataset.prop)?Number(input.value):input.value;
   if(input.type==='number'){if(!Number.isFinite(value))return;value=Math.max(+input.min,Math.min(+input.max,value))}
   if(input.type==='range'){input.closest('label').querySelector('output').value=value+' %';value=input.dataset.transparency?1-value/100:value/100}
   if(!carouselUI.propertyUndo){checkpoint();carouselUI.propertyUndo=true}const oldRatio=o.h/o.w;if(o.type==='text'&&input.dataset.prop==='text')o.textStyles=carouselTextStylesForInput(o,value);o[input.dataset.prop]=value;
   if(o.type==='angle'){if(input.dataset.prop==='direction'){const tall=o.h>o.w;if((value==='right')!==tall)[o.w,o.h]=[o.h,o.w]}else if(input.dataset.prop==='w')o.h=o.direction==='right'?o.w*2:o.w/2;else if(input.dataset.prop==='h')o.w=o.direction==='right'?o.h/2:o.h*2}
   if(o.type==='angle')carouselAngleAlign(o);if(o.type==='logo'){if(input.dataset.prop==='w')o.h=o.w*oldRatio;if(input.dataset.prop==='h')o.w=o.h/oldRatio}
   if(o.type==='gradient'&&input.dataset.prop==='rotation'){delete o.gradientStart;delete o.gradientEnd}
   changed(false);carouselUpdateWarning(o);
   if(carouselUI.editing?.id===o.id&&input.dataset.prop==='text')carouselFormatEditable(carouselUI.editing.el,o);
   if(o.type==='text'&&['text','size','font','w'].includes(input.dataset.prop))carouselRefreshTextStyles(o);
   for(const key of ['x','y','w','h']){const field=panel.querySelector(`[data-prop="${key}"]`);if(field&&field!==input)field.value=Math.round(o[key]*100)/100}
  }});
  panel.querySelectorAll('[data-transparent]').forEach(input=>{input.disabled=!!o.locked;input.onchange=()=>{checkpoint();const key=input.dataset.transparent;o[key]=input.checked ? .5 : 1;changed(false);carouselPanel()}});
  $('#carouselDuplicate').onclick=carouselDuplicate;if($('#carouselDelete'))$('#carouselDelete').onclick=carouselDelete;
  if($('#carouselReplace'))$('#carouselReplace').onclick=()=>carouselFile(o.id);
  if($('#carouselTextEdit'))$('#carouselTextEdit').onclick=()=>carouselEditText(o);
  if(o.type==='text')carouselBindTextStyles(o,panel);
  if($('#carouselGradientEdit'))$('#carouselGradientEdit').onclick=()=>carouselTool('gradient');
  if($('#carouselContentEdit'))$('#carouselContentEdit').onclick=()=>carouselTool('content');
  if($('#carouselImageFit'))$('#carouselImageFit').onclick=()=>{checkpoint();o.scale=1;o.panX=o.panY=0;changed(false);carouselPanel()};
  panel.querySelectorAll('[data-frame-count]').forEach(btn=>btn.onclick=()=>carouselSetFramePoints(o,+btn.dataset.frameCount));
  if($('#carouselPointSide')){$('#carouselPointSide').disabled=!!o.locked;$('#carouselPointSide').onchange=ev=>carouselSetFramePoints(o,5,ev.target.value)}
  if($('#carouselFrameEdit'))$('#carouselFrameEdit').onclick=()=>{carouselUI.framePoints=!carouselUI.framePoints;carouselUI.content=false;carouselUI.tool='select';carouselToolUI();carouselRefresh();carouselPanel()};
  if($('#carouselFrameReset'))$('#carouselFrameReset').onclick=()=>{checkpoint();delete o.framePoints;delete o.framePointSide;carouselUI.framePoints=false;changed(false);carouselPanel()};
  if(o.locked)panel.querySelectorAll('button:not(#carouselDuplicate)').forEach(btn=>btn.disabled=true);
 }else{panel.innerHTML=`<h3>Dokument</h3><p>Werkzeug links auswählen. Rahmen aufziehen oder vorhandene Elemente mit dem Auswahlwerkzeug anklicken.</p>${section('Hintergrund',`<label>Farbe<input id="carouselBackground" type="color" value="${c.bg}"></label>`)}<p>V Auswahl · T Text · F Bildrahmen · G Verlauf · W Winkel · H Hand · Z Zoom</p><p>Leertaste zum Verschieben der Montagefläche. Shift zum Hinzufügen zur Auswahl.</p>`;$('#carouselBackground').onchange=e=>{checkpoint();c.bg=e.target.value;changed(false)}}
 carouselLayerPanel();
}
function carouselLayerPanel(){
 const c=p.carousel;carouselKeepLogosOnTop(c);const ids=new Set(carouselSelected().map(o=>o.id));
 $('#carouselLayers').innerHTML=[...c.objects].reverse().map(o=>`<div class="carousel-layer ${ids.has(o.id)?'active':''}" data-layer="${o.id}" draggable="${o.type!=='logo'}"><button data-action="visible" aria-label="${o.visible===false?'Einblenden':'Ausblenden'}: ${esc(o.name)}">${o.visible===false?'○':'●'}</button><button data-action="locked" aria-label="${o.locked?'Entsperren':'Sperren'}: ${esc(o.name)}">${o.locked?'▣':'◇'}</button><button class="carousel-layer-name" data-action="select" title="${esc(o.name)}">${carouselIcon(o.type==='logo'?'image':o.type)}<span>${esc(o.name)}${carouselWarning(o)?' ⚠':''}</span></button><button data-action="up" ${o.type==='logo'||c.objects[c.objects.indexOf(o)+1]?.type==='logo'?'disabled':''} aria-label="Nach vorne: ${esc(o.name)}">↑</button><button data-action="down" ${o.type==='logo'||c.objects.indexOf(o)===0?'disabled':''} aria-label="Nach hinten: ${esc(o.name)}">↓</button></div>`).join('');
 $('#carouselLayers').querySelectorAll('[data-layer]').forEach(row=>{
  row.ondragstart=ev=>{carouselUI.layerDrag=row.dataset.layer;ev.dataTransfer.setData('text/plain',row.dataset.layer);ev.dataTransfer.effectAllowed='move'};
  row.ondragover=ev=>{ev.preventDefault();row.classList.add('drop-target')};row.ondragleave=()=>row.classList.remove('drop-target');
  row.ondrop=ev=>{ev.preventDefault();ev.stopPropagation();row.classList.remove('drop-target');const source=carouselUI.layerDrag,target=row.dataset.layer;if(!source||source===target)return;const index=c.objects.findIndex(o=>o.id===source);if(index<0||c.objects[index].type==='logo')return;checkpoint();const [o]=c.objects.splice(index,1),targetIndex=c.objects.findIndex(o=>o.id===target);c.objects.splice(targetIndex+1,0,o);carouselUI.layerDrag=null;changed()};
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
 if(key.startsWith('arrow')){const chosen=carouselSelected().filter(o=>!o.locked);if(!chosen.length)return;ev.preventDefault();checkpoint();const delta=ev.shiftKey?10:1;chosen.forEach(o=>{if(key==='arrowleft')o.x-=delta;if(key==='arrowright')o.x+=delta;if(key==='arrowup')o.y-=delta;if(key==='arrowdown')o.y+=delta});chosen.filter(o=>o.type==='angle').forEach(o=>carouselAngleAlign(o));changed(false);carouselPanel();return}
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
function carouselAngleBleed(o,c=p.carousel,lockedAxis=null){
 const width=c.w*c.n,height=c.h;
 if(lockedAxis!=='x'){if(o.x>=width)o.x=width-1;if(o.x+o.w<=0)o.x=1-o.w;}
 if(lockedAxis!=='y'){if(o.y>=height)o.y=height-1;if(o.y+o.h<=0)o.y=1-o.h;}
 const crosses=(o.x<=-1&&o.x+o.w>0)||(o.x+o.w>=width+1&&o.x<width)||(o.y<=-1&&o.y+o.h>0)||(o.y+o.h>=height+1&&o.y<height);if(crosses)return;
 const edges=[{axis:'x',value:-1},{axis:'x',value:width-o.w+1},{axis:'y',value:-1},{axis:'y',value:height-o.h+1}].filter(edge=>edge.axis!==lockedAxis).sort((a,b)=>Math.abs(o[a.axis]-a.value)-Math.abs(o[b.axis]-b.value));o[edges[0].axis]=edges[0].value;
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
function carouselKeepLogosOnTop(c=p.carousel){
 const first=c.objects.findIndex(o=>o.type==='logo');if(first<0||!c.objects.slice(first).some(o=>o.type!=='logo'))return;
 c.objects=[...c.objects.filter(o=>o.type!=='logo'),...c.objects.filter(o=>o.type==='logo')];
}
function carouselAngleTip(o){return {x:o.x+(o.direction==='right'?o.w:o.w/2),y:o.y+(o.direction==='up'?0:o.direction==='down'?o.h:o.h/2)}}
function carouselAngleTipSnap(o,c=p.carousel,tolerance=6/carouselZoom){
 const tip=carouselAngleTip(o),centers=Array.from({length:c.n},(_,i)=>(i+.5)*c.w),nearest=centers.reduce((a,b)=>Math.abs(a-tip.x)<=Math.abs(b-tip.x)?a:b),dy=c.h/2-tip.y;
 return {x:Math.abs(nearest-tip.x)<=tolerance?o.x+nearest-tip.x:null,y:Math.abs(dy)<=tolerance?o.y+dy:null};
}
function carouselAngleAlign(o,c=p.carousel){
 const tip=carouselAngleTip(o),candidates=Array.from({length:c.n},(_,i)=>({axis:'x',value:(i+.5)*c.w-tip.x+o.x}));candidates.push({axis:'y',value:c.h/2-tip.y+o.y});
 let best=null,distance=Infinity;for(const {axis,value} of candidates){const candidate={...o,[axis]:value};carouselAngleBleed(candidate,c,axis);const score=Math.hypot(candidate.x-o.x,candidate.y-o.y);if(score<distance){best=candidate;distance=score}}o.x=best.x;o.y=best.y;
}
function carouselFramePoints(o){return o.framePoints||[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]}
function carouselImageMask(o){const path=new Path2D(),points=carouselFramePoints(o);points.forEach((point,i)=>path[i?'lineTo':'moveTo'](point.x*o.w,point.y*o.h));path.closePath();return path}
function carouselFrameCorners(o){const points=carouselFramePoints(o).map(point=>({...point}));if(points.length===5)points.splice({top:1,right:2,bottom:3,left:4}[o.framePointSide||'right'],1);return points}
function carouselSetFramePoints(o,count,side=o.framePointSide||'right'){
 if(o.locked)return;checkpoint();const base=clone(o),points=carouselFrameCorners(o);if(count===5){const index={top:0,right:1,bottom:2,left:3}[side],a=points[index],b=points[(index+1)%4];points.splice(index+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2})}o.framePointSide=side;carouselSetImageFrame(o,base,points.map(point=>({x:base.x+point.x*base.w,y:base.y+point.y*base.h})));carouselUI.framePoints=true;carouselUI.content=false;carouselUI.tool='select';carouselToolUI();changed(false);carouselPanel();
}
function carouselDrawFramePoints(o,root,editing){
 const points=carouselFramePoints(o),s=carouselZoom,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('carousel-frame-path');svg.setAttribute('width',o.w*s);svg.setAttribute('height',o.h*s);Object.assign(svg.style,{left:o.x*s+'px',top:o.y*s+'px'});svg.innerHTML=`<polygon points="${points.map(point=>`${point.x*o.w*s},${point.y*o.h*s}`).join(' ')}"/>`;root.append(svg);
 if(editing&&!o.locked)points.forEach((point,index)=>{const handle=document.createElement('button');handle.className='carousel-point-handle';handle.dataset.framePoint=index;handle.setAttribute('aria-label',`Rahmenpunkt ${index+1} verschieben`);handle.style.left=(o.x+point.x*o.w)*s+'px';handle.style.top=(o.y+point.y*o.h)*s+'px';handle.onpointerdown=ev=>{ev.stopPropagation();carouselFramePointDrag(ev,o,index)};root.append(handle)});
}
function carouselFramePointDrag(ev,o,index){
 if(o.locked)return;const start=carouselPoint(ev),base=clone(o),original=carouselFramePoints(base).map(point=>({x:base.x+point.x*base.w,y:base.y+point.y*base.h}));let begun=false;
 carouselListen(ev,e=>{
  const pt=carouselPoint(e);let dx=pt.x-start.x,dy=pt.y-start.y;if(!begun&&Math.hypot(dx,dy)*carouselZoom<2)return;if(!begun){checkpoint();begun=true}
  if(e.shiftKey){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,length=Math.hypot(dx,dy);dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
  const snap=carouselSnap(original[index].x+dx,original[index].y+dy,{w:0,h:0},e.ctrlKey||e.metaKey||e.shiftKey),points=original.map(point=>({...point}));points[index]={x:snap.x,y:snap.y};carouselUI.snapLines=snap.guides;
  if(!carouselSetImageFrame(o,base,points))return;carouselRefresh();carouselCoordinates([o]);
 },()=>{if(begun)changed(false);carouselPanel()});
}
function carouselTextStylePanel(o){
 const paragraphs=o.text.split('\n');carouselUI.textParagraph=Math.max(0,Math.min(paragraphs.length-1,carouselUI.textParagraph));const paragraph=carouselUI.textParagraph,lines=carouselTextLayout(o).lines.filter(line=>line.paragraph===paragraph);carouselUI.textLine=Math.max(0,Math.min(lines.length-1,carouselUI.textLine));const line=lines[carouselUI.textLine];
 const label=(text)=>text.trim().slice(0,30)||'Leer';return `<section id="carouselTextStyles" class="carousel-property-section"><h4>Absätze & Zeilen</h4><label>Absatz<select id="carouselTextParagraph">${options(paragraphs.map((text,i)=>[String(i),`${i+1} · ${label(text)}`]),String(paragraph))}</select></label><label>Absatzgrösse (px)<input id="carouselParagraphSize" type="number" min="1" max="1000" step="any" value="${o.textStyles?.[paragraph]?.size??o.size}"></label><button id="carouselParagraphReset">Standardgrösse übernehmen</button><label>Zeile im Absatz<select id="carouselTextLine">${options(lines.map((line,i)=>[String(i),`${i+1} · ${label(line.text)}`]),String(carouselUI.textLine))}</select></label><label>Abstand zur nächsten Zeile (px)<input id="carouselLineLeading" type="number" min="1" max="3000" step="any" value="${Math.round(line.leading*100)/100}"></label><button id="carouselLeadingReset">Automatischen Zeilenabstand verwenden</button><p>Jeder Absatz erhält seine eigene Schriftgrösse. Der Zeilenabstand gilt nur für die ausgewählte Zeile – auch bei automatischen Umbrüchen.</p></section>`;
}
function carouselBindTextStyles(o,panel){
 for(const id of ['carouselTextParagraph','carouselTextLine','carouselParagraphSize','carouselLineLeading'])$('#'+id).disabled=!!o.locked;
 $('#carouselTextParagraph').onchange=ev=>{carouselUI.textParagraph=+ev.target.value;carouselUI.textLine=0;carouselPanel()};$('#carouselTextLine').onchange=ev=>{carouselUI.textLine=+ev.target.value;carouselPanel()};
 const edit=(input,key)=>{input.onfocus=()=>{carouselUI.propertyUndo=false};input.oninput=()=>{const value=+input.value;if(!Number.isFinite(value)||value<+input.min||value>+input.max)return;if(!carouselUI.propertyUndo){checkpoint();carouselUI.propertyUndo=true}o.textStyles??=[];const style=o.textStyles[carouselUI.textParagraph]??={};if(key==='size')style.size=value;else{style.leading??=[];style.leading[carouselUI.textLine]=value}changed(false);carouselUpdateWarning(o);if(key==='size'){const lines=carouselTextLayout(o).lines.filter(line=>line.paragraph===carouselUI.textParagraph);carouselUI.textLine=Math.min(carouselUI.textLine,lines.length-1);$('#carouselTextLine').innerHTML=options(lines.map((line,i)=>[String(i),`${i+1} · ${line.text.slice(0,30)||'Leer'}`]),String(carouselUI.textLine));$('#carouselLineLeading').value=Math.round(lines[carouselUI.textLine].leading*100)/100;}}};
 edit($('#carouselParagraphSize'),'size');edit($('#carouselLineLeading'),'leading');
 const reset=key=>{checkpoint();const style=o.textStyles?.[carouselUI.textParagraph];if(style){if(key==='size')delete style.size;else if(style.leading)style.leading[carouselUI.textLine]=null}changed(false);carouselPanel()};$('#carouselParagraphReset').onclick=()=>reset('size');$('#carouselLeadingReset').onclick=()=>reset('leading');
}
function carouselWrapText(text,width,measure){
 if(!text.length)return [{raw:'',start:0,end:0}];const parts=[];let start=0;
 while(start<text.length){let end=start,fit=start,space=-1;for(const char of Array.from(text.slice(start))){end+=char.length;if(fit>start&&measure(text.slice(start,end).trimEnd())>width)break;fit=end;if(/\s/u.test(char))space=end}const stop=fit<text.length&&space>start?space:fit;parts.push({raw:text.slice(start,stop),start,end:stop});start=stop}
 return parts;
}
function carouselFormatEditable(el,o){
 const layout=carouselTextLayout(o),paragraphs=o.text.split('\n');el.innerHTML=paragraphs.map((_,paragraph)=>`<div data-text-paragraph="${paragraph}">${layout.lines.filter(line=>line.paragraph===paragraph).map(line=>`<span class="carousel-text-line" data-text-start="${line.start}" data-text-end="${line.end}" data-text-size="${line.size}" data-text-height="${line===layout.lines.at(-1)?line.size*1.12:line.leading}">${line.raw?esc(line.raw):'<br data-placeholder="true">'}</span>`).join('')}</div>`).join('');carouselPositionText(el,o);
}
function carouselEditableValue(root){
 if(root.nodeType===Node.TEXT_NODE)return root.textContent;if(root.nodeName==='BR')return root.hasAttribute('data-placeholder')?'':'\n';return [...root.childNodes].map((child,i)=>(i&&['DIV','P'].includes(child.nodeName)?'\n':'')+carouselEditableValue(child)).join('');
}
function carouselEditableSelection(el){
 const selection=window.getSelection();if(!selection.rangeCount||!el.contains(selection.anchorNode)||!el.contains(selection.focusNode)){const end=carouselEditableValue(el).length;return {start:end,end}}
 const range=selection.getRangeAt(0),offset=(node,pos)=>{const prefix=document.createRange();prefix.selectNodeContents(el);prefix.setEnd(node,pos);return carouselEditableValue(prefix.cloneContents()).length};return {start:offset(range.startContainer,range.startOffset),end:offset(range.endContainer,range.endOffset)};
}
function carouselEditableCaret(el,offset){
 const lines=[...el.querySelectorAll('[data-text-start]')],line=lines.find(line=>+line.dataset.textStart<=offset&&offset<=+line.dataset.textEnd)||lines.at(-1);if(!line)return;const range=document.createRange();if(line.firstChild?.nodeType===Node.TEXT_NODE)range.setStart(line.firstChild,Math.max(0,Math.min(line.firstChild.length,offset-line.dataset.textStart)));else range.setStart(line,0);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
}

function carouselReplaceTextStyles(o,start,end,text){
 const styles=clone(o.textStyles||[]);while(styles.length<o.text.split('\n').length)styles.push(null);const paragraph=o.text.slice(0,start).split('\n').length-1,removed=o.text.slice(start,end).split('\n').length-1,inserted=text.split('\n').length-1;if(removed)styles.splice(paragraph+1,removed);if(inserted)styles.splice(paragraph+1,0,...Array.from({length:inserted},()=>styles[paragraph]?.size!==undefined?{size:styles[paragraph].size}:null));return styles;
}

function carouselSetImageFrame(o,base,points){
 const x=Math.min(...points.map(point=>point.x)),y=Math.min(...points.map(point=>point.y)),w=Math.max(10,Math.max(...points.map(point=>point.x))-x),h=Math.max(10,Math.max(...points.map(point=>point.y))-y);if(w>100000||h>100000||Math.abs(x)>100000||Math.abs(y)>100000)return false;
 const im=p.images.find(im=>im.id===o.imageId),oldFit=im?Math.max(base.w/im.width,base.h/im.height):1,newFit=im?Math.max(w/im.width,h/im.height):1;
 Object.assign(o,{x,y,w,h,framePoints:points.map(point=>({x:(point.x-x)/w,y:(point.y-y)/h})),scale:base.scale*oldFit/newFit,panX:base.x+base.w/2+base.panX-x-w/2,panY:base.y+base.h/2+base.panY-y-h/2});return true;
}
function carouselTextStylesForInput(o,value){
 let start=0;while(start<o.text.length&&start<value.length&&o.text[start]===value[start])start++;let end=o.text.length,next=value.length;while(end>start&&next>start&&o.text[end-1]===value[next-1]){end--;next--}return carouselReplaceTextStyles(o,start,end,value.slice(start,next));
}
function carouselRefreshTextStyles(o){const section=$('#carouselTextStyles');if(!section)return;section.outerHTML=carouselTextStylePanel(o);carouselBindTextStyles(o,$('#carouselProperties'));if(o.locked)$('#carouselTextStyles').querySelectorAll('button').forEach(btn=>btn.disabled=true)}
function carouselTrackTextCaret(o,el){
 const offset=carouselEditableSelection(el).start,paragraph=o.text.slice(0,offset).split('\n').length-1,lines=carouselTextLayout(o).lines.filter(line=>line.paragraph===paragraph),index=Math.max(0,lines.findIndex(line=>line.start<=offset&&offset<=line.end));if(carouselUI.textParagraph!==paragraph||carouselUI.textLine!==index){carouselUI.textParagraph=paragraph;carouselUI.textLine=index;carouselRefreshTextStyles(o)}
}
