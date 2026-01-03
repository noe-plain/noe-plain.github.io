document.addEventListener("DOMContentLoaded", () => {
    // Hamburger Toggle
    const t = document.getElementById("hamburgerBtn"),
        n = document.getElementById("hamburgerNav"),
        e = document.getElementById("hamburgerNavBg");
    t && n && e && (t.addEventListener("click", function () {
        n.classList.add("open"), e.classList.add("open")
    }), e.addEventListener("click", function () {
        n.classList.remove("open"), e.classList.remove("open")
    }));

    // Portfolio Submenu Toggle
    const toggle = document.getElementById('portfolio-toggle');
    const sublinks = document.getElementById('portfolio-sublinks');

    if (toggle && sublinks) {
        // Toggle click
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sublinks.classList.toggle('collapsed');
            toggle.classList.toggle('rotate');
        });

        // Also allow clicking the "Portfolio" text to toggle if on mobile? 
        // Currently the request was "Hover over Portfolio OR expand icon". 
        // Desktop hover is CSS. Mobile is icon click.
        // Let's keep it consistent: Icon click toggles. 
        // If "Portfolio" link is clicked, it goes to anchor #portfolio.
    }
});
