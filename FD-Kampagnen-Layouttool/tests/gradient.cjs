const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
 const page=await browser.newPage({viewport:{width:1512,height:982}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8878');await page.waitForFunction(()=>fontStatus['Harriet Regular']&&fontStatus['Replica LL']);
 await page.evaluate(()=>{const fonts=p.fonts;p=fresh();p.fonts=fonts;render()});
 await page.locator('#files').setInputFiles('testbilder/260831_A1_Probe_c-noe-plain-4.jpg');
 await page.waitForFunction(()=>p.boards.length===2&&!busy);
 const checks=await page.evaluate(async()=>{
  const results=[];
  for(const b of p.boards){
   b.elements.title.text='MUSIK VERBINDET';b.elements.title.visible=true;
   b.elements.copyright.text='© Noé Plain';b.elements.copyright.visible=true;
   b.elements.logo.visible=true;b.elements.logo.source='white';
   await prepareLogo(b);const l=textBlock(b),e=l.copyright,s=l.safe;
   const c=makeCanvas(b.w,b.h),ctx=c.getContext('2d');drawText(ctx,l,{only:'copyright'});
   const pixels=ctx.getImageData(0,0,b.w,b.h).data;let minX=b.w,maxX=0,minY=b.h,maxY=0;
   for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)if(pixels[(y*b.w+x)*4+3]>20){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
   // Compare normal gradient against its exported PSD bitmap and opacity.
   ctx.clearRect(0,0,b.w,b.h);ctx.fillStyle='#fff';ctx.fillRect(0,0,b.w,b.h);textGradient(ctx,b,l);
   const expected=ctx.getImageData(0,0,b.w,b.h).data;
   const layer=await layerBitmap(b,'textShadow');ctx.fillStyle='#fff';ctx.fillRect(0,0,b.w,b.h);ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.42;ctx.drawImage(layer.canvas,layer.left,layer.top);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   const actual=ctx.getImageData(0,0,b.w,b.h).data;let maxDifference=0;for(let i=0;i<actual.length;i+=4)maxDifference=Math.max(maxDifference,Math.abs(actual[i]-expected[i]));
   const mid=l.mainRecords[0].y+20;
   results.push({h:b.h,logo:b.elements.logo,safe:s,ink:{minX,maxX,minY,maxY},sizes:[b.elements.title.size,b.elements.date.size,b.elements.subtitle.size],maxDifference,top:expected[0],bottom:expected[((b.h-1)*b.w+200)*4],underText:expected[(Math.floor(mid)*b.w+200)*4]});
  }
  selected=p.boards[0].id;step='text';layer='copyright';render();return results;
 });
 for(const r of checks){assert.equal(r.logo.size,650);assert.equal(r.logo.x,330);assert.equal(r.logo.y,r.safe.y);assert.deepEqual(r.sizes,[104,52,52]);assert(Math.abs((r.ink.minX+r.ink.maxX)/2-1030)<2);assert(Math.abs(r.ink.maxY+1-(r.safe.y+r.safe.h))<2);assert.equal(r.maxDifference,0);assert.equal(r.top,255);assert(r.underText>148&&r.underText<255);assert(r.bottom>=147&&r.bottom<=150)}
 await page.locator('[data-copyright]').first().fill('Testfotograf');assert(await page.evaluate(()=>p.boards.every(b=>b.elements.copyright.text==='© Testfotograf')));
 await page.locator('[data-copyright]').first().fill('© © Testfotograf');assert(await page.evaluate(()=>p.boards.every(b=>b.elements.copyright.text==='© Testfotograf'&&b.elements.copyright.role==='Harriet Regular')));
 const stops=await page.evaluate(()=>{const b=board();b.elements.date.text='15.11.26';b.elements.date.visible=true;const l=textBlock(b),title=l.mainRecords.find(e=>e.key==='title'),first=l.mainRecords[0];measureContext.font=`${title.size}px ${fontFamily(title.role)}`;measureContext.textBaseline='alphabetic';const a=measureContext.measureText('Mg').actualBoundingBoxAscent;measureContext.textBaseline='top';const baseline=title.y+a-measureContext.measureText('Mg').actualBoundingBoxAscent;measureContext.font=`${first.size}px ${fontFamily(first.role)}`;const top=first.y-measureContext.measureText(first.lines[0]).actualBoundingBoxAscent;const c=makeCanvas(b.w,b.h),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,b.w,b.h);textGradient(ctx,b,l);const pixel=y=>ctx.getImageData(200,Math.max(0,Math.floor(y)),1,1).data[0];return {above:pixel(top-51),baseline:pixel(baseline+1),bottom:pixel(b.h-1)}});assert.equal(stops.above,255);assert.equal(stops.baseline,stops.bottom);assert(stops.bottom>=147&&stops.bottom<=150);
 await page.evaluate(()=>autosave());await page.reload();await page.waitForFunction(()=>p.boards.length===2&&fontStatus.Harriet);
 assert.equal(await page.evaluate(()=>p.boards[0].elements.copyright.text),'© Testfotograf');
 const psd=await page.evaluate(async()=>{const blob=await buildPSD();const data=agPsd.readPsd(await blob.arrayBuffer(),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});return data.children.map(g=>g.children.find(l=>l.name==='Text · Titelblock + Copyright').children.map(l=>({name:l.name,blendMode:l.blendMode,opacity:l.opacity,transform:l.text?.transform}))) });
 for(const layers of psd){const g=layers.find(l=>l.name.startsWith('Textkontrast'));assert.equal(g.blendMode,'multiply');assert(Math.abs(g.opacity-.42)<.005);assert.equal(layers.find(l=>l.name==='Copyright').transform[1],-1)}
 await page.screenshot({path:'docs/Textverlauf.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS square/story: fixed logo, larger defaults, rendered copyright ink bounds, gradient/PSD pixel equality, copyright editing and restore, PSD gradient and rotation, no browser errors');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
