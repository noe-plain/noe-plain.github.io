'use strict';
importScripts('vendor/vision.js');
let detector;
async function init(){
 const files=await MKWVision.FilesetResolver.forVisionTasks(new URL('vendor/vision-wasm/',self.location).href);
 return MKWVision.ObjectDetector.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('vendor/person.tflite',self.location).href,delegate:'CPU'},runningMode:'IMAGE',categoryAllowlist:['person'],scoreThreshold:.4,maxResults:20});
}
self.onmessage=async({data:{id,bitmap}})=>{
 try{detector??=init();const model=await detector,result=model.detect(bitmap),w=bitmap.width,h=bitmap.height;
  self.postMessage({id,people:result.detections.map(d=>({x:Math.max(0,d.boundingBox.originX/w),y:Math.max(0,d.boundingBox.originY/h),w:Math.min(1,d.boundingBox.width/w),h:Math.min(1,d.boundingBox.height/h),score:d.categories[0].score}))});
 }catch(e){detector=null;self.postMessage({id,error:e.message})}finally{bitmap.close()}
};
