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
    await page.locator('#setupName').fill('Textausrichtung');
    await page.locator('#cn').fill('2');
    await page.locator('#createProject').click();
    await page.locator('#carouselCanvas').waitFor();
    const id = await page.evaluate(() => {
      p.carousel.objects = [];
      carouselObject('text', { x: 150, y: 300, w: 650, h: 500, size: 54, color: '#172238', text: 'Ein kurzer Titel\nEin längerer Absatz mit mehreren Worten, der automatisch umbricht.' });
      return carouselSelection;
    });
    const object = () => page.evaluate(id => clone(p.carousel.objects.find(o => o.id === id)), id);
    const lines = () => page.evaluate(id => carouselTextLayout(p.carousel.objects.find(o => o.id === id)).lines, id);
    assert((await lines()).every(line => line.x === 0), 'Legacy/default text stays left aligned');
    for (const align of ['center', 'right', 'left']) {
      await page.locator(`[data-text-align=${align}]`).click();
      assert.equal((await object()).textAlign, align);
      const factor = { left: 0, center: .5, right: 1 }[align];
      assert((await lines()).every(line => Math.abs(line.x - (650 - line.width) * factor) < 1e-8));
      assert.equal(await page.locator(`[data-text-align=${align}]`).getAttribute('aria-pressed'), 'true');
    }
    await page.locator('[data-text-align=center]').click();
    await page.locator('[data-paragraph="1"]').click();
    await page.locator('[data-paragraph-align=right]').click();
    assert((await lines()).filter(line => line.paragraph === 1).every(line => line.align === 'right'));
    await page.locator('[data-text-align=left]').click();
    assert((await lines()).filter(line => line.paragraph === 1).every(line => line.align === 'right'), 'Explicit paragraph alignment survives field changes');
    await page.locator('#carouselParagraphAlignReset').click();
    assert((await lines()).every(line => line.align === 'left'));
    await page.locator('[data-text-align=center]').click();
    await page.locator('[data-paragraph-align=right]').click();
    await page.locator('[data-text-anchor=bottom]').click();
    // The image encoders must preserve the same line origins and bottom anchor.
    for (const format of ['png', 'jpg', 'webp']) {
      const matches = await page.evaluate(async format => {
        const o = p.carousel.objects.find(o => o.id === carouselSelection),
          actual = await encodedBoard(clone(p.boards[0]), { format, quality: 91, png8: false, colours: 256, transparent: false }),
          expected = makeCanvas(p.carousel.w, p.carousel.h), ctx = exportContext(expected);
        ctx.fillStyle = p.carousel.bg; ctx.fillRect(0, 0, expected.width, expected.height);
        ctx.fillStyle = o.color; ctx.textBaseline = 'top';
        const layout = carouselTextLayout(o), offset = carouselTextOffset(o, layout);
        for (const line of layout.lines) {
          ctx.font = `${line.size}px "${o.font}"`;
          const width = ctx.measureText(line.text).width;
          ctx.fillText(line.text, o.x + (o.w - width) * (line.paragraph === 0 ? .5 : 1), o.y + offset + line.y);
        }
        const expectedBlob = await new Promise(resolve => expected.toBlob(resolve, `image/${format === 'jpg' ? 'jpeg' : format}`, .91)),
          a = new Uint8Array(await actual.blob.arrayBuffer()), b = new Uint8Array(await expectedBlob.arrayBuffer());
        return a.length === b.length && a.every((value, i) => value === b[i]);
      }, format);
      assert(matches, `${format} must render the aligned text exactly`);
    }
    const pdf = await page.evaluate(() => {
      const o = p.carousel.objects.find(o => o.id === carouselSelection), layout = carouselTextLayout(o), opts = carouselPDFPreset('original');
      return { text: carouselPDFText(p.boards[0], opts), expected: layout.lines.filter(line => line.text).map(line => (o.x + line.x) * .75) };
    });
    pdf.text.forEach((line, i) => assert(Math.abs(line.x - pdf.expected[i]) < 1e-8, 'PDF selectable text must align with the artwork'));
    const psd = await page.evaluate(async () => {
      const data = agPsd.readPsd(await (await buildPSD()).arrayBuffer()), text = data.children.flatMap(layer => layer.children || []).filter(layer => layer.text).map(layer => layer.text);
      const expected = makeCanvas(data.width, data.height); await carouselPaint(exportContext(expected));
      const a = data.canvas.getContext('2d').getImageData(0, 0, data.width, data.height).data, b = expected.getContext('2d').getImageData(0, 0, data.width, data.height).data;
      return { alignments: text.map(t => t.paragraphStyle.justification), anchors: text.map(t => t.transform[4]), exact: a.every((v, i) => v === b[i]) };
    });
    assert(psd.exact, 'PSD composite preserves alignment');
    assert.deepEqual(psd.alignments, (await lines()).filter(line => line.text).map(line => line.align));
    psd.anchors.forEach((x, i) => assert(Math.abs(x - (i === 0 ? 475 : 800)) < .01));
    await page.locator('#carouselTextEdit').click();
    const inline = await page.evaluate(() => {
      const o = p.carousel.objects.find(o => o.id === carouselSelection), lines = carouselTextLayout(o).lines;
      return [...document.querySelectorAll('.carousel-text-line')].every((el, i) => Math.abs(parseFloat(el.style.left) / carouselZoom - lines[i].x) < .01);
    });
    assert(inline, 'Inline editing must use the same line origins');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Neuer Absatz');
    assert.equal((await object()).textStyles.at(-1).align, 'right', 'New paragraphs inherit the current alignment');
    await page.keyboard.press('Escape');
    await page.locator('#undo').click();
    assert(!(await object()).text.endsWith('Neuer Absatz'), 'Undo restores text and its formatting');
    await page.locator('#redo').click();
    assert.equal((await object()).textStyles.at(-1).align, 'right');
    const validation = await page.evaluate(() => {
      const data = snapshot(), o = data.carousel.objects.find(o => o.id === carouselSelection);
      const rejects = mutate => { const copy = clone(data); mutate(copy.carousel.objects.find(x => x.id === o.id)); try { validate(copy); validateCarousel(copy); return false; } catch { return true; } };
      validate(data); validateCarousel(data); const old = clone(data); const legacy = old.carousel.objects.find(x => x.id === o.id); delete legacy.textAlign; delete legacy.textStyles; validate(old); validateCarousel(old);
      return [rejects(x => x.textAlign = 'justify'), rejects(x => x.textStyles = [{ align: 'invalid' }])];
    });
    assert.deepEqual(validation, [true, true], 'Future justification is not silently accepted before implementation');
    const saved = await object();
    await page.evaluate(() => autosave());
    await page.reload();
    await page.locator('#startContinue').click();
    await page.locator('#carouselCanvas').waitFor();
    assert.equal((await object()).textAlign, saved.textAlign);
    assert.deepEqual((await object()).textStyles, saved.textStyles);
    await page.locator(`[data-layer="${id}"] [data-action=select]`).click();
    await page.screenshot({ path: artifact('mkw-text-alignment-light.png') });
    await page.evaluate(() => { const o = p.carousel.objects.find(o => o.id === carouselSelection); o.locked = true; carouselPanel(); });
    assert.equal(await page.locator('[data-text-align]:enabled').count(), 0);
    assert.equal(await page.locator('[data-paragraph-align]:enabled').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS field and paragraph alignment, reset/inheritance, wrapped lines, inline editing, undo, persistence, locked text, legacy validation, exact PNG/JPG/WebP, PDF positions and editable PSD alignment');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
