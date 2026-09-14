/* Output-pixel geometry shared by editor, JPG and PSD. No screen-zoom inputs. */
(function(root){
 const keys=['date','title','subtitle','copyright'];
 const clamp=(n,a,b)=>Math.min(Math.max(a,b),Math.max(a,Number.isFinite(n)?n:a));
 function safeRect(b){const unit=b.w/1080,story=b.w*16===b.h*9;const left=100*unit,right=100*unit,top=(story?200:100)*unit,bottom=(story?500:200)*unit;return {x:left,y:Math.min(top,b.h*.4),w:b.w-left-right,h:Math.max(1,b.h-Math.min(top,b.h*.4)-Math.min(bottom,b.h*.4)),left,right,top:Math.min(top,b.h*.4),bottom:Math.min(bottom,b.h*.4)}}
 function wrap(text,width,measure){const lines=[];for(const paragraph of String(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){const next=line?line+' '+word:word;if(measure(next)<=width){line=next;continue}if(line){lines.push(line);line=''}if(measure(word)<=width){line=word;continue}for(const char of Array.from(word)){if(line&&measure(line+char)>width){lines.push(line);line=''}line+=char}}lines.push(line)}return lines}
 function textLayout(b,measure,activeKey){const safe=safeRect(b),visible=keys.filter(k=>(b.elements[k].visible&&b.elements[k].text)||k===activeKey),gap=16*b.w/1080;
  function rows(factor){return visible.map(key=>{const e=b.elements[key],size=Math.max(.1,e.size*factor),lines=wrap(e.text,safe.w,t=>measure(t,size,e.role));return {key,...e,size,lines,maxWidth:Math.max(0,...lines.map(t=>measure(t,size,e.role))),h:lines.length*size*1.15}})}
  let records=rows(1),height=records.reduce((n,r)=>n+r.h,0)+Math.max(0,records.length-1)*gap,factor=1;
  if(height>safe.h||records.some(r=>r.maxWidth>safe.w)){let lo=.00001,hi=1;for(let i=0;i<22;i++){const mid=(lo+hi)/2,r=rows(mid),h=r.reduce((n,r)=>n+r.h,0)+Math.max(0,r.length-1)*gap*mid;if(h>safe.h||r.some(r=>r.maxWidth>safe.w))hi=mid;else lo=mid}factor=lo;records=rows(factor);height=records.reduce((n,r)=>n+r.h,0)+Math.max(0,records.length-1)*gap*factor}
  const offset=clamp(b.textBox?.offset||0,0,safe.h-height),y=safe.y+safe.h-offset-height;let cursor=y;
  records=records.map(e=>{const row={...e,x:safe.x+(e.align==='right'?safe.w:e.align==='center'?safe.w/2:0),y:cursor,w:safe.w,angle:0};cursor+=e.h+gap*factor;return row});
  return {x:safe.x,y,w:safe.w,h:height,offset,factor,records,safe};
 }
 function logoRect(e,aspect){const w=e.size,h=w/aspect,offset=e.align==='right'?-w:e.align==='center'?-w/2:0,a=(e.angle||0)*Math.PI/180;const pts=[[offset,0],[offset+w,0],[offset+w,h],[offset,h]].map(([x,y])=>({x:e.x+x*Math.cos(a)-y*Math.sin(a),y:e.y+x*Math.sin(a)+y*Math.cos(a)}));const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));return {x,y,w:Math.max(...pts.map(p=>p.x))-x,h:Math.max(...pts.map(p=>p.y))-y}}
 function constrainLogo(b,aspect){const e=b.elements.logo,s=safeRect(b);let r=logoRect(e,aspect);const scale=Math.min(1,s.w/r.w,s.h/r.h);if(scale<1)e.size*=scale;r=logoRect(e,aspect);e.x+=clamp(r.x,s.x,s.x+s.w-r.w)-r.x;e.y+=clamp(r.y,s.y,s.y+s.h-r.h)-r.y;return logoRect(e,aspect)}
 const api={keys,clamp,safeRect,wrap,textLayout,logoRect,constrainLogo};if(typeof module!=='undefined')module.exports=api;else root.MKWLayout=api;
})(globalThis);
