const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1900,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:8900');await page.locator('#startNew').click();await page.locator('[data-project-mode=carousel]').click();await page.locator('#setupName').fill('Ausrichtung und Transparenz');await page.locator('#cn').fill('2');await page.locator('#createProject').click();await page.locator('#carouselCanvas').waitFor();
  const point=async(x,y)=>page.evaluate(([x,y])=>{const r=document.querySelector('#carouselCanvas').getBoundingClientRect();return{x:r.left+x*carouselZoom,y:r.top+y*carouselZoom}},[x,y]);
  const drag=async(a,b,live)=>{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});if(live)await live();await page.mouse.up()};
  const object=()=>page.evaluate(()=>({...p.carousel.objects.find(o=>o.id===carouselSelection)}));
  const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<.01,`${message}: ${actual} ≠ ${expected}`);
  for(const [i,type] of ['text','image','gradient'].entries()){
   await page.evaluate(([type,i])=>{carouselUI.tool='select';carouselObject(type,{x:210+i*100,y:250+i*230,w:123,h:81})},[type,i]);const before=await object();
   await drag(await point(before.x+50,before.y+30),await point(98+50,before.y+30),async()=>assert(await page.locator('.carousel-snap-line.vertical').count()>0,'Snapping must show a guide'));
   const moved=await object();close(moved.x,100,`${type} frame must snap on move`);assert.equal(await page.locator('.carousel-snap-line').count(),0,'Temporary guides disappear after drag');
   const handle=await page.locator('.carousel-frame [data-corner=e]').boundingBox(),end=await point(248,moved.y+moved.h/2);
   await drag({x:handle.x+4,y:handle.y+4},end);const resized=await object();close(resized.x+resized.w,100+880/6,`${type} frame must snap on resize`);
  }
  // New frame: both the fixed corner and the drawn edge use the same snap guides.
  await page.locator('button[data-tool=gradient]').click();await drag(await point(98,1052),await point(395,1191));const created=await object();close(created.x,100,'New frame start');close(created.x+created.w,100+2*880/6,'New frame edge');
  // Start and end colour transparency are independent from the layer opacity and blend mode.
  await page.locator('[data-transparent=startAlpha]').check();await page.locator('[data-prop=startAlpha]').fill('25');await page.locator('[data-prop=endAlpha]').fill('75');await page.locator('[data-prop=opacity]').fill('60');await page.locator('[data-prop=blend]').selectOption('multiply');
  let gradient=await object();close(gradient.startAlpha,.75,'Start alpha');close(gradient.endAlpha,.25,'End alpha');close(gradient.opacity,.6,'Layer opacity');assert.equal(gradient.blend,'multiply');
  const appearance=await page.locator('[data-prop=blend]').boundingBox(),opacity=await page.locator('[data-prop=opacity]').boundingBox();assert(Math.abs(appearance.y-opacity.y)<12,'Opacity must be next to blend mode');
  const alpha=await page.evaluate(async()=>{const c=makeCanvas(1080,1350),before=p.carousel.objects,o=clone(before.find(o=>o.id===carouselSelection));Object.assign(o,{x:0,y:0,w:1080,h:1350,opacity:.6,blend:'source-over',kind:'linear',rotation:0});delete o.gradientStart;delete o.gradientEnd;p.carousel.objects=[o];try{await carouselPaint(c.getContext('2d'),0,1,true);return [c.getContext('2d').getImageData(0,500,1,1).data[3],c.getContext('2d').getImageData(1079,500,1,1).data[3]]}finally{p.carousel.objects=before}});assert(Math.abs(alpha[0]-115)<=2&&Math.abs(alpha[1]-38)<=2,'Rendered/exported colours must use both stop alphas and layer opacity');
  const restored=await page.evaluate(async()=>{await restore(JSON.parse(JSON.stringify(snapshot())));const o=p.carousel.objects.find(o=>o.id===carouselSelection);return {start:o.startAlpha,end:o.endAlpha,opacity:o.opacity,blend:o.blend}});assert.deepEqual(restored,{start:.75,end:.25,opacity:.6,blend:'multiply'},'Saved settings must survive project restore');
  await page.locator('[data-transparent=startAlpha]').uncheck();gradient=await object();close(gradient.startAlpha,1,'Opaque start');assert(await page.locator('[data-prop=startAlpha]').isDisabled());
  // The protected logo stays in front, even when a new opaque object is sent to front.
  const logoId=await page.evaluate(()=>p.carousel.objects.find(o=>o.type==='logo').id);await page.evaluate(()=>{carouselObject('gradient',{x:0,y:0,w:2160,h:1350,color:'#ff0000',endColor:'#ff0000',startAlpha:1,endAlpha:1});carouselLayerOrder('front')});
  assert.equal(await page.locator('.carousel-layer').first().getAttribute('data-layer'),logoId);assert(await page.locator(`[data-layer="${logoId}"] [data-action=up]`).isDisabled());assert(await page.locator(`[data-layer="${logoId}"] [data-action=down]`).isDisabled());
  const logoPixel=await page.evaluate(async()=>{const logo=p.carousel.objects.find(o=>o.type==='logo'),mask=makeCanvas(Math.ceil(logo.w),Math.ceil(logo.h));mask.getContext('2d').drawImage(await image('mkw-logo-bold-neg.svg'),0,0,logo.w,logo.h);const data=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;let pos=0;while(pos<data.length&&data[pos+3]<250)pos+=4;const x=pos/4%mask.width,y=Math.floor(pos/4/mask.width),c=makeCanvas(1080,1350);await carouselPaint(c.getContext('2d'),0);return Array.from(c.getContext('2d').getImageData(logo.x+x,logo.y+y,1,1).data)});assert(logoPixel[0]>245&&logoPixel[1]>245&&logoPixel[2]>245,'MKW logo must paint above the opaque foreground');
  // Each orientation meets both constraints: actual tip on a slide centre axis, at least 1 px bleed.
  await page.evaluate(()=>carouselObject('angle',{x:230,y:350,w:300,h:600}));assert.equal((await object()).thickness,150);assert.equal(await page.locator('#carouselReplace').getAttribute('class'),'primary carousel-place-image');const button=await page.locator('#carouselReplace').boundingBox(),properties=await page.locator('#carouselProperties').boundingBox();assert(button.y<properties.y+100,'Place/replace must be prominent at the top');
  for(const direction of ['right','up','down']){
   await page.locator('[data-prop=direction]').selectOption(direction);await page.locator('[data-prop=x]').fill('430');await page.locator('[data-prop=y]').fill('325');
   assert(await page.evaluate(()=>{const c=p.carousel,o=c.objects.find(o=>o.id===carouselSelection),tip=carouselAngleTip(o),axis=Math.abs(tip.y-c.h/2)<.01||Array.from({length:c.n},(_,i)=>(i+.5)*c.w).some(x=>Math.abs(tip.x-x)<.01),bleed=o.x<=-1||o.y<=-1||o.x+o.w>=c.w*c.n+1||o.y+o.h>=c.h+1;return axis&&bleed}),`${direction} angle must retain centre alignment and bleed`);
  }
  // A right-facing tip (not its frame centre) is attracted to x=540 while dragging.
  await page.evaluate(()=>{const o=p.carousel.objects.find(o=>o.id===carouselSelection);Object.assign(o,{direction:'right',x:180,y:-1,w:300,h:600});carouselRefresh()});
  await drag(await point(470,299),await point(528,299),async()=>{const tip=await page.evaluate(()=>carouselAngleTip(p.carousel.objects.find(o=>o.id===carouselSelection)));close(tip.x,540,'Actual angle tip snap')});
  const zoomBox=await page.locator('#carouselZoom').boundingBox(),editor=await page.locator('#carouselEditor').boundingBox();assert(zoomBox.y>editor.y+editor.height-40&&zoomBox.x>editor.x+editor.width-100,'Zoom must be bottom right');
  const vp=await page.locator('#carouselViewport').boundingBox(),z=await page.evaluate(()=>carouselZoom);await page.mouse.move(vp.x+vp.width/2,vp.y+vp.height/2);await page.keyboard.down('Alt');await page.mouse.wheel(0,-100);await page.keyboard.up('Alt');await page.waitForTimeout(100);assert((await page.evaluate(()=>carouselZoom))>z*1.2,'Option/Alt scroll must zoom');
  const legacy=await page.evaluate(async()=>{const q=snapshot();const angle=q.carousel.objects.find(o=>o.type==='angle');angle.thickness=75;for(const o of q.carousel.objects)delete o.startAlpha;await restore(q);return p.carousel.objects.find(o=>o.type==='angle').thickness});assert.equal(legacy,75,'Existing angles keep their chosen leg width');
  await page.locator('#carouselFit').click();await page.screenshot({path:'/private/tmp/mkw-alignment-angle.png'});
  await page.evaluate(()=>carouselSelect([p.carousel.objects.find(o=>o.type==='gradient').id]));await page.screenshot({path:'/private/tmp/mkw-alignment-gradient.png'});assert.deepEqual(errors,[]);
  console.log('PASS create/move/resize snapping for image, text and gradients; feedback guides; stop transparency and export alpha; opacity beside blend; topmost logo; 150 px default; angle tip alignment and bleed; prominent image action; bottom-right zoom and Alt scroll; legacy restore');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
