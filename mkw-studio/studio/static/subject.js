'use strict';
// Images stay on device. The worker and the detection model are served with the app.
const MKWSubject=(()=>{
 let worker,sequence=0;
 const pending=new Map();
 function reset(){worker?.terminate();worker=null;for(const task of pending.values()){clearTimeout(task.timer);task.reject(Error('Personenerkennung nicht verfügbar.'))}pending.clear()}
 function getWorker(){if(!worker){worker=new Worker('static/subject-worker.js');worker.onerror=reset;worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);clearTimeout(task.timer);data.error?task.reject(Error(data.error)):task.resolve(data.people)}}return worker}
 async function detect(im){
  const source=await image(im.data),scale=Math.min(1,1280/im.width,1280/im.height),canvas=makeCanvas(im.width*scale,im.height*scale);canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
  const bitmap=await createImageBitmap(canvas),id=++sequence;
  try{return await new Promise((resolve,reject)=>{const w=getWorker(),timer=setTimeout(reset,60000);pending.set(id,{resolve,reject,timer});w.postMessage({id,bitmap},[bitmap])})}finally{bitmap.close()}
 }
 function crop(b,im){
  if(b.family?.enabled||!im.people?.length)return;
  const t=b.image,s=t.scale,people=im.people,visibleW=b.w/s/im.width,visibleH=b.h/s/im.height;
  const left=Math.min(...people.map(r=>r.x)),right=Math.max(...people.map(r=>r.x+r.w)),top=Math.min(...people.map(r=>r.y)),bottom=Math.max(...people.map(r=>r.y+r.h));
  // Keep the group if it fits; otherwise favour the most prominent person.
  const lead=people.reduce((a,r)=>r.w*r.h*r.score>a.w*a.h*a.score?r:a),group=right-left<=visibleW;
  const cx=group?(left+right)/2:lead.x+lead.w/2;
  const head=group?top:lead.y,bodyBottom=group?bottom:lead.y+lead.h;
  const cy=bodyBottom-head<=visibleH?(head+bodyBottom)/2:head+visibleH*.42;
  t.x=MKWLayout.clamp(b.w/2-(cx-.5)*im.width*s,b.w-im.width*s/2,im.width*s/2);
  t.y=MKWLayout.clamp(b.h/2-(cy-.5)*im.height*s,b.h-im.height*s/2,im.height*s/2);
 }
 return {detect,crop};
})();
