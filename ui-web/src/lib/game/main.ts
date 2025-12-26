import {connectToWebSocket, setGame, waitForGameState, subscribeLobbyState} from "./connection.ts";
import {GameScene} from "./game.ts";
import {showError} from "./utils.ts";
import {getUserInfo} from "../auth.ts";
import {mountWaitingRoom, unmountWaitingRoom} from "./waiting-room.tsx";
import {is3DEnabled} from "../render-mode.ts";

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
function isTouchDevice(): boolean {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (window.matchMedia && window.matchMedia('(hover: none)').matches);
}

// Calculate optimal game dimensions for the screen
function getGameDimensions() {
    const baseWidth = 1550;
    const baseHeight = 1050;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Reserve space for touch controls on mobile
    const touchControlHeight = isTouchDevice() ? 180 : 0;
    const availableHeight = windowHeight - touchControlHeight;
    
    return {
        width: baseWidth,
        height: baseHeight,
        availableWidth: windowWidth,
        availableHeight: availableHeight
    };
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
                startGame();
            }
        });
    } else {
        // Multiplayer mode: show waiting room
        mountWaitingRoom();
        
        // Subscribe to lobby state to know when game starts
        let gameInitialized = false;
        subscribeLobbyState((state) => {
            if (state.matchStarted && !gameInitialized) {
                gameInitialized = true;
                unmountWaitingRoom();
                startGame();
            }
        });
        
        console.log("Waiting for game state");
        await waitForGameState();
    }
}

/**
 * Start the game with the appropriate renderer (2D or 3D)
 */
async function startGame() {
    if (is3DEnabled()) {
        console.log("Starting 3D game...");
        await start3DGame();
    } else {
        console.log("Starting 2D game...");
        await startPhaserGame();
    }
}

/**
 * Start the 3D Babylon.js game
 */
async function start3DGame() {
    try {
        // Dynamically import 3D modules to avoid loading when not needed
        const { Game3DScene } = await import('../game3d/scene');
        
        // Create canvas for 3D rendering
        const container = document.getElementById('the-game');
        if (!container) {
            throw new Error('Game container not found');
        }
        
        // Create and append canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas-3d';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);
        
        // Initialize 3D scene
        const game3d = new Game3DScene(canvas);
        await game3d.loadRealMap('/gassets/map.json');
        game3d.initPlayers();
        
        // Enable camera controls
        const camera = game3d.getEngine().mainCamera;
        camera.attachControl(canvas, true);
        
        // Start rendering
        game3d.start();
        
        // Store for debugging
        (window as any).game3d = game3d;
        
        console.log("3D game started successfully");
    } catch (error) {
        console.error("Failed to start 3D game, falling back to 2D:", error);
        showError("3D mode failed, switching to 2D...");
        // Fall back to 2D
        await startPhaserGame();
    }
}

async function startPhaserGame() {
    const gameWithDep = new GameScene();
    setGame(gameWithDep);

    const dims = getGameDimensions();
    
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: dims.width,
        height: dims.height,
        backgroundColor: 0x000000,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: {x: 0, y: 0},
            }
        },
        scene: [gameWithDep],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: 'the-game',
            width: dims.width,
            height: dims.height,
            min: {
                width: 320,
                height: 240
            }
        },
        input: {
            keyboard: true,
            touch: true
        },
        render: {
            pixelArt: true,
            antialias: false,
            roundPixels: true
        }
    };

    const game = new Phaser.Game(config);
    
    // Handle window resize for responsive layout
    window.addEventListener('resize', () => {
        const newDims = getGameDimensions();
        game.scale.resize(dims.width, dims.height);
    });
    
    // Handle orientation change on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            game.scale.refresh();
        }, 100);
    });

    return game;
}

initGame().then(() => {
    console.log("Game initialized!");
}).catch(err => {
    console.error(err);
    showError(err)
})