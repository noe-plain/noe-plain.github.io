const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const crypto = require('node:crypto');
const mediaJobs = new Map();
const { processImage, processVideo } = require('./media-processor');

const app = express();
const { inside, companions, publicMedia } = require('./safe-files');
const port = process.env.PORT || 3000;

require('./studio')(app, path.resolve(__dirname, '..'));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index explicitly at root as a fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use('/images', publicMedia, express.static(path.join(__dirname, '../images')));
app.use('/fonts', express.static(path.join(__dirname, '../fonts')));

// Paths to project root
const PROJECT_ROOT = path.join(__dirname, '..');
const PORTFOLIO_DATA_DIR = path.join(PROJECT_ROOT, 'portfolio/projekte');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images/portfolio');

// Specific JSON files
const DATA_FILES = {
    design: path.join(PORTFOLIO_DATA_DIR, 'designs.json'),
    illustration: path.join(PORTFOLIO_DATA_DIR, 'illustrations.json'),
    video: path.join(PORTFOLIO_DATA_DIR, 'video-projects.json'),
    photography: path.join(PORTFOLIO_DATA_DIR, 'photography.json'),
    links: path.join(PROJECT_ROOT, 'fake-cms.json')
};

// Ensure directories exist
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

// Multer Setup - Save uploads temporarily to a temp directory
const tempUploadsDir = path.join(__dirname, '.media-sources/incoming');
ensureDir(tempUploadsDir);

const tempStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: tempStorage, limits: { fileSize: 512 * 1024 * 1024, files: 1, fields: 8, parts: 9 } });

for (const url of ['/api/projects/:type', '/api/links', '/api/media/migrate-categories-to-projects', '/api/photography/reorder', '/api/photography/category', '/api/photography/upload']) app.post(url, (req, res) => res.status(410).json({ error: 'Bitte den aktuellen Redaktionsbereich verwenden. Diese ältere Schreibfunktion wurde durch die sichere Verwaltung ersetzt.' }));


// --- API Endpoints ---

// Get Data for Design/Illustration/Video
app.get('/api/projects/:type', (req, res) => {
    const type = req.params.type;
    const filePath = DATA_FILES[type];

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Data file not found' });
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Error reading data file' });
    }
});

// Save Data for Design/Illustration/Video

// --- Links (Fake CMS) ---

// Get Links Fake-CMS Data
app.get('/api/links', (req, res) => {
    const filePath = DATA_FILES['links'];
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Links data file not found' });
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Error reading links data file' });
    }
});

// Save Links Fake-CMS Data

// Photography: List Images
app.get('/api/photography/:category', (req, res) => {
    const category = req.params.category; // street, aviation, etc.
    const photoDir = path.join(IMAGES_DIR, 'photography');

    if (!fs.existsSync(photoDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(photoDir);
    // Filter by category prefix (e.g. 'street-')
    const categoryFiles = files.filter(f => f.startsWith(category + '-'));

    // Sort cleanly (handle numbers vs string sort)
    categoryFiles.sort();

    res.json(categoryFiles);
});

// List all media files under images/portfolio for Media Library
app.get('/api/media', (req, res) => {
    try { res.json(require('./media-library').library(PROJECT_ROOT).catalog().items.flatMap(asset => asset.variants)); }
    catch (error) { res.status(400).json({ error: error.message }); }
});

// Move a media file to another folder and update references across data files
app.post('/api/media/move', (req, res) => {
    try {
        if (typeof req.body.src !== 'string') throw Error('Bitte eine Datei wählen.');
        const rel = req.body.src.replace(/^(?:\.\.\/\.\.\/|\/)?images\/portfolio\//, '');
        inside(IMAGES_DIR, rel);
        if (req.body.newName && req.body.newName !== path.basename(rel)) throw Error('Bitte zum Umbenennen die aktuelle Mediathek verwenden.');
        const media = require('./media-library').library(PROJECT_ROOT);
        const asset = media.catalog().items.find(a => a.variants.includes('../../images/portfolio/' + rel));
        if (!asset) return res.status(404).json({ error: 'Datei nicht gefunden.' });
        const result = media.move(asset.id, req.body.destDir);
        res.json({ success: true, ...result, newUrl: '../../images/portfolio/' + req.body.destDir + '/' + path.basename(rel) });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

// Migrate photography categories (prefixes) into projects/<slug>/ folder

// Photography: Delete Image (integrated with Asset Pipeline cleanup)
app.delete('/api/photography', (req, res) => {
    try {
        const name = req.body.filename;
        if (typeof name !== 'string' || name !== path.basename(name)) throw Error('Ungültiger Dateiname.');
        inside(IMAGES_DIR, 'photography/' + name);
        const media = require('./media-library').library(PROJECT_ROOT);
        const asset = media.catalog().items.find(a => a.folder === 'photography' && a.variants.includes('../../images/portfolio/photography/' + name));
        if (!asset) return res.status(404).json({ error: 'Datei nicht gefunden.' });
        res.json(media.remove(asset.id));
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.use(['/api/upload', '/api/photography/upload'], (req, res, next) => {
    app.locals.mediaBusy = (app.locals.mediaBusy || 0) + 1;
    let finished = false; const done = () => { if (!finished) { finished = true; app.locals.mediaBusy--; } };
    req.releaseMedia = done;
    const onClose = () => { if (!req.mediaProcessing) done(); };
    res.once('finish', onClose); res.once('close', onClose); next();
});

// Generic File Upload (integrated with Image/Video pipelines)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    req.mediaProcessing = true;
    if (!req.file) {
        req.releaseMedia?.();
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let typeDir = 'uploads';
    if (req.file && req.file.mimetype && req.file.mimetype.includes('pdf')) {
        typeDir = 'uploads';
    } else if (req.body.type === 'design') typeDir = 'design';
    else if (req.body.type === 'illustration') typeDir = 'illustration';
    else if (req.body.type === 'video') typeDir = 'videografie';
    else if (req.body.type === 'photography') typeDir = 'photography';

    let asset;
    const typeFolder = typeof req.body.folder === 'string' ? req.body.folder : typeDir;
    try { asset = require('./media-library').library(PROJECT_ROOT).reserve(req.body.originalName || req.file.originalname, typeFolder); }
    catch(error) { fs.unlinkSync(req.file.path); req.releaseMedia?.(); return res.status(400).json({error:error.message}); }
    const destDir = asset.dir;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImageUpload = req.file.mimetype.startsWith('image/');
    const standardExt = isImageUpload ? '.jpg' : ext;
    const baseNameWithoutExt = asset.name;
    const finalFilename = `${baseNameWithoutExt}${standardExt}`;
    const relativeUrl = `../../images/portfolio/${typeFolder ? typeFolder + '/' : ''}${finalFilename}`;

    let processingVideo = false;
    try {
        const isPdf = req.file.mimetype === 'application/pdf' && ext === '.pdf';
        const isImage = req.file.mimetype.startsWith('image/');
        const isVideo = req.file.mimetype.startsWith('video/') && ['.mp4','.mov','.m4v','.webm'].includes(ext);

        if (isPdf) {
            const fd = fs.openSync(req.file.path, 'r'); const signature = Buffer.alloc(5);
            try { fs.readSync(fd, signature, 0, 5, 0); } finally { fs.closeSync(fd); }
            if (signature.toString() !== '%PDF-') throw Object.assign(Error('Die Datei ist kein gültiges PDF.'), { status: 400 });
            // PDF: move directly without processing
            const destPath = path.join(destDir, finalFilename);
            fs.renameSync(req.file.path, destPath);
            asset.record(isPdf);
            res.json({
                success: true,
                url: relativeUrl,
                filename: finalFilename
            });
        } else if (isVideo) {
            // Video: Transcode in background
            const result = processVideo(req.file.path, destDir, baseNameWithoutExt, ext, { sourceDir: typeFolder ? inside(path.join(__dirname, '.media-sources'), typeFolder) : path.join(__dirname, '.media-sources'), posterUrl: `../../images/portfolio/${typeFolder ? typeFolder + '/' : ''}${baseNameWithoutExt}-poster.webp` });
            const job = crypto.randomUUID(); mediaJobs.set(job, result.statusFilePath);
            processingVideo = true;
            const timer = setInterval(() => {
                try { const status = JSON.parse(fs.readFileSync(result.statusFilePath, 'utf8')); if (!['completed', 'failed'].includes(status.status)) return; } catch {}
                clearInterval(timer); asset.release(); req.releaseMedia?.();
            }, 500); timer.unref();
            
            // Expected final video URL
            const finalVideoUrl = `../../images/portfolio/${typeFolder ? typeFolder + '/' : ''}${baseNameWithoutExt}.mp4`;
            asset.record(isPdf);
            res.json({
                success: true,
                url: finalVideoUrl,
                filename: `${baseNameWithoutExt}.mp4`,
                statusUrl: '/api/media/status/' + job,
                posterUrl: result.posterUrl,
                isAsync: true
            });
        } else if (isImage) {
            // Image: Process synchronously
            if (req.file.size > 40 * 1024 * 1024) throw Error('Ein Bild darf höchstens 40 MB gross sein.');
            await processImage(req.file.path, destDir, baseNameWithoutExt, ext, standardExt, { sourceDir: typeFolder ? inside(path.join(__dirname, '.media-sources'), typeFolder) : path.join(__dirname, '.media-sources') });
            asset.record(isPdf);
            res.json({
                success: true,
                url: relativeUrl,
                filename: finalFilename
            });
        } else {
            throw Object.assign(Error('Unterstützt werden Bilder, PDF und Videos. HTML- und Skriptdateien sind nicht erlaubt.'), { status: 400 });
        }
    } catch (err) {
        if (!err.status && !/unsupported image format/.test(err.message)) console.error('File upload pipeline error:', err.message);
        res.status(err.status || 400).json({ error: 'Upload fehlgeschlagen: ' + err.message });
    } finally { if (!processingVideo) { asset.release(); req.releaseMedia?.(); } await fs.promises.rm(req.file.path, { force: true }); }
});

// Video transcoding status endpoint
app.get('/api/media/status/:baseName', (req, res) => {
    const baseName = req.params.baseName;
    if (!/^[a-zA-Z0-9_-]{1,140}$/.test(baseName)) return res.status(400).json({ error: 'Ungültige Verarbeitung.' });
    if (mediaJobs.has(baseName)) { try { return res.json(JSON.parse(fs.readFileSync(mediaJobs.get(baseName), 'utf8'))); } catch { return res.status(404).json({ error: 'Verarbeitung nicht gefunden.' }); } }
    const dirsToCheck = ['photography', 'design', 'illustration', 'videografie', 'uploads'];
    let statusFile = null;

    for (const d of dirsToCheck) {
        const p = path.join(IMAGES_DIR, d, 'raw', `${baseName}.status.json`);
        if (fs.existsSync(p)) {
            statusFile = p;
            break;
        }
    }

    if (!statusFile) {
        return res.status(404).json({ error: 'Video transcoding status file not found' });
    }

    try {
        const data = fs.readFileSync(statusFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: 'Error reading transcoding status' });
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Die Datei ist zu gross.' : 'Der Upload ist ungültig oder wurde abgebrochen.' });
});

// Start Server
if (require.main === module) app.listen(port, '127.0.0.1', () => {
    console.log(`Portfolio Manager running at http://localhost:${port}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);
});

module.exports = app;
