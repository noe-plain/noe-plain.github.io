'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { publishDelivery, pushChecked, git: asyncGit } = require('./gallery-delivery');

function fixture(t) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'noe-delivery-'));
    const root = path.join(temp, 'site'), remote = path.join(temp, 'remote.git'); fs.mkdirSync(root);
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
    git('init', '-b', 'main'); git('config', 'user.name', 'Delivery Test'); git('config', 'user.email', 'test@example.invalid');
    fs.writeFileSync(path.join(root, '.gitignore'), 'portfolio-manager/.client-galleries/\n');
    fs.writeFileSync(path.join(root, 'index.html'), '<html>unchanged</html>');
    const event = crypto.randomUUID(), release = crypto.randomUUID();
    const relative = event + '/' + release + '/legacy-full.bin';
    const legacy = path.join(root, 'portfolio/kunden/data', relative); fs.mkdirSync(path.dirname(legacy), { recursive: true }); fs.writeFileSync(legacy, crypto.randomBytes(2000));
    git('add', '.'); git('commit', '-m', 'Initial'); git('remote', 'add', 'origin', remote); git('push', '-u', 'origin', 'main');
    fs.writeFileSync(path.join(root, 'notes.txt'), 'already staged unrelated work'); git('add', 'notes.txt');
    const initial = { head: git('rev-parse', 'HEAD'), staged: git('diff', '--cached') };
    const files = [{ relative, source: legacy }];
    for (let index = 0; index < 5; index++) {
        const name = event + '/assets/' + 'a'.repeat(32) + '/' + crypto.randomUUID() + '-full.bin';
        const source = path.join(root, 'portfolio-manager/.client-galleries/delivery', name);
        fs.mkdirSync(path.dirname(source), { recursive: true }); fs.writeFileSync(source, crypto.randomBytes(1000)); files.push({ relative: name, source });
    }
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    return { root, remote, files, git, initial, options: { repository: { owner: 'example', name: 'portfolio' }, batchBytes: 1500 } };
}

test('Encrypted delivery uses bounded commits, reuses existing website objects and preserves the working branch/index', async t => {
    const f = fixture(t), samples = [];
    const result = await publishDelivery(f.root, f.files, progress => samples.push(progress), f.options);
    assert.equal(result.uploaded, 5); assert.equal(result.batches, 5);
    assert.match(result.base, new RegExp('/' + result.commit + '/portfolio/kunden/data/$'));
    assert.equal(f.git('rev-parse', 'HEAD'), f.initial.head);
    assert.equal(f.git('branch', '--show-current'), 'main');
    assert.equal(f.git('diff', '--cached'), f.initial.staged);
    const remoteHead = execFileSync('git', ['--git-dir', f.remote, 'rev-parse', 'refs/heads/customer-delivery'], { encoding: 'utf8' }).trim();
    assert.equal(remoteHead, result.commit);
    const names = f.git('ls-tree', '-r', '--name-only', result.commit).split('\n');
    assert.equal(names.length, 6); assert.ok(names.every(name => name.startsWith('portfolio/kunden/data/') && name.endsWith('.bin')));
    assert.ok(samples.some(sample => sample.stage === 'uploading' && sample.completed === 5));
    const repeated = await publishDelivery(f.root, f.files, () => {}, f.options);
    assert.equal(repeated.uploaded, 0); assert.equal(repeated.batches, 0); assert.equal(repeated.commit, result.commit);
});

test('A rejected packet resumes after the last confirmed packet without republishing earlier ones', async t => {
    const f = fixture(t);
    const hook = path.join(f.remote, 'hooks/pre-receive');
    fs.writeFileSync(hook, '#!/bin/sh\ncountfile="$GIT_DIR/audit-packet-count"\nn=0\n[ ! -f "$countfile" ] || n=$(cat "$countfile")\nn=$((n+1))\necho "$n" > "$countfile"\n[ "$n" -le 2 ]\n', { mode: 0o755 });
    await assert.rejects(publishDelivery(f.root, f.files, () => {}, f.options));
    fs.unlinkSync(hook);
    const partial = execFileSync('git', ['--git-dir', f.remote, 'ls-tree', '-r', '--name-only', 'customer-delivery'], { encoding: 'utf8' }).trim().split('\n');
    assert.equal(partial.length, 3); // one seeded legacy file + two new files
    const resumed = await publishDelivery(f.root, f.files, () => {}, f.options);
    assert.equal(resumed.uploaded, 3); assert.equal(resumed.batches, 3);
    assert.equal(f.git('rev-parse', 'HEAD'), f.initial.head); assert.equal(f.git('diff', '--cached'), f.initial.staged);
});

test('An error after remote acceptance counts as success only after checking the remote ref', async t => {
    const f = fixture(t); f.git('commit', '-m', 'Pending website update'); const commit = f.git('rev-parse', 'HEAD');
    let pushes = 0;
    await pushChecked(f.root, 'origin', commit, 'refs/heads/main', { run: async args => {
        const output = await asyncGit(f.root, args);
        if (args.includes('push')) { pushes++; throw Error('simulated disconnect after server acceptance'); }
        return output;
    } });
    assert.equal(pushes, 1);
    assert.equal(execFileSync('git', ['--git-dir', f.remote, 'rev-parse', 'main'], { encoding: 'utf8' }).trim(), commit);
});

test('144 MiB of incompressible delivery data is split below the real 128 MiB packet budget', { timeout: 180000 }, async t => {
    const f = fixture(t), files = [f.files[0]];
    for (const file of f.files.slice(1, 4)) {
        fs.writeFileSync(file.source, crypto.randomBytes(48 * 1024 * 1024)); files.push(file);
    }
    const result = await publishDelivery(f.root, files, () => {}, { repository: f.options.repository });
    assert.equal(result.uploaded, 3); assert.equal(result.batches, 2);
    const commits = f.git('rev-list', '--reverse', result.commit).split('\n');
    for (const [number, commit] of commits.entries()) {
        const objects = f.git('rev-list', '--objects', commit, '--not', 'origin/main', ...(number ? [commits[number - 1]] : [])).split('\n').filter(Boolean).map(row => row.split(' ')[0]);
        const output = execFileSync('git', ['cat-file', '--batch-check=%(objecttype) %(objectsize)'], { cwd: f.root, input: objects.join('\n') + '\n', encoding: 'utf8' });
        const bytes = output.split('\n').filter(row => row.startsWith('blob ')).reduce((sum, row) => sum + Number(row.split(' ')[1]), 0);
        assert.ok(bytes <= 128 * 1024 * 1024, 'new blob bytes per confirmed packet must stay below budget');
    }
    assert.equal(f.git('rev-parse', 'HEAD'), f.initial.head); assert.equal(f.git('diff', '--cached'), f.initial.staged);
});
