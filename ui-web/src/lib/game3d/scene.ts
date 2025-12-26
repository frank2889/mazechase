/**
 * Game3DScene - Main 3D game scene that integrates all 3D components
 */

import { GameEngine } from './engine';
import { Maze3D, TileType, type MazeConfig } from './maze';
import { Player3D, type SpriteType3D } from './player';
import { loadTiledMap, gameToWorld3D, SPAWN_POSITIONS } from './tilemap-loader';

// Phaser tile size in pixels
const PHASER_TILE_SIZE = 50;

export interface GameState3D {
    players: Map<string, Player3D>;
    maze: Maze3D;
    isRunning: boolean;
    mazeWidth: number;
    mazeHeight: number;
}

export class Game3DScene {
    private engine: GameEngine;
    private maze: Maze3D;
    private players: Map<string, Player3D> = new Map();
    private lastTime: number = 0;
    private mazeWidth: number = 0;
    private mazeHeight: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        // Check WebGL support
        if (!GameEngine.isSupported()) {
            throw new Error('WebGL is not supported in this browser');
        }

        this.engine = new GameEngine({ canvas, antialias: true });
        this.maze = new Maze3D(this.engine.babylonScene);
    }

    /**
     * Load the real game map from Tiled JSON
     */
    async loadRealMap(mapUrl: string = '/gassets/map.json'): Promise<void> {
        const config = await loadTiledMap(mapUrl);
        this.mazeWidth = config.width;
        this.mazeHeight = config.height;
        this.buildMaze(config);
        
        // Focus camera on maze center
        this.engine.focusOn(config.width / 2, config.height / 2);
    }

    /**
     * Initialize players at their spawn positions
     */
    initPlayers(): void {
        // Add all 4 players at spawn positions
        const sprites: SpriteType3D[] = ['runner', 'ch0', 'ch1', 'ch2'];
        
        for (const spriteType of sprites) {
            const spawnPos = SPAWN_POSITIONS[spriteType];
            const pos3D = gameToWorld3D(spawnPos.x, spawnPos.y, PHASER_TILE_SIZE);
            this.addPlayer(spriteType, spriteType, pos3D.x, pos3D.z);
        }
    }

    /**
     * Initialize with a demo maze (for testing)
     */
    initDemoMaze(): void {
        // Create a simple test maze
        const width = 20;
        const height = 15;
        const tiles: number[][] = [];

        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                // Border walls
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    tiles[y][x] = TileType.WALL;
                }
                // Some internal walls
                else if ((x % 4 === 0 && y % 3 !== 0) || (y % 4 === 0 && x % 3 !== 0)) {
                    tiles[y][x] = TileType.WALL;
                }
                // Power-ups at corners
                else if ((x === 2 && y === 2) || (x === width - 3 && y === 2) ||
                         (x === 2 && y === height - 3) || (x === width - 3 && y === height - 3)) {
                    tiles[y][x] = TileType.POWER_UP;
                }
                // Pellets everywhere else
                else {
                    tiles[y][x] = TileType.PELLET;
                }
            }
        }

        this.buildMaze({ width, height, tiles });

        // Focus camera on maze center
        this.engine.focusOn(width / 2, height / 2);
    }

    /**
     * Build maze from config
     */
    buildMaze(config: MazeConfig): void {
        this.maze.buildFromTilemap(config);
    }

    /**
     * Add a player to the scene
     */
    addPlayer(id: string, spriteType: SpriteType3D, startX: number, startY: number): Player3D {
        const player = new Player3D(this.engine.babylonScene, spriteType, startX, startY);
        this.players.set(id, player);
        return player;
    }

    /**
     * Remove a player from the scene
     */
    removePlayer(id: string): void {
        const player = this.players.get(id);
        if (player) {
            player.dispose();
            this.players.delete(id);
        }
    }

    /**
     * Get a player by ID
     */
    getPlayer(id: string): Player3D | undefined {
        return this.players.get(id);
    }

    /**
     * Update a player's position
     */
    updatePlayerPosition(id: string, tileX: number, tileY: number): void {
        const player = this.players.get(id);
        if (player) {
            player.moveTo(tileX, tileY);
        }
    }

    /**
     * Update a player's position from pixel coordinates (Phaser game coordinates)
     */
    updatePlayerPositionPixels(id: string, pixelX: number, pixelY: number): void {
        const player = this.players.get(id);
        if (player) {
            const pos3D = gameToWorld3D(pixelX, pixelY, PHASER_TILE_SIZE);
            player.setPosition(pos3D.x, pos3D.z);
        }
    }

    /**
     * Remove a pellet
     */
    removePellet(tileX: number, tileY: number): void {
        this.maze.removePellet(tileX, tileY);
    }

    /**
     * Remove a power-up
     */
    removePowerUp(tileX: number, tileY: number): void {
        this.maze.removePowerUp(tileX, tileY);
    }

    /**
     * Set power-up state for runner
     */
    setRunnerPoweredUp(powered: boolean): void {
        const runner = this.players.get('runner');
        if (runner) {
            runner.setPoweredUp(powered);
        }
    }

    /**
     * Start the game loop
     */
    start(): void {
        this.lastTime = performance.now();
        
        // Custom update loop that runs before render
        this.engine.babylonScene.registerBeforeRender(() => {
            const now = performance.now();
            const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
            this.lastTime = now;

            // Update all players
            this.players.forEach(player => {
                player.update(deltaTime);
            });
        });

        this.engine.start();
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        this.engine.stop();
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.players.forEach(player => player.dispose());
        this.players.clear();
        this.maze.dispose();
        this.engine.dispose();
    }

    /**
     * Get the underlying engine
     */
    getEngine(): GameEngine {
        return this.engine;
    }
}

// Export all modules
export { GameEngine } from './engine';
export { Maze3D, TileType, TILE_SIZE_3D } from './maze';
export { Player3D } from './player';
export { loadTiledMap, gameToWorld3D, worldToTile, tileToWorld, SPAWN_POSITIONS } from './tilemap-loader';
export type { SpriteType3D } from './player';
export type { MazeConfig } from './maze';
export type { SpriteId } from './tilemap-loader';
