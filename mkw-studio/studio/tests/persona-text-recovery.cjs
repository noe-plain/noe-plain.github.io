const assert = require('node:assert/strict');
const { launch, artifact, waitForProjectReady, selectTextScope } = require('./browser.cjs');

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(process.env.STUDIO_URL);
    await page.locator('#startDesigner').click();
    await page.locator('#setupName').fill('Textauswahl wiederherstellen');
    await page.locator('#createProject').click();
    await waitForProjectReady(page);
    const ids = await page.evaluate(() => {
      const first = carouselObject('text', { text: 'Erster Absatz\nZweiter Absatz\nDritter Absatz', x: 100, y: 300, w: 600, h: 600, size: 60, color: '#202020' });
      const second = carouselObject('text', { text: 'Andere Textebene', x: 100, y: 100, w: 600, h: 100, size: 50, textStyles: [{ align: 'right' }] });
      carouselSelect([first.id, second.id]);
      const targets = carouselSelected();
      delete targets[1].textStyles;
      targets[0].textStyles = [{ align: 'right' }];
      carouselPanel();
      return [first.id, second.id];
    });
    await page.locator('[data-typo-tab=paragraph]').click();
    assert(await page.locator('[data-typo-align-auto]').isEnabled(), 'An override on another selected layer must be resettable');
    const beforeReset = await page.evaluate(() => ({ objects: clone(p.carousel.objects), history: history.length }));
    await page.locator('[data-typo-align-auto]').click();
    assert(await page.evaluate(() => carouselSelected().every(o => !o.textStyles?.some(s => s?.align !== undefined))));
    assert(await page.locator('[data-typo-align-auto]').isDisabled());
    assert.equal(await page.evaluate(() => history.length), beforeReset.history + 1);
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(() => p.carousel.objects), beforeReset.objects);

    await page.evaluate(id => carouselSelect([id]), ids[0]);
    await page.locator('[data-typo-tab=paragraph]').click();
    const original = await page.evaluate(() => ({ snapshot: JSON.stringify(snapshot()), history: history.length, revision }));
    await selectTextScope(page, '[data-paragraph-selection]', []);
    for (const selector of ['[data-typo-align=right]', '[data-typo-leading-auto]', '[data-typo-size-auto]'])
      assert(await page.locator(selector).isDisabled(), selector + ' must not offer an empty-scope mutation');
    await page.locator('[data-paragraph-all]').click();
    await selectTextScope(page, '[data-line-selection]', []);
    assert(await page.locator('[data-lines-leading]').isDisabled());
    assert.match(await page.locator('[data-lines-count]').textContent(), /^0 von 3 Zeilen/);
    await page.locator('[data-lines-all]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-line-selection] input:checked').count(), 3);
    assert(await page.locator('[data-lines-all]').isDisabled());
    assert.match(await page.locator('[data-lines-count]').textContent(), /^3 von 3 Zeilen/);
    assert.deepEqual(await page.evaluate(() => ({ snapshot: JSON.stringify(snapshot()), history: history.length, revision })), original, 'Selection recovery must not change the document or history');
    await page.locator('[data-lines-leading]').fill('85');
    assert.deepEqual(await page.evaluate(() => carouselSelected()[0].textStyles.map(s => s.leading[0])), [85, 85, 85]);
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(() => p.carousel.objects), beforeReset.objects);
    await page.evaluate(id => carouselSelect([id]), ids[0]);
    await page.locator('[data-typo-tab=paragraph]').click();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => studioSetTheme(theme), theme);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      assert.deepEqual(await page.evaluate(async () => (await axe.run('#carouselSidebar')).violations.map(v => v.id)), []);
      await page.locator('[data-lines-all]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: artifact('persona-text-recovery-' + theme + '.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#toolsToggle').click();
    if (!(await page.locator('#carouselProperties').isVisible())) await page.locator('#toolsToggle').click();
    await page.locator('[data-lines-all]').scrollIntoViewIfNeeded();
    assert(await page.locator('[data-lines-all]').isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: artifact('persona-text-recovery-narrow.png') });

    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.locator('#newproject').click();
    await page.locator('[data-project-mode=post]').click();
    await page.locator('#setupName').fill('FD Zeilenauswahl');
    await page.locator('#createProject').click();
    await waitForProjectReady(page);
    await page.evaluate(async () => {
      const canvas = makeCanvas(640, 800);
      canvas.getContext('2d').fillRect(0, 0, 640, 800);
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      await importFiles([new File([blob], 'Text.png', { type: 'image/png' })]);
      selected = p.boards[0].id;
      chooseStep('text');
    });
    await page.locator('#mainTextInput').fill('Oben\nMitte\nUnten');
    await page.locator('[data-typo-tab=paragraph]').click();
    await page.locator('[data-paragraph-all]').click();
    const fdBefore = await page.evaluate(() => ({ snapshot: JSON.stringify(snapshot()), history: history.length, revision }));
    await selectTextScope(page, '[data-line-selection]', []);
    assert.match(await page.locator('[data-lines-count]').textContent(), /^0 von 3 Zeilen/);
    await page.locator('[data-lines-all]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-line-selection] input:checked').count(), 3);
    assert.deepEqual(await page.evaluate(() => ({ snapshot: JSON.stringify(snapshot()), history: history.length, revision })), fdBefore);
    await selectTextScope(page, '[data-paragraph-selection]', ['1']);
    assert.match(await page.locator('[data-lines-count]').textContent(), /^1 von 1 Zeile ausgewählt$/);
    assert(await page.locator('[data-lines-all]').isDisabled());
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    assert.deepEqual(await page.evaluate(async () => (await axe.run('#stepPanel')).violations.map(v => v.id)), []);
    assert.deepEqual(errors, []);
    console.log('PASS multi-layer alignment reset/undo, empty-scope guards, keyboard line recovery without document/history changes, leading/undo, light/dark axe and narrow layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
