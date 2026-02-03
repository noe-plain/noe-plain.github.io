(function () {
    const nav = document.getElementById('page-nav');
    const scrollBtn = document.getElementById('page-nav-scroll-btn');
    const leftGradient = document.getElementById('page-nav-left-gradient');

    if (nav && scrollBtn && leftGradient) {
        const checkScroll = () => {
            const rect = nav.getBoundingClientRect();

            // Position buttons
            scrollBtn.style.top = (rect.top + rect.height / 2 - scrollBtn.offsetHeight / 2) + "px";
            scrollBtn.style.left = (rect.right - scrollBtn.offsetWidth) + "px";
            scrollBtn.style.height = Math.max(40, rect.height) + "px";

            leftGradient.style.top = (rect.top + rect.height / 2 - leftGradient.offsetHeight / 2) + "px";
            leftGradient.style.left = rect.left + "px";
            leftGradient.style.height = Math.max(40, rect.height) + "px";


            // Check right
            const tolerance = 5;
            if (nav.scrollWidth - nav.clientWidth - nav.scrollLeft > tolerance) {
                scrollBtn.classList.remove('hidden');
                scrollBtn.style.display = 'flex'; // Ensure flex if hidden class just does opacity
            } else {
                scrollBtn.classList.add('hidden');
                setTimeout(() => { if (scrollBtn.classList.contains('hidden')) scrollBtn.style.display = 'none'; }, 300);
            }
            // Check left
            if (nav.scrollLeft > tolerance) {
                leftGradient.classList.remove('hidden');
                leftGradient.style.display = 'flex';
            } else {
                leftGradient.classList.add('hidden');
                setTimeout(() => { if (leftGradient.classList.contains('hidden')) leftGradient.style.display = 'none'; }, 300);
            }
        };

        nav.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        window.addEventListener('scroll', checkScroll);

        scrollBtn.addEventListener('click', () => {
            nav.scrollBy({ left: 200, behavior: 'smooth' });
        });

        leftGradient.addEventListener('click', () => {
            nav.scrollBy({ left: -200, behavior: 'smooth' });
        });

        // Run once on load
        setTimeout(checkScroll, 100);

        // Also run after dynamic loading
        const observer = new MutationObserver(checkScroll);
        observer.observe(nav, { childList: true });
    }
})();


// Re-layout grid when tab becomes visible
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
        document.querySelectorAll('.project-gallery').forEach(el => relayoutGrid(el));
    }
});
window.addEventListener("focus", () => {
    document.querySelectorAll('.project-gallery').forEach(el => relayoutGrid(el));
});


//// Global Data
let projectsData = [];
let currentProject = null;
let activePhotoId = null;
let favoriteIds = [];
let currentScale = 1;
let pannedX = 0;
let pannedY = 0;

// cached DOM elements
const detailScreen = document.getElementById('detail-screen');
const zoomTarget = document.getElementById('zoom-target');
const zoomSlider = document.getElementById('zoom-slider');
const detailContent = document.getElementById('detail-content-sheet');
const mainHeader = document.querySelector('header');
const floatingBar = document.getElementById('floating-download-bar');
const selectedCountSpan = document.getElementById('selected-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');

/* Cookie Helper */
const CookieManager = {
    set: (name, value, days = 365) => {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        let expires = "expires=" + d.toUTCString();
        document.cookie = name + "=" + JSON.stringify(value) + ";" + expires + ";path=/;SameSite=Strict";
    },
    get: (name) => {
        let nameEQ = name + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) == 0) {
                try {
                    return JSON.parse(c.substring(nameEQ.length, c.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }
};


document.addEventListener('DOMContentLoaded', () => {
    const savedFavs = CookieManager.get('noe_favs');
    if (savedFavs && Array.isArray(savedFavs)) {
        favoriteIds = savedFavs;
    }

    setupZoomPan();
    updateFloatingDownloadBar();

    // FETCH JSON DATA
    fetch('illustrations.json')
        .then(response => response.json())
        .then(data => {
            projectsData = data;

            // Check URL for project ID
            // Support ?id strictly
            let startId = window.location.search.replace('?', '');

            // Validate ID exists
            const projectExists = projectsData.some(p => p.id === startId);
            if (!projectExists) startId = projectsData.length > 0 ? projectsData[0].id : null;

            if (startId) loadProject(startId);
        })
        .catch(err => console.error('Error loading illustrations:', err));


    // Detail Listeners
    document.getElementById('back-btn').addEventListener('click', closeDetail);

    document.getElementById('info-toggle-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        detailContent.classList.toggle('visible');
    });

    document.getElementById('sheet-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        detailContent.classList.remove('visible');
    });

    document.getElementById('detail-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(activePhotoId);
    });

    document.getElementById('detail-prev-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        navigatePhoto(-1);
    });
    document.getElementById('detail-next-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        navigatePhoto(1);
    });

    document.getElementById('download-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = findImageById(activePhotoId);
        if (item) downloadPhoto(item.imageUrl);
    });

    // Keyboard nav
    document.addEventListener('keydown', (e) => {
        if (!detailScreen.classList.contains('hidden') && detailScreen.classList.contains('active')) {
            if (e.key === 'ArrowLeft') navigatePhoto(-1);
            if (e.key === 'ArrowRight') navigatePhoto(1);
            if (e.key === 'Escape') closeDetail();
        }
    });

    // Floating Bar Listeners
    clearSelectionBtn?.addEventListener('click', () => {
        favoriteIds = [];
        CookieManager.set('noe_favs', favoriteIds);
        updateAllFavButtons();
        updateFloatingDownloadBar();

        const previewPanel = document.getElementById('floating-preview-panel');
        if (previewPanel) previewPanel.classList.add('hidden');

        showToast("Auswahl aufgehoben");
    });
});

function loadProject(id) {
    const project = projectsData.find(p => p.id === id);
    if (!project) return;

    currentProject = project;

    // Update URL
    const url = window.location.pathname + '?' + id;
    window.history.pushState({ path: url }, '', url);

    // Update Hero
    const heroEl = document.querySelector('.detail-hero');
    if (heroEl) {
        let bgImage = '';
        if (project['hero-image']) {
            bgImage = project['hero-image'];
        } else if (project.images && project.images.length > 0) {
            bgImage = project.images[0].imageUrl;
        }

        if (bgImage) {
            heroEl.style.backgroundImage = `url(${bgImage})`;
        }
    }

    const heroTitle = document.querySelector('.detail-hero-content h1');
    const heroDesc = document.querySelector('.detail-hero-beschreibung');

    if (heroTitle && project.title) heroTitle.innerText = project.title;
    if (heroDesc && project.description) heroDesc.innerText = project.description;

    renderPageNav(id);

    // Render Images
    loadImagesFromData(project.images || [], 'lightgallery-illustration');
}

function renderPageNav(activeId) {
    const nav = document.getElementById('page-nav');
    if (!nav) return;
    nav.style.display = 'flex';
    nav.innerHTML = '';

    projectsData.forEach(p => {
        const btn = document.createElement('a');
        btn.className = 'tab-btn' + (p.id === activeId ? ' active' : '');
        btn.href = '?' + p.id;
        btn.innerText = p.title;
        btn.onclick = (e) => {
            e.preventDefault();
            if (p.id === activeId) return;
            loadProject(p.id);
        };
        nav.appendChild(btn);
    });
}

function findImageById(id) {
    for (const p of projectsData) {
        if (p.images) {
            const found = p.images.find(img => img.id === id);
            if (found) return found;
        }
    }
    return null;
}

function filterAndLoadGallery() {
    // Deprecated in project-based view, but kept empty/log just in case
    console.warn("filterAndLoadGallery called but we are in project mode");
}


function showToast(msg) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.innerText = msg;
        toast.classList.remove("hidden");
        toast.classList.add("visible");
        setTimeout(() => {
            toast.classList.remove("visible");
            toast.classList.add("hidden");
        }, 3000);
    }
}

function toggleFavorite(id) {
    if (!id) return;
    const idx = favoriteIds.indexOf(id);
    if (idx > -1) {
        favoriteIds.splice(idx, 1);
    } else {
        favoriteIds.push(id);
    }
    CookieManager.set('noe_favs', favoriteIds);

    updateDetailFavBtn();
    updateGridFavBtn(id); // Update specific grid button
    updateFloatingDownloadBar();

    // If preview is open, refresh it
    const previewPanel = document.getElementById('floating-preview-panel');
    if (previewPanel && !previewPanel.classList.contains('hidden')) {
        renderFloatingPreview();
    }
}

function updateDetailFavBtn() {
    const btn = document.getElementById('detail-fav-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (favoriteIds.includes(activePhotoId)) {
        icon.className = "fas fa-heart";
        icon.style.color = "red";
    } else {
        icon.className = "far fa-heart";
        icon.style.color = "";
    }
}

function updateGridFavBtn(id) {
    const btns = document.querySelectorAll(`.grid-fav-btn[data-id="${id}"]`);
    btns.forEach(btn => {
        if (favoriteIds.includes(id)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateAllFavButtons() {
    document.querySelectorAll('.grid-fav-btn').forEach(btn => {
        const id = btn.dataset.id;
        if (favoriteIds.includes(id)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateFloatingDownloadBar() {
    if (!floatingBar) return;
    const count = favoriteIds.length;
    if (count > 0) {
        floatingBar.classList.remove('hidden');
        selectedCountSpan.innerText = count + (count === 1 ? " Bild ausgewählt" : " Bilder ausgewählt");
    } else {
        floatingBar.classList.add('hidden');
    }
}

function downloadPhoto(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/* -- Detail View Logic -- */

function openDetail(id) {
    activePhotoId = id;
    const item = findImageById(id);
    if (!item) return;

    updateDetailContent(item);

    // Reset zoom
    currentScale = 1;
    pannedX = 0;
    pannedY = 0;
    if (zoomSlider) zoomSlider.value = 1;
    updateTransform();

    // Reset sheet
    if (detailContent) {
        detailContent.classList.remove('visible');
        detailContent.classList.remove('minimized');
    }

    if (detailScreen) {
        detailScreen.classList.remove('hidden');
        // Small delay for animation
        setTimeout(() => {
            detailScreen.classList.add('active');
            if (mainHeader) mainHeader.style.display = 'none';
        }, 10);
    }
}

function updateDetailContent(item) {
    if (zoomTarget) {
        zoomTarget.innerHTML = `<img src="${item.imageUrl}" alt="${item.title}" class="detail-img" draggable="false">`;
    }
    document.getElementById('detail-title').innerText = item.title;

    // Description
    const descEl = document.getElementById('detail-desc');
    if (descEl) descEl.innerText = item.description || '';

    // No EXIF for illustrations usually, but we could add if needed
    const specsEq = document.getElementById('specs-equipment');
    const specsTech = document.getElementById('specs-technical');
    if (specsEq) specsEq.innerHTML = '';
    if (specsTech) specsTech.innerHTML = '';

    updateDetailFavBtn();
}

function closeDetail() {
    if (detailScreen) {
        detailScreen.classList.remove('active');
        setTimeout(() => {
            if (mainHeader) mainHeader.style.display = '';
        }, 100);
        setTimeout(() => {
            detailScreen.classList.add('hidden');
        }, 300);
    }
}

function navigatePhoto(dir) {
    if (!currentProject || !currentProject.images) return;
    const images = currentProject.images;
    if (images.length === 0) return;

    const currIdx = images.findIndex(i => i.id === activePhotoId);
    let newIdx = currIdx + dir;
    if (newIdx < 0) newIdx = images.length - 1;
    if (newIdx >= images.length) newIdx = 0;

    activePhotoId = images[newIdx].id;

    const wrapper = document.querySelector('.detail-image-wrapper');
    wrapper.style.opacity = 0;
    setTimeout(() => {
        currentScale = 1;
        pannedX = 0;
        pannedY = 0;
        if (zoomSlider) zoomSlider.value = 1;
        updateTransform();

        updateDetailContent(images[newIdx]);
        wrapper.style.opacity = 1;
    }, 200);
}


/* -- Zoom Logic -- */
function setupZoomPan() {
    if (!zoomSlider || !zoomTarget) return;

    zoomSlider.addEventListener('input', (e) => {
        currentScale = parseFloat(e.target.value);
        updateTransform();
    });

    const zoomIn = document.getElementById('zoom-in-btn');
    const zoomOut = document.getElementById('zoom-out-btn');

    if (zoomIn) zoomIn.addEventListener('click', () => {
        let val = parseFloat(zoomSlider.value) + 0.5;
        if (val > 4) val = 4;
        zoomSlider.value = val;
        currentScale = val;
        updateTransform();
    });

    if (zoomOut) zoomOut.addEventListener('click', () => {
        let val = parseFloat(zoomSlider.value) - 0.5;
        if (val < 1) val = 1;
        zoomSlider.value = val;
        currentScale = val;
        updateTransform();
    });

    // Panning
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const onStart = (e) => {
        if (currentScale <= 1) return;
        isDragging = true;
        startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
        zoomTarget.style.cursor = "grabbing";
    };

    const onEnd = () => {
        isDragging = false;
        zoomTarget.style.cursor = currentScale > 1 ? "grab" : "default";
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        const y = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;

        const deltaX = x - startX;
        const deltaY = y - startY;

        pannedX += deltaX / currentScale;
        pannedY += deltaY / currentScale;

        startX = x;
        startY = y;

        updateTransform();
    };

    zoomTarget.addEventListener('mousedown', onStart);
    zoomTarget.addEventListener('touchstart', onStart, { passive: false });

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
}

function updateTransform() {
    if (currentScale == 1) {
        pannedX = 0;
        pannedY = 0;
        if (zoomTarget) zoomTarget.style.cursor = "default";
    } else {
        if (zoomTarget) zoomTarget.style.cursor = "grab";
    }

    if (zoomTarget) {
        zoomTarget.style.transform = `scale(${currentScale}) translate(${pannedX}px, ${pannedY}px)`;
    }
}


/* -- Grid / Gallery Logic -- */

function getColumnCount(container, minWidth = 280) {
    const gap = parseFloat(getComputedStyle(container).gap) || 15;
    const width = container.clientWidth;
    const cols = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
    return Math.min(2, cols);
}

function relayoutGrid(container) {
    if (!container) return;
    const cols = getColumnCount(container, 280);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    // Basic auto-flow grid
    const gap = parseFloat(getComputedStyle(container).gap) || 15;
    const totalGap = (cols - 1) * gap;
    const colWidth = (container.clientWidth - totalGap) / cols;
    const rowHeight = colWidth / 1.5;
    container.style.gridAutoRows = `${rowHeight}px`;

    const colHeights = new Array(cols).fill(0);
    container.querySelectorAll('.gallery-item').forEach(item => {
        const img = item.querySelector('img');
        if (!img) return;

        let span = 1;
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio < 0.8) span = 2; // Portrait span

        let shortCol = 0;
        for (let i = 1; i < colHeights.length; i++) {
            if (colHeights[i] < colHeights[shortCol]) shortCol = i;
        }

        item.style.gridColumnStart = String(shortCol + 1);
        item.style.gridRowEnd = `span ${span}`;

        colHeights[shortCol] += span;
    });
}


function loadImagesFromData(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Force loader show
    document.getElementById('loader')?.classList.add('visible');

    let loadedCount = 0;

    // Clear container logic if we want to overwrite
    container.innerHTML = '';

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.dataset.id = item.id;
        itemDiv.style.position = 'relative';

        const thumb = document.createElement('img');
        thumb.src = item.imageUrl;
        thumb.alt = item.title;
        thumb.style.cursor = 'pointer';
        thumb.addEventListener('click', () => openDetail(item.id));

        thumb.onload = () => {
            loadedCount++;
            if (loadedCount === items.length) {
                document.getElementById('loader')?.classList.remove('visible');
                relayoutGrid(container);
            }
        };
        thumb.onerror = () => {
            loadedCount++;
            if (loadedCount === items.length) {
                document.getElementById('loader')?.classList.remove('visible');
                relayoutGrid(container);
            }
        };

        const favBtn = document.createElement('button');
        favBtn.className = 'grid-fav-btn';
        favBtn.dataset.id = item.id;
        if (favoriteIds.includes(item.id)) favBtn.classList.add('active');
        favBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favBtn.title = "Zu Favoriten hinzufügen";
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
        });

        itemDiv.appendChild(thumb);
        itemDiv.appendChild(favBtn);
        container.appendChild(itemDiv);
    });

    // Backup safe relayout after slight delay
    setTimeout(() => relayoutGrid(container), 200);
}


/* -- Floating Preview Logic -- */
// (Simplified from fotografie.js, keeps same function names to interface with HTML calls)
function toggleFloatingPreview() {
    const panels = document.getElementById('floating-preview-panel');
    const btn = document.getElementById('floating-review-btn');
    if (!panels) return;

    if (panels.classList.contains('hidden')) {
        renderFloatingPreview();
        panels.classList.remove('hidden');
        if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Schliessen';
    } else {
        panels.classList.add('hidden');
        if (btn) btn.innerHTML = '<i class="fas fa-list-check"></i> Prüfen';
    }
}

function renderFloatingPreview() {
    const panels = document.getElementById('floating-preview-panel');
    if (!panels) return;
    panels.innerHTML = '';

    if (favoriteIds.length === 0) {
        panels.classList.add('hidden');
        return;
    }

    const container = document.createElement('div');
    container.className = 'preview-list';

    favoriteIds.forEach(id => {
        let data = findImageById(id);
        let url = data ? data.imageUrl : null;

        if (url) {
            const item = document.createElement('div');
            item.className = 'preview-item';

            const img = document.createElement('img');
            img.src = url;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                toggleFavorite(id);
            };

            item.appendChild(img);
            item.appendChild(removeBtn);
            container.appendChild(item);
        }
    });

    panels.appendChild(container);
}

function downloadFavoritesZip() {
    if (favoriteIds.length === 0) {
        showToast("Keine Bilder ausgewählt!");
        return;
    }

    showToast("Download wird vorbereitet (ZIP)...");

    const zip = new JSZip();
    const folder = zip.folder("medien-vom-noe-favoriten");

    let processedCount = 0;
    favoriteIds.forEach(id => {
        let data = findImageById(id);
        if (!data) {
            processedCount++;
            return;
        }

        fetch(data.imageUrl)
            .then(r => r.blob())
            .then(blob => {
                const filename = data.imageUrl.split('/').pop();
                folder.file(filename, blob);
                processedCount++;
                checkDone();
            })
            .catch(e => {
                console.error(e);
                processedCount++;
                checkDone();
            });
    });

    function checkDone() {
        if (processedCount === favoriteIds.length) {
            zip.generateAsync({ type: "blob" })
                .then(function (content) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = "medien-vom-noe_auswahl.zip";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast("Download gestartet!");
                });
        }
    }
}
