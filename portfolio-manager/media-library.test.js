const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {library}=require('./media-library');
test('One asset per original, readable unique names, folders and all references move together',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'noe-media-'));
 try{
 const dir=path.join(root,'images/portfolio/Travel');fs.mkdirSync(path.join(dir,'raw'),{recursive:true});
 for(const name of ['Alpen.jpg','Alpen.webp','Alpen.avif','Alpen-640.webp','Alpen-640.avif','Alpen-1280.jpg'])fs.writeFileSync(path.join(dir,name),'test');
 fs.writeFileSync(path.join(dir,'raw','Alpen.jpg'),'raw');
 const media=library(root);let catalog=media.catalog();
 assert.equal(catalog.items.length,2);const asset=catalog.items.find(p=>p.id==='Travel/Alpen');assert.equal(asset.variants.length,5);assert.ok(asset.url.endsWith('Alpen.jpg'));
 const first=media.reserve('Mein schönes Foto.JPG','Travel');assert.equal(first.name,'Mein-schönes-Foto');
 const second=media.reserve('Mein schönes Foto.JPG','Travel');assert.equal(second.name,'Mein-schönes-Foto-2');second.release();
 fs.writeFileSync(path.join(first.dir,first.name+'.jpg'),'photo');first.record();first.release();
 catalog=media.catalog();assert.equal(catalog.items.find(p=>p.id==='Travel/Mein-schönes-Foto').title,'Mein schönes Foto.JPG');
 assert.throws(()=>media.folder('../outside'));assert.throws(()=>media.folder('/tmp'));assert.throws(()=>media.folder('Travel/raw'));
 fs.mkdirSync(media.folder('Reisen/Schweiz'),{recursive:true});
 fs.writeFileSync(path.join(root,'index.html'),'<img src="images/portfolio/Travel/Alpen-640.webp">');
 fs.mkdirSync(path.join(root,'portfolio/projekte'),{recursive:true});fs.writeFileSync(path.join(root,'portfolio/projekte/data.json'),JSON.stringify({image:'../../images/portfolio/Travel/Alpen.jpg'}));
 const result=media.move(asset.id,'Reisen/Schweiz');assert.equal(result.files,6);assert.equal(result.updated,2);
 assert.ok(fs.existsSync(path.join(root,'images/portfolio/Reisen/Schweiz/raw/Alpen.jpg')));
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'portfolio/projekte/data.json'))).image,'../../images/portfolio/Reisen/Schweiz/Alpen.jpg');
 assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('Reisen/Schweiz/Alpen-640.webp'));
 assert.ok(media.catalog().items.some(p=>p.id==='Travel/Alpen-1280'));
 const lock=media.reserve('Locked.jpg','Travel');fs.writeFileSync(path.join(lock.dir,lock.name+'.jpg'),'test');assert.throws(()=>media.move('Travel/Locked','Reisen/Schweiz'),/verarbeitet/);lock.release();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
