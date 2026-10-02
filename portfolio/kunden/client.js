'use strict';
(() => {
    const $ = id => document.getElementById(id);
    const state = { events: [], event: null, key: null, gallery: null, selected: new Set(), urls: new Set(), generation: 0, downloading: false, active: 0 };
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
        state.generation++; state.key = null; state.gallery = null; state.selected.clear();
        if ($('client-detail').open) $('client-detail').close();
        for (const url of state.urls) URL.revokeObjectURL(url); state.urls.clear();
        $('client-grid').replaceChildren(); $('client-gallery').hidden = true; $('client-unlock').hidden = !state.event;
        $('client-password').value = ''; $('client-password').type = 'password'; $('client-show').setAttribute('aria-pressed', 'false'); $('client-show').textContent = 'Anzeigen';
        $('client-lock').disabled = state.downloading; $('client-download-status').textContent = ''; $('client-ready').replaceChildren(); $('client-detail-ready').replaceChildren(); status('');
    }
    function choose(id) {
        lock(); state.event = state.events.find(event => event.id === id) || null;
        $('client-unlock').hidden = !state.event; $('client-event-title').textContent = state.event?.title || '';
        $('client-event-summary').textContent = state.event ? `${state.event.count} Bilder${state.event.date ? ' · ' + new Intl.DateTimeFormat('de-CH').format(new Date(state.event.date + 'T12:00:00')) : ''}` : '';
        const url = new URL(location); if (id) url.searchParams.set('veranstaltung', id); else url.searchParams.delete('veranstaltung'); history.replaceState(null, '', url);
    }
    async function unlock(event) {
        event.preventDefault();
        if (!state.event) return;
        const password = $('client-password').value; if (!password) return;
        const chosen = state.event, seq = ++state.generation;
        $('client-open').disabled = true; $('client-events').disabled = true; status('Galerie wird geöffnet …');
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
        finally { $('client-open').disabled = false; $('client-events').disabled = false; }
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
        if (state.gallery) { const image = state.gallery.images[state.active]; $('client-detail-select').textContent = state.selected.has(image?.id) ? '✓ Ausgewählt' : 'Bild auswählen'; }
    }
    function toggle(id) { if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id); selection(); }
    function layout() {
        const grid = $('client-grid'); if (grid.hidden || !grid.clientWidth) return;
        const cols = Math.max(1, Math.floor(grid.clientWidth / 280)); const gap = 10, width = (grid.clientWidth - (cols - 1) * gap) / cols;
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
        $('client-detail-image').removeAttribute('src'); $('client-detail-image').alt = image.name; $('client-detail-image').classList.remove('zoomed');
        $('client-detail-status').textContent = 'Bild wird geladen …'; $('client-prev').disabled = $('client-next').disabled = state.gallery.images.length < 2;
        if (!$('client-detail').open) $('client-detail').showModal(); selection();
        if (detailURL) { releaseURL(detailURL); detailURL = null; }
        try { const data = await imageData(image, 'preview'); if (seq !== detailSequence || generation !== state.generation || !$('client-detail').open) return; detailURL = imageURL(data, 'image/webp'); $('client-detail-image').src = detailURL; $('client-detail-status').textContent = ''; }
        catch (error) { if (seq === detailSequence && generation === state.generation) $('client-detail-status').textContent = error.message; }
    }
    function downloadBlob(blob, name, target) {
        const host = $(target);
        const previous = host.querySelector('a'); if (previous) releaseURL(previous.href);
        const url = imageURL(blob, blob.type), anchor = make('a', '↓ ' + name + ' speichern', 'client-primary client-ready-link');
        anchor.href = url; anchor.download = name; host.replaceChildren(anchor);
    }
    async function download(images, zip) {
        if (state.downloading || !images.length) return;
        const total = images.reduce((sum, image) => sum + image.size, 0);
        if (zip && total > 600 * 1024 * 1024) { status('Diese Auswahl ist sehr gross. Bitte in kleineren Gruppen mit höchstens 600 MB herunterladen.'); return; }
        state.downloading = true; $('client-events').disabled = true; $('client-lock').disabled = true; $('client-single').disabled = true; selection();
        const target = zip ? $('client-download-status') : $('client-detail-status');
        try {
            const files = [];
            for (const [index, image] of images.entries()) { target.textContent = `Download wird vorbereitet: ${index + 1} von ${images.length} …`; files.push({ name: image.name, data: await imageData(image, 'full') }); }
            downloadBlob(zip ? createClientZip(files) : new Blob([files[0].data], { type: 'image/jpeg' }), zip ? state.event.title.replace(/[^\p{L}\p{N}_ -]/gu, '-').slice(0, 80) + '-Bilder.zip' : files[0].name, zip ? 'client-ready' : 'client-detail-ready');
            target.textContent = 'Download bereit. Klicke auf den Link zum Speichern.';
        } catch (error) { target.textContent = error.message; }
        finally { state.downloading = false; $('client-events').disabled = false; $('client-lock').disabled = false; $('client-single').disabled = false; selection(); }
    }
    $('client-events').onchange = () => choose($('client-events').value);
    $('client-form').onsubmit = unlock;
    $('client-show').onclick = () => { const show = $('client-password').type === 'password'; $('client-password').type = show ? 'text' : 'password'; $('client-show').setAttribute('aria-pressed', String(show)); $('client-show').textContent = show ? 'Verbergen' : 'Anzeigen'; };
    $('client-lock').onclick = lock;
    $('client-all').onclick = () => { state.selected = new Set(state.gallery.images.map(image => image.id)); selection(); };
    $('client-none').onclick = () => { state.selected.clear(); selection(); };
    $('client-download').onclick = () => download(state.gallery.images.filter(image => state.selected.has(image.id)), true);
    $('client-single').onclick = () => download([state.gallery.images[state.active]], false);
    $('client-detail-select').onclick = () => toggle(state.gallery.images[state.active].id);
    $('client-close').onclick = () => $('client-detail').close();
    $('client-detail').onclose = () => { detailSequence++; if (detailURL) { releaseURL(detailURL); detailURL = null; } };
    $('client-prev').onclick = () => openDetail(state.active - 1); $('client-next').onclick = () => openDetail(state.active + 1);
    $('client-detail-image').onclick = () => $('client-detail-image').classList.toggle('zoomed');
    $('client-detail').onkeydown = event => { if (/INPUT|BUTTON/.test(event.target.tagName)) return; if (event.key === 'ArrowLeft') openDetail(state.active - 1); if (event.key === 'ArrowRight') openDetail(state.active + 1); };
    new ResizeObserver(layout).observe($('client-grid'));
    async function load() {
        status('Veranstaltungen werden geladen …');
        try {
            state.events = JSON.parse(decoder.decode(await fetchBytes(new URL('index.json', folder))));
            $('client-events').replaceChildren(new Option('Veranstaltung auswählen …', ''));
            for (const event of state.events) $('client-events').add(new Option(event.title + (event.date ? ' · ' + event.date.split('-').reverse().join('.') : ''), event.id));
            $('client-events').disabled = !state.events.length; $('client-empty').hidden = !!state.events.length;
            const id = new URLSearchParams(location.search).get('veranstaltung');
            if (id && state.events.some(event => event.id === id)) { $('client-events').value = id; choose(id); } else status(id ? 'Diese Freigabe ist nicht mehr verfügbar. Bitte Noé kontaktieren.' : '');
        } catch { status('Die Veranstaltungen konnten nicht geladen werden. Bitte erneut versuchen.'); $('client-retry').hidden = false; }
    }
    $('client-retry').onclick = () => { $('client-retry').hidden = true; load(); }; load();
})();
