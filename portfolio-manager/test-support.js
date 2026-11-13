'use strict';
const fs = require('node:fs');
const path = require('node:path');
function copyRuntime(root) {
    const target = path.join(root, 'portfolio-manager'); fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(__dirname)) if (file.endsWith('.js') && !file.endsWith('.test.js')) fs.copyFileSync(path.join(__dirname, file), path.join(target, file));
    fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(target, 'node_modules'), 'dir');
    for (const file of ['portfolio/kunden/links.js', 'portfolio/home-hero-model.js']) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.copyFileSync(path.join(__dirname, '..', file), path.join(root, file));
    }
    return target;
}
module.exports = { copyRuntime };
