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
    const app = express(); require(path.join(manager, 'studio'))(app, root);
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fsp.rm(root, { recursive: true, force: true }); });
    const origin = 'http://127.0.0.1:' + server.address().port, token = (await (await fetch(origin + '/api/studio/session')).json()).token;
    const send = async data => fetch(origin + '/api/studio/clients', { method: 'POST', headers: { Origin: origin, 'X-CMS-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const unauthorized = await fetch(origin + '/api/studio/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(unauthorized.status, 403);
    assert.equal((await send({ title: 'Anlass', password: 'kurz' })).status, 400);
    let result = await send({ title: 'Firmenfest', date: '2026-10-02', password: 'Ein-langes-Testpasswort' }); assert.equal(result.status, 200);
    let event = await result.json(); assert.equal(event.key, undefined); assert.equal(event.salt, undefined);
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
