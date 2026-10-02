'use strict';
let clientEvents = [], clientQuery = '';
async function loadClients() {
    const root = $('#management'); root.innerHTML = '<p class="hint">Kundengalerien werden geladen …</p>';
    try { clientEvents = await api('/api/studio/clients'); if (type === 'clients') renderClients(); }
    catch (error) { root.textContent = error.message; root.append(button('Erneut versuchen', loadClients)); }
}
function renderClients() {
    const root = managerShell('KUNDENGALERIEN', 'Bilder für deine Kundinnen');
    root.querySelector('.manager-heading').append(button('＋ Veranstaltung erstellen', () => editClient(), 'primary'));
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Eigener Upload mit Passwortschutz. Veranstaltungsnamen und Datum sind öffentlich sichtbar. Bilder werden verschlüsselt bereitgestellt und danach über „Änderungen prüfen“ veröffentlicht.';
    root.querySelector('.manager-toolbar').append(hint);
    const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Veranstaltung suchen …'; search.setAttribute('aria-label', 'Veranstaltung suchen'); search.value = clientQuery;
    root.querySelector('.manager-toolbar').append(search);
    const body = root.querySelector('.manager-body'); body.className += ' client-manager-grid';
    function cards() {
        body.replaceChildren();
        const events = clientEvents.filter(event => event.title.toLocaleLowerCase().includes(clientQuery.toLocaleLowerCase()));
        for (const event of events) {
            const card = document.createElement('article'); card.className = 'client-manager-card';
            const heading = document.createElement('h3'); heading.textContent = event.title;
            const info = document.createElement('p'); info.className = 'hint'; info.textContent = `${event.date || 'Ohne Datum'} · ${event.images.length} Bilder · ${event.active ? 'Freigegeben (lokaler Stand)' : 'Pausiert'}`;
            const tools = document.createElement('div'); tools.className = 'manager-actions';
            tools.append(button('Bearbeiten & Bilder', () => editClient(event)), button('Link kopieren', async () => {
                const link = clientLink(event.id); await navigator.clipboard.writeText(link); notice('Link kopiert. Er funktioniert online nach Commit und Push.');
            }), button('Lokal ansehen ↗', () => window.open('/kunden.html?veranstaltung=' + event.id, '_blank', 'noopener')));
            card.append(heading, info, tools); body.append(card);
        }
        if (!events.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = clientEvents.length ? 'Keine passende Veranstaltung.' : 'Noch keine Kundengalerien. Erstelle eine Veranstaltung und lade die Bilder direkt dort hoch.'; body.append(empty); }
    }
    search.oninput = () => { clientQuery = search.value; cards(); }; cards();
}
function clientLink(id) {
    const value = $('#client-site-url')?.value || localStorage.getItem('noe-client-site-url') || 'https://noe-plain.github.io/';
    const url = new URL(value); if (url.protocol !== 'https:') throw Error('Bitte die HTTPS-Adresse deiner Website eingeben.');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    const link = new URL('kunden.html', url); link.searchParams.set('veranstaltung', id); return link.href;
}
function editClient(original) {
    let event = original ? structuredClone(original) : null;
    let images = event ? [...event.images] : [];
    const el = dialog(event ? 'Kundengalerie bearbeiten' : 'Neue Veranstaltung'); el.classList.add('client-editor-dialog');
    const host = el.querySelector('.manager-dialog-body'), form = document.createElement('form');
    const title = labeled('Veranstaltung', event?.title, { required: true }); title.querySelector('input').maxLength = 160;
    const date = labeled('Datum (optional)', event?.date, { type: 'date' });
    const description = document.createElement('label'); description.textContent = 'Nachricht für die Kundinnen (optional)'; const text = document.createElement('textarea'); text.value = event?.description || ''; description.append(text);
    const password = labeled(event ? 'Neues Passwort (leer lassen zum Beibehalten)' : 'Passwort für diese Veranstaltung', '', { type: 'password', required: !event });
    const passInput = password.querySelector('input'); passInput.minLength = 12; passInput.maxLength = 256; passInput.autocomplete = 'new-password';
    const passTools = document.createElement('div'); passTools.className = 'manager-actions';
    passTools.append(button('Passwort erzeugen', () => { passInput.value = Array.from(crypto.getRandomValues(new Uint8Array(18)), byte => byte.toString(16).padStart(2, '0')).join(''); passInput.type = 'text'; dirty = true; }), button('Anzeigen / verbergen', () => { passInput.type = passInput.type === 'password' ? 'text' : 'password'; }));
    for (const b of passTools.children) b.type = 'button'; password.append(passTools);
    const passHint = document.createElement('p'); passHint.className = 'hint'; passHint.textContent = 'Mindestens 12 Zeichen. Das Passwort wird nicht gespeichert. Bewahre es auf und gib es den Kundinnen getrennt vom Link weiter.';
    const active = document.createElement('label'); active.className = 'client-active-toggle'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = event?.active ?? true; active.append(checkbox, document.createTextNode('Veranstaltung auf der Kundenseite freigeben'));
    const site = labeled('Adresse deiner Website für den Freigabelink', localStorage.getItem('noe-client-site-url') || 'https://noe-plain.github.io/', { type: 'url' }); site.querySelector('input').id = 'client-site-url';
    const privacy = document.createElement('p'); privacy.className = 'hint'; privacy.textContent = 'Titel und Datum erscheinen vor der Passworteingabe. Lade Kundenbilder hier hoch, damit sie nicht in der öffentlichen Mediathek landen. Bereits heruntergeladene Bilder lassen sich durch Pausieren oder ein neues Passwort nicht zurückholen.';
    const message = document.createElement('p'); message.setAttribute('role', 'status'); message.className = 'hint';
    const list = document.createElement('div'); list.className = 'client-manager-images';
    function renderImages() {
        list.replaceChildren();
        const count = document.createElement('strong'); count.textContent = `${images.length} Bilder`; list.append(count);
        images.forEach((image, index) => {
            const row = document.createElement('div'); row.className = 'client-manager-image';
            const img = document.createElement('img'); img.alt = image.name; img.loading = 'lazy'; img.src = `/api/studio/clients/${event.id}/images/${image.id}`;
            const name = document.createElement('span'); name.textContent = `${index + 1}. ${image.name}`;
            const tools = document.createElement('div'); tools.className = 'manager-actions';
            for (const [label, offset] of [['↑', -1], ['↓', 1]]) { const b = button(label, () => { const to = index + offset; [images[index], images[to]] = [images[to], images[index]]; dirty = true; renderImages(); }); b.type = 'button'; b.disabled = index + offset < 0 || index + offset >= images.length; b.setAttribute('aria-label', label === '↑' ? 'Bild nach vorne' : 'Bild nach hinten'); tools.append(b); }
            const remove = button('Entfernen', () => { images.splice(index, 1); dirty = true; renderImages(); }); remove.type = 'button'; tools.append(remove);
            row.append(img, name, tools); list.append(row);
        });
    }
    const files = document.createElement('input'); files.type = 'file'; files.accept = 'image/jpeg,image/png,image/webp,image/avif,image/tiff'; files.multiple = true; files.hidden = true;
    const upload = button('＋ Kundenbilder hochladen', () => files.click(), 'primary'); upload.type = 'button'; upload.disabled = !event;
    const uploadHint = document.createElement('p'); uploadHint.className = 'hint'; uploadHint.textContent = event ? 'JPG, PNG, WebP, AVIF oder TIFF · maximal 40 MB pro Datei. Download als JPG in voller Auflösung.' : 'Speichere zuerst die Veranstaltung. Danach kannst du Bilder hochladen.';
    const save = button(event ? 'Änderungen lokal speichern' : 'Veranstaltung erstellen', () => {}, 'primary'); save.type = 'submit';
    form.append(title, date, description, password, passHint, active, site, privacy, save, message, upload, files, uploadHint, list); host.append(form); renderImages();
    form.addEventListener('input', input => { if (input.target !== files) dirty = true; });
    async function saveEvent() {
        if (!form.reportValidity()) return false;
        clientLink(event?.id || '');
        localStorage.setItem('noe-client-site-url', site.querySelector('input').value);
        message.textContent = 'Galerie wird verschlüsselt und lokal gespeichert …';
        const result = await api('/api/studio/clients', { id: event?.id, revision: event?.revision, title: title.querySelector('input').value, date: date.querySelector('input').value, description: text.value, password: passInput.value, active: checkbox.checked, images: event ? images.map(image => image.id) : undefined });
        event = result; images = [...event.images]; password.firstChild.textContent = 'Neues Passwort (leer lassen zum Beibehalten)'; passInput.value = ''; passInput.required = false;
        save.textContent = 'Änderungen lokal speichern'; upload.disabled = false; uploadHint.textContent = 'Bilder direkt hier hochladen. Veröffentlichung über „Änderungen prüfen“.';
        saved(); renderImages(); message.textContent = 'Lokal gespeichert. Für die Online-Freigabe anschliessend Commit & Push durchführen.';
        clientEvents = await api('/api/studio/clients'); if (type === 'clients') renderClients(); return true;
    }
    async function run(fn) {
        managerBusy = true; for (const b of form.querySelectorAll('button')) b.disabled = true;
        try { await fn(); } catch (error) { message.textContent = error.message; message.classList.add('error'); }
        finally { managerBusy = false; for (const b of form.querySelectorAll('button')) b.disabled = false; upload.disabled = !event; renderImages(); }
    }
    form.onsubmit = event => { event.preventDefault(); run(saveEvent); };
    files.onchange = () => run(async () => {
        const selected = [...files.files]; if (!selected.length) return;
        if (dirty && !await saveEvent()) return;
        const body = new FormData(); body.append('revision', event.revision); for (const file of selected) body.append('images', file);
        message.textContent = `${selected.length} Bilder werden hochgeladen …`;
        const result = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest(); xhr.open('POST', `/api/studio/clients/${event.id}/upload`); xhr.setRequestHeader('X-CMS-Token', token);
            xhr.upload.onprogress = progress => { if (progress.lengthComputable) message.textContent = `${Math.round(progress.loaded / progress.total * 100)} % übertragen`; };
            xhr.upload.onload = () => message.textContent = 'Bilder werden optimiert und verschlüsselt. Bitte warten …';
            xhr.onload = () => { try { const data = JSON.parse(xhr.responseText); xhr.status < 300 ? resolve(data) : reject(Error(data.error || 'Upload fehlgeschlagen.')); } catch { reject(Error('Upload fehlgeschlagen.')); } };
            xhr.onerror = () => reject(Error('Das lokale CMS ist nicht erreichbar.')); xhr.send(body);
        });
        event = result; images = [...event.images]; saved(); renderImages(); files.value = ''; message.textContent = 'Bilder verschlüsselt und lokal gespeichert. Veröffentlichung über „Änderungen prüfen“.';
        clientEvents = await api('/api/studio/clients'); if (type === 'clients') renderClients();
    });
}
