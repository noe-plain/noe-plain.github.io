'use strict';
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const sharp = require('sharp');
const multer = require('multer');
const { photoMetadata } = require('./photo-metadata');
const derive = promisify(crypto.pbkdf2);
const iterations = 310000;
const uuid = /^[a-f0-9-]{36}$/;
function seal(data, key) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    return Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]);
}
function register(app, root, route) {
    const privateDir = path.join(root, 'portfolio-manager/.client-galleries');
    const publicDir = path.join(root, 'portfolio/kunden/data');
    const stateFile = path.join(privateDir, 'events.json');
    const fail = (text, status = 400) => Object.assign(new Error(text), { status });
    let busy = false;
    async function exclusive(fn) { if (busy) throw fail('Eine Kundengalerie wird gerade verarbeitet. Bitte warten.', 409); busy = true; try { return await fn(); } finally { busy = false; } }
    function read() { return fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : []; }
    function event(id) { const found = read().find(e => e.id === id); if (!found) throw fail('Veranstaltung nicht gefunden.', 404); return found; }
    const safe = e => ({ id: e.id, title: e.title, date: e.date, description: e.description, active: e.active, revision: e.revision, images: e.images.map(({ id, name, width, height, size }) => ({ id, name, width, height, size })) });
    async function atomic(file, value) { await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 }); const tmp = file + '.cms-tmp'; await fsp.writeFile(tmp, value, { mode: 0o600 }); await fsp.rename(tmp, file); }
    async function publish(next, all) {
        await fsp.mkdir(publicDir, { recursive: true });
        const destination = path.join(publicDir, next.id), release = crypto.randomUUID();
        const temp = path.join(privateDir, 'release-' + release);
        try {
            if (next.active) {
                await fsp.mkdir(temp, { recursive: true });
                const key = Buffer.from(next.key, 'base64'), images = [];
                for (const image of next.images) {
                    const source = path.join(privateDir, next.id, image.id + '.jpg');
                    const original = await fsp.readFile(source);
                    const preview = await sharp(original).resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
                    const thumb = await sharp(original).resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
                    for (const [kind, buffer] of [['full', original], ['preview', preview], ['thumb', thumb]]) await fsp.writeFile(path.join(temp, image.id + '-' + kind + '.bin'), seal(buffer, key));
                    images.push({ ...image, full: image.id + '-full.bin', preview: image.id + '-preview.bin', thumb: image.id + '-thumb.bin' });
                }
                await fsp.writeFile(path.join(temp, 'gallery.bin'), seal(Buffer.from(JSON.stringify({ title: next.title, description: next.description, images })), key));
                await fsp.mkdir(destination, { recursive: true });
                await fsp.rename(temp, path.join(destination, release));
            }
            next.release = release; next.revision = crypto.randomUUID();
            const entries = all.filter(e => e.active).map(e => ({ id: e.id, title: e.title, date: e.date, count: e.images.length, salt: e.salt, iterations, bundle: e.id + '/' + e.release + '/gallery.bin' }));
            await atomic(stateFile, JSON.stringify(all, null, 2));
            await atomic(path.join(publicDir, 'index.json'), JSON.stringify(entries, null, 2));
            // Old encrypted releases must disappear from the current published tree.
            if (fs.existsSync(destination)) for (const name of await fsp.readdir(destination)) if (!next.active || name !== release) await fsp.rm(path.join(destination, name), { recursive: true, force: true });
            return safe(next);
        } finally { await fsp.rm(temp, { recursive: true, force: true }); }
    }
    function validate(req, all) {
        const id = req.body.id;
        let next = id ? all.find(e => e.id === id) : null;
        if (id && !next) throw fail('Veranstaltung nicht gefunden.', 404);
        if (next && req.body.revision !== next.revision) throw fail('Die Veranstaltung wurde inzwischen geändert. Bitte neu laden.', 409);
        const title = String(req.body.title || '').trim();
        if (!title || title.length > 160) throw fail('Bitte einen Titel mit höchstens 160 Zeichen eingeben.');
        const date = String(req.body.date || '');
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('Ungültiges Datum.');
        const password = req.body.password;
        if ((!next || password) && (typeof password !== 'string' || password.length < 12 || password.length > 256)) throw fail('Das Passwort muss mindestens 12 Zeichen haben.');
        if (!next) { next = { id: crypto.randomUUID(), images: [], active: true }; all.push(next); }
        Object.assign(next, { title, date, description: String(req.body.description || '').slice(0, 2000), active: req.body.active !== false });
        if (req.body.images !== undefined) {
            if (!Array.isArray(req.body.images) || req.body.images.some(id => !next.images.some(image => image.id === id)) || new Set(req.body.images).size !== req.body.images.length) throw fail('Ungültige Bildauswahl.');
            next.images = req.body.images.map(id => next.images.find(image => image.id === id));
        }
        return next;
    }
    app.get('/api/studio/clients', route(async (req, res) => res.json(read().map(safe))));
    app.post('/api/studio/clients', route(async (req, res) => res.json(await exclusive(async () => {
        const all = read(), next = validate(req, all);
        if (req.body.password) { const salt = crypto.randomBytes(16); next.salt = salt.toString('base64'); next.key = (await derive(req.body.password, salt, iterations, 32, 'sha256')).toString('base64'); }
        return publish(next, all);
    }))));
    const upload = multer({ dest: path.join(privateDir, 'temp'), limits: { fileSize: 40 * 1024 * 1024, files: 100 }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|heic|heif|tiff)$/.test(file.mimetype)) }).array('images', 100);
    app.post('/api/studio/clients/:id/upload', (req, res) => upload(req, res, async error => {
        const files = req.files || [], created = [];
        try {
            if (error) throw fail(error.code === 'LIMIT_FILE_SIZE' ? 'Ein Bild ist grösser als 40 MB.' : error.message);
            const result = await exclusive(async () => {
                const all = read(), next = all.find(e => e.id === req.params.id);
                if (!next) throw fail('Veranstaltung nicht gefunden.', 404);
                if (req.body.revision !== next.revision) throw fail('Die Veranstaltung wurde inzwischen geändert. Bitte neu laden.', 409);
                if (!files.length) throw fail('Bitte unterstützte Bilddateien auswählen (JPG, PNG, WebP, AVIF oder TIFF).');
                if (next.images.length + files.length > 500) throw fail('Eine Galerie kann höchstens 500 Bilder enthalten.');
                await fsp.mkdir(path.join(privateDir, next.id), { recursive: true, mode: 0o700 });
                for (const file of files) {
                    const meta = await sharp(file.path).metadata(), id = crypto.randomUUID();
                    let pipeline = sharp(file.path).rotate().flatten({ background: '#fff' });
                    const exif = photoMetadata(meta.exif); if (Object.keys(exif).length) pipeline = pipeline.withExif(exif);
                    const buffer = await pipeline.jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
                    if (buffer.length > 90 * 1024 * 1024) throw fail('Das optimierte Bild ist zu gross für GitHub. Bitte eine kleinere Datei verwenden.');
                    const target = path.join(privateDir, next.id, id + '.jpg'); await fsp.writeFile(target, buffer, { mode: 0o600 }); created.push(target);
                    const out = await sharp(buffer).metadata();
                    const rawName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const name = path.parse(path.basename(rawName.replace(/\\/g, '/'))).name.replace(/[\x00-\x1f]/g, '').slice(0, 160) + '.jpg';
                    next.images.push({ id, name, width: out.width, height: out.height, size: buffer.length });
                }
                return publish(next, all);
            });
            res.json(result);
        } catch (error) {
            for (const file of created) await fsp.rm(file, { force: true });
            res.status(error.status || 400).json({ error: error.message });
        } finally { for (const file of files) await fsp.rm(file.path, { force: true }); }
    }));
    app.get('/api/studio/clients/:id/images/:image', route(async (req, res) => {
        if (!uuid.test(req.params.id) || !uuid.test(req.params.image) || !event(req.params.id).images.some(i => i.id === req.params.image)) throw fail('Bild nicht gefunden.', 404);
        res.type('webp').send(await sharp(path.join(privateDir, req.params.id, req.params.image + '.jpg')).resize({ width: 240, height: 240, fit: 'inside' }).webp().toBuffer());
    }));
    app.get('/kunden.html', (req, res) => res.sendFile(path.join(root, 'kunden.html')));
    app.get('/common.js', (req, res) => res.sendFile(path.join(root, 'common.js')));
}
module.exports = { register, seal, iterations };
