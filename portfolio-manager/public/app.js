// State
let currentType = 'dashboard';
let projectsData = [];
let linksData = [];
// Photo UI elements (initialized in setupPhotography)
let photoSelect, photoInput, photoSwitch, dropzone;

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModal();
    setupLinkModal();
    setupPhotography();

    // Load initial data
    loadDashboard();
    startClock();
});

// --- Publish repository (trigger server-side git push) ---
window.publishRepo = async function () {
    const defaultMsg = `Publish via portfolio-manager: ${new Date().toISOString()}`;
    const userMsg = prompt('Commit-Nachricht für den Commit eingeben (Abbrechen bricht ab):', defaultMsg);
    if (userMsg === null) return; // user cancelled

    const overlay = document.getElementById('deploy-overlay');
    const prgBar = document.getElementById('deploy-progress-bar');
    const label = document.getElementById('deploy-status-label');
    const logs = document.getElementById('deploy-logs');
    const closeBtn = document.getElementById('deploy-close-btn');

    if (!overlay) return;

    // Reset overlay
    overlay.classList.remove('hidden');
    prgBar.style.width = '0%';
    label.innerText = 'Synchronisiere...';
    label.className = 'badge-status'; // remove ready/error
    logs.innerText = 'Initialisiere Git-Synchronisation...\n';
    closeBtn.classList.add('hidden');

    try {
        logs.innerText += 'Führe "git pull --rebase" aus, um Konflikte zu vermeiden...\n';
        prgBar.style.width = '10%';
        
        const apiBase = (location.protocol === 'http:' || location.protocol === 'https:') ? `${location.protocol}//${location.host}` : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg })
        });

        const data = await res.json();
        
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Fehler beim Git-Push.');
        }

        logs.innerText += 'Git-Synchronisation abgeschlossen!\n';
        logs.innerText += `Commit: "${userMsg}" erfolgreich auf GitHub gepusht.\n`;
        prgBar.style.width = '30%';

        // Check deployment type
        const dep = data.deployment || { type: 'simulated', durationMs: 35000 };
        logs.innerText += `Deployment-Dienst erkannt: ${dep.type.toUpperCase()}\n`;

        if (dep.type === 'vercel' || dep.type === 'netlify') {
            logs.innerText += 'Verbinde mit Live API, um den Build-Status zu überwachen...\n';
            pollDeploymentStatus(dep.type);
        } else {
            // Run simulated deployment
            logs.innerText += 'Starte simulierten Build-Prozess...\n';
            runSimulatedDeployment(dep.durationMs || 35000);
        }

        // Hide unpublished badge on successful publish
        localStorage.removeItem('hasUnpublishedChanges');
        const badge = document.getElementById('studio-unpublished-badge');
        if (badge) badge.classList.add('hidden');

    } catch (err) {
        console.error(err);
        logs.innerText += `\nFEHLER: ${err.message || err}\n`;
        label.innerText = 'Fehler';
        label.classList.add('error');
        prgBar.style.width = '100%';
        prgBar.style.background = '#ef4444';
        closeBtn.classList.remove('hidden');
    }
};

window.closeDeployOverlay = function () {
    const overlay = document.getElementById('deploy-overlay');
    if (overlay) overlay.classList.add('hidden');
};

function runSimulatedDeployment(durationMs) {
    const prgBar = document.getElementById('deploy-progress-bar');
    const label = document.getElementById('deploy-status-label');
    const logs = document.getElementById('deploy-logs');
    const closeBtn = document.getElementById('deploy-close-btn');

    label.innerText = 'Baut Website';
    
    const steps = [
        { timePct: 0.1, msg: 'npm ci --production ...' },
        { timePct: 0.3, msg: 'Führe Build-Skripte aus...' },
        { timePct: 0.45, msg: 'Generiere statische HTML-Seiten für Portfolio...' },
        { timePct: 0.65, msg: 'Optimiere Bildformate (AVIF/WebP) & Video HLS Segmente...' },
        { timePct: 0.8, msg: 'Kompiliere CSS und Javascript Bundles...' },
        { timePct: 0.9, msg: 'Lade Build-Ordner in CDN-Netzwerk hoch...' },
        { timePct: 1.0, msg: 'Deployment erfolgreich bereitgestellt auf CDN!' }
    ];

    let startTime = Date.now();
    let interval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let progress = 30 + (elapsed / durationMs) * 70; // Map elapsed to 30%-100%

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            label.innerText = 'Live';
            label.className = 'badge-status ready';
            prgBar.style.width = '100%';
            closeBtn.classList.remove('hidden');
        } else {
            prgBar.style.width = `${progress}%`;
        }

        // Print step messages based on elapsed percentage
        const elapsedPct = elapsed / durationMs;
        steps.forEach(step => {
            if (elapsedPct >= step.timePct && !logs.innerText.includes(step.msg)) {
                logs.innerText += `[Build] ${step.msg}\n`;
                logs.scrollTop = logs.scrollHeight; // Auto scroll
            }
        });
    }, 200);
}

function pollDeploymentStatus(type) {
    const prgBar = document.getElementById('deploy-progress-bar');
    const label = document.getElementById('deploy-status-label');
    const logs = document.getElementById('deploy-logs');
    const closeBtn = document.getElementById('deploy-close-btn');

    label.innerText = 'Baut Website';
    let progress = 30;
    
    let interval = setInterval(async () => {
        try {
            const res = await fetch('/api/publish/status');
            const data = await res.json();

            if (!res.ok || !data.success) {
                logs.innerText += '[API] Fehler beim Abrufen des Status, versuche erneut...\n';
                return;
            }

            logs.innerText += `[API Status] Build-Status: ${data.status.toUpperCase()}\n`;
            logs.scrollTop = logs.scrollHeight;

            if (data.status === 'ready') {
                clearInterval(interval);
                label.innerText = 'Live';
                label.className = 'badge-status ready';
                prgBar.style.width = '100%';
                logs.innerText += `\nDeployment erfolgreich! Website ist live unter:\n${data.url || 'https://noe-plain.github.io'}\n`;
                logs.scrollTop = logs.scrollHeight;
                closeBtn.classList.remove('hidden');
            } else if (data.status === 'error') {
                clearInterval(interval);
                label.innerText = 'Fehler';
                label.className = 'badge-status error';
                prgBar.style.width = '100%';
                prgBar.style.background = '#ef4444';
                logs.innerText += `\nFEHLER: Build auf ${type.toUpperCase()} fehlgeschlagen.\n`;
                logs.scrollTop = logs.scrollHeight;
                closeBtn.classList.remove('hidden');
            } else {
                // still building
                progress += (95 - progress) * 0.1;
                prgBar.style.width = `${progress}%`;
            }
        } catch (err) {
            console.warn(err);
        }
    }, 4000);
}

// Update WYSIWYG preview for a block element
function updateBlockPreview(blockEl) {
    try {
        if (!blockEl) return;
        const type = blockEl.dataset.type;
        const preview = blockEl.querySelector('.block-preview');
        if (!preview) return;
        // Clear
        preview.innerHTML = '';
        console.debug('updateBlockPreview', blockEl.dataset.id, type);

    if (type === 'hero') {
        const img = blockEl.querySelector('.b-hero-img').value || '';
        const txt = blockEl.querySelector('.b-hero-text').value || '';
        if (img) {
            const im = document.createElement('img'); im.src = normalizeUrl(img); im.className = 'hero-image'; preview.appendChild(im);
        }
        if (txt) {
            const p = document.createElement('p'); p.innerText = txt; p.style.marginTop='8px'; preview.appendChild(p);
        }
    } else if (type === 'heading') {
        const level = blockEl.querySelector('.b-head-level').value || 'h2';
        const txt = blockEl.querySelector('.b-head-text').value || '';
            const h = document.createElement(level); h.innerText = txt || 'Titel'; preview.appendChild(h);
    } else if (type === 'text') {
        const html = blockEl.querySelector('.b-text-content').value || '';
        const div = document.createElement('div'); div.innerHTML = html; preview.appendChild(div);
    } else if (type === 'pdf') {
        const title = blockEl.querySelector('.b-pdf-title').value || 'PDF';
        const url = blockEl.querySelector('.b-pdf-url').value || '';
        const thumb = blockEl.querySelector('.b-pdf-thumb').value || '';
        const wrap = document.createElement('div');
        if (thumb) { const im = document.createElement('img'); im.src = normalizeUrl(thumb); im.style.maxWidth='200px'; im.style.display='block'; wrap.appendChild(im); }
        const a = document.createElement('a'); a.href = url; a.innerText = title; a.target='_blank'; wrap.appendChild(a);
        preview.appendChild(wrap);
    } else if (type === 'youtube') {
        const id = blockEl.querySelector('.b-yt-id').value || '';
        const title = blockEl.querySelector('.b-yt-title').value || '';
        if (id) {
            const iframe = document.createElement('iframe'); iframe.width='560'; iframe.height='315'; iframe.src=`https://www.youtube.com/embed/${id}`; iframe.frameBorder=0; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen = true; preview.appendChild(iframe);
        } else {
            const p = document.createElement('div'); p.innerText = title || 'YouTube Video (ID fehlt)'; preview.appendChild(p);
        }
    } else if (type === 'gallery' || type === 'media') {
        const items = blockEl.querySelectorAll('.b-gal-item-row');
        const grid = document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(auto-fill,minmax(140px,1fr))'; grid.style.gap='8px';
        items.forEach(r => {
            const kind = (r.querySelector('.b-gal-kind') || {value:'image'}).value;
            const thumb = (kind === 'pdf') ? (r.querySelector('.b-gal-pdf-thumb') ? r.querySelector('.b-gal-pdf-thumb').value : '') : (r.querySelector('.b-gal-img-url') ? r.querySelector('.b-gal-img-url').value : '');
            const title = (r.querySelector('.b-gal-item-title') || {value:''}).value;
            const c = document.createElement('div'); c.style.border='1px solid rgba(0,0,0,0.03)'; c.style.borderRadius='6px'; c.style.overflow='hidden'; c.style.background='#fff'; c.style.display='flex'; c.style.flexDirection='column';
            const im = document.createElement('img'); im.src = normalizeUrl(thumb) || ''; im.style.width='100%'; im.style.height='120px'; im.style.objectFit='cover'; c.appendChild(im);
            const t = document.createElement('div'); t.style.padding='6px'; t.innerText = title || '';
            c.appendChild(t);
            grid.appendChild(c);
        });
        preview.appendChild(grid);
    }
        } catch (e) {
            console.error('updateBlockPreview error for block', blockEl && blockEl.dataset && blockEl.dataset.id, e);
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
            } else if (type === 'links') {
                loadLinks();
            } else if (type === 'photography') {
                loadPhotography();
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
            card.onclick = async () => {
                if (p._type === 'photography') {
                    document.querySelector('.nav-btn[data-tab="photography"]').click();
                } else {
                    document.querySelector(`.nav-btn[data-tab="${p._type}"]`).click();
                    await loadProjects(p._type);
                    editProject(p.id);
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

// Normalize relative URLs like "../../images/..." to absolute 
function normalizeUrl(u) {
    if (!u) return '';
    return String(u).replace(/^\.\.\//g, '/').replace(/^\.\//g, '/');
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
    openStudioEditor(type, project);
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
                const rich = el.querySelector('.b-text-rich');
                if (rich) b.html = rich.innerHTML;
                else b.html = (el.querySelector('.b-text-content') || { value: '' }).value;
            } else if (type === 'pdf') {
                b.title = el.querySelector('.b-pdf-title').value;
                b.pdfUrl = el.querySelector('.b-pdf-url').value;
                b.imageUrl = el.querySelector('.b-pdf-thumb').value;
            } else if (type === 'youtube') {
                b.title = el.querySelector('.b-yt-title').value;
                b.tags = el.querySelector('.b-yt-tags').value;
                b.videoId = el.querySelector('.b-yt-id').value;
            } else if (type === 'gallery' || type === 'media') {
                // Support structured gallery items (image or pdf with thumb + title)
                const itemsContainer = el.querySelector('.b-gal-items');
                if (itemsContainer) {
                    const rows = itemsContainer.querySelectorAll('.b-gal-item-row');
                    b.items = [];
                    rows.forEach(r => {
                        const kind = r.querySelector('.b-gal-kind') ? r.querySelector('.b-gal-kind').value : 'image';
                        const title = r.querySelector('.b-gal-item-title') ? r.querySelector('.b-gal-item-title').value : '';
                        if (kind === 'pdf') {
                            const pdfUrl = r.querySelector('.b-gal-pdf-url').value.trim();
                            const thumb = r.querySelector('.b-gal-pdf-thumb').value.trim();
                            if (pdfUrl) b.items.push({ type: 'pdf', pdfUrl: pdfUrl, imageUrl: thumb || '', title: title || '' });
                        } else {
                            const img = r.querySelector('.b-gal-img-url').value.trim();
                            if (img) b.items.push({ type: 'image', imageUrl: img, title: title || '' });
                        }
                    });
                } else {
                    // Backwards-compatible: plain textarea with URLs
                    const urls = (el.querySelector('.b-gal-urls') || { value: '' }).value.split('\n').map(s => s.trim()).filter(Boolean);
                    b.items = urls.map(u => ({ type: 'image', imageUrl: u }));
                }
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

// Default categories (can be extended by user)
let photoCategories = ['street', 'human-nature', 'aviation', 'portraet', 'bts', 'event'];

const categoryDisplayNames = {
    'street': 'Street',
    'human-nature': 'Human Nature',
    'aviation': 'Aviation',
    'portraet': 'Porträt',
    'bts': 'BTS',
    'event': 'Event'
};

function setupPhotography() {
    // Initialize DOM refs
    photoSelect = document.getElementById('photo-category-select');
    photoInput = document.getElementById('photo-upload-input');
    photoSwitch = document.getElementById('photo-category-switch');
    dropzone = document.getElementById('photo-dropzone');

    // Render the pill switch and attach events
    renderPhotoCategories();

    if (photoInput) photoInput.addEventListener('change', uploadPhoto);

    // Dropzone handlers for multi-file upload
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation();
            dropzone.classList.add('dragover');
        }));
        ['dragleave', 'drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation();
            if (evt === 'drop') {
                dropzone.classList.remove('dragover');
                const dt = e.dataTransfer;
                if (dt && dt.files && dt.files.length) {
                    uploadMultiplePhotos(dt.files);
                }
            } else {
                dropzone.classList.remove('dragover');
            }
        }));

        // Click on dropzone opens file chooser
        dropzone.addEventListener('click', () => triggerPhotoUpload());
    }

    // If currently viewing photography, load initial grid
    if (currentType === 'photography') loadPhotography();
}



function renderPhotoCategories() {
    if (!photoSwitch || !photoSelect) return;
    // Populate select options
    photoSelect.innerHTML = '';
    photoCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = categoryDisplayNames[cat] || capitalize(cat);
        photoSelect.appendChild(opt);
    });

    // Ensure a selected value
    if (!photoSelect.value && photoCategories.length > 0) photoSelect.value = photoCategories[0];

    // Render pill switch
    photoSwitch.innerHTML = '';
    photoCategories.forEach(cat => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'cat-pill' + (photoSelect.value === cat ? ' active' : '');
        pill.innerText = categoryDisplayNames[cat] || capitalize(cat);
        pill.dataset.cat = cat;
        pill.onclick = () => {
            selectPhotoCategory(cat);
        };
        photoSwitch.appendChild(pill);
    });
}

function selectPhotoCategory(cat) {
    if (!photoSelect) return;
    photoSelect.value = cat;
    // update active pill
    document.querySelectorAll('.photo-category-switch .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    loadPhotography();
}

function openAddPhotoCategory() {
    const name = prompt('Neue Kategorie hinzufügen (kurzer Name, z.B. moodboard):');
    if (!name) return;
    const slug = slugify(name);
    if (photoCategories.includes(slug)) {
        alert('Kategorie existiert bereits');
        return;
    }
    addPhotoCategory(slug, name);
}

async function addPhotoCategory(slug, displayName) {
    // Optimistically add category locally
    photoCategories.push(slug);
    categoryDisplayNames[slug] = displayName;
    renderPhotoCategories();

    // Try to create server-side folder (best-effort)
    try {
        await fetch('/api/photography/category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: slug, displayName: displayName })
        });
    } catch (e) {
        // ignore errors; server may not support category creation
        console.warn('Could not create category on server', e);
    }

    // Select newly added category
    selectPhotoCategory(slug);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

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

async function migrateCategoriesToProjects() {
    if (!confirm('Möchtest du alle vorhandenen Fotokategorien in Projekte umwandeln? Dies verschiebt Dateien und passt Referenzen an.')) return;
    try {
        const res = await fetch('/api/media/migrate-categories-to-projects', { method: 'POST' });
        const json = await res.json();
        if (json && json.success) {
            alert('Migration abgeschlossen. Verschobene Dateien: ' + (json.migrated ? json.migrated.length : 0));
            // refresh UI
            loadPhotography();
            try { renderFileManager(); } catch(e){}
            try { fetchMedia(); } catch(e){}
        } else {
            console.error(json);
            alert('Migration fehlgeschlagen');
        }
    } catch (e) {
        console.error('migration error', e);
        alert('Migration fehlgeschlagen. Siehe Konsole.');
    }
}

async function uploadPhoto(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadMultiplePhotos(files);
    photoInput.value = '';
}

async function uploadMultiplePhotos(filesList) {
    const files = Array.from(filesList).filter(f => f && f.type.startsWith('image'));
    if (files.length === 0) return;
    const category = photoSelect.value;

    // Upload files in parallel but limit concurrency to avoid spamming server
    const concurrency = 4;
    let idx = 0;
    const results = [];

    async function worker() {
        while (idx < files.length) {
            const i = idx++;
            const file = files[i];
            const fd = new FormData();
            fd.append('image', file);
            fd.append('category', category);
            fd.append('filename', generatePhotoFilename(category, file.name));
            try {
                const res = await fetch('/api/photography/upload', { method: 'POST', body: fd });
                results.push(res.ok);
            } catch (e) {
                console.error('Upload failed', e);
                results.push(false);
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, worker);
    await Promise.all(workers);

    // Reload gallery after uploads
    loadPhotography();
}

function generatePhotoFilename(category, originalName) {
    const ext = (originalName.match(/\.([^.]+)$/) || [])[1] || 'jpg';
    const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return `${category}-${Date.now()}-${base}.${ext}`;
}

/* --- Generic Upload --- */
window.triggerUpload = function (targetInputOrId) {
    const genericInput = document.getElementById('generic-upload-input');
    // Determine and remember the target input element id
    let targetEl = null;
    if (typeof targetInputOrId === 'string') {
        genericInput.dataset.targetInput = targetInputOrId;
        targetEl = document.getElementById(targetInputOrId);
    } else {
        if (!targetInputOrId.id) targetInputOrId.id = 'temp-' + Date.now();
        genericInput.dataset.targetInput = targetInputOrId.id;
        targetEl = targetInputOrId;
    }

    // Set accept attribute based on target (image vs pdf)
    try {
        if (targetEl) {
            const cls = Array.from(targetEl.classList || []);
            if (cls.includes('b-pdf-url') || cls.includes('pdf-url') || cls.includes('b-gal-pdf-url')) {
                genericInput.accept = 'application/pdf';
            } else if (cls.includes('b-pdf-thumb') || cls.includes('b-gal-img-url') || cls.includes('img-url') || targetEl.id === 'p-hero') {
                genericInput.accept = 'image/*';
            } else {
                genericInput.accept = 'image/*,application/pdf';
            }
        } else {
            genericInput.accept = 'image/*,application/pdf';
        }
    } catch (e) {
        genericInput.accept = 'image/*,application/pdf';
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
            if (input) {
                input.value = normalizeUrl(json.url);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        return json;
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

    // Render all links as modern cards
    linksData.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.style = 'height: calc(100% - 30px)';
        card.dataset.category = link.category || 'Uncategorized';

        const domain = (link.url || '').replace(/^https?:\/\//i, '').split('/')[0];
        const urlShort = domain.length > 36 ? domain.substring(0, 33) + '...' : domain;
        const safeName = link.name.replace(/'/g, "\\'");

        // Use Google's favicon service for quick favicons
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

        card.innerHTML = `
            <div class="link-card-left">
                <img class="link-favicon" src="${faviconUrl}" alt="favicon">
            </div>
            <div class="link-card-main">
                <div class="link-main-top">
                    <h3 class="link-title">${link.name}</h3>
                    <span class="link-domain">${urlShort}</span>
                </div>
                <p class="link-desc">${link.description || ''}</p>
                <div class="link-meta">
                    <span class="link-badge">${link.category || 'Uncategorized'}</span>
                    <a class="link-url" href="${link.url}" target="_blank">Öffnen</a>
                </div>
            </div>
            <div class="link-card-actions">
                <button class="icon-btn" title="Bearbeiten" onclick="editLink('${safeName}')"><i class="fas fa-pen"></i></button>
                <button class="icon-btn danger" title="Löschen" onclick="deleteLink('${safeName}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        linksContainer.appendChild(card);
    });
}

window.filterLinksByCategory = function (category, pillElement) {
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
let selectedBlock = null;

window.initSortable = function () {
    // prefer fullscreen canvas if present
    const canvas = document.getElementById('fs-block-canvas') || document.getElementById('block-canvas');
    if (sortableInstance) sortableInstance.destroy();

    if (canvas && typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(canvas, {
            handle: '.block-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost'
        });
    } else {
        console.warn("SortableJS not loaded or canvas missing.");
    }
}

// Fullscreen editor removed - provide no-op functions for compatibility
window.openFullEditor = function () { console.debug('openFullEditor disabled'); };
window.closeFullEditor = function () { console.debug('closeFullEditor disabled'); };

window.addBlock = function (type) {
    const block = { id: 'block-' + Date.now(), type: type };
    renderBlockToCanvas(block);
};

window.removeBlock = function (btn) {
    btn.closest('.editor-block').remove();
};

window.toggleBlock = function (el) {
    // el may be the button or an element inside the header
    const block = el.closest('.editor-block');
    if (!block) return;
    block.classList.toggle('collapsed');
    const chevron = block.querySelector('.block-toggle-btn i');
    if (chevron) {
        if (block.classList.contains('collapsed')) {
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
        } else {
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
        }
    }
};

window.renderBlockToCanvas = function (b) {
    const canvas = document.getElementById('fs-block-canvas') || document.getElementById('block-canvas');
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
                    <option value="h1" ${b.level === 'h1' ? 'selected' : ''}>H1</option>
                    <option value="h2" ${b.level === 'h2' ? 'selected' : ''}>H2</option>
                    <option value="h3" ${b.level === 'h3' ? 'selected' : ''}>H3</option>
                    <option value="h4" ${b.level === 'h4' ? 'selected' : ''}>H4</option>
                    <option value="h5" ${b.level === 'h5' ? 'selected' : ''}>H5</option>
                    <option value="h6" ${b.level === 'h6' ? 'selected' : ''}>H6</option>
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
        innerHTML = `
            <div class="b-gal-dropzone" style="padding:8px; border:1px dashed rgba(0,0,0,0.08); border-radius:8px; text-align:center; margin-bottom:8px;">
                Ziehe Bilder hierher oder klicke auf "Bild hinzufügen".
            </div>
            <div class="b-gal-items" style="display:flex;flex-direction:column;gap:8px;">
            </div>
            <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                <button type="button" class="secondary-btn" onclick="appendGalItemToBlock(this.closest('.editor-block'),'image')">Bild hinzufügen</button>
                <button type="button" class="secondary-btn" onclick="appendGalItemToBlock(this.closest('.editor-block'),'pdf')">PDF hinzufügen</button>
            </div>
            <p style="font-size:0.8rem;color:#888;margin:6px 0 0 0;">Jedes Element kann ein Bild oder ein PDF mit Vorschaubild und Titel sein.</p>
        `;
    }

    div.innerHTML = `
        <div class="block-drag-handle"><i class="fas fa-grip-vertical"></i></div>
        <div class="block-content">
            <div class="block-header">
                <div class="block-title" onclick="toggleBlock(this)"><i class="fas ${icon} block-icon"></i> <span class="block-title-text">${title}</span></div>
                <div class="block-actions">
                    <button type="button" class="block-toggle-btn" onclick="toggleBlock(this)"><i class="fas fa-chevron-up"></i></button>
                    <button type="button" class="block-delete-btn" onclick="removeBlock(this)"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="block-preview" data-preview-for="${b.id}"></div>
            ${innerHTML}
        </div>
    `;
    canvas.appendChild(div);
    // animate on insert
    div.classList.add('new-block');
    setTimeout(() => div.classList.remove('new-block'), 400);

    // Populate gallery items if provided (for gallery/media blocks)
    if ((b.type === 'gallery' || b.type === 'media') && Array.isArray(b.items) && b.items.length) {
        b.items.forEach(it => appendGalItemToBlock(div, it.type || (it.pdfUrl ? 'pdf' : 'image'), it));
    }

    // initialize preview
    updateBlockPreview(div);

    // selection handler for inspector
    div.addEventListener('click', (ev) => {
        // avoid triggering when clicking inputs inside the block
        if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'BUTTON')) return;
        selectBlock(div);
    });

    // attach input listeners to update preview live
    const inputs = div.querySelectorAll('input, textarea, select');
    inputs.forEach(inp => inp.addEventListener('input', () => updateBlockPreview(div)));

    // Block-local dropzone handling (for gallery/media blocks)
    const blockDz = div.querySelector('.b-gal-dropzone');
    if (blockDz) {
        ['dragenter','dragover'].forEach(evt => blockDz.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); blockDz.classList.add('dragover'); }));
        ['dragleave','drop'].forEach(evt => blockDz.addEventListener(evt, async (e)=>{
            e.preventDefault(); e.stopPropagation();
            if (evt === 'drop') {
                blockDz.classList.remove('dragover');
                const dt = e.dataTransfer;
                if (dt && dt.files && dt.files.length) {
                    for (const f of Array.from(dt.files)) {
                        if (!f.type.startsWith('image')) continue;
                        const newRow = appendGalItemToBlock(div, 'image');
                        const imgInput = newRow.querySelector('.b-gal-img-url');
                        if (imgInput && !imgInput.id) imgInput.id = 'bgal-' + Date.now() + '-' + Math.floor(Math.random()*10000);
                        try {
                            const res = await uploadFile(f, currentType, imgInput.id);
                            if (res && res.url) {
                                const imgEl = newRow.querySelector('img');
                                if (imgEl) imgEl.src = res.url;
                                imgInput.value = res.url;
                            }
                        } catch (e) { console.error('block upload failed', e); }
                    }
                }
            } else {
                blockDz.classList.remove('dragover');
            }
        }));

        blockDz.addEventListener('click', ()=>{
            // Create a new row and trigger the generic upload for its input
            const newRow = appendGalItemToBlock(div, 'image');
            const imgInput = newRow.querySelector('.b-gal-img-url');
            if (imgInput) triggerUpload(imgInput);
        });
    }
}

function selectBlock(blockEl) {
    if (selectedBlock) selectedBlock.classList.remove('selected-block');
    selectedBlock = blockEl;
    if (selectedBlock) selectedBlock.classList.add('selected-block');
    // Populate inspector
    populateInspectorFor(selectedBlock);
}

function populateInspectorFor(blockEl) {
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;
    inspector.innerHTML = '';
    if (!blockEl) { inspector.innerHTML = '<p>Kein Block ausgewählt</p>'; return; }
    const type = blockEl.dataset.type;
    const title = document.createElement('h3'); title.innerText = 'Block: ' + (type || ''); inspector.appendChild(title);

    if (type === 'hero') {
        const inp = document.createElement('input'); inp.type='text'; inp.value = blockEl.querySelector('.b-hero-img').value || '';
        inp.placeholder = '../../images/...'; inp.style.width='100%'; inp.addEventListener('input', () => {
            const el = blockEl.querySelector('.b-hero-img'); if (el) el.value = inp.value; updateBlockPreview(blockEl);
        });
        const btn = document.createElement('button'); btn.className='secondary-btn'; btn.innerText='Aus Media wählen'; btn.onclick = ()=>{ openMediaLibrary((url)=>{ inp.value = url; inp.dispatchEvent(new Event('input',{bubbles:true})); }); };
        inspector.appendChild(inp); inspector.appendChild(document.createElement('br')); inspector.appendChild(btn);
    } else if (type === 'heading') {
        const level = blockEl.querySelector('.b-head-level').value;
        const sel = document.createElement('select'); ['h1','h2','h3','h4','h5','h6'].forEach(l=>{ const o=document.createElement('option'); o.value=l; o.innerText=l.toUpperCase(); if(l===level) o.selected=true; sel.appendChild(o); });
        sel.addEventListener('change', ()=>{ blockEl.querySelector('.b-head-level').value = sel.value; updateBlockPreview(blockEl); });
        const txt = document.createElement('input'); txt.type='text'; txt.value = blockEl.querySelector('.b-head-text').value || ''; txt.style.width='100%'; txt.addEventListener('input', ()=>{ blockEl.querySelector('.b-head-text').value = txt.value; updateBlockPreview(blockEl); });
        inspector.appendChild(sel); inspector.appendChild(document.createElement('br')); inspector.appendChild(txt);
    } else if (type === 'text') {
        // prefer rich contenteditable if present
        let rich = blockEl.querySelector('.b-text-rich');
        if (!rich) {
            // create rich editor and hide textarea
            const ta = blockEl.querySelector('.b-text-content');
            rich = document.createElement('div'); rich.className='b-text-rich'; rich.contentEditable = 'true'; rich.style.minHeight='140px'; rich.style.border='1px solid rgba(0,0,0,0.06)'; rich.style.padding='8px'; rich.style.borderRadius='6px'; rich.innerHTML = ta ? ta.value : '';
            if (ta) ta.style.display='none';
            ta && ta.parentNode && ta.parentNode.insertBefore(rich, ta);
            rich.addEventListener('input', ()=>{ updateBlockPreview(blockEl); });
        }
        const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='6px'; controls.style.marginBottom='6px';
        ['B','I','U'].forEach(cmd=>{ const b=document.createElement('button'); b.className='secondary-btn'; b.innerText=cmd; b.onclick=(e)=>{ e.preventDefault(); document.execCommand(cmd==='B'?'bold':cmd==='I'?'italic':'underline', false, null); rich.focus(); }; controls.appendChild(b); });
        inspector.appendChild(controls); inspector.appendChild(document.createElement('div')).appendChild(document.createTextNode('')); inspector.appendChild(document.createElement('div'));
        // show current HTML
        const show = document.createElement('div'); show.style.marginTop='8px'; show.style.fontSize='0.85rem'; show.style.color='#666'; show.innerText='Vorschau (editable)'; inspector.appendChild(show);
    } else if (type === 'gallery' || type==='media') {
        const btnAdd = document.createElement('button'); btnAdd.className='primary-btn'; btnAdd.innerText='Neues Bild via Media Library hinzufügen'; btnAdd.onclick = ()=>{ openMediaLibrary((url)=>{ const newRow = appendGalItemToBlock(blockEl,'image',{imageUrl:url}); updateBlockPreview(blockEl); }); };
        inspector.appendChild(btnAdd);
        const info = document.createElement('p'); info.innerText='Galerie-Items bearbeiten im Block. Klick auf ein Item zeigt Upload/URL.'; inspector.appendChild(info);
    } else if (type === 'pdf') {
        const title = blockEl.querySelector('.b-pdf-title').value || '';
        const url = blockEl.querySelector('.b-pdf-url').value || '';
        const thumb = blockEl.querySelector('.b-pdf-thumb').value || '';
        const it = document.createElement('div'); it.innerHTML = `<input type='text' class='ins-pdf-title' placeholder='Titel' value='${title}' style='width:100%'>`;
        inspector.appendChild(it);
        const inUrl = document.createElement('input'); inUrl.type='text'; inUrl.value=url; inUrl.style.width='100%'; inUrl.placeholder='PDF URL'; inUrl.addEventListener('input',()=>{ blockEl.querySelector('.b-pdf-url').value = inUrl.value; updateBlockPreview(blockEl); }); inspector.appendChild(inUrl);
        const btn = document.createElement('button'); btn.className='secondary-btn'; btn.innerText='Wähle Vorschaubild'; btn.onclick = ()=> openMediaLibrary((u)=>{ blockEl.querySelector('.b-pdf-thumb').value = u; updateBlockPreview(blockEl); }); inspector.appendChild(btn);
    } else if (type === 'youtube') {
        const id = blockEl.querySelector('.b-yt-id').value || '';
        const idInp = document.createElement('input'); idInp.type='text'; idInp.value=id; idInp.placeholder='YouTube ID'; idInp.style.width='100%'; idInp.addEventListener('input', ()=>{ blockEl.querySelector('.b-yt-id').value = idInp.value; updateBlockPreview(blockEl); }); inspector.appendChild(idInp);
    }
}

/* --- Media Library --- */
function openMediaLibrary(onSelect) {
    window._mediaSelectCallback = onSelect || null;
    document.getElementById('media-library-modal').classList.remove('hidden');
    fetchMedia();
}

function closeMediaLibrary() {
    document.getElementById('media-library-modal').classList.add('hidden');
    window._mediaSelectCallback = null;
}

async function fetchMedia() {
    const q = document.getElementById('media-search').value || '';
    const grid = document.getElementById('media-grid');
    grid.innerHTML = 'Lade...';
    try {
        const res = await fetch('/api/media');
        const items = await res.json();
        // Apply search and folder filter
        let filtered = items;
        const qLower = q.toLowerCase();
        const folder = (document.getElementById('media-target-type') && document.getElementById('media-target-type').value) || '';
        if (q) filtered = items.filter(i => i.toLowerCase().includes(qLower));
        if (folder && folder !== 'uploads') {
            // items are like ../../images/portfolio/<folder>/...
            filtered = filtered.filter(i => i.includes(`/portfolio/${folder}/`));
        }
        grid.innerHTML = '';
            filtered.slice().reverse().forEach(u => {
            const div = document.createElement('div'); div.className='media-item';
            const img = document.createElement('img'); img.src = normalizeUrl(u);
            div.appendChild(img);
            div.onclick = () => {
                if (window._mediaSelectCallback) window._mediaSelectCallback(u);
                closeMediaLibrary();
            };
            grid.appendChild(div);
        });
    } catch (e) {
        grid.innerHTML = 'Fehler beim Laden der Media Library';
    }
}

// Media upload from Media Library modal
document.addEventListener('DOMContentLoaded', ()=>{
    const mu = document.getElementById('media-upload-input');
    if (mu) mu.addEventListener('change', async (e)=>{
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        try {
            await uploadFilesWithProgress(files, (document.getElementById('media-target-type') && document.getElementById('media-target-type').value) || 'uploads');
            // refresh media grid
            fetchMedia();
        } catch (e) {
            console.error('media upload failed', e);
            alert('Upload fehlgeschlagen');
        } finally {
            mu.value = '';
        }
    });
    
    // Setup dropzone for media modal
    const dz = document.getElementById('media-dropzone');
    const targetLabel = document.getElementById('media-target-label');
    const targetSelect = document.getElementById('media-target-type');
    if (targetSelect && targetLabel) {
        targetSelect.addEventListener('change', ()=>{ targetLabel.innerText = targetSelect.options[targetSelect.selectedIndex].text; });
    }

    if (dz) {
        ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); dz.style.background='#fbfbff'; dz.style.borderColor='#cbd5e1'; }));
        ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); dz.style.background=''; dz.style.borderColor='#eee'; }));
        dz.addEventListener('drop', async (e)=>{
            const dt = e.dataTransfer;
            if (!dt || !dt.files || dt.files.length === 0) return;
            const files = Array.from(dt.files);
            try {
                await uploadFilesWithProgress(files, (document.getElementById('media-target-type') && document.getElementById('media-target-type').value) || 'uploads');
                fetchMedia();
            } catch (err) {
                console.error('Drop upload error', err);
                alert('Upload via Drag&Drop fehlgeschlagen');
            }
        });
    }
});

// Upload helper with progress UI using XMLHttpRequest
function uploadFilesWithProgress(files, targetType) {
    return new Promise((resolve) => {
        const statusContainer = document.getElementById('media-upload-status');
        if (!statusContainer) return resolve();
        statusContainer.innerHTML = '';

        const promises = files.map((file) => new Promise((res) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.marginBottom = '6px';

            const name = document.createElement('div'); name.innerText = file.name; name.style.flex = '1'; name.style.fontSize='13px';
            const progWrap = document.createElement('div'); progWrap.style.width='220px'; progWrap.style.background='#f3f4f6'; progWrap.style.borderRadius='6px'; progWrap.style.overflow='hidden';
            const progBar = document.createElement('div'); progBar.style.width='0%'; progBar.style.height='10px'; progBar.style.background='#2563eb'; progBar.style.transition='width 120ms linear';
            progWrap.appendChild(progBar);
            const status = document.createElement('div'); status.innerText='...'; status.style.width='80px'; status.style.textAlign='right'; status.style.fontSize='12px';

            row.appendChild(name); row.appendChild(progWrap); row.appendChild(status);
            statusContainer.appendChild(row);

            const xhr = new XMLHttpRequest();
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', targetType || 'uploads');

            xhr.open('POST', '/api/upload');
            xhr.upload.onprogress = function (ev) {
                if (ev.lengthComputable) {
                    const pct = Math.round((ev.loaded / ev.total) * 100);
                    progBar.style.width = pct + '%';
                    status.innerText = pct + '%';
                }
            };
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progBar.style.width = '100%';
                    status.innerText = 'Fertig';
                    res({ success: true, resp: xhr.responseText });
                } else {
                    status.innerText = 'Fehler';
                    row.style.opacity = '0.6';
                    res({ success: false, resp: xhr.responseText });
                }
            };
            xhr.onerror = function () { status.innerText = 'Fehler'; row.style.opacity='0.6'; res({ success: false }); };
            xhr.send(fd);
        }));

        Promise.all(promises).then(() => {
            // clear status after short delay
            setTimeout(()=>{ if (statusContainer) statusContainer.innerHTML=''; }, 900);
            resolve();
        });
    });
}

// Gallery item selection for inspector
function selectGalleryItem(blockEl, rowEl) {
    // mark selection
    blockEl.querySelectorAll('.b-gal-item-row').forEach(r=>r.classList.remove('selected-gal-item'));
    rowEl.classList.add('selected-gal-item');
    // populate inspector
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;
    inspector.innerHTML = '';
    const h = document.createElement('h4'); h.innerText = 'Gallery Item'; inspector.appendChild(h);

    const kind = (rowEl.querySelector('.b-gal-kind') || {value:'image'}).value;
    if (kind === 'pdf') {
        const pdfUrl = rowEl.querySelector('.b-gal-pdf-url');
        const thumb = rowEl.querySelector('.b-gal-pdf-thumb');
        const title = rowEl.querySelector('.b-gal-item-title');
        const inTitle = document.createElement('input'); inTitle.type='text'; inTitle.value = title.value || ''; inTitle.placeholder='Titel'; inTitle.style.width='100%'; inTitle.addEventListener('input', ()=>{ title.value = inTitle.value; updateBlockPreview(blockEl); });
        const btnThumb = document.createElement('button'); btnThumb.className='secondary-btn'; btnThumb.innerText='Wähle Vorschaubild'; btnThumb.onclick=()=>openMediaLibrary((u)=>{ thumb.value = u; updateBlockPreview(blockEl); });
        inspector.appendChild(inTitle); inspector.appendChild(document.createElement('br')); inspector.appendChild(btnThumb);
        inspector.appendChild(document.createElement('br'));
        const inPdf = document.createElement('input'); inPdf.type='text'; inPdf.value = pdfUrl.value || ''; inPdf.placeholder='PDF URL'; inPdf.style.width='100%'; inPdf.addEventListener('input', ()=>{ pdfUrl.value = inPdf.value; updateBlockPreview(blockEl); }); inspector.appendChild(inPdf);
    } else {
        const imgInput = rowEl.querySelector('.b-gal-img-url');
        const title = rowEl.querySelector('.b-gal-item-title');
        const inTitle = document.createElement('input'); inTitle.type='text'; inTitle.value = title.value || ''; inTitle.placeholder='Titel'; inTitle.style.width='100%'; inTitle.addEventListener('input', ()=>{ title.value = inTitle.value; updateBlockPreview(blockEl); });
        const btnChoose = document.createElement('button'); btnChoose.className='secondary-btn'; btnChoose.innerText='Aus Media wählen'; btnChoose.onclick=()=>openMediaLibrary((u)=>{ imgInput.value = u; updateBlockPreview(blockEl); imgInput.dispatchEvent(new Event('input',{bubbles:true})); });
        inspector.appendChild(inTitle); inspector.appendChild(document.createElement('br')); inspector.appendChild(btnChoose);
        const btnUpload = document.createElement('button'); btnUpload.className='secondary-btn'; btnUpload.style.marginLeft='8px'; btnUpload.innerText='Upload'; btnUpload.onclick=()=>{ document.getElementById('generic-upload-input').dataset.targetInput = imgInput.id || (imgInput.id = 'tmp-'+Date.now()); document.getElementById('generic-upload-input').click(); };
        inspector.appendChild(btnUpload);
    }
    const btnDel = document.createElement('button'); btnDel.className='btn-delete'; btnDel.innerText='Löschen'; btnDel.style.marginTop='8px'; btnDel.onclick=()=>{ if(confirm('Löschen?')){ rowEl.remove(); updateBlockPreview(blockEl); inspector.innerHTML=''; } };
    inspector.appendChild(document.createElement('br'));
    inspector.appendChild(btnDel);
}

/* --- File Manager --- */
function openFileManager() {
    document.getElementById('file-manager-modal').classList.remove('hidden');
    renderFileManager();
}

function closeFileManager() {
    document.getElementById('file-manager-modal').classList.add('hidden');
}

async function renderFileManager() {
    const res = await fetch('/api/media');
    const items = await res.json();
    // Build folder map
    const map = {};
    items.forEach(it => {
        const rel = it.replace(/\\\\/g, '/').replace(/^\.\/.\/.\/images\/portfolio\//, '');
        const parts = rel.split('/');
        const folder = parts.length > 1 ? parts[0] : 'uploads';
        if (!map[folder]) map[folder] = [];
        map[folder].push({ rel, full: it });
    });

    const foldersEl = document.getElementById('fm-folders');
    const filesEl = document.getElementById('fm-files');
    foldersEl.innerHTML = '';
    filesEl.innerHTML = '';

    const folders = Object.keys(map).sort();
    folders.forEach(f => {
        const btn = document.createElement('button'); btn.className='secondary-btn'; btn.style.textAlign='left'; btn.innerText = f; btn.dataset.folder = f;
        btn.addEventListener('click', ()=>{ selectFolder(f, map); });
        // allow drop on folder
        btn.addEventListener('dragover', (e)=>{ e.preventDefault(); btn.style.background='#f8fafc'; });
        btn.addEventListener('dragleave', (e)=>{ btn.style.background=''; });
        btn.addEventListener('drop', async (e)=>{
            e.preventDefault(); btn.style.background='';
            const src = e.dataTransfer.getData('text/plain');
            if (src) await moveMedia(src, f);
        });
        foldersEl.appendChild(btn);
    });

    // select first folder by default
    if (folders.length) selectFolder(folders[0], map);
}

function selectFolder(folder, map) {
    document.getElementById('fm-current-title').innerText = 'Inhalt: ' + folder;
    const filesEl = document.getElementById('fm-files');
    filesEl.innerHTML = '';
    const items = map[folder] || [];
    items.forEach(it => {
        const div = document.createElement('div'); div.className='media-item'; div.draggable = true; div.title = it.rel;
        const img = document.createElement('img'); img.src = normalizeUrl('../../images/portfolio/' + it.rel);
        const caption = document.createElement('div'); caption.style.fontSize='12px'; caption.style.marginTop='6px'; caption.innerText = it.rel.split('/').slice(1).join('/') || it.rel;
        div.appendChild(img); div.appendChild(caption);
        div.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', '../../images/portfolio/' + it.rel); });
        // quick move button
        const moveBtn = document.createElement('button'); moveBtn.className='secondary-btn'; moveBtn.style.marginTop='6px'; moveBtn.innerText='Verschieben';
        moveBtn.onclick = async ()=>{
            const dest = prompt('Zielordner (z.B. photography, design):', folder);
            if (dest && dest !== folder) await moveMedia('../../images/portfolio/' + it.rel, dest);
        };
        const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.flexDirection='column'; wrap.appendChild(div); wrap.appendChild(moveBtn);
        filesEl.appendChild(wrap);
    });
}

async function moveMedia(src, destDir) {
    try {
        const payload = { src, destDir };
        const res = await fetch('/api/media/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (json && json.success) {
            alert('Datei verschoben: ' + json.newUrl);
            renderFileManager();
            fetchMedia();
        } else {
            alert('Fehler beim Verschieben');
            console.error(json);
        }
    } catch (e) {
        console.error('moveMedia error', e);
        alert('Fehler beim Verschieben');
    }
}

// Helpers for gallery items inside blocks
window.appendGalItemToBlock = function (blockEl, kind = 'image', data = null) {
    if (!blockEl) return;
    const container = blockEl.querySelector('.b-gal-items');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'b-gal-item-row';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.style.padding = '6px';
    row.style.border = '1px solid rgba(0,0,0,0.04)';
    row.style.borderRadius = '8px';

    // drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'gal-drag-handle';
    dragHandle.style.cursor = 'grab';
    dragHandle.style.paddingRight = '6px';
    dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    row.appendChild(dragHandle);

    const kindInput = `<input type="hidden" class="b-gal-kind" value="${kind}">`;
    // Thumbnail column
    const thumbCol = document.createElement('div');
    thumbCol.style.width = '96px';
    thumbCol.style.height = '64px';
    thumbCol.style.flex = '0 0 96px';
    thumbCol.style.display = 'flex';
    thumbCol.style.alignItems = 'center';
    thumbCol.style.justifyContent = 'center';
    thumbCol.style.background = '#fafafa';
    thumbCol.style.borderRadius = '6px';
    const thumbImg = document.createElement('img');
    thumbImg.style.maxWidth = '100%';
    thumbImg.style.maxHeight = '64px';
    thumbImg.style.objectFit = 'cover';
    thumbImg.src = (data && (data.imageUrl || data.pdfThumb || data.pdfUrl)) ? normalizeUrl(data.imageUrl || data.pdfThumb || '') : '';
    thumbCol.appendChild(thumbImg);
    row.appendChild(thumbCol);

    const contentWrap = document.createElement('div');
    contentWrap.style.display = 'flex';
    contentWrap.style.gap = '8px';
    contentWrap.style.flex = '1';

    if (kind === 'pdf') {
        contentWrap.innerHTML = `
            ${kindInput}
            <div style="flex:1; display:flex; gap:6px; align-items:center;">
                <input type="text" class="b-gal-pdf-url" placeholder="PDF Datei URL" value="${data && data.pdfUrl ? data.pdfUrl : ''}" style="flex:1;">
                <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-file-pdf"></i></button>
            </div>
            <div style="width:180px; display:flex; gap:6px; align-items:center;">
                <input type="text" class="b-gal-pdf-thumb" placeholder="Vorschaubild URL" value="${data && data.imageUrl ? data.imageUrl : ''}" style="flex:1;">
                <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-image"></i></button>
            </div>
            <input type="text" class="b-gal-item-title" placeholder="Titel" value="${data && data.title ? data.title : ''}" style="width:220px;">
        `;
    } else {
        contentWrap.innerHTML = `
            ${kindInput}
            <div style="flex:1; display:flex; gap:6px; align-items:center;">
                <input type="text" class="b-gal-img-url" placeholder="Bild URL" value="${data && data.imageUrl ? data.imageUrl : ''}" style="flex:1;">
                <button type="button" onclick="triggerUpload(this.previousElementSibling)"><i class="fas fa-upload"></i></button>
            </div>
            <input type="text" class="b-gal-item-title" placeholder="Titel" value="${data && data.title ? data.title : ''}" style="width:220px;">
        `;
    }

    row.appendChild(contentWrap);

    // delete button
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-row-delete';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.onclick = () => row.remove();
    row.appendChild(delBtn);

    container.appendChild(row);
    // animate new gallery row
    row.classList.add('new-gal-item');
    setTimeout(() => row.classList.remove('new-gal-item'), 360);

    // Make the list sortable using SortableJS
    try {
        if (typeof Sortable !== 'undefined') {
            if (!container._sortable) {
                container._sortable = new Sortable(container, {
                    handle: '.gal-drag-handle',
                    animation: 150,
                    ghostClass: 'sortable-ghost'
                });
            }
        }
    } catch (e) { console.warn(e); }

    // Update thumbnail when URL inputs change
    const imgInput = row.querySelector('.b-gal-img-url');
    const pdfThumbInput = row.querySelector('.b-gal-pdf-thumb');
    const pdfUrlInput = row.querySelector('.b-gal-pdf-url');
    const updateThumb = () => {
        const val = (imgInput && imgInput.value) || (pdfThumbInput && pdfThumbInput.value) || '';
        thumbImg.src = normalizeUrl(val) || '';
    };
    if (imgInput) imgInput.addEventListener('input', updateThumb);
    if (pdfThumbInput) pdfThumbInput.addEventListener('input', updateThumb);
    if (pdfUrlInput && !thumbImg.src) pdfUrlInput.addEventListener('input', () => { /* could fetch preview for PDFs later */ });

    // Ensure block preview updates
    try {
        const block = blockEl || (row.closest && row.closest('.editor-block'));
        if (block) updateBlockPreview(block);
    } catch (e) { }

    // Make row selectable for inspector
    row.addEventListener('click', (ev)=>{ ev.stopPropagation(); try { const block = blockEl || row.closest('.editor-block'); selectGalleryItem(block, row); } catch(e){} });

    return row;
}

// ==========================================================================
// Antigravity Fullscreen Studio WYSIWYG Editor Client Logic
// ==========================================================================

let studioProject = null;
let studioType = null;
let selectedStudioBlock = null;

// Initialize unpublished changes on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('hasUnpublishedChanges') === 'true') {
        const badge = document.getElementById('studio-unpublished-badge');
        if (badge) badge.classList.remove('hidden');
    }
    setupStudioCanvasDragDrop();
});

window.openStudioEditor = function (type, project = null) {
    studioType = type;
    
    // Resolve project if it's an ID
    if (typeof project === 'string') {
        project = projectsData.find(p => p.id === project) || null;
    }

    if (project) {
        studioProject = JSON.parse(JSON.stringify(project));
        if (!studioProject.blocks) {
            studioProject.blocks = [];
        }
    } else {
        // Create clean skeleton for new projects
        studioProject = {
            id: '',
            title: 'Neues Projekt',
            description: '',
            tabTitle: '',
            blocks: []
        };
    }

    // Bind settings meta fields
    document.getElementById('studio-p-title').value = studioProject.title || '';
    document.getElementById('studio-p-tabtitle').value = studioProject.tabTitle || '';
    document.getElementById('studio-p-desc').value = studioProject.description || '';
    document.getElementById('studio-p-hero').value = studioProject['hero-image'] || studioProject.heroImage || '';

    // Handle video metadata specifically
    const videoMeta = document.getElementById('studio-video-meta');
    if (type === 'video') {
        videoMeta.classList.remove('hidden');
        let role = studioProject.role || '';
        let equipment = studioProject.equipment || '';
        let tools = studioProject.tools || '';
        
        if (studioProject.heroMeta && Array.isArray(studioProject.heroMeta)) {
            studioProject.heroMeta.forEach(meta => {
                if (meta.includes('Rolle:')) role = meta.replace(/.*Rolle:<\/strong>\s*/, '');
                if (meta.includes('Equipment:')) equipment = meta.replace(/.*Equipment:<\/strong>\s*/, '');
                if (meta.includes('Tools:')) tools = meta.replace(/.*Tools:<\/strong>\s*/, '');
            });
        }
        document.getElementById('studio-p-role').value = role;
        document.getElementById('studio-p-equipment').value = equipment;
        document.getElementById('studio-p-tools').value = tools;
    } else {
        videoMeta.classList.add('hidden');
    }

    // Toggle fullscreen studio editor view
    document.getElementById('studio-editor').classList.remove('hidden');
    
    // Render blocks onto canvas
    selectedStudioBlock = null;
    populateStudioInspector(null);
    renderStudioCanvas();

    // Default sidebar tab
    setStudioSidebarTab('settings');

    // Init sortable dragging
    initStudioSortable();
};

window.closeStudioEditor = async function (save = false) {
    if (save) {
        const titleVal = document.getElementById('studio-p-title').value.trim();
        if (!titleVal) {
            alert('Bitte gib dem Projekt einen Titel.');
            return;
        }

        // Save current changes from UI back to data model
        studioProject.title = titleVal;
        studioProject.tabTitle = document.getElementById('studio-p-tabtitle').value.trim() || titleVal;
        studioProject.description = document.getElementById('studio-p-desc').value.trim();
        
        const heroVal = document.getElementById('studio-p-hero').value.trim();
        if (studioType === 'video') {
            studioProject.heroImage = heroVal;
            const role = document.getElementById('studio-p-role').value.trim();
            const equip = document.getElementById('studio-p-equipment').value.trim();
            const tools = document.getElementById('studio-p-tools').value.trim();
            studioProject.role = role;
            studioProject.equipment = equip;
            studioProject.tools = tools;
            studioProject.heroMeta = [];
            if (role) studioProject.heroMeta.push(`<strong>Rolle:</strong> ${role}`);
            if (equip) studioProject.heroMeta.push(`<strong>Equipment:</strong> ${equip}`);
            if (tools) studioProject.heroMeta.push(`<strong>Tools:</strong> ${tools}`);
        } else {
            studioProject['hero-image'] = heroVal;
            delete studioProject.heroImage;
        }

        // Generate ID if empty
        if (!studioProject.id) {
            studioProject.id = generateId(titleVal);
        }

        // Update local projects list
        const idx = projectsData.findIndex(p => p.id === studioProject.id);
        if (idx > -1) {
            projectsData[idx] = studioProject;
        } else {
            projectsData.unshift(studioProject);
        }

        // Post to backend API
        try {
            const apiBase = (location.protocol === 'http:' || location.protocol === 'https:') ? `${location.protocol}//${location.host}` : 'http://localhost:3000';
            const res = await fetch(`${apiBase}/api/projects/${studioType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectsData)
            });

            if (res.ok) {
                // Set unpublished flag
                localStorage.setItem('hasUnpublishedChanges', 'true');
                const badge = document.getElementById('studio-unpublished-badge');
                if (badge) badge.classList.remove('hidden');
                
                // Reload lists
                loadProjects(studioType);
            } else {
                alert('Fehler beim Speichern des Projekts.');
                return;
            }
        } catch (e) {
            console.error(e);
            alert('Netzwerkfehler beim Speichern.');
            return;
        }
    }

    // Hide editor view
    document.getElementById('studio-editor').classList.add('hidden');
    studioProject = null;
    selectedStudioBlock = null;
};

window.setStudioDevice = function (device) {
    const viewport = document.getElementById('canvas-viewport');
    if (!viewport) return;

    viewport.classList.remove('desktop', 'tablet', 'mobile');
    viewport.classList.add(device);

    document.querySelectorAll('.studio-device-toggles .device-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.device === device);
    });
};

window.setStudioSidebarTab = function (tabName) {
    document.querySelectorAll('.sidebar-panes .sidebar-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const pane = document.getElementById(`pane-${tabName}`);
    if (pane) pane.classList.add('active');

    document.querySelectorAll('.sidebar-tabs .sidebar-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (tabName === 'media') {
        loadStudioMedia();
    }
};

window.toggleStudioSidebar = function () {
    const sidebar = document.getElementById('studio-sidebar');
    const icon = document.getElementById('sidebar-collapse-icon');
    if (!sidebar || !icon) return;

    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-right';
    } else {
        icon.className = 'fas fa-chevron-left';
    }
};

window.loadStudioMedia = async function () {
    const folder = document.getElementById('studio-media-folder-select').value || 'uploads';
    const grid = document.getElementById('studio-media-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Lade Medien...</div>';

    try {
        const res = await fetch('/api/media');
        const items = await res.json();
        
        let filtered = items;
        if (folder && folder !== 'uploads') {
            filtered = items.filter(i => i.includes(`/portfolio/${folder}/`));
        } else {
            filtered = items.filter(i => i.includes('/portfolio/uploads/') || i.includes('/uploads/'));
        }

        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#555; font-size:0.8rem;">Keine Medien gefunden.</div>';
            return;
        }

        filtered.slice().reverse().forEach(u => {
            const div = document.createElement('div');
            div.className = 'studio-media-item';
            div.draggable = true;
            div.dataset.url = u;

            const isPdf = u.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                div.innerHTML = `
                    <div class="media-pdf-icon">
                        <i class="fas fa-file-pdf"></i>
                        <span>${u.split('/').pop()}</span>
                    </div>
                `;
            } else {
                const img = document.createElement('img');
                img.src = normalizeUrl(u);
                img.loading = 'lazy';
                div.appendChild(img);
            }

            // Click interaction
            div.onclick = () => {
                if (window._mediaSelectCallback) {
                    window._mediaSelectCallback(u);
                } else if (selectedStudioBlock) {
                    const blockId = selectedStudioBlock.dataset.id;
                    const block = studioProject.blocks.find(b => b.id === blockId);
                    if (block) {
                        if (block.type === 'hero') {
                            block.imageUrl = u;
                        } else if (block.type === 'beforeafter') {
                            if (!block.imageUrl) block.imageUrl = u;
                            else block.imageUrlAfter = u;
                        } else if (block.type === 'gallery' || block.type === 'media') {
                            if (!block.items) block.items = [];
                            block.items.push({ type: isPdf ? 'pdf' : 'image', imageUrl: isPdf ? '' : u, pdfUrl: isPdf ? u : '', title: '' });
                        }
                        renderStudioCanvas();
                        populateStudioInspector(selectedStudioBlock);
                    }
                }
            };

            // Drag support
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/uri-list', u);
                e.dataTransfer.setData('text/plain', u);
                e.dataTransfer.setData('application/x-pdf', isPdf ? 'true' : 'false');
            });

            grid.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#ef4444;">Fehler beim Laden.</div>';
    }
};

window.handleStudioMediaUpload = async function (e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const folder = document.getElementById('studio-media-folder-select').value || 'uploads';
    const grid = document.getElementById('studio-media-grid');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Lade hoch...</div>';

    try {
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', folder);
            await fetch('/api/upload', {
                method: 'POST',
                body: fd
            });
        }
    } catch (err) {
        console.error(err);
        alert('Upload failed.');
    } finally {
        e.target.value = '';
        loadStudioMedia();
    }
};

window.triggerStudioMediaUpload = function () {
    document.getElementById('studio-media-upload-input').click();
};

window.triggerStudioHeroUpload = function () {
    openMediaLibrary((url) => {
        document.getElementById('studio-p-hero').value = url;
        updateStudioMeta('hero-image', url);
    });
};

window.updateStudioMeta = function (field, value) {
    if (field === 'hero-image') {
        studioProject['hero-image'] = value;
    } else {
        studioProject[field] = value;
    }
    const badge = document.getElementById('studio-unpublished-badge');
    if (badge) badge.classList.remove('hidden');
};

window.handleBlockLibDragStart = function (e) {
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.type);
};

window.initStudioSortable = function () {
    const canvas = document.getElementById('studio-canvas');
    if (!canvas) return;

    if (window._studioSortableInstance) {
        window._studioSortableInstance.destroy();
    }

    if (typeof Sortable !== 'undefined') {
        window._studioSortableInstance = new Sortable(canvas, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.canvas-block',
            onEnd: function () {
                const reordered = [];
                canvas.querySelectorAll('.canvas-block').forEach(el => {
                    const b = studioProject.blocks.find(x => x.id === el.dataset.id);
                    if (b) reordered.push(b);
                });
                studioProject.blocks = reordered;
            }
        });
    }
};

window.deleteStudioBlock = function (blockId) {
    if (!confirm('Diesen Block wirklich löschen?')) return;
    
    studioProject.blocks = studioProject.blocks.filter(b => b.id !== blockId);
    if (selectedStudioBlock && selectedStudioBlock.dataset.id === blockId) {
        selectedStudioBlock = null;
        populateStudioInspector(null);
    }
    renderStudioCanvas();
};

function setupStudioCanvasDragDrop() {
    const canvas = document.getElementById('studio-canvas');
    if (!canvas) return;

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        const placeholder = document.getElementById('canvas-drop-placeholder') || document.createElement('div');
        placeholder.id = 'canvas-drop-placeholder';
        placeholder.className = 'canvas-drop-placeholder';

        const after = getDragAfterElement(canvas, e.clientY);
        if (after == null) {
            canvas.appendChild(placeholder);
        } else {
            canvas.insertBefore(placeholder, after);
        }
    });

    canvas.addEventListener('dragleave', () => {
        const p = document.getElementById('canvas-drop-placeholder');
        if (p) p.remove();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const placeholder = document.getElementById('canvas-drop-placeholder');
        if (!placeholder) return;

        const mediaUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        const isPdfStr = e.dataTransfer.getData('application/x-pdf');
        let type = e.dataTransfer.getData('text/plain');

        placeholder.remove();

        let newBlock = null;
        if (mediaUrl && (mediaUrl.startsWith('/') || mediaUrl.startsWith('..') || mediaUrl.includes('/images/') || mediaUrl.includes('/portfolio/'))) {
            const isPdf = isPdfStr === 'true' || mediaUrl.toLowerCase().endsWith('.pdf');
            newBlock = {
                id: 'block-' + Date.now() + '-' + Math.floor(Math.random()*1000),
                type: isPdf ? 'pdf' : 'hero',
                title: isPdf ? 'PDF Dokument' : '',
                imageUrl: isPdf ? '' : mediaUrl,
                pdfUrl: isPdf ? mediaUrl : '',
                text: ''
            };
        } else if (type && !type.includes('/') && !type.startsWith('http')) {
            newBlock = {
                id: 'block-' + Date.now() + '-' + Math.floor(Math.random()*1000),
                type: type
            };

            if (type === 'heading') {
                newBlock.level = 'h2';
                newBlock.text = 'Neue Überschrift';
            } else if (type === 'text') {
                newBlock.html = '<p>Hier neuen Textabschnitt eingeben...</p>';
            } else if (type === 'beforeafter') {
                newBlock.imageUrl = '';
                newBlock.imageUrlAfter = '';
            } else if (type === 'gallery' || type === 'media') {
                newBlock.items = [];
            } else if (type === 'pdf') {
                newBlock.title = 'PDF Dokument';
                newBlock.pdfUrl = '';
                newBlock.imageUrl = '';
            } else if (type === 'youtube') {
                newBlock.title = 'YouTube Video';
                newBlock.videoId = '';
                newBlock.tags = '';
            }
        }

        if (!newBlock) return;

        const children = [...canvas.children];
        const blockChildren = children.filter(c => c.classList.contains('canvas-block'));
        let insertIdx = blockChildren.indexOf(placeholder);

        if (insertIdx === -1) {
            const after = getDragAfterElement(canvas, e.clientY);
            if (after) {
                insertIdx = studioProject.blocks.findIndex(b => b.id === after.dataset.id);
            }
        }

        if (insertIdx === -1 || insertIdx === undefined) {
            studioProject.blocks.push(newBlock);
        } else {
            studioProject.blocks.splice(insertIdx, 0, newBlock);
        }

        renderStudioCanvas();
        const el = canvas.querySelector(`.canvas-block[data-id="${newBlock.id}"]`);
        if (el) selectStudioBlock(el);
    });

    function getDragAfterElement(container, y) {
        const draggables = [...container.querySelectorAll('.canvas-block:not(.dragging)')];
        return draggables.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

function renderStudioCanvas() {
    const canvas = document.getElementById('studio-canvas');
    if (!canvas) return;
    canvas.innerHTML = '';

    if (!studioProject.blocks || studioProject.blocks.length === 0) {
        canvas.innerHTML = `
            <div class="empty-canvas-message" style="text-align:center; padding:80px 20px; color:rgba(255,255,255,0.3); border:2px dashed rgba(255,255,255,0.05); border-radius:12px;">
                <i class="fas fa-cubes" style="font-size:3rem; margin-bottom:15px; color:rgba(255,255,255,0.1);"></i>
                <p style="font-size:1.1rem; margin:0 0 8px 0;">Der Canvas ist leer</p>
                <p style="font-size:0.9rem; margin:0;">Ziehe Blöcke aus der Sidebar hierher oder wähle den "Blocks" Tab, um Inhalte hinzuzufügen.</p>
            </div>
        `;
        return;
    }

    studioProject.blocks.forEach((b) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-block';
        wrapper.dataset.id = b.id;
        wrapper.dataset.type = b.type;
        if (selectedStudioBlock && selectedStudioBlock.dataset.id === b.id) {
            wrapper.classList.add('selected');
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'block-toolbar';
        toolbar.innerHTML = `
            <button class="block-toolbar-btn drag-handle" title="Verschieben"><i class="fas fa-grip-vertical"></i></button>
            <button class="block-toolbar-btn delete-btn" title="Löschen" onclick="event.stopPropagation(); deleteStudioBlock('${b.id}')"><i class="fas fa-trash"></i></button>
        `;
        wrapper.appendChild(toolbar);

        const content = document.createElement('div');
        content.className = `block-content-view g-block-${b.type}`;

        switch (b.type) {
            case 'heading':
                const lvl = b.level || 'h2';
                const h = document.createElement(lvl);
                h.contentEditable = 'true';
                h.innerText = b.text || 'Überschrift';
                h.addEventListener('blur', () => {
                    b.text = h.innerText;
                });
                content.appendChild(h);
                break;

            case 'text':
                const div = document.createElement('div');
                div.className = 'g-block-text-inner';
                div.contentEditable = 'true';
                div.innerHTML = b.html || '<p>Hier Text eingeben...</p>';
                div.addEventListener('blur', () => {
                    b.html = div.innerHTML;
                });
                content.appendChild(div);
                break;

            case 'hero':
                content.className = 'g-block-hero';
                content.innerHTML = `
                    ${b.imageUrl ? `<img src="${normalizeUrl(b.imageUrl)}" class="hero-image">` : `<div style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); height:200px; display:flex; align-items:center; justify-content:center; border-radius:12px; color:rgba(255,255,255,0.25);"><i class="fas fa-image" style="margin-right:8px;"></i> Kein Hero-Bild</div>`}
                    <div class="hero-text-caption" contenteditable="true" style="margin-top:10px; font-style:italic; text-align:center; color:rgba(255,255,255,0.5); font-size:0.9rem;">${b.text || 'Optionaler Bilduntertitel...'}</div>
                `;
                const cap = content.querySelector('.hero-text-caption');
                if (cap) {
                    cap.addEventListener('blur', () => {
                        b.text = cap.innerText;
                    });
                }
                break;

            case 'beforeafter':
                const img1 = b.imageUrl || '';
                const img2 = b.imageUrlAfter || '';
                content.className = 'cgi-slider-block';
                content.innerHTML = `
                    <div class="cgi-slider-container">
                        <div class="cgi-slider-before">
                            ${img1 ? `<img src="${normalizeUrl(img1)}" draggable="false">` : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#555;">[Vorher-Bild]</div>`}
                        </div>
                        <div class="cgi-slider-after" style="width:50%;">
                            ${img2 ? `<img src="${normalizeUrl(img2)}" draggable="false">` : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#555;">[Nachher-Bild]</div>`}
                        </div>
                        <div class="cgi-slider-handle" style="left:50%;">
                            <i class="fas fa-arrows-alt-h"></i>
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    initCgiSlider(wrapper.querySelector('.cgi-slider-container'));
                }, 0);
                break;

            case 'gallery':
            case 'media':
                content.className = 'project-gallery-grid';
                if (b.items && b.items.length > 0) {
                    const grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
                    grid.style.gap = '12px';
                    
                    b.items.forEach(it => {
                        const cell = document.createElement('div');
                        cell.style.background = 'rgba(255,255,255,0.02)';
                        cell.style.border = '1px solid rgba(255,255,255,0.05)';
                        cell.style.borderRadius = '8px';
                        cell.style.overflow = 'hidden';
                        cell.style.aspectRatio = '1';
                        cell.style.display = 'flex';
                        cell.style.flexDirection = 'column';
                        cell.style.position = 'relative';

                        if (it.type === 'pdf') {
                            const thumb = it.imageUrl || '';
                            cell.innerHTML = `
                                <div style="flex:1; background:rgba(239,68,68,0.08); display:flex; align-items:center; justify-content:center; color:#ef4444; overflow:hidden;">
                                    ${thumb ? `<img src="${normalizeUrl(thumb)}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-file-pdf" style="font-size:2rem;"></i>`}
                                </div>
                                <div style="padding:6px; font-size:0.75rem; background:rgba(0,0,0,0.4); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${it.title || 'PDF'}</div>
                            `;
                        } else {
                            const img = it.imageUrl || '';
                            cell.innerHTML = `
                                <div style="flex:1; overflow:hidden;">
                                    ${img ? `<img src="${normalizeUrl(img)}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; background:#222; display:flex; align-items:center; justify-content:center; color:#555;"><i class="fas fa-image"></i></div>`}
                                </div>
                                ${it.title ? `<div style="padding:6px; font-size:0.75rem; background:rgba(0,0,0,0.4); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${it.title}</div>` : ''}
                            `;
                        }
                        grid.appendChild(cell);
                    });
                    content.appendChild(grid);
                } else {
                    content.innerHTML = `<div style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); padding:20px; text-align:center; color:#555; border-radius:8px;"><i class="fas fa-images"></i> Keine Bilder zugewiesen</div>`;
                }
                break;

            case 'pdf':
                content.className = 'videokarte';
                content.style.padding = "0";
                content.style.border = "1px solid rgba(255,255,255,0.05)";
                content.style.background = "#181424";
                content.innerHTML = `
                    <div style="width:100%; height:280px; background:#120e1a; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.3); overflow:hidden; position:relative;">
                        ${b.imageUrl ? `<img src="${normalizeUrl(b.imageUrl)}" style="width:100%; height:100%; object-fit:cover; opacity:0.5;">` : `<i class="fas fa-file-pdf" style="font-size:3rem; color:#ef4444;"></i>`}
                        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px;">
                            <span style="font-size:1rem; font-weight:500;">${b.title || 'PDF Dokument'}</span>
                            <span style="font-size:0.8rem; color:#888;">PDF: ${b.pdfUrl ? b.pdfUrl.split('/').pop() : 'Keine URL'}</span>
                        </div>
                    </div>
                `;
                break;

            case 'youtube':
                content.className = 'videokarte';
                content.style.padding = "0";
                content.style.border = "1px solid rgba(255,255,255,0.05)";
                content.style.background = "#181424";
                content.innerHTML = `
                    <div class="video-container" style="position:relative; aspect-ratio:16/9; background:#000;">
                        ${b.videoId ? `<iframe style="width:100%; height:100%; pointer-events:none;" src="https://www.youtube-nocookie.com/embed/${b.videoId}" frameborder="0"></iframe>` : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#555;"><i class="fab fa-youtube" style="font-size:2.5rem; color:#ef4444; margin-right:10px;"></i> YouTube ID fehlt</div>`}
                    </div>
                    <div style="padding:12px;">
                        <h4 style="margin:0 0 6px 0; color:#fff; font-size:0.95rem;">${b.title || 'YouTube Video'}</h4>
                        ${b.tags ? `<span style="font-size:0.75rem; color:#888;">Tags: ${b.tags}</span>` : ''}
                    </div>
                `;
                break;
        }

        wrapper.appendChild(content);

        wrapper.addEventListener('click', (e) => {
            if (e.target.closest('.block-toolbar') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) {
                return;
            }
            selectStudioBlock(wrapper);
        });

        canvas.appendChild(wrapper);
    });
}

function selectStudioBlock(blockEl) {
    document.querySelectorAll('.canvas-block').forEach(b => b.classList.remove('selected'));
    selectedStudioBlock = blockEl;
    if (selectedStudioBlock) {
        selectedStudioBlock.classList.add('selected');
        populateStudioInspector(blockEl);
    }
}

function populateStudioInspector(blockEl) {
    const insp = document.getElementById('studio-inspector-content');
    if (!insp) return;
    insp.innerHTML = '';

    if (!blockEl) {
        insp.innerHTML = '<p class="hint-text">Wähle einen Block aus, um Einstellungen zu bearbeiten.</p>';
        return;
    }

    const blockId = blockEl.dataset.id;
    const block = studioProject.blocks.find(b => b.id === blockId);
    if (!block) return;

    const type = block.type;
    const t = document.createElement('h3');
    t.style.fontSize = '0.85rem';
    t.style.color = '#c084fc';
    t.style.textTransform = 'uppercase';
    t.style.marginBottom = '12px';
    t.innerText = `${type} block`;
    insp.appendChild(t);

    switch (type) {
        case 'heading':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Ebene</label>
                    <select id="ins-heading-level">
                        <option value="h1" ${block.level === 'h1' ? 'selected' : ''}>H1 (Sehr groß)</option>
                        <option value="h2" ${block.level === 'h2' ? 'selected' : ''}>H2 (Titel)</option>
                        <option value="h3" ${block.level === 'h3' ? 'selected' : ''}>H3 (Unterüberschrift)</option>
                        <option value="h4" ${block.level === 'h4' ? 'selected' : ''}>H4 (Klein)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Text</label>
                    <input type="text" id="ins-heading-text" value="${block.text || ''}">
                </div>
            `;
            setTimeout(() => {
                const lvl = document.getElementById('ins-heading-level');
                const txt = document.getElementById('ins-heading-text');
                lvl.addEventListener('change', () => {
                    block.level = lvl.value;
                    renderStudioCanvas();
                });
                txt.addEventListener('input', () => {
                    block.text = txt.value;
                    const h = blockEl.querySelector('h1, h2, h3, h4, h5, h6');
                    if (h) h.innerText = txt.value;
                });
            }, 0);
            break;

        case 'text':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Inhalt (HTML möglich)</label>
                    <textarea id="ins-text-html" rows="8" style="font-family:monospace; font-size:0.8rem;">${block.html || ''}</textarea>
                </div>
            `;
            setTimeout(() => {
                const html = document.getElementById('ins-text-html');
                html.addEventListener('input', () => {
                    block.html = html.value;
                    const inner = blockEl.querySelector('.g-block-text-inner');
                    if (inner) inner.innerHTML = html.value;
                });
                const inner = blockEl.querySelector('.g-block-text-inner');
                if (inner) {
                    inner.addEventListener('input', () => {
                        block.html = inner.innerHTML;
                        html.value = inner.innerHTML;
                    });
                }
            }, 0);
            break;

        case 'hero':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Bild URL</label>
                    <div style="display:flex; gap:6px;">
                        <input type="text" id="ins-hero-img" value="${block.imageUrl || ''}" style="flex:1;">
                        <button type="button" class="secondary-btn btn-small" id="btn-ins-hero-media" style="margin:0;"><i class="fas fa-images"></i></button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Bilduntertitel (Optional)</label>
                    <input type="text" id="ins-hero-text" value="${block.text || ''}">
                </div>
            `;
            setTimeout(() => {
                const img = document.getElementById('ins-hero-img');
                const txt = document.getElementById('ins-hero-text');
                
                img.addEventListener('input', () => {
                    block.imageUrl = img.value;
                    renderStudioCanvas();
                });
                txt.addEventListener('input', () => {
                    block.text = txt.value;
                    const cap = blockEl.querySelector('.hero-text-caption');
                    if (cap) cap.innerText = txt.value;
                });
                document.getElementById('btn-ins-hero-media').addEventListener('click', () => {
                    openMediaLibrary((url) => {
                        img.value = url;
                        block.imageUrl = url;
                        renderStudioCanvas();
                    });
                });
            }, 0);
            break;

        case 'beforeafter':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Vorher (Links)</label>
                    <div style="display:flex; gap:6px;">
                        <input type="text" id="ins-ba-before" value="${block.imageUrl || ''}" style="flex:1;">
                        <button type="button" class="secondary-btn btn-small" id="btn-ins-ba-before-media" style="margin:0;"><i class="fas fa-images"></i></button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Nachher (Rechts)</label>
                    <div style="display:flex; gap:6px;">
                        <input type="text" id="ins-ba-after" value="${block.imageUrlAfter || ''}" style="flex:1;">
                        <button type="button" class="secondary-btn btn-small" id="btn-ins-ba-after-media" style="margin:0;"><i class="fas fa-images"></i></button>
                    </div>
                </div>
            `;
            setTimeout(() => {
                const bef = document.getElementById('ins-ba-before');
                const aft = document.getElementById('ins-ba-after');
                
                bef.addEventListener('input', () => {
                    block.imageUrl = bef.value;
                    renderStudioCanvas();
                });
                aft.addEventListener('input', () => {
                    block.imageUrlAfter = aft.value;
                    renderStudioCanvas();
                });
                document.getElementById('btn-ins-ba-before-media').addEventListener('click', () => {
                    openMediaLibrary((url) => {
                        bef.value = url;
                        block.imageUrl = url;
                        renderStudioCanvas();
                    });
                });
                document.getElementById('btn-ins-ba-after-media').addEventListener('click', () => {
                    openMediaLibrary((url) => {
                        aft.value = url;
                        block.imageUrlAfter = url;
                        renderStudioCanvas();
                    });
                });
            }, 0);
            break;

        case 'gallery':
        case 'media':
            insp.innerHTML += `
                <div style="margin-bottom:12px; display:flex; gap:6px;">
                    <button class="primary-btn btn-small" id="btn-ins-gal-add-img" style="flex:1; margin:0;"><i class="fas fa-image"></i> Bild +</button>
                    <button class="secondary-btn btn-small" id="btn-ins-gal-add-pdf" style="flex:1; margin:0;"><i class="fas fa-file-pdf"></i> PDF +</button>
                </div>
                <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                    <label style="margin-bottom:6px; display:block;">Elemente Liste:</label>
                    <div id="ins-gal-items-list" style="display:flex; flex-direction:column; gap:6px;"></div>
                </div>
            `;
            setTimeout(() => {
                const itemsList = document.getElementById('ins-gal-items-list');
                const refresh = () => {
                    itemsList.innerHTML = '';
                    if (!block.items || block.items.length === 0) {
                        itemsList.innerHTML = '<span style="font-size:0.75rem; color:#555;">Keine Elemente vorhanden.</span>';
                        return;
                    }
                    block.items.forEach((item, idx) => {
                        const row = document.createElement('div');
                        row.style.display = 'flex';
                        row.style.alignItems = 'center';
                        row.style.gap = '6px';
                        row.style.background = 'rgba(255,255,255,0.03)';
                        row.style.padding = '4px 6px';
                        row.style.borderRadius = '4px';

                        const span = document.createElement('span');
                        span.style.flex = '1';
                        span.style.fontSize = '0.75rem';
                        span.style.overflow = 'hidden';
                        span.style.textOverflow = 'ellipsis';
                        span.style.whiteSpace = 'nowrap';
                        span.innerText = item.title || (item.type === 'pdf' ? 'PDF Datei' : 'Bild');

                        const edit = document.createElement('button');
                        edit.className = 'secondary-btn btn-small';
                        edit.style.padding = '3px 6px';
                        edit.style.margin = '0';
                        edit.innerHTML = '<i class="fas fa-pen"></i>';
                        edit.onclick = () => editGalleryItemDetails(block, idx, refresh);

                        const del = document.createElement('button');
                        del.className = 'btn-delete btn-small';
                        del.style.padding = '3px 6px';
                        del.style.margin = '0';
                        del.innerHTML = '<i class="fas fa-trash"></i>';
                        del.onclick = () => {
                            if (confirm('Element entfernen?')) {
                                block.items.splice(idx, 1);
                                refresh();
                                renderStudioCanvas();
                            }
                        };

                        row.appendChild(span);
                        row.appendChild(edit);
                        row.appendChild(del);
                        itemsList.appendChild(row);
                    });
                };

                document.getElementById('btn-ins-gal-add-img').addEventListener('click', () => {
                    openMediaLibrary((url) => {
                        if (!block.items) block.items = [];
                        block.items.push({ type: 'image', imageUrl: url, title: '' });
                        refresh();
                        renderStudioCanvas();
                    });
                });

                document.getElementById('btn-ins-gal-add-pdf').addEventListener('click', () => {
                    if (!block.items) block.items = [];
                    block.items.push({ type: 'pdf', pdfUrl: '', imageUrl: '', title: '' });
                    refresh();
                    renderStudioCanvas();
                });

                refresh();
            }, 0);
            break;

        case 'pdf':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Titel</label>
                    <input type="text" id="ins-pdf-title" value="${block.title || ''}">
                </div>
                <div class="form-group">
                    <label>PDF Datei URL</label>
                    <div style="display:flex; gap:6px;">
                        <input type="text" id="ins-pdf-url" value="${block.pdfUrl || ''}" style="flex:1;">
                        <button type="button" class="secondary-btn btn-small" id="btn-ins-pdf-media" style="margin:0;"><i class="fas fa-file-pdf"></i></button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Vorschaubild URL (Optional)</label>
                    <div style="display:flex; gap:6px;">
                        <input type="text" id="ins-pdf-thumb" value="${block.imageUrl || ''}" style="flex:1;">
                        <button type="button" class="secondary-btn btn-small" id="btn-ins-pdf-thumb-media" style="margin:0;"><i class="fas fa-images"></i></button>
                    </div>
                </div>
            `;
            setTimeout(() => {
                const tit = document.getElementById('ins-pdf-title');
                const url = document.getElementById('ins-pdf-url');
                const th = document.getElementById('ins-pdf-thumb');

                tit.addEventListener('input', () => {
                    block.title = tit.value;
                    renderStudioCanvas();
                });
                url.addEventListener('input', () => {
                    block.pdfUrl = url.value;
                    renderStudioCanvas();
                });
                th.addEventListener('input', () => {
                    block.imageUrl = th.value;
                    renderStudioCanvas();
                });

                document.getElementById('btn-ins-pdf-media').addEventListener('click', () => {
                    openMediaLibrary((u) => {
                        url.value = u;
                        block.pdfUrl = u;
                        renderStudioCanvas();
                    });
                });
                document.getElementById('btn-ins-pdf-thumb-media').addEventListener('click', () => {
                    openMediaLibrary((u) => {
                        th.value = u;
                        block.imageUrl = u;
                        renderStudioCanvas();
                    });
                });
            }, 0);
            break;

        case 'youtube':
            insp.innerHTML += `
                <div class="form-group">
                    <label>Video Titel</label>
                    <input type="text" id="ins-yt-title" value="${block.title || ''}">
                </div>
                <div class="form-group">
                    <label>YouTube ID</label>
                    <input type="text" id="ins-yt-id" value="${block.videoId || ''}">
                </div>
                <div class="form-group">
                    <label>Tags (Komma-separiert)</label>
                    <input type="text" id="ins-yt-tags" value="${block.tags || ''}">
                </div>
            `;
            setTimeout(() => {
                const tit = document.getElementById('ins-yt-title');
                const id = document.getElementById('ins-yt-id');
                const tags = document.getElementById('ins-yt-tags');

                tit.addEventListener('input', () => {
                    block.title = tit.value;
                    renderStudioCanvas();
                });
                id.addEventListener('input', () => {
                    block.videoId = id.value;
                    renderStudioCanvas();
                });
                tags.addEventListener('input', () => {
                    block.tags = tags.value;
                    renderStudioCanvas();
                });
            }, 0);
            break;
    }
}

function editGalleryItemDetails(block, idx, onComplete) {
    const item = block.items[idx];
    const insp = document.getElementById('studio-inspector-content');
    if (!insp) return;

    insp.innerHTML = `
        <div style="margin-bottom:10px;">
            <button class="secondary-btn btn-small" id="btn-ins-gal-back" style="margin:0;"><i class="fas fa-chevron-left"></i> Zurück</button>
        </div>
        <h4 style="font-size:0.75rem; color:#a78bfa; margin-bottom:12px;">Element #${idx+1} (${item.type === 'pdf' ? 'PDF' : 'Bild'})</h4>
        
        <div class="form-group">
            <label>Titel / Caption</label>
            <input type="text" id="ins-gitem-title" value="${item.title || ''}">
        </div>
    `;

    if (item.type === 'pdf') {
        insp.innerHTML += `
            <div class="form-group">
                <label>PDF URL</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="ins-gitem-pdfurl" value="${item.pdfUrl || ''}" style="flex:1;">
                    <button type="button" class="secondary-btn btn-small" id="btn-ins-gitem-pdf-media" style="margin:0;"><i class="fas fa-file-pdf"></i></button>
                </div>
            </div>
            <div class="form-group">
                <label>Vorschaubild URL (Optional)</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="ins-gitem-imgurl" value="${item.imageUrl || ''}" style="flex:1;">
                    <button type="button" class="secondary-btn btn-small" id="btn-ins-gitem-img-media" style="margin:0;"><i class="fas fa-images"></i></button>
                </div>
            </div>
        `;
    } else {
        insp.innerHTML += `
            <div class="form-group">
                <label>Bild URL</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="ins-gitem-imgurl" value="${item.imageUrl || ''}" style="flex:1;">
                    <button type="button" class="secondary-btn btn-small" id="btn-ins-gitem-img-media" style="margin:0;"><i class="fas fa-images"></i></button>
                </div>
            </div>
        `;
    }

    setTimeout(() => {
        const tit = document.getElementById('ins-gitem-title');
        const img = document.getElementById('ins-gitem-imgurl');
        const pdf = document.getElementById('ins-gitem-pdfurl');

        tit.addEventListener('input', () => {
            item.title = tit.value;
            renderStudioCanvas();
        });

        if (img) {
            img.addEventListener('input', () => {
                item.imageUrl = img.value;
                renderStudioCanvas();
            });
            document.getElementById('btn-ins-gitem-img-media').addEventListener('click', () => {
                openMediaLibrary((u) => {
                    img.value = u;
                    item.imageUrl = u;
                    renderStudioCanvas();
                });
            });
        }

        if (pdf) {
            pdf.addEventListener('input', () => {
                item.pdfUrl = pdf.value;
                renderStudioCanvas();
            });
            document.getElementById('btn-ins-gitem-pdf-media').addEventListener('click', () => {
                openMediaLibrary((u) => {
                    pdf.value = u;
                    item.pdfUrl = u;
                    renderStudioCanvas();
                });
            });
        }

        document.getElementById('btn-ins-gal-back').addEventListener('click', () => {
            populateStudioInspector(selectedStudioBlock);
        });
    }, 0);
}

function initCgiSlider(container) {
    if (!container) return;
    const after = container.querySelector('.cgi-slider-after');
    const handle = container.querySelector('.cgi-slider-handle');
    if (!after || !handle) return;

    let dragging = false;

    function update(x) {
        const r = container.getBoundingClientRect();
        let pct = ((x - r.left) / r.width) * 100;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        after.style.width = pct + '%';
        handle.style.left = pct + '%';
    }

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dragging = true;
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        update(e.clientX);
    });

    window.addEventListener('mouseup', () => {
        dragging = false;
    });

    handle.addEventListener('touchstart', () => {
        dragging = true;
    });

    window.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        if (e.touches && e.touches[0]) {
            update(e.touches[0].clientX);
        }
    });

    window.addEventListener('touchend', () => {
        dragging = false;
    });
}


