'use strict';
// Parametric primitives become ordinary paths when their points are edited.
function carouselStartPointEditing(o){
 if(!studioPreferences.advanced||!carouselIsVector(o)||o.locked)return;
 if(o.type==='shape'){
  const converted=carouselPaperObject(carouselPaperItem(o),o,o.id);
  if(!converted)return;checkpoint();Object.assign(o,converted);changed(false);
 }
 carouselUI.content=false;carouselUI.vectorPoints=true;carouselUI.vectorNode=0;
 carouselUI.vectorNodes=new Set();carouselToolUI();carouselPanel();carouselRefresh();
}
function carouselBezierPoint(a,b,t){
 const curved=a.out||b.in,p=a.out||(curved?a:{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3});
 const q=b.in||(curved?b:{x:a.x+2*(b.x-a.x)/3,y:a.y+2*(b.y-a.y)/3}),u=1-t;
 return {x:u*u*u*a.x+3*u*u*t*p.x+3*u*t*t*q.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*p.y+3*u*t*t*q.y+t*t*t*b.y};
}
function carouselNearestSegment(o,pt){
 let best=null;
 for(let contour=0;contour<carouselPathContours(o).length;contour++){
  const points=carouselPathWorld(o,contour),count=points.length-(o.closed?0:1);
  for(let i=0;i<count;i++){
   const a=points[i],b=points[(i+1)%points.length],distance=t=>{const q=carouselBezierPoint(a,b,t);return Math.hypot(q.x-pt.x,q.y-pt.y)};
   let sample=0,cost=Infinity;
   for(let n=0;n<=32;n++){const d=distance(n/32);if(d<cost){cost=d;sample=n/32}}
   let lo=Math.max(0,sample-1/32),hi=Math.min(1,sample+1/32);
   for(let n=0;n<18;n++){const x=lo+(hi-lo)/3,y=hi-(hi-lo)/3;if(distance(x)<distance(y))hi=y;else lo=x}
   const t=(lo+hi)/2,d=distance(t);if(!best||d<best.distance)best={contour,index:i,t,distance:d};
  }
 }
 return best&&best.distance*carouselZoom<=12?best:null;
}
function carouselCurvePointer(ev,pt){
 let o=carouselHit(pt);
 // A thin or transparent path still offers its segment as a bending target.
 if(!carouselIsVector(o))o=[...p.carousel.objects].reverse().find(v=>v.type==='path'&&!v.locked&&v.visible!==false&&carouselNearestSegment(v,pt));
 if(!carouselIsVector(o)||o.locked)return;
 carouselSelect([o.id]);carouselStartPointEditing(o);
 const segment=carouselNearestSegment(o,pt);if(!segment)return;
 carouselUI.vectorContour=segment.contour;
 const base=carouselPathWorld(o),i=segment.index,j=(i+1)%base.length,t=Math.max(.08,Math.min(.92,segment.t));
 const a=base[i],b=base[j],start=carouselPoint(ev),out=a.out||{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3},incoming=b.in||{x:a.x+2*(b.x-a.x)/3,y:a.y+2*(b.y-a.y)/3};let begun=false;
 carouselUI.vectorNodes=new Set([i,j]);carouselUI.vectorNode=i;
 carouselListen(ev,event=>{
  const end=carouselPoint(event);let dx=end.x-start.x,dy=end.y-start.y;if(event.shiftKey){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,length=Math.hypot(dx,dy);dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}if(!begun&&Math.hypot(dx,dy)*carouselZoom<2)return;
  if(!begun){checkpoint();begun=true}
  const points=clone(base),gain=1/(3*t*(1-t));
  carouselLinkedHandle(points[i],'out',{x:out.x+dx*gain,y:out.y+dy*gain},event,a,false);carouselLinkedHandle(points[j],'in',{x:incoming.x+dx*gain,y:incoming.y+dy*gain},event,b,false);
  carouselSetPathGeometry(o,points);carouselRefresh();
 },()=>{if(begun)changed(false);carouselPanel();carouselRefresh()});
}
// Shift constrains the tangent; Control preserves the other handle's length.
function carouselLinkedHandle(node,key,position,event,base=node,createOpposite=true){
 let dx=position.x-node.x,dy=position.y-node.y,length=Math.hypot(dx,dy);
 if(event.shiftKey){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;dx=Math.cos(angle)*length;dy=Math.sin(angle)*length}
 node[key]={x:node.x+dx,y:node.y+dy};
 const other=key==='in'?'out':'in';if(event.altKey||!createOpposite&&!base[other])return;
 const otherLength=event.ctrlKey&&base[other]?Math.hypot(base[other].x-base.x,base[other].y-base.y):length;
 if(length>.00001)node[other]={x:node.x-dx/length*otherLength,y:node.y-dy/length*otherLength};
 else if(!event.ctrlKey)node[other]={x:node.x,y:node.y};
}
function carouselClosePathPointer(ev){
 const draft=carouselPathDraft;if(!draft||draft.points.length<3)return;const base=clone(draft.points[0]),start=carouselPoint(ev);
 carouselListen(ev,event=>{const position=carouselPoint(event);if(Math.hypot(position.x-start.x,position.y-start.y)*carouselZoom<2)return;carouselLinkedHandle(draft.points[0],'out',position,event,base);carouselVectorOverlay()},()=>carouselFinishPath(true),()=>{draft.points[0]=base;carouselVectorOverlay()});
}
function carouselInsertPathPointAt(o,segment){
 if(o.locked||o.points.length>=200)return;carouselUI.vectorContour=segment.contour;
 const points=carouselPathWorld(o),i=segment.index,j=(i+1)%points.length,a=points[i],b=points[j],t=studioPaintClamp(segment.t,.01,.99),mix=(a,b)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 let node;if(a.out||b.in){const q0=mix(a,a.out||a),q1=mix(a.out||a,b.in||b),q2=mix(b.in||b,b),r0=mix(q0,q1),r1=mix(q1,q2);node={...mix(r0,r1),in:r0,out:r1};checkpoint();a.out=q0;b.in=q2}else{node=mix(a,b);checkpoint()}
 points.splice(i+1,0,node);carouselUI.vectorNode=i+1;carouselUI.vectorNodes=new Set([i+1]);carouselUI.vectorPoints=true;carouselSetPathGeometry(o,points);changed(false);carouselPanel();
}
