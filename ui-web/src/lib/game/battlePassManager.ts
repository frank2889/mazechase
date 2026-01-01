/**
 * Battle Pass Manager
 * EMMSOAI Suggestion (Marcus - Monetization & Business Strategy):
 * "Introduceer een beloningssysteem met unieke skins en power-ups"
 */

export interface BattlePassTier {
    level: number;
    xpRequired: number;
    freeReward?: BattlePassReward;
    premiumReward?: BattlePassReward;
}

export interface BattlePassReward {
    id: string;
    type: 'skin' | 'trail' | 'emote' | 'currency' | 'powerup' | 'title';
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    value?: number; // For currency rewards
}

export interface BattlePassSeason {
    id: string;
    name: string;
    theme: string;
    startDate: Date;
    endDate: Date;
    tiers: BattlePassTier[];
    price: number; // In real currency cents
}

export interface PlayerBattlePassProgress {
    seasonId: string;
    currentXp: number;
    currentLevel: number;
    isPremium: boolean;
    claimedFree: Set<number>;
    claimedPremium: Set<number>;
}

// Season 1 Configuration
const SEASON_1_TIERS: BattlePassTier[] = [
    // Level 1-10: Getting started
    { level: 1, xpRequired: 0, freeReward: { id: 'coins_100', type: 'currency', name: '100 Coins', description: 'Starting coins', icon: '🪙', rarity: 'common', value: 100 } },
    { level: 2, xpRequired: 100, premiumReward: { id: 'trail_neon', type: 'trail', name: 'Neon Trail', description: 'Leave a glowing trail', icon: '✨', rarity: 'common' } },
    { level: 3, xpRequired: 250, freeReward: { id: 'coins_150', type: 'currency', name: '150 Coins', description: 'More coins!', icon: '🪙', rarity: 'common', value: 150 } },
    { level: 4, xpRequired: 400, premiumReward: { id: 'skin_chrome', type: 'skin', name: 'Chrome Ball', description: 'Shiny metallic finish', icon: '🔘', rarity: 'rare' } },
    { level: 5, xpRequired: 600, freeReward: { id: 'emote_wave', type: 'emote', name: 'Wave', description: 'Friendly wave emote', icon: '👋', rarity: 'common' }, premiumReward: { id: 'coins_300', type: 'currency', name: '300 Coins', description: 'Premium coins', icon: '💰', rarity: 'rare', value: 300 } },
    { level: 6, xpRequired: 850, premiumReward: { id: 'trail_fire', type: 'trail', name: 'Fire Trail', description: 'Blaze a fiery path', icon: '🔥', rarity: 'rare' } },
    { level: 7, xpRequired: 1100, freeReward: { id: 'title_rookie', type: 'title', name: 'Rookie', description: 'Display "Rookie" title', icon: '🏷️', rarity: 'common' } },
    { level: 8, xpRequired: 1400, premiumReward: { id: 'skin_galaxy', type: 'skin', name: 'Galaxy Ball', description: 'Cosmic swirl pattern', icon: '🌌', rarity: 'epic' } },
    { level: 9, xpRequired: 1750, freeReward: { id: 'coins_200', type: 'currency', name: '200 Coins', description: 'Keep collecting!', icon: '🪙', rarity: 'common', value: 200 } },
    { level: 10, xpRequired: 2100, freeReward: { id: 'emote_celebrate', type: 'emote', name: 'Celebrate', description: 'Victory celebration', icon: '🎉', rarity: 'rare' }, premiumReward: { id: 'trail_rainbow', type: 'trail', name: 'Rainbow Trail', description: 'Colorful rainbow path', icon: '🌈', rarity: 'epic' } },

    // Level 11-20: Building momentum
    { level: 11, xpRequired: 2500, premiumReward: { id: 'coins_400', type: 'currency', name: '400 Coins', description: 'Nice stash!', icon: '💰', rarity: 'rare', value: 400 } },
    { level: 12, xpRequired: 2950, freeReward: { id: 'powerup_boost', type: 'powerup', name: 'Speed Boost x3', description: '3 speed boosts', icon: '⚡', rarity: 'common' } },
    { level: 13, xpRequired: 3400, premiumReward: { id: 'skin_lava', type: 'skin', name: 'Lava Ball', description: 'Molten magma look', icon: '🌋', rarity: 'epic' } },
    { level: 14, xpRequired: 3900, premiumReward: { id: 'emote_taunt', type: 'emote', name: 'Taunt', description: 'Playful taunt', icon: '😜', rarity: 'rare' } },
    { level: 15, xpRequired: 4450, freeReward: { id: 'coins_250', type: 'currency', name: '250 Coins', description: 'Halfway there!', icon: '🪙', rarity: 'common', value: 250 }, premiumReward: { id: 'trail_lightning', type: 'trail', name: 'Lightning Trail', description: 'Electric energy path', icon: '⚡', rarity: 'epic' } },
    { level: 16, xpRequired: 5000, premiumReward: { id: 'skin_ice', type: 'skin', name: 'Ice Ball', description: 'Frozen crystal look', icon: '❄️', rarity: 'epic' } },
    { level: 17, xpRequired: 5600, freeReward: { id: 'title_veteran', type: 'title', name: 'Veteran', description: 'Display "Veteran" title', icon: '🏷️', rarity: 'rare' } },
    { level: 18, xpRequired: 6250, premiumReward: { id: 'coins_500', type: 'currency', name: '500 Coins', description: 'Big reward!', icon: '💰', rarity: 'epic', value: 500 } },
    { level: 19, xpRequired: 6950, premiumReward: { id: 'emote_dance', type: 'emote', name: 'Victory Dance', description: 'Dance moves!', icon: '💃', rarity: 'epic' } },
    { level: 20, xpRequired: 7700, freeReward: { id: 'coins_300', type: 'currency', name: '300 Coins', description: 'Almost there!', icon: '🪙', rarity: 'common', value: 300 }, premiumReward: { id: 'skin_legendary_neon', type: 'skin', name: 'Legendary Neon', description: 'Ultimate neon glow', icon: '🌟', rarity: 'legendary' } },

    // Level 21-25: Final rewards
    { level: 21, xpRequired: 8500, premiumReward: { id: 'trail_legendary_cosmic', type: 'trail', name: 'Cosmic Trail', description: 'Stars follow you', icon: '💫', rarity: 'legendary' } },
    { level: 22, xpRequired: 9350, freeReward: { id: 'coins_350', type: 'currency', name: '350 Coins', description: 'Final free coins', icon: '🪙', rarity: 'rare', value: 350 } },
    { level: 23, xpRequired: 10250, premiumReward: { id: 'emote_legendary_crown', type: 'emote', name: 'Crown Dance', description: 'Royal celebration', icon: '👑', rarity: 'legendary' } },
    { level: 24, xpRequired: 11200, premiumReward: { id: 'coins_1000', type: 'currency', name: '1000 Coins', description: 'Jackpot!', icon: '💎', rarity: 'legendary', value: 1000 } },
    { level: 25, xpRequired: 12200, freeReward: { id: 'title_champion', type: 'title', name: 'Champion', description: 'Display "Champion" title', icon: '🏆', rarity: 'epic' }, premiumReward: { id: 'skin_ultimate', type: 'skin', name: 'Ultimate Champion', description: 'Exclusive Season 1 skin', icon: '🏆', rarity: 'legendary' } },
];

const SEASON_1: BattlePassSeason = {
    id: 'season_1',
    name: 'Season 1: Neon Nights',
    theme: 'neon',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    tiers: SEASON_1_TIERS,
    price: 999 // $9.99
};

const STORAGE_KEY = 'mazechase_battlepass';

export class BattlePassManager {
    private season: BattlePassSeason;
    private progress: PlayerBattlePassProgress;
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.season = SEASON_1;
        this.progress = this.loadProgress();
    }

    /**
     * Load progress from localStorage
     */
    private loadProgress(): PlayerBattlePassProgress {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    seasonId: data.seasonId,
                    currentXp: data.currentXp || 0,
                    currentLevel: data.currentLevel || 1,
                    isPremium: data.isPremium || false,
                    claimedFree: new Set(data.claimedFree || []),
                    claimedPremium: new Set(data.claimedPremium || [])
                };
            }
        } catch (e) {
            console.warn('[BattlePass] Failed to load progress:', e);
        }

        return {
            seasonId: this.season.id,
            currentXp: 0,
            currentLevel: 1,
            isPremium: false,
            claimedFree: new Set(),
            claimedPremium: new Set()
        };
    }

    /**
     * Save progress to localStorage
     */
    private saveProgress(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            seasonId: this.progress.seasonId,
            currentXp: this.progress.currentXp,
            currentLevel: this.progress.currentLevel,
            isPremium: this.progress.isPremium,
            claimedFree: Array.from(this.progress.claimedFree),
            claimedPremium: Array.from(this.progress.claimedPremium)
        }));
    }

    /**
     * Add XP and level up if needed
     */
    addXp(amount: number): { leveledUp: boolean; newLevel?: number } {
        this.progress.currentXp += amount;

        // Check for level ups
        let leveledUp = false;
        let newLevel = this.progress.currentLevel;

        while (newLevel < this.season.tiers.length) {
            const nextTier = this.season.tiers[newLevel];
            if (nextTier && this.progress.currentXp >= nextTier.xpRequired) {
                newLevel++;
                leveledUp = true;
            } else {
                break;
            }
        }

        if (leveledUp) {
            this.progress.currentLevel = newLevel;
            console.log(`[BattlePass] Level up! Now level ${newLevel}`);
        }

        this.saveProgress();
        this.notifyListeners();

        return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
    }

    /**
     * Claim a reward
     */
    claimReward(level: number, isPremium: boolean): BattlePassReward | null {
        const tier = this.season.tiers.find(t => t.level === level);
        if (!tier) return null;

        // Check if already claimed
        const claimedSet = isPremium ? this.progress.claimedPremium : this.progress.claimedFree;
        if (claimedSet.has(level)) return null;

        // Check if level is reached
        if (this.progress.currentLevel < level) return null;

        // Check if premium required
        if (isPremium && !this.progress.isPremium) return null;

        const reward = isPremium ? tier.premiumReward : tier.freeReward;
        if (!reward) return null;

        // Mark as claimed
        claimedSet.add(level);
        this.saveProgress();
        this.notifyListeners();

        console.log(`[BattlePass] Claimed: ${reward.name}`);
        return reward;
    }

    /**
     * Upgrade to premium
     */
    upgradeToPremium(): void {
        this.progress.isPremium = true;
        this.saveProgress();
        this.notifyListeners();
        console.log('[BattlePass] Upgraded to Premium!');
    }

    /**
     * Get current season info
     */
    getSeason(): BattlePassSeason {
        return this.season;
    }

    /**
     * Get player progress
     */
    getProgress(): PlayerBattlePassProgress {
        return this.progress;
    }

    /**
     * Get XP progress to next level
     */
    getXpToNextLevel(): { current: number; required: number; percentage: number } {
        const currentTier = this.season.tiers[this.progress.currentLevel - 1];
        const nextTier = this.season.tiers[this.progress.currentLevel];

        if (!nextTier || !currentTier) {
            return { current: 0, required: 0, percentage: 100 };
        }

        const xpIntoLevel = this.progress.currentXp - currentTier.xpRequired;
        const xpForLevel = nextTier.xpRequired - currentTier.xpRequired;
        
        return {
            current: xpIntoLevel,
            required: xpForLevel,
            percentage: Math.round((xpIntoLevel / xpForLevel) * 100)
        };
    }

    /**
     * Get days remaining in season
     */
    getDaysRemaining(): number {
        const now = new Date();
        const diff = this.season.endDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    /**
     * Get unclaimed rewards
     */
    getUnclaimedRewards(): { free: number[]; premium: number[] } {
        const free: number[] = [];
        const premium: number[] = [];

        for (const tier of this.season.tiers) {
            if (tier.level > this.progress.currentLevel) break;

            if (tier.freeReward && !this.progress.claimedFree.has(tier.level)) {
                free.push(tier.level);
            }
            if (tier.premiumReward && this.progress.isPremium && !this.progress.claimedPremium.has(tier.level)) {
                premium.push(tier.level);
            }
        }

        return { free, premium };
    }

    /**
     * Subscribe to changes
     */
    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(fn => fn());
    }
}

// Singleton instance
export const battlePassManager = new BattlePassManager();
