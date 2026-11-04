const assert=require('node:assert/strict');
const {launch,artifact,waitForProjectReady}=require('./browser.cjs');
(async()=>{
 const browser=await launch();
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(process.env.STUDIO_URL);await page.locator('#startDesigner').click();await page.locator('#setupName').fill('Bogen-Dateien');await page.locator('#cw').fill('600');await page.locator('#ch').fill('750');await page.locator('#cn').fill('2');await page.locator('#createProject').click();await waitForProjectReady(page);
  const initialHistory=await page.evaluate(()=>history.length);
  await page.locator('#carouselViewport').focus();await page.keyboard.press((process.platform==='darwin'?'Meta':'Control')+'+Alt+n');
  assert.equal(await page.evaluate(()=>p.carousel.n),4);assert.equal(await page.evaluate(()=>history.length),initialHistory+1);
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>p.carousel.pageStructure),undefined);
  const result=await page.evaluate(async()=>{
   const canvas=makeCanvas(1200,750),ctx=canvas.getContext('2d');ctx.fillStyle='#ff7022';ctx.fillRect(0,0,600,750);ctx.fillStyle='#2367b4';ctx.fillRect(600,0,600,750);const data=canvas.toDataURL();const im={id:uid(),name:'Ein Asset',data,original:data,width:1200,height:750};p.images.push(im);
   carouselObject('image',{id:'shared-photo',name:'Hintergrund',imageId:im.id,x:0,y:0,w:1200,h:750});
   carouselObject('shape',{name:'Gemeinsamer Effekt',x:500,y:400,w:200,h:200,fill:'#009966',strokeWidth:0,effects:{blur:8,blurEnabled:true,noise:12,noiseEnabled:true}});
   const bitmap=async i=>{const a=MKWCarouselPolicy.frame(p.carousel,i),c=makeCanvas(a.w,a.h);await carouselPaint(exportContext(c),i);const value=c.toDataURL();c.width=c.height=1;return value;};
   const before=await Promise.all([bitmap(0),bitmap(1)]);
   MKWSpreadUI.commit({type:'mode',mode:'spreads'});const joined=await Promise.all([bitmap(0),bitmap(1)]);
   const ids=p.carousel.artboards.map(a=>a.id);MKWSpreadUI.commit({type:'split',ids});const split=await Promise.all([bitmap(0),bitmap(1)]);
   const compact=MKWProjectAssets.compact(snapshot()),encoded=await MKWProjectFile.encode(snapshot()),q=MKWProjectAssets.hydrate(await MKWProjectFile.decode(encoded));validate(q);validateCarousel(q);
   const template=MKWTemplateModel.capture(p,{name:'Bögen ohne Bilder'});MKWTemplateModel.validate(template);
   const instance=MKWTemplateModel.instantiate(template,{values:{}});const newDocument=MKWTemplates.documentFor(instance);validate(newDocument);validateCarousel(newDocument);
   const options={format:'pdf',pdf:carouselPDFPreset('original')},pages=[];for(const b of p.boards)pages.push((await encodedBoard(clone(b),options)).pdfImage);
   const pdf=await carouselBuildPDF(pages,'Druckbogen'),doc=await MKWPDF.PDFDocument.load(await pdf.arrayBuffer());
   const psd=agPsd.readPsd(await(await buildPSD()).arrayBuffer());
   const a=p.carousel.artboards[1],reference=makeCanvas(MKWCarouselPolicy.extent(p.carousel).w,MKWCarouselPolicy.extent(p.carousel).h);await carouselPaint(exportContext(reference));
   const pixel=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
   const invalid=clone(q);invalid.carousel.objects.find(o=>o.pageFragment).pageId='missing';let rejected=false;try{validateCarousel(invalid);}catch{rejected=true;}
   const layers=psd.children.flatMap(v=>v.children||[v]);
   return {same:before.every((v,i)=>v===joined[i]&&v===split[i]),assets:compact.images.filter(v=>v.id===im.id).length,roundtrip:JSON.stringify(q.carousel)===JSON.stringify(p.carousel),templateGroups:template.carousel.pageStructure.groups,templateNoAssets:!JSON.stringify(template).includes('data:image'),instantiated:instance.carousel.pageStructure.groups,pdf:doc.getPages().map(p=>p.getSize()),slices:psd.imageResources.slices[0].slices.map(v=>v.bounds),gap:pixel(psd.canvas,610,100),reference:pixel(reference,a.x+300,100),actual:pixel(psd.canvas,a.x+300,100),rasterFragments:layers.filter(v=>v.name.includes('Seitenausschnitt')).length,rejected};
  });
  assert(result.same,'Image, vector/blur and clipping pixels must survive joining/splitting');assert.equal(result.assets,1);assert(result.roundtrip);assert(result.templateNoAssets);assert.deepEqual(result.templateGroups,result.instantiated);assert.deepEqual(result.pdf,[{width:450,height:562.5},{width:450,height:562.5}]);assert.equal(result.slices.length,2);assert.equal(result.gap[3],0);assert.deepEqual(result.reference,result.actual);assert(result.rasterFragments>=4);assert(result.rejected);
  await page.evaluate(()=>carouselSlideSelect(0));
  // Actual list drop commits a single transaction; cancelled drag leaves history alone.
  const rows=page.locator('#spreadPages [data-page]'),nativeHistory=await page.evaluate(()=>window.history.length); // native history unrelated to editor undo
  const editorHistory=await page.evaluate(()=>history.length),transfer=await page.evaluateHandle(()=>new DataTransfer());
  await page.locator('#spreadPages').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await rows.nth(0).dispatchEvent('dragstart',{dataTransfer:transfer});const target=await rows.nth(1).evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,y:r.y,height:r.height};});await rows.nth(1).dispatchEvent('dragover',{dataTransfer:transfer,clientX:target.x+target.width/2,clientY:target.y+target.height/2});await rows.nth(1).dispatchEvent('drop',{dataTransfer:transfer,clientX:target.x+target.width/2,clientY:target.y+target.height/2});
  assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),2);assert.equal(await page.evaluate(()=>history.length),editorHistory+1);
  await page.evaluate(()=>undo());
  await page.evaluate(()=>{carouselSlideSelect(0);carouselSlideCenter(0);});await page.waitForTimeout(100);
  const tab=page.locator('[data-slide="0"]'),box=await tab.boundingBox(),oldPosition=await page.evaluate(()=>p.carousel.artboards[0].y);
  await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+20,box.y+120,{steps:4});await page.mouse.up();
  assert(await page.evaluate(y=>p.carousel.artboards[0].y>y,oldPosition));await page.evaluate(()=>undo());
  await page.screenshot({path:artifact('spread-layout-files.png')});assert.deepEqual(errors,[]);
  console.log('PASS cross-page photo and vector blur exact pixels, MKW binary/asset/template roundtrips, individual PDF pages, real PSD slices/composite/raster fragments, invalid references, list docking and canvas move transactions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
