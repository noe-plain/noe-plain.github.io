'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const { inside, companions } = require('./safe-files');
const mediaExtensions = /\.(jpe?g|png|webp|avif|gif|svg|mp4|mov|webm|pdf)$/i;
const imageExtensions = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
function library(root) {
    const base = path.join(root, 'images/portfolio');
    const registryFile = path.join(base, 'media-library.json');
    const registry = () => fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile, 'utf8')) : {};
    const saveRegistry = data => { fs.writeFileSync(registryFile + '.tmp', JSON.stringify(data, null, 2)); fs.renameSync(registryFile + '.tmp', registryFile); };
    function folder(value = '') {
        if (typeof value !== 'string' || value.split('/').some(p => p && (!/^[\p{L}\p{N}_ -]+$/u.test(p) || ['raw','hls','temp'].includes(p)))) throw Error('Ungültiger Ordnername.');
        if (value.startsWith('/') || value.includes('\\')) throw Error('Ungültiger Ordnername.');
        const full = path.resolve(base, value);
        if (full !== base && !full.startsWith(base + path.sep)) throw Error('Ungültiger Ordner.');
        for (let p = full; p !== path.dirname(base); p = path.dirname(p)) if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw Error('Verknüpfte Ordner werden nicht unterstützt.');
        return full;
    }
    function catalog() {
        const items = [], folders = [''], meta = registry();
        function walk(dir, relative = '') {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes:true });
            const names = entries.filter(e => e.isFile() && mediaExtensions.test(e.name)).map(e=>e.name);
            const stems = new Set(names.map(n=>path.parse(n).name));
            const rawNames = fs.existsSync(path.join(dir,'raw')) && !fs.lstatSync(path.join(dir,'raw')).isSymbolicLink() ? fs.readdirSync(path.join(dir,'raw')) : [];
            const independent = stem => !!meta[(relative ? relative + '/' : '') + stem] || rawNames.some(n => path.parse(n).name === stem);
            const groups = new Map();
            for (const name of names) {
                let stem = path.parse(name).name;
                const candidate = stem.replace(/-(?:640|1280|1920|2560|poster|hevc|mobile)$/, '');
                // Only collapse a size suffix when its full-size sibling exists.
                if (candidate !== stem && stems.has(candidate) && (/\.(webp|avif|mp4)$/i.test(name) || /-mobile\.jpg$/i.test(name)) && !independent(stem)) stem = candidate;
                const key = stem + (name.endsWith('.pdf') ? ':pdf' : '');
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(name);
            }
            for (const [key, names] of groups) {
                const stem = key.replace(/:pdf$/, '');
                const rank = n => path.parse(n).name !== stem ? 10 : ({'.jpg':0,'.jpeg':0,'.png':1,'.mp4':1,'.pdf':1,'.webp':2,'.avif':3}[path.extname(n).toLowerCase()] ?? 4);
                names.sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b));
                const rel = relative ? relative + '/' : '';
                const id = rel + key;
                const originals = rawNames.filter(n=>path.parse(n).name===stem && !n.endsWith('.json'));
                const prefix = '../../images/portfolio/';
                items.push({ id, folder:relative, title:meta[id]?.originalName || originals[0] || names[0], url:prefix+rel+names[0], image:imageExtensions.test(names[0]), variants:names.map(n=>prefix+rel+n), originalName:meta[id]?.originalName || originals[0] || null });
            }
            for (const entry of entries) if (entry.isDirectory() && !entry.name.startsWith('.') && !['raw','hls','temp'].includes(entry.name)) { const rel = relative ? relative+'/'+entry.name : entry.name; folders.push(rel); walk(path.join(dir,entry.name),rel); }
        }
        walk(base); return { items:items.sort((a,b)=>a.title.localeCompare(b.title)), folders:folders.sort() };
    }
    function reserve(originalName, targetFolder) {
        const dir = folder(targetFolder); fs.mkdirSync(dir,{recursive:true});
        const original = path.basename(originalName.replace(/\\/g,'/'));
        const stem = path.parse(original).name.normalize('NFKC').replace(/[^\p{L}\p{N}_ -]/gu,'-').replace(/\s+/g,'-').replace(/^-+|-+$/g,'').slice(0,100) || 'Bild';
        let name=stem, count=1;
        const used = original => { const n=original.toLocaleLowerCase(); return fs.readdirSync(dir).map(f=>f.toLocaleLowerCase()).some(f=>f===n+'.upload-lock'||path.parse(f).name===n||f.startsWith(n+'-')) || fs.existsSync(path.join(dir,'raw'))&&fs.readdirSync(path.join(dir,'raw')).map(f=>f.toLocaleLowerCase()).some(f=>path.parse(f).name===n); };
        while (used(name)) name=stem+'-'+(++count);
        const lock=path.join(dir,name+'.upload-lock');fs.closeSync(fs.openSync(lock,'wx'));
        return { dir, name, release:()=>{if(fs.existsSync(lock))fs.unlinkSync(lock);}, record:(pdf=false)=>{const data=registry();data[(targetFolder?targetFolder+'/':'')+name+(pdf?':pdf':'')]={originalName:original};saveRegistry(data);} };
    }
    function move(id, destination) {
        if (typeof destination !== 'string') throw Error('Bitte einen Zielordner wählen.');
        const asset=catalog().items.find(item=>item.id===id);if(!asset)throw Error('Datei nicht gefunden.');
        const target=folder(destination);if(asset.folder===destination)return {files:0,updated:0};
        if(!fs.existsSync(target))throw Error('Der Zielordner existiert nicht.');
        const source=folder(asset.folder), stem=path.basename(id).replace(/:pdf$/,'');
        if(fs.existsSync(path.join(source,stem+'.upload-lock')))throw Error('Die Datei wird noch verarbeitet. Bitte warten.');
        if (fs.readdirSync(target).some(f=>path.parse(f).name===stem||f.startsWith(stem+'-'))) throw Error('Im Zielordner gibt es bereits ein Bild mit diesem Namen.');
        const pairs=asset.variants.map(url=>{const name=path.basename(url);return [path.join(source,name),path.join(target,name)];});
        for (const name of id.endsWith(':pdf') ? [] : companions(source, stem)) pairs.push([inside(source, name), inside(target, name)]);
        const privateBase = path.join(root, 'portfolio-manager/.media-sources');
        const privateSource = path.join(privateBase, asset.folder);
        if (fs.existsSync(privateSource)) for (const name of fs.readdirSync(privateSource)) if (path.parse(name).name === stem) pairs.push([inside(privateBase, (asset.folder ? asset.folder + '/' : '') + name), inside(privateBase, (destination ? destination + '/' : '') + name)]);
        if(pairs.some(([,to])=>fs.existsSync(to)))throw Error('Im Zielordner existiert bereits eine Variante dieses Bildes.');
        const status=path.join(source,'raw',stem+'.status.json');if(fs.existsSync(status)&&['processing','pending'].includes(JSON.parse(fs.readFileSync(status)).status))throw Error('Das Video wird noch verarbeitet. Bitte warten.');
        const prefix='../../images/portfolio/';const replacements=[];
        for(const [from,to]of pairs){const old=path.relative(base,from).split(path.sep).join('/'),next=path.relative(base,to).split(path.sep).join('/');for(const start of [prefix,'../images/portfolio/','/images/portfolio/','images/portfolio/'])replacements.push([start+old,start+next]);}
        const edits=[];
        function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name.startsWith('.')||entry.isSymbolicLink()||['node_modules','portfolio-manager','images','fonts'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(/\.(html|json|js|css)$/.test(entry.name)){const before=fs.readFileSync(p,'utf8');let after=before;for(const [old,next]of replacements)after=after.split(old).join(next);if(after!==before)edits.push({p,before,after});}}}
        scan(root);
        const moved=[];try{for(const [from,to]of pairs){fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to);moved.push([from,to]);}for(const edit of edits)fs.writeFileSync(edit.p,edit.after);const meta=registry();if(meta[id]){meta[(destination?destination+'/':'')+path.basename(id)]=meta[id];delete meta[id];saveRegistry(meta);}}
        catch(error){for(const edit of edits)fs.writeFileSync(edit.p,edit.before);for(const [from,to]of moved.reverse())fs.renameSync(to,from);throw error;}
        return { files:pairs.length, updated:edits.length };
    }
    function remove(id) {
        const asset = catalog().items.find(item => item.id === id);
        if (!asset) throw Error('Datei nicht gefunden.');
        const dir = folder(asset.folder), stem = path.basename(id).replace(/:pdf$/, '');
        if (fs.existsSync(path.join(dir, stem + '.upload-lock'))) throw Error('Die Datei wird noch verarbeitet.');
        const files = asset.variants.map(url => inside(base, url.replace('../../images/portfolio/', '')));
        for (const name of id.endsWith(':pdf') ? [] : companions(dir, stem)) files.push(inside(dir, name));
        const privateBase = path.join(root, 'portfolio-manager/.media-sources');
        const privateSource = path.join(privateBase, asset.folder);
        if (fs.existsSync(privateSource)) for (const name of fs.readdirSync(privateSource)) if (path.parse(name).name === stem) files.push(inside(privateBase, (asset.folder ? asset.folder + '/' : '') + name));
        const trash = path.join(root, 'portfolio-manager/.media-trash', crypto.randomUUID()), moved = [];
        try {
            for (const from of files) { const to = path.join(trash, path.relative(root, from)); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); moved.push([from, to]); }
            const meta = registry(); delete meta[id]; saveRegistry(meta);
        } catch (error) { for (const [from, to] of moved.reverse()) fs.renameSync(to, from); throw error; }
        return { success: true, files: moved.length };
    }
    return { catalog, folder, reserve, move, remove };
}
function register(app, root, route) {
    const media=library(root);
    app.get('/api/studio/media',route(async(req,res)=>res.json(media.catalog())));
    app.post('/api/studio/media/folders',route(async(req,res)=>{const full=media.folder(req.body.folder);fs.mkdirSync(full,{recursive:true});res.json({success:true});}));
    app.post('/api/studio/media/delete',route(async(req,res)=>res.json(media.remove(req.body.id))));
    app.post('/api/studio/media/move',route(async(req,res)=>res.json(media.move(req.body.id,req.body.folder))));
}
module.exports={library,register};
