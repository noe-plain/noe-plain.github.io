'use strict';
const express = require('express');
const { publicMedia } = require('./safe-files');

// A separate port is a separate browser origin. No CMS routes or private sources
// are mounted here, even when an author deliberately writes JavaScript in HTML.
function previewServer({ drafts, files, resolve, allowed, clients }) {
    let server, ready;
    const app = express();
    app.use((req, res, next) => {
        if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) return res.sendStatus(403);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', 'frame-ancestors http://localhost:* http://127.0.0.1:*');
        next();
    });
    app.get('/preview/:id/*', (req, res) => {
        try {
            const draft = drafts.get(req.params.id);
            if (!draft || Date.now() - draft.time > 3600000) return res.status(404).json({ error: 'Vorschau abgelaufen. Bitte neu laden.' });
            const relative = req.params[0], full = resolve(relative);
            const encryptedAsset = relative.startsWith('portfolio/kunden/data/');
            if (relative.startsWith('portfolio-manager/') || !allowed(relative) && !encryptedAsset || /(?:^|\/)(?:raw|temp)(?:\/|$)/i.test(relative)) return res.sendStatus(403);
            if (relative === 'portfolio/kunden/catalog.json') return res.json(clients.localCatalog('/preview/' + req.params.id + '/'));
            if (relative.startsWith('portfolio/kunden/data/')) return res.sendFile(clients.deliveryFile(relative.slice('portfolio/kunden/data/'.length)));
            if (draft.homeSection === 'hero' && relative === 'portfolio/home-hero.json') return res.json(draft.data);
            if (draft.homeSection === 'resume' && relative === 'lebenslauf.json') return res.json(draft.data);
            if (relative === draft.file) return res.type('html').send(draft.html);
            if (relative === files[draft.type]) return res.json(draft.data);
            if (relative.startsWith('images/')) return publicMedia(req, res, () => res.sendFile(full));
            res.sendFile(full);
        } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
    });
    function origin() {
        if (!ready) ready = new Promise((resolve, reject) => {
            server = app.listen(0, '127.0.0.1', () => { server.unref(); resolve('http://127.0.0.1:' + server.address().port); });
            server.once('error', reject);
        });
        return ready;
    }
    return { origin, close: () => new Promise(resolve => { if (!server) return resolve(); server.close(resolve); server.closeAllConnections(); }) };
}
module.exports = { previewServer };
