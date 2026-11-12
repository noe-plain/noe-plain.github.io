const assert=require('node:assert/strict');
const {launch,artifact,waitForProjectReady,openLatestProject}=require('./browser.cjs');
(async()=>{
 const browser=await launch();
 try {
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(process.env.STUDIO_URL);await page.locator('#startDesigner').click();
  await page.locator('#setupName').fill('Seiten und Bögen');await page.locator('#cn').fill('3');await page.locator('#createProject').click();await waitForProjectReady(page);
  await page.evaluate(()=>{
   const canvas=makeCanvas(2160,1350),ctx=canvas.getContext('2d');ctx.fillStyle='#f45132';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#315bcc';ctx.fillRect(1080,0,1080,1350);
   const data=canvas.toDataURL();const im={id:'spread-photo',name:'Ein Foto, zwei Seiten',data,original:data,width:2160,height:1350};p.images.push(im);
   carouselObject('image',{id:'shared-photo',name:'Seitenübergreifendes Bild',imageId:im.id,x:0,y:0,w:2160,h:1350});
   carouselSlideSelect(0);
   window.pageHashes=async()=>{const values=[];for(let i=0;i<p.carousel.n;i++){const a=MKWCarouselPolicy.frame(p.carousel,i),cv=makeCanvas(a.w,a.h);await carouselPaint(exportContext(cv),i);const b=new Uint8Array(await(await new Promise(r=>cv.toBlob(r))).arrayBuffer());values.push([...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].join(','));cv.width=cv.height=1;}return values;};
  });
  const before=await page.evaluate(()=>pageHashes());
  await page.locator('#spreadEnable').click();await page.locator('#spreadPages').waitFor();await page.locator('.spread-compat summary').first().click();await page.locator('.spread-modes label').first().click();
  assert.deepEqual(await page.evaluate(()=>pageHashes()),before,'explicit conversion preserves each page');
  assert.equal(await page.evaluate(()=>p.carousel.objects.filter(o=>o.imageId==='spread-photo').length),2);
  await page.locator('.spread-modes label').nth(1).click();assert(await page.locator('[name=spreadMode][value=spreads]').isChecked());
  assert.deepEqual(await page.evaluate(()=>p.carousel.pageStructure.groups.map(g=>g.length)),[1,1,1], 'Mode change leaves existing artboards intact');
  await page.evaluate(()=>MKWSpreadUI.commit({type:'join',ids:p.carousel.artboards.slice(0,2).map(a=>a.id)}));
  assert.deepEqual(await page.evaluate(()=>p.carousel.pageStructure.groups.map(g=>g.length)),[2,1]);
  assert.deepEqual(await page.evaluate(()=>pageHashes()),before,'joining retains page appearance');
  assert.equal(await page.locator('.spread-fold').count(),1);
  await page.screenshot({path:artifact('spread-layout-pair.png')});console.log('page pixel parity and join passed');
  const rows=page.locator('#spreadPages [data-page]');await rows.nth(0).click();await rows.nth(1).click({modifiers:[process.platform==='darwin'?'Meta':'Control']});
  assert.equal(await page.locator('#spreadPages [data-page][aria-selected=true]').count(),2);
  await page.locator('[data-spread-action=split]').click();
  assert.deepEqual(await page.evaluate(()=>p.carousel.pageStructure.groups.map(g=>g.length)),[1,1,1]);
  assert.deepEqual(await page.evaluate(()=>pageHashes()),before,'split retains visible fragments');
  await page.locator('#spreadPages').focus();await page.keyboard.press((process.platform==='darwin'?'Meta':'Control')+'+z');assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),2);
  await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),1);
  // Cancelled reorder does not mutate model or undo history.
  await rows.nth(0).click();await page.locator('#spreadPages').focus();
  assert(await page.evaluate(()=>p.carousel.scrollX===document.querySelector('#carouselViewport').scrollLeft&&p.carousel.scrollY===document.querySelector('#carouselViewport').scrollTop), 'Programmatic selection synchronizes the saved view immediately');
  const snapshot=await page.evaluate(()=>({c:JSON.stringify(p.carousel),h:history.length}));
  await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>({c:JSON.stringify(p.carousel),h:history.length})),snapshot);
  await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  const moved=await page.evaluate(()=>p.carousel.artboards[0].id);assert.notEqual(moved,JSON.parse(snapshot.c).artboards[0].id);
  await page.evaluate(()=>undo());
  // Inline title, numbering, safe gap validation.
  await rows.nth(0).dblclick();await page.locator('input[aria-label="Seite umbenennen"]').fill('Titelseite');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>p.carousel.artboards[0].name),'Titelseite');
  await page.locator('.spread-advanced summary').click();await page.locator('#spreadNumber').fill('10');await page.locator('#spreadNumber').press('Tab');
  assert.equal(await page.evaluate(()=>p.carousel.pageStructure.startNumber),10);
  await page.locator('.spread-advanced summary').click();
  const old=await page.evaluate(()=>JSON.stringify(p.carousel));await page.locator('#spreadGap').fill('1');await page.locator('#spreadGap').press('Tab');assert.equal(await page.evaluate(()=>JSON.stringify(p.carousel)),old);assert(await page.locator('#spreadError').textContent());
  await page.locator('#spreadGap').fill('120');await page.locator('#spreadGap').press('Tab');
  // Batch format from numeric modal, no mutation before apply.
  await rows.nth(0).click();await rows.nth(1).click({modifiers:[process.platform==='darwin'?'Meta':'Control']});await page.locator('#spreadFormat').selectOption('custom');
  await page.locator('[data-spread-format=w]').fill('900');assert.equal(await page.evaluate(()=>p.carousel.artboards[0].w),1080);
  await page.locator('[data-format-apply]').click();assert.deepEqual(await page.evaluate(()=>p.carousel.artboards.map(a=>a.w)),[900,900,1080]);await page.evaluate(()=>undo());
  // Shortcut creates a two-page spread with one undo checkpoint after activation.
  await page.locator('#carouselViewport').focus();const n=await page.evaluate(()=>p.carousel.n);await page.keyboard.press('Control+Alt+n');assert.equal(await page.evaluate(()=>p.carousel.n),n+1);await page.evaluate(()=>undo());
  // Drag cancel restores exact original; detach is also exposed by click action.
  // Select through the page list first: canvas headers are culled and replaced after scrolling.
  await rows.first().click();
  const header=await page.waitForFunction(()=>{
    const el=document.querySelector('[data-slide="0"]'),viewport=document.querySelector('#carouselViewport');
    if(!el||el.hidden||!viewport)return false;
    const r=el.getBoundingClientRect(),v=viewport.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.right>v.left&&r.left<v.right&&r.bottom>v.top&&r.top<v.bottom?{x:r.x,y:r.y,width:r.width,height:r.height}:false;
  });
  const r=await header.jsonValue();
  const orig=await page.evaluate(()=>({c:JSON.stringify(p.carousel),h:history.length}));
  await page.mouse.move(r.x+30,r.y+20);await page.mouse.down();await page.mouse.move(r.x+100,r.y+100);await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await page.evaluate(()=>({c:JSON.stringify(p.carousel),h:history.length})),orig);
  console.log('rename, numbering, format, shortcut and drag cancel passed');
  // Each digital spread can be configured separately; drafts/cancel preserve content.
  await page.locator('#spreadPages [data-page]').first().click();
  const groupBaseline=await page.evaluate(()=>({n:p.carousel.n,h:history.length,objects:JSON.stringify(p.carousel.objects)}));
  await page.locator('[data-spread-action=edit-spread]').click();await page.locator('[data-bogen=count]').fill('21');assert(await page.locator('[data-bogen-apply]').isDisabled());
  await page.locator('[data-bogen=count]').fill('20');assert.equal(await page.evaluate(()=>p.carousel.n),groupBaseline.n);await page.locator('[data-bogen-cancel]').click();
  assert.deepEqual(await page.evaluate(()=>({n:p.carousel.n,h:history.length,objects:JSON.stringify(p.carousel.objects)})),groupBaseline);
  await page.locator('[data-spread-action=edit-spread]').click();await page.locator('[data-bogen=count]').fill('20');await page.locator('[data-bogen-apply]').click();
  assert.equal(await page.evaluate(()=>p.carousel.n),groupBaseline.n+19);assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),20);assert.equal(await page.evaluate(()=>history.length),groupBaseline.h+1);
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>p.carousel.n),groupBaseline.n);
  // Virtualization and viewport raster bounds at 120 pages, no external image copies.
  assert(await page.evaluate(()=>MKWSpreadUI.commit({type:'add',count:117},'Test: 120 Seiten')));
  assert.equal(await page.evaluate(()=>p.carousel.n),120);
  assert((await page.locator('#spreadPages [data-page]').count())<15);
  await page.locator('#spreadPages').focus();await page.keyboard.press('End');assert.equal(await page.locator('#spreadPages [data-page]').last().getAttribute('data-page'),await page.evaluate(()=>p.carousel.artboards[119].id));
  await page.evaluate(()=>{carouselUI.slide=119;carouselSlideCenter(119);carouselSetZoom(.35);});
  await page.waitForTimeout(100);await page.evaluate(()=>carouselWaitForPaint());
  const perf=await page.evaluate(()=>({raster:document.querySelector('#carouselCanvas').width*document.querySelector('#carouselCanvas').height,guides:document.querySelectorAll('.slide-guide').length,tabs:document.querySelectorAll('[data-slide]').length,photo:p.images.filter(i=>i.id==='spread-photo').length}));
  assert(perf.raster<=4010000);assert(perf.guides<30);assert(perf.tabs<30);assert.equal(perf.photo,1);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const a11y=await page.evaluate(async()=>{const r=await axe.run('#carouselSidebar');return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});assert.deepEqual(a11y,[]);
  await page.evaluate(()=>studioSetTheme('dark'));await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(async()=>(await axe.run('#carouselSidebar')).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,failure:n.failureSummary}))}))),[]);await page.evaluate(()=>studioSetTheme('light'));
  await page.screenshot({path:artifact('spread-layout-120-pages.png')});
  await page.locator('[data-spread-action=edit-spread]').click();await page.locator('#spreadEditDialog').evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});assert.deepEqual(await page.evaluate(async()=>(await axe.run('#spreadEditDialog')).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,failure:n.failureSummary}))}))),[]);await page.locator('[data-bogen-cancel]').click();
  // Portable backup and migration/validation.
  await page.evaluate(()=>{validate(p);validateCarousel(p);});await page.evaluate(()=>autosave());await page.reload();await openLatestProject(page);assert.equal(await page.evaluate(()=>p.carousel.n),120);
  await page.evaluate(()=>{carouselSlideSelect(0);});
  await page.locator(".spread-compat summary").first().click();
  await page.locator('#spreadPages').focus();await page.keyboard.press('Control+a');await page.locator('[data-spread-action=more]').click();await page.getByRole('menuitem',{name:'Löschen …',exact:true}).click();await page.locator('[data-choice=cancel]').click();assert.equal(await page.evaluate(()=>p.carousel.n),120);
  await page.locator('[data-spread-action=more]').click();await page.getByRole('menuitem',{name:'Löschen …',exact:true}).click();await page.locator('[data-choice=delete]').click();await page.waitForFunction(()=>p.carousel.n===0);assert.equal(await page.evaluate(()=>p.carousel.n),0);assert(await page.locator('#spreadEmpty').isVisible());assert(await page.locator('#carouselExport').isDisabled());
  await page.locator('#spreadAdd').click();assert.equal(await page.evaluate(()=>p.carousel.n),1);assert.equal(await page.evaluate(()=>{validate(p);validateCarousel(p);return true;}),true);
  await page.setViewportSize({width:500,height:700});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>{document.body.classList.add('tools-open');document.body.classList.remove('sidebar-hidden');});
  assert(await page.locator('#spreadPages').isVisible());await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:artifact('spread-layout-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS page conversion/pixel parity, group/split/undo, shared photo references, batch format, numbering, keyboard transaction/cancel, 120-page virtualization/culling, axe, backup, delete empty/repopulate and mobile');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
