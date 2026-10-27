const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
 const browser = await launch();
 try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.STUDIO_URL);
  await page.locator('#startNew').click();
  await page.locator('#setupName').fill('Gesamtprüfung');
  await page.locator('#createProject').click();
  await page.waitForFunction(() => !busy);
  await page.evaluate(async () => {
    const c = makeCanvas(800,1000), x = c.getContext('2d');
    x.fillStyle='#527586';x.fillRect(0,0,800,1000);
    const im={id:uid(),name:'Prüfung.png',width:800,height:1000,data:c.toDataURL()};
    p.images.push(im);p.boards=[createBoard(im,1080,1350)];selected=p.boards[0].id;
    changed(); await prepareLogo(board()); await draw();
  });
  await page.locator('[data-step="text"]').click();
  const oldSize = await page.evaluate(() => board().elements[layer].size);
  for (const value of ['', '0', '9000']) {
    await page.locator('#textSize').fill(value);
    assert.equal(await page.evaluate(() => board().elements[layer].size), oldSize);
    assert.equal(await page.locator('#textSize').getAttribute('aria-invalid'),'true');
  }
  await page.locator('#textSize').fill('85');
  assert.equal(await page.evaluate(() => board().elements[layer].size),85);
  assert.equal(await page.locator('#textSize').getAttribute('aria-invalid'),null);
  await page.locator('[data-step="crop"]').click();
  const scale = await page.evaluate(() => board().image.scale);
  await page.locator('#scale').fill('');await page.locator('#angle').focus();
  assert.equal(await page.evaluate(() => board().image.scale),scale);
  async function checkScroll(id, label) {
    const x = page.locator(`[role="scrollbar"][aria-controls="${id}"][aria-orientation="horizontal"]`);
    const y = page.locator(`[role="scrollbar"][aria-controls="${id}"][aria-orientation="vertical"]`);
    await x.waitFor({state:'visible'});await y.waitFor({state:'visible'});
    for (const handle of [x,y]) {
      await handle.focus();await page.keyboard.press('End');
      await page.waitForTimeout(80);
      const bounds=await handle.evaluate(el=>{
        const r=el.getBoundingClientRect(), v=document.getElementById(el.getAttribute('aria-controls')),b=v.getBoundingClientRect();
        const radius=parseFloat(getComputedStyle(v).borderBottomRightRadius);
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,l:b.left,t:b.top,r:b.right,b:b.bottom,radius,orient:el.getAttribute('aria-orientation'),n:+el.getAttribute('aria-valuenow'),max:+el.getAttribute('aria-valuemax')};
      });
      assert(Math.abs(bounds.n-bounds.max)<=1);
      assert(bounds.orient==='horizontal' ? bounds.x>=bounds.l+bounds.radius-1&&bounds.right<=bounds.r-bounds.radius+1 : bounds.y>=bounds.t+bounds.radius-1&&bounds.bottom<=bounds.b-bounds.radius+1,JSON.stringify(bounds));
      await page.keyboard.press('Home');await page.waitForTimeout(80);
      assert.equal(await handle.getAttribute('aria-valuenow'),'0');
      await page.keyboard.press('PageDown');await page.waitForTimeout(80);
      assert(+await handle.getAttribute('aria-valuenow')>0);
    }
    const before=await x.getAttribute('aria-valuenow'),r=await x.boundingBox();
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+65,r.y+r.height/2,{steps:5});await page.mouse.up();
    assert.notEqual(await x.getAttribute('aria-valuenow'),before);
    await page.screenshot({path:artifact('comprehensive-'+label+'.png'),animations:'disabled'});
  }
  const contentBefore=await page.evaluate(()=>JSON.stringify(MKWProjectAssets.capture(p)));
  await checkScroll('workspace','fd');
  assert.equal(await page.evaluate(()=>JSON.stringify(MKWProjectAssets.capture(p))),contentBefore,'Scroll does not change documents');
  // Persistent library writes fail atomically and remain actionable after recovery.
  await page.locator('#settings').click();await page.locator('#settings-tab-sponsors').click();
  await page.locator('#newSponsorGroup').waitFor();
  await page.evaluate(()=>{window.originalSponsorSave=MKWSponsorLibrary.save;MKWSponsorLibrary.save=async()=>{throw Error('Test: Speicher voll')};});
  await page.locator('#newSponsorGroup').click();
  await page.waitForFunction(()=>document.querySelector('#sponsorLibraryStatus')?.textContent.includes('Speicher voll'));
  assert.equal(await page.evaluate(()=>sponsorGroups.length),0);
  assert.equal(await page.evaluate(async()=>(await MKWSponsorLibrary.groups()).length),0);
  assert.equal(await page.locator('#sponsorLibraryStatus').getAttribute('role'),'alert');
  assert(await page.locator('#newSponsorGroup').isEnabled());
  await page.evaluate(()=>{MKWSponsorLibrary.save=window.originalSponsorSave});
  await page.locator('#newSponsorGroup').click();await page.locator('[data-sponsor-name]').waitFor();
  assert.equal(await page.evaluate(async()=>(await MKWSponsorLibrary.groups()).length),1);
  await page.evaluate(()=>{MKWSponsorLibrary.save=async()=>{throw Error('Test: Schreibfehler')};});
  await page.locator('[data-sponsor-delete]').click();
  await page.waitForFunction(()=>document.querySelector('#sponsorLibraryStatus')?.textContent.includes('Schreibfehler'));
  assert.equal(await page.evaluate(()=>sponsorGroups.length),1);
  assert.equal(await page.locator('[data-sponsor-name]').count(),1);
  await page.evaluate(()=>{MKWSponsorLibrary.save=window.originalSponsorSave;document.querySelector('#settingsDialog').close();});
  // A slow project open cannot race another open or expose editable content.
  await page.evaluate(()=>{
    window.openOriginal=p.projectId;
    window.pendingRecord = new Promise(resolve=>window.resolveRecord=resolve);
    window.firstOpening=MKWProjects.open(window.pendingRecord);
  });
  await page.locator('#projectOpeningDialog[open]').waitFor();
  await page.keyboard.press('Escape');assert(await page.locator('#projectOpeningDialog').isVisible());
  await page.evaluate(async()=>{await MKWProjects.open({project:{}});});
  assert.equal(await page.evaluate(()=>p.projectId),await page.evaluate(()=>window.openOriginal));
  await page.evaluate(async()=>{window.resolveRecord({id:p.projectId,version:0,project:clone(p)});await window.firstOpening;});
  await page.waitForFunction(()=>!busy&&!document.querySelector('#projectOpeningDialog'));
  const designer=await browser.newPage({viewport:{width:1500,height:1000}});
  designer.on('pageerror',e=>errors.push(e.message));
  await designer.goto(process.env.STUDIO_URL);
  await designer.locator('#startNew').click();await designer.locator('[data-project-mode=carousel]').click();
  await designer.locator('#setupName').fill('Designer Prüfung');await designer.locator('#createProject').click();
  await designer.locator('#carouselCanvas').waitFor();
  await designer.evaluate(()=>{const o=carouselObject('text',{x:100,y:150,w:500,h:300,text:'Text'});carouselSelect([o.id]);carouselPanel();});
  const oldX=await designer.evaluate(()=>carouselSelected()[0].x);
  await designer.locator('[data-prop=x]').fill('');
  assert.equal(await designer.evaluate(()=>carouselSelected()[0].x),oldX);
  assert.equal(await designer.locator('[data-prop=x]').getAttribute('aria-invalid'),'true');
  await designer.locator('[data-prop=x]').fill('250');
  assert.equal(await designer.evaluate(()=>carouselSelected()[0].x),250);
  await designer.evaluate(()=>{carouselObject('gradient',{x:100,y:200,w:500,h:400});});
  await designer.locator('[data-paint-channel=fill]').click();
  await designer.locator('#paintAlpha').fill('35');
  const paint = await designer.evaluate(()=>JSON.stringify(studioPicker.value));
  for (const selector of ['#paintAlpha','#paintAngle','#paintStopPosition','#paintMidPosition']) {
    await designer.locator(selector).fill('');
    assert.equal(await designer.evaluate(()=>JSON.stringify(studioPicker.value)),paint,'Incomplete colour value leaves artwork unchanged');
  }
  await designer.locator('#paintClose').click();
  await designer.evaluate(()=>{render();render();});
  await designer.waitForTimeout(80);
  assert.equal(await designer.locator('[role="scrollbar"][aria-controls="carouselViewport"]').count(),2,'Rebuilding editor releases old scroll controls');
  // Reuse the scroll interaction checks on a fresh Designer document.
  await page.goto(process.env.STUDIO_URL);
  await page.locator('#startNew').click();await page.locator('[data-project-mode=carousel]').click();await page.locator('#setupName').fill('Scroll');await page.locator('#createProject').click();await page.locator('#carouselCanvas').waitFor();
  await checkScroll('carouselViewport','designer');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(150);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:artifact('comprehensive-mobile.png'),animations:'disabled'});
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  const highContrast = await page.locator('[role="scrollbar"][aria-controls="carouselViewport"][aria-orientation="horizontal"]').evaluate(el=>({thumb:getComputedStyle(el,'::before').backgroundColor, surface:getComputedStyle(document.getElementById('carouselViewport')).backgroundColor}));
  assert.notEqual(highContrast.thumb,highContrast.surface,'High-contrast scroll grip remains visible');
  assert.deepEqual(errors,[]);
  console.log('PASS numeric drafts retain artwork; sponsor write rollback/recovery; serialized project opening; both scroll axes, keyboard/drag/radius bounds, mobile and unchanged project content');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
