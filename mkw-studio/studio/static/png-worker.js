'use strict';
importScripts('vendor/png.js');
self.onmessage=({data:{pixels,width,height,colours}})=>{
 try{
  const source=new Uint8Array(pixels);let visible=0;for(let i=3;i<source.length;i+=4)if(source[i])visible++;
  let buffer;
  if(visible&&visible<width*height){
   // Reserve one palette entry for exact transparency. Quantizing transparent
   // pixels together with edges would otherwise give empty areas a faint tint.
   const opaque=new Uint8Array(visible*4);let n=0;
   for(let i=0;i<source.length;i+=4)if(source[i+3]){opaque.set(source.subarray(i,i+4),n);n+=4}
   const reduced=new Uint8Array(MKWPNG.quantize([opaque.buffer],colours-1).bufs[0]),result=new Uint8Array(source.length);n=0;
   for(let i=0;i<source.length;i+=4)if(source[i+3]){result.set(reduced.subarray(n,n+4),i);n+=4}
   buffer=MKWPNG.encode([result.buffer],width,height,0);
  }else buffer=MKWPNG.encode([pixels],width,height,visible?colours:0);
  self.postMessage({buffer},[buffer]);
 }
 catch(e){self.postMessage({error:e.message})}
};
