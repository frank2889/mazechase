/**
 * TilemapLoader - Loads and parses Tiled JSON maps for 3D rendering
 * 
 * Converts Tiled map format to MazeConfig for Babylon.js
 */

// Inline types to avoid circular import
export interface MazeConfig3D {
    width: number;
    height: number;
    tiles: number[][];
}

// Tiled JSON format types
interface TiledLayer {
    name: string;
    data: number[];
    width: number;
    height: number;
    type: string;
    visible: boolean;
}

interface TiledMap {
    width: number;
    height: number;
    layers: TiledLayer[];
    tilewidth: number;
    tileheight: number;
}

// Tile values from the Tiled map
const TILED_WALL = 1;
const TILED_PELLET = 3;
const TILED_POWERUP = 4;

/**
 * Parse Tiled JSON map into MazeConfig for 3D rendering
 */
export function parseTiledMap(tiledMap: TiledMap): MazeConfig3D {
    const { width, height, layers } = tiledMap;
    
    // Initialize tiles array with floors
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
        tiles[y] = new Array(width).fill(0); // TileType.FLOOR
    }
    
    // Find layers by name
    const mapLayer = layers.find(l => l.name === 'map');
    const pelletLayer = layers.find(l => l.name === 'pellets');
    const powerupLayer = layers.find(l => l.name === 'powerup');
    
    // Process map layer (walls)
    if (mapLayer) {
        for (let i = 0; i < mapLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            if (mapLayer.data[i] === TILED_WALL) {
                tiles[y][x] = 1; // TileType.WALL
            }
        }
    }
    
    // Process pellet layer
    if (pelletLayer) {
        for (let i = 0; i < pelletLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            // Only place pellet if not a wall
            if (pelletLayer.data[i] === TILED_PELLET && tiles[y][x] !== 1) {
                tiles[y][x] = 2; // TileType.PELLET
            }
        }
    }
    
    // Process power-up layer
    if (powerupLayer) {
        for (let i = 0; i < powerupLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            // Only place power-up if not a wall
            if (powerupLayer.data[i] === TILED_POWERUP && tiles[y][x] !== 1) {
                tiles[y][x] = 3; // TileType.POWER_UP
            }
        }
    }
    
    return { width, height, tiles };
}

/**
 * Load tilemap from URL
 */
export async function loadTiledMap(url: string): Promise<MazeConfig3D> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load tilemap: ${response.statusText}`);
    }
    const tiledMap: TiledMap = await response.json();
    return parseTiledMap(tiledMap);
}

/**
 * Convert world coordinates to tile coordinates
 * Used for syncing with game logic
 */
export function worldToTile(worldX: number, worldY: number, tileSize: number = 50): { x: number, y: number } {
    return {
        x: Math.floor(worldX / tileSize),
        y: Math.floor(worldY / tileSize)
    };
}

/**
 * Convert tile coordinates to world coordinates (center of tile)
 */
export function tileToWorld(tileX: number, tileY: number, tileSize: number = 50): { x: number, y: number } {
    return {
        x: tileX * tileSize + tileSize / 2,
        y: tileY * tileSize + tileSize / 2
    };
}

/**
 * Convert 2D game position to 3D world position
 * Phaser uses (x, y) with y pointing down
 * Babylon.js uses (x, y, z) with y pointing up
 */
export function gameToWorld3D(
    gameX: number, 
    gameY: number, 
    gameTileSize: number = 50,
    world3DTileSize: number = 1
): { x: number, y: number, z: number } {
    // Convert game coordinates to tile coordinates
    const tileX = gameX / gameTileSize;
    const tileY = gameY / gameTileSize;
    
    // Convert to 3D world coordinates
    // Note: Phaser Y becomes Babylon Z (depth)
    return {
        x: tileX * world3DTileSize,
        y: 0, // Ground level
        z: tileY * world3DTileSize
    };
}

/**
 * Get spawn positions from the game
 * These match the startPos values in game.ts
 */
export const SPAWN_POSITIONS = {
    runner: { x: 110, y: 220 },
    ch0: { x: 670.17, y: 424.5 },
    ch1: { x: 723.5, y: 424.5 },
    ch2: { x: 776.83, y: 424.5 }
} as const;

export type SpriteId = keyof typeof SPAWN_POSITIONS;
