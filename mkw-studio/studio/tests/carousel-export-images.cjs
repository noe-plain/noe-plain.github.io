const assert = require('node:assert/strict');
const { launch, artifact } = require('./browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1650, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:8912/');
    await page.locator('#startNew').click();
    await page.locator('[data-project-mode=carousel]').click();
    await page.locator('#setupName').fill('Grosse Fotos im Export');
    await page.locator('#cn').fill('3');
    await page.locator('#createProject').click();
    await page.waitForFunction(() => !busy && p.carousel);
    await page.evaluate(async () => {
      await carouselWaitForPaint();
      p.carousel.objects = [];
      const photos = [[6076, 4051, '#a83740'], [6425, 4283, '#287b58'], [7008, 4672, '#315bcc']];
      for (const [index, [w, h, colour]] of photos.entries()) {
        const canvas = makeCanvas(w, h), ctx = exportContext(canvas);
        ctx.fillStyle = colour; ctx.fillRect(0, 0, w, h);
        const data = canvas.toDataURL(); canvas.width = canvas.height = 1;
        const im = { id: uid(), width: w, height: h, data, original: data, name: `Grosses Foto ${index + 1}.png` };
        p.images.push(im);
        p.carousel.objects.push(carouselDefault('image', { x: index * 1080, y: 0, w: 1080, h: 1350, imageId: im.id }));
      }
      const first = p.carousel.objects[0];
      p.carousel.objects.push({ ...first, id: uid(), x: 1050, y: 0, w: 60, h: 100 });
      // Custom vertices may extend beyond the stored frame and must still be exported.
      p.carousel.objects.push({ ...first, id: uid(), x: 2000, y: 1250, w: 60, h: 100, framePoints: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 0, y: 1 }] });
      changed(); await carouselWaitForPaint();
    });
    const result = await page.evaluate(async () => {
      const expected = [[168, 55, 64], [40, 123, 88], [49, 91, 204]], checks = [];
      const originalImage = image, calls = [];
      image = async src => { const asset = p.images.find(im => im.data === src); if (asset) calls.push(asset.name); return originalImage(src); };
      try {
        for (const [i, board] of p.boards.entries()) {
          const before = calls.length;
          for (const format of ['png', 'jpg', 'webp']) {
            const entry = await encodedBoard(clone(board), { format, quality: 95, png8: false, colours: 256, transparent: false });
            const bitmap = await createImageBitmap(entry.blob), canvas = makeCanvas(1080, 1350), ctx = exportContext(canvas);
            ctx.drawImage(bitmap, 0, 0); bitmap.close();
            const pixel = Array.from(ctx.getImageData(540, 500, 1, 1).data);
            checks.push({ format, slide: i, pixel, expected: expected[i] });
            if (i === 1) checks.push({ format, slide: i, pixel: Array.from(ctx.getImageData(10, 10, 1, 1).data), expected: expected[0] });
            canvas.width = canvas.height = 1;
          }
          // Per slide: own photo plus crossing frames, never all large originals.
          const expectedCalls = [2, 3, 2][i] * 3;
          if (calls.length - before !== expectedCalls) throw Error(`Unexpected photo loads on slide ${i}: ${calls.length - before}`);
        }
        for (const [i, board] of p.boards.entries()) {
          const entry = await encodedBoard(clone(board), { format: 'pdf', pdf: carouselPDFPreset('original') });
          const bitmap = await createImageBitmap(entry.previewBlob), canvas = makeCanvas(1080, 1350), ctx = exportContext(canvas);
          ctx.drawImage(bitmap, 0, 0); bitmap.close();
          checks.push({ format: 'pdf', slide: i, pixel: Array.from(ctx.getImageData(540, 500, 1, 1).data), expected: expected[i] });
          canvas.width = canvas.height = 1;
        }
        const psd = agPsd.readPsd(await (await buildPSD()).arrayBuffer());
        for (let i = 0; i < 3; i++) checks.push({ format: 'psd', slide: i, pixel: Array.from(psd.canvas.getContext('2d').getImageData(i * 1080 + 540, 500, 1, 1).data), expected: expected[i] });
        return checks;
      } finally { image = originalImage; }
    });
    for (const check of result) {
      assert.equal(check.pixel[3], 255);
      check.expected.forEach((v, i) => assert(Math.abs(v - check.pixel[i]) <= 5, `${check.format} slide ${check.slide + 1} must contain its large photo`));
    }
    const failure = await page.evaluate(async () => {
      const im = p.images.find(im => im.name === 'Grosses Foto 2.png'), original = im.data,
        nativeCreate = document.createElement;
      let target;
      im.data = 'data:image/png;base64,YnJva2VuLWltYWdl'; revision++;
      document.createElement = function (name, ...args) { const el = nativeCreate.call(this, name, ...args); if (name === 'canvas' && !target) target = el; return el; };
      try {
        await encodedBoard(clone(p.boards[1]), { format: 'png', quality: 90, transparent: false });
        return { rejected: false };
      } catch (error) {
        return { rejected: /dekodiert/.test(error.message), released: target.width === 1 && target.height === 1 };
      } finally { im.data = original; document.createElement = nativeCreate; }
    });
    assert.deepEqual(failure, { rejected: true, released: true }, 'Decode failures must stop partial exports and release the canvas');
    await page.evaluate(() => openExport());
    await page.waitForFunction(() => [...document.querySelectorAll('.export-size')].every(el => el.dataset.bytes));
    await page.screenshot({ path: artifact(`mkw-large-photo-export-${process.env.MKW_TEST_BROWSER || 'chromium'}.png`) });
    assert.deepEqual(errors, []);
    console.log('PASS 24–33 MP photos in JPG/PNG/WebP/PDF/PSD, crossing slide edges and custom frame vertices, selective decoding, explicit decoder failure and canvas cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
