'use strict';
let homeSection = 'hero', homeData, homeRevision, homeCatalog = [], homeIndex = '', homeTimer, homeSequence = 0, homeLoading = false, homeSaving = false;
const homePreviewId = crypto.randomUUID();
const homeLabels = { hero: 'Hero-Bereich', about: 'Das bin ich', resume: 'Lebenslauf' };
let homeUndo = null;
function homeElement(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
function homeMessage(text, error = false) { const el = $('#home-status'); if (el) { el.textContent = text; el.classList.toggle('error', error); } }
function homeMark() { dirty = true; $('#home-save').disabled = false; homeMessage('Ungespeicherte Änderungen · Vorschau zeigt deinen Entwurf.'); homeSchedule(); }
function homeSchedule() { clearTimeout(homeTimer); homeSequence++; homeTimer = setTimeout(safely(homePreview), 400); }
async function loadHome(section = homeSection, focusTab = false) {
    const root = $('#home-manager'); const seq = ++homeSequence;
    clearTimeout(homeTimer); homeLoading = true; homeSection = section; homeUndo = null;
    root.innerHTML = '<p class="hint">Startseite wird geladen …</p>';
    try {
        const result = await api('/api/studio/home/' + section);
        if (type !== 'home' || seq !== homeSequence) return;
        homeData = result.data; homeRevision = result.revision; homeCatalog = result.catalog || []; homeIndex = result.indexHtml || '';
        homeLoading = false; saved(); renderHome(); if (focusTab) $('#home-tab-' + section)?.focus(); homeSchedule();
    } catch (error) { if (type === 'home' && seq === homeSequence) { root.textContent = error.message; root.append(button('Erneut versuchen', () => loadHome(section))); } }
    finally { if (seq === homeSequence) homeLoading = false; }
}
function renderHome() {
    const root = $('#home-manager'); root.replaceChildren();
    const heading = homeElement('div', undefined, 'home-heading');
    const intro = homeElement('div'); intro.append(homeElement('span', 'DEINE STARTSEITE', 'eyebrow'), homeElement('h2', 'Ein erster Eindruck. Deine Handschrift.'), homeElement('p', 'Wähle einen Bereich. Die Vorschau zeigt deine Änderungen im Design der Website.', 'hint'));
    const save = button('Lokal speichern', saveHome, 'primary'); save.id = 'home-save'; save.disabled = !dirty; save.title = '⌘ / Strg + S'; heading.append(intro, save);
    const tabs = homeElement('div', undefined, 'home-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Bereiche der Startseite');
    for (const [key, label] of Object.entries(homeLabels)) {
        const tab = button(label, () => { if (homeSaving || homeLoading || key === homeSection || !discard()) return; loadHome(key, true); });
        tab.id = 'home-tab-' + key; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(homeSection === key)); tab.setAttribute('aria-controls', 'home-panel'); tab.tabIndex = homeSection === key ? 0 : -1;
        tab.onkeydown = event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault(); const items = [...tabs.children]; const at = items.indexOf(tab); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
            items[next].focus(); items[next].click();
        };
        tabs.append(tab);
    }
    const shyHelp = homeElement('p', 'Tipp: &shy; setzt einen bedingten Trennstrich. Er erscheint erst bei einem passenden Zeilenumbruch.', 'hint home-shy-help');
    const message = homeElement('p', 'Lokal gespeichert · Veröffentlichung anschliessend über „Änderungen prüfen“.', 'hint'); message.id = 'home-status'; message.setAttribute('role', 'status');
    const layout = homeElement('div', undefined, 'home-layout');
    const panel = homeElement('section', undefined, 'home-panel'); panel.id = 'home-panel'; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'home-tab-' + homeSection);
    const preview = homeElement('section', undefined, 'home-preview');
    const bar = homeElement('div', undefined, 'home-preview-bar'); bar.append(homeElement('strong', 'Website-Vorschau'));
    const devices = homeElement('div', undefined, 'segmented');
    for (const [label, width] of [['Flexibel', '100%'], ['Mobil', '390px']]) {
        const b = button(label, () => { $('#home-frame').style.width = width; for (const item of devices.children) { item.classList.toggle('active', item === b); item.setAttribute('aria-pressed', String(item === b)); } });
        b.classList.toggle('active', label === 'Flexibel'); b.setAttribute('aria-pressed', String(label === 'Flexibel')); devices.append(b);
    }
    const open = homeElement('a', 'Vorschau öffnen ↗'); open.id = 'home-open-preview'; open.target = '_blank'; open.rel = 'noopener'; open.hidden = true;
    bar.append(devices, open); const stage = homeElement('div', undefined, 'home-preview-stage'); const frame = document.createElement('iframe'); frame.id = 'home-frame'; frame.title = 'Originalvorschau der Startseite'; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups'); stage.append(frame);
    const hint = homeElement('p', 'Interaktive Originalseite · noch nicht veröffentlicht', 'hint'); hint.id = 'home-preview-status'; preview.append(bar, stage, hint); layout.append(panel, preview); root.append(heading, tabs, shyHelp, message, layout);
    if (homeSection === 'hero') renderHomeHero(panel);
    if (homeSection === 'about') {
        panel.append(homeElement('h3', 'Das bin ich'), homeElement('p', 'Bearbeite diesen Abschnitt als HTML. Der Rest der Startseite bleibt ausserhalb dieses Editors.', 'hint'));
        const label = homeElement('label', 'Inhalt · HTML'); const area = document.createElement('textarea'); area.className = 'home-html'; area.value = homeData; area.spellcheck = false;
        area.oninput = () => { homeData = area.value; homeMark(); }; label.append(area); panel.append(label, homeElement('p', 'Absätze: <p>…</p> · Überschriften: <h2>…</h2> · Trennung: &shy;', 'hint'));
    }
    if (homeSection === 'resume') renderHomeResume(panel);
}
function homeField(label, value, change, area = false) {
    const wrap = homeElement('label', label); const input = document.createElement(area ? 'textarea' : 'input'); input.value = value; input.maxLength = area ? 6000 : 250; input.oninput = () => { change(input.value); homeMark(); }; wrap.append(input); return wrap;
}
function homeProject(item) { return homeCatalog.find(p => p.type === item.type && p.id === item.id); }
function renderHomeHero(panel) {
    panel.append(homeElement('h3', 'Projekte schweben lassen'), homeElement('p', 'Bis zu sieben Bilder. Jedes öffnet sein Projekt. Die Reihenfolge bestimmt den Platz im Hero.', 'hint'));
    panel.append(homeField('Überschrift', homeData.title ?? 'Medien von', value => homeData.title = value), homeField('Name', homeData.name ?? 'Noé', value => homeData.name = value), homeField('Untertitel', homeData.subtitle ?? 'Mediamatiker EFZ mit BM', value => homeData.subtitle = value));
    const mode = homeElement('label', 'Darstellung'); const select = document.createElement('select'); select.add(new Option('Schwebende Projektbilder', 'projects')); select.add(new Option('Bisheriges Titelbild', 'image')); select.value = homeData.enabled ? 'projects' : 'image'; select.onchange = () => { homeData.enabled = select.value === 'projects'; homeMark(); }; mode.append(select); panel.append(mode);
    const motion = homeElement('label', 'Bewegungsstärke'); const line = homeElement('div', undefined, 'home-motion'); const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 32; range.step = 1; range.value = homeData.motion; range.setAttribute('aria-label', 'Bewegungsstärke'); const output = homeElement('output', String(homeData.motion));
    range.oninput = () => { homeData.motion = Number(range.value); output.value = range.value; homeMark(); }; line.append(range, output); motion.append(line); panel.append(motion, homeElement('p', '0 = ruhig. Auf Touch-Geräten und bei reduzierter Bewegung werden die Bilder automatisch ohne Animation gezeigt.', 'hint'));
    const head = homeElement('div', undefined, 'home-list-heading'); head.append(homeElement('h3', homeData.projects.length + ' von 7 Projekten'));
    const add = button('＋ Projekt auswählen', homePickProject, 'primary'); add.disabled = homeData.projects.length >= 7; head.append(add); panel.append(head);
    if (homeUndo) panel.append(button('Entfernen rückgängig machen', () => { homeData.projects.splice(homeUndo.index, 0, homeUndo.item); homeUndo = null; homeMark(); homeRedraw(); }));
    if (!homeData.projects.length) panel.append(homeElement('p', 'Beginne mit „Projekt auswählen“. Vorhandene Titelbilder werden automatisch übernommen.', 'home-blank'));
    homeData.projects.forEach((item, index) => {
        const project = homeProject(item), card = homeElement('article', undefined, 'home-project-card');
        const top = homeElement('div', undefined, 'home-project-summary'); const img = document.createElement('img'); img.alt = ''; const image = HomeHeroModel.imagePath(item.image || project?.image); if (image) img.src = '/' + image; img.onerror = () => { img.hidden = true; };
        const text = homeElement('div'); text.append(homeElement('small', `${index + 1} · ${project?.category || 'Nicht mehr verfügbar'}`), homeElement('strong', project?.title || item.id)); top.append(img, text); card.append(top);
        const tools = homeOrderButtons(index, homeData.projects, label => homeRedraw(label)); card.append(tools);
        const imageTools = homeElement('div', undefined, 'home-image-tools');
        imageTools.append(button('Bild ändern', () => pickMedia(value => { item.image = value; homeMark(); homeRedraw(); }, { imagesOnly: true })), button('Projektbild verwenden', () => { item.image = ''; homeMark(); homeRedraw(); }));
        const fit = document.createElement('select'); fit.setAttribute('aria-label', 'Bildausschnitt: ' + (project?.title || item.id)); fit.add(new Option('Bild füllt die Karte', 'cover')); fit.add(new Option('Ganzes Bild zeigen', 'contain')); fit.value = item.fit || 'cover'; fit.onchange = () => { item.fit = fit.value; homeMark(); }; imageTools.append(fit); card.append(imageTools); panel.append(card);
    });
}
function homeRedraw(focusLabel) {
    const panel = $('#home-panel'); panel.replaceChildren();
    if (homeSection === 'hero') renderHomeHero(panel); else renderHomeResume(panel);
    if (focusLabel) [...panel.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === focusLabel)?.focus();
}
function homeOrderButtons(index, items, redraw) {
    const tools = homeElement('div', undefined, 'home-order');
    for (const [label, offset] of [['Nach oben', -1], ['Nach unten', 1]]) {
        const b = button(label, () => { const next = index + offset; if (next < 0 || next >= items.length) return; [items[index], items[next]] = [items[next], items[index]]; homeUndo = null; homeMark(); redraw(`${next + 1}. Eintrag entfernen`); }); b.disabled = index + offset < 0 || index + offset >= items.length; b.setAttribute('aria-label', `${index + 1}. Eintrag ${label.toLowerCase()}`); tools.append(b);
    }
    const remove = button('Entfernen', () => { homeUndo = { index, item: items[index] }; items.splice(index, 1); homeMark(); redraw(`${Math.max(1, Math.min(index + 1, items.length))}. Eintrag entfernen`); }); remove.setAttribute('aria-label', `${index + 1}. Eintrag entfernen`); tools.append(remove); return tools;
}
function homePickProject() {
    const modal = document.createElement('dialog'); modal.className = 'home-project-picker'; const heading = homeElement('div', undefined, 'dialog-heading'); heading.append(homeElement('h2', 'Projekt auswählen'));
    const close = button('×', () => modal.close()); close.setAttribute('aria-label', 'Projektauswahl schliessen'); heading.append(close); const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Projekt oder Bereich suchen …'; search.setAttribute('aria-label', 'Projekte suchen');
    const results = homeElement('div', undefined, 'home-project-options'); const status = homeElement('p', '', 'hint'); status.setAttribute('role', 'status'); modal.append(heading, search, status, results);
    const draw = () => {
        results.replaceChildren(); const matches = homeCatalog.filter(p => `${p.title} ${p.category}`.replace(/\u00ad/g, '').toLocaleLowerCase().includes(search.value.replace(/&shy;|\u00ad/g, '').toLocaleLowerCase()));
        status.textContent = `${homeData.projects.length} von 7 ausgewählt · ${matches.length} Projekte gefunden`;
        for (const p of matches) {
            const selected = homeData.projects.some(item => item.type === p.type && item.id === p.id);
            const b = button('', () => { if (homeData.projects.some(item => item.type === p.type && item.id === p.id) || homeData.projects.length >= 7) return; homeData.projects.push({ type: p.type, id: p.id, image: '', fit: 'cover' }); homeUndo = null; homeMark(); homeRedraw(); draw(); search.focus(); }); b.disabled = selected || homeData.projects.length >= 7; b.setAttribute('aria-label', `${p.title} · ${p.category}${selected ? ' · ausgewählt' : ''}`);
            const img = document.createElement('img'); img.alt = ''; if (p.image) img.src = '/' + p.image; img.loading = 'lazy'; img.onerror = () => { img.hidden = true; }; const text = homeElement('span'); text.append(homeElement('small', p.category), homeElement('strong', p.title), homeElement('small', selected ? '✓ Ausgewählt' : 'Hinzufügen +')); b.append(img, text); results.append(b);
        }
        if (!matches.length) results.append(homeElement('p', 'Keine passenden Projekte. Versuche einen anderen Suchbegriff.', 'hint'));
    };
    search.oninput = draw; modal.onclose = () => { modal.remove(); $('#home-panel .home-list-heading button')?.focus(); }; document.body.append(modal); modal.showModal(); draw(); search.focus();
}
function renderHomeResume(panel) {
    const heading = homeElement('div', undefined, 'home-list-heading'); heading.append(homeElement('h3', 'Stationen im Lebenslauf'), button('＋ Station hinzufügen', () => { homeData.push({ year: '', title: '', company: '', description: '' }); homeUndo = null; homeMark(); homeRedraw(); $('#home-panel article:last-child input')?.focus(); }, 'primary')); heading.lastChild.disabled = homeData.length >= 80; panel.append(heading, homeElement('p', 'Die Reihenfolge hier entspricht der Zeitleiste. Verwende Text ohne HTML. Bestehende Silbentrennungen (&shy;) bleiben erhalten.', 'hint'));
    if (homeUndo) panel.append(button('Entfernen rückgängig machen', () => { homeData.splice(homeUndo.index, 0, homeUndo.item); homeUndo = null; homeMark(); homeRedraw(); }));
    if (!homeData.length) panel.append(homeElement('p', 'Noch keine Stationen. Ergänze Ausbildung, Berufserfahrung oder ein Praktikum.', 'home-blank'));
    homeData.forEach((item, index) => {
        const card = homeElement('article', undefined, 'home-resume-card'); card.append(homeElement('h4', 'Station ' + (index + 1)), homeOrderButtons(index, homeData, label => homeRedraw(label)));
        for (const [label, key] of [['Zeitraum', 'year'], ['Titel / Tätigkeit', 'title'], ['Organisation / Schule', 'company'], ['Beschreibung', 'description']]) card.append(homeField(label, item[key], value => item[key] = value, key === 'description'));
        panel.append(card);
    });
}
async function saveHome() {
    if (type !== 'home' || managerBusy || homeLoading || homeSaving || !dirty) return;
    const section = homeSection, snapshot = JSON.stringify(homeData); homeSaving = true; managerBusy = true; $('#home-save').disabled = true; homeMessage('Wird lokal gespeichert …');
    try {
        const result = await api('/api/studio/home/' + section, { data: JSON.parse(snapshot), revision: homeRevision }, 'PUT');
        homeRevision = result.revision; if (result.indexHtml) homeIndex = result.indexHtml;
        if (snapshot === JSON.stringify(homeData)) saved();
        homeMessage(dirty ? 'Gespeichert. Neuere Eingaben sind noch offen.' : 'Lokal gespeichert · für die Website anschliessend „Änderungen prüfen“ verwenden.');
    } catch (error) { homeMessage(error.message, true); }
    finally { homeSaving = false; managerBusy = false; if ($('#home-save')) $('#home-save').disabled = !dirty; }
}
async function homePreview() {
    if (type !== 'home' || homeData === undefined) return;
    const seq = homeSequence, section = homeSection;
    const request = { id: homePreviewId, homeSection: section, data: structuredClone(homeData) };
    $('#home-preview-status').textContent = 'Vorschau wird aktualisiert …';
    try {
        const result = await api('/api/studio/preview', request);
        if (type !== 'home' || seq !== homeSequence) return;
        const target = result.prefix + 'index.html' + (section === 'about' ? '#about' : section === 'resume' ? '#cv' : '');
        $('#home-frame').src = target; $('#home-open-preview').href = target; $('#home-open-preview').hidden = false;
        $('#home-preview-status').textContent = 'Interaktive Originalseite · noch nicht veröffentlicht';
    } catch (error) { if (type === 'home' && seq === homeSequence) $('#home-preview-status').textContent = 'Vorschau: ' + error.message; }
}
