/**
 * Challenge System - Daily Challenges
 * 
 * AI Tester Suggestion (David - UX Researcher):
 * "Introduceer een systeem voor dagelijkse uitdagingen.
 * Om dagelijkse terugkeer te bevorderen."
 * 
 * Features:
 * - Daily challenge rotation
 * - Weekly bonus challenges
 * - Progress tracking
 * - Reward tiers
 * - Challenge variety
 */

export type ChallengeType = 
    | 'collect_pellets'
    | 'survive_time'
    | 'catch_runners'
    | 'escape_chasers'
    | 'use_powerups'
    | 'win_games'
    | 'play_games'
    | 'score_points'
    | 'combo_streak'
    | 'perfect_run';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface Challenge {
    id: string;
    type: ChallengeType;
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    target: number;
    progress: number;
    reward: ChallengeReward;
    expiresAt: Date;
    isCompleted: boolean;
    isWeekly: boolean;
}

export interface ChallengeReward {
    coins: number;
    gems?: number;
    xp: number;
    specialItem?: string;
}

interface ChallengeTemplate {
    type: ChallengeType;
    titleTemplate: string;
    descriptionTemplate: string;
    difficulty: ChallengeDifficulty;
    targetRange: { min: number; max: number };
    baseReward: ChallengeReward;
}

// Challenge templates for random generation
const DAILY_TEMPLATES: ChallengeTemplate[] = [
    // Easy challenges
    {
        type: 'collect_pellets',
        titleTemplate: 'Pellet Collector',
        descriptionTemplate: 'Collect {target} pellets in any game mode',
        difficulty: 'easy',
        targetRange: { min: 50, max: 100 },
        baseReward: { coins: 100, xp: 50 }
    },
    {
        type: 'play_games',
        titleTemplate: 'Active Player',
        descriptionTemplate: 'Complete {target} games',
        difficulty: 'easy',
        targetRange: { min: 3, max: 5 },
        baseReward: { coins: 75, xp: 40 }
    },
    {
        type: 'use_powerups',
        titleTemplate: 'Power User',
        descriptionTemplate: 'Use {target} power-ups',
        difficulty: 'easy',
        targetRange: { min: 5, max: 10 },
        baseReward: { coins: 80, xp: 35 }
    },
    
    // Medium challenges
    {
        type: 'survive_time',
        titleTemplate: 'Survivor',
        descriptionTemplate: 'Survive for {target} seconds total as Runner',
        difficulty: 'medium',
        targetRange: { min: 120, max: 300 },
        baseReward: { coins: 200, xp: 100 }
    },
    {
        type: 'catch_runners',
        titleTemplate: 'Hunter',
        descriptionTemplate: 'Catch {target} runners as Chaser',
        difficulty: 'medium',
        targetRange: { min: 5, max: 10 },
        baseReward: { coins: 175, xp: 90 }
    },
    {
        type: 'escape_chasers',
        titleTemplate: 'Escape Artist',
        descriptionTemplate: 'Narrowly escape {target} chasers',
        difficulty: 'medium',
        targetRange: { min: 10, max: 20 },
        baseReward: { coins: 150, xp: 80 }
    },
    {
        type: 'score_points',
        titleTemplate: 'Point Scorer',
        descriptionTemplate: 'Score {target} total points',
        difficulty: 'medium',
        targetRange: { min: 1000, max: 2500 },
        baseReward: { coins: 180, xp: 95 }
    },
    
    // Hard challenges
    {
        type: 'win_games',
        titleTemplate: 'Champion',
        descriptionTemplate: 'Win {target} games',
        difficulty: 'hard',
        targetRange: { min: 3, max: 5 },
        baseReward: { coins: 350, gems: 10, xp: 200 }
    },
    {
        type: 'combo_streak',
        titleTemplate: 'Combo Master',
        descriptionTemplate: 'Achieve a {target}+ pellet combo streak',
        difficulty: 'hard',
        targetRange: { min: 25, max: 50 },
        baseReward: { coins: 300, gems: 5, xp: 175 }
    },
    {
        type: 'perfect_run',
        titleTemplate: 'Perfect Run',
        descriptionTemplate: 'Complete a game without being caught {target} times',
        difficulty: 'hard',
        targetRange: { min: 1, max: 2 },
        baseReward: { coins: 400, gems: 15, xp: 250 }
    }
];

const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
    {
        type: 'collect_pellets',
        titleTemplate: 'Weekly Collector',
        descriptionTemplate: 'Collect {target} pellets this week',
        difficulty: 'hard',
        targetRange: { min: 500, max: 1000 },
        baseReward: { coins: 1000, gems: 50, xp: 500 }
    },
    {
        type: 'win_games',
        titleTemplate: 'Weekly Champion',
        descriptionTemplate: 'Win {target} games this week',
        difficulty: 'hard',
        targetRange: { min: 10, max: 20 },
        baseReward: { coins: 1500, gems: 75, xp: 750, specialItem: 'weekly_crown' }
    },
    {
        type: 'play_games',
        titleTemplate: 'Dedicated Player',
        descriptionTemplate: 'Play {target} games this week',
        difficulty: 'medium',
        targetRange: { min: 25, max: 50 },
        baseReward: { coins: 800, gems: 30, xp: 400 }
    }
];

/**
 * ChallengeSystem - Daily and weekly challenge management
 */
export class ChallengeSystem {
    private activeDailyChallenges: Challenge[] = [];
    private activeWeeklyChallenges: Challenge[] = [];
    private completedChallengeIds: Set<string> = new Set();
    private lastDailyRefresh: Date | null = null;
    private lastWeeklyRefresh: Date | null = null;

    constructor() {
        this.loadFromStorage();
        this.checkRefresh();
    }

    /**
     * Get all active challenges
     */
    getActiveChallenges(): Challenge[] {
        this.checkRefresh();
        return [...this.activeDailyChallenges, ...this.activeWeeklyChallenges];
    }

    /**
     * Get daily challenges only
     */
    getDailyChallenges(): Challenge[] {
        this.checkRefresh();
        return this.activeDailyChallenges;
    }

    /**
     * Get weekly challenges only
     */
    getWeeklyChallenges(): Challenge[] {
        this.checkRefresh();
        return this.activeWeeklyChallenges;
    }

    /**
     * Check and refresh challenges if needed
     */
    private checkRefresh(): void {
        const now = new Date();
        
        // Check daily refresh (new day)
        if (!this.lastDailyRefresh || !this.isSameDay(now, this.lastDailyRefresh)) {
            this.refreshDailyChallenges();
        }

        // Check weekly refresh (new week, Monday)
        if (!this.lastWeeklyRefresh || !this.isSameWeek(now, this.lastWeeklyRefresh)) {
            this.refreshWeeklyChallenges();
        }
    }

    /**
     * Refresh daily challenges
     */
    private refreshDailyChallenges(): void {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Generate 3 daily challenges (1 easy, 1 medium, 1 hard)
        this.activeDailyChallenges = [
            this.generateChallenge(DAILY_TEMPLATES.filter(t => t.difficulty === 'easy'), false, endOfDay),
            this.generateChallenge(DAILY_TEMPLATES.filter(t => t.difficulty === 'medium'), false, endOfDay),
            this.generateChallenge(DAILY_TEMPLATES.filter(t => t.difficulty === 'hard'), false, endOfDay)
        ];

        this.lastDailyRefresh = now;
        this.saveToStorage();

        console.log('[ChallengeSystem] Daily challenges refreshed');
    }

    /**
     * Refresh weekly challenges
     */
    private refreshWeeklyChallenges(): void {
        const now = new Date();
        const endOfWeek = this.getEndOfWeek(now);

        // Generate 2 weekly challenges
        this.activeWeeklyChallenges = [
            this.generateChallenge(WEEKLY_TEMPLATES, true, endOfWeek),
            this.generateChallenge(WEEKLY_TEMPLATES, true, endOfWeek)
        ];

        this.lastWeeklyRefresh = now;
        this.saveToStorage();

        console.log('[ChallengeSystem] Weekly challenges refreshed');
    }

    /**
     * Generate a random challenge from templates
     */
    private generateChallenge(
        templates: ChallengeTemplate[],
        isWeekly: boolean,
        expiresAt: Date
    ): Challenge {
        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template) {
            throw new Error('No challenge templates available');
        }
        const target = this.randomInRange(template.targetRange.min, template.targetRange.max);

        const id = `challenge_${isWeekly ? 'w' : 'd'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            id,
            type: template.type,
            title: template.titleTemplate,
            description: template.descriptionTemplate.replace('{target}', target.toString()),
            difficulty: template.difficulty,
            target,
            progress: 0,
            reward: { ...template.baseReward },
            expiresAt,
            isCompleted: false,
            isWeekly
        };
    }

    /**
     * Update challenge progress
     */
    updateProgress(type: ChallengeType, amount: number): Challenge[] {
        const completedChallenges: Challenge[] = [];

        const allChallenges = [...this.activeDailyChallenges, ...this.activeWeeklyChallenges];
        
        for (const challenge of allChallenges) {
            if (challenge.type === type && !challenge.isCompleted) {
                challenge.progress = Math.min(challenge.progress + amount, challenge.target);
                
                if (challenge.progress >= challenge.target) {
                    challenge.isCompleted = true;
                    this.completedChallengeIds.add(challenge.id);
                    completedChallenges.push(challenge);
                }
            }
        }

        if (completedChallenges.length > 0) {
            this.saveToStorage();
        }

        return completedChallenges;
    }

    /**
     * Claim challenge reward
     */
    claimReward(challengeId: string): ChallengeReward | null {
        const allChallenges = [...this.activeDailyChallenges, ...this.activeWeeklyChallenges];
        const challenge = allChallenges.find(c => c.id === challengeId);

        if (!challenge || !challenge.isCompleted) {
            return null;
        }

        // Remove from active list
        this.activeDailyChallenges = this.activeDailyChallenges.filter(c => c.id !== challengeId);
        this.activeWeeklyChallenges = this.activeWeeklyChallenges.filter(c => c.id !== challengeId);
        
        this.saveToStorage();

        console.log(`[ChallengeSystem] Claimed reward for: ${challenge.title}`);
        return challenge.reward;
    }

    /**
     * Get completion percentage
     */
    getCompletionPercentage(): { daily: number; weekly: number } {
        const dailyCompleted = this.activeDailyChallenges.filter(c => c.isCompleted).length;
        const weeklyCompleted = this.activeWeeklyChallenges.filter(c => c.isCompleted).length;

        return {
            daily: this.activeDailyChallenges.length > 0 
                ? (dailyCompleted / this.activeDailyChallenges.length) * 100 
                : 0,
            weekly: this.activeWeeklyChallenges.length > 0
                ? (weeklyCompleted / this.activeWeeklyChallenges.length) * 100
                : 0
        };
    }

    /**
     * Get time until next refresh
     */
    getTimeUntilRefresh(): { daily: number; weekly: number } {
        const now = new Date();
        
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        
        const endOfWeek = this.getEndOfWeek(now);

        return {
            daily: endOfDay.getTime() - now.getTime(),
            weekly: endOfWeek.getTime() - now.getTime()
        };
    }

    // Helper methods
    private randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private isSameDay(d1: Date, d2: Date): boolean {
        return d1.toDateString() === d2.toDateString();
    }

    private isSameWeek(d1: Date, d2: Date): boolean {
        const week1 = this.getWeekNumber(d1);
        const week2 = this.getWeekNumber(d2);
        return week1 === week2 && d1.getFullYear() === d2.getFullYear();
    }

    private getWeekNumber(d: Date): number {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 4 - (date.getDay() || 7));
        const yearStart = new Date(date.getFullYear(), 0, 1);
        return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    private getEndOfWeek(d: Date): Date {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? 0 : 7);
        date.setDate(diff);
        date.setHours(23, 59, 59, 999);
        return date;
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem('mazechase_challenges', JSON.stringify({
                daily: this.activeDailyChallenges,
                weekly: this.activeWeeklyChallenges,
                lastDailyRefresh: this.lastDailyRefresh?.toISOString(),
                lastWeeklyRefresh: this.lastWeeklyRefresh?.toISOString(),
                completed: Array.from(this.completedChallengeIds)
            }));
        } catch (e) {
            console.warn('[ChallengeSystem] Failed to save:', e);
        }
    }

    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem('mazechase_challenges');
            if (data) {
                const parsed = JSON.parse(data);
                this.activeDailyChallenges = parsed.daily || [];
                this.activeWeeklyChallenges = parsed.weekly || [];
                this.lastDailyRefresh = parsed.lastDailyRefresh ? new Date(parsed.lastDailyRefresh) : null;
                this.lastWeeklyRefresh = parsed.lastWeeklyRefresh ? new Date(parsed.lastWeeklyRefresh) : null;
                this.completedChallengeIds = new Set(parsed.completed || []);
            }
        } catch (e) {
            console.warn('[ChallengeSystem] Failed to load:', e);
        }
    }
}

// Singleton
let challengeSystem: ChallengeSystem | null = null;

export function getChallengeSystem(): ChallengeSystem {
    if (!challengeSystem) {
        challengeSystem = new ChallengeSystem();
    }
    return challengeSystem;
}
