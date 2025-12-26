import {connectToWebSocket, setGame, waitForGameState} from "./connection.ts";
import {GameScene} from "./game.ts";
import {showError} from "./utils.ts";
import {getUserInfo} from "../auth.ts";

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
    
    connectToWebSocket()
    console.log("Waiting for game state")
    await waitForGameState()

    const gameWithDep = new GameScene()
    setGame(gameWithDep)

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