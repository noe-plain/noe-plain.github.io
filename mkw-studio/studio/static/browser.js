'use strict';
// Static hosting adapter. The Python server remains available for TIFF / Pillow workflows.
const MKWBrowser = (() => {
 let localServer=false, folder=null, database;
 const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 function db(){return database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('mkw-studio:'+location.pathname.replace(/index\.html$/,''),1);
  request.onupgradeneeded=()=>request.result.createObjectStore('projects');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });}
 async function storage(write,value){const database=await db();return new Promise((resolve,reject)=>{
  const transaction=database.transaction('projects',write?'readwrite':'readonly');
  const request=write?transaction.objectStore('projects').put(value,'autosave'):transaction.objectStore('projects').get('autosave');
  transaction.oncomplete=()=>resolve(write?null:request.result??null);
  transaction.onerror=transaction.onabort=()=>reject(transaction.error||Error('Browserspeicher nicht verfügbar. Bitte das Projekt als MKW herunterladen.'));
 });}
 async function init(){
  if(['localhost','127.0.0.1'].includes(location.hostname))try{const response=await fetch('api/session');if(response.ok){const session=await response.json();localServer=typeof session.token==='string';if(localServer)token=session.token}}catch{}
  if(!localServer){document.querySelector('footer span').textContent='● Lokal in deinem Browser';document.querySelector('#files').accept='.jpg,.jpeg,.png,.webp';document.querySelector('#empty small').textContent='JPG · PNG · WebP';if(!window.showDirectoryPicker){document.querySelector('#folder').hidden=true;}}
 }
 async function saved(){return localServer?(await fetch('api/autosave')).json():storage(false);}
 function canvasBlob(canvas,type){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Bild konnte nicht exportiert werden.')),type,1));}
 async function normalized(file,jpeg=false){
  if(!jpeg&&/\.tiff?$/i.test(file.name||''))throw Error('TIFF bitte zuerst als PNG/JPG speichern oder die lokale Python-Version verwenden.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image',colorSpaceConversion:'default'});
  try{if(bitmap.width*bitmap.height>80000000)throw Error('Bild hat mehr als 80 Millionen Pixel.');
   const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{colorSpace:'srgb'});
   if(jpeg){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}ctx.drawImage(bitmap,0,0);
   if(jpeg)return canvasBlob(canvas,'image/jpeg');
   return {data:await dataURL(await canvasBlob(canvas,'image/png')),width:canvas.width,height:canvas.height,warning:'Farbkonvertierung durch den Browser. Aufnahmedatum aus dem Dateinamen.',captureDate:'',captureDay:''};
  }finally{bitmap.close()}
 }
 // Uncompressed ZIP: images are already JPEG-compressed. UTF-8 names and CRC32.
 function zip(items){let offset=0;const files=[],directory=[],encoder=new TextEncoder();
  for(const item of items){const name=encoder.encode(item.name),data=bytesFromData(item.jpg);let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
   const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);
   const entry=new Uint8Array(46+name.length),e=new DataView(entry.buffer);e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint16(14,33,true);e.setUint32(16,crc,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);files.push(header,data);directory.push(entry);offset+=header.length+data.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,items.length,true);e.setUint16(10,items.length,true);e.setUint32(12,directory.reduce((n,b)=>n+b.length,0),true);e.setUint32(16,offset,true);return new Blob([...files,...directory,end],{type:'application/zip'});
 }
 async function request(path,body){
  if(localServer){const response=await fetch(path,{method:'POST',headers:{'X-MKW-Token':token},body});if(!response.ok)throw Error((await response.json()).error||'Lokaler Server nicht erreichbar');return response;}
  switch(path){
   case '/api/autosave':await storage(true,JSON.parse(body));return json({ok:true});
   case '/api/import':return json(await normalized(body));
   case '/api/jpg':return new Response(await normalized(body,true));
   case '/api/zip':return new Response(zip(JSON.parse(body)));
   case '/api/folder':if(!window.showDirectoryPicker)throw Error('Bitte ZIP herunterladen verwenden.');folder=await window.showDirectoryPicker({mode:'readwrite'});return json({ok:true});
   case '/api/export':{if(!folder)throw Error('Zuerst Zielordner wählen.');const {name,png}=JSON.parse(body);if(!name.endsWith('.jpg')||/[\\/]/.test(name))throw Error('Ungültiger Dateiname.');try{await folder.getFileHandle(name);throw Error('Datei existiert bereits: '+name)}catch(e){if(e.name!=='NotFoundError')throw e}const blob=await normalized(new Blob([bytesFromData(png)]),true);const handle=await folder.getFileHandle(name,{create:true});const stream=await handle.createWritable();await stream.write(blob);await stream.close();return json({ok:true});}
   default:throw Error('Unbekannte Aktion: '+path);
  }
 }
 return {init,saved,request};
})();
