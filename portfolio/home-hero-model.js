(function (root, factory) {
    const model = factory();
    if (typeof module === 'object' && module.exports) module.exports = model;
    else root.HomeHeroModel = model;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';
    const sources = {
        design: { file: 'designs.json', label: 'Design', page: 'design.html', query: '?' },
        illustration: { file: 'illustrations.json', label: 'Illustration', page: 'illustration.html', query: '?' },
        photography: { file: 'photography.json', label: 'Fotografie', page: 'fotografie.html', query: '?tab=' },
        video: { file: 'video-projects.json', label: 'Video', page: 'video.html', query: '?project=' }
    };
    function imagePath(value) {
        if (typeof value !== 'string' || /[\\\x00-\x1f?#]/.test(value)) return null;
        let path;
        try { path = decodeURIComponent(value.trim()).replace(/^(?:\.\.?\/)+/, '').replace(/^\//, ''); } catch { return null; }
        if (!path.startsWith('images/') || path.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.')) || /\/(?:raw|temp)\//.test(path) || !/\.(?:jpe?g|png|webp|avif|svg|gif)$/i.test(path) || /[%\\\x00-\x1f?#]/.test(path)) return null;
        return path;
    }
    function text(value) { return String(value ?? '').replace(/&shy;|&#0*173;|&#x0*ad;/gi, '\u00ad'); }
    function catalog(data) {
        const result = [];
        for (const [type, source] of Object.entries(sources)) {
            for (const p of Array.isArray(data[type]) ? data[type] : []) {
                if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,120}$/.test(p.id)) continue;
                const candidates = [p['hero-image'], p.heroImage, ...(Array.isArray(p.blocks) ? p.blocks : []).flatMap(b => [b?.imageUrl, ...(Array.isArray(b?.items) ? b.items.map(i => i?.imageUrl) : [])])];
                const image = candidates.map(imagePath).find(Boolean);
                result.push({ type, id: p.id, title: text(String(p.title || p.id).replace(/<[^>]*>/g, '')), category: source.label, image: image || '', href: 'portfolio/projekte/' + source.page + source.query + encodeURIComponent(p.id) });
            }
        }
        return result;
    }
    function normalize(value, projects, strict = true) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.enabled !== 'boolean' || !Number.isInteger(value.motion) || value.motion < 0 || value.motion > 32 || !Array.isArray(value.projects) || value.projects.length > 7) throw Error('Bitte höchstens sieben Projekte und eine Bewegungsstärke zwischen 0 und 32 wählen.');
        const copy = {};
        for (const [key, fallback, limit] of [['title', 'Medien von', 140], ['name', 'Noé', 100], ['subtitle', 'Mediamatiker EFZ mit BM', 240]]) {
            const valueText = value[key] === undefined ? fallback : value[key];
            if (typeof valueText !== 'string' || valueText.length > limit || /[<>\x00]/.test(valueText) || key === 'title' && !valueText.trim()) throw Error('Bitte gültige Hero-Texte ohne HTML-Tags eingeben. &shy; ist erlaubt.');
            copy[key] = valueText;
        }
        const seen = new Set();
        const items = value.projects.map(item => {
            if (!item || !Object.hasOwn(sources, item.type) || typeof item.id !== 'string') throw Error('Ungültige Projektauswahl.');
            const key = item.type + ':' + item.id;
            if (seen.has(key)) throw Error('Ein Projekt kann nur einmal im Hero erscheinen.');
            seen.add(key);
            if (strict && !projects.some(p => p.type === item.type && p.id === item.id)) throw Error('Ein ausgewähltes Projekt ist nicht mehr vorhanden. Bitte entfernen oder ersetzen.');
            const image = item.image ? imagePath(item.image) : '';
            if (item.image && !image) throw Error('Bitte ein Bild aus der lokalen Mediathek verwenden.');
            const fit = item.fit || 'cover';
            if (!['cover', 'contain'].includes(fit)) throw Error('Ungültiger Bildausschnitt.');
            return { type: item.type, id: item.id, image, fit };
        });
        if (value.enabled && !items.length) throw Error('Wähle mindestens ein Projekt oder aktiviere das bisherige Titelbild.');
        return { enabled: value.enabled, motion: value.motion, ...copy, projects: items };
    }
    function resolve(config, projects) {
        return config.projects.flatMap(item => {
            const project = projects.find(p => p.type === item.type && p.id === item.id);
            const image = imagePath(item.image || project?.image);
            return project && image ? [{ ...project, image, fit: item.fit }] : [];
        });
    }
    return { sources, imagePath, catalog, normalize, resolve, text };
});
