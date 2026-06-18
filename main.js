// Configuration and Constants
const TOTAL_FRAMES = 160;
const framesArray = [];
let loadedCount = 0;

// Canvas details
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');

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
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image();
            const frameNum = formatFrameNum(i);
            img.src = `frames/ezgif-frame-${frameNum}.jpg`;
            img.onload = () => {
                loadedCount++;
                const progressPercent = (loadedCount / TOTAL_FRAMES) * 100;
                setProgress(progressPercent);

                if (loadedCount === TOTAL_FRAMES) {
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
                if (loadedCount === TOTAL_FRAMES) {
                    preloader.classList.add('fade-out');
                    resolve();
                }
            };
            framesArray.push(img);
        }
    });
}

// Resize canvas to cover screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderFrame(Math.round(currentFrameIndex));
}

// Render active image on canvas using object-fit: cover logic
function renderFrame(index) {
    const img = framesArray[index];
    if (!img || !img.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // Map the scroll percentage to frame index
    // Note: Map 0% to 100% of the animation range to frame indices 0 to 159
    targetFrameIndex = (scrollPercent / 100) * (TOTAL_FRAMES - 1);
}

// Smooth frame transitions via Animation Loop
function animationLoop() {
    // Smooth frame lerping (higher factor = faster response, lower = smoother drift)
    const lerpFactor = 0.15;
    const diff = targetFrameIndex - currentFrameIndex;

    if (Math.abs(diff) > 0.01) {
        currentFrameIndex += diff * lerpFactor;
        renderFrame(Math.round(currentFrameIndex));
    }

    requestAnimationFrame(animationLoop);
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

    // Start drawing update loop
    requestAnimationFrame(animationLoop);
}

init();
