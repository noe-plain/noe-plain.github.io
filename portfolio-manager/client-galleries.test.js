const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const sharp = require('sharp');
const { createZip } = require('../portfolio/kunden/zip');

async function open(entry, password, dir) {
    const base = await crypto.webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.webcrypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(entry.salt, 'base64'), iterations: entry.iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const decrypt = async file => { const bytes = await fsp.readFile(path.join(dir, file)); return crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12)); };
    return { gallery: JSON.parse(new TextDecoder().decode(await decrypt(entry.bundle))), decrypt };
}
test('Secure customer upload, browser-compatible password, updates and pause', async t => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'noe-clients-')); const manager = path.join(root, 'portfolio-manager'); await fsp.mkdir(manager);
    for (const file of ['studio.js', 'media-library.js', 'client-galleries.js', 'photo-metadata.js']) await fsp.copyFile(path.join(__dirname, file), path.join(manager, file));
    await fsp.mkdir(path.join(root, 'portfolio/kunden'), { recursive: true }); await fsp.copyFile(path.join(__dirname, '../portfolio/kunden/links.js'), path.join(root, 'portfolio/kunden/links.js'));
    const { execFileSync } = require('node:child_process');
    execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' }); execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:noe-plain/noe-plain.github.io.git'], { cwd: root });
    const app = express(); require(path.join(manager, 'studio'))(app, root);
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fsp.rm(root, { recursive: true, force: true }); });
    const origin = 'http://127.0.0.1:' + server.address().port, token = (await (await fetch(origin + '/api/studio/session')).json()).token;
    const send = async data => fetch(origin + '/api/studio/clients', { method: 'POST', headers: { Origin: origin, 'X-CMS-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    assert.equal((await (await fetch(origin + '/api/studio/clients/site')).json()).url, 'https://noe-plain.github.io/');
    execFileSync('git', ['remote', 'set-url', 'origin', 'https://github.com/noe-plain/project.git'], { cwd: root });
    assert.equal((await (await fetch(origin + '/api/studio/clients/site')).json()).url, 'https://noe-plain.github.io/project/');
    await fsp.writeFile(path.join(root, 'CNAME'), 'www.noeplain.ch\n');
    assert.equal((await (await fetch(origin + '/api/studio/clients/site')).json()).url, 'https://www.noeplain.ch/'); await fsp.unlink(path.join(root, 'CNAME'));
    const unauthorized = await fetch(origin + '/api/studio/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(unauthorized.status, 403);
    assert.equal((await send({ title: 'Anlass', password: 'kurz' })).status, 400);
    let result = await send({ title: 'Firmenfest', date: '2026-10-02', password: 'Ein-langes-Testpasswort' }); assert.equal(result.status, 200);
    let event = await result.json(); assert.equal(event.key, undefined); assert.equal(event.salt, undefined); assert.equal(event.slug, 'firmenfest');
    assert.equal((await send({ title: 'Anderer Anlass', slug: 'firmenfest', password: 'Ein-langes-Testpasswort' })).status, 409);
    assert.equal((await send({ title: 'Anderer Anlass', slug: '../bad', password: 'Ein-langes-Testpasswort' })).status, 400);
    result = await send({ ...event, title: 'Neuer Titel', slug: undefined, password: '' }); assert.equal(result.status, 200); event = await result.json(); assert.equal(event.slug, 'firmenfest');
    result = await send({ ...event, slug: 'firmenfest-2026', password: '' }); assert.equal(result.status, 200); event = await result.json();
    assert.equal(JSON.parse(await fsp.readFile(path.join(root, 'portfolio/kunden/data/index.json')))[0].slug, 'firmenfest-2026');
    const form = new FormData(); form.append('revision', event.revision);
    const image = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#ddcfe6' } }).jpeg().withExif({ IFD0: { Model: 'ILCE-7CM2', Artist: 'PRIVATE ARTIST' }, IFD2: { FNumber: '28/10', ISOSpeedRatings: '400' } }).toBuffer();
    form.append('images', new Blob([image], { type: 'image/jpeg' }), 'Testbild.jpg');
    result = await fetch(origin + `/api/studio/clients/${event.id}/upload`, { method: 'POST', headers: { Origin: origin, 'X-CMS-Token': token }, body: form }); assert.equal(result.status, 200); event = await result.json(); assert.equal(event.images.length, 1);
    const dir = path.join(root, 'portfolio/kunden/data'); let entries = JSON.parse(await fsp.readFile(path.join(dir, 'index.json'))); let entry = entries[0];
    await assert.rejects(open(entry, 'Falsches-Passwort', dir));
    const unlocked = await open(entry, 'Ein-langes-Testpasswort', dir); assert.equal(unlocked.gallery.images[0].name, 'Testbild.jpg');
    const full = await unlocked.decrypt(entry.bundle.replace('gallery.bin', unlocked.gallery.images[0].full));
    const meta = await sharp(Buffer.from(full)).metadata(); assert.equal(meta.width, 120); assert.ok(!meta.exif.includes(Buffer.from('PRIVATE ARTIST')));
    const allPublic = await fsp.readdir(path.join(dir, event.id, event.release || entry.bundle.split('/')[1])); assert.ok(allPublic.every(file => file.endsWith('.bin')));
    assert.ok(!(await fsp.readFile(path.join(dir, 'index.json'), 'utf8')).includes('Testbild'));
    assert.ok(!(await (await fetch(origin + '/api/studio/clients')).text()).includes('Ein-langes-Testpasswort'));
    const stale = await send({ ...event, revision: 'old', password: '' }); assert.equal(stale.status, 409);
    const oldEntry = entry;
    result = await send({ ...event, images: event.images.map(i => i.id), password: 'Ein-neues-Testpasswort' }); assert.equal(result.status, 200); event = await result.json();
    entries = JSON.parse(await fsp.readFile(path.join(dir, 'index.json'))); entry = entries[0];
    await assert.rejects(open(entry, 'Ein-langes-Testpasswort', dir)); await open(entry, 'Ein-neues-Testpasswort', dir);
    assert.ok(!fs.existsSync(path.join(dir, oldEntry.bundle)));
    result = await send({ ...event, images: event.images.map(i => i.id), active: false, password: '' }); assert.equal(result.status, 200);
    assert.deepEqual(JSON.parse(await fsp.readFile(path.join(dir, 'index.json'))), []); assert.ok(!fs.existsSync(path.join(dir, entry.bundle)));
});
test('ZIP selection preserves bytes and disambiguates duplicate filenames', async () => {
    const zip = createZip([{ name: 'Bild.jpg', data: new Uint8Array([1, 2, 3]) }, { name: 'Bild.jpg', data: new Uint8Array([4, 5]) }]);
    const file = path.join(os.tmpdir(), crypto.randomUUID() + '.zip'); await fsp.writeFile(file, Buffer.from(await zip.arrayBuffer()));
    try {
        const { execFileSync } = require('node:child_process');
        const result = execFileSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==["Bild.jpg","Bild-2.jpg"]; assert z.read("Bild.jpg")==bytes([1,2,3]); assert z.testzip() is None', file]);
        assert.equal(result.length, 0);
    } finally { await fsp.rm(file); }
});

test('Stable named links, legacy ID links and unique default names', () => {
    const { assignSlugs, slugify, galleryLink, selectedEvent } = require('../portfolio/kunden/links');
    const events = assignSlugs([{ id: 'a', title: 'Eröffnungsfest Zürich' }, { id: 'b', title: 'Eröffnungsfest Zürich' }, { id: 'c', title: 'Neuer Titel', slug: 'kundenfest' }]);
    assert.equal(slugify('Ä Ö Ü ß é'), 'ae-oe-ue-ss-e');
    assert.equal(events[0].slug, 'eroeffnungsfest-zuerich'); assert.equal(events[1].slug, 'eroeffnungsfest-zuerich-2');
    assert.equal(galleryLink('https://example.com/project/', events[0].slug), 'https://example.com/project/kunden.html?eroeffnungsfest-zuerich');
    assert.equal(galleryLink('https://example.com/'), 'https://example.com/kunden.html');
    assert.equal(selectedEvent('?eroeffnungsfest-zuerich', events).id, 'a');
    assert.equal(selectedEvent('?veranstaltung=b', events).id, 'b');
    assert.equal(selectedEvent('?kundenfest', events).id, 'c');
    assert.equal(selectedEvent('?%invalid', events), null);
    assert.equal(assignSlugs([{ ...events[0], title: 'Geänderter Titel' }])[0].slug, events[0].slug);
});

test('Legacy names are persisted consistently with paused events, without changing encrypted bundles', async t => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'noe-legacy-links-'));
    t.after(() => fsp.rm(root, { recursive: true, force: true }));
    const privateDir = path.join(root, 'portfolio-manager/.client-galleries'), publicDir = path.join(root, 'portfolio/kunden/data');
    await fsp.mkdir(privateDir, { recursive: true }); await fsp.mkdir(publicDir, { recursive: true });
    const events = [{ id: 'a', title: 'Fest', active: false, revision: 'old-a' }, { id: 'b', title: 'Fest', active: true, revision: 'old-b' }];
    await fsp.writeFile(path.join(privateDir, 'events.json'), JSON.stringify(events));
    await fsp.writeFile(path.join(publicDir, 'index.json'), JSON.stringify([{ id: 'b', title: 'Fest', bundle: 'same/gallery.bin' }]));
    require('./client-galleries').register(express(), root, fn => fn);
    const stored = JSON.parse(await fsp.readFile(path.join(privateDir, 'events.json'))), index = JSON.parse(await fsp.readFile(path.join(publicDir, 'index.json')));
    assert.equal(stored[0].slug, 'fest'); assert.equal(stored[1].slug, 'fest-2'); assert.equal(index[0].slug, stored[1].slug); assert.equal(index[0].bundle, 'same/gallery.bin');
    require('./client-galleries').register(express(), root, fn => fn);
    assert.deepEqual(JSON.parse(await fsp.readFile(path.join(privateDir, 'events.json'))), stored);
});

test('Customer upload accepts 500 files at once and rejects larger batches or a full gallery', async t => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'noe-clients-500-'));
    const app = express(); require('./studio')(app, root);
    const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fsp.rm(root, { recursive: true, force: true }); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const token = (await (await fetch(origin + '/api/studio/session')).json()).token;
    const headers = { Origin: origin, 'X-CMS-Token': token };
    const response = await fetch(origin + '/api/studio/clients', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '500 Bilder', password: 'Ein-langes-Testpasswort' }) });
    assert.equal(response.status, 200); let event = await response.json();
    const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ddcfe6' } }).jpeg().toBuffer();
    async function upload(count, operation = crypto.randomUUID()) {
        const form = new FormData(); form.append('operation', operation); form.append('revision', event.revision);
        for (let n = 0; n < count; n++) form.append('images', new Blob([jpeg], { type: 'image/jpeg' }), `Bild-${n + 1}.jpg`);
        return fetch(origin + `/api/studio/clients/${event.id}/upload`, { method: 'POST', headers, body: form });
    }
    const oversized = await upload(501); assert.equal(oversized.status, 400); assert.match((await oversized.json()).error, /Pro Upload.*500/);
    const operation = crypto.randomUUID(), samples = []; let finished = false;
    const pending = upload(500, operation).finally(() => { finished = true; });
    while (!finished) {
        const progress = await (await fetch(origin + '/api/studio/clients/progress?operation=' + operation)).json();
        if (progress) samples.push(progress);
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    const accepted = await pending; assert.equal(accepted.status, 200); event = await accepted.json(); assert.equal(event.images.length, 500);
    assert.ok(samples.some(p => p.stage === 'optimizing' && p.total === 500));
    assert.ok(samples.some(p => p.stage === 'encrypting' && p.total === 500 && p.completed > 0 && p.completed < 500));
    for (const phase of ['optimizing', 'encrypting']) {
        const values = samples.filter(p => p.stage === phase).map(p => p.completed);
        assert.ok(values.every((value, index) => value >= 0 && value <= 500 && (!index || value >= values[index - 1])));
    }
    const done = await (await fetch(origin + '/api/studio/clients/progress?operation=' + operation)).json(); assert.equal(done.stage, 'done'); assert.equal(done.active, false);
    assert.deepEqual(Object.keys(done).sort(), ['active', 'completed', 'operation', 'stage', 'total']);
    assert.equal(await (await fetch(origin + '/api/studio/clients/progress?operation=' + crypto.randomUUID())).json(), null);
    const index = JSON.parse(await fsp.readFile(path.join(root, 'portfolio/kunden/data/index.json'))); assert.equal(index[0].count, 500);
    const additional = await upload(1); assert.equal(additional.status, 400); assert.match((await additional.json()).error, /Galerie.*500/);
    const current = await (await fetch(origin + '/api/studio/clients')).json(); assert.equal(current[0].images.length, 500); assert.equal(current[0].revision, event.revision);
});
