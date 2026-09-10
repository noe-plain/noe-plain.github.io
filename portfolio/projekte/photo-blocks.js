function renderBlocksFromData(blocks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    // Load specific CSS safely once
    if (!document.getElementById('gutenberg-frontend-css')) {
        const style = document.createElement('style');
        style.id = 'gutenberg-frontend-css';
        style.innerHTML = `
            .gutenberg-article-container { width: 100%; margin: 40px auto; display: flex; flex-direction: column; gap: 30px; font-family: 'switzer', sans-serif; padding: 0; }
            .g-block-heading, .g-block-text { max-width: 800px; margin: 0 auto; width: 100%; padding: 0 15px; }
            .g-block-hero { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
            .g-block-hero img { width: 100%; border-radius: 15px; object-fit: cover; max-height: 60vh; }
            .g-block-hero p { font-size: 0.95rem; color: #555; text-align: center; margin: 0; font-style: italic; }
            .g-block-heading h1 { font-size: 2.5rem; font-family: 'Bodoni Moda', serif; color: var(--primary); margin: 0; }
            .g-block-heading h2 { font-size: 2rem; font-family: 'Bodoni Moda', serif; color: var(--primary); margin: 0; }
            .g-block-heading h3 { font-size: 1.5rem; color: #222; margin: 0; }
            .g-block-heading h4 { font-size: 1.25rem; color: #333; margin: 0; }
            .g-block-text { font-size: 1.1rem; line-height: 1.6; color: #444; }
            
            .videokarte h2 { font-size: 2rem; }
            .videokarte .project-details {
                background: white;
                padding: 2rem;
                margin-top: -2rem;
                position: relative;
                z-index: 10;
            }
            .g-block-heading h1 { font-size: 2.5rem; font-family: 'Bodoni Moda', serif; color: var(--primary); margin: 0; }
            .g-block-heading h2 { font-size: 2rem; font-family: 'Bodoni Moda', serif; color: var(--primary); margin: 0; }
            .g-block-heading h3 { font-size: 1.5rem; color: #222; margin: 0; }
            .g-block-heading h4 { font-size: 1.25rem; color: #333; margin: 0; }
            .g-block-text { font-size: 1.1rem; line-height: 1.6; color: #444; }
            .g-block-youtube { width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .g-block-youtube iframe { width: 100%; height: 100%; border: none; }
            .g-block-pdf { background: #f9f9f9; padding: 15px 25px; border-radius: 10px; border-left: 4px solid var(--primary); display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: #333; transition: background 0.2s; }
            .g-block-pdf:hover { background: #f0f0f0; }
            .g-block-pdf i { font-size: 1.5rem; color: var(--primary); margin-right: 15px; }
            .g-block-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .g-block-gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; cursor: pointer; transition: transform 0.2s; }
            .g-block-gallery img:hover { transform: scale(1.03); }

            /* CGI Before/After Slider */
            .cgi-slider-container { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 12px; user-select: none; background: #000; margin: 20px auto; max-width: 1000px; }
            .cgi-slider-before, .cgi-slider-after { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
            .cgi-slider-before img, .cgi-slider-after img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .cgi-slider-after { width: 50%; border-right: 2px solid #fff; box-shadow: 4px 0 15px rgba(0, 0, 0, 0.4); z-index: 2; transition: width 0.05s ease-out; }
            .cgi-slider-handle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: #fff; color: #1a1523; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 3; cursor: ew-resize; box-shadow: 0 4px 15px rgba(0,0,0,0.45); pointer-events: auto; border: 1px solid rgba(0,0,0,0.1); transition: left 0.05s ease-out; }
            .cgi-slider-handle i { font-size: 0.85rem; }
        `;
        document.head.appendChild(style);
    }

    if (!blocks || blocks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; grid-column:1/-1;">Keine Inhalte verfügbar.</p>';
        return;
    }

    blocks.forEach(b => {
        const div = document.createElement('div');
        
        switch (b.type) {
            case 'hero':
                div.className = 'g-block-hero';
                div.innerHTML = `
                    ${b.imageUrl ? `<img src="${b.imageUrl}" alt="Hero">` : ''}
                    ${b.text ? `<p>${b.text}</p>` : ''}
                `;
                break;
            case 'heading':
                div.className = 'g-block-heading';
                const lvl = b.level || 'h2';
                div.innerHTML = `<${lvl}>${b.text || ''}</${lvl}>`;
                break;
            case 'text':
                div.className = 'g-block-text';
                div.innerHTML = b.html || '';
                break;
            case 'pdf':
                div.className = 'videokarte';
                div.style.padding = "0";
                div.innerHTML = `
                    <div style="width:100%; height:600px;">
                        <object data="${b.pdfUrl}" type="application/pdf" width="100%" height="100%">
                            <div style="padding: 2rem; text-align: center;">
                                <p>Ihr Browser kann dieses PDF nicht direkt anzeigen.</p>
                                <a href="${b.pdfUrl}" class="back-link" style="color: #333;" target="_blank">
                                    <i class="fas fa-file-pdf"></i> PDF herunterladen / öffnen
                                </a>
                            </div>
                        </object>
                    </div>
                    ${b.title ? `<div class="project-details" style="margin-top:0;"><h2>${b.title}</h2></div>` : ''}
                `;
                break;
            case 'youtube':
                div.className = 'videokarte';
                const tagsArray = b.tags ? b.tags.split(',').map(s=>s.trim()).filter(Boolean) : [];
                const tagsHtml = tagsArray.map(tag => {
                    let icon = 'fa-video';
                    if (tag.includes('Schnitt')) icon = 'fa-cut';
                    if (tag.includes('Color')) icon = 'fa-palette';
                    if (tag.includes('Kamera')) icon = 'fa-video';
                    if (tag.includes('Audio')) icon = 'fa-headphones';
                    if (tag.includes('Editing')) icon = 'fa-edit';
                    if (tag.includes('Postproduktion')) icon = 'fa-timeline';
                    return `<li><i class="fas ${icon}"></i> ${tag}</li>`;
                }).join('');

                div.innerHTML = `
                    <div class="video-container">
                        <iframe style="aspect-ratio: 16 / 9 !important;" src="https://www.youtube-nocookie.com/embed/${b.videoId}" 
                            allowfullscreen></iframe>
                    </div>
                    ${(b.title || tagsHtml) ? `
                    <div class="project-details">
                        ${b.title ? `<h2>${b.title}</h2>` : ''}
                        ${tagsHtml ? `<ul class="roles-list">${tagsHtml}</ul>` : ''}
                    </div>` : ''}
                `;
                if (!b.videoId) div.innerHTML = ''; // Hide if empty
                break;
            case 'gallery':
            case 'media':
                div.className = 'project-gallery'; // Native masonry look
                if (b.items) {
                    b.items.forEach((item, idx) => {
                        div.appendChild(photoTile(item, ''));
                    });
                    setTimeout(() => { if (typeof relayoutGrid === 'function') relayoutGrid(div); }, 150);
                }
                break;
            case 'beforeafter':
                div.className = 'g-block-beforeafter';
                const img1 = b.imageUrl || '';
                const img2 = b.imageUrlAfter || '';
                div.innerHTML = `
                    <div class="cgi-slider-container">
                        <div class="cgi-slider-before">
                            ${img1 ? `<img src="${img1}" draggable="false">` : ''}
                        </div>
                        <div class="cgi-slider-after" style="width: 50%;">
                            ${img2 ? `<img src="${img2}" draggable="false">` : ''}
                        </div>
                        <div class="cgi-slider-handle" style="left: 50%;">
                            <i class="fas fa-arrows-alt-h"></i>
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    const container = div.querySelector('.cgi-slider-container');
                    if (!container) return;
                    const after = container.querySelector('.cgi-slider-after');
                    const handle = container.querySelector('.cgi-slider-handle');
                    if (!after || !handle) return;

                    let dragging = false;

                    function update(clientX) {
                        const r = container.getBoundingClientRect();
                        let pct = ((clientX - r.left) / r.width) * 100;
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
                }, 0);
                break;
        }
        
        container.appendChild(div);
    });
}
