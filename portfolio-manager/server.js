const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { processImage, processVideo } = require('./media-processor');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index explicitly at root as a fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use('/images', express.static(path.join(__dirname, '../images')));
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
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveAllAssociatedFiles(oldPath, newPath) {
    if (!fs.existsSync(oldPath)) return;
    const oldDir = path.dirname(oldPath);
    const newDir = path.dirname(newPath);
    const oldBase = path.basename(oldPath, path.extname(oldPath));
    const newBase = path.basename(newPath, path.extname(newPath));

    ensureDir(newDir);

    // 1. Move main file
    fs.renameSync(oldPath, newPath);

    // 2. Move siblings (WebP, AVIF, responsive sizes, posters, etc.)
    if (fs.existsSync(oldDir)) {
        const files = fs.readdirSync(oldDir);
        files.forEach(f => {
            if (f !== path.basename(oldPath) && 
                (f === `${oldBase}.webp` || f === `${oldBase}.avif` || f === `${oldBase}-poster.webp` || f === `${oldBase}-hevc.mp4` || f.startsWith(`${oldBase}-`))) {
                const newSiblingName = f.replace(oldBase, newBase);
                fs.renameSync(path.join(oldDir, f), path.join(newDir, newSiblingName));
            }
        });
    }

    // 3. Move raw files
    const oldRawDir = path.join(oldDir, 'raw');
    const newRawDir = path.join(newDir, 'raw');
    if (fs.existsSync(oldRawDir)) {
        const rawFiles = fs.readdirSync(oldRawDir);
        rawFiles.forEach(f => {
            const ext = path.extname(f);
            const base = path.basename(f, ext);
            if (base === oldBase) {
                ensureDir(newRawDir);
                const newRawName = f.replace(oldBase, newBase);
                fs.renameSync(path.join(oldRawDir, f), path.join(newRawDir, newRawName));
            }
        });
    }

    // 4. Move HLS files
    const oldHlsDir = path.join(oldDir, 'hls');
    const newHlsDir = path.join(newDir, 'hls');
    if (fs.existsSync(oldHlsDir)) {
        const hlsFiles = fs.readdirSync(oldHlsDir);
        hlsFiles.forEach(f => {
            if (f.startsWith(oldBase)) {
                ensureDir(newHlsDir);
                const newHlsName = f.replace(oldBase, newBase);
                fs.renameSync(path.join(oldHlsDir, f), path.join(newHlsDir, newHlsName));
            }
        });
    }
}

function deleteAllAssociatedFiles(filePath) {
    if (!fs.existsSync(filePath)) return;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));

    // 1. Delete main file
    fs.unlinkSync(filePath);

    // 2. Delete siblings (WebP, AVIF, responsive sizes, posters, etc.)
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(f => {
            if (f === `${base}.webp` || f === `${base}.avif` || f === `${base}-poster.webp` || f === `${base}-hevc.mp4` || f.startsWith(`${base}-`)) {
                try { fs.unlinkSync(path.join(dir, f)); } catch (e) {}
            }
        });
    }

    // 3. Delete raw files
    const rawDir = path.join(dir, 'raw');
    if (fs.existsSync(rawDir)) {
        const rawFiles = fs.readdirSync(rawDir);
        rawFiles.forEach(f => {
            const ext = path.extname(f);
            const rawBase = path.basename(f, ext);
            if (rawBase === base) {
                try { fs.unlinkSync(path.join(rawDir, f)); } catch (e) {}
            }
        });
        try {
            if (fs.readdirSync(rawDir).length === 0) fs.rmdirSync(rawDir);
        } catch (e) {}
    }

    // 4. Delete HLS files
    const hlsDir = path.join(dir, 'hls');
    if (fs.existsSync(hlsDir)) {
        const hlsFiles = fs.readdirSync(hlsDir);
        hlsFiles.forEach(f => {
            if (f.startsWith(base)) {
                try { fs.unlinkSync(path.join(hlsDir, f)); } catch (e) {}
            }
        });
        try {
            if (fs.readdirSync(hlsDir).length === 0) fs.rmdirSync(hlsDir);
        } catch (e) {}
    }
}

// Multer Setup - Save uploads temporarily to a temp directory
const tempUploadsDir = path.join(PROJECT_ROOT, 'images/portfolio/temp');
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

const upload = multer({ storage: tempStorage });


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
app.post('/api/projects/:type', (req, res) => {
    const type = req.params.type;
    const filePath = DATA_FILES[type];
    const newData = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Invalid project type' });
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(newData, null, 4), 'utf8');
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error writing data file' });
    }
});

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
app.post('/api/links', (req, res) => {
    const filePath = DATA_FILES['links'];
    let newData = req.body;

    if (!Array.isArray(newData)) {
        return res.status(400).json({ error: 'Invalid links data format' });
    }

    // Sort alphabetically by name
    newData.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    try {
        fs.writeFileSync(filePath, JSON.stringify(newData, null, 4), 'utf8');
        res.json({ success: true, message: 'Links saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error writing links data file' });
    }
});

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
    const startDir = IMAGES_DIR; // images/portfolio
    const results = [];

    function walk(dir, relPath = '') {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        items.forEach(it => {
            const p = path.join(dir, it);
            const stats = fs.statSync(p);
            if (stats.isDirectory()) {
                walk(p, path.join(relPath, it));
            } else {
                // Build relative URL used by frontend JSON format (../../images/portfolio/...)
                const rel = `../../images/portfolio/${path.join(relPath, it).replace(/\\/g, '/')}`;
                results.push(rel);
            }
        });
    }

    try {
        walk(startDir);
        res.json(results);
    } catch (e) {
        console.error('media list error', e);
        res.status(500).json({ error: 'Error listing media' });
    }
});

// Move a media file to another folder and update references across data files
app.post('/api/media/move', (req, res) => {
    const { src, destDir, newName } = req.body || {};
    if (!src || !destDir) return res.status(400).json({ error: 'Missing src or destDir' });

    // Normalize source to relative path inside images/portfolio
    let rel = src.replace(/\\\\/g, '/');
    rel = rel.replace(/^\.\/.\/.\/images\/portfolio\//, '');
    rel = rel.replace(/^\/images\/portfolio\//, '');
    rel = rel.replace(/^images\/portfolio\//, '');

    const oldPath = path.join(IMAGES_DIR, rel);
    if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Source file not found' });

    // Ensure destination directory exists under images/portfolio
    const cleanDest = String(destDir).replace(/^\/+|\/+$/g, '');
    const destFolder = path.join(IMAGES_DIR, cleanDest);
    ensureDir(destFolder);

    const baseName = newName ? newName : path.basename(rel);
    const newPath = path.join(destFolder, baseName);

    try {
        moveAllAssociatedFiles(oldPath, newPath);
    } catch (e) {
        console.error('move error', e);
        return res.status(500).json({ error: 'Failed to move file' });
    }

    // Update JSON data files (projects) and HTML files under portfolio
    try {
        const filesToCheck = [];
        // DATA_FILES are JSON paths
        Object.values(DATA_FILES).forEach(p => { if (fs.existsSync(p)) filesToCheck.push(p); });

        // Also check any .html, .js under portfolio/ for occurrences
        function walkAndCollect(dir) {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            items.forEach(it => {
                const full = path.join(dir, it);
                const st = fs.statSync(full);
                if (st.isDirectory()) walkAndCollect(full);
                else if (full.endsWith('.html') || full.endsWith('.js')) filesToCheck.push(full);
            });
        }
        walkAndCollect(path.join(PROJECT_ROOT, 'portfolio'));

        // Replace occurrences of main extension and secondary extensions
        const oldExt = path.extname(rel);
        const newExt = path.extname(baseName);
        const oldBase = path.basename(rel, oldExt);
        const newBase = path.basename(baseName, newExt);

        filesToCheck.forEach(fpath => {
            try {
                let c = fs.readFileSync(fpath, 'utf8');
                let replaced = false;

                // Replace base files
                const before = `../../images/portfolio/${rel.replace(/\\\\/g, '/')}`;
                const after = `../../images/portfolio/${path.join(cleanDest, baseName).replace(/\\\\/g, '/')}`;
                if (c.includes(before)) {
                    c = c.split(before).join(after);
                    replaced = true;
                }

                // Replace potential webp/avif references
                const extsToUpdate = ['.webp', '.avif', '-poster.webp'];
                extsToUpdate.forEach(subExt => {
                    const beforeSub = `../../images/portfolio/${path.dirname(rel).replace(/\\\\/g, '/')}/${oldBase}${subExt}`;
                    const afterSub = `../../images/portfolio/${cleanDest}/${newBase}${subExt}`;
                    if (c.includes(beforeSub)) {
                        c = c.split(beforeSub).join(afterSub);
                        replaced = true;
                    }
                });

                if (replaced) {
                    fs.writeFileSync(fpath, c, 'utf8');
                }
            } catch (e) {
                console.error('update refs error for', fpath, e);
            }
        });
    } catch (e) {
        console.error('reference update error', e);
    }

    // Return new relative url for frontend
    const newRel = `../../images/portfolio/${path.join(cleanDest, baseName).replace(/\\\\/g, '/')}`;
    res.json({ success: true, newUrl: newRel });
});

// Migrate photography categories (prefixes) into projects/<slug>/ folder
app.post('/api/media/migrate-categories-to-projects', (req, res) => {
    const photoDir = path.join(IMAGES_DIR, 'photography');
    if (!fs.existsSync(photoDir)) return res.status(404).json({ error: 'Photography dir not found' });

    const files = fs.readdirSync(photoDir).filter(f => !f.startsWith('.'));
    const groups = {};
    files.forEach(f => {
        const m = f.match(/^([a-z0-9-]+)-/i);
        if (m && m[1]) {
            const prefix = m[1];
            if (!groups[prefix]) groups[prefix] = [];
            groups[prefix].push(f);
        }
    });

    const migrated = [];
    try {
        Object.keys(groups).forEach(prefix => {
            const destFolder = path.join(IMAGES_DIR, 'projects', prefix);
            ensureDir(destFolder);
            groups[prefix].forEach(fname => {
                const oldPath = path.join(photoDir, fname);
                const newPath = path.join(destFolder, fname);
                moveAllAssociatedFiles(oldPath, newPath);
                // update references in data files and html/js (reuse logic)
                const before = `../../images/portfolio/photography/${fname}`;
                const after = `../../images/portfolio/projects/${prefix}/${fname}`;
                // update DATA_FILES
                Object.values(DATA_FILES).forEach(p => {
                    if (!fs.existsSync(p)) return;
                    let c = fs.readFileSync(p, 'utf8');
                    if (c.includes(before)) {
                        c = c.split(before).join(after);
                        fs.writeFileSync(p, c, 'utf8');
                    }
                });
                // update portfolio/ html/js
                function walkAndReplace(dir) {
                    if (!fs.existsSync(dir)) return;
                    const items = fs.readdirSync(dir);
                    items.forEach(it => {
                        const full = path.join(dir, it);
                        const st = fs.statSync(full);
                        if (st.isDirectory()) walkAndReplace(full);
                        else if (full.endsWith('.html') || full.endsWith('.js')) {
                            let c = fs.readFileSync(full, 'utf8');
                            if (c.includes(before)) {
                                c = c.split(before).join(after);
                                fs.writeFileSync(full, c, 'utf8');
                            }
                        }
                    });
                }
                walkAndReplace(path.join(PROJECT_ROOT, 'portfolio'));
                migrated.push({ file: fname, to: `projects/${prefix}/${fname}` });
            });
        });
        res.json({ success: true, migrated });
    } catch (e) {
        console.error('migration error', e);
        res.status(500).json({ error: 'Migration failed', detail: String(e) });
    }
});

// Photography: Upload & Rename (integrated with Asset Pipeline)
app.post('/api/photography/upload', upload.single('image'), async (req, res) => {
    const category = req.body.category;
    if (!category || !req.file) {
        return res.status(400).json({ error: 'Missing category or file' });
    }

    try {
        const photoDir = path.join(IMAGES_DIR, 'photography');
        ensureDir(photoDir);
        const files = fs.readdirSync(photoDir);
        const existing = files.filter(f => f.startsWith(category + '-'));

        // Find next index
        let maxIdx = 0;
        existing.forEach(f => {
            const match = f.match(new RegExp(`^${category}-(\\d+)`));
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (num > maxIdx) maxIdx = num;
            }
        });

        const nextIdx = maxIdx + 1;
        const nextIdxStr = nextIdx < 10 ? `0${nextIdx}` : `${nextIdx}`;
        const ext = path.extname(req.file.originalname).toLowerCase();
        
        const baseName = `${category}-${nextIdxStr}`;
        const finalFilename = `${baseName}.jpeg`; // Force jpeg web fallback

        // Run through image processing pipeline, forcing .jpeg standard output
        await processImage(req.file.path, photoDir, baseName, ext, '.jpeg');

        res.json({ success: true, filename: finalFilename });
    } catch (err) {
        console.error('Photography upload error:', err);
        res.status(500).json({ error: 'Failed to process photography upload: ' + err.message });
    }
});

// Photography: Delete Image (integrated with Asset Pipeline cleanup)
app.delete('/api/photography', (req, res) => {
    const filename = req.body.filename;
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    const filePath = path.join(IMAGES_DIR, 'photography', filename);
    if (fs.existsSync(filePath)) {
        try {
            deleteAllAssociatedFiles(filePath);
            res.json({ success: true });
        } catch (e) {
            console.error('Delete photography error:', e);
            res.status(500).json({ error: 'Failed to delete all associated assets: ' + e.message });
        }
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Photography: Reorder Images
app.post('/api/photography/reorder', (req, res) => {
    const { category, filenames } = req.body; // filenames is the array of names in NEW order
    if (!category || !filenames || !Array.isArray(filenames)) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    const photoDir = path.join(IMAGES_DIR, 'photography');
    if (!fs.existsSync(photoDir)) return res.status(404).json({ error: 'Dir not found' });

    // 1. Rename all involved files to temp names to avoid collisions
    // We map oldFilename -> tempPath
    const tempMap = [];

    try {
        filenames.forEach(filename => {
            const oldPath = path.join(photoDir, filename);
            if (fs.existsSync(oldPath)) {
                const tempName = `temp-${Date.now()}-${Math.random()}${path.extname(filename)}`;
                const tempPath = path.join(photoDir, tempName);
                fs.renameSync(oldPath, tempPath);
                tempMap.push({ tempPath, originalExt: path.extname(filename) });
            }
        });

        // 2. Rename from temp to new properly numbered names
        // category-01.jpeg, category-02.jpeg ...
        tempMap.forEach((item, index) => {
            const num = index + 1;
            const numStr = num < 10 ? `0${num}` : `${num}`;
            // Force .jpeg as per previous logic, or use original extension? 
            // The user wants numbering to be correct. Existing files are .jpeg.
            // Let's use the original extension to be safe, OR force .jpeg if that's the convention.
            // The previous upload logic forced .jpeg. Let's stick to .jpeg if possible, or use item.originalExt.
            // If the user manually added a .png, we shouldn't break it. 
            // But the sequence logic expects strict naming. 
            // Let's use the original extension.

            const newName = `${category}-${numStr}${item.originalExt}`;
            const newPath = path.join(photoDir, newName);
            fs.renameSync(item.tempPath, newPath);
        });

        res.json({ success: true });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error reordering files' });
    }
});

// Photography: Add Category and update code files
app.post('/api/photography/category', (req, res) => {
    const slug = req.body.name;
    const displayName = req.body.displayName || slug;

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Invalid category slug' });
    }

    try {
        // 1. Update portfolio-manager/public/app.js
        const appJsPath = path.join(__dirname, 'public/app.js');
        if (fs.existsSync(appJsPath)) {
            let content = fs.readFileSync(appJsPath, 'utf8');
            
            // Find let photoCategories = [...];
            const photoCatRegex = /(let photoCategories\s*=\s*\[)([^\]]+)(\];)/;
            const match = content.match(photoCatRegex);
            if (match) {
                const categoriesStr = match[2];
                const categoriesList = categoriesStr.split(',').map(s => s.trim().replace(/['"]/g, ''));
                if (!categoriesList.includes(slug)) {
                    const updatedCategoriesStr = categoriesStr.trim().replace(/,?\s*$/, '') + `, '${slug}'`;
                    content = content.replace(photoCatRegex, `$1${updatedCategoriesStr}$3`);
                }
            }
            
            // Find const categoryDisplayNames = { ... };
            const displayNamesRegex = /(const categoryDisplayNames\s*=\s*\{)([\s\S]*?)(\};)/;
            const matchDisp = content.match(displayNamesRegex);
            if (matchDisp) {
                const displayNamesStr = matchDisp[2];
                if (!displayNamesStr.includes(`'${slug}':`)) {
                    const cleanDisplayNamesStr = displayNamesStr.trim().replace(/,?\s*$/, '');
                    const updatedDisplayNamesStr = cleanDisplayNamesStr + `,\n    '${slug}': '${displayName}'\n`;
                    content = content.replace(displayNamesRegex, `$1${updatedDisplayNamesStr}$3`);
                }
            }
            
            fs.writeFileSync(appJsPath, content, 'utf8');
        }
        
        // 2. Update portfolio/projekte/fotografie.js
        const fotoJsPath = path.join(PROJECT_ROOT, 'portfolio/projekte/fotografie.js');
        if (fs.existsSync(fotoJsPath)) {
            let content = fs.readFileSync(fotoJsPath, 'utf8');
            const categoriesRegex = /(const categories\s*=\s*\{)([\s\S]*?)(\};)/;
            const matchCat = content.match(categoriesRegex);
            if (matchCat) {
                const categoriesStr = matchCat[2];
                if (!categoriesStr.includes(`'${slug}':`)) {
                    const cleanCategoriesStr = categoriesStr.trim().replace(/,?\s*$/, '');
                    const newEntry = `    '${slug}': { prefix: '${slug}-', container: 'lightgallery-${slug}', path: '../../images/portfolio/photography/' }`;
                    const updatedCategoriesStr = cleanCategoriesStr + `,\n${newEntry}\n`;
                    content = content.replace(categoriesRegex, `$1${updatedCategoriesStr}$3`);
                }
            }
            fs.writeFileSync(fotoJsPath, content, 'utf8');
        }
        
        // 3. Update portfolio/projekte/fotografie.html
        const fotoHtmlPath = path.join(PROJECT_ROOT, 'portfolio/projekte/fotografie.html');
        if (fs.existsSync(fotoHtmlPath)) {
            let content = fs.readFileSync(fotoHtmlPath, 'utf8');
            
            const pageNavRegex = /(<div id="page-nav">)([\s\S]*?)(<\/div>)/;
            const pageNavMatch = content.match(pageNavRegex);
            if (pageNavMatch) {
                const tabsContent = pageNavMatch[2];
                if (!tabsContent.includes(`href="?${slug}"`)) {
                    const newTab = `\n            <a href="?${slug}" class="tab-btn">${displayName}</a>\n        `;
                    const updatedTabsContent = tabsContent.trim() + newTab;
                    content = content.replace(pageNavRegex, `$1${updatedTabsContent}$3`);
                }
            }
            
            const galleryContainerRegex = /(<div id="gallery-container">)([\s\S]*?)(<\/div>\s*<\/main>)/;
            const galleryMatch = content.match(galleryContainerRegex);
            if (galleryMatch) {
                const galleryContent = galleryMatch[2];
                if (!galleryContent.includes(`id="section-${slug}"`)) {
                    const newSection = `\n            <div id="section-${slug}" class="gallery-section">\n                <h2>${displayName} Photo&shy;graphy</h2>\n                <div id="lightgallery-${slug}" class="project-gallery"></div>\n            </div>\n        `;
                    const updatedGalleryContent = galleryContent.trim() + newSection;
                    content = content.replace(galleryContainerRegex, `$1${updatedGalleryContent}$3`);
                }
            }
            fs.writeFileSync(fotoHtmlPath, content, 'utf8');
        }

        // 4. Update portfolio/fotografie.html (the overview page)
        const mainHtmlPath = path.join(PROJECT_ROOT, 'portfolio/fotografie.html');
        if (fs.existsSync(mainHtmlPath)) {
            let content = fs.readFileSync(mainHtmlPath, 'utf8');
            const gridRegex = /(<div class="category-grid">)([\s\S]*?)(<\/div>\s*<\/main>)/;
            const gridMatch = content.match(gridRegex);
            if (gridMatch) {
                const gridContent = gridMatch[2];
                if (!gridContent.includes(`href="projekte/fotografie.html?${slug}"`)) {
                    const newCard = `\n            <a href="projekte/fotografie.html?${slug}" class="category-card">\n                <img src="../images/portfolio/photography/${slug}-01.jpeg" alt="${displayName} Photography"\n                    class="category-bg-img" onerror="this.src='../images/portfolio/photography/hero-image.jpeg'">\n                <div class="category-overlay">\n                    <h3>${displayName}</h3>\n                    <p>${displayName} Photography.</p>\n                </div>\n            </a>\n        `;
                    const updatedGridContent = gridContent.trim() + newCard;
                    content = content.replace(gridRegex, `$1${updatedGridContent}$3`);
                }
            }
            fs.writeFileSync(mainHtmlPath, content, 'utf8');
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to write category to files' });
    }
});

// Generic File Upload (integrated with Image/Video pipelines)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let typeDir = 'uploads';
    if (req.file && req.file.mimetype && req.file.mimetype.includes('pdf')) {
        typeDir = 'uploads';
    } else if (req.body.type === 'design') typeDir = 'design';
    else if (req.body.type === 'illustration') typeDir = 'illustration';
    else if (req.body.type === 'video') typeDir = 'videografie';
    else if (req.body.type === 'photography') typeDir = 'photography';

    const destDir = path.join(IMAGES_DIR, typeDir);
    ensureDir(destDir);

    const ext = path.extname(req.file.originalname).toLowerCase();
    const baseNameWithoutExt = path.basename(req.file.filename, path.extname(req.file.filename));
    const finalFilename = `${baseNameWithoutExt}${ext}`;
    const relativeUrl = `../../images/portfolio/${typeDir}/${finalFilename}`;

    try {
        const isPdf = req.file.mimetype.includes('pdf');
        const isImage = req.file.mimetype.startsWith('image/');
        const isVideo = req.file.mimetype.startsWith('video/');

        if (isPdf) {
            // PDF: move directly without processing
            const destPath = path.join(destDir, finalFilename);
            fs.renameSync(req.file.path, destPath);
            res.json({
                success: true,
                url: relativeUrl,
                filename: finalFilename
            });
        } else if (isVideo) {
            // Video: Transcode in background
            const result = processVideo(req.file.path, destDir, baseNameWithoutExt, ext);
            
            // Expected final video URL
            const finalVideoUrl = `../../images/portfolio/${typeDir}/${baseNameWithoutExt}.mp4`;
            res.json({
                success: true,
                url: finalVideoUrl,
                filename: `${baseNameWithoutExt}.mp4`,
                statusUrl: result.statusUrl,
                posterUrl: result.posterUrl,
                isAsync: true
            });
        } else if (isImage) {
            // Image: Process synchronously
            await processImage(req.file.path, destDir, baseNameWithoutExt, ext);
            res.json({
                success: true,
                url: relativeUrl,
                filename: finalFilename
            });
        } else {
            // Fallback for other file types
            const destPath = path.join(destDir, finalFilename);
            fs.renameSync(req.file.path, destPath);
            res.json({
                success: true,
                url: relativeUrl,
                filename: finalFilename
            });
        }
    } catch (err) {
        console.error('File upload pipeline error:', err);
        res.status(500).json({ error: 'Failed to process file through pipeline: ' + err.message });
    }
});

// Video transcoding status endpoint
app.get('/api/media/status/:baseName', (req, res) => {
    const baseName = req.params.baseName;
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

// --- Publish: run git add/commit/push in project root ---
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

app.post('/api/publish', async (req, res) => {
    try {
        // Detect current branch
        let branch = 'main';
        try {
            const { stdout: branchOut } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT });
            if (branchOut && branchOut.trim()) branch = branchOut.trim();
        } catch (e) {
            console.warn("Could not detect git branch, defaulting to 'main'", e);
        }

        // 1. Fetch and Rebase to prevent push rejections
        try {
            await exec('git fetch origin', { cwd: PROJECT_ROOT });
            await exec(`git pull --rebase origin ${branch}`, { cwd: PROJECT_ROOT });
        } catch (pullErr) {
            console.error("Git pull --rebase failed:", pullErr);
            return res.status(409).json({
                success: false,
                error: "Automatische Synchronisation fehlgeschlagen (Rebase-Konflikt). Bitte löse Konflikte manuell auf.",
                details: pullErr.message
            });
        }

        // 2. Check for changes
        const { stdout: statusOut } = await exec('git status --porcelain', { cwd: PROJECT_ROOT });
        if (!statusOut || statusOut.trim() === '') {
            return res.json({ 
                success: true, 
                message: 'Keine Änderungen zum Veröffentlichen.',
                deployment: getDeploymentTrackingInfo()
            });
        }

        // Ensure a committer identity exists
        try {
            await exec('git config user.name "Portfolio Manager"', { cwd: PROJECT_ROOT });
            await exec('git config user.email "portfolio@local"', { cwd: PROJECT_ROOT });
        } catch (e) {
            // Non-fatal
        }

        // 3. Stage & Commit
        await exec('git add -A', { cwd: PROJECT_ROOT });

        const userMsg = req.body && req.body.message ? String(req.body.message) : null;
        const commitMsg = userMsg || `Publish via portfolio-manager: ${new Date().toISOString()}`;
        try {
            const safeMsg = commitMsg.replace(/"/g, '\\"');
            await exec(`git commit -m "${safeMsg}"`, { cwd: PROJECT_ROOT });
        } catch (commitErr) {
            const { stdout: afterStatus } = await exec('git status --porcelain', { cwd: PROJECT_ROOT });
            if (!afterStatus || afterStatus.trim() === '') {
                return res.json({ 
                    success: true, 
                    message: 'Keine Änderungen zum Veröffentlichen nach Staging.',
                    deployment: getDeploymentTrackingInfo()
                });
            }
            throw commitErr;
        }

        // 4. Push
        const { stdout: pushOut, stderr: pushErr } = await exec(`git push origin ${branch}`, { cwd: PROJECT_ROOT });

        res.json({ 
            success: true, 
            message: pushOut || 'Pushed.', 
            debug: pushErr,
            deployment: getDeploymentTrackingInfo()
        });
    } catch (e) {
        console.error('Publish error:', e);
        const errMsg = (e && e.message) ? e.message : String(e);
        res.status(500).json({ success: false, error: 'Fehler beim Veröffentlichen: ' + errMsg });
    }
});

// Helper to detect deployment tracking keys
function getDeploymentTrackingInfo() {
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
        return { type: 'vercel', projectId: process.env.VERCEL_PROJECT_ID };
    }
    if (process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_SITE_ID) {
        return { type: 'netlify', siteId: process.env.NETLIFY_SITE_ID };
    }
    return { type: 'simulated', durationMs: 35000 };
}

// Live deployment status API
app.get('/api/publish/status', async (req, res) => {
    // Vercel deployment tracking
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
        try {
            const url = `https://api.vercel.com/v6/deployments?projectId=${process.env.VERCEL_PROJECT_ID}&limit=1`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
            });
            const data = await response.json();
            if (data.deployments && data.deployments.length > 0) {
                const dep = data.deployments[0];
                return res.json({
                    success: true,
                    type: 'vercel',
                    status: dep.state === 'READY' ? 'ready' : (dep.state === 'ERROR' ? 'error' : 'building'),
                    url: dep.url,
                    createdAt: dep.createdAt
                });
            }
        } catch (e) {
            return res.json({ success: false, status: 'error', detail: e.message });
        }
    }

    // Netlify deployment tracking
    if (process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_SITE_ID) {
        try {
            const url = `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/deploys?per_page=1`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` }
            });
            const deploys = await response.json();
            if (deploys && deploys.length > 0) {
                const dep = deploys[0];
                return res.json({
                    success: true,
                    type: 'netlify',
                    status: dep.state === 'ready' ? 'ready' : (dep.state === 'error' ? 'error' : 'building'),
                    url: dep.ssl_url || dep.url,
                    createdAt: dep.created_at
                });
            }
        } catch (e) {
            return res.json({ success: false, status: 'error', detail: e.message });
        }
    }

    // Default simulated response
    res.json({ 
        success: true, 
        type: 'simulated', 
        status: 'not_configured' 
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Portfolio Manager running at http://localhost:${port}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);
});
