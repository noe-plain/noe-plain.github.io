// --- KONFIGURATION (Hier deine Ordner anpassen!) ---
// Ersetze dies mit deiner echten Ordnerstruktur
const photoConfig = [
    { name: 'Nature', folder: 'img/nature', count: 5, prefix: 'nat' },
    { name: 'Architecture', folder: 'img/arch', count: 5, prefix: 'arch' },
    { name: 'Portrait', folder: 'img/people', count: 5, prefix: 'ppl' }
];

// --- STATE MANAGEMENT ---
let photosData = []; // Wird generiert
let currentView = 'all';
let currentAlbumId = null;
let activePhotoId = null;
let favoriteIds = [];
let albums = [];

// Zoom vars
let currentScale = 1;
let pannedX = 0;
let pannedY = 0;

// Cookie Helper
const CookieManager = {
    set: (name, value, days = 365) => {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + "=" + JSON.stringify(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Strict";
    },
    get: (name) => {
        let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? JSON.parse(v[2]) : null;
    }
};

// DOM
const gridContainer = document.getElementById('photo-list');
const detailScreen = document.getElementById('detail-screen');
const detailContent = document.getElementById('detail-content-sheet');
const zoomTarget = document.getElementById('zoom-target');
const zoomSlider = document.getElementById('zoom-slider');
const sheetToggleBtn = document.getElementById('sheet-toggle-btn');
const albumTabsContainer = document.getElementById('album-tabs');
const statusText = document.getElementById('status-text');
const downloadCollectionBtn = document.getElementById('download-collection-btn');

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    setupDetailInteractions();
    setupZoomPan();

    // User & Cookies laden
    const savedFavs = CookieManager.get('pl_favs');
    if (savedFavs) favoriteIds = savedFavs;
    const savedAlbums = CookieManager.get('pl_albums');
    if (savedAlbums) albums = savedAlbums;

    let user = CookieManager.get('pl_user');
    if(user) document.getElementById('welcome-text').innerText = user;

    // 1. Bilder generieren
    await generatePhotosData();

    // 2. Initial Routing
    handleUrlParams();

    // 3. Loader ausblenden
    document.getElementById('loader-overlay').classList.add('hidden');
});

// --- GENERATOR LOGIK (Ersatz für photos.json) ---
async function generatePhotosData() {
    let idCounter = 1;
    let tempPhotos = [];

    // Wir erstellen erst alle Objekte
    for (const cat of photoConfig) {
        for (let i = 1; i <= cat.count; i++) {
            // Pfadlogik anpassen, falls deine Bilder anders heißen (z.B. 01.jpg)
            const src = `${cat.folder}/${i}.jpg`; 
            
            tempPhotos.push({
                id: idCounter++,
                imageUrl: src,
                title: `${cat.name} #${i}`,
                category: cat.name,
                orientation: 'square', // Default, wird gleich geprüft
                photographer: 'Noe Plain'
            });
        }
    }

    // Bild-Dimensionen prüfen für Masonry (Async)
    const promises = tempPhotos.map(photo => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = photo.imageUrl;
            img.onload = () => {
                const ratio = img.width / img.height;
                // Logik für Masonry Klassen
                if (ratio > 1.3) photo.orientation = 'wide';      // Querformat
                else if (ratio < 0.8) photo.orientation = 'tall'; // Hochformat
                else photo.orientation = 'square';
                resolve(photo);
            };
            img.onerror = () => {
                // Falls Bild nicht existiert, überspringen wir es oder lassen default
                resolve(photo);
            };
        });
    });

    photosData = await Promise.all(promises);
}

// --- ROUTING ---
function handleUrlParams() {
    const query = decodeURIComponent(window.location.search.substring(1));
    if (!query || query === 'alle') switchView('all');
    else if (query === 'favoriten') switchView('favorites');
    else {
        const album = albums.find(a => a.name === query);
        if (album) openAlbumView(album.id);
        else switchView('all'); // Fallback
    }
}

function updateURL(view, param = null) {
    let newSearch = "?alle";
    if (view === 'favorites') newSearch = "?favoriten";
    else if (view === 'specific-album' && param) newSearch = "?" + encodeURIComponent(param);
    
    const newUrl = window.location.pathname + newSearch;
    window.history.pushState({}, '', newUrl);
}

window.addEventListener('popstate', handleUrlParams);

// --- RENDERING ---
function renderGrid(data) {
    gridContainer.innerHTML = "";
    if (!data || data.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }
    document.getElementById('empty-state').classList.add('hidden');

    data.forEach(photo => {
        const isFav = favoriteIds.includes(photo.id);
        const card = document.createElement('div');
        
        // Masonry Klassen hinzufügen
        card.className = `photo-card ${photo.orientation} ${isFav ? 'is-favorite' : ''}`;
        
        card.innerHTML = `
            <img src="${photo.imageUrl}" alt="${photo.title}" loading="lazy">
            <i class="fas fa-heart card-fav-icon"></i>
            <div class="card-overlay">
                <h3>${photo.title}</h3>
            </div>
        `;

        // Click Events
        card.querySelector('.card-fav-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(photo.id);
            // UI direkt updaten
            card.classList.toggle('is-favorite');
            if(currentView === 'favorites' && !favoriteIds.includes(photo.id)) {
                renderGrid(photosData.filter(p => favoriteIds.includes(p.id)));
            }
        });

        card.addEventListener('click', () => openDetail(photo.id));
        gridContainer.appendChild(card);
    });
}

function renderAlbumTabs() {
    albumTabsContainer.innerHTML = "";
    
    // Helper zum Button erstellen
    const createTab = (text, active, onClick) => {
        const btn = document.createElement('button');
        btn.className = `chip ${active ? 'active' : ''}`;
        btn.innerText = text;
        btn.onclick = onClick;
        return btn;
    };

    albumTabsContainer.appendChild(createTab("Alle", currentView === 'all', () => switchView('all')));
    albumTabsContainer.appendChild(createTab("Favoriten", currentView === 'favorites', () => switchView('favorites')));

    albums.forEach(album => {
        const isActive = currentView === 'specific-album' && currentAlbumId === album.id;
        albumTabsContainer.appendChild(createTab(album.name, isActive, () => openAlbumView(album.id)));
    });
}

function switchView(view) {
    currentView = view;
    renderAlbumTabs();
    updateURL(view);
    
    if (downloadCollectionBtn) downloadCollectionBtn.classList.add('hidden');

    if (view === 'all') {
        statusText.innerText = "Alle Aufnahmen";
        renderGrid(photosData);
    } else if (view === 'favorites') {
        statusText.innerText = "Deine Favoriten";
        const favs = photosData.filter(p => favoriteIds.includes(p.id));
        renderGrid(favs);
        if (favs.length > 0) downloadCollectionBtn.classList.remove('hidden');
    }
}

function openAlbumView(id) {
    const album = albums.find(a => a.id === id);
    if (!album) return switchView('all');

    currentView = 'specific-album';
    currentAlbumId = id;
    renderAlbumTabs();
    updateURL('specific-album', album.name);
    statusText.innerText = `Album: ${album.name}`;

    const albumPhotos = photosData.filter(p => album.photoIds.includes(p.id));
    renderGrid(albumPhotos);
    if (albumPhotos.length > 0) downloadCollectionBtn.classList.remove('hidden');
}

// --- DETAIL VIEW ---
function openDetail(id) {
    activePhotoId = id;
    const photo = photosData.find(p => p.id === id);
    if (!photo) return;

    // Reset Zoom
    currentScale = 1; pannedX = 0; pannedY = 0;
    if (zoomSlider) zoomSlider.value = 1;
    updateTransform();

    // Sheet Minimized start
    detailContent.classList.add('minimized');
    sheetToggleBtn.querySelector('i').className = 'fas fa-plus';

    updateDetailContent(photo);
    
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('main-header').style.opacity = '0'; // Header ausblenden
    
    detailScreen.classList.remove('hidden');
    setTimeout(() => detailScreen.classList.add('active'), 10);
}

function updateDetailContent(photo) {
    zoomTarget.style.backgroundImage = `url(${photo.imageUrl})`;
    document.getElementById('detail-title').innerText = photo.title;
    document.getElementById('detail-category').innerText = photo.category || 'Portfolio';
    
    // Fav Button Status
    const favBtn = document.getElementById('detail-fav-btn');
    const icon = favBtn.querySelector('i');
    if (favoriteIds.includes(photo.id)) {
        favBtn.classList.add('active');
        icon.classList.replace('far', 'fas');
    } else {
        favBtn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    }
}

function closeDetail() {
    detailScreen.classList.remove('active');
    setTimeout(() => {
        document.getElementById('main-header').style.opacity = '1';
    }, 100);
    setTimeout(() => {
        detailScreen.classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    }, 300);
}

// --- INTERAKTIONS LOGIK ---
function setupEventListeners() {
    // Suche
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = photosData.filter(p => p.title.toLowerCase().includes(term));
        renderGrid(filtered);
    });

    // Buttons
    document.getElementById('back-btn').addEventListener('click', closeDetail);
    document.getElementById('detail-prev-btn').addEventListener('click', () => navPhoto(-1));
    document.getElementById('detail-next-btn').addEventListener('click', () => navPhoto(1));
    
    // Fav in Detail
    document.getElementById('detail-fav-btn').addEventListener('click', () => {
        toggleFavorite(activePhotoId);
        updateDetailContent(photosData.find(p => p.id === activePhotoId));
    });

    // Sheet Toggle
    sheetToggleBtn.addEventListener('click', () => {
        const isMin = detailContent.classList.toggle('minimized');
        sheetToggleBtn.querySelector('i').className = isMin ? 'fas fa-plus' : 'fas fa-minus';
    });

    // Album Modals
    document.getElementById('add-to-album-btn').addEventListener('click', showAddToAlbumModal);
    document.getElementById('confirm-create-album').addEventListener('click', createNewAlbum);
    document.querySelectorAll('.btn-cancel').forEach(b => b.addEventListener('click', () => {
        b.closest('.modal-overlay').classList.add('hidden');
    }));
    
    // Download
    downloadCollectionBtn.addEventListener('click', downloadCurrentCollectionAsZip);
    document.getElementById('download-btn').addEventListener('click', () => {
        const p = photosData.find(x => x.id === activePhotoId);
        if(p) {
            const a = document.createElement('a');
            a.href = p.imageUrl;
            a.download = p.title + ".jpg";
            a.click();
        }
    });
}

function navPhoto(dir) {
    let list = photosData;
    if (currentView === 'favorites') list = photosData.filter(p => favoriteIds.includes(p.id));
    else if (currentView === 'specific-album') {
        const a = albums.find(x => x.id === currentAlbumId);
        if(a) list = photosData.filter(p => a.photoIds.includes(p.id));
    }
    
    const idx = list.findIndex(p => p.id === activePhotoId);
    if (idx === -1) return;
    
    let nextIdx = idx + dir;
    if (nextIdx < 0) nextIdx = list.length - 1;
    if (nextIdx >= list.length) nextIdx = 0;
    
    // Fade Animation
    const wrap = document.querySelector('.detail-image-wrapper');
    wrap.style.opacity = 0;
    setTimeout(() => {
        openDetail(list[nextIdx].id);
        wrap.style.opacity = 1;
    }, 200);
}

function toggleFavorite(id) {
    if (favoriteIds.includes(id)) favoriteIds = favoriteIds.filter(x => x !== id);
    else favoriteIds.push(id);
    CookieManager.set('pl_favs', favoriteIds);
}

// --- ZOOM & PAN ---
function setupZoomPan() {
    zoomSlider.addEventListener('input', (e) => {
        currentScale = parseFloat(e.target.value);
        updateTransform();
    });

    let isDragging = false, startX, startY;

    const start = (e) => {
        if (currentScale <= 1) return;
        isDragging = true;
        startX = e.pageX || e.touches[0].pageX;
        startY = e.pageY || e.touches[0].pageY;
        zoomTarget.style.cursor = 'grabbing';
    };

    const move = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX || e.touches[0].pageX;
        const y = e.pageY || e.touches[0].pageY;
        pannedX += (x - startX) / currentScale;
        pannedY += (y - startY) / currentScale;
        startX = x; startY = y;
        updateTransform();
    };

    const end = () => { isDragging = false; zoomTarget.style.cursor = currentScale > 1 ? 'grab' : 'default'; };

    zoomTarget.addEventListener('mousedown', start);
    zoomTarget.addEventListener('touchstart', start, {passive: false});
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
}

function updateTransform() {
    zoomTarget.style.transform = `scale(${currentScale}) translate(${pannedX}px, ${pannedY}px)`;
    if(currentScale === 1) { pannedX = 0; pannedY = 0; }
}

// --- ALBUM LOGIK ---
function createNewAlbum() {
    const name = document.getElementById('new-album-name').value.trim();
    if (name) {
        albums.push({ id: Date.now(), name: name, photoIds: [] });
        CookieManager.set('pl_albums', albums);
        renderAlbumTabs();
        document.getElementById('modal-create-album').classList.add('hidden');
        if(activePhotoId) showAddToAlbumModal(); // Zurück zum Add-Menü
    }
}

function showAddToAlbumModal() {
    document.getElementById('modal-create-album').classList.add('hidden');
    const list = document.getElementById('album-selection-list');
    list.innerHTML = "";

    const createBtn = document.createElement('div');
    createBtn.className = 'album-select-item create-new';
    createBtn.innerHTML = '<i class="fas fa-plus"></i> Neues Album';
    createBtn.onclick = () => {
        document.getElementById('modal-add-to-album').classList.add('hidden');
        document.getElementById('modal-create-album').classList.remove('hidden');
    };
    list.appendChild(createBtn);

    albums.forEach(a => {
        const item = document.createElement('div');
        item.className = 'album-select-item';
        const isin = a.photoIds.includes(activePhotoId);
        item.innerHTML = `<span>${a.name}</span> ${isin ? '<i class="fas fa-check"></i>' : ''}`;
        if(!isin) {
            item.onclick = () => {
                a.photoIds.push(activePhotoId);
                CookieManager.set('pl_albums', albums);
                document.getElementById('modal-add-to-album').classList.add('hidden');
            };
        } else item.style.opacity = 0.5;
        list.appendChild(item);
    });
    document.getElementById('modal-add-to-album').classList.remove('hidden');
}

// --- ZIP DOWNLOAD ---
async function downloadCurrentCollectionAsZip() {
    const zip = new JSZip();
    let list = [];
    let name = "Fotos";

    if(currentView === 'favorites') { list = photosData.filter(p => favoriteIds.includes(p.id)); name = "Favoriten"; }
    else if(currentView === 'specific-album') {
        const a = albums.find(x => x.id === currentAlbumId);
        if(a) { list = photosData.filter(p => a.photoIds.includes(p.id)); name = a.name; }
    }

    if(list.length === 0) return;

    // Toast zeigen
    const toast = document.getElementById('toast');
    toast.innerText = "Erstelle ZIP...";
    toast.classList.remove('hidden'); toast.style.opacity = 1;

    const folder = zip.folder(name);
    const promises = list.map(async p => {
        try {
            const blob = await fetch(p.imageUrl).then(r => r.blob());
            folder.file(p.title + ".jpg", blob);
        } catch(e) {}
    });

    await Promise.all(promises);
    zip.generateAsync({type:"blob"}).then(content => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = name + ".zip";
        a.click();
        toast.style.opacity = 0;
    });
}