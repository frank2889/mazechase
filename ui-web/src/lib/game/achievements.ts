/**
 * Achievement System - Badges and milestones for player retention
 * 
 * Based on David's UX recommendations:
 * - Investment in the game
 * - Long-term goals
 * - Show progress
 */

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'gameplay' | 'collection' | 'social' | 'mastery' | 'special';
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    requirement: number;
    progress: number;
    unlocked: boolean;
    unlockedAt?: string;
    reward: number; // Coins
    hidden?: boolean;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
    // ============================================
    // GAMEPLAY - Basic game actions
    // ============================================
    { id: 'first_game', name: 'Eerste Stappen', description: 'Speel je eerste game', icon: '👶', category: 'gameplay', tier: 'bronze', requirement: 1, reward: 50 },
    { id: 'games_10', name: 'Beginner', description: 'Speel 10 games', icon: '🎮', category: 'gameplay', tier: 'bronze', requirement: 10, reward: 100 },
    { id: 'games_50', name: 'Ervaren Speler', description: 'Speel 50 games', icon: '🎯', category: 'gameplay', tier: 'silver', requirement: 50, reward: 250 },
    { id: 'games_100', name: 'Veteraan', description: 'Speel 100 games', icon: '⭐', category: 'gameplay', tier: 'gold', requirement: 100, reward: 500 },
    { id: 'games_500', name: 'MazeChase Fanaat', description: 'Speel 500 games', icon: '🏆', category: 'gameplay', tier: 'platinum', requirement: 500, reward: 1500 },
    { id: 'games_1000', name: 'Legendary', description: 'Speel 1000 games', icon: '💎', category: 'gameplay', tier: 'diamond', requirement: 1000, reward: 5000 },

    // ============================================
    // COLLECTION - Pellets and items
    // ============================================
    { id: 'pellets_100', name: 'Pellet Collector', description: 'Verzamel 100 pellets', icon: '🟡', category: 'collection', tier: 'bronze', requirement: 100, reward: 75 },
    { id: 'pellets_1000', name: 'Pellet Hunter', description: 'Verzamel 1.000 pellets', icon: '🌟', category: 'collection', tier: 'silver', requirement: 1000, reward: 200 },
    { id: 'pellets_10000', name: 'Pellet Master', description: 'Verzamel 10.000 pellets', icon: '✨', category: 'collection', tier: 'gold', requirement: 10000, reward: 750 },
    { id: 'pellets_100000', name: 'Pellet Legend', description: 'Verzamel 100.000 pellets', icon: '💫', category: 'collection', tier: 'platinum', requirement: 100000, reward: 2500 },
    
    { id: 'powerups_10', name: 'Power Starter', description: 'Gebruik 10 power-ups', icon: '⚡', category: 'collection', tier: 'bronze', requirement: 10, reward: 75 },
    { id: 'powerups_100', name: 'Power Player', description: 'Gebruik 100 power-ups', icon: '🔋', category: 'collection', tier: 'silver', requirement: 100, reward: 250 },
    { id: 'powerups_500', name: 'Power Master', description: 'Gebruik 500 power-ups', icon: '⚡', category: 'collection', tier: 'gold', requirement: 500, reward: 750 },

    // ============================================
    // WINS - Victory achievements
    // ============================================
    { id: 'first_win', name: 'Eerste Overwinning', description: 'Win je eerste game', icon: '🥇', category: 'mastery', tier: 'bronze', requirement: 1, reward: 100 },
    { id: 'wins_10', name: 'Winner', description: 'Win 10 games', icon: '🏅', category: 'mastery', tier: 'silver', requirement: 10, reward: 300 },
    { id: 'wins_50', name: 'Champion', description: 'Win 50 games', icon: '👑', category: 'mastery', tier: 'gold', requirement: 50, reward: 750 },
    { id: 'wins_100', name: 'MazeChase Pro', description: 'Win 100 games', icon: '🏆', category: 'mastery', tier: 'platinum', requirement: 100, reward: 2000 },
    { id: 'wins_500', name: 'Unbeatable', description: 'Win 500 games', icon: '💎', category: 'mastery', tier: 'diamond', requirement: 500, reward: 7500 },

    // ============================================
    // STREAKS - Consecutive play
    // ============================================
    { id: 'streak_3', name: '3 Day Streak', description: 'Speel 3 dagen op rij', icon: '🔥', category: 'social', tier: 'bronze', requirement: 3, reward: 100 },
    { id: 'streak_7', name: 'Week Warrior', description: 'Speel 7 dagen op rij', icon: '🔥', category: 'social', tier: 'silver', requirement: 7, reward: 300 },
    { id: 'streak_14', name: 'Fortnight Fighter', description: 'Speel 14 dagen op rij', icon: '🔥', category: 'social', tier: 'gold', requirement: 14, reward: 750 },
    { id: 'streak_30', name: 'Monthly Master', description: 'Speel 30 dagen op rij', icon: '🔥', category: 'social', tier: 'platinum', requirement: 30, reward: 2000 },
    { id: 'streak_100', name: 'Dedicated Player', description: 'Speel 100 dagen op rij', icon: '👑', category: 'social', tier: 'diamond', requirement: 100, reward: 10000 },

    // ============================================
    // SPECIAL - Rare achievements
    // ============================================
    { id: 'perfect_game', name: 'Perfect Game', description: 'Verzamel ALLE pellets in een game', icon: '💯', category: 'special', tier: 'gold', requirement: 1, reward: 500 },
    { id: 'speedrunner', name: 'Speedrunner', description: 'Win een game in minder dan 60 seconden', icon: '⏱️', category: 'special', tier: 'gold', requirement: 1, reward: 500, hidden: true },
    { id: 'untouchable', name: 'Untouchable', description: 'Win zonder gevangen te worden', icon: '👻', category: 'special', tier: 'platinum', requirement: 1, reward: 1000, hidden: true },
    { id: 'triple_kill', name: 'Triple Elimination', description: 'Vang 3 Chasers in één power-up', icon: '🎯', category: 'special', tier: 'platinum', requirement: 1, reward: 750, hidden: true },
    { id: 'comeback', name: 'Comeback Kid', description: 'Win met minder dan 10 seconden over', icon: '⏰', category: 'special', tier: 'gold', requirement: 1, reward: 500, hidden: true },
];

const STORAGE_KEY = 'mazechase_achievements';

export interface AchievementState {
    achievements: Achievement[];
    totalUnlocked: number;
    totalCoinsEarned: number;
    lastUpdated: string;
}

function getDefaultState(): AchievementState {
    return {
        achievements: ACHIEVEMENT_DEFINITIONS.map(def => ({
            ...def,
            progress: 0,
            unlocked: false,
        })),
        totalUnlocked: 0,
        totalCoinsEarned: 0,
        lastUpdated: new Date().toISOString(),
    };
}

export function loadAchievements(): AchievementState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const state = JSON.parse(stored) as AchievementState;
            
            // Merge with definitions to add any new achievements
            const existingIds = new Set(state.achievements.map(a => a.id));
            const newAchievements = ACHIEVEMENT_DEFINITIONS
                .filter(def => !existingIds.has(def.id))
                .map(def => ({ ...def, progress: 0, unlocked: false }));
            
            return {
                ...state,
                achievements: [...state.achievements, ...newAchievements],
            };
        }
    } catch (e) {
        console.warn('Failed to load achievements:', e);
    }
    return getDefaultState();
}

export function saveAchievements(state: AchievementState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...state,
            lastUpdated: new Date().toISOString(),
        }));
    } catch (e) {
        console.warn('Failed to save achievements:', e);
    }
}

export type AchievementType = 
    | 'games' 
    | 'pellets' 
    | 'powerups' 
    | 'wins' 
    | 'streak' 
    | 'perfect_game' 
    | 'speedrun'
    | 'untouchable'
    | 'triple_kill'
    | 'comeback';

interface ProgressUpdate {
    type: AchievementType;
    value: number;
    increment?: boolean;
}

/**
 * Update achievement progress and check for unlocks
 * Returns list of newly unlocked achievements
 */
export function updateAchievementProgress(updates: ProgressUpdate[]): Achievement[] {
    const state = loadAchievements();
    const newlyUnlocked: Achievement[] = [];
    
    for (const update of updates) {
        const achievementIds = getAchievementIdsForType(update.type);
        
        for (const id of achievementIds) {
            const achievement = state.achievements.find(a => a.id === id);
            if (!achievement || achievement.unlocked) continue;
            
            // Update progress
            if (update.increment) {
                achievement.progress += update.value;
            } else {
                achievement.progress = Math.max(achievement.progress, update.value);
            }
            
            // Check for unlock
            if (achievement.progress >= achievement.requirement) {
                achievement.unlocked = true;
                achievement.unlockedAt = new Date().toISOString();
                state.totalUnlocked++;
                state.totalCoinsEarned += achievement.reward;
                newlyUnlocked.push(achievement);
            }
        }
    }
    
    saveAchievements(state);
    return newlyUnlocked;
}

function getAchievementIdsForType(type: AchievementType): string[] {
    switch (type) {
        case 'games':
            return ['first_game', 'games_10', 'games_50', 'games_100', 'games_500', 'games_1000'];
        case 'pellets':
            return ['pellets_100', 'pellets_1000', 'pellets_10000', 'pellets_100000'];
        case 'powerups':
            return ['powerups_10', 'powerups_100', 'powerups_500'];
        case 'wins':
            return ['first_win', 'wins_10', 'wins_50', 'wins_100', 'wins_500'];
        case 'streak':
            return ['streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_100'];
        case 'perfect_game':
            return ['perfect_game'];
        case 'speedrun':
            return ['speedrunner'];
        case 'untouchable':
            return ['untouchable'];
        case 'triple_kill':
            return ['triple_kill'];
        case 'comeback':
            return ['comeback'];
        default:
            return [];
    }
}

/**
 * Get achievement stats for profile display
 */
export function getAchievementStats(): { 
    total: number; 
    unlocked: number; 
    percentage: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
} {
    const state = loadAchievements();
    const total = state.achievements.filter(a => !a.hidden || a.unlocked).length;
    const unlocked = state.achievements.filter(a => a.unlocked).length;
    
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    
    for (const achievement of state.achievements) {
        if (achievement.hidden && !achievement.unlocked) continue;
        
        if (!byCategory[achievement.category]) {
            byCategory[achievement.category] = { total: 0, unlocked: 0 };
        }
        byCategory[achievement.category].total++;
        if (achievement.unlocked) {
            byCategory[achievement.category].unlocked++;
        }
    }
    
    return {
        total,
        unlocked,
        percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
        byCategory,
    };
}

/**
 * Get rarity percentage for an achievement
 * (In a real app this would come from server statistics)
 */
export function getAchievementRarity(achievementId: string): number {
    // Simulated rarity based on tier
    const state = loadAchievements();
    const achievement = state.achievements.find(a => a.id === achievementId);
    if (!achievement) return 100;
    
    const rarityByTier: Record<string, number> = {
        'bronze': 75,
        'silver': 45,
        'gold': 20,
        'platinum': 8,
        'diamond': 2,
    };
    
    return rarityByTier[achievement.tier] || 50;
}
