// Configuration and Constants
const TOTAL_FRAMES = 160;
const isMobile = window.innerWidth < 768;
const frameStep = isMobile ? 3 : 1; // Load every 3rd frame on mobile to save memory & bandwidth

// Generate the frames to load based on the step size
const framesToLoad = [];
for (let i = 1; i <= TOTAL_FRAMES; i += frameStep) {
    framesToLoad.push(i);
}
const TOTAL_LOADABLE_FRAMES = framesToLoad.length;
const framesArray = [];
let loadedCount = 0;

// Canvas details (disable alpha channel to optimize canvas blending performance)
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

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

// Loop control variables
let isLoopActive = false;

// Story sections and their scroll range percentages
const storySections = [
    { id: 'hero-section', start: 0, end: 18 },
    { id: 'hydro-section', start: 20, end: 38 },
    { id: 'material-section', start: 40, end: 58 },
    { id: 'modular-section', start: 60, end: 78 },
    { id: 'specs-trigger-section', start: 80, end: 98 }
];

// Update popup cards active states and parallax translates based on current interpolated frame percentage
function updateStoryCards() {
    const totalFrames = framesArray.length;
    if (totalFrames <= 1) return;

    // Calculate current scroll percentage based on interpolated currentFrameIndex
    const currentPercent = (currentFrameIndex / (totalFrames - 1)) * 100;

    storySections.forEach((sec) => {
        const sectionEl = document.getElementById(sec.id);
        if (!sectionEl) return;
        const cardEl = sectionEl.querySelector('.slide-content');
        if (!cardEl) return;

        if (currentPercent >= sec.start && currentPercent <= sec.end) {
            // Card is active inside this section range
            cardEl.classList.add('active');

            // Calculate progress (0 to 1) within this specific section range
            const progress = (currentPercent - sec.start) / (sec.end - sec.start);

            // Parallax offset: slide from bottom (+30px) to top (-30px) as we scroll down
            const parallaxY = (0.5 - progress) * 60; // range: +30px to -30px
            cardEl.style.transform = `translateY(${parallaxY}px)`;
        } else {
            // Card is inactive
            cardEl.classList.remove('active');
            cardEl.style.transform = ''; // clears inline styles to use css translation transitions
        }
    });
}

// Smooth frame transitions via Animation Loop (runs only when needed to save battery/CPU)
function startAnimationLoop() {
    if (!isLoopActive) {
        isLoopActive = true;
        requestAnimationFrame(animationLoop);
    }
}

function animationLoop() {
    const lerpFactor = 0.15;
    const diff = targetFrameIndex - currentFrameIndex;

    if (Math.abs(diff) > 0.01) {
        currentFrameIndex += diff * lerpFactor;
        renderFrame(Math.round(currentFrameIndex));
        updateStoryCards();
        requestAnimationFrame(animationLoop);
    } else {
        // Converged, render exact target frame and stop loop recursion
        currentFrameIndex = targetFrameIndex;
        renderFrame(Math.round(currentFrameIndex));
        updateStoryCards();
        isLoopActive = false;
    }
}

// Calculate target frame index based on page scroll
function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
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
}

// Initialize Website
async function init() {
    await preloadImages();

    // Setup initial canvas dimensions
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Watch scroll position
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress(); // initial run
}

init();
