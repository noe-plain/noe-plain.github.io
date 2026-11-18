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
    fs.writeFileSync(artifact('campaign-family-migration.json'),JSON.stringify({results,files},null,2)+'\n');
    console.log('PASS eight legacy family colour offsets, outline order, copyright kerning, unchanged raw model, cache invalidation, MKW and actual PNG/PDF/PSD with raster references and editable text');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
