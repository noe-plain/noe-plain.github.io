'use strict';
const elementNames={date:'Konzertdatum',title:'Titel',subtitle:'Untertitel',copyright:'Copyright',logo:'Logo'};
const placeholders={date:'Konzertdatum',title:'TITEL EINGEBEN',subtitle:'Untertitel',copyright:'© Copyright'};
const surfaceScale=()=>.24*view;
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c};
const textMetrics=(e)=>{const ctx=makeCanvas(1,1).getContext('2d');ctx.font=`${e.size}px ${fontFamily(e.role)}`;const lines=e.text.split('\n');return {w:Math.max(e.size,...lines.map(t=>ctx.measureText(t).width)),h:Math.max(1,lines.length)*e.size*1.15}};
async function paint(ctx,b,s=1,opts={}){
 ctx.save();ctx.scale(s,s);
 if(!opts.only||opts.only==='background'){ctx.fillStyle=b.bg;ctx.fillRect(0,0,b.w,b.h)}
 if(!opts.only||opts.only==='image'){
  const im=await image(asset(b).data),t=b.image;
  ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle*Math.PI/180);ctx.scale(t.scale*t.flipX,t.scale*t.flipY);ctx.drawImage(im,-im.width/2,-im.height/2);ctx.restore();
 }
 for(const [key,e] of Object.entries(b.elements)){
  if((opts.only&&opts.only!==key)||(!e.visible&&!opts.includeHidden)||opts.skip===key)continue;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)*Math.PI/180);
  if(key==='logo'){
   const l=await logoImage(e),w=e.size,h=w*l.height/l.width,off=e.align==='center'?-w/2:e.align==='right'?-w:0;ctx.drawImage(l,off,0,w,h);
  }else{
   ctx.font=`${e.size}px ${fontFamily(e.role)}`;ctx.textBaseline='top';ctx.fillStyle=e.color;ctx.textAlign=e.align;e.text.split('\n').forEach((t,i)=>ctx.fillText(t,0,i*e.size*1.15));
  }
  ctx.restore();
 }
 ctx.restore();
}
async function canvasPNG(b){await document.fonts.ready;const c=makeCanvas(b.w,b.h);await paint(c.getContext('2d',{colorSpace:'srgb'}),b);return c.toDataURL('image/png')}
let drawing=false,drawAgain=false;
async function draw(){
 if(drawing){drawAgain=true;return}drawing=true;
 try{
  for(const b of p.boards){const c=document.querySelector(`canvas[data-board="${b.id}"]`);if(!c)continue;const s=surfaceScale(),w=Math.round(b.w*s*devicePixelRatio),h=Math.round(b.h*s*devicePixelRatio);const buffer=makeCanvas(w,h);await paint(buffer.getContext('2d',{colorSpace:'srgb'}),b,w/b.w,{skip:editingText?.boardId===b.id?editingText.key:null});if(!c.isConnected)continue;c.width=w;c.height=h;c.getContext('2d').drawImage(buffer,0,0)}
  syncOverlays();updateWarning();
 }catch(e){status(e.message)}finally{drawing=false;if(drawAgain){drawAgain=false;requestAnimationFrame(draw)}}
}
function updateWarning(){const b=board();if(!b){$('#warning').textContent='';return}const fonts=[...new Set(Object.values(b.elements).filter(e=>e.visible&&e.role&&['Replica LL','Harriet'].includes(e.role)&&!fontStatus[e.role]).map(e=>e.role))];$('#warning').textContent=[b.image.scale>1.001?'Bildauflösung gering – Export ist möglich.':'',fonts.length?`${fonts.join(', ')} fehlt · Ersatzschrift aktiv.`:''].filter(Boolean).join(' ')}
function rotatePoint(x,y,angle){const a=angle*Math.PI/180;return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}}
function positionInBoard(ev,b){const r=document.querySelector(`canvas[data-board="${b.id}"]`).getBoundingClientRect();return{x:(ev.clientX-r.left)*b.w/r.width,y:(ev.clientY-r.top)*b.h/r.height}}
function transformRect(b){const im=asset(b),t=b.image;return {x:t.x-im.width*t.scale/2,y:t.y-im.height*t.scale/2,w:im.width*t.scale,h:im.height*t.scale,angle:t.angle}}
function selectBoard(id){selected=id;document.querySelectorAll('.board-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===id));syncOverlays(true);renderPanel();updateWarning()}
function syncOverlays(force=false){
 const s=surfaceScale();
 for(const b of p.boards){const root=document.querySelector(`.interaction[data-board="${b.id}"]`);if(!root)continue;
  const signature=`${step}:${selected===b.id}:${layer}`;
  if(root.dataset.signature!==signature||force){
   if(editingText?.boardId===b.id)continue;
   root.dataset.signature=signature;root.innerHTML='';
   if(step==='crop'&&selected===b.id){const box=document.createElement('div');box.className='image-transform';for(let n=0;n<4;n++){const h=document.createElement('button');h.className='handle';h.dataset.corner=n;h.setAttribute('aria-label','Bild proportional skalieren');h.onpointerdown=ev=>beginMove(ev,b,'image',n);box.append(h)}root.append(box)}
   if(step==='text')for(const key of ['date','title','subtitle','copyright']){
    const el=document.createElement('div');el.className='text-editor';el.contentEditable='plaintext-only';el.spellcheck=false;el.dataset.key=key;el.dataset.placeholder=placeholders[key];el.setAttribute('role','textbox');el.setAttribute('aria-label',`${elementNames[key]} · ${asset(b).name} · ${MKW.ratio(b.w,b.h)}`);el.onfocus=()=>beginText(b,key,el);el.oninput=()=>inputText(b,key,el);el.onblur=()=>endText(b,key,el);el.onkeydown=ev=>{if(ev.key==='Escape'){el.blur();ev.preventDefault()}};root.append(el);
    if(selected===b.id&&layer===key){const move=document.createElement('button');move.className='text-move';move.dataset.key=key;move.innerHTML=icon('move');move.title='Text verschieben';move.setAttribute('aria-label','Text verschieben');move.onpointerdown=ev=>beginMove(ev,b,key);root.append(move)}
   }
   if(step==='logo'&&selected===b.id&&b.elements.logo.visible){const frame=document.createElement('div');frame.className='element-frame';frame.onpointerdown=ev=>beginMove(ev,b,'logo');const h=document.createElement('button');h.className='handle';h.title='Logo skalieren';h.setAttribute('aria-label','Logo skalieren');h.onpointerdown=ev=>{ev.stopPropagation();beginMove(ev,b,'logo',2)};frame.append(h);root.append(frame)}
  }
  const rect=root.querySelector('.image-transform');if(rect){const r=transformRect(b);Object.assign(rect.style,{left:r.x*s+'px',top:r.y*s+'px',width:r.w*s+'px',height:r.h*s+'px',transform:`rotate(${r.angle}deg)`})}
  for(const el of root.querySelectorAll('.text-editor')){const e=b.elements[el.dataset.key],m=textMetrics(e),displayW=Math.max(m.w*s+3,e.text?0:110),off=e.align==='center'?-displayW/2:e.align==='right'?-displayW:0;const editing=editingText?.el===el;
   if(!editing)el.textContent=e.text;
   Object.assign(el.style,{left:e.x*s+'px',top:e.y*s+'px',fontFamily:fontFamily(e.role),fontSize:e.size*s+'px',width:displayW+'px',textAlign:e.align,transform:`rotate(${e.angle||0}deg) translateX(${off}px)`,color:editing||!e.visible?e.color:'transparent',textShadow:editing?'0 1px 2px #0002':'none',opacity:e.visible||editing?'1':'.65'});
  }
  for(const el of root.querySelectorAll('.text-move')){const e=b.elements[el.dataset.key];el.style.left=e.x*s-24+'px';el.style.top=e.y*s-24+'px'}
  const frame=root.querySelector('.element-frame');if(frame){const e=b.elements.logo;logoImage(e).then(im=>{const w=e.size,h=w*im.height/im.width,off=e.align==='center'?-w/2:e.align==='right'?-w:0;Object.assign(frame.style,{left:e.x*s+'px',top:e.y*s+'px',width:w*s+'px',height:h*s+'px',transform:`rotate(${e.angle||0}deg) translateX(${off*s}px)`})})}
 }
}
let movement=null;
function beginMove(ev,b,key,corner=null){if(busy||ev.button!==0)return;ev.preventDefault();ev.stopPropagation();if(editingText)editingText.el.blur();selected=b.id;layer=key;checkpoint();const initial=clone(key==='image'?b.image:b.elements[key]);movement={b,key,corner,initial,start:positionInBoard(ev,b)};
 if(key==='image'&&corner!==null){const im=asset(b),sx=[-1,1,1,-1][corner],sy=[-1,-1,1,1][corner],v=rotatePoint(-sx*im.width*initial.scale/2,-sy*im.height*initial.scale/2,initial.angle);movement.fixed={x:initial.x+v.x,y:initial.y+v.y};movement.signs={sx,sy}}
 document.querySelectorAll('.board-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===b.id));renderPanel();syncOverlays();
}
window.addEventListener('pointermove',ev=>{
 if(!movement)return;ev.preventDefault();const {b,key,corner,initial:i,start}=movement,pt=positionInBoard(ev,b),e=key==='image'?b.image:b.elements[key];
 if(key==='image'&&corner!==null){const im=asset(b),{fixed,signs:{sx,sy}}=movement,q=rotatePoint(pt.x-fixed.x,pt.y-fixed.y,-i.angle);const scale=Math.max(.001,Math.min(100,(q.x*sx*im.width+q.y*sy*im.height)/(im.width**2+im.height**2)));const v=rotatePoint(sx*im.width*scale/2,sy*im.height*scale/2,i.angle);e.scale=scale;e.x=fixed.x+v.x;e.y=fixed.y+v.y}
 else if(corner!==null){e.size=Math.max(1,Math.min(5000,i.size*Math.hypot(pt.x-i.x,pt.y-i.y)/Math.max(1,Math.hypot(start.x-i.x,start.y-i.y))))}
 else{e.x=i.x+pt.x-start.x;e.y=i.y+pt.y-start.y}
 changed(false);
},{passive:false});
function finishMovement(){if(movement){movement=null;renderPanel();draw()}}
window.addEventListener('pointerup',finishMovement);window.addEventListener('pointercancel',finishMovement);
