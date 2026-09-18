'use strict';
const rgb=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
function psdArrangement(){const result=[];let top=0,width=0;for(const im of p.images){let left=0,rowHeight=0;for(const b of p.boards.filter(b=>b.imageId===im.id)){result.push({b,left,top});rowHeight=Math.max(rowHeight,b.h);left+=b.w+100}if(left)width=Math.max(width,left-100);top+=rowHeight+100}return {boards:result,width,height:Math.max(1,top-100)}}
async function layerBitmap(b,key){
 let left=0,top=0,w=b.w,h=b.h;
 if(!['image','background'].includes(key)){
  const e=b.elements[key];let size;
  if(key==='logo'){const im=await logoImage(e);size={w:e.size,h:e.size*im.height/im.width}}else size=textMetrics(e);
  const off=e.align==='center'?-size.w/2:e.align==='right'?-size.w:0;
  const pts=[[off,0],[off+size.w,0],[off+size.w,size.h],[off,size.h]].map(([x,y])=>{const q=rotatePoint(x,y,e.angle||0);return{x:q.x+e.x,y:q.y+e.y}});
  left=Math.max(0,Math.floor(Math.min(...pts.map(q=>q.x)))-8);top=Math.max(0,Math.floor(Math.min(...pts.map(q=>q.y)))-8);w=Math.max(1,Math.min(b.w,Math.ceil(Math.max(...pts.map(q=>q.x)))+8)-left);h=Math.max(1,Math.min(b.h,Math.ceil(Math.max(...pts.map(q=>q.y)))+8)-top);
 }
 const canvas=makeCanvas(w,h),ctx=canvas.getContext('2d',{colorSpace:'srgb'});ctx.translate(-left,-top);await paint(ctx,b,1,{only:key,includeHidden:true});return {canvas,left,top};
}
function textLayerData(e,left,top){
 const ctx=makeCanvas(1,1).getContext('2d');ctx.font=`${e.size}px ${fontFamily(e.role)}`;ctx.textBaseline='alphabetic';const a=ctx.measureText('Mg').actualBoundingBoxAscent;ctx.textBaseline='top';const baseline=a-ctx.measureText('Mg').actualBoundingBoxAscent;const angle=(e.angle||0)*Math.PI/180;
 const f=p.fonts.find(f=>f.role===e.role),name=fontStatus[e.role]?(f?.postscriptName||f?.name.replace(/\.(otf|ttf|woff2?)$/i,'')||e.role):e.role==='Harriet'?'Georgia':'ArialMT';
 return {text:e.text,transform:[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),left+e.x-Math.sin(angle)*baseline,top+e.y+Math.cos(angle)*baseline],shapeType:'point',antiAlias:'smooth',style:{font:{name},fontSize:e.size,fillColor:rgb(e.color),autoLeading:false,leading:e.size*1.15},paragraphStyle:{justification:e.align},orientation:'horizontal'};
}
async function withPSDProfile(buffer){
 // Add Photoshop image resource 1039 (ICC), using the same sRGB profile as JPG.
 const profile=new Uint8Array(await(await fetch('/api/srgb')).arrayBuffer()),data=new Uint8Array(buffer),view=new DataView(buffer),offset=30+view.getUint32(26),length=view.getUint32(offset),resource=new Uint8Array(12+profile.length+(profile.length%2)),rv=new DataView(resource.buffer);
 resource.set([56,66,73,77]);rv.setUint16(4,1039);rv.setUint32(8,profile.length);resource.set(profile,12);const size=new Uint8Array(4);new DataView(size.buffer).setUint32(0,length+resource.length);
 return new Blob([data.subarray(0,offset),size,data.subarray(offset+4,offset+4+length),resource,data.subarray(offset+4+length)],{type:'image/vnd.adobe.photoshop'});
}
async function buildPSD(progress=()=>{}){
 const layout=psdArrangement();if(!layout.boards.length)throw Error('Bitte zuerst Bilder importieren.');
 if(layout.width>30000||layout.height>30000||layout.width*layout.height>80000000)throw Error('Dieses Projekt ist für eine einzelne PSD zu gross (max. 30 000 px je Seite / 80 Mio. Gesamtpixel). Bitte in kleinere MKW-Projekte aufteilen.');
 await document.fonts.ready;const composite=makeCanvas(layout.width,layout.height),ctx=composite.getContext('2d',{colorSpace:'srgb'});const psd={width:layout.width,height:layout.height,canvas:composite,children:[],linkedFiles:[],artboards:{count:layout.boards.length,autoExpandEnabled:false,autoNestEnabled:false,autoPositionEnabled:false},imageResources:{versionInfo:{hasRealMergedData:true,writerName:'MKW Sujet Studio',readerName:'Adobe Photoshop',fileVersion:1},resolutionInfo:{horizontalResolution:72,verticalResolution:72,horizontalResolutionUnit:'PPI',verticalResolutionUnit:'PPI',widthUnit:'Inches',heightUnit:'Inches'}}};
 const linked=new Map();
 for(const [index,{b,left,top}] of layout.boards.entries()){
  progress(`Zeichenfläche ${index+1} / ${layout.boards.length} vorbereiten …`);await new Promise(r=>setTimeout(r,0));const im=asset(b),children=[];
  ctx.save();ctx.translate(left,top);ctx.beginPath();ctx.rect(0,0,b.w,b.h);ctx.clip();await paint(ctx,b);ctx.restore();
  for(const key of ['logo','copyright','subtitle','title','date','image','background']){
   const e=b.elements[key];if(e&&key!=='logo'&&!e.text)continue;
   const bitmap=await layerBitmap(b,key),l={name:key==='image'?im.name:key==='background'?'Hintergrund':elementNames[key],left:left+bitmap.left,top:top+bitmap.top,canvas:bitmap.canvas,hidden:e?!e.visible:false};
   if(e&&key!=='logo')l.text=textLayerData(e,left,top);
   if(key==='image'){
    if(!linked.has(im.id)){const id=uid();linked.set(im.id,id);psd.linkedFiles.push({id,name:im.name.replace(/\.[^.]+$/,'')+'_sRGB.png',type:'PNG ',data:bytesFromData(im.data)})}
    const t=b.image,transform=[[-1,-1],[1,-1],[1,1],[-1,1]].flatMap(([sx,sy])=>{const q=rotatePoint(sx*im.width*t.scale*t.flipX/2,sy*im.height*t.scale*t.flipY/2,t.angle);return[left+t.x+q.x,top+t.y+q.y]});l.placedLayer={id:linked.get(im.id),placed:uid(),type:'raster',width:im.width,height:im.height,transform,resolution:{value:72,units:'Density'}};
   }
   children.push(l);
  }
  psd.children.push({name:`${String(index+1).padStart(2,'0')} · ${im.name.replace(/\.[^.]+$/,'')} · ${MKW.ratio(b.w,b.h)}`,artboard:{rect:{left,top,right:left+b.w,bottom:top+b.h},color:rgb(b.bg),backgroundType:4},opened:true,children:children.reverse()});
 }
 progress('PSD mit Zeichenflächen und Ebenen schreiben …');await new Promise(r=>setTimeout(r,50));psd.children.reverse();const buffer=agPsd.writePsd(psd,{generateThumbnail:true,trimImageData:true});return withPSDProfile(buffer);
}
$('#savePSD').onclick=async()=>{if(busy)return;busy=true;$('#savePSD').disabled=$('#saveProject').disabled=$('#closeSave').disabled=true;try{const file=await buildPSD(text=>$('#psdStatus').textContent=text);download(file,MKW.clean(p.meta.title)+'.psd');$('#psdStatus').textContent='PSD gespeichert: echte Zeichenflächen, bearbeitbare Texte und eingebettete Bild-Smartobjekte. Zum Weiterarbeiten hier zusätzlich MKW speichern.';status('Photoshop-Datei gespeichert.')}catch(e){$('#psdStatus').textContent='PSD konnte nicht gespeichert werden: '+e.message}finally{busy=false;$('#savePSD').disabled=$('#saveProject').disabled=$('#closeSave').disabled=false}};
$('#saveDialog').addEventListener('cancel',ev=>{if(busy)ev.preventDefault()});
