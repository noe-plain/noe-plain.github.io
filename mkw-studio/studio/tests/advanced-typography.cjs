const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1650, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startNew').click();
    await page.locator('[data-project-mode=carousel]').click();
    await page.locator('#setupName').fill('Typografie');
    await page.locator('#cn').fill('2');
    await page.locator('#createProject').click();
    await page.waitForFunction(() => !busy && !!p.carousel && !!fontStatus['Replica LL']);
    await page.evaluate(() => {
      studioPreferences.advanced = true; studioApplyPreferences();
      p.carousel.objects = [];
      carouselObject('text', { text: 'Musik erleben\nZweite Zeile', font: 'Replica LL', size: 70, color: '#172238', x: 120, y: 240, w: 820, h: 700 });
      carouselPanel();
    });
    const state = () => page.evaluate(() => clone(carouselSelected()[0]));
    // Choose a range in the visible text field, then operate real sidebar inputs.
    const choose = async (start, end) => {
      const field = page.locator('[data-prop=text]');
      await field.focus();
      await field.evaluate((el, [a,b]) => { el.setSelectionRange(a,b); el.dispatchEvent(new Event('select')); }, [start,end]);
    };
    await choose(0, 5);
    await page.locator('[data-typo=size]').fill('92');
    await page.locator('[data-typo=tracking]').fill('35');
    await page.locator('[data-typo-toggle=underline]').click();
    assert.equal((await state()).characterStyles[0].size, 92);
    assert.equal((await state()).characterStyles[0].tracking, 35);
    assert.equal((await state()).characterStyles[0].underline, true);
    assert.equal((await state()).text, 'Musik erleben\nZweite Zeile');
    assert.match(await page.locator('[data-typo-scope]').innerText(), /5 Zeichen/);
    await page.locator('[data-typo=font]').selectOption('Harriet Italic');
    await page.locator('[data-typo-toggle=superscript]').click();
    assert.equal((await state()).characterStyles[0].font, 'Harriet Italic');
    assert.equal((await state()).characterStyles[0].script, 'superscript');
    const layout = await page.evaluate(() => carouselTextLayout(carouselSelected()[0]));
    assert.equal(layout.lines[0].runs[0].font, 'Harriet Italic');
    assert(layout.lines[0].runs[0].size < 92);
    await choose(14, 25);
    await page.locator('[data-typo-tab=paragraph]').click();
    await page.locator('[data-typo=lineHeight]').fill('120');
    await page.locator('[data-typo=spaceBefore]').fill('24');
    await page.locator('[data-typo-align=right]').click();
    assert.equal((await state()).textStyles[1].lineHeight, 1.2);
    assert.equal((await state()).textStyles[1].align, 'right');
    assert.equal((await state()).textStyles[0] ?? null, null);
    await page.locator('[data-typo-tab=character]').click();
    await page.locator('[data-typo-all]').click();
    await page.locator('[data-typo-toggle=uppercase]').click();
    assert.equal((await state()).uppercase, true);
    assert.equal((await state()).text, 'Musik erleben\nZweite Zeile');
    await page.locator('[data-typo-toggle=uppercase]').click();
    await page.locator('#carouselTextEdit').click();
    await page.evaluate(() => { const o = carouselSelected()[0]; MKWTypography.restoreSelection(carouselUI.editing.el, {start: 6,end: 13}); carouselTrackTextCaret(o, carouselUI.editing.el); });
    await page.locator('[data-typo=size]').fill('58');
    assert.equal((await state()).characterStyles.find(s => s.start === 6)?.size, 58);
    // Reopen inline after leaving for sidebar, caret formatting applies to new characters only.
    await page.locator('#carouselTextEdit').click();
    await page.evaluate(() => { carouselEditableCaret(carouselUI.editing.el, carouselSelected()[0].text.length); carouselTrackTextCaret(carouselSelected()[0], carouselUI.editing.el); });
    await page.locator('[data-typo-toggle=subscript]').click();
    // Direct edit ends on sidebar focus. Resume at the same stored caret.
    await page.locator('#carouselTextEdit').click();
    await page.keyboard.type('2');
    const typed = await state();
    assert(typed.text.endsWith('2'));
    assert.equal(typed.characterStyles.at(-1).script, 'subscript');
    await page.keyboard.press('Escape');
    const exact = await page.evaluate(async () => {
      const b = p.boards[0], encoded = await encodedBoard(clone(b), { format: 'png', quality: 90, png8: false, colours: 256, transparent: false });
      const im = await image(await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(encoded.blob); }));
      const expected = makeCanvas(b.w,b.h), actual = makeCanvas(b.w,b.h);
      await carouselPaint(exportContext(expected),0); actual.getContext('2d').drawImage(im,0,0);
      const a = expected.getContext('2d').getImageData(0,0,b.w,b.h).data, c = actual.getContext('2d').getImageData(0,0,b.w,b.h).data;
      const saved = MKWProjectAssets.compact(snapshot()); validate(MKWProjectAssets.hydrate(saved)); validateCarousel(saved);
      const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer());
      const pixels = psd.canvas.getContext('2d').getImageData(0,0,b.w,b.h).data;
      const pdf = carouselPDFText(b, carouselPDFPreset('original'));
      return { png: a.every((v,i) => v === c[i]), psd: a.every((v,i) => v === pixels[i]), fonts: pdf.map(r => r.font), chars: saved.carousel.objects[0].characterStyles };
    });
    assert(exact.png); assert(exact.psd); assert(exact.fonts.includes('Harriet Italic')); assert(exact.chars.length);
    await page.screenshot({ path: artifact('mkw-advanced-typography-carousel.png') });
    const before = await state();
    await page.evaluate(() => autosave()); await page.reload(); await page.locator('#startContinue').click(); await page.waitForFunction(() => !busy && !!p.carousel);
    await page.evaluate(id => carouselSelect([id]), before.id);
    assert.deepEqual((await state()).characterStyles, before.characterStyles);
    // Single posts use the same inspector and preserve template inheritance.
    const post = await browser.newPage({ viewport: {width:1650,height:1100} });
    post.on('pageerror', e => errors.push(e.message));
    await post.goto(process.env.STUDIO_URL);
    await post.locator('#startNew').click(); await post.locator('[data-project-mode=post]').click(); await post.locator('#setupName').fill('Einzelpost Typografie'); await post.locator('#createProject').click();
    await post.waitForFunction(() => !busy && !p.carousel && !!fontStatus['Replica LL']);
    await post.evaluate(() => {
      p.images = []; p.boards = []; p.meta.headline = 'Klang erleben'; p.meta.uppercase = false;
      const c = makeCanvas(1200,1200), ctx = c.getContext('2d'); ctx.fillStyle='#506d7b';ctx.fillRect(0,0,1200,1200);
      for(let n=0;n<2;n++){const im={id:uid(),name:`Bild ${n}.png`,width:1200,height:1200,data:c.toDataURL()};p.images.push(im);p.boards.push(createBoard(im,1080,1350));}
      selected=p.boards[0].id; studioPreferences.advanced=true; render(); chooseStep('text'); layer='title';renderPanel();
    });
    assert(await post.evaluate(()=>{const b=board(),before=textBlock(b).mainRecords.find(r=>r.key==='title');b.elements.title.typographyVersion=1;const after=textBlock(b).mainRecords.find(r=>r.key==='title');return Math.abs(before.y-after.y)<.01 && Math.abs(before.h-after.h)<.01}), 'Entering advanced editing must not move an unformatted single-post title');
    const field = post.locator('[data-post-text]'); await field.focus();
    await field.evaluate(el=>{el.setSelectionRange(0,5);el.dispatchEvent(new Event('select'));});
    await post.locator('[data-typo=size]').fill('85');
    await post.locator('[data-typo-toggle=uppercase]').click();
    const single = await post.evaluate(()=>p.boards.map(b=>clone(b.elements.title)));
    assert.equal(single[0].characterStyles[0].size,85); assert.equal(single[0].characterStyles[0].uppercase,true);
    assert.deepEqual(single[1].characterStyles,single[0].characterStyles);
    assert.equal(single[0].text,'Klang erleben');
    await post.locator('[data-post-text-edit]').click();
    const editor = post.locator('.text-editor[data-key=title].editing'); await editor.waitFor();
    await post.evaluate(()=> { const e=board().elements.title; carouselEditableCaret(editingText.el,e.text.length); MKWTypography.track(e,e.text.length,e.text.length); });
    await post.keyboard.type('!');
    assert.equal(await post.evaluate(()=>board().elements.title.text),'Klang erleben!');
    await post.keyboard.press('Meta+z');
    assert.equal(await post.evaluate(()=>board().elements.title.text),'Klang erleben');
    await post.keyboard.press('Escape');
    const postRoundtrip = await post.evaluate(async()=>{
      const data=MKWProjectAssets.compact(snapshot());validate(MKWProjectAssets.hydrate(data));
      const expected=makeCanvas(board().w,board().h);await paint(exportContext(expected),board());
      const psd=agPsd.readPsd(await(await buildPSD()).arrayBuffer());
      const e=textBlock(board()).mainRecords.find(e=>e.key==='title');
      return {styled:!!e.styled, chars:data.boards[0].elements.title.characterStyles, safe:e.h<=textBlock(board()).safe.h, raster: (()=>{const flat=ls=>ls.flatMap(l=>[l,...flat(l.children||[])]);return flat(psd.children).some(l=>l.children?.some(c=>c.name==='Darstellung · gerastert'&&c.canvas)&&l.children.some(c=>c.hidden&&c.text?.text===board().elements.title.text))})(), exact: (()=>{ const position=psdArrangement().boards[0], a=expected.getContext('2d').getImageData(0,0,board().w,board().h).data, b=psd.canvas.getContext('2d').getImageData(position.left,position.top,board().w,board().h).data; let count=0,max=0; for(let i=0;i<a.length;i++)if(a[i]!==b[i]){count++;max=Math.max(max,Math.abs(a[i]-b[i]));} return {count,max,first:Array.from(a).findIndex((v,i)=>v!==b[i])}; })()};
    });
    assert(postRoundtrip.styled);assert(postRoundtrip.safe);assert(postRoundtrip.chars.length);assert(postRoundtrip.raster);assert.equal(postRoundtrip.exact.count,0,JSON.stringify(postRoundtrip.exact));
    await post.screenshot({path:artifact('mkw-advanced-typography-post.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS shared advanced range/paragraph formatting, original text, typing inheritance, undo, font assets, MKW round trip, PNG/PSD/PDF and single-post template propagation');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
