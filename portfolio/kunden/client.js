'use strict';
(() => {
    const $ = id => document.getElementById(id);
    const state = { events: [], event: null, key: null, gallery: null, selected: new Set(), urls: new Set(), generation: 0, downloading: false, active: 0 };
    const { assignSlugs, galleryLink, selectedEvent } = ClientGalleryLinks;
    const decoder = new TextDecoder();
    const folder = new URL('./data/', document.currentScript.src);
    const status = text => { $('client-status').textContent = text; };
    const make = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
    function urlFor(file) {
        if (!/^[a-f0-9-]+\/(?:[a-f0-9-]+\/)?[a-zA-Z0-9.-]+$/.test(file)) throw Error('Ungültiger Galeriepfad.');
        return new URL(file, folder);
    }
    async function fetchBytes(url) { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw Error('Die Datei konnte nicht geladen werden. Bitte die Verbindung prüfen und erneut versuchen.'); return response.arrayBuffer(); }
    async function decrypt(buffer, key = state.key) { const bytes = new Uint8Array(buffer); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)); }
    function imageURL(data, type) { const url = URL.createObjectURL(new Blob([data], { type })); state.urls.add(url); return url; }
    function releaseURL(url) { URL.revokeObjectURL(url); state.urls.delete(url); }
    function lock() {
        state.generation++; metadataCache.clear(); state.key = null; state.gallery = null; state.selected.clear();
        if ($('detail-screen').open) $('detail-screen').close(); $('client-detail-image').removeAttribute('src');
        for (const url of state.urls) URL.revokeObjectURL(url); state.urls.clear();
        $('client-grid').replaceChildren(); $('client-gallery').hidden = true; $('client-unlock').hidden = !state.event;
        $('client-password').value = ''; $('client-password').type = 'password'; $('client-show').setAttribute('aria-pressed', 'false'); $('client-show').textContent = 'Anzeigen';
        $('client-lock').disabled = state.downloading; $('client-download-status').textContent = ''; $('client-ready').replaceChildren(); $('client-detail-ready').replaceChildren(); status('');
    }
    function navBusy(busy) { $('page-nav').querySelectorAll('a').forEach(link => link.setAttribute('aria-disabled', String(busy))); }
    function choose(id, push = false) {
        if (state.downloading || $('client-open').disabled) return;
        lock(); state.event = state.events.find(event => event.id === id) || null;
        $('client-unlock').hidden = !state.event; $('client-event-title').textContent = state.event?.title || '';
        $('client-event-summary').textContent = state.event ? `${state.event.count} Bilder${state.event.date ? ' · ' + new Intl.DateTimeFormat('de-CH').format(new Date(state.event.date + 'T12:00:00')) : ''}` : '';
        const url = galleryLink(new URL('./', location), state.event?.slug || '');
        history[push ? 'pushState' : 'replaceState'](null, '', url);
        $('page-nav').querySelectorAll('a').forEach(link => { const active = link.dataset.id === state.event?.id; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    }
    async function unlock(event) {
        event.preventDefault();
        if (!state.event) return;
        const password = $('client-password').value; if (!password) return;
        const chosen = state.event, seq = ++state.generation;
        $('client-open').disabled = true; navBusy(true); status('Galerie wird geöffnet …');
        try {
            if (!crypto.subtle) throw Error('Bitte die Galerie über HTTPS oder localhost in einem aktuellen Browser öffnen.');
            const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
            const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(atob(chosen.salt), c => c.charCodeAt(0)), iterations: chosen.iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
            const encrypted = await fetchBytes(urlFor(chosen.bundle));
            let bytes; try { bytes = await decrypt(encrypted, key); } catch { throw Error('Das Passwort stimmt nicht oder die Freigabe wurde geändert. Bitte erneut versuchen.'); }
            const gallery = JSON.parse(decoder.decode(bytes));
            if (seq !== state.generation) return;
            state.key = key; state.gallery = gallery;
            $('client-password').value = ''; $('client-unlock').hidden = true; $('client-gallery').hidden = false;
            $('client-title').textContent = gallery.title; $('client-description').textContent = gallery.description || '';
            renderGrid(); status('');
        } catch (error) { if (seq === state.generation) { status(error.message); $('client-password').focus(); } }
        finally { $('client-open').disabled = false; navBusy(false); }
    }
    function selection() {
        const count = state.selected.size;
        $('client-selection').textContent = `${count} von ${state.gallery?.images.length || 0} Bildern ausgewählt`;
        $('client-download').disabled = !count || state.downloading;
        $('client-none').disabled = !count || state.downloading;
        $('client-all').disabled = !state.gallery?.images.length || count === state.gallery.images.length || state.downloading;
        document.querySelectorAll('.client-select').forEach(button => {
            const selected = state.selected.has(button.dataset.id); button.setAttribute('aria-pressed', String(selected)); button.textContent = selected ? '✓' : '+';
            button.setAttribute('aria-label', `${selected ? 'Abwählen' : 'Auswählen'}: ${button.dataset.name}`);
            button.closest('.gallery-item').classList.toggle('client-selected', selected);
        });
        if (state.gallery) { const image = state.gallery.images[state.active]; const selected = state.selected.has(image?.id), button = $('client-detail-select'); button.setAttribute('aria-pressed', String(selected)); button.setAttribute('aria-label', selected ? 'Bild abwählen' : 'Bild auswählen'); button.classList.toggle('active', selected); button.querySelector('i').className = selected ? 'fas fa-heart' : 'far fa-heart'; }
    }
    function toggle(id) { if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id); selection(); }
    function layout() {
        const grid = $('client-grid'); if (grid.hidden || !grid.clientWidth) return;
        const gap = parseFloat(getComputedStyle(grid).gap) || 10; const cols = Math.min(3, Math.max(1, Math.floor((grid.clientWidth + gap) / (280 + gap)))); const width = (grid.clientWidth - (cols - 1) * gap) / cols;
        grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`; grid.style.gridAutoRows = `${width / 1.5}px`;
        const heights = Array(cols).fill(0);
        [...grid.children].forEach((cell, index) => { const image = state.gallery.images[index], span = image.width / image.height < .8 ? 2 : 1; const col = heights.indexOf(Math.min(...heights)); cell.style.gridColumn = String(col + 1); cell.style.gridRow = `${heights[col] + 1} / span ${span}`; heights[col] += span; });
    }
    async function imageData(image, kind) { const base = state.event.bundle.replace(/gallery\.bin$/, ''); return decrypt(await fetchBytes(urlFor(base + image[kind]))); }
    function renderGrid() {
        const grid = $('client-grid'), seq = state.generation; grid.replaceChildren();
        const jobs = [];
        state.gallery.images.forEach((image, index) => {
            const cell = make('div', undefined, 'gallery-item client-cell');
            const view = make('button', undefined, 'client-view'); view.type = 'button'; view.setAttribute('aria-label', `${image.name} in Grossansicht öffnen`);
            const img = make('img'); img.alt = image.name; view.append(img); view.onclick = () => openDetail(index);
            const select = make('button', '+', 'client-select'); select.type = 'button'; select.dataset.id = image.id; select.dataset.name = image.name; select.onclick = () => toggle(image.id);
            const label = make('span', image.name, 'client-caption'); cell.append(view, select, label); grid.append(cell);
            jobs.push(async () => {
                try { const bytes = await imageData(image, 'thumb'); if (seq !== state.generation) return; img.src = imageURL(bytes, 'image/webp'); }
                catch { if (seq !== state.generation) return; view.textContent = 'Vorschau erneut laden'; view.onclick = async () => { view.replaceChildren(img); view.onclick = () => openDetail(index); await jobs[index](); }; }
            });
        });
        let cursor = 0;
        const worker = async () => { while (cursor < jobs.length && seq === state.generation) await jobs[cursor++](); };
        for (let n = 0; n < 4; n++) worker();
        $('client-grid-empty').hidden = !!state.gallery.images.length; layout(); selection();
    }
    let detailSequence = 0, detailURL;
    async function openDetail(index) {
        state.active = (index + state.gallery.images.length) % state.gallery.images.length;
        const image = state.gallery.images[state.active], seq = ++detailSequence, generation = state.generation;
        $('client-detail-title').textContent = image.name; $('client-detail-position').textContent = `${state.active + 1} / ${state.gallery.images.length}`;
        $('client-detail-info').textContent = `${image.width} × ${image.height} Pixel · JPG in voller Auflösung`;
        $('client-detail-image').removeAttribute('src'); $('client-detail-image').alt = image.name; resetZoom(); infoSheet(false); $('specs-equipment').replaceChildren(); $('specs-technical').replaceChildren(); $('client-detail-ready').replaceChildren();
        $('client-detail-status').textContent = 'Bild wird geladen …'; $('client-prev').disabled = $('client-next').disabled = state.gallery.images.length < 2;
        if (!$('detail-screen').open) $('detail-screen').showModal(); selection();
        if (detailURL) { releaseURL(detailURL); detailURL = null; }
        try { const data = await imageData(image, 'preview'); if (seq !== detailSequence || generation !== state.generation || !$('detail-screen').open) return; detailURL = imageURL(data, 'image/webp'); $('client-detail-image').src = detailURL; $('client-detail-status').textContent = ''; }
        catch (error) { if (seq === detailSequence && generation === state.generation) $('client-detail-status').textContent = error.message; }
    }
    function downloadBlob(blob, name, target, autoStart = false) {
        const host = $(target);
        const previous = host.querySelector('a'); if (previous) releaseURL(previous.href);
        const url = imageURL(blob, blob.type), anchor = make('a', '↓ ' + name + ' speichern', 'client-primary client-ready-link');
        anchor.href = url; anchor.download = name; host.replaceChildren(anchor);
        if (autoStart) anchor.click();
    }
    async function download(images, zip) {
        if (state.downloading || !images.length) return;
        const total = images.reduce((sum, image) => sum + image.size, 0);
        if (zip && total > 600 * 1024 * 1024) { status('Diese Auswahl ist sehr gross. Bitte in kleineren Gruppen mit höchstens 600 MB herunterladen.'); return; }
        state.downloading = true; navBusy(true); $('client-lock').disabled = true; $('client-single').disabled = true; selection();
        const target = zip ? $('client-download-status') : $('client-detail-status');
        try {
            const files = [];
            for (const [index, image] of images.entries()) { target.textContent = `Download wird vorbereitet: ${index + 1} von ${images.length} …`; files.push({ name: image.name, data: await imageData(image, 'full') }); }
            downloadBlob(zip ? createClientZip(files) : new Blob([files[0].data], { type: 'image/jpeg' }), zip ? state.event.title.replace(/[^\p{L}\p{N}_ -]/gu, '-').slice(0, 80) + '-Bilder.zip' : files[0].name, zip ? 'client-ready' : 'client-detail-ready', zip);
            target.textContent = zip ? 'ZIP vorbereitet. Falls der Download nicht automatisch startet, nutze den Speicherlink.' : 'Download bereit. Klicke auf den Link zum Speichern.';
        } catch (error) { target.textContent = error.message; }
        finally { state.downloading = false; navBusy(false); $('client-lock').disabled = false; $('client-single').disabled = false; selection(); }
    }
    $('client-form').onsubmit = unlock;
    $('client-show').onclick = () => { const show = $('client-password').type === 'password'; $('client-password').type = show ? 'text' : 'password'; $('client-show').setAttribute('aria-pressed', String(show)); $('client-show').textContent = show ? 'Verbergen' : 'Anzeigen'; };
    $('client-lock').onclick = lock;
    $('client-all').onclick = () => { state.selected = new Set(state.gallery.images.map(image => image.id)); selection(); };
    $('client-none').onclick = () => { state.selected.clear(); selection(); };
    $('client-download').onclick = () => download(state.gallery.images.filter(image => state.selected.has(image.id)), true);
    $('client-single').onclick = () => download([state.gallery.images[state.active]], false);
    $('client-detail-select').onclick = () => toggle(state.gallery.images[state.active].id);
    $('client-close').onclick = () => $('detail-screen').close();
    $('detail-screen').onclose = () => { detailSequence++; $('client-detail-image').removeAttribute('src'); infoSheet(false); if (detailURL) { releaseURL(detailURL); detailURL = null; } };
    $('client-prev').onclick = () => openDetail(state.active - 1); $('client-next').onclick = () => openDetail(state.active + 1);
    let scale = 1, panX = 0, panY = 0, drag = null;
    function transform() { $('zoom-target').style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`; $('zoom-target').style.cursor = scale > 1 ? 'grab' : 'default'; }
    function resetZoom() { scale = 1; panX = panY = 0; $('zoom-slider').value = 1; transform(); }
    function zoom(value) { scale = Math.min(4, Math.max(1, Number(value))); $('zoom-slider').value = scale; if (scale === 1) panX = panY = 0; transform(); }
    $('zoom-slider').oninput = () => zoom($('zoom-slider').value);
    $('zoom-in-btn').onclick = () => zoom(scale + .5); $('zoom-out-btn').onclick = () => zoom(scale - .5);
    $('zoom-target').onpointerdown = event => { if (scale <= 1) return; drag = { x: event.clientX, y: event.clientY }; $('zoom-target').setPointerCapture(event.pointerId); };
    $('zoom-target').onpointermove = event => { if (!drag) return; panX += (event.clientX - drag.x) / scale; panY += (event.clientY - drag.y) / scale; drag = { x: event.clientX, y: event.clientY }; transform(); };
    $('zoom-target').onpointerup = $('zoom-target').onpointercancel = () => { drag = null; };
    function infoSheet(show) { $('detail-content-sheet').hidden = !show; $('detail-content-sheet').classList.toggle('visible', show); $('info-toggle-btn').setAttribute('aria-expanded', String(show)); }
    const metadataCache = new Map();
    async function showInfo() {
        const show = $('detail-content-sheet').hidden; infoSheet(show); if (!show) return;
        const image = state.gallery.images[state.active], generation = state.generation, seq = detailSequence;
        if (!$('specs-equipment').children.length) $('specs-equipment').textContent = 'Kameraeinstellungen werden geladen …';
        try {
            let exif = metadataCache.get(image.id);
            if (!exif) { if (!window.exifr) throw Error(); exif = await exifr.parse(await imageData(image, 'full')) || {}; if (generation !== state.generation || seq !== detailSequence) return; metadataCache.set(image.id, exif); }
            if (generation !== state.generation || seq !== detailSequence) return;
            $('specs-equipment').replaceChildren(); $('specs-technical').replaceChildren();
            function badge(id, icon, text) { if (!text) return; const node = make('span', undefined, 'spec-badge'), glyph = make('i', undefined, 'fas ' + icon); glyph.setAttribute('aria-hidden', 'true'); node.append(glyph, document.createTextNode(' ' + text)); $(id).append(node); }
            badge('specs-equipment', 'fa-camera', exif.Model?.trim().toUpperCase() === 'ILCE-7CM2' ? 'Sony a7c II' : exif.Model);
            badge('specs-equipment', 'fa-circle-notch', exif.LensModel);
            if (exif.FNumber) badge('specs-technical', 'fa-bullseye', 'f/' + exif.FNumber);
            if (exif.ExposureTime) badge('specs-technical', 'fa-stopwatch', exif.ExposureTime < 1 ? '1/' + Math.round(1 / exif.ExposureTime) + ' s' : exif.ExposureTime + ' s');
            if (exif.ISO) badge('specs-technical', 'fa-lightbulb', 'ISO ' + exif.ISO);
            if (!$('specs-equipment').children.length && !$('specs-technical').children.length) $('specs-equipment').textContent = 'Keine Kameraeinstellungen vorhanden.';
        } catch { if (generation === state.generation && seq === detailSequence) $('specs-equipment').textContent = 'Kameraeinstellungen konnten nicht geladen werden.'; }
    }
    $('info-toggle-btn').onclick = showInfo; $('sheet-close-btn').onclick = () => { infoSheet(false); $('info-toggle-btn').focus(); };
    $('detail-screen').onkeydown = event => { if (/INPUT|TEXTAREA/.test(event.target.tagName)) return; if (event.key === 'ArrowLeft') openDetail(state.active - 1); if (event.key === 'ArrowRight') openDetail(state.active + 1); };
    new ResizeObserver(layout).observe($('client-grid'));
    async function load() {
        status('Veranstaltungen werden geladen …');
        try {
            state.events = assignSlugs(JSON.parse(decoder.decode(await fetchBytes(new URL('index.json', folder)))));
            $('page-nav').replaceChildren();
            for (const event of state.events) {
                const link = make('a', event.title, 'tab-btn'); link.href = '?' + encodeURIComponent(event.slug); link.dataset.id = event.id;
                link.onclick = click => { if (click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return; click.preventDefault(); choose(event.id, true); }; $('page-nav').append(link);
            }
            $('client-empty').hidden = !!state.events.length; updateNavScroll();
            const requested = selectedEvent(location.search, state.events);
            if (requested) choose(requested.id);
            else if (!location.search && state.events.length) { status(''); }
            else status(location.search ? 'Diese Freigabe ist nicht mehr verfügbar. Bitte Noé kontaktieren.' : '');
        } catch { status('Die Veranstaltungen konnten nicht geladen werden. Bitte erneut versuchen.'); $('client-retry').hidden = false; }
    }
    function updateNavScroll() { const nav = $('page-nav'); $('page-nav-left-gradient').hidden = nav.scrollLeft < 5; $('page-nav-scroll-btn').hidden = nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 5; }
    $('page-nav').onscroll = updateNavScroll;
    for (const [id, direction] of [['page-nav-left-gradient', -1], ['page-nav-scroll-btn', 1]]) $(id).onclick = () => $('page-nav').scrollBy({ left: direction * Math.max(200, $('page-nav').clientWidth * .6), behavior: 'smooth' });
    new ResizeObserver(updateNavScroll).observe($('page-nav'));
    window.onpopstate = () => { if (state.downloading || $('client-open').disabled) { history.replaceState(null, '', galleryLink(new URL('./', location), state.event?.slug || '')); return; } const chosen = selectedEvent(location.search, state.events); choose(chosen?.id); };
    $('client-retry').onclick = () => { $('client-retry').hidden = true; load(); }; load();
})();
