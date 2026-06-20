// Disable automatic scroll restoration on reload
if ('history' in window && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}

// Configuration and Constants
const START_FRAME = 49;
const END_FRAME = 160;
const frameStep = 1; // Load every frame for maximum smoothness on all devices

// Generate the frames to load based on the step size
const framesToLoad = [];
for (let i = START_FRAME; i <= END_FRAME; i += frameStep) {
    framesToLoad.push(i);
}
const TOTAL_LOADABLE_FRAMES = framesToLoad.length;
const framesArray = [];
let loadedCount = 0;

// Canvas details (disable alpha channel to optimize canvas blending performance)
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// LERP (Linear Interpolation) variables for smooth scrolling
let currentFrameIndex = 0;
let targetFrameIndex = 0;


// Preloader elements
const preloader = document.getElementById('preloader');
const percentageText = document.getElementById('loader-percentage');
const progressCircle = document.getElementById('progress-circle');

// Progress Circle Circumference (r=50 => 2 * pi * 50 = 314.159)
const CIRCUMFERENCE = 2 * Math.PI * 50;
progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
progressCircle.style.strokeDashoffset = CIRCUMFERENCE;

function setProgress(percent) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
    percentageText.textContent = `${Math.round(percent)}%`;
}

// Format frame index (e.g. 1 -> '001', 12 -> '012', 120 -> '120')
function formatFrameNum(num) {
    return num.toString().padStart(3, '0');
}

// Preload images
function preloadImages() {
    return new Promise((resolve) => {
        if (window.innerWidth < 768) {
            // On mobile / small screens, bypass frame preloading entirely
            const preloader = document.getElementById('preloader');
            if (preloader) {
                preloader.classList.add('fade-out');
            }
            resolve();
            return;
        }
        for (let idx = 0; idx < TOTAL_LOADABLE_FRAMES; idx++) {
            const frameIndex = framesToLoad[idx];
            const img = new Image();
            const frameNum = formatFrameNum(frameIndex);
            img.src = `frames/ezgif-frame-${frameNum}.jpg`;
            img.onload = () => {
                loadedCount++;
                const progressPercent = (loadedCount / TOTAL_LOADABLE_FRAMES) * 100;
                setProgress(progressPercent);

                if (loadedCount === TOTAL_LOADABLE_FRAMES) {
                    setTimeout(() => {
                        // Fade out loader
                        preloader.classList.add('fade-out');
                        resolve();
                    }, 500);
                }
            };
            img.onerror = () => {
                console.error(`Error loading frame: ${img.src}`);
                loadedCount++;
                if (loadedCount === TOTAL_LOADABLE_FRAMES) {
                    preloader.classList.add('fade-out');
                    resolve();
                }
            };
            framesArray.push(img);
        }
    });
}

// Resize canvas to cover screen (thresholding heights to ignore mobile URL bar hide/show)
let lastWidth = 0;
let lastHeight = 0;

function resizeCanvas() {
    if (window.innerWidth < 768) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Only trigger canvas resizing if width has changed, or if height change is significant (> 120px)
    if (width !== lastWidth || Math.abs(height - lastHeight) > 120) {
        canvas.width = width;
        canvas.height = height;
        lastWidth = width;
        lastHeight = height;
        renderFrame(Math.round(currentFrameIndex));
    }
}

// Render active image on canvas using object-fit: cover logic
function renderFrame(index) {
    const img = framesArray[index];
    if (!img || !img.complete) return;

    // Optimized: Removed ctx.clearRect because the cover image draw fully overwrites the canvas buffer

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // Cover algorithm
    const canvasRatio = canvasWidth / canvasHeight;
    const imgRatio = imgWidth / imgHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (canvasRatio < 0.8) {
        // Mobile portrait view: Blurred cover background + contained foreground
        
        // 1. Draw blurred cover background
        ctx.save();
        ctx.filter = 'blur(20px) brightness(0.65)';
        const coverWidth = canvasHeight * imgRatio;
        const coverHeight = canvasHeight;
        const coverX = (canvasWidth - coverWidth) / 2;
        const coverY = 0;
        ctx.drawImage(img, coverX, coverY, coverWidth, coverHeight);
        ctx.restore();

        // 2. Draw contained foreground (sharp, full width visible)
        const containWidth = canvasWidth;
        const containHeight = canvasWidth / imgRatio;
        const containX = 0;
        const containY = (canvasHeight - containHeight) / 2;
        ctx.drawImage(img, containX, containY, containWidth, containHeight);
    } else {
        // Desktop / Landscape view: Standard cover algorithm
        if (canvasRatio > imgRatio) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        } else {
            drawWidth = canvasHeight * imgRatio;
            drawHeight = canvasHeight;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
}

// Loop control variables
let isLoopActive = false;

// Smooth frame transitions via Animation Loop (runs only when needed to save battery/CPU)
function startAnimationLoop() {
    if (!isLoopActive) {
        isLoopActive = true;
        requestAnimationFrame(animationLoop);
    }
}

function animationLoop() {
    const lerpFactor = 0.08; // Reduced for much smoother, fluid drift easing
    const diff = targetFrameIndex - currentFrameIndex;

    if (Math.abs(diff) > 0.01) {
        currentFrameIndex += diff * lerpFactor;
        renderFrame(Math.round(currentFrameIndex));
        requestAnimationFrame(animationLoop);
    } else {
        // Converged, render exact target frame and stop loop recursion
        currentFrameIndex = targetFrameIndex;
        renderFrame(Math.round(currentFrameIndex));
        isLoopActive = false;
    }
}

// Trigger logo fadeout after 1 second when scrolling starts
let logoFadeoutTriggered = false;
function triggerLogoFadeoutOnScroll(scrollTop) {
    if (!logoFadeoutTriggered && scrollTop > 5) {
        logoFadeoutTriggered = true;
        const animationLogo = document.getElementById('animation-logo');
        if (animationLogo) {
            setTimeout(() => {
                animationLogo.classList.add('opacity-0');
                setTimeout(() => {
                    animationLogo.style.display = 'none';
                }, 1200); // Wait for transition to finish
            }, 1000); // 1 second delay
        }
    }
}

// Calculate target frame index based on page scroll
let scrollRafPending = false;
function updateScrollProgress() {
    if (window.innerWidth < 768) return;
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
        scrollRafPending = false;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;

        // Trigger logo fadeout when scrolling
        triggerLogoFadeoutOnScroll(scrollTop);

        // Fade out global scroll hint after user scrolls down
        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
            if (scrollTop > 50) {
                scrollHint.classList.add('fade-out');
            } else {
                scrollHint.classList.remove('fade-out');
            }
        }

        // We only scroll-animate until the static products section starts.
        const productsSection = document.getElementById('products');
        const scrollLimit = productsSection ? productsSection.offsetTop : (document.documentElement.scrollHeight - window.innerHeight);

        // Calculate ratio of scroll within the anim range
        let scrollPercent = (scrollTop / (scrollLimit || 1)) * 100;
        scrollPercent = Math.min(Math.max(scrollPercent, 0), 100);

        // Map the scroll percentage to frame index in the loaded array
        targetFrameIndex = (scrollPercent / 100) * (framesArray.length - 1);

        // Kick off animation loop
        startAnimationLoop();
    });
}

// Initialize Website
async function init() {
    await preloadImages();

    if (window.innerWidth >= 768) {
        // Setup initial canvas dimensions
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Watch scroll position
        window.addEventListener('scroll', updateScrollProgress, { passive: true });

        // If already scrolled down past 50px on load, hide the logo immediately
        const initialScroll = window.scrollY || document.documentElement.scrollTop;
        if (initialScroll > 50) {
            logoFadeoutTriggered = true;
            const animationLogo = document.getElementById('animation-logo');
            if (animationLogo) {
                animationLogo.classList.add('opacity-0');
                animationLogo.style.display = 'none';
            }
        }

        updateScrollProgress(); // initial run
    } else {
        // Hide mobile overlays
        const animationLogo = document.getElementById('animation-logo');
        if (animationLogo) {
            animationLogo.style.display = 'none';
        }
        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
            scrollHint.style.display = 'none';
        }
    }
}

// Scroll Reveal Observer
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target); // Trigger only once
        }
    });
}, { threshold: 0.1 });

// FAQ Toggle function
window.toggleFaq = function(btn) {
    const parent = btn.parentElement;
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('.material-icons-outlined:last-child');
    
    const isOpen = parent.classList.contains('active');
    
    // Close other FAQ items
    document.querySelectorAll('.faq-accordion > div').forEach(item => {
        if (item !== parent && item.classList.contains('active')) {
            item.classList.remove('active');
            item.querySelector('.faq-content').style.maxHeight = '0px';
            const itemIcon = item.querySelector('.material-icons-outlined:last-child');
            if (itemIcon) itemIcon.style.transform = 'rotate(0deg)';
        }
    });

    if (isOpen) {
        parent.classList.remove('active');
        content.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        parent.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
};

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        revealObserver.observe(el);
    });
});

// Mobile header: transparent over hero, opaque when scrolled past
(function initMobileHeader() {
    if (window.innerWidth >= 768) return;

    const header = document.getElementById('main-header');
    if (!header) return;

    let headerRafPending = false;

    function updateHeaderOnScroll() {
        if (headerRafPending) return;
        headerRafPending = true;
        requestAnimationFrame(() => {
            headerRafPending = false;
            const heroHeight = window.innerHeight;
            if (window.scrollY > heroHeight * 0.85) {
                header.classList.add('bg-white/80', 'dark:bg-zinc-950/80', 'border-primary/10');
                header.classList.remove('bg-transparent', 'border-transparent');
            } else {
                header.classList.remove('bg-white/80', 'dark:bg-zinc-950/80', 'border-primary/10');
                header.classList.add('bg-transparent', 'border-transparent');
            }
        });
    }

    window.addEventListener('scroll', updateHeaderOnScroll, { passive: true });
    updateHeaderOnScroll();
})();

init();

// =============================================================
// FLOATING PARTICLE SYSTEM
// Dreamy glassmorphism background: lily petals, lavender blossoms, butterflies
// Desktop only — hidden on mobile via CSS
// =============================================================

(function initParticles() {
    if (window.innerWidth < 768) return; // Desktop only

    const container = document.getElementById('floating-particles');
    if (!container) return;

    // SVG templates for each particle type
    const svgTemplates = {
        lilyPetal: (color) => `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
                <g opacity="0.85">
                    <ellipse cx="20" cy="12" rx="6" ry="12" fill="${color}" opacity="0.7" transform="rotate(0,20,20)"/>
                    <ellipse cx="20" cy="12" rx="6" ry="12" fill="${color}" opacity="0.7" transform="rotate(72,20,20)"/>
                    <ellipse cx="20" cy="12" rx="6" ry="12" fill="${color}" opacity="0.7" transform="rotate(144,20,20)"/>
                    <ellipse cx="20" cy="12" rx="6" ry="12" fill="${color}" opacity="0.7" transform="rotate(216,20,20)"/>
                    <ellipse cx="20" cy="12" rx="6" ry="12" fill="${color}" opacity="0.7" transform="rotate(288,20,20)"/>
                    <circle cx="20" cy="20" r="4" fill="${color}" opacity="0.9"/>
                </g>
            </svg>`,

        lavenderBlossom: (color) => `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 40" width="100%" height="100%">
                <g opacity="0.8">
                    <ellipse cx="18" cy="8" rx="4" ry="8" fill="${color}" opacity="0.75"/>
                    <ellipse cx="12" cy="14" rx="4" ry="8" fill="${color}" opacity="0.7" transform="rotate(-25,12,14)"/>
                    <ellipse cx="24" cy="14" rx="4" ry="8" fill="${color}" opacity="0.7" transform="rotate(25,24,14)"/>
                    <ellipse cx="14" cy="22" rx="3.5" ry="7" fill="${color}" opacity="0.65" transform="rotate(-15,14,22)"/>
                    <ellipse cx="22" cy="22" rx="3.5" ry="7" fill="${color}" opacity="0.65" transform="rotate(15,22,22)"/>
                    <line x1="18" y1="38" x2="18" y2="16" stroke="${color}" stroke-width="2" opacity="0.6"/>
                </g>
            </svg>`,

        butterfly: (color, color2) => `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 30" width="100%" height="100%">
                <g opacity="0.8">
                    <!-- Upper wings -->
                    <path d="M24 15 C 18 5, 2 2, 4 12 C 6 20, 18 18, 24 15 Z" fill="${color}" opacity="0.75"/>
                    <path d="M24 15 C 30 5, 46 2, 44 12 C 42 20, 30 18, 24 15 Z" fill="${color}" opacity="0.75"/>
                    <!-- Lower wings -->
                    <path d="M24 15 C 16 16, 4 22, 8 28 C 12 32, 20 24, 24 15 Z" fill="${color2}" opacity="0.65"/>
                    <path d="M24 15 C 32 16, 44 22, 40 28 C 36 32, 28 24, 24 15 Z" fill="${color2}" opacity="0.65"/>
                    <!-- Body -->
                    <ellipse cx="24" cy="15" rx="2" ry="7" fill="${color}" opacity="0.9"/>
                </g>
            </svg>`
    };

    const driftClasses = ['drift-a', 'drift-b', 'drift-c', 'drift-d', 'drift-e'];

    // Color palettes
    const lilyColors   = ['#E879C0', '#D946A8', '#EC4899', '#F472B6', '#C084FC'];
    const lavColors    = ['#A78BFA', '#8B5CF6', '#C4B5FD', '#7C3AED', '#DDD6FE'];
    const butterflyPrimary   = ['#C084FC', '#A78BFA', '#E879C0', '#F9A8D4'];
    const butterflySecondary = ['#F9A8D4', '#FDE68A', '#FBCFE8', '#E9D5FF'];

    // Particle pool config
    const config = [
        { type: 'lilyPetal',       count: 14, sizeRange: [18, 36] },
        { type: 'lavenderBlossom', count: 10, sizeRange: [14, 28] },
        { type: 'butterfly',       count: 8,  sizeRange: [24, 42] }
    ];

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function createParticle(typeConfig) {
        const el = document.createElement('div');
        const size = rand(typeConfig.sizeRange[0], typeConfig.sizeRange[1]);
        const driftClass = pick(driftClasses);

        // Random start position across bottom of viewport
        const startX = rand(-5, 105); // % of viewport width
        const startY = rand(80, 115); // % below the visible area (spawn from below)

        el.className = `particle ${typeConfig.type} ${driftClass}`;
        el.style.cssText = `
            left: ${startX}vw;
            top: ${startY}vh;
            width: ${size}px;
            height: ${size}px;
            animation-duration: ${rand(12, 28)}s;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
            animation-delay: ${rand(0, 20)}s;
            animation-fill-mode: both;
        `;

        // Generate SVG
        let svgContent = '';
        if (typeConfig.type === 'lilyPetal') {
            svgContent = svgTemplates.lilyPetal(pick(lilyColors));
        } else if (typeConfig.type === 'lavenderBlossom') {
            svgContent = svgTemplates.lavenderBlossom(pick(lavColors));
        } else if (typeConfig.type === 'butterfly') {
            svgContent = svgTemplates.butterfly(pick(butterflyPrimary), pick(butterflySecondary));
        }

        el.innerHTML = svgContent;
        container.appendChild(el);
    }

    // Spawn all particles
    config.forEach(typeConfig => {
        for (let i = 0; i < typeConfig.count; i++) {
            createParticle(typeConfig);
        }
    });

    // Re-spawn particles on window resize (desktop only)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth < 768) {
                container.style.display = 'none';
            } else {
                container.style.display = '';
            }
        }, 300);
    });
})();
