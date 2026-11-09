'use strict';
const fs = require('node:fs');
const path = require('node:path');
const model = require('../portfolio/home-hero-model');
const start = '<!-- home:about:start -->', end = '<!-- home:about:end -->';
const heroFile = 'portfolio/home-hero.json';
exports.register = function (app, root, route, { resolve, write, hash }) {
    const fail = (message, status = 400) => Object.assign(new Error(message), { status });
    function read(file) { const full = resolve(file); return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''; }
    function catalog() {
        const data = {};
        for (const [type, source] of Object.entries(model.sources)) { const raw = read('portfolio/projekte/' + source.file); data[type] = raw ? JSON.parse(raw) : []; }
        return model.catalog(data);
    }
    function hero(value) {
        let normalized;
        const projects = catalog();
        try { normalized = model.normalize(value, projects); } catch (error) { throw fail(error.message); }
        for (const item of model.resolve(normalized, projects)) {
            const full = resolve(item.image);
            if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw fail('Ein ausgewähltes Bild fehlt. Bitte ein anderes Bild wählen.');
        }
        if (normalized.enabled && model.resolve(normalized, projects).length !== normalized.projects.length) throw fail('Ein Projekt hat kein gültiges Bild. Bitte ein Bild aus der Mediathek wählen.');
        return normalized;
    }
    function resume(value) {
        if (!Array.isArray(value) || value.length > 80) throw fail('Bitte höchstens 80 Lebenslauf-Stationen verwenden.');
        return value.map(item => {
            if (!item || typeof item !== 'object') throw fail('Ungültige Lebenslauf-Station.');
            const result = {};
            for (const key of ['year', 'title', 'company', 'description']) {
                const text = item[key];
                if (typeof text !== 'string' || /[<>\x00]/.test(text) || text.length > (key === 'description' ? 6000 : 250) || key !== 'description' && !text.trim()) throw fail('Bitte Zeitraum, Titel und Organisation ausfüllen. Verwende Text ohne HTML-Tags.');
                result[key] = text;
            }
            return result;
        });
    }
    function about(value, html = read('index.html')) {
        if (typeof value !== 'string' || !value.trim() || value.length > 100000 || value.includes(start) || value.includes(end)) throw fail('Bitte einen HTML-Inhalt für „Das bin ich“ eingeben (höchstens 100.000 Zeichen).');
        const a = html.indexOf(start), b = html.indexOf(end);
        if (a < 0 || b <= a || html.indexOf(start, a + 1) !== -1 || html.indexOf(end, b + 1) !== -1) throw fail('Der Bereich „Das bin ich“ wurde im HTML verändert. Bitte die Startseite prüfen.', 409);
        return html.slice(0, a + start.length) + '\n' + value.trim() + '\n            ' + html.slice(b);
    }
    app.get('/api/studio/home/hero', route(async (req, res) => {
        const raw = read(heroFile);
        res.json({ data: raw ? JSON.parse(raw) : { enabled: false, motion: 18, projects: [] }, revision: hash(raw), catalog: catalog() });
    }));
    app.put('/api/studio/home/hero', route(async (req, res) => {
        const data = hero(req.body.data);
        const revision = write(heroFile, JSON.stringify(data, null, 2) + '\n', req.body.revision);
        res.json({ data, revision });
    }));
    app.get('/api/studio/home/about', route(async (req, res) => {
        const html = read('index.html');
        const a = html.indexOf(start), b = html.indexOf(end);
        if (a < 0 || b <= a) throw fail('Der Bereich „Das bin ich“ ist im HTML nicht markiert.', 409);
        res.json({ data: html.slice(a + start.length, b).trim(), indexHtml: html, revision: hash(html) });
    }));
    app.put('/api/studio/home/about', route(async (req, res) => {
        const html = about(req.body.data);
        const revision = write('index.html', html, req.body.revision);
        res.json({ revision, indexHtml: html });
    }));
    app.get('/api/studio/home/resume', route(async (req, res) => {
        const raw = read('lebenslauf.json');
        res.json({ data: raw ? JSON.parse(raw) : [], revision: hash(raw) });
    }));
    app.put('/api/studio/home/resume', route(async (req, res) => {
        const data = resume(req.body.data);
        res.json({ revision: write('lebenslauf.json', JSON.stringify(data, null, 2) + '\n', req.body.revision) });
    }));
    return { hero, resume, about };
};
