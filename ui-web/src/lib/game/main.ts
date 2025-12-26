/**
 * Main Game Initializer - 3D Only
 * 
 * MazeChase 3D using Babylon.js
 */

import {connectToWebSocket, waitForGameState, subscribeLobbyState, subscribeGameEvents} from "./connection.ts";
import {showError} from "./utils.ts";
import {getUserInfo} from "../auth.ts";
import {mountWaitingRoom, unmountWaitingRoom} from "./waiting-room.tsx";
import type { Game3DScene } from "../game3d/scene";

// Global game instance
let game3d: Game3DScene | null = null;

// Check if user is logged in before starting game
async function checkAuth() {
    try {
        const username = await getUserInfo();
        if (!username) {
            window.location.href = '/auth/login';
            throw new Error('Not logged in');
        }
        return username;
    } catch (e) {
        window.location.href = '/auth/login';
        throw new Error('Not logged in');
    }
}

// Detect if running on mobile/touch device
export function isTouchDevice(): boolean {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (window.matchMedia && window.matchMedia('(hover: none)').matches);
}

export async function initGame() {
    // Check user is logged in with real account
    await checkAuth();
    
    // Check if this is a solo game
    const params = new URLSearchParams(window.location.search);
    const isSoloGame = params.get('single') === 'true';
    
    connectToWebSocket();
    
    if (isSoloGame) {
        // Solo mode: skip waiting room, auto-start after game state received
        console.log("Solo mode: skipping waiting room");
        await waitForGameState();
        
        // Small delay to allow bots to be added, then auto-start
        setTimeout(() => {
            import('./connection.ts').then(({sendStartGame}) => {
                sendStartGame();
            });
        }, 500);
        
        // Subscribe to know when game actually starts
        let gameInitialized = false;
        subscribeLobbyState((state) => {
            if (state.matchStarted && !gameInitialized) {
                gameInitialized = true;
                start3DGame();
            }
        });
    } else {
        // Multiplayer mode: show waiting room
        mountWaitingRoom();
        
        // Subscribe to lobby state to know when game starts and show countdown
        let gameInitialized = false;
        let lastCountdown: number | null = null;
        subscribeLobbyState((state) => {
            // Show countdown if available
            if (state.countdown !== null && state.countdown !== lastCountdown) {
                lastCountdown = state.countdown;
                showCountdown(state.countdown);
            }
            
            if (state.matchStarted && !gameInitialized) {
                gameInitialized = true;
                hideCountdown();
                unmountWaitingRoom();
                start3DGame();
            }
        });
        
        console.log("Waiting for game state");
        await waitForGameState();
    }
}

/**
 * Start the 3D Babylon.js game
 */
async function start3DGame() {
    try {
        console.log("Starting MazeChase 3D...");
        
        // Show loading screen
        showLoadingScreen();
        
        // Import 3D modules
        updateLoadingProgress(10, 'Loading 3D engine...');
        const { Game3DScene } = await import('../game3d/scene');
        
        // Create canvas for 3D rendering
        updateLoadingProgress(20, 'Creating canvas...');
        const container = document.getElementById('the-game');
        if (!container) {
            throw new Error('Game container not found');
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Create and append canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas-3d';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.outline = 'none';
        container.appendChild(canvas);
        
        // Initialize 3D scene
        updateLoadingProgress(40, 'Initializing 3D scene...');
        game3d = new Game3DScene(canvas);
        
        updateLoadingProgress(60, 'Loading maze...');
        await game3d.loadRealMap('/gassets/map.json');
        
        updateLoadingProgress(80, 'Creating players...');
        game3d.initPlayers();
        
        // Get current player's sprite from server state
        const { getSpriteID } = await import('./connection.ts');
        const mySprite = getSpriteID();
        if (mySprite) {
            game3d.setFollowPlayer(mySprite);
            console.log(`Camera following: ${mySprite}`);
        }
        
        updateLoadingProgress(90, 'Setting up controls...');
        
        // Setup keyboard input
        setupKeyboardInput(canvas);
        
        // Setup touch input for mobile
        if (isTouchDevice()) {
            setupTouchControls(container);
        }
        
        // Subscribe to game events from server
        setupGameEventHandlers();
        
        // Add FPS counter for debugging
        addFPSCounter();
        
        // Start game timer
        startGameTimer();
        
        // Hide loading screen
        updateLoadingProgress(100, 'Ready!');
        hideLoadingScreen();
        
        // Start rendering
        game3d.start();
        
        // Store globally for debugging
        (window as any).game3d = game3d;
        
        console.log("MazeChase 3D started successfully!");
        
    } catch (error) {
        console.error("Failed to start 3D game:", error);
        hideLoadingScreen();
        showError("Kon 3D game niet starten: " + (error as Error).message);
    }
}

/**
 * Setup keyboard input for 3D game
 */
function setupKeyboardInput(canvas: HTMLCanvasElement) {
    canvas.tabIndex = 1;
    canvas.focus();
    
    document.addEventListener('keydown', (e) => {
        if (!game3d) return;
        
        let direction: string | null = null;
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
        }
        
        if (direction) {
            e.preventDefault();
            // Send movement to server
            import('./connection.ts').then(({sendPosMessage}) => {
                sendPosMessage(direction!);
            });
        }
    });
}

/**
 * Setup touch controls for mobile
 */
function setupTouchControls(container: HTMLElement) {
    // Create touch control overlay
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'touch-controls';
    controlsDiv.innerHTML = `
        <style>
            #touch-controls {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: grid;
                grid-template-columns: repeat(3, 60px);
                grid-template-rows: repeat(3, 60px);
                gap: 5px;
                z-index: 1000;
            }
            .touch-btn {
                width: 60px;
                height: 60px;
                background: rgba(0, 255, 199, 0.3);
                border: 2px solid rgba(0, 255, 199, 0.6);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: white;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }
            .touch-btn:active {
                background: rgba(0, 255, 199, 0.6);
            }
            .touch-btn.empty {
                visibility: hidden;
            }
        </style>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="up">↑</div>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="left">←</div>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="right">→</div>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="down">↓</div>
        <div class="touch-btn empty"></div>
    `;
    
    document.body.appendChild(controlsDiv);
    
    // Add touch handlers
    controlsDiv.querySelectorAll('.touch-btn[data-dir]').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = (btn as HTMLElement).dataset.dir;
            if (direction) {
                import('./connection.ts').then(({sendPosMessage}) => {
                    sendPosMessage(direction);
                });
            }
        });
    });
}

/**
 * Setup handlers for game events from WebSocket
 */
function setupGameEventHandlers() {
    subscribeGameEvents({
        onPlayerMove: (spriteId: string, x: number, y: number) => {
            if (game3d) {
                game3d.updatePlayerPositionPixels(spriteId, x, y);
            }
        },
        onPelletEaten: (tileX: number, tileY: number) => {
            if (game3d) {
                game3d.removePellet(tileX, tileY);
            }
        },
        onPowerUpEaten: (tileX: number, tileY: number) => {
            if (game3d) {
                game3d.removePowerUp(tileX, tileY);
                game3d.setRunnerPoweredUp(true);
            }
        },
        onPowerUpEnd: () => {
            if (game3d) {
                game3d.setRunnerPoweredUp(false);
            }
        },
        onPlayerCaught: (runnerId: string, _chaserId: string) => {
            console.log(`Player ${runnerId} was caught!`);
            if (game3d) {
                game3d.hidePlayer(runnerId);
            }
        },
        onPlayerJoin: (spriteId: string, username: string) => {
            console.log(`Player ${username} joined as ${spriteId}`);
            if (game3d) {
                game3d.setPlayerName(spriteId, username);
            }
        },
        onPlayerLeave: (spriteId: string) => {
            console.log(`Player ${spriteId} left`);
            if (game3d) {
                game3d.hidePlayer(spriteId);
            }
        },
        onGameOver: (winner: string, scores: Record<string, number>) => {
            console.log(`Game over! Winner: ${winner}`, scores);
            stopGameTimer();
            showGameOver(winner, scores);
        },
        onScoreUpdate: (scores: Record<string, number>) => {
            updateScoreDisplay(scores);
        }
    });
}

/**
 * Show game over screen
 */
function showGameOver(winner: string, scores: Record<string, number>) {
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.innerHTML = `
        <style>
            #game-over-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                color: white;
                font-family: system-ui, sans-serif;
            }
            #game-over-overlay h1 {
                font-size: 48px;
                color: #00ffc7;
                margin-bottom: 20px;
            }
            #game-over-overlay .winner {
                font-size: 32px;
                margin-bottom: 30px;
            }
            #game-over-overlay .scores {
                font-size: 20px;
                margin-bottom: 30px;
            }
            #game-over-overlay button {
                padding: 15px 40px;
                font-size: 18px;
                background: #00ffc7;
                color: black;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            }
            #game-over-overlay button:hover {
                background: #00e6b3;
            }
        </style>
        <h1>Game Over!</h1>
        <div class="winner">Winnaar: ${winner}</div>
        <div class="scores">
            ${Object.entries(scores).map(([name, score]) => `${name}: ${score}`).join(' | ')}
        </div>
        <button onclick="window.location.href='/lobby'">Terug naar Lobby</button>
    `;
    document.body.appendChild(overlay);
}

/**
 * Update score display
 */
function updateScoreDisplay(scores: Record<string, number>) {
    let scoreDiv = document.getElementById('score-display');
    if (!scoreDiv) {
        scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        scoreDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-family: monospace;
            font-size: 16px;
            z-index: 1000;
        `;
        document.body.appendChild(scoreDiv);
    }
    
    scoreDiv.innerHTML = Object.entries(scores)
        .map(([name, score]) => `<div>${name}: ${score}</div>`)
        .join('');
}

/**
 * Game timer state
 */
let gameStartTime: number = 0;
let gameTimerInterval: ReturnType<typeof setInterval> | null = null;
const GAME_DURATION_SECONDS = 180; // 3 minutes

/**
 * Add and start game timer display
 */
function startGameTimer() {
    gameStartTime = Date.now();
    
    let timerDiv = document.getElementById('game-timer');
    if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'game-timer';
        timerDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px 25px;
            border-radius: 8px;
            color: #00ffc7;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            text-shadow: 0 0 10px rgba(0, 255, 199, 0.5);
        `;
        document.body.appendChild(timerDiv);
    }
    
    // Clear existing interval
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
    }
    
    // Update timer every 100ms for smooth display
    gameTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const remaining = Math.max(0, GAME_DURATION_SECONDS - elapsed);
        
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        
        if (timerDiv) {
            timerDiv.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when low on time
            if (remaining <= 30) {
                timerDiv.style.color = '#ff4444';
                timerDiv.style.textShadow = '0 0 10px rgba(255, 68, 68, 0.8)';
            } else if (remaining <= 60) {
                timerDiv.style.color = '#ffaa00';
                timerDiv.style.textShadow = '0 0 10px rgba(255, 170, 0, 0.5)';
            }
        }
    }, 100);
}

/**
 * Stop and hide game timer
 */
function stopGameTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    const timerDiv = document.getElementById('game-timer');
    if (timerDiv) {
        timerDiv.remove();
    }
}

/**
 * Show loading screen with progress
 */
function showLoadingScreen() {
    // Remove existing if any
    hideLoadingScreen();
    
    const overlay = document.createElement('div');
    overlay.id = 'loading-screen';
    overlay.innerHTML = `
        <style>
            #loading-screen {
                position: fixed;
                inset: 0;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 3000;
                color: white;
                font-family: system-ui, sans-serif;
            }
            #loading-screen .title {
                font-size: 48px;
                font-weight: bold;
                color: #00ffc7;
                text-shadow: 0 0 20px rgba(0, 255, 199, 0.5);
                margin-bottom: 40px;
            }
            #loading-screen .progress-container {
                width: 300px;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 20px;
            }
            #loading-screen .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #00ffc7, #00b3ff);
                border-radius: 4px;
                width: 0%;
                transition: width 0.3s ease;
            }
            #loading-screen .status {
                font-size: 16px;
                color: rgba(255, 255, 255, 0.7);
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            #loading-screen .dots {
                animation: pulse 1.5s ease-in-out infinite;
            }
        </style>
        <div class="title">MazeChase 3D</div>
        <div class="progress-container">
            <div class="progress-bar" id="loading-progress-bar"></div>
        </div>
        <div class="status" id="loading-status">Loading<span class="dots">...</span></div>
    `;
    document.body.appendChild(overlay);
}

/**
 * Update loading progress
 */
function updateLoadingProgress(percent: number, status: string) {
    const progressBar = document.getElementById('loading-progress-bar');
    const statusEl = document.getElementById('loading-status');
    
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
    if (statusEl) {
        statusEl.textContent = status;
    }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const overlay = document.getElementById('loading-screen');
    if (overlay) {
        // Fade out animation
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

/**
 * Show countdown number
 */
function showCountdown(count: number) {
    let overlay = document.getElementById('countdown-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        overlay.innerHTML = `
            <style>
                #countdown-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2500;
                    pointer-events: none;
                }
                #countdown-number {
                    font-size: 180px;
                    font-weight: bold;
                    color: #00ffc7;
                    text-shadow: 0 0 50px rgba(0, 255, 199, 0.8),
                                 0 0 100px rgba(0, 255, 199, 0.4);
                    animation: countdownPulse 0.5s ease-out;
                }
                @keyframes countdownPulse {
                    0% {
                        transform: scale(2);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            </style>
            <div id="countdown-number">3</div>
        `;
        document.body.appendChild(overlay);
    }
    
    const numberEl = document.getElementById('countdown-number');
    if (numberEl) {
        const displayText = count === 0 ? 'GO!' : count.toString();
        numberEl.textContent = displayText;
        numberEl.style.color = count === 0 ? '#ffff00' : '#00ffc7';
        
        // Re-trigger animation
        numberEl.style.animation = 'none';
        numberEl.offsetHeight; // Trigger reflow
        numberEl.style.animation = 'countdownPulse 0.5s ease-out';
    }
}

/**
 * Hide countdown overlay
 */
function hideCountdown() {
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

/**
 * Add FPS counter for debugging
 */
function addFPSCounter() {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fps-counter';
    fpsDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 12px;
        border-radius: 6px;
        color: #00ff00;
        font-family: monospace;
        font-size: 14px;
        z-index: 1000;
    `;
    document.body.appendChild(fpsDiv);
    
    setInterval(() => {
        if (game3d) {
            const fps = game3d.getEngine().getFPS().toFixed(0);
            fpsDiv.textContent = `FPS: ${fps}`;
        }
    }, 250);
}

/**
 * Get the current game instance
 */
export function getGame3D(): Game3DScene | null {
    return game3d;
}

// Start the game
initGame().then(() => {
    console.log("Game initialized!");
}).catch(err => {
    console.error(err);
    showError(err.message || "Er ging iets mis");
});
