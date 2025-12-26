import type {AnimDir, Chaser, ChaserAnimBase, Runner} from "./models.ts";
import {
    getGameState,
    getSpriteID,
    getUsername,
    sendRunnerChaserMessage,
    sendPelletMessage,
    sendPosMessage,
    sendPowerUpMessage
} from "./connection.ts";
import {delay} from "./utils.ts";
import {getGameMode, getGameModeConfig, SCORE_VALUES, type GameMode} from "./modes.ts";

import Phaser from 'phaser';

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;
type GameObjectWithBody = Phaser.Types.Physics.Arcade.GameObjectWithBody;

import TilemapLayer = Phaser.Tilemaps.TilemapLayer;
import Text = Phaser.GameObjects.Text;
import Tile = Phaser.Tilemaps.Tile;

const playerSpriteIdKey = "playerID";

type CollisionBodyType =
    Phaser.Types.Physics.Arcade.GameObjectWithBody
    | Phaser.Physics.Arcade.Body
    | Phaser.Physics.Arcade.StaticBody
    | Phaser.Tilemaps.Tile


export class GameScene extends Phaser.Scene {
    cursors!: CursorKeys

    mapLayer!: TilemapLayer
    pelletLayer!: Phaser.Tilemaps.TilemapLayer
    powerLayer!: Phaser.Tilemaps.TilemapLayer

    controllingSprite: Runner | Chaser | undefined

    gameOverText!: Text;
    spectatingText!: Text
    scoreText!: Text;
    modeText!: Text;

    gameOver = false
    isRedirecting = true
    currentScore = 0;
    gameMode: GameMode = 'classic';
    
    // Touch/mobile input
    touchDirection: AnimDir = 'default';
    wasdKeys!: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };

    allSprites: { [key: string]: Chaser | Runner } = {
        "runner": {
            playerInfo: null,
            curAnimDir: 'up',
            defaultAnim: 'default',
            animBase: 'runner',
            startPos: [110, 220],
            userNameText: null,
            movementSpeed: -200
        },
        'ch0': {
            playerInfo: null,
            curAnimDir: 'right',
            defaultAnim: 'left',
            animBase: 'chaserred',
            startPos: [670.1666666666666, 424.49999999999994],
            userNameText: null,
            movementSpeed: -160
        },
        'ch1': {
            playerInfo: null,
            curAnimDir: 'right',
            defaultAnim: 'left',
            animBase: 'chaserblue',
            startPos: [723.4999999999992, 424.49999999999994],
            userNameText: null,
            movementSpeed: -160
        },
        'ch2': {
            playerInfo: null,
            userNameText: null,
            curAnimDir: 'right',
            defaultAnim: 'left',
            animBase: 'chaserpink',
            startPos: [776.8333333333, 424.49999999999994],
            movementSpeed: -160
        },
    }

    constructor() {
        super({key: 'GameScene'});
        this.gameMode = getGameMode();
    }

    preload(): void {
        console.log('Preloading assets...');
        // sprite sheets
        this.loadAssets();
    }

    create(): void {
        console.log('Creating scene...');
        const modeConfig = getGameModeConfig();

        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add WASD keys for alternative control
        this.wasdKeys = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        
        this.createMap()
        this.initRunnerAnim()
        this.initChasersAnim()
        this.loadPlayers()

        // Focus the game canvas for keyboard input
        this.game.canvas.setAttribute('tabindex', '0');
        this.game.canvas.focus();
        
        // Also focus on click
        this.game.canvas.addEventListener('click', () => {
            this.game.canvas.focus();
        });

        // Set up the "Game Ended" text
        const textStyle = {fontFamily: 'Arial', fontSize: 48, color: '#00ffc7'};
        this.gameOverText = this.add.text(700, 450, 'Game Over!', textStyle);
        this.gameOverText.setOrigin(0.5);
        this.gameOverText.visible = false;

        // Set up the "Spectating" text
        const spectatingTextStyle = {fontFamily: 'Arial', fontSize: 32, color: '#ff6b6b'};
        this.spectatingText = this.add.text(800, 30, 'Je bent gevangen... toekijken', spectatingTextStyle);
        this.spectatingText.setOrigin(0.5);
        this.spectatingText.visible = false;

        // Score display
        const scoreStyle = {fontFamily: 'Arial', fontSize: 24, color: '#FFD700'};
        this.scoreText = this.add.text(20, 20, 'Score: 0', scoreStyle);
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(100);

        // Game mode display
        const modeStyle = {fontFamily: 'Arial', fontSize: 18, color: '#00BFFF'};
        this.modeText = this.add.text(20, 50, `${modeConfig.icon} ${modeConfig.nameNL}`, modeStyle);
        this.modeText.setScrollFactor(0);
        this.modeText.setDepth(100);


        const spriteID = getSpriteID();
        const sprite = this.allSprites[spriteID]
        if (!sprite) {
            throw Error(`Sprite not found: ${spriteID}`);
        }
        this.controllingSprite = sprite
        this.controllingSprite.userNameText!.setText(getUsername())
        console.log(getUsername())

        console.log(`
            Assigning ${spriteID} to 
            ${this.controllingSprite!.userNameText} 
            with username ${this.controllingSprite.userNameText!.text}`
        )

        const gameState = getGameState()

        // assign username for existing players
        for (const [playerSprite, playerData] of Object.entries(gameState.activePlayers)) {
            let username = (playerData as any).username as string
            let x = (playerData as any).x as number
            let y = (playerData as any).y as number

            this.allSprites[playerSprite]!.userNameText!.setText(username as string)
            this.allSprites[playerSprite]!.playerInfo!.setPosition(x, y);
        }

        // update map to match game state till now
        for (const pellet of gameState.pelletsEaten) {
            this.pelletLayer.removeTileAt(pellet.X, pellet.Y)
        }

        for (const powerUpId of gameState.powerUpsEaten) {
            this.powerLayer.removeTileAt(powerUpId.X, powerUpId.Y)
        }

        for (const chId of gameState.chasersEaten) {
            console.log(`Eaten chasers ${chId}`)
            this.allSprites[chId]!.playerInfo!.destroy()
        }
    }

    update(_time: number, _delta: number): void {
        if (this.gameOver) {
            // Show the "Game Ended" text
            this.gameOverText.visible = true;
            if (this.isRedirecting) {
                // here so the game doesn't repeatedly redirect
                this.isRedirecting = false
                delay(2000).then(_ => {
                    window.location.assign('/');
                })
            }

            // Prevent further updates
            this.input.off('pointerdown'); // Remove the event listener to avoid multiple redirects
            return;
        }

        if (!(this.controllingSprite!.playerInfo!.active)) {
            this.spectatingText.visible = true
            // console.log('You are killed')
            return;
        }

        // anims
        let curAnim: AnimDir;
        let spriteID = this.controllingSprite!.playerInfo!.getData(playerSpriteIdKey) as string;

        // Check arrow keys, WASD, and touch direction
        const isLeft = this.cursors.left.isDown || this.wasdKeys.A.isDown;
        const isRight = this.cursors.right.isDown || this.wasdKeys.D.isDown;
        const isUp = this.cursors.up.isDown || this.wasdKeys.W.isDown;
        const isDown = this.cursors.down.isDown || this.wasdKeys.S.isDown;

        if (isLeft) {
            this.movePlayer(spriteID, this.controllingSprite!.movementSpeed, 0);
            curAnim = `left`
            this.setSpriteAnim(spriteID, curAnim)
        } else if (isRight) {
            this.movePlayer(spriteID, -this.controllingSprite!.movementSpeed, 0);

            curAnim = `right`
            this.setSpriteAnim(spriteID, curAnim)
        } else if (isUp) {
            this.movePlayer(spriteID, 0, this.controllingSprite!.movementSpeed);
            curAnim = `up`
            this.setSpriteAnim(spriteID, curAnim)
        } else if (isDown) {
            this.movePlayer(spriteID, 0, -this.controllingSprite!.movementSpeed);
            curAnim = `down`
            this.setSpriteAnim(spriteID, curAnim)
        } else {
            this.movePlayer(spriteID, 0, 0);
            curAnim = this.controllingSprite!.defaultAnim
            this.setSpriteAnim(spriteID, curAnim, false)
        }

        this.controllingSprite!.curAnimDir = curAnim;
        // move username text
        this.setUserNameTextPos(spriteID)
        sendPosMessage(
            this.controllingSprite?.playerInfo!.x!,
            this.controllingSprite?.playerInfo!.y!,
            this.controllingSprite?.curAnimDir!
        )
    }

    setSpriteAnim(spriteId: string, anim: string, loop = true) {
        const finalAnim = this.allSprites[spriteId]!.animBase + anim
        this.allSprites[spriteId]!.playerInfo!.anims.play(finalAnim, loop)
    }

    movePlayer(spriteID: string, x: number, y: number) {
        if (this.allSprites[spriteID]!.playerInfo!.active) {
            this.allSprites[spriteID]!.playerInfo!.setVelocityY(y);
            this.allSprites[spriteID]!.playerInfo!.setVelocityX(x);
        }
    }

    setUserNameTextPos(spriteID: string) {
        this.allSprites[spriteID]!.userNameText!.setPosition(
            this.allSprites[spriteID]!.playerInfo!.x - userNameOffSetX,
            this.allSprites[spriteID]!.playerInfo!.y - userNameOffSetY
        );
    }

    private loadAssets() {
        const assetsPath = "/gassets"
        this.load.spritesheet("runner", `${assetsPath}/pacmanSpriteSheet.png`, {
            frameWidth: 50,
            frameHeight: 50,
        });
        this.load.spritesheet("chasers", `${assetsPath}/ghosts.png`, {
            frameWidth: 50,
            frameHeight: 50,
        });
        this.load.spritesheet("fruits", `${assetsPath}/fruits.png`, {
            frameWidth: 50,
            frameHeight: 50,
        });
        this.load.image('secondTile', `${assetsPath}/secondTile.png`)
        this.load.image('forthTile', `${assetsPath}/forthTile.png`)
        this.load.image('centrepoint', `${assetsPath}/centrepoint.png`)
        this.load.image('power-up', `${assetsPath}/powercent.png`)
        this.load.tilemapTiledJSON('map', `${assetsPath}/map.json`);
    }

    private createMap() {
        const map = this.make.tilemap({key: 'map'})
        const blueTile = map.addTilesetImage('secondTile', 'secondTile')!
        const redTile = map.addTilesetImage('forthTile', 'forthTile')!
        const pellets = map.addTilesetImage('centrepoint', 'centrepoint')!
        const powerUp = map.addTilesetImage('power-up', 'power-up')!

        this.mapLayer = map.createLayer('map', [blueTile, redTile])!
        this.pelletLayer = map.createLayer('pellets', pellets)!
        this.powerLayer = map.createLayer('powerup', powerUp)!

        this.mapLayer.setCollisionByExclusion([-1], true, true)
        this.pelletLayer.setCollisionByExclusion([-1])
        this.powerLayer.setCollisionByExclusion([-1])
    }

    private initChasersAnim() {
        // remember to maintain this order right, up, down, left (order in sprite sheet)
        const animDirections: AnimDir[] = ["right", "up", "down", "left"];
        const chaserColors: ChaserAnimBase[] = ["chaserred", "chaserblue", "chaserpink"];

        let i = 0;
        for (let color of chaserColors) {
            for (let dir of animDirections) {
                this.anims.create({
                    frames: this.anims.generateFrameNumbers('chasers', {start: i, end: i}),
                    key: color + dir,
                })
                i++
            }
        }
    }

    private initRunnerAnim() {
        let namesArray: AnimDir[] = [
            'right',
            'up',
            'down',
            'left',
        ]
        let ind = 0
        for (let i = 0; i < 12; i += 3) {
            this.anims.create({
                frames: this.anims.generateFrameNumbers('runner', {start: i + 1, end: i + 3}),
                key: 'runner' + namesArray[ind],
                frameRate: 10,
                repeat: -1
            });
            ind++
        }

        let defaultAnim: AnimDir = "default"
        // neutral runner
        this.anims.create({
            frames: this.anims.generateFrameNumbers('runner', {start: 0, end: 0}),
            key: 'runner' + defaultAnim,
            frameRate: 1,
            repeat: -1
        });
    }

    private loadPlayers() {
        // First pass: create all sprites
        for (const [spriteId, spriteData] of Object.entries(this.allSprites)) {
            const defaultAnim = spriteData.animBase + spriteData.defaultAnim
            const startPos = spriteData.startPos

            // Use correct texture key: "runner" for runner, "chasers" for all chasers
            const textureKey = spriteId === "runner" ? "runner" : "chasers";
            
            let sprite = this.physics.add.sprite(
                startPos[0],
                startPos[1],
                textureKey
            );

            sprite.anims.play(defaultAnim);
            sprite.setOrigin(0.5);
            sprite.setCollideWorldBounds(true);
            sprite.setScale(.7)


            // hit box
            let desiredRadius = 20; // 50/2 - 5
            if (spriteId === "runner") {
                sprite.body.setCircle(desiredRadius);
                const offsetX = (sprite.width / 2) - desiredRadius;
                const offsetY = (sprite.height / 2) - desiredRadius;
                sprite.body.setCircle(desiredRadius, offsetX, offsetY);
            } else {
                // chasers have a sightly offset and smaller hitbox because of sprite size
                const offset = 8;
                sprite.body.setCircle(desiredRadius - 2, offset, offset);
            }

            spriteData.userNameText = this.addUsernameText(sprite);

            // collisions with map
            this.physics.add.collider(sprite, this.mapLayer)

            if (spriteId == "runner") {
                this.physics.add.overlap(sprite, this.pelletLayer, this.pelletCallBack.bind(this))
                this.physics.add.collider(sprite, this.powerLayer, this.powerUpCallBack.bind(this))
            }

            sprite.setData(playerSpriteIdKey, spriteId)
            // attach player info
            spriteData.playerInfo = sprite

            this.allSprites[spriteId] = spriteData
        }
        
        // Second pass: add chaser-runner collisions (now runner sprite exists)
        const runnerSprite = this.allSprites["runner"].playerInfo!;
        for (const [spriteId, spriteData] of Object.entries(this.allSprites)) {
            if (spriteId !== "runner" && spriteData.playerInfo) {
                this.physics.add.collider(
                    spriteData.playerInfo,
                    runnerSprite,
                    this.runnerChaserCollision.bind(this)
                )
            }
        }
    }

    pelletCallBack(
        _runner: CollisionBodyType,
        pellet: CollisionBodyType
    ) {
        let pel = pellet as Tile
        sendPelletMessage(pel.x, pel.y)
        this.addScore(SCORE_VALUES.pellet);
    }

    powerUpCallBack(
        _runner: CollisionBodyType,
        power: CollisionBodyType
    ) {
        let pow = power as Tile
        console.log(pow.x, pow.y)

        sendPowerUpMessage(pow.x, pow.y)
        this.addScore(SCORE_VALUES.powerPellet);
    }

    runnerChaserCollision(
        chaser: CollisionBodyType,
        _runner: CollisionBodyType,
    ): void {
        const cha = chaser as GameObjectWithBody
        const chaserId = cha.getData(playerSpriteIdKey) as string
        console.log('runnerChaserCollision', chaserId)

        sendRunnerChaserMessage(chaserId)
    }

    addScore(points: number) {
        this.currentScore += points;
        this.scoreText.setText(`Score: ${this.currentScore}`);
    }

    showGameOver(winner: string, reason: string) {
        this.gameOver = true;
        this.gameOverText.setText(`${winner} wint!`);
        this.gameOverText.visible = true;
        
        // Show end game screen after short delay
        setTimeout(() => {
            this.showEndGameUI(winner, reason);
        }, 2000);
    }

    showEndGameUI(winner: string, reason: string) {
        // Create end game overlay
        const overlay = document.createElement('div');
        overlay.id = 'end-game-overlay';
        overlay.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: #1a1a2e; border-radius: 16px; padding: 32px; max-width: 400px; text-align: center; border: 2px solid #ffd700;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: #ffd700;">WINNER</div>
                    <h1 style="color: #ffd700; font-size: 28px; margin-bottom: 8px;">Game Over!</h1>
                    <p style="color: #888; margin-bottom: 16px;">${reason}</p>
                    <div style="background: linear-gradient(to right, #ffd700, #ffaa00); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                        <div style="color: #000; font-size: 14px;">Winnaar</div>
                        <div style="color: #000; font-size: 24px; font-weight: bold;">${winner}</div>
                    </div>
                    <div style="background: #2a2a3e; padding: 12px; border-radius: 8px; margin-bottom: 24px;">
                        <div style="color: #ffd700; font-size: 24px; font-weight: bold;">Score: ${this.currentScore}</div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="window.location.reload()" style="flex: 1; background: #22c55e; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            Opnieuw
                        </button>
                        <button onclick="window.location.href='/lobby'" style="flex: 1; background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            Lobby
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    addUsernameText(sprite: Phaser.Physics.Arcade.Sprite) {
        return this.add.text(
            sprite.x - userNameOffSetX,
            sprite.y - userNameOffSetY,
            '',
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff'
            });
    }
}

const userNameOffSetX = 15
const userNameOffSetY = 35

