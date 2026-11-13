'use strict';
const fs = require('node:fs');
const path = require('node:path');

function inside(root, relative) {
    const fail = () => Object.assign(new Error('Ungültiger Dateipfad.'), { status: 400 });
    if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative) || relative.split('/').some(p => p === '..' || p.startsWith('.'))) throw fail();
    root = path.resolve(root);
    const full = path.resolve(root, relative);
    if (!full.startsWith(root + path.sep)) throw fail();
    for (let check = full; ; check = path.dirname(check)) {
        if (fs.existsSync(check) && fs.lstatSync(check).isSymbolicLink()) throw fail();
        if (check === root) break;
    }
    return full;
}

// Explicit names only: numeric collision suffixes such as Bild-2 are NEVER variants.
function companions(directory, stem) {
    const files = [];
    for (const sub of ['raw', 'hls']) {
        const dir = path.join(directory, sub);
        if (!fs.existsSync(dir)) continue;
        if (fs.lstatSync(dir).isSymbolicLink()) throw Object.assign(new Error('Verknüpfte Ordner sind nicht erlaubt.'), { status: 400 });
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            const name = entry.name;
            const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matches = sub === 'raw'
                ? path.parse(name).name === stem || name === stem + '.status.json'
                : name === stem + '.m3u8' || new RegExp('^' + escaped + '(?:-segment-|-|_)\\d+\\.ts$').test(name);
            if (matches) files.push(sub + '/' + name);
        }
    }
    return files;
}

function publicMedia(req, res, next) {
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (pathname.split('/').some(p => ['raw', 'temp'].includes(p.toLowerCase()) || p.startsWith('.'))) return res.sendStatus(404);
    if (/\.(?:html?|js|mjs|xml|json)$/i.test(pathname)) return res.sendStatus(404);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Directly opened SVG/PDF files cannot acquire the CMS's origin privileges.
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'");
    next();
}
module.exports = { inside, companions, publicMedia };
