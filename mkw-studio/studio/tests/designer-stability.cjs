const assert=require('node:assert/strict');
const {launch,artifact,waitForProjectReady,selectTextScope}=require('./browser.cjs');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.STUDIO_URL);
 await page.locator('#startDesigner').click();await page.locator('#setupName').fill('Stabile Artboards');await page.locator('#cn').fill('3');await page.locator('#createProject').click();await waitForProjectReady(page);
 await page.evaluate(()=>{carouselObject('gradient',{x:0,y:0,w:2160,h:1350,color:'#e54025',endColor:'#2233cc',opacity:1});carouselSlideSelect(0);});
 const before=await page.evaluate(async()=>{window.stabilityPixels=async()=>{const out=[];for(let i=0;i<p.carousel.n;i++){const a=MKWCarouselPolicy.frame(p.carousel,i),c=makeCanvas(a.w,a.h);await carouselPaint(exportContext(c),i);out.push(c.toDataURL());c.width=c.height=1;}return out;};return {objects:clone(p.carousel.objects),frames:MKWCarouselPolicy.frames(p.carousel).map(a=>[a.x,a.y,a.w,a.h]),pixels:await stabilityPixels()};});
 await page.locator('.spread-compat summary').first().click();await page.locator('.spread-modes label').nth(1).click();
 assert.deepEqual(await page.evaluate(()=>p.carousel.objects),before.objects);assert.deepEqual(await page.evaluate(()=>p.carousel.artboards.map(a=>[a.x,a.y,a.w,a.h])),before.frames);assert.deepEqual(await page.evaluate(()=>stabilityPixels()),before.pixels);assert.equal(await page.locator('.pages-board-add').count(),1);
 const original=await page.evaluate(()=>({objects:clone(p.carousel.objects),boards:clone(p.carousel.artboards)}));await page.locator('#spreadAdd').click();assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups.length),2);
 for(const a of original.boards)assert.deepEqual(await page.evaluate(id=>p.carousel.artboards.find(a=>a.id===id),a.id),a);assert.deepEqual(await page.evaluate(()=>p.carousel.objects),original.objects);
 const align=await page.locator('#spreadAdd').evaluate(el=>{const a=el.querySelector('svg').getBoundingClientRect(),b=el.querySelector('span').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2);});assert(align<1.5);
 const other=await page.evaluate(()=>clone(p.carousel.artboards.at(-1)));await page.locator('.pages-board-add').first().click();assert.equal(await page.evaluate(()=>p.carousel.pageStructure.groups[0].length),4);assert(await page.evaluate(()=>p.carousel.pageStructure.groups[0].includes(p.carousel.artboards[carouselUI.slide].id)));assert.equal(await page.locator('#spreadPages .active-descendant[aria-selected=true]').count(),1);assert.deepEqual(await page.evaluate(id=>p.carousel.artboards.find(a=>a.id===id),other.id),other);assert.deepEqual(await page.evaluate(()=>p.carousel.objects),original.objects);assert(await page.locator('[data-add-to-artboard]').count()>=1);
 await page.evaluate(()=>{carouselUI.guides=true;carouselUI.snap=true;carouselObject('gradient',{id:'guide-test',x:300,y:300,w:200,h:200});carouselSetZoom(.5);carouselSlideCenter(0);});
 assert(await page.evaluate(()=>p.carousel.scrollX===document.querySelector('#carouselViewport').scrollLeft&&p.carousel.scrollY===document.querySelector('#carouselViewport').scrollTop));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.evaluate(()=>window.initialGuide=document.querySelector('#carouselGuides .slide-guide'));
 const pt=await page.evaluate(()=>{const r=carouselOrigin();return {x:r.left+400*carouselZoom,y:r.top+400*carouselZoom,dx:200*carouselZoom};});
 await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.mouse.move(pt.x-pt.dx,pt.y,{steps:15});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 assert(await page.evaluate(()=>window.initialGuide===document.querySelector('#carouselGuides .slide-guide')),'Grid is retained while moving');assert.equal(await page.locator('#carouselGuides').isVisible(),true);assert(await page.locator('#carouselSnapOverlay .vertical').count()>0,'Snap guide visible during drag');
 await page.screenshot({path:artifact('designer-guides-moving.png')});await page.mouse.up();
 const text='SehrLangerUntrennbarerText'.repeat(20)+'\nZweiter Absatz\nDritter Absatz';await page.evaluate(text=>carouselObject('text',{text,x:100,y:300,w:600,h:600,color:'#202020'}),text);
 for(const width of [300,450]){await page.evaluate(w=>{studioPreferences.inspectorWidth=w;studioApplyPreferences();},width);await selectTextScope(page,'[data-paragraph-selection]',['0','2']);
  await page.screenshot({path:artifact(`paragraph-html-options-${width}.png`)});
  for(const selector of ['[data-paragraph-selection]','[data-line-selection]'])assert(await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Scope has no horizontal overflow');
 }
 assert(await page.locator('[data-paragraph-selection] input[type=checkbox]').count()===3);assert.match(await page.locator('[data-paragraph-count]').textContent(),/2 von 3/);
 const textBeforeSelection=await page.evaluate(()=>JSON.stringify(carouselSelected()[0]));
 await selectTextScope(page,'[data-paragraph-selection]',[]);
 await page.locator('[data-paragraph-selection] input').first().check();await page.locator('[data-paragraph-selection] input').nth(2).click({modifiers:['Shift']});
 assert.equal(await page.locator('[data-paragraph-selection] input:checked').count(),3);
 await page.keyboard.press('Space');assert.equal(await page.locator('[data-paragraph-selection] input:checked').count(),2);
 assert.equal(await page.evaluate(()=>JSON.stringify(carouselSelected()[0])),textBeforeSelection);
 await selectTextScope(page,'[data-paragraph-selection]',['0','2']);

 await page.locator('#carouselProperties').evaluate(el=>el.scrollTop=0);await page.screenshot({path:artifact('paragraph-html-options.png')});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});for(const theme of ['light','dark']){await page.evaluate(t=>studioSetTheme(t),theme);assert.deepEqual(await page.evaluate(async()=>(await axe.run('#carouselSidebar')).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))),[]);}
 await page.locator('#newproject').click();await page.locator('[data-project-mode=post]').click();await page.locator('#setupName').fill('FD Textlisten');await page.locator('#createProject').click();await waitForProjectReady(page);
 await page.evaluate(async()=>{MKWSubject.detect=async()=>[];const c=makeCanvas(300,300),b=await new Promise(r=>c.toBlob(r));await importFiles([new File([b],'Test.png',{type:'image/png'})]);selected=p.boards[0].id;chooseStep('text');});
 await page.locator('#mainTextInput').fill(text);await selectTextScope(page,'[data-paragraph-selection]',['0','2']);await page.evaluate(()=>{studioPreferences.inspectorWidth=300;studioApplyPreferences();});
 for(const selector of ['[data-paragraph-selection]','[data-line-selection]'])assert(await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 assert.deepEqual(errors,[]);console.log('PASS non-destructive spread mode/pixels, per-artboard page append, stable existing coordinates/assets, add-button alignment, immediate view sync, persistent grid/snap during real drag, bounded HTML text scopes and axe');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
