const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[],uploads=[];page.setDefaultTimeout(120000);
  await page.addInitScript(()=>window.showSaveFilePicker=undefined);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('api/session')&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});page.on('request',r=>{if(r.method()==='POST')uploads.push(r.url())});
  await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:8898/');await page.locator('#startNew').click();
  assert.equal(await page.locator('[data-format-enabled]:checked').count(),2);
  await page.locator('#setupName').fill('Klang im Herbst');await page.locator('[data-format-enabled]').nth(2).check();await page.locator('#addFormat').click();const custom=page.locator('[data-format]').last();await custom.locator('[data-format-key="top"]').fill('150');await custom.locator('[data-format-key="bottom"]').fill('250');
  await page.screenshot({path:'/private/tmp/mkw-project-setup.png'});await page.locator('#createProject').click();
  const fixture=process.env.FIXTURE||require('node:path').resolve(__dirname,'../testbilder/260831_A1_Probe_c-noe-plain-4.jpg');
  await page.locator('#files').setInputFiles(fixture);await page.waitForFunction(()=>p.boards.length===4&&!busy);
  const imported=await page.evaluate(()=>({people:p.images[0].people,status:p.images[0].subjectStatus,boards:p.boards.map(b=>({w:b.w,h:b.h,safe:MKWLayout.safeRect(b),logo:b.elements.logo,covered:MKW.imageCovers(b,asset(b))}))}));console.log('Import:',JSON.stringify(imported));
  assert(!imported.status.includes('nicht verfügbar'));assert(imported.people.length>0,'Real person detection must find the person in the fixture');assert(imported.boards.every(b=>b.logo.source==='white'&&b.logo.visible&&b.covered));assert.equal(imported.boards[3].safe.top,150);assert.equal(imported.boards[3].safe.bottom,250);assert.equal(imported.boards[2].h,1350);
  await page.locator('#files').setInputFiles(fixture);await page.waitForFunction(()=>p.images.length===2&&!busy);
  await page.evaluate(()=>{setSharedText(p.boards[0],'date','DO 19. NOV 2026');setSharedText(p.boards[0],'title','Klang im Herbst');setSharedText(p.boards[0],'subtitle','Für die ganze Familie');setImageTextType(p.images[0].id,'subtitle',true);setSharedTextSize(p.boards[0],'date',63);setSharedTextSize(p.boards[0],'subtitle',41)});
  assert(await page.evaluate(()=>p.boards.every(b=>b.elements.date.size===63&&b.elements.subtitle.size===41)));
  await page.evaluate(()=>{setSharedText(p.boards[4],'date','ANDERER TEXT');setSharedTextSize(p.boards[0],'date',70)});assert(await page.evaluate(()=>p.boards.slice(4).every(b=>b.elements.date.size===63)));
  await page.evaluate(()=>{p.meta.code='T';p.meta.title='Klang';for(const b of p.boards)b.checked=b.id===p.boards[0].id;return autosave()});
  await page.reload();await page.locator('#startContinue').click();await page.waitForFunction(()=>p.boards.length===8&&!busy);assert.equal(await page.evaluate(()=>p.formats.length),4);
  await page.locator('#export').click();await page.waitForFunction(()=>document.querySelector('.export-size')?.dataset.bytes);
  await page.locator('#deselectAllExports').click();assert(await page.locator('#zip').isDisabled());await page.locator('#selectAllExports').click();assert.equal(await page.locator('[data-export-id]:checked').count(),8);await page.evaluate(()=>{selectExports(false);p.boards[0].checked=true;document.querySelector('[data-export-id]').checked=true;updateExportNames()});assert.equal(await page.locator('.export-preview.checkerboard').count(),0);
  const firstSize=+(await page.locator('.export-size').first().getAttribute('data-bytes'));assert(firstSize>1000);
  await page.locator('#exportQuality').fill('30');await page.waitForFunction(size=>Number(document.querySelector('.export-size')?.dataset.bytes)<size,firstSize);
  await page.locator('[data-export-format=webp]').click();await page.waitForFunction(()=>document.querySelector('.export-preview img')?.src&&document.querySelector('.export-size')?.dataset.bytes);assert((await page.locator('.export-name').first().innerText()).endsWith('.webp'));
  await page.locator('[data-export-format=png]').click();await page.locator('#png8').check();await page.locator('#pngColours').selectOption('16');await page.waitForFunction(()=>document.querySelector('.export-size')?.dataset.bytes);await page.screenshot({path:'/private/tmp/mkw-export-desktop.png'});
  const png8=await page.evaluate(async()=>{const result=await encodedBoard(clone(p.boards[0]),exportSettings()),a=new Uint8Array(await result.blob.arrayBuffer());let count=0;for(let i=8;i<a.length;){const len=new DataView(a.buffer).getUint32(i),name=String.fromCharCode(...a.slice(i+4,i+8));if(name==='PLTE')count=len/3;i+=len+12}return{type:a[25],depth:a[24],count}});assert.equal(png8.type,3);assert(png8.count<=16);assert(png8.depth<=8);
  await page.locator('#reviewExport').click();await page.locator('#reviewImage').waitFor({state:'visible'});await page.screenshot({path:'/private/tmp/mkw-review.png'});assert.equal(await page.locator('#reviewDialog canvas,.review-stage .safe-zone').count(),0);await page.locator('#closeReview').click();
  const download=page.waitForEvent('download');await page.locator('#zip').click();const zip=await download;await zip.saveAs('/private/tmp/mkw-new-export.zip');await page.waitForFunction(()=>!busy);assert.equal(await page.locator('#progressPercent').innerText(),'100 %');assert(zip.suggestedFilename().endsWith('_PNG.zip'));
  // Transparency removes only the canvas background and retains artwork.
  const transparency=await page.evaluate(async()=>{const b=clone(p.boards[0]);b.image.scale=.05;b.elements.logo.visible=false;for(const key of MKWLayout.keys)b.elements[key].visible=false;const results=[];for(const transparent of [true,false]){const {blob}=await encodedBoard(b,{format:'png',quality:90,png8:false,colours:256,transparent}),bitmap=await createImageBitmap(blob),c=makeCanvas(b.w,b.h);c.getContext('2d').drawImage(bitmap,0,0);results.push(c.getContext('2d').getImageData(0,0,1,1).data[3]);bitmap.close()}return results});assert.deepEqual(transparency,[0,255]);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/private/tmp/mkw-export-mobile.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(uploads,[]);console.log('PASS format setup, real local detection, logo defaults, text sizes, restore, codecs, PNG palette, transparency, review and ZIP progress');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
