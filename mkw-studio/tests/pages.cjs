const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
const root=process.env.STUDIO_ROOT||path.resolve(__dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
const page=await browser.newPage();page.setDefaultTimeout(60000);
// This suite checks the download fallback independently of native OS pickers.
await page.addInitScript(()=>{window.showSaveFilePicker=undefined});
const errors=[],bad=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/api/session'))bad.push(r.url())});page.on('request',r=>{if(r.method()==='POST')posts.push(r.url())});
page.on('dialog',d=>d.accept());
await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:8891/mkw-studio/');
await page.waitForFunction(()=>fontStatus['Harriet Regular']&&fontStatus['Replica LL']);
await page.locator('#startNew').click();
assert.equal(await page.locator('footer span').first().innerText(),'● Lokal in deinem Browser');
await page.locator('#files').setInputFiles(path.join(root,'testbilder/260831_A1_Probe_c-noe-plain-4.jpg'));
await page.waitForFunction(()=>p.boards.length===2&&!busy);
await page.locator('[data-step="logo"]').click();await page.locator('[data-logo="white"]').click();await page.locator('#allLogos').click();
await page.evaluate(async()=>{p.meta.title='Pages-Test';p.textOverrides={};await autosave()});
const before=await page.evaluate(()=>JSON.stringify(p));await page.reload();await page.locator('#startContinue').click();await page.waitForFunction(()=>p.boards.length===2&&fontStatus['Harriet Regular']);const after=await page.evaluate(()=>JSON.stringify(p));
if(before!==after){const a=JSON.parse(before),b=JSON.parse(after);const diffs=[];function compare(a,b,path=''){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'.'+k)}else diffs.push(path+': '+String(a).slice(0,80)+' -> '+String(b).slice(0,80))}compare(a,b);assert.deepEqual(diffs,[])}
await page.locator('#export').click();await page.locator('#date').fill('15.11.26');await page.locator('#code').fill('E2');await page.waitForFunction(()=>document.querySelectorAll('.export-preview img').length===2);
const zip=page.waitForEvent('download');await page.locator('#zip').click();await(await zip).saveAs('/private/tmp/mkw-pages.zip');await page.waitForFunction(()=>!busy);await page.locator('#closeExport').click();
await page.locator('#save').click();const mkw=page.waitForEvent('download');await page.locator('#saveProject').click();await(await mkw).saveAs('/private/tmp/mkw-pages.mkw');
if(!await page.locator('#saveDialog').isVisible())await page.locator('#save').click();
const psd=page.waitForEvent('download',{timeout:120000});await page.locator('#savePSD').click();await(await psd).saveAs('/private/tmp/mkw-pages.psd');await page.waitForFunction(()=>!busy);
const parsed=require(path.join(root,'node_modules/ag-psd')).readPsd(fs.readFileSync('/private/tmp/mkw-pages.psd'),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});assert.equal(parsed.artboards.count,2);assert.equal(parsed.linkedFiles.length,1);
await page.locator('#closeSave').click();await page.locator('#projectFile').setInputFiles('/private/tmp/mkw-pages.mkw');await page.waitForFunction(()=>p.boards.length===2&&!busy);await page.screenshot({path:'/private/tmp/mkw-pages.png'});
assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(posts,[]);
console.log('PASS: subfolder assets, fonts, import, logos, browser autosave/reload, ZIP/JPG, MKW reopen, PSD artboards; no server uploads or browser errors');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
