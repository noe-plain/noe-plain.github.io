const fs = require('fs');

function migrateDesign(file) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data = data.map(project => {
        let blocks = [];
        if (project.images) {
            let galleryItems = [];
            project.images.forEach(img => {
                if (img.type === 'pdf') {
                    blocks.push({
                        id: img.id || Math.random().toString(36).substr(2, 9),
                        type: 'pdf',
                        title: img.title,
                        imageUrl: img.imageUrl,
                        pdfUrl: img.pdfUrl
                    });
                } else if (img.imageUrl) {
                    galleryItems.push({ imageUrl: img.imageUrl, title: img.title });
                }
            });
            if (galleryItems.length > 0) {
                blocks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'gallery',
                    title: 'Galerie',
                    items: galleryItems
                });
            }
        }
        
        project.blocks = blocks;
        delete project.images;
        return project;
    });
    fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf8');
}

function migrateVideo(file) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data = data.map(project => {
        let blocks = [];
        
        if (project.pdf) {
             blocks.push({
                 id: Math.random().toString(36).substr(2, 9),
                 type: 'pdf',
                 title: project.pdf.title || "Dokumentation",
                 pdfUrl: project.pdf.link,
                 imageUrl: project.pdf.image || ""
             });
        }

        if (project.videos) {
            project.videos.forEach(v => {
                blocks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'youtube',
                    title: v.title,
                    videoId: v.youtubeId,
                    tags: v.tags ? v.tags.join(', ') : ''
                });
            });
        }
        
        project.blocks = blocks;
        delete project.pdf;
        delete project.videos;
        return project;
    });
    fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf8');
}

try {
    migrateVideo('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/video-projects.json');
    console.log('Migrated video-projects.json');
    migrateDesign('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/designs.json');
    console.log('Migrated designs.json');
    migrateDesign('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/illustrations.json');
    console.log('Migrated illustrations.json');
} catch (e) {
    console.error(e);
}
