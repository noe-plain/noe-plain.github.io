// State
let currentType = 'design';
let projectsData = [];

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModal();
    setupPhotography();

    // Load initial data
    loadProjects('design');
});

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.tab-content');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Content Toggle
            const type = btn.dataset.tab;
            sections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none'; // Force hide
            });

            const activeSection = document.getElementById(`tab-${type}`);
            activeSection.classList.add('active');
            activeSection.style.display = 'block'; // Force show

            // Logic Switch
            currentType = type;
            if (type === 'photography') {
                loadPhotography();
            } else {
                loadProjects(type);
            }
        });
    });

    // Initialize first tab
    sections.forEach(s => s.style.display = 'none');
    document.getElementById('tab-design').style.display = 'block';
}

/* --- Projects Logic --- */

async function loadProjects(type) {
    try {
        const res = await fetch(`/api/projects/${type}`);
        if (!res.ok) throw new Error('Failed to load');
        projectsData = await res.json();
        renderProjects(projectsData, type);
    } catch (e) {
        console.error(e);
        alert('Fehler beim Laden der Projekte');
    }
}

function renderProjects(data, type) {
    const container = document.getElementById(`list-${type}`);
    container.innerHTML = '';

    data.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';

        // Hero image resolution
        let imgUrl = '';
        if (p['hero-image']) imgUrl = p['hero-image'];
        else if (p.heroImage) imgUrl = p.heroImage;
        else if (p.images && p.images.length > 0) imgUrl = p.images[0].imageUrl;

        const displayImg = imgUrl ? imgUrl.replace('../../', '/') : '';

        card.innerHTML = `
            <div class="card-img" style="background-image: url('${displayImg}')"></div>
            <div class="card-body">
                <h3>${p.title}</h3>
                <p>${p.description || ''}</p>
                <div class="card-actions">
                    <button class="btn-small btn-edit" onclick="editProject('${p.id}')">Bearbeiten</button>
                    <button class="btn-small btn-delete" onclick="deleteProject('${p.id}')">Löschen</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/* --- Modal Logic --- */

const modal = document.getElementById('project-modal');
const form = document.getElementById('project-form');

function setupModal() {
    form.addEventListener('submit', handleSave);
    const genericInput = document.getElementById('generic-upload-input');
    genericInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const targetId = genericInput.dataset.targetInput;
        await uploadFile(file, currentType, targetId);
        genericInput.value = '';
    });
}

function openProjectModal(type, project = null) {
    currentType = type;
    document.getElementById('p-type').value = type;

    // Clear all fields
    form.reset();
    document.getElementById('video-list-container').innerHTML = '';
    document.getElementById('gallery-list-container').innerHTML = '';

    // Toggle Visibility
    document.querySelectorAll('.type-specific-fields').forEach(el => el.classList.add('hidden'));

    if (type === 'video') {
        document.getElementById('fields-video').classList.remove('hidden');
    } else {
        document.getElementById('fields-gallery').classList.remove('hidden');
        if (type === 'design') {
            // No specific show/hide for design vs illustration anymore, they share the gallery list
        }
    }

    if (project) {
        document.getElementById('modal-title').innerText = 'Projekt bearbeiten';
        document.getElementById('p-id').value = project.id;
        document.getElementById('p-title').value = project.title;
        document.getElementById('p-desc').value = project.description || '';
        document.getElementById('p-tabTitle').value = project.tabTitle || '';
        document.getElementById('p-hero').value = project['hero-image'] || project.heroImage || '';

        // Load Specifics
        if (type === 'video') {
            // Load Hero Meta
            // meta is array of strings: "<strong>Key:</strong> Value"
            if (project.heroMeta) {
                project.heroMeta.forEach(m => {
                    if (m.includes('Rolle')) document.getElementById('p-role').value = stripHtml(m).replace('Rolle:', '').trim();
                    if (m.includes('Equipment')) document.getElementById('p-equipment').value = stripHtml(m).replace('Equipment:', '').trim();
                    if (m.includes('Tools')) document.getElementById('p-tools').value = stripHtml(m).replace('Tools:', '').trim();
                });
            }
            // Load Videos
            if (project.videos) {
                project.videos.forEach(v => addVideoInput(v));
            }
        } else {
            // Design/Illustration
            // Load PDF
            // Design projects sometimes have PDF in images array with type='pdf', OR in specific cases maybe separate?
            // The JSON shows PDFs in 'images' array with type: 'pdf'.
            // AND the video project has a 'pdf' object. (Wait, video has pdf too?)
            // Checking designs.json: it has "images": [ { "type": "pdf", ... } ]

            // Let's filter out PDF from images for display in gallery list
            // populate PDF input if found
            // Verify if project.images exists
            if (project.images) {
                // Load ALL items, including PDFs, into the list
                project.images.forEach(img => addGalleryImageInput(img));
            }

            // Check video-projects.json specific pdf structure just in case? 
            // Video JSON has "pdf": { "link": "..." }
            // But we are in 'design'/'illustration' block here.
        }

    } else {
        document.getElementById('modal-title').innerText = 'Neues Projekt';
        document.getElementById('p-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

window.editProject = function (id) {
    const p = projectsData.find(x => x.id === id);
    if (p) openProjectModal(currentType, p);
};

window.deleteProject = async function (id) {
    if (!confirm("Wirklich löschen?")) return;

    // Ensure ID comparison is correct (strings vs numbers)
    projectsData = projectsData.filter(p => String(p.id) !== String(id));

    await saveAllProjects();
};

/* --- Form Saving --- */

async function handleSave(e) {
    e.preventDefault();

    const id = document.getElementById('p-id').value || generateId(document.getElementById('p-title').value);
    const title = document.getElementById('p-title').value;
    const desc = document.getElementById('p-desc').value;
    const hero = document.getElementById('p-hero').value;
    const tabTitle = document.getElementById('p-tabTitle').value;

    let newProject = {
        id: id,
        title: title,
        description: desc,
        tabTitle: tabTitle || title // default to title if empty
    };

    if (currentType === 'video') {
        newProject.heroImage = hero;

        // Construct Meta
        const role = document.getElementById('p-role').value;
        const equip = document.getElementById('p-equipment').value;
        const tools = document.getElementById('p-tools').value;

        newProject.heroMeta = [];
        if (role) newProject.heroMeta.push(`<strong>Rolle:</strong> ${role}`);
        if (equip) newProject.heroMeta.push(`<strong>Equipment:</strong> ${equip}`);
        if (tools) newProject.heroMeta.push(`<strong>Tools:</strong> ${tools}`);

        // Construct Videos
        newProject.videos = [];
        const videoRows = document.querySelectorAll('.video-item-row');
        videoRows.forEach(row => {
            newProject.videos.push({
                title: row.querySelector('.vid-title').value,
                youtubeId: row.querySelector('.vid-id').value,
                tags: row.querySelector('.vid-tags').value.split(',').map(s => s.trim()).filter(s => s)
            });
        });

    } else {
        // Design & Illustration
        newProject["hero-image"] = hero;
        newProject.images = [];



        // Gallery & PDFs
        const galleryRows = document.querySelectorAll('.gallery-item-row');
        galleryRows.forEach((row, idx) => {
            const isPdf = row.querySelector('.is-pdf-cb').checked;
            const titleVal = row.querySelector('.img-title').value;

            if (isPdf) {
                const pdfUrl = row.querySelector('.pdf-url').value;
                const coverUrl = row.querySelector('.pdf-cover-url').value;
                if (pdfUrl) {
                    newProject.images.push({
                        id: `${id}-pdf-${idx}`,
                        type: 'pdf',
                        pdfUrl: pdfUrl,
                        imageUrl: coverUrl || hero, // Fallback to hero if no cover
                        title: titleVal || title
                    });
                }
            } else {
                const url = row.querySelector('.img-url').value;
                if (url) {
                    newProject.images.push({
                        id: `${id}-img-${idx}`,
                        imageUrl: url,
                        title: titleVal || title
                    });
                }
            }
        });
    }

    // Update data array
    const existingIdx = projectsData.findIndex(p => p.id === id);
    if (existingIdx > -1) {
        projectsData[existingIdx] = newProject;
    } else {
        projectsData.push(newProject);
    }

    await saveAllProjects();
    closeModal();
}

async function saveAllProjects() {
    try {
        const res = await fetch(`/api/projects/${currentType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectsData)
        });
        if (res.ok) loadProjects(currentType);
        else alert('Fehler beim Speichern');
    } catch (e) {
        console.error(e);
        alert('Fehler beim Speichern');
    }
}

/* --- Helpers --- */

function generateId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

/* --- Dynamic Inputs --- */

window.addVideoInput = function (data = null) {
    const container = document.getElementById('video-list-container');
    const div = document.createElement('div');
    div.className = 'video-item-row';
    div.innerHTML = `
        <div class="row-header">
            <span>Video</span>
            <button type="button" class="btn-row-delete" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
        </div>
        <input type="text" class="vid-title" placeholder="Video Titel" value="${data ? data.title : ''}">
        <input type="text" class="vid-id" placeholder="YouTube ID (z.B. dQw4w9WgXcQ)" value="${data ? data.youtubeId : ''}">
        <input type="text" class="vid-tags" placeholder="Tags (kommagetrennt)" value="${data ? (data.tags || []).join(', ') : ''}">
    `;
    container.appendChild(div);
}

window.addGalleryImageInput = function (data = null) {
    const container = document.getElementById('gallery-list-container');
    const div = document.createElement('div');
    div.className = 'gallery-item-row';
    const isPdf = data && data.type === 'pdf';

    div.innerHTML = `
        <div class="row-header">
            <span>${isPdf ? 'PDF Dokument' : 'Bild'}</span>
            <div class="row-controls">
                <label style="margin-right: 10px; font-size: 0.9em;">
                    <input type="checkbox" class="is-pdf-cb" onchange="togglePdfInputs(this)" ${isPdf ? 'checked' : ''}> PDF?
                </label>
                <button type="button" class="btn-move" onclick="moveRow(this, -1)" title="Nach oben"><i class="fas fa-chevron-up"></i></button>
                <button type="button" class="btn-move" onclick="moveRow(this, 1)" title="Nach unten"><i class="fas fa-chevron-down"></i></button>
                <button type="button" class="btn-row-delete" onclick="this.parentElement.parentElement.parentElement.remove()" title="Löschen"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        
        <!-- Image Input -->
        <div class="input-with-btn image-input-group ${isPdf ? 'hidden' : ''}">
            <input type="text" class="img-url" placeholder="Bild URL" value="${!isPdf && data ? data.imageUrl : ''}">
            <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-upload"></i></button>
        </div>

        <!-- PDF Inputs -->
        <div class="pdf-input-group ${isPdf ? '' : 'hidden'}">
            <div class="input-with-btn">
                <input type="text" class="pdf-url" placeholder="PDF Datei URL" value="${isPdf && data ? data.pdfUrl : ''}">
                <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-file-pdf"></i></button>
            </div>
            <div class="input-with-btn" style="margin-top: 5px;">
                <input type="text" class="pdf-cover-url" placeholder="PDF Titelbild URL" value="${isPdf && data ? data.imageUrl : ''}">
                <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-image"></i></button>
            </div>
        </div>

        <input type="text" class="img-title" placeholder="Titel / Caption" value="${data ? data.title : ''}" style="margin-top: 5px;">
    `;
    container.appendChild(div);
}

window.togglePdfInputs = function (cb) {
    const row = cb.closest('.gallery-item-row');
    const isPdf = cb.checked;

    const imgGroup = row.querySelector('.image-input-group');
    const pdfGroup = row.querySelector('.pdf-input-group');
    const labelSpan = row.querySelector('.row-header span');

    if (isPdf) {
        imgGroup.classList.add('hidden');
        pdfGroup.classList.remove('hidden');
        labelSpan.innerText = 'PDF Dokument';
    } else {
        imgGroup.classList.remove('hidden');
        pdfGroup.classList.add('hidden');
        labelSpan.innerText = 'Bild';
    }
}

window.moveRow = function (btn, direction) {
    const row = btn.closest('.gallery-item-row') || btn.closest('.video-item-row');
    if (!row) return;

    if (direction === -1) {
        // Move Up
        if (row.previousElementSibling) {
            row.parentNode.insertBefore(row, row.previousElementSibling);
        }
    } else {
        // Move Down
        if (row.nextElementSibling) {
            row.parentNode.insertBefore(row.nextElementSibling, row);
        }
    }
}

/* --- Photography --- */
const photoSelect = document.getElementById('photo-category-select');
const photoInput = document.getElementById('photo-upload-input');

function setupPhotography() {
    photoSelect.addEventListener('change', () => loadPhotography());
    photoInput.addEventListener('change', uploadPhoto);
}

async function loadPhotography() {
    if (currentType !== 'photography') return;
    const cat = photoSelect.value;
    const container = document.getElementById('photo-grid');
    container.innerHTML = '<p>Laden...</p>';

    try {
        const res = await fetch(`/api/photography/${cat}`);
        const files = await res.json();
        container.innerHTML = '';
        files.forEach(f => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            item.draggable = true;
            item.dataset.filename = f;
            item.innerHTML = `
                <img src="/images/portfolio/photography/${f}?t=${Date.now()}" loading="lazy">
                <div class="photo-overlay">
                    <span>${f}</span>
                    <button class="btn-small btn-delete" onclick="deletePhoto('${f}')"><i class="fas fa-trash"></i></button>
                </div>
            `;

            // Drag Events
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);

            container.appendChild(item);
        });
    } catch (e) { container.innerHTML = 'Fehler.'; }
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    this.classList.remove('drag-over');
    draggedItem.classList.remove('dragging');

    if (draggedItem !== this) {
        // Swap DOM elements
        // Logic: Insert draggedItem before or after 'this' depending on position?
        // Simpler: Just swap the HTML or insertBefore. 
        // Let's use a robust approach:

        const container = document.getElementById('photo-grid');
        const items = [...container.querySelectorAll('.photo-item')];
        const draggedIdx = items.indexOf(draggedItem);
        const droppedIdx = items.indexOf(this);

        if (draggedIdx < droppedIdx) {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedItem, this);
        }

        // Save new order
        await savePhotoOrder();
    }
}

async function savePhotoOrder() {
    const container = document.getElementById('photo-grid');
    const items = [...container.querySelectorAll('.photo-item')];
    const filenames = items.map(item => item.dataset.filename);
    const category = document.getElementById('photo-category-select').value;

    try {
        const res = await fetch('/api/photography/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, filenames })
        });
        if (res.ok) {
            // Reload to reflect new names (images might glitch if names change but cache handles it via ?t=)
            // Actually, since we rename files, the 'src' in DOM is now pointing to OLD filenames that don't exist!
            // We MUST reload the grid to get new filenames.
            loadPhotography();
        } else {
            alert('Fehler beim Speichern der Reihenfolge');
        }
    } catch (e) {
        console.error(e);
        alert('Netzwerkfehler');
    }
}

window.deletePhoto = async function (filename) {
    if (!confirm(`Löschen?`)) return;
    try {
        await fetch('/api/photography', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        loadPhotography();
    } catch (e) { alert('Error'); }
}

window.triggerPhotoUpload = function () { document.getElementById('photo-upload-input').click(); }

async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', photoSelect.value);
    await fetch('/api/photography/upload', { method: 'POST', body: formData });
    loadPhotography();
    photoInput.value = '';
}

/* --- Generic Upload --- */
window.triggerUpload = function (targetInputOrId) {
    const genericInput = document.getElementById('generic-upload-input');
    if (typeof targetInputOrId === 'string') genericInput.dataset.targetInput = targetInputOrId;
    else {
        if (!targetInputOrId.id) targetInputOrId.id = 'temp-' + Date.now();
        genericInput.dataset.targetInput = targetInputOrId.id;
    }
    genericInput.click();
}

async function uploadFile(file, type, targetInputId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
            const input = document.getElementById(targetInputId);
            if (input) input.value = json.url;
        }
    } catch (e) { alert('Upload Error'); }
}
