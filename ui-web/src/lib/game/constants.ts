/**
 * Game Constants - Client-side configuration values
 * These should match server-side values in game_config.go
 */

// Tile and movement
export const TILE_SIZE = 50;
export const PLAYER_SPEED = 4; // pixels per tick
export const TICK_RATE_MS = 16; // 60 FPS

// Scoring
export const PELLET_SCORE = 10;
export const POWER_UP_SCORE = 50;
export const CHASER_EATEN_SCORE = 200;

// Timing
export const POWER_UP_DURATION_SEC = 8;
export const PHASE_DURATION_SEC = 30;
export const GAME_DURATION_SEC = 180;
export const COUNTDOWN_SEC = 3;

// Power-up types (must match server)
// SIMPLIFIED: Only 3 intuitive power-ups (AI recommendation Dec 2025)
export const POWER_UP_TYPES = {
    CLASSIC: 0,    // Eat chasers - the thrill!
    SPEED: 1,      // Go fast - instant fun
    MAGNET: 2,     // Attract pellets - satisfying
    // REMOVED: Invisible, Freeze, Teleport - too complex, broke flow
} as const;

// Power-up display names
export const POWER_UP_NAMES: Record<number, string> = {
    0: 'Power Mode',   // More exciting than "Classic"
    1: 'Speed Boost',
    2: 'Magnet',
};

// Power-up colors for UI
export const POWER_UP_COLORS: Record<number, string> = {
    0: '#FFD700', // Power Mode - Gold
    1: '#00FF00', // Speed - Green  
    2: '#FF69B4', // Magnet - Pink
};

// Entity settings
export const ENTITY_DETECTION_RANGE = 4.0;
export const ENTITY_SCAN_ANGLE = Math.PI / 3; // 60 degrees

// Entity types
export const ENTITY_TYPES = {
    HUNTER: 'hunter',
    SCANNER: 'scanner',
    SWEEPER: 'sweeper'
} as const;

// Entity states
export const ENTITY_STATES = {
    PATROL: 'patrol',
    ALERT: 'alert',
    CHASE: 'chase',
    RETURN: 'return',
    DORMANT: 'dormant'
} as const;

// Phases
export const PHASES = {
    DAY: 'day',
    DUSK: 'dusk',
    NIGHT: 'night',
    DAWN: 'dawn'
} as const;

// Zone types
export const ZONE_TYPES = {
    SAFE: 'safe',
    NEUTRAL: 'neutral',
    DANGER: 'danger'
} as const;

// Aggression multiplier - simplified to constant (AI recommendation)
// Variable aggression was confusing for players
export const AGGRESSION_MULTIPLIER = 1.0;

// Entity colors
export const ENTITY_COLORS = {
    [ENTITY_TYPES.HUNTER]: '#ff3333',
    [ENTITY_TYPES.SCANNER]: '#ffaa00',
    [ENTITY_TYPES.SWEEPER]: '#aa33ff'
} as const;

// Spawn positions (tile coordinates)
export const SPAWN_POSITIONS = {
    runner: { x: 50, y: 50 },
    ch0: { x: 45, y: 45 },
    ch1: { x: 55, y: 45 },
    ch2: { x: 50, y: 55 }
} as const;

// Collision
export const COLLISION_RADIUS = 0.5; // tiles
export const ENTITY_COLLISION_RADIUS = 0.5; // tiles
