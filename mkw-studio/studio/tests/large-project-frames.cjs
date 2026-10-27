const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!process.env.MKW_TEST_SKIP_LARGE) {
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startNew').click();
    await page.locator('#setupName').fill('50 Bilder');
    await page.locator('#createProject').click();
    await page.evaluate(async () => {
      MKWSubject.detect = async () => [];
      const canvas = makeCanvas(640, 800), ctx = canvas.getContext('2d'), pixels = ctx.createImageData(640, 800), files = [];
      let seed = 17;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >> 8) & 255; pixels.data[i + 2] = (seed >> 16) & 255; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgb(${i * 5},40,90)`;
        ctx.fillRect(0, 0, 20, 20);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        files.push(new File([blob], `Bild-${i + 1}.png`, { type: 'image/png' }));
      }
      await importFiles(files);
      await autosave();
      window.showSaveFilePicker = undefined;
    });
    console.log('50 images imported and backed up');
    assert.equal(await page.evaluate(() => p.images.length), 50);
    assert.equal(await page.locator('.image-info-card').count(), 50);
    await page.locator('[data-step="logo"]').click();
    assert.equal(await page.locator('.logo-panel').evaluate(el => getComputedStyle(el).rowGap), '12px');
    await page.screenshot({path: artifact('mkw-logo-spacing.png')});
    const saving = page.waitForEvent('download');
    await page.locator('#save').click();
    await page.locator('#saveProject').click();
    const downloaded = await saving, saved = artifact('50-bilder.mkw');
    await downloaded.saveAs(saved);
    console.log('50-image MKW downloaded');
    assert(require('node:fs').statSync(saved).size > 32 * 1024 * 1024);
    const previousProject = await page.evaluate(() => p.projectId);
    await page.locator('#projectFile').setInputFiles(saved);
    await page.waitForFunction(async previous => !busy && p.images.length === 50 && p.projectId !== previous && (await MKWProjectStore.version(p.projectId)) > 0, previousProject);
    await page.waitForFunction(() => document.querySelector('#projectFile').value === '');
    console.log('50-image MKW reopened and saved as its own browser project');
    assert.equal(await page.evaluate(async () => (await MKWProjectStore.open(p.projectId)).project.images.length), 50);
    require('node:fs').unlinkSync(saved);
    // A full browser quota must not prevent a deliberate portable file download.
    await page.evaluate(() => { clearTimeout(saveTimer); window.realStoreSave = MKWProjectStore.save; MKWProjectStore.save = async () => { throw new DOMException('Speicher voll', 'QuotaExceededError'); }; });
    const fallback = page.waitForEvent('download');
    await page.locator('#save').click();
    await page.locator('#saveProject').click();
    await fallback;
    await page.waitForFunction(() => $('#projectStorageNotice').classList.contains('is-error'));
    assert.match(await page.locator('#projectStorageNotice').textContent(), /MKW-Datei gespeichert/);
    await page.evaluate(() => { MKWProjectStore.save = window.realStoreSave; window.realEncode = MKWProjectFile.encode; MKWProjectFile.encode = async () => { throw Error('Test: Datei kann nicht geschrieben werden'); }; });
    await page.locator('#save').click();
    await page.locator('#saveProject').click();
    await page.waitForFunction(() => $('#projectStorageNotice').textContent.includes('Speichern nicht abgeschlossen'));
    assert.equal(await page.locator('#projectStorageNotice').getAttribute('role'), 'alert');
    assert.match(await page.locator('#projectStorageNotice').evaluate(el => getComputedStyle(el).animationName), /save-notice-attention/);
    await page.screenshot({ path: artifact('mkw-save-warning.png') });
    await page.evaluate(() => { MKWProjectFile.encode = window.realEncode; });
    }
    await page.close();

    const carousel = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    carousel.on('pageerror', error => errors.push(error.message));
    await carousel.goto(process.env.STUDIO_URL);
    await carousel.locator('#startNew').click();
    await carousel.locator('[data-project-mode=carousel]').click();
    await carousel.locator('#setupName').fill('Rahmenprüfung');
    await carousel.locator('#createProject').click();
    await carousel.locator('#carouselCanvas').waitFor();
    const point = (x, y) => carousel.evaluate(([x, y]) => { const r = $('#carouselCanvas').getBoundingClientRect(); return { x: r.left + x * carouselZoom, y: r.top + y * carouselZoom }; }, [x, y]);
    const drag = async (a, b) => { await carousel.mouse.move(a.x, a.y); await carousel.mouse.down(); await carousel.mouse.move(b.x, b.y, { steps: 6 }); await carousel.mouse.up(); };
    await carousel.evaluate(() => {
      carouselSetZoom(0.4); carouselUI.snap = false;
      carouselObject('angle', { x: 100, y: 100, w: 400, h: 600 });
      carouselTool('select');
    });
    assert.equal(await carousel.evaluate(() => studioPreferences.advanced), false);
    assert.equal(await carousel.locator('.carousel-rotate-handle').count(), 1);
    const rotation = await carousel.locator('.carousel-rotate-handle').boundingBox();
    await drag({ x: rotation.x + rotation.width / 2, y: rotation.y + rotation.height / 2 }, await point(760, 680));
    assert(Math.abs(await carousel.evaluate(() => carouselSelected()[0].angle)) > 1);
    await carousel.evaluate(() => { p.carousel.objects = []; carouselObject('gradient', { x: 150, y: 300, w: 600, h: 400, opacity: 1, blend: 'source-over' }); carouselTool('select'); });
    const pixel = (x, y) => carousel.evaluate(async ([x, y]) => { const canvas = makeCanvas(1080, 1350); await carouselPaint(canvas.getContext('2d'), 0, 1, true); return [...canvas.getContext('2d').getImageData(x, y, 1, 1).data]; }, [x, y]);
    const original = await pixel(550, 550);
    await carousel.locator('#carouselFrameEdit').click();
    assert.equal(await carousel.locator('.carousel-point-handle').count(), 4);
    await drag(await point(150, 300), await point(260, 350));
    assert.equal((await pixel(180, 315))[3], 0);
    assert.deepEqual(await pixel(550, 550), original);
    assert(await carousel.evaluate(() => !carouselHit({ x: 180, y: 315 })));
    await carousel.locator('[data-frame-slot="3"]').click();
    assert.equal(await carousel.locator('.carousel-point-handle').count(), 5);
    await carousel.evaluate(async () => { validateCarousel(p); await undo(); await redo(); validateCarousel(p); });
    assert.equal(await carousel.locator('.carousel-point-handle').count(), 5);
    assert.deepEqual(await carousel.evaluate(async () => {
      const layer = await carouselPSDLayer(carouselSelected()[0]);
      return [...layer.canvas.getContext('2d').getImageData(550-layer.left,550-layer.top,1,1).data];
    }),original,'Gradient frame appearance matches the PSD layer');
    // Both pen and curve modes keep anchors/handles after real undo/redo shortcuts.
    await carousel.locator('#settings').click();
    await carousel.locator("#settings-tab-workflow").click();await carousel.locator('#advancedMode').check();
    await carousel.locator('#closeSettings').click();
    await carousel.evaluate(() => { p.carousel.objects = []; carouselObject('path', { x: 150, y: 300, w: 600, h: 400, closed: false, points: [{ x: 0, y: 0.5, out: { x: 0.3, y: 0 } }, { x: 1, y: 0.5, in: { x: 0.7, y: 1 } }] }); });
    for (const tool of ['path', 'curve']) {
      await carousel.evaluate(tool => { carouselTool(tool); checkpoint(); carouselSelected()[0].points[0].out.y += 0.1; changed(false); }, tool);
      const before = await carousel.evaluate(() => ({ y: carouselSelected()[0].points[0].out.y, revision }));
      await carousel.keyboard.press('ControlOrMeta+z');
      await carousel.waitForFunction(before => revision > before.revision && carouselUI.vectorPoints && document.querySelectorAll('[data-vector-point]').length === 2 && Math.abs(carouselSelected()[0].points[0].out.y - (before.y - 0.1)) < 0.0001, before);
      assert.equal(await carousel.evaluate(() => carouselUI.tool), tool);
      assert(await carousel.locator('.vector-control').count() > 0);
      const undoneRevision = await carousel.evaluate(() => revision);
      await carousel.keyboard.press('ControlOrMeta+Shift+z');
      await carousel.waitForFunction(({ y, previous }) => revision > previous && carouselUI.vectorPoints && document.querySelectorAll('[data-vector-point]').length === 2 && Math.abs(carouselSelected()[0].points[0].out.y - y) < 0.0001, { y: before.y, previous: undoneRevision });
    }
    await carousel.screenshot({ path: artifact('mkw-path-undo-handles.png') });
    await carousel.evaluate(() => { p.carousel.objects = []; carouselTool('shape'); });
    await drag(await point(150,300), await point(400,550));
    assert.equal(await carousel.evaluate(() => carouselUI.tool), 'shape');
    const firstShape = await carousel.evaluate(() => carouselSelected()[0].id);
    await carousel.locator('[data-prop="w"]').fill('300');
    assert.equal(await carousel.evaluate(() => Math.round(carouselSelected()[0].w)),300);
    assert.equal(await carousel.evaluate(() => carouselSelection),firstShape);
    await drag(await point(500,650),await point(800,850));
    assert.equal(await carousel.evaluate(() => carouselUI.tool),'shape');
    assert.notEqual(await carousel.evaluate(() => carouselSelection),firstShape);
    assert.equal(await carousel.evaluate(() => p.carousel.objects.length),2);
    await carousel.evaluate(() => {
      p.carousel.objects = [];
      carouselTool('select');
      window.outsideId = carouselObject('gradient', { x: -5000, y: 300, w: 300, h: 300, color: '#ef293d', gradientFillMode: 'solid', opacity: 1, blend: 'source-over' }).id;
      window.partialId = carouselObject('gradient', { x: -50, y: 300, w: 150, h: 300, color: '#19cc59', gradientFillMode: 'solid', opacity: 1, blend: 'source-over' }).id;
      carouselSelect([]);
      $('#carouselViewport').scrollLeft = 0;
      carouselScheduleOutside();
    });
    await carousel.waitForFunction(() => !carouselOutsideRunning && !carouselOutsidePending && !carouselOutsideFrame);
    assert.deepEqual(await carousel.evaluate(() => carouselOutsideObjects().map(o => o.id)), [await carousel.evaluate(() => window.outsideId)]);
    const outsidePixel = await carousel.evaluate(() => {
      const canvas = $('#carouselOutsideCanvas'), r = canvas.getBoundingClientRect(), a = $('#carouselCanvas').getBoundingClientRect(), ratio = canvas.width / canvas.clientWidth;
      return [...canvas.getContext('2d').getImageData(Math.round((a.left - r.left - 4850 * carouselZoom) * ratio), Math.round((a.top - r.top + 450 * carouselZoom) * ratio), 1, 1).data];
    });
    assert.deepEqual(outsidePixel, [239,41,61,255]);
    const off = await point(-4850,450);
    await carousel.mouse.click(off.x,off.y);
    assert.equal(await carousel.evaluate(() => carouselSelection), await carousel.evaluate(() => window.outsideId));
    await carousel.evaluate(() => { p.carousel.objects = p.carousel.objects.filter(o => o.id === window.outsideId); carouselRefresh(); });
    assert.equal((await pixel(100,450))[3],0, 'Off-artwork objects never appear in slide exports');
    await carousel.screenshot({ path: artifact('mkw-pasteboard-objects.png') });

    assert.deepEqual(errors, []);
    console.log('PASS ' + (process.env.MKW_TEST_SKIP_LARGE ? '' : '50 real image imports, browser backup, compressed MKW save/reopen, quota download fallback, accessible animated errors, logo spacing, ') + 'simple angle rotation, gradient polygon render/hit/undo/PSD, path handles after undo/redo, repeated shape creation and off-artwork preview/export isolation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
