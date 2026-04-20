// State
let currentType = 'dashboard';
let projectsData = [];
let linksData = [];

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModal();
    setupPhotography();
    setupLinkModal();

    // Load initial data
    loadDashboard();
    startClock();
});

// --- Publish repository (trigger server-side git push) ---
window.publishRepo = async function () {
    const btn = document.getElementById('publish-btn');
    if (!btn) return;
    // Ask for commit message
    const defaultMsg = `Publish via portfolio-manager: ${new Date().toISOString()}`;
    const userMsg = prompt('Commit-Nachricht für den Commit eingeben (Abbrechen bricht ab):', defaultMsg);
    if (userMsg === null) return; // user cancelled

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Veröffentliche...';

    try {
        // Ensure we call the backend server (use absolute URL if page not served over http(s))
        const apiBase = (location.protocol === 'http:' || location.protocol === 'https:') ? `${location.protocol}//${location.host}` : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg })
        });

        // Handle JSON and non-JSON responses robustly
        const ct = res.headers.get('content-type') || '';
        let payload;
        if (ct.includes('application/json')) {
            try {
                payload = await res.json();
            } catch (parseErr) {
                const txt = await res.text();
                throw new Error('Invalid JSON response: ' + txt);
            }
        } else {
            const txt = await res.text();
            // Try to interpret as JSON anyway
            try {
                payload = JSON.parse(txt);
            } catch (_) {
                // Non-JSON: show raw text as error or message depending on status
                if (res.ok) alert('Veröffentlicht:\n' + txt);
                else throw new Error(txt || 'Non-JSON response from server');
                payload = null;
            }
        }

        if (payload) {
            if (res.ok && payload.success) {
                alert('Veröffentlicht:\n' + (payload.message || 'Erfolgreich gepusht.'));
            } else {
                console.error(payload);
                alert('Fehler beim Veröffentlichen:\n' + (payload.error || JSON.stringify(payload)));
            }
        }
    } catch (e) {
        console.error(e);
        alert('Netzwerkfehler beim Veröffentlichen. Siehe Konsole.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

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
            if (type === 'dashboard') {
                loadDashboard();
            } else if (type === 'photography') {
                loadPhotography();
            } else if (type === 'links') {
                loadLinks();
            } else {
                loadProjects(type);
            }
        });
    });

    // Initialize first tab
    sections.forEach(s => s.style.display = 'none');
    document.getElementById('tab-dashboard').style.display = 'block';
}

/* --- Dashboard Logic --- */

function startClock() {
    const clockEl = document.getElementById('dashboard-clock');
    if (!clockEl) return;

    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockEl.innerText = timeStr;

        let greeting = 'Herzlich willkommen!';
        const hour = now.getHours();
        if (hour >= 5 && hour < 12) greeting = 'Guten Morgen!';
        else if (hour >= 12 && hour < 18) greeting = 'Guten Tag!';
        else if (hour >= 18 && hour < 22) greeting = 'Guten Abend!';
        else greeting = 'Gute Nacht!';

        const greetingEl = document.querySelector('.dashboard-greeting');
        if (greetingEl) greetingEl.innerText = greeting;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

async function loadDashboard() {
    if (currentType !== 'dashboard') return;

    try {
        const [designRes, illusRes, videoRes, linksRes] = await Promise.all([
            fetch('/api/projects/design').catch(() => null),
            fetch('/api/projects/illustration').catch(() => null),
            fetch('/api/projects/video').catch(() => null),
            fetch('/api/links').catch(() => null)
        ]);

        let dCount = 0, iCount = 0, vCount = 0, lCount = 0;
        let recentProjects = [];
        let recentLinks = [];
        let assetsCount = 0;

        if (designRes && designRes.ok) {
            const data = await designRes.json();
            dCount = data.length;
            document.getElementById('dash-stat-design').innerText = dCount;
            data.forEach(p => {
                recentProjects.push({ ...p, _type: 'design' });
                if (p.images) assetsCount += p.images.length;
                if (p['hero-image'] || p.heroImage) assetsCount += 1;
            });
        }
        if (illusRes && illusRes.ok) {
            const data = await illusRes.json();
            iCount = data.length;
            document.getElementById('dash-stat-illustration').innerText = iCount;
            data.forEach(p => {
                recentProjects.push({ ...p, _type: 'illustration' });
                if (p.images) assetsCount += p.images.length;
                if (p.heroImage || p['hero-image']) assetsCount += 1;
            });
        }
        if (videoRes && videoRes.ok) {
            const data = await videoRes.json();
            vCount = data.length;
            document.getElementById('dash-stat-video').innerText = vCount;
            data.forEach(p => {
                recentProjects.push({ ...p, _type: 'video' });
                if (p.videos) assetsCount += p.videos.length;
                if (p.heroImage || p['hero-image']) assetsCount += 1;
            });
        }
        if (linksRes && linksRes.ok) {
            const data = await linksRes.json();
            lCount = data.length;
            recentLinks = data;
            const linkInsight = document.getElementById('insight-links-total');
            if (linkInsight) linkInsight.innerText = lCount;
        }

        const assetsInsight = document.getElementById('insight-assets-total');
        if (assetsInsight) assetsInsight.innerText = assetsCount;

        const pCount = await fetchPhotosTotalForDash();
        fetchIndividualPhotosCount();

        // --- Populate Chart ---
        const totalProjects = dCount + iCount + vCount + pCount;
        if (totalProjects > 0) {
            const dPct = (dCount / totalProjects) * 100;
            const iPct = (iCount / totalProjects) * 100;
            const vPct = (vCount / totalProjects) * 100;
            const pPct = (pCount / totalProjects) * 100;

            document.getElementById('bar-design').style.height = `${dPct}%`;
            document.getElementById('bar-illustration').style.height = `${iPct}%`;
            document.getElementById('bar-video').style.height = `${vPct}%`;
            document.getElementById('bar-photo').style.height = `${pPct}%`;
        }

        // --- Populate Recent Projects ---
        // Ensure every category is present
        const latestProjects = [];
        const designs = recentProjects.filter(p => p._type === 'design');
        latestProjects.push(...designs.slice(-3).reverse());

        const illus = recentProjects.filter(p => p._type === 'illustration');
        latestProjects.push(...illus.slice(-3).reverse());

        const vids = recentProjects.filter(p => p._type === 'video');
        latestProjects.push(...vids.slice(-3).reverse());

        // Add Photography to complete the 4 categories
        const photoCats = ['street', 'aviation', 'portraet'];
        for (const pc of photoCats) {
            try {
                const pRes = await fetch(`/api/photography/${pc}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    if (pData.length > 0) {
                        // pData is an array of filenames like "street-01.jpeg"
                        // Always use the first image of the category
                        latestProjects.push({
                            _type: 'photography',
                            heroImage: `/images/portfolio/photography/${pData[0]}`,
                            title: 'Album: ' + pc.charAt(0).toUpperCase() + pc.slice(1),
                            id: null
                        });
                    }
                }
            } catch (e) { }
        }

        const grid = document.getElementById('recent-projects-grid');
        grid.innerHTML = '';
        latestProjects.forEach(p => {
            let imgUrl = p['hero-image'] || p.heroImage || '';
            if (!imgUrl && p.images && p.images.length > 0) imgUrl = p.images[0].imageUrl || '';

            const displayImg = imgUrl ? imgUrl.replace('../../', '/') : '';

            let bgCol = '';
            let textCol = '';
            let typeLabel = '';

            if (p._type === 'design') { typeLabel = 'Design'; bgCol = '#e8def8'; textCol = '#6d28d9'; }
            else if (p._type === 'illustration') { typeLabel = 'Illu'; bgCol = '#fce7f3'; textCol = '#be185d'; }
            else if (p._type === 'video') { typeLabel = 'Video'; bgCol = '#e0f2fe'; textCol = '#0369a1'; }
            else if (p._type === 'photography') { typeLabel = 'Foto'; bgCol = '#dcfce7'; textCol = '#15803d'; }

            const card = document.createElement('div');
            card.className = 'recent-card';
            card.onclick = () => {
                if (p._type === 'photography') {
                    document.querySelector('.nav-btn[data-tab="photography"]').click();
                } else {
                    document.querySelector(`.nav-btn[data-tab="${p._type}"]`).click();
                    setTimeout(() => editProject(p.id), 100);
                }
            };
            card.innerHTML = `
                <div class="recent-img" style="background-image: url('${displayImg}')"></div>
                <div class="recent-info">
                    <span style="background: ${bgCol}; color: ${textCol};">${typeLabel}</span>
                    <h4>${p.title}</h4>
                </div>
            `;
            grid.appendChild(card);
        });

        // --- Populate Sidebar Links ---
        // the links are sorted alphabetically in backend, reverse to get some variety or keep as is
        const linksList = document.getElementById('sidebar-latest-links');
        linksList.innerHTML = '';
        recentLinks.slice(0, 5).forEach(l => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-content">
                    <strong>${l.name}</strong>
                    <span>${l.category || ''}</span>
                </div>
                <a href="${l.url}" target="_blank" class="list-item-action"><i class="fas fa-external-link-alt"></i></a>
            `;
            linksList.appendChild(item);
        });

    } catch (e) {
        console.error('Error loading dashboard stats:', e);
    }
}

async function fetchPhotosTotalForDash() {
    // Only count the 5 main categories as "Projects" instead of individual photos
    const categories = ['street', 'aviation', 'portraet', 'bts', 'event'];
    const total = categories.length;

    const statEl = document.getElementById('dash-stat-photography');
    if (statEl) statEl.innerText = total;

    return total;
}

async function fetchIndividualPhotosCount() {
    const categories = ['street', 'aviation', 'portraet', 'bts', 'event'];
    let total = 0;
    try {
        for (const cat of categories) {
            const res = await fetch(`/api/photography/${cat}`);
            if (res.ok) {
                const data = await res.json();
                total += data.length;
            }
        }
        const statEl = document.getElementById('insight-photos-total');
        if (statEl) statEl.innerText = total;
    } catch (e) {
        console.error(e);
    }
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

/* --- Category Selection Modal --- */
function openCategorySelectModal() {
    document.getElementById('category-select-modal').classList.remove('hidden');
}

function closeCategorySelectModal() {
    document.getElementById('category-select-modal').classList.add('hidden');
}

function selectCategoryForNewProject(type) {
    closeCategorySelectModal();

    // Switch to the respective tab implicitly before opening modal
    if (type === 'photography') {
        document.querySelector('.nav-btn[data-tab="photography"]').click();
        setTimeout(triggerPhotoUpload, 300);
    } else if (type === 'links') {
        document.querySelector('.nav-btn[data-tab="links"]').click();
        setTimeout(() => openLinkModal(null), 100);
    } else {
        document.querySelector(`.nav-btn[data-tab="${type}"]`).click();
        setTimeout(() => openProjectModal(type), 100);
    }
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
    document.getElementById('fields-blocks').classList.add('hidden');
    document.getElementById('block-canvas').innerHTML = ''; // clear blocks

    if (project) {
        document.getElementById('modal-title').innerText = 'Projekt bearbeiten';
        document.getElementById('p-id').value = project.id;
        document.getElementById('p-title').value = project.title;
        document.getElementById('p-desc').value = project.description || '';
        document.getElementById('p-tabTitle').value = project.tabTitle || '';
        document.getElementById('p-hero').value = project['hero-image'] || project.heroImage || '';

        if (project.blocks) {
            // Gutenberg Project
            document.getElementById('fields-blocks').classList.remove('hidden');
            project.blocks.forEach(b => renderBlockToCanvas(b));
            initSortable();
        } else {
            // Legacy Project
            if (type === 'video') {
                document.getElementById('fields-video').classList.remove('hidden');
                if (project.heroMeta) {
                    project.heroMeta.forEach(m => {
                        if (m.includes('Rolle')) document.getElementById('p-role').value = stripHtml(m).replace('Rolle:', '').trim();
                        if (m.includes('Equipment')) document.getElementById('p-equipment').value = stripHtml(m).replace('Equipment:', '').trim();
                        if (m.includes('Tools')) document.getElementById('p-tools').value = stripHtml(m).replace('Tools:', '').trim();
                    });
                }
                if (project.videos) {
                    project.videos.forEach(v => addVideoInput(v));
                }
            } else {
                document.getElementById('fields-gallery').classList.remove('hidden');
                if (project.images) {
                    project.images.forEach(img => addGalleryImageInput(img));
                }
            }
        }

    } else {
        document.getElementById('modal-title').innerText = 'Neues Projekt';
        document.getElementById('p-id').value = '';
        
        // NEW PROJECTS ALWAYS USE BLOCKS
        document.getElementById('fields-blocks').classList.remove('hidden');
        initSortable();
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

    if (currentType !== 'video') {
        newProject['hero-image'] = hero;
    } else {
        newProject.heroImage = hero;
    }

    if (!document.getElementById('fields-blocks').classList.contains('hidden')) {
        // --- Gutenberg Save Logic ---
        newProject.blocks = [];
        const blocksCanvas = document.getElementById('block-canvas');
        blocksCanvas.querySelectorAll('.editor-block').forEach(el => {
            const type = el.dataset.type;
            const b = { id: el.dataset.id, type: type };
            
            if (type === 'hero') {
                b.imageUrl = el.querySelector('.b-hero-img').value;
                b.text = el.querySelector('.b-hero-text').value;
            } else if (type === 'heading') {
                b.level = el.querySelector('.b-head-level').value;
                b.text = el.querySelector('.b-head-text').value;
            } else if (type === 'text') {
                b.html = el.querySelector('.b-text-content').value;
            } else if (type === 'pdf') {
                b.title = el.querySelector('.b-pdf-title').value;
                b.pdfUrl = el.querySelector('.b-pdf-url').value;
                b.imageUrl = el.querySelector('.b-pdf-thumb').value;
            } else if (type === 'youtube') {
                b.title = el.querySelector('.b-yt-title').value;
                b.tags = el.querySelector('.b-yt-tags').value;
                b.videoId = el.querySelector('.b-yt-id').value;
            } else if (type === 'gallery' || type === 'media') {
                const urls = el.querySelector('.b-gal-urls').value.split('\n').map(s=>s.trim()).filter(Boolean);
                b.items = urls.map(u => ({ imageUrl: u }));
            }
            newProject.blocks.push(b);
        });
    } else {
        // --- Legacy Save Logic ---
        if (currentType === 'video') {
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
    }

    // Update data array
    const existingIdx = projectsData.findIndex(p => p.id === id);
    if (existingIdx > -1) {
        projectsData[existingIdx] = newProject;
    } else {
        projectsData.unshift(newProject);
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

/* --- Links Logic --- */

async function loadLinks() {
    try {
        const res = await fetch('/api/links');
        if (!res.ok) throw new Error('Failed to load links');
        linksData = await res.json();
        renderLinks();
    } catch (e) {
        console.error(e);
        alert('Fehler beim Laden der Links');
    }
}

function renderLinks() {
    const filterContainer = document.getElementById('links-filter-bar');
    const linksContainer = document.getElementById('list-links');
    
    if (!filterContainer || !linksContainer) return;

    filterContainer.innerHTML = '';
    linksContainer.innerHTML = '';

    // Extract unique categories for the datalist & filters
    const categories = [...new Set(linksData.map(l => l.category))].filter(Boolean);
    const dataList = document.getElementById('category-list');
    if (dataList) {
        dataList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
    }

    // Render Filter Pills
    const allPill = document.createElement('button');
    allPill.className = 'filter-pill active';
    allPill.innerText = 'Alle';
    allPill.onclick = () => filterLinksByCategory('all', allPill);
    filterContainer.appendChild(allPill);

    categories.sort().forEach(cat => {
        const pill = document.createElement('button');
        pill.className = 'filter-pill';
        pill.innerText = cat;
        pill.onclick = () => filterLinksByCategory(cat, pill);
        filterContainer.appendChild(pill);
    });

    // Render all links as cards
    linksData.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.dataset.category = link.category || 'Uncategorized';

        const urlShort = link.url.replace(/^https?:\/\//i, '').substring(0, 35);
        const safeName = link.name.replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="link-card-header">
                <div class="link-card-icon"><i class="fas fa-link"></i></div>
                <span class="link-card-badge">${link.category || 'Uncategorized'}</span>
            </div>
            <div class="link-card-body">
                <h3>${link.name}</h3>
                <a href="${link.url}" target="_blank" title="${link.url}">${urlShort}...</a>
            </div>
            <div class="link-card-actions">
                <button class="btn-small btn-edit" onclick="editLink('${safeName}')"><i class="fas fa-pen"></i></button>
                <button class="btn-small btn-delete" onclick="deleteLink('${safeName}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        linksContainer.appendChild(card);
    });
}

window.filterLinksByCategory = function(category, pillElement) {
    // Update active state on pills
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    pillElement.classList.add('active');

    // Filter cards
    const cards = document.querySelectorAll('.link-card');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

/* --- Link Modal Logic --- */

const linkModal = document.getElementById('link-modal');
const linkForm = document.getElementById('link-form');

function setupLinkModal() {
    linkForm.addEventListener('submit', handleSaveLink);
}

window.openLinkModal = function (linkName = null) {
    linkForm.reset();

    if (linkName) {
        // Edit mode
        const link = linksData.find(l => l.name === linkName);
        if (link) {
            document.getElementById('link-modal-title').innerText = 'Link bearbeiten';
            document.getElementById('l-original-name').value = link.name;
            document.getElementById('l-name').value = link.name;
            document.getElementById('l-url').value = link.url;
            document.getElementById('l-category').value = link.category || '';
        }
    } else {
        // New mode
        document.getElementById('link-modal-title').innerText = 'Neuer Link';
        document.getElementById('l-original-name').value = '';
    }

    linkModal.classList.remove('hidden');
}

window.closeLinkModal = function () {
    linkModal.classList.add('hidden');
}

window.editLink = function (name) {
    openLinkModal(name);
}

window.deleteLink = async function (name) {
    if (!confirm("Link '" + name + "' wirklich löschen?")) return;

    linksData = linksData.filter(l => l.name !== name);
    await saveAllLinks();
}

async function handleSaveLink(e) {
    e.preventDefault();

    const originalName = document.getElementById('l-original-name').value;
    const name = document.getElementById('l-name').value.trim();
    const url = document.getElementById('l-url').value.trim();
    const category = document.getElementById('l-category').value.trim();

    const newLink = { name, url, category };

    if (originalName) {
        // Edit existing
        const idx = linksData.findIndex(l => l.name === originalName);
        if (idx > -1) {
            linksData[idx] = newLink;
        } else {
            // Shouldn't happen unless name bug
            linksData.push(newLink);
        }
    } else {
        // Check if name already exists
        if (linksData.some(l => l.name === name)) {
            alert('Ein Link mit diesem Namen existiert bereits!');
            return;
        }
        // Add new
        linksData.push(newLink);
    }

    await saveAllLinks();
    closeLinkModal();
}

async function saveAllLinks() {
    try {
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linksData)
        });

        if (res.ok) {
            // Reload and re-render
            loadLinks();
        } else {
            alert('Fehler beim Speichern der Links');
        }
    } catch (e) {
        console.error(e);
        alert('Netzwerkfehler beim Speichern der Links');
    }
}

/* --- Gutenberg Block Editor Logistics --- */

let sortableInstance = null;

window.initSortable = function() {
    const canvas = document.getElementById('block-canvas');
    if (sortableInstance) sortableInstance.destroy();
    
    if (typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(canvas, {
            handle: '.block-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost'
        });
    } else {
        console.warn("SortableJS not loaded.");
    }
}

window.addBlock = function(type) {
    const block = { id: 'block-' + Date.now(), type: type };
    renderBlockToCanvas(block);
};

window.removeBlock = function(btn) {
    btn.closest('.editor-block').remove();
};

window.renderBlockToCanvas = function(b) {
    const canvas = document.getElementById('block-canvas');
    const div = document.createElement('div');
    div.className = 'editor-block';
    div.dataset.id = b.id;
    div.dataset.type = b.type;

    let innerHTML = '';
    let title = '';
    let icon = '';

    if (b.type === 'hero') {
        title = 'Hero Bild'; icon = 'fa-image';
        innerHTML = `
            <input type="text" class="b-hero-img" placeholder="Bild URL" value="${b.imageUrl || ''}">
            <input type="text" class="b-hero-text" placeholder="Optionaler Text" value="${b.text || ''}">
        `;
    } else if (b.type === 'heading') {
        title = 'Titel'; icon = 'fa-heading';
        innerHTML = `
            <div style="display:flex; gap:10px;">
                <select class="b-head-level" style="width: 80px;">
                    <option value="h1" ${b.level==='h1'?'selected':''}>H1</option>
                    <option value="h2" ${b.level==='h2'?'selected':''}>H2</option>
                    <option value="h3" ${b.level==='h3'?'selected':''}>H3</option>
                    <option value="h4" ${b.level==='h4'?'selected':''}>H4</option>
                    <option value="h5" ${b.level==='h5'?'selected':''}>H5</option>
                    <option value="h6" ${b.level==='h6'?'selected':''}>H6</option>
                </select>
                <input type="text" class="b-head-text" placeholder="Titel Text" value="${b.text || ''}" style="flex:1;">
            </div>
        `;
    } else if (b.type === 'text') {
        title = 'Text'; icon = 'fa-align-left';
        innerHTML = `<textarea class="b-text-content" rows="4" placeholder="Textinhalt (HTML möglich) ...">${b.html || ''}</textarea>`;
    } else if (b.type === 'pdf') {
        title = 'PDF'; icon = 'fa-file-pdf';
        innerHTML = `
            <input type="text" class="b-pdf-title" placeholder="PDF Titel" value="${b.title || ''}">
            <input type="text" class="b-pdf-url" placeholder="PDF Datei URL" value="${b.pdfUrl || ''}">
            <input type="text" class="b-pdf-thumb" placeholder="Vorschaubild URL" value="${b.imageUrl || ''}">
        `;
    } else if (b.type === 'youtube') {
        title = 'YouTube'; icon = 'fa-youtube';
        innerHTML = `
            <input type="text" class="b-yt-title" placeholder="Video Titel" value="${b.title || ''}" style="margin-bottom:5px;">
            <input type="text" class="b-yt-tags" placeholder="Tags (Komma-separiert, z.B. Schnitt, Kamera)" value="${b.tags || ''}" style="margin-bottom:5px;">
            <input type="text" class="b-yt-id" placeholder="YouTube Video ID (z.B. dQw4w9WgXcQ)" value="${b.videoId || ''}">
        `;
    } else if (b.type === 'gallery' || b.type === 'media') {
        title = 'Fotogalerie / Media'; icon = 'fa-images';
        const urls = b.items ? b.items.map(i => i.imageUrl).join('\n') : '';
        innerHTML = `
            <p style="font-size:0.8rem;color:#888;margin:0;">Fügen Sie pro Zeile eine gültige Bild-URL ein:</p>
            <textarea class="b-gal-urls" rows="4" placeholder="../../images/bild1.jpg\n../../images/bild2.jpg">${urls}</textarea>
        `;
    }

    div.innerHTML = `
        <div class="block-drag-handle"><i class="fas fa-grip-vertical"></i></div>
        <div class="block-content">
            <div class="block-header">
                <span><i class="fas ${icon} block-icon"></i> ${title}</span>
                <button type="button" class="block-delete-btn" onclick="removeBlock(this)"><i class="fas fa-trash"></i></button>
            </div>
            ${innerHTML}
        </div>
    `;
    canvas.appendChild(div);
}

