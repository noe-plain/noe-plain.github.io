(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const maxPixels = 24_000_000, golden = (3 - Math.sqrt(5)) / 2;
  const formats = { webp: { label: 'WebP' }, jpg: { label: 'JPG' } };
  const s = {
    items: [], nextSizeId: 1, selected: 0, selectedSize: 0, step: 'edit', format: 'webp',
    loading: false, exporting: false, boards: [], drag: null, viewZoom: 100, excluded: new Set(), exportCards: []
  };
  const prettyBytes = n => n < 1_000_000 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1_000_000).toFixed(2)} MB`;
  const nativeWebP = (() => {
    try { const c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').startsWith('data:image/webp'); }
    catch { return false; }
  })();
  const supportsWebP = nativeWebP || !!window.MKWWebPCodec;
  const canExport = () => s.format === 'jpg' || supportsWebP;
  const busy = () => s.loading || s.exporting;
  let codecPromise;

  function status(message, error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error', error);
    $('dialogStatus').textContent = message; $('dialogStatus').classList.toggle('error', error);
  }
  function validSize({ w, h }) {
    return Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 10000 && h <= 10000 && w * h <= maxPixels;
  }
  const selectedItem = () => s.items[s.selected];
  const sizes = () => selectedItem()?.sizes || [];
  const isResize = () => !!selectedItem()?.resize;
  function sizeError() {
    for (const item of s.items) {
      if (!item.resize) continue;
      if (item.sizes.some(size => !validSize(size))) return `${item.file.name}: Jede Grösse benötigt 1 bis 10 000 px je Seite; maximal 24 Megapixel.`;
      const keys = item.sizes.map(size => `${size.w}x${size.h}`);
      if (new Set(keys).size !== keys.length) return `${item.file.name}: Diese Zielgrösse ist schon vorhanden. Bitte die doppelte Grösse ändern oder entfernen.`;
    }
    return '';
  }
  function cropFor(item, sizeId) {
    if (!item.crops[sizeId]) item.crops[sizeId] = { zoom: 1, panX: 0, panY: 0 };
    return item.crops[sizeId];
  }
  function activeSize() { return sizes().find(size => size.id === s.selectedSize) || sizes()[0] || { id: 0, w: 300, h: 600 }; }
  function webSafeName(name) {
    const umlauts = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
    return name.trim().replace(/\.(webp|jpe?g|png)$/i, '').toLowerCase()
      .replace(/[äöüß]/g, letter => umlauts[letter]).normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/g, '') || 'bild';
  }
  // The preview and export share this plan, including name collision handling.
  function jobs() {
    const used = new Set();
    return s.items.flatMap((item, imageIndex) => {
      const targets = item.resize ? item.sizes : [{ id: 0, w: item.image.naturalWidth, h: item.image.naturalHeight }];
      return targets.map(target => {
        const base = webSafeName(item.name), dimensions = item.resize ? `-${target.w}x${target.h}` : '';
        let name = `${base}${dimensions}.${s.format}`, suffix = 2;
        while (used.has(name)) name = `${base}-${suffix++}${dimensions}.${s.format}`;
        used.add(name);
        return { image: item.image, imageIndex, sizeId: target.id, w: target.w, h: target.h,
          resize: item.resize, crop: item.resize ? { ...cropFor(item, target.id) } : { zoom: 1, panX: 0, panY: 0 }, name };
      });
    });
  }
  const jobKey = job => `${job.imageIndex}:${job.sizeId}`;
  const selectedJobs = () => jobs().filter(job => !s.excluded.has(jobKey(job)));
  function renderExportCards() {
    s.exportCards = jobs().map(job => {
      const label = element('label', 'export-card'), preview = element('div', 'export-preview'), canvas = element('canvas');
      const factor = Math.min(1, 320 / job.w, 260 / job.h);
      if (validSize(job) || !job.resize) {
        canvas.width = Math.max(1, Math.round(job.w * factor)); canvas.height = Math.max(1, Math.round(job.h * factor));
        paint(canvas, job, s.format);
      }
      canvas.setAttribute('aria-label', job.name); preview.append(canvas);
      const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = !s.excluded.has(jobKey(job)); checkbox.setAttribute('aria-label', `${job.name} exportieren`);
      const meta = element('small', '', `${job.w} × ${job.h} px`), name = element('span', 'export-name', job.name), choice = element('div', 'export-choice');
      choice.append(checkbox, meta); label.append(preview, choice, name);
      label.classList.toggle('checked', checkbox.checked);
      checkbox.addEventListener('change', () => {
        if (busy()) return;
        if (checkbox.checked) s.excluded.delete(jobKey(job)); else s.excluded.add(jobKey(job));
        label.classList.toggle('checked', checkbox.checked); ready();
      });
      return { label, checkbox };
    });
    $('exportGrid').replaceChildren(...s.exportCards.map(card => card.label));
  }
  function setViewZoom(value) {
    s.viewZoom = Math.min(200, Math.max(25, Number(value) || 100));
    s.boards.forEach(drawBoard);
    $('viewZoom').value = s.viewZoom; $('viewZoomReset').textContent = `${s.viewZoom} %`; updateControls();
  }
  $('viewZoom').addEventListener('input', event => setViewZoom(event.target.value));
  $('viewZoomOut').addEventListener('click', () => setViewZoom(s.viewZoom - 10));
  $('viewZoomIn').addEventListener('click', () => setViewZoom(s.viewZoom + 10));
  $('viewZoomReset').addEventListener('click', () => setViewZoom(100));
  $('exportSelectAll').addEventListener('click', () => { if (busy()) return; s.excluded.clear(); renderExportCards(); ready(); });
  $('exportSelectNone').addEventListener('click', () => { if (busy()) return; s.excluded = new Set(jobs().map(jobKey)); renderExportCards(); ready(); });
  $('closeExport').addEventListener('click', () => setStep('edit'));
  $('exportDialog').addEventListener('cancel', event => { event.preventDefault(); if (!busy()) setStep('edit'); });
  function updateControls() {
    const count = s.items.length, outputs = selectedJobs().length;
    const error = sizeError(), label = formats[s.format].label;
    $('selectionCount').textContent = count;
    $('chooseLabel').textContent = count ? 'Auswahl ersetzen' : 'Bilder auswählen';
    $('selectionHint').textContent = count ? 'Eine neue Auswahl ersetzt die bisherigen Bilder.' : 'Dateien hierher ziehen oder auswählen.';
    $('workflowCount').textContent = count ? `${count}` : '';
    $('artboardCount').textContent = `${outputs} ${outputs === 1 ? 'ZEICHENFLÄCHE' : 'ZEICHENFLÄCHEN'}`;
    $('exportSummary').textContent = count
      ? `${count} ${count === 1 ? 'Bild' : 'Bilder'} → ${outputs} ${outputs === 1 ? 'Datei' : 'Dateien'} · ${label}${outputs > 1 ? ' · ZIP' : ''}`
      : 'Wähle Bilder für den Export aus.';
    $('downloadLabel').textContent = s.exporting ? 'Zeichenflächen werden exportiert …'
      : outputs > 1 ? `${outputs} Dateien als ZIP herunterladen` : `${label} herunterladen`;
    document.querySelectorAll('button, input, select').forEach(control => { control.disabled = busy(); });
    document.querySelectorAll('[data-remove-size]').forEach(button => { button.disabled = busy() || sizes().length === 1; });
    $('zoom').disabled = $('resetCrop').disabled = busy() || !count;
    $('filename').disabled = busy() || !count;
    for (const id of ['modeOriginal', 'modeResize', 'targetWidth', 'targetHeight', 'addSize']) $(id).disabled = busy() || !count;
    document.querySelectorAll('[data-size]').forEach(button => { button.disabled = busy() || !count; });
    $('workflowExport').disabled = busy() || !count;
    document.querySelectorAll('[data-add-board]').forEach(button => { button.hidden = s.step !== 'edit'; });
    $('workflowEdit').setAttribute('aria-current', s.step === 'edit' ? 'step' : 'false');
    $('workflowExport').setAttribute('aria-current', s.step === 'export' ? 'step' : 'false');
    $('download').disabled = s.step !== 'export' || busy() || !outputs || !canExport() || !!error;
    $('exportSelectionCount').textContent = `${outputs} von ${jobs().length} ausgewählt`;
    $('viewZoomOut').disabled = busy() || s.viewZoom <= 25; $('viewZoomIn').disabled = busy() || s.viewZoom >= 200;
  }
  function ready() {
    updateControls();
    if (busy()) return;
    if (!canExport()) status('Der lokale WebP-Encoder konnte nicht geladen werden. Bitte das gesamte Tool entpacken.', true);
    else if (sizeError()) status(sizeError(), true);
    else status(s.items.length ? (s.step === 'edit' ? 'Bereit. Über die Workflow-Leiste zum Export wechseln.' : 'Alle Zeichenflächen sind bereit für den Export.') : 'Wähle zuerst Bilder aus.');
  }
  function geometry(image, w, h, crop) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * crop.zoom;
    const mx = Math.max(0, (image.naturalWidth * scale - w) / 2);
    const my = Math.max(0, (image.naturalHeight * scale - h) / 2);
    crop.panX = Math.min(mx, Math.max(-mx, crop.panX));
    crop.panY = Math.min(my, Math.max(-my, crop.panY));
    return { scale, x: (w - image.naturalWidth * scale) / 2 + crop.panX, y: (h - image.naturalHeight * scale) / 2 + crop.panY };
  }
  function paint(canvas, job, format) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Die Bildfläche konnte nicht erstellt werden.');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (format === 'jpg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (!job.resize) { ctx.drawImage(job.image, 0, 0, canvas.width, canvas.height); return; }
    const { scale, x, y } = geometry(job.image, job.w, job.h, job.crop);
    ctx.save(); ctx.scale(canvas.width / job.w, canvas.height / job.h);
    ctx.drawImage(job.image, x, y, job.image.naturalWidth * scale, job.image.naturalHeight * scale); ctx.restore();
  }
  function drawGuides(svg, resize) {
    const type = resize && s.step === 'edit' ? $('guideType').value : 'none';
    const positions = type === 'golden' ? [golden * 100, (1 - golden) * 100] : type === 'thirds' ? [100 / 3, 200 / 3] : type === 'center' ? [50] : [];
    svg.style.display = positions.length ? '' : 'none';
    svg.innerHTML = positions.map(v => `<line x1="${v}" y1="0" x2="${v}" y2="100"/><line x1="0" y1="${v}" x2="100" y2="${v}"/>`).join('');
  }
  function isSelected(board) { return board.imageIndex === s.selected && (!s.items[board.imageIndex].resize || board.sizeId === s.selectedSize); }
  function updateNames() {
    const plan = jobs();
    s.boards.forEach((board, index) => {
      board.filename.textContent = plan[index].name; board.filename.title = plan[index].name;
    });
    const job = plan.find(job => job.imageIndex === s.selected && (!job.resize || job.sizeId === s.selectedSize));
    $('filenamePreview').textContent = job ? job.name : '';
    (s.groups || []).forEach((group, index) => {
      if (group.nameInput.value !== s.items[index].name) group.nameInput.value = s.items[index].name;
      const names = plan.filter(job => job.imageIndex === index).map(job => job.name);
      group.namePreview.textContent = names.join(' · ');
    });
  }
  function syncSelection() {
    const item = selectedItem(), target = activeSize();
    s.selectedSize = target.id;
    const resize = isResize();
    for (const [id, active] of [['modeOriginal', !resize], ['modeResize', resize]]) {
      $(id).classList.toggle('selected', active); $(id).setAttribute('aria-pressed', String(active));
    }
    $('resizeControls').hidden = !resize;
    $('sizeExplanation').textContent = resize ? 'Zeichenflächen nur für dieses Bild. Jede Grösse und jeder Ausschnitt lassen sich einzeln bearbeiten.' : 'Dieses Bild behält seine Originalmasse.';
    $('sizeImageName').textContent = item ? item.file.name : 'Zuerst ein Bild auswählen';
    $('targetWidth').value = Number.isFinite(target.w) && target.w ? target.w : '';
    $('targetHeight').value = Number.isFinite(target.h) && target.h ? target.h : '';
    $('sourceDetails').hidden = !item;
    if (item) {
      $('sourceName').textContent = item.file.name;
      $('sourceMeta').textContent = `${item.image.naturalWidth} × ${item.image.naturalHeight} px · ${prettyBytes(item.file.size)}`;
      $('filename').value = item.name;
    }
    const crop = item ? cropFor(item, target.id) : { zoom: 1 };
    $('zoom').value = Math.round(crop.zoom * 100); $('zoomValue').textContent = `${Math.round(crop.zoom * 100)} %`;
    $('activeArtboard').textContent = item ? `${item.file.name} · ${target.w} × ${target.h} px` : 'Noch kein Bild ausgewählt';
    s.boards.forEach(board => {
      board.card.classList.toggle('selected', isSelected(board));
      board.select.setAttribute('aria-pressed', String(isSelected(board)));
    });
    $('sizeList').querySelectorAll('[data-select-size]').forEach(button => {
      const selected = Number(button.dataset.selectSize) === s.selectedSize;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    (s.groups || []).forEach((group, index) => { group.heading.classList.toggle('active', index === s.selected); group.identify.setAttribute('aria-pressed', String(index === s.selected)); });
    updateNames();
  }
  function selectBoard(imageIndex, sizeId) {
    if (busy()) return;
    s.selected = imageIndex;
    s.selectedSize = sizeId || selectedItem().sizes[0].id;
    renderSizes(); syncSelection(); updateControls();
  }
  function drawBoard(board) {
    const item = s.items[board.imageIndex];
    const target = item.resize ? item.sizes.find(size => size.id === board.sizeId) : { w: item.image.naturalWidth, h: item.image.naturalHeight };
    const valid = item.resize ? validSize(target) : target.w > 0 && target.h > 0;
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = valid ? gcd(target.w, target.h) : 1;
    board.title.textContent = valid ? `${target.w / divisor}:${target.h / divisor}` : 'Format';
    board.dimensions.textContent = valid ? `${target.w} × ${target.h} px` : 'Grösse prüfen';
    board.frame.hidden = !valid; board.invalid.hidden = valid;
    if (!valid) return;
    const displayScale = Math.min(.75, 480 / target.w, 540 / target.h) * s.viewZoom / 100;
    const displayWidth = Math.max(1, Math.round(target.w * displayScale));
    board.card.style.width = `${Math.max(150, displayWidth)}px`;
    board.frame.style.width = `${displayWidth}px`;
    const factor = Math.min(1, displayScale * 2);
    board.canvas.width = Math.max(1, Math.round(target.w * factor));
    board.canvas.height = Math.max(1, Math.round(target.h * factor));
    const crop = cropFor(item, board.sizeId);
    paint(board.canvas, { image: item.image, ...target, resize: item.resize, crop }, s.format);
    board.canvas.setAttribute('aria-label', `${item.file.name}, ${target.w} × ${target.h} Pixel`);
    board.frame.classList.toggle('draggable', item.resize && s.step === 'edit'); drawGuides(board.guides, item.resize);
  }
  function element(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function bindArtboard(board) {
    board.select.addEventListener('click', () => selectBoard(board.imageIndex, board.sizeId));
    board.frame.addEventListener('pointerdown', event => {
      if (busy() || event.button !== 0) return;
      selectBoard(board.imageIndex, board.sizeId);
      if (!s.items[board.imageIndex].resize || s.step !== 'edit') return;
      const crop = cropFor(s.items[board.imageIndex], board.sizeId);
      s.drag = { board, pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: crop.panX, panY: crop.panY };
      board.frame.setPointerCapture(event.pointerId);
    });
    board.frame.addEventListener('pointermove', event => {
      const drag = s.drag;
      if (!drag || drag.board !== board || event.pointerId !== drag.pointerId || busy()) return;
      const target = s.items[board.imageIndex].sizes.find(size => size.id === board.sizeId), rect = board.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const crop = cropFor(s.items[board.imageIndex], board.sizeId);
      crop.panX = drag.panX + (event.clientX - drag.x) * target.w / rect.width;
      crop.panY = drag.panY + (event.clientY - drag.y) * target.h / rect.height;
      drawBoard(board);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) board.frame.addEventListener(type, () => { s.drag = null; });
    board.frame.addEventListener('keydown', event => {
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!move || !s.items[board.imageIndex].resize || s.step !== 'edit' || busy()) return;
      event.preventDefault(); selectBoard(board.imageIndex, board.sizeId);
      const crop = cropFor(s.items[board.imageIndex], board.sizeId), step = event.shiftKey ? 10 : 1;
      crop.panX += move[0] * step; crop.panY += move[1] * step; drawBoard(board);
    });
  }
  function rebuildBoards() {
    s.drag = null;
    s.boards = jobs().map(job => {
      const card = element('article', 'artboard'), select = element('button', 'artboard-heading');
      select.type = 'button';
      const title = element('strong', '', 'Format'), dimensions = element('span', 'artboard-dimensions');
      select.append(title, dimensions); select.setAttribute('aria-label', `${s.items[job.imageIndex].file.name}, ${job.w} × ${job.h} Pixel bearbeiten`);
      const body = element('div', 'artboard-body'), frame = element('div', 'board-frame'); frame.tabIndex = 0;
      frame.setAttribute('aria-label', 'Bild auswählen; im Resize-Modus ziehen oder mit Pfeiltasten verschieben');
      const canvas = element('canvas'), guides = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      guides.setAttribute('class', 'guides'); guides.setAttribute('viewBox', '0 0 100 100'); guides.setAttribute('preserveAspectRatio', 'none'); guides.setAttribute('aria-hidden', 'true');
      frame.append(canvas, guides);
      const invalid = element('p', 'invalid-board', 'Bitte eine gültige Zielgrösse eingeben.'); body.append(frame, invalid);
      const filename = element('div', 'artboard-filename'); card.append(select, body, filename);
      const board = { ...job, card, select, title, dimensions, frame, canvas, guides, invalid, filename }; bindArtboard(board); drawBoard(board); return board;
    });
    s.groups = s.items.map((item, imageIndex) => {
      const group = element('section', 'image-group');
      group.setAttribute('aria-label', `Bild ${imageIndex + 1}: ${item.file.name}`);
      const heading = element('div', 'group-heading'), identify = element('button', 'image-identify'); identify.type = 'button';
      const number = element('span', 'image-number', String(imageIndex + 1).padStart(2, '0'));
      const caption = element('span', 'image-caption'), name = element('strong', '', item.file.name); name.title = item.file.name;
      const boards = s.boards.filter(board => board.imageIndex === imageIndex);
      const metadata = element('small', 'image-metadata', `${item.image.naturalWidth} × ${item.image.naturalHeight} px · ${prettyBytes(item.file.size)} · ${boards.length} ${boards.length === 1 ? 'Zeichenfläche' : 'Zeichenflächen'}`);
      caption.append(name, metadata); identify.append(number, caption);
      identify.addEventListener('click', () => selectBoard(imageIndex, boards[0].sizeId));
      const actions = element('div', 'group-actions'), add = element('button', 'group-add', '＋ Format'); add.type = 'button'; add.dataset.addBoard = imageIndex;
      add.setAttribute('aria-label', `Zeichenfläche für ${item.file.name} hinzufügen`);
      add.addEventListener('click', () => { if (busy() || s.step !== 'edit') return; selectBoard(imageIndex, boards[0].sizeId); $('addSize').click(); });
      actions.append(add); heading.append(identify, actions);
      const naming = element('div', 'image-naming'), label = element('label', 'image-name-label', 'Exportname · alle Zeichenflächen dieses Bildes');
      const nameInput = element('input', 'image-name-input'); nameInput.type = 'text'; nameInput.value = item.name; nameInput.spellcheck = false;
      nameInput.setAttribute('aria-label', `Exportname für ${item.file.name}`);
      label.append(nameInput);
      const resetName = element('button', 'reset-image-name', 'Originalname'); resetName.type = 'button';
      resetName.setAttribute('aria-label', `Originalnamen für ${item.file.name} wiederherstellen`);
      const namePreview = element('small', 'image-name-preview');
      nameInput.addEventListener('input', () => {
        if (busy()) return;
        item.name = nameInput.value;
        if (s.selected === imageIndex) $('filename').value = item.name;
        updateNames();
      });
      resetName.addEventListener('click', () => {
        if (busy()) return;
        item.name = item.file.name.replace(/\.[^.]+$/, '') || 'bild';
        if (s.selected === imageIndex) $('filename').value = item.name;
        updateNames();
      });
      naming.append(label, resetName, namePreview); heading.append(naming);
      const row = element('div', 'board-row'); row.append(...boards.map(board => board.card));
      group.append(heading, row); return { group, heading, identify, nameInput, namePreview, resetName };
    });
    $('artboardGrid').replaceChildren(...s.groups.map(group => group.group));
    $('emptyState').hidden = !!s.items.length; $('previewState').hidden = !s.items.length;
    $('dropArea').classList.toggle('has-artboards', !!s.items.length);
    syncSelection(); ready();
  }
  function renderSizes() {
    $('sizeCount').textContent = `${sizes().length} ${sizes().length === 1 ? 'Grösse' : 'Grössen'}`;
    $('sizeList').replaceChildren(...sizes().map(size => {
      const row = element('div', 'size-row'), select = element('button', 'size-choice', `${size.w || '–'} × ${size.h || '–'} px`);
      select.type = 'button'; select.dataset.selectSize = size.id;
      select.addEventListener('click', () => { if (busy()) return; s.selectedSize = size.id; syncSelection(); });
      const remove = element('button', 'size-remove', '×'); remove.type = 'button'; remove.dataset.removeSize = size.id;
      remove.setAttribute('aria-label', `Grösse ${size.w} × ${size.h} entfernen`);
      remove.addEventListener('click', () => {
        if (busy() || sizes().length === 1) return;
        selectedItem().sizes = sizes().filter(value => value.id !== size.id);
        delete selectedItem().crops[size.id];
        if (s.selectedSize === size.id) s.selectedSize = sizes()[0].id;
        renderSizes(); rebuildBoards();
      });
      row.append(select, remove); return row;
    }));
  }
  function addSize(w, h) {
    if (busy() || !selectedItem()) return;
    selectedItem().resize = true;
    let size = sizes().find(size => size.w === w && size.h === h);
    if (!size) { size = { id: s.nextSizeId++, w, h }; selectedItem().sizes.push(size); }
    s.selectedSize = size.id; renderSizes(); rebuildBoards();
  }
  function mode(resize) {
    if (busy() || !selectedItem()) return;
    selectedItem().resize = resize; rebuildBoards();
  }
  function setStep(step) {
    if (busy() || (step === 'export' && !s.items.length)) return;
    s.step = step; s.drag = null;
    $('sourceSection').hidden = $('sizeSection').hidden = step === 'export';
    $('exportSection').hidden = step !== 'export';
    $('workflowEdit').classList.toggle('current', step === 'edit');
    $('workflowExport').classList.toggle('current', step === 'export');
    $('toolsTitle').textContent = step === 'edit' ? 'Bilder bearbeiten' : 'Export vorbereiten';
    $('toolsSubtitle').textContent = step === 'edit' ? 'Zeichenflächen pro Bild anlegen.' : 'Alle Zeichenflächen gemeinsam exportieren.';
    $('workspaceTitle').textContent = step === 'edit' ? 'Zeichenflächen' : 'Exportübersicht';
    $('canvasHint').textContent = step === 'edit' ? 'Ein Bild auswählen, Zeichenflächen hinzufügen und jeden Ausschnitt einzeln anpassen.' : 'Alle Zeichenflächen und Dateinamen im Überblick. Wähle Format und Qualität für den Export.';
    s.boards.forEach(drawBoard);
    if (step === 'export') { renderExportCards(); if (!$('exportDialog').open) $('exportDialog').showModal(); }
    else if ($('exportDialog').open) $('exportDialog').close();
    ready();
  }
  $('workflowEdit').addEventListener('click', () => setStep('edit'));
  $('workflowExport').addEventListener('click', () => setStep('export'));
  function setFormat(format) {
    if (busy()) return;
    s.format = format;
    for (const [id, value] of [['formatWebp', 'webp'], ['formatJpg', 'jpg']]) {
      $(id).classList.toggle('selected', format === value); $(id).setAttribute('aria-pressed', String(format === value));
    }
    $('filenameExtension').textContent = '.' + format;

    $('formatSummary').textContent = 'JPG / PNG / WEBP → ' + formats[format].label.toUpperCase();
    $('formatHint').textContent = format === 'jpg' ? 'Transparente Flächen werden weiss.' : 'Transparenz bleibt erhalten.';
    s.boards.forEach(drawBoard); updateNames(); if (s.step === 'export') renderExportCards(); ready();
  }
  $('modeOriginal').addEventListener('click', () => mode(false));
  $('modeResize').addEventListener('click', () => mode(true));
  $('formatWebp').addEventListener('click', () => setFormat('webp'));
  $('formatJpg').addEventListener('click', () => setFormat('jpg'));
  $('addSize').addEventListener('click', () => {
    let w = 600, h = 500;
    while (sizes().some(size => size.w === w && size.h === h)) w += 100;
    addSize(w, h);
  });
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => addSize(...button.dataset.size.split('x').map(Number))));
  function dimensions() {
    if (busy()) return;
    const target = activeSize(); target.w = Number($('targetWidth').value); target.h = Number($('targetHeight').value);
    delete selectedItem().crops[target.id];
    renderSizes();
    s.boards.filter(board => board.sizeId === target.id).forEach(board => {
      board.select.setAttribute('aria-label', `${s.items[board.imageIndex].file.name}, ${target.w} × ${target.h} Pixel bearbeiten`); drawBoard(board);
    });
    // Do not replace the focused dimension input while typing.
    $('zoom').value = 100; $('zoomValue').textContent = '100 %';
    $('activeArtboard').textContent = s.items[s.selected] ? `${s.items[s.selected].file.name} · ${target.w} × ${target.h} px` : 'Noch kein Bild ausgewählt';
    $('sizeList').querySelectorAll('[data-select-size]').forEach(button => {
      const selected = Number(button.dataset.selectSize) === target.id;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    updateNames(); ready();
  }
  $('targetWidth').addEventListener('input', dimensions); $('targetHeight').addEventListener('input', dimensions);
  $('zoom').addEventListener('input', event => {
    if (busy() || !s.items.length) return;
    const crop = cropFor(s.items[s.selected], s.selectedSize); crop.zoom = Number(event.target.value) / 100;
    $('zoomValue').textContent = event.target.value + ' %'; s.boards.filter(isSelected).forEach(drawBoard);
  });
  $('resetCrop').addEventListener('click', () => {
    if (busy() || !s.items.length) return;
    delete s.items[s.selected].crops[s.selectedSize]; s.boards.filter(isSelected).forEach(drawBoard); syncSelection();
  });
  $('guideType').addEventListener('change', () => s.boards.forEach(board => drawGuides(board.guides, s.items[board.imageIndex].resize)));
  $('quality').addEventListener('input', event => { $('qualityValue').textContent = event.target.value + ' %'; });
  $('filename').addEventListener('input', () => {
    if (busy() || !s.items.length) return;
    s.items[s.selected].name = $('filename').value; updateNames();
  });

  async function loadFiles(files) {
    if (busy() || s.step !== 'edit' || !files.length) return;
    s.loading = true; updateControls(); const items = [], errors = [];
    try {
      for (const file of files) {
        status(`Lade ${file.name} …`);
        const supported = /^image\/(jpeg|png|webp)$/.test(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
        if (!supported) { errors.push(`${file.name}: Dateiformat nicht unterstützt`); continue; }
        const url = URL.createObjectURL(file), image = new Image();
        try {
          await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('Bild konnte nicht gelesen werden')); image.src = url; });
          if (!image.naturalWidth || !image.naturalHeight) throw Error('Keine lesbaren Pixel');
          if (image.naturalWidth * image.naturalHeight > maxPixels) throw Error('Mehr als 24 Megapixel');
          const factor = Math.min(1, 10000 / Math.max(image.naturalWidth, image.naturalHeight));
          items.push({ image, file, url, name: file.name.replace(/\.[^.]+$/, '') || 'bild', crops: {}, resize: false,
            sizes: [{ id: s.nextSizeId++, w: Math.max(1, Math.round(image.naturalWidth * factor)), h: Math.max(1, Math.round(image.naturalHeight * factor)) }] });
        } catch (error) { URL.revokeObjectURL(url); errors.push(`${file.name}: ${error.message}`); }
      }
      if (items.length) {
        s.items.forEach(item => URL.revokeObjectURL(item.url)); s.items = items; s.excluded.clear(); s.selected = 0; s.selectedSize = items[0].sizes[0].id; renderSizes(); rebuildBoards();
      }
    } finally { s.loading = false; ready(); if (errors.length) status(errors.join(' · '), true); }
  }
  const input = $('fileInput');
  $('chooseMain').addEventListener('click', () => input.click()); $('chooseSide').addEventListener('click', () => input.click());
  input.addEventListener('change', event => { loadFiles(Array.from(event.target.files)); input.value = ''; });
  const drop = $('dropArea'); let dragDepth = 0;
  drop.addEventListener('dragenter', event => { event.preventDefault(); if (busy()) return; dragDepth++; drop.classList.add('drag-active'); $('dragOverlay').hidden = false; });
  drop.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = busy() ? 'none' : 'copy'; });
  drop.addEventListener('dragleave', event => { event.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) { drop.classList.remove('drag-active'); $('dragOverlay').hidden = true; } });
  drop.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; drop.classList.remove('drag-active'); $('dragOverlay').hidden = true; loadFiles(Array.from(event.dataTransfer.files)); });
  async function fallbackWebP(canvas,quality){
    if(!codecPromise){
      codecPromise=(async()=>{const base64=window.MKWWebPWasm,raw=atob(base64),binary=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)binary[i]=raw.charCodeAt(i);const module=await window.MKWWebPCodec({wasmBinary:binary});window.MKWWebPWasm=null;return module})();
    }
    const module=await codecPromise, rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const pointer=module._malloc(rgba.length),sizePointer=module._malloc(4);
    if(!pointer||!sizePointer){if(pointer)module._free(pointer);if(sizePointer)module._free(sizePointer);throw Error('Zu wenig Speicher für dieses Bild.')}
    let output=0;
    try{module.HEAPU8.set(rgba,pointer);output=module._webp_encode_rgba(pointer,canvas.width,canvas.height,Math.round(quality*100),0,sizePointer);const length=module.HEAPU32[sizePointer>>>2];if(!output||!length)throw Error('WebP-Kodierung fehlgeschlagen.');return new Blob([module.HEAPU8.slice(output,output+length)],{type:'image/webp'})}
    finally{if(output)module._webp_free(output);module._free(pointer);module._free(sizePointer)}
  }
  async function encodeWebP(canvas,quality){
    if(nativeWebP){try{const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(Error('Leere Bildausgabe.')),'image/webp',quality));if(blob.type==='image/webp')return blob}catch{/* Use local encoder. */}}
    return fallbackWebP(canvas,quality);
  }
  async function encodeJPG(canvas,quality){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    if(!blob||blob.type!=='image/jpeg')throw Error('JPG-Kodierung fehlgeschlagen.');
    return blob;
  }
  // ZIP with stored entries: image formats are already compressed.
  async function zipFiles(files){
    const local=[],central=[];let offset=0,centralSize=0;
    for(const file of files){
      const data=new Uint8Array(await file.blob.arrayBuffer()),name=new TextEncoder().encode(file.name);
      let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
      const header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const entry=new Uint8Array(46+name.length),cv=new DataView(entry.buffer);
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);entry.set(header.subarray(4,30),6);cv.setUint32(42,offset,true);entry.set(name,46);
      local.push(header,data);central.push(entry);offset+=header.length+data.length;centralSize+=entry.length;
      if(offset+centralSize>0xffffffff||files.length>65535)throw Error('Die Auswahl ist zu gross für eine ZIP-Datei. Bitte weniger Bilder auswählen.');
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...local,...central,end],{type:'application/zip'});
  }
  $('download').addEventListener('click', async () => {
    if (busy() || s.step !== 'export' || !s.items.length || !canExport() || sizeError()) return;
    const plan = selectedJobs(), format = s.format, quality = Number($('quality').value) / 100, files = [];
    if (!plan.length) return;
    s.exporting = true; updateControls(); $('exportProgress').hidden = false; $('exportProgress').value = 0;
    try {
      for (const [index, job] of plan.entries()) {
        status(`Zeichenfläche ${index + 1} von ${plan.length}: ${job.name}`);
        const canvas = document.createElement('canvas'); canvas.width = job.w; canvas.height = job.h;
        if (canvas.width !== job.w || canvas.height !== job.h) throw Error('Diese Bildgrösse ist im Browser zu hoch.');
        let blob;
        try { paint(canvas, job, format); blob = await (format === 'jpg' ? encodeJPG(canvas, quality) : encodeWebP(canvas, quality)); }
        finally { canvas.width = canvas.height = 1; }
        files.push({ name: job.name, blob }); $('exportProgress').value = Math.round((index + 1) / plan.length * 100);
      }
      if (files.length > 1) status('ZIP wird erstellt …');
      const blob = files.length === 1 ? files[0].blob : await zipFiles(files);
      const name = files.length === 1 ? files[0].name : `bilder-${format}.zip`;
      const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
      status(`${name} · ${files.length} ${files.length === 1 ? 'Datei' : 'Dateien'} · ${prettyBytes(blob.size)}`);
    } catch (error) { status(error.message || String(error), true); }
    finally { s.exporting = false; $('exportProgress').hidden = true; updateControls(); }
  });
  renderSizes(); syncSelection(); ready();
})();
