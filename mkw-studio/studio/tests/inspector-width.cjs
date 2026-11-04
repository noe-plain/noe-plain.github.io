const assert=require('node:assert/strict');
const {launch,waitForProjectReady,artifact}=require('./browser.cjs');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(process.env.STUDIO_URL);await page.locator('#startNew').click();await page.locator('#setupName').fill('Breitenverstellung');await page.locator('#createProject').click();await waitForProjectReady(page);
 const grip=page.getByRole('separator',{name:'Breite der Seitenleiste'});
 const geometry=async(id)=>page.evaluate(id=>{const s=document.querySelector(id).getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect(),v=document.querySelector(id==='#toolsSidebar'?'#workspace':'#carouselViewport').getBoundingClientRect();return{width:s.width,header:h.right,workspace:v.right,sidebar:s.left};},id);
 const before=await page.evaluate(()=>({doc:JSON.stringify(snapshot()),history:history.length,revision}));
 await grip.focus();await grip.press('End');assert.equal(await grip.getAttribute('aria-valuenow'),'450');let g=await geometry('#toolsSidebar');assert.equal(g.width,450);assert(Math.abs(g.header-g.workspace)<1);assert(g.workspace<g.sidebar);
 await grip.press('ArrowRight');assert.equal(await grip.getAttribute('aria-valuenow'),'445');
 let r=await grip.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+20);await page.mouse.down();await page.mouse.move(r.x+140,r.y+20,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await grip.getAttribute('aria-valuenow'),'445');
 r=await grip.boundingBox();await page.mouse.move(r.x+12,r.y+20);await page.mouse.down();await page.mouse.move(r.x+112,r.y+20,{steps:10});await page.mouse.up();assert.equal(await grip.getAttribute('aria-valuenow'),'345');
 await grip.dblclick();assert.equal(await grip.getAttribute('aria-valuenow'),'300');assert.deepEqual(await page.evaluate(()=>({doc:JSON.stringify(snapshot()),history:history.length,revision})),before,'Width changes never mutate document/history');
 await grip.press('End');await page.locator('#newproject').click();await page.locator('[data-project-mode=carousel]').click();await page.locator('#setupName').fill('Designerbreite');await page.locator('#createProject').click();await waitForProjectReady(page);
 g=await geometry('#carouselSidebar');assert.equal(g.width,450);assert(Math.abs(g.header-g.workspace)<1);assert(g.workspace<g.sidebar);
 assert.equal(await page.locator('.inspector-splitter:not(.inspector-width-splitter)').getAttribute('aria-valuenow'),'70');
 await grip.focus();await grip.press('Home');g=await geometry('#carouselSidebar');assert.equal(g.width,300);assert(Math.abs(g.header-g.workspace)<1);
 const portable=await page.evaluate(async()=>{const s=await MKWSetupSession.capture();return{width:s.preferences.inspectorWidth,document:JSON.stringify(snapshot()).includes('inspectorWidth')};});assert.equal(portable.width,300);assert.equal(portable.document,false);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.querySelector('.inspector-width-splitter'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))),[]);
 await page.screenshot({path:artifact('sidebar-width-designer.png')});
 for(const width of [900,1024,1300]){await page.setViewportSize({width,height:900});await grip.focus();await grip.press('End');g=await geometry('#carouselSidebar');assert.equal(g.width,450);assert(Math.abs(g.header-g.workspace)<1);const fits=await page.locator('header').evaluate(h=>{const r=h.getBoundingClientRect(),a=h.querySelector('.header-actions').getBoundingClientRect(),b=h.querySelector('.brand').getBoundingClientRect();return{right:a.right<=r.right,left:b.right<=a.left};});assert(fits.right&&fits.left,JSON.stringify({width,fits}));}
 await page.setViewportSize({width:1500,height:1000});await grip.focus();await grip.press('Home');

 await page.reload();assert.equal(await grip.getAttribute('aria-valuenow'),'300');
 await require('./browser.cjs').openLatestProject(page);await page.setViewportSize({width:390,height:750});await page.waitForFunction(()=>document.querySelector('#toolsToggle').getAttribute('aria-expanded')==='false');await page.locator('#toolsToggle').click();
 g=await geometry('#carouselSidebar');assert(g.width<=366);assert(g.sidebar>=0);assert(await grip.isVisible());await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await grip.locator('span').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await page.screenshot({path:artifact('sidebar-width-narrow.png')});assert.deepEqual(errors,[]);console.log('PASS shared 300–450 px width, drag/cancel/reset/keyboard, unchanged document/history, matching header/workspace edges in both editors, portable preferences, axe and narrow viewport');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
