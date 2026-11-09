'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const vm = require('node:vm'); const fs = require('node:fs');
const repo = require('node:path').resolve(__dirname, '..');
const model = require(repo + '/portfolio/home-hero-model');
test('Public hero: reversed bounded parallax, reduced motion, touch, visibility and failed images', async () => {
    async function setup(failed = false) {
        class Node {
            constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.classes = new Set(); this.classList = { add: s => this.classes.add(s), remove: s => this.classes.delete(s), toggle: (s, value) => value ? this.classes.add(s) : this.classes.delete(s) }; }
            append(...nodes) { this.children.push(...nodes); }
            replaceChildren(...nodes) { this.children = nodes; }
            setAttribute(k, value) { this[k] = value; }
            addEventListener(k, fn) { this.listeners[k] = fn; }
            getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 800 }; }
            set src(value) { this.source = value; this.naturalWidth = failed ? 0 : 100; queueMicrotask(() => failed ? this.onerror?.() : this.onload?.()); }
        }
        const hero = new Node('section'), h1 = new Node('h1'), h2 = new Node('h2'); hero.querySelector = s => s === '.hero-h1' ? h1 : h2;
        const document = { hidden: false, currentScript: { src: 'http://localhost/portfolio/home-hero.js' }, querySelector: () => hero, createElement: tag => new Node(tag), createTextNode: text => ({ textContent: text }), addEventListener(k, fn) { this[k] = fn; } };
        const media = [false, true].map(matches => ({ matches, addEventListener(k, fn) { this.change = fn; } }));
        const frames = new Map(); let id = 0, observe;
        const config = { enabled: true, motion: 18, subtitle: 'Medien&shy;gestaltung', projects: [{ type: 'design', id: 'example' }] };
        vm.runInNewContext(fs.readFileSync(repo + '/portfolio/home-hero.js', 'utf8'), { document, window: { HomeHeroModel: model, addEventListener() {} }, URL, matchMedia: value => value.includes('reduced') ? media[0] : media[1], IntersectionObserver: class { constructor(fn) { observe = fn; } observe() { observe([{ isIntersecting: true }]); } }, requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id), fetch: async url => ({ ok: true, json: async () => url.pathname.endsWith('home-hero.json') ? config : [{ id: 'example', title: 'Example', 'hero-image': '../../images/example.jpg' }] }) });
        for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
        function tick() { for (let n = 0; n < 300 && frames.size; n++) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); } }
        return { hero, h2, media, document, frames, tick, observe, position: hero.children[0]?.children[0] };
    }
    const scene = await setup(); assert.ok(scene.hero.classes.has('is-projects')); assert.equal(scene.h2.textContent, 'Medien\u00adgestaltung');
    scene.hero.listeners.pointermove({ pointerType: 'mouse', clientX: 1000, clientY: 800 }); scene.tick();
    const [x, y] = [...scene.position.style.transform.matchAll(/(-?\d+\.\d+)px/g)].map(m => Number(m[1]));
    assert.ok(x < 0 && y < 0); assert.ok(Math.abs(x) <= 18 && Math.abs(y) <= 18); assert.equal(scene.frames.size, 0);
    scene.media[0].matches = true; scene.media[0].change(); assert.equal(scene.position.style.transform, ''); assert.ok(!scene.hero.classes.has('home-hero-motion'));
    scene.hero.listeners.pointermove({ pointerType: 'mouse', clientX: 0, clientY: 0 }); assert.equal(scene.frames.size, 0);
    scene.media[0].matches = false; scene.media[0].change(); scene.hero.listeners.pointermove({ pointerType: 'touch', clientX: 0, clientY: 0 }); assert.equal(scene.frames.size, 0);
    scene.media[1].matches = false; scene.media[1].change(); assert.ok(!scene.hero.classes.has('home-hero-motion'));
    scene.media[1].matches = true; scene.media[1].change(); scene.document.hidden = true; scene.document.visibilitychange(); assert.equal(scene.frames.size, 0);
    scene.observe([{ isIntersecting: false }]); assert.equal(scene.position.style.transform, '');
    const failed = await setup(true); assert.ok(!failed.hero.classes.has('is-projects')); assert.equal(failed.position.hidden, true);
});
