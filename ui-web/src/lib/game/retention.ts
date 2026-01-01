/**
 * Streak Rewards System
 * 
 * AI Tester Suggestion (David - Retention Specialist):
 * "Introduce rewards for consecutive days playing to boost retention.
 * Players love the dopamine hit of maintaining a streak!"
 * 
 * Features:
 * - Daily login tracking
 * - Progressive rewards for longer streaks
 * - Streak protection (miss 1 day without losing)
 * - Milestone bonuses at 7, 30, 100 days
 */

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string; // ISO date string YYYY-MM-DD
    totalDaysPlayed: number;
    streakProtectionUsed: boolean;
    claimedRewards: number[]; // Array of streak days already claimed
}

interface StreakReward {
    day: number;
    coins: number;
    gems?: number;
    item?: string;
    title?: string;
    isMilestone?: boolean;
}

// Reward schedule - gets progressively better
const STREAK_REWARDS: StreakReward[] = [
    { day: 1, coins: 100 },
    { day: 2, coins: 150 },
    { day: 3, coins: 200, gems: 5 },
    { day: 4, coins: 250 },
    { day: 5, coins: 300, gems: 10 },
    { day: 6, coins: 350 },
    { day: 7, coins: 500, gems: 25, item: 'streak_trail_7day', title: 'Dedicated Player', isMilestone: true },
    // Week 2
    { day: 8, coins: 200 },
    { day: 9, coins: 200 },
    { day: 10, coins: 250, gems: 10 },
    { day: 11, coins: 250 },
    { day: 12, coins: 300, gems: 10 },
    { day: 13, coins: 300 },
    { day: 14, coins: 750, gems: 50, item: 'streak_glow_2week', isMilestone: true },
    // Week 3-4
    { day: 21, coins: 1000, gems: 75, item: 'streak_aura_3week', isMilestone: true },
    { day: 30, coins: 2000, gems: 150, item: 'streak_legendary_skin', title: 'Monthly Master', isMilestone: true },
    // Long term
    { day: 60, coins: 3000, gems: 300, item: 'streak_mythic_trail', isMilestone: true },
    { day: 100, coins: 5000, gems: 500, item: 'streak_century_crown', title: 'Century Champion', isMilestone: true },
    { day: 365, coins: 10000, gems: 1000, item: 'streak_annual_legend', title: 'Yearly Legend', isMilestone: true },
];

const STORAGE_KEY = 'mazechase_streak';

export class StreakManager {
    private data: StreakData;
    private onRewardCallback?: (reward: StreakReward) => void;

    constructor() {
        this.data = this.loadData();
    }

    private loadData(): StreakData {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Streak] Failed to load streak data:', e);
        }
        
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastLoginDate: '',
            totalDaysPlayed: 0,
            streakProtectionUsed: false,
            claimedRewards: []
        };
    }

    private saveData(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[Streak] Failed to save streak data:', e);
        }
    }

    /**
     * Call this when player logs in / opens the game
     * Returns the reward for today if applicable
     */
    recordLogin(): { 
        streakContinued: boolean; 
        newStreak: number; 
        reward: StreakReward | null;
        streakLost: boolean;
        usedProtection: boolean;
    } {
        const today = this.getTodayDate();
        const yesterday = this.getYesterdayDate();
        const twoDaysAgo = this.getDaysAgoDate(2);
        
        let streakContinued = false;
        let streakLost = false;
        let usedProtection = false;
        
        // Already logged in today
        if (this.data.lastLoginDate === today) {
            return {
                streakContinued: false,
                newStreak: this.data.currentStreak,
                reward: null,
                streakLost: false,
                usedProtection: false
            };
        }
        
        // Streak continuation logic
        if (this.data.lastLoginDate === yesterday) {
            // Perfect - logged in yesterday, streak continues
            this.data.currentStreak++;
            streakContinued = true;
        } else if (this.data.lastLoginDate === twoDaysAgo && !this.data.streakProtectionUsed) {
            // Missed one day, but we can use streak protection
            this.data.currentStreak++;
            this.data.streakProtectionUsed = true;
            streakContinued = true;
            usedProtection = true;
            console.log('[Streak] Used streak protection!');
        } else if (this.data.lastLoginDate !== '') {
            // Streak broken :(
            console.log('[Streak] Streak lost! Was:', this.data.currentStreak);
            this.data.currentStreak = 1;
            this.data.streakProtectionUsed = false;
            streakLost = true;
        } else {
            // First time playing
            this.data.currentStreak = 1;
        }
        
        // Update records
        this.data.lastLoginDate = today;
        this.data.totalDaysPlayed++;
        
        if (this.data.currentStreak > this.data.longestStreak) {
            this.data.longestStreak = this.data.currentStreak;
        }
        
        // Reset streak protection at start of new week
        if (this.data.currentStreak % 7 === 1 && this.data.currentStreak > 1) {
            this.data.streakProtectionUsed = false;
        }
        
        // Find and claim reward
        const reward = this.getRewardForDay(this.data.currentStreak);
        if (reward && !this.data.claimedRewards.includes(this.data.currentStreak)) {
            this.data.claimedRewards.push(this.data.currentStreak);
            
            if (this.onRewardCallback) {
                this.onRewardCallback(reward);
            }
        }
        
        this.saveData();
        
        return {
            streakContinued,
            newStreak: this.data.currentStreak,
            reward: reward || null,
            streakLost,
            usedProtection
        };
    }

    /**
     * Get the reward for a specific streak day
     */
    private getRewardForDay(day: number): StreakReward | undefined {
        // Check for exact milestone match first
        const milestone = STREAK_REWARDS.find(r => r.day === day);
        if (milestone) return milestone;
        
        // For non-milestone days, calculate base reward
        if (day > 0) {
            const weekBonus = Math.floor(day / 7);
            return {
                day,
                coins: 100 + (day * 10) + (weekBonus * 50),
                gems: day % 5 === 0 ? Math.floor(day / 5) * 5 : undefined
            };
        }
        
        return undefined;
    }

    /**
     * Get current streak info for UI display
     */
    getStreakInfo(): {
        current: number;
        longest: number;
        totalDays: number;
        hasProtection: boolean;
        nextMilestone: StreakReward | null;
        daysToMilestone: number;
        todayReward: StreakReward | null;
        todayClaimed: boolean;
    } {
        const nextMilestone = STREAK_REWARDS.find(
            r => r.isMilestone && r.day > this.data.currentStreak
        ) || null;
        
        const todayReward = this.getRewardForDay(this.data.currentStreak);
        const todayClaimed = this.data.claimedRewards.includes(this.data.currentStreak);
        
        return {
            current: this.data.currentStreak,
            longest: this.data.longestStreak,
            totalDays: this.data.totalDaysPlayed,
            hasProtection: !this.data.streakProtectionUsed,
            nextMilestone,
            daysToMilestone: nextMilestone ? nextMilestone.day - this.data.currentStreak : 0,
            todayReward: todayReward || null,
            todayClaimed
        };
    }

    /**
     * Get upcoming rewards for calendar display
     */
    getUpcomingRewards(count = 7): Array<StreakReward & { claimed: boolean; isToday: boolean }> {
        const result: Array<StreakReward & { claimed: boolean; isToday: boolean }> = [];
        
        for (let i = 0; i < count; i++) {
            const day = this.data.currentStreak + i;
            const reward = this.getRewardForDay(day);
            
            if (reward) {
                result.push({
                    ...reward,
                    claimed: this.data.claimedRewards.includes(day),
                    isToday: i === 0
                });
            }
        }
        
        return result;
    }

    /**
     * Register callback for when rewards are earned
     */
    onReward(callback: (reward: StreakReward) => void): void {
        this.onRewardCallback = callback;
    }

    /**
     * Check if player has logged in today
     */
    hasLoggedInToday(): boolean {
        return this.data.lastLoginDate === this.getTodayDate();
    }

    private getTodayDate(): string {
        return new Date().toISOString().split('T')[0] ?? '';
    }

    private getYesterdayDate(): string {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0] ?? '';
    }

    private getDaysAgoDate(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0] ?? '';
    }

    /**
     * Reset streak data (for testing)
     */
    reset(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.data = this.loadData();
    }
}

// Singleton instance
let streakManager: StreakManager | null = null;

export function getStreakManager(): StreakManager {
    if (!streakManager) {
        streakManager = new StreakManager();
    }
    return streakManager;
}

/**
 * Streak UI messages
 */
export function getStreakMessage(streakResult: ReturnType<StreakManager['recordLogin']>): string {
    if (streakResult.usedProtection) {
        return `🛡️ Streak protected! Day ${streakResult.newStreak} continues!`;
    }
    
    if (streakResult.streakLost) {
        return `💔 Streak lost... Starting fresh at Day 1!`;
    }
    
    if (streakResult.streakContinued) {
        const flames = '🔥'.repeat(Math.min(streakResult.newStreak, 5));
        return `${flames} ${streakResult.newStreak} day streak! Keep it up!`;
    }
    
    return `Welcome back! Day ${streakResult.newStreak}`;
}

export function formatReward(reward: StreakReward): string {
    const parts: string[] = [];
    
    if (reward.coins) parts.push(`🪙 ${reward.coins}`);
    if (reward.gems) parts.push(`💎 ${reward.gems}`);
    if (reward.item) parts.push(`🎁 Special Item`);
    if (reward.title) parts.push(`🏆 "${reward.title}"`);
    
    return parts.join(' + ');
}
