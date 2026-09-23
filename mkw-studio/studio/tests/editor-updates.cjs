const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const root=process.env.STUDIO_ROOT||path.resolve(__dirname,'..');
 await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:8891/mkw-studio/');
 await page.locator('#startNew').waitFor();await page.waitForFunction(()=>!document.querySelector('#startNew').disabled);
 assert(await page.locator('#startDialog').isVisible());assert(await page.locator('#startContinue').isDisabled());await page.keyboard.press('Escape');assert(await page.locator('#startDialog').isVisible());
 await page.screenshot({path:'/private/tmp/mkw-startscreen.png'});
 await page.locator('#startNew').click();
 await page.locator('#files').setInputFiles([path.join(root,'testbilder/260831_A1_Probe_c-noe-plain-4.jpg'),path.join(root,'testbilder/260831_A1_Probe_c-noe-plain-5.jpg')]);
 await page.waitForFunction(()=>p.boards.length===4&&!busy);
 const pick=page.locator('.text-type-picker').first();await pick.locator('summary').click();
 for(const key of ['date','title','subtitle'])await pick.locator(`[data-text-type="${key}"]`).check();
 assert(await pick.getAttribute('open')!==null);
 assert.deepEqual(await page.evaluate(()=>p.boards.slice(0,2).map(b=>['date','title','subtitle'].every(k=>b.elements[k].enabled))),[true,true]);
 assert.equal(await page.evaluate(()=>p.boards[2].elements.date.enabled??false),false);
 await pick.locator('summary').click();
 // Text content is retained when a type is hidden, including updates from another image.
 await page.evaluate(()=>{setSharedText(p.boards[0],'title','KONZERT');setSharedText(p.boards[0],'subtitle','Ein Untertitel');changed(false)});
 const second=page.locator('.text-type-picker').nth(1);await second.locator('summary').click();await second.locator('[data-text-type="title"]').uncheck();await second.locator('summary').click();
 await page.evaluate(()=>{setSharedText(p.boards[0],'title','NEUER TITEL');changed(false)});
 assert.deepEqual(await page.evaluate(()=>p.boards.slice(2).map(b=>[b.elements.title.visible,b.elements.title.text])),[[false,'NEUER TITEL'],[false,'NEUER TITEL']]);
 await page.evaluate(async()=>{p.meta.title='Auswahltest';await autosave()});await page.reload();await page.waitForFunction(()=>!document.querySelector('#startContinue').disabled);
 assert.equal(await page.evaluate(()=>p.images.length),0);await page.locator('#startContinue').click();await page.waitForFunction(()=>p.images.length===2&&!busy);
 assert.deepEqual(await page.evaluate(()=>p.boards.slice(2).map(b=>b.elements.title.enabled)),[false,false]);
 await page.locator('.text-type-picker').nth(1).locator('summary').click();await page.locator('.text-type-picker').nth(1).locator('[data-text-type="title"]').check();await page.locator('#undo').click();assert.equal(await page.locator('.text-type-picker').nth(1).locator('[data-text-type="title"]').isChecked(),false);
 // A shadow-only render must contain soft black alpha, with no original coloured logo or hard silhouette.
 const pixels=await page.evaluate(async()=>{
  const c=makeCanvas(240,100),m=c.getContext('2d');m.fillStyle='#ff0000';m.fillRect(60,30,120,40);const logo=await image(c.toDataURL());
  const b=clone(p.boards[0]);b.elements.logo={x:250,y:250,size:240,angle:0,align:'left',visible:true};
  const result=makeCanvas(800,650),ctx=result.getContext('2d');softLogoShadow(ctx,b,logo,1);
  const d=ctx.getImageData(0,0,800,650).data;let max=0,coloured=0;for(let i=0;i<d.length;i+=4){max=Math.max(max,d[i+3]);if(d[i+3]&&(d[i]||d[i+1]||d[i+2]))coloured++}
  const alpha=(x,y)=>d[(y*800+x)*4+3];return{max,coloured,center:alpha(370,304),edge:alpha(310,304),outside:alpha(280,304),far:alpha(20,20)};
 });assert.equal(pixels.coloured,0);assert(pixels.max>10&&pixels.max<180);assert(pixels.center>pixels.edge&&pixels.edge>pixels.outside&&pixels.outside>0);assert.equal(pixels.far,0);
 await page.evaluate(()=>{p.boards.forEach(b=>{b.elements.logo.visible=true;b.elements.logo.source='white'});selected=p.boards[0].id;render()});await page.waitForFunction(()=>!drawing);await page.screenshot({path:'/private/tmp/mkw-textauswahl.png'});
 await page.evaluate(()=>autosave());await page.reload();await page.locator('#startNew').click();assert.equal(await page.evaluate(()=>p.images.length),0);await page.reload();await page.locator('#startContinue').click();await page.waitForFunction(()=>p.images.length===2&&!busy);
 assert.deepEqual(errors,[]);console.log('PASS welcome/new/resume, per-image multi-selection, retained text, hidden propagated text, undo, persistence, soft black alpha shadow, previous autosave preserved until edits');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
