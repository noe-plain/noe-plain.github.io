const test=require('node:test'),assert=require('node:assert/strict'),cache=require('../static/page-preview-cache.js');
test('page previews reuse unchanged rasters, share in-flight work and release bounded LRU memory',async()=>{
 const p={images:[],logos:[],fonts:[]};let renders=0;cache.release();
 const paint=async()=>{renders++;await Promise.resolve();return {width:64,height:80};};
 const [a,b]=await Promise.all([cache.get(p,'same',paint),cache.get(p,'same',paint)]);assert.equal(a,b);assert.equal(renders,1);
 assert.equal(await cache.get(p,'same',paint),a);assert.equal(renders,1);
 for(let i=0;i<101;i++)await cache.get(p,'page-'+i,paint);
 assert.equal(cache.stats().entries,100);assert.equal(a.width,1);cache.release();assert.equal(cache.stats().entries,0);
});
test('changed assets invalidate keys without retaining removed libraries; stale previews never enter a new project',async()=>{
 const p={images:[{id:'i',data:'one'}],logos:[],fonts:[]};let token=cache.tokens(p);const before=token('image:i');assert(before>0);assert.equal(cache.tokens(p)('image:i'),before);
 p.images[0].data='two';assert.notEqual(cache.tokens(p)('image:i'),before);p.images=[];assert.equal(cache.tokens(p)('image:i'),0);
 let finish;const pending=cache.get(p,'old',()=>new Promise(r=>finish=r));const newer={images:[],logos:[],fonts:[]};await new Promise(setImmediate);cache.tokens(newer);finish({width:64,height:80});assert.equal(await pending,null);assert.equal(cache.stats().entries,0);cache.release();
});
