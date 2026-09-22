'use strict';
const elementNames={date:'Überschrift',title:'Konzerttitel',subtitle:'Untertitel',copyright:'Copyright',logo:'Logo'};
const placeholders={date:'Überschrift',title:'TITEL EINGEBEN',subtitle:'Untertitel',copyright:'© Copyright'};
const surfaceScale=()=>.24*view;
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c};
const measureContext=makeCanvas(1,1).getContext('2d');
function measureTextWidth(text,size,role,family=false){measureContext.fontKerning=family?'none':'auto';measureContext.font=`${size}px ${fontFamily(role)}`;return family?MKWFamily.runs(text).reduce((width,run)=>width+measureContext.measureText(run.text).width,0):measureContext.measureText(text).width}
function textBlock(b,key){const layout=MKWLayout.textLayout(b,(text,size,role)=>measureTextWidth(text,size,role,b.family?.enabled),key),e=layout.copyright;if(e&&e.text){measureContext.font=`${e.size}px ${fontFamily(e.role)}`;measureContext.textBaseline='top';const m=measureContext.measureText(e.text);e.x=layout.safe.x+layout.safe.w+layout.safe.right/2-(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2;e.y=layout.safe.y+layout.safe.h-m.actualBoundingBoxLeft;}return layout}
const textMetrics=e=>({w:e.w||Math.max(e.size,...(e.lines||e.text.split('\n')).map(t=>measureTextWidth(t,e.size,e.role))),h:e.h||(e.lines||e.text.split('\n')).length*e.size*MKWLayout.lineHeight(e)});
const logoAspects=new Map();
async function prepareLogo(b){const im=await logoImage(b.elements.logo),aspect=im.width/im.height;logoAspects.set(b.id,aspect);MKWLayout.constrainLogo(b,aspect);return im}
// Rasterize the actual alpha silhouette first; blur only a black mask, never the SVG box.
const LOGO_SHADOW_BLUR=150,LOGO_SHADOW_PADDING=LOGO_SHADOW_BLUR*4+4;
const logoShadowCache=new Map();
function softLogoShadow(ctx,b,logo,opacity=.28){
 const e=b.elements.logo,w=e.size,h=w*logo.height/logo.width,pad=LOGO_SHADOW_PADDING;
 const key=JSON.stringify([logo.src,w,h]);let shadow=logoShadowCache.get(key);
 if(!shadow){
  const mask=makeCanvas(w+2*pad,h+2*pad),m=mask.getContext('2d');
  m.drawImage(logo,pad,pad,w,h);m.globalCompositeOperation='source-in';m.fillStyle='#000';m.fillRect(0,0,mask.width,mask.height);
  shadow=makeCanvas(mask.width,mask.height);const blur=shadow.getContext('2d');blur.filter=`blur(${LOGO_SHADOW_BLUR}px)`;blur.drawImage(mask,0,0);
  if(logoShadowCache.size>=12)logoShadowCache.clear();logoShadowCache.set(key,shadow);
 }
 const off=e.align==='center'?-w/2:e.align==='right'?-w:0;
 ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha*=opacity;ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)*Math.PI/180);ctx.drawImage(shadow,off-pad,4-pad);ctx.restore();
}
let gradientCache=null;
function textGradient(ctx,b,layout,opacity=.42){
 const main=layout.mainRecords.filter(e=>e.visible&&e.text);
 const first=main[0],title=main.find(e=>e.key==='title')||first;
 let start=0,baseline=0;
 if(first){
  const tops=main.map(e=>{measureContext.font=`${e.size}px ${fontFamily(e.role)}`;measureContext.textBaseline='top';return e.y-measureContext.measureText(e.lines[0]||'Mg').actualBoundingBoxAscent});
  start=Math.min(...tops)-50;
  measureContext.font=`${title.size}px ${fontFamily(title.role)}`;
  measureContext.textBaseline='alphabetic';const ascent=measureContext.measureText('Mg').actualBoundingBoxAscent;
  measureContext.textBaseline='top';baseline=title.y+ascent-measureContext.measureText('Mg').actualBoundingBoxAscent;
 }
 const signature=JSON.stringify([b.w,b.h,start,baseline,!!first]);
 if(gradientCache?.signature!==signature){
  const canvas=makeCanvas(b.w,b.h),mask=canvas.getContext('2d');
  if(first){const g=mask.createLinearGradient(0,start,0,Math.max(start+1,baseline));g.addColorStop(0,'#0000');g.addColorStop(1,'#000');mask.fillStyle=g;mask.fillRect(0,Math.max(0,start),b.w,b.h-Math.max(0,start))}
  gradientCache={signature,canvas};
 }
 // Apply opacity once, including overlapping gradients, exactly like the PSD layer.
 ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha*=opacity;ctx.drawImage(gradientCache.canvas,0,0);ctx.restore();
}
function familyTextOffset(layout,key,offset=0){for(const e of layout.records){if(e.key===key)break;if(e.visible)offset+=MKWFamily.count(e.lines.join('\n'))}return offset}
function drawText(ctx,layout,opts={}){
 for(const e of layout.records){
  if(!e.visible||!e.text||(opts.only&&opts.only!==e.key)||opts.skip===e.key||(opts.includeKey&&opts.includeKey!==e.key)||opts.excludeKey===e.key)continue;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)*Math.PI/180);ctx.font=`${e.size}px ${fontFamily(e.role)}`;ctx.textBaseline='top';ctx.fillStyle=opts.color||e.color;ctx.textAlign=e.align;ctx.fontKerning=opts.family?.enabled?'none':'auto';
  if(opts.family?.enabled){
   let offset=familyTextOffset(layout,e.key,opts.family.offset);ctx.strokeStyle=MKWFamily.outline;ctx.lineWidth=MKWFamily.outlineWidth;ctx.lineJoin='round';ctx.textAlign='left';
   for(const [lineIndex,line] of e.lines.entries()){
    const runs=MKWFamily.runs(line,offset),width=runs.reduce((sum,run)=>sum+ctx.measureText(run.text).width,0);let x=e.align==='center'?-width/2:e.align==='right'?-width:0;const y=lineIndex*e.size*MKWLayout.lineHeight(e);
    for(const run of runs){if(run.visible){ctx.fillStyle=run.color;ctx.fillText(run.text,x,y);ctx.strokeText(run.text,x,y);offset++}x+=ctx.measureText(run.text).width}
   }
  }else e.lines.forEach((t,i)=>ctx.fillText(t,0,i*e.size*MKWLayout.lineHeight(e)));
  ctx.restore();
 }
}
function drawLogo(ctx,b,logo,opts={}){const e=b.elements.logo;if((opts.only&&opts.only!=='logo')||!e.visible)return;const w=e.size,h=w*logo.height/logo.width,off=e.align==='center'?-w/2:e.align==='right'?-w:0;ctx.save();ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)*Math.PI/180);ctx.drawImage(logo,off,0,w,h);ctx.restore()}
async function paint(ctx,b,s=1,opts={}){
 const layout=textBlock(b,opts.editKey),logo=await prepareLogo(b),safe=layout.safe;
 ctx.save();ctx.scale(s,s);
 if(!opts.only||opts.only==='background'){ctx.fillStyle=b.family?.enabled?b.family.background:b.bg;ctx.fillRect(0,0,b.w,b.h)}
 if(!opts.only||opts.only==='image'){const im=await image(asset(b).data),t=b.image;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle*Math.PI/180);ctx.scale(t.scale*t.flipX,t.scale*t.flipY);ctx.drawImage(im,-im.width/2,-im.height/2);ctx.restore()}
 if(!b.family?.enabled&&(!opts.only||opts.only==='textShadow')&&layout.records.some(e=>e.visible&&e.text))textGradient(ctx,b,layout,opts.only?1:.42);
 if(!b.family?.enabled&&(!opts.only||opts.only==='logoShadow')&&b.elements.logo.visible)softLogoShadow(ctx,b,logo,opts.only?1:.28);
 ctx.save();ctx.beginPath();ctx.rect(safe.x,safe.y,safe.w,safe.h);ctx.clip();
 drawText(ctx,layout,{...opts,family:b.family,excludeKey:'copyright'});
 drawLogo(ctx,b,logo,opts);
 ctx.restore();drawText(ctx,layout,{...opts,family:b.family,includeKey:'copyright'});ctx.restore();
}
async function canvasPNG(b){await document.fonts.ready;const c=makeCanvas(b.w,b.h);await paint(c.getContext('2d',{colorSpace:'srgb'}),b);return c.toDataURL('image/png')}
let drawing=false,drawAgain=false;
async function draw(){
 if(drawing){drawAgain=true;return}drawing=true;
 try{
  for(const b of p.boards){const c=document.querySelector(`canvas[data-board="${b.id}"]`);if(!c)continue;const s=surfaceScale(),w=Math.round(b.w*s*devicePixelRatio),h=Math.round(b.h*s*devicePixelRatio);const buffer=makeCanvas(w,h);await paint(buffer.getContext('2d',{colorSpace:'srgb'}),b,w/b.w,{skip:editingText?.boardId===b.id?editingText.key:null,editKey:step==='text'&&selected===b.id?layer:null});if(!c.isConnected)continue;c.width=w;c.height=h;c.getContext('2d').drawImage(buffer,0,0)}
  syncOverlays();updateWarning();
 }catch(e){status(e.message)}finally{drawing=false;if(drawAgain){drawAgain=false;requestAnimationFrame(draw)}}
}
function updateWarning(){const b=board();if(!b){$('#warning').textContent='';return}const fonts=[...new Set(Object.values(b.elements).filter(e=>e.visible&&e.role&&['Replica LL','Harriet','Harriet Regular','Harriet Italic'].includes(e.role)&&!fontStatus[e.role]).map(e=>e.role))];$('#warning').textContent=[b.image.scale>1.001?'Bildauflösung gering – Export ist möglich.':'',fonts.length?`${fonts.join(', ')} fehlt · Ersatzschrift aktiv.`:'',textBlock(b).factor<.999?'Text wurde verkleinert, damit er vollständig in die Schutzzone passt.':''].filter(Boolean).join(' ')}
function rotatePoint(x,y,angle){const a=angle*Math.PI/180;return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}}
function positionInBoard(ev,b){const r=document.querySelector(`canvas[data-board="${b.id}"]`).getBoundingClientRect();return{x:(ev.clientX-r.left)*b.w/r.width,y:(ev.clientY-r.top)*b.h/r.height}}
function transformRect(b){const im=asset(b),t=b.image;return {x:t.x-im.width*t.scale/2,y:t.y-im.height*t.scale/2,w:im.width*t.scale,h:im.height*t.scale,angle:t.angle}}
function selectBoard(id){selected=id;document.querySelectorAll('.board-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===id));syncOverlays(true);renderPanel();updateWarning()}
function syncOverlays(force=false){
 const s=surfaceScale();
 for(const b of p.boards){const root=document.querySelector(`.interaction[data-board="${b.id}"]`);if(!root)continue;const activeKey=step==='text'&&selected===b.id?layer:null,block=textBlock(b,activeKey),safe=block.safe;
  const signature=`${step}:${selected===b.id}:${layer}:${!!b.family?.enabled}`;
  if((root.dataset.signature!==signature||force)&&editingText?.boardId!==b.id){
   root.dataset.signature=signature;root.innerHTML='';
   if(step!=='export'){const zone=document.createElement('div');zone.className='safe-zone';zone.setAttribute('aria-label',`Schutzzone: oben ${safe.top}, rechts ${safe.right}, unten ${safe.bottom}, links ${safe.left} Pixel`);root.append(zone)}
   if(step==='crop'&&selected===b.id){const box=document.createElement('div');box.className='image-transform';for(let n=0;n<4;n++){const h=document.createElement('button');h.className='handle';h.dataset.corner=n;h.setAttribute('aria-label','Bild proportional skalieren');h.onpointerdown=ev=>beginMove(ev,b,'image',n);box.append(h)}root.append(box)}
   if(step==='text'){
    const group=document.createElement('div');group.className='text-group';group.setAttribute('aria-label','Gemeinsame Textbox');group.onpointerdown=ev=>{if(ev.target===group)beginMove(ev,b,'textBox')};root.append(group);
    if(selected===b.id){const move=document.createElement('button');move.className='text-group-move';move.innerHTML='↕';move.title='Gesamte Textbox nur vertikal verschieben';move.setAttribute('aria-label','Textbox vertikal verschieben');move.onpointerdown=ev=>beginMove(ev,b,'textBox');group.append(move)}
    for(const key of MKWLayout.keys){const el=document.createElement('div');el.className='text-editor'+(key==='copyright'?' copyright-editor':'');el.contentEditable='plaintext-only';el.spellcheck=false;el.dataset.key=key;el.dataset.placeholder=placeholders[key];el.setAttribute('role','textbox');el.setAttribute('aria-label',`${elementNames[key]} · ${asset(b).name} · ${MKW.ratio(b.w,b.h)}`);el.onfocus=()=>beginText(b,key,el);el.oninput=()=>inputText(b,key,el);el.onblur=()=>endText(b,key,el);el.onkeydown=ev=>{if(ev.key==='Escape'){el.blur();ev.preventDefault()}};(key==='copyright'?root:group).append(el)}
   }
   if(step==='logo'&&selected===b.id&&b.elements.logo.visible){const frame=document.createElement('div');frame.className='element-frame';frame.style.pointerEvents='none';root.append(frame)}
  }
  const zone=root.querySelector('.safe-zone');if(zone)Object.assign(zone.style,{left:safe.x*s+'px',top:safe.y*s+'px',width:safe.w*s+'px',height:safe.h*s+'px'});
  const rect=root.querySelector('.image-transform');if(rect){const r=transformRect(b);Object.assign(rect.style,{left:r.x*s+'px',top:r.y*s+'px',width:r.w*s+'px',height:r.h*s+'px',transform:`rotate(${r.angle}deg)`})}
  const group=root.querySelector('.text-group');if(group){Object.assign(group.style,{left:block.x*s+'px',top:block.y*s+'px',width:block.w*s+'px',height:Math.max(1,block.h*s)+'px'});}
  for(const el of root.querySelectorAll('.text-editor')){const e=block.records.find(r=>r.key===el.dataset.key),editing=editingText?.el===el;el.hidden=!e;if(!e)continue;if(!editing)el.textContent=b.elements[e.key].text;
   const copyright=e.key==='copyright';Object.assign(el.style,{left:(copyright?e.x*s:0)+'px',top:(copyright?e.y*s:(e.y-block.y)*s)+'px',fontFamily:fontFamily(e.role),fontKerning:b.family?.enabled?'none':'auto',fontSize:e.size*s+'px',width:(copyright?e.w:block.w)*s+'px',height:e.h*s+'px',lineHeight:e.size*MKWLayout.lineHeight(e)*s+'px',textAlign:e.align,transform:copyright?'rotate(-90deg)':'none',transformOrigin:'0 0',color:editing||!e.visible?(b.family?.enabled?MKWFamily.outline:e.color):'transparent',textShadow:'none',opacity:'1'});
  }
  const frame=root.querySelector('.element-frame');if(frame){const e=b.elements.logo;logoImage(e).then(im=>{MKWLayout.constrainLogo(b,im.width/im.height);const w=e.size,h=w*im.height/im.width,off=e.align==='center'?-w/2:e.align==='right'?-w:0;Object.assign(frame.style,{left:e.x*s+'px',top:e.y*s+'px',width:w*s+'px',height:h*s+'px',transform:`rotate(${e.angle||0}deg) translateX(${off*s}px)`})})}
 }
}
let movement=null;
function beginMove(ev,b,key,corner=null){if(busy||ev.button!==0)return;ev.preventDefault();ev.stopPropagation();if(editingText)editingText.el.blur();selected=b.id;if(key!=='textBox')layer=key;checkpoint();if(key==='textBox')b.textBox={offset:textBlock(b).offset};const initial=clone(key==='image'?b.image:key==='textBox'?b.textBox:b.elements[key]);movement={b,key,corner,initial,start:positionInBoard(ev,b)};
 if(key==='image'&&corner!==null){const im=asset(b),sx=[-1,1,1,-1][corner],sy=[-1,-1,1,1][corner],v=rotatePoint(-sx*im.width*initial.scale/2,-sy*im.height*initial.scale/2,initial.angle);movement.fixed={x:initial.x+v.x,y:initial.y+v.y};movement.signs={sx,sy}}
 document.querySelectorAll('.board-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===b.id));renderPanel();syncOverlays();
}
window.addEventListener('pointermove',ev=>{
 if(!movement)return;ev.preventDefault();const {b,key,corner,initial:i,start}=movement,pt=positionInBoard(ev,b),e=key==='image'?b.image:key==='textBox'?b.textBox:b.elements[key];
 if(key==='textBox'){const block=textBlock(b);e.offset=MKWLayout.clamp(i.offset-(pt.y-start.y),0,block.safe.h-block.h)}
 else if(key==='image'&&corner!==null){const im=asset(b),{fixed,signs:{sx,sy}}=movement,q=rotatePoint(pt.x-fixed.x,pt.y-fixed.y,-i.angle);const scale=Math.max(.001,Math.min(100,(q.x*sx*im.width+q.y*sy*im.height)/(im.width**2+im.height**2)));const v=rotatePoint(sx*im.width*scale/2,sy*im.height*scale/2,i.angle);e.scale=scale;e.x=fixed.x+v.x;e.y=fixed.y+v.y}
 else if(corner!==null){e.size=Math.max(1,Math.min(5000,i.size*Math.hypot(pt.x-i.x,pt.y-i.y)/Math.max(1,Math.hypot(start.x-i.x,start.y-i.y))))}
 else{e.x=i.x+pt.x-start.x;e.y=i.y+pt.y-start.y}
 if(key==='logo')MKWLayout.constrainLogo(b,logoAspects.get(b.id)||3);
 changed(false);
},{passive:false});
function finishMovement(){if(movement){movement=null;renderPanel();draw()}}
window.addEventListener('pointerup',finishMovement);window.addEventListener('pointercancel',finishMovement);
