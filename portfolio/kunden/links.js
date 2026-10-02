'use strict';
// Shared by the local CMS and the static customer page.
((host) => {
    function slugify(value) {
        return String(value || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
    }
    function assignSlugs(events) {
        const used = new Set(events.filter(event => event.slug).map(event => event.slug));
        return events.map(event => {
            if (event.slug) return { ...event };
            const base = slugify(event.title) || 'veranstaltung';
            let slug = base, suffix = 2;
            while (used.has(slug)) { const tail = '-' + suffix++; slug = base.slice(0, 80 - tail.length).replace(/-$/, '') + tail; }
            used.add(slug); return { ...event, slug };
        });
    }
    function galleryLink(site, slug = '') {
        const link = new URL('kunden.html', site);
        link.search = slug ? '?' + encodeURIComponent(slug) : '';
        return link.href;
    }
    function selectedEvent(search, events) {
        const legacy = new URLSearchParams(search).get('veranstaltung');
        if (legacy) return events.find(event => event.id === legacy) || null;
        let slug; try { slug = decodeURIComponent(search.replace(/^\?/, '')); } catch { return null; }
        return events.find(event => event.slug === slug) || null;
    }
    const api = { slugify, assignSlugs, galleryLink, selectedEvent };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.ClientGalleryLinks = api;
})(globalThis);
