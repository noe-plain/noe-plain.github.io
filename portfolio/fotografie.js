(function () {
    const pageNav = document.getElementById("page-nav");
    const rightBtn = document.getElementById("page-nav-scroll-btn");
    const leftBtn = document.getElementById("page-nav-left-gradient");

    if (!pageNav || !rightBtn || !leftBtn) return;

    function checkScroll() {
        const rect = pageNav.getBoundingClientRect();
        rightBtn.style.top = (rect.top + rect.height / 2 - rightBtn.offsetHeight / 2) + "px";
        rightBtn.style.left = (rect.right - rightBtn.offsetWidth) + "px";
        leftBtn.style.top = (rect.top + rect.height / 2 - leftBtn.offsetHeight / 2) + "px";
        leftBtn.style.left = rect.left + "px";

        // Match height to nav
        rightBtn.style.height = Math.max(40, rect.height) + "px";
        leftBtn.style.height = Math.max(40, rect.height) + "px";

        const maxScrollLeft = pageNav.scrollWidth - pageNav.clientWidth;

        if (maxScrollLeft > 5 && pageNav.scrollLeft < maxScrollLeft - 5) {
            rightBtn.classList.remove("hidden");
        } else {
            rightBtn.classList.add("hidden");
        }

        if (pageNav.scrollLeft > 5) {
            leftBtn.classList.remove("hidden");
        } else {
            leftBtn.classList.add("hidden");
        }
    }

    function scrollNav(amount) {
        pageNav.scrollBy({
            left: amount,
            behavior: 'smooth'
        });
        setTimeout(checkScroll, 420);
    }

    rightBtn.addEventListener("click", () => scrollNav(Math.max(200, pageNav.clientWidth * 0.6)));
    leftBtn.addEventListener("click", () => scrollNav(-Math.max(200, pageNav.clientWidth * 0.6)));

    pageNav.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("orientationchange", checkScroll);

    if (window.ResizeObserver) {
        new ResizeObserver(checkScroll).observe(pageNav);
    }

    window.requestAnimationFrame(checkScroll);
    window.addEventListener("load", checkScroll);
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


// Global Data
let galleryData = [];
let activePhotoId = null;
let favoriteIds = [];
let albums = []; // Mock for now
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

    const urlParams = new URLSearchParams(window.location.search);
    setupPageNav();
    setupZoomPan();
    updateFloatingDownloadBar();

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
        const item = galleryData.find(p => p.id === activePhotoId);
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
        updateAllFavButtons(); // Updates all grid buttons
        updateFloatingDownloadBar();
        showToast("Auswahl aufgehoben");

        // If we are on favorites tab, reload it
        if (new URLSearchParams(window.location.search).has('favorite')) {
            loadFavorites();
        }
    });
});


function updateFavBadge() {
    // legacy or could update a header badge if needed
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
        // showToast("Aus Favoriten entfernt");
    } else {
        favoriteIds.push(id);
        // showToast("Zu Favoriten hinzugefügt");
    }
    CookieManager.set('noe_favs', favoriteIds);

    updateDetailFavBtn();
    updateGridFavBtn(id); // Update specific grid button
    updateFloatingDownloadBar();

    if (new URLSearchParams(window.location.search).has('favorite')) {
        loadFavorites(); // Reload fav list if active
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
    // Find all buttons for this ID (could be multiple if same image in multiple places?? unlikely but safe)
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
    const item = galleryData.find(i => i.id === id);
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

    const specsEq = document.getElementById('specs-equipment');
    const specsTech = document.getElementById('specs-technical');

    if (specsEq) specsEq.innerHTML = '';
    if (specsTech) specsTech.innerHTML = '';

    // EXIFR
    if (window.exifr && specsEq && specsTech) {
        const loadingBadge = document.createElement('span');
        loadingBadge.className = "spec-badge loading-badge";
        loadingBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade...';
        specsEq.appendChild(loadingBadge);

        exifr.parse(item.imageUrl).then(exif => {
            if (specsEq.contains(loadingBadge)) specsEq.removeChild(loadingBadge);

            function addBadge(container, icon, text) {
                const s = document.createElement('span');
                s.className = "spec-badge";
                s.innerHTML = `<i class="${icon}"></i> ${text}`;
                container.appendChild(s);
            }

            if (exif) {
                if (exif.Model) addBadge(specsEq, "fas fa-camera", exif.Model);
                if (exif.LensModel) addBadge(specsEq, "fas fa-circle-notch", exif.LensModel);

                if (exif.FNumber) addBadge(specsTech, "fas fa-bullseye", `f/${exif.FNumber}`);
                if (exif.ExposureTime) {
                    const t = exif.ExposureTime;
                    let val = t;
                    if (t < 1) {
                        val = `1/${Math.round(1 / t)}`;
                    } else {
                        val = `${t}s`;
                    }
                    addBadge(specsTech, "fas fa-stopwatch", val);
                }
                if (exif.ISO) addBadge(specsTech, "fas fa-lightbulb", `ISO ${exif.ISO}`);
            } else {
                addBadge(specsEq, "fas fa-camera", "Unbekannte Kamera");
            }
        }).catch(err => {
            if (specsEq.contains(loadingBadge)) specsEq.removeChild(loadingBadge);
            const errBadge = document.createElement('span');
            errBadge.className = "spec-badge";
            errBadge.innerHTML = '<i class="fas fa-info-circle"></i> Keine Metadaten';
            specsEq.appendChild(errBadge);
        });
    }

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
    // Find context
    const urlParams = new URLSearchParams(window.location.search);
    let currentCategory = 'street'; // default

    if (urlParams.has('tab')) {
        currentCategory = urlParams.get('tab');
    } else {
        const keys = Object.keys(categories);
        for (let k of keys) {
            if (urlParams.has(k)) {
                currentCategory = k;
                break;
            }
        }
    }

    // Filter data by category logic
    // NOTE: This assumes we only want to navigate within the VALID loaded category items
    const contextItems = galleryData.filter(i => i.category === currentCategory);

    if (contextItems.length === 0) return;

    const currIdx = contextItems.findIndex(i => i.id === activePhotoId);
    if (currIdx === -1) return;

    let newIdx = currIdx + dir;
    if (newIdx < 0) newIdx = contextItems.length - 1;
    if (newIdx >= contextItems.length) newIdx = 0;

    activePhotoId = contextItems[newIdx].id;

    // Animate transition (simple fade opt)
    const wrapper = document.querySelector('.detail-image-wrapper');
    wrapper.style.opacity = 0;
    setTimeout(() => {
        // Reset Zoom
        currentScale = 1;
        pannedX = 0;
        pannedY = 0;
        if (zoomSlider) zoomSlider.value = 1;
        updateTransform();

        updateDetailContent(contextItems[newIdx]);
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

const categories = {
    street: { prefix: 'street-', container: 'lightgallery-street', path: '../images/portfolio/photography/' },
    aviation: { prefix: 'aviation-', container: 'lightgallery-aviation', path: '../images/portfolio/photography/' },
    portraet: { prefix: 'portraet-', container: 'lightgallery-portraet', path: '../images/portfolio/photography/' },
    bts: { prefix: 'bts-', container: 'lightgallery-bts', path: '../images/portfolio/photography/' },
    event: { prefix: 'event-', container: 'lightgallery-event', path: '../images/portfolio/photography/' },
};


function getColumnCount(container, minWidth = 280) {
    const gap = parseFloat(getComputedStyle(container).gap) || 15;
    const width = container.clientWidth;
    const cols = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
    return Math.min(3, cols);
}

function computeSpan(img, colWidth, rowHeight, gap) {
    // If portrait, maybe span 2 rows?
    const ratio = img.naturalWidth / img.naturalHeight;
    // Simple logic: if very tall, span 2. if normal, span 1.
    // Actually, Masonry logic usually just packs them. 
    // Here we duplicate the logic seen in original file:
    if (ratio < 1) { // Tall
        // Calculate strictly
        // For now, let's stick to the original "row span" logic based onaspect
        return 1; // Default to 1 to match CSS grid flow unless we do complex masonry
    }
    const height = colWidth * 1.5; // assumes default aspect?
    // In original code:
    const span = Math.round((height + gap) / (rowHeight + gap));
    // This part is fuzzy without exact context of original Masonry implementation, 
    // but we can trust relayoutGrid below which seems robust enough.
    return Math.max(1, span);
}

function relayoutGrid(container) {
    if (!container) return;

    const cols = getColumnCount(container, 280);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Masonry logic is simplified here: we just use standard grid with auto-flow usually,
    // unless we use the column-count CSS property.
    // The original file used a custom JS layout. Let's keep it simple:
    // Just CSS Grid is usually enough if images are object-fit. 
    // BUT if we want true masonry, we need JS.

    // Original JS had logic to set grid-row-end: span X.
    // I will preserve the original `relayoutGrid` implementation structure roughly.
    const gap = parseFloat(getComputedStyle(container).gap) || 15;
    const totalGap = (cols - 1) * gap;
    const colWidth = (container.clientWidth - totalGap) / cols;
    const rowHeight = colWidth / 1.5; // Base row height?

    container.style.gridAutoRows = `${rowHeight}px`;

    // Reset spans
    /*
    const colHeights = new Array(cols).fill(0);
    container.querySelectorAll('.gallery-item').forEach(item => {
        // ... Logic to place item in shortest column ...
        // The original code used grid-column-start to force placement.
    });
    */

    // Just run the Loop from original:
    const colHeights = new Array(cols).fill(0);
    container.querySelectorAll('.gallery-item').forEach(item => {
        const img = item.querySelector('img');
        if (!img) return;

        // Calculate needed span
        // We need natural aspect ratio.
        // If image not loaded, this fails.
        // We assume loaded.

        let span = 1;
        const ratio = img.naturalWidth / img.naturalHeight;

        // If tall (portrait), span 2 rows
        // If very wide, maybe span 2 cols? (Logic was simple before)

        if (ratio < 0.8) span = 2; // Arbitrary simple masonry rule

        // Find shortest column
        let shortCol = 0;
        for (let i = 1; i < colHeights.length; i++) {
            if (colHeights[i] < colHeights[shortCol]) shortCol = i;
        }

        item.style.gridColumnStart = String(shortCol + 1);
        item.style.gridRowEnd = `span ${span}`;

        colHeights[shortCol] += span;
    });
}


function showLoader(id) {
    if (!window.__activeGalleryLoads) window.__activeGalleryLoads = new Set();
    window.__activeGalleryLoads.add(id || '__global');
    document.getElementById('loader')?.classList.add('visible');
}
function hideLoader(id) {
    if (!window.__activeGalleryLoads) window.__activeGalleryLoads = new Set();
    window.__activeGalleryLoads.delete(id || '__global');
    if (window.__activeGalleryLoads.size === 0) {
        document.getElementById('loader')?.classList.remove('visible');
    }
}

function loadImages(category) {
    const catConfig = categories[category];
    const container = document.getElementById(catConfig.container);
    if (!container || container.dataset.loaded === 'true' || container.dataset.loading === 'true') return;

    container.dataset.loading = 'true';
    showLoader(catConfig.container);

    let index = 1;

    function loadNext() {
        // Try up to 999 images or until 404
        const numStr = index < 10 ? `0${index}` : index;
        const filename = `${catConfig.prefix}${numStr}.jpeg`;
        const url = catConfig.path + filename;
        const id = `${catConfig.prefix}${index}`;

        // Check if exists in DOM (shouldn't if check above passed, but safety)
        if (container.querySelector(`div.gallery-item[data-id="${id}"]`)) {
            index++;
            if (index > 999) finish(); else loadNext();
            return;
        }

        const img = new Image();
        img.onload = function () {
            // Success
            const itemDiv = document.createElement('div');
            itemDiv.className = 'gallery-item';
            itemDiv.dataset.id = id;
            itemDiv.style.position = 'relative'; // Ensure relative

            const dataObj = {
                id: id,
                imageUrl: url,
                title: `${category.charAt(0).toUpperCase() + category.slice(1)} #${index}`,
                category: category,
                photographer: 'Noé Plain'
            };

            if (!galleryData.find(p => p.id === id)) galleryData.push(dataObj);

            // Thumbnail
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.alt = `${category} photography ${index}`;
            // Open click
            thumb.addEventListener('click', () => openDetail(id));
            thumb.style.cursor = 'pointer';

            // Fav Button
            const favBtn = document.createElement('button');
            favBtn.className = 'grid-fav-btn';
            favBtn.dataset.id = id;
            if (favoriteIds.includes(id)) favBtn.classList.add('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i>';
            favBtn.title = "Zu Favoriten hinzufügen";
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(id);
            });

            itemDiv.appendChild(thumb);
            itemDiv.appendChild(favBtn);
            container.appendChild(itemDiv);

            requestAnimationFrame(() => relayoutGrid(container));

            index++;
            loadNext();
        };
        img.onerror = function () {
            // Stop loading on first error (assuming change in sequence means end)
            finish();
        };
        img.src = url;
    }

    function finish() {
        container.dataset.loaded = 'true';
        container.dataset.loading = 'false';
        hideLoader(catConfig.container);
        relayoutGrid(container);
    }

    loadNext();
}


function showGallery(category, tabElement = null, pushState = true) {
    // Hide all headers/sections
    document.querySelectorAll('.gallery-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const section = document.getElementById('section-' + category);
    if (section) section.classList.add('active');

    if (tabElement) tabElement.classList.add('active');
    else {
        // try to find tab btn
        const btn = document.querySelector(`a.tab-btn[href="?${category}"]`);
        if (btn) btn.classList.add('active');
    }

    if (pushState) {
        history.replaceState({}, "", "?" + category);
    }

    // Load content
    if (category === 'favorite') {
        loadFavorites();
    } else {
        loadImages(category);
    }

    // Relayout
    const catConfig = categories[category];
    const containerId = catConfig ? catConfig.container : (category === 'favorite' ? 'lightgallery-favorite' : null);
    if (!containerId) return;

    const container = document.getElementById(containerId);
    if (container) {
        [50, 200, 500].forEach(t => setTimeout(() => relayoutGrid(container), t));
    }
}


function loadFavorites() {
    const container = document.getElementById('lightgallery-favorite');
    const dlAllBtn = document.getElementById('download-all-favs'); // Legacy btn (optional to keep or hide)

    if (!container) return;
    container.innerHTML = '';

    if (favoriteIds.length === 0) {
        const msg = document.createElement('p');
        msg.innerText = "Noch keine Favoriten markiert.";
        msg.style.color = "#666";
        msg.style.padding = "20px";
        container.appendChild(msg);
        if (dlAllBtn) dlAllBtn.style.display = 'none';
        return;
    }

    if (dlAllBtn) dlAllBtn.style.display = 'flex';

    favoriteIds.forEach(id => {
        // Recover Data
        // Try to find in galleryData first, or reconstruct
        let data = galleryData.find(g => g.id === id);

        let url = data ? data.imageUrl : null;
        let cat = data ? data.category : null;
        let idx = null;

        if (!url) {
            // Reconstruct from ID
            // id = category-index e.g. street-01
            // Find category prefix match
            const catKey = Object.keys(categories).find(k => id.startsWith(categories[k].prefix));
            if (catKey) {
                const conf = categories[catKey];
                const parts = id.replace(conf.prefix, ''); // "01"
                url = conf.path + conf.prefix + parts + ".jpeg";
                cat = catKey;
                idx = parts;
            }
        }

        if (!url) return; // Skip invalid

        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.dataset.id = id;
        itemDiv.style.position = 'relative';

        const thumb = document.createElement('img');
        thumb.src = url;
        thumb.alt = `Favorite ${id}`;
        thumb.addEventListener('click', () => openDetail(id));
        thumb.style.cursor = 'pointer';

        const favBtn = document.createElement('button');
        favBtn.className = 'grid-fav-btn active'; // Always active in fav view
        favBtn.dataset.id = id;
        favBtn.innerHTML = '<i class="fas fa-heart"></i>'; // Solid heart
        favBtn.title = "Aus Favoriten entfernen";
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(id);
        });

        itemDiv.appendChild(thumb);
        itemDiv.appendChild(favBtn);
        container.appendChild(itemDiv);

        // Ensure data exists for detail view
        const dataObj = {
            id: id,
            imageUrl: url,
            title: `${cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Foto'} #${idx || ''}`,
            category: cat || 'favorite',
            photographer: 'Noé Plain'
        };
        if (!galleryData.find(p => p.id === id)) galleryData.push(dataObj);
    });

    relayoutGrid(container);
}


function downloadFavoritesZip() {
    if (favoriteIds.length === 0) {
        showToast("Keine Favoriten zum Downloaden");
        return;
    }

    showToast("ZIP wird erstellt (kann einen Moment dauern)...");

    const zip = new JSZip();
    const folder = zip.folder("NoeMedia_Favorites");
    const promises = [];

    favoriteIds.forEach(id => {
        let url = null;
        const item = galleryData.find(l => l.id === id);
        if (item) {
            url = item.imageUrl;
        } else {
            // reconstruct
            const catKey = Object.keys(categories).find(k => id.startsWith(categories[k].prefix));
            if (catKey) {
                const conf = categories[catKey];
                const parts = id.replace(conf.prefix, '');
                url = conf.path + conf.prefix + parts + ".jpeg";
            }
        }

        if (url) {
            const filename = id + ".jpg"; // Normalized name
            // Fetch blob
            const p = fetch(url)
                .then(r => {
                    if (!r.ok) throw new Error("Fetch fail " + url);
                    return r.blob();
                })
                .then(blob => {
                    folder.file(filename, blob);
                })
                .catch(err => {
                    console.warn("Failed to load for zip:", url);
                });
            promises.push(p);
        }
    });

    Promise.all(promises).then(() => {
        zip.generateAsync({ type: "blob" }).then(function (content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "NoePlain_Favorites.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Download gestartet!");
        });
    });
}


function setupPageNav() {
    // Show favorite tab if we have favs (initially)
    // Actually, user wants to see it always? No, hidden if empty maybe.
    // Logic existing:
    const favTab = document.querySelector('a.tab-btn[href="?favorite"]');
    if (favTab) {
        // favTab.style.display = favoriteIds.length > 0 ? 'inline-block' : 'none';
        // Let's keep it visible if user used it, or maybe just always visible?
        // Original logic hid it. Let's keep it visible so they can review easily?
        // Actually, if they clear selection, it might hide?
        // Let's force it visible for now if selection > 0
        if (favoriteIds.length > 0) favTab.style.display = 'inline-block';
        else favTab.style.display = 'none'; // Only show if items exist
    }

    const urlParams = new URLSearchParams(window.location.search);
    let activeTab = '';

    if (urlParams.has('tab')) activeTab = urlParams.get('tab') || '';
    else {
        // e.g. ?street
        activeTab = Array.from(urlParams.keys())[0] || (window.location.hash || '').replace('#', '');
    }

    activeTab = (activeTab || '').trim().toLowerCase();

    // Validate
    const allKeys = [...Object.keys(categories), 'favorite'];
    if (!allKeys.includes(activeTab)) activeTab = 'street';

    if (activeTab === 'favorite' && favoriteIds.length === 0) {
        activeTab = 'street'; // Fallback if trying to access empty favs
    }

    // Bind checks
    document.querySelectorAll('#page-nav a.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const href = btn.getAttribute('href') || '';
            const target = href.replace(/^\?/, '').toLowerCase() || activeTab;
            if (activeTab === 'favorite' && favoriteIds.length === 0 && target === 'favorite') return;
            showGallery(target, btn, true);
        });
    });

    showGallery(activeTab, null, false);
}


// Expose for HTML inline calls
window.downloadFavoritesZip = downloadFavoritesZip;
window.showGallery = showGallery;
