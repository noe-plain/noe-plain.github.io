const assert = require('node:assert/strict');
const fs = require('node:fs');
const {launch, waitForProjectReady, artifact} = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport: {width: 1500, height: 1100}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startNew').click();
    await page.locator('#setupName').fill('Eigene Konvertierungsprüfung');
    await page.locator('#createProject').click();
    await waitForProjectReady(page);
    const result = await page.evaluate(async () => {
      const data = makeCanvas(128, 128).toDataURL();
      const im = {id: uid(), name: 'Eigenes Bild.png', data, original: data, width:128, height:128};
      p.images = [im];
      p.boards = [basicBoard(im,600,750),basicBoard(im,6000,4000),basicBoard(im,240,239)];
      changed();
      validate(p);
      await MKWProjects.autosave({writeFile:false});
      const state = () => JSON.stringify({p,revision,history,future,selected});
      const before = state(), records = (await MKWProjectStore.list()).length;
      const version = (await MKWProjectStore.open(p.projectId)).version;
      await MKWCampaignUI.convert({confirmed:true});
      const message = $('#status').textContent;
      if (state() !== before) throw Error('Invalid-format attempt changed source/history');
      if ((await MKWProjectStore.list()).length !== records) throw Error('Invalid-format attempt created a project');
      if ((await MKWProjectStore.open(p.projectId)).version !== version) throw Error('Invalid-format attempt saved the source');
      if (document.querySelector('#studioFeedbackDialog')) throw Error('Unsupported formats must not request conversion confirmation');
      const portable = MKWProjectAssets.hydrate(await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())));
      validate(portable);
      const dimensions = portable.boards.map(b => [b.w,b.h]);
      const q = {...snapshot(),boards:[],carousel:undefined,campaign:MKWCampaignUI.newState()};
      const emptyBefore = JSON.stringify(q);
      await MKWCampaignDocument.append(q,im,[]);
      if (JSON.stringify(q) !== emptyBefore) throw Error('Empty image group mutated candidate');
      const safe = basicBoard(im,600,750);
      const supported = MKWCampaignDocument.checkBoards([safe]);
      let maximum = '';
      try { MKWCampaignDocument.checkBoards(Array.from({length:201}, () => safe)); }
      catch(e) { maximum = e.message; }
      p.boards = [safe];
      changed();
      return {message,dimensions,supported,maximum};
    });
    assert.match(result.message,/Ausgabe 2 \(6000 × 4000 px\)/);
    assert.match(result.message,/Ausgabe 3 \(240 × 239 px\)/);
    assert.match(result.message,/nichts umgewandelt oder verkleinert/);
    assert.deepEqual(result.dimensions,[[600,750],[6000,4000],[240,239]]);
    assert.equal(result.supported.length,1);
    assert.match(result.maximum,/200/);
    // A document may change asynchronously while the native decision is open.
    // Resolve the real dialog after the change, without substituting the decision API.
    for (const kind of ['project','revision']) {
      await page.evaluate(() => { window.pendingConversion = MKWCampaignUI.convert(); });
      await page.locator('#studioFeedbackDialog').waitFor();
      const before = await page.evaluate(async kind => {
        if(kind === 'project') {
          const q = snapshot();
          q.projectId = uid(); q.meta.title = 'Anderes Projekt';
          await MKWProjects.startDocument(q);
        } else { p.meta.title = 'Geändert während Rückfrage'; changed(); }
        window.guardExpected = JSON.stringify({p,revision,history,future});
        return {id:p.projectId,count:(await MKWProjectStore.list()).length};
      },kind);
      await page.locator('[data-feedback-confirm]').click();
      const after = await page.evaluate(async () => {
        await pendingConversion;
        return {same:guardExpected === JSON.stringify({p,revision,history,future}),id:p.projectId,count:(await MKWProjectStore.list()).length,converted:!!p.campaign,message:$('#status').textContent};
      });
      assert(after.same,kind+' must not mutate the changed project');
      assert.equal(after.id,before.id); assert.equal(after.count,before.count);
      assert.equal(after.converted,false); assert.match(after.message,/verworfen/);
    }
    // An unused retained image must not create an empty campaign row or broken base format.
    await page.evaluate(() => {
      p.images.unshift({...p.images[0],id:uid(),name:'Ungenutzte erhaltene Quelle.png'});
      changed();
    });
    await page.evaluate(() => MKWCampaignUI.convert({confirmed:true}));
    const success = await page.evaluate(() => {
      validate(p); validateCarousel(p);
      return {campaign:!!p.campaign,rows:p.campaign?.rows.length,slides:p.carousel?.n,status:$('#status').textContent};
    });
    assert(success.campaign,success.status); assert.equal(success.rows,1); assert.equal(success.slides,1);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(artifact('campaign-conversion-guard.json'),JSON.stringify({result,staleProjectGuard:true,staleRevisionGuard:true,unusedImageConversion:success},null,2)+'\n');
    console.log('PASS explicit unsupported-format preflight, unchanged original/history/store, full MKW dimensions, stale project/revision confirmation guards, count limit and unused-image conversion');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exit(1);});
