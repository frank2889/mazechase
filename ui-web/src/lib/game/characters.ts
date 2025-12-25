/**
 * MazeChase - 4-Player Character System
 * Each player gets their own unique character with distinct colors and abilities
 */

export interface PlayerCharacter {
    id: string;
    name: string;
    color: string;
    hexColor: number;
    spriteKey: string;
    description: string;
    speedModifier: number;
}

// 4 unique player characters with distinct visual identities
export const PLAYER_CHARACTERS: Record<string, PlayerCharacter> = {
    player1: {
        id: 'player1',
        name: 'Azure',
        color: 'blue',
        hexColor: 0x00BFFF, // Deep Sky Blue
        spriteKey: 'player1',
        description: 'The Swift Runner - Fast but fragile',
        speedModifier: 1.1,
    },
    player2: {
        id: 'player2',
        name: 'Crimson',
        color: 'red',
        hexColor: 0xFF4444, // Bright Red
        spriteKey: 'player2',
        description: 'The Tank - Slower but can push others',
        speedModifier: 0.95,
    },
    player3: {
        id: 'player3',
        name: 'Jade',
        color: 'green',
        hexColor: 0x44FF44, // Bright Green
        spriteKey: 'player3',
        description: 'The Collector - Bonus points on pellets',
        speedModifier: 1.0,
    },
    player4: {
        id: 'player4',
        name: 'Amber',
        color: 'orange',
        hexColor: 0xFFA500, // Orange
        spriteKey: 'player4',
        description: 'The Trickster - Can drop decoys',
        speedModifier: 1.05,
    },
};

// Player spawn positions for 4 players (corners of the map)
export const SPAWN_POSITIONS = {
    player1: { x: 1, y: 1 },      // Top-left
    player2: { x: 26, y: 1 },     // Top-right
    player3: { x: 1, y: 29 },     // Bottom-left
    player4: { x: 26, y: 29 },    // Bottom-right
};

// Get character by ID
export function getCharacter(playerId: string): PlayerCharacter | undefined {
    return PLAYER_CHARACTERS[playerId];
}

// Get all available characters
export function getAvailableCharacters(): PlayerCharacter[] {
    return Object.values(PLAYER_CHARACTERS);
}

// Character colors for UI
export const CHARACTER_COLORS = {
    player1: '#00BFFF',
    player2: '#FF4444',
    player3: '#44FF44',
    player4: '#FFA500',
};

// Character trail effects
export interface TrailEffect {
    color: number;
    alpha: number;
    duration: number;
}

export const CHARACTER_TRAILS: Record<string, TrailEffect> = {
    player1: { color: 0x00BFFF, alpha: 0.3, duration: 200 },
    player2: { color: 0xFF4444, alpha: 0.4, duration: 300 },
    player3: { color: 0x44FF44, alpha: 0.25, duration: 150 },
    player4: { color: 0xFFA500, alpha: 0.35, duration: 250 },
};

/**
 * Player state for multiplayer sync
 */
export interface PlayerState {
    id: string;
    username: string;
    characterId: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'none';
    score: number;
    isAlive: boolean;
    powerUpActive: boolean;
    powerUpEndTime?: number;
}

/**
 * Game state containing all 4 players
 */
export interface GameState {
    players: Map<string, PlayerState>;
    pelletsRemaining: number;
    powerUpsRemaining: number;
    gameTime: number;
    isGameOver: boolean;
    winnerId?: string;
}

/**
 * Create initial player state
 */
export function createPlayerState(
    id: string,
    username: string,
    characterId: string
): PlayerState {
    const spawn = SPAWN_POSITIONS[characterId as keyof typeof SPAWN_POSITIONS];
    return {
        id,
        username,
        characterId,
        x: spawn?.x ?? 14,
        y: spawn?.y ?? 15,
        direction: 'none',
        score: 0,
        isAlive: true,
        powerUpActive: false,
    };
}

/**
 * Player score calculation
 */
export const SCORE_VALUES = {
    pellet: 10,
    powerPellet: 50,
    eliminatePlayer: 200,
    bonusFruit: 100,
    survivalBonus: 500,
    winnerBonus: 1000,
};

/**
 * Calculate final score with character bonuses
 */
export function calculateFinalScore(
    baseScore: number,
    characterId: string,
    pelletsCollected: number,
    playersEliminated: number,
    survived: boolean,
    won: boolean
): number {
    const character = getCharacter(characterId);
    let score = baseScore;

    // Jade (player3) gets bonus for pellets
    if (characterId === 'player3') {
        score += Math.floor(pelletsCollected * 0.1) * SCORE_VALUES.pellet;
    }

    // Crimson (player2) gets bonus for eliminations
    if (characterId === 'player2') {
        score += playersEliminated * 50;
    }

    if (survived) {
        score += SCORE_VALUES.survivalBonus;
    }

    if (won) {
        score += SCORE_VALUES.winnerBonus;
    }

    return score;
}
