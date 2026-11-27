const assert = require('node:assert/strict'), fs = require('node:fs');
const {launch,waitForProjectReady,artifact}=require('./browser.cjs');
(async()=>{
  const browser=await launch();
  try {
    const page=await browser.newPage({viewport:{width:1500,height:1100}});
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startNew').click();
    await page.locator('#setupName').fill('Eigene Familienlayout-Prüfung');
    await page.locator('#createProject').click();
    await waitForProjectReady(page);
    const results=await page.evaluate(async()=>{
      const data=makeCanvas(128,128).toDataURL(),im={id:uid(),name:'Eigenes Bild.png',data,original:data,width:128,height:128},results=[];
      p.images=[im];
      for(let offset=0;offset<8;offset++){
        const b=basicBoard(im,600,750);
        for(const e of Object.values(b.elements))e.visible=false;
        b.elements.title.visible=true;b.elements.title.text='Bunte Musik';b.elements.title.size=64;
        b.elements.copyright.visible=true;b.elements.copyright.text='Name';b.elements.copyright.color='#cc0000';
        b.family={...MKWFamily.defaults(),enabled:true,offset};p.boards=[b];
        const before=makeCanvas(600,750);await paint(exportContext(before),b,1);
        const expected=exportContext(before).getImageData(0,0,600,750).data;
        const q={...snapshot(),boards:[],carousel:undefined,campaign:MKWCampaignUI.newState()};
        await MKWCampaignDocument.append(q,im,[clone(b)]);
        MKWCampaignMigration.add(q,b,q.carousel.artboards[0]);MKWCampaignModel.reconcile(q,uid);
        const after=makeCanvas(600,750);await carouselPaint(exportContext(after),0,1,false,null,null,()=>true,image,q);
        const actual=exportContext(after).getImageData(0,0,600,750).data;
        let max=0,sum=0;
        for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);max=Math.max(max,d);sum+=d;}
        const text=q.carousel.objects.find(o=>o.campaignRole==='titles'),effective=MKWCampaignUI.decorate(text,q);
        if(effective.familyOffset!==offset||!effective.familyStrokeOnTop)throw Error('Missing effective legacy paint settings');
        if('familyOffset' in text||'familyStrokeOnTop' in text)throw Error('View-only settings leaked into stored model');
        results.push({offset,max,mean:sum/actual.length});
        if(offset===7){window.familyExpected=Array.from(expected);await MKWProjects.startDocument(q);}
        before.width=before.height=after.width=after.height=1;
      }
      return results;
    });
    for(const r of results)assert(r.max<=1&&r.mean<0.001,JSON.stringify(r));
    const files=await page.evaluate(async()=>{
      const copy=MKWProjectAssets.hydrate(await MKWProjectFile.decode(await MKWProjectFile.encode(snapshot())));
      validate(copy);validateCarousel(copy);await MKWProjects.startDocument(copy);
      const entry=await encodedBoard(clone(p.boards[0]),{format:'png',png8:false,quality:95,transparent:false});
      const bitmap=await createImageBitmap(entry.blob),canvas=makeCanvas(600,750),ctx=exportContext(canvas);
      ctx.drawImage(bitmap,0,0);bitmap.close();const pixels=ctx.getImageData(0,0,600,750).data;
      const pngExact=pixels.every((v,i)=>v===familyExpected[i]);
      const psd=agPsd.readPsd(await(await buildPSD()).arrayBuffer()),frame=p.carousel.artboards[0];
      const psdPixels=psd.canvas.getContext('2d').getImageData(frame.x,frame.y,600,750).data;
      let psdMax=0;for(let i=0;i<pixels.length;i++)psdMax=Math.max(psdMax,Math.abs(pixels[i]-psdPixels[i]));
      const pdf=await encodedBoard(clone(p.boards[0]),{format:'pdf',pdf:carouselPDFPreset('original')});
      const rgb=pdf.pdfImage.filter==='FlateDecode'?new Uint8Array(await new Response(new Blob([pdf.pdfImage.data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()):pdf.pdfImage.data;
      let pdfMax=0;for(let i=0,j=0;i<pixels.length;i+=4)for(let k=0;k<3;k++)pdfMax=Math.max(pdfMax,Math.abs(pixels[i+k]-rgb[j++]));
      const flat=nodes=>nodes.flatMap(n=>[n,...flat(n.children||[])]),layers=flat(psd.children);
      const source=p.carousel.objects.find(o=>o.campaignRole==='titles');
      const a=MKWCampaignUI.decorate(source),before=a.familyOffset;
      p.boards[0].family.offset=2;
      const cacheUpdated=MKWCampaignUI.decorate(source).familyOffset===2;
      p.boards[0].family.offset=before;
      return {pngExact,psdMax,pdfMax,offset:copy.boards[0].family.offset,cacheUpdated,titleReference:layers.some(l=>l.hidden&&l.text&&l.name==='Bearbeiten · Konzerttexte'),editableText:layers.filter(l=>l.text).length,references:layers.filter(l=>l.hidden&&l.text).length};
    });
    assert(files.pngExact&&files.psdMax<=1&&files.pdfMax===0&&files.cacheUpdated,JSON.stringify(files));
    assert.equal(files.offset,7);assert(files.titleReference&&files.editableText>=1&&files.references>=1,JSON.stringify(files));
    const mixed = await page.evaluate(async () => {
      const image = p.images[0];
      const legacy = fresh();
      legacy.images = [image];
      legacy.meta.title = "Familiengestaltung nur im ersten Format";
      legacy.boards = [
        [600, 750],
        [600, 600],
      ].map(([w, h], index) => {
        const b = basicBoard(image, w, h);
        for (const element of Object.values(b.elements))
          element.visible = false;
        Object.assign(b.elements.title, {
          visible: true,
          text: "Bunte Musik",
          size: 64,
        });
        Object.assign(b.elements.copyright, {
          visible: true,
          text: "Foto Studio",
          color: "#cc0000",
        });
        Object.assign(b.elements.logo, { visible: true, size: 180 });
        if (index === 0)
          b.family = {
            ...MKWFamily.defaults(),
            enabled: true,
            offset: 5,
            background: "#dbebdd",
          };
        return b;
      });
      window.familyPixelReport = async (b) => {
        const entry = await encodedBoard(b, {
          format: "png",
          png8: false,
          transparent: false,
          quality: 95,
        });
        const bitmap = await createImageBitmap(entry.blob);
        const canvas = makeCanvas(b.w, b.h);
        const ctx = exportContext(canvas);
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = ctx.getImageData(0, 0, b.w, b.h).data;
        canvas.width = canvas.height = 1;
        return [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels)),
        ].join(",");
      };
      await MKWProjects.startDocument(legacy);
      const sourceId = p.projectId;
      const before = await Promise.all(p.boards.map(window.familyPixelReport));
      await MKWCampaignUI.convert({ confirmed: true });
      if (!p.campaign) throw Error($("#status").textContent);
      const after = await Promise.all(p.boards.map(window.familyPixelReport));
      const zip = await MKWProjectFile.encodeZip(snapshot());
      const reopened = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(zip),
      );
      validate(reopened);
      validateCarousel(reopened);
      await MKWProjects.startDocument(reopened);
      const revived = await Promise.all(p.boards.map(window.familyPixelReport));
      window.familyStates = () =>
        p.boards.map((b) => [
          !!b.family?.enabled,
          b.family?.offset ?? 0,
          b.family?.background ?? null,
        ]);
      return {
        exact: [before[0] === after[0], before[1] === after[1]],
        reopenExact: [before[0] === revived[0], before[1] === revived[1]],
        sourceSeparate:
          sourceId !== p.projectId &&
          !(await MKWProjectStore.open(sourceId)).project.campaign,
        states: window.familyStates(),
        familyOffsets: p.boards.map((b) => {
          const title = p.carousel.objects.find(
            (o) => o.pageId === b.campaignPage && o.campaignRole === "titles",
          );
          return MKWCampaignUI.decorate(title).familyOffset ?? null;
        }),
      };
    });
    assert.deepEqual(mixed.exact, [true, true]);
    assert.deepEqual(mixed.reopenExact, [true, true]);
    assert(mixed.sourceSeparate);
    assert.deepEqual(mixed.states, [
      [true, 5, "#dbebdd"],
      [false, 0, null],
    ]);
    assert.deepEqual(mixed.familyOffsets, [5, null]);
    const options = page.locator(".campaign-card details");
    await options.locator("summary").click();
    const familyToggle = options.locator("[data-campaign-family]");
    assert(await familyToggle.evaluate((input) => input.indeterminate));
    await options.locator("[data-campaign-background]").fill("#d9eee6");
    assert.deepEqual(await page.evaluate(() => window.familyStates()), [
      [true, 5, "#d9eee6"],
      [false, 0, null],
    ]);
    await page.evaluate(() => undo());
    assert(await familyToggle.evaluate((input) => input.indeterminate));
    await options.locator("[data-campaign-angle]").check();
    assert(await familyToggle.evaluate((input) => input.indeterminate));
    assert.deepEqual(
      await page.evaluate(() => window.familyStates()),
      mixed.states,
    );
    const beforeToggle = await page.evaluate(() =>
      p.carousel.objects.filter((o) => o.type === "angle").map((o) => o.id),
    );
    assert.equal(beforeToggle.length, 2);
    await familyToggle.focus();
    await familyToggle.press("Space");
    assert(await familyToggle.isChecked());
    assert.deepEqual(await page.evaluate(() => window.familyStates()), [
      [true, 5, "#dbebdd"],
      [true, 0, "#dbebdd"],
    ]);
    assert.deepEqual(
      await page.evaluate(() =>
        p.carousel.objects.filter((o) => o.type === "angle").map((o) => o.id),
      ),
      beforeToggle,
    );
    await page.evaluate(() => undo());
    assert(await familyToggle.evaluate((input) => input.indeterminate));
    assert.deepEqual(
      await page.evaluate(() => window.familyStates()),
      mixed.states,
    );
    await page.screenshot({ path: artifact("campaign-mixed-family-light.png") });
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.evaluate(() => studioSetTheme("dark"));
    await familyToggle.scrollIntoViewIfNeeded();
    assert(await familyToggle.evaluate((input) => input.indeterminate));
    assert(await options.evaluate((menu) => menu.scrollWidth <= menu.clientWidth + 1));
    await page.screenshot({ path: artifact("campaign-mixed-family-dark.png") });
    console.log(
      "PASS mixed family options stay per output across real conversion, PNG, MKW, angle controls and keyboard Undo",
    );
    fs.writeFileSync(artifact('campaign-family-migration.json'),JSON.stringify({results,files,mixed},null,2)+'\n');
    console.log('PASS eight legacy family colour offsets, outline order, copyright kerning, unchanged raw model, cache invalidation, MKW and actual PNG/PDF/PSD with raster references and editable text');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
