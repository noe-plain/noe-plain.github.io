'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const prefix = 'portfolio/kunden/data/';
const branch = 'customer-delivery';

function git(root, args, { env = {}, input, timeout = 600000 } = {}) {
    return new Promise((resolve, reject) => {
        const child = execFile('git', args, { cwd: root, timeout, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } }, (error, stdout, stderr) => {
            if (error) { error.message = (stderr || error.message).trim(); reject(error); }
            else resolve(stdout.trimEnd());
        });
        child.stdin.on('error', () => {});
        child.stdin.end(input || '');
    });
}
function githubRepository(remote) {
    const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/);
    return match ? { owner: match[1], name: match[2] } : null;
}
function baseURL(repository, ref = branch) {
    return `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${ref}/${prefix}`;
}
async function pushChecked(root, remote, commit, ref, options = {}) {
    let last;
    const run = options.run || (args => git(root, args, options));
    for (let attempt = 0; attempt < 3; attempt++) {
        try { await run(['-c', 'http.version=HTTP/1.1', 'push', '--porcelain', remote, commit + ':' + ref]); }
        catch (error) { last = error; }
        // Git can report a disconnect after the remote has accepted the update.
        let actual;
        try { actual = await run(['ls-remote', '--heads', remote, ref]); } catch (error) { last = error; continue; }
        if (actual.split(/\s/)[0] === commit) return;
        if (actual && last && /rejected|non-fast-forward|cannot lock ref/i.test(last.message)) break;
    }
    throw last || Error('GitHub hat den übertragenen Stand noch nicht bestätigt. Bitte erneut versuchen.');
}
function treeEntries(text) {
    const result = new Map();
    for (const entry of text.split('\0').filter(Boolean)) {
        const split = entry.indexOf('\t'), [mode, type, hash] = entry.slice(0, split).split(' '), name = entry.slice(split + 1);
        if (type === 'blob' && mode === '100644' && name.startsWith(prefix) && name.endsWith('.bin')) result.set(name, hash);
    }
    return result;
}

async function publishDelivery(root, files, report = () => {}, options = {}) {
    const remote = options.remote || 'origin';
    const repository = options.repository || githubRepository(await git(root, ['config', '--get', `remote.${remote}.url`]));
    if (!repository) throw Error('Für die Galerieauslieferung ist ein GitHub-Remote erforderlich.');
    const directory = path.join(root, 'portfolio-manager/.client-galleries');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const index = path.join(directory, '.delivery-index-' + crypto.randomUUID());
    const env = { GIT_INDEX_FILE: index };
    const remoteRef = 'refs/heads/' + branch;
    let parent;
    try {
        const advertised = await git(root, ['ls-remote', '--heads', remote, remoteRef]);
        if (advertised) { await git(root, ['fetch', '--no-tags', remote, remoteRef]); parent = await git(root, ['rev-parse', 'FETCH_HEAD']); }
        await git(root, ['read-tree', parent || '--empty'], { env });
        let entries;
        if (parent) entries = treeEntries(await git(root, ['ls-tree', '-r', '-z', parent, '--', prefix]));
        else {
            // These objects are already on GitHub: seed from the fetched website
            // upstream, never from unpublished local commits containing GB of data.
            let seed = '';
            try { seed = await git(root, ['ls-tree', '-r', '-z', '@{upstream}', '--', prefix]); } catch {}
            entries = treeEntries(seed);
            if (entries.size) await git(root, ['update-index', '--index-info'], { env, input: [...entries].map(([name, hash]) => `100644 ${hash}\t${name}\n`).join('') });
        }
        const cachedFile = path.join(directory, 'delivery-hashes.json');
        const cache = fs.existsSync(cachedFile) ? JSON.parse(fs.readFileSync(cachedFile, 'utf8')) : {};
        const changed = [];
        report({ stage: 'preparing', completed: 0, total: files.length, message: 'Galeriedateien prüfen …' });
        for (const [number, file] of files.entries()) {
            if (!/^[a-f0-9-]+\/(?:[a-zA-Z0-9_-]+\/){1,3}[a-zA-Z0-9.-]+\.bin$/.test(file.relative)) throw Error('Ungültiger Galeriepfad.');
            const stat = fs.statSync(file.source), name = prefix + file.relative;
            if (!stat.isFile() || fs.lstatSync(file.source).isSymbolicLink() || stat.size > 95 * 1024 * 1024) throw Error('Eine Galeriedatei ist ungültig oder grösser als 95 MB.');
            const signature = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
            let hash = cache[name]?.signature === signature ? cache[name].hash : null;
            if (!hash) hash = await git(root, ['hash-object', '-w', '--', file.source]);
            cache[name] = { signature, hash };
            if (entries.get(name) !== hash) changed.push({ name, hash, size: stat.size });
            report({ stage: 'preparing', completed: number + 1, total: files.length, message: 'Galeriedateien prüfen …' });
        }
        const cacheTemp = cachedFile + '.tmp'; fs.writeFileSync(cacheTemp, JSON.stringify(cache), { mode: 0o600 }); fs.renameSync(cacheTemp, cachedFile);
        const batches = []; let batch = [], bytes = 0;
        for (const file of changed) {
            if (batch.length && (bytes + file.size > (options.batchBytes || 128 * 1024 * 1024) || batch.length >= 100)) { batches.push(batch); batch = []; bytes = 0; }
            batch.push(file); bytes += file.size;
        }
        if (batch.length) batches.push(batch);
        if (!parent && !batches.length) batches.push([]);
        let completed = 0;
        for (const [number, packet] of batches.entries()) {
            report({ stage: 'uploading', completed, total: changed.length, message: `Galeriebilder übertragen · Paket ${number + 1} von ${batches.length}` });
            if (packet.length) await git(root, ['update-index', '--index-info'], { env, input: packet.map(file => `100644 ${file.hash}\t${file.name}\n`).join('') });
            const tree = await git(root, ['write-tree'], { env });
            const commit = await git(root, ['commit-tree', tree, ...(parent ? ['-p', parent] : [])], { input: `Encrypted customer delivery (${packet.length} files)\n` });
            await pushChecked(root, remote, commit, remoteRef);
            parent = commit; completed += packet.length;
            report({ stage: 'uploading', completed, total: changed.length, message: `${completed} von ${changed.length} neuen Galeriedateien übertragen` });
        }
        return { base: baseURL(repository, parent), commit: parent, uploaded: changed.length, batches: batches.length };
    } finally { fs.rmSync(index, { force: true }); fs.rmSync(index + '.lock', { force: true }); }
}
module.exports = { git, githubRepository, baseURL, publishDelivery, pushChecked, prefix, branch };
