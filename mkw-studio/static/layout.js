/* Output-pixel geometry shared by editor, JPG and PSD. No screen-zoom inputs. */
(function(root){
 const copyrightText=text=>{const name=String(text||'').replace(/[©\r\n]+/g,' ').trim();return name?'© '+name:''};
 const lineHeight=e=>e.key==='copyright'?1.15:1;
 const keys=['date','title','subtitle','copyright'];
 const clamp=(n,a,b)=>Math.min(Math.max(a,b),Math.max(a,Number.isFinite(n)?n:a));
 function safeRect(b){const unit=b.w/1080,story=b.w*16===b.h*9;const left=100*unit,right=100*unit,top=(story?200:100)*unit,bottom=(story?500:200)*unit;return {x:left,y:Math.min(top,b.h*.4),w:b.w-left-right,h:Math.max(1,b.h-Math.min(top,b.h*.4)-Math.min(bottom,b.h*.4)),left,right,top:Math.min(top,b.h*.4),bottom:Math.min(bottom,b.h*.4)}}
 function wrap(text,width,measure){const lines=[];for(const paragraph of String(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){const next=line?line+' '+word:word;if(measure(next)<=width){line=next;continue}if(line){lines.push(line);line=''}if(measure(word)<=width){line=word;continue}for(const char of Array.from(word)){if(line&&measure(line+char)>width){lines.push(line);line=''}line+=char}}lines.push(line)}return lines}
 function textLayout(b,measure,activeKey){const safe=safeRect(b),visible=keys.filter(k=>k!=='copyright'&&(b.elements[k].enabled!==false&&((b.elements[k].visible&&(b.elements[k].text||b.elements[k].enabled))||k===activeKey))),gap=8*b.w/1080;
  function rows(factor){return visible.map(key=>{const e=b.elements[key],size=Math.max(.1,e.size*factor),lines=wrap(e.text,safe.w,t=>measure(t,size,e.role));return {key,...e,size,lines,maxWidth:Math.max(0,...lines.map(t=>measure(t,size,e.role))),h:lines.length*size*lineHeight({key})}})}
  let records=rows(1),height=records.reduce((n,r)=>n+r.h,0)+Math.max(0,records.length-1)*gap,factor=1;
  if(height>safe.h||records.some(r=>r.maxWidth>safe.w)){let lo=.00001,hi=1;for(let i=0;i<22;i++){const mid=(lo+hi)/2,r=rows(mid),h=r.reduce((n,r)=>n+r.h,0)+Math.max(0,r.length-1)*gap*mid;if(h>safe.h||r.some(r=>r.maxWidth>safe.w))hi=mid;else lo=mid}factor=lo;records=rows(factor);height=records.reduce((n,r)=>n+r.h,0)+Math.max(0,records.length-1)*gap*factor}
  const offset=clamp(b.textBox?.offset||0,0,safe.h-height),y=safe.y+safe.h-offset-height;let cursor=y;
  records=records.map(e=>{const row={...e,x:safe.x+(e.align==='right'?safe.w:e.align==='center'?safe.w/2:0),y:cursor,w:safe.w,angle:0};cursor+=e.h+gap*factor;return row});
  const ce=b.elements.copyright,showCopyright=(ce.visible&&ce.text)||activeKey==='copyright';let copyright=null;
  if(showCopyright){const text=copyrightText(ce.text);let size=Math.min(Math.max(.1,ce.size),safe.right/1.15),width=measure(text,size,ce.role);if(width>safe.h){size*=safe.h/width;width=measure(text,size,ce.role)}const h=size*1.15,displayWidth=ce.text?width:Math.max(width,160*b.w/1080);copyright={key:'copyright',...ce,text,size,lines:[text],maxWidth:width,w:displayWidth,h,x:safe.x+safe.w+safe.right/2-h/2,y:safe.y+safe.h,angle:-90,align:'left',fixed:true};}
  return {x:safe.x,y,w:safe.w,h:height,offset,factor,mainRecords:records,copyright,records:copyright?[...records,copyright]:records,safe};
 }
 function recordRect(e){const w=e.w||e.maxWidth||0,h=e.h||e.size*lineHeight(e),left=e.align==='right'?-w:e.align==='center'?-w/2:0,a=(e.angle||0)*Math.PI/180,pts=[[left,0],[left+w,0],[left+w,h],[left,h]].map(([x,y])=>({x:e.x+x*Math.cos(a)-y*Math.sin(a),y:e.y+x*Math.sin(a)+y*Math.cos(a)})),x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));return{x,y,w:Math.max(...pts.map(p=>p.x))-x,h:Math.max(...pts.map(p=>p.y))-y}}
 function recordsRect(records){if(!records.length)return{x:0,y:0,w:0,h:0};const rs=records.map(recordRect),x=Math.min(...rs.map(r=>r.x)),y=Math.min(...rs.map(r=>r.y)),right=Math.max(...rs.map(r=>r.x+r.w)),bottom=Math.max(...rs.map(r=>r.y+r.h));return{x,y,w:right-x,h:bottom-y}}
 function logoRect(e,aspect){const w=e.size,h=w/aspect,offset=e.align==='right'?-w:e.align==='center'?-w/2:0,a=(e.angle||0)*Math.PI/180;const pts=[[offset,0],[offset+w,0],[offset+w,h],[offset,h]].map(([x,y])=>({x:e.x+x*Math.cos(a)-y*Math.sin(a),y:e.y+x*Math.sin(a)+y*Math.cos(a)}));const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));return {x,y,w:Math.max(...pts.map(p=>p.x))-x,h:Math.max(...pts.map(p=>p.y))-y}}
 function constrainLogo(b,aspect){const e=b.elements.logo,s=safeRect(b);e.size=Math.min(650,s.w,s.h*aspect);e.angle=0;e.align='left';e.x=s.x+s.w-e.size;e.y=s.y;return logoRect(e,aspect)}
 const api={copyrightText,lineHeight,keys,clamp,safeRect,wrap,textLayout,recordRect,recordsRect,logoRect,constrainLogo};if(typeof module!=='undefined')module.exports=api;else root.MKWLayout=api;
})(globalThis);
