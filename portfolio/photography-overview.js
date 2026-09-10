fetch('projekte/photography.json').then(response => { if (!response.ok) throw Error('Fotografie-Inhalte fehlen'); return response.json(); }).then(projects => {
    const grid = document.querySelector('.category-grid');
    const existing = new Map([...grid.querySelectorAll('a.category-card')].map(card => [card.getAttribute('href').split('?')[1], card]));
    for (const project of projects) {
        let card = existing.get(project.id);
        if (!card) { card = document.createElement('a'); card.className = 'category-card'; card.innerHTML = '<img class="category-bg-img"><div class="category-overlay"><h3></h3><p></p></div>'; grid.append(card); }
        card.href = 'projekte/fotografie.html?' + encodeURIComponent(project.id);
        const img = card.querySelector('img'); img.src = (project['hero-image'] || '').replace('../../', '../'); img.alt = project.title; img.removeAttribute('onerror');
        card.querySelector('h3').textContent = project.title; card.querySelector('p').textContent = project.description || '';
    }
    for (const [id, card] of existing) if (!projects.some(p => p.id === id)) card.remove();
}).catch(console.error);
