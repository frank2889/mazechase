/**
 * Sprite System - Kurzgesagt style sprites for MazeChase
 * Uses DALL-E generated assets based on Yuki's design recommendations
 */

export interface SpriteManifest {
    runner: string;
    chasers: {
        cyan: string;
        magenta: string;
        green: string;
    };
    powerups: {
        classic: string;
        speed: string;
        magnet: string;
        // REMOVED: invisible, freeze, teleport - simplified Dec 2025
    };
    environment: {
        wall: string;
        floor: string;
    };
}

// Sprite paths - relative to public folder
export const SPRITE_PATHS: SpriteManifest = {
    runner: '/sprites/runner.png',
    chasers: {
        cyan: '/sprites/chaser_cyan.png',
        magenta: '/sprites/chaser_magenta.png',
        green: '/sprites/chaser_green.png',
    },
    powerups: {
        classic: '/sprites/powerup_classic.png',
        speed: '/sprites/powerup_speed.png',
        magnet: '/sprites/powerup_magnet.png',
        // REMOVED: invisible, freeze, teleport
    },
    environment: {
        wall: '/sprites/wall_tile.png',
        floor: '/sprites/floor_tile.png',
    },
};

// Chaser color to sprite mapping
export const CHASER_SPRITES: Record<string, string> = {
    '#00FFFF': SPRITE_PATHS.chasers.cyan,
    '#FF00FF': SPRITE_PATHS.chasers.magenta,
    '#32CD32': SPRITE_PATHS.chasers.green,
    'cyan': SPRITE_PATHS.chasers.cyan,
    'magenta': SPRITE_PATHS.chasers.magenta,
    'green': SPRITE_PATHS.chasers.green,
};

// Power-up type to sprite mapping
export const POWERUP_SPRITES: Record<string, string> = {
    'classic': SPRITE_PATHS.powerups.classic,
    'speed': SPRITE_PATHS.powerups.speed,
    'magnet': SPRITE_PATHS.powerups.magnet,
    // REMOVED: invisible, freeze, teleport
};

/**
 * Preload all sprites for faster in-game loading
 */
export async function preloadSprites(): Promise<Map<string, HTMLImageElement>> {
    const sprites = new Map<string, HTMLImageElement>();
    
    const allPaths = [
        SPRITE_PATHS.runner,
        ...Object.values(SPRITE_PATHS.chasers),
        ...Object.values(SPRITE_PATHS.powerups),
        ...Object.values(SPRITE_PATHS.environment),
    ];
    
    const loadPromises = allPaths.map(async (path) => {
        try {
            const img = new Image();
            img.src = path;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            sprites.set(path, img);
            console.log(`✅ Loaded sprite: ${path}`);
        } catch (e) {
            console.warn(`⚠️ Failed to load sprite: ${path}`);
        }
    });
    
    await Promise.all(loadPromises);
    console.log(`📦 Loaded ${sprites.size}/${allPaths.length} sprites`);
    
    return sprites;
}

/**
 * Get sprite URL for a given entity type
 */
export function getSpriteUrl(entityType: 'runner' | 'chaser' | 'powerup', variant?: string): string {
    switch (entityType) {
        case 'runner':
            return SPRITE_PATHS.runner;
        case 'chaser':
            return CHASER_SPRITES[variant || 'cyan'] || SPRITE_PATHS.chasers.cyan;
        case 'powerup':
            return POWERUP_SPRITES[variant || 'classic'] || SPRITE_PATHS.powerups.classic;
        default:
            return SPRITE_PATHS.runner;
    }
}

/**
 * Check if sprites are available (generated)
 */
export async function checkSpritesAvailable(): Promise<boolean> {
    try {
        const response = await fetch(SPRITE_PATHS.runner, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}
