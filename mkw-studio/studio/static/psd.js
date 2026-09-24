'use strict';
const rgb=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
function psdArrangement(){const result=[];let top=0,width=0;for(const im of p.images){let left=0,rowHeight=0;for(const b of p.boards.filter(b=>b.imageId===im.id)){result.push({b,left,top});rowHeight=Math.max(rowHeight,b.h);left+=b.w+100}if(left)width=Math.max(width,left-100);top+=rowHeight+100}return {boards:result,width,height:Math.max(1,top-100)}}
async function layerBitmap(b,key){
 const block=textBlock(b);await prepareLogo(b);let left=0,top=0,w=b.w,h=b.h;
 if(!['image','background','textShadow'].includes(key)){
  let r;if(key==='textShadow')r=MKWLayout.recordsRect(block.records);else if(key==='logoShadow'||key==='logo')r=MKWLayout.logoRect(b.elements.logo,logoAspects.get(b.id));else{const e=block.records.find(e=>e.key===key);r=MKWLayout.recordRect(e)}
  const fade=key==='logoShadow'?LOGO_SHADOW_PADDING:key.endsWith('Shadow')?380:2;left=Math.max(0,Math.floor(r.x-fade));top=Math.max(0,Math.floor(r.y-fade));w=Math.max(1,Math.min(b.w,Math.ceil(r.x+r.w+fade))-left);h=Math.max(1,Math.min(b.h,Math.ceil(r.y+r.h+fade))-top);
 }
 const canvas=makeCanvas(w,h),ctx=canvas.getContext('2d',{colorSpace:'srgb'});ctx.translate(-left,-top);await paint(ctx,b,1,{only:key});return {canvas,left,top};
}
function textLayerData(e,left,top,family,layout){
 const ctx=makeCanvas(1,1).getContext('2d');ctx.font=`${e.size}px ${fontFamily(e.role)}`;ctx.textBaseline='alphabetic';const a=ctx.measureText('Mg').actualBoundingBoxAscent;ctx.textBaseline='top';const baseline=a-ctx.measureText('Mg').actualBoundingBoxAscent;const angle=(e.angle||0)*Math.PI/180;
 const f=p.fonts.find(f=>f.role===e.role),name=fontStatus[e.role]?(f?.postscriptName||f?.name.replace(/\.(otf|ttf|woff2?)$/i,'')||e.role):e.role.startsWith('Harriet')?'Georgia':'ArialMT';
 const result={text:(e.lines||e.text.split('\n')).join('\n'),transform:[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),left+e.x-Math.sin(angle)*baseline,top+e.y+Math.cos(angle)*baseline],shapeType:'point',antiAlias:'smooth',style:{font:{name},fontSize:e.size,fillColor:rgb(e.color),autoLeading:false,leading:e.size*MKWLayout.lineHeight(e)},paragraphStyle:{justification:e.align},orientation:'horizontal'};
 if(family?.enabled&&e.key==='copyright')result.style.fillColor=rgb(MKWFamily.copyrightColor(e.color));
 if(family?.enabled&&e.key!=='copyright'){
  Object.assign(result.style,{autoKerning:false,kerning:0,ligatures:false,strokeFlag:true,fillFlag:true,fillFirst:true,outlineWidth:MKWFamily.outlineWidth,strokeColor:rgb(MKWFamily.outline)});
  result.styleRuns=MKWFamily.runs(result.text,familyTextOffset(layout,e.key,family.offset)).map(run=>({length:run.length,style:{fillColor:rgb(run.color)}}));
 }
 return result;
}
async function withPSDProfile(buffer){
 // Add Photoshop image resource 1039 (ICC), using the same sRGB profile as JPG.
 const profile=new Uint8Array(await(await fetch('static/srgb.icc')).arrayBuffer()),data=new Uint8Array(buffer),view=new DataView(buffer),offset=30+view.getUint32(26),length=view.getUint32(offset),resource=new Uint8Array(12+profile.length+(profile.length%2)),rv=new DataView(resource.buffer);
 resource.set([56,66,73,77]);rv.setUint16(4,1039);rv.setUint32(8,profile.length);resource.set(profile,12);const size=new Uint8Array(4);new DataView(size.buffer).setUint32(0,length+resource.length);
 return new Blob([data.subarray(0,offset),size,data.subarray(offset+4,offset+4+length),resource,data.subarray(offset+4+length)],{type:'image/vnd.adobe.photoshop'});
}
async function buildPSD(progress=()=>{}){
 const layout=psdArrangement();if(!layout.boards.length)throw Error('Bitte zuerst Bilder importieren.');
 if(layout.width>30000||layout.height>30000||layout.width*layout.height>80000000)throw Error('Dieses Projekt ist für eine einzelne PSD zu gross (max. 30 000 px je Seite / 80 Mio. Gesamtpixel). Bitte in kleinere MKW-Projekte aufteilen.');
 await document.fonts.ready;const composite=makeCanvas(layout.width,layout.height),ctx=composite.getContext('2d',{colorSpace:'srgb'});const psd={width:layout.width,height:layout.height,canvas:composite,children:[],linkedFiles:[],artboards:{count:layout.boards.length,autoExpandEnabled:false,autoNestEnabled:false,autoPositionEnabled:false},imageResources:{versionInfo:{hasRealMergedData:true,writerName:'MKW Sujet Studio',readerName:'Adobe Photoshop',fileVersion:1},resolutionInfo:{horizontalResolution:72,verticalResolution:72,horizontalResolutionUnit:'PPI',verticalResolutionUnit:'PPI',widthUnit:'Inches',heightUnit:'Inches'}}};
 const linked=new Map();
 for(const [index,{b,left,top}] of layout.boards.entries()){
  progress(`Zeichenfläche ${index+1} / ${layout.boards.length} vorbereiten …`);await new Promise(r=>setTimeout(r,0));const im=asset(b),children=[],textChildren=[],block=textBlock(b);
  ctx.save();ctx.translate(left,top);ctx.beginPath();ctx.rect(0,0,b.w,b.h);ctx.clip();await paint(ctx,b);ctx.restore();
  for(const key of ['logo','logoShadow','copyright','subtitle','title','date','textShadow','image','background']){
   if(b.family?.enabled&&key==='logoShadow')continue;
   if(b.family?.enabled&&key==='textShadow'){if(textChildren.length)children.push({name:'Text · Familienkonzert',opened:true,children:textChildren.reverse()});continue}
   const shadow=key.endsWith('Shadow'),e=key==='logo'?b.elements.logo:block.records.find(e=>e.key===key);if(key==='logo'||key==='logoShadow'){if(!b.elements.logo.visible)continue}else if((shadow||MKWLayout.keys.includes(key))&&(!block.records.length||(!shadow&&!e)))continue;
   const bitmap=await layerBitmap(b,key),l={name:key==='image'?im.name:key==='background'?'Hintergrund':shadow?'Schatten · Kontur · 28 %':elementNames[key],left:left+bitmap.left,top:top+bitmap.top,canvas:bitmap.canvas,hidden:e?!e.visible:false};
   if(shadow){l.blendMode='multiply';l.opacity=key==='textShadow'?.42:.28;if(key==='textShadow')l.name='Textkontrast · Verlauf · 42 %'}else if(e&&key!=='logo')l.text=textLayerData(e,left,top,b.family,block);
   if(key==='image'){
    if(!linked.has(im.id)){const id=uid();linked.set(im.id,id);psd.linkedFiles.push({id,name:im.name.replace(/\.[^.]+$/,'')+'_sRGB.png',type:'PNG ',data:bytesFromData(im.data)})}
    const t=b.image,transform=[[-1,-1],[1,-1],[1,1],[-1,1]].flatMap(([sx,sy])=>{const q=rotatePoint(sx*im.width*t.scale*t.flipX/2,sy*im.height*t.scale*t.flipY/2,t.angle);return[left+t.x+q.x,top+t.y+q.y]});l.placedLayer={id:linked.get(im.id),placed:uid(),type:'raster',width:im.width,height:im.height,transform,resolution:{value:72,units:'Density'}};
   }
   if(MKWLayout.keys.includes(key)||key==='textShadow'){textChildren.push(l);if(key==='textShadow')children.push({name:'Text · Titelblock + Copyright',opened:true,children:textChildren.reverse()})}else children.push(l);
  }
  const shadowIndex=children.findIndex(l=>l.blendMode==='multiply');if(shadowIndex>=0){const shadow=children.splice(shadowIndex,1)[0];children.splice(children.findIndex(l=>l.placedLayer),0,shadow)}
  psd.children.push({name:`${String(index+1).padStart(2,'0')} · ${im.name.replace(/\.[^.]+$/,'')} · ${MKW.ratio(b.w,b.h)}`,artboard:{rect:{left,top,right:left+b.w,bottom:top+b.h},color:rgb(b.family?.enabled?b.family.background:b.bg),backgroundType:4},opened:true,children:children.reverse()});
 }
 progress('PSD mit Zeichenflächen und Ebenen schreiben …');await new Promise(r=>setTimeout(r,50));psd.children.reverse();const buffer=agPsd.writePsd(psd,{generateThumbnail:true,trimImageData:true});return withPSDProfile(buffer);
}
$('#savePSD').onclick=async()=>{
 if(busy)return;setSaveBusy(true);
 try{
  // Open the native picker while the click still has user activation, before generating the PSD.
  const name=saveFileName('psd'),handle=await chooseSaveTarget(name,'psd');
  const file=await buildPSD(text=>$('#psdStatus').textContent=text);await writeSaveFile(handle,file,name);
  $('#psdStatus').textContent=(handle?'PSD gespeichert.':'PSD-Download gestartet.')+' Zeichenflächen, bearbeitbare Texte und eingebettete Bild-Smartobjekte. Zum Weiterarbeiten hier zusätzlich MKW speichern.';
  status(handle?'Photoshop-Datei unter gewähltem Namen gespeichert.':'Photoshop-Datei: Download gestartet.');
 }catch(e){$('#psdStatus').textContent=e.name==='AbortError'?'Speichern abgebrochen.':'PSD konnte nicht gespeichert werden: '+e.message}
 finally{setSaveBusy(false)}
};
$('#saveDialog').addEventListener('cancel',ev=>{if(busy)ev.preventDefault()});
