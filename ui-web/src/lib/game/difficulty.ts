/**
 * Difficulty Settings for MazeChase
 * Based on AI Tester Feedback: Emma, Tim, Sandra, Peter, Grandma Mei
 * - Kids (Emma) want easier modes
 * - Teens (Tim) want harder modes  
 * - Adults (Sandra, Peter) want balanced
 * - Seniors (Grandma Mei) need slower gameplay
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
    id: DifficultyLevel;
    name: string;
    nameNL: string;
    description: string;
    icon: string;
    color: string;
}

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyConfig> = {
    easy: {
        id: 'easy',
        name: 'Easy',
        nameNL: 'Makkelijk',
        description: 'Langzamere bots, meer power-ups',
        icon: '🌟',
        color: 'from-green-500 to-emerald-500'
    },
    medium: {
        id: 'medium',
        name: 'Normal', 
        nameNL: 'Normaal',
        description: 'Gebalanceerde uitdaging',
        icon: '⚡',
        color: 'from-blue-500 to-purple-500'
    },
    hard: {
        id: 'hard',
        name: 'Hard',
        nameNL: 'Moeilijk',
        description: 'Snelle bots, minder power-ups',
        icon: '🔥',
        color: 'from-orange-500 to-red-500'
    }
};

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'medium';

/**
 * Check if we're running in browser
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

/**
 * Get difficulty from URL or localStorage
 */
export function getDifficulty(): DifficultyLevel {
    if (!isBrowser()) {
        return DEFAULT_DIFFICULTY;
    }
    
    // Check URL first
    const params = new URLSearchParams(window.location.search);
    const urlDifficulty = params.get('difficulty') as DifficultyLevel;
    if (urlDifficulty && DIFFICULTY_LEVELS[urlDifficulty]) {
        return urlDifficulty;
    }
    
    // Check localStorage
    const stored = localStorage.getItem('mazechase_difficulty') as DifficultyLevel;
    if (stored && DIFFICULTY_LEVELS[stored]) {
        return stored;
    }
    
    return DEFAULT_DIFFICULTY;
}

/**
 * Save difficulty preference
 */
export function setDifficulty(level: DifficultyLevel): void {
    if (!isBrowser()) return;
    localStorage.setItem('mazechase_difficulty', level);
}
