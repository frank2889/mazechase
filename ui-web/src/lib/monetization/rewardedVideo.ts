/**
 * Rewarded Video Ads System
 * 
 * AI Tester Suggestion (Marcus - Monetization Analyst):
 * "Voeg rewarded video ads toe voor kleine boosts.
 * Niet-opdringerige monetisatie optie."
 * 
 * Features:
 * - Voluntary ad viewing
 * - Clear reward preview
 * - Cooldown system
 * - Multiple reward types
 * - Fair value exchange
 */

export type RewardType = 
    | 'coins'
    | 'gems'
    | 'xp_boost'
    | 'double_coins'
    | 'extra_life'
    | 'power_up'
    | 'mystery_box';

export interface RewardedAdSlot {
    id: string;
    name: string;
    description: string;
    rewardType: RewardType;
    rewardAmount: number;
    cooldownMs: number;
    maxPerDay: number;
    context: AdContext;
}

export type AdContext = 
    | 'main_menu'
    | 'game_over'
    | 'shop'
    | 'battle_pass'
    | 'daily_reward';

export interface AdWatchResult {
    success: boolean;
    reward?: {
        type: RewardType;
        amount: number;
        displayText: string;
    };
    error?: string;
    nextAvailableAt?: Date;
}

interface AdSlotState {
    lastWatchedAt: number;
    watchedToday: number;
    lastResetDate: string;
}

// Ad slot definitions
const AD_SLOTS: RewardedAdSlot[] = [
    {
        id: 'daily_bonus',
        name: 'Daily Bonus Ad',
        description: 'Watch to double your daily login reward',
        rewardType: 'double_coins',
        rewardAmount: 2, // 2x multiplier
        cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
        maxPerDay: 1,
        context: 'main_menu'
    },
    {
        id: 'revive',
        name: 'Revive',
        description: 'Continue playing with an extra life',
        rewardType: 'extra_life',
        rewardAmount: 1,
        cooldownMs: 30 * 60 * 1000, // 30 minutes
        maxPerDay: 3,
        context: 'game_over'
    },
    {
        id: 'coin_boost',
        name: 'Coin Boost',
        description: 'Get 100 bonus coins',
        rewardType: 'coins',
        rewardAmount: 100,
        cooldownMs: 15 * 60 * 1000, // 15 minutes
        maxPerDay: 5,
        context: 'shop'
    },
    {
        id: 'xp_boost',
        name: 'XP Boost',
        description: '2x XP for the next game',
        rewardType: 'xp_boost',
        rewardAmount: 2, // 2x multiplier
        cooldownMs: 60 * 60 * 1000, // 1 hour
        maxPerDay: 3,
        context: 'battle_pass'
    },
    {
        id: 'mystery_reward',
        name: 'Mystery Reward',
        description: 'Open a mystery box with random rewards',
        rewardType: 'mystery_box',
        rewardAmount: 1,
        cooldownMs: 4 * 60 * 60 * 1000, // 4 hours
        maxPerDay: 2,
        context: 'main_menu'
    },
    {
        id: 'power_up_unlock',
        name: 'Power-Up Boost',
        description: 'Start next game with a random power-up',
        rewardType: 'power_up',
        rewardAmount: 1,
        cooldownMs: 45 * 60 * 1000, // 45 minutes
        maxPerDay: 4,
        context: 'game_over'
    }
];

// Reward display text
const REWARD_DISPLAY: Record<RewardType, (amount: number) => string> = {
    coins: (n) => `+${n} Coins`,
    gems: (n) => `+${n} Gems`,
    xp_boost: (n) => `${n}x XP Boost`,
    double_coins: () => '2x Coin Bonus',
    extra_life: () => 'Extra Life',
    power_up: () => 'Random Power-Up',
    mystery_box: () => 'Mystery Box'
};

/**
 * RewardedVideoManager - Handles rewarded video ads
 */
export class RewardedVideoManager {
    private slotStates: Map<string, AdSlotState> = new Map();
    private activeBoosts: Map<RewardType, { expiresAt: number; multiplier: number }> = new Map();
    private onRewardCallbacks: ((result: AdWatchResult) => void)[] = [];
    private isAdPlaying: boolean = false;

    constructor() {
        this.loadFromStorage();
        this.checkDailyReset();
    }

    /**
     * Get available ad slots for context
     */
    getAvailableSlots(context: AdContext): RewardedAdSlot[] {
        this.checkDailyReset();
        return AD_SLOTS.filter(slot => 
            slot.context === context && this.isSlotAvailable(slot.id)
        );
    }

    /**
     * Check if a specific slot is available
     */
    isSlotAvailable(slotId: string): boolean {
        const slot = AD_SLOTS.find(s => s.id === slotId);
        if (!slot) return false;

        const state = this.slotStates.get(slotId);
        if (!state) return true;

        const now = Date.now();
        
        // Check cooldown
        if (now - state.lastWatchedAt < slot.cooldownMs) {
            return false;
        }

        // Check daily limit
        if (state.watchedToday >= slot.maxPerDay) {
            return false;
        }

        return true;
    }

    /**
     * Get time until slot is available
     */
    getTimeUntilAvailable(slotId: string): number {
        const slot = AD_SLOTS.find(s => s.id === slotId);
        if (!slot) return 0;

        const state = this.slotStates.get(slotId);
        if (!state) return 0;

        const cooldownEnd = state.lastWatchedAt + slot.cooldownMs;
        return Math.max(0, cooldownEnd - Date.now());
    }

    /**
     * Get remaining watches today for slot
     */
    getRemainingToday(slotId: string): number {
        const slot = AD_SLOTS.find(s => s.id === slotId);
        if (!slot) return 0;

        const state = this.slotStates.get(slotId);
        if (!state) return slot.maxPerDay;

        return Math.max(0, slot.maxPerDay - state.watchedToday);
    }

    /**
     * Watch a rewarded ad
     */
    async watchAd(slotId: string): Promise<AdWatchResult> {
        const slot = AD_SLOTS.find(s => s.id === slotId);
        if (!slot) {
            return { success: false, error: 'Invalid ad slot' };
        }

        if (!this.isSlotAvailable(slotId)) {
            const timeUntil = this.getTimeUntilAvailable(slotId);
            return { 
                success: false, 
                error: 'Ad not available yet',
                nextAvailableAt: new Date(Date.now() + timeUntil)
            };
        }

        if (this.isAdPlaying) {
            return { success: false, error: 'Ad already playing' };
        }

        this.isAdPlaying = true;

        try {
            // Simulate ad playback (in production, integrate with ad SDK)
            const adResult = await this.simulateAdPlayback();
            
            if (!adResult.completed) {
                return { success: false, error: 'Ad not completed' };
            }

            // Update state
            this.updateSlotState(slotId);

            // Grant reward
            this.grantReward(slot);

            const result: AdWatchResult = {
                success: true,
                reward: {
                    type: slot.rewardType,
                    amount: slot.rewardAmount,
                    displayText: REWARD_DISPLAY[slot.rewardType](slot.rewardAmount)
                }
            };

            this.notifyReward(result);
            return result;

        } finally {
            this.isAdPlaying = false;
        }
    }

    /**
     * Simulate ad playback (replace with real ad SDK)
     */
    private async simulateAdPlayback(): Promise<{ completed: boolean }> {
        return new Promise((resolve) => {
            // Dispatch event for UI to show ad placeholder
            window.dispatchEvent(new CustomEvent('mazechase:ad_start'));
            
            // Simulate 5-second ad
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('mazechase:ad_end'));
                resolve({ completed: true });
            }, 5000);
        });
    }

    /**
     * Update slot state after watching
     */
    private updateSlotState(slotId: string): void {
        const now = Date.now();
        const today = new Date().toDateString();

        const existing = this.slotStates.get(slotId);
        
        this.slotStates.set(slotId, {
            lastWatchedAt: now,
            watchedToday: (existing?.lastResetDate === today ? existing.watchedToday : 0) + 1,
            lastResetDate: today
        });

        this.saveToStorage();
    }

    /**
     * Grant reward based on type
     */
    private grantReward(slot: RewardedAdSlot): void {
        switch (slot.rewardType) {
            case 'coins':
                window.dispatchEvent(new CustomEvent('mazechase:add_currency', {
                    detail: { type: 'coins', amount: slot.rewardAmount }
                }));
                break;

            case 'gems':
                window.dispatchEvent(new CustomEvent('mazechase:add_currency', {
                    detail: { type: 'gems', amount: slot.rewardAmount }
                }));
                break;

            case 'xp_boost':
            case 'double_coins':
                // Set temporary boost
                this.activeBoosts.set(slot.rewardType, {
                    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
                    multiplier: slot.rewardAmount
                });
                break;

            case 'extra_life':
                window.dispatchEvent(new CustomEvent('mazechase:grant_life'));
                break;

            case 'power_up':
                window.dispatchEvent(new CustomEvent('mazechase:grant_powerup', {
                    detail: { random: true }
                }));
                break;

            case 'mystery_box':
                this.openMysteryBox();
                break;
        }

        console.log(`[RewardedVideo] Granted: ${slot.rewardType} x${slot.rewardAmount}`);
    }

    /**
     * Open mystery box with random reward
     */
    private openMysteryBox(): void {
        const rewards = [
            { type: 'coins', min: 50, max: 200 },
            { type: 'gems', min: 5, max: 25 },
            { type: 'xp', min: 100, max: 500 }
        ];

        const chosen = rewards[Math.floor(Math.random() * rewards.length)];
        if (!chosen) return;
        const amount = Math.floor(Math.random() * (chosen.max - chosen.min + 1)) + chosen.min;

        window.dispatchEvent(new CustomEvent('mazechase:mystery_reward', {
            detail: { type: chosen.type, amount }
        }));
    }

    /**
     * Check if boost is active
     */
    getActiveBoost(type: RewardType): number {
        const boost = this.activeBoosts.get(type);
        if (!boost) return 1;

        if (Date.now() > boost.expiresAt) {
            this.activeBoosts.delete(type);
            return 1;
        }

        return boost.multiplier;
    }

    /**
     * Get all active boosts
     */
    getAllActiveBoosts(): Map<RewardType, { expiresAt: number; multiplier: number }> {
        // Clean expired
        const now = Date.now();
        for (const [type, boost] of this.activeBoosts) {
            if (now > boost.expiresAt) {
                this.activeBoosts.delete(type);
            }
        }
        return new Map(this.activeBoosts);
    }

    /**
     * Subscribe to reward events
     */
    onReward(callback: (result: AdWatchResult) => void): () => void {
        this.onRewardCallbacks.push(callback);
        return () => {
            this.onRewardCallbacks = this.onRewardCallbacks.filter(cb => cb !== callback);
        };
    }

    // Private helpers
    private checkDailyReset(): void {
        const today = new Date().toDateString();
        
        for (const [_slotId, state] of this.slotStates) {
            if (state.lastResetDate !== today) {
                state.watchedToday = 0;
                state.lastResetDate = today;
            }
        }
    }

    private saveToStorage(): void {
        try {
            const data: Record<string, AdSlotState> = {};
            for (const [id, state] of this.slotStates) {
                data[id] = state;
            }
            localStorage.setItem('mazechase_ads', JSON.stringify(data));
        } catch (e) {
            console.warn('[RewardedVideo] Failed to save:', e);
        }
    }

    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem('mazechase_ads');
            if (data) {
                const parsed = JSON.parse(data);
                for (const [id, state] of Object.entries(parsed)) {
                    this.slotStates.set(id, state as AdSlotState);
                }
            }
        } catch (e) {
            console.warn('[RewardedVideo] Failed to load:', e);
        }
    }

    private notifyReward(result: AdWatchResult): void {
        this.onRewardCallbacks.forEach(cb => cb(result));
    }
}

// Singleton
let rewardedVideoManager: RewardedVideoManager | null = null;

export function getRewardedVideoManager(): RewardedVideoManager {
    if (!rewardedVideoManager) {
        rewardedVideoManager = new RewardedVideoManager();
    }
    return rewardedVideoManager;
}
