const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startNew').click();
    await page.locator('[data-project-mode=carousel]').click();
    await page.locator('#setupName').fill('Bildeffekte');
    await page.locator('#createProject').click();
    await page.waitForFunction(() => !busy && p.carousel);
    const checks = await page.evaluate(async () => {
      const source = makeCanvas(200, 200), ctx = exportContext(source);
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 100, 200);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(100, 0, 100, 200);
      p.images.push({ id: 'photo-test', name: 'Kontrastbild', width: 200, height: 200, data: source.toDataURL() });
      const o = carouselObject('image', { x: 50, y: 50, w: 200, h: 200, imageId: 'photo-test', scale: 1, panX: 0, panY: 0, effects: { blur: 12 } });
      async function render(obj, loader = image, scale = 1) {
        const canvas = makeCanvas(340 * scale, 340 * scale);
        await carouselPaint(exportContext(canvas), null, scale, true, null, [obj], () => true, loader);
        return canvas;
      }
      const canvas = await render(o), d = exportContext(canvas), pixel = (x, y) => Array.from(d.getImageData(x, y, 1, 1).data);
      const result = { id: o.id, center: pixel(150, 150), left: pixel(50, 150), right: pixel(249, 150), outside: pixel(49, 150), above: pixel(150, 49), covered: !carouselWarning(o) };
      // Custom crop geometry is equally crisp; pixels outside a triangular mask stay transparent.
      const triangle = { ...o, framePoints: [{x:0,y:0},{x:1,y:1},{x:0,y:1}] }, tri = exportContext(await render(triangle));
      result.polygonOutside = Array.from(tri.getImageData(220, 80, 1, 1).data);
      result.polygonInside = Array.from(tri.getImageData(80, 220, 1, 1).data);
      const original = JSON.stringify(o);
      result.shiftWarning = carouselWarning({ ...o, panX: 10 });
      result.smallWarning = carouselWarning({ ...o, scale: .8, angle: 45, flipX: -1 });
      result.rotatedCovered = !carouselWarning({ ...o, angle: 45, flipX: -1, flipY: -1 });
      result.hiddenWarning = carouselWarning({ ...o, panX: 10, visible: false });
      result.noMutation = JSON.stringify(o) === original;
      // A genuinely inset polygon must not be compared against an unused rectangular corner.
      result.insetCovered = carouselPhotoCoversFrame({ ...o, scale: .6, framePoints: [{x:.25,y:.25},{x:.75,y:.25},{x:.5,y:.75}] });
      const gap = exportContext(await render({ ...o, panX: 30 }));
      result.gap = Array.from(gap.getImageData(60, 150, 1, 1).data);
      // The screen-resolution cache uses the same crop edge, without retaining full-size rasters.
      const preview = exportContext(await render(o, previewImage, .5));
      result.previewOutside = Array.from(preview.getImageData(24, 75, 1, 1).data);
      result.previewInside = Array.from(preview.getImageData(25, 75, 1, 1).data);
      const angle = { ...o, type: 'angle', thickness: 40, direction: 'right', glow: 12, glowColor: '#ffffff', glowAlpha: .5 };
      const a = exportContext(await render(angle)), b = exportContext(await render({...angle, effects: undefined}));
      const ad = a.getImageData(0,0,340,340).data, bd = b.getImageData(0,0,340,340).data, mask = carouselAngleMask(angle);
      const maskCanvas=makeCanvas(340,340), maskCtx=exportContext(maskCanvas);maskCtx.translate(angle.x,angle.y);maskCtx.fill(mask);const maskPixels=maskCtx.getImageData(0,0,340,340).data;
      result.angleGlow = { count: 0, exact: true };
      for (let y=0;y<340;y++) for (let x=0;x<340;x++) {
        const i=(y*340+x)*4;
        if (maskPixels[i+3]) continue;
        if (bd[i+3]) result.angleGlow.count++;
        for(let k=0;k<4;k++) if(ad[i+k]!==bd[i+k]) result.angleGlow.exact=false;
      }
      result.angleHole = Array.from(exportContext(await render({...angle, glow:0})).getImageData(100, 150, 1, 1).data);
      // Alpha in the source is real transparency, not a coverage warning or a reason to add a matte.
      ctx.clearRect(0, 0, 200, 200); ctx.fillStyle = 'rgba(255,0,0,.5)'; ctx.fillRect(0,0,200,200);
      p.images.push({ id:'alpha-test', width:200, height:200, data:source.toDataURL() });
      const alphaPhoto = {...o, imageId:'alpha-test'}, alpha = exportContext(await render(alphaPhoto));
      result.alpha = Array.from(alpha.getImageData(50,150,1,1).data);
      result.alphaWarning = carouselWarning(alphaPhoto);
      // Non-photo effects still soften their silhouette.
      const vector = carouselDefault('shape', { id:'vector-test', x:50,y:50,w:200,h:200,shapeKind:'rect',fillEnabled:true,fill:'#808080',strokeWidth:0,effects:{blur:12} });
      result.vectorOutside = Array.from(exportContext(await render(vector)).getImageData(45,150,1,1).data);
      let decodes = 0;
      await carouselPaint(exportContext(makeCanvas(p.carousel.w,p.carousel.h)),0,1,true,null,[{...o,x:p.carousel.w+50}],()=>true,async data=>{decodes++;return image(data)});
      result.offSlideDecodes = decodes;
      carouselSelect([o.id]); carouselUI.content = true; carouselPanel(); carouselRefresh();
      return result;
    });
    assert.equal(checks.offSlideDecodes, 0, 'off-slide photo effects must not decode');
    assert(checks.center[0] > 80 && checks.center[0] < 180, 'photo content must blur');
    assert.equal(checks.left[3], 255, 'source edge must remain opaque');
    assert.equal(checks.right[3], 255);
    for (const key of ['outside', 'above', 'polygonOutside', 'gap', 'previewOutside', 'angleHole']) assert.equal(checks[key][3], 0, key);
    assert.equal(checks.polygonInside[3], 255); assert.equal(checks.previewInside[3], 255);
    for (const key of ['covered', 'rotatedCovered', 'noMutation', 'insetCovered']) assert(checks[key], key);
    assert.match(checks.shiftWarning, /füllt den Rahmen nicht vollständig/);
    assert.match(checks.smallWarning, /füllt den Rahmen nicht vollständig/);
    assert.equal(checks.hiddenWarning, ''); assert.equal(checks.alphaWarning, '');
    assert(Math.abs(checks.alpha[3] - 128) <= 1, 'preserve source transparency');
    assert(checks.angleGlow.count > 0, 'angle glow remains visible outside its mask'); assert(checks.angleGlow.exact, 'photo effects must not change angle glow');
    assert(checks.vectorOutside[3] > 0, 'non-photo blur retains soft outer edge');
    // Live warning, list navigation, layer marker and the existing one-click repair.
    await page.evaluate(() => { carouselSelected()[0].panX = 30; changed(false); carouselPanel(); });
    await page.waitForFunction(() => $('#carouselProperties .carousel-warning').textContent.includes('nicht vollständig'));
    assert(await page.locator(`[data-layer="${checks.id}"] .layer-warning-icon`).count());
    await page.locator('#carouselNotice').click();
    await page.locator('.studio-warning-item').filter({ hasText: 'nicht vollständig' }).click();
    await page.screenshot({ path: artifact('mkw-photo-coverage-warning.png') });
    await page.locator('#carouselImageFit').click();
    assert.equal(await page.evaluate(() => carouselWarning(carouselSelected()[0])), '');
    // Both the PNG preview and PSD raster retain the same photo clipping semantics.
    const exported = await page.evaluate(async () => {
      const o = carouselSelected()[0]; p.carousel.objects = [o]; p.carousel.n = 1; p.boards = p.boards.slice(0,1); carouselBoardIndexes();
      const expected = makeCanvas(p.carousel.w,p.carousel.h); await carouselPaint(exportContext(expected),0);
      const png = await encodedBoard(p.boards[0],{format:'png',quality:90,colours:256,transparent:false}), bitmap = await createImageBitmap(png.blob), actual = makeCanvas(p.carousel.w,p.carousel.h);
      exportContext(actual).drawImage(bitmap,0,0);
      const psd = agPsd.readPsd(await (await buildCarouselPSD()).arrayBuffer()), pixels = exportContext(expected).getImageData(0,0,expected.width,expected.height).data;
      const pngPixels = exportContext(actual).getImageData(0,0,actual.width,actual.height).data, psdPixels = psd.canvas.getContext('2d').getImageData(0,0,psd.width,psd.height).data;
      return { png: pixels.every((v,i)=>v===pngPixels[i]), psd: pixels.every((v,i)=>v===psdPixels[i]) };
    });
    assert(exported.png, 'PNG photo effect output matches renderer');
    assert(exported.psd, 'PSD photo effect output matches renderer');
    assert.deepEqual(errors, []);
    console.log('PASS photo blur before rectangular/polygon/angle crops, clamped edges, real alpha, cached preview, live coverage warning and frame-fit repair');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
