const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../static/spread-layout-model.js'),policy=require('../static/carousel-policy.js');
const format={w:1080,h:1350,top:100,bottom:200,left:100,right:100,bg:'#ffffff'};
const source=()=>({...format,n:3,objects:[{id:'photo',type:'image',imageId:'one-asset',x:0,y:0,w:2160,h:1350}]});
const ids=()=>{let i=0;return ()=>`new-${++i}`;};
function pages(c){return c.artboards.map(a=>a.id);}
function individual(c=source()){return model.plan(c,{type:'mode',mode:'single'},o=>o,ids());}
function paired(c=source()){const q=individual(c);return model.plan(q,{type:'join',ids:pages(q).slice(0,2)},o=>o,ids());}

test('explicit conversion preserves per-page image geometry with shared assets, source untouched',()=>{
 const c=source(),before=structuredClone(c),q=model.plan(c,{type:'mode',mode:'single'},o=>o,ids());
 assert.deepEqual(c,before);assert(model.valid(q));assert(policy.validBoards(q));
 assert.equal(q.objects.length,2);assert(q.objects.every(o=>o.imageId==='one-asset'&&o.pageFragment));
 for(const [i,o] of q.objects.entries()){const a=q.artboards[i];assert.equal(o.x-a.x,0-i*1080);assert.equal(o.y-a.y,0);}
});
test('join/split/reorder are deterministic, reversible by snapshot and preserve local fragments',()=>{
 let c=paired();
 assert.deepEqual(c.pageStructure.groups.map(g=>g.length),[2,1]);
 const old=structuredClone(c),q=model.plan(c,{type:'split',ids:[pages(c)[0]]},o=>o,ids());
 assert.deepEqual(c,old);assert.equal(q.pageStructure.shuffle,false);
 assert.deepEqual(q.pageStructure.groups.map(g=>g.length),[1,1,1]);
 for(const o of q.objects){const a=q.artboards.find(a=>a.id===o.pageId),b=old.artboards.find(b=>b.id===o.pageId),prev=old.objects.find(v=>v.imageId===o.imageId&&v.x<b.x+b.w&&v.x+v.w>b.x);assert.equal(o.x-a.x,prev.x-b.x);}
 const r=model.plan(q,{type:'move',ids:[pages(q)[2]],index:0},o=>o,ids());assert.equal(pages(r)[0],pages(q)[2]);assert(model.valid(r));
});
test('automatic redistribution, manual island spread, binding and numeric settings',()=>{
 let c=individual();
 c=model.plan(c,{type:'join',ids:pages(c)},o=>o,ids());assert.equal(c.pageStructure.groups.length,1);assert.equal(c.pageStructure.shuffle,false);
 c=model.plan(c,{type:'settings',binding:'right',gap:32,bleed:3,startNumber:10},o=>o,ids());assert(c.artboards[0].x>c.artboards[1].x);
 c=model.plan(c,{type:'settings',shuffle:true},o=>o,ids());assert.deepEqual(c.pageStructure.groups.map(g=>g.length),[2,1]);
 const before=structuredClone(c);for(const key of ['gap','bleed','startNumber'])assert.throws(()=>model.plan(c,{type:'settings',[key]:-1}));assert.deepEqual(c,before);
});
test('100+ pages and empty/repopulation respect explicit limits and strict membership',()=>{
 let c=individual({...source(),objects:[]});let i=100;
 c=model.plan(c,{type:'add',count:117},o=>o,()=>`page-${i++}`);assert.equal(c.n,120);assert(policy.validDocumentCount(c));assert(model.valid(c));
 const duplicate=structuredClone(c);duplicate.pageStructure.groups[0].push(pages(c)[1]);assert(!model.valid(duplicate));
 assert.throws(()=>model.plan(c,{type:'add',count:81}));
 c=model.plan(c,{type:'delete',ids:pages(c),content:true});assert.equal(c.n,0);assert(model.valid(c));assert(policy.validBoards(c));assert(policy.extent(c).w>0);
 c=model.plan(c,{type:'add'},o=>o,()=>`new-page`);assert.equal(c.n,1);assert(model.valid(c));
 assert.equal(policy.validCount(120),false,'old slides retain 1–20 limits');
});
test('batch format preserves contents, invalid group positions and limits have no side effects',()=>{
 const c=individual(),before=structuredClone(c);
 const q=model.plan(c,{type:'format',ids:pages(c).slice(0,2),format:{...format,w:1440,h:1440}});assert.equal(q.artboards[1].w,1440);assert.equal(q.artboards[2].w,1080);assert.equal(q.objects[0].w,2160);
 assert.throws(()=>model.plan(c,{type:'position',ids:[pages(c)[1]],x:0,y:0}));assert.deepEqual(c,before);
});
test('detaching a middle page retains other pages and batch cancellation is atomic',()=>{
 let c=paired({...source(),objects:[]});
 c=model.plan(c,{type:'join',ids:pages(c)},o=>o,ids());
 const before=structuredClone(c),middle=pages(c)[1];
 const q=model.plan(c,{type:'detach',ids:[middle]});assert.deepEqual(q.pageStructure.groups,[[pages(c)[0]],[middle],[pages(c)[2]]]);assert.deepEqual(c,before);
 assert.throws(()=>model.plan(c,{type:'batch',actions:[{type:'detach',ids:[middle]},{type:'position',ids:[middle],x:100000,y:100000}]}));assert.deepEqual(c,before);
});
test('moving or editing a structured page moves its whole spread and preserves local geometry',()=>{
 const c=paired(),a=c.artboards[0];
 const q=model.plan(c,{type:'position',ids:[a.id],x:0,y:4000});assert.equal(q.artboards[1].y,4000);assert.equal(q.artboards[0].x,0);
 const edit=model.plan(q,{type:'edit',ids:[a.id],values:{...q.artboards[0],x:100,y:4100,name:'Neuer Titel'}});assert.equal(edit.artboards[0].y,4100);assert.equal(edit.artboards[1].y,4100);assert.equal(edit.artboards[0].name,'Neuer Titel');
});
test('malformed memberships and invalid formats reject without changing the source',()=>{
 const c=individual(),before=structuredClone(c);
 for(const value of [null,undefined,'bad']){const q={...c,artboards:value};assert.equal(model.valid(q),false);}
 assert.throws(()=>model.plan(c,{type:'format',ids:pages(c),format:{...format,left:1080}}));assert.deepEqual(c,before);
});

test('page numbering and bleed changes do not rearrange manually positioned spreads',()=>{
 let c=paired();
 c=model.plan(c,{type:'position',ids:[pages(c)[0]],x:0,y:4000});
 const positions=c.artboards.map(a=>[a.x,a.y]),objects=structuredClone(c.objects);
 const q=model.plan(c,{type:'settings',startNumber:12,bleed:5,shuffle:false});
 assert.deepEqual(q.artboards.map(a=>[a.x,a.y]),positions);assert.deepEqual(q.objects,objects);
});

test('keeping deleted page contents cannot cover remaining pages',()=>{
 const c=individual();
 const q=model.plan(c,{type:'delete',ids:[pages(c)[0]],content:false});
 const detached=q.objects.find(o=>o.id===c.objects[0].id);
 assert(!detached.pageId);assert(q.artboards.every(a=>!policy.intersects(a,detached)));
 assert.equal(detached.imageId,'one-asset');
});
test('fragment instances preserve deterministic noise rather than regenerating it',()=>{
 const c=source();c.objects[0].effects={noise:25};
 const q=model.plan(c,{type:'mode',mode:'single'},o=>o,ids());
 assert(q.objects.every(o=>Number.isInteger(o.effectSeed)));
 assert.equal(q.objects[0].effectSeed,q.objects[1].effectSeed);
 const r=model.plan(q,{type:'duplicate',ids:[pages(q)[0]]});assert.equal(r.objects.at(-1).effectSeed,q.objects[0].effectSeed);
});
test('each digital spread supports up to 20 contiguous pages; reducing detaches without deletion',()=>{
 let c=paired({...source(),objects:[]});
 const id=pages(c)[0],other=pages(c)[2];
 c=model.plan(c,{type:'edit-spread',ids:[id],count:20,x:0,y:0,format:{...format,w:600,h:750,top:50,bottom:50,left:50,right:50}});
 const group=c.pageStructure.groups.find(g=>g.includes(id));assert.equal(group.length,20);assert.equal(c.n,21);
 assert.equal(c.artboards.find(a=>a.id===other).w,1080,'other spread keeps its format');
 for(let i=1;i<group.length;i++){const prev=c.artboards.find(a=>a.id===group[i-1]),a=c.artboards.find(a=>a.id===group[i]);assert.equal(a.x,prev.x+prev.w);assert.equal(a.y,prev.y);}
 const before=structuredClone(c);assert.throws(()=>model.plan(c,{type:'resize-spread',ids:[id],count:21}));assert.deepEqual(c,before);
 c=model.plan(c,{type:'resize-spread',ids:[id],count:2});assert.equal(c.n,21);assert.equal(c.pageStructure.groups[0].length,2);assert(model.valid(c));
});
test('artboard identities/names survive ordering, splitting and duplication',()=>{
 let c=paired({...source(),objects:[]});
 const first=c.pageStructure.artboardInfo[0].id;
 c=model.plan(c,{type:'rename-artboard',id:first,name:'Sommerreihe'});
 c=model.plan(c,{type:'settings',startNumber:5});assert.equal(c.pageStructure.artboardInfo[0].name,'Sommerreihe');
 const duplicate=model.plan(c,{type:'duplicate-artboard',id:first});assert(duplicate.pageStructure.artboardInfo.some(a=>a.name==='Sommerreihe Kopie'));
 assert.equal(c.n,3);assert.equal(duplicate.n,5);assert(model.valid(duplicate));
 const split=model.plan(c,{type:'split',ids:c.pageStructure.groups[0]});assert.equal(split.pageStructure.artboardInfo[0].id,first);assert.equal(new Set(split.pageStructure.artboardInfo.map(a=>a.id)).size,split.pageStructure.groups.length);
});
test('moving pages to an artboard preserves the destination identity and shared assets',()=>{
 let c=individual(),target=c.pageStructure.artboardInfo[2];
 c=model.plan(c,{type:'move-to-artboard',id:target.id,ids:[c.artboards[0].id]});
 const at=c.pageStructure.artboardInfo.findIndex(a=>a.id===target.id);assert(at>=0);assert.equal(c.pageStructure.groups[at].length,2);assert.equal(c.n,3);assert(model.valid(c));assert(c.objects.every(o=>o.imageId==='one-asset'));
});

test('Alt-drop copies pages atomically into an existing artboard, sharing image references',()=>{
 const c=individual(),before=structuredClone(c),target=c.pageStructure.artboardInfo[2],page=pages(c)[0];
 const q=model.plan(c,{type:'duplicate-to',ids:[page],artboardId:target.id},o=>o,ids());
 assert.deepEqual(c,before);assert.equal(q.n,c.n+1);assert(model.valid(q));
 const group=q.pageStructure.groups[q.pageStructure.artboardInfo.findIndex(a=>a.id===target.id)];assert.equal(group.length,2);assert(group.includes(pages(c)[2]));assert(!group.includes(page));
 assert(q.objects.filter(o=>o.pageId===group.find(id=>id!==pages(c)[2])).every(o=>o.imageId==='one-asset'));
 const full=model.plan(c,{type:'resize-spread',ids:[pages(c)[2]],count:20},o=>o,ids());const snapshot=structuredClone(full);assert.throws(()=>model.plan(full,{type:'duplicate-to',ids:[page],artboardId:target.id},o=>o,ids()));assert.deepEqual(full,snapshot);
});

test('legacy page groups remain readable and explicit conversion removes the duplicate metadata without changing page positions',()=>{
 const c={...source(),layout:'free',artboards:[0,1,2].map(i=>({...format,id:'legacy-'+i,name:'Seite '+i,x:0,y:i*1470})),pageGroups:[{id:'legacy-group',name:'Freie Serie',orientation:'vertical',artboardIds:['legacy-0','legacy-1','legacy-2']}]};
 assert(policy.validBoards(c));const before=structuredClone(c);const q=model.plan(c,{type:'enable'},o=>o,ids());assert.deepEqual(c,before);assert.deepEqual(q.artboards,c.artboards);assert.equal(q.pageGroups,undefined);assert(model.valid(q));assert(policy.validBoards(q));
});

test('enabling and choosing spreads preserve a continuous design without fragmenting objects',()=>{
 for(const action of [{type:'enable'},{type:'mode',mode:'spreads'}]){
  const c=source(),before=structuredClone(c),q=model.plan(c,action,o=>o,ids());
  assert.deepEqual(c,before);assert.deepEqual(q.objects,c.objects);assert.deepEqual(q.artboards.map(a=>[a.x,a.y,a.w,a.h]),policy.frames(c).map(a=>[a.x,a.y,a.w,a.h]));
  assert.equal(q.pageStructure.mode,'spreads');assert.equal(q.pageStructure.shuffle,false);assert.deepEqual(q.pageStructure.groups.map(g=>g.length),[3]);assert(model.valid(q));assert(policy.validBoards(q));
 }
 let c=individual();c=model.plan(c,{type:'position',ids:[pages(c)[1]],x:2000,y:3000});
 const q=model.plan(c,{type:'mode',mode:'spreads'});
 assert.deepEqual(q.artboards,c.artboards);assert.deepEqual(q.objects,c.objects);assert.deepEqual(q.pageStructure.groups,c.pageStructure.groups);assert.deepEqual(q.pageStructure.artboardInfo,c.pageStructure.artboardInfo);
});
test('append-page belongs to its artboard, preserves all existing coordinates and rejects collisions/limits atomically',()=>{
 const c=individual(),before=structuredClone(c),first=pages(c)[0];
 let q=model.plan(c,{type:'append-page',ids:[first]},o=>o,ids());
 assert.deepEqual(c,before);assert.equal(q.n,4);assert.equal(q.pageStructure.groups[0].length,2);assert.deepEqual(q.objects,c.objects);
 for(const a of c.artboards)assert.deepEqual(q.artboards.find(b=>b.id===a.id),a);
 const added=q.artboards.find(a=>!pages(c).includes(a.id));assert.equal(added.x,c.artboards[0].x+c.artboards[0].w);assert.equal(added.y,c.artboards[0].y);
 assert.deepEqual(q.pageStructure.artboardInfo,c.pageStructure.artboardInfo);
 while(q.pageStructure.groups[0].length<20)q=model.plan(q,{type:'append-page',ids:[first]});
 const full=structuredClone(q);assert.throws(()=>model.plan(q,{type:'append-page',ids:[first]}));assert.deepEqual(q,full);
 const conflict=model.plan(c,{type:'position',ids:[pages(c)[1]],x:1100,y:0});const stable=structuredClone(conflict);assert.throws(()=>model.plan(conflict,{type:'append-page',ids:[first]}),/überdecken/);assert.deepEqual(conflict,stable);
});
test('new independent artboard does not repack manually positioned existing content',()=>{
 let c=individual();c=model.plan(c,{type:'position',ids:[pages(c)[0]],x:4000,y:700});
 const q=model.plan(c,{type:'add',count:1,spread:true});
 for(const a of c.artboards)assert.deepEqual(q.artboards.find(b=>b.id===a.id),a);
 assert.deepEqual(q.objects,c.objects);assert.equal(q.pageStructure.mode,c.pageStructure.mode);assert.equal(q.pageStructure.groups.at(-1).length,1);assert(model.valid(q));assert(policy.validBoards(q));
 const right=model.plan(c,{type:'settings',binding:'right'}),pair=model.plan(right,{type:'add',count:2,spread:true}),added=pair.artboards.slice(-2);assert(added[0].x>added[1].x);assert.deepEqual(pair.objects,right.objects);

});


test('moving pages anchors spanning images to the first page without splitting or resizing',()=>{
 let c=model.plan(source(),{type:'enable'},o=>o,ids());
 c=model.plan(c,{type:'add',count:1,spread:true});
 const first=c.artboards[0],second=c.artboards[1],target=c.pageStructure.artboardInfo[1];
 const q=model.plan(c,{type:'move-to-artboard',id:target.id,ids:[first.id]});
 assert.equal(q.objects.length,1);assert(!q.objects[0].pageFragment);
 assert.equal(q.objects[0].pageId,first.id);assert.equal(q.objects[0].w,2160);
 const owner=q.artboards.find(a=>a.id===first.id);
 assert.equal(q.objects[0].x-owner.x,0);assert.equal(q.objects[0].y-owner.y,0);
 const r=model.plan(q,{type:'move-to-artboard',id:q.pageStructure.artboardInfo[0].id,ids:[second.id]});
 assert.equal(r.objects.length,1);assert.equal(r.objects[0].pageId,first.id);
 assert.deepEqual(source().objects[0],{id:'photo',type:'image',imageId:'one-asset',x:0,y:0,w:2160,h:1350});
});
test('cross-artboard insertion retains target identity and chosen before/after order',()=>{
 const c=individual({...source(),objects:[]}),[a,b,d]=pages(c),target=c.pageStructure.artboardInfo[2];
 const q=model.plan(c,{type:'move-to-artboard',id:target.id,ids:[a],beforeId:d});
 assert.deepEqual(q.pageStructure.groups,[[b],[a,d]]);
 assert.equal(q.pageStructure.artboardInfo[1].id,target.id);
 const r=model.plan(q,{type:'move-to-artboard',id:target.id,ids:[a]});
 assert.deepEqual(r.pageStructure.groups,[[b],[d,a]]);
 assert.deepEqual(model.plan(r,{type:'move-to-artboard',id:target.id,ids:[a],beforeId:a}),r);
 assert.throws(()=>model.plan(r,{type:'move-to-artboard',id:target.id,ids:['missing']}));
});
