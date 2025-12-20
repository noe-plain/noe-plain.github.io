// --- STATE MANAGEMENT ---
let photosData = [];
let currentView = 'all';
let currentAlbumId = null;
let activePhotoId = null;
let favoriteIds = [];
let albums = [];

// Zoom Variables
let currentScale = 1;
let pannedX = 0;
let pannedY = 0;

// --- COOKIE HELPER ---
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
                try { return JSON.parse(c.substring(nameEQ.length, c.length)); } catch (e) { return null; }
            }
        }
        return null;
    }
};

// --- DOM ELEMENTE ---
const gridContainer = document.getElementById('photo-list');
const albumContainer = document.getElementById('album-list');
const emptyState = document.getElementById('empty-state');
const detailScreen = document.getElementById('detail-screen');
const statusText = document.getElementById('status-text');
const detailContent = document.getElementById('detail-content-sheet');
const sheetToggleBtn = document.getElementById('sheet-toggle-btn');
const mainHeader = document.getElementById('main-header');
const albumBackBtn = document.getElementById('album-back-btn');
const downloadCollectionBtn = document.getElementById('download-collection-btn');
const albumTabsContainer = document.getElementById('album-tabs');
const zoomTarget = document.getElementById('zoom-target');
const zoomSlider = document.getElementById('zoom-slider');

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    setupDetailInteractions();
    setupZoomPan();

    let user = CookieManager.get('pl_user');
    if (!user) {
        try {
            const name = window.prompt("Wie heißt du?") || "";
            const clean = name.trim();
            if (clean) {
                CookieManager.set('pl_user', clean);
                user = clean;
            }
        } catch (e) { /* no-op */ }
    }
    const welcomeEl = document.getElementById('welcome-text');
    if (welcomeEl && user) welcomeEl.innerText = user;

    const savedFavs = CookieManager.get('pl_favs');
    if (savedFavs) favoriteIds = savedFavs;

    const savedAlbums = CookieManager.get('pl_albums');
    if (savedAlbums) albums = savedAlbums;

    try {
        const response = await fetch('./photos.json');
        if (!response.ok) throw new Error("HTTP Fehler " + response.status);
        photosData = await response.json();

        // Initial Routing basierend auf URL
        handleUrlParams();
        
        // Bilder vorladen
        preloadImages(photosData);

    } catch (error) {
        console.error("Fehler:", error);
        setTimeout(() => {
            const loader = document.getElementById('loader-overlay');
            if (loader) loader.classList.add('hidden');
            const home = document.getElementById('home-screen');
            if (home) { home.classList.remove('hidden'); home.classList.add('active'); }
        }, 1500);
    }
});

// --- URL ROUTING (NEU) ---
function handleUrlParams() {
    // Liest alles nach dem '?' und dekodiert es (z.B. "Mein%20Album" -> "Mein Album")
    const query = decodeURIComponent(window.location.search.substring(1));

    if (!query || query === 'alle') {
        switchView('all');
    } else if (query === 'favoriten') {
        switchView('favorites');
    } else {
        // Suche Album nach Namen (da URL jetzt den Namen enthält)
        const album = albums.find(a => a.name === query);
        if (album) {
            openAlbumView(album.id);
        } else {
            // Fallback, wenn Album nicht gefunden (z.B. gelöscht oder Tippfehler in URL)
            switchView('all');
        }
    }
}

function updateURL(view, albumName = null) {
    let newSearch = "";
    
    if (view === 'all') {
        newSearch = "?alle";
    } else if (view === 'favorites') {
        newSearch = "?favoriten";
    } else if (view === 'specific-album' && albumName) {
        // Encodiert den Namen für die URL (Leerzeichen -> %20 etc.)
        newSearch = "?" + encodeURIComponent(albumName);
    }
    
    // Setzt die neue URL ohne Seite neu zu laden
    const newUrl = window.location.pathname + newSearch;
    window.history.pushState({}, '', newUrl);
}

// Browser Back Button Support
window.addEventListener('popstate', () => {
    if(detailScreen.classList.contains('active')) {
        closeDetail();
    } else {
        handleUrlParams();
    }
});


// --- BILDER PRELOADER ---
function preloadImages(data) {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.remove('hidden');

    let loadedCount = 0;
    const total = data.length;

    if (total === 0) {
        if (loader) loader.classList.add('hidden');
        return finishLoading();
    }
    const fallbackTimeout = setTimeout(() => { clearTimeout(fallbackTimeout); finishLoading(); }, 5000);

    data.forEach(photo => {
        const img = new Image();
        img.src = photo.imageUrl;
        img.onload = () => { loadedCount++; if (loadedCount === total) { clearTimeout(fallbackTimeout); finishLoading(); }};
        img.onerror = () => { loadedCount++; if (loadedCount === total) { clearTimeout(fallbackTimeout); finishLoading(); }};
    });
}

function finishLoading() {
    const loader = document.getElementById('loader-overlay');
    const home = document.getElementById('home-screen');
    if (loader) loader.classList.add('hidden');
    if (home) {
        setTimeout(() => {
            home.classList.remove('hidden');
            home.classList.add('active');
        }, 200);
    }
}

// --- CORE RENDERING ---
function renderGrid(data) {
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    if (!data || data.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        data.forEach((photo) => {
            const isFav = favoriteIds.includes(photo.id);
            const card = document.createElement('div');
            card.className = `photo-card ${isFav ? 'is-favorite' : ''}`;
            card.innerHTML = `
                <img src="${photo.imageUrl}" alt="${photo.title}" loading="lazy">
                <i class="fas fa-heart card-fav-icon"></i>
                <div class="card-overlay">
                    <h3>${photo.title}</h3>
                    <p>${photo.photographer}</p>
                </div>
            `;
            
            const favIcon = card.querySelector('.card-fav-icon');
            favIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(photo.id);
                if (favoriteIds.includes(photo.id)) {
                    card.classList.add('is-favorite');
                } else {
                    card.classList.remove('is-favorite');
                }
                if (currentView === 'favorites' && !favoriteIds.includes(photo.id)) {
                   renderGrid(photosData.filter(p => favoriteIds.includes(p.id)));
                }
            });

            card.addEventListener('click', () => openDetail(photo.id));
            gridContainer.appendChild(card);
        });
    }
}

function renderAlbumTabs() {
    if (!albumTabsContainer) return;
    albumTabsContainer.innerHTML = "";

    const allTab = document.createElement('button');
    allTab.className = `chip ${currentView === 'all' ? 'active' : ''}`;
    allTab.innerText = "Alle Fotos";
    allTab.onclick = () => switchView('all');
    albumTabsContainer.appendChild(allTab);

    const favTab = document.createElement('button');
    favTab.className = `chip ${currentView === 'favorites' ? 'active' : ''}`;
    favTab.innerText = "Favoriten";
    favTab.onclick = () => switchView('favorites');
    albumTabsContainer.appendChild(favTab);

    albums.forEach(album => {
        const aTab = document.createElement('button');
        aTab.className = `chip ${currentView === 'specific-album' && currentAlbumId === album.id ? 'active' : ''}`;
        aTab.innerText = album.name;
        aTab.onclick = () => openAlbumView(album.id);
        albumTabsContainer.appendChild(aTab);
    });
}

// --- NAVIGATION & INTERACTION ---
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = photosData.filter(p => {
                return p.title.toLowerCase().includes(term) ||
                    p.photographer.toLowerCase().includes(term) ||
                    (p.specs && p.specs.camera.toLowerCase().includes(term));
            });
            renderGrid(filtered);
        });
    }

    safeAddClick('confirm-create-album', createNewAlbum);
    safeAddClick('add-to-album-btn', showAddToAlbumModal);
    safeAddClick('back-btn', closeDetail);
    safeAddClick('detail-fav-btn', () => toggleFavorite(activePhotoId));
    safeAddClick('detail-prev-btn', () => navigatePhoto(-1));
    safeAddClick('detail-next-btn', () => navigatePhoto(1));

    safeAddClick('download-collection-btn', downloadCurrentCollectionAsZip);

    safeAddClick('download-btn', () => {
        const photo = photosData.find(p => p.id === activePhotoId);
        if(photo) {
            const link = document.createElement('a');
            link.href = photo.imageUrl;
            link.download = `PhotoLens_${photo.title}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Download gestartet");
        }
    });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) modal.classList.add('hidden');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (!detailScreen.classList.contains('active')) return;
        if (e.key === 'ArrowRight') navigatePhoto(1);
        if (e.key === 'ArrowLeft') navigatePhoto(-1);
        if (e.key === 'Escape') closeDetail();
    });
}

function setupZoomPan() {
    if (!zoomSlider || !zoomTarget) return;

    zoomSlider.addEventListener('input', (e) => {
        currentScale = parseFloat(e.target.value);
        updateTransform();
    });

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const startDrag = (e) => {
        if (currentScale <= 1) return;
        isDragging = true;
        startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
        zoomTarget.style.cursor = 'grabbing';
    };

    const stopDrag = () => {
        isDragging = false;
        zoomTarget.style.cursor = currentScale > 1 ? 'grab' : 'default';
    };

    const moveDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        const currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;

        const diffX = currentX - startX;
        const diffY = currentY - startY;
        
        pannedX += diffX / currentScale; 
        pannedY += diffY / currentScale;

        startX = currentX;
        startY = currentY;

        updateTransform();
    };

    zoomTarget.addEventListener('mousedown', startDrag);
    zoomTarget.addEventListener('touchstart', startDrag, {passive: false});

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);

    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, {passive: false});
}

function updateTransform() {
    if (currentScale == 1) {
        pannedX = 0;
        pannedY = 0;
        if(zoomTarget) zoomTarget.style.cursor = 'default';
    } else {
        if(zoomTarget) zoomTarget.style.cursor = 'grab';
    }
    
    if (zoomTarget) {
        zoomTarget.style.transform = `scale(${currentScale}) translate(${pannedX}px, ${pannedY}px)`;
    }
}


function safeAddClick(id, func) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', func);
}

function switchView(view) {
    currentView = view;
    renderAlbumTabs();
    
    // NEU: URL Update (ohne Parameter Key)
    updateURL(view);

    if(downloadCollectionBtn) downloadCollectionBtn.classList.add('hidden');

    if (view === 'all') {
        if (statusText) statusText.innerText = "Alle Fotos";
        renderGrid(photosData);
    }
    else if (view === 'favorites') {
        if (statusText) statusText.innerText = "Deine Favoriten";
        const favPhotos = photosData.filter(p => favoriteIds.includes(p.id));
        renderGrid(favPhotos);
        if (downloadCollectionBtn && favPhotos.length > 0) {
            downloadCollectionBtn.classList.remove('hidden');
        }
    }
}

function openAlbumView(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) {
        switchView('all');
        return;
    }

    currentView = 'specific-album';
    currentAlbumId = albumId;
    renderAlbumTabs();
    
    // NEU: URL Update mit Albumnamen
    updateURL('specific-album', album.name);

    if (statusText) statusText.innerText = `Album: ${album.name}`;
    
    if(downloadCollectionBtn && album.photoIds.length > 0) {
        downloadCollectionBtn.classList.remove('hidden');
    }

    const albumPhotos = photosData.filter(p => album.photoIds.includes(p.id));
    renderGrid(albumPhotos);
}

function createNewAlbum() {
    const nameInput = document.getElementById('new-album-name');
    const name = nameInput.value.trim();
    if (name) {
        const newAlbum = { id: Date.now(), name: name, photoIds: [] };
        albums.push(newAlbum);
        CookieManager.set('pl_albums', albums);
        
        renderAlbumTabs();
        
        nameInput.value = "";
        document.getElementById('modal-create-album').classList.add('hidden');
        showToast(`Album "${name}" erstellt`);
        
        if (activePhotoId && !document.getElementById('modal-add-to-album').classList.contains('hidden')) {
             showAddToAlbumModal();
        } else if (activePhotoId) {
             showAddToAlbumModal();
        }
    }
}

function showAddToAlbumModal() {
    document.getElementById('modal-create-album').classList.add('hidden');
    const list = document.getElementById('album-selection-list');
    list.innerHTML = "";

    const createItem = document.createElement('div');
    createItem.className = 'album-select-item create-new';
    createItem.innerHTML = `<i class="fas fa-plus-circle"></i> Neues Album erstellen`;
    createItem.addEventListener('click', () => {
        document.getElementById('modal-add-to-album').classList.add('hidden');
        openModal('modal-create-album');
    });
    list.appendChild(createItem);

    if (albums.length === 0) { 
        const msg = document.createElement('p');
        msg.style.padding = "10px";
        msg.style.color = "#aaa";
        msg.innerText = "Noch keine Alben.";
        list.appendChild(msg);
    }
    else {
        albums.forEach(album => {
            const item = document.createElement('div');
            item.className = 'album-select-item';
            const alreadyIn = album.photoIds.includes(activePhotoId);
            item.innerHTML = `<b>${album.name}</b> ${alreadyIn ? '<i class="fas fa-check"></i>' : ''}`;
            if (!alreadyIn) {
                item.addEventListener('click', () => {
                    album.photoIds.push(activePhotoId);
                    CookieManager.set('pl_albums', albums);
                    document.getElementById('modal-add-to-album').classList.add('hidden');
                    showToast(`Hinzugefügt`);
                });
            } else { item.style.opacity = "0.5"; }
            list.appendChild(item);
        });
    }
    openModal('modal-add-to-album');
}


function toggleFavorite(id) {
    if (!id) return;
    if (favoriteIds.includes(id)) {
        favoriteIds = favoriteIds.filter(fid => fid !== id);
        showToast("Entfernt");
    } else {
        favoriteIds.push(id);
        showToast("Favorisiert");
    }
    CookieManager.set('pl_favs', favoriteIds);
    updateDetailFavBtn();
}

function updateDetailFavBtn() {
    const btn = document.getElementById('detail-fav-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (favoriteIds.includes(activePhotoId)) {
        btn.classList.add('active');
        icon.classList.replace('far', 'fas');
    } else {
        btn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    }
}

function openModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('hidden'); }
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.classList.add('hidden'), 300); }, 2000);
}

async function downloadCurrentCollectionAsZip() {
    let photosToZip = [];
    let zipName = "PhotoLens_Collection";

    if (currentView === 'favorites') {
        photosToZip = photosData.filter(p => favoriteIds.includes(p.id));
        zipName = "Meine_Favoriten";
    } else if (currentView === 'specific-album') {
        const album = albums.find(a => a.id === currentAlbumId);
        if (album) {
            photosToZip = photosData.filter(p => album.photoIds.includes(p.id));
            zipName = album.name.replace(/\s+/g, '_');
        }
    }

    if (photosToZip.length === 0) {
        showToast("Keine Fotos zum Downloaden");
        return;
    }

    showToast("Erstelle ZIP-Datei...");
    const zip = new JSZip();
    const folder = zip.folder(zipName);

    const promises = photosToZip.map(async (photo) => {
        try {
            const response = await fetch(photo.imageUrl);
            const blob = await response.blob();
            const filename = `${photo.title.replace(/\s+/g, '_')}.jpg`;
            folder.file(filename, blob);
        } catch (err) {
            console.error("Fehler beim Laden von", photo.imageUrl, err);
        }
    });

    await Promise.all(promises);

    zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${zipName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Download gestartet!");
    });
}

function openDetail(id) {
    activePhotoId = id;
    const photo = photosData.find(p => p.id === id);
    if (!photo) return;
    
    currentScale = 1;
    pannedX = 0; 
    pannedY = 0;
    if(zoomSlider) zoomSlider.value = 1;
    updateTransform();

    detailContent.classList.add('minimized');
    if (sheetToggleBtn) {
         sheetToggleBtn.querySelector('i').className = 'fas fa-plus';
    }

    updateDetailContent(photo);

    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');

    if (mainHeader) mainHeader.classList.add('hidden');

    if (detailScreen) {
        detailScreen.classList.remove('hidden');
        setTimeout(() => detailScreen.classList.add('active'), 10);
    }
}

function updateDetailContent(photo) {
    if (zoomTarget) {
        zoomTarget.style.backgroundImage = `url(${photo.imageUrl})`;
    }
    document.getElementById('detail-title').innerText = photo.title;
    document.getElementById('detail-photographer').innerText = photo.photographer;
    document.getElementById('detail-desc').innerText = photo.description;
    document.getElementById('detail-camera').innerText = photo.specs.camera;
    document.getElementById('detail-aperture').innerText = photo.specs.aperture;
    document.getElementById('detail-rating').innerText = photo.rating;
    document.getElementById('detail-price').innerText = photo.price;
    updateDetailFavBtn();
}

function closeDetail() {
    if (detailScreen) {
        detailScreen.classList.remove('active');
        setTimeout(() => {
             if (mainHeader) mainHeader.classList.remove('hidden');
        }, 100);
        setTimeout(() => {
            detailScreen.classList.add('hidden');
            const home = document.getElementById('home-screen');
            if (home) home.classList.remove('hidden');
        }, 300);
    }
}

function navigatePhoto(direction) {
    let currentList = [];
    if (currentView === 'all') currentList = photosData;
    else if (currentView === 'favorites') currentList = photosData.filter(p => favoriteIds.includes(p.id));
    else if (currentView === 'specific-album') {
        const album = albums.find(a => a.id === currentAlbumId);
        if (album) currentList = photosData.filter(p => album.photoIds.includes(p.id));
    }

    if (currentList.length === 0) return;
    const currentIndex = currentList.findIndex(p => p.id === activePhotoId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = currentList.length - 1;
    if (newIndex >= currentList.length) newIndex = 0;

    activePhotoId = currentList[newIndex].id;

    const wrapper = document.querySelector('.detail-image-wrapper');
    wrapper.style.opacity = 0;
    setTimeout(() => {
        currentScale = 1; 
        pannedX = 0; pannedY = 0;
        if(zoomSlider) zoomSlider.value = 1;
        updateTransform();

        updateDetailContent(currentList[newIndex]);
        wrapper.style.opacity = 1;
    }, 200);
}

function setupDetailInteractions() {
    if (sheetToggleBtn && detailContent) {
        sheetToggleBtn.addEventListener('click', () => {
            const isNowMinimized = detailContent.classList.toggle('minimized');
            const icon = sheetToggleBtn.querySelector('i');
            if (isNowMinimized) {
                 icon.className = 'fas fa-plus';
            } else {
                 icon.className = 'fas fa-minus';
            }
        });
    }
}