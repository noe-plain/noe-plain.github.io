const assert=require('node:assert/strict');const {launch,artifact,waitForProjectReady}=require('./browser.cjs');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto(process.env.STUDIO_URL);await page.locator('#startDesigner').click();await page.locator('#setupName').fill('Seiten und Artboards');await page.locator('#cn').fill('3');await page.locator('#createProject').click();await waitForProjectReady(page);
 await page.evaluate(()=>{carouselObject('gradient',{x:0,y:0,w:1080,h:1350,color:'#ff9933',endColor:'#dd2233',opacity:1});carouselSlideSelect(0);});await page.locator('#spreadEnable').click();await page.locator('.spread-modes label').first().click();
 await page.locator('#spreadPages[role=tree]').waitFor();assert.equal(await page.locator('.pages-artboard').count(),3);
 const vertical=await page.evaluate(()=>p.carousel.artboards.map(a=>[a.x,a.y]));assert.deepEqual(vertical.map(a=>a[0]),[0,0,0]);assert(vertical[1][1]>vertical[0][1]);
 await page.waitForFunction(()=>MKWPagePreviewCache.stats().entries>=2&&MKWPagePreviewCache.stats().pending===0);const cached=await page.evaluate(()=>MKWPagePreviewCache.stats().entries);
 const menu=page.locator('.pages-board-menu').first();await menu.click();await page.getByRole('menuitem',{name:'Umbenennen',exact:true}).click();await page.locator('#artboardNameInput').fill('Sommerreihe');await page.locator('[data-board-apply]').click();assert.equal(await page.evaluate(()=>p.carousel.pageStructure.artboardInfo[0].name),'Sommerreihe');
 assert.equal(await page.evaluate(()=>MKWPagePreviewCache.stats().entries),cached,'renaming does not repaint content thumbnails');
 await page.locator('.pages-disclosure').first().click();assert.equal(await page.locator('#spreadPages [data-artboard]').first().getAttribute('aria-expanded'),'false');await page.locator('.pages-disclosure').first().click();
 await page.locator('.pages-thumb').nth(1).click();assert.equal(await page.evaluate(()=>carouselUI.slide),1);assert.equal(await page.locator('[data-artboard=w]').inputValue(),'1080');
 await page.locator('.pages-board-menu').first().click();await page.getByRole('menuitem',{name:'Artboard duplizieren',exact:true}).click();assert.equal(await page.evaluate(()=>p.carousel.n),4);assert(await page.evaluate(()=>p.carousel.pageStructure.artboardInfo.some(a=>a.name==='Sommerreihe Kopie')));
 await page.evaluate(()=>undo());
 const selected=await page.evaluate(()=>p.carousel.artboards.map(a=>a.id));assert(await page.evaluate(ids=>MKWSpreadUI.commit({type:'join',ids:ids.slice(0,2)}),selected));assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),2);
 await page.locator('.pages-thumb').first().click();const transfer=await page.evaluateHandle(()=>new DataTransfer());await page.locator('.pages-thumb').first().dispatchEvent('dragstart',{dataTransfer:transfer});await page.locator('.pages-artboard-heading').nth(1).dispatchEvent('dragover',{dataTransfer:transfer});await page.locator('.pages-artboard-heading').nth(1).dispatchEvent('drop',{dataTransfer:transfer});assert.equal(await page.evaluate(ids=>p.carousel.pageStructure.groups.some(g=>g.includes(ids[0])&&g.includes(ids[2])&&g.length===2),selected),true);
 await page.evaluate(()=>undo());
 // A real Firefox pointer drag also reaches the model (no synthetic-only demo).
 await page.evaluate(()=>{studioPreferences.inspectorSplit=85;studioApplyPreferences();});
 // Keep both endpoints visible before the native gesture; scrolling mid-drag can cancel Chrome dragstart.
 await page.locator('#spreadPages').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const nativeBefore=await page.evaluate(()=>p.carousel.pageStructure.groups.map(g=>[...g]));
 await page.locator('.pages-thumb').first().dragTo(page.locator('.pages-artboard-heading').nth(1));
 assert.notDeepEqual(await page.evaluate(()=>p.carousel.pageStructure.groups),nativeBefore,'native pointer drag changes target membership');
 await page.evaluate(()=>undo());
 // Alt-drag duplicates without moving the source; deletion drop waits for a choice.
 const prior=await page.evaluate(()=>({n:p.carousel.n,ids:p.carousel.artboards.map(a=>a.id),target:p.carousel.pageStructure.artboardInfo[1].id}));
 await page.locator('.pages-thumb').first().click();
 await page.locator('.pages-thumb').first().dispatchEvent('dragstart',{dataTransfer:transfer,altKey:true});
 assert(await page.locator('.pages-drop-delete').isVisible());
 await page.locator('.pages-artboard-heading').nth(1).dispatchEvent('drop',{dataTransfer:transfer,altKey:true});
 assert.equal(await page.evaluate(()=>p.carousel.n),prior.n+1);
 assert(await page.evaluate(v=>v.ids.every(id=>p.carousel.artboards.some(a=>a.id===id)),prior));
 await page.evaluate(()=>undo());
 await page.locator('.pages-thumb').first().click();const deleteBefore=await page.evaluate(()=>JSON.stringify(p.carousel));
 await page.locator('.pages-thumb').first().dispatchEvent('dragstart',{dataTransfer:transfer});
 await page.locator('.pages-drop-delete').dispatchEvent('drop',{dataTransfer:transfer});
 assert.equal(await page.evaluate(()=>JSON.stringify(p.carousel)),deleteBefore);
 await page.locator('[data-choice=cancel]').click();assert.equal(await page.evaluate(()=>JSON.stringify(p.carousel)),deleteBefore);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>(await axe.run('#carouselSidebar')).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,checks:n.any}))})));assert.deepEqual(violations,[]);
 await page.screenshot({path:artifact('pages-artboards-light.png')});await page.evaluate(()=>studioSetTheme('dark'));await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(async()=>(await axe.run('#carouselSidebar')).violations.map(v=>v.id)),[]);await page.screenshot({path:artifact('pages-artboards-dark.png')});assert.deepEqual(errors,[]);
 console.log('PASS vertical independent artboards, named groups, cached previews, collapse/selection/canvas synchronization, duplicate/undo, cross-artboard dock and axe in both themes');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
