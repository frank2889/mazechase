// Touch controls for mobile devices

// Store which keys are currently "pressed" by touch
const touchState = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Custom keyboard event to simulate arrow key presses
function simulateKeyEvent(key: string, type: 'keydown' | 'keyup') {
    const keyCode = {
        'ArrowUp': 38,
        'ArrowDown': 40,
        'ArrowLeft': 37,
        'ArrowRight': 39
    }[key] || 0;

    const event = new KeyboardEvent(type, {
        key: key,
        code: key,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true
    });

    document.dispatchEvent(event);
    window.dispatchEvent(event);
    
    // Also dispatch to the game canvas if it exists
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.dispatchEvent(event);
    }
}

// Handle touch start/end for a button
function setupButton(buttonId: string, direction: 'up' | 'down' | 'left' | 'right') {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const keyMap = {
        'up': 'ArrowUp',
        'down': 'ArrowDown',
        'left': 'ArrowLeft',
        'right': 'ArrowRight'
    };

    const key = keyMap[direction];

    // Prevent default touch behavior
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!touchState[direction]) {
            touchState[direction] = true;
            simulateKeyEvent(key, 'keydown');
        }
    }, { passive: false });

    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (touchState[direction]) {
            touchState[direction] = false;
            simulateKeyEvent(key, 'keyup');
        }
    }, { passive: false });

    button.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (touchState[direction]) {
            touchState[direction] = false;
            simulateKeyEvent(key, 'keyup');
        }
    }, { passive: false });

    // Also support mouse for testing on desktop
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!touchState[direction]) {
            touchState[direction] = true;
            simulateKeyEvent(key, 'keydown');
        }
    });

    button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        if (touchState[direction]) {
            touchState[direction] = false;
            simulateKeyEvent(key, 'keyup');
        }
    });

    button.addEventListener('mouseleave', () => {
        if (touchState[direction]) {
            touchState[direction] = false;
            simulateKeyEvent(key, 'keyup');
        }
    });
}

// Swipe gesture support
let touchStartX = 0;
let touchStartY = 0;
let currentSwipeDirection: 'up' | 'down' | 'left' | 'right' | null = null;

function setupSwipeGestures() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const SWIPE_THRESHOLD = 30;

    gameContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    gameContainer.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const diffX = touchStartX - touchX;
        const diffY = touchStartY - touchY;

        let newDirection: 'up' | 'down' | 'left' | 'right' | null = null;

        // Determine swipe direction
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (Math.abs(diffX) > SWIPE_THRESHOLD) {
                newDirection = diffX > 0 ? 'left' : 'right';
            }
        } else {
            // Vertical swipe
            if (Math.abs(diffY) > SWIPE_THRESHOLD) {
                newDirection = diffY > 0 ? 'up' : 'down';
            }
        }

        // If direction changed, update key states
        if (newDirection !== currentSwipeDirection) {
            // Release old direction
            if (currentSwipeDirection && touchState[currentSwipeDirection]) {
                const oldKey = getKeyForDirection(currentSwipeDirection);
                touchState[currentSwipeDirection] = false;
                simulateKeyEvent(oldKey, 'keyup');
            }

            // Press new direction
            if (newDirection) {
                const newKey = getKeyForDirection(newDirection);
                touchState[newDirection] = true;
                simulateKeyEvent(newKey, 'keydown');
            }

            currentSwipeDirection = newDirection;
        }
    }, { passive: true });

    gameContainer.addEventListener('touchend', () => {
        // Release any active direction
        if (currentSwipeDirection && touchState[currentSwipeDirection]) {
            const key = getKeyForDirection(currentSwipeDirection);
            touchState[currentSwipeDirection] = false;
            simulateKeyEvent(key, 'keyup');
        }
        currentSwipeDirection = null;
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
}

function getKeyForDirection(direction: 'up' | 'down' | 'left' | 'right'): string {
    const keyMap = {
        'up': 'ArrowUp',
        'down': 'ArrowDown',
        'left': 'ArrowLeft',
        'right': 'ArrowRight'
    };
    return keyMap[direction];
}

// Prevent unwanted zoom and scroll on mobile
function preventDefaultTouchBehavior() {
    // Prevent double-tap zoom
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - (window as any).lastTouchEnd < 300) {
            e.preventDefault();
        }
        (window as any).lastTouchEnd = now;
    }, { passive: false });

    // Prevent pinch zoom
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

export function setupTouchControls() {
    // Wait a bit for the game to initialize
    setTimeout(() => {
        // Setup D-pad buttons
        setupButton('btn-up', 'up');
        setupButton('btn-down', 'down');
        setupButton('btn-left', 'left');
        setupButton('btn-right', 'right');

        // Setup swipe gestures on game canvas
        setupSwipeGestures();

        // Prevent unwanted touch behaviors
        preventDefaultTouchBehavior();

        console.log('Touch controls initialized');
    }, 500);
}
