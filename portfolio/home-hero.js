'use strict';
(() => {
    const hero = document.querySelector('#home-hero');
    if (!hero || !window.HomeHeroModel) return;
    const base = new URL('../', document.currentScript.src);
    const model = window.HomeHeroModel;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    const rotations = [-9, 8, -6, 7, -5, 5, -4];
    let frame = 0, x = 0, y = 0, targetX = 0, targetY = 0, active = false, strength = 0;
    const nodes = [];
    function reset() {
        cancelAnimationFrame(frame); frame = 0; x = y = targetX = targetY = 0;
        nodes.forEach(node => { node.style.transform = ''; });
    }
    function enabled() { return active && !document.hidden && !reduced.matches && pointer.matches && strength > 0; }
    function paint() {
        frame = 0;
        if (!enabled()) { reset(); return; }
        x += (targetX - x) * .075; y += (targetY - y) * .075;
        nodes.forEach((node, index) => {
            const depth = .5 + (index % 3) * .28;
            node.style.transform = `translate3d(${(-x * strength * depth).toFixed(2)}px, ${(-y * strength * depth).toFixed(2)}px, 0)`;
        });
        if (Math.abs(targetX - x) + Math.abs(targetY - y) > .001) frame = requestAnimationFrame(paint);
    }
    function schedule() { if (!frame && enabled()) frame = requestAnimationFrame(paint); }
    function motionState() {
        hero.classList.toggle('home-hero-motion', enabled());
        if (!enabled()) reset();
    }
    hero.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || !enabled()) return;
        const rect = hero.getBoundingClientRect();
        targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
        schedule();
    });
    hero.addEventListener('pointerleave', () => { targetX = targetY = 0; schedule(); });
    reduced.addEventListener('change', motionState); pointer.addEventListener('change', motionState);
    document.addEventListener('visibilitychange', motionState);
    new IntersectionObserver(entries => { active = entries[0].isIntersecting; motionState(); }, { threshold: .05 }).observe(hero);
    window.addEventListener('pagehide', reset);
    async function json(path) {
        const response = await fetch(new URL(path, base));
        if (!response.ok) throw Error('Hero nicht verfügbar');
        return response.json();
    }
    (async () => {
        const config = await json('portfolio/home-hero.json');
        const normalized = model.normalize(config, [], false);
        const title = hero.querySelector('.hero-h1'), name = document.createElement('span');
        name.textContent = model.text(normalized.name);
        title.replaceChildren(document.createTextNode(model.text(normalized.title) + ' '), name);
        const subtitle = hero.querySelector('.hero-h2'); subtitle.textContent = model.text(normalized.subtitle); subtitle.hidden = !normalized.subtitle;
        if (!normalized.enabled) return;
        const data = {};
        await Promise.allSettled([...new Set((config.projects || []).map(p => p.type))].map(async type => {
            if (Object.hasOwn(model.sources, type)) data[type] = await json('portfolio/projekte/' + model.sources[type].file);
        }));
        const projects = model.resolve(normalized, model.catalog(data));
        if (!projects.length) return;
        const layer = document.createElement('div'); layer.className = 'home-hero-projects'; layer.setAttribute('aria-label', 'Ausgewählte Projekte');
        let visible = 0;
        projects.forEach((project, index) => {
            const motion = document.createElement('div'); motion.className = 'home-hero-position home-hero-slot-' + index; motion.hidden = true;
            motion.style.setProperty('--hero-rotation', rotations[index] + 'deg'); motion.style.setProperty('--hero-delay', (-index * 1.7) + 's');
            const floating = document.createElement('div'); floating.className = 'home-hero-floating';
            const link = document.createElement('a'); link.className = 'home-hero-card'; link.href = new URL(project.href, base); link.setAttribute('aria-label', project.title + ' · ' + project.category + ' – Projekt öffnen');
            const image = document.createElement('img'); image.alt = ''; image.decoding = 'async'; image.draggable = false; image.style.objectFit = project.fit;
            const caption = document.createElement('span'); caption.className = 'home-hero-caption';
            const category = document.createElement('small'); category.textContent = project.category;
            const title = document.createElement('strong'); title.textContent = project.title;
            caption.append(category, title); link.append(image, caption); floating.append(link); motion.append(floating); layer.append(motion); nodes.push(motion);
            image.onload = () => {
                if (!image.naturalWidth) return;
                visible++; motion.hidden = false; motion.classList.add('is-loaded'); hero.classList.add('is-projects');
                strength = normalized.motion; motionState();
            };
            image.onerror = () => { motion.hidden = true; if (!visible) hero.classList.remove('is-projects'); };
            image.src = new URL(project.image, base);
        });
        hero.append(layer);
    })().catch(() => { /* The original image remains usable if configuration or media is unavailable. */ });
})();
