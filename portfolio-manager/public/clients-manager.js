'use strict';
let clientEvents = [], clientQuery = '', clientSite = '';
async function loadClients() {
    const root = $('#management'); root.innerHTML = '<p class="hint">Kundengalerien werden geladen …</p>';
    try { const [events, site] = await Promise.all([api('/api/studio/clients'), api('/api/studio/clients/site')]); clientEvents = events; clientSite = site.url; if (type === 'clients') renderClients(); }
    catch (error) { root.textContent = error.message; root.append(button('Erneut versuchen', loadClients)); }
}
function renderClients() {
    const root = managerShell('KUNDENGALERIEN', 'Bilder für deine Kundinnen');
    root.querySelector('.manager-heading').append(button('＋ Veranstaltung erstellen', () => editClient(), 'primary'));
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Eigener Upload mit Passwortschutz. Veranstaltungsnamen und Datum sind öffentlich sichtbar. Bilder werden verschlüsselt bereitgestellt und danach über „Änderungen prüfen“ veröffentlicht.';
    root.querySelector('.manager-toolbar').append(hint);
    const access = document.createElement('div'); access.className = 'client-access-links';
    const entry = document.createElement('a'); entry.href = ClientGalleryLinks.galleryLink(clientSite); entry.target = '_blank'; entry.rel = 'noopener'; entry.textContent = 'Feste Kundenseite: ' + entry.href;
    access.append(entry, button('Seitenlink kopieren', async () => { await navigator.clipboard.writeText(entry.href); notice('Link zur Kundenseite kopiert.'); })); root.querySelector('.manager-toolbar').append(access);
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
                const link = clientLink(event.slug); await navigator.clipboard.writeText(link); notice('Link kopiert. Er funktioniert online nach Commit und Push.');
            }), button('Lokal ansehen ↗', () => window.open('/kunden.html?' + encodeURIComponent(event.slug), '_blank', 'noopener')));
            card.append(heading, info, tools); body.append(card);
        }
        if (!events.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = clientEvents.length ? 'Keine passende Veranstaltung.' : 'Noch keine Kundengalerien. Erstelle eine Veranstaltung und lade die Bilder direkt dort hoch.'; body.append(empty); }
    }
    search.oninput = () => { clientQuery = search.value; cards(); }; cards();
}
function clientLink(slug) { return ClientGalleryLinks.galleryLink(clientSite, slug); }
function editClient(original) {
    let event = original ? structuredClone(original) : null;
    let images = event ? [...event.images] : [];
    const el = dialog(event ? 'Kundengalerie bearbeiten' : 'Neue Veranstaltung'); el.classList.add('client-editor-dialog');
    const host = el.querySelector('.manager-dialog-body'), form = document.createElement('form');
    const title = labeled('Veranstaltung', event?.title, { required: true }); title.querySelector('input').maxLength = 160;
    const slug = labeled('Name für den Direktlink', event?.slug || '', { required: true });
    const slugInput = slug.querySelector('input'); slugInput.maxLength = 80; slugInput.pattern = '[a-z0-9]+(-[a-z0-9]+)*'; slugInput.placeholder = 'zum-beispiel-sommerfest-2026';
    let customSlug = !!event;
    const linkPreview = document.createElement('a'); linkPreview.className = 'client-link-preview'; linkPreview.target = '_blank'; linkPreview.rel = 'noopener';
    function updateLink() { linkPreview.href = clientLink(slugInput.value); linkPreview.textContent = linkPreview.href; }
    title.querySelector('input').addEventListener('input', () => { if (!customSlug) slugInput.value = ClientGalleryLinks.slugify(title.querySelector('input').value); updateLink(); });
    slugInput.addEventListener('input', () => { customSlug = true; updateLink(); });
    slugInput.addEventListener('change', () => { slugInput.value = ClientGalleryLinks.slugify(slugInput.value); updateLink(); }); updateLink();
    const linkHint = document.createElement('p'); linkHint.className = 'hint'; linkHint.textContent = 'Die Website-Adresse wird automatisch bestimmt. Der Linkname bleibt bei Titeländerungen gleich. Nur kleine Buchstaben, Zahlen und Bindestriche.';
    const date = labeled('Datum (optional)', event?.date, { type: 'date' });
    const description = document.createElement('label'); description.textContent = 'Nachricht für die Kundinnen (optional)'; const text = document.createElement('textarea'); text.value = event?.description || ''; description.append(text);
    const password = labeled(event ? 'Neues Passwort (leer lassen zum Beibehalten)' : 'Passwort für diese Veranstaltung', '', { type: 'password', required: !event });
    const passInput = password.querySelector('input'); passInput.minLength = 12; passInput.maxLength = 256; passInput.autocomplete = 'new-password';
    const passTools = document.createElement('div'); passTools.className = 'manager-actions';
    passTools.append(button('Passwort erzeugen', () => { passInput.value = Array.from(crypto.getRandomValues(new Uint8Array(18)), byte => byte.toString(16).padStart(2, '0')).join(''); passInput.type = 'text'; dirty = true; }), button('Anzeigen / verbergen', () => { passInput.type = passInput.type === 'password' ? 'text' : 'password'; }));
    for (const b of passTools.children) b.type = 'button'; password.append(passTools);
    const passHint = document.createElement('p'); passHint.className = 'hint'; passHint.textContent = 'Mindestens 12 Zeichen. Das Passwort wird nicht gespeichert. Bewahre es auf und gib es den Kundinnen getrennt vom Link weiter.';
    const active = document.createElement('label'); active.className = 'client-active-toggle'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = event?.active ?? true; active.append(checkbox, document.createTextNode('Veranstaltung auf der Kundenseite freigeben'));
    const privacy = document.createElement('p'); privacy.className = 'hint'; privacy.textContent = 'Titel und Datum erscheinen vor der Passworteingabe. Lade Kundenbilder hier hoch, damit sie nicht in der öffentlichen Mediathek landen. Bereits heruntergeladene Bilder lassen sich durch Pausieren oder ein neues Passwort nicht zurückholen.';
    const message = document.createElement('p'); message.setAttribute('role', 'status'); message.className = 'hint';
    const operationProgress = document.createElement('div'); operationProgress.className = 'client-operation-progress'; operationProgress.hidden = true;
    const progressHeading = document.createElement('div'); progressHeading.className = 'client-operation-heading';
    const progressText = document.createElement('span'); progressText.setAttribute('role', 'status'); progressText.setAttribute('aria-live', 'polite');
    const progressPercent = document.createElement('span'); progressPercent.setAttribute('aria-hidden', 'true');
    const progressBar = document.createElement('progress'); progressBar.setAttribute('aria-label', 'Verarbeitung der Kundenbilder');
    progressHeading.append(progressText, progressPercent); operationProgress.append(progressHeading, progressBar);
    function showProgress(label, completed = null, total = 0) {
        operationProgress.hidden = false; progressBar.hidden = false; if (progressText.textContent !== label) progressText.textContent = label;
        if (completed === null || !total) { progressBar.removeAttribute('value'); progressPercent.textContent = ''; }
        else { progressBar.max = total; progressBar.value = completed; progressPercent.textContent = Math.round(completed / total * 100) + ' %'; }
    }
    async function trackOperation(operation, label, work) {
        let stopped = false, timer;
        operationProgress.classList.remove('is-error'); showProgress(label); operationProgress.scrollIntoView({ block: 'nearest' });
        async function poll() {
            try {
                const result = await api('/api/studio/clients/progress?operation=' + encodeURIComponent(operation));
                if (stopped || !el.isConnected || !result) return;
                const names = { preparing: 'Galerie wird vorbereitet …', optimizing: 'Bilder optimieren', encrypting: 'Bilder verschlüsseln', saving: 'Galerie lokal speichern …', done: 'Verarbeitung abgeschlossen', failed: 'Verarbeitung fehlgeschlagen' };
                if (result.stage === 'done') showProgress(names.done, 1, 1);
                else showProgress(names[result.stage] + (result.total ? ` · ${result.completed} von ${result.total} Bildern fertig` : ''), result.completed, result.total);
            } catch { /* The upload request reports connection errors; keep its current progress. */ }
            finally { if (!stopped && el.isConnected) timer = setTimeout(poll, 500); }
        }
        poll();
        try { const result = await work(); showProgress('Verarbeitung abgeschlossen · lokal gespeichert', 1, 1); return result; }
        catch (error) { operationProgress.classList.add('is-error'); progressBar.hidden = true; progressPercent.textContent = ''; progressText.textContent = 'Verarbeitung fehlgeschlagen'; throw error; }
        finally { stopped = true; clearTimeout(timer); }
    }
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
    const uploadHint = document.createElement('p'); uploadHint.className = 'hint'; uploadHint.textContent = event ? 'Bis zu 500 Bilder pro Upload und Veranstaltung · maximal 40 MB pro Datei. JPG, PNG, WebP, AVIF oder TIFF; Download als JPG in voller Auflösung.' : 'Speichere zuerst die Veranstaltung. Danach kannst du Bilder hochladen.';
    const save = button(event ? 'Änderungen lokal speichern' : 'Veranstaltung erstellen', () => {}, 'primary'); save.type = 'submit';
    form.append(title, slug, linkPreview, linkHint, date, description, password, passHint, active, privacy, save, message, operationProgress, upload, files, uploadHint, list); host.append(form); renderImages();
    form.addEventListener('input', input => { if (input.target !== files) dirty = true; });
    async function saveEvent() {
        if (!form.reportValidity()) return false;
        message.textContent = 'Galerie wird verschlüsselt und lokal gespeichert …';
        const operation = crypto.randomUUID();
        const result = await trackOperation(operation, 'Galerie wird vorbereitet …', () => api('/api/studio/clients', { operation, id: event?.id, revision: event?.revision, title: title.querySelector('input').value, slug: slugInput.value, date: date.querySelector('input').value, description: text.value, password: passInput.value, active: checkbox.checked, images: event ? images.map(image => image.id) : undefined }));
        event = result; slugInput.value = event.slug; customSlug = true; updateLink(); images = [...event.images]; password.firstChild.textContent = 'Neues Passwort (leer lassen zum Beibehalten)'; passInput.value = ''; passInput.required = false;
        save.textContent = 'Änderungen lokal speichern'; upload.disabled = false; uploadHint.textContent = 'Bis zu 500 Bilder pro Veranstaltung · maximal 40 MB pro Datei. Veröffentlichung über „Änderungen prüfen“.';
        saved(); renderImages(); message.textContent = 'Lokal gespeichert. Für die Online-Freigabe anschliessend Commit & Push durchführen.';
        clientEvents = await api('/api/studio/clients'); if (type === 'clients') renderClients(); return true;
    }
    async function run(fn) {
        message.classList.remove('error'); operationProgress.hidden = true;
        managerBusy = true; for (const b of form.querySelectorAll('button')) b.disabled = true;
        try { await fn(); } catch (error) { message.textContent = error.message; message.classList.add('error'); }
        finally { managerBusy = false; for (const b of form.querySelectorAll('button')) b.disabled = false; upload.disabled = !event; renderImages(); }
    }
    form.onsubmit = event => { event.preventDefault(); run(saveEvent); };
    files.onchange = () => run(async () => {
        const selected = [...files.files]; if (!selected.length) return;
        if (selected.length > 500 || images.length + selected.length > 500) {
            files.value = '';
            throw Error(`Eine Veranstaltung kann höchstens 500 Bilder enthalten. Du kannst noch ${Math.max(0, 500 - images.length)} Bilder hinzufügen.`);
        }
        if (dirty && !await saveEvent()) return;
        const operation = crypto.randomUUID();
        const body = new FormData(); body.append('operation', operation); body.append('revision', event.revision); for (const file of selected) body.append('images', file);
        message.textContent = `${selected.length} Bilder werden hochgeladen …`;
        const result = await trackOperation(operation, `${selected.length} Bilder werden übertragen …`, () => new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest(); xhr.open('POST', `/api/studio/clients/${event.id}/upload`); xhr.setRequestHeader('X-CMS-Token', token);
            xhr.upload.onprogress = progress => { if (progress.lengthComputable) { message.textContent = `${Math.round(progress.loaded / progress.total * 100)} % übertragen`; showProgress(`${selected.length} Bilder werden übertragen …`, progress.loaded, progress.total); } };
            xhr.upload.onload = () => { message.textContent = 'Bilder werden optimiert und verschlüsselt …'; showProgress('Bilder werden optimiert …'); };
            xhr.onload = () => { try { const data = JSON.parse(xhr.responseText); xhr.status < 300 ? resolve(data) : reject(Error(data.error || 'Upload fehlgeschlagen.')); } catch { reject(Error('Upload fehlgeschlagen.')); } };
            xhr.onerror = () => reject(Error('Das lokale CMS ist nicht erreichbar.')); xhr.send(body);
        }));
        event = result; images = [...event.images]; saved(); renderImages(); files.value = ''; message.textContent = 'Bilder verschlüsselt und lokal gespeichert. Veröffentlichung über „Änderungen prüfen“.';
        clientEvents = await api('/api/studio/clients'); if (type === 'clients') renderClients();
    });
}
