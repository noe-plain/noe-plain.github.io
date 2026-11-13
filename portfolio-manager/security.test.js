'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { copyRuntime } = require('./test-support');

test('Media boundaries, exact deletion, private originals, active uploads and preview-origin isolation', async t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'noe-security-')), root = path.join(temp, 'site');
    const manager = copyRuntime(root);
    fs.mkdirSync(path.join(root, 'portfolio/projekte'), { recursive: true });
    fs.writeFileSync(path.join(root, 'portfolio/projekte/designs.json'), '[]');
    fs.writeFileSync(path.join(root, 'index.html'), '<html><body>Original</body></html>');
    fs.writeFileSync(path.join(temp, 'outside.txt'), 'do not move');
    const app = require(path.join(manager, 'server'));
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    t.after(async () => { await app.locals.closePreview(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(temp, { recursive: true, force: true }); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const token = (await (await fetch(origin + '/api/studio/session')).json()).token;
    const headers = { Origin: origin, 'X-CMS-Token': token };
    const json = (url, body, method = 'POST') => fetch(origin + url, { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const upload = (bytes, name, mime = 'image/png', folder = 'photography') => {
        const form = new FormData(); form.append('file', new Blob([bytes], { type: mime }), name); form.append('folder', folder);
        return fetch(origin + '/api/upload', { method: 'POST', headers, body: form });
    };
    const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#80539a' } }).png().toBuffer();
    assert.equal((await upload(png, 'Bild.png')).status, 200);
    assert.equal((await upload(png, 'Bild.png')).status, 200);
    const second = path.join(root, 'images/portfolio/photography/Bild-2.jpg');
    const before = fs.readFileSync(second);
    assert.equal((await json('/api/media/move', { src: '../../../outside.txt', destDir: 'x' })).status, 400);
    assert.equal(fs.readFileSync(path.join(temp, 'outside.txt'), 'utf8'), 'do not move');
    assert.equal((await upload(png, 'escape.png', 'image/png', '../outside')).status, 400);
    fs.symlinkSync(temp, path.join(root, 'images/portfolio/escape'));
    assert.equal((await upload(png, 'escape.png', 'image/png', 'escape')).status, 400);
    assert.equal((await json('/api/photography', { filename: '../outside.txt' }, 'DELETE')).status, 400);
    assert.equal((await json('/api/photography', { filename: 'Bild.jpg' }, 'DELETE')).status, 200);
    assert.deepEqual(fs.readFileSync(second), before);
    assert.ok(fs.existsSync(path.join(manager, '.media-sources/photography/Bild-2.png')));
    assert.ok(!fs.existsSync(path.join(root, 'images/portfolio/photography/raw')));
    assert.ok(fs.readdirSync(path.join(manager, '.media-trash')).length);
    assert.equal((await json('/api/projects/design', { invalid: 'schema bypass' })).status, 410);
    assert.equal(fs.readFileSync(path.join(root, 'portfolio/projekte/designs.json'), 'utf8'), '[]');
    assert.equal((await upload('<html><script>alert(1)</script></html>', 'active.html', 'application/octet-stream')).status, 400);
    assert.equal((await upload('<html>not a PDF</html>', 'active.html', 'application/pdf')).status, 400);
    assert.equal((await upload('not a WebP', 'broken.webp', 'image/webp')).status, 400);
    assert.ok(!fs.existsSync(path.join(manager, '.media-sources/photography/broken.webp')));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>document.title="unsafe"</script><rect width="20" height="20" fill="purple"/></svg>';
    assert.equal((await upload(svg, 'vector.svg', 'image/svg+xml')).status, 200);
    assert.equal((await fetch(origin + '/images/portfolio/photography/raw/vector.svg')).status, 404);
    assert.equal((await fetch(origin + '/images/portfolio/photography/%72aw/vector.svg')).status, 404);
    fs.writeFileSync(path.join(root, 'images/logo.svg'), svg);
    assert.match((await fetch(origin + '/images/logo.svg')).headers.get('content-security-policy'), /sandbox/);
    assert.deepEqual(fs.readdirSync(path.join(manager, '.media-sources/incoming')), []);
    const preview = await (await json('/api/studio/preview', { id: 'isolation', file: 'index.html', html: '<html><body><script>fetch("/api/studio/session")</script>Draft</body></html>' })).json();
    assert.notEqual(new URL(preview.prefix).origin, origin);
    assert.match(await (await fetch(preview.prefix + 'index.html')).text(), /Draft/);
    assert.equal((await fetch(new URL('/api/studio/session', preview.prefix))).status, 404);
    assert.equal((await fetch(preview.prefix + 'portfolio-manager/server.js')).status, 403);
    const redirect = await fetch(origin + '/preview/isolation/index.html', { redirect: 'manual' });
    assert.equal(redirect.status, 307); assert.notEqual(new URL(redirect.headers.get('location')).origin, origin);
    const session = await fetch(origin + '/api/studio/session', { headers: { Origin: new URL(preview.prefix).origin } });
    assert.equal(session.headers.get('access-control-allow-origin'), null);
    const hostile = await fetch(origin + '/api/studio/preview', { method: 'POST', headers: { ...headers, Origin: new URL(preview.prefix).origin, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(hostile.status, 403);
});

test('Moving Bild keeps the independent original Bild-2 in place; HLS names are exact', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'noe-exact-media-'));
    try {
        const media = require('./media-library').library(root), source = media.folder('source');
        fs.mkdirSync(path.join(source, 'raw'), { recursive: true }); fs.mkdirSync(path.join(source, 'hls'));
        fs.mkdirSync(media.folder('target'), { recursive: true });
        for (const name of ['Bild.jpg', 'Bild-2.jpg']) { fs.writeFileSync(path.join(source, name), name); fs.writeFileSync(path.join(source, 'raw', name), name); }
        fs.writeFileSync(path.join(source, 'hls/Bild-segment-0.ts'), 'segment');
        fs.writeFileSync(path.join(source, 'hls/Bild-2-segment-0.ts'), 'independent segment');
        media.move('source/Bild', 'target');
        assert.ok(fs.existsSync(path.join(source, 'Bild-2.jpg')));
        assert.ok(fs.existsSync(path.join(source, 'raw/Bild-2.jpg')));
        assert.ok(fs.existsSync(path.join(source, 'hls/Bild-2-segment-0.ts')));
        assert.ok(fs.existsSync(path.join(media.folder('target'), 'hls/Bild-segment-0.ts')));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
