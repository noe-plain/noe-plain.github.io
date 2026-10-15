const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:8912/');
    await page.locator('#startNew').click();
    await page.locator('#setupName').fill('Flüssig arbeiten');
    await page.locator('#createProject').click();
    await page.evaluate(() => {
      for (let i = 0; i < 12; i++) {
        const c = makeCanvas(800, 1000), ctx = c.getContext('2d');
        ctx.fillStyle = `rgb(${20 + i * 10},60,100)`; ctx.fillRect(0, 0, 800, 1000);
        const data = c.toDataURL(), im = { id: uid(), name: `Foto ${i}.png`, width: 800, height: 1000, data, original: data };
        c.width = c.height = 1; p.images.push(im);
        p.boards.push(...p.formats.map(f => createBoard(im, f.w, f.h)));
      }
      selected = p.boards[0].id; changed();
    });
    await page.waitForFunction(() => !drawing && !drawAgain);
    const paints = await page.evaluate(async () => {
      const native = paint; let count = 0;
      paint = async (...args) => { count++; return native(...args); };
      try {
        for (let i = 0; i < 5; i++) { p.boards[0].image.x++; revision++; await draw(); }
        const changedPaints = count;
        await draw();
        return { changedPaints, unchangedPaints: count - changedPaints, total: p.boards.length };
      } finally { paint = native; }
    });
    assert(paints.changedPaints > 0 && paints.changedPaints < paints.total * 5 / 2, 'Paint only boards near the viewport');
    assert.equal(paints.unchangedPaints, 0, 'Do not repaint unchanged boards on scroll/refresh');
    const last = page.locator('canvas[data-board]').last();
    await last.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const c = document.querySelector('canvas[data-board="' + p.boards.at(-1).id + '"]'); return postPaintStates.has(c); });
    const pixel = await last.evaluate(c => Array.from(c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height * .8), 1, 1).data));
    assert.deepEqual(pixel, [130, 60, 100, 255], 'Scrolling must paint newly visible photos');
    await page.screenshot({ path: artifact('mkw-performance-scrolled.png') });
    const hashes = await page.evaluate(async () => {
      clearTimeout(saveTimer); await autosave({ writeFile: false });
      const canvas = makeCanvas(3200, 2400), ctx = canvas.getContext('2d'), pixels = ctx.createImageData(canvas.width, canvas.height);
      let seed = 12345;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >>> 8) & 255; pixels.data[i + 2] = (seed >>> 16) & 255; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      const data = canvas.toDataURL(), im = { id: uid(), name: 'Grosses Testfoto.png', width: 3200, height: 2400, data, original: data };
      canvas.width = canvas.height = 1;
      p.images = [im]; p.boards = [basicBoard(im)]; revision++;
      await autosave({ writeFile: false });
      const native = SubtleCrypto.prototype.digest; let bytes = 0;
      SubtleCrypto.prototype.digest = function (algorithm, buffer) { bytes += buffer.byteLength; return native.call(this, algorithm, buffer); };
      try {
        p.meta.title += ' bearbeitet'; revision++; await autosave({ writeFile: false });
        const unchangedBytes = bytes;
        // A changed asset on the same record must invalidate the weak hash cache.
        const small = makeCanvas(20, 20); small.getContext('2d').fillRect(0, 0, 20, 20);
        im.data = small.toDataURL(); im.original = im.data; im.width = im.height = 20; revision++;
        await autosave({ writeFile: false });
        const changedBytes = bytes - unchangedBytes;
        im.data = data; im.original = data; im.width = 3200; im.height = 2400; revision++;
        await autosave({ writeFile: false });
        return { unchangedBytes, changedBytes, assetBytes: data.length };
      } finally { SubtleCrypto.prototype.digest = native; }
    });
    assert(hashes.assetBytes * 2 > 32 * 1024 * 1024, 'Exercise an asset larger than the strong hash cache');
    assert.equal(hashes.unchangedBytes, 0, 'Text-only autosave must reuse all unchanged asset hashes');
    assert(hashes.changedBytes > 0, 'Changed image data must receive a fresh hash');
    await page.addInitScript(() => {
      window.performanceAssetReads = 0;
      const native = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (...args) { if (this.name === 'assets') window.performanceAssetReads++; return native.apply(this, args); };
    });
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#startNew').disabled);
    assert.equal(await page.evaluate(() => window.performanceAssetReads), 0, 'Start screen must not read saved photo/font blobs');
    await page.locator('#startContinue').click();
    await page.waitForFunction(() => !busy && p.images.length === 1);
    assert(await page.evaluate(() => window.performanceAssetReads > 0), 'Continue must load actual assets');
    const preview = await page.evaluate(async () => {
      const im = p.images[0], source = im.data;
      const screen = await previewImage(source), again = await previewImage(source), full = await image(source);
      const maxEdge = Math.max(screen.width, screen.height), fullSize = [full.width, full.height];
      const c = makeCanvas(100, 100), ctx = c.getContext('2d'); ctx.drawImage(screen, 0, 0, 100, 100);
      const hasPixels = ctx.getImageData(50, 50, 1, 1).data[3] === 255;
      p.images = []; p.boards = []; pruneImageCache();
      return { maxEdge, fullSize, reused: screen === again, hasPixels, cacheSize: imagePreviewCache.size, cacheBytes: imagePreviewBytes, unchanged: im.data === source };
    });
    assert.equal(preview.maxEdge, 2048); assert.deepEqual(preview.fullSize, [3200, 2400]);
    assert(preview.reused && preview.hasPixels && preview.unchanged);
    assert.equal(preview.cacheSize, 0); assert.equal(preview.cacheBytes, 0);
    await page.evaluate(() => { p = fresh(); p.carousel = { w: 1080, h: 1350, n: 2, bg: '#fff', objects: [] }; });
    const photoPaints = await page.evaluate(async () => {
      p.carousel.n = 3; p.carousel.top = 100; p.carousel.left = 100;
      for (let i = 0; i < 3; i++) {
        const c = makeCanvas(6000, 4000), ctx = c.getContext('2d');
        ctx.fillStyle = ['#a83740', '#287b58', '#315bcc'][i]; ctx.fillRect(0, 0, 3000, 4000);
        ctx.fillStyle = '#f4b840'; ctx.fillRect(3000, 0, 3000, 4000);
        const data = c.toDataURL(), im = { id: uid(), name: `24 MP ${i}`, width: 6000, height: 4000, data, original: data };
        c.width = c.height = 1; p.images.push(im);
        p.carousel.objects.push(carouselDefault('image', { x: i * 1080, y: 0, w: 1080, h: 1350, imageId: im.id }));
      }
      const c = makeCanvas(1620, 675), ctx = c.getContext('2d'), native = image;
      let loads = 0;
      image = async src => { if (!cache.has(src)) loads++; return native(src); };
      const cycle = async loader => {
        const before = loads, t = performance.now();
        for (let i = 0; i < 3; i++) { ctx.clearRect(0, 0, c.width, c.height); await carouselPaint(ctx, null, .5, false, null, null, () => true, loader); }
        return { loads: loads - before, ms: Math.round(performance.now() - t) };
      };
      try {
        const original = await cycle(image);
        // Warm the display rasters, then repeat precisely the same composition.
        await carouselPaint(ctx, null, .5, false, null, null, () => true, previewImage);
        const preview = await cycle(previewImage);
        // Image pattern transforms must retain original coordinates for fills/strokes.
        const o = carouselDefault('shape', { x: 0, y: 0, w: 600, h: 400, fillMode: 'image', imageId: p.images[0].id, strokeEnabled: false });
        const sample = async loader => {
          const target = makeCanvas(600, 400), context = exportContext(target);
          await carouselPaintVector(context, o, loader);
          return [150, 450].map(x => Array.from(context.getImageData(x, 200, 1, 1).data));
        };
        return { original, preview, patternsMatch: JSON.stringify(await sample(image)) === JSON.stringify(await sample(previewImage)) };
      } finally { image = native; c.width = c.height = 1; }
    });
    assert(photoPaints.original.loads >= 6, 'Exercise original-cache churn with several 24 MP photos');
    assert.equal(photoPaints.preview.loads, 0, 'Warm editor previews must not decode originals again');
    assert(photoPaints.patternsMatch, 'Image fills must preserve crop and scale in screen previews');
    console.log('Large-photo repaint comparison:', JSON.stringify(photoPaints));
    const pointer = await page.evaluate(async () => {
      let moves = 0, x = 0, finishes = 0;
      const initial = new PointerEvent('pointerdown', { pointerId: 41 });
      carouselListen(initial, e => { moves++; x = e.clientX; }, () => finishes++);
      for (let i = 1; i <= 100; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 41, clientX: i }));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, clientX: 100 }));
      await new Promise(r => requestAnimationFrame(r));
      const release = { moves, x, finishes };
      carouselListen(initial, () => moves++, () => finishes++, () => finishes++);
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 41, clientX: 200 }));
      carouselUI.drag.cancel();
      await new Promise(r => requestAnimationFrame(r));
      return { release, afterCancel: { moves, finishes } };
    });
    assert.deepEqual(pointer.release, { moves: 1, x: 100, finishes: 1 });
    assert.deepEqual(pointer.afterCancel, { moves: 1, finishes: 2 });
    assert.deepEqual(errors, []);
    console.log('PASS viewport-only drawing, stable preview reuse, newly visible photos, immutable original resolution, deleted preview cleanup, hash reuse/invalidation, metadata-only start and final/cancelled pointer positions');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
