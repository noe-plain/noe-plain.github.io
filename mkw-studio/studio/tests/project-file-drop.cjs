const assert = require('node:assert/strict');
const fs = require('node:fs');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
    const errors = []; let downloads = 0;
    page.on('pageerror', e => errors.push(e.message));
    page.on('download', () => downloads++);
    await page.goto(process.env.STUDIO_URL);
    await page.waitForFunction(() => !document.querySelector('#startOpen').disabled);
    const state = () => page.evaluate(() => JSON.stringify({p,revision,history,future}));
    const transfer = (options) => page.evaluateHandle(async ({format='gzip',title='Eigene Drop-Datei',name='Probe.mkw',invalid=false,multiple=false}) => {
      let blob;
      if(invalid) blob = new Blob(['keine MKW-Datei'], {type:'application/octet-stream'});
      else {
        const q = fresh(), c = makeCanvas(128,128), g = exportContext(c);
        g.fillStyle='#316c8f';g.fillRect(0,0,128,128);
        const data=c.toDataURL(), im={id:uid(),name:'Eigenes Bild.png',width:128,height:128,data,original:data};
        q.meta.title=title;q.images=[im];q.boards=[basicBoard(im,600,750)];
        q.boards[0].elements.title.text=title;q.boards[0].elements.title.visible=true;
        validate(q);
        if(format==='json') blob=new Blob([JSON.stringify(q)],{type:'application/json'});
        else if(format==='blocks') {
          const plan=await MKWProjectBlocks.prepare(await MKWProjectStore.pack(q),new Blob([]));
          const bytes=new Uint8Array(plan.size);
          for(const w of plan.writes) bytes.set(new Uint8Array(await new Blob([w.data]).arrayBuffer()),w.position);
          blob=new Blob([bytes],{type:'application/octet-stream'});
        } else blob=await MKWProjectFile.encode(q);
      }
      const dt=new DataTransfer();dt.items.add(new File([blob],name));
      if(multiple)dt.items.add(new File([blob],'Zweite.mkw'));
      return dt;
    },options);
    await page.locator('#startOpen').click();
    await page.locator('#projectLibraryList[aria-busy=false]').waitFor();
    const field=page.locator('#openProjectFile');
    assert((await field.innerText()).includes('Hier ablegen'));
    await page.evaluate(() => {window.dropPickerCalls=0;window.showOpenFilePicker=async()=>{dropPickerCalls++;throw new DOMException('Abgebrochen','AbortError')};});
    await field.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>dropPickerCalls===1);
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>dropPickerCalls===2);
    const original=await state();
    for(const options of [{name:'Bild.png'},{multiple:true},{invalid:true}]) {
      const dt=await transfer(options);
      await field.dispatchEvent('drop',{dataTransfer:dt});
      await page.waitForFunction(()=>!document.querySelector('#projectOpeningDialog')&&document.querySelector('#projectOpenStatus').getAttribute('role')==='alert');
      assert.equal(await state(),original,'Invalid drops preserve the entire document and history');
      assert(await field.evaluate(e=>document.activeElement===e),'A rejected drop returns focus to the field');
      assert.equal(await page.locator('#projectOpenStatus').getAttribute('role'),'alert');
      await dt.dispose();
    }
    for(const theme of ['light','dark']) {
      await page.evaluate(t=>studioSetTheme(t),theme);
      for(const width of [1500,780]) {
        await page.setViewportSize({width,height:1050});await field.scrollIntoViewIfNeeded();
        const geometry=await field.evaluate(e=>{const b=e.getBoundingClientRect();return{x:b.x,right:b.right,h:b.height,border:getComputedStyle(e).borderTopStyle}});
        assert(geometry.x>=0&&geometry.right<=width&&geometry.h>=44&&geometry.border==='dashed',JSON.stringify(geometry));
      }
      await page.setViewportSize({width:1500,height:1050});
      await page.screenshot({path:artifact('project-drop-'+theme+'.png')});
      await field.screenshot({path:artifact('project-drop-field-'+theme+'.png')});
    }
    await page.locator('#closeProjectLibrary').click();
    const first=await transfer({title:'Gzip über Startkarte',name:'Eigene.MKW'});
    await page.locator('#startOpen').dispatchEvent('dragenter',{dataTransfer:first});
    assert(await page.locator('#startOpen').evaluate(e=>e.classList.contains('is-project-drop-target')));
    await page.keyboard.press('Escape');
    assert(!(await page.locator('#startOpen').evaluate(e=>e.classList.contains('is-project-drop-target'))));
    await page.locator('#startOpen').dispatchEvent('dragenter',{dataTransfer:first});
    await page.locator('#startOpen strong').dispatchEvent('dragenter',{dataTransfer:first});
    await page.locator('#startOpen strong').dispatchEvent('dragleave',{dataTransfer:first});
    assert(await page.locator('#startOpen').evaluate(e=>e.classList.contains('is-project-drop-target')),'Child transitions retain the drop highlight');
    await page.locator('#startOpen').dispatchEvent('drop',{dataTransfer:first});
    await page.waitForFunction(()=>!busy&&p.meta.title==='Gzip über Startkarte'&&!document.querySelector('#startDialog').open&&!document.querySelector('#projectOpeningDialog'));
    assert(!(await page.locator('#startOpen').evaluate(e=>e.classList.contains('is-project-drop-target'))));
    assert.equal(await page.evaluate(()=>!!MKWProjects.fileLink()),false,'A dropped copy never silently obtains overwrite permission');
    const old=await page.evaluate(()=>{checkpoint();p.boards[0].elements.title.text='Noch ungesicherte Änderung';changed();return p.projectId;});
    await page.locator('#open').click();await page.locator('#projectLibraryList[aria-busy=false]').waitFor();
    const beforeBad=await state(),bad=await transfer({invalid:true});
    await field.dispatchEvent('drop',{dataTransfer:bad});
    await page.waitForFunction(()=>!busy&&!document.querySelector('#projectOpeningDialog'));
    assert.equal(await state(),beforeBad,'A damaged file cannot replace unsaved work');
    const block=await transfer({format:'blocks',title:'Binäres MKW geöffnet'});
    await field.dispatchEvent('drop',{dataTransfer:block});
    await page.waitForFunction(()=>!busy&&p.meta.title==='Binäres MKW geöffnet'&&!document.querySelector('#projectOpeningDialog'));
    assert.equal(await page.evaluate(async id=>(await MKWProjectStore.open(id)).project.boards[0].elements.title.text,old),'Noch ungesicherte Änderung','The original is saved before switching documents');
    await page.locator('#open').click();await page.locator('#projectLibraryList[aria-busy=false]').waitFor();
    const plain=await transfer({format:'json',title:'Altes JSON-MKW geöffnet'}),second=await transfer({title:'Darf nicht dazwischen öffnen'});
    await page.evaluate(({a,b})=>{const field=document.querySelector('#openProjectFile');for(const dt of [a,b])field.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));},{a:plain,b:second});
    await page.waitForFunction(()=>!busy&&p.meta.title==='Altes JSON-MKW geöffnet'&&!document.querySelector('#projectOpeningDialog')&&!document.querySelector('#openProjectFile').hasAttribute('aria-busy'));
    assert.equal(await page.evaluate(()=>p.meta.title),'Altes JSON-MKW geöffnet');
    assert.equal(await field.getAttribute('aria-busy'),null);
    assert.equal(await field.isDisabled(),false);
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.is-project-drop-target').length),0);
    assert.equal(downloads,0);assert.deepEqual(errors,[]);
    for(const dt of [first,bad,block,plain,second])await dt.dispose();
    const result={formats:['gzip-JSON','MKWBLK1','legacy JSON'],surfaces:['start card','open dialog'],themes:['light','dark'],widths:[1500,780],keyboard:true,invalidAndMultiplePreserveDocument:true,unsavedSourceSaved:true,duplicateDropIgnored:true,downloadCount:downloads,manualOSDragTest:false};
    fs.writeFileSync(artifact('project-file-drop.json'),JSON.stringify(result,null,2)+'\n');
    console.log('PASS MKW drop field/start card, actual gzip/block/legacy readers, keyboard, themes/tablet, invalid/multiple files, source autosave, no overwrite permission and duplicate-drop guard');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
