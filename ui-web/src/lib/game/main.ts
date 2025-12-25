import {connectToWebSocket, setGame, waitForGameState} from "./connection.ts";
import {GameScene} from "./game.ts";
import {showError} from "./utils.ts";
import {guestLogin} from "../auth.ts";

// Auto login as guest before starting game
async function ensureLoggedIn() {
    try {
        await guestLogin();
    } catch (e) {
        // Already logged in, continue
        console.log("Already logged in or guest login failed:", e);
    }
}

export async function initGame() {
    // Ensure user is logged in (as guest if needed)
    await ensureLoggedIn();
    
    connectToWebSocket()
    console.log("Waiting for game state")
    await waitForGameState()

    const gameWithDep = new GameScene()
    setGame(gameWithDep)

    const mapWidth = 1550 // 30 tiles each with 50 width + 50 for centring
    const mapHeight = 1050 // 20 tiles each with 50 width + 50 for centring
    const config = {
        type: Phaser.AUTO,
        width: mapWidth,
        height: mapHeight,
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
            parent: 'the-game'
        },
    };

    new Phaser.Game(config);
}

initGame().then(() => {
    console.log("Game initialized!");
}).catch(err => {
    console.error(err);
    showError(err)
})