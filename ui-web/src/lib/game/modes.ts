/**
 * MazeChase Game Modes
 * 
 * A) CLASSIC - 1 Runner vs 3 Chasers
 * B) RACE - 4 players race to collect the most pellets
 * C) BATTLE - Last player standing wins (power-ups eliminate others)
 */

import { Zap, Flag, Swords } from 'lucide-solid';
import type { JSX } from 'solid-js';

export type GameMode = 'classic' | 'race' | 'battle';

export interface GameModeConfig {
    id: GameMode;
    name: string;
    nameNL: string;
    description: string;
    descriptionNL: string;
    icon: string;
    iconComponent: JSX.Element;
    minPlayers: number;
    maxPlayers: number;
    hasTeams: boolean;
    scoreMultiplier: number;
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
    classic: {
        id: 'classic',
        name: 'Classic',
        nameNL: 'Klassiek',
        description: '1 Runner vs 3 Chasers',
        descriptionNL: '1 Runner jaagt op pellets, 3 Chasers jagen op Runner',
        icon: 'zap',
        iconComponent: Zap({ class: "w-8 h-8 text-cyan-400" }),
        minPlayers: 2,
        maxPlayers: 4,
        hasTeams: true,
        scoreMultiplier: 1,
    },
    race: {
        id: 'race',
        name: 'Race',
        nameNL: 'Race',
        description: '4 players race to collect the most pellets',
        descriptionNL: 'Verzamel zoveel mogelijk pellets. Hoogste score wint!',
        icon: 'flag',
        iconComponent: Flag({ class: "w-8 h-8 text-cyan-400" }),
        minPlayers: 2,
        maxPlayers: 4,
        hasTeams: false,
        scoreMultiplier: 1.5,
    },
    battle: {
        id: 'battle',
        name: 'Battle Royale',
        nameNL: 'Gevecht',
        description: 'Last player standing wins',
        descriptionNL: 'Pak power-ups en elimineer anderen. Laatste wint!',
        icon: 'swords',
        iconComponent: Swords({ class: "w-8 h-8 text-orange-400" }),
        minPlayers: 2,
        maxPlayers: 4,
        hasTeams: false,
        scoreMultiplier: 2,
    },
};

export function getGameMode(): GameMode {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as GameMode;
    return GAME_MODES[mode] ? mode : 'classic';
}

export function getGameModeConfig(): GameModeConfig {
    return GAME_MODES[getGameMode()];
}

/**
 * Score values per game mode
 */
export const SCORE_VALUES = {
    pellet: 10,
    powerPellet: 50,
    eliminatePlayer: 200,
    chaserCaught: 200,
    survivalBonus: 500,
    winnerBonus: 1000,
    raceTimeBonus: 100, // Per second remaining
};

/**
 * Player state for scoring
 */
export interface PlayerScore {
    oderId: string;
    username: string;
    score: number;
    pelletsCollected: number;
    playersEliminated: number;
    isAlive: boolean;
    finishTime?: number;
}

/**
 * Game state for end screen
 */
export interface GameResult {
    mode: GameMode;
    winnerId: string;
    winnerName: string;
    scores: PlayerScore[];
    gameDuration: number;
    reason: string;
}

// Store current game scores
let currentScores: Map<string, PlayerScore> = new Map();
let gameStartTime: number = 0;

export function initScores(players: string[]) {
    currentScores.clear();
    gameStartTime = Date.now();
    players.forEach(id => {
        currentScores.set(id, {
            oderId: id,
            username: '',
            score: 0,
            pelletsCollected: 0,
            playersEliminated: 0,
            isAlive: true,
        });
    });
}

export function addScore(playerId: string, points: number) {
    const score = currentScores.get(playerId);
    if (score) {
        score.score += points;
    }
}

export function addPelletScore(playerId: string) {
    const score = currentScores.get(playerId);
    if (score) {
        score.score += SCORE_VALUES.pellet;
        score.pelletsCollected++;
    }
}

export function addEliminationScore(killerId: string, victimId: string) {
    const killerScore = currentScores.get(killerId);
    const victimScore = currentScores.get(victimId);
    if (killerScore) {
        killerScore.score += SCORE_VALUES.eliminatePlayer;
        killerScore.playersEliminated++;
    }
    if (victimScore) {
        victimScore.isAlive = false;
    }
}

export function getScores(): PlayerScore[] {
    return Array.from(currentScores.values()).sort((a, b) => b.score - a.score);
}

export function getGameResult(winnerId: string, winnerName: string, reason: string): GameResult {
    const scores = getScores();
    const winnerScore = currentScores.get(winnerId);
    if (winnerScore) {
        winnerScore.score += SCORE_VALUES.winnerBonus;
    }
    
    return {
        mode: getGameMode(),
        winnerId,
        winnerName,
        scores: getScores(),
        gameDuration: Math.floor((Date.now() - gameStartTime) / 1000),
        reason,
    };
}
