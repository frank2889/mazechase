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
    data?: number[];  // Optional - objectgroup layers don't have data
    width?: number;
    height?: number;
    type: string;
    visible: boolean;
    objects?: any[];  // For objectgroup layers (spawns)
}

interface TiledMap {
    width: number;
    height: number;
    layers: TiledLayer[];
    tilewidth: number;
    tileheight: number;
}

// Tile values from the Tiled map
// Map layer: 0 = floor/walkable, 1 = wall, 2 = power-up
// Pellet layer: 0 = no pellet, 2 = pellet, 3 = pellet (legacy)
const TILED_WALL = 1;
const TILED_POWERUP_IN_MAP = 2;  // Power-ups in map layer
const TILED_PELLET = 2;          // Pellets in pellet layer
const TILED_PELLET_LEGACY = 3;   // Legacy pellet value

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
    
    // Find layers by name (only tilelayers with data)
    const mapLayer = layers.find(l => l.name === 'map' && l.data);
    const pelletLayer = layers.find(l => l.name === 'pellets' && l.data);
    const powerupLayer = layers.find(l => l.name === 'powerup' && l.data);
    
    // Process map layer (walls and power-ups)
    if (mapLayer && mapLayer.data) {
        for (let i = 0; i < mapLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            if (mapLayer.data[i] === TILED_WALL) {
                tiles[y][x] = 1; // TileType.WALL
            } else if (mapLayer.data[i] === TILED_POWERUP_IN_MAP) {
                tiles[y][x] = 3; // TileType.POWER_UP
            }
        }
    }
    
    // Process pellet layer
    if (pelletLayer && pelletLayer.data) {
        for (let i = 0; i < pelletLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            // Only place pellet if not a wall or power-up
            const pelletVal = pelletLayer.data[i];
            if ((pelletVal === TILED_PELLET || pelletVal === TILED_PELLET_LEGACY) && tiles[y][x] === 0) {
                tiles[y][x] = 2; // TileType.PELLET
            }
        }
    }
    
    // Process power-up layer (legacy support)
    if (powerupLayer && powerupLayer.data) {
        for (let i = 0; i < powerupLayer.data.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            // Only place power-up if not a wall
            if (powerupLayer.data[i] === 4 && tiles[y][x] !== 1) {
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
 * These match the spawn positions in game_config.go
 * 100x100 map with 50 pixels per tile
 * 4 quadrants: NW, NE, SW, SE
 * Spawn offset = 25 tiles from center (50)
 */
// Spawn positions match game_config.go - all using unified Neon Arena theme
export const SPAWN_POSITIONS = {
    runner: { x: 25 * 50, y: 25 * 50 },    // NW quadrant
    ch0: { x: 75 * 50, y: 25 * 50 },       // NE quadrant
    ch1: { x: 25 * 50, y: 75 * 50 },       // SW quadrant
    ch2: { x: 75 * 50, y: 75 * 50 }        // SE quadrant
} as const;

export type SpriteId = keyof typeof SPAWN_POSITIONS;
