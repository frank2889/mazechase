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

export async function initGame() {
    // Check user is logged in with real account
    await checkAuth();
    
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