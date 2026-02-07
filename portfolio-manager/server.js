const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
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
    video: path.join(PORTFOLIO_DATA_DIR, 'video-projects.json')
};

// Ensure directories exist
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.body.type; // 'design', 'illustration', 'video', 'photography'
        const category = req.body.category; // e.g., 'street', 'aviation' for photography

        let uploadPath = '';

        if (type === 'photography' && category) {
            uploadPath = path.join(IMAGES_DIR, 'photography');
        } else if (type === 'design') {
            uploadPath = path.join(IMAGES_DIR, 'design');
        } else if (type === 'illustration') {
            uploadPath = path.join(IMAGES_DIR, 'illustration');
        } else if (type === 'video') {
            // Video thumbnails usually go to specific folder or generic
            uploadPath = path.join(IMAGES_DIR, 'videografie'); // Corrected folder name
        } else {
            uploadPath = path.join(IMAGES_DIR, 'uploads'); // Fallback
        }

        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // For photography, we might want custom naming logic handled AFTER upload or specifically here
        // But Multer runs before body is fully parsed sometimes depending on order.
        // We will stick to original name and rename later if needed, or use a temp name.

        // Actually for this simple app, let's keep original name to avoid complexity, 
        // OR better: use timestamp to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


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

// Photography: Upload & Rename
// We use a separate handler because we want to enforce specific naming: category-XX.jpg
// We'll upload to temp then rename.
const photoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(IMAGES_DIR, 'photography');
        ensureDir(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Temp name
        cb(null, 'temp-' + Date.now() + path.extname(file.originalname));
    }
});
const photoUpload = multer({ storage: photoStorage });

app.post('/api/photography/upload', photoUpload.single('image'), (req, res) => {
    const category = req.body.category;
    if (!category || !req.file) {
        return res.status(400).json({ error: 'Missing category or file' });
    }

    const photoDir = path.join(IMAGES_DIR, 'photography');
    const files = fs.readdirSync(photoDir);
    const existing = files.filter(f => f.startsWith(category + '-'));

    // Find next index
    let maxIdx = 0;
    existing.forEach(f => {
        // extract number: street-01.jpg -> 01
        // regex
        const match = f.match(new RegExp(`^${category}-(\\d+)`));
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxIdx) maxIdx = num;
        }
    });

    const nextIdx = maxIdx + 1;
    const nextIdxStr = nextIdx < 10 ? `0${nextIdx}` : `${nextIdx}`;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Enforce .jpeg or .jpg or .png? Original seems to use .jpeg mostly
    // We keep original extension for now, but original code expects .jpeg mostly?
    // Let's stick to original extension to be safe, but maybe user wants standardization.
    // The previous code `category-XX.jpeg` suggests strict naming.
    // Let's rename to .jpeg if it's an image?
    // For safety, let's keep original extension but ensure it is handled in frontend.
    // ACTUALLY, checking `fotografie.js` step 3, it loads `${prefix}${numStr}.jpeg`.
    // So we MUST use .jpeg extension!

    const newFilename = `${category}-${nextIdxStr}.jpeg`; // Force jpeg
    const oldPath = req.file.path;
    const newPath = path.join(photoDir, newFilename);

    // If it's not a jpeg, we might need to convert?
    // For now we just rename and hope user uploaded a jpg/jpeg. 
    // If they upload png, resizing/converting is complex without sharp/jimp.
    // We assume user uploads photos. 

    fs.renameSync(oldPath, newPath);

    res.json({ success: true, filename: newFilename });
});

// Photography: Delete Image
app.delete('/api/photography', (req, res) => {
    const filename = req.body.filename;
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    const filePath = path.join(IMAGES_DIR, 'photography', filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
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

// Generic File Upload (for project images)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct public URL relative to project root
    // The file is saved in e.g. ../images/portfolio/design/filename.ext
    // The URL should be ../../images/portfolio/design/filename.ext (relative to portfolio/projekte/design.html)
    // BUT we need to be careful about where this URL is used.
    // In JSON, links are `../../images/...`

    // Let's determine subfolder based on req.body.type
    let typeDir = 'uploads';
    if (req.body.type === 'design') typeDir = 'design';
    else if (req.body.type === 'illustration') typeDir = 'illustration';
    else if (req.body.type === 'video') typeDir = 'videografie';

    // Because server is in /portfolio-manager, and images are in /images
    // The relative path from the *HTML files* (in /portfolio/projekte/...) to the image:
    // HTML is in /portfolio/projekte/
    // Image is in /images/portfolio/design/
    // Path: ../../images/portfolio/design/filename

    const filename = req.file.filename;
    const relativeUrl = `../../images/portfolio/${typeDir}/${filename}`;

    res.json({
        success: true,
        url: relativeUrl,
        filename: filename
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Portfolio Manager running at http://localhost:${port}`);
    console.log(`Project Root: ${PROJECT_ROOT}`);
});
