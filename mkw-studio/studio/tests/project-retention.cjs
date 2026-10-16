const assert = require('node:assert/strict');
const {launch, artifact} = require('./browser.cjs');
(async()=>{const browser=await launch();try{
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.STUDIO_URL);
 await page.waitForFunction(()=>!$('#startNew').disabled);
 // Seed an older installation with nine independent backups and one shared photo.
 const seed=await page.evaluate(async()=>{
  const c=makeCanvas(20,20),ctx=c.getContext('2d');
  const im=(colour,id)=>{ctx.fillStyle=colour;ctx.fillRect(0,0,20,20);return{id,name:id,width:20,height:20,data:c.toDataURL()}};
  const shared=im('#ffffff','shared-photo'),entries=[];
  for(let i=0;i<9;i++){
   const q=fresh();q.projectId='seed-'+i;q.meta.title='Projekt '+i;
   q.images=[shared,im(`rgb(${i*25},40,70)`,'photo-'+i)];q.boards=q.images.map(image=>basicBoard(image));
   entries.push({id:q.projectId,packed:await MKWProjectStore.pack(q),i});
  }
  await new Promise((resolve,reject)=>{const r=indexedDB.open('mkw-studio:/',2);r.onerror=()=>reject(r.error);r.onsuccess=()=>{
   const db=r.result,tx=db.transaction(['projects','assets','meta'],'readwrite');
   for(const {id,packed,i} of entries){tx.objectStore('projects').put({id,version:1,updatedAt:i+1,title:'Projekt '+i,mode:'post',document:packed.document},id);for(const [key,data]of packed.assets)tx.objectStore('assets').put(data,key)}
   tx.objectStore('meta').put('seed-8','lastProject');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error);
  }});
  return {shared:entries[0].packed.document.images[0].assetRef};
 });
 await page.reload();await page.waitForFunction(()=>!$('#startNew').disabled);
 const initial=await page.evaluate(async()=>{
  window.retentionAssetKeys=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('mkw-studio:/',2);r.onsuccess=()=>{const db=r.result,tx=db.transaction('assets'),get=tx.objectStore('assets').getAllKeys();get.onsuccess=()=>{resolve(get.result);db.close()};get.onerror=()=>reject(get.error)}});
  const list=await MKWProjectStore.list();return {ids:list.map(r=>r.id),assets:await retentionAssetKeys(),last:(await MKWProjectStore.last({metadataOnly:true})).id,images:await Promise.all(list.map(async r=>(await MKWProjectStore.open(r.id)).project.images.length))};
 });
 assert.deepEqual(initial.ids,['seed-8','seed-7','seed-6','seed-5','seed-4']);assert.equal(initial.last,'seed-8');assert.equal(initial.assets.length,6);assert(initial.assets.includes(seed.shared));assert(initial.images.every(n=>n===2));
 await page.locator('#startOpen').click();await page.locator('.project-library-entry').first().waitFor();assert.equal(await page.locator('.project-library-entry').count(),5);assert.equal(await page.locator('#projectLibraryCount').textContent(),'5 / 5 Projekte');assert.match(await page.locator('.project-library-retention').textContent(),/automatisch entfernt/);await page.screenshot({path:artifact('mkw-five-projects.png')});await page.locator('#closeProjectLibrary').click();
 const saved=await page.evaluate(async()=>{
  const old=await MKWProjectStore.open('seed-4');old.project.meta.title='Wieder bearbeitet';const updated=await MKWProjectStore.save(old.project,old.version);
  const q=fresh();q.meta.title='Sechstes Projekt';const created=await MKWProjectStore.save(q);
  return {ids:(await MKWProjectStore.list()).map(r=>r.id),id:created.id,updated:updated.version,assets:await retentionAssetKeys(),last:(await MKWProjectStore.last({metadataOnly:true})).id};
 });
 assert.equal(saved.ids.length,5);assert(saved.ids.includes('seed-4'));assert(!saved.ids.includes('seed-5'));assert.equal(saved.updated,2);assert.equal(saved.last,saved.id);assert.equal(saved.assets.length,5);
 // Force a failure after queuing the sixth save: retention and blob deletion must roll back together.
 const rollback=await page.evaluate(async()=>{
  const before=await MKWProjectStore.list(),assets=await retentionAssetKeys(),native=IDBObjectStore.prototype.delete;
  let aborted=false;
  IDBObjectStore.prototype.delete=function(...args){if(this.name==='projects'&&!aborted){aborted=true;const tx=this.transaction,result=native.apply(this,args);queueMicrotask(()=>tx.abort());return result}return native.apply(this,args)};
  let failed=false;try{await MKWProjectStore.save(fresh())}catch{failed=true}finally{IDBObjectStore.prototype.delete=native}
  return{failed,aborted,same:JSON.stringify(before)===JSON.stringify(await MKWProjectStore.list()),sameAssets:JSON.stringify(assets)===JSON.stringify(await retentionAssetKeys())};
 });assert(rollback.failed&&rollback.aborted&&rollback.same&&rollback.sameAssets);
 // An evicted project still open in another tab receives a new identity and loses its file link.
 await page.locator('#startContinue').click();await page.waitForFunction(()=>!busy);
 const recovery=await page.evaluate(async()=>{
  const record=await MKWProjectStore.open('seed-4');
  // A serializable sentinel catches accidental reuse of a removed file link in either browser.
  await MKWProjectStore.link(record.id,{name:'Existing project.mkw'},{size:123,modified:42});
  await MKWProjects.open(await MKWProjectStore.open(record.id));
  for(let i=0;i<5;i++){const q=fresh();q.meta.title='Neues Projekt '+i;await MKWProjectStore.save(q)}
  const evicted=!(await MKWProjectStore.list()).some(r=>r.id===record.id);
  p.meta.title='Weitergearbeitet';touchMeta();await autosave();
  const stored=await MKWProjectStore.open(p.projectId);
  return{evicted,oldId:record.id,id:p.projectId,linked:!!MKWProjects.fileLink(),diskLink:!!stored.fileHandle,count:(await MKWProjectStore.list()).length,title:stored.project.meta.title,notice:$('#projectStorageNotice').textContent};
 });assert(recovery.evicted);assert.notEqual(recovery.id,recovery.oldId);assert(!recovery.linked&&!recovery.diskLink);assert.equal(recovery.count,5);assert.match(recovery.title,/Wiederhergestellt/);assert.match(recovery.notice,/inzwischen entfernt/);
 // Concurrent tab saves are serialized by the database and still retain both new saves.
 const second=await page.context().newPage();await second.goto(process.env.STUDIO_URL);await second.waitForFunction(()=>!$('#startNew').disabled);
 const ids=await Promise.all([page,second].map((tab,i)=>tab.evaluate(async i=>{const q=fresh();q.meta.title='Parallel '+i;return(await MKWProjectStore.save(q)).id},i)));
 const final=await page.evaluate(async()=>{const list=await MKWProjectStore.list(),docs=await Promise.all(list.map(async r=>(await MKWProjectStore.open(r.id)).document));return {ids:list.map(r=>r.id),assets:await retentionAssetKeys(),refs:[...new Set(docs.flatMap(d=>['images','logos','fonts'].flatMap(k=>d[k].map(item=>item.assetRef))))].sort(),images:(await MKWProjectStore.open(p.projectId)).project.images.length}});assert.equal(final.ids.length,5);assert(ids.every(id=>final.ids.includes(id)));assert.equal(final.images,2,'recovered project still owns its photos');assert.deepEqual(final.assets.sort(),final.refs,'only assets owned by the five retained backups remain');
 assert.deepEqual(errors,[]);console.log('PASS five-project migration/retention, edit recency, shared/orphan assets, atomic rollback, evicted-tab recovery without file link, concurrent saves and visible library limit');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
