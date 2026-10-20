const assert = require('node:assert/strict');
const {launch} = require('./browser.cjs');
(async()=>{const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:1650,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.STUDIO_URL);await page.locator('#startNew').click();await page.locator('[data-project-mode=carousel]').click();await page.locator('#setupName').fill('Winkelachsen');await page.locator('#cn').fill('2');await page.locator('#createProject').click();await page.waitForFunction(()=>!!p.carousel&&!busy);
 for(const advanced of [false,true])for(const direction of ['up','down','right']){
 const before=await page.evaluate(({advanced,direction})=>{studioPreferences.advanced=advanced;studioApplyPreferences();p.carousel.objects=[];const o=carouselObject('angle',{x:200,y:200,w:direction==='right'?800:1600,h:direction==='right'?1600:800,direction,panX:35,panY:-20});carouselUI.tool='select';carouselPanel();carouselRefresh();return{id:o.id,x:o.x,y:o.y,panX:o.panX,panY:o.panY,tip:carouselAngleTip(o)}},{advanced,direction});
 const pos=await page.evaluate(()=>{const o=carouselSelected()[0],t=Math.min(o.thickness*Math.SQRT2,o.w*.44,o.h*.44),p=carouselToWorld(o,o.direction==='right'?{x:o.w-t/2,y:o.h/2}:o.direction==='up'?{x:o.w/2,y:t/2}:{x:o.w/2,y:o.h-t/2}),r=$('#carouselCanvas').getBoundingClientRect();return{x:r.left+p.x*carouselZoom,y:r.top+p.y*carouselZoom}});
 await page.mouse.move(pos.x,pos.y);await page.mouse.down();await page.mouse.move(pos.x+22,pos.y+17,{steps:5});await page.mouse.up();
 const after=await page.evaluate(()=>{const o=carouselSelected()[0];return{x:o.x,y:o.y,panX:o.panX,panY:o.panY,tip:carouselAngleTip(o),c:clone(p.carousel)}});
 const axis=direction==='right'?'y':'x',free=axis==='x'?'y':'x';
 assert(Math.abs(after[axis]-before[axis])<.001,`${direction} stays on its fixed axis during dragging`);
 assert(Math.abs(after[free]-before[free])>.1,`${direction} moves on the free axis`);
 assert.equal(after.panX,before.panX);assert.equal(after.panY,before.panY);
 if(direction==='right')assert.equal(after.tip.y,after.c.h/2);else assert(Math.abs((after.tip.x%after.c.w)-after.c.w/2)<.001);
 const rotated=await page.evaluate(()=>{const o=carouselSelected()[0];carouselSetRotation(o,25);carouselAngleAlign(o);return{tip:carouselAngleTip(o),direction:o.direction,c:clone(p.carousel)}});
 if(direction==='right')assert(Math.abs(rotated.tip.y-rotated.c.h/2)<.001);else assert(Math.abs((rotated.tip.x%rotated.c.w)-rotated.c.w/2)<.001);
 }
 assert.deepEqual(errors,[]);console.log('PASS directional angle axis constraint in basic/advanced mode, real frame dragging, unchanged photo crop and rotated angle alignment');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
