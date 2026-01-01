/**
 * Achievement System
 * EMMSOAI Suggestion (David - UX Researcher & Retention Specialist):
 * "Creëer een basis achievement systeem - Motiveren van spelers door doelen te stellen"
 */

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'gameplay' | 'collection' | 'social' | 'mastery' | 'secret';
    progress: number;
    target: number;
    reward: number;
    unlockedAt?: Date;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AchievementProgress {
    achievements: Map<string, Achievement>;
    totalUnlocked: number;
    totalPoints: number;
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlockedAt'>[] = [
    // Gameplay achievements
    { id: 'first_win', title: 'First Victory', description: 'Win your first game', icon: '🏆', category: 'gameplay', target: 1, reward: 100, tier: 'bronze' },
    { id: 'win_streak_3', title: 'On Fire', description: 'Win 3 games in a row', icon: '🔥', category: 'gameplay', target: 3, reward: 250, tier: 'silver' },
    { id: 'win_streak_10', title: 'Unstoppable', description: 'Win 10 games in a row', icon: '⚡', category: 'gameplay', target: 10, reward: 1000, tier: 'gold' },
    { id: 'games_10', title: 'Getting Started', description: 'Play 10 games', icon: '🎮', category: 'gameplay', target: 10, reward: 50, tier: 'bronze' },
    { id: 'games_100', title: 'Dedicated Player', description: 'Play 100 games', icon: '🎯', category: 'gameplay', target: 100, reward: 500, tier: 'silver' },
    { id: 'games_1000', title: 'Veteran', description: 'Play 1000 games', icon: '👑', category: 'gameplay', target: 1000, reward: 2000, tier: 'platinum' },

    // Collection achievements
    { id: 'pellets_100', title: 'Nibbler', description: 'Collect 100 pellets', icon: '🟡', category: 'collection', target: 100, reward: 50, tier: 'bronze' },
    { id: 'pellets_1000', title: 'Hungry', description: 'Collect 1,000 pellets', icon: '🟡', category: 'collection', target: 1000, reward: 200, tier: 'silver' },
    { id: 'pellets_10000', title: 'Insatiable', description: 'Collect 10,000 pellets', icon: '⭐', category: 'collection', target: 10000, reward: 1000, tier: 'gold' },
    { id: 'powerups_10', title: 'Power Up!', description: 'Use 10 power-ups', icon: '⚡', category: 'collection', target: 10, reward: 75, tier: 'bronze' },
    { id: 'powerups_100', title: 'Supercharged', description: 'Use 100 power-ups', icon: '💪', category: 'collection', target: 100, reward: 300, tier: 'silver' },

    // Social achievements
    { id: 'multiplayer_first', title: 'Social Butterfly', description: 'Play a multiplayer game', icon: '👥', category: 'social', target: 1, reward: 100, tier: 'bronze' },
    { id: 'share_first', title: 'Influencer', description: 'Share your first highlight', icon: '📱', category: 'social', target: 1, reward: 150, tier: 'bronze' },

    // Mastery achievements
    { id: 'perfect_clear', title: 'Perfect Clear', description: 'Collect all pellets in a game', icon: '💯', category: 'mastery', target: 1, reward: 500, tier: 'gold' },
    { id: 'speed_demon', title: 'Speed Demon', description: 'Win a game in under 60 seconds', icon: '⏱️', category: 'mastery', target: 1, reward: 750, tier: 'gold' },
    { id: 'survivor', title: 'Survivor', description: 'Escape 50 close calls with Chasers', icon: '😅', category: 'mastery', target: 50, reward: 400, tier: 'silver' },

    // Secret achievements
    { id: 'secret_bounce', title: '???', description: 'Perform 100 perfect bounces', icon: '❓', category: 'secret', target: 100, reward: 1000, tier: 'platinum' },
];

const STORAGE_KEY = 'mazechase_achievements';

export class AchievementManager {
    private achievements: Map<string, Achievement> = new Map();
    private listeners: Set<(achievement: Achievement) => void> = new Set();
    private totalPoints = 0;

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Initialize achievements from definitions
     */
    private initializeAchievements(): void {
        for (const def of ACHIEVEMENT_DEFINITIONS) {
            this.achievements.set(def.id, {
                ...def,
                progress: 0,
                unlockedAt: undefined
            });
        }
    }

    /**
     * Load achievement progress from localStorage
     */
    private loadFromStorage(): void {
        this.initializeAchievements();
        
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                for (const [id, progress] of Object.entries(data.progress || {})) {
                    const achievement = this.achievements.get(id);
                    if (achievement) {
                        achievement.progress = progress as number;
                        if (data.unlocked?.[id]) {
                            achievement.unlockedAt = new Date(data.unlocked[id]);
                        }
                    }
                }
                this.totalPoints = data.totalPoints || 0;
            }
        } catch (e) {
            console.warn('[Achievements] Failed to load:', e);
        }
    }

    /**
     * Save achievement progress to localStorage
     */
    private saveToStorage(): void {
        const progress: Record<string, number> = {};
        const unlocked: Record<string, string> = {};

        for (const [id, achievement] of this.achievements) {
            progress[id] = achievement.progress;
            if (achievement.unlockedAt) {
                unlocked[id] = achievement.unlockedAt.toISOString();
            }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            progress,
            unlocked,
            totalPoints: this.totalPoints
        }));
    }

    /**
     * Update progress for an achievement
     */
    updateProgress(achievementId: string, increment = 1): Achievement | null {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlockedAt) return null;

        achievement.progress = Math.min(achievement.progress + increment, achievement.target);

        // Check if unlocked
        if (achievement.progress >= achievement.target && !achievement.unlockedAt) {
            achievement.unlockedAt = new Date();
            this.totalPoints += achievement.reward;
            
            // Notify listeners
            this.listeners.forEach(fn => fn(achievement));
            
            console.log(`[Achievement] Unlocked: ${achievement.title}`);
        }

        this.saveToStorage();
        return achievement;
    }

    /**
     * Track game events and update relevant achievements
     */
    trackEvent(event: string, value = 1): void {
        switch (event) {
            case 'game_win':
                this.updateProgress('first_win', 1);
                // Track win streaks
                this.updateProgress('win_streak_3', 1);
                this.updateProgress('win_streak_10', 1);
                break;
            case 'game_played':
                this.updateProgress('games_10', 1);
                this.updateProgress('games_100', 1);
                this.updateProgress('games_1000', 1);
                break;
            case 'pellet_collected':
                this.updateProgress('pellets_100', value);
                this.updateProgress('pellets_1000', value);
                this.updateProgress('pellets_10000', value);
                break;
            case 'powerup_used':
                this.updateProgress('powerups_10', value);
                this.updateProgress('powerups_100', value);
                break;
            case 'multiplayer_played':
                this.updateProgress('multiplayer_first', 1);
                break;
            case 'highlight_shared':
                this.updateProgress('share_first', 1);
                break;
            case 'perfect_clear':
                this.updateProgress('perfect_clear', 1);
                break;
            case 'speed_win':
                this.updateProgress('speed_demon', 1);
                break;
            case 'close_call':
                this.updateProgress('survivor', 1);
                break;
            case 'perfect_bounce':
                this.updateProgress('secret_bounce', 1);
                break;
        }
    }

    /**
     * Get all achievements
     */
    getAll(): Achievement[] {
        return Array.from(this.achievements.values());
    }

    /**
     * Get unlocked achievements
     */
    getUnlocked(): Achievement[] {
        return this.getAll().filter(a => a.unlockedAt);
    }

    /**
     * Get achievements by category
     */
    getByCategory(category: Achievement['category']): Achievement[] {
        return this.getAll().filter(a => a.category === category);
    }

    /**
     * Get total achievement points
     */
    getTotalPoints(): number {
        return this.totalPoints;
    }

    /**
     * Get completion percentage
     */
    getCompletionPercentage(): number {
        const unlocked = this.getUnlocked().length;
        return Math.round((unlocked / this.achievements.size) * 100);
    }

    /**
     * Subscribe to achievement unlocks
     */
    onUnlock(callback: (achievement: Achievement) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}

// Singleton instance
export const achievementManager = new AchievementManager();
