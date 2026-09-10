'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);
const express = require('express');

module.exports = function studio(app, root) {
    const token = crypto.randomBytes(32).toString('hex');
    const drafts = new Map();
    const files = { design: 'portfolio/projekte/designs.json', illustration: 'portfolio/projekte/illustrations.json', video: 'portfolio/projekte/video-projects.json', photography: 'portfolio/projekte/photography.json', links: 'fake-cms.json' };
    let publishing = false;
    let lastFetch = null, fetchError = null;
    const hash = value => crypto.createHash('sha256').update(value).digest('hex');
    const fail = (message, status = 400) => Object.assign(new Error(message), { status });
    const route = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } };
    const git = async (...args) => (await execFile('git', args, { cwd: root, timeout: 120000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })).stdout.trimEnd();
    function resolve(relative) {
        if (typeof relative !== 'string' || relative.split(/[\\/]/).some(p => p === '..' || p.startsWith('.')) || path.isAbsolute(relative)) throw fail('Ungültiger Dateipfad.');
        const full = path.resolve(root, relative);
        if (!full.startsWith(root + path.sep)) throw fail('Ungültiger Dateipfad.');
        let check = full;
        while (check !== root) { if (fs.existsSync(check) && fs.lstatSync(check).isSymbolicLink()) throw fail('Verknüpfte Dateien sind nicht bearbeitbar.'); check = path.dirname(check); }
        return full;
    }
    const isPage = p => typeof p === 'string' && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.html$/.test(p) && !p.startsWith('portfolio-manager/');
    const allowed = p => /^portfolio-manager\/(?:public\/)?[a-zA-Z0-9_-]+\.(?:js|css|html|md)$/.test(p) || /^portfolio-manager\/package(?:-lock)?\.json$/.test(p) || isPage(p) || Object.values(files).includes(p) || /^(images|fonts|css|portfolio)\//.test(p) && !p.includes('/raw/') && !p.includes('/temp/') || ['common.js','lebenslauf.js','lebenslauf.json'].includes(p);
    function write(relative, content, revision) {
        const full = resolve(relative);
        const before = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
        if (hash(before) !== revision) throw fail('Die Datei wurde inzwischen geändert. Bitte neu laden, bevor du speicherst.', 409);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full + '.cms-tmp', content);
        fs.renameSync(full + '.cms-tmp', full);
        return hash(content);
    }
    app.use((req, res, next) => {
        const host = req.headers.host || '';
        if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return res.status(403).json({ error: 'Das CMS ist nur über localhost erreichbar.' });
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.path.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method)) {
            if (publishing) return res.status(409).json({ error: 'Veröffentlichung läuft. Bitte warten.' });
            if (req.headers.origin !== `http://${host}` || req.headers['x-cms-token'] !== token) return res.status(403).json({ error: 'Ungültige lokale Sitzung. Bitte CMS neu laden.' });
        }
        next();
    });
    app.use(express.json({ limit: '10mb' }));
    async function refreshRemote() {
        try { await git('fetch'); lastFetch = new Date().toISOString(); fetchError = null; }
        catch { fetchError = 'GitHub ist nicht erreichbar oder die Anmeldung fehlt. Angezeigt wird der zuletzt lokal bekannte Stand.'; }
    }
    require('./media-library').register(app, root, route);
    app.get('/api/studio/session', (req, res) => res.json({ token }));
    app.get('/api/studio/content/:type', route(async (req, res) => {
        const file = files[req.params.type]; if (!file) throw fail('Unbekannter Inhalt.');
        const raw = fs.readFileSync(resolve(file), 'utf8'); res.json({ data: JSON.parse(raw), revision: hash(raw) });
    }));
    app.put('/api/studio/content/:type', route(async (req, res) => {
        const file = files[req.params.type]; if (!file || !Array.isArray(req.body.data)) throw fail('Ungültige Inhalte.');
        if (req.params.type !== 'links') {
            const ids = new Set();
            for (const p of req.body.data) { if (!p || !/^[a-z0-9][a-z0-9_-]*$/.test(p.id) || !String(p.title || '').trim() || ids.has(p.id) || (p.blocks && !Array.isArray(p.blocks))) throw fail('Titel und eindeutige URL-Kürzel sind erforderlich.'); ids.add(p.id); }
        }
        const newRevision = write(file, JSON.stringify(req.body.data, null, 4), req.body.revision);
        res.json({ revision: newRevision });
    }));
    app.get('/api/studio/pages', route(async (req, res) => {
        const result = [];
        function walk(dir, prefix = '') { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if (item.name.startsWith('.') || ['node_modules', 'portfolio-manager'].includes(item.name) || item.isSymbolicLink()) continue; const rel = prefix + item.name; if (item.isDirectory()) walk(path.join(dir, item.name), rel + '/'); else if (isPage(rel)) result.push(rel); } }
        walk(root); res.json(result);
    }));
    app.get('/api/studio/page', route(async (req, res) => { if (!isPage(req.query.file)) throw fail('Ungültige Seite.'); const html = fs.readFileSync(resolve(req.query.file), 'utf8'); res.json({ html, revision: hash(html) }); }));
    app.put('/api/studio/page', route(async (req, res) => {
        const { file, html, revision } = req.body;
        if (!isPage(file) || typeof html !== 'string' || !/<html[\s>]/i.test(html)) throw fail('Ungültiges HTML-Dokument.');
        res.json({ revision: write(file, html, revision) });
    }));
    app.post('/api/studio/preview', route(async (req, res) => {
        const { id, type, data, file, html } = req.body;
        if (!/^[a-z0-9-]{1,80}$/.test(id)) throw fail('Ungültige Vorschau.');
        if (file ? !isPage(file) || typeof html !== 'string' : !files[type] || !Array.isArray(data)) throw fail('Ungültige Vorschau.');
        for (const [key, value] of drafts) if (Date.now() - value.time > 3600000) drafts.delete(key);
        if (!drafts.has(id) && drafts.size >= 50) throw fail('Zu viele Vorschauen. Bitte Server neu starten.');
        drafts.set(id, { type, data, file, html, time: Date.now() }); res.json({ prefix: `/preview/${id}/` });
    }));
    app.get('/preview/:id/*', route(async (req, res) => {
        const draft = drafts.get(req.params.id); if (!draft) throw fail('Vorschau abgelaufen. Bitte Editor neu laden.', 404);
        const relative = req.params[0]; const full = resolve(relative);
        if (relative.startsWith('portfolio-manager/') || !allowed(relative)) throw fail('Datei nicht freigegeben.', 403);
        if (relative === draft.file) return res.type('html').send(draft.html);
        if (relative === files[draft.type]) return res.json(draft.data);
        res.sendFile(full);
    }));
    for (const folder of ['css', 'portfolio']) app.use('/' + folder, express.static(path.join(root, folder), { dotfiles: 'deny' }));
    async function history(refs) {
        const raw = await git('log', '-12', '--format=%H%x1f%h%x1f%aI%x1f%s%x1e', ...refs, '--');
        return Promise.all(raw.split('\x1e').map(entry => entry.trim()).filter(Boolean).map(async entry => {
            const [hash, short, date, subject] = entry.split('\x1f');
            const names = await git('diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', hash);
            return { hash, short, date, subject, files: names.split('\0').filter(Boolean) };
        }));
    }
    async function status() {
        const branch = await git('symbolic-ref', '--short', 'HEAD');
        const raw = await git('status', '--porcelain=v1', '-z', '--untracked-files=all');
        const entries = raw ? raw.split('\0').filter(Boolean) : [];
        const changes = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i], state = entry.slice(0, 2), file = entry.slice(3);
            const renamed = /[RC]/.test(state); const previous = renamed ? entries[++i] : null;
            const conflicted = /U/.test(state) || ['AA','DD'].includes(state);
            changes.push({ file, previous, state, allowed: allowed(file) && !renamed && !conflicted,
                label: conflicted ? 'Konflikt' : renamed ? 'Umbenannt · separat abschliessen' : state === '??' ? 'Neu' : state.includes('D') ? 'Gelöscht' : 'Geändert' });
        }
        let upstream = null, ahead = 0, behind = 0, pending = [], pushed = [];
        try { upstream = await git('rev-parse', '--abbrev-ref', '@{upstream}'); } catch {}
        if (upstream) {
            [ahead, behind] = (await git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}')).split(/\s+/).map(Number);
            [pending, pushed] = await Promise.all([history(['HEAD','--not','@{upstream}']), history(['@{upstream}'])]);
        } else pending = await history(['HEAD']);
        const signature = hash(JSON.stringify({ head: await git('rev-parse', 'HEAD'), changes: changes.map(c => ({ ...c, hash: c.allowed && fs.existsSync(resolve(c.file)) && fs.statSync(resolve(c.file)).isFile() ? hash(fs.readFileSync(resolve(c.file))) : '' })) }));
        return { branch, upstream, ahead, behind, pending, pushed, changes, signature, lastFetch, fetchError };
    }
    app.get('/api/studio/git', route(async (req, res) => {
        if (req.query.refresh === '1') await refreshRemote();
        res.json(await status());
    }));
    app.get('/api/studio/diff', route(async (req, res) => {
        const file = req.query.file;
        if (!allowed(file)) throw fail('Datei nicht freigegeben.');
        resolve(file);
        const tracked = await git('ls-files', '--', file);
        const diff = tracked ? await git('diff', 'HEAD', '--', file) : 'Neue Datei: ' + file;
        res.json({ diff: diff || 'Kein Text-Diff verfügbar (zum Beispiel bei binären Dateien).' });
    }));
    app.post('/api/publish', route(async (req, res) => {
        publishing = true;
        let committed = false;
        try {
            const current = await status();
            if (req.body.signature !== current.signature) throw fail('Die Änderungen haben sich verändert. Bitte erneut prüfen.', 409);
            if (!current.upstream) throw fail('Für diesen Branch ist kein Git-Upstream eingerichtet.');
            if (req.body.files?.length && (!req.body.message || !String(req.body.message).trim())) throw fail('Bitte eine Commit-Nachricht eingeben.');
            const selected = req.body.files;
            if (!Array.isArray(selected) || selected.some(f => !current.changes.some(c => c.file === f && c.allowed && !/U/.test(c.state)))) throw fail('Ungültige Dateiauswahl.');
            await refreshRemote();
            if (fetchError) throw fail(fetchError, 502);
            if ((await status()).signature !== current.signature) throw fail('Dateien wurden während der Prüfung verändert. Bitte erneut prüfen.', 409);
            if (Number(await git('rev-list', '--count', 'HEAD..@{upstream}')) > 0) throw fail('Auf GitHub gibt es neue Commits. Bitte zuerst lokal synchronisieren.', 409);
            if (selected.length) {
                await git('add', '--', ...selected);
                try { await git('commit', '--only', '-m', String(req.body.message), '--', ...selected); committed = true; } catch (e) { e.message = 'Commit fehlgeschlagen. Ausgewählte Dateien bleiben vorgemerkt und können erneut committed werden. ' + e.message; throw e; }
            }
            await git('push');
            await refreshRemote();
            res.json({ state: await status(), success: true, committed, message: 'An GitHub übertragen. Der GitHub-Pages-Build wird hier nicht überwacht.' });
        } catch (error) { if (committed) error.message = 'Der Commit wurde lokal erstellt, der Push ist fehlgeschlagen. Erneut prüfen und Push wiederholen. ' + error.message; throw error; }
        finally { publishing = false; }
    }));
};
