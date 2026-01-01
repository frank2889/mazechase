/**
 * Main Game Initializer - 3D Only
 * 
 * MazeChase 3D using Babylon.js
 */

import {connectToWebSocket, waitForGameState, subscribeLobbyState, subscribeGameEvents, getSpriteID, closeConnection, onConnectionStatus} from "./connection.ts";
import {showError} from "./utils.ts";
import {getUserInfo} from "../auth.ts";
import {mountWaitingRoom, unmountWaitingRoom} from "./waiting-room.tsx";
import type { Game3DScene } from "../game3d/scene";
import { initAnalytics, trackSessionStart, trackGameStart, trackGameEnd, trackReplay, trackDropOff } from "./analytics";
import { initDopamineAudio, playPelletSound, playPowerUpSound, playStreakSound, playVictorySound, playGameOverSound, playCountdownBeep, disposeDopamineAudio, updateChaserProximity, stopChaserWarning, playChaserDangerSound } from "./dopamine-audio";

// Global game instance
let game3d: Game3DScene | null = null;
let isGameCleanedUp = false;

/**
 * Clean up game resources - prevents visual corruption on browser back
 */
function cleanupGame() {
    if (isGameCleanedUp) return;
    isGameCleanedUp = true;
    
    console.log('Cleaning up game resources...');
    
    // Dispose 3D scene
    if (game3d) {
        try {
            game3d.dispose();
        } catch (e) {
            console.warn('Error disposing game3d:', e);
        }
        game3d = null;
    }
    
    // Close WebSocket connection
    try {
        closeConnection();
    } catch (e) {
        console.warn('Error closing connection:', e);
    }
    
    // Dispose audio
    try {
        disposeDopamineAudio();
    } catch (e) {
        console.warn('Error disposing audio:', e);
    }
    
    // Track drop off
    trackDropOff('navigation');
    
    console.log('Game cleanup complete');
}

/**
 * Setup navigation event handlers for proper cleanup
 */
function setupNavigationHandlers() {
    // Handle page unload (refresh, close tab)
    window.addEventListener('beforeunload', () => {
        cleanupGame();
    });
    
    // Handle browser back/forward button
    window.addEventListener('popstate', () => {
        cleanupGame();
    });
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game3d) {
            // Pause game rendering when tab is hidden
            game3d.pauseRendering?.();
        } else if (!document.hidden && game3d) {
            // Resume when tab is visible
            game3d.resumeRendering?.();
        }
    });
    
    // Handle page hide event (more reliable on mobile)
    window.addEventListener('pagehide', () => {
        cleanupGame();
    });
}

// Check if user is logged in before starting game
async function checkAuth() {
    try {
        const username = await getUserInfo();
        if (!username) {
            window.location.href = '/auth/login';
            throw new Error('Not logged in');
        }
        
        // Initialize analytics on auth
        initAnalytics();
        trackSessionStart(username);
        
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
    // Reset cleanup flag for new game
    isGameCleanedUp = false;
    
    // Setup navigation handlers for proper cleanup
    setupNavigationHandlers();
    
    // Check user is logged in with real account
    await checkAuth();
    
    // Check if this is a solo game
    const params = new URLSearchParams(window.location.search);
    const isSoloGame = params.get('single') === 'true';
    
    connectToWebSocket();
    
    if (isSoloGame) {
        // Solo mode: skip waiting room, start game immediately
        console.log("Solo mode: starting game immediately");
        
        // Connect to WebSocket but don't wait for state
        // The server may not send state until we start the game
        
        // Start 3D game immediately (the game will work without initial state)
        await start3DGame();
        
        // Send start game command after a short delay to trigger bots and game loop
        setTimeout(() => {
            import('./connection.ts').then(({sendStartGame}) => {
                console.log("Solo mode: sending startGame command");
                sendStartGame();
            });
        }, 1000);
        
        // Still subscribe to handle countdown display if server sends it
        subscribeLobbyState((state) => {
            if (state.countdown !== null) {
                showCountdown(state.countdown);
            } else {
                hideCountdown();
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
        
        // Initialize audio system on first user interaction
        const { initAudio, playSound } = await import('./audio');
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
        
        // Initialize dopamine audio (Tone.js) on interaction
        document.addEventListener('click', initDopamineAudio, { once: true });
        document.addEventListener('keydown', initDopamineAudio, { once: true });
        document.addEventListener('touchstart', initDopamineAudio, { once: true });
        
        // Track game start
        const currentSprite = getSpriteID();
        const playerRole = currentSprite === 'runner' ? 'runner' : 'chaser';
        const params = new URLSearchParams(window.location.search);
        const isSoloGame = params.get('single') === 'true';
        trackGameStart(isSoloGame ? 'solo' : 'multiplayer', playerRole);
        
        // Play game start sound
        playSound('game_start');
        
        // Subscribe to game events from server
        setupGameEventHandlers();
        
        // Add audio toggle button
        addAudioToggle();
        
        // Add help button for tutorial
        addHelpButton();
        
        // Add FPS counter for debugging
        addFPSCounter();
        
        // Setup connection status UI for reconnect feedback
        setupConnectionStatusUI();
        
        // Start game timer
        startGameTimer();
        
        // Hide loading screen
        updateLoadingProgress(100, 'Ready!');
        hideLoadingScreen();
        
        // Show tutorial for first-time players
        if (!hasTutorialBeenSeen()) {
            showTutorial(() => {
                // After tutorial closes, show role tip and start rendering
                const mySprite = getSpriteID();
                if (mySprite) {
                    const role = mySprite === 'runner' ? 'runner' : 'chaser';
                    addRoleIndicator(role);
                    showRoleTip(role);
                }
            });
        } else {
            // Show role indicator for returning players
            const mySprite = getSpriteID();
            if (mySprite) {
                const role = mySprite === 'runner' ? 'runner' : 'chaser';
                addRoleIndicator(role);
            }
        }
        
        // Start rendering
        game3d.start();
        
        // Store globally for debugging
        (window as any).game3d = game3d;
        
        console.log("MazeChase 3D started successfully!");
        
    } catch (error) {
        const err = error as Error;
        console.error("Failed to start 3D game:", err.message, err.stack);
        hideLoadingScreen();
        showError("Kon 3D game niet starten: " + err.message);
    }
}

/**
 * Setup keyboard input for 3D game with continuous movement
 */
function setupKeyboardInput(canvas: HTMLCanvasElement) {
    canvas.tabIndex = 1;
    canvas.focus();
    
    let currentDirection: string | null = null;
    let moveInterval: ReturnType<typeof setInterval> | null = null;
    let lastDirectionChange = 0;
    const MOVE_RATE_MS = 50; // Send movement every 50ms for smooth continuous movement
    const DIRECTION_CHANGE_DEBOUNCE_MS = 16; // ~60fps debounce for rapid direction changes
    
    function startMoving(direction: string) {
        // Debounce rapid direction changes to prevent lag
        const now = performance.now();
        if (direction === currentDirection && (now - lastDirectionChange) < DIRECTION_CHANGE_DEBOUNCE_MS) {
            return; // Skip duplicate direction within debounce window
        }
        
        currentDirection = direction;
        lastDirectionChange = now;
        
        // Send immediately
        import('./connection.ts').then(({sendPosMessage}) => {
            sendPosMessage(direction);
        });
        
        // Then continue sending at interval
        if (moveInterval) {
            clearInterval(moveInterval);
        }
        moveInterval = setInterval(() => {
            if (currentDirection) {
                import('./connection.ts').then(({sendPosMessage}) => {
                    sendPosMessage(currentDirection!);
                });
            }
        }, MOVE_RATE_MS);
    }
    
    function stopMoving() {
        currentDirection = null;
        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
        }
    }
    
    const keyToDirection: Record<string, string> = {
        'ArrowUp': 'up',
        'w': 'up',
        'W': 'up',
        'ArrowDown': 'down',
        's': 'down',
        'S': 'down',
        'ArrowLeft': 'left',
        'a': 'left',
        'A': 'left',
        'ArrowRight': 'right',
        'd': 'right',
        'D': 'right'
    };
    
    const activeKeys = new Set<string>();
    
    document.addEventListener('keydown', (e) => {
        if (!game3d) return;
        
        const direction = keyToDirection[e.key];
        if (direction) {
            e.preventDefault();
            activeKeys.add(e.key);
            startMoving(direction);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (!game3d) return;
        
        const direction = keyToDirection[e.key];
        if (direction) {
            activeKeys.delete(e.key);
            
            // Check if any other direction key is still held
            for (const key of activeKeys) {
                const otherDir = keyToDirection[key];
                if (otherDir) {
                    startMoving(otherDir);
                    return;
                }
            }
            
            // No keys held, stop moving
            stopMoving();
        }
    });
    
    // Stop on blur
    window.addEventListener('blur', stopMoving);
}

/**
 * Setup touch controls for mobile with continuous movement
 */
function setupTouchControls(container: HTMLElement) {
    let touchDirection: string | null = null;
    let touchMoveInterval: ReturnType<typeof setInterval> | null = null;
    const TOUCH_MOVE_RATE_MS = 50;
    
    function startTouchMoving(direction: string) {
        touchDirection = direction;
        
        // Send immediately
        import('./connection.ts').then(({sendPosMessage}) => {
            sendPosMessage(direction);
        });
        
        // Then continue sending at interval
        if (touchMoveInterval) {
            clearInterval(touchMoveInterval);
        }
        touchMoveInterval = setInterval(() => {
            if (touchDirection) {
                import('./connection.ts').then(({sendPosMessage}) => {
                    sendPosMessage(touchDirection!);
                });
            }
        }, TOUCH_MOVE_RATE_MS);
    }
    
    function stopTouchMoving() {
        touchDirection = null;
        if (touchMoveInterval) {
            clearInterval(touchMoveInterval);
            touchMoveInterval = null;
        }
    }
    
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
                grid-template-columns: repeat(3, 70px);
                grid-template-rows: repeat(3, 70px);
                gap: 8px;
                z-index: 1000;
            }
            .touch-btn {
                width: 70px;
                height: 70px;
                background: rgba(0, 255, 199, 0.3);
                border: 2px solid rgba(0, 255, 199, 0.6);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                color: white;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                transition: background 0.1s;
            }
            .touch-btn.active {
                background: rgba(0, 255, 199, 0.7);
                transform: scale(0.95);
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
    
    // Add touch handlers with continuous movement
    controlsDiv.querySelectorAll('.touch-btn[data-dir]').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = (btn as HTMLElement).dataset.dir;
            if (direction) {
                btn.classList.add('active');
                startTouchMoving(direction);
            }
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            stopTouchMoving();
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            stopTouchMoving();
        });
    });
    
    // Also stop on any touchend outside buttons
    document.addEventListener('touchend', () => {
        controlsDiv.querySelectorAll('.touch-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    });
}

/**
 * Setup handlers for game events from WebSocket
 */
function setupGameEventHandlers() {
    // Track pellet streaks for dopamine audio
    let pelletStreak = 0;
    let lastPelletTime = Date.now();
    
    // Sprint 4: Track player positions for spatial audio
    const playerPositions: Map<string, { x: number; y: number }> = new Map();
    let mySprite: string | null = null;
    
    // Get my sprite type for audio calculations
    const mySpriteId = getSpriteID();
    if (mySpriteId) {
        mySprite = mySpriteId;
    }
    
    // Import audio functions
    import('./audio').then(({ playSound }) => {
        subscribeGameEvents({
            onPlayerMove: (spriteId: string, x: number, y: number) => {
                if (game3d) {
                    game3d.updatePlayerPositionPixels(spriteId, x, y);
                }
                
                // Sprint 4: Track positions for spatial audio
                playerPositions.set(spriteId, { x, y });
                
                // If I'm the runner, calculate chaser proximity
                if (mySprite === 'runner' && spriteId.startsWith('ch')) {
                    const runnerPos = playerPositions.get('runner');
                    if (runnerPos) {
                        // Find closest chaser
                        let closestDist = Infinity;
                        let closestRelX = 0;
                        let closestRelZ = 0;
                        
                        for (const [id, pos] of playerPositions) {
                            if (id.startsWith('ch')) {
                                const dx = pos.x - runnerPos.x;
                                const dy = pos.y - runnerPos.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < closestDist) {
                                    closestDist = dist;
                                    closestRelX = dx;
                                    closestRelZ = dy;
                                }
                            }
                        }
                        
                        // Normalize to 0-1 range (300 pixels = max warning range)
                        const normalizedDist = Math.min(closestDist / 300, 1);
                        const normalizedX = Math.max(-1, Math.min(1, closestRelX / 300));
                        const normalizedZ = Math.max(-1, Math.min(1, closestRelZ / 300));
                        
                        // Update spatial audio
                        updateChaserProximity(normalizedX, normalizedZ, normalizedDist);
                        
                        // Play danger sting when very close
                        if (normalizedDist < 0.15) {
                            playChaserDangerSound();
                        }
                    }
                }
            },
            onPelletEaten: (tileX: number, tileY: number) => {
                if (game3d) {
                    game3d.removePellet(tileX, tileY);
                }
                playSound('chomp');
                
                // Dopamine audio: rising pitch for streaks
                playPelletSound();
                
                // Track streak for bonus sound
                const now = Date.now();
                if (now - lastPelletTime < 500) {
                    pelletStreak++;
                    if (pelletStreak > 0 && pelletStreak % 5 === 0) {
                        playStreakSound(Math.floor(pelletStreak / 5));
                    }
                } else {
                    pelletStreak = 1;
                }
                lastPelletTime = now;
            },
            onPowerUpEaten: (tileX: number, tileY: number, duration?: number) => {
                if (game3d) {
                    game3d.removePowerUp(tileX, tileY);
                    game3d.setRunnerPoweredUp(true);
                }
                showPowerUpTimer(duration || 8);
                playSound('power_pellet');
                
                // Dopamine audio: synth burst for power-up
                playPowerUpSound();
            },
            onPowerUpEnd: () => {
                if (game3d) {
                    game3d.setRunnerPoweredUp(false);
                }
                hidePowerUpTimer();
            },
            onPlayerCaught: (runnerId: string, _chaserId: string) => {
                console.log(`Player ${runnerId} was caught!`);
                if (game3d) {
                    game3d.hidePlayer(runnerId);
                }
                playSound('death');
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
                
                // Play appropriate dopamine sound
                const mySprite = getSpriteID();
                const isWinner = mySprite === winner || 
                    (winner === 'runners' && mySprite === 'runner') ||
                    (winner === 'chasers' && mySprite !== 'runner');
                if (isWinner) {
                    playVictorySound();
                } else {
                    playGameOverSound();
                }
                
                // Track game end for analytics
                const gameDuration = getGameDuration();
                trackGameEnd(winner, scores, gameDuration);
            },
            onScoreUpdate: (scores: Record<string, number>) => {
                updateScoreDisplay(scores);
            },
            
            // Dynamic world event handlers
            onPhaseChange: (phase: string, zones) => {
                console.log(`Phase changed to: ${phase}`);
                if (game3d) {
                    game3d.onPhaseChange(phase, zones);
                }
                updatePhaseUI(phase);
            },
            onPhaseUpdate: (phase: string, progress: number) => {
                if (game3d) {
                    game3d.onPhaseUpdate(phase, progress);
                }
                updatePhaseProgressUI(phase, progress);
            },
            onMazeUpdate: (update) => {
                console.log('Maze update:', update);
                if (game3d) {
                    game3d.onMazeUpdate(update);
                }
            },
            onEntitiesUpdate: (entities) => {
                if (game3d) {
                    game3d.onEntitiesUpdate(entities);
                }
            },
            onEntityNear: (entityId: string, warning: boolean) => {
                if (warning) {
                    showEntityWarning(entityId);
                }
            },
            onEntityCollision: (entityId: string, entityType: string, caught: boolean) => {
                console.log(`Entity collision: ${entityId} (${entityType}), caught: ${caught}`);
                if (caught) {
                    showCaughtByEntity(entityType);
                }
            },
            onDynamicStateSync: (state) => {
                console.log('Dynamic state sync:', state);
                if (game3d) {
                    game3d.initDynamicState(state);
                }
            }
        });
    });
}

/**
 * Add audio toggle button to UI
 */
function addAudioToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'audio-toggle';
    toggleBtn.innerHTML = '🔊';
    toggleBtn.title = 'Toggle Audio';
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(0, 255, 199, 0.5);
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.2s;
    `;
    
    toggleBtn.addEventListener('click', () => {
        import('./audio').then(({ toggleAudio }) => {
            const enabled = toggleAudio();
            toggleBtn.innerHTML = enabled ? '🔊' : '🔇';
            toggleBtn.style.opacity = enabled ? '1' : '0.5';
        });
    });
    
    document.body.appendChild(toggleBtn);
}

/**
 * Show game over screen
 */
function showGameOver(winner: string, scores: Record<string, number>) {
    const spriteNames: Record<string, string> = {
        'runner': '🟡 Runner',
        'ch0': '🔴 Chaser 1',
        'ch1': '🟣 Chaser 2', 
        'ch2': '🟢 Chaser 3',
        'Chasers': '� Chasers',
        'Runner': '🟡 Runner'
    };
    
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    
    // Sort scores by value descending
    const sortedScores = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([name, score], index) => {
            const displayName = spriteNames[name] || name;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            return `<div class="score-row">${medal} ${displayName}: <span class="score-value">${score}</span></div>`;
        })
        .join('');
    
    const winnerDisplay = spriteNames[winner] || winner;
    
    overlay.innerHTML = `
        <style>
            #game-over-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                color: white;
                font-family: system-ui, sans-serif;
                animation: fadeIn 0.5s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            #game-over-overlay h1 {
                font-size: 56px;
                color: #00ffc7;
                margin-bottom: 10px;
                text-shadow: 0 0 30px rgba(0, 255, 199, 0.5);
            }
            #game-over-overlay .winner {
                font-size: 28px;
                margin-bottom: 30px;
                padding: 10px 30px;
                background: rgba(0, 255, 199, 0.2);
                border-radius: 20px;
                border: 2px solid #00ffc7;
            }
            #game-over-overlay .scores-container {
                background: rgba(0, 0, 0, 0.5);
                padding: 20px 40px;
                border-radius: 12px;
                margin-bottom: 30px;
                min-width: 250px;
            }
            #game-over-overlay .score-row {
                font-size: 20px;
                margin: 10px 0;
                display: flex;
                justify-content: space-between;
                gap: 20px;
            }
            #game-over-overlay .score-value {
                color: #00ffc7;
                font-weight: bold;
            }
            #game-over-overlay .buttons {
                display: flex;
                gap: 15px;
            }
            #game-over-overlay button {
                padding: 15px 40px;
                font-size: 18px;
                background: #00ffc7;
                color: black;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
            }
            #game-over-overlay button:hover {
                background: #00e6b3;
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(0, 255, 199, 0.4);
            }
            #game-over-overlay button.secondary {
                background: transparent;
                color: #00ffc7;
                border: 2px solid #00ffc7;
            }
            #game-over-overlay button.secondary:hover {
                background: rgba(0, 255, 199, 0.2);
            }
        </style>
        <h1>🎮 Game Over!</h1>
        <div class="winner">🏆 Winner: ${winnerDisplay}</div>
        <div class="scores-container">
            ${sortedScores || '<div class="score-row">No scores available</div>'}
        </div>
        <div class="buttons">
            <button id="play-again-btn">🔄 Play Again</button>
            <button class="secondary" id="lobby-btn">🏠 Lobby</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Add event listeners with analytics tracking
    document.getElementById('play-again-btn')?.addEventListener('click', () => {
        trackReplay();
        window.location.reload();
    });
    document.getElementById('lobby-btn')?.addEventListener('click', () => {
        trackDropOff('back_to_lobby');
        window.location.href = '/lobby';
    });
}

/**
 * Update score display
 */
function updateScoreDisplay(scores: Record<string, number>) {
    const spriteNames: Record<string, string> = {
        'runner': '🟡 Runner',
        'ch0': '🔴 Chaser 1',
        'ch1': '🟣 Chaser 2', 
        'ch2': '🟢 Chaser 3'
    };
    
    let scoreDiv = document.getElementById('score-display');
    if (!scoreDiv) {
        scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        scoreDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 20px;
            border-radius: 10px;
            border: 1px solid rgba(0, 255, 199, 0.3);
            color: white;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            z-index: 1000;
            min-width: 150px;
        `;
        document.body.appendChild(scoreDiv);
    }
    
    scoreDiv.innerHTML = `<div style="color:#00ffc7;margin-bottom:8px;font-weight:bold;">SCORE</div>` +
        Object.entries(scores)
            .map(([name, score]) => {
                const displayName = spriteNames[name] || name;
                return `<div style="margin:4px 0;">${displayName}: <span style="color:#00ffc7">${score}</span></div>`;
            })
            .join('');
}

/**
 * Game timer state
 */
let gameStartTime: number = 0;
let gameTimerInterval: ReturnType<typeof setInterval> | null = null;
const GAME_DURATION_SECONDS = 180; // 3 minutes

/**
 * Get how long the game has been running in seconds
 */
function getGameDuration(): number {
    if (gameStartTime === 0) return 0;
    return Math.floor((Date.now() - gameStartTime) / 1000);
}

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

// ========================================
// Tutorial & Help System
// ========================================

const TUTORIAL_STORAGE_KEY = 'mazechase_tutorial_seen';

/**
 * Check if tutorial has been seen before
 */
function hasTutorialBeenSeen(): boolean {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
}

/**
 * Mark tutorial as seen
 */
function markTutorialAsSeen() {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
}

/**
 * Show the tutorial overlay - explains the game clearly
 */
export function showTutorial(onClose?: () => void) {
    // Remove any existing tutorial
    hideTutorial();
    
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
        <style>
            #tutorial-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.92);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 4000;
                padding: 20px;
            }
            .tutorial-container {
                background: linear-gradient(135deg, #1a1a3a 0%, #0d0d20 100%);
                border: 2px solid #00ffc7;
                border-radius: 20px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                padding: 30px;
                box-shadow: 0 0 60px rgba(0, 255, 199, 0.3);
            }
            .tutorial-header {
                text-align: center;
                margin-bottom: 30px;
            }
            .tutorial-title {
                font-size: 36px;
                font-weight: bold;
                color: #00ffc7;
                margin-bottom: 10px;
                text-shadow: 0 0 20px rgba(0, 255, 199, 0.5);
            }
            .tutorial-subtitle {
                color: #888;
                font-size: 16px;
            }
            .tutorial-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .section-title {
                font-size: 20px;
                font-weight: bold;
                color: #fff;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .section-title .icon {
                font-size: 28px;
            }
            .tutorial-text {
                color: #ccc;
                line-height: 1.6;
                margin-bottom: 10px;
            }
            .role-cards {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
            }
            @media (max-width: 600px) {
                .role-cards { grid-template-columns: 1fr; }
            }
            .role-card {
                padding: 15px;
                border-radius: 10px;
                text-align: center;
            }
            .role-card.runner {
                background: linear-gradient(135deg, #ffdd00 0%, #ff9900 100%);
                color: #000;
            }
            .role-card.chaser {
                background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
                color: #fff;
            }
            .role-icon {
                font-size: 40px;
                margin-bottom: 10px;
            }
            .role-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .role-desc {
                font-size: 14px;
                opacity: 0.9;
            }
            .controls-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-top: 15px;
            }
            @media (max-width: 500px) {
                .controls-grid { grid-template-columns: 1fr; }
            }
            .control-item {
                background: rgba(0, 255, 199, 0.1);
                border: 1px solid rgba(0, 255, 199, 0.3);
                border-radius: 8px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .control-keys {
                display: flex;
                gap: 4px;
            }
            .key {
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 4px 8px;
                font-family: monospace;
                color: #fff;
                font-size: 12px;
                min-width: 24px;
                text-align: center;
            }
            .control-action {
                color: #ccc;
                font-size: 14px;
            }
            .tips-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .tips-list li {
                padding: 8px 0;
                color: #ccc;
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }
            .tips-list li::before {
                content: "💡";
            }
            .tutorial-footer {
                text-align: center;
                margin-top: 20px;
            }
            .start-btn {
                background: linear-gradient(135deg, #00ffc7 0%, #00b3ff 100%);
                color: #000;
                border: none;
                padding: 15px 50px;
                font-size: 18px;
                font-weight: bold;
                border-radius: 30px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .start-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 0 30px rgba(0, 255, 199, 0.5);
            }
            .skip-text {
                margin-top: 15px;
                color: #666;
                font-size: 14px;
            }
            .skip-text a {
                color: #00ffc7;
                cursor: pointer;
                text-decoration: underline;
            }
        </style>
        <div class="tutorial-container">
            <div class="tutorial-header">
                <div class="tutorial-title">🎮 MazeChase</div>
                <div class="tutorial-subtitle">Ready in 10 seconds</div>
            </div>
            
            <div class="tutorial-section">
                <div class="section-title">
                    <span class="icon">🎯</span>
                    How to Play
                </div>
                <div class="role-cards">
                    <div class="role-card runner">
                        <div class="role-icon">🟡</div>
                        <div class="role-name">Runner</div>
                        <div class="role-desc">
                            Collect pellets. Grab power-ups to catch Chasers!
                        </div>
                    </div>
                    <div class="role-card chaser">
                        <div class="role-icon">🔴</div>
                        <div class="role-name">Chasers</div>
                        <div class="role-desc">
                            Catch the Runner before time runs out!
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tutorial-section">
                <div class="section-title">
                    <span class="icon">🕹️</span>
                    Controls
                </div>
                <div class="controls-grid">
                    <div class="control-item">
                        <div class="control-keys">
                            <span class="key">W</span>
                            <span class="key">A</span>
                            <span class="key">S</span>
                            <span class="key">D</span>
                        </div>
                        <span class="control-action">Move</span>
                    </div>
                    <div class="control-item">
                        <div class="control-keys">
                            <span class="key">↑</span>
                            <span class="key">←</span>
                            <span class="key">↓</span>
                            <span class="key">→</span>
                        </div>
                        <span class="control-action">Move</span>
                    </div>
                </div>
                <p class="tutorial-text" style="margin-top: 15px; font-style: italic;">
                    📱 Mobile: use on-screen buttons
                </p>
            </div>
            
            <div class="tutorial-footer">
                <button class="start-btn" id="tutorial-start-btn">🎮 PLAY!</button>
                <div class="skip-text">
                    <a id="tutorial-skip-link">Don't show again</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event listeners
    const startBtn = document.getElementById('tutorial-start-btn');
    const skipLink = document.getElementById('tutorial-skip-link');
    
    startBtn?.addEventListener('click', () => {
        hideTutorial();
        if (onClose) onClose();
    });
    
    skipLink?.addEventListener('click', () => {
        markTutorialAsSeen();
        hideTutorial();
        if (onClose) onClose();
    });
    
    // Close on escape
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            hideTutorial();
            if (onClose) onClose();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Hide tutorial overlay
 */
function hideTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Add help button to show tutorial anytime
 */
function addHelpButton() {
    const btn = document.createElement('button');
    btn.id = 'help-btn';
    btn.innerHTML = '❓';
    btn.title = 'How to play';
    btn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.6);
        color: white;
        font-size: 20px;
        cursor: pointer;
        z-index: 1500;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        backdrop-filter: blur(4px);
    `;
    
    btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(0, 255, 199, 0.3)';
        btn.style.borderColor = '#00ffc7';
        btn.style.transform = 'scale(1.1)';
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(0, 0, 0, 0.6)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        btn.style.transform = 'scale(1)';
    });
    
    btn.addEventListener('click', () => {
        showTutorial();
    });
    
    document.body.appendChild(btn);
}

/**
 * Show quick tips during gameplay
 */
function showQuickTip(message: string, duration: number = 3000) {
    // Remove existing tip
    const existingTip = document.getElementById('quick-tip');
    if (existingTip) existingTip.remove();
    
    const tip = document.createElement('div');
    tip.id = 'quick-tip';
    tip.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #00ffc7;
        border-radius: 10px;
        padding: 12px 24px;
        color: white;
        font-size: 16px;
        z-index: 1500;
        animation: tipSlideIn 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    tip.innerHTML = `
        <style>
            @keyframes tipSlideIn {
                from { opacity: 0; transform: translate(-50%, -20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes tipFadeOut {
                from { opacity: 1; }
                to { opacity: 0; transform: translate(-50%, -10px); }
            }
        </style>
        💡 ${message}
    `;
    
    document.body.appendChild(tip);
    
    setTimeout(() => {
        tip.style.animation = 'tipFadeOut 0.3s ease forwards';
        setTimeout(() => tip.remove(), 300);
    }, duration);
}

/**
 * Show contextual tips based on player role
 */
function showRoleTip(role: string) {
    if (role === 'runner') {
        showQuickTip('You are the Runner! 🏃 Collect pellets and escape the Chasers!', 4000);
    } else {
        showQuickTip('You are a Chaser! 🔴 Catch the Runner before time runs out!', 4000);
    }
}

/**
 * Add add role indicator UI
 */
function addRoleIndicator(role: string) {
    // Remove existing
    const existing = document.getElementById('role-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'role-indicator';
    const isRunner = role === 'runner';
    
    indicator.innerHTML = `
        <style>
            #role-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 16px;
                z-index: 1500;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: roleSlideIn 0.5s ease;
            }
            @keyframes roleSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            .role-indicator-runner {
                background: linear-gradient(135deg, #ffdd00 0%, #ff9900 100%);
                color: #000;
                box-shadow: 0 0 20px rgba(255, 221, 0, 0.5);
            }
            .role-indicator-chaser {
                background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
                color: #fff;
                box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
            }
        </style>
        <span>${isRunner ? '🏃' : '👻'}</span>
        <span>Je bent ${isRunner ? 'de Runner' : 'een Chaser'}</span>
    `;
    indicator.className = isRunner ? 'role-indicator-runner' : 'role-indicator-chaser';
    
    document.body.appendChild(indicator);
    
    // Fade out after 5 seconds
    setTimeout(() => {
        indicator.style.transition = 'opacity 1s ease';
        indicator.style.opacity = '0.3';
    }, 5000);
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
 * Add connection status overlay for reconnection feedback
 */
function setupConnectionStatusUI() {
    let overlay: HTMLDivElement | null = null;
    
    function createOverlay() {
        if (overlay) return overlay;
        
        overlay = document.createElement('div');
        overlay.id = 'connection-status-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #4ecdc4;
                border-radius: 16px;
                padding: 32px 48px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(78, 205, 196, 0.3);
            ">
                <div class="spinner" style="
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(78, 205, 196, 0.2);
                    border-top-color: #4ecdc4;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <div id="connection-status-text" style="
                    color: #fff;
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 8px;
                ">Verbinding herstellen...</div>
                <div id="connection-attempt-text" style="
                    color: #a0a0a0;
                    font-size: 14px;
                "></div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }
    
    function showOverlay(attempt?: number) {
        const el = createOverlay();
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        
        const attemptText = document.getElementById('connection-attempt-text');
        if (attemptText && attempt) {
            attemptText.textContent = `Poging ${attempt} van 5...`;
        }
    }
    
    function hideOverlay() {
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
        }
    }
    
    function showReconnectedToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #00c851 0%, #007e33 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10001;
            animation: slideDown 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
            box-shadow: 0 4px 12px rgba(0, 200, 81, 0.4);
        `;
        toast.textContent = '✓ Verbinding hersteld!';
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes fadeOut {
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 3000);
    }
    
    // Subscribe to connection status changes
    onConnectionStatus((status, attempt) => {
        switch (status) {
            case 'reconnecting':
                showOverlay(attempt);
                break;
            case 'reconnected':
                hideOverlay();
                showReconnectedToast();
                break;
            case 'disconnected':
                hideOverlay();
                break;
            case 'connected':
                hideOverlay();
                break;
        }
    });
}

// ========================================
// Dynamic World UI Functions
// ========================================

/**
 * Update the phase indicator UI
 */
function updatePhaseUI(phase: string) {
    let phaseIndicator = document.getElementById('phase-indicator');
    
    if (!phaseIndicator) {
        phaseIndicator = document.createElement('div');
        phaseIndicator.id = 'phase-indicator';
        phaseIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 25px;
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 16px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.5s ease;
        `;
        document.body.appendChild(phaseIndicator);
    }
    
    const phaseConfig: Record<string, { icon: string; color: string; name: string }> = {
        day: { icon: '☀️', color: '#FFD700', name: 'DAG' },
        dusk: { icon: '🌅', color: '#FF6B35', name: 'SCHEMERING' },
        night: { icon: '🌙', color: '#4B0082', name: 'NACHT' },
        dawn: { icon: '🌄', color: '#FF9F1C', name: 'DAGERAAD' }
    };
    
    const config = phaseConfig[phase] || phaseConfig.day;
    
    phaseIndicator.innerHTML = `
        <span style="font-size: 24px">${config.icon}</span>
        <span style="color: ${config.color}; font-weight: bold">${config.name}</span>
        <div id="phase-progress" style="
            width: 100px;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            overflow: hidden;
        ">
            <div id="phase-progress-bar" style="
                width: 0%;
                height: 100%;
                background: ${config.color};
                transition: width 0.5s ease;
            "></div>
        </div>
    `;
    
    // Flash animation on phase change
    phaseIndicator.style.animation = 'none';
    phaseIndicator.offsetHeight;
    phaseIndicator.style.animation = 'phaseFlash 0.5s ease';
}

/**
 * Update phase progress bar
 */
function updatePhaseProgressUI(_phase: string, progress: number) {
    const progressBar = document.getElementById('phase-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
    }
}

/**
 * Show warning when entity is near
 */
function showEntityWarning(entityId: string) {
    // Play warning sound
    import('./audio').then(({ playSound }) => {
        playSound('siren');
    });
    
    let warning = document.getElementById('entity-warning');
    
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'entity-warning';
        warning.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 50, 50, 0.9);
            padding: 15px 30px;
            border-radius: 10px;
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 18px;
            font-weight: bold;
            z-index: 1500;
            animation: warningPulse 0.5s ease-in-out infinite;
        `;
        document.body.appendChild(warning);
        
        // Add animation style
        if (!document.getElementById('warning-style')) {
            const style = document.createElement('style');
            style.id = 'warning-style';
            style.textContent = `
                @keyframes warningPulse {
                    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
                }
                @keyframes phaseFlash {
                    0% { transform: translateX(-50%) scale(1.1); }
                    100% { transform: translateX(-50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    warning.textContent = '⚠️ GEVAAR NABIJ!';
    warning.style.display = 'block';
    
    // Hide after a short time
    setTimeout(() => {
        if (warning) {
            warning.style.display = 'none';
        }
    }, 1500);
}

/**
 * Show caught by entity screen
 */
function showCaughtByEntity(entityType: string) {
    const entityNames: Record<string, string> = {
        hunter: 'Hunter',
        scanner: 'Scanner', 
        sweeper: 'Sweeper'
    };
    
    const entityColors: Record<string, string> = {
        hunter: '#ff3333',
        scanner: '#ffaa00',
        sweeper: '#aa33ff'
    };
    
    const overlay = document.createElement('div');
    overlay.id = 'caught-overlay';
    overlay.innerHTML = `
        <style>
            #caught-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                color: white;
                font-family: system-ui, sans-serif;
                animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #caught-overlay h1 {
                font-size: 48px;
                color: ${entityColors[entityType] || '#ff0000'};
                margin-bottom: 20px;
                text-shadow: 0 0 20px ${entityColors[entityType] || '#ff0000'};
            }
            #caught-overlay .entity-name {
                font-size: 32px;
                margin-bottom: 30px;
                opacity: 0.8;
            }
        </style>
        <h1>💀 GEVANGEN!</h1>
        <div class="entity-name">Door een ${entityNames[entityType] || entityType}</div>
    `;
    
    document.body.appendChild(overlay);
}

// ========================================
// Zone Indicator UI (Item #31)
// ========================================

interface ZoneInfo {
    id: number;
    type: 'safe' | 'neutral' | 'danger';
    isActive: boolean;
}

let currentZone: ZoneInfo | null = null;

/**
 * Update the zone indicator based on player position
 */
export function updateZoneIndicator(zone: ZoneInfo | null) {
    if (!zone || (currentZone && currentZone.id === zone.id && currentZone.isActive === zone.isActive)) {
        return; // No change
    }
    
    // Check for zone deactivation warning (Item #32)
    if (currentZone && currentZone.type === 'safe' && currentZone.isActive && zone && !zone.isActive) {
        showZoneDeactivationWarning();
    }
    
    currentZone = zone;
    
    let indicator = document.getElementById('zone-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'zone-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(indicator);
    }
    
    const zoneConfig: Record<string, { icon: string; color: string; bg: string; name: string }> = {
        safe: { icon: '🛡️', color: '#00ff00', bg: 'rgba(0, 255, 0, 0.2)', name: 'VEILIGE ZONE' },
        neutral: { icon: '⚖️', color: '#ffff00', bg: 'rgba(255, 255, 0, 0.2)', name: 'NEUTRALE ZONE' },
        danger: { icon: '☠️', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.2)', name: 'GEVARENZONE' }
    };
    
    const config = zoneConfig[zone.type] || zoneConfig.neutral;
    
    // Show inactive warning for safe zones
    const inactiveWarning = zone.type === 'safe' && !zone.isActive 
        ? ' <span style="color: #ff6600">(INACTIEF!)</span>' 
        : '';
    
    indicator.style.background = config.bg;
    indicator.style.border = `2px solid ${config.color}`;
    indicator.style.color = config.color;
    indicator.innerHTML = `
        <span style="font-size: 18px">${config.icon}</span>
        <span>${config.name}${inactiveWarning}</span>
    `;
    
    // Flash on zone change
    indicator.style.animation = 'none';
    indicator.offsetHeight;
    indicator.style.animation = 'zoneFlash 0.3s ease';
}

/**
 * Show warning when safe zone deactivates (Item #32)
 */
function showZoneDeactivationWarning() {
    // Play alarm sound
    import('./audio').then(({ playSound }) => {
        playSound('alarm');
    }).catch(() => {});
    
    let warning = document.getElementById('zone-deactivation-warning');
    
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'zone-deactivation-warning';
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255, 0, 0, 0.9), rgba(100, 0, 0, 0.9));
            padding: 30px 50px;
            border-radius: 15px;
            border: 3px solid #ff4444;
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 2000;
            animation: dangerFlash 0.3s ease-in-out infinite;
        `;
        
        // Add animation style if not exists
        if (!document.getElementById('zone-warning-style')) {
            const style = document.createElement('style');
            style.id = 'zone-warning-style';
            style.textContent = `
                @keyframes dangerFlash {
                    0%, 100% { opacity: 1; box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
                    50% { opacity: 0.8; box-shadow: 0 0 50px rgba(255, 0, 0, 1); }
                }
                @keyframes zoneFlash {
                    0% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(warning);
    }
    
    warning.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px">⚠️</div>
        <div>VEILIGE ZONE UITGESCHAKELD!</div>
        <div style="font-size: 16px; opacity: 0.8; margin-top: 10px">REN NAAR VEILIGHEID!</div>
    `;
    warning.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        if (warning) {
            warning.style.display = 'none';
        }
    }, 3000);
}

// ========================================
// Loot & Resources UI (Items #37-40)
// ========================================

let playerLoot = 0;

/**
 * Update the loot indicator
 */
export function updateLootIndicator(loot: number) {
    playerLoot = loot;
    
    let indicator = document.getElementById('loot-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'loot-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 70px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid #ffd700;
            color: #ffd700;
            font-family: system-ui, sans-serif;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.innerHTML = `
        <span style="font-size: 20px">💎</span>
        <span>LOOT: ${loot}</span>
    `;
    
    // Flash when loot changes
    if (loot > 0) {
        indicator.style.animation = 'none';
        indicator.offsetHeight;
        indicator.style.animation = 'lootFlash 0.3s ease';
    }
}

/**
 * Show loot drop notification (Item #42)
 */
export function showLootDropNotification(amount: number) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 50, 50, 0.9);
        padding: 15px 30px;
        border-radius: 10px;
        color: white;
        font-family: system-ui, sans-serif;
        font-size: 20px;
        font-weight: bold;
        z-index: 2000;
        animation: lootDropFade 2s ease forwards;
    `;
    
    notification.innerHTML = `💔 LOOT VERLOREN: ${amount}`;
    
    // Add animation
    if (!document.getElementById('loot-drop-style')) {
        const style = document.createElement('style');
        style.id = 'loot-drop-style';
        style.textContent = `
            @keyframes lootDropFade {
                0% { opacity: 1; transform: translate(-50%, -50%); }
                70% { opacity: 1; }
                100% { opacity: 0; transform: translate(-50%, -100%); }
            }
            @keyframes lootFlash {
                0% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
}

/**
 * Show respawn timer (Item #43)
 */
export function showRespawnTimer(delaySeconds: number) {
    const respawnEnd = Date.now() + delaySeconds * 1000;
    
    let overlay = document.getElementById('respawn-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'respawn-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            color: white;
            font-family: system-ui, sans-serif;
        `;
        document.body.appendChild(overlay);
    }
    
    const updateTimer = () => {
        const remaining = Math.max(0, (respawnEnd - Date.now()) / 1000);
        
        overlay!.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px">💀</div>
            <div style="font-size: 32px; margin-bottom: 10px">RESPAWNING...</div>
            <div style="font-size: 64px; font-weight: bold; color: #00ffc7">${remaining.toFixed(1)}s</div>
        `;
        
        if (remaining > 0) {
            requestAnimationFrame(updateTimer);
        } else {
            overlay!.remove();
        }
    };
    
    updateTimer();
}

/**
 * Power-up timer state
 */
let powerUpTimerInterval: ReturnType<typeof setInterval> | null = null;
let powerUpEndTime: number = 0;

/**
 * Show and start the power-up countdown timer
 * Simplified design - AI recommendation Dec 2025
 */
function showPowerUpTimer(durationSeconds: number) {
    powerUpEndTime = Date.now() + durationSeconds * 1000;
    
    let timerDiv = document.getElementById('powerup-timer');
    if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'powerup-timer';
        timerDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 16px;
            border-radius: 8px;
            border: 2px solid #00ffc7;
            color: #00ffc7;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
        `;
        document.body.appendChild(timerDiv);
    }
    
    // Clear any existing interval
    if (powerUpTimerInterval) {
        clearInterval(powerUpTimerInterval);
    }
    
    // Update timer every 100ms
    powerUpTimerInterval = setInterval(() => {
        const remaining = Math.max(0, powerUpEndTime - Date.now()) / 1000;
        
        if (timerDiv) {
            timerDiv.textContent = `⚡ ${remaining.toFixed(0)}s`;
            
            // Change color when low
            if (remaining <= 2) {
                timerDiv.style.borderColor = '#ff4444';
                timerDiv.style.color = '#ff4444';
            }
        }
        
        if (remaining <= 0) {
            hidePowerUpTimer();
        }
    }, 100);
}

/**
 * Hide and clear the power-up timer
 */
function hidePowerUpTimer() {
    if (powerUpTimerInterval) {
        clearInterval(powerUpTimerInterval);
        powerUpTimerInterval = null;
    }
    
    const timerDiv = document.getElementById('powerup-timer');
    if (timerDiv) {
        timerDiv.remove();
    }
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
