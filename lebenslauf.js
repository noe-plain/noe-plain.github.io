document.addEventListener('DOMContentLoaded', () => {
    const resumeContainer = document.getElementById('resume-timeline');
    if (!resumeContainer) textContainer = true;

    if (resumeContainer) {
        fetch('lebenslauf.json')
            .then(response => response.json())
            .then(data => {
                let html = '';
                data.forEach((item, index) => {
                    // Alternate left and right for desktop view
                    const alignmentClass = index % 2 === 0 ? 'left' : 'right';

                    html += `
                        <div class="timeline-item ${alignmentClass}">
                            <div class="timeline-content signature-form">
                                <h3>${item.title}</h3>
                                <h4>${item.company} | ${item.year}</h4>
                                <p>${item.description}</p>
                            </div>
                        </div>
                    `;
                });

                // Add the center line with a fill element
                html = `<div class="timeline-line"><div class="timeline-line-fill" id="timeline-line-fill"></div></div>` + html;
                resumeContainer.innerHTML = html;

                // Initialize the scroll progress logic
                initScrollProgress();
            })
            .catch(error => console.error('Error loading resume data:', error));
    }
});

function initScrollProgress() {
    const container = document.getElementById('resume-timeline');
    const fill = document.getElementById('timeline-line-fill');

    // Set a slight timeout to ensure DOM layout has calculated item offsets correctly
    setTimeout(() => {
        const items = document.querySelectorAll('.timeline-item');

        window.addEventListener('scroll', () => {
            if (!container || !fill || items.length === 0) return;

            const rect = container.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate progress based on container relative to the golden ratio of the viewport (~62% down)
            const scrollTrigger = windowHeight * 0.62;
            let distanceScrolled = scrollTrigger - rect.top;

            // Limit the distance to bounds
            distanceScrolled = Math.max(0, Math.min(rect.height, distanceScrolled));

            const totalDistance = rect.height;
            let progress = (distanceScrolled / totalDistance) * 100;
            fill.style.height = `${progress}%`;

            // Check each item based on where the line has reached
            items.forEach(item => {
                const itemTop = item.offsetTop;
                // The dot is roughly at top: 30px + half its height
                const dotPosition = itemTop + 38;

                if (distanceScrolled >= dotPosition) {
                    item.classList.add('in-view');
                } else {
                    item.classList.remove('in-view');
                }
            });
        });

        // Trigger once to capture initial state
        window.dispatchEvent(new Event('scroll'));
    }, 100);
}
